// The Crew tab over Supabase: the same functions as crew.js with the same
// arguments and return shapes. Numbers come from read-only database functions
// (crew_race, crew_days, crew_stats, city_crew_board, area_board); anything
// that changes something goes through a table policy or a database function
// (toggle_chat_run, share_battle_to_crew, report_content, join_crew_challenge,
// decide_join_request). See supabase/migrations/20261015101730_crew.sql.

import { addDays, dayKey, startOfDay, startOfWeek } from "./time";
import { CREW_CHALLENGES, photoFor } from "./seedCrew";

const DAY_MS = 24 * 60 * 60 * 1000;
const STEPS_PER_MIN = 120;
const DOW_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOT_WORDS = ["mornings", "late mornings", "lunchtimes", "evenings", "nights"];
const KIND_IN = { route_card: "route", run_card: "run", battle_card: "battle", photo: "photo", text: "text", poll: "text", event_card: "text" };
const KIND_OUT = { route: "route_card", run: "run_card" };
const round1 = (x) => Math.round(Number(x || 0) * 10) / 10;

export const makeRemoteCrew = (h) => {
  const { supabase, run, rpc, uid, requireUid, changed, publicUrl, playerView, EngineError, dotsFor, listClubRuns, prepareStoryPhoto, storyFiles } = h;

  // ── People ──────────────────────────────────────────────────────────────────

  // Name, face and ring for anyone, private profiles included.
  const cardsFor = async (ids, me) => {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return {};
    const rows = await run(supabase.from("profile_cards").select("id, username, display_name, avatar_path, tier, runner, runner_figure, fighter").in("id", unique));
    return Object.fromEntries((rows || []).map((p) => [p.id, playerView(p, me)]));
  };

  const memberIds = async (crewId) => ((await run(supabase.from("club_members").select("user_id, role, joined_at").eq("club_id", crewId))) || []);

  const myCity = async (me) => (await run(supabase.from("profiles").select("city_id, borough_id").eq("id", me).single())) || {};

  const signed = async (paths) => {
    const list = [...new Set(paths.filter(Boolean))];
    if (!list.length) return {};
    const { data } = await supabase.storage.from("posts").createSignedUrls(list, 60 * 60);
    return Object.fromEntries((data || []).filter((x) => x.signedUrl).map((x) => [x.path, x.signedUrl]));
  };

  // Shrinks the photo and puts it in my folder of the private posts bucket.
  const uploadPhoto = async (me, uri) => {
    const local = await prepareStoryPhoto(uri);
    const blob = await (await fetch(local)).blob();
    const path = `${me}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.webp`;
    const { error } = await supabase.storage.from("posts").upload(path, blob, { contentType: "image/webp" });
    if (error) throw new EngineError("UPLOAD", "The photo didn't upload. Try again.");
    return path;
  };

  const routePoints = (route) => (Array.isArray(route) && route.length > 1 ? route.map((p) => (Array.isArray(p) ? [p[0], p[1]] : [p.lat ?? p.latitude, p.lng ?? p.longitude])) : null);

  const myRun = async (me, runId) => {
    const r = await run(supabase.from("runs").select("id, title, distance_m, moving_s, avg_pace_s_per_km, route_public").eq("id", runId).eq("user_id", me).maybeSingle());
    if (!r) throw new EngineError("NOT_FOUND", "Run not found.");
    const km = r.distance_m / 1000;
    return { runId: r.id, title: r.title || "Run", km: round1(km), minutes: Math.round(r.moving_s / 60), paceSec: r.avg_pace_s_per_km || (km ? Math.round(r.moving_s / km) : null), route: routePoints(r.route_public), out: Math.floor(km) };
  };

  // ── Header and the race ─────────────────────────────────────────────────────

  const getCrewHeader = async (crewId) => {
    const me = await uid();
    const c = await run(supabase.from("clubs").select("id, name, city_id, borough_id, member_count").eq("id", crewId).maybeSingle());
    if (!c) throw new EngineError("NOT_FOUND", "Crew not found.");
    const [board, members] = await Promise.all([rpc("city_crew_board", { p_city: c.city_id }), memberIds(crewId)]);
    const dots = await dotsFor(members.map((m) => m.user_id));
    const mine = members.find((m) => m.user_id === me);
    const city = h.cityName(c.city_id);
    return {
      id: c.id,
      name: c.name,
      city,
      area: h.cityName(c.borough_id) || city,
      cityRank: (board || []).find((r) => r.club_id === crewId)?.rank || null,
      cityCrews: (board || []).length,
      memberCount: c.member_count,
      outNow: Object.values(dots).filter((d) => d === "out").length,
      isMember: !!mine,
      myRole: mine ? (mine.role === "captain" ? "owner" : mine.role) : null,
    };
  };

  const getCrewRace = async (crewId, period = "week") => {
    const me = await uid();
    const rows = (await rpc("crew_race", { p_club: crewId, p_period: period })) || [];
    const ids = rows.map((r) => r.user_id);
    const [cards, dots] = await Promise.all([cardsFor(ids, me), dotsFor(ids)]);
    const top = Number(rows[0]?.steps) || 1;
    const ranked = rows
      .filter((r) => cards[r.user_id])
      .map((r, i) => ({ player: cards[r.user_id], steps: Number(r.steps), km: round1(r.km), rank: i + 1, isMe: r.user_id === me, isOutside: dots[r.user_id] === "out", share: Number(r.steps) / top }));
    const mine = ranked.find((r) => r.isMe) || null;
    let nudge = null;
    if (mine && mine.rank > 1) {
      const above = ranked[mine.rank - 2];
      const gap = above.steps - mine.steps + 1;
      nudge = { kind: "pass", target: above.player, gap, minutes: Math.max(1, Math.round(gap / STEPS_PER_MIN / 5) * 5) };
    } else if (mine && ranked[1]) {
      nudge = { kind: "lead", target: ranked[1].player, gap: mine.steps - ranked[1].steps, minutes: 0 };
    }
    return { period, rows: ranked, me: mine, nudge };
  };

  // ── Goal, days, challenges, stats ───────────────────────────────────────────

  const getCrewGoal = async (crewId) => {
    const me = await uid();
    const [c, rows] = await Promise.all([run(supabase.from("clubs").select("weekly_goal_km").eq("id", crewId).single()), rpc("crew_race", { p_club: crewId, p_period: "week" })]);
    const cards = await cardsFor((rows || []).map((r) => r.user_id), me);
    const goalKm = c.weekly_goal_km || 100;
    const parts = (rows || []).filter((r) => cards[r.user_id]).map((r) => ({ player: cards[r.user_id], km: round1(r.km) })).sort((a, b) => b.km - a.km);
    const km = round1(parts.reduce((s, p) => s + p.km, 0));
    const end = addDays(startOfWeek(), 7).getTime();
    return { goalKm, km, pct: Math.min(1, km / goalKm), daysLeft: Math.max(0, Math.ceil((end - Date.now()) / DAY_MS)), contributors: parts.map((p) => ({ ...p, share: p.km / goalKm })) };
  };

  const getCrewDays = async (crewId) => {
    const [c, rows] = await Promise.all([run(supabase.from("clubs").select("weekly_goal_km").eq("id", crewId).single()), rpc("crew_days", { p_club: crewId })]);
    const byDay = Object.fromEntries((rows || []).map((r) => [r.day, Number(r.km)]));
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysIn = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const target = round1((c.weekly_goal_km || 100) / 7);
    const today = now.getDate();
    const days = Array.from({ length: daysIn }, (_, i) => {
      const day = i + 1;
      if (day > today) return { day, km: null, hit: null, future: true, today: false };
      const km = round1(byDay[dayKey(new Date(now.getFullYear(), now.getMonth(), day))] || 0);
      return { day, km, hit: km >= target, future: false, today: day === today };
    });
    const past = days.filter((d) => !d.future);
    return { year: now.getFullYear(), month: now.getMonth(), firstDow: (first.getDay() + 6) % 7, daysIn, targetKm: target, days, hits: past.filter((d) => d.hit).length, counted: past.length };
  };

  const listCrewChallenges = async (crewId) => {
    const me = await uid();
    const week = dayKey(startOfWeek());
    const [list, entries, c] = await Promise.all([
      run(supabase.from("crew_challenges").select("*").order("sort")),
      run(supabase.from("crew_challenge_entries").select("challenge_id, user_id").eq("club_id", crewId).eq("week_start", week)),
      run(supabase.from("clubs").select("city_id").eq("id", crewId).single()),
    ]);
    const board = (await rpc("city_crew_board", { p_city: c.city_id })) || [];
    const rank = board.find((r) => r.club_id === crewId)?.rank || 1;
    const city = h.cityName(c.city_id);
    return (list && list.length ? list : CREW_CHALLENGES).map((ch) => {
      const mine = (entries || []).filter((e) => e.challenge_id === ch.id);
      return {
        id: ch.id,
        title: ch.title,
        description: ch.kind === "beat_rival" ? (rank > 1 ? `Beat the crew above you in ${city} by Sunday` : `Stay top of ${city} until Sunday`) : ch.description,
        kind: ch.kind,
        target: ch.target,
        image: ch.image,
        joined: mine.some((e) => e.user_id === me),
        count: mine.length,
      };
    });
  };

  const joinCrewChallenge = async (crewId, challengeId, join = true) => {
    await rpc("join_crew_challenge", { p_club: crewId, p_challenge: challengeId, p_join: join });
    changed();
    return { joined: join };
  };

  const getCrewStats = async (crewId) => {
    const j = (await rpc("crew_stats", { p_club: crewId })) || {};
    const counts = Array.from({ length: 5 }, () => Array(7).fill(0));
    for (const c of j.heat || []) counts[c.slot][(c.dow + 6) % 7] = c.n;
    const max = Math.max(1, ...counts.flat());
    let best = [0, 0];
    counts.forEach((row, r) => row.forEach((n, c) => {
      if (n > counts[best[0]][best[1]]) best = [r, c];
    }));
    return {
      monthLabel: new Date().toLocaleString("en-GB", { month: "long" }),
      monthKm: Number(j.month_km || 0),
      heat: counts.map((row) => row.map((n) => n / max)),
      slots: ["6a", "9a", "12p", "5p", "8p"],
      busiest: j.runs ? `${DOW_NAMES[best[1]]} ${SLOT_WORDS[best[0]]}` : null,
      runs: Number(j.runs || 0),
      avgPaceSec: j.avg_pace ? Number(j.avg_pace) : null,
      out: Number(j.out || 0),
    };
  };

  const initials = (name = "") =>
    name.split(/[\s-]+/).filter((w) => w && /[A-Z]/.test(w[0])).slice(0, 2).map((w) => w[0]).join("") || name.slice(0, 2).toUpperCase();

  const getCityBoard = async (kind = "crews") => {
    const me = await requireUid();
    const p = await myCity(me);
    if (kind === "crews") {
      const [rows, mine] = await Promise.all([rpc("city_crew_board", { p_city: p.city_id }), run(supabase.from("club_members").select("club_id").eq("user_id", me))]);
      const in_ = new Set((mine || []).map((m) => m.club_id));
      return {
        kind,
        place: h.cityName(p.city_id),
        rows: (rows || []).map((r) => ({ id: r.club_id, name: r.name, short: initials(r.name), logo: publicUrl("club-media", r.logo_path), accent: r.accent, value: Math.round(Number(r.km)), unit: "km", isMine: in_.has(r.club_id), rank: r.rank })),
      };
    }
    const j = (await rpc("area_board", { p_city: p.city_id })) || { rows: [] };
    return {
      kind: j.kind,
      place: j.place,
      rows: (j.rows || []).map((r, i) => ({ id: r.id, name: r.name, short: initials(r.name), value: Number(r.steps), unit: "steps", isMine: r.id === p.borough_id || r.id === p.city_id, rank: i + 1 })),
    };
  };

  // ── Feed ────────────────────────────────────────────────────────────────────

  const POST = "id, author_id, club_id, kind, body, media_paths, run_id, data, reaction_count, comment_count, created_at, runs(title, distance_m, moving_s, avg_pace_s_per_km, route_public)";

  const postViews = async (rows, me) => {
    const ids = rows.map((p) => p.id);
    const [kudos, urls] = await Promise.all([
      ids.length ? run(supabase.from("post_reactions").select("post_id, user_id, created_at").eq("emoji", "kudos").in("post_id", ids)) : [],
      signed(rows.flatMap((p) => p.media_paths || [])),
    ]);
    const cards = await cardsFor([...rows.map((p) => p.author_id), ...(kudos || []).map((k) => k.user_id)], me);
    return rows.map((p) => {
      const d = p.data || {};
      const r = p.runs;
      const km = r ? r.distance_m / 1000 : Number(d.km || 0);
      const mine = (kudos || []).filter((k) => k.post_id === p.id);
      const kind = d.kind || (p.kind === "run_recap" ? "run" : p.kind === "photo" ? "photo" : "text");
      return {
        id: p.id,
        crewId: p.club_id,
        kind,
        author: cards[p.author_id] || null,
        others: d.others || 0,
        title: r?.title || d.title || "",
        place: d.place || "",
        sub: d.sub || "",
        photo: p.media_paths?.[0] && urls[p.media_paths[0]] ? { uri: urls[p.media_paths[0]] } : null,
        badge: d.badge ? photoFor(d.badge) : null,
        route: r ? routePoints(r.route_public) : null,
        km: round1(km),
        minutes: r ? Math.round(r.moving_s / 60) : 0,
        paceSec: r ? r.avg_pace_s_per_km || (km ? Math.round(r.moving_s / km) : null) : null,
        out: d.out || Math.floor(km),
        caption: p.body || "",
        at: new Date(p.created_at).getTime(),
        likeCount: mine.length,
        likedByMe: mine.some((k) => k.user_id === me),
        likers: mine.slice(-3).map((k) => cards[k.user_id]).filter(Boolean),
        comments: p.comment_count || 0,
        isMine: p.author_id === me,
        runId: p.run_id,
      };
    });
  };

  const getCrewFeed = async (crewId) => {
    const me = await uid();
    const rows = await run(supabase.from("posts").select(POST).eq("club_id", crewId).is("hidden_at", null).order("created_at", { ascending: false }).limit(40));
    return postViews(rows || [], me);
  };

  const postToCrew = async (crewId, { kind = "text", text = "", photoUri = null, runId = null } = {}) => {
    const me = await requireUid();
    const caption = (text || "").trim().slice(0, 2000);
    if (kind === "photo" && !photoUri) throw new EngineError("BAD_POST", "Pick a photo first.");
    if ((kind === "run" || kind === "route") && !runId) throw new EngineError("BAD_POST", "Pick a run first.");
    if (kind === "text" && !caption) throw new EngineError("BAD_POST", "Write something first.");
    const r = runId ? await myRun(me, runId) : null;
    if (kind === "route" && !r?.route) throw new EngineError("BAD_POST", "That run has no route to share.");
    const media = photoUri ? [await uploadPhoto(me, photoUri)] : [];
    const row = await run(
      supabase
        .from("posts")
        .insert({ author_id: me, club_id: crewId, kind: kind === "photo" ? "photo" : kind === "text" ? "text" : "run_recap", body: caption || null, media_paths: media, run_id: runId, data: { kind, out: r?.out || 0 }, visibility: "members" })
        .select(POST)
        .single(),
    );
    changed();
    return (await postViews([row], me))[0];
  };

  const shareRunToCrew = async (crewId, { runId, caption = "" }) => postToCrew(crewId, { kind: "run", runId, text: caption });

  const togglePostLike = async (crewId, postId) => {
    const me = await requireUid();
    const had = await run(supabase.from("post_reactions").select("post_id").eq("post_id", postId).eq("user_id", me).eq("emoji", "kudos").maybeSingle());
    if (had) await run(supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", me).eq("emoji", "kudos"));
    else await run(supabase.from("post_reactions").insert({ post_id: postId, user_id: me, emoji: "kudos" }));
    const { count } = await supabase.from("post_reactions").select("post_id", { count: "exact", head: true }).eq("post_id", postId).eq("emoji", "kudos");
    changed();
    return { liked: !had, count: count || 0 };
  };

  const getPostComments = async (crewId, postId) => {
    const me = await uid();
    const rows = await run(supabase.from("post_comments").select("id, author_id, body, created_at").eq("post_id", postId).order("created_at"));
    const cards = await cardsFor((rows || []).map((c) => c.author_id), me);
    return (rows || []).map((c) => ({ id: c.id, text: c.body, at: new Date(c.created_at).getTime(), author: cards[c.author_id] || null, isMine: c.author_id === me }));
  };

  const commentOnPost = async (crewId, postId, text) => {
    const me = await requireUid();
    const clean = (text || "").trim().slice(0, 500);
    if (!clean) throw new EngineError("BAD_POST", "Write something first.");
    const c = await run(supabase.from("post_comments").insert({ post_id: postId, author_id: me, body: clean }).select("id, created_at").single());
    changed();
    return { id: c.id, text: clean, at: new Date(c.created_at).getTime(), author: (await cardsFor([me], me))[me], isMine: true };
  };

  const deletePost = async (crewId, postId) => {
    await run(supabase.from("posts").delete().eq("id", postId));
    changed();
  };

  // ── Chat ────────────────────────────────────────────────────────────────────

  const general = async (crewId) => {
    const ch = await run(supabase.from("club_channels").select("id, staff_only_post").eq("club_id", crewId).eq("name", "general").maybeSingle());
    if (!ch) throw new EngineError("NOT_FOUND", "This crew has no chat yet.");
    return ch;
  };

  const messageViews = async (rows, me) => {
    const ids = rows.map((m) => m.id);
    const [reactions, joins, urls] = await Promise.all([
      ids.length ? run(supabase.from("club_message_reactions").select("message_id, user_id, emoji").in("message_id", ids)) : [],
      ids.length ? run(supabase.from("club_message_joins").select("message_id, user_id").in("message_id", ids)) : [],
      signed(rows.map((m) => (m.kind === "photo" ? m.data?.path : null))),
    ]);
    const cards = await cardsFor([...rows.map((m) => m.author_id), ...(joins || []).map((j) => j.user_id)], me);
    return rows.map((m) => {
      const kind = KIND_IN[m.kind] || "text";
      const d = m.data || {};
      const mine = (reactions || []).filter((r) => r.message_id === m.id);
      const byEmoji = {};
      for (const r of mine) (byEmoji[r.emoji] = byEmoji[r.emoji] || []).push(r.user_id);
      const going = (joins || []).filter((j) => j.message_id === m.id);
      return {
        id: m.id,
        kind,
        text: m.body || "",
        authorId: m.author_id,
        author: cards[m.author_id] || null,
        isMine: m.author_id === me,
        at: new Date(m.created_at).getTime(),
        photo: kind === "photo" && urls[d.path] ? { uri: urls[d.path] } : null,
        data:
          kind === "battle"
            ? { battleId: d.battle_id, rivalId: d.rival_id, rivalName: d.rival_name, won: !!d.won, draw: !!d.draw, out: d.out || 0 }
            : kind === "route" || kind === "run"
              ? { title: d.title, km: d.km, paceSec: d.pace_s, minutes: d.minutes, route: routePoints(d.route), runId: d.run_id, startAt: d.start_at ? new Date(d.start_at).getTime() : null }
              : d,
        reactions: Object.entries(byEmoji).map(([emoji, people]) => ({ emoji, count: people.length, mine: people.includes(me) })),
        going: going.length,
        imGoing: going.some((j) => j.user_id === me),
        goingPeople: going.slice(0, 4).map((j) => cards[j.user_id]).filter(Boolean),
      };
    });
  };

  const getCrewMessages = async (crewId) => {
    const me = await uid();
    const ch = await general(crewId);
    const rows = await run(supabase.from("club_messages").select("id, author_id, body, kind, data, created_at").eq("channel_id", ch.id).order("created_at", { ascending: false }).limit(200));
    return messageViews((rows || []).reverse(), me);
  };

  const insertMessage = async (crewId, row) => {
    const me = await requireUid();
    const ch = await general(crewId);
    const m = await run(supabase.from("club_messages").insert({ channel_id: ch.id, club_id: crewId, author_id: me, ...row }).select("id, author_id, body, kind, data, created_at").single());
    await rpc("read_channel", { p_channel: ch.id }).catch(() => {});
    changed();
    return m;
  };

  const sendCrewMessage = async (crewId, text) => {
    const clean = (text || "").trim();
    if (!clean) return null;
    const me = await uid();
    const m = await insertMessage(crewId, { body: clean.slice(0, 2000) });
    return (await messageViews([m], me))[0];
  };

  const shareToCrewChat = async (crewId, { kind, photoUri = null, runId = null, battleId = null, text = "", startAt = null } = {}) => {
    const me = await requireUid();
    let m;
    if (kind === "photo") {
      if (!photoUri) throw new EngineError("BAD_POST", "Pick a photo first.");
      const path = await uploadPhoto(me, photoUri);
      m = await insertMessage(crewId, { kind: "photo", body: (text || "").trim().slice(0, 300) || null, data: { path } });
    } else if (kind === "route" || kind === "run") {
      const r = await myRun(me, runId);
      if (kind === "route" && !r.route) throw new EngineError("BAD_POST", "That run has no route to share.");
      const at = startAt || startOfDay(Date.now() + DAY_MS).getTime() + 7 * 60 * 60 * 1000;
      m = await insertMessage(crewId, {
        kind: KIND_OUT[kind],
        body: (text || "").trim() || null,
        data: { title: r.title, km: r.km, pace_s: r.paceSec, minutes: r.minutes, route: r.route, run_id: r.runId, ...(kind === "route" ? { start_at: new Date(at).toISOString() } : {}) },
      });
      if (kind === "route") await rpc("toggle_chat_run", { p_message: m.id });
    } else if (kind === "battle") {
      const id = await rpc("share_battle_to_crew", { p_club: crewId, p_battle: battleId });
      m = await run(supabase.from("club_messages").select("id, author_id, body, kind, data, created_at").eq("id", id).single());
      changed();
    } else {
      throw new EngineError("BAD_POST", "Pick something to share.");
    }
    return (await messageViews([m], me))[0];
  };

  const reactToMessage = async (crewId, msgId, emoji) => {
    const me = await requireUid();
    const had = await run(supabase.from("club_message_reactions").select("message_id").eq("message_id", msgId).eq("user_id", me).eq("emoji", emoji).maybeSingle());
    if (had) await run(supabase.from("club_message_reactions").delete().eq("message_id", msgId).eq("user_id", me).eq("emoji", emoji));
    else await run(supabase.from("club_message_reactions").insert({ message_id: msgId, user_id: me, emoji }));
    const m = await run(supabase.from("club_messages").select("id, author_id, body, kind, data, created_at").eq("id", msgId).single());
    changed();
    return (await messageViews([m], me))[0];
  };

  const toggleChatRun = async (crewId, msgId) => {
    const going = await rpc("toggle_chat_run", { p_message: msgId });
    const { count } = await supabase.from("club_message_joins").select("user_id", { count: "exact", head: true }).eq("message_id", msgId);
    changed();
    return { going: !!going, count: count || 0 };
  };

  const getCrewUnread = async (crewId) => {
    if (!(await uid())) return 0;
    const rows = await rpc("club_unread", { p_club: crewId });
    return (rows || []).reduce((s, r) => s + (r.unread || 0), 0);
  };

  const markCrewRead = async (crewId) => {
    const ch = await general(crewId);
    await rpc("read_channel", { p_channel: ch.id });
    return true;
  };

  // Typing goes over Realtime presence, which this layer doesn't hold yet.
  const getCrewTyping = async () => null;

  // ── Joining, requests ───────────────────────────────────────────────────────

  const listCrewsNear = async () => {
    const me = await requireUid();
    const p = await myCity(me);
    const [rows, mine, asks] = await Promise.all([
      run(supabase.from("clubs").select("id, name, logo_path, accent, borough_id, city_id, member_count, join_policy, status").eq("city_id", p.city_id).neq("status", "suspended").order("member_count", { ascending: false }).limit(30)),
      run(supabase.from("club_members").select("club_id").eq("user_id", me)),
      run(supabase.from("club_join_requests").select("club_id").eq("user_id", me).eq("status", "pending")),
    ]);
    const in_ = new Set((mine || []).map((m) => m.club_id));
    const asked = new Set((asks || []).map((a) => a.club_id));
    return (rows || [])
      .filter((c) => !in_.has(c.id))
      .map((c) => ({ id: c.id, name: c.name, logo: publicUrl("club-media", c.logo_path), accent: c.accent, area: h.cityName(c.borough_id || c.city_id), memberCount: c.member_count, awayKm: null, joinPolicy: c.join_policy || "open", requested: asked.has(c.id), verified: c.status === "verified" }));
  };

  const cancelJoinRequest = async (crewId) => {
    const me = await requireUid();
    await run(supabase.from("club_join_requests").delete().eq("club_id", crewId).eq("user_id", me).eq("status", "pending"));
    changed();
  };

  const listJoinRequests = async (crewId) => {
    const me = await uid();
    const rows = await run(supabase.from("club_join_requests").select("id, club_id, user_id, pace_group, status, created_at").eq("club_id", crewId).eq("status", "pending").order("created_at"));
    const cards = await cardsFor((rows || []).map((r) => r.user_id), me);
    return (rows || []).map((r) => ({ id: r.id, crewId: r.club_id, player: cards[r.user_id] || null, at: new Date(r.created_at).getTime(), status: r.status, paceGroup: r.pace_group }));
  };

  const decideJoinRequest = async (crewId, requestId, approve) => {
    const me = await uid();
    const r = await rpc("decide_join_request", { p_request: requestId, p_approve: !!approve });
    changed();
    const cards = await cardsFor([r.user_id], me);
    return { id: r.id, crewId: r.club_id, player: cards[r.user_id] || null, at: new Date(r.created_at).getTime(), status: r.status, paceGroup: r.pace_group };
  };

  // ── Reports and blocks ──────────────────────────────────────────────────────

  const reportContent = async ({ crewId = null, targetType, targetId, authorId = null, reason, detail = "", block = false }) => {
    await rpc("report_content", { p_target_type: targetType, p_target_id: String(targetId), p_reason: reason, p_club: crewId, p_block: block ? authorId : null, p_detail: detail || null });
    changed();
    return { reported: true, blocked: !!block };
  };

  const blockPlayer = async (pid) => {
    const me = await requireUid();
    await run(supabase.from("blocks").upsert({ user_id: me, blocked_id: pid }, { ignoreDuplicates: true }));
    await run(supabase.from("follows").delete().eq("follower_id", me).eq("followee_id", pid));
    changed();
  };

  const unblockPlayer = async (pid) => {
    const me = await requireUid();
    await run(supabase.from("blocks").delete().eq("user_id", me).eq("blocked_id", pid));
    changed();
  };

  const listBlocked = async () => {
    const me = await requireUid();
    const rows = await run(supabase.from("blocks").select("blocked_id").eq("user_id", me));
    const cards = await cardsFor((rows || []).map((r) => r.blocked_id), me);
    return Object.values(cards);
  };

  // ── The club's stories row ──────────────────────────────────────────────────

  const listCrewStories = async (crewId) => {
    const me = await uid();
    if (!me) return [];
    const members = (await memberIds(crewId)).map((m) => m.user_id).filter((id) => id !== me);
    const now = new Date().toISOString();
    const [live, club, c] = await Promise.all([
      members.length ? run(supabase.from("stories").select("id, author_id").in("author_id", members).eq("as_club", false).gt("expires_at", now)) : [],
      run(supabase.from("stories").select("id").eq("club_id", crewId).eq("as_club", true).gt("expires_at", now)),
      run(supabase.from("clubs").select("name, logo_path, accent").eq("id", crewId).single()),
    ]);
    const ids = [...(live || []).map((s) => s.id), ...(club || []).map((s) => s.id)];
    const seen = ids.length ? new Set(((await run(supabase.from("story_views").select("story_id").eq("user_id", me).in("story_id", ids))) || []).map((v) => v.story_id)) : new Set();
    const authors = [...new Set((live || []).map((s) => s.author_id))];
    const [cards, dots] = await Promise.all([cardsFor(authors, me), dotsFor(authors)]);
    const people = authors
      .filter((a) => cards[a])
      .map((a) => {
        const mine = (live || []).filter((s) => s.author_id === a);
        return { kind: "person", id: a, name: cards[a].name, avatar: cards[a].avatar, tier: cards[a].tier, dot: dots[a] || null, story: mine.every((s) => seen.has(s.id)) ? "watched" : "unwatched" };
      })
      .sort((x, y) => Number(y.story === "unwatched") - Number(x.story === "unwatched") || Number(y.dot === "out") - Number(x.dot === "out"));
    const row = club?.length ? [{ kind: "club", id: `club:${crewId}`, crewId, name: c.name.split(" ")[0], logo: publicUrl("club-media", c.logo_path), accent: c.accent, story: club.every((s) => seen.has(s.id)) ? "watched" : "unwatched" }] : [];
    return [...people.slice(0, 2), ...row, ...people.slice(2)];
  };

  const listClubStories = async (crewId) => {
    const me = await uid();
    if (!me) return [];
    const rows = await run(supabase.from("stories").select("id, author_id, caption, created_at, expires_at").eq("club_id", crewId).eq("as_club", true).gt("expires_at", new Date().toISOString()).order("created_at"));
    if (!rows?.length) return [];
    const [urls, seen, runs] = await Promise.all([
      storyFiles.urls(rows.map((r) => r.id)),
      run(supabase.from("story_views").select("story_id, emote").eq("user_id", me).in("story_id", rows.map((r) => r.id))),
      listClubRuns(crewId),
    ]);
    const next = (runs || []).find((r) => r.status !== "ended") || null;
    const seenBy = Object.fromEntries((seen || []).map((v) => [v.story_id, v]));
    return rows
      .filter((r) => urls[r.id])
      .map((r) => ({
        id: r.id,
        authorId: `club:${crewId}`,
        clubId: crewId,
        image: urls[r.id],
        caption: r.caption || "",
        clubRun: next ? { id: next.id, startAt: next.startAt, isGoing: next.isGoing, title: next.title } : null,
        audience: "club",
        postedAt: new Date(r.created_at).getTime(),
        expiresAt: new Date(r.expires_at).getTime(),
        seen: !!seenBy[r.id],
        emote: seenBy[r.id]?.emote || null,
      }));
  };

  const cheerStory = async (storyId) => {
    const me = await requireUid();
    const { error } = await supabase.from("story_replies").insert({ story_id: storyId, user_id: me, kind: "cheer" });
    if (error && error.code === "23505") return { cheered: true, already: true };
    if (error) throw new EngineError("SERVER", "That cheer didn't send. Try again.");
    return { cheered: true };
  };

  const replyToStory = async (storyId, authorId, text) => {
    const me = await requireUid();
    const clean = (text || "").trim().slice(0, 500);
    if (!clean) throw new EngineError("BAD_POST", "Write something first.");
    await run(supabase.from("story_replies").insert({ story_id: storyId, user_id: me, kind: "reply", body: clean }));
    return { replied: true };
  };

  return {
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
  };
};
