// Pure rules for the Outside area, shared by the local engine (outside.js)
// and the Supabase adapter (remoteOutside.js) so both give the same answers:
// drop tags, order steps, ticket waves, the fair play route check and the
// shape of a city league table.

import { DIVISIONS } from "./places";

const HOUR_MS = 60 * 60 * 1000;

// ── Drops ─────────────────────────────────────────────────────────────────────

export const ORDER_LABELS = {
  claimed: "Claimed",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
export const ORDER_FLOW = ["claimed", "packed", "shipped", "out_for_delivery", "delivered"];

export const ORDER_HEADLINE = {
  claimed: ["It's", "yours"],
  packed: ["Packed and", "ready"],
  shipped: ["On its", "way"],
  out_for_delivery: ["Out for", "delivery"],
  delivered: ["Delivered", "enjoy it"],
  cancelled: ["Order", "cancelled"],
};

// The little label on a shop card.
export const dropTag = ({ status, tierRequired, opensAt, now = Date.now() }) => {
  if (status === "ended") return "ENDED";
  if (status === "soldout") return "SOLD OUT";
  if (tierRequired === "black") return "BLACK";
  if (status === "upcoming" || status === "early") return "SOON";
  if (opensAt && now - opensAt < 72 * HOUR_MS) return "NEW";
  return null;
};

export const dropStatus = ({ now = Date.now(), opensAt, earlyAt, closesAt, remaining, hasEarlyAccess }) => {
  if (closesAt && now > closesAt) return "ended";
  if (remaining <= 0) return "soldout";
  if (now >= opensAt) return "live";
  if (hasEarlyAccess && now >= earlyAt) return "early";
  return "upcoming";
};

export const formatAddress = (a) => (a ? [a.line1, a.line2, a.town, a.postcode].filter(Boolean).join(", ") : "");

export const addressProblem = (a) => {
  if (!a) return "ADDRESS_REQUIRED";
  for (const k of ["name", "line1", "town", "postcode"]) if (!String(a[k] || "").trim()) return "ADDRESS_REQUIRED";
  return null;
};

export const cleanAddress = (a) => ({
  name: String(a.name || "").trim(),
  line1: String(a.line1 || "").trim(),
  line2: String(a.line2 || "").trim() || undefined,
  town: String(a.town || "").trim(),
  postcode: String(a.postcode || "").trim().toUpperCase(),
});

// ── Event tickets ─────────────────────────────────────────────────────────────

export const WAVE_SIZE = 50;
export const waveFor = (position) => Math.max(1, Math.ceil(position / WAVE_SIZE));
export const gateFor = (wave) => String.fromCharCode(64 + ((wave - 1) % 4) + 1);
export const ticketQr = (code) => `outhere:ticket:${code}`;

// ── City League ───────────────────────────────────────────────────────────────

export const DIVISION_NAMES = Object.fromEntries(DIVISIONS.map((d) => [d.key, d.name]));
export const divisionName = (key) => DIVISION_NAMES[key] || (key === "rising" ? "Rising" : key);

// Sides grouped by division, best first, for the league table.
export const groupDivisions = (sides) =>
  DIVISIONS.map((d) => ({ ...d, sides: sides.filter((s) => s.division === d.key).sort((a, b) => b.score - a.score || b.active - a.active) })).filter((d) => d.sides.length);

// ── Fair play ─────────────────────────────────────────────────────────────────
// Looks at a saved route: steps against distance, GPS jumps and stretches
// faster than 20 km/h. Flags the run when 400 m or more was that fast, or
// when both the steps and the GPS look wrong. Mirrors review_run_route() in
// the database.

const toRad = (d) => (d * Math.PI) / 180;
export const haversineM = (lat1, lng1, lat2, lng2) => {
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
};

const pointOf = (p) => (Array.isArray(p) ? { lat: p[0], lng: p[1], t: p[2] ?? null } : { lat: p.latitude ?? p.lat, lng: p.longitude ?? p.lng, t: p.t ?? p.timestamp ?? null });

export const analyseRoute = (points, { distanceM, steps = 0 } = {}) => {
  const pts = (points || []).map(pointOf).filter((p) => p.lat != null && p.lng != null);
  if (pts.length < 3) return null;
  let fastM = 0;
  let fastS = 0;
  let jumps = 0;
  const fastStretches = [];
  for (let i = 1; i < pts.length; i += 1) {
    const d = haversineM(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng);
    if (pts[i].t == null || pts[i - 1].t == null) continue;
    const dt = (pts[i].t - pts[i - 1].t) / 1000;
    if (dt <= 0) continue;
    if (d > 250 && dt < 15) jumps += 1;
    if ((d / dt) * 3.6 > 20) {
      fastM += d;
      fastS += dt;
      fastStretches.push(i);
    }
  }
  const dist = Math.round(distanceM || 0);
  const stepsOk = !steps || !dist || (steps / dist >= 0.5 && steps / dist <= 2.4);
  const gpsOk = jumps <= 2;
  if (fastM < 400 && (stepsOk || gpsOk)) return null;
  const fastKmh = fastS > 0 ? Math.round((fastM / fastS) * 3.6) : null;
  const countedM = Math.max(0, dist - Math.round(fastM));
  const heldXp = (Math.floor(dist / 1000) - Math.floor(countedM / 1000)) * 10;
  return {
    checks: [
      { key: "steps", ok: stepsOk, label: stepsOk ? "Steps match the distance" : "Steps don't match the distance" },
      { key: "gps", ok: gpsOk, label: gpsOk ? "GPS stayed steady" : "GPS jumped about" },
      {
        key: "speed",
        ok: fastM < 400,
        label: fastM < 400 ? "Pace looks like feet" : `Too fast for ${(Math.round(fastM / 100) / 10).toFixed(1)} km`,
        detail: fastM >= 400 ? `${fastKmh} km/h looks like a bus or a bike` : undefined,
      },
    ],
    flaggedM: Math.round(fastM),
    fastKmh,
    countedM,
    heldXp,
    fastStretches,
  };
};

// ── Battle words ──────────────────────────────────────────────────────────────

export const metricWord = (m) => (m === "distance" ? "Distance" : m === "minutes" ? "Minutes" : "Steps");
export const lengthWord = (h) => (h >= 168 ? "1 week" : h >= 48 ? `${Math.round(h / 24)} days` : `${h} hours`);
