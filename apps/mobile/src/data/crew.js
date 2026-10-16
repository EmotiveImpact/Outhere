// The Crew tab on the local engine: the week's race, the crew goal split by
// who put the kilometres in, crew days, crew challenges, when the crew moves,
// city boards, the feed (photos, runs, routes, kudos and comments), the chat
// (route cards to join, photos, battle cards, reactions, unread counts and a
// typing indicator), join requests, roles, reports and blocks, and the club's
// stories row. Built by engine.js with its private helpers, so it reads and
// writes the same saved world.
//
// Reads that move the world on (a member dropping a line in the chat, a
// request being answered) use touch, which saves without waking every screen.

import { PLAYERS } from "./seed";
import { AMBIENT_LINES, CREW_CHALLENGES, CREW_CHAT_V2, CREW_FEED_V2, REPLY_LINES, REPORT_REASONS } from "./seedCrew";
import { DAY_MS, HOUR_MS, addDays, dayKey, startOfDay, startOfWeek } from "./time";
import { noise, randomId } from "./random";

const MIN_MS = 60 * 1000;
const REQUEST_ANSWER_MS = 40 * 1000;
const REPLY_TYPING_MS = 2500;
const REPLY_AFTER_MS = 7000;
const STEPS_PER_MIN = 120;
const DOW_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOT_WORDS = ["mornings", "late mornings", "lunchtimes", "evenings", "nights"];
const SLOT_HOURS = [6, 9, 12, 17, 20];
const REACTIONS = ["flame", "heart", "fist", "bolt"];

const round1 = (x) => Math.round(x * 10) / 10;
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);

// A loop of points round a place, for route cards and run posts.
export const routeAround = (seed, lat = 51.5077, lng = -0.1103, km = 6) => {
  const n = 28;
  const r = 0.004 + Math.min(km, 15) * 0.0009;
  const twist = noise(`${seed}:t`) * Math.PI * 2;
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = twist + (i / n) * Math.PI * 2;
    const wobble = 0.75 + noise(`${seed}:${i % n}`) * 0.5;
    return [lat + Math.sin(a) * r * wobble * 0.62, lng + Math.cos(a) * r * wobble];
  });
};

export const makeCrew = (h) => {
  const {
    read, write, touch, requireMe, notify, EngineError, ME,
    publicPlayer, meAsPlayer, playerStepsBetween, myStepsBetween, myDistanceBetween,
    playerIsOutside, storyState, clubBits, STEP_KM,
  } = h;

  const STEP = STEP_KM;
  const playerOf = (s, pid) => (pid === ME ? (s.me ? meAsPlayer(s) : null) : publicPlayer(pid));
  const isMember = (crew, pid = ME) => crew.members.some((m) => m.id === pid);
  const roleOf = (crew, pid = ME) => crew.members.find((m) => m.id === pid)?.role || null;
  const isStaff = (crew) => ["owner", "admin"].includes(roleOf(crew));
  const blocked = (s) => new Set(s.blocked || []);

  const crewOf = (s, id) => {
    const crew = s.crews[id];
    if (!crew) throw new EngineError("NOT_FOUND", "Crew not found.");
    return crew;
  };
  const memberCrew = (s, id, what = "see this") => {
    const crew = crewOf(s, id);
    if (!isMember(crew)) throw new EngineError("FORBIDDEN", `Join the crew to ${what}.`);
    return crew;
  };

  const stepsOf = (s, pid, from, to = Date.now()) => (pid === ME ? myStepsBetween(s, from, to) : playerStepsBetween(pid, from, to));
  const kmOf = (s, pid, from, to = Date.now()) => (pid === ME ? myDistanceBetween(s, from, to) : playerStepsBetween(pid, from, to) * STEP);
  const outside = (s, pid) => (pid === ME ? !!s.me?.isOutside : playerIsOutside(pid));
  const crewKm = (s, crew, from, to = Date.now()) => crew.members.reduce((sum, m) => sum + kmOf(s, m.id, from, to), 0);

  // ── The saved world ─────────────────────────────────────────────────────────

  const meta = (s, crewId) => {
    s.crewMeta = s.crewMeta || {};
    s.crewMeta[crewId] = s.crewMeta[crewId] || { pending: [] };
    return s.crewMeta[crewId];
  };

  // Older saved chats and feeds were plain lines and run posts. Give every
  // message and post its kind, reactions and comments, and add the richer
  // seeded content once per crew.
  const ensure = (s, crewId) => {
    s.crewChat = s.crewChat || {};
    s.crewFeed = s.crewFeed || {};
    s.crewRequests = s.crewRequests || [];
    s.crewChallenges = s.crewChallenges || {};
    s.reports = s.reports || [];
    s.blocked = s.blocked || [];
    s.storyReplies = s.storyReplies || [];
    if (!s.crewPolicySeeded) {
      s.crewPolicySeeded = true;
      if (s.crews.c_peckham && s.crews.c_peckham.privacy === "public") s.crews.c_peckham.privacy = "request";
    }
    if (!crewId || !s.crews[crewId]) return;
    const m = meta(s, crewId);
    const crew = s.crews[crewId];
    s.crewChat[crewId] = (s.crewChat[crewId] || []).map((msg) => ({ kind: "text", reactions: {}, going: [], data: {}, ...msg }));
    s.crewFeed[crewId] = (s.crewFeed[crewId] || []).map((p) => ({
      kind: "run",
      route: p.kind === "run" || !p.kind ? routeAround(p.id, crew.lat, crew.lng, p.km) : null,
      paceSec: p.km > 0 && p.minutes ? Math.round((p.minutes * 60) / p.km) : null,
      out: Math.floor(p.km || 0) * 3,
      commentList: [],
      ...p,
    }));
    if (!m.seededV2) {
      m.seededV2 = true;
      const now = Date.now();
      const chat = (CREW_CHAT_V2[crewId] || []).map((x, i) => ({
        id: `m_seed_${crewId}_${i}`,
        authorId: x.by,
        kind: x.kind,
        text: x.text || "",
        photo: x.photo || null,
        data: x.kind === "route" ? { ...x.data, startAt: startOfDay(now + x.data.startInHours * HOUR_MS).getTime() + 6 * HOUR_MS, route: routeAround(`${crewId}:${i}`, crew.lat, crew.lng, x.data.km) } : x.data || {},
        reactions: x.reactions || {},
        going: x.going || [],
        at: now - x.h * HOUR_MS,
      }));
      s.crewChat[crewId] = [...s.crewChat[crewId], ...chat].sort((a, b) => a.at - b.at);
      const feed = (CREW_FEED_V2[crewId] || []).map((x, i) => ({
        id: `post_seed_${crewId}_${i}`,
        authorId: x.by,
        kind: x.kind,
        title: x.title || "",
        place: x.place || crew.area || crew.city,
        others: x.others || 0,
        photo: x.photo || null,
        badge: x.badge || null,
        sub: x.sub || "",
        km: x.km || 0,
        paceSec: x.paceSec || null,
        out: x.out || 0,
        caption: x.caption || "",
        route: x.kind === "run" ? routeAround(`${crewId}:post:${i}`, crew.lat, crew.lng, x.km) : null,
        likes: PLAYERS.filter((p) => p.id !== x.by).slice(0, x.likes || 0).map((p) => p.id),
        commentList: (x.comments || []).map(([by, text], j) => ({ id: `c_${crewId}_${i}_${j}`, authorId: by, text, at: now - x.h * HOUR_MS + (j + 1) * 6 * MIN_MS })),
        at: now - x.h * HOUR_MS,
      }));
      s.crewFeed[crewId] = [...feed, ...s.crewFeed[crewId]];
    }
  };

  // Time passing: my join requests get answered, replies to my messages land,
  // and members drop a line now and then.
  const tick = (s, crewId) => {
    ensure(s, crewId);
    const now = Date.now();
    for (const r of s.crewRequests) {
      if (r.userId !== ME || r.status !== "pending" || now - r.at < REQUEST_ANSWER_MS) continue;
      const crew = s.crews[r.crewId];
      r.status = "approved";
      r.decidedAt = now;
      if (crew && !isMember(crew)) {
        crew.members.push({ id: ME, role: "member", joinedAt: now });
        notify(s, { type: "crews", title: "You're in", body: `Welcome to ${crew.name}. Say hello in the chat.`, link: `/(tabs)/club?crew=${crew.id}` });
      }
    }
    if (!crewId || !s.crews[crewId] || !isMember(s.crews[crewId])) return;
    const crew = s.crews[crewId];
    const m = meta(s, crewId);
    const due = (m.pending || []).filter((p) => p.at <= now);
    if (due.length) {
      m.pending = m.pending.filter((p) => p.at > now);
      for (const p of due) {
        if (!isMember(crew, p.authorId) || blocked(s).has(p.authorId)) continue;
        s.crewChat[crewId].push({ id: randomId("m"), authorId: p.authorId, kind: "text", text: p.text, data: {}, reactions: {}, going: [], at: p.at });
      }
    }
    // One chance an hour, over the last few hours, for someone to say something.
    const hour = Math.floor(now / HOUR_MS);
    const from = Math.max(m.ambientHour || hour - 3, hour - 3);
    const others = crew.members.filter((x) => x.id !== ME);
    for (let hr = from + 1; hr <= hour && others.length; hr += 1) {
      if (noise(`${crewId}:chat:${hr}`) < 0.55) continue;
      const by = others[Math.floor(noise(`${crewId}:who:${hr}`) * others.length)].id;
      const at = hr * HOUR_MS + Math.floor(noise(`${crewId}:at:${hr}`) * 50) * MIN_MS;
      if (at > now || at < (crew.members.find((x) => x.id === ME)?.joinedAt || 0) - 6 * HOUR_MS) continue;
      s.crewChat[crewId].push({ id: `m_amb_${crewId}_${hr}`, authorId: by, kind: "text", text: AMBIENT_LINES[Math.floor(noise(`${crewId}:line:${hr}`) * AMBIENT_LINES.length)], data: {}, reactions: {}, going: [], at });
    }
    m.ambientHour = hour;
    s.crewChat[crewId] = s.crewChat[crewId].filter((x, i, arr) => arr.findIndex((y) => y.id === x.id) === i).sort((a, b) => a.at - b.at).slice(-300);
  };

  // ── Header and the race ─────────────────────────────────────────────────────

  const cityRank = (s, crew) => {
    const from = startOfWeek().getTime();
    const same = Object.values(s.crews).filter((c) => c.city === crew.city);
    const ranked = same.map((c) => ({ id: c.id, km: crewKm(s, c, from) })).sort((a, b) => b.km - a.km);
    return { rank: ranked.findIndex((c) => c.id === crew.id) + 1, of: ranked.length };
  };

  const getCrewHeader = async (crewId) =>
    touch((s) => {
      tick(s, crewId);
      const crew = crewOf(s, crewId);
      const bits = clubBits(s, crew);
      const realOut = crew.members.filter((m) => outside(s, m.id)).length;
      const hr = new Date().getHours();
      const busy = hr >= 6 && hr <= 22 ? 0.03 + noise(`${crew.id}:${dayKey()}:${hr}`) * 0.04 : 0;
      const { rank, of } = cityRank(s, crew);
      return {
        id: crew.id,
        name: crew.name,
        city: crew.city,
        area: crew.area || crew.city,
        cityRank: rank,
        cityCrews: of,
        memberCount: bits.memberCount,
        outNow: realOut + Math.round((crew.extraMembers || 0) * busy),
        isMember: isMember(crew),
        myRole: roleOf(crew),
      };
    });

  const periodFrom = (crew, period) => {
    if (period === "week") return startOfWeek().getTime();
    if (period === "month") return startOfMonth().getTime();
    return crew.createdAt || Date.now() - 90 * DAY_MS;
  };

  const getCrewRace = async (crewId, period = "week") =>
    read((s) => {
      const crew = crewOf(s, crewId);
      const from = periodFrom(crew, period);
      const rows = crew.members
        .map((m) => ({ player: playerOf(s, m.id), steps: stepsOf(s, m.id, from), km: round1(kmOf(s, m.id, from)), role: m.role, isOutside: outside(s, m.id) }))
        .filter((r) => r.player && !blocked(s).has(r.player.id))
        .sort((a, b) => b.steps - a.steps);
      const top = rows[0]?.steps || 1;
      const ranked = rows.map((r, i) => ({ ...r, rank: i + 1, isMe: r.player.id === ME, share: top ? r.steps / top : 0 }));
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
    });

  // ── The crew goal, crew days and challenges ─────────────────────────────────

  const getCrewGoal = async (crewId) =>
    read((s) => {
      const crew = crewOf(s, crewId);
      const from = startOfWeek().getTime();
      const parts = crew.members
        .map((m) => ({ player: playerOf(s, m.id), km: round1(kmOf(s, m.id, from)) }))
        .filter((x) => x.player)
        .sort((a, b) => b.km - a.km);
      const km = round1(parts.reduce((sum, p) => sum + p.km, 0));
      const goalKm = crew.weeklyGoalKm || 100;
      const end = addDays(startOfWeek(), 7).getTime();
      return {
        goalKm,
        km,
        pct: goalKm ? Math.min(1, km / goalKm) : 0,
        daysLeft: Math.max(0, Math.ceil((end - Date.now()) / DAY_MS)),
        contributors: parts.map((p) => ({ ...p, share: goalKm ? p.km / goalKm : 0 })),
      };
    });

  const getCrewDays = async (crewId) =>
    read((s) => {
      const crew = crewOf(s, crewId);
      const now = new Date();
      const first = startOfMonth(now);
      const daysIn = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const target = round1((crew.weeklyGoalKm || 100) / 7);
      const today = now.getDate();
      const days = Array.from({ length: daysIn }, (_, i) => {
        const day = i + 1;
        if (day > today) return { day, km: null, hit: null, future: true, today: false };
        const from = new Date(first.getFullYear(), first.getMonth(), day).getTime();
        const to = day === today ? Date.now() : from + DAY_MS;
        const km = round1(crewKm(s, crew, from, to));
        return { day, km, hit: km >= target, future: false, today: day === today };
      });
      const past = days.filter((d) => !d.future);
      return {
        year: now.getFullYear(),
        month: now.getMonth(),
        firstDow: (first.getDay() + 6) % 7,
        daysIn,
        targetKm: target,
        days,
        hits: past.filter((d) => d.hit).length,
        counted: past.length,
      };
    });

  const weekKey = () => dayKey(startOfWeek());

  const listCrewChallenges = async (crewId) =>
    read((s) => {
      const crew = crewOf(s, crewId);
      const mine = s.crewChallenges?.[crewId]?.[weekKey()] || {};
      const { rank } = cityRank(s, crew);
      return CREW_CHALLENGES.map((c) => {
        const others = Math.round(4 + noise(`${crewId}:${c.id}:${weekKey()}`) * 20);
        return {
          ...c,
          description: c.kind === "beat_rival" ? (rank > 1 ? `Beat the crew above you in ${crew.city} by Sunday` : `Stay top of ${crew.city} until Sunday`) : c.description,
          joined: !!mine[c.id],
          count: others + (mine[c.id] ? 1 : 0),
        };
      });
    });

  const joinCrewChallenge = async (crewId, challengeId, join = true) =>
    write((s) => {
      memberCrew(s, crewId, "join its challenges");
      if (!CREW_CHALLENGES.some((c) => c.id === challengeId)) throw new EngineError("NOT_FOUND", "That challenge has gone.");
      s.crewChallenges = s.crewChallenges || {};
      const wk = weekKey();
      s.crewChallenges[crewId] = { [wk]: { ...(s.crewChallenges[crewId]?.[wk] || {}) } };
      if (join) s.crewChallenges[crewId][wk][challengeId] = true;
      else delete s.crewChallenges[crewId][wk][challengeId];
      return { joined: join };
    });

  // ── When the crew moves ─────────────────────────────────────────────────────

  const slotOf = (hour) => (hour < 8 ? 0 : hour < 11 ? 1 : hour < 15 ? 2 : hour < 19 ? 3 : 4);

  const getCrewStats = async (crewId) =>
    read((s) => {
      const crew = memberCrew(s, crewId);
      const now = new Date();
      const first = startOfMonth(now).getTime();
      const counts = Array.from({ length: 5 }, () => Array(7).fill(0));
      let runs = 0;
      let km = 0;
      let secs = 0;
      const today = now.getDate();
      for (const m of crew.members) {
        if (m.id === ME) {
          for (const r of s.runs.filter((x) => x.startedAt >= first)) {
            const d = new Date(r.startedAt);
            counts[slotOf(d.getHours())][(d.getDay() + 6) % 7] += 1;
            runs += 1;
            km += r.distanceKm;
            secs += r.durationSec;
          }
          continue;
        }
        const pace = 270 + noise(`${m.id}:pace`) * 150;
        for (let day = 1; day <= today; day += 1) {
          const key = `${m.id}:${now.getFullYear()}-${now.getMonth()}-${day}`;
          if (noise(`run:${key}`) < 0.45) continue;
          const date = new Date(now.getFullYear(), now.getMonth(), day);
          const dow = (date.getDay() + 6) % 7;
          const weekend = dow >= 5;
          const n = noise(`slot:${key}`);
          const slot = weekend ? (n < 0.55 ? 0 : n < 0.8 ? 1 : 3) : n < 0.35 ? 0 : n < 0.45 ? 2 : n < 0.8 ? 3 : 4;
          const at = date.getTime() + (SLOT_HOURS[slot] + 1) * HOUR_MS;
          if (at > Date.now()) continue;
          const dist = 3 + noise(`km:${key}`) * 7;
          counts[slot][dow] += 1;
          runs += 1;
          km += dist;
          secs += dist * pace;
        }
      }
      const max = Math.max(1, ...counts.flat());
      let best = [0, 0];
      counts.forEach((row, r) => row.forEach((n, c) => {
        if (n > counts[best[0]][best[1]]) best = [r, c];
      }));
      const monthKm = Math.round(crewKm(s, crew, first));
      const myOut = s.ledger.filter((t) => t.type === "out" && t.amount > 0 && t.at >= first).reduce((sum, t) => sum + t.amount, 0);
      const theirOut = crew.members.filter((m) => m.id !== ME).reduce((sum, m) => sum + Math.round(playerStepsBetween(m.id, first, Date.now()) / 1200), 0);
      return {
        monthLabel: now.toLocaleString("en-GB", { month: "long" }),
        monthKm,
        heat: counts.map((row) => row.map((n) => n / max)),
        slots: ["6a", "9a", "12p", "5p", "8p"],
        busiest: runs ? `${DOW_NAMES[best[1]]} ${SLOT_WORDS[best[0]]}` : null,
        runs,
        avgPaceSec: km > 0 ? Math.round(secs / km) : null,
        out: myOut + theirOut,
      };
    });

  // ── City boards ─────────────────────────────────────────────────────────────

  const initials = (name = "") =>
    name
      .split(/\s+/)
      .filter((w) => w && w[0] === w[0].toUpperCase())
      .slice(0, 2)
      .map((w) => w[0])
      .join("") || name.slice(0, 2).toUpperCase();

  const getCityBoard = async (kind = "crews") =>
    read((s) => {
      const me = requireMe(s);
      const city = me.city || "London";
      const from = startOfWeek().getTime();
      if (kind === "crews") {
        const rows = Object.values(s.crews)
          .filter((c) => c.city === city)
          .map((c) => ({ id: c.id, name: c.name, short: initials(c.name), logo: c.logo || null, accent: c.accent, value: Math.round(crewKm(s, c, from)), unit: "km", isMine: isMember(c) }))
          .sort((a, b) => b.value - a.value)
          .map((r, i) => ({ ...r, rank: i + 1 }));
        return { kind, place: city, rows };
      }
      const add = (map, key, steps, mine) => {
        const row = map.get(key) || { id: key, name: key, short: initials(key), value: 0, unit: "steps", isMine: false };
        row.value += steps;
        row.isMine = row.isMine || mine;
        map.set(key, row);
      };
      const inCity = PLAYERS.filter((p) => p.city === city);
      const areas = new Set(inCity.map((p) => p.area).filter(Boolean));
      const map = new Map();
      let label = city === "London" ? "boroughs" : "areas";
      let place = city;
      if (areas.size >= 3) {
        for (const p of inCity) if (p.area) add(map, p.area, playerStepsBetween(p.id, from, Date.now()), false);
        if (me.area) add(map, me.area, myStepsBetween(s, from, Date.now()), true);
      } else {
        // A smaller town: rank the places people are in instead.
        label = "towns";
        place = "the UK";
        for (const p of PLAYERS) add(map, p.city, playerStepsBetween(p.id, from, Date.now()), false);
        add(map, city, myStepsBetween(s, from, Date.now()), true);
      }
      const rows = [...map.values()].sort((a, b) => b.value - a.value).map((r, i) => ({ ...r, rank: i + 1 }));
      return { kind: label, place, rows };
    });

  // ── Feed ────────────────────────────────────────────────────────────────────

  const postView = (s, crewId, p) => ({
    id: p.id,
    crewId,
    kind: p.kind || "run",
    author: playerOf(s, p.authorId),
    others: p.others || 0,
    title: p.title || "",
    place: p.place || "",
    sub: p.sub || "",
    photo: p.photo ? (typeof p.photo === "string" && !/^(file|https?|blob|data):/.test(p.photo) ? h.PHOTO(p.photo) : { uri: p.photo }) : null,
    badge: p.badge ? h.PHOTO(p.badge) : null,
    route: p.route || null,
    km: p.km || 0,
    minutes: p.minutes || (p.km && p.paceSec ? Math.round((p.km * p.paceSec) / 60) : 0),
    paceSec: p.paceSec || null,
    out: p.out || 0,
    caption: p.caption || "",
    at: p.at,
    likeCount: p.likes.length,
    likedByMe: p.likes.includes(ME),
    likers: p.likes.map((pid) => playerOf(s, pid)).filter(Boolean).sort((a, b) => (b.avatar ? 1 : 0) - (a.avatar ? 1 : 0)).slice(0, 3),
    comments: (p.commentList || []).length || (typeof p.comments === "number" ? p.comments : 0),
    isMine: p.authorId === ME,
    runId: p.runId || null,
  });

  const getCrewFeed = async (crewId) =>
    touch((s) => {
      tick(s, crewId);
      crewOf(s, crewId);
      const hide = blocked(s);
      return (s.crewFeed[crewId] || []).filter((p) => !hide.has(p.authorId)).map((p) => postView(s, crewId, p)).sort((a, b) => b.at - a.at);
    });

  const runSnapshot = (s, runId) => {
    const run = s.runs.find((r) => r.id === runId);
    if (!run) throw new EngineError("NOT_FOUND", "Run not found.");
    return {
      title: run.title,
      km: run.distanceKm,
      minutes: Math.round(run.durationSec / 60),
      paceSec: run.paceSecPerKm,
      out: Math.floor(run.distanceKm),
      route: run.route?.length > 1 ? run.route.map((pt) => (Array.isArray(pt) ? pt : [pt.latitude ?? pt.lat, pt.longitude ?? pt.lng])) : null,
      runId,
    };
  };

  // kind: "text", "photo" (photoUri, with a run's stats if runId), "run" or "route" (runId).
  const postToCrew = async (crewId, { kind = "text", text = "", photoUri = null, runId = null } = {}) =>
    write((s) => {
      ensure(s, crewId);
      memberCrew(s, crewId, "post");
      const crew = s.crews[crewId];
      const caption = (text || "").trim().slice(0, 2000);
      if (kind === "photo" && !photoUri) throw new EngineError("BAD_POST", "Pick a photo first.");
      if ((kind === "run" || kind === "route") && !runId) throw new EngineError("BAD_POST", "Pick a run first.");
      if (kind === "text" && !caption) throw new EngineError("BAD_POST", "Write something first.");
      const run = runId ? runSnapshot(s, runId) : {};
      if (kind === "route" && !run.route) throw new EngineError("BAD_POST", "That run has no route to share.");
      const post = {
        id: randomId("post"),
        authorId: ME,
        kind,
        title: run.title || "",
        place: crew.area || crew.city,
        photo: photoUri,
        km: run.km || 0,
        minutes: run.minutes || 0,
        paceSec: run.paceSec || null,
        out: run.out || 0,
        route: run.route || null,
        runId,
        caption,
        likes: [],
        commentList: [],
        at: Date.now(),
      };
      s.crewFeed[crewId] = [post, ...s.crewFeed[crewId]];
      return postView(s, crewId, post);
    });

  const shareRunToCrew = async (crewId, { runId, caption = "" }) => postToCrew(crewId, { kind: "run", runId, text: caption });

  const findPost = (s, crewId, postId) => {
    ensure(s, crewId);
    const post = (s.crewFeed[crewId] || []).find((p) => p.id === postId);
    if (!post) throw new EngineError("NOT_FOUND", "That post has gone.");
    return post;
  };

  const togglePostLike = async (crewId, postId) =>
    write((s) => {
      const post = findPost(s, crewId, postId);
      post.likes = post.likes.includes(ME) ? post.likes.filter((x) => x !== ME) : [...post.likes, ME];
      return { liked: post.likes.includes(ME), count: post.likes.length };
    });

  const getPostComments = async (crewId, postId) =>
    read((s) => {
      const post = findPost(s, crewId, postId);
      const hide = blocked(s);
      return (post.commentList || [])
        .filter((c) => !hide.has(c.authorId))
        .map((c) => ({ id: c.id, text: c.text, at: c.at, author: playerOf(s, c.authorId), isMine: c.authorId === ME }));
    });

  const commentOnPost = async (crewId, postId, text) =>
    write((s) => {
      memberCrew(s, crewId, "comment");
      const post = findPost(s, crewId, postId);
      const clean = (text || "").trim().slice(0, 500);
      if (!clean) throw new EngineError("BAD_POST", "Write something first.");
      const c = { id: randomId("c"), authorId: ME, text: clean, at: Date.now() };
      post.commentList = [...(post.commentList || []), c];
      return { ...c, author: meAsPlayer(s), isMine: true };
    });

  const deletePost = async (crewId, postId) =>
    write((s) => {
      ensure(s, crewId);
      const crew = crewOf(s, crewId);
      const post = (s.crewFeed[crewId] || []).find((p) => p.id === postId);
      if (!post) return;
      if (post.authorId !== ME && !isStaff(crew)) throw new EngineError("FORBIDDEN", "Only the person who posted it or a crew admin can delete it.");
      s.crewFeed[crewId] = s.crewFeed[crewId].filter((p) => p.id !== postId);
    });

  // ── Chat ────────────────────────────────────────────────────────────────────

  const messageView = (s, crewId, msg) => {
    const reactions = Object.entries(msg.reactions || {})
      .filter(([, ids]) => ids.length)
      .map(([emoji, ids]) => ({ emoji, count: ids.length, mine: ids.includes(ME) }));
    return {
      id: msg.id,
      kind: msg.kind || "text",
      text: msg.text || "",
      authorId: msg.authorId,
      author: playerOf(s, msg.authorId),
      isMine: msg.authorId === ME,
      at: msg.at,
      photo: msg.photo ? (/^(file|https?|blob|data):/.test(msg.photo) ? { uri: msg.photo } : h.PHOTO(msg.photo)) : null,
      data: msg.data || {},
      reactions,
      going: (msg.going || []).length,
      imGoing: (msg.going || []).includes(ME),
      goingPeople: (msg.going || []).slice(0, 4).map((pid) => playerOf(s, pid)).filter(Boolean),
    };
  };

  const getCrewMessages = async (crewId) =>
    touch((s) => {
      tick(s, crewId);
      memberCrew(s, crewId, "see the chat");
      const hide = blocked(s);
      return s.crewChat[crewId].filter((m) => !hide.has(m.authorId)).map((m) => messageView(s, crewId, m));
    });

  const canPost = (s, crew) => {
    if (crew.chatPolicy === "admins" && !isStaff(crew)) throw new EngineError("FORBIDDEN", "Only crew admins can post in this chat.");
  };

  const pushMessage = (s, crewId, msg) => {
    const full = { id: randomId("m"), authorId: ME, kind: "text", text: "", data: {}, reactions: {}, going: [], at: Date.now(), ...msg };
    s.crewChat[crewId] = [...s.crewChat[crewId], full].slice(-300);
    meta(s, crewId).lastRead = full.at;
    // Someone answers a few seconds later.
    const crew = s.crews[crewId];
    const others = crew.members.filter((m) => m.id !== ME && !blocked(s).has(m.id));
    if (others.length && noise(`${full.id}:reply`) > 0.25) {
      const who = others[Math.floor(noise(`${full.id}:who`) * others.length)].id;
      meta(s, crewId).pending = [...(meta(s, crewId).pending || []), { authorId: who, text: REPLY_LINES[Math.floor(noise(`${full.id}:line`) * REPLY_LINES.length)], typingAt: full.at + REPLY_TYPING_MS, at: full.at + REPLY_AFTER_MS }];
    }
    return messageView(s, crewId, full);
  };

  const sendCrewMessage = async (crewId, text) =>
    write((s) => {
      ensure(s, crewId);
      const crew = memberCrew(s, crewId, "chat");
      canPost(s, crew);
      const clean = (text || "").trim();
      if (!clean) return null;
      return pushMessage(s, crewId, { text: clean.slice(0, 1000) });
    });

  // From the + button: a photo, a route to run together, my last run, or a
  // finished battle (the card is built from the battle, not typed in).
  const shareToCrewChat = async (crewId, { kind, photoUri = null, runId = null, battleId = null, text = "", startAt = null } = {}) =>
    write((s) => {
      ensure(s, crewId);
      const crew = memberCrew(s, crewId, "chat");
      canPost(s, crew);
      if (kind === "photo") {
        if (!photoUri) throw new EngineError("BAD_POST", "Pick a photo first.");
        return pushMessage(s, crewId, { kind: "photo", photo: photoUri, text: (text || "").trim().slice(0, 300) });
      }
      if (kind === "route" || kind === "run") {
        const run = runSnapshot(s, runId);
        if (kind === "route" && !run.route) throw new EngineError("BAD_POST", "That run has no route to share.");
        const at = startAt || startOfDay(Date.now() + DAY_MS).getTime() + 7 * HOUR_MS;
        return pushMessage(s, crewId, {
          kind: kind === "route" ? "route" : "run",
          text: (text || "").trim(),
          data: { title: run.title, km: run.km, paceSec: run.paceSec, minutes: run.minutes, route: run.route, runId, ...(kind === "route" ? { startAt: at } : {}) },
          going: kind === "route" ? [ME] : [],
        });
      }
      if (kind === "battle") {
        const b = s.battles.find((x) => x.id === battleId && x.status === "complete");
        if (!b) throw new EngineError("NOT_FOUND", "Pick a finished battle.");
        const rivalId = b.creatorId === ME ? b.opponentId : b.creatorId;
        const rival = publicPlayer(rivalId);
        return pushMessage(s, crewId, { kind: "battle", data: { battleId: b.id, rivalId, rivalName: rival?.name || "your rival", won: b.winnerId === ME, draw: !b.winnerId, out: b.winnerId === ME ? b.prize?.out || 0 : 0 } });
      }
      throw new EngineError("BAD_POST", "Pick something to share.");
    });

  const findMessage = (s, crewId, msgId) => {
    ensure(s, crewId);
    memberCrew(s, crewId, "react");
    const msg = s.crewChat[crewId].find((m) => m.id === msgId);
    if (!msg) throw new EngineError("NOT_FOUND", "That message has gone.");
    return msg;
  };

  const reactToMessage = async (crewId, msgId, emoji) =>
    write((s) => {
      const msg = findMessage(s, crewId, msgId);
      if (!REACTIONS.includes(emoji)) throw new EngineError("BAD_REACTION", "Pick a reaction.");
      const ids = msg.reactions[emoji] || [];
      msg.reactions = { ...msg.reactions, [emoji]: ids.includes(ME) ? ids.filter((x) => x !== ME) : [...ids, ME] };
      return messageView(s, crewId, msg);
    });

  const toggleChatRun = async (crewId, msgId) =>
    write((s) => {
      const msg = findMessage(s, crewId, msgId);
      if (msg.kind !== "route") throw new EngineError("NOT_FOUND", "That isn't a route to join.");
      const going = msg.going || [];
      msg.going = going.includes(ME) ? going.filter((x) => x !== ME) : [...going, ME];
      return { going: msg.going.includes(ME), count: msg.going.length, title: msg.data?.title };
    });

  const getCrewUnread = async (crewId) =>
    touch((s) => {
      tick(s, crewId);
      const crew = s.crews[crewId];
      if (!crew || !isMember(crew)) return 0;
      const joined = crew.members.find((m) => m.id === ME)?.joinedAt || 0;
      const since = meta(s, crewId).lastRead || joined;
      const hide = blocked(s);
      return s.crewChat[crewId].filter((m) => m.authorId !== ME && m.at > since && !hide.has(m.authorId)).length;
    });

  const markCrewRead = async (crewId) =>
    touch((s) => {
      ensure(s, crewId);
      meta(s, crewId).lastRead = Date.now();
      return true;
    });

  const getCrewTyping = async (crewId) =>
    touch((s) => {
      tick(s, crewId);
      const now = Date.now();
      const p = (meta(s, crewId).pending || []).find((x) => x.typingAt <= now && x.at > now);
      return p ? { player: playerOf(s, p.authorId) } : null;
    });

  // ── Joining, requests and roles ─────────────────────────────────────────────

  const requestView = (s, r) => ({ id: r.id, crewId: r.crewId, player: playerOf(s, r.userId), at: r.at, status: r.status, paceGroup: r.paceGroup || null });

  const listCrewsNear = async () =>
    touch((s) => {
      tick(s);
      const me = requireMe(s);
      return Object.values(s.crews)
        .filter((c) => c.city === me.city && !isMember(c) && c.privacy !== "invite")
        .map((c) => ({
          id: c.id,
          name: c.name,
          logo: c.logo || null,
          accent: c.accent,
          area: c.area || c.city,
          memberCount: clubBits(s, c).memberCount,
          awayKm: c.awayKm ?? null,
          joinPolicy: c.privacy === "request" ? "request" : "open",
          requested: s.crewRequests.some((r) => r.crewId === c.id && r.userId === ME && r.status === "pending"),
          verified: c.status === "verified",
        }))
        .sort((a, b) => (a.awayKm ?? 99) - (b.awayKm ?? 99));
    });

  const cancelJoinRequest = async (crewId) =>
    write((s) => {
      ensure(s);
      s.crewRequests = s.crewRequests.filter((r) => !(r.crewId === crewId && r.userId === ME && r.status === "pending"));
    });

  // Staff see who's asking. A crew you run gets a couple of asks to answer.
  const listJoinRequests = async (crewId) =>
    touch((s) => {
      ensure(s, crewId);
      const crew = crewOf(s, crewId);
      if (!isStaff(crew)) throw new EngineError("FORBIDDEN", "Only crew admins can see join requests.");
      const m = meta(s, crewId);
      if (!m.requestsSeeded && crew.privacy === "request") {
        m.requestsSeeded = true;
        const pool = PLAYERS.filter((p) => p.city === crew.city && !isMember(crew, p.id)).slice(0, 2);
        pool.forEach((p, i) => s.crewRequests.push({ id: randomId("req"), crewId, userId: p.id, at: Date.now() - (i + 1) * 47 * MIN_MS, status: "pending", paceGroup: i ? "steady" : "easy" }));
      }
      return s.crewRequests.filter((r) => r.crewId === crewId && r.status === "pending" && r.userId !== ME).map((r) => requestView(s, r));
    });

  const decideJoinRequest = async (crewId, requestId, approve) =>
    write((s) => {
      ensure(s, crewId);
      const crew = crewOf(s, crewId);
      if (!isStaff(crew)) throw new EngineError("FORBIDDEN", "Only crew admins can answer join requests.");
      const r = s.crewRequests.find((x) => x.id === requestId && x.crewId === crewId);
      if (!r || r.status !== "pending") throw new EngineError("NOT_FOUND", "That request has already been answered.");
      r.status = approve ? "approved" : "declined";
      r.decidedAt = Date.now();
      if (approve && !isMember(crew, r.userId)) crew.members.push({ id: r.userId, role: "member", joinedAt: Date.now() });
      return requestView(s, r);
    });

  // ── Reports and blocks ──────────────────────────────────────────────────────

  const reportContent = async ({ crewId = null, targetType, targetId, authorId = null, reason, detail = "", block = false }) =>
    write((s) => {
      requireMe(s);
      ensure(s, crewId);
      if (!REPORT_REASONS.some((r) => r.value === reason)) throw new EngineError("BAD_REASON", "Pick a reason.");
      if (crewId) memberCrew(s, crewId, "report");
      s.reports.push({ id: randomId("rep"), crewId, targetType, targetId, authorId, reason, detail: (detail || "").trim().slice(0, 1000), at: Date.now() });
      if (block && authorId && authorId !== ME && !s.blocked.includes(authorId)) {
        s.blocked.push(authorId);
        s.following = s.following.filter((x) => x !== authorId);
      }
      return { reported: true, blocked: !!block };
    });

  const blockPlayer = async (pid) =>
    write((s) => {
      ensure(s);
      if (pid === ME) return;
      if (!s.blocked.includes(pid)) s.blocked.push(pid);
      s.following = s.following.filter((x) => x !== pid);
    });

  const unblockPlayer = async (pid) =>
    write((s) => {
      ensure(s);
      s.blocked = s.blocked.filter((x) => x !== pid);
    });

  const listBlocked = async () =>
    read((s) => (s.blocked || []).map((pid) => publicPlayer(pid)).filter(Boolean));

  // ── The club's stories row ──────────────────────────────────────────────────

  const clubStories = (s, crew) => {
    if (crew.status !== "verified") return [];
    const run = clubBits(s, crew).nextRun;
    if (!run) return [];
    const now = Date.now();
    const sameDay = dayKey(new Date(run.startAt)) === dayKey(new Date(now));
    if (!sameDay || run.startAt < now - 2 * HOUR_MS) return [];
    const postedAt = Math.max(startOfDay().getTime() + 8 * HOUR_MS, run.startAt - 9 * HOUR_MS);
    if (postedAt > now) return [];
    const t = new Date(run.startAt);
    const hhmm = `${t.getHours() % 12 || 12}${t.getMinutes() ? `:${String(t.getMinutes()).padStart(2, "0")}` : ""}${t.getHours() < 12 ? "am" : "pm"}`;
    const id = `club:${crew.id}:${dayKey()}`;
    const view = s.storyViews?.[id];
    return [
      {
        id,
        authorId: `club:${crew.id}`,
        clubId: crew.id,
        image: crew.cover || h.PHOTO("clubrun"),
        caption: `Club run tonight. ${Math.max(run.goingCount || 0, 6)} of us on the ${crew.area || crew.city}, meet at ${(crew.meetPlace || "the usual spot").split(",")[0]} at ${hhmm}.`,
        clubRun: { id: run.id, startAt: run.startAt, isGoing: !!run.isGoing, title: run.title },
        audience: "club",
        postedAt,
        expiresAt: postedAt + DAY_MS,
        seen: !!view,
        emote: typeof view === "string" ? view : null,
      },
    ];
  };

  const listCrewStories = async (crewId) =>
    read((s) => {
      const crew = crewOf(s, crewId);
      const hide = blocked(s);
      const people = crew.members
        .filter((m) => m.id !== ME && !hide.has(m.id))
        .map((m) => ({ m, state: storyState(s, m.id) }))
        .filter((x) => x.state)
        .map(({ m, state }) => {
          const p = publicPlayer(m.id);
          return { kind: "person", id: m.id, name: p.name, avatar: p.avatar, tier: p.tier, dot: outside(s, m.id) ? "out" : null, story: state };
        });
      const club = clubStories(s, crew);
      const row = club.length
        ? [{ kind: "club", id: `club:${crew.id}`, crewId: crew.id, name: crew.name.split(" ")[0], logo: crew.logo || null, accent: crew.accent, story: club.every((x) => x.seen) ? "watched" : "unwatched" }]
        : [];
      // Unwatched first, people out now before others, the club after the first two.
      people.sort((a, b) => Number(b.story === "unwatched") - Number(a.story === "unwatched") || Number(!!b.dot) - Number(!!a.dot));
      return [...people.slice(0, 2), ...row, ...people.slice(2)];
    });

  const listClubStories = async (crewId) => read((s) => clubStories(s, crewOf(s, crewId)));

  const cheerStory = async (storyId, authorId) =>
    write((s) => {
      requireMe(s);
      ensure(s);
      if (authorId === ME) throw new EngineError("FORBIDDEN", "You can't cheer your own story.");
      if (s.storyReplies.some((r) => r.storyId === storyId && r.kind === "cheer")) return { cheered: true, already: true };
      s.storyReplies.push({ id: randomId("sr"), storyId, authorId, kind: "cheer", at: Date.now() });
      return { cheered: true };
    });

  const replyToStory = async (storyId, authorId, text) =>
    write((s) => {
      requireMe(s);
      ensure(s);
      const clean = (text || "").trim().slice(0, 500);
      if (!clean) throw new EngineError("BAD_POST", "Write something first.");
      s.storyReplies.push({ id: randomId("sr"), storyId, authorId, kind: "reply", text: clean, at: Date.now() });
      return { replied: true };
    });

  return {
    ensure,
    tick,
    api: {
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
    },
  };
};
