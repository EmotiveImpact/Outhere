// Run and route maths, shared by the local engine, the Supabase layer and the
// Move screens. Pure functions only: no state, no imports from the app.
//
// Points are { latitude, longitude, t?, alt? } where t is the session's moving
// clock in milliseconds (pauses never count) and alt is metres above sea level
// when the phone gave one.

import { seededRandom } from "./random";

const R_EARTH = 6371000;
const toRad = (d) => (d * Math.PI) / 180;
const toDeg = (r) => (r * 180) / Math.PI;

export const isPoint = (p) => !!p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude);

/** Great circle distance in metres. */
export const distanceM = (a, b) => {
  if (!isPoint(a) || !isPoint(b)) return 0;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return R_EARTH * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

/** Running total of metres at each point. */
export const cumulative = (path = []) => {
  const out = new Array(path.length).fill(0);
  for (let i = 1; i < path.length; i += 1) out[i] = out[i - 1] + distanceM(path[i - 1], path[i]);
  return out;
};

export const lengthM = (path = []) => {
  const c = cumulative(path);
  return c.length ? c[c.length - 1] : 0;
};

/** Compass bearing from a to b, 0 to 360. */
export const bearing = (a, b) => {
  const phi1 = toRad(a.latitude);
  const phi2 = toRad(b.latitude);
  const dLam = toRad(b.longitude - a.longitude);
  const y = Math.sin(dLam) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLam);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

/** The point `metres` away from origin along a compass bearing. */
export const destination = (origin, bearingDeg, metres) => {
  const delta = metres / R_EARTH;
  const theta = toRad(bearingDeg);
  const phi1 = toRad(origin.latitude);
  const lam1 = toRad(origin.longitude);
  const phi2 = Math.asin(Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta));
  const lam2 = lam1 + Math.atan2(Math.sin(theta) * Math.sin(delta) * Math.cos(phi1), Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2));
  return { latitude: toDeg(phi2), longitude: ((toDeg(lam2) + 540) % 360) - 180 };
};

/** Signed turn from one heading to the next, -180 (left) to 180 (right). */
export const turnAngle = (from, to) => ((to - from + 540) % 360) - 180;

// Local flat projection around a point, in metres. Good to a few km.
const flat = (origin) => {
  const kx = Math.cos(toRad(origin.latitude)) * (Math.PI / 180) * R_EARTH;
  const ky = (Math.PI / 180) * R_EARTH;
  return (p) => ({ x: (p.longitude - origin.longitude) * kx, y: (p.latitude - origin.latitude) * ky });
};

/**
 * Where a point sits against a path: how far along the path its nearest spot
 * is (alongM), how far off the path it is (offM) and that segment's index.
 */
export const nearestOnPath = (path = [], point, cum = cumulative(path)) => {
  if (path.length < 2 || !isPoint(point)) return { alongM: 0, offM: Infinity, index: 0, point: path[0] || null };
  const xy = flat(point);
  const p = { x: 0, y: 0 };
  let best = { alongM: 0, offM: Infinity, index: 0, point: path[0] };
  for (let i = 1; i < path.length; i += 1) {
    const a = xy(path[i - 1]);
    const b = xy(path[i]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    const k = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
    const qx = a.x + k * dx;
    const qy = a.y + k * dy;
    const off = Math.hypot(p.x - qx, p.y - qy);
    if (off < best.offM) {
      const segLen = cum[i] - cum[i - 1];
      best = {
        alongM: cum[i - 1] + segLen * k,
        offM: off,
        index: i - 1,
        point: {
          latitude: path[i - 1].latitude + (path[i].latitude - path[i - 1].latitude) * k,
          longitude: path[i - 1].longitude + (path[i].longitude - path[i - 1].longitude) * k,
        },
      };
    }
  }
  return best;
};

/** The spot `alongM` metres along a path. */
export const pointAlong = (path = [], alongM, cum = cumulative(path)) => {
  if (!path.length) return null;
  if (alongM <= 0) return path[0];
  for (let i = 1; i < path.length; i += 1) {
    if (cum[i] >= alongM) {
      const seg = cum[i] - cum[i - 1] || 1;
      const k = (alongM - cum[i - 1]) / seg;
      return {
        latitude: path[i - 1].latitude + (path[i].latitude - path[i - 1].latitude) * k,
        longitude: path[i - 1].longitude + (path[i].longitude - path[i - 1].longitude) * k,
      };
    }
  }
  return path[path.length - 1];
};

// Douglas-Peucker in flat metres, so tiny GPS wiggles don't read as turns.
export const simplify = (path = [], toleranceM = 8) => {
  if (path.length < 3) return path.slice();
  const xy = flat(path[0]);
  const pts = path.map(xy);
  const keep = new Array(path.length).fill(false);
  keep[0] = true;
  keep[path.length - 1] = true;
  const stack = [[0, path.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = 0;
    let idx = -1;
    const a = pts[s];
    const b = pts[e];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1e-9;
    for (let i = s + 1; i < e; i += 1) {
      const d = Math.abs(dy * pts[i].x - dx * pts[i].y + b.x * a.y - b.y * a.x) / len;
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx > 0 && maxD > toleranceM) {
      keep[idx] = true;
      stack.push([s, idx], [idx, e]);
    }
  }
  return path.filter((_, i) => keep[i]);
};

const turnWord = (angle) => {
  const a = Math.abs(angle);
  const side = angle < 0 ? "left" : "right";
  if (a >= 120) return { dir: side, label: `Sharp ${side}` };
  if (a < 55) return { dir: side, label: `Bear ${side}` };
  return { dir: side, label: `Turn ${side}` };
};

/**
 * The turns along a planned route, worked out from the line itself (no
 * routing service): every corner sharper than `minAngle` degrees.
 */
export const turnsFor = (path = [], { minAngle = 35 } = {}) => {
  const simple = simplify(path, 8);
  if (simple.length < 3) return [];
  const cum = cumulative(path);
  const turns = [];
  for (let i = 1; i < simple.length - 1; i += 1) {
    const inLeg = distanceM(simple[i - 1], simple[i]);
    const outLeg = distanceM(simple[i], simple[i + 1]);
    if (inLeg < 12 || outLeg < 12) continue;
    const angle = turnAngle(bearing(simple[i - 1], simple[i]), bearing(simple[i], simple[i + 1]));
    if (Math.abs(angle) < minAngle) continue;
    const at = nearestOnPath(path, simple[i], cum);
    turns.push({ alongM: at.alongM, angle: Math.round(angle), point: simple[i], ...turnWord(angle) });
  }
  return turns.sort((a, b) => a.alongM - b.alongM);
};

export const OFF_ROUTE_M = 45;

/**
 * Sat nav for your feet. Given the planned route and where you are, returns
 * how far along you are, whether you're off route, the next turn and the way
 * back when you've wandered off.
 */
export const navigate = (path = [], here, { turns = turnsFor(path), cum = cumulative(path), lastAlongM = 0 } = {}) => {
  const total = cum.length ? cum[cum.length - 1] : 0;
  if (path.length < 2 || !isPoint(here)) return null;
  const near = nearestOnPath(path, here, cum);
  // Loops pass close to themselves: never jump far ahead of where you were.
  const alongM = near.alongM + 400 < lastAlongM ? lastAlongM : near.alongM;
  const remainingM = Math.max(0, total - alongM);
  const offRoute = near.offM > OFF_ROUTE_M;
  const next = turns.find((t) => t.alongM > alongM + 5) || null;
  let back = null;
  if (offRoute) {
    // Head for a spot a little ahead of your nearest point, so you rejoin
    // going the right way.
    const target = pointAlong(path, Math.min(total, near.alongM + 60), cum);
    back = { point: target, metres: Math.round(distanceM(here, target)), bearing: bearing(here, target) };
  }
  return {
    alongM,
    totalM: total,
    remainingM,
    offM: Math.round(near.offM),
    offRoute,
    arrived: remainingM < 30 && alongM > total * 0.6,
    next: next ? { ...next, inM: Math.max(0, Math.round(next.alongM - alongM)) } : null,
    after: next ? turns.find((t) => t.alongM > next.alongM + 5) || null : null,
    back,
  };
};

/** Turn a heading change into words for the way-back banner. */
export const wayBackLabel = (headingDeg, toBearing) => {
  if (!Number.isFinite(headingDeg)) return "Head back to the route";
  const a = turnAngle(headingDeg, toBearing);
  if (Math.abs(a) < 30) return "Keep straight on to rejoin the route";
  if (Math.abs(a) > 150) return "Turn around to rejoin the route";
  return `Turn ${a < 0 ? "left" : "right"} to rejoin the route`;
};

// ── Recorded runs ─────────────────────────────────────────────────────────────

const hasTime = (path) => path.length > 1 && path.every((p) => Number.isFinite(p.t));

/**
 * Seconds for each full kilometre, read off the recorded track. The final
 * part kilometre is left out. Each split: { km, sec, fastest }.
 */
export const splitsFor = (points = []) => {
  const path = points.filter(isPoint);
  if (!hasTime(path)) return [];
  const cum = cumulative(path);
  const splits = [];
  let nextKm = 1000;
  let lastT = path[0].t;
  for (let i = 1; i < path.length; i += 1) {
    while (cum[i] >= nextKm) {
      const seg = cum[i] - cum[i - 1] || 1;
      const k = (nextKm - cum[i - 1]) / seg;
      const t = path[i - 1].t + (path[i].t - path[i - 1].t) * k;
      splits.push({ km: nextKm / 1000, sec: Math.max(1, Math.round((t - lastT) / 1000)) });
      lastT = t;
      nextKm += 1000;
    }
  }
  if (splits.length) {
    const fastest = Math.min(...splits.map((s) => s.sec));
    const idx = splits.findIndex((s) => s.sec === fastest);
    splits[idx].fastest = true;
  }
  return splits;
};

/** Metres climbed, ignoring jitter under `step` metres. Null without altitude. */
export const climbFor = (points = [], step = 3) => {
  const alts = points.map((p) => p?.alt).filter(Number.isFinite);
  if (alts.length < 2) return null;
  let climb = 0;
  let ref = alts[0];
  for (const a of alts) {
    if (a - ref >= step) {
      climb += a - ref;
      ref = a;
    } else if (ref - a >= step) ref = a;
  }
  return Math.round(climb);
};

/** n altitude samples spread along the path, for the climb chart. */
export const elevationProfile = (points = [], n = 32) => {
  const path = points.filter((p) => isPoint(p) && Number.isFinite(p.alt));
  if (path.length < 2) return null;
  const cum = cumulative(path);
  const total = cum[cum.length - 1] || 1;
  const out = [];
  let j = 1;
  for (let i = 0; i < n; i += 1) {
    const at = (total * i) / (n - 1);
    while (j < path.length - 1 && cum[j] < at) j += 1;
    const seg = cum[j] - cum[j - 1] || 1;
    const k = Math.max(0, Math.min(1, (at - cum[j - 1]) / seg));
    out.push(path[j - 1].alt + (path[j].alt - path[j - 1].alt) * k);
  }
  return out;
};

/** A best run as [[seconds, metres]] every 5 seconds, for racing its ghost. */
export const ghostTrack = (points = []) => {
  const path = points.filter(isPoint);
  if (!hasTime(path)) return [];
  const cum = cumulative(path);
  const t0 = path[0].t;
  const out = [[0, 0]];
  let next = 5;
  for (let i = 1; i < path.length; i += 1) {
    const sec = (path[i].t - t0) / 1000;
    while (sec >= next) {
      const prevSec = (path[i - 1].t - t0) / 1000;
      const k = sec === prevSec ? 1 : (next - prevSec) / (sec - prevSec);
      out.push([next, Math.round(cum[i - 1] + (cum[i] - cum[i - 1]) * k)]);
      next += 5;
    }
  }
  const lastSec = Math.round((path[path.length - 1].t - t0) / 1000);
  if (out[out.length - 1][0] < lastSec) out.push([lastSec, Math.round(cum[cum.length - 1])]);
  return out;
};

/** Metres the ghost has covered after `sec` seconds. */
export const ghostAt = (track = [], sec) => {
  if (!track.length) return 0;
  if (sec <= 0) return 0;
  for (let i = 1; i < track.length; i += 1) {
    if (track[i][0] >= sec) {
      const [s0, m0] = track[i - 1];
      const [s1, m1] = track[i];
      return m0 + ((m1 - m0) * (sec - s0)) / (s1 - s0 || 1);
    }
  }
  return track[track.length - 1][1];
};

/** Thin a long track to at most `max` points, keeping the first and last. */
export const thin = (points = [], max = 600) => {
  if (points.length <= max) return points.slice();
  const step = points.length / (max - 1);
  const out = [];
  for (let i = 0; i < max - 1; i += 1) out.push(points[Math.floor(i * step)]);
  out.push(points[points.length - 1]);
  return out;
};

/** Drop the first and last `m` metres so a home address stays private. */
export const trimEnds = (path = [], m = 200) => {
  if (path.length < 3) return [];
  const cum = cumulative(path);
  const total = cum[cum.length - 1];
  if (total <= m * 2 + 50) return [];
  return path.filter((_, i) => cum[i] >= m && cum[i] <= total - m);
};

// ── Generated routes ──────────────────────────────────────────────────────────

/**
 * A loop of about `km` that starts and finishes at `center`, shaped by seed.
 * Used for suggestions when there's nothing saved near you yet.
 */
export const loopAround = (center, km, seed = "loop") => {
  const rnd = seededRandom(`${seed}:${km}`);
  const radius = (km * 1000) / (2 * Math.PI) / 1.08; // wobble adds about 8%
  const heading = rnd() * 360;
  const mid = destination(center, heading, radius);
  const back = (heading + 180) % 360;
  const n = 28;
  const wob = [rnd() * 0.18, rnd() * 0.12, rnd() * Math.PI * 2];
  const path = [];
  for (let i = 0; i <= n; i += 1) {
    const a = back + (i / n) * 360;
    const r = i === 0 || i === n ? radius : radius * (1 + wob[0] * Math.sin((i / n) * Math.PI * 3 + wob[2]) + wob[1] * Math.cos((i / n) * Math.PI * 5));
    path.push(destination(mid, a, r));
  }
  path[0] = { latitude: center.latitude, longitude: center.longitude };
  path[n] = { latitude: center.latitude, longitude: center.longitude };
  return path;
};

/** Simulated altitude so generated routes have a climb chart. */
export const withAltitude = (path = [], seed = "alt", base = 20, swing = 18) => {
  const rnd = seededRandom(seed);
  const a = rnd() * Math.PI * 2;
  const b = rnd() * Math.PI * 2;
  return path.map((p, i) => {
    const x = i / Math.max(1, path.length - 1);
    return { ...p, alt: Math.round((base + swing * (0.6 * Math.sin(x * Math.PI * 2 + a) + 0.4 * Math.sin(x * Math.PI * 5 + b))) * 10) / 10 };
  });
};

/** A run along a route at a pace, with timestamps every point. */
export const timedAlong = (path = [], secPerKm = 330, wobble = 0.06, seed = "pace") => {
  const rnd = seededRandom(seed);
  const cum = cumulative(path);
  let t = 0;
  return path.map((p, i) => {
    if (i > 0) t += ((cum[i] - cum[i - 1]) / 1000) * secPerKm * 1000 * (1 + (rnd() - 0.5) * 2 * wobble);
    return { ...p, t: Math.round(t) };
  });
};

// ── Periods for run history ───────────────────────────────────────────────────

export const periodStart = (period, now = new Date()) => {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (period === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  else if (period === "month") d.setDate(1);
  else d.setMonth(0, 1);
  return d.getTime();
};

export const STEP_M = 0.75;
export const stepsFor = (km) => Math.round(((Number(km) || 0) * 1000) / STEP_M);
