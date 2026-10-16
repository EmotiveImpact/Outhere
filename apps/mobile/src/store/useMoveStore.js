// Live UI state for the Move tab: the session being recorded right now, the
// route being drawn, and the route being followed (turns, ghost, off route).
// Finished runs and saved routes live in the data layer (engine.saveRun,
// engine.saveRoute), never here. The tab layout hides the tab bar while
// sessionPhase !== "idle".

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchOSRMRoute } from "@/services/routePlanning";
import { activityFor, caloriesFor, haversine, isCoord, pathMetres } from "@/components/move/geo";
import { bearing, climbFor, cumulative, turnsFor } from "@/data/runMath";

export const MOVE_SESSION_PHASE = Object.freeze({
  IDLE: "idle",
  COUNTDOWN: "countdown",
  ACTIVE: "active",
  PAUSED: "paused",
  SUMMARY: "summary",
});

const LEGACY_ROUTES_KEY = "saved_routes";
const PACE_WINDOW_MS = 30 * 1000;
const MIN_STEP_M = 3;
const MAX_ACCURACY_M = 40;

const freshSession = () => ({
  startedAt: null,
  elapsedMs: 0,
  resumedAt: null,
  segments: [],
  track: [],
  distanceM: 0,
  lastPoint: null,
  lastFixAt: null,
  heading: null,
  samples: [],
  currentPace: null,
  steps: 0,
  finished: null,
});

let routeTimer = null;

/** Moving time so far, in milliseconds. Pauses never count. */
export const sessionMs = (s, now = Date.now()) => s.elapsedMs + (s.resumedAt ? now - s.resumedAt : 0);
export const sessionSeconds = (s, now = Date.now()) => Math.floor(sessionMs(s, now) / 1000);

const strip = ({ latitude, longitude }) => ({ latitude, longitude });

/** The route a session follows: its line, turns and your ghost. */
const followable = (route, { ghost = true } = {}) => {
  const path = (route?.path || []).filter(isCoord).map(strip);
  if (path.length < 2) return null;
  return {
    id: route.id || null,
    name: route.name || "Your route",
    path,
    cum: cumulative(path),
    turns: turnsFor(path),
    distanceKm: Number(route.distanceKm) > 0 ? route.distanceKm : pathMetres(path) / 1000,
    bestSec: route.stats?.bestSec || route.ghost?.sec || null,
    ghost: ghost && route.ghost?.track?.length ? route.ghost.track : null,
  };
};

export const useMoveStore = create((set, get) => ({
  sessionPhase: MOVE_SESSION_PHASE.IDLE,
  activityType: "run",
  view: "map",
  ...freshSession(),

  // The route this session follows (or will, once started).
  activeRoute: null,

  // A sheet over the map wants the whole screen, so the tab bar steps aside.
  hideTabs: false,
  setHideTabs: (hideTabs) => set({ hideTabs }),

  // Route drawing
  isPlanning: false,
  waypoints: [],
  plannedPath: [],
  plannedDistanceM: 0,
  isRouting: false,
  routeRequestId: 0,

  setActivityType: (activityType) => set({ activityType }),
  setView: (view) => set({ view }),

  // ── Following a route ──────────────────────────────────────────────────────

  /** Load a saved or suggested route to run. */
  followRoute: (route, opts) => {
    const active = followable(route, opts);
    if (active) set({ activeRoute: active });
    return !!active;
  },
  clearRoute: () => set({ activeRoute: null }),

  /** Follow whatever has been drawn on the map. */
  followPlan: (name) => {
    const { plannedPath, plannedDistanceM } = get();
    return get().followRoute({ name: name || "Your route", path: plannedPath, distanceKm: plannedDistanceM / 1000 });
  },

  // ── Session ────────────────────────────────────────────────────────────────

  beginCountdown: () => {
    if (get().sessionPhase !== MOVE_SESSION_PHASE.IDLE) return;
    set({ sessionPhase: MOVE_SESSION_PHASE.COUNTDOWN, isPlanning: false });
  },

  cancelCountdown: () => {
    if (get().sessionPhase === MOVE_SESSION_PHASE.COUNTDOWN) set({ sessionPhase: MOVE_SESSION_PHASE.IDLE });
  },

  start: () => {
    const now = Date.now();
    set({ ...freshSession(), sessionPhase: MOVE_SESSION_PHASE.ACTIVE, startedAt: now, resumedAt: now, segments: [[]], isPlanning: false, view: "map" });
  },

  addPoint: (coords, timestamp = Date.now()) => {
    const s = get();
    if (s.sessionPhase !== MOVE_SESSION_PHASE.ACTIVE || !isCoord(coords)) return;
    if (Number.isFinite(coords.accuracy) && coords.accuracy > MAX_ACCURACY_M) return;
    const t = sessionMs(s, timestamp);
    const point = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      t,
      ...(Number.isFinite(coords.altitude) ? { alt: Math.round(coords.altitude * 10) / 10 } : null),
    };
    const heading = Number.isFinite(coords.heading) && coords.heading >= 0 ? coords.heading : s.heading;

    const segments = s.segments.length ? s.segments : [[]];
    const current = segments[segments.length - 1];
    if (!s.lastPoint) {
      set({ lastPoint: point, lastFixAt: timestamp, heading, track: [...s.track, point], segments: [...segments.slice(0, -1), [...current, strip(point)]] });
      return;
    }

    const step = haversine(s.lastPoint, point);
    if (step < MIN_STEP_M) {
      set({ lastFixAt: timestamp });
      return;
    }
    const dt = Math.max(0.5, (point.t - s.lastPoint.t) / 1000);
    if (step / dt > activityFor(s.activityType).maxSpeed * 1.5) return; // GPS jump

    const distanceM = s.distanceM + step;
    const samples = [...s.samples, { t: point.t, d: distanceM }].filter((x) => point.t - x.t <= PACE_WINDOW_MS);
    let currentPace = null;
    if (samples.length >= 2) {
      const first = samples[0];
      const dd = distanceM - first.d;
      if (dd >= 15) currentPace = (point.t - first.t) / 1000 / (dd / 1000);
    }
    set({
      lastPoint: point,
      lastFixAt: timestamp,
      // No compass heading (web, some Android): use the way you're moving.
      heading: Number.isFinite(coords.heading) && coords.heading >= 0 ? coords.heading : bearing(s.lastPoint, point),
      distanceM,
      samples,
      currentPace,
      track: [...s.track, point],
      segments: [...segments.slice(0, -1), [...current, strip(point)]],
    });
  },

  /** Steps counted by the phone since the session began. */
  setSteps: (steps) => set({ steps: Math.max(0, Math.round(steps)) }),

  pause: () => {
    const s = get();
    if (s.sessionPhase !== MOVE_SESSION_PHASE.ACTIVE) return;
    set({
      sessionPhase: MOVE_SESSION_PHASE.PAUSED,
      elapsedMs: s.elapsedMs + (Date.now() - s.resumedAt),
      resumedAt: null,
      lastPoint: null, // the gap while paused is never counted
      samples: [],
      currentPace: null,
    });
  },

  resume: () => {
    const s = get();
    if (s.sessionPhase !== MOVE_SESSION_PHASE.PAUSED) return;
    set({ sessionPhase: MOVE_SESSION_PHASE.ACTIVE, resumedAt: Date.now(), segments: [...s.segments, []] });
  },

  finish: () => {
    const s = get();
    if (s.sessionPhase !== MOVE_SESSION_PHASE.ACTIVE && s.sessionPhase !== MOVE_SESSION_PHASE.PAUSED) return null;
    const endedAt = Date.now();
    const durationSec = sessionSeconds(s, endedAt);
    const distanceKm = Math.round((s.distanceM / 1000) * 100) / 100;
    const finished = {
      type: s.activityType,
      title: s.activeRoute?.name || undefined,
      distanceKm,
      durationSec,
      startedAt: s.startedAt,
      endedAt,
      calories: caloriesFor(s.activityType, distanceKm),
      route: s.track,
      segments: s.segments.filter((seg) => seg.length > 1),
      routeId: s.activeRoute?.id && distanceKm >= s.activeRoute.distanceKm * 0.5 ? s.activeRoute.id : null,
      steps: s.steps,
      climbM: climbFor(s.track),
    };
    set({
      sessionPhase: MOVE_SESSION_PHASE.SUMMARY,
      elapsedMs: durationSec * 1000,
      resumedAt: null,
      lastPoint: null,
      finished,
    });
    return finished;
  },

  /** Back to the idle map. Keeps any drawn route so it can be run again. */
  reset: () => set({ ...freshSession(), sessionPhase: MOVE_SESSION_PHASE.IDLE, view: "map", activeRoute: null }),

  // ── Route drawing ──────────────────────────────────────────────────────────

  setPlanning: (isPlanning) => set({ isPlanning }),

  addWaypoint: (coord) => {
    if (!isCoord(coord)) return;
    setWaypoints(set, get, [...get().waypoints, { latitude: coord.latitude, longitude: coord.longitude }]);
  },

  /** Close the loop: one more point back where you started. */
  closeLoop: () => {
    const w = get().waypoints;
    if (w.length >= 2) setWaypoints(set, get, [...w, w[0]]);
  },

  /** A route from here to there, used by Join on Crew live. */
  planTo: (from, to) => {
    if (isCoord(from) && isCoord(to)) setWaypoints(set, get, [strip(from), strip(to)]);
  },

  /** Load a whole line to edit or save, e.g. a suggestion. */
  loadPath: (path) => {
    const pts = (path || []).filter(isCoord);
    if (routeTimer) clearTimeout(routeTimer);
    set((s) => ({ waypoints: [], plannedPath: pts, plannedDistanceM: pathMetres(pts), isRouting: false, routeRequestId: s.routeRequestId + 1 }));
  },

  undoWaypoint: () => setWaypoints(set, get, get().waypoints.slice(0, -1)),

  clearPlan: () => {
    if (routeTimer) clearTimeout(routeTimer);
    set((s) => ({ waypoints: [], plannedPath: [], plannedDistanceM: 0, isRouting: false, routeRequestId: s.routeRequestId + 1 }));
  },
}));

/**
 * Routes saved on this phone before routes moved into your account. Hands
 * them to `save` once, then forgets them.
 */
export const importLegacyRoutes = async (save) => {
  try {
    const raw = await AsyncStorage.getItem(LEGACY_ROUTES_KEY);
    if (!raw) return 0;
    const list = JSON.parse(raw);
    let n = 0;
    for (const r of Array.isArray(list) ? list : []) {
      const path = (r?.path || []).filter(isCoord);
      if (path.length < 2) continue;
      try {
        await save({ name: String(r.name || "Saved route").slice(0, 30), path, waypoints: r.waypoints || [], hideEnds: true });
        n += 1;
      } catch {
        // Too short or badly named: leave it behind.
      }
    }
    await AsyncStorage.removeItem(LEGACY_ROUTES_KEY);
    return n;
  } catch {
    return 0;
  }
};

// Shows a straight line straight away, then snaps it to paths once the taps
// settle. Falls back to the straight line if snapping is unavailable.
const setWaypoints = (set, get, waypoints) => {
  if (routeTimer) clearTimeout(routeTimer);
  const requestId = get().routeRequestId + 1;
  set({ waypoints, plannedPath: waypoints, plannedDistanceM: pathMetres(waypoints), isRouting: waypoints.length >= 2, routeRequestId: requestId });
  if (waypoints.length < 2) return;
  routeTimer = setTimeout(async () => {
    const route = await fetchOSRMRoute(waypoints, { timeoutMs: 6000 });
    if (get().routeRequestId !== requestId) return;
    if (route?.coordinates?.length > 1) set({ plannedPath: route.coordinates, plannedDistanceM: route.distance, isRouting: false });
    else set({ isRouting: false });
  }, 700);
};
