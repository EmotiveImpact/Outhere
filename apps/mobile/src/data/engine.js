// Outhere local engine.
//
// Until the server stack is chosen, the whole product runs on the phone: this
// module owns the data (persisted in AsyncStorage), simulates the other players
// in the seeded world, and applies the game rules (XP, OUT, streaks, battles,
// crews, events, drops, rewards). Every function is async and returns plain
// objects, so a server-backed implementation can replace it behind the same
// interface later.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { RESERVED_SLUGS } from "@outhere/core";
import {
  CHALLENGE_TEMPLATES,
  CREWS,
  CREW_CHAT,
  CREW_FEED,
  DROPS,
  EVENTS,
  NEWS,
  PLAYERS,
  REWARDS,
} from "./seed";
import { DAY_MS, HOUR_MS, addDays, dayKey, startOfDay, startOfWeek } from "./time";
import { noise, randomCode, randomId } from "./random";
import { PHOTOS } from "@/constants/photos";
import { makeClubs } from "./clubs";
import { makeProfile } from "./profile";
import { memberBonus } from "@/constants/plans";
import { makeCrew } from "./crew";
import { photoFor } from "./seedCrew";
import { BLIND_FINISH_HOURS, LIVE_RACE_HOURS, LIVE_RACE_LEAD_MS, MODE, ROUTE_SHARE, lowerWins, standingTarget } from "@/constants/battleModes";

const STORAGE_KEY = "outhere.engine.v1";
const ME = "me";
const STEP_KM = 0.000762;
const ACTIVE_DAY_STEPS = 3000;

// ── Rules ─────────────────────────────────────────────────────────────────────

export const TIERS = ["free", "pro", "black"];
const tierRank = (tier) => Math.max(0, TIERS.indexOf(tier));
export const tierAtLeast = (tier, required) => tierRank(tier) >= tierRank(required);

export const TIER_RULES = {
  free: { xpMultiplier: 1, maxCrewsJoined: 1, maxCrewsOwned: 0, battlesPerWeek: 1, maxActiveBattles: 1, redemptionsPerWeek: 1, historyDays: 7 },
  pro: { xpMultiplier: 1.2, maxCrewsJoined: 3, maxCrewsOwned: 1, battlesPerWeek: Infinity, maxActiveBattles: 5, redemptionsPerWeek: 3, historyDays: 90 },
  black: { xpMultiplier: 1.5, maxCrewsJoined: 10, maxCrewsOwned: 3, battlesPerWeek: Infinity, maxActiveBattles: 10, redemptionsPerWeek: 10, historyDays: 365 },
};

export const TIER_PERKS = {
  free: ["Step tracking and streaks", "City and global rankings", "Join 1 crew", "1 battle a week", "1 reward a week"],
  pro: ["Everything in Free", "Own a crew and upload its logo", "Unlimited battles", "1.2x XP", "3 rewards a week", "24 hour early access to drops", "Pro-only events"],
  black: ["Everything in Pro", "Own up to 3 crews", "Obsidian verified badge", "1.5x XP", "10 rewards a week", "Black-only events and drops"],
};

export const BLACK_STREAK_DAYS = 14;

const LEVEL_TITLES = [
  [1, "Rookie"],
  [3, "Regular"],
  [5, "Mover"],
  [8, "Road Runner"],
  [12, "Street Legend"],
  [16, "Icon"],
];

const xpForLevel = (level) => 75 * (level - 1) * level;

export const levelFromXp = (xp) => {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  let title = LEVEL_TITLES[0][1];
  for (const [min, name] of LEVEL_TITLES) if (level >= min) title = name;
  return { level, title, xpIntoLevel: xp - floor, xpForNext: next - floor, nextLevelAt: next, progress: (xp - floor) / (next - floor) };
};

export const crewBadgeTier = (weekKm) => {
  if (weekKm >= 300) return "Obsidian";
  if (weekKm >= 200) return "Platinum";
  if (weekKm >= 120) return "Gold";
  if (weekKm >= 50) return "Silver";
  return "Bronze";
};

export class EngineError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    Object.assign(this, extra);
  }
}

const tierError = (requiredTier, message) => new EngineError("TIER_REQUIRED", message, { requiredTier });

// ── State, persistence and change events ──────────────────────────────────────

let state = null;
let loading = null;
let saveTimer = null;
const listeners = new Set();

const SEED_CODES = { c_southside: "SOUTH1", c_eastend: "EAST22", c_northlondon: "NORTH3", c_manny: "MANNY4", c_accra: "ACCRA5", c_southbank: "BANK16", c_peckham: "RYE619" };
const CLUB_FIELDS = ["status", "founded", "extraMembers", "meetPlace", "lat", "lng", "awayKm", "distances", "paces", "beginners", "runs", "founding", "cover", "area", "logo"];

const seedCrew = (c, i) => ({
  id: c.id,
  name: c.name,
  tagline: c.tagline,
  city: c.city,
  accent: c.accent,
  privacy: c.privacy,
  weeklyGoalKm: c.weeklyGoalKm,
  inviteCode: SEED_CODES[c.id] || randomCode(),
  ownerId: c.ownerId,
  createdAt: Date.now() - (60 + i * 20) * DAY_MS,
  members: c.members.map((id, j) => ({ id, role: id === c.ownerId ? "owner" : j === 1 ? "admin" : "member", joinedAt: Date.now() - (50 - j * 5) * DAY_MS })),
  ...Object.fromEntries(CLUB_FIELDS.filter((k) => c[k] !== undefined).map((k) => [k, c[k]])),
});

// Saved worlds from before run clubs: add the new clubs and their club details.
const upgradeState = (s) => {
  CREWS.forEach((c, i) => {
    const have = s.crews[c.id];
    if (!have) s.crews[c.id] = seedCrew(c, i);
    else if (!have.status) for (const k of CLUB_FIELDS) if (c[k] !== undefined) have[k] = c[k];
  });
  s.clubRuns = s.clubRuns || {};
  s.clubClaims = s.clubClaims || [];
  s.clubBattles = s.clubBattles || [];
  s.clubSeeded = s.clubSeeded || {};
  return s;
};

const freshState = () => ({
  version: 1,
  seededAt: Date.now(),
  me: null,
  days: {},
  ledger: [],
  streakAwards: {},
  following: [],
  myStories: [],
  storyViews: {},
  crews: Object.fromEntries(CREWS.map((c, i) => [c.id, seedCrew(c, i)])),
  crewChat: Object.fromEntries(
    Object.entries(CREW_CHAT).map(([crewId, lines]) => [
      crewId,
      lines.map(([authorId, text, hoursAgo]) => ({ id: randomId("m"), authorId, text, at: Date.now() - hoursAgo * HOUR_MS })),
    ])
  ),
  crewFeed: Object.fromEntries(
    Object.entries(CREW_FEED).map(([crewId, posts]) => [
      crewId,
      posts.map(([authorId, km, minutes, caption, hoursAgo]) => ({
        id: randomId("post"),
        authorId,
        km,
        minutes,
        caption,
        at: Date.now() - hoursAgo * HOUR_MS,
        likes: PLAYERS.filter((p) => noise(`${crewId}${caption}${p.id}`) > 0.75).map((p) => p.id),
        comments: Math.floor(noise(`${caption}c`) * 6),
      })),
    ])
  ),
  battles: [],
  clubRuns: {},
  clubClaims: [],
  clubBattles: [],
  clubSeeded: {},
  challenges: {},
  events: {},
  drops: {},
  redemptions: [],
  notifications: [],
  runs: [],
  settings: {
    units: "km",
    haptics: true,
    notifications: { battles: true, crews: true, drops: true, events: true, rewards: true },
    privacy: { showOnLeaderboards: true, showOutsideStatus: true },
  },
});

const load = async () => {
  if (state) return state;
  if (!loading) {
    loading = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        state = upgradeState(raw ? { ...freshState(), ...JSON.parse(raw) } : freshState());
      } catch (e) {
        console.warn("[engine] load failed, starting fresh", e);
        state = freshState();
      }
      return state;
    })();
  }
  return loading;
};

const persist = () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((e) => console.warn("[engine] save failed", e));
  }, 250);
};

const changed = () => {
  persist();
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.warn("[engine] listener failed", e);
    }
  });
};

export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

// Runs fn against the loaded state. Mutating calls pass mutate=true.
const read = async (fn) => {
  await load();
  return fn(state);
};
const write = async (fn) => {
  await load();
  const result = fn(state);
  changed();
  return result;
};

// Saves changes made while reading (time passing) without telling listeners,
// so queries don't refetch each other in a loop.
const touch = async (fn) => {
  await load();
  const result = fn(state);
  persist();
  return result;
};

const requireMe = (s) => {
  if (!s.me) throw new EngineError("NO_PROFILE", "Create your profile first.");
  return s.me;
};

// ── Simulated players ─────────────────────────────────────────────────────────

const playerById = Object.fromEntries(PLAYERS.map((p) => [p.id, p]));

// Share of a day's steps done by a given time of day: quiet overnight,
// a morning and evening bump, nearly done by 10pm.
const dayFraction = (ms) => {
  const d = new Date(ms);
  const h = d.getHours() + d.getMinutes() / 60;
  if (h <= 6) return 0;
  if (h >= 22.5) return 1;
  const x = (h - 6) / 16.5;
  return Math.min(1, x * x * (3 - 2 * x));
};

const playerDayTotal = (pid, key) => {
  const p = playerById[pid];
  if (!p) return 0;
  const date = startOfDay(key);
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const n = noise(`${pid}:${key}`);
  const rest = n < 0.08; // the odd lazy day
  return Math.round(p.base * (rest ? 0.15 : 0.6 + n * 0.8) * (weekend ? 1.12 : 1));
};

const playerStepsBetween = (pid, from, to) => {
  if (to <= from) return 0;
  let total = 0;
  let cursor = startOfDay(from).getTime();
  while (cursor < to) {
    const dayStart = cursor;
    const dayEnd = addDays(new Date(cursor), 1).getTime();
    const key = dayKey(new Date(cursor));
    const a = Math.max(from, dayStart);
    const b = Math.min(to, dayEnd);
    const fracA = a <= dayStart ? 0 : dayFraction(a);
    const fracB = b >= dayEnd ? 1 : dayFraction(b);
    total += playerDayTotal(pid, key) * Math.max(0, fracB - fracA);
    cursor = dayEnd;
  }
  return Math.round(total);
};

const playerStepsToday = (pid) => playerStepsBetween(pid, startOfDay().getTime(), Date.now());

const playerStreak = (pid) => {
  let streak = 0;
  for (let i = 1; i < 120; i += 1) {
    if (playerDayTotal(pid, dayKey(addDays(new Date(), -i))) < ACTIVE_DAY_STEPS) break;
    streak += 1;
  }
  return streak + (playerStepsToday(pid) >= ACTIVE_DAY_STEPS ? 1 : 0);
};

const playerIsOutside = (pid) => {
  const h = new Date().getHours();
  if (h < 6 || h > 22) return false;
  return noise(`${pid}:${dayKey()}:${h}`) > 0.62;
};

const playerXp = (pid) => {
  const p = playerById[pid];
  return Math.round(p.base * 0.6 + noise(`${pid}:xp`) * 3000);
};

const publicPlayer = (pid) => {
  const p = playerById[pid];
  if (!p) return null;
  return { id: p.id, username: p.username, name: p.name, city: p.city, area: p.area, avatar: p.avatar, color: p.color, tier: p.tier, bio: p.bio, isMe: false };
};

// ── My steps ──────────────────────────────────────────────────────────────────

const myDay = (s, key) => s.days[key] || { steps: 0, distance: 0, activeMinutes: 0, samples: [], checkedIn: false, awards: {} };

// My step count at a moment, from the samples recorded as the pedometer syncs.
const myStepsAt = (s, ms) => {
  const day = s.days[dayKey(new Date(ms))];
  if (!day) return 0;
  if (ms >= addDays(new Date(ms), 1).getTime() - 1) return day.steps;
  let value = 0;
  for (const [t, steps] of day.samples || []) {
    if (t <= ms) value = steps;
    else break;
  }
  return value;
};

const myStepsBetween = (s, from, to) => {
  if (to <= from) return 0;
  let total = 0;
  let cursor = startOfDay(from).getTime();
  while (cursor < to) {
    const dayEnd = addDays(new Date(cursor), 1).getTime();
    const a = Math.max(from, cursor);
    const b = Math.min(to, dayEnd);
    const atA = a <= cursor ? 0 : myStepsAt(s, a);
    const atB = b >= dayEnd ? myDay(s, dayKey(new Date(cursor))).steps : myStepsAt(s, b);
    total += Math.max(0, atB - atA);
    cursor = dayEnd;
  }
  return total;
};

const myDistanceBetween = (s, from, to) => {
  // Distance from the pedometer is per day; spread it pro rata over steps.
  let total = 0;
  let cursor = startOfDay(from).getTime();
  while (cursor < to) {
    const dayEnd = addDays(new Date(cursor), 1).getTime();
    const day = myDay(s, dayKey(new Date(cursor)));
    const steps = myStepsBetween(s, Math.max(from, cursor), Math.min(to, dayEnd));
    const kmPerStep = day.steps > 0 && day.distance > 0 ? day.distance / day.steps : STEP_KM;
    total += steps * kmPerStep;
    cursor = dayEnd;
  }
  return total;
};

const isActiveDay = (day) => !!day && (day.checkedIn || day.steps >= ACTIVE_DAY_STEPS);

const computeStreak = (s) => {
  let streak = 0;
  const todayActive = isActiveDay(s.days[dayKey()]);
  for (let i = todayActive ? 0 : 1; i < 3650; i += 1) {
    const key = dayKey(addDays(new Date(), -i));
    if (isActiveDay(s.days[key])) streak += 1;
    else if (!s.streakFreezes?.[key]) break; // a streak freeze keeps the day without adding to it
  }
  return streak;
};

const computeLongestStreak = (s) => {
  const keys = Object.keys(s.days).filter((k) => isActiveDay(s.days[k])).sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const k of keys) {
    run = prev && dayKey(addDays(prev, 1)) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
};

// ── Ledger ────────────────────────────────────────────────────────────────────

const balance = (s, type) => s.ledger.filter((t) => t.type === type).reduce((sum, t) => sum + t.amount, 0);

const award = (s, { xp = 0, out = 0, label, reason, refId }) => {
  const at = Date.now();
  const mult = s.me ? TIER_RULES[s.me.tier || "free"].xpMultiplier : 1;
  const xpAmount = Math.round(xp * mult);
  if (xpAmount) s.ledger.push({ id: randomId("tx"), type: "xp", amount: xpAmount, label, reason, refId, at });
  if (out) s.ledger.push({ id: randomId("tx"), type: "out", amount: out, label, reason, refId, at });
  // Pro and Black earn more OUT for moving, paid as its own line (see constants/plans.js).
  const bonus = s.me ? memberBonus(s.me.tier, out, reason) : 0;
  if (bonus) s.ledger.push({ id: randomId("tx"), type: "out", amount: bonus, label: `${s.me.tier === "black" ? "Black" : "Pro"} bonus`, reason: "member_bonus", refId, at });
  return { xp: xpAmount, out: out + bonus };
};

// ── Notifications ─────────────────────────────────────────────────────────────

const notify = (s, { type, title, body, link, image }) => {
  if (s.settings?.notifications && s.settings.notifications[type] === false) return;
  s.notifications.unshift({ id: randomId("n"), type, title, body, link, image, at: Date.now(), read: false });
  s.notifications = s.notifications.slice(0, 100);
};

// ── Streak and eligibility side effects ───────────────────────────────────────

const applyStreakEffects = (s) => {
  if (!s.me) return;
  const streak = computeStreak(s);
  for (const milestone of [3, 7, 14, 30, 60, 100]) {
    if (streak >= milestone && !s.streakAwards[milestone]) {
      s.streakAwards[milestone] = Date.now();
      const xp = milestone * 20;
      const out = milestone * 2;
      award(s, { xp, out, label: `${milestone} day streak`, reason: "streak" });
      notify(s, { type: "rewards", title: `${milestone} day streak 🔥`, body: `You earned ${xp} XP and ${out} OUT. Keep it going.`, link: "/(tabs)/profile" });
    }
  }
  if (streak >= BLACK_STREAK_DAYS && !s.me.blackEligible) {
    s.me.blackEligible = true;
    notify(s, { type: "rewards", title: "You're Black eligible", body: `A ${BLACK_STREAK_DAYS} day streak unlocks the option to go Black. It stays unlocked.`, link: "/membership" });
  }
};

// ── Profile ───────────────────────────────────────────────────────────────────

const USERNAME_RE = /^[a-z0-9._]{3,20}$/;
// Usernames sit beside club slugs on the website, so the shared reserved list applies too.
const RESERVED = new Set(["admin", "outhere", "support", "root", "test", "dev", "official", ...RESERVED_SLUGS]);

const usernameProblem = (s, raw) => {
  const name = (raw || "").trim().toLowerCase();
  if (!USERNAME_RE.test(name)) return "3 to 20 characters: letters, numbers, dots and underscores.";
  if (RESERVED.has(name)) return "That name is reserved.";
  if (PLAYERS.some((p) => p.username === name)) return "That name is taken.";
  return null;
};

export const checkUsername = async (raw) =>
  read((s) => {
    const problem = usernameProblem(s, raw);
    return { available: !problem, reason: problem };
  });

export const createProfile = async ({ username, city = "London", crewCode, dailyGoal = 10000 }) =>
  write((s) => {
    const problem = usernameProblem(s, username);
    if (problem) throw new EngineError("BAD_USERNAME", problem);
    const name = username.trim().toLowerCase();
    s.me = {
      id: ME,
      username: name,
      name: username.trim(),
      city,
      area: "",
      bio: "",
      avatar: null,
      color: "#3DA9FC",
      tier: "free",
      blackEligible: false,
      dailyGoal: Math.min(50000, Math.max(1000, Math.round(Number(dailyGoal) || 10000))),
      weeklyGoalKm: 20,
      isOutside: false,
      createdAt: Date.now(),
    };
    award(s, { xp: 100, out: 20, label: "Welcome to Outhere", reason: "welcome" });
    // Start with a few people nearby to follow, so Home isn't empty.
    const local = PLAYERS.filter((p) => p.city === city);
    s.following = (local.length >= 3 ? local : PLAYERS.filter((p) => p.city === "London")).slice(0, 5).map((p) => p.id);
    // An opening challenge from a local mover.
    const challenger = local[1] || PLAYERS[1];
    s.battles.push({
      id: randomId("b"),
      metric: "steps",
      creatorId: challenger.id,
      opponentId: ME,
      durationHours: 24,
      status: "pending",
      createdAt: Date.now(),
    });
    notify(s, { type: "rewards", title: "Welcome to Outhere", body: "You've got 100 XP and 20 OUT to start. Check in daily to build your streak.", link: "/(tabs)" });
    notify(s, { type: "battles", title: `${challenger.name} challenged you`, body: "24 hour step battle. Accept it in the Arena.", link: "/(tabs)/outside/arena" });
    if (crewCode) {
      const crew = Object.values(s.crews).find((c) => c.inviteCode.toLowerCase() === crewCode.trim().toLowerCase());
      if (crew) joinCrewInState(s, crew, true);
    }
    return profileView(s);
  });

const myBattleRecord = (s) => {
  const done = s.battles.filter((b) => b.status === "complete");
  return {
    wins: done.filter((b) => b.winnerId === ME).length,
    losses: done.filter((b) => b.winnerId && b.winnerId !== ME).length,
    draws: done.filter((b) => !b.winnerId).length,
  };
};

const eventCheckinCount = (s) => Object.values(s.events).filter((e) => e.checkedIn).length;

const profileView = (s) => {
  const me = s.me;
  if (!me) return null;
  const xp = balance(s, "xp");
  const out = balance(s, "out");
  const streak = computeStreak(s);
  const totalSteps = Object.values(s.days).reduce((sum, d) => sum + (d.steps || 0), 0);
  const totalDistance = Object.values(s.days).reduce((sum, d) => sum + (d.distance || 0), 0);
  const record = myBattleRecord(s);
  const events = eventCheckinCount(s);
  const today = myDay(s, dayKey());
  const weekStart = startOfWeek().getTime();
  const weekRunsKm = s.runs.filter((r) => r.endedAt >= weekStart).reduce((sum, r) => sum + r.distanceKm, 0);
  const weekStepsKm = myDistanceBetween(s, weekStart, Date.now());
  return {
    ...me,
    xp,
    out,
    level: levelFromXp(xp),
    streak,
    longestStreak: Math.max(streak, computeLongestStreak(s)),
    checkedInToday: !!today.checkedIn,
    today: {
      steps: today.steps,
      distance: today.distance,
      activeMinutes: today.activeMinutes,
      xp: earnedSince(s, "xp", startOfToday()),
      out: earnedSince(s, "out", startOfToday()),
    },
    totals: { steps: totalSteps, distance: Math.round(totalDistance * 10) / 10, runs: s.runs.length },
    week: { distanceKm: Math.round(weekStepsKm * 10) / 10, runsKm: Math.round(weekRunsKm * 10) / 10 },
    outsideScore: Math.round(totalSteps / 100 + streak * 50 + record.wins * 100 + events * 150),
    battleRecord: record,
    eventsAttended: events,
    crewsCount: Object.values(s.crews).filter((c) => c.members.some((m) => m.id === ME)).length,
    followingCount: s.following.length,
    followersCount: Math.max(s.following.length, Math.round(3 + noise(me.username) * 20 + record.wins * 2)),
    badges: badgesFor(s, { streak, record, events }),
  };
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const earnedSince = (s, type, from) =>
  s.ledger.filter((t) => t.type === type && t.amount > 0 && t.at >= from).reduce((sum, t) => sum + t.amount, 0);

const badgesFor = (s, { streak, record, events }) => {
  const longest = Math.max(streak, computeLongestStreak(s));
  const list = [
    { id: "founder", title: "Founder", description: "Joined Outhere in the first season.", earned: true, icon: "star" },
    { id: "streak7", title: "7 Day Streak", description: "Active 7 days in a row.", earned: longest >= 7, icon: "flame" },
    { id: "streak30", title: "30 Day Streak", description: "Active 30 days in a row.", earned: longest >= 30, icon: "flame" },
    { id: "battle1", title: "First Win", description: "Win a battle.", earned: record.wins >= 1, icon: "swords" },
    { id: "battle10", title: "10 Wins", description: "Win 10 battles.", earned: record.wins >= 10, icon: "trophy" },
    { id: "event1", title: "Link-Up", description: "Check in at an event.", earned: events >= 1, icon: "map-pin" },
    { id: "event3", title: "Regular", description: "Check in at 3 events.", earned: events >= 3, icon: "map-pin" },
    { id: "crew", title: "Crew Member", description: "Join a crew.", earned: Object.values(s.crews).some((c) => c.members.some((m) => m.id === ME)), icon: "users" },
    { id: "run10", title: "10K Club", description: "Log a 10 km run.", earned: s.runs.some((r) => r.distanceKm >= 10), icon: "route" },
  ];
  return list;
};

export const getProfile = async () => read(profileView);

export const updateProfile = async (patch) =>
  write((s) => {
    const me = requireMe(s);
    const next = { ...patch };
    if (next.username !== undefined && next.username.trim().toLowerCase() !== me.username) {
      const problem = usernameProblem(s, next.username);
      if (problem) throw new EngineError("BAD_USERNAME", problem);
      next.username = next.username.trim().toLowerCase();
    }
    for (const key of ["username", "name", "city", "area", "bio", "avatar", "dailyGoal", "weeklyGoalKm", "isOutside", "color"]) {
      if (next[key] !== undefined) me[key] = next[key];
    }
    return profileView(s);
  });

// Wipes everything on this phone. There is no server copy yet.
export const resetAll = async () => {
  await load();
  state = freshState();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  changed();
};

// ── Membership ────────────────────────────────────────────────────────────────

export const getMembership = async () =>
  read((s) => {
    const me = requireMe(s);
    return {
      tier: me.tier,
      blackEligible: me.blackEligible,
      streak: computeStreak(s),
      streakNeeded: BLACK_STREAK_DAYS,
      rules: TIER_RULES[me.tier],
      perks: TIER_PERKS,
      paymentsLive: false,
    };
  });

// Payments aren't wired up yet, so changing tier is free in this build.
export const setTier = async (tier) =>
  write((s) => {
    const me = requireMe(s);
    if (!TIERS.includes(tier)) throw new EngineError("BAD_TIER", "Unknown membership.");
    if (tier === "black" && !me.blackEligible) {
      throw new EngineError("NOT_ELIGIBLE", `Black unlocks after a ${BLACK_STREAK_DAYS} day streak.`);
    }
    me.tier = tier;
    if (tier !== "free") notify(s, { type: "rewards", title: `Welcome to ${tier === "pro" ? "Pro" : "Black"}`, body: "Your new perks are live.", link: "/membership" });
    return profileView(s);
  });

// ── Steps and check-ins ───────────────────────────────────────────────────────

export const recordSteps = async ({ date = dayKey(), steps, distance, activeMinutes }) =>
  write((s) => {
    if (!s.me) return null;
    const day = { ...myDay(s, date) };
    // The pedometer can report a lower total after a restart (or 0 on Android
    // before it has a baseline). Never go backwards within a day.
    if (steps > day.steps) {
      day.steps = Math.round(steps);
      day.distance = distance != null ? Math.max(day.distance, distance) : day.steps * STEP_KM;
      day.activeMinutes = Math.max(day.activeMinutes || 0, activeMinutes || Math.floor(day.steps / 100));
      day.samples = [...(day.samples || []), [Date.now(), day.steps]].slice(-300);
    }
    day.awards = { ...(day.awards || {}) };
    // 5 XP per 1,000 steps, credited as the day goes.
    const thousands = Math.floor(day.steps / 1000);
    const credited = day.awards.thousands || 0;
    if (thousands > credited) {
      award(s, { xp: (thousands - credited) * 5, label: "Steps", reason: "steps" });
      day.awards.thousands = thousands;
    }
    if (day.steps >= ACTIVE_DAY_STEPS && !day.awards.active) {
      day.awards.active = true;
      award(s, { xp: 50, out: 5, label: "Active day", reason: "active_day" });
    }
    if (day.steps >= (s.me.dailyGoal || 10000) && !day.awards.goal) {
      day.awards.goal = true;
      award(s, { xp: 40, out: 4, label: "Daily goal hit", reason: "goal" });
    }
    s.days[date] = day;
    applyStreakEffects(s);
    return { steps: day.steps, distance: day.distance };
  });

export const checkIn = async () =>
  write((s) => {
    requireMe(s);
    const key = dayKey();
    const day = { ...myDay(s, key) };
    if (day.checkedIn) return { alreadyCheckedIn: true, streak: computeStreak(s), xp: 0, out: 0 };
    day.checkedIn = true;
    day.checkedInAt = Date.now();
    s.days[key] = day;
    const got = award(s, { xp: 20, out: 2, label: "Daily check-in", reason: "checkin" });
    applyStreakEffects(s);
    return { alreadyCheckedIn: false, streak: computeStreak(s), ...got };
  });

export const getStepHistory = async (days = 7) =>
  read((s) => {
    const out = [];
    for (let i = days - 1; i >= 0; i -= 1) {
      const key = dayKey(addDays(new Date(), -i));
      const d = myDay(s, key);
      out.push({ date: key, steps: d.steps, distance: d.distance, activeMinutes: d.activeMinutes, checkedIn: !!d.checkedIn, active: isActiveDay(d) });
    }
    return out;
  });

// Hourly steps for today, for the Home chart.
export const getTodayByHour = async () =>
  read((s) => {
    const start = startOfDay().getTime();
    const hours = [];
    for (let h = 0; h < 24; h += 1) {
      const a = start + h * HOUR_MS;
      const b = Math.min(Date.now(), a + HOUR_MS);
      hours.push({ hour: h, steps: b > a ? myStepsBetween(s, a, b) : 0 });
    }
    return hours;
  });

// Developer helpers for simulators without a step counter.
export const devAddSteps = async (amount = 1500) => {
  const today = await read((s) => myDay(s, dayKey()).steps);
  return recordSteps({ date: dayKey(), steps: today + amount, distance: (today + amount) * STEP_KM });
};

export const devFillHistory = async (days = 13) =>
  write((s) => {
    for (let i = days; i >= 1; i -= 1) {
      const key = dayKey(addDays(new Date(), -i));
      if (s.days[key]?.steps) continue;
      const steps = Math.round(4000 + noise(`dev:${key}`) * 9000);
      const end = addDays(new Date(), -i + 1).getTime() - 1;
      s.days[key] = { steps, distance: steps * STEP_KM, activeMinutes: Math.floor(steps / 100), samples: [[end - 2 * HOUR_MS, steps]], checkedIn: false, awards: { thousands: Math.floor(steps / 1000), active: true } };
      award(s, { xp: Math.floor(steps / 1000) * 5 + 50, out: 5, label: "Steps (demo history)", reason: "steps" });
    }
    applyStreakEffects(s);
  });

// ── Wallet ────────────────────────────────────────────────────────────────────

export const getWallet = async () =>
  read((s) => ({
    xp: balance(s, "xp"),
    out: balance(s, "out"),
    level: levelFromXp(balance(s, "xp")),
    transactions: [...s.ledger].sort((a, b) => b.at - a.at).slice(0, 60),
  }));

// ── People ────────────────────────────────────────────────────────────────────

const meAsPlayer = (s) => ({ id: ME, username: s.me.username, name: s.me.name, city: s.me.city, area: s.me.area, avatar: s.me.avatar, color: s.me.color, tier: s.me.tier, bio: s.me.bio, isMe: true });

const personView = (s, pid) => {
  if (pid === ME) return { ...meAsPlayer(s), todaySteps: myDay(s, dayKey()).steps, isOutside: !!s.me.isOutside, streak: computeStreak(s) };
  const p = publicPlayer(pid);
  if (!p) return null;
  return { ...p, todaySteps: playerStepsToday(pid), isOutside: playerIsOutside(pid), streak: playerStreak(pid), isFollowing: s.following.includes(pid), story: storyState(s, pid) };
};

// ── Stories ───────────────────────────────────────────────────────────────────
// Seeded people post one to three photos a day (always when they're out).
// Your own stories are kept on this phone for 24 hours.

const STORY_PHOTOS = ["hero", "welcome11", "clubrun", "walk", "marsh", "navCity", "selfie", "event", "friends", "crew", "shoe", "goal11"];
const STORY_LINES = ["Out before work", "River loop done", "Who's coming tomorrow?", "Legs gone, worth it", "Sunrise club", "New route, 6k", "", ""];

const seededStories = (pid) => {
  const day = dayKey();
  if (!playerIsOutside(pid) && noise(`story:${pid}:${day}`) < 0.6) return [];
  const count = 1 + Math.floor(noise(`stories:${pid}:${day}`) * 3);
  const now = Date.now();
  const out = playerIsOutside(pid);
  const place = playerById[pid]?.area || playerById[pid]?.city || "the park";
  return Array.from({ length: count }, (_, i) => {
    const n = noise(`story:${pid}:${day}:${i}`);
    const postedAt = Math.max(startOfDay().getTime(), now - (count - i) * 47 * 60 * 1000 - Math.round(n * 30 * 60 * 1000));
    const last = i === count - 1;
    // Someone out right now: their latest story shows the run as it happens.
    const minutes = Math.max(4, Math.round((now - postedAt) / 60000) + 6);
    const paceSec = Math.round(280 + noise(`${pid}:pace`) * 120);
    const liveKm = Math.round(((minutes * 60) / paceSec) * 10) / 10;
    const ranKm = Math.round((3 + noise(`km:${pid}:${day}:${i}`) * 6) * 100) / 100;
    const withRun = !last && noise(`sticker:${pid}:${day}:${i}`) > 0.5;
    return {
      id: `${pid}:${day}:${i}`,
      authorId: pid,
      image: PHOTOS[STORY_PHOTOS[Math.floor(n * STORY_PHOTOS.length)]],
      caption: out && last ? `${liveKm} km into a run round ${place}` : STORY_LINES[Math.floor(noise(`line:${pid}:${day}:${i}`) * STORY_LINES.length)],
      audience: "followers",
      live: out && last ? { km: liveKm, paceSec, minutes } : null,
      run: withRun ? { km: ranKm, paceSec, seconds: Math.round(ranKm * paceSec), title: `${place} loop` } : null,
      stickers: withRun ? ["route"] : [],
      postedAt,
      expiresAt: postedAt + DAY_MS,
    };
  });
};

const storiesOf = (s, pid) => {
  if (pid !== ME && (s.blocked || []).includes(pid)) return [];
  const list = pid === ME ? (s.myStories || []).filter((st) => st.expiresAt > Date.now()) : seededStories(pid);
  return list.map((st) => ({ ...st, seen: pid === ME || !!s.storyViews?.[st.id], emote: typeof s.storyViews?.[st.id] === "string" ? s.storyViews[st.id] : null }));
};

const storyState = (s, pid) => {
  const list = storiesOf(s, pid);
  if (!list.length) return null;
  return list.every((st) => st.seen) ? "watched" : "unwatched";
};

export const listStories = async (authorId) => read((s) => storiesOf(s, authorId));

export const viewStory = async (storyId, emote) =>
  write((s) => {
    s.storyViews = { ...(s.storyViews || {}), [storyId]: emote || s.storyViews?.[storyId] || true };
  });

export const markStoryWatched = async (pid) =>
  write((s) => {
    const views = { ...(s.storyViews || {}) };
    for (const st of storiesOf(s, pid)) views[st.id] = views[st.id] || true;
    s.storyViews = views;
  });

// audience: "followers" (Friends), "club" (My club, needs clubId) or "public".
// A run puts its distance, time and pace on the photo; stickers add the
// route, streak, battle or club on top.
const STORY_STICKERS = ["route", "streak", "battle", "club"];
export const postStory = async ({ uri, caption = "", audience = "followers", clubId = null, runId = null, stickers = [] }) =>
  write((s) => {
    const me = requireMe(s);
    if (me.tier === "free") throw new EngineError("TIER_REQUIRED", "Posting stories is for Pro and Black members.", { requiredTier: "pro" });
    if (audience === "club" && !(clubId && s.crews[clubId]?.members.some((m) => m.id === ME))) throw new EngineError("FORBIDDEN", "Join a crew to post to it.");
    const r = runId ? s.runs.find((x) => x.id === runId) : null;
    const now = Date.now();
    const story = {
      id: randomId("st"),
      authorId: ME,
      image: { uri },
      caption: caption.trim(),
      audience,
      clubId: audience === "club" ? clubId : null,
      run: r ? { km: r.distanceKm, paceSec: r.paceSecPerKm, seconds: r.durationSec, title: r.title } : null,
      stickers: stickers.filter((x) => STORY_STICKERS.includes(x)),
      postedAt: now,
      expiresAt: now + DAY_MS,
    };
    s.myStories = [...(s.myStories || []).filter((st) => st.expiresAt > now), story];
  });

export const deleteStory = async (storyId) =>
  write((s) => {
    s.myStories = (s.myStories || []).filter((st) => st.id !== storyId);
  });

export const getFriends = async () =>
  read((s) => s.following.map((pid) => personView(s, pid)).filter(Boolean).sort((a, b) => Number(b.isOutside) - Number(a.isOutside) || b.todaySteps - a.todaySteps));

export const searchPlayers = async (query = "") =>
  read((s) => {
    const q = query.trim().toLowerCase();
    return PLAYERS.filter((p) => !q || p.username.includes(q) || p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q))
      .map((p) => personView(s, p.id))
      .slice(0, 30);
  });

export const getPlayer = async (pid) =>
  read((s) => {
    const person = personView(s, pid);
    if (!person) throw new EngineError("NOT_FOUND", "Player not found.");
    const weekStart = startOfWeek().getTime();
    const vsMe = s.battles.filter((b) => b.status === "complete" && (b.creatorId === pid || b.opponentId === pid));
    return {
      ...person,
      weekSteps: pid === ME ? myStepsBetween(s, weekStart, Date.now()) : playerStepsBetween(pid, weekStart, Date.now()),
      xp: pid === ME ? balance(s, "xp") : playerXp(pid),
      crews: Object.values(s.crews).filter((c) => c.members.some((m) => m.id === pid)).map((c) => ({ id: c.id, name: c.name, logo: c.logo, accent: c.accent })),
      recordVsMe: { wins: vsMe.filter((b) => b.winnerId === ME).length, losses: vsMe.filter((b) => b.winnerId === pid).length },
    };
  });

export const follow = async (pid) =>
  write((s) => {
    if (!playerById[pid]) throw new EngineError("NOT_FOUND", "Player not found.");
    if (!s.following.includes(pid)) s.following.push(pid);
  });

export const unfollow = async (pid) =>
  write((s) => {
    s.following = s.following.filter((id) => id !== pid);
  });

export const getOutsideNow = async (city) =>
  read((s) => {
    const people = PLAYERS.filter((p) => (!city || p.city === city) && playerIsOutside(p.id)).map((p) => personView(s, p.id));
    if (s.me?.isOutside && s.settings?.privacy?.showOutsideStatus !== false && (!city || s.me.city === city)) people.unshift(personView(s, ME));
    return { count: people.length, people };
  });

// ── Leaderboards ──────────────────────────────────────────────────────────────

const periodStart = (period) => {
  if (period === "today") return startOfDay().getTime();
  if (period === "week") return startOfWeek().getTime();
  return addDays(new Date(), -29).getTime(); // "month": the last 30 days
};

export const getLeaderboard = async ({ scope = "city", period = "week", metric = "steps" } = {}) =>
  read((s) => {
    const me = s.me;
    let ids;
    if (scope === "friends") ids = [...s.following];
    else if (scope === "city" && me) ids = PLAYERS.filter((p) => p.city === me.city).map((p) => p.id);
    else ids = PLAYERS.map((p) => p.id);
    const from = periodStart(period);
    const now = Date.now();
    const valueFor = (pid) => {
      if (metric === "xp") return pid === ME ? balance(s, "xp") : playerXp(pid);
      if (metric === "streak") return pid === ME ? computeStreak(s) : playerStreak(pid);
      const steps = pid === ME ? myStepsBetween(s, from, now) : playerStepsBetween(pid, from, now);
      if (metric === "distance") return Math.round((pid === ME ? myDistanceBetween(s, from, now) : steps * STEP_KM) * 10) / 10;
      return steps;
    };
    const showMe = me && s.settings.privacy.showOnLeaderboards;
    if (showMe) ids.push(ME);
    const rows = ids
      .map((pid) => ({ player: pid === ME ? meAsPlayer(s) : publicPlayer(pid), value: valueFor(pid) }))
      .sort((a, b) => b.value - a.value)
      .map((row, i) => ({ ...row, rank: i + 1, isMe: row.player.id === ME }));
    return { scope, period, metric, city: me?.city, entries: rows, me: rows.find((r) => r.isMe) || null, hiddenMe: !!me && !showMe };
  });

// ── Challenges ────────────────────────────────────────────────────────────────

const challengeWindow = (tpl) => {
  const now = new Date();
  if (tpl.period === "day") {
    const start = startOfDay(now);
    return { start: start.getTime(), end: addDays(start, 1).getTime(), key: dayKey(start) };
  }
  if (tpl.period === "weekend") {
    const sat = addDays(startOfWeek(now), 5);
    return { start: sat.getTime(), end: addDays(sat, 2).getTime(), key: dayKey(sat) };
  }
  const start = startOfWeek(now);
  return { start: start.getTime(), end: addDays(start, 7).getTime(), key: dayKey(start) };
};

const challengeView = (s, tpl) => {
  const w = challengeWindow(tpl);
  const id = `${tpl.id}:${w.key}`;
  const mine = s.challenges[id] || {};
  const to = Math.min(Date.now(), w.end);
  const raw = tpl.metric === "distance" ? myDistanceBetween(s, w.start, to) : myStepsBetween(s, w.start, to);
  const progress = tpl.metric === "distance" ? Math.round(raw * 10) / 10 : raw;
  const now = Date.now();
  const status = mine.claimed ? "claimed" : progress >= tpl.target && mine.joined ? "complete" : mine.joined ? "joined" : now < w.start ? "upcoming" : "open";
  return {
    id,
    templateId: tpl.id,
    title: tpl.scope === "city" && s.me ? `${s.me.city} ${tpl.title}` : tpl.title,
    description: tpl.description,
    metric: tpl.metric,
    target: tpl.target,
    rewardXp: tpl.rewardXp,
    rewardOut: tpl.rewardOut,
    period: tpl.period,
    startsAt: w.start,
    endsAt: w.end,
    progress,
    percent: Math.min(1, progress / tpl.target),
    joined: !!mine.joined,
    status,
    participants: Math.round(120 + noise(id) * 900) + (mine.joined ? 1 : 0),
  };
};

export const listChallenges = async () => read((s) => CHALLENGE_TEMPLATES.map((tpl) => challengeView(s, tpl)));

export const joinChallenge = async (id) =>
  write((s) => {
    requireMe(s);
    s.challenges[id] = { ...(s.challenges[id] || {}), joined: true, joinedAt: Date.now() };
  });

export const claimChallenge = async (id) =>
  write((s) => {
    const tpl = CHALLENGE_TEMPLATES.find((t) => id.startsWith(`${t.id}:`));
    if (!tpl) throw new EngineError("NOT_FOUND", "Challenge not found.");
    const view = challengeView(s, tpl);
    if (view.status !== "complete") throw new EngineError("NOT_COMPLETE", "Finish the challenge first.");
    s.challenges[id] = { ...s.challenges[id], claimed: true, claimedAt: Date.now() };
    return award(s, { xp: tpl.rewardXp, out: tpl.rewardOut, label: view.title, reason: "challenge", refId: id });
  });

// ── Battles ───────────────────────────────────────────────────────────────────
// Six modes (constants/battleModes.js). Window modes count steps, days at goal
// or laps until the clock runs out. Timed modes take your first run of at least
// the distance after the start; the faster time wins. Simulated rivals accept
// straight away and run at a pace of their own.

export const BATTLE_DURATIONS = [2, 6, 24, 168];
export { BATTLE_MODES } from "@/constants/battleModes";

const RIVAL_READY_MS = 4000;

const legacyMode = (b) => b.mode || "most_steps";
const rivalOf = (b) => (b.creatorId === ME ? b.opponentId : b.creatorId);
const battleKm = (b) => (b.distanceM || 0) / 1000;

// Seconds per km a simulated player runs at: 4:30 to 7:00.
const rivalPace = (pid) => Math.round(270 + noise(`${pid}:pace`) * 150);
const rivalTime = (b) => Math.round(rivalPace(rivalOf(b)) * battleKm(b) * (0.94 + noise(`${b.id}:t`) * 0.12));

// When the rival's time lands, or null if it never will in this battle.
const rivalFinishAt = (b) => {
  const mode = legacyMode(b);
  if (!b.startAt) return null;
  if (mode === "ghost_race") return b.startAt;
  if (mode === "blind_time_trial") return b.startAt + (1 + noise(`${b.id}:go`) * 9) * HOUR_MS + rivalTime(b) * 1000;
  if (mode === "live_race") return b.phase === "live" ? b.startAt + rivalTime(b) * 1000 : null;
  return null;
};

const rivalEntry = (b) => {
  const at = rivalFinishAt(b);
  return at != null && Date.now() >= at && at <= b.endAt ? { sec: rivalTime(b), at } : null;
};

const stepsOnDay = (s, pid, key) => (pid === ME ? myDay(s, key).steps : playerDayTotal(pid, key));

// Days in a row at the rising target since the start, finished days only.
const standing = (s, b, pid) => {
  let days = 0;
  let cursor = startOfDay(b.startAt).getTime();
  const stop = Math.min(Date.now(), b.endAt);
  while (cursor < stop) {
    const dayEnd = addDays(new Date(cursor), 1).getTime();
    if (dayEnd > Date.now()) break;
    if (stepsOnDay(s, pid, dayKey(new Date(cursor))) < standingTarget(days)) return { days, missedAt: dayEnd };
    days += 1;
    cursor = dayEnd;
  }
  return { days, missedAt: null };
};

// Hold the route: your best time over the route from any run that covers it.
const routeKm = (b) => b.routeKm || 2;
const myRouteBest = (s, b) => {
  const km = routeKm(b);
  const times = s.runs
    .filter((r) => r.startedAt >= b.startAt && r.startedAt <= b.endAt && r.distanceKm >= km * ROUTE_SHARE && r.durationSec > 0)
    .map((r) => Math.round(r.durationSec * (km / r.distanceKm)));
  return times.length ? Math.min(...times) : null;
};
const rivalRouteBest = (b) => {
  const at = b.startAt + noise(`${b.id}:route`) * 0.6 * (b.endAt - b.startAt);
  return Date.now() >= at ? Math.round(rivalPace(rivalOf(b)) * routeKm(b) * (0.94 + noise(`${b.id}:rt`) * 0.12)) : null;
};

// A side's score: steps, seconds, days or laps. Null means no time yet.
const battleValue = (s, b, pid) => {
  if (!b.startAt) return MODE[legacyMode(b)].unit === "time" ? null : 0;
  const to = Math.min(Date.now(), b.endAt);
  const mode = legacyMode(b);
  if (mode === "most_steps") {
    const steps = pid === ME ? myStepsBetween(s, b.startAt, to) : playerStepsBetween(pid, b.startAt, to);
    if (b.metric === "distance") return Math.round((pid === ME ? myDistanceBetween(s, b.startAt, to) : steps * STEP_KM) * 100) / 100;
    return steps;
  }
  if (mode === "last_one_standing") return standing(s, b, pid).days;
  if (mode === "hold_the_route") return pid === ME ? myRouteBest(s, b) : rivalRouteBest(b);
  if (pid === ME) return b.entries?.me?.sec ?? null;
  return rivalEntry(b)?.sec ?? null;
};

const decide = (mode, mine, theirs) => {
  if (mine == null && theirs == null) return null;
  if (mine == null) return "them";
  if (theirs == null) return "me";
  if (mine === theirs) return null;
  return (mine < theirs) === lowerWins(mode) ? "me" : "them";
};

const settleOne = (s, b) => {
  const opp = rivalOf(b);
  const mode = legacyMode(b);
  const mine = battleValue(s, b, ME);
  const theirs = battleValue(s, b, opp);
  let side = decide(mode, mine, theirs);
  if (mode === "last_one_standing") {
    const a = standing(s, b, ME);
    const c = standing(s, b, opp);
    side = a.missedAt && (!c.missedAt || a.missedAt < c.missedAt) ? "them" : c.missedAt && (!a.missedAt || c.missedAt < a.missedAt) ? "me" : decide(mode, mine, theirs);
  }
  b.status = "complete";
  b.final = { me: mine, opponent: theirs };
  b.winnerId = side === "me" ? ME : side === "them" ? opp : null;
  b.forfeit = MODE[mode]?.unit === "time" && (mine == null) !== (theirs == null);
  b.completedAt = Date.now();
  const player = playerById[opp];
  const stake = b.stakeOut || 0;
  if (b.winnerId === ME) {
    b.prize = award(s, { xp: 150, out: 15 + stake * 2, label: `Beat ${player?.name || "rival"}`, reason: "battle_win", refId: b.id });
    notify(s, { type: "battles", title: `You beat ${player?.name} 🏆`, body: `150 XP and ${15 + stake * 2} OUT are yours.`, link: `/battles/${b.id}` });
  } else {
    b.prize = award(s, { xp: 25, out: b.winnerId ? 0 : stake, label: b.winnerId ? "Battle played" : "Battle drawn", reason: "battle", refId: b.id });
    notify(s, { type: "battles", title: b.winnerId ? `${player?.name} won this one` : "Battle drawn", body: "25 XP for showing up. Run it back?", link: `/battles/${b.id}` });
  }
};

const settleBattles = (s) => {
  let any = false;
  for (const b of s.battles) {
    if (b.status !== "active") continue;
    const mode = legacyMode(b);
    const now = Date.now();
    let due = b.endAt && now >= b.endAt;
    if (!due && MODE[mode]?.kind === "distance" && b.startAt) due = b.entries?.me && rivalEntry(b);
    if (!due && mode === "last_one_standing") due = !!(standing(s, b, ME).missedAt || standing(s, b, rivalOf(b)).missedAt);
    if (due) {
      settleOne(s, b);
      any = true;
    }
  }
  return any;
};

const battleView = (s, b) => {
  const oppId = rivalOf(b);
  const mode = legacyMode(b);
  const def = MODE[mode];
  const done = b.status === "complete";
  const mine = done ? b.final.me : battleValue(s, b, ME);
  let theirs = done ? b.final.opponent : battleValue(s, b, oppId);
  const timed = def.unit === "time";
  const sealed = mode === "blind_time_trial" && !done && !(mine != null && theirs != null);
  if (sealed) theirs = null;
  const lobby = mode === "live_race" && b.status === "active" && b.phase !== "live";
  const side = mine == null && theirs == null ? null : decide(mode, mine, theirs);
  return {
    id: b.id,
    mode,
    modeName: def.name,
    metric: mode === "most_steps" ? b.metric || "steps" : def.unit,
    durationHours: b.durationHours,
    distanceM: mode === "hold_the_route" ? Math.round(routeKm(b) * 1000) : b.distanceM || null,
    routeKm: mode === "hold_the_route" ? routeKm(b) : null,
    routeName: b.routeName || null,
    stakeOut: b.stakeOut || 0,
    status: b.status,
    phase: lobby ? "lobby" : b.status === "active" ? "live" : b.status,
    readyMe: !!b.ready?.me,
    readyThem: !!b.ready?.them || (b.createdAt && Date.now() - b.createdAt > RIVAL_READY_MS),
    sealed,
    timed,
    myTimeIn: timed && mine != null,
    theirTimeIn: timed && (sealed ? !!rivalEntry(b) : theirs != null),
    ghostSec: mode === "ghost_race" && b.startAt ? rivalTime(b) : null,
    rivalPaceSec: mode === "live_race" ? rivalPace(oppId) : null,
    target: mode === "last_one_standing" && b.startAt ? standingTarget(Math.max(0, Math.floor((startOfDay().getTime() - startOfDay(b.startAt).getTime()) / DAY_MS))) : null,
    todaySteps: mode === "last_one_standing" ? { me: stepsOnDay(s, ME, dayKey()), them: playerStepsToday(oppId) } : null,
    incoming: b.status === "pending" && b.opponentId === ME,
    isChallenger: b.creatorId === ME,
    prize: b.prize || null,
    createdAt: b.createdAt,
    startAt: b.startAt || null,
    endAt: b.endAt || null,
    remainingMs: b.status === "active" && b.endAt ? Math.max(0, b.endAt - Date.now()) : 0,
    me: { player: meAsPlayer(s), value: mine },
    opponent: { player: publicPlayer(oppId), value: theirs },
    leader: side === "me" ? ME : side === "them" ? oppId : null,
    winnerId: b.winnerId ?? null,
    forfeit: !!b.forfeit,
    result: done ? (b.winnerId === ME ? "won" : b.winnerId ? "lost" : "draw") : null,
  };
};

const settleIfNeeded = async () => {
  await load();
  if (settleBattles(state)) changed();
};

export const listBattles = async (status = "all") => {
  await settleIfNeeded();
  return read((s) =>
    s.battles
      .filter((b) => b.status !== "declined" && (status === "all" || b.status === status))
      .map((b) => battleView(s, b))
      .sort((a, b) => (a.status === "pending" ? -1 : 0) - (b.status === "pending" ? -1 : 0) || (b.startAt || b.createdAt) - (a.startAt || a.createdAt))
  );
};

export const getBattle = async (id) => {
  await settleIfNeeded();
  return read((s) => {
    const b = s.battles.find((x) => x.id === id);
    if (!b) throw new EngineError("NOT_FOUND", "Battle not found.");
    return battleView(s, b);
  });
};

export const getBattleLimits = async () =>
  read((s) => {
    const me = requireMe(s);
    const rules = TIER_RULES[me.tier];
    const weekAgo = Date.now() - 7 * DAY_MS;
    const createdThisWeek = s.battles.filter((b) => b.creatorId === ME && b.createdAt >= weekAgo).length;
    const active = s.battles.filter((b) => b.status === "active").length;
    return { tier: me.tier, createdThisWeek, active, battlesPerWeek: rules.battlesPerWeek, maxActive: rules.maxActiveBattles, canCreate: createdThisWeek < rules.battlesPerWeek && active < rules.maxActiveBattles };
  });

export const createBattle = async ({ opponentId, mode = "most_steps", durationHours, distanceM, stakeOut = 0, routeRunId = null, metric = "steps" }) =>
  write((s) => {
    const me = requireMe(s);
    const def = MODE[mode];
    if (!def) throw new EngineError("BAD_MODE", "Pick a way to battle.");
    if (!playerById[opponentId]) throw new EngineError("NOT_FOUND", "Pick an opponent.");
    if (isRosterHidden(s, opponentId)) throw new EngineError("NOT_ALLOWED", "You took them off your list. Add them back first.");
    const rules = TIER_RULES[me.tier];
    const weekAgo = Date.now() - 7 * DAY_MS;
    if (s.battles.filter((b) => b.creatorId === ME && b.createdAt >= weekAgo).length >= rules.battlesPerWeek) {
      throw tierError("pro", "Free members can start 1 battle a week. Go Pro for unlimited battles.");
    }
    if (s.battles.filter((b) => b.status === "active").length >= rules.maxActiveBattles) {
      throw new EngineError("TOO_MANY", `You can have ${rules.maxActiveBattles} active battles at once.`);
    }
    const stake = Math.max(0, Math.min(500, Math.round(Number(stakeOut) || 0)));
    if (stake > balance(s, "out")) throw new EngineError("NOT_ENOUGH_OUT", "You don't have that much OUT to stake.");
    if (def.kind === "distance" && !def.distances.includes(distanceM)) throw new EngineError("DISTANCE_REQUIRED", "Pick a distance.");
    const hours = def.kind === "window" ? (def.durations.includes(durationHours) ? durationHours : def.defaultDuration) : null;
    const route = mode === "hold_the_route" && routeRunId ? s.runs.find((r) => r.id === routeRunId) : null;
    if (mode === "hold_the_route" && routeRunId && !route) throw new EngineError("NOT_FOUND", "That route has gone.");

    // Simulated players accept straight away.
    const now = Date.now();
    const b = {
      id: randomId("b"),
      mode,
      metric: mode === "most_steps" ? metric : undefined,
      creatorId: ME,
      opponentId,
      durationHours: hours,
      distanceM: def.kind === "distance" ? distanceM : null,
      routeKm: route ? route.distanceKm : mode === "hold_the_route" ? 2 : null,
      routeName: route?.title || null,
      stakeOut: stake,
      status: "active",
      phase: mode === "live_race" ? "lobby" : "live",
      ready: {},
      entries: {},
      createdAt: now,
      startAt: mode === "live_race" ? null : now,
      endAt: mode === "live_race" ? null : now + (hours || BLIND_FINISH_HOURS) * HOUR_MS,
    };
    if (stake) award(s, { out: -stake, label: "Battle stake held", reason: "battle_stake", refId: b.id });
    s.battles.push(b);
    return battleView(s, b);
  });

// Live race: both press ready, then the start lands on both phones together.
export const readyBattle = async (id) =>
  write((s) => {
    const b = s.battles.find((x) => x.id === id);
    if (!b || legacyMode(b) !== "live_race" || b.status !== "active" || b.phase === "live") throw new EngineError("NOT_ALLOWED", "This race has already started.");
    b.ready = { ...(b.ready || {}), me: Date.now(), them: b.ready?.them || Date.now() };
    b.phase = "live";
    b.startAt = Date.now() + LIVE_RACE_LEAD_MS;
    b.endAt = b.startAt + LIVE_RACE_HOURS * HOUR_MS;
    return battleView(s, b);
  });

// A saved run that covers a timed battle's distance becomes your time.
const applyRunToBattles = (s, run) => {
  const used = [];
  for (const b of s.battles) {
    if (b.status !== "active" || !b.startAt || MODE[legacyMode(b)]?.kind !== "distance") continue;
    if (b.entries?.me || run.startedAt < b.startAt - 30 * 1000 || run.startedAt > b.endAt) continue;
    const km = battleKm(b);
    if (!km || run.distanceKm < km) continue;
    b.entries = { ...(b.entries || {}), me: { sec: Math.round(run.durationSec * (km / run.distanceKm)), runId: run.id, at: Date.now() } };
    used.push(b.id);
  }
  return used;
};

export const respondToBattle = async (id, accept) =>
  write((s) => {
    const b = s.battles.find((x) => x.id === id);
    if (!b || b.status !== "pending") throw new EngineError("NOT_FOUND", "That challenge has gone.");
    if (accept) {
      b.status = "active";
      if (legacyMode(b) === "live_race") {
        b.phase = "lobby";
      } else {
        b.startAt = Date.now();
        b.endAt = b.startAt + (b.durationHours || BLIND_FINISH_HOURS) * HOUR_MS;
      }
    } else {
      b.status = "declined";
    }
    return battleView(s, b);
  });

export const cancelBattle = async (id) =>
  write((s) => {
    const b = s.battles.find((x) => x.id === id);
    if (!b || b.status !== "active") throw new EngineError("NOT_FOUND", "Only active battles can be cancelled.");
    if (b.creatorId !== ME) throw new EngineError("FORBIDDEN", "Only the challenger can cancel.");
    b.status = "cancelled";
    if (b.stakeOut) award(s, { out: b.stakeOut, label: "Stake returned", reason: "battle_stake", refId: b.id });
    return battleView(s, b);
  });

// ── Character select ──────────────────────────────────────────────────────────
// The people you battle most, as a fighting game roster: your record with each,
// their best day, and stat bars from their own numbers. Crossing someone off
// takes them out of your regulars without telling them.

const isRosterHidden = (s, pid) => (s.rosterHidden || []).includes(pid);

const statBars = (s, pid) => {
  const days = Array.from({ length: 14 }, (_, i) => stepsOnDay(s, pid, dayKey(addDays(new Date(), -1 - i))));
  const avg = days.reduce((a, b) => a + b, 0) / days.length;
  const best = Math.max(...days);
  const pace = pid === ME ? s.runs.find((r) => r.paceSecPerKm)?.paceSecPerKm || 360 : rivalPace(pid);
  const streak = pid === ME ? computeStreak(s) : playerStreak(pid);
  const clamp = (v) => Math.max(0.08, Math.min(1, v));
  return {
    bestDay: best,
    avgSteps: Math.round(avg),
    paceSec: pace,
    bars: [
      { key: "speed", label: "Speed", value: clamp((480 - pace) / 220) },
      { key: "stamina", label: "Stamina", value: clamp(avg / 18000) },
      { key: "streak", label: "Streak", value: clamp(streak / 30) },
      { key: "peak", label: "Peak", value: clamp(best / 25000) },
    ],
  };
};

export const getRivalRoster = async () => {
  await settleIfNeeded();
  return read((s) => {
    requireMe(s);
    const record = {};
    for (const b of s.battles) {
      const pid = rivalOf(b);
      const r = (record[pid] ||= { played: 0, wins: 0, losses: 0, last: 0 });
      r.played += 1;
      r.last = Math.max(r.last, b.createdAt);
      if (b.status === "complete") {
        if (b.winnerId === ME) r.wins += 1;
        else if (b.winnerId) r.losses += 1;
      }
    }
    const regulars = Object.keys(record).sort((a, b) => record[b].played - record[a].played || record[b].last - record[a].last);
    const fill = [...s.following, ...PLAYERS.map((p) => p.id)];
    const ids = [...new Set([...regulars, ...fill])].filter((pid) => playerById[pid] && !isRosterHidden(s, pid)).slice(0, 11);
    return {
      me: { player: meAsPlayer(s), ...statBars(s, ME) },
      roster: ids.map((pid) => ({ player: personView(s, pid), record: record[pid] || { played: 0, wins: 0, losses: 0 }, regular: !!record[pid], ...statBars(s, pid) })),
      hidden: (s.rosterHidden || []).map((pid) => publicPlayer(pid)).filter(Boolean),
    };
  });
};

export const hideFromRoster = async (pid) =>
  write((s) => {
    s.rosterHidden = [...new Set([...(s.rosterHidden || []), pid])];
  });

export const showInRoster = async (pid) =>
  write((s) => {
    s.rosterHidden = (s.rosterHidden || []).filter((x) => x !== pid);
  });

// A random rival near your level, for the mystery tile.
export const randomRival = async () =>
  read((s) => {
    const pool = PLAYERS.filter((p) => !isRosterHidden(s, p.id));
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return pick ? personView(s, pick.id) : null;
  });

// ── Crews ─────────────────────────────────────────────────────────────────────

const isMember = (crew, pid = ME) => crew.members.some((m) => m.id === pid);
const myRole = (crew) => crew.members.find((m) => m.id === ME)?.role || null;

const crewWeekKm = (s, crew) => {
  const from = startOfWeek().getTime();
  const now = Date.now();
  return crew.members.reduce((sum, m) => sum + (m.id === ME ? myDistanceBetween(s, from, now) : playerStepsBetween(m.id, from, now) * STEP_KM), 0);
};

const crewView = (s, crew, detailed = false) => {
  const weekKm = Math.round(crewWeekKm(s, crew) * 10) / 10;
  const view = {
    id: crew.id,
    name: crew.name,
    tagline: crew.tagline,
    city: crew.city,
    accent: crew.accent,
    logo: crew.logo,
    privacy: crew.privacy,
    weeklyGoalKm: crew.weeklyGoalKm,
    weekKm,
    badgeTier: crewBadgeTier(weekKm),
    isMember: isMember(crew),
    myRole: myRole(crew),
    inviteCode: isMember(crew) ? crew.inviteCode : null,
    joinPolicy: crew.privacy === "request" ? "request" : crew.privacy === "invite" ? "invite" : "open",
    chatPolicy: crew.chatPolicy === "admins" ? "admins" : "everyone",
    requested: (s.crewRequests || []).some((r) => r.crewId === crew.id && r.userId === ME && r.status === "pending"),
    ownerId: crew.ownerId,
    owner: crew.ownerId === ME ? (s.me ? meAsPlayer(s) : null) : publicPlayer(crew.ownerId),
    ...clubs.clubBits(s, crew),
    previewMembers: crew.members.slice(0, 5).map((m) => (m.id === ME ? meAsPlayer(s) : publicPlayer(m.id))).filter(Boolean),
  };
  if (detailed) {
    const from = startOfWeek().getTime();
    view.members = crew.members
      .map((m) => ({
        role: m.role,
        joinedAt: m.joinedAt,
        player: m.id === ME ? meAsPlayer(s) : publicPlayer(m.id),
        weekSteps: m.id === ME ? myStepsBetween(s, from, Date.now()) : playerStepsBetween(m.id, from, Date.now()),
        isOutside: m.id === ME ? !!s.me?.isOutside : playerIsOutside(m.id),
      }))
      .filter((m) => m.player);
  }
  return view;
};

const joinCrewInState = (s, crew, viaCode = false) => {
  const me = requireMe(s);
  if (isMember(crew)) return;
  crewArea.ensure(s);
  if (crew.privacy === "invite" && !viaCode) throw new EngineError("INVITE_ONLY", "This crew is invite only. Ask a member for the code.");
  const joined = Object.values(s.crews).filter((c) => isMember(c)).length;
  const limit = TIER_RULES[me.tier].maxCrewsJoined;
  if (joined >= limit) throw tierError(me.tier === "free" ? "pro" : "black", `Your membership lets you be in ${limit} crew${limit === 1 ? "" : "s"}. Upgrade to join more.`);
  // Crews that ask first get a request; a code from the crew skips it.
  if (crew.privacy === "request" && !viaCode) {
    if (!s.crewRequests.some((r) => r.crewId === crew.id && r.userId === ME && r.status === "pending")) {
      s.crewRequests.push({ id: randomId("req"), crewId: crew.id, userId: ME, at: Date.now(), status: "pending" });
    }
    return;
  }
  crew.members.push({ id: ME, role: "member", joinedAt: Date.now() });
  notify(s, { type: "crews", title: `You joined ${crew.name}`, body: "Say hello in the crew chat.", link: `/crew/${crew.id}` });
};

export const listMyCrews = async () => read((s) => Object.values(s.crews).filter((c) => isMember(c)).map((c) => crewView(s, c)));

export const discoverCrews = async (query = "") =>
  read((s) => {
    const q = query.trim().toLowerCase();
    return Object.values(s.crews)
      .filter((c) => !isMember(c) && (!q || c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q)))
      .map((c) => crewView(s, c))
      .sort((a, b) => Number(b.city === s.me?.city) - Number(a.city === s.me?.city) || b.weekKm - a.weekKm);
  });

export const getCrew = async (id) =>
  read((s) => {
    const crew = s.crews[id];
    if (!crew) throw new EngineError("NOT_FOUND", "Crew not found.");
    return crewView(s, crew, true);
  });

export const getCrewLimits = async () =>
  read((s) => {
    const me = requireMe(s);
    const rules = TIER_RULES[me.tier];
    const owned = Object.values(s.crews).filter((c) => c.ownerId === ME).length;
    const joined = Object.values(s.crews).filter((c) => isMember(c)).length;
    return { tier: me.tier, owned, joined, maxOwned: rules.maxCrewsOwned, maxJoined: rules.maxCrewsJoined, canCreate: owned < rules.maxCrewsOwned, canJoin: joined < rules.maxCrewsJoined };
  });

export const createCrew = async ({ name, tagline = "", city, accent = "#3d8bff", privacy = "public", logo = null }) =>
  write((s) => {
    const me = requireMe(s);
    const rules = TIER_RULES[me.tier];
    const owned = Object.values(s.crews).filter((c) => c.ownerId === ME).length;
    if (rules.maxCrewsOwned === 0) throw tierError("pro", "Owning a crew is a Pro feature.");
    if (owned >= rules.maxCrewsOwned) throw tierError("black", `You can own ${rules.maxCrewsOwned} crew${rules.maxCrewsOwned === 1 ? "" : "s"} on ${me.tier === "pro" ? "Pro" : "Black"}.`);
    const clean = (name || "").trim();
    if (clean.length < 3) throw new EngineError("BAD_NAME", "Crew names need at least 3 characters.");
    if (Object.values(s.crews).some((c) => c.name.toLowerCase() === clean.toLowerCase())) throw new EngineError("BAD_NAME", "A crew with that name already exists.");
    const id = randomId("c");
    s.crews[id] = { id, name: clean, tagline: tagline.trim(), city: city || me.city, accent, logo, privacy, weeklyGoalKm: 100, inviteCode: randomCode(6), ownerId: ME, createdAt: Date.now(), members: [{ id: ME, role: "owner", joinedAt: Date.now() }] };
    s.crewChat[id] = [];
    s.crewFeed[id] = [];
    return crewView(s, s.crews[id], true);
  });

export const joinCrew = async (id) =>
  write((s) => {
    const crew = s.crews[id];
    if (!crew) throw new EngineError("NOT_FOUND", "Crew not found.");
    joinCrewInState(s, crew);
    return crewView(s, crew, true);
  });

export const joinCrewByCode = async (code) =>
  write((s) => {
    const crew = Object.values(s.crews).find((c) => c.inviteCode.toLowerCase() === (code || "").trim().toLowerCase());
    if (!crew) throw new EngineError("BAD_CODE", "No crew has that code.");
    joinCrewInState(s, crew, true);
    return crewView(s, crew, true);
  });

export const leaveCrew = async (id) =>
  write((s) => {
    const crew = s.crews[id];
    if (!crew || !isMember(crew)) return;
    crew.members = crew.members.filter((m) => m.id !== ME);
    if (crew.ownerId === ME) {
      if (crew.members.length === 0) {
        delete s.crews[id];
        return;
      }
      const next = crew.members.find((m) => m.role === "admin") || crew.members[0];
      next.role = "owner";
      crew.ownerId = next.id;
    }
  });

const requireCrewRole = (crew, roles) => {
  if (!roles.includes(myRole(crew))) throw new EngineError("FORBIDDEN", "Only crew admins can do that.");
};

export const updateCrew = async (id, patch) =>
  write((s) => {
    const crew = s.crews[id];
    if (!crew) throw new EngineError("NOT_FOUND", "Crew not found.");
    requireCrewRole(crew, ["owner", "admin"]);
    if (patch.logo !== undefined) {
      if (crew.ownerId !== ME) throw new EngineError("FORBIDDEN", "Only the owner can change the logo.");
      if (!tierAtLeast(s.me.tier, "pro")) throw tierError("pro", "Crew logos are a Pro feature.");
    }
    if (patch.privacy !== undefined && !["public", "request", "invite"].includes(patch.privacy)) throw new EngineError("BAD_POLICY", "Pick who can join.");
    if (patch.chatPolicy !== undefined && !["everyone", "admins"].includes(patch.chatPolicy)) throw new EngineError("BAD_POLICY", "Pick who can post.");
    if (patch.weeklyGoalKm !== undefined && !(patch.weeklyGoalKm >= 10 && patch.weeklyGoalKm <= 5000)) throw new EngineError("BAD_GOAL", "Pick a goal between 10 and 5,000 km.");
    for (const key of ["name", "tagline", "accent", "privacy", "logo", "weeklyGoalKm", "city", "chatPolicy"]) {
      if (patch[key] !== undefined) crew[key] = patch[key];
    }
    return crewView(s, crew, true);
  });

export const deleteCrew = async (id) =>
  write((s) => {
    const crew = s.crews[id];
    if (!crew) return;
    if (crew.ownerId !== ME) throw new EngineError("FORBIDDEN", "Only the owner can delete the crew.");
    delete s.crews[id];
    delete s.crewChat[id];
    delete s.crewFeed[id];
  });

export const removeCrewMember = async (crewId, pid) =>
  write((s) => {
    const crew = s.crews[crewId];
    if (!crew) throw new EngineError("NOT_FOUND", "Crew not found.");
    requireCrewRole(crew, ["owner", "admin"]);
    if (pid === crew.ownerId) throw new EngineError("FORBIDDEN", "You can't remove the owner.");
    crew.members = crew.members.filter((m) => m.id !== pid);
    return crewView(s, crew, true);
  });

export const setCrewRole = async (crewId, pid, role) =>
  write((s) => {
    const crew = s.crews[crewId];
    if (!crew) throw new EngineError("NOT_FOUND", "Crew not found.");
    requireCrewRole(crew, ["owner"]);
    const member = crew.members.find((m) => m.id === pid);
    if (!member || member.role === "owner") throw new EngineError("FORBIDDEN", "Can't change that member's role.");
    member.role = role === "admin" ? "admin" : "member";
    return crewView(s, crew, true);
  });

export const getCrewLeaderboard = async (id, period = "week") =>
  read((s) => {
    const crew = s.crews[id];
    if (!crew) throw new EngineError("NOT_FOUND", "Crew not found.");
    const from = periodStart(period);
    return crew.members
      .map((m) => ({ player: m.id === ME ? meAsPlayer(s) : publicPlayer(m.id), steps: m.id === ME ? myStepsBetween(s, from, Date.now()) : playerStepsBetween(m.id, from, Date.now()), role: m.role }))
      .filter((r) => r.player)
      .sort((a, b) => b.steps - a.steps)
      .map((r, i) => ({ ...r, rank: i + 1, isMe: r.player.id === ME, km: Math.round(r.steps * STEP_KM * 10) / 10 }));
  });

// ── Crew tab: race, goal, feed, chat, requests, reports (see crew.js) ─────────

const crewArea = makeCrew({
  read, write, touch, requireMe, notify, EngineError, ME,
  publicPlayer, meAsPlayer, playerStepsBetween, myStepsBetween, myDistanceBetween, playerIsOutside,
  storyState: (s, pid) => storyState(s, pid),
  clubBits: (s, crew) => clubs.clubBits(s, crew),
  STEP_KM,
  PHOTO: photoFor,
});
export const {
  getCrewHeader,
  getCrewRace,
  getCrewGoal,
  getCrewDays,
  listCrewChallenges,
  joinCrewChallenge,
  getCrewStats,
  getCityBoard,
  getCrewFeed,
  postToCrew,
  shareRunToCrew,
  togglePostLike,
  getPostComments,
  commentOnPost,
  deletePost,
  getCrewMessages,
  sendCrewMessage,
  shareToCrewChat,
  reactToMessage,
  toggleChatRun,
  getCrewUnread,
  markCrewRead,
  getCrewTyping,
  listCrewsNear,
  cancelJoinRequest,
  listJoinRequests,
  decideJoinRequest,
  reportContent,
  blockPlayer,
  unblockPlayer,
  listBlocked,
  listCrewStories,
  listClubStories,
  cheerStory,
  replyToStory,
} = crewArea.api;

// ── Run clubs and club v club (see clubs.js) ──────────────────────────────────

const clubs = makeClubs({ read, write, touch, requireMe, notify, award, myStepsBetween, publicPlayer, meAsPlayer, EngineError, ME });
export const {
  findClubs,
  listClubRuns,
  getClubRun,
  rsvpClubRun,
  checkInClubRun,
  getFounding,
  claimClub,
  listMyClaims,
  getClubLeague,
  getFixture,
  getMyFixture,
  listClubBattles,
  getClubBattle,
  getClubRoster,
  challengeClub,
  voteClubBattle,
  respondClubBattle,
  cancelClubBattle,
} = clubs;

// ── Profile, membership, wallet, friends, badges, emotes (see profile.js) ─────

const profileArea = makeProfile({
  read, write, touch, requireMe, notify, award, EngineError, ME, PLAYERS, ACTIVE_DAY_STEPS, STEP_KM,
  computeStreak, computeLongestStreak, myDay, balance, myStepsBetween, playerStepsBetween, playerStreak, playerXp,
  personView, meAsPlayer, levelFromXp,
  eventViews: (s) => EVENTS.map((ev) => eventView(s, ev)),
  crewBrief: (c) => ({ id: c.id, name: c.name, logo: c.logo || null, cover: c.cover || null, accent: c.accent, area: c.area || c.city, city: c.city, memberCount: c.members.length + (c.extraMembers || 0), verified: c.status === "verified", isMember: c.members.some((m) => m.id === ME) }),
});
export const {
  getMembershipDetails,
  purchaseMembership,
  cancelMembership,
  restorePurchases,
  getStreakStatus,
  spendStreakFreeze,
  listBadges,
  listEmotes,
  setEmoteTray,
  markEmoteSeen,
  getPlayerCard,
  searchAll,
  suggestPeople,
  matchContacts,
  getReferrals,
  recordInviteShare,
  claimReferral,
  getOutHistory,
} = profileArea;

// ── Runs (Move tab sessions) ──────────────────────────────────────────────────

export const saveRun = async (run) =>
  write((s) => {
    requireMe(s);
    const distanceKm = Math.max(0, Number(run.distanceKm) || 0);
    const durationSec = Math.max(0, Math.round(Number(run.durationSec) || 0));
    const saved = {
      id: run.id || randomId("run"),
      title: run.title || defaultRunTitle(run.startedAt || Date.now()),
      type: run.type || "run",
      startedAt: run.startedAt || Date.now() - durationSec * 1000,
      endedAt: run.endedAt || Date.now(),
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationSec,
      paceSecPerKm: distanceKm > 0 ? Math.round(durationSec / distanceKm) : null,
      calories: run.calories ?? Math.round(distanceKm * 62),
      route: Array.isArray(run.route) ? run.route.filter((_, i, arr) => arr.length <= 500 || i % Math.ceil(arr.length / 500) === 0) : [],
    };
    s.runs = [saved, ...s.runs.filter((r) => r.id !== saved.id)];
    const xp = Math.round(saved.distanceKm * 10);
    if (xp > 0) award(s, { xp, out: Math.floor(saved.distanceKm), label: `${saved.distanceKm} km ${saved.type}`, reason: "run", refId: saved.id });
    const battles = applyRunToBattles(s, saved);
    settleBattles(s);
    return { ...saved, battles };
  });

const defaultRunTitle = (ms) => {
  const h = new Date(ms).getHours();
  const part = h < 12 ? "Morning" : h < 17 ? "Afternoon" : h < 21 ? "Evening" : "Night";
  return `${part} run`;
};

export const listRuns = async ({ limit = 50 } = {}) => read((s) => s.runs.slice(0, limit));
export const getRun = async (id) => read((s) => s.runs.find((r) => r.id === id) || null);
export const deleteRun = async (id) =>
  write((s) => {
    s.runs = s.runs.filter((r) => r.id !== id);
  });

// ── Events ────────────────────────────────────────────────────────────────────

// Seed events repeat weekly so the calendar never runs dry.
const eventOccurrence = (s, ev) => {
  const week = 7 * DAY_MS;
  // Events start at a sensible local time: the day comes from startInHours,
  // the time of day from startHour.
  const dayStart = startOfDay(s.seededAt + ev.startInHours * HOUR_MS).getTime();
  const base = ev.startHour == null ? s.seededAt + ev.startInHours * HOUR_MS : dayStart + ev.startHour * HOUR_MS;
  const duration = ev.durationHours * HOUR_MS;
  const now = Date.now();
  const k = Math.max(0, Math.ceil((now - duration - 30 * 60 * 1000 - base) / week));
  const start = base + k * week;
  return { start, end: start + duration };
};

const eventView = (s, ev) => {
  const { start, end } = eventOccurrence(s, ev);
  const occId = `${ev.id}@${start}`;
  const mine = s.events[occId] || {};
  const now = Date.now();
  const going = !!mine.rsvp;
  const count = ev.seedRsvps + Math.floor(noise(occId) * 6) + (going ? 1 : 0);
  const tier = s.me?.tier || "free";
  return {
    id: ev.id,
    occurrenceId: occId,
    title: ev.title,
    description: ev.description,
    city: ev.city,
    location: ev.location,
    image: ev.image,
    organiser: ev.organiser,
    organiserType: ev.organiserType,
    tierRequired: ev.tierRequired,
    canAttend: tierAtLeast(tier, ev.tierRequired),
    startAt: start,
    endAt: end,
    capacity: ev.capacity,
    rsvpCount: Math.min(ev.capacity, count),
    spotsLeft: Math.max(0, ev.capacity - count),
    isFull: count >= ev.capacity && !going,
    isGoing: going,
    checkedIn: !!mine.checkedIn,
    status: now < start ? "upcoming" : now <= end ? "live" : "ended",
    checkInOpen: now >= start - HOUR_MS && now <= end + 30 * 60 * 1000,
    rewardXp: ev.rewardXp,
    rewardOut: ev.rewardOut,
  };
};

export const listEvents = async ({ city } = {}) =>
  read((s) =>
    EVENTS.map((ev) => eventView(s, ev))
      .filter((e) => !city || e.city === city)
      .sort((a, b) => a.startAt - b.startAt)
  );

export const getEvent = async (id) =>
  read((s) => {
    const ev = EVENTS.find((e) => e.id === id);
    if (!ev) throw new EngineError("NOT_FOUND", "Event not found.");
    return eventView(s, ev);
  });

export const rsvpEvent = async (id, going = true) =>
  write((s) => {
    requireMe(s);
    const ev = EVENTS.find((e) => e.id === id);
    if (!ev) throw new EngineError("NOT_FOUND", "Event not found.");
    const view = eventView(s, ev);
    if (going) {
      if (!view.canAttend) throw tierError(ev.tierRequired, `This event is for ${ev.tierRequired === "black" ? "Black" : "Pro and Black"} members.`);
      if (view.isFull) throw new EngineError("FULL", "This event is full.");
    }
    s.events[view.occurrenceId] = { ...(s.events[view.occurrenceId] || {}), rsvp: going, rsvpAt: Date.now() };
    return eventView(s, ev);
  });

export const checkInEvent = async (id) =>
  write((s) => {
    requireMe(s);
    const ev = EVENTS.find((e) => e.id === id);
    if (!ev) throw new EngineError("NOT_FOUND", "Event not found.");
    const view = eventView(s, ev);
    if (!view.canAttend) throw tierError(ev.tierRequired, "This event is members only.");
    if (view.checkedIn) return view;
    if (!view.checkInOpen) throw new EngineError("CLOSED", "Check-in opens an hour before the start.");
    s.events[view.occurrenceId] = { ...(s.events[view.occurrenceId] || {}), rsvp: true, checkedIn: true, checkedInAt: Date.now() };
    award(s, { xp: ev.rewardXp, out: ev.rewardOut, label: `Checked in: ${ev.title}`, reason: "event", refId: view.occurrenceId });
    notify(s, { type: "events", title: "Checked in ✅", body: `${ev.rewardXp} XP and ${ev.rewardOut} OUT for showing up to ${ev.title}.`, link: `/events/${ev.id}` });
    return eventView(s, ev);
  });

// ── Drops ─────────────────────────────────────────────────────────────────────

const dropView = (s, d) => {
  const releaseAt = s.seededAt + d.releaseInHours * HOUR_MS;
  const earlyAt = releaseAt - d.earlyAccessHours * HOUR_MS;
  const now = Date.now();
  const tier = s.me?.tier || "free";
  const early = tierAtLeast(tier, "pro");
  const sold = now < releaseAt ? 0 : Math.min(d.stock, Math.round(((now - releaseAt) / HOUR_MS) * (d.stock / 60)));
  const remaining = Math.max(0, d.stock - sold);
  const mine = s.drops[d.id] || {};
  let status = "upcoming";
  if (d.stock === 0 || (now >= releaseAt && remaining === 0)) status = "soldout";
  else if (now >= releaseAt) status = "live";
  else if (now >= earlyAt) status = "early";
  return {
    id: d.id,
    title: d.title,
    subtitle: d.subtitle,
    description: d.description,
    image: d.image,
    priceGbp: d.priceGbp,
    sizes: d.sizes,
    tag: d.tag,
    releaseAt,
    earlyAccessAt: earlyAt,
    status,
    canBuy: !mine.reservation && (status === "live" || (status === "early" && early)),
    hasEarlyAccess: early,
    stock: d.stock,
    remaining: d.stock === 0 ? 0 : remaining,
    reminder: !!mine.reminder,
    reservation: mine.reservation || null,
  };
};

const fireDropReminders = (s) => {
  let any = false;
  for (const d of DROPS) {
    const mine = s.drops[d.id];
    if (!mine?.reminder || mine.notified) continue;
    const v = dropView(s, d);
    if (v.status === "live" || (v.status === "early" && v.hasEarlyAccess)) {
      mine.notified = true;
      notify(s, { type: "drops", title: `${d.title} is live`, body: v.status === "early" ? "Your early access window is open." : "Go get it before it's gone.", link: `/drops/${d.id}`, image: d.image });
      any = true;
    }
  }
  return any;
};

export const listDrops = async () => {
  await load();
  if (fireDropReminders(state)) changed();
  return read((s) => {
    const order = { live: 0, early: 1, upcoming: 2, soldout: 3 };
    return DROPS.map((d) => dropView(s, d)).sort((a, b) => order[a.status] - order[b.status] || a.releaseAt - b.releaseAt);
  });
};

export const getDrop = async (id) =>
  read((s) => {
    const d = DROPS.find((x) => x.id === id);
    if (!d) throw new EngineError("NOT_FOUND", "Drop not found.");
    return dropView(s, d);
  });

export const toggleDropReminder = async (id) =>
  write((s) => {
    const d = DROPS.find((x) => x.id === id);
    if (!d) throw new EngineError("NOT_FOUND", "Drop not found.");
    const mine = s.drops[id] || {};
    s.drops[id] = { ...mine, reminder: !mine.reminder, notified: false };
    return dropView(s, d);
  });

// Checkout isn't live yet: this holds the item for the member.
export const reserveDrop = async (id, size) =>
  write((s) => {
    requireMe(s);
    const d = DROPS.find((x) => x.id === id);
    if (!d) throw new EngineError("NOT_FOUND", "Drop not found.");
    const v = dropView(s, d);
    if (v.status === "early" && !v.hasEarlyAccess) throw tierError("pro", "Early access is for Pro and Black members.");
    if (!v.canBuy) throw new EngineError("UNAVAILABLE", v.status === "soldout" ? "Sold out." : "Not on sale yet.");
    if (d.sizes.length > 1 && !d.sizes.includes(size)) throw new EngineError("SIZE", "Pick a size.");
    s.drops[id] = { ...(s.drops[id] || {}), reservation: { size: size || d.sizes[0], at: Date.now(), ref: `OH-${randomCode(5)}` } };
    notify(s, { type: "drops", title: `${d.title} reserved`, body: "We'll message you when checkout opens.", link: `/drops/${d.id}`, image: d.image });
    return dropView(s, d);
  });

// ── Rewards ───────────────────────────────────────────────────────────────────

const redemptionsThisWeek = (s) => s.redemptions.filter((r) => r.at >= Date.now() - 7 * DAY_MS).length;

export const listRewards = async () =>
  read((s) => {
    const me = requireMe(s);
    const out = balance(s, "out");
    const limit = TIER_RULES[me.tier].redemptionsPerWeek;
    const used = redemptionsThisWeek(s);
    return {
      balance: out,
      weeklyLimit: limit,
      usedThisWeek: used,
      rewards: REWARDS.map((r) => {
        const tierOk = tierAtLeast(me.tier, r.tierRequired);
        const lockedReason = !tierOk ? `${r.tierRequired === "black" ? "Black" : "Pro"} only` : used >= limit ? "Weekly limit reached" : out < r.costOut ? `${r.costOut - out} OUT to go` : null;
        return { ...r, canRedeem: !lockedReason, lockedReason };
      }),
    };
  });

export const redeemReward = async (id) =>
  write((s) => {
    const me = requireMe(s);
    const r = REWARDS.find((x) => x.id === id);
    if (!r) throw new EngineError("NOT_FOUND", "Reward not found.");
    if (!tierAtLeast(me.tier, r.tierRequired)) throw tierError(r.tierRequired, `This reward is for ${r.tierRequired === "black" ? "Black" : "Pro and Black"} members.`);
    const limit = TIER_RULES[me.tier].redemptionsPerWeek;
    if (redemptionsThisWeek(s) >= limit) throw tierError(me.tier === "free" ? "pro" : "black", `You've used your ${limit} reward${limit === 1 ? "" : "s"} this week.`);
    if (balance(s, "out") < r.costOut) throw new EngineError("BALANCE", "Not enough OUT yet.");
    const code = `OUT-${randomCode(6)}`;
    s.ledger.push({ id: randomId("tx"), type: "out", amount: -r.costOut, label: r.title, reason: "redeem", refId: r.id, at: Date.now() });
    const redemption = { id: randomId("rd"), rewardId: r.id, title: r.title, partner: r.partner, code, at: Date.now(), expiresAt: Date.now() + 30 * DAY_MS };
    s.redemptions.unshift(redemption);
    notify(s, { type: "rewards", title: "Reward unlocked", body: `${r.title} (${r.partner}). Your code is ${code}.`, link: "/rewards" });
    return redemption;
  });

export const listRedemptions = async () => read((s) => s.redemptions);

// ── News ──────────────────────────────────────────────────────────────────────

const newsView = (s, n) => ({ ...n, publishedAt: s.seededAt - n.hoursAgo * HOUR_MS });
export const listNews = async () => read((s) => NEWS.map((n) => newsView(s, n)).sort((a, b) => b.publishedAt - a.publishedAt));
export const getNews = async (id) =>
  read((s) => {
    const n = NEWS.find((x) => x.id === id);
    if (!n) throw new EngineError("NOT_FOUND", "Story not found.");
    return newsView(s, n);
  });

// ── Notifications ─────────────────────────────────────────────────────────────

export const listNotifications = async () => {
  await settleIfNeeded();
  await load();
  if (fireDropReminders(state)) changed();
  return read((s) => s.notifications);
};

export const unreadNotificationCount = async () => read((s) => s.notifications.filter((n) => !n.read).length);

export const markNotificationRead = async (id) =>
  write((s) => {
    const n = s.notifications.find((x) => x.id === id);
    if (n) n.read = true;
  });

export const markAllNotificationsRead = async () =>
  write((s) => {
    s.notifications.forEach((n) => {
      n.read = true;
    });
  });

export const clearNotifications = async () =>
  write((s) => {
    s.notifications = [];
  });

// ── Settings ──────────────────────────────────────────────────────────────────

export const getSettings = async () => read((s) => s.settings);

export const updateSettings = async (patch) =>
  write((s) => {
    s.settings = {
      ...s.settings,
      ...patch,
      notifications: { ...s.settings.notifications, ...(patch.notifications || {}) },
      privacy: { ...s.settings.privacy, ...(patch.privacy || {}) },
    };
    return s.settings;
  });

// Test hook: lets tests start from a clean in-memory state.
export const __resetForTests = () => {
  state = freshState();
  loading = Promise.resolve(state);
};
