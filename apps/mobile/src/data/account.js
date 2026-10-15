// The member's account on the local engine: settings that follow the demo's
// Settings screens, privacy, date of birth and under 18 mode, a linked
// parent, blocked people, your patch (a city or town, then an area in it),
// your week in numbers, downloading your data and closing your account.
//
// Built by engine.js with its private helpers (like clubs.js), so it reads
// and writes the same saved world. remoteAccount.js is the Supabase twin with
// the same names and shapes.

import { UK_AREAS, UK_CITIES } from "./seedAccount";
import { DAY_MS, addDays, dayKey, startOfWeek } from "./time";
import { noise } from "./random";

// ── Settings ──────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS = {
  units: "km",
  haptics: true,
  voiceCues: true,
  textScale: 1,
  // What a run sounds and feels like.
  sound: { countdownVoice: "hype", buzzKm: true, buzzTurns: true, winSound: true, emoteSounds: false, duckMusic: true },
  // What may send a push. The inbox keeps everything either way.
  pings: { challenges: true, overtakes: true, club: true, streak: true, drops: false, news: false },
  quietHours: { on: true, from: 22, to: 7 },
  // Older per-type switches the engine still reads when it writes the inbox.
  notifications: { battles: true, crews: true, drops: true, events: true, rewards: true },
  privacy: {
    showOnLeaderboards: true,
    showOutsideStatus: true,
    ghost: false,
    spotAs: "area", // area | city
    hideRouteEnds: true,
    mapVisibility: "friends", // everyone | friends | crew
  },
  // phone (the motion chip) | apple_health | health_connect | garmin | strava
  stepSource: "phone",
  // What the member allowed on the permissions step.
  permissions: { location: null, motion: null, notifications: null },
};

const NESTED = ["sound", "pings", "quietHours", "notifications", "privacy", "permissions"];

export const mergeSettings = (base = {}, patch = {}) => {
  const out = { ...DEFAULT_SETTINGS, ...base, ...patch };
  for (const key of NESTED) out[key] = { ...DEFAULT_SETTINGS[key], ...(base[key] || {}), ...(patch[key] || {}) };
  if (typeof out.textScale !== "number" || Number.isNaN(out.textScale)) out.textScale = 1;
  out.textScale = Math.min(1.4, Math.max(0.8, Math.round(out.textScale * 10) / 10));
  return out;
};

// How many pings are switched on, for the Settings row ("6 on").
export const pingsOn = (settings) => Object.values(settings?.pings || {}).filter(Boolean).length + (settings?.quietHours?.on ? 1 : 0);

// ── Age ───────────────────────────────────────────────────────────────────────

export const MIN_AGE = 13;
export const ADULT_AGE = 18;

const parseDate = (value) => {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return null;
  return d;
};

// Whole years between a date of birth and now.
export const ageOn = (birthDate, at = new Date()) => {
  const d = parseDate(birthDate);
  if (!d) return null;
  let age = at.getFullYear() - d.getFullYear();
  const before = at.getMonth() < d.getMonth() || (at.getMonth() === d.getMonth() && at.getDate() < d.getDate());
  if (before) age -= 1;
  return age;
};

export const isMinorDate = (birthDate) => {
  const age = ageOn(birthDate);
  return age != null && age < ADULT_AGE;
};

// The same check the server runs on a date of birth.
export const birthDateProblem = (birthDate) => {
  const d = parseDate(birthDate);
  if (!d || d.getTime() > Date.now() || d.getFullYear() < 1900) return { code: "BAD_DATE", message: "That date doesn't look right." };
  if (ageOn(birthDate) < MIN_AGE) return { code: "TOO_YOUNG", message: `Outhere is for ${MIN_AGE} and over.` };
  return null;
};

// ── Places ────────────────────────────────────────────────────────────────────

const kmBetween = (aLat, aLng, bLat, bLng) => {
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

// Two letters for an area's crest: Southwark SW, Hackney HK, Tower Hamlets TH.
const CRESTS = { Southwark: "SW", Hackney: "HK", Lambeth: "LB", Camden: "CM", Islington: "IS", Lewisham: "LW", Greenwich: "GR", Wandsworth: "WW", Westminster: "WM", Newham: "NH", Haringey: "HG", Croydon: "CR", Bromley: "BR", Barnet: "BA", Brent: "BT", Ealing: "EA", Enfield: "EN", Harrow: "HW", Merton: "MT", Sutton: "ST", Bexley: "BX", Redbridge: "RB", Havering: "HV", Hounslow: "HS", Hillingdon: "HD" };
export const crestLetters = (name = "") => {
  if (CRESTS[name]) return CRESTS[name];
  const words = name.replace(/\b(and|upon|of|the)\b/gi, " ").split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  const w = words[0] || "?";
  const consonant = w.slice(1).match(/[bcdfghjklmnpqrstvwxyz]/i);
  return (w[0] + (consonant ? consonant[0] : w[1] || "")).toUpperCase();
};

const placeView = (c, at) => ({
  id: c.id,
  name: c.name,
  region: c.region,
  kind: c.kind || "city",
  isLive: !!c.isLive,
  playsFor: c.isLive ? null : c.region,
  distanceKm: at && c.lat != null ? Math.round(kmBetween(at.lat, at.lng, c.lat, c.lng)) : null,
});

const matches = (c, q) => !q || c.name.toLowerCase().includes(q) || (c.region || "").toLowerCase().includes(q);


// ── Your week ─────────────────────────────────────────────────────────────────
// Shared by both data sources: days is { 'YYYY-MM-DD': { steps, distance,
// activeMinutes } } and ledger is [{ type: 'xp' | 'out', amount, at }].

export const periodRange = (period, offset = 0, now = new Date()) => {
  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const to = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
    return { from, to, days: Math.round((to.getTime() - from.getTime()) / DAY_MS) };
  }
  const from = addDays(startOfWeek(now), -7 * offset);
  return { from, to: addDays(from, 7), days: 7 };
};

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

const periodBars = (period, offset, days, ledger) => {
  const { from, days: n } = periodRange(period, offset);
  return Array.from({ length: n }, (_, i) => {
    const date = addDays(from, i);
    const key = dayKey(date);
    const d = days[key] || {};
    const a = date.getTime();
    const b = addDays(date, 1).getTime();
    const earned = (type) => ledger.filter((t) => t.type === type && t.amount > 0 && t.at >= a && t.at < b).reduce((sum, t) => sum + t.amount, 0);
    return {
      date: key,
      label: period === "week" ? LETTERS[i] : i === 0 || (i + 1) % 7 === 0 ? String(i + 1) : "",
      steps: d.steps || 0,
      distanceKm: Math.round((d.distance || 0) * 10) / 10,
      activeMinutes: d.activeMinutes || 0,
      xp: earned("xp"),
      out: earned("out"),
      future: a > Date.now(),
      today: key === dayKey(),
    };
  });
};

const sum = (bars, k) => bars.reduce((t, b) => t + (b[k] || 0), 0);

export const buildSummary = ({ period = "week", offset = 0, days = {}, ledger = [], goal = 10000 }) => {
  const bars = periodBars(period, offset, days, ledger);
  const before = periodBars(period, offset + 1, days, ledger);
  const { from, to } = periodRange(period, offset);
  const steps = sum(bars, "steps");
  const prevSteps = sum(before, "steps");
  const best = bars.reduce((top, b) => (b.steps > (top?.steps || 0) ? b : top), null);
  return {
    period,
    offset,
    from: from.getTime(),
    to: to.getTime(),
    goal,
    bars,
    steps,
    distanceKm: Math.round(sum(bars, "distanceKm") * 10) / 10,
    activeMinutes: sum(bars, "activeMinutes"),
    xp: sum(bars, "xp"),
    out: sum(bars, "out"),
    best: best && best.steps > 0 ? { date: best.date, steps: best.steps } : null,
    previous: { steps: prevSteps },
    change: prevSteps > 0 ? Math.round(((steps - prevSteps) / prevSteps) * 100) : null,
    // Days that beat the same day the period before.
    beaten: bars.filter((b, i) => !b.future && b.steps > 0 && b.steps > (before[i]?.steps || 0)).length,
    counted: bars.filter((b) => !b.future).length,
    goalDays: bars.filter((b) => b.steps >= goal).length,
  };
};

// ── Module ────────────────────────────────────────────────────────────────────

export function makeAccount({ read, write, requireMe, EngineError, ME, players = [], resetAll, myStepsBetween, getOutsideNow, listCities, listAreas }) {
  const settingsOf = (s) => mergeSettings(s.settings);
  const minor = (s) => !!s.me && isMinorDate(s.me.birthDate);

  // A friend is someone you follow; a club mate shares a crew with you.
  const friendOrClubMate = (s, pid) =>
    (s.following || []).includes(pid) ||
    Object.values(s.crews || {}).some((c) => c.members.some((m) => m.id === ME) && c.members.some((m) => m.id === pid));

  // Called by the engine before a battle or a drop order. Throws for an
  // under 18 going outside friends and club, the same rule as the server.
  const guardMinor = (s, kind, targetId) => {
    if (!minor(s)) return;
    if (kind === "drop") throw new EngineError("UNDER_18", "Drops open on your 18th birthday. OUT still buys emotes and badges.");
    if (kind === "surprise") throw new EngineError("UNDER_18", "No mystery challengers in under 18 mode.");
    if (kind === "battle" && !friendOrClubMate(s, targetId)) {
      throw new EngineError("UNDER_18", "In under 18 mode you battle friends and your club.");
    }
  };

  const getSettings = async () => read(settingsOf);

  const updateSettings = async (patch = {}) =>
    write((s) => {
      const next = mergeSettings(s.settings, patch);
      if (minor(s) && next.privacy.mapVisibility === "everyone") next.privacy.mapVisibility = "friends";
      s.settings = next;
      return next;
    });

  // ── Account ─────────────────────────────────────────────────────────────────

  const accountView = (s) => {
    const me = requireMe(s);
    return {
      birthDate: me.birthDate || null,
      age: ageOn(me.birthDate),
      isMinor: minor(s),
      guardian: me.guardian || null,
      blockedCount: (s.blocked || []).length,
    };
  };

  const getAccount = async () => read((s) => (s.me ? accountView(s) : null));

  const setBirthDate = async (birthDate) =>
    write((s) => {
      const me = requireMe(s);
      const problem = birthDateProblem(birthDate);
      if (problem) throw new EngineError(problem.code, problem.message);
      if (me.birthDate && me.birthDate !== birthDate) throw new EngineError("ALREADY_SET", "Your date of birth is set. Support can correct it.");
      me.birthDate = birthDate;
      if (minor(s)) {
        s.settings = mergeSettings(s.settings, {});
        if (s.settings.privacy.mapVisibility === "everyone") s.settings.privacy.mapVisibility = "friends";
      }
      return accountView(s);
    });

  const linkGuardian = async ({ name, contact, liveSharing = true }) =>
    write((s) => {
      const me = requireMe(s);
      if (!minor(s)) throw new EngineError("NOT_ALLOWED", "A parent link is for under 18 mode.");
      if (!(name || "").trim() || (contact || "").trim().length < 3) throw new EngineError("BAD_GUARDIAN", "Add their name and a phone number or email.");
      me.guardian = { name: name.trim(), contact: contact.trim(), liveSharing: !!liveSharing, linkedAt: Date.now() };
      return accountView(s);
    });

  const unlinkGuardian = async () =>
    write((s) => {
      const me = requireMe(s);
      me.guardian = null;
      return accountView(s);
    });

  // ── Blocked people ──────────────────────────────────────────────────────────

  const playerView = (pid) => {
    const p = players.find((x) => x.id === pid);
    return p ? { id: p.id, username: p.username, name: p.name, avatar: p.avatar, tier: p.tier, city: p.city, area: p.area } : null;
  };

  const listBlocked = async () => read((s) => (s.blocked || []).map(playerView).filter(Boolean));

  const blockPlayer = async (pid) =>
    write((s) => {
      requireMe(s);
      if (!players.some((p) => p.id === pid)) throw new EngineError("NOT_FOUND", "Player not found.");
      s.blocked = [...new Set([...(s.blocked || []), pid])];
      s.following = (s.following || []).filter((id) => id !== pid);
    });

  const unblockPlayer = async (pid) =>
    write((s) => {
      s.blocked = (s.blocked || []).filter((id) => id !== pid);
    });

  // ── Your data ───────────────────────────────────────────────────────────────

  const exportMyData = async () =>
    read((s) => {
      const me = requireMe(s);
      return {
        exportedAt: new Date().toISOString(),
        profile: { ...me },
        settings: settingsOf(s),
        steps: Object.entries(s.days).map(([day, d]) => ({ day, steps: d.steps, distanceKm: d.distance, activeMinutes: d.activeMinutes })),
        runs: s.runs,
        ledger: s.ledger,
        following: s.following,
        blocked: s.blocked || [],
        battles: s.battles,
      };
    });

  // There is no server copy on the local engine, so closing wipes the phone.
  const deleteAccount = async () => {
    await resetAll();
    return true;
  };

  // ── Your patch ──────────────────────────────────────────────────────────────

  const cities = async (query, at) => {
    if (listCities) return listCities({ query, lat: at?.lat, lng: at?.lng });
    const q = (query || "").trim().toLowerCase();
    return UK_CITIES.filter((c) => matches(c, q));
  };

  const areasOf = async (cityId) => (listAreas ? listAreas(cityId) : UK_AREAS.filter((a) => a.cityId === cityId));

  // Cities and towns, nearest first when we know where you are.
  const listPatchPlaces = async ({ query = "", lat = null, lng = null } = {}) => {
    const at = lat != null && lng != null ? { lat, lng } : null;
    const list = (await cities(query, at)).map((c) => placeView(c, at));
    return list.sort((a, b) =>
      at ? (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9) : Number(b.isLive) - Number(a.isLive) || (a.kind === "city" ? 0 : 1) - (b.kind === "city" ? 0 : 1) || a.name.localeCompare(b.name)
    );
  };

  // Areas in a place: who is out there now and where it ranks this week. The
  // seeded world fills in other people; your own steps count for your area.
  const listPatchAreas = async (cityId, query = "") => {
    const list = await areasOf(cityId);
    return read((s) => {
      const week = startOfWeek().getTime();
      const mine = s.me?.areaId;
      const myWeek = mine ? myStepsBetween(s, week, Date.now()) : 0;
      const hour = new Date().getHours();
      const busy = hour >= 6 && hour <= 21 ? 1 : 0.35;
      const q = (query || "").trim().toLowerCase();
      const rows = list.map((a) => {
        const base = noise(`area:${a.id}`);
        const daysIn = Math.max(1, Math.round((Date.now() - week) / DAY_MS));
        return {
          id: a.id,
          name: a.name,
          cityId: a.cityId,
          short: crestLetters(a.name),
          outNow: Math.round((12 + base * 80) * busy * (0.85 + noise(`area:${a.id}:${dayKey()}:${Math.floor(Date.now() / (15 * 60 * 1000))}`) * 0.3)),
          weekSteps: Math.round((40 + base * 120) * 8000 * daysIn) + (a.id === mine ? myWeek : 0),
          isMine: a.id === mine,
        };
      });
      rows.sort((a, b) => b.weekSteps - a.weekSteps);
      return rows.map((r, i) => ({ ...r, rank: i + 1 })).filter((r) => !q || r.name.toLowerCase().includes(q));
    });
  };

  const setPatch = async ({ cityId, areaId = null }) => {
    const all = await cities("", null);
    const place = all.find((c) => c.id === cityId);
    if (!place) throw new EngineError("NOT_FOUND", "Pick a city or town.");
    const area = areaId ? (await areasOf(cityId)).find((a) => a.id === areaId) : null;
    if (areaId && !area) throw new EngineError("NOT_FOUND", "Pick an area in that place.");
    return write((s) => {
      const me = requireMe(s);
      me.city = place.name;
      me.cityId = place.id;
      me.area = area?.name || "";
      me.areaId = area?.id || null;
      me.region = place.region;
      return { city: me.city, area: me.area, playsFor: place.isLive ? null : place.region };
    });
  };

  // ── Your week ───────────────────────────────────────────────────────────────

  // A week or a month of your steps with the one before it to compare.
  const getWeekSummary = async ({ period = "week", offset = 0 } = {}) =>
    read((s) => {
      requireMe(s);
      const days = {};
      for (const [key, d] of Object.entries(s.days)) days[key] = { steps: d.steps || 0, distance: d.distance || 0, activeMinutes: d.activeMinutes || 0 };
      return buildSummary({ period, offset, days, ledger: s.ledger, goal: s.me.dailyGoal || 10000 });
    });

  const setAvatar = async (uri) =>
    write((s) => {
      const me = requireMe(s);
      me.avatar = uri || null;
      return { avatar: me.avatar };
    });

  // The live count for Welcome and Home: a city, or the whole UK.
  const getOutsideCount = async ({ cityId = null } = {}) => {
    const place = cityId ? (await cities("", null)).find((c) => c.id === cityId) : null;
    const now = getOutsideNow ? await getOutsideNow(place?.name) : { count: 0 };
    return { count: now?.count || 0 };
  };

  // There are no accounts on the local engine: every way in lands on setup.
  const signInWithProvider = async () => ({ signedIn: true });


  return {
    guardMinor,
    isMinorState: minor,
    getSettings,
    updateSettings,
    getAccount,
    setBirthDate,
    linkGuardian,
    unlinkGuardian,
    listBlocked,
    blockPlayer,
    unblockPlayer,
    exportMyData,
    deleteAccount,
    listPatchPlaces,
    listPatchAreas,
    setPatch,
    getWeekSummary,
    setAvatar,
    signInWithProvider,
    getOutsideCount,
  };
}
