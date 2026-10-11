// Live UI state for the Move tab: the session being recorded right now and any
// route being planned. Finished runs are saved to the engine (engine.saveRun),
// never here. The tab layout hides the tab bar while sessionPhase !== "idle".

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchOSRMRoute } from "@/services/routePlanning";
import { activityFor, caloriesFor, haversine, isCoord, pathMetres } from "@/components/move/geo";

export const MOVE_SESSION_PHASE = Object.freeze({
  IDLE: "idle",
  COUNTDOWN: "countdown",
  ACTIVE: "active",
  PAUSED: "paused",
  SUMMARY: "summary",
});

const SAVED_ROUTES_KEY = "saved_routes";
const PACE_WINDOW_MS = 30 * 1000;
const MIN_STEP_M = 3;
const MAX_ACCURACY_M = 40;

const freshSession = () => ({
  startedAt: null,
  elapsedMs: 0,
  resumedAt: null,
  segments: [],
  distanceM: 0,
  lastPoint: null,
  samples: [],
  currentPace: null,
  finished: null,
});

let routeTimer = null;

export const sessionSeconds = (s, now = Date.now()) =>
  Math.floor((s.elapsedMs + (s.resumedAt ? now - s.resumedAt : 0)) / 1000);

export const useMoveStore = create((set, get) => ({
  sessionPhase: MOVE_SESSION_PHASE.IDLE,
  activityType: "run",
  ...freshSession(),

  // Route planning
  isPlanning: false,
  waypoints: [],
  plannedPath: [],
  plannedDistanceM: 0,
  isRouting: false,
  routeRequestId: 0,
  savedRoutes: [],

  setActivityType: (activityType) => set({ activityType }),

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
    set({ ...freshSession(), sessionPhase: MOVE_SESSION_PHASE.ACTIVE, startedAt: now, resumedAt: now, segments: [[]], isPlanning: false });
  },

  addPoint: (coords, timestamp = Date.now()) => {
    const s = get();
    if (s.sessionPhase !== MOVE_SESSION_PHASE.ACTIVE || !isCoord(coords)) return;
    if (Number.isFinite(coords.accuracy) && coords.accuracy > MAX_ACCURACY_M) return;
    const point = { latitude: coords.latitude, longitude: coords.longitude, t: timestamp };

    const segments = s.segments.length ? s.segments : [[]];
    const current = segments[segments.length - 1];
    if (!s.lastPoint) {
      set({ lastPoint: point, segments: [...segments.slice(0, -1), [...current, strip(point)]] });
      return;
    }

    const step = haversine(s.lastPoint, point);
    if (step < MIN_STEP_M) return;
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
      distanceM,
      samples,
      currentPace,
      segments: [...segments.slice(0, -1), [...current, strip(point)]],
    });
  },

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
      distanceKm,
      durationSec,
      startedAt: s.startedAt,
      endedAt,
      calories: caloriesFor(s.activityType, distanceKm),
      route: s.segments.flat(),
      segments: s.segments.filter((seg) => seg.length > 1),
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

  /** Back to the idle map. Keeps any planned route so it can be run again. */
  reset: () => set({ ...freshSession(), sessionPhase: MOVE_SESSION_PHASE.IDLE }),

  // ── Route planning ─────────────────────────────────────────────────────────

  setPlanning: (isPlanning) => set({ isPlanning }),

  addWaypoint: (coord) => {
    if (!isCoord(coord)) return;
    setWaypoints(set, get, [...get().waypoints, { latitude: coord.latitude, longitude: coord.longitude }]);
  },

  undoWaypoint: () => setWaypoints(set, get, get().waypoints.slice(0, -1)),

  clearPlan: () => {
    if (routeTimer) clearTimeout(routeTimer);
    set((s) => ({ waypoints: [], plannedPath: [], plannedDistanceM: 0, isRouting: false, routeRequestId: s.routeRequestId + 1 }));
  },

  loadSavedRoutes: async () => {
    try {
      const raw = await AsyncStorage.getItem(SAVED_ROUTES_KEY);
      const list = raw ? JSON.parse(raw) : [];
      set({ savedRoutes: Array.isArray(list) ? list.filter((r) => Array.isArray(r?.path) && r.path.some(isCoord)) : [] });
    } catch {
      set({ savedRoutes: [] });
    }
  },

  saveCurrentRoute: async (name) => {
    const { plannedPath, plannedDistanceM, waypoints, savedRoutes } = get();
    if (plannedPath.length < 2) return null;
    const route = {
      id: `route_${Date.now()}`,
      name: name?.trim() || `Route ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
      distance: Math.round((plannedDistanceM / 1000) * 100) / 100, // km
      path: plannedPath,
      waypoints,
      date: new Date().toISOString(),
    };
    const next = [route, ...savedRoutes];
    set({ savedRoutes: next });
    await persistRoutes(next);
    return route;
  },

  deleteSavedRoute: async (id) => {
    const next = get().savedRoutes.filter((r) => r.id !== id);
    set({ savedRoutes: next });
    await persistRoutes(next);
  },

  applySavedRoute: (route) => {
    const path = (route?.path || []).filter(isCoord);
    if (path.length < 2) return;
    if (routeTimer) clearTimeout(routeTimer);
    set((s) => ({
      waypoints: Array.isArray(route.waypoints) ? route.waypoints.filter(isCoord) : [],
      plannedPath: path,
      plannedDistanceM: Number(route.distance) > 0 ? route.distance * 1000 : pathMetres(path),
      isRouting: false,
      routeRequestId: s.routeRequestId + 1,
      isPlanning: true,
    }));
  },
}));

const strip = ({ latitude, longitude }) => ({ latitude, longitude });

const persistRoutes = async (list) => {
  try {
    await AsyncStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(list));
  } catch {
    // Storage full or unavailable: the list still works for this session.
  }
};

// Shows a straight line straight away, then snaps it to paths via OSRM once the
// taps settle. Falls back to the straight line if routing is unavailable.
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
