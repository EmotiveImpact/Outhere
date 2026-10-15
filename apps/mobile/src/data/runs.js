// Move and runs for the local engine: saved routes (yours, your club's and
// popular ones near you), suggestions by distance from where you stand, run
// history with splits from the recorded track, who's outside on the map, your
// club live, and live sharing with trusted contacts.
//
// Built by engine.js with its private helpers so it reads and writes the same
// saved world. Seeded club and popular routes are drawn as loops around the
// first place the member opens the map, so they work in any town. Reads that
// move the world on use touch, which saves without waking every screen.

import { ROUTE_TEMPLATES, centreFor } from "./seedRuns";
import { noise, randomCode, randomId } from "./random";
import { DAY_MS, dayKey } from "./time";
import {
  climbFor,
  cumulative,
  destination,
  distanceM,
  elevationProfile,
  ghostTrack,
  isPoint,
  lengthM,
  loopAround,
  periodStart,
  pointAlong,
  splitsFor,
  stepsFor,
  thin,
  trimEnds,
  withAltitude,
} from "./runMath";

const MIN = 60 * 1000;
const RE_ANCHOR_M = 3000;
const NEAR_START_M = 1500;
const MAX_CONTACTS = 5;
const STILL_ALERT_SEC = 10 * 60;

const clean = (p) => ({ latitude: p.latitude, longitude: p.longitude, ...(Number.isFinite(p.alt) ? { alt: p.alt } : null) });
const plain = (p) => ({ latitude: p.latitude, longitude: p.longitude });
const round2 = (n) => Math.round(n * 100) / 100;

const pad = (n) => String(n).padStart(2, "0");
const clock = (sec) => {
  const s = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
};

// Suggestions read the same on both data sources: your best first, then the
// closest distance, topped up with fresh loops from where you stand.
export const suggestionView = (v) => ({
  ...v,
  tag: v.stats?.bestSec ? `Your best ${clock(v.stats.bestSec)}` : v.mine ? "Your route" : v.tag || (v.clubName ? "Club route" : "Popular near you"),
  note: `${v.distanceKm.toFixed(1)} km${v.note ? ` · ${v.note}` : ""}`,
});

export const freshLoop = (from, km, i = 0) => {
  const path = withAltitude(loopAround(from, km, `fresh${i}:${dayKey()}`), `fresh${i}`, 18, 8);
  const distanceKm = round2(lengthM(path) / 1000);
  return {
    id: null,
    name: `Fresh ${km} km loop`,
    mine: false,
    owner: null,
    path,
    waypoints: [],
    distanceKm,
    climbM: climbFor(path),
    elevation: elevationProfile(path, 32),
    tag: "Fresh loop",
    note: `${distanceKm.toFixed(1)} km · from here`,
    start: plain(path[0]),
    stats: { runs: 0, bestSec: null, bestRunId: null, outEarned: 0, lastRunAt: null },
  };
};

export const withFreshLoops = (views, from, km) => {
  const fits = views
    .map(suggestionView)
    .sort((a, b) => Number(!!b.stats?.bestSec) - Number(!!a.stats?.bestSec) || Math.abs(a.distanceKm - km) - Math.abs(b.distanceKm - km));
  for (let i = 0; fits.length < 3 && i < 3; i += 1) fits.push(freshLoop(from, km, i));
  return fits.slice(0, 6);
};

export const makeRuns = (h) => {
  const { read, write, touch, requireMe, EngineError, ME, publicPlayer, playerIsOutside, PLAYERS } = h;

  // ── Basics ─────────────────────────────────────────────────────────────────

  const myCrews = (s) => Object.values(s.crews || {}).filter((c) => c.members.some((m) => m.id === ME));
  const homeCrew = (s) => myCrews(s)[0] || null;
  const routesOf = (s) => s.routes || [];

  // The spot seeded routes loop around: where the member first opened the
  // map, moved if they've since gone somewhere else.
  const anchorFor = (s, near) => {
    if (isPoint(near) && (!s.routeAnchor || distanceM(s.routeAnchor, near) > RE_ANCHOR_M)) s.routeAnchor = plain(near);
    return s.routeAnchor || centreFor(s.me?.city);
  };

  const seededPath = (tpl, anchor) => withAltitude(loopAround(anchor, tpl.km, tpl.key), tpl.key, 18, tpl.key === "hills" ? 34 : 9);

  const seededRoutes = (s, anchor) => {
    const crew = homeCrew(s);
    return ROUTE_TEMPLATES.filter((t) => t.scope === "popular" || crew).map((tpl) => {
      const path = seededPath(tpl, anchor);
      const owners = tpl.scope === "crew" ? crew.members.filter((m) => m.id !== ME).map((m) => m.id) : PLAYERS.filter((p) => p.city === s.me?.city).map((p) => p.id);
      const pool = owners.length ? owners : PLAYERS.map((p) => p.id);
      const ownerId = pool[Math.floor(noise(`owner:${tpl.key}`) * pool.length)];
      return {
        id: `sr_${tpl.key}`,
        name: tpl.name,
        ownerId,
        clubId: tpl.scope === "crew" ? crew.id : null,
        visibility: tpl.scope === "crew" ? "club" : "public",
        hideEnds: false,
        path,
        waypoints: [],
        distanceKm: round2(lengthM(path) / 1000),
        climbM: climbFor(path),
        note: tpl.note,
        tag: tpl.tag,
        scope: tpl.scope,
        runners: tpl.runners,
        createdAt: s.seededAt - 20 * DAY_MS,
      };
    });
  };

  const findRoute = (s, id, anchor) => routesOf(s).find((r) => r.id === id) || seededRoutes(s, anchor || anchorFor(s, null)).find((r) => r.id === id) || null;

  const runsOn = (s, routeId) => (s.runs || []).filter((r) => r.routeId === routeId);
  const outFor = (s, runIds) => (s.ledger || []).filter((t) => t.type === "out" && runIds.includes(t.refId)).reduce((sum, t) => sum + t.amount, 0);
  const earnedFor = (s, runId) => ({
    xp: (s.ledger || []).filter((t) => t.type === "xp" && t.refId === runId).reduce((sum, t) => sum + t.amount, 0),
    out: outFor(s, [runId]),
  });

  const statsFor = (s, route) => {
    const runs = runsOn(s, route.id);
    const full = runs.filter((r) => r.distanceKm >= route.distanceKm * 0.9);
    const best = full.reduce((b, r) => (!b || r.durationSec < b.durationSec ? r : b), null);
    return {
      runs: runs.length,
      bestSec: best ? best.durationSec : null,
      bestRunId: best ? best.id : null,
      outEarned: outFor(s, runs.map((r) => r.id)),
      lastRunAt: runs.length ? Math.max(...runs.map((r) => r.endedAt)) : null,
    };
  };

  const clubName = (s, clubId) => (clubId && s.crews?.[clubId]?.name) || null;

  const routeView = (s, r) => {
    const mine = !r.ownerId || r.ownerId === ME;
    const path = !mine && r.hideEnds ? trimEnds(r.path) : r.path;
    const owner = mine ? null : publicPlayer(r.ownerId);
    const stats = statsFor(s, r);
    return {
      id: r.id,
      name: r.name,
      mine,
      owner,
      clubId: r.clubId || null,
      clubName: clubName(s, r.clubId),
      visibility: r.visibility || (r.clubId ? "club" : "private"),
      hideEnds: !!r.hideEnds,
      path: path.map(plain),
      waypoints: mine ? r.waypoints || [] : [],
      distanceKm: r.distanceKm,
      climbM: r.climbM ?? climbFor(r.path),
      elevation: elevationProfile(r.path, 32),
      note: r.note || (r.climbM != null && r.climbM < 25 ? "flat" : null),
      tag: r.tag || null,
      runners: (r.runners || 0) + (stats.runs ? 1 : 0),
      createdAt: r.createdAt,
      start: plain(r.path[0]),
      stats,
    };
  };

  // ── Routes ─────────────────────────────────────────────────────────────────

  const listRoutes = async ({ scope = "mine", near = null } = {}) =>
    touch((s) => {
      const anchor = anchorFor(s, near);
      if (scope === "mine") {
        return routesOf(s)
          .map((r) => routeView(s, r))
          .sort((a, b) => (b.stats.lastRunAt || b.createdAt) - (a.stats.lastRunAt || a.createdAt));
      }
      const seeded = seededRoutes(s, anchor).filter((r) => r.scope === scope);
      if (scope === "crew") {
        const crewIds = myCrews(s).map((c) => c.id);
        const shared = routesOf(s).filter((r) => r.clubId && crewIds.includes(r.clubId));
        return [...shared, ...seeded].map((r) => routeView(s, r));
      }
      return seeded.map((r) => routeView(s, r)).sort((a, b) => b.runners - a.runners);
    });

  // Who's fastest on a route this month. Your own best is real; seeded
  // people run it at a pace of their own.
  const leadersFor = (s, route) => {
    const monthStart = periodStart("month");
    const crew = route.clubId ? s.crews?.[route.clubId] : homeCrew(s);
    const ids = [...new Set([...(crew ? crew.members.map((m) => m.id) : []), ...PLAYERS.filter((p) => p.city === s.me?.city).map((p) => p.id)])].filter((id) => id !== ME);
    const month = dayKey(new Date(monthStart));
    const rows = ids
      .filter((id) => noise(`ran:${route.id}:${id}:${month}`) > 0.45)
      .slice(0, 8)
      .map((id) => ({ player: publicPlayer(id), sec: Math.round(route.distanceKm * (245 + noise(`pace:${route.id}:${id}`) * 140)), isMe: false }))
      .filter((r) => r.player);
    const mineThisMonth = runsOn(s, route.id).filter((r) => r.startedAt >= monthStart && r.distanceKm >= route.distanceKm * 0.9);
    if (mineThisMonth.length) {
      const sec = Math.min(...mineThisMonth.map((r) => r.durationSec));
      rows.push({ player: { id: ME, name: "You", username: s.me.username, avatar: s.me.avatar, tier: s.me.tier }, sec, isMe: true });
    }
    rows.sort((a, b) => a.sec - b.sec);
    const top = rows.slice(0, 3);
    const me = rows.findIndex((r) => r.isMe);
    if (me >= 3) top.push(rows[me]);
    return top.map((r) => ({ ...r, rank: rows.indexOf(r) + 1 }));
  };

  const getRoute = async (id) =>
    touch((s) => {
      const r = findRoute(s, id);
      if (!r) return null;
      const view = routeView(s, r);
      const best = view.stats.bestRunId ? s.runs.find((x) => x.id === view.stats.bestRunId) : null;
      return { ...view, leaders: leadersFor(s, r), ghost: best ? { runId: best.id, sec: best.durationSec, track: ghostTrack(best.route || []) } : null };
    });

  const saveRoute = async ({ name, path = [], waypoints = [], distanceKm, climbM = null, hideEnds = true, shareWithClub = false } = {}) =>
    write((s) => {
      requireMe(s);
      const title = String(name || "").trim();
      if (title.length < 2 || title.length > 30) throw new EngineError("ROUTE_NAME", "Give the route a name of 2 to 30 characters.");
      const pts = path.filter(isPoint).map(clean);
      const km = Number(distanceKm) > 0 ? Number(distanceKm) : lengthM(pts) / 1000;
      if (pts.length < 2 || km < 0.2) throw new EngineError("ROUTE_TOO_SHORT", "Add a few more points first.");
      const crew = shareWithClub ? homeCrew(s) : null;
      const route = {
        id: randomId("route"),
        name: title,
        ownerId: ME,
        clubId: crew?.id || null,
        visibility: crew ? "club" : "private",
        hideEnds: !!hideEnds,
        path: thin(pts, 400),
        waypoints: waypoints.filter(isPoint).map(plain),
        distanceKm: round2(km),
        climbM: Number.isFinite(climbM) ? Math.round(climbM) : climbFor(pts),
        createdAt: Date.now(),
      };
      s.routes = [route, ...routesOf(s)];
      return routeView(s, route);
    });

  const renameRoute = async (id, name) =>
    write((s) => {
      const r = routesOf(s).find((x) => x.id === id);
      if (!r) throw new EngineError("NOT_FOUND", "That route has gone.");
      const title = String(name || "").trim();
      if (title.length < 2 || title.length > 30) throw new EngineError("ROUTE_NAME", "Give the route a name of 2 to 30 characters.");
      r.name = title;
      return routeView(s, r);
    });

  const deleteRoute = async (id) =>
    write((s) => {
      s.routes = routesOf(s).filter((r) => r.id !== id);
      for (const run of s.runs || []) if (run.routeId === id) run.routeId = null;
    });

  // Routes that start near you, closest to the distance asked for. Fills up
  // with fresh loops from where you stand when there aren't enough.
  const suggestRoutes = async ({ latitude, longitude, km = 5 } = {}) =>
    touch((s) => {
      const here = isPoint({ latitude, longitude }) ? { latitude, longitude } : null;
      const anchor = anchorFor(s, here);
      const from = here || anchor;
      const all = [...routesOf(s), ...seededRoutes(s, anchor)];
      const fits = all
        .filter((r) => distanceM(from, r.path[0]) <= NEAR_START_M && Math.abs(r.distanceKm - km) <= Math.max(1, km * 0.4))
        .map((r) => routeView(s, r));
      return withFreshLoops(fits, from, km);
    });

  // ── Run history ────────────────────────────────────────────────────────────

  const bestPaceRunId = (runs) => {
    const counted = runs.filter((r) => r.distanceKm >= 1 && r.paceSecPerKm);
    if (!counted.length) return null;
    return counted.reduce((b, r) => (r.paceSecPerKm < b.paceSecPerKm ? r : b)).id;
  };

  const listRunHistory = async ({ period = "month" } = {}) =>
    read((s) => {
      const runs = s.runs || [];
      const from = periodStart(period);
      const yearFrom = periodStart("year");
      const pb = bestPaceRunId(runs);
      const inPeriod = runs.filter((r) => r.startedAt >= from).sort((a, b) => b.startedAt - a.startedAt);
      return {
        period,
        year: new Date().getFullYear(),
        yearKm: round2(runs.filter((r) => r.startedAt >= yearFrom).reduce((sum, r) => sum + r.distanceKm, 0)),
        totalKm: round2(inPeriod.reduce((sum, r) => sum + r.distanceKm, 0)),
        count: inPeriod.length,
        runs: inPeriod.map((r) => ({
          id: r.id,
          title: r.title,
          type: r.type,
          startedAt: r.startedAt,
          distanceKm: r.distanceKm,
          durationSec: r.durationSec,
          paceSecPerKm: r.paceSecPerKm,
          steps: r.steps || stepsFor(r.distanceKm),
          isPb: r.id === pb,
          route: thin((r.route || []).filter(isPoint), 60).map(plain),
        })),
      };
    });

  const getRunDetail = async (id) =>
    read((s) => {
      const r = (s.runs || []).find((x) => x.id === id);
      if (!r) return null;
      const route = r.routeId ? findRoute(s, r.routeId) : null;
      const splits = splitsFor(r.route || []);
      return {
        ...r,
        route: (r.route || []).filter(isPoint),
        steps: r.steps || stepsFor(r.distanceKm),
        splits,
        fastestSplit: splits.find((x) => x.fastest) || null,
        climbM: r.climbM ?? climbFor(r.route || []),
        earned: earnedFor(s, r.id),
        routeName: route?.name || null,
        area: s.me?.area || s.me?.city || null,
        feel: r.feel ?? null,
        isPb: bestPaceRunId(s.runs) === r.id,
      };
    });

  const rateRun = async (id, feel) =>
    write((s) => {
      const r = (s.runs || []).find((x) => x.id === id);
      if (!r) throw new EngineError("NOT_FOUND", "Run not found.");
      const f = Math.round(Number(feel));
      if (!(f >= 1 && f <= 5)) throw new EngineError("BAD_FEEL", "Pick how it felt.");
      r.feel = f;
      return { id, feel: f };
    });

  // ── Who's outside, on the map ──────────────────────────────────────────────

  // A seeded person out now, somewhere around you, moving round a loop of
  // their own so the map has life in it.
  const simPosition = (pid, here, now = Date.now()) => {
    const dist = 250 + noise(`d:${pid}`) * 2300;
    const centre = destination(here, noise(`b:${pid}`) * 360, dist);
    const loop = loopAround(centre, 2 + noise(`l:${pid}`) * 3, pid);
    const cum = cumulative(loop);
    const lap = cum[cum.length - 1];
    const speed = noise(`run:${pid}`) > 0.4 ? 2.9 : 1.4; // m/s
    const at = ((now / 1000) * speed + noise(`o:${pid}`) * lap) % lap;
    const p = pointAlong(loop, at, cum);
    const trail = [];
    for (let k = 7; k >= 0; k -= 1) trail.push(pointAlong(loop, (at - k * 60 + lap) % lap, cum));
    return { ...p, trail, running: speed > 2, km: round2(((now / 1000) % 3600) * speed / 1000 * (0.5 + noise(`k:${pid}`))) };
  };

  // A city's worth of people out, from the time of day.
  const cityOut = (s, now = new Date()) => {
    const hour = now.getHours() + now.getMinutes() / 60;
    const curve = hour < 5 ? 0.05 : hour < 7 ? 0.35 : hour < 9 ? 0.9 : hour < 12 ? 0.55 : hour < 14 ? 0.7 : hour < 17 ? 0.5 : hour < 20 ? 1 : hour < 22 ? 0.6 : 0.2;
    const base = 1400 * curve + noise(`out:${dayKey()}:${now.getHours()}`) * 90;
    return Math.round(base + (s.me?.isOutside ? 1 : 0));
  };

  const getOutsideMap = async ({ latitude, longitude } = {}) =>
    read((s) => {
      const here = isPoint({ latitude, longitude }) ? { latitude, longitude } : s.routeAnchor || centreFor(s.me?.city);
      const crewIds = new Set(myCrews(s).flatMap((c) => c.members.map((m) => m.id)));
      const out = PLAYERS.filter((p) => playerIsOutside(p.id));
      const now = Date.now();
      const people = out.map((p) => {
        const pos = simPosition(p.id, here, now);
        return { id: p.id, name: p.name, avatar: p.avatar, tier: p.tier, crew: crewIds.has(p.id), latitude: pos.latitude, longitude: pos.longitude };
      });
      // Strangers show as dots only, a little scattered so nobody is pinned.
      const dots = [];
      for (let i = 0; i < 16; i += 1) {
        const key = `dot:${i}:${dayKey()}:${new Date().getHours()}`;
        dots.push(destination(here, noise(`${key}b`) * 360, 150 + noise(`${key}d`) * 2600));
      }
      const total = cityOut(s);
      return {
        total,
        near: Math.max(people.length, Math.round(total * (0.05 + noise(`near:${dayKey()}`) * 0.03))),
        area: s.me?.area || s.me?.city || null,
        city: s.me?.city || null,
        crew: people.filter((p) => p.crew),
        others: people.filter((p) => !p.crew),
        dots,
      };
    });

  const getCrewLive = async ({ latitude, longitude } = {}) =>
    read((s) => {
      const crew = homeCrew(s);
      if (!crew) return { club: null, out: [], count: 0 };
      const here = isPoint({ latitude, longitude }) ? { latitude, longitude } : s.routeAnchor || centreFor(s.me?.city);
      const now = Date.now();
      const out = crew.members
        .filter((m) => m.id !== ME && playerIsOutside(m.id))
        .map((m) => {
          const pos = simPosition(m.id, here, now);
          return {
            player: publicPlayer(m.id),
            activity: pos.running ? "Running" : "Walking",
            km: Math.max(0.4, pos.km),
            awayM: Math.round(distanceM(here, pos)),
            latitude: pos.latitude,
            longitude: pos.longitude,
            trail: pos.trail,
            waved: (s.waves || []).some((w) => w.to === m.id && now - w.at < 30 * MIN),
          };
        })
        .filter((x) => x.player)
        .sort((a, b) => a.awayM - b.awayM);
      return { club: { id: crew.id, name: crew.name, logo: crew.logo || null }, out, count: out.length + (s.me?.isOutside ? 1 : 0) };
    });

  const waveAt = async (pid) =>
    write((s) => {
      requireMe(s);
      if (!publicPlayer(pid)) throw new EngineError("NOT_FOUND", "They've gone in.");
      s.waves = [{ to: pid, at: Date.now() }, ...(s.waves || [])].slice(0, 50);
      return { ok: true };
    });

  // Shown as out while recording.
  const setLivePosition = async ({ on = true } = {}) =>
    write((s) => {
      if (!s.me) return null;
      s.me.isOutside = !!on;
      return { on: !!on };
    });

  // ── Live sharing ───────────────────────────────────────────────────────────

  const safetyOf = (s) => {
    if (!s.safety) s.safety = { contacts: [], nightAuto: false, checkIn: true, share: null };
    return s.safety;
  };

  const safetyView = (s) => {
    const sf = s.safety || { contacts: [], nightAuto: false, checkIn: true, share: null };
    const share = sf.share && !sf.share.endedAt ? sf.share : null;
    return {
      contacts: sf.contacts.map((c) => ({ ...c, watching: !!share && c.mode === "live" })),
      nightAuto: !!sf.nightAuto,
      checkIn: sf.checkIn !== false,
      share: share ? { id: share.id, token: share.token, startedAt: share.startedAt, lastAt: share.lastAt || null, alertedAt: share.alertedAt || null, link: `https://weouthere.app/live/${share.token}` } : null,
    };
  };

  const getSafety = async () => read(safetyView);

  const addTrustedContact = async ({ name, phone = "", mode = "alerts" } = {}) =>
    write((s) => {
      requireMe(s);
      const sf = safetyOf(s);
      const n = String(name || "").trim();
      if (n.length < 1 || n.length > 40) throw new EngineError("CONTACT_NAME", "Add their name.");
      const digits = String(phone || "").replace(/[^\d+]/g, "");
      if (digits.replace(/\D/g, "").length < 7) throw new EngineError("BAD_PHONE", "Add a phone number we can text.");
      if (sf.contacts.length >= MAX_CONTACTS) throw new EngineError("TOO_MANY_CONTACTS", `Up to ${MAX_CONTACTS} trusted contacts.`);
      const contact = { id: randomId("tc"), name: n, phone: digits, mode: mode === "live" ? "live" : "alerts", addedAt: Date.now() };
      sf.contacts.push(contact);
      return contact;
    });

  const updateTrustedContact = async (id, { mode } = {}) =>
    write((s) => {
      const c = safetyOf(s).contacts.find((x) => x.id === id);
      if (!c) throw new EngineError("NOT_FOUND", "Contact not found.");
      if (mode) c.mode = mode === "live" ? "live" : "alerts";
      return c;
    });

  const removeTrustedContact = async (id) =>
    write((s) => {
      const sf = safetyOf(s);
      sf.contacts = sf.contacts.filter((c) => c.id !== id);
    });

  const updateSafety = async ({ nightAuto, checkIn } = {}) =>
    write((s) => {
      const sf = safetyOf(s);
      if (nightAuto !== undefined) sf.nightAuto = !!nightAuto;
      if (checkIn !== undefined) sf.checkIn = !!checkIn;
      return safetyView(s);
    });

  const startLiveShare = async ({ runId = null } = {}) =>
    write((s) => {
      requireMe(s);
      const sf = safetyOf(s);
      if (!sf.contacts.length) throw new EngineError("NO_CONTACTS", "Add a trusted contact first.");
      if (sf.share && !sf.share.endedAt) return safetyView(s).share;
      sf.share = { id: randomId("share"), token: randomCode(10).toLowerCase(), runId, startedAt: Date.now(), lastAt: null, latitude: null, longitude: null, alertedAt: null, endedAt: null };
      return safetyView(s).share;
    });

  const stopLiveShare = async () =>
    write((s) => {
      const sf = safetyOf(s);
      if (sf.share && !sf.share.endedAt) sf.share.endedAt = Date.now();
    });

  // Called as you move. Still for ten minutes with check-ins on: your
  // contacts get a text (a notification here).
  const pingLiveShare = async ({ latitude, longitude, stillSec = 0 } = {}) => {
    const alert = await touch((s) => {
      const share = s.safety?.share;
      if (!share || share.endedAt) return false;
      if (isPoint({ latitude, longitude })) Object.assign(share, { latitude, longitude, lastAt: Date.now() });
      return s.safety.checkIn !== false && stillSec >= STILL_ALERT_SEC && !share.alertedAt;
    });
    if (!alert) return { alerted: false };
    return write((s) => {
      s.safety.share.alertedAt = Date.now();
      const names = s.safety.contacts.map((c) => c.name).join(" and ");
      h.notify(s, { type: "events", title: "We checked on you", body: `You'd stopped for 10 minutes, so we texted ${names}.`, link: "/runs/safety" });
      return { alerted: true };
    });
  };

  return {
    listRoutes,
    getRoute,
    saveRoute,
    renameRoute,
    deleteRoute,
    suggestRoutes,
    listRunHistory,
    getRunDetail,
    rateRun,
    getOutsideMap,
    getCrewLive,
    waveAt,
    setLivePosition,
    getSafety,
    addTrustedContact,
    updateTrustedContact,
    removeTrustedContact,
    updateSafety,
    startLiveShare,
    stopLiveShare,
    pingLiveShare,
  };
};

