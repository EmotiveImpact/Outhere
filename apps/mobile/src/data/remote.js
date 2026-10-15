// The engine API over Supabase. Same function names and return shapes as
// engine.js, so hooks and screens don't change. Anything that moves XP, OUT,
// tiers or results goes through a SECURITY DEFINER function in the database
// (supabase/migrations); this file only reads tables and calls those.
//
// Settings stay on the phone. Features the database doesn't hold yet (news,
// rewards, crew chat and feed, hourly steps) return empty results here.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { prepareStoryPhoto, storyFiles } from "@/services/media";
import { EngineError, TIER_RULES, crewBadgeTier, levelFromXp, tierAtLeast } from "./engine";
import { addDays, dayKey, startOfDay, startOfWeek } from "./time";

const DAY_MS = 24 * 60 * 60 * 1000;
const STEP_KM = 0.00075;

// ── Plumbing ──────────────────────────────────────────────────────────────────

const listeners = new Set();
export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const changed = () => listeners.forEach((fn) => fn());

// Database errors arrive as the exception message (TIER_REQUIRED, NOT_ENOUGH_OUT...).
const MESSAGES = {
  NOT_SIGNED_IN: "Sign in first.",
  TIER_REQUIRED: "That needs a higher membership.",
  NOT_ENOUGH_OUT: "Not enough OUT for that yet.",
  NOT_ALLOWED: "You can't do that.",
  NOT_FOUND: "We couldn't find that.",
  FUTURE_DAY: "That day hasn't happened yet.",
  TOO_OLD: "Steps can only be added for today or yesterday.",
  CLUB_LIMIT: "You can start up to 3 clubs.",
  CODE_INVALID: "That code didn't work.",
  BAD_USERNAME: "3 to 20 characters: letters, numbers, dots and underscores.",
  USERNAME_TAKEN: "That name is taken.",
  NOT_JOINED: "Join the challenge first.",
  NOT_DONE: "Not finished yet. Keep going.",
  SOLD_OUT: "Sold out.",
};

const fail = (error) => {
  const code = (error?.message || "").split(/[\s:]/)[0];
  const known = MESSAGES[code];
  const e = new EngineError(known ? code : "SERVER", error?.hint && code !== "TIER_REQUIRED" ? error.hint : known || error?.message || "Something went wrong.");
  if (code === "TIER_REQUIRED") e.requiredTier = "pro";
  throw e;
};

const run = async (query) => {
  const { data, error } = await query;
  if (error) fail(error);
  return data;
};
const rpc = (fn, args) => run(supabase.rpc(fn, args));

const uid = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id || null;
};
const requireUid = async () => {
  const id = await uid();
  if (!id) throw new EngineError("NO_PROFILE", "Sign in first.");
  return id;
};

const publicUrl = (bucket, path) => {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};

const cityName = (id) => (id ? id.replace(/(^|-)([a-z])/g, (_, s, c) => `${s ? " " : ""}${c.toUpperCase()}`) : "");
const cityId = (name) => (name || "london").trim().toLowerCase().replace(/\s+/g, "-");

// ── Auth ──────────────────────────────────────────────────────────────────────

export const sendSignInCode = async (email) => {
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
  if (error) throw new EngineError("AUTH", error.message);
};

export const verifySignInCode = async (email, token) => {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: "email" });
  if (error) throw new EngineError("AUTH", "That code didn't work. Check it and try again.");
  changed();
};

export const signedIn = async () => !!(await uid());

export const signOut = async () => {
  await supabase.auth.signOut();
  changed();
};

// ── People ────────────────────────────────────────────────────────────────────

const PERSON = "id, username, display_name, avatar_path, city_id, borough_id, tier, level, xp, streak_days, bio, founding_number";

const dotsFor = async (ids) => {
  if (!ids.length) return {};
  const rows = await run(supabase.from("member_dots").select("user_id, dot").in("user_id", ids));
  return Object.fromEntries((rows || []).map((r) => [r.user_id, r.dot]));
};

const todayStepsFor = async (ids) => {
  if (!ids.length) return {};
  const rows = await run(supabase.from("daily_steps").select("user_id, steps").eq("day", dayKey()).in("user_id", ids));
  return Object.fromEntries((rows || []).map((r) => [r.user_id, r.steps]));
};

const playerView = (p, me, extra = {}) =>
  p && {
    id: p.id,
    username: p.username,
    name: p.display_name,
    city: cityName(p.city_id),
    area: cityName(p.borough_id),
    avatar: publicUrl("avatars", p.avatar_path),
    tier: p.tier,
    bio: p.bio || "",
    level: p.level,
    streak: p.streak_days || 0,
    isMe: p.id === me,
    ...extra,
  };

const peopleViews = async (rows, me, following = null) => {
  const ids = rows.map((p) => p.id);
  const [dots, steps] = await Promise.all([dotsFor(ids), todayStepsFor(ids)]);
  return rows.map((p) =>
    playerView(p, me, {
      dot: dots[p.id] || null,
      isOutside: dots[p.id] === "out",
      todaySteps: steps[p.id] || 0,
      ...(following ? { isFollowing: following.has(p.id) } : {}),
    }),
  );
};

const followingSet = async (me) => {
  const rows = await run(supabase.from("follows").select("followee_id").eq("follower_id", me));
  return new Set((rows || []).map((r) => r.followee_id));
};

export const getFriends = async () => {
  const me = await uid();
  if (!me) return [];
  const following = await followingSet(me);
  if (!following.size) return [];
  const ids = [...following];
  const [rows, stories, seen] = await Promise.all([
    run(supabase.from("profiles").select(PERSON).in("id", ids)),
    run(supabase.from("stories").select("id, author_id").in("author_id", ids).gt("expires_at", new Date().toISOString())),
    run(supabase.from("story_views").select("story_id").eq("user_id", me)),
  ]);
  const seenIds = new Set((seen || []).map((v) => v.story_id));
  const storyOf = {};
  for (const st of stories || []) storyOf[st.author_id] = storyOf[st.author_id] === "unwatched" || !seenIds.has(st.id) ? "unwatched" : "watched";
  const list = (await peopleViews(rows || [], me, following)).map((p) => ({ ...p, story: storyOf[p.id] || null }));
  return list.sort((a, b) => Number(b.isOutside) - Number(a.isOutside) || b.todaySteps - a.todaySteps);
};

export const searchPlayers = async (query = "") => {
  const me = await uid();
  const q = query.trim().toLowerCase().replace(/[%_,()]/g, "");
  let req = supabase.from("profiles").select(PERSON).limit(30);
  if (q) req = req.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
  const rows = await run(req);
  return peopleViews(rows || [], me, me ? await followingSet(me) : new Set());
};

export const getPlayer = async (pid) => {
  const me = await uid();
  const p = await run(supabase.from("profiles").select(PERSON).eq("id", pid).maybeSingle());
  if (!p) throw new EngineError("NOT_FOUND", "Player not found.");
  const [view] = await peopleViews([p], me, me ? await followingSet(me) : new Set());
  const weekFrom = dayKey(startOfWeek());
  const [week, clubs, battles] = await Promise.all([
    run(supabase.from("daily_steps").select("steps").eq("user_id", pid).gte("day", weekFrom)),
    run(supabase.from("club_members").select("clubs(id, name, logo_path, accent)").eq("user_id", pid)),
    me && me !== pid
      ? run(supabase.from("battles").select("winner_id").eq("status", "finished").or(`and(challenger_id.eq.${me},opponent_id.eq.${pid}),and(challenger_id.eq.${pid},opponent_id.eq.${me})`))
      : [],
  ]);
  return {
    ...view,
    weekSteps: (week || []).reduce((sum, d) => sum + d.steps, 0),
    xp: p.xp,
    crews: (clubs || []).map((m) => m.clubs).filter(Boolean).map((c) => ({ id: c.id, name: c.name, logo: publicUrl("club-media", c.logo_path), accent: c.accent })),
    recordVsMe: { wins: (battles || []).filter((b) => b.winner_id === me).length, losses: (battles || []).filter((b) => b.winner_id === pid).length },
  };
};

export const follow = async (pid) => {
  const me = await requireUid();
  await run(supabase.from("follows").upsert({ follower_id: me, followee_id: pid }, { ignoreDuplicates: true }));
  changed();
};

// ── Stories ───────────────────────────────────────────────────────────────────

// Live stories from one person, oldest first, with viewing URLs from R2.
export const listStories = async (authorId) => {
  const me = await uid();
  if (!me) return [];
  const rows = await run(
    supabase.from("stories").select("id, author_id, caption, audience, club_id, created_at, expires_at, saved_at").eq("author_id", authorId).gt("expires_at", new Date().toISOString()).order("created_at"),
  );
  if (!rows?.length) return [];
  const [urls, seen] = await Promise.all([
    storyFiles.urls(rows.map((r) => r.id)),
    run(supabase.from("story_views").select("story_id, emote").eq("user_id", me).in("story_id", rows.map((r) => r.id))),
  ]);
  const seenBy = Object.fromEntries((seen || []).map((v) => [v.story_id, v]));
  return rows
    .filter((r) => urls[r.id])
    .map((r) => ({
      id: r.id,
      authorId: r.author_id,
      image: urls[r.id],
      caption: r.caption || "",
      audience: r.audience,
      postedAt: new Date(r.created_at).getTime(),
      expiresAt: new Date(r.expires_at).getTime(),
      seen: !!seenBy[r.id],
      emote: seenBy[r.id]?.emote || null,
    }));
};

// Posts a photo story. audience: "followers" (default), "public" or "club".
// Posting is for Pro and Black members; anyone can watch and react.
export const postStory = async ({ uri, width, height, caption = "", audience = "followers", clubId = null }) => {
  const me = await requireUid();
  const p = await run(supabase.from("profiles").select("tier").eq("id", me).single());
  if (p.tier === "free") {
    const e = new EngineError("TIER_REQUIRED", "Posting stories is for Pro and Black members.");
    e.requiredTier = "pro";
    throw e;
  }
  const key = await storyFiles.upload(await prepareStoryPhoto(uri, { width, height }));
  try {
    await run(supabase.from("stories").insert({ author_id: me, media_path: key, caption: caption.trim() || null, audience: clubId ? "club" : audience, club_id: clubId }));
  } catch (e) {
    await storyFiles.discard(key).catch(() => {});
    throw e;
  }
  changed();
};

export const deleteStory = async (storyId) => {
  await storyFiles.deleteStory(storyId);
  changed();
};

export const viewStory = async (storyId, emote) => {
  const me = await requireUid();
  const row = { story_id: storyId, user_id: me };
  if (emote) row.emote = emote;
  await run(supabase.from("story_views").upsert(row, { onConflict: "story_id,user_id", ignoreDuplicates: !emote }));
};

// Marks every live story from this person as seen by me.
export const markStoryWatched = async (pid) => {
  const me = await requireUid();
  const live = await run(supabase.from("stories").select("id").eq("author_id", pid).gt("expires_at", new Date().toISOString()));
  if (live?.length) await run(supabase.from("story_views").upsert(live.map((st) => ({ story_id: st.id, user_id: me })), { ignoreDuplicates: true }));
  changed();
};

export const unfollow = async (pid) => {
  const me = await requireUid();
  await run(supabase.from("follows").delete().eq("follower_id", me).eq("followee_id", pid));
  changed();
};

export const getOutsideNow = async (city) => {
  const me = await uid();
  const id = cityId(city);
  const boroughs = await rpc("outside_now", { p_city: id });
  const count = (boroughs || []).reduce((sum, b) => sum + Number(b.out_now), 0);
  if (!me) return { count, people: [] };
  const dots = await run(supabase.from("member_dots").select("user_id").eq("dot", "out").limit(12));
  const ids = (dots || []).map((d) => d.user_id);
  const rows = ids.length ? await run(supabase.from("profiles").select(PERSON).in("id", ids).eq("city_id", id)) : [];
  return { count, people: await peopleViews(rows || [], me) };
};

// ── Profile ───────────────────────────────────────────────────────────────────

const USERNAME_RE = /^[a-z0-9._]{3,20}$/;
const RESERVED = new Set(["admin", "outhere", "support", "root", "test", "dev", "official"]);

export const checkUsername = async (raw) => {
  const name = (raw || "").trim().toLowerCase();
  if (!USERNAME_RE.test(name)) return { available: false, reason: "3 to 20 characters: letters, numbers, dots and underscores." };
  if (RESERVED.has(name)) return { available: false, reason: "That name is reserved." };
  const me = await uid();
  const taken = await run(supabase.from("profiles").select("id").eq("username", name).maybeSingle());
  if (taken && taken.id !== me) return { available: false, reason: "That name is taken." };
  return { available: true, reason: null };
};

const earnedToday = async (me) => {
  const rows = await run(supabase.from("ledger").select("currency, amount").eq("user_id", me).gt("amount", 0).gte("created_at", startOfDay().toISOString()));
  return (rows || []).reduce((acc, r) => ({ ...acc, [r.currency]: (acc[r.currency] || 0) + r.amount }), { xp: 0, out: 0 });
};

export const getProfile = async () => {
  const me = await uid();
  if (!me) return null;
  const p = await run(supabase.from("profiles").select("*").eq("id", me).maybeSingle());
  // A profile exists from sign up, but the app treats it as new until the
  // member has picked a username (finish_onboarding).
  if (!p?.onboarded_at) return null;
  const [wallet, today, days, runs, record, events, earned] = await Promise.all([
    run(supabase.from("wallets").select("*").eq("user_id", me).maybeSingle()),
    run(supabase.from("daily_steps").select("*").eq("user_id", me).eq("day", dayKey()).maybeSingle()),
    run(supabase.from("daily_steps").select("steps, distance_m").eq("user_id", me)),
    run(supabase.from("runs").select("distance_m, ended_at").eq("user_id", me)),
    run(supabase.from("battles").select("winner_id").eq("status", "finished").or(`challenger_id.eq.${me},opponent_id.eq.${me}`)),
    run(supabase.from("event_rsvps").select("event_id").eq("user_id", me).eq("status", "checked_in")),
    earnedToday(me),
  ]);
  const counts = await Promise.all([
    supabase.from("club_members").select("club_id", { count: "exact", head: true }).eq("user_id", me),
    supabase.from("follows").select("followee_id", { count: "exact", head: true }).eq("follower_id", me),
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("followee_id", me),
  ]);
  const xp = wallet?.xp || 0;
  const totalSteps = (days || []).reduce((sum, d) => sum + d.steps, 0);
  const totalKm = (days || []).reduce((sum, d) => sum + d.distance_m, 0) / 1000;
  const weekStart = startOfWeek().getTime();
  const weekRunsKm = (runs || []).filter((r) => new Date(r.ended_at).getTime() >= weekStart).reduce((sum, r) => sum + r.distance_m / 1000, 0);
  const wins = (record || []).filter((b) => b.winner_id === me).length;
  const losses = (record || []).filter((b) => b.winner_id && b.winner_id !== me).length;
  const draws = (record || []).filter((b) => !b.winner_id).length;
  const attended = (events || []).length;
  const streak = p.streak_days || 0;
  const longest = Math.max(streak, p.best_streak || 0);
  return {
    id: p.id,
    username: p.username,
    name: p.display_name,
    city: cityName(p.city_id),
    area: cityName(p.borough_id),
    bio: p.bio || "",
    avatar: publicUrl("avatars", p.avatar_path),
    tier: p.tier,
    foundingNumber: p.founding_number,
    blackEligible: longest >= 14,
    dailyGoal: p.daily_goal,
    weeklyGoalKm: 20,
    createdAt: new Date(p.created_at).getTime(),
    xp,
    out: wallet?.out_available || 0,
    outHeld: wallet?.out_held || 0,
    level: levelFromXp(xp),
    streak,
    longestStreak: longest,
    checkedInToday: !!today,
    today: { steps: today?.steps || 0, distance: (today?.distance_m || 0) / 1000, activeMinutes: today?.active_minutes || 0, xp: earned.xp, out: earned.out },
    totals: { steps: totalSteps, distance: Math.round(totalKm * 10) / 10, runs: (runs || []).length },
    week: { distanceKm: Math.round(weekRunsKm * 10) / 10, runsKm: Math.round(weekRunsKm * 10) / 10 },
    outsideScore: Math.round(totalSteps / 100 + streak * 50 + wins * 100 + attended * 150),
    battleRecord: { wins, losses, draws },
    eventsAttended: attended,
    crewsCount: counts[0].count || 0,
    followingCount: counts[1].count || 0,
    followersCount: counts[2].count || 0,
    badges: [
      { id: "founder", title: "Founder", description: "Joined Outhere in the first season.", earned: !!p.founding_number, icon: "star" },
      { id: "streak7", title: "7 Day Streak", description: "Active 7 days in a row.", earned: longest >= 7, icon: "flame" },
      { id: "streak30", title: "30 Day Streak", description: "Active 30 days in a row.", earned: longest >= 30, icon: "flame" },
      { id: "battle1", title: "First Win", description: "Win a battle.", earned: wins >= 1, icon: "swords" },
      { id: "battle10", title: "10 Wins", description: "Win 10 battles.", earned: wins >= 10, icon: "trophy" },
      { id: "event1", title: "Link-Up", description: "Check in at an event.", earned: attended >= 1, icon: "map-pin" },
      { id: "event3", title: "Regular", description: "Check in at 3 events.", earned: attended >= 3, icon: "map-pin" },
      { id: "crew", title: "Crew Member", description: "Join a crew.", earned: (counts[0].count || 0) > 0, icon: "users" },
      { id: "run10", title: "10K Club", description: "Log a 10 km run.", earned: (runs || []).some((r) => r.distance_m >= 10000), icon: "route" },
    ],
  };
};

const PROFILE_COLUMNS = { username: "username", name: "display_name", bio: "bio", dailyGoal: "daily_goal" };

export const updateProfile = async (patch) => {
  const me = await requireUid();
  const row = {};
  for (const [key, col] of Object.entries(PROFILE_COLUMNS)) if (patch[key] !== undefined) row[col] = patch[key];
  if (row.username !== undefined) {
    row.username = row.username.trim().toLowerCase();
    const check = await checkUsername(row.username);
    if (!check.available) throw new EngineError("BAD_USERNAME", check.reason);
  }
  if (patch.city !== undefined) row.city_id = cityId(patch.city);
  if (patch.isOutside !== undefined) await rpc("set_presence", { p_state: patch.isOutside ? "out" : "stopped" });
  if (Object.keys(row).length) await run(supabase.from("profiles").update(row).eq("id", me));
  changed();
  return getProfile();
};

export const createProfile = async ({ username, city = "London", crewCode, dailyGoal }) => {
  const me = await requireUid();
  const name = username.trim().toLowerCase();
  const check = await checkUsername(name);
  if (!check.available) throw new EngineError("BAD_USERNAME", check.reason);
  await rpc("finish_onboarding", { p_username: name, p_display_name: username.trim(), p_city: cityId(city) });
  if (dailyGoal) await run(supabase.from("profiles").update({ daily_goal: Math.min(50000, Math.max(1000, Math.round(dailyGoal))) }).eq("id", me));
  if (crewCode) await joinCrewByCode(crewCode).catch(() => null);
  changed();
  return getProfile();
};

// Signs out of this phone. The account itself is deleted from Settings > Account.
export const resetAll = async () => {
  await AsyncStorage.removeItem(SETTINGS_KEY);
  await signOut();
};

export const getMembership = async () => {
  const me = await requireUid();
  const [p, subs] = await Promise.all([
    run(supabase.from("profiles").select("tier, streak_days, best_streak").eq("id", me).single()),
    run(supabase.from("subscriptions").select("*").eq("user_id", me).order("created_at", { ascending: false })),
  ]);
  const active = (subs || []).find((s) => s.status === "active" || s.status === "trialing");
  return {
    tier: p.tier,
    since: active ? new Date(active.created_at).getTime() : null,
    renewsAt: active?.current_period_end ? new Date(active.current_period_end).getTime() : null,
    blackEligible: Math.max(p.streak_days, p.best_streak) >= 14,
    rules: TIER_RULES[p.tier],
  };
};

// Tiers only change through a store or web subscription.
export const setTier = async () => {
  throw new EngineError("STORE", "Membership is handled by the App Store, Google Play or weouthere.app.");
};

// ── Steps ─────────────────────────────────────────────────────────────────────

export const recordSteps = async ({ date = dayKey(), steps, distance, activeMinutes }) => {
  if (!(await uid())) return null;
  const row = await rpc("ingest_steps", {
    p_day: date,
    p_steps: Math.round(steps),
    p_distance_m: Math.round((distance ?? steps * STEP_KM) * 1000),
    p_active_minutes: activeMinutes ?? Math.floor(steps / 100),
  });
  changed();
  return { steps: row?.steps ?? steps, distance: (row?.distance_m ?? 0) / 1000 };
};

export const checkIn = async () => ({ alreadyCheckedIn: true, streak: (await getProfile())?.streak || 0, xp: 0, out: 0 });

export const getStepHistory = async (days = 7) => {
  const me = await uid();
  const from = dayKey(addDays(new Date(), -(days - 1)));
  const rows = me ? await run(supabase.from("daily_steps").select("*").eq("user_id", me).gte("day", from)) : [];
  const byDay = Object.fromEntries((rows || []).map((r) => [r.day, r]));
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const key = dayKey(addDays(new Date(), -i));
    const d = byDay[key];
    out.push({ date: key, steps: d?.steps || 0, distance: (d?.distance_m || 0) / 1000, activeMinutes: d?.active_minutes || 0, checkedIn: !!d, active: (d?.steps || 0) >= 3000, flagged: !!d?.flagged });
  }
  return out;
};

// The database keeps daily totals, not hourly samples.
export const getTodayByHour = async () => Array.from({ length: 24 }, (_, hour) => ({ hour, steps: 0 }));

export const devAddSteps = async (amount = 1500) => {
  const today = (await getProfile())?.today?.steps || 0;
  return recordSteps({ steps: today + amount });
};
export const devFillHistory = async () => null;

// ── Wallet ────────────────────────────────────────────────────────────────────

export const getWallet = async () => {
  const me = await requireUid();
  const [w, rows] = await Promise.all([
    run(supabase.from("wallets").select("*").eq("user_id", me).maybeSingle()),
    run(supabase.from("ledger").select("*").eq("user_id", me).order("created_at", { ascending: false }).limit(60)),
  ]);
  return {
    xp: w?.xp || 0,
    out: w?.out_available || 0,
    outHeld: w?.out_held || 0,
    level: levelFromXp(w?.xp || 0),
    transactions: (rows || []).map((t) => ({ id: String(t.id), type: t.currency, amount: t.amount, label: t.label, reason: t.reason, at: new Date(t.created_at).getTime(), heldUntil: new Date(t.available_at).getTime() > Date.now() ? new Date(t.available_at).getTime() : null })),
  };
};

// ── Leaderboards ──────────────────────────────────────────────────────────────

export const getLeaderboard = async ({ scope = "city", period = "week", metric = "steps" } = {}) => {
  const me = await uid();
  const from = period === "today" ? dayKey() : period === "week" ? dayKey(startOfWeek()) : dayKey(addDays(new Date(), -29));
  const mine = me ? await run(supabase.from("profiles").select("city_id").eq("id", me).maybeSingle()) : null;
  let req = supabase.from("daily_steps").select("user_id, counted, distance_m, profiles!inner(" + PERSON + ")").gte("day", from).limit(2000);
  if (scope === "city" && mine?.city_id) req = req.eq("profiles.city_id", mine.city_id);
  if (scope === "friends" && me) req = req.in("user_id", [me, ...(await followingSet(me))]);
  const rows = await run(req);
  const totals = new Map();
  for (const r of rows || []) {
    const t = totals.get(r.user_id) || { profile: r.profiles, value: 0 };
    t.value += metric === "distance" ? r.distance_m / 1000 : r.counted;
    totals.set(r.user_id, t);
  }
  const ranked = [...totals.values()].sort((a, b) => b.value - a.value).slice(0, 100);
  const entries = ranked.map((t, i) => ({ rank: i + 1, value: metric === "distance" ? Math.round(t.value * 10) / 10 : t.value, player: playerView(t.profile, me) }));
  const meEntry = entries.find((e) => e.player.isMe) || null;
  return { scope, period, metric, entries, me: meEntry };
};

// ── Challenges ────────────────────────────────────────────────────────────────

const periodWindow = (period) => {
  const now = new Date();
  if (period === "day") return { start: startOfDay(now).getTime(), end: startOfDay(now).getTime() + DAY_MS };
  if (period === "week") return { start: startOfWeek(now).getTime(), end: startOfWeek(now).getTime() + 7 * DAY_MS };
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return { start, end: new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() };
};

export const listChallenges = async () => {
  const me = await uid();
  const [list, progress, steps] = await Promise.all([
    run(supabase.from("challenges").select("*").eq("active", true).order("sort")),
    me ? run(supabase.from("challenge_progress").select("*").eq("user_id", me)) : [],
    me ? run(supabase.from("daily_steps").select("day, counted, distance_m, steps").eq("user_id", me).gte("day", dayKey(addDays(new Date(), -31)))) : [],
  ]);
  return (list || []).map((c) => {
    const w = periodWindow(c.period);
    const startKey = dayKey(new Date(w.start));
    const inWindow = (steps || []).filter((d) => d.day >= startKey);
    const raw =
      c.metric === "distance_m"
        ? inWindow.reduce((sum, d) => sum + d.distance_m, 0) / 1000
        : c.metric === "active_days"
          ? inWindow.filter((d) => d.steps >= 3000).length
          : inWindow.reduce((sum, d) => sum + d.counted, 0);
    const target = c.metric === "distance_m" ? c.target / 1000 : c.target;
    const mine = (progress || []).find((p) => p.challenge_id === c.id && p.period_start === startKey);
    const progressValue = c.metric === "distance_m" ? Math.round(raw * 10) / 10 : raw;
    return {
      id: c.id,
      templateId: c.id,
      title: c.title,
      description: c.description,
      metric: c.metric === "distance_m" ? "distance" : c.metric,
      target,
      rewardXp: c.reward_xp,
      rewardOut: c.reward_out,
      period: c.period,
      tierRequired: c.tier_required,
      startsAt: w.start,
      endsAt: w.end,
      progress: progressValue,
      percent: Math.min(1, progressValue / target),
      joined: !!mine,
      status: mine?.claimed_at ? "claimed" : mine && progressValue >= target ? "complete" : mine ? "joined" : "open",
      participants: null,
    };
  });
};

export const joinChallenge = async (id) => {
  await rpc("join_challenge", { p_challenge: id });
  changed();
};

export const claimChallenge = async (id) => {
  const c = (await listChallenges()).find((x) => x.id === id);
  await rpc("claim_challenge", { p_challenge: id });
  changed();
  return { xp: c?.rewardXp || 0, out: c?.rewardOut || 0 };
};

// ── Battles ───────────────────────────────────────────────────────────────────

export const BATTLE_DURATIONS = [2, 6, 24, 168];
const STATUS = { pending: "pending", accepted: "active", live: "active", finished: "complete", declined: "declined", cancelled: "cancelled", expired: "expired", forfeit: "complete" };

const battleViews = async (rows, me) => {
  const ids = [...new Set(rows.flatMap((b) => [b.challenger_id, b.opponent_id]))];
  const people = ids.length ? await run(supabase.from("profiles").select(PERSON).in("id", ids)) : [];
  const byId = Object.fromEntries((people || []).map((p) => [p.id, playerView(p, me)]));
  return rows.map((b) => {
    const mineIsChallenger = b.challenger_id === me;
    const oppId = mineIsChallenger ? b.opponent_id : b.challenger_id;
    const mine = (mineIsChallenger ? b.challenger_result : b.opponent_result) || 0;
    const theirs = (mineIsChallenger ? b.opponent_result : b.challenger_result) || 0;
    const status = STATUS[b.status] || b.status;
    const endAt = b.ends_at ? new Date(b.ends_at).getTime() : null;
    return {
      id: b.id,
      mode: b.mode,
      metric: "steps",
      durationHours: b.duration_h,
      stakeOut: b.stake_out,
      status,
      incoming: b.status === "pending" && b.opponent_id === me,
      isChallenger: mineIsChallenger,
      isSurprise: b.is_surprise,
      prize: null,
      createdAt: new Date(b.created_at).getTime(),
      startAt: b.starts_at ? new Date(b.starts_at).getTime() : null,
      endAt,
      remainingMs: status === "active" && endAt ? Math.max(0, endAt - Date.now()) : 0,
      me: { player: byId[me], value: mine },
      opponent: { player: byId[oppId], value: theirs },
      leader: mine === theirs ? null : mine > theirs ? me : oppId,
      winnerId: b.winner_id,
      result: status === "complete" ? (b.winner_id === me ? "won" : b.winner_id ? "lost" : "draw") : null,
    };
  });
};

export const listBattles = async (status = "all") => {
  const me = await uid();
  if (!me) return [];
  const rows = await run(supabase.from("battles").select("*").or(`challenger_id.eq.${me},opponent_id.eq.${me}`).order("created_at", { ascending: false }).limit(100));
  const list = await battleViews(rows || [], me);
  return status === "all" ? list : list.filter((b) => b.status === status);
};

export const getBattle = async (id) => {
  const me = await uid();
  const b = await run(supabase.from("battles").select("*").eq("id", id).maybeSingle());
  if (!b) throw new EngineError("NOT_FOUND", "Battle not found.");
  return (await battleViews([b], me))[0];
};

export const getBattleLimits = async () => {
  const me = await requireUid();
  const p = await run(supabase.from("profiles").select("tier").eq("id", me).single());
  const rows = await run(supabase.from("battles").select("status, challenger_id, created_at").or(`challenger_id.eq.${me},opponent_id.eq.${me}`).gte("created_at", new Date(Date.now() - 7 * DAY_MS).toISOString()));
  const rules = TIER_RULES[p.tier];
  const createdThisWeek = (rows || []).filter((b) => b.challenger_id === me).length;
  const active = (rows || []).filter((b) => ["pending", "accepted", "live"].includes(b.status)).length;
  return { tier: p.tier, createdThisWeek, active, battlesPerWeek: rules.battlesPerWeek, maxActive: rules.maxActiveBattles, canCreate: createdThisWeek < rules.battlesPerWeek && active < rules.maxActiveBattles };
};

export const createBattle = async ({ opponentId, durationHours = 24, mode = "most_steps", stakeOut = 0 }) => {
  const b = await rpc("create_battle", { p_opponent: opponentId, p_mode: mode, p_duration_h: durationHours, p_stake_out: stakeOut });
  changed();
  return getBattle(b.id);
};

export const respondToBattle = async (id, accept) => {
  await rpc("respond_battle", { p_battle: id, p_accept: accept });
  changed();
  return getBattle(id);
};

export const cancelBattle = async (id) => {
  await rpc("cancel_battle", { p_battle: id });
  changed();
};

// Settlement runs on a schedule in the database.
export const settleBattles = async () => [];

// ── Crews (clubs) ─────────────────────────────────────────────────────────────

const CLUB = "*, club_members(user_id, role)";

const crewViews = async (rows, me, detailed = false) => {
  const weekFrom = dayKey(startOfWeek());
  const memberIds = [...new Set(rows.flatMap((c) => (c.club_members || []).map((m) => m.user_id)))];
  const [people, week] = await Promise.all([
    memberIds.length ? run(supabase.from("profiles").select(PERSON).in("id", memberIds)) : [],
    memberIds.length ? run(supabase.from("daily_steps").select("user_id, steps, distance_m").gte("day", weekFrom).in("user_id", memberIds)) : [],
  ]);
  const dots = detailed ? await dotsFor(memberIds) : {};
  const byId = Object.fromEntries((people || []).map((p) => [p.id, playerView(p, me)]));
  const weekBy = {};
  for (const d of week || []) {
    const w = weekBy[d.user_id] || { steps: 0, km: 0 };
    w.steps += d.steps;
    w.km += d.distance_m / 1000;
    weekBy[d.user_id] = w;
  }
  return rows.map((c) => {
    const members = c.club_members || [];
    const mine = members.find((m) => m.user_id === me);
    const weekKm = Math.round(members.reduce((sum, m) => sum + (weekBy[m.user_id]?.km || 0), 0) * 10) / 10;
    const view = {
      id: c.id,
      slug: c.slug,
      name: c.name,
      tagline: c.tagline || "",
      description: c.description || "",
      city: cityName(c.city_id),
      area: cityName(c.borough_id),
      accent: c.accent,
      logo: publicUrl("club-media", c.logo_path),
      cover: publicUrl("club-media", c.cover_path),
      meets: [c.meeting_place, c.usual_times].filter(Boolean).join(" · "),
      privacy: "public",
      status: c.status,
      weeklyGoalKm: 100,
      weekKm,
      badgeTier: crewBadgeTier(weekKm),
      memberCount: c.member_count,
      isMember: !!mine,
      myRole: mine ? (mine.role === "captain" ? "owner" : mine.role) : null,
      inviteCode: null,
      ownerId: c.created_by,
      owner: byId[c.created_by] || null,
      verified: c.status === "verified",
      founding: c.status === "founding",
      previewMembers: members.slice(0, 5).map((m) => byId[m.user_id]).filter(Boolean),
    };
    if (detailed) {
      view.members = members
        .map((m) => ({ role: m.role === "captain" ? "owner" : m.role, player: byId[m.user_id], weekSteps: weekBy[m.user_id]?.steps || 0, isOutside: dots[m.user_id] === "out", dot: dots[m.user_id] || null }))
        .filter((m) => m.player);
    }
    return view;
  });
};

export const listMyCrews = async () => {
  const me = await uid();
  if (!me) return [];
  const mine = await run(supabase.from("club_members").select("club_id").eq("user_id", me));
  const ids = (mine || []).map((m) => m.club_id);
  if (!ids.length) return [];
  return crewViews((await run(supabase.from("clubs").select(CLUB).in("id", ids))) || [], me);
};

export const discoverCrews = async (query = "") => {
  const me = await uid();
  const q = query.trim().replace(/[%_,()]/g, "");
  let req = supabase.from("clubs").select(CLUB).neq("status", "suspended").order("member_count", { ascending: false }).limit(30);
  if (q) req = req.ilike("name", `%${q}%`);
  return crewViews((await run(req)) || [], me);
};

export const getCrew = async (id) => {
  const me = await uid();
  const c = await run(supabase.from("clubs").select(CLUB).eq("id", id).maybeSingle());
  if (!c) throw new EngineError("NOT_FOUND", "Crew not found.");
  const [view] = await crewViews([c], me, true);
  if (view.myRole === "owner" || view.myRole === "admin") {
    const invite = await run(supabase.from("club_invites").select("code").eq("club_id", id).limit(1).maybeSingle());
    view.inviteCode = invite?.code || null;
  }
  return view;
};

export const getCrewLimits = async () => {
  const me = await requireUid();
  const [p, owned, joined] = await Promise.all([
    run(supabase.from("profiles").select("tier").eq("id", me).single()),
    supabase.from("clubs").select("id", { count: "exact", head: true }).eq("created_by", me),
    supabase.from("club_members").select("club_id", { count: "exact", head: true }).eq("user_id", me),
  ]);
  return { tier: p.tier, owned: owned.count || 0, joined: joined.count || 0, maxOwned: 3, maxJoined: 10, canCreate: (owned.count || 0) < 3, canJoin: (joined.count || 0) < 10 };
};

const slugify = (name) =>
  `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32)}-${Math.random().toString(36).slice(2, 6)}`;

export const createCrew = async ({ name, tagline = "", city }) => {
  const me = await requireUid();
  const p = await run(supabase.from("profiles").select("city_id").eq("id", me).single());
  const c = await rpc("create_club", { p_name: name.trim(), p_slug: slugify(name), p_city: city ? cityId(city) : p.city_id, p_tagline: tagline || null });
  changed();
  return getCrew(c.id);
};

export const joinCrew = async (id) => {
  await rpc("join_club", { p_club: id });
  changed();
  return getCrew(id);
};

export const joinCrewByCode = async (code) => {
  const id = await rpc("join_club_by_code", { p_code: code.trim() });
  changed();
  return getCrew(typeof id === "string" ? id : id?.id);
};

export const leaveCrew = async (id) => {
  await rpc("leave_club", { p_club: id });
  changed();
};

export const updateCrew = async (id, patch) => {
  const row = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.tagline !== undefined) row.tagline = patch.tagline;
  if (patch.accent !== undefined) row.accent = patch.accent;
  if (Object.keys(row).length) await run(supabase.from("clubs").update(row).eq("id", id));
  changed();
  return getCrew(id);
};

export const deleteCrew = async () => {
  throw new EngineError("NOT_ALLOWED", "Clubs are closed by the Outhere team. Email clubs@weouthere.app.");
};

export const removeCrewMember = async (crewId, pid) => {
  await rpc("remove_club_member", { p_club: crewId, p_user: pid });
  changed();
};

export const setCrewRole = async (crewId, pid, role) => {
  await rpc("set_club_role", { p_club: crewId, p_user: pid, p_role: role === "owner" ? "captain" : role });
  changed();
};

export const getCrewLeaderboard = async (id) => {
  const crew = await getCrew(id);
  return [...(crew.members || [])].sort((a, b) => b.weekSteps - a.weekSteps).map((m, i) => ({ rank: i + 1, player: m.player, value: m.weekSteps }));
};

export const getCrewMessages = async (id) => {
  const me = await uid();
  const channel = await run(supabase.from("club_channels").select("id").eq("club_id", id).eq("name", "general").maybeSingle());
  if (!channel) return [];
  const rows = await run(supabase.from("club_messages").select("*, profiles!club_messages_author_id_fkey(" + PERSON + ")").eq("channel_id", channel.id).order("created_at", { ascending: true }).limit(200));
  return (rows || []).map((m) => ({ id: String(m.id), text: m.body, at: new Date(m.created_at).getTime(), author: playerView(m.profiles, me), isMe: m.author_id === me }));
};

export const sendCrewMessage = async (id, text) => {
  const me = await requireUid();
  const channel = await run(supabase.from("club_channels").select("id").eq("club_id", id).eq("name", "general").maybeSingle());
  if (!channel) throw new EngineError("NOT_FOUND", "This crew has no chat yet.");
  await run(supabase.from("club_messages").insert({ channel_id: channel.id, club_id: id, author_id: me, body: text.trim() }));
  changed();
};

export const getCrewFeed = async () => [];
export const togglePostLike = async () => null;
export const shareRunToCrew = async () => null;
export const deletePost = async () => null;

// ── Runs ──────────────────────────────────────────────────────────────────────

const runView = (r) => ({
  id: r.id,
  title: r.title || "Run",
  type: r.kind,
  startedAt: new Date(r.started_at).getTime(),
  endedAt: new Date(r.ended_at).getTime(),
  distanceKm: Math.round((r.distance_m / 1000) * 100) / 100,
  durationSec: r.moving_s,
  paceSecPerKm: r.avg_pace_s_per_km,
  calories: Math.round((r.distance_m / 1000) * 62),
  route: (r.route_public || []).map((p) => (Array.isArray(p) ? { latitude: p[0], longitude: p[1] } : p)),
});

export const saveRun = async (r) => {
  const durationSec = Math.max(0, Math.round(Number(r.durationSec) || 0));
  const endedAt = r.endedAt || Date.now();
  const saved = await rpc("save_run", {
    p_started_at: new Date(r.startedAt || endedAt - durationSec * 1000).toISOString(),
    p_ended_at: new Date(endedAt).toISOString(),
    p_distance_m: Math.round((Number(r.distanceKm) || 0) * 1000),
    p_moving_s: durationSec,
    p_points: (r.route || []).map((p) => [p.latitude, p.longitude, p.timestamp || null]),
    p_kind: r.type === "walk" ? "walk" : "run",
    p_title: r.title || null,
  });
  changed();
  return runView(saved);
};

export const listRuns = async ({ limit = 50 } = {}) => {
  const me = await uid();
  if (!me) return [];
  return ((await run(supabase.from("runs").select("*").eq("user_id", me).order("ended_at", { ascending: false }).limit(limit))) || []).map(runView);
};

export const getRun = async (id) => {
  const r = await run(supabase.from("runs").select("*").eq("id", id).maybeSingle());
  if (!r) return null;
  const route = await run(supabase.from("run_routes").select("points").eq("run_id", id).maybeSingle());
  const view = runView(r);
  if (route?.points) view.route = route.points.map((p) => (Array.isArray(p) ? { latitude: p[0], longitude: p[1] } : p));
  return view;
};

export const deleteRun = async (id) => {
  await run(supabase.from("runs").delete().eq("id", id));
  changed();
};

// ── Events ────────────────────────────────────────────────────────────────────

const eventViews = async (rows, me) => {
  const ids = rows.map((e) => e.id);
  const [rsvps, mine, tierRow] = await Promise.all([
    ids.length ? run(supabase.from("event_rsvps").select("event_id").in("event_id", ids)) : [],
    me && ids.length ? run(supabase.from("event_rsvps").select("event_id, status").eq("user_id", me).in("event_id", ids)) : [],
    me ? run(supabase.from("profiles").select("tier").eq("id", me).maybeSingle()) : null,
  ]);
  const counts = {};
  for (const r of rsvps || []) counts[r.event_id] = (counts[r.event_id] || 0) + 1;
  const myStatus = Object.fromEntries((mine || []).map((r) => [r.event_id, r.status]));
  const tier = tierRow?.tier || "free";
  const now = Date.now();
  return rows.map((e) => {
    const start = new Date(e.starts_at).getTime();
    const end = e.ends_at ? new Date(e.ends_at).getTime() : start + 90 * 60 * 1000;
    const count = counts[e.id] || 0;
    const capacity = e.capacity || 999;
    return {
      id: e.id,
      occurrenceId: e.id,
      title: e.title,
      description: e.description || "",
      city: cityName(e.city_id),
      location: e.place_name,
      image: publicUrl("club-media", e.cover_path),
      organiser: e.clubs?.name || "Outhere",
      organiserType: e.club_id ? "crew" : "outhere",
      crewId: e.club_id,
      kind: e.kind,
      pace: e.pace_label,
      tierRequired: e.tier_required,
      canAttend: tierAtLeast(tier, e.tier_required),
      startAt: start,
      endAt: end,
      capacity,
      rsvpCount: count,
      spotsLeft: Math.max(0, capacity - count),
      isFull: count >= capacity && !myStatus[e.id],
      isGoing: !!myStatus[e.id],
      checkedIn: myStatus[e.id] === "checked_in",
      status: e.cancelled_at ? "cancelled" : now < start ? "upcoming" : now <= end ? "live" : "ended",
      checkInOpen: now >= start - 60 * 60 * 1000 && now <= end + 30 * 60 * 1000,
      needsCode: true,
      rewardXp: 75,
      rewardOut: 10,
    };
  });
};

export const listEvents = async ({ city } = {}) => {
  const me = await uid();
  let req = supabase.from("events").select("*, clubs(name)").is("cancelled_at", null).gte("starts_at", new Date(Date.now() - DAY_MS).toISOString()).order("starts_at").limit(60);
  if (city) req = req.eq("city_id", cityId(city));
  return eventViews((await run(req)) || [], me);
};

export const getEvent = async (id) => {
  const me = await uid();
  const e = await run(supabase.from("events").select("*, clubs(name)").eq("id", id).maybeSingle());
  if (!e) throw new EngineError("NOT_FOUND", "Event not found.");
  return (await eventViews([e], me))[0];
};

export const rsvpEvent = async (id, going = true) => {
  await rpc("rsvp_event", { p_event: id, p_going: going });
  changed();
  return getEvent(id);
};

export const checkInEvent = async (id, code) => {
  if (!code) throw new EngineError("CODE_REQUIRED", "Ask the organiser for the check-in code.");
  await rpc("check_in_event", { p_event: id, p_code: code.trim() });
  changed();
  return { xp: 75, out: 10 };
};

// ── Drops ─────────────────────────────────────────────────────────────────────

const dropViews = async (rows, me) => {
  const ids = rows.map((d) => d.id);
  const [orders, reminders, tierRow] = await Promise.all([
    ids.length ? run(supabase.from("drop_orders").select("drop_id, user_id, status").in("drop_id", ids)) : [],
    me && ids.length ? run(supabase.from("drop_reminders").select("drop_id").eq("user_id", me).in("drop_id", ids)) : [],
    me ? run(supabase.from("profiles").select("tier").eq("id", me).maybeSingle()) : null,
  ]);
  const tier = tierRow?.tier || "free";
  const reminded = new Set((reminders || []).map((r) => r.drop_id));
  const now = Date.now();
  return rows.map((d) => {
    const opens = new Date(d.opens_at).getTime();
    const early = tier === "free" ? 0 : d.early_access_h * 60 * 60 * 1000;
    const left = d.stock; // reserve_drop takes stock down as orders come in
    const live = now >= opens - early && (!d.closes_at || now < new Date(d.closes_at).getTime());
    return {
      id: d.id,
      title: d.title,
      subtitle: d.description || "",
      description: d.description || "",
      image: publicUrl("drops", d.image_path),
      priceOut: d.price_out,
      pricePence: d.price_pence,
      sizes: d.sizes || [],
      stock: d.stock,
      remaining: left,
      tierRequired: d.tier_required,
      canBuy: tierAtLeast(tier, d.tier_required),
      dropAt: opens,
      earlyAccessAt: opens - d.early_access_h * 60 * 60 * 1000,
      status: left === 0 ? "soldout" : live ? "live" : "upcoming",
      reminded: reminded.has(d.id),
      reserved: (orders || []).some((o) => o.drop_id === d.id && o.user_id === me && o.status !== "cancelled"),
    };
  });
};

export const listDrops = async () => {
  const me = await uid();
  return dropViews((await run(supabase.from("drops").select("*").order("opens_at", { ascending: false }).limit(40))) || [], me);
};

export const getDrop = async (id) => {
  const me = await uid();
  const d = await run(supabase.from("drops").select("*").eq("id", id).maybeSingle());
  if (!d) throw new EngineError("NOT_FOUND", "Drop not found.");
  return (await dropViews([d], me))[0];
};

export const toggleDropReminder = async (id) => {
  const me = await requireUid();
  const existing = await run(supabase.from("drop_reminders").select("drop_id").eq("drop_id", id).eq("user_id", me).maybeSingle());
  if (existing) await run(supabase.from("drop_reminders").delete().eq("drop_id", id).eq("user_id", me));
  else await run(supabase.from("drop_reminders").insert({ drop_id: id, user_id: me }));
  changed();
  return !existing;
};

export const reserveDrop = async (id, size) => {
  const order = await rpc("reserve_drop", { p_drop: id, p_size: size || null });
  changed();
  return order;
};

// ── Not in the database yet ───────────────────────────────────────────────────

export const listRewards = async () => [];
export const redeemReward = async () => {
  throw new EngineError("NOT_FOUND", "Rewards are coming soon.");
};
export const listRedemptions = async () => [];
export const listNews = async () => [];
export const getNews = async () => null;

// ── Notifications ─────────────────────────────────────────────────────────────

const KIND_TO_TYPE = { battle: "battles", club: "crews", league: "battles", drop: "drops", social: "social", system: "rewards" };

export const listNotifications = async () => {
  const me = await uid();
  if (!me) return [];
  const rows = await run(supabase.from("notifications").select("*").eq("user_id", me).order("created_at", { ascending: false }).limit(100));
  return (rows || []).map((n) => ({ id: String(n.id), type: KIND_TO_TYPE[n.kind] || n.kind, title: n.title, body: n.body, link: n.link, at: new Date(n.created_at).getTime(), read: !!n.read_at }));
};

export const unreadNotificationCount = async () => {
  const me = await uid();
  if (!me) return 0;
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", me).is("read_at", null);
  return count || 0;
};

export const markNotificationRead = async (id) => {
  await run(supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", Number(id)));
  changed();
};

export const markAllNotificationsRead = async () => {
  const me = await requireUid();
  await run(supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", me).is("read_at", null));
  changed();
};

export const clearNotifications = async () => {
  const me = await requireUid();
  await run(supabase.from("notifications").delete().eq("user_id", me));
  changed();
};

// ── Settings (on this phone) ──────────────────────────────────────────────────

const SETTINGS_KEY = "outhere.settings.v1";
const DEFAULT_SETTINGS = {
  units: "km",
  haptics: true,
  notifications: { battles: true, crews: true, drops: true, events: true, rewards: true },
  privacy: { showOnLeaderboards: true, showOutsideStatus: true },
};

export const getSettings = async () => {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    const saved = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_SETTINGS, ...saved, notifications: { ...DEFAULT_SETTINGS.notifications, ...saved.notifications }, privacy: { ...DEFAULT_SETTINGS.privacy, ...saved.privacy } };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const updateSettings = async (patch) => {
  const current = await getSettings();
  const next = { ...current, ...patch, notifications: { ...current.notifications, ...patch.notifications }, privacy: { ...current.privacy, ...patch.privacy } };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  changed();
  return next;
};

// Keep queries fresh when the session or our rows change elsewhere.
if (supabase) {
  supabase.auth.onAuthStateChange(() => changed());
}
