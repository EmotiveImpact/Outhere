// Run clubs and club v club for the local engine: club runs with check-in,
// claiming a club, founding progress, the Club Championship group and
// friendlies between clubs. Built by engine.js with its private helpers, so
// it reads and writes the same saved world. Reads that move the world on (a
// claim reviewed, a friendly settled) use touch, which saves without waking
// every screen, so a read can't set off another read.
//
// Club scores follow the server: a squad's average counted steps a day,
// lifted by club run turnout (up to +20%). Other clubs are simulated from
// stable noise, so a fixture reads the same every time it is opened; your own
// steps, runs and check-ins move your club's side.

import { CLUB_LEAGUE, CREWS } from "./seed";
import { DAY_MS, HOUR_MS, startOfDay, startOfWeek } from "./time";
import { noise, randomId } from "./random";
import { CLUB_MODE, CLUB_TURNOUT_WEIGHT, FOUNDING_MEETUPS, FOUNDING_PEOPLE, RELAY_LEGS, SEASON_WEEKS, SQUAD_MAX, clubLowerWins, clubModeOf } from "@/constants/clubModes";

const MIN_MS = 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CHECK_IN_BEFORE = 30 * MIN_MS;
const RUN_OPEN_FOR = 3 * HOUR_MS;
const CLAIM_REVIEW_MS = 30 * 1000;
const SIM_ACCEPT_MS = 60 * 1000;
const CHECK_IN_XP = 40;
const CHECK_IN_OUT = 5;

export const countedSteps = (raw) => Math.min(15000, Math.min(raw, 10000) + Math.max(0, Math.min(raw, 20000) - 10000) / 2);

const pad = (n) => String(n).padStart(2, "0");
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// 'Tue and Thu · 19:00, Sat · 09:00'
export const meetsLabel = (runs = []) => {
  const byTime = {};
  for (const r of [...runs].sort((a, b) => ((a.dow + 6) % 7) - ((b.dow + 6) % 7))) {
    const t = `${pad(r.hour)}:${pad(r.minute || 0)}`;
    (byTime[t] = byTime[t] || []).push(DOW[r.dow]);
  }
  return Object.entries(byTime)
    .map(([t, days]) => `${days.length > 1 ? `${days.slice(0, -1).join(", ")} and ${days[days.length - 1]}` : days[0]} · ${t}`)
    .join(", ");
};

export const makeClubs = (h) => {
  const { read, write, touch, requireMe, notify, award, myStepsBetween, publicPlayer, meAsPlayer, EngineError, ME } = h;

  // ── Club basics ──────────────────────────────────────────────────────────────

  const memberOf = (crew) => crew.members.some((m) => m.id === ME);
  const roleIn = (crew) => crew.members.find((m) => m.id === ME)?.role || null;
  const isCaptain = (crew) => roleIn(crew) === "owner";
  const memberCount = (crew) => crew.members.length + (crew.extraMembers || 0);
  const crewOf = (s, id) => {
    const crew = s.crews[id];
    if (!crew) throw new EngineError("NOT_FOUND", "Club not found.");
    return crew;
  };
  const brief = (crew) => (crew ? { id: crew.id, name: crew.name, short: crew.name.split(" ")[0], logo: crew.logo || null, cover: crew.cover || null, accent: crew.accent, area: crew.area || crew.city, memberCount: memberCount(crew), verified: crew.status === "verified" } : null);

  // The club your fixtures and friendlies are about: a verified club you're
  // in, league clubs first.
  const homeClub = (s) => {
    const mine = Object.values(s.crews).filter((c) => memberOf(c) && c.status === "verified");
    return mine.find((c) => CLUB_LEAGUE.clubs.includes(c.id)) || mine[0] || null;
  };

  // ── Club runs ────────────────────────────────────────────────────────────────

  const runKey = (crew, r) => `${crew.id}.${r.dow}.${r.hour}`;

  // The current occurrence (open until 3 hours after the start) or the next.
  const occurrenceStart = (r, now = Date.now()) => {
    const week = startOfWeek(now).getTime();
    const offset = ((r.dow + 6) % 7) * DAY_MS + r.hour * HOUR_MS + (r.minute || 0) * MIN_MS;
    let start = week + offset;
    // Daylight saving moves wall-clock time; re-anchor to the local day.
    const d = startOfDay(start);
    start = d.getTime() + r.hour * HOUR_MS + (r.minute || 0) * MIN_MS;
    while (start + RUN_OPEN_FOR < now) start += WEEK_MS;
    return start;
  };

  const runTurnoutAt = (crew, start) => {
    const size = memberCount(crew);
    const base = Math.max(5, Math.round(size * 0.13));
    return Math.max(4, Math.round(base * (0.75 + noise(`${crew.id}@${start}:turnout`) * 0.5)));
  };

  const clubRunView = (s, crew, r, now = Date.now()) => {
    const start = occurrenceStart(r, now);
    const occ = `${runKey(crew, r)}@${start}`;
    const mine = s.clubRuns[occ] || {};
    const expected = runTurnoutAt(crew, start);
    const going = expected + (mine.rsvp && !mine.checkedIn ? 1 : 0) + (mine.checkedIn ? 1 : 0);
    const opened = start - CHECK_IN_BEFORE;
    const arriving = now < opened ? 0 : Math.round(expected * clamp((now - opened) / (40 * MIN_MS), 0, 1) * 0.97);
    const status = now < start ? "upcoming" : now <= start + 2 * HOUR_MS ? "live" : "ended";
    const faces = crew.members.filter((m) => m.id !== ME).slice(0, 4).map((m) => publicPlayer(m.id)).filter(Boolean);
    return {
      id: runKey(crew, r),
      occurrenceId: occ,
      club: brief(crew),
      clubId: crew.id,
      isMember: memberOf(crew),
      title: r.title,
      startAt: start,
      meetAt: start - 10 * MIN_MS,
      place: crew.meetPlace,
      lat: crew.lat,
      lng: crew.lng,
      km: r.km,
      paceGroups: r.paceGroups || [],
      pace: mine.pace || null,
      going,
      faces,
      isGoing: !!mine.rsvp || !!mine.checkedIn,
      checkedIn: !!mine.checkedIn,
      checkedInAt: mine.checkedInAt || null,
      here: arriving + (mine.checkedIn ? 1 : 0),
      lastTurnout: runTurnoutAt(crew, start - WEEK_MS),
      status,
      checkInOpen: now >= opened && now <= start + RUN_OPEN_FOR,
      needsCode: false,
      rewardXp: CHECK_IN_XP,
      rewardOut: CHECK_IN_OUT,
      streak: clubStreak(s, crew.id, now),
    };
  };

  const runsOf = (s, crew, now = Date.now()) => (crew.runs || []).map((r) => clubRunView(s, crew, r, now)).sort((a, b) => a.startAt - b.startAt);

  const findRun = (s, id) => {
    const [crewId, dow, hour] = String(id).split(".");
    const crew = crewOf(s, crewId);
    const r = (crew.runs || []).find((x) => String(x.dow) === dow && String(x.hour) === hour);
    if (!r) throw new EngineError("NOT_FOUND", "That club run has gone.");
    return { crew, r };
  };

  // Weeks in a row with a check-in at this club.
  const clubStreak = (s, crewId, now = Date.now()) => {
    const weeks = new Set(
      Object.entries(s.clubRuns)
        .filter(([k, v]) => v.checkedIn && k.startsWith(`${crewId}.`))
        .map(([k]) => startOfWeek(Number(k.split("@")[1])).getTime())
    );
    let wk = startOfWeek(now).getTime();
    if (!weeks.has(wk)) wk -= WEEK_MS;
    let n = 0;
    while (weeks.has(wk)) {
      n += 1;
      wk -= WEEK_MS;
    }
    return n;
  };

  const checkedInBetween = (s, crewId, from, to) =>
    Object.entries(s.clubRuns).some(([k, v]) => v.checkedIn && k.startsWith(`${crewId}.`) && Number(k.split("@")[1]) >= from && Number(k.split("@")[1]) <= to);

  // ── Founding clubs ───────────────────────────────────────────────────────────

  const foundingView = (s, crew, now = Date.now()) => {
    const seeded = crew.founding || { meetups: 0, people: 0 };
    const mine = Object.entries(s.clubRuns).filter(([k, v]) => v.checkedIn && k.startsWith(`${crew.id}.`) && Number(k.split("@")[1]) > now - 6 * WEEK_MS);
    const meetups = Math.min(FOUNDING_MEETUPS, seeded.meetups + mine.length);
    const people = Math.min(FOUNDING_PEOPLE, seeded.people + (mine.length ? 1 : 0));
    const nearest = Object.values(s.crews)
      .filter((c) => c.status === "verified" && c.city === crew.city && c.id !== crew.id && c.awayKm != null)
      .sort((a, b) => Math.abs(a.awayKm - crew.awayKm) - Math.abs(b.awayKm - crew.awayKm))[0];
    return {
      meetups,
      meetupsNeeded: FOUNDING_MEETUPS,
      people,
      peopleNeeded: FOUNDING_PEOPLE,
      meetupsLeft: FOUNDING_MEETUPS - meetups,
      peopleLeft: FOUNDING_PEOPLE - people,
      nearest: nearest ? { ...brief(nearest), km: Math.round(Math.abs(nearest.awayKm - crew.awayKm) * 10) / 10 } : null,
    };
  };

  const promoteFounding = (s, crew) => {
    if (crew.status !== "founding") return;
    const f = foundingView(s, crew);
    if (f.meetups >= FOUNDING_MEETUPS && f.people >= FOUNDING_PEOPLE) {
      crew.status = "verified";
      crew.verifiedAt = Date.now();
      if (memberOf(crew)) notify(s, { type: "crews", title: `${crew.name} is official`, body: "Three meetups, ten runners. You did it.", link: `/clubs/verified/${crew.id}` });
    }
  };

  // ── Claims ───────────────────────────────────────────────────────────────────

  const claimView = (c) => ({ ...c, meets: meetsLabel(c.days.map((dow) => ({ dow, hour: c.hour, minute: c.minute }))) });

  // A person checks every claim; here the review lands after half a minute.
  const reviewClaims = (s, now = Date.now()) => {
    for (const c of s.clubClaims) {
      if (c.status !== "pending" || now - c.at < CLAIM_REVIEW_MS) continue;
      c.status = "verified";
      const runs = c.days.map((dow) => ({ dow, hour: c.hour, minute: c.minute, title: "Club run", km: 5, paceGroups: ["Easy 6:30", "Steady 5:30"] }));
      let crew = c.crewId ? s.crews[c.crewId] : null;
      if (crew) {
        crew.status = "verified";
        crew.verifiedAt = now;
        crew.meetPlace = c.meetPlace || crew.meetPlace;
        if (runs.length) crew.runs = runs;
        crew.founded = c.founded || crew.founded;
      } else {
        const id = randomId("c");
        crew = {
          id,
          name: c.name,
          tagline: "",
          city: s.me.city,
          area: s.me.area,
          accent: "#3d8bff",
          logo: null,
          privacy: "public",
          weeklyGoalKm: 100,
          inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
          ownerId: ME,
          createdAt: now,
          members: [{ id: ME, role: "owner", joinedAt: now }],
          status: "verified",
          verifiedAt: now,
          founded: c.founded,
          extraMembers: 0,
          meetPlace: c.meetPlace,
          awayKm: 0.2,
          distances: "5k",
          paces: "All paces",
          runs,
        };
        s.crews[id] = crew;
        s.crewChat[id] = [];
        s.crewFeed[id] = [];
      }
      const me = crew.members.find((m) => m.id === ME);
      if (me) me.role = "owner";
      else crew.members.push({ id: ME, role: "owner", joinedAt: now });
      crew.ownerId = ME;
      c.crewId = crew.id;
      if (s.me.tier === "free") {
        s.me.tier = "pro";
        s.me.organiserPro = true;
      }
      notify(s, { type: "crews", title: `${crew.name} is official`, body: "Your crew is live, your runs take check-ins, and you have a year of Pro on us.", link: `/clubs/verified/${crew.id}` });
    }
  };

  // ── The league ───────────────────────────────────────────────────────────────

  // Season 1 started three weeks before the world was seeded, so a new player
  // lands mid-season. Six week seasons roll on from there.
  const seasonAt = (s, now = Date.now()) => {
    const first = startOfWeek(s.seededAt).getTime() - 3 * WEEK_MS;
    const weeks = Math.max(0, Math.floor((startOfWeek(now).getTime() - first) / WEEK_MS));
    const number = Math.floor(weeks / SEASON_WEEKS) + 1;
    return { number, week: (weeks % SEASON_WEEKS) + 1, start: first + (number - 1) * SEASON_WEEKS * WEEK_MS };
  };

  // Round robin by the circle method; seven clubs and a bye.
  const pairings = (round) => {
    const teams = [...CLUB_LEAGUE.clubs, null];
    const rest = teams.slice(1);
    const k = round % rest.length;
    const arr = [teams[0], ...rest.slice(rest.length - k), ...rest.slice(0, rest.length - k)];
    const out = [];
    for (let i = 0; i < arr.length / 2; i += 1) {
      const a = arr[i];
      const b = arr[arr.length - 1 - i];
      if (a && b) out.push(round % 2 ? [b, a] : [a, b]);
    }
    return out;
  };

  const isDerby = (a, b) => CLUB_LEAGUE.derbies.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

  const simDaily = (clubId, key) => Math.round(9600 + noise(`${clubId}:${key}:avg`) * 3400);
  const simTurnoutRate = (clubId, key) => 0.3 + noise(`${clubId}:${key}:turnout`) * 0.5;

  // Share of a club's runs this week that have happened by now.
  const runsDone = (crew, from, now) => {
    const runs = crew?.runs || [];
    if (!runs.length) return clamp((now - from) / WEEK_MS, 0, 1);
    const done = runs.filter((r) => from + ((r.dow + 6) % 7) * DAY_MS + r.hour * HOUR_MS <= now).length;
    return done / runs.length;
  };

  const myDailyCounted = (s, from, to) => {
    let total = 0;
    let days = 0;
    for (let d = from; d < to; d += DAY_MS) {
      const end = Math.min(to, d + DAY_MS);
      total += countedSteps(myStepsBetween(s, d, end));
      days += end >= d + DAY_MS ? 1 : (end - d) / DAY_MS;
    }
    return days > 0 ? total / Math.max(1, days) : 0;
  };

  const squadSize = (s, a, b) => Math.min(SQUAD_MAX, memberCount(s.crews[a]), memberCount(s.crews[b]));

  // Called up when active on 3 of the last 7 days, as the server draws it.
  const inSquad = (s, crew, now) => {
    if (!memberOf(crew)) return false;
    let active = 0;
    for (let i = 1; i <= 7; i += 1) {
      const d = startOfDay(now - i * DAY_MS).getTime();
      if (myStepsBetween(s, d, d + DAY_MS) >= 3000) active += 1;
    }
    return active >= 3 || !!s.me?.isOutside || myStepsBetween(s, startOfDay(now).getTime(), now) >= 3000;
  };

  const sideScore = (s, clubId, weekStart, until, n, key) => {
    const crew = s.crews[clubId];
    const progress = runsDone(crew, weekStart, until);
    let daily = simDaily(clubId, key);
    let turnout = simTurnoutRate(clubId, key) * progress;
    let mine = null;
    if (crew && memberOf(crew) && inSquad(s, crew, until)) {
      const myDaily = myDailyCounted(s, weekStart, Math.min(until, weekStart + WEEK_MS));
      const before = daily;
      daily = (daily * (n - 1) + myDaily) / n;
      if (checkedInBetween(s, clubId, weekStart, until)) turnout += 1 / n;
      mine = { daily: Math.round(myDaily), lift: Math.round(daily - before) };
    }
    turnout = clamp(turnout, 0, 1);
    return { daily: Math.round(daily), turnout, score: Math.round(daily * (1 + turnout / CLUB_TURNOUT_WEIGHT)), mine };
  };

  // People out right now: busier in the evening and early morning.
  const outNow = (clubId, n, now) => {
    const hr = new Date(now).getHours();
    const share = hr >= 17 && hr < 21 ? 0.55 : hr >= 6 && hr < 9 ? 0.3 : hr >= 9 && hr < 17 ? 0.15 : 0.05;
    return Math.round(n * share * (0.7 + noise(`${clubId}:${Math.floor(now / (15 * MIN_MS))}:out`) * 0.6));
  };

  const fixtureAt = (s, season, week, home, away, now = Date.now()) => {
    const weekStart = season.start + (week - 1) * WEEK_MS;
    const revealAt = weekStart + 6 * DAY_MS + 20 * HOUR_MS;
    const until = Math.min(now, revealAt);
    const n = squadSize(s, home, away);
    const key = `${season.number}.${week}`;
    const h = sideScore(s, home, weekStart, until, n, key);
    const a = sideScore(s, away, weekStart, until, n, key);
    const started = now >= weekStart;
    const side = (clubId, x) => ({
      club: brief(s.crews[clubId]),
      score: started ? x.score : null,
      daily: started ? x.daily : null,
      turnout: Math.round(x.turnout * 100),
      squad: n,
      out: now < revealAt && started ? Math.min(n, outNow(clubId, n, now) + (x.mine && s.me?.isOutside ? 1 : 0)) : 0,
    });
    const myClub = [home, away].find((id) => memberOf(s.crews[id]));
    const mine = myClub === home ? h.mine : myClub === away ? a.mine : null;
    return {
      id: `fx.${season.number}.${week}.${home}.${away}`,
      season: season.number,
      week,
      isDerby: isDerby(home, away),
      startAt: weekStart,
      revealAt,
      revealed: now >= revealAt,
      live: started && now < revealAt,
      home: side(home, h),
      away: side(away, a),
      mySide: myClub === home ? "home" : myClub === away ? "away" : null,
      inSquad: !!mine,
      myDaily: mine?.daily ?? null,
      myLift: mine?.lift ?? null,
      result: now >= revealAt ? (h.score === a.score ? "draw" : h.score > a.score ? "home" : "away") : null,
    };
  };

  const table = (s, season, now = Date.now()) => {
    const rows = Object.fromEntries(CLUB_LEAGUE.clubs.map((id) => [id, { id, played: 0, won: 0, drawn: 0, lost: 0, points: 0 }]));
    for (let w = 1; w <= SEASON_WEEKS; w += 1) {
      for (const [home, away] of pairings(w - 1)) {
        const f = fixtureAt(s, season, w, home, away, now);
        if (!f.revealed) continue;
        const mult = f.isDerby ? 2 : 1;
        for (const [id, me, them] of [[home, f.home.score, f.away.score], [away, f.away.score, f.home.score]]) {
          const r = rows[id];
          r.played += 1;
          if (me > them) (r.won += 1), (r.points += 3 * mult);
          else if (me === them) (r.drawn += 1), (r.points += mult);
          else r.lost += 1;
        }
      }
    }
    return Object.values(rows)
      .sort((a, b) => b.points - a.points || b.won - a.won || a.lost - b.lost || a.id.localeCompare(b.id))
      .map((r, i) => ({ ...r, pos: i + 1, club: brief(s.crews[r.id]), isMine: memberOf(s.crews[r.id]) }));
  };

  const parseFixtureId = (id) => {
    const [, season, week, home, away] = String(id).split(".");
    return { season: Number(season), week: Number(week), home, away };
  };

  const myFixture = (s, now = Date.now()) => {
    const club = homeClub(s);
    if (!club || !CLUB_LEAGUE.clubs.includes(club.id)) return null;
    const season = seasonAt(s, now);
    const pair = pairings(season.week - 1).find((p) => p.includes(club.id));
    return pair ? fixtureAt(s, season, season.week, pair[0], pair[1], now) : { bye: true, week: season.week };
  };

  const recordOf = (s, clubId, now = Date.now()) => {
    const row = table(s, seasonAt(s, now), now).find((r) => r.id === clubId);
    const friendlies = s.clubBattles.filter((b) => b.status === "finished" && (b.challenger === clubId || b.opponent === clubId));
    const w = (row?.won || 0) + friendlies.filter((b) => b.result?.winner === clubId).length + (clubId in SEED_RECORD ? SEED_RECORD[clubId][0] : 0);
    const l = (row?.lost || 0) + friendlies.filter((b) => b.result?.winner && b.result.winner !== clubId).length + (clubId in SEED_RECORD ? SEED_RECORD[clubId][1] : 0);
    return { w, l, pos: row?.pos || null };
  };

  // Past seasons' club v club results, so clubs don't all start at 0 and 0.
  const SEED_RECORD = { c_southbank: [4, 2], c_peckham: [3, 2], c_southside: [2, 3], c_clapham: [3, 1], c_dulwich: [1, 2], c_deptford: [2, 2], c_lewisham: [0, 3], c_eastend: [2, 1] };

  // ── Friendlies ───────────────────────────────────────────────────────────────

  const battleScore = (s, b, clubId, now) => {
    const until = Math.min(now, b.endAt);
    const progress = clamp((until - b.startAt) / (b.endAt - b.startAt), 0, 1);
    const n = b.squad;
    const crew = s.crews[clubId];
    const mineSide = crew && memberOf(crew);
    const key = `${b.id}:${clubId}`;
    if (now < b.startAt) return { value: null, legs: 0 };
    switch (b.mode) {
      case "steps": {
        let daily = simDaily(clubId, key);
        if (mineSide) daily = (daily * (n - 1) + myDailyCounted(s, startOfDay(b.startAt).getTime(), until)) / n;
        const turnout = clamp(simTurnoutRate(clubId, key) * progress + (mineSide && checkedInBetween(s, clubId, b.startAt, until) ? 1 / n : 0), 0, 1);
        return { value: Math.round(daily * (1 + turnout / CLUB_TURNOUT_WEIGHT)) };
      }
      case "live_race": {
        let m = n * (5500 + noise(key) * 3500) * progress;
        if (mineSide) m += s.runs.filter((r) => r.startedAt >= b.startAt && r.startedAt <= b.endAt).reduce((sum, r) => sum + r.distanceKm * 1000, 0);
        return { value: Math.round(m) };
      }
      case "relay": {
        const legs = Math.min(RELAY_LEGS, n);
        const times = Array.from({ length: legs }, (_, i) => Math.round(235 + noise(`${key}:${i}`) * 95));
        if (mineSide) {
          const best = s.runs.filter((r) => r.startedAt >= b.startAt && r.startedAt <= b.endAt && r.distanceKm >= 1 && r.durationSec > 0).map((r) => Math.round(r.durationSec / r.distanceKm)).sort((x, y) => x - y)[0];
          if (best) {
            const slowest = times.indexOf(Math.max(...times));
            if (best < times[slowest]) times[slowest] = best;
          }
        }
        const done = Math.min(legs, Math.floor(progress * legs + (mineSide ? 0 : 0.4)));
        return { value: done ? times.slice(0, done).reduce((x, y) => x + y, 0) : null, legs: done, of: legs, times: times.slice(0, done) };
      }
      case "blind_time_trial": {
        if (now < b.endAt) return { value: null, sealed: true };
        const times = Array.from({ length: Math.min(n, 8) }, (_, i) => Math.round(1440 + noise(`${key}:${i}`) * 520));
        if (mineSide) {
          const mine = s.runs.filter((r) => r.startedAt >= b.startAt && r.startedAt <= b.endAt && r.distanceKm >= 5).map((r) => Math.round((r.durationSec * 5) / r.distanceKm)).sort((x, y) => x - y)[0];
          if (mine) times.push(mine);
        }
        return { value: Math.round(times.reduce((x, y) => x + y, 0) / times.length) };
      }
      case "turnout_night": {
        const size = memberCount(crew);
        let share = (0.25 + noise(key) * 0.35) * progress * 100;
        if (mineSide && checkedInBetween(s, clubId, b.startAt, until)) share += 100 / size;
        return { value: Math.round(share * 10) / 10 };
      }
      default:
        return { value: null };
    }
  };

  const decide = (mode, c, o) => {
    if (c == null && o == null) return null;
    if (c == null) return "o";
    if (o == null) return "c";
    if (c === o) return null;
    return (c < o) === clubLowerWins(mode) ? "c" : "o";
  };

  // Accept, start and finish friendlies as time passes.
  const advanceBattles = (s, now = Date.now()) => {
    for (const b of s.clubBattles) {
      const ch = s.crews[b.challenger];
      const op = s.crews[b.opponent];
      if (!ch || !op) continue;
      // A simulated captain answers your challenge within a minute.
      if (b.status === "pending" && memberOf(ch) && !memberOf(op) && now - b.createdAt >= SIM_ACCEPT_MS) {
        b.status = "accepted";
        b.respondedAt = b.createdAt + SIM_ACCEPT_MS;
        notify(s, { type: "crews", title: `${op.name} accepted`, body: `${clubModeOf(b.mode).name} friendly is on.`, link: `/clubs/battle/${b.id}` });
      }
      // Your captain follows the vote a couple of minutes after you've voted.
      if (b.status === "pending" && memberOf(op) && !isCaptain(op) && b.votes?.mine != null && now - b.votes.at >= 2 * SIM_ACCEPT_MS) {
        b.status = b.votes.yes + (b.votes.mine ? 1 : 0) >= b.votes.no + (b.votes.mine ? 0 : 1) ? "accepted" : "declined";
        b.respondedAt = now;
        notify(s, { type: "crews", title: b.status === "accepted" ? "Your captain accepted" : "Your captain said no", body: b.status === "accepted" ? `The reveal: it's ${ch.name}.` : null, link: `/clubs/battle/${b.id}` });
      }
      if (b.status === "pending" && b.startAt + DAY_MS <= now) b.status = "cancelled";
      if (b.status === "accepted" && b.startAt <= now) b.status = "live";
      if (b.status === "live" && b.endAt <= now) {
        const c = battleScore(s, b, b.challenger, b.endAt).value;
        const o = battleScore(s, b, b.opponent, b.endAt).value;
        const w = decide(b.mode, c, o);
        b.status = "finished";
        b.result = { c, o, winner: w === "c" ? b.challenger : w === "o" ? b.opponent : null };
        const mine = memberOf(ch) ? ch : memberOf(op) ? op : null;
        if (mine) notify(s, { type: "crews", title: !b.result.winner ? "The friendly was a draw" : b.result.winner === mine.id ? "Your club won" : "Your club lost this one", body: `${ch.name} v ${op.name}`, link: `/clubs/battle/${b.id}` });
      }
    }
  };

  // A league club you join comes with a past friendly and a challenger at the
  // door, so the screens have something real to show.
  const seedBattles = (s, crew, now = Date.now()) => {
    if (s.clubSeeded[crew.id] || !CLUB_LEAGUE.clubs.includes(crew.id)) return;
    s.clubSeeded[crew.id] = true;
    const others = CLUB_LEAGUE.clubs.filter((id) => id !== crew.id);
    const pick = (i) => others[Math.floor(noise(`${crew.id}:pick:${i}`) * others.length)];
    const lastWeek = startOfWeek(now).getTime() - WEEK_MS + 2 * DAY_MS + 19 * HOUR_MS;
    const past = { id: randomId("cb"), challenger: crew.id, opponent: pick(1), mode: "relay", mystery: false, status: "live", startAt: lastWeek, endAt: lastWeek + 2 * HOUR_MS, createdAt: lastWeek - DAY_MS, squad: 0 };
    past.squad = squadSize(s, past.challenger, past.opponent);
    s.clubBattles.push(past);
    const tomorrow = startOfDay(now + DAY_MS).getTime() + 19 * HOUR_MS;
    const challenger = pick(2) === past.opponent ? pick(3) : pick(2);
    const incoming = { id: randomId("cb"), challenger, opponent: crew.id, mode: "turnout_night", mystery: true, status: "pending", startAt: tomorrow, endAt: tomorrow + 4 * HOUR_MS, createdAt: now - 2 * HOUR_MS, votes: { yes: 14, no: 2, mine: null }, squad: 0 };
    incoming.squad = squadSize(s, incoming.challenger, incoming.opponent);
    s.clubBattles.push(incoming);
    notify(s, { type: "crews", title: "Here comes a challenger club", body: `A club in ${CLUB_LEAGUE.area} has called ${crew.name} out. Have your say.`, link: `/clubs/battle/${incoming.id}` });
  };

  const battleView = (s, b, forClub, now = Date.now()) => {
    const ch = s.crews[b.challenger];
    const op = s.crews[b.opponent];
    const myClubId = forClub || (memberOf(ch) ? b.challenger : b.opponent);
    const home = myClubId === b.challenger;
    const mineCrew = home ? ch : op;
    const theirCrew = home ? op : ch;
    const hidden = b.mystery && !home && (b.status === "pending" || b.status === "accepted");
    const finished = b.status === "finished";
    const live = b.status === "live";
    const mine = finished ? { value: home ? b.result.c : b.result.o } : live ? battleScore(s, b, myClubId, now) : { value: null };
    const theirs = finished ? { value: home ? b.result.o : b.result.c } : live ? battleScore(s, b, theirCrew.id, now) : { value: null };
    const m = clubModeOf(b.mode);
    return {
      id: b.id,
      mode: b.mode,
      modeName: m.name,
      tag: m.tag,
      unit: m.unit,
      status: b.status,
      mystery: b.mystery,
      hidden,
      home,
      myClub: brief(mineCrew),
      opponent: hidden ? null : { ...brief(theirCrew), record: recordOf(s, theirCrew.id, now) },
      startAt: b.startAt,
      endAt: b.endAt,
      squad: b.squad,
      myScore: mine.value ?? null,
      theirScore: theirs.value ?? null,
      myLegs: mine.legs ?? null,
      theirLegs: theirs.legs ?? null,
      legsOf: mine.of ?? null,
      myLegTimes: mine.times || null,
      sealed: b.mode === "blind_time_trial" && !finished,
      won: finished ? (b.result.winner ? b.result.winner === myClubId : null) : null,
      draw: finished && !b.result.winner,
      votes: b.votes ? { yes: b.votes.yes + (b.votes.mine === true ? 1 : 0), no: b.votes.no + (b.votes.mine === false ? 1 : 0), mine: b.votes.mine } : { yes: 0, no: 0, mine: null },
      isCaptain: isCaptain(mineCrew),
      canVote: !home && b.status === "pending" && memberOf(mineCrew),
      canRespond: !home && b.status === "pending" && isCaptain(mineCrew),
      canCancel: (b.status === "pending" || b.status === "accepted") && isCaptain(mineCrew),
    };
  };

  const findBattle = (s, id) => {
    const b = s.clubBattles.find((x) => x.id === id);
    if (!b) throw new EngineError("NOT_FOUND", "That friendly has gone.");
    return b;
  };

  const tick = (s) => {
    if (!s.me) return;
    reviewClaims(s);
    const club = homeClub(s);
    if (club) seedBattles(s, club);
    advanceBattles(s);
    Object.values(s.crews).forEach((c) => memberOf(c) && promoteFounding(s, c));
  };

  // ── Views shared with crewView ───────────────────────────────────────────────

  const clubBits = (s, crew) => {
    const runs = runsOf(s, crew);
    return {
      status: crew.status || "founding",
      verified: crew.status === "verified",
      founding: crew.status !== "verified",
      founded: crew.founded || null,
      area: crew.area || crew.city,
      cover: crew.cover || null,
      meetPlace: crew.meetPlace || null,
      meets: meetsLabel(crew.runs || []),
      distances: crew.distances || null,
      paces: crew.paces || null,
      beginners: !!crew.beginners,
      awayKm: crew.awayKm ?? null,
      memberCount: memberCount(crew),
      lastTurnout: runs[0] ? runs[0].lastTurnout : null,
      record: crew.status === "verified" ? recordOf(s, crew.id) : null,
      nextRun: runs[0] || null,
      inLeague: CLUB_LEAGUE.clubs.includes(crew.id),
      isCaptain: isCaptain(crew),
    };
  };

  // ── API ──────────────────────────────────────────────────────────────────────

  const findClubs = async ({ filter = "near", query = "" } = {}) =>
    touch((s) => {
      tick(s);
      const q = query.trim().toLowerCase();
      const city = s.me?.city || "London";
      const now = Date.now();
      const tonightEnd = startOfDay(now + DAY_MS).getTime();
      let list = Object.values(s.crews).filter((c) => c.privacy !== "invite" || memberOf(c));
      if (q) list = list.filter((c) => [c.name, c.city, c.area, c.meetPlace].filter(Boolean).some((x) => x.toLowerCase().includes(q)));
      else list = list.filter((c) => c.city === city);
      if (filter === "tonight") list = list.filter((c) => runsOf(s, c, now).some((r) => r.startAt < tonightEnd && r.startAt + 2 * HOUR_MS > now));
      if (filter === "beginners") list = list.filter((c) => c.beginners);
      return list
        .map((c) => ({ ...brief(c), ...clubBits(s, c), city: c.city, isMember: memberOf(c), tagline: c.tagline }))
        .sort((a, b) => Number(b.verified) - Number(a.verified) || (a.awayKm ?? 999) - (b.awayKm ?? 999));
    });

  const listClubRuns = async (crewId) => read((s) => runsOf(s, crewOf(s, crewId)));

  const getClubRun = async (id) =>
    read((s) => {
      const { crew, r } = findRun(s, id);
      const view = clubRunView(s, crew, r);
      const fx = myFixture(s);
      view.fixture = fx && !fx.bye && fx.mySide && (fx.home.club.id === crew.id || fx.away.club.id === crew.id) ? { id: fx.id, opponent: fx.mySide === "home" ? fx.away.club : fx.home.club, isDerby: fx.isDerby } : null;
      return view;
    });

  const rsvpClubRun = async (id, going = true, pace = null) =>
    write((s) => {
      requireMe(s);
      const { crew, r } = findRun(s, id);
      const v = clubRunView(s, crew, r);
      s.clubRuns[v.occurrenceId] = { ...(s.clubRuns[v.occurrenceId] || {}), rsvp: going, pace: pace || s.clubRuns[v.occurrenceId]?.pace || null };
      return clubRunView(s, crew, r);
    });

  const checkInClubRun = async (id) =>
    write((s) => {
      requireMe(s);
      const { crew, r } = findRun(s, id);
      const v = clubRunView(s, crew, r);
      if (v.checkedIn) return { ...v, earned: null };
      if (!v.checkInOpen) throw new EngineError("CHECK_IN_CLOSED", "Check-in opens 30 minutes before the start.");
      s.clubRuns[v.occurrenceId] = { ...(s.clubRuns[v.occurrenceId] || {}), rsvp: true, checkedIn: true, checkedInAt: Date.now() };
      const earned = award(s, { xp: CHECK_IN_XP, out: CHECK_IN_OUT, label: `Club run: ${crew.name}`, reason: "event", refId: v.occurrenceId });
      promoteFounding(s, crew);
      const after = clubRunView(s, crew, r);
      notify(s, { type: "events", title: "Checked in", body: `${crew.name}, ${r.title}. ${after.here} here so far.`, link: `/clubs/run/${after.id}` });
      return { ...after, earned };
    });

  const getFounding = async (crewId) =>
    read((s) => {
      const crew = crewOf(s, crewId);
      return { club: { ...brief(crew), ...clubBits(s, crew), tagline: crew.tagline, isMember: memberOf(crew) }, ...foundingView(s, crew) };
    });

  const claimClub = async ({ name, meetPlace, days = [], hour = 19, minute = 0, founded = null, proofMethod = "instagram", proofHandle = "", callAt = null, crewId = null }) =>
    write((s) => {
      requireMe(s);
      const clean = (name || "").trim();
      if (clean.length < 3) throw new EngineError("BAD_NAME", "Club names need at least 3 characters.");
      if (!days.length) throw new EngineError("DAYS_REQUIRED", "Pick the days your club meets.");
      if (!(meetPlace || "").trim()) throw new EngineError("PLACE_REQUIRED", "Where do you meet?");
      if (proofMethod !== "call" && (proofHandle || "").replace("@", "").trim().length < 2) throw new EngineError("PROOF_REQUIRED", "Add the club's Instagram or Strava page.");
      if (proofMethod === "call" && !callAt) throw new EngineError("PROOF_REQUIRED", "Pick a time for the call.");
      if (crewId && !isCaptain(crewOf(s, crewId))) throw new EngineError("NOT_ALLOWED", "Only the club's captain can claim it.");
      const pending = s.clubClaims.filter((c) => c.status === "pending");
      if (pending.length >= 3) throw new EngineError("CLAIM_LIMIT", "You have three claims waiting already.");
      if (pending.some((c) => c.name.toLowerCase() === clean.toLowerCase())) throw new EngineError("ALREADY_CLAIMED", "That claim is already with us.");
      const claim = {
        id: randomId("claim"),
        name: clean,
        meetPlace: meetPlace.trim(),
        days: [...new Set(days)].sort(),
        hour,
        minute,
        founded,
        proofMethod,
        proofHandle: proofHandle.replace("@", "").trim(),
        code: proofMethod === "call" ? null : String(Math.floor(100000 + Math.random() * 900000)),
        callAt,
        crewId,
        status: "pending",
        at: Date.now(),
      };
      s.clubClaims.unshift(claim);
      return claimView(claim);
    });

  const listMyClaims = async () =>
    touch((s) => {
      tick(s);
      return s.clubClaims.map(claimView);
    });

  const getClubLeague = async () =>
    touch((s) => {
      tick(s);
      const now = Date.now();
      const season = seasonAt(s, now);
      const club = homeClub(s);
      const fx = myFixture(s, now);
      return {
        season: `Season ${season.number}`,
        competition: CLUB_LEAGUE.competition,
        area: CLUB_LEAGUE.area,
        divisions: CLUB_LEAGUE.divisions,
        division: CLUB_LEAGUE.division,
        week: season.week,
        weeks: SEASON_WEEKS,
        table: table(s, season, now),
        myClub: brief(club),
        inLeague: !!club && CLUB_LEAGUE.clubs.includes(club.id),
        fixture: fx && !fx.bye ? fx : null,
        bye: !!fx?.bye,
      };
    });

  const getFixture = async (id) =>
    touch((s) => {
      tick(s);
      const p = parseFixtureId(id);
      if (!CLUB_LEAGUE.clubs.includes(p.home) || !CLUB_LEAGUE.clubs.includes(p.away)) throw new EngineError("NOT_FOUND", "Fixture not found.");
      const season = seasonAt(s);
      const start = season.start - (season.number - p.season) * SEASON_WEEKS * WEEK_MS;
      return fixtureAt(s, { number: p.season, start }, p.week, p.home, p.away);
    });

  const getMyFixture = async () =>
    touch((s) => {
      tick(s);
      const fx = myFixture(s);
      return fx && !fx.bye ? fx : null;
    });

  const listClubBattles = async (crewId) =>
    touch((s) => {
      tick(s);
      const crew = crewOf(s, crewId);
      seedBattles(s, crew);
      advanceBattles(s);
      return s.clubBattles
        .filter((b) => b.challenger === crewId || b.opponent === crewId)
        .map((b) => battleView(s, b, crewId))
        .sort((a, b) => (a.status === "finished") - (b.status === "finished") || b.startAt - a.startAt);
    });

  const getClubBattle = async (id) =>
    touch((s) => {
      tick(s);
      return battleView(s, findBattle(s, id));
    });

  const getClubRoster = async (crewId) =>
    read((s) => {
      const mine = crewOf(s, crewId);
      const now = Date.now();
      const t = table(s, seasonAt(s, now), now);
      const roster = Object.values(s.crews)
        .filter((c) => c.id !== crewId && c.status === "verified" && c.city === mine.city)
        .map((c) => {
          const head = s.clubBattles.filter((b) => b.status === "finished" && [b.challenger, b.opponent].includes(c.id) && [b.challenger, b.opponent].includes(crewId));
          const row = t.find((r) => r.id === c.id);
          const runs = runsOf(s, c, now);
          return {
            club: { ...brief(c), meets: meetsLabel(c.runs || []) },
            record: { w: head.filter((b) => b.result.winner === crewId).length, l: head.filter((b) => b.result.winner === c.id).length },
            turnout: runs[0] ? Math.round((100 * runs[0].lastTurnout) / memberCount(c)) : null,
            tablePos: row?.pos || null,
            group: row ? `${CLUB_LEAGUE.division} · ${CLUB_LEAGUE.area}` : null,
            squad: squadSize(s, crewId, c.id),
            isDerby: isDerby(crewId, c.id),
          };
        })
        .sort((a, b) => Number(b.isDerby) - Number(a.isDerby) || (a.tablePos || 99) - (b.tablePos || 99));
      return { me: { ...brief(mine), record: recordOf(s, crewId, now) }, roster };
    });

  const challengeClub = async ({ crewId, opponentId = null, mode = "steps", startAt = null, hours = null }) =>
    write((s) => {
      requireMe(s);
      const mine = crewOf(s, crewId);
      if (!isCaptain(mine)) throw new EngineError("CAPTAINS_ONLY", "Only the club captain can call a friendly.");
      if (mine.status !== "verified") throw new EngineError("NOT_VERIFIED", "Club v club opens once your club is official.");
      const m = CLUB_MODE[mode];
      if (!m) throw new EngineError("BAD_MODE", "Pick a mode.");
      if (m.soon) throw new EngineError("MODE_NOT_READY", `${m.name} opens next season.`);
      const open = (b) => ["pending", "accepted", "live"].includes(b.status);
      let opp = opponentId;
      if (!opp) {
        const pool = Object.values(s.crews).filter((c) => c.id !== crewId && c.status === "verified" && c.city === mine.city && !s.clubBattles.some((b) => open(b) && [b.challenger, b.opponent].includes(c.id) && [b.challenger, b.opponent].includes(crewId)));
        if (!pool.length) throw new EngineError("NO_CLUBS", "No other clubs near you are free right now.");
        opp = pool[Math.floor(Math.random() * pool.length)].id;
      }
      const them = crewOf(s, opp);
      if (them.status !== "verified") throw new EngineError("NOT_VERIFIED", "That club isn't official yet.");
      if (s.clubBattles.some((b) => open(b) && [b.challenger, b.opponent].includes(opp) && [b.challenger, b.opponent].includes(crewId))) throw new EngineError("ALREADY_PLAYING", `You already have a friendly on with ${them.name}.`);
      if (s.clubBattles.filter((b) => open(b) && b.challenger === crewId).length >= 3) throw new EngineError("CLUB_BATTLE_LIMIT", "Three friendlies at once is the most.");
      const start = startAt || Date.now() + DAY_MS;
      if (start < Date.now() - MIN_MS) throw new EngineError("BAD_TIME", "Pick a start in the future.");
      const b = { id: randomId("cb"), challenger: crewId, opponent: opp, mode, mystery: !opponentId, status: "pending", startAt: start, endAt: start + (hours || m.hours) * HOUR_MS, createdAt: Date.now(), squad: squadSize(s, crewId, opp) };
      s.clubBattles.push(b);
      return battleView(s, b, crewId);
    });

  const voteClubBattle = async (id, yes) =>
    write((s) => {
      const b = findBattle(s, id);
      if (b.status !== "pending") throw new EngineError("BATTLE_CLOSED", "Voting has closed.");
      if (!memberOf(s.crews[b.opponent])) throw new EngineError("NOT_ALLOWED", "Only members of the challenged club vote.");
      b.votes = { ...(b.votes || { yes: 0, no: 0 }), mine: !!yes, at: Date.now() };
      return battleView(s, b);
    });

  const respondClubBattle = async (id, accept) =>
    write((s) => {
      const b = findBattle(s, id);
      if (b.status !== "pending") throw new EngineError("BATTLE_CLOSED", "This friendly has already been answered.");
      if (!isCaptain(s.crews[b.opponent])) throw new EngineError("CAPTAINS_ONLY", "Only your captain can answer for the club.");
      b.status = accept ? (b.startAt <= Date.now() ? "live" : "accepted") : "declined";
      b.respondedAt = Date.now();
      return battleView(s, b);
    });

  const cancelClubBattle = async (id) =>
    write((s) => {
      const b = findBattle(s, id);
      if (!["pending", "accepted"].includes(b.status)) throw new EngineError("BATTLE_CLOSED", "It has already started.");
      if (!isCaptain(s.crews[b.challenger]) && !isCaptain(s.crews[b.opponent])) throw new EngineError("CAPTAINS_ONLY", "Only a captain can call it off.");
      b.status = "cancelled";
      return battleView(s, b);
    });

  return {
    clubBits,
    tick,
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
    // for tests
    _seasonAt: seasonAt,
    _pairings: pairings,
  };
};

export const SEEDED_CLUB_IDS = CREWS.map((c) => c.id);
