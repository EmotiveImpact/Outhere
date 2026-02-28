import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchOSRMRoute } from "@/services/routePlanning";

export const MOVE_SESSION_PHASE = Object.freeze({
  IDLE: "idle",
  PRIMING: "priming",
  ACTIVE: "active",
  PAUSED: "paused",
  SUMMARY: "summary",
});

const sanitizeRouteSteps = (steps) => {
  if (!Array.isArray(steps)) return [];
  return steps.filter(
    (step) =>
      step &&
      step.location &&
      Number.isFinite(step.location.latitude) &&
      Number.isFinite(step.location.longitude),
  );
};

const getDistanceMeters = (a, b) => {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earthRadius = 6371000;
  const lat1 = toRad(a.latitude);
  const lon1 = toRad(a.longitude);
  const lat2 = toRad(b.latitude);
  const lon2 = toRad(b.longitude);
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return earthRadius * y;
};

const getPathDistanceMeters = (path) => {
  if (!Array.isArray(path) || path.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    total += getDistanceMeters(path[i - 1], path[i]);
  }
  return total;
};

/**
 * Move Session Store — manages everything related to the Move tab:
 * 1. Passive / Session Step Tracking
 * 2. Route Planning (OSRM)
 * 3. Live GPS Path Tracking
 */
export const useMoveStore = create((set, get) => ({
  // ── Session State (Steps & Time) ───────────────────────────────────────────
  sessionPhase: MOVE_SESSION_PHASE.IDLE,
  isActive: false,
  isSessionPriming: false, // true during pre-run countdown/focus transition
  isPaused: false,
  sessionStartSteps: 0,
  sessionSteps: 0,
  sessionDistance: 0,
  sessionDurationSecs: 0,
  sessionStartTime: null,
  timerInterval: null,

  // ── Route Planning State ───────────────────────────────────────────────────
  isPlanning: false,
  plannedRouteLocs: [],    // User-tapped waypoints [{ latitude, longitude }]
  plannedRoutePath: [],    // OSRM snapped polyline coordinates [{ latitude, longitude }]
  plannedDistanceMeter: 0, // Distance returned by OSRM
  plannedRouteSteps: [],   // Turn-by-turn maneuver steps from routing service
  isPlanningRoute: false,  // true while planned route is being resolved/snapped
  planningRouteRequestId: 0, // internal request stamp to drop stale route responses
  isRerouting: false,      // true while auto-reroute request is in flight

  // ── Live Tracking State ────────────────────────────────────────────────────
  sessionPath: [],         // Actual GPS coordinates tracked during the run

  // Summary & History
  lastSession: null,
  history: [],
  savedRoutes: [], // Inventory of user-saved routes

  // ── Planning Actions ────────────────────────────────────────────────────────
  setPlanning: (isPlanning) => set({ isPlanning }),
  
  clearPlannedRoute: () =>
    set((state) => ({
      plannedRouteLocs: [],
      plannedRoutePath: [],
      plannedDistanceMeter: 0,
      plannedRouteSteps: [],
      isPlanningRoute: false,
      planningRouteRequestId: state.planningRouteRequestId + 1,
      isPlanning: false,
    })),

  loadRouteToPlan: (routeObj) => {
    if (!routeObj) return;
    const path = routeObj.path || [];
    // Validate that path contains valid coordinates
    const validPath = path.filter(p => p && typeof p.latitude === 'number' && typeof p.longitude === 'number');
    if (validPath.length === 0) return;
    
    set({
      plannedRouteLocs: [],
      plannedRoutePath: validPath,
      plannedDistanceMeter: (routeObj.distance || 0) * 1000,
      plannedRouteSteps: sanitizeRouteSteps(routeObj.steps),
      isPlanningRoute: false,
      isPlanning: true,
    });
  },

  addPlannedLocation: async (coord) => {
    const { plannedRouteLocs } = get();
    const newLocs = [...plannedRouteLocs, coord];
    if (newLocs.length < 2) {
      set({
        plannedRouteLocs: newLocs,
        plannedRoutePath: newLocs,
        plannedDistanceMeter: getPathDistanceMeters(newLocs),
        plannedRouteSteps: [],
        isPlanningRoute: false,
      });
      return;
    }

    const requestId = Date.now() + Math.floor(Math.random() * 1000);
    set({
      plannedRouteLocs: newLocs,
      plannedRoutePath: newLocs,
      plannedDistanceMeter: getPathDistanceMeters(newLocs),
      plannedRouteSteps: [],
      isPlanningRoute: true,
      planningRouteRequestId: requestId,
    });

    const routeData = await fetchOSRMRoute(newLocs, { timeoutMs: 5000 });
    if (get().planningRouteRequestId !== requestId) return;

    if (routeData) {
      set({
        plannedRoutePath: routeData.coordinates,
        plannedDistanceMeter: routeData.distance,
        plannedRouteSteps: sanitizeRouteSteps(routeData.steps),
        isPlanningRoute: false,
      });
      return;
    }
    set({ isPlanningRoute: false });
  },

  removeLastPlannedLocation: async () => {
    const { plannedRouteLocs } = get();
    if (plannedRouteLocs.length === 0) return;
    const newLocs = plannedRouteLocs.slice(0, -1);
    if (newLocs.length < 2) {
      set((state) => ({
        plannedRouteLocs: newLocs,
        plannedRoutePath: newLocs,
        plannedDistanceMeter: getPathDistanceMeters(newLocs),
        plannedRouteSteps: [],
        isPlanningRoute: false,
        planningRouteRequestId: state.planningRouteRequestId + 1,
      }));
      return;
    }
    const requestId = Date.now() + Math.floor(Math.random() * 1000);
    set({
      plannedRouteLocs: newLocs,
      plannedRoutePath: newLocs,
      plannedDistanceMeter: getPathDistanceMeters(newLocs),
      plannedRouteSteps: [],
      isPlanningRoute: true,
      planningRouteRequestId: requestId,
    });
    const routeData = await fetchOSRMRoute(newLocs, { timeoutMs: 5000 });
    if (get().planningRouteRequestId !== requestId) return;
    if (routeData) {
      set({
        plannedRoutePath: routeData.coordinates,
        plannedDistanceMeter: routeData.distance,
        plannedRouteSteps: sanitizeRouteSteps(routeData.steps),
        isPlanningRoute: false,
      });
      return;
    }
    set({ isPlanningRoute: false });
  },

  rerouteToDestination: async (originCoord, routeCheckpoints = null) => {
    const { plannedRouteLocs, plannedRoutePath, isRerouting } = get();
    if (isRerouting) return null;
    if (!originCoord || !Number.isFinite(originCoord.latitude) || !Number.isFinite(originCoord.longitude)) {
      return null;
    }

    const validCheckpoint = (point) =>
      point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude);
    const requestedCheckpoints = Array.isArray(routeCheckpoints)
      ? routeCheckpoints.filter(validCheckpoint)
      : [];

    const fallbackDestination =
      plannedRouteLocs.length > 0
        ? plannedRouteLocs[plannedRouteLocs.length - 1]
        : plannedRoutePath.length > 0
          ? plannedRoutePath[plannedRoutePath.length - 1]
          : null;

    const checkpoints = requestedCheckpoints.length > 0
      ? requestedCheckpoints
      : fallbackDestination
        ? [fallbackDestination]
        : [];
    if (checkpoints.length === 0) return null;

    const shouldSkipFirstCheckpoint = getDistanceMeters(originCoord, checkpoints[0]) <= 20;
    const remainingCheckpoints = shouldSkipFirstCheckpoint ? checkpoints.slice(1) : checkpoints;
    if (remainingCheckpoints.length === 0) return null;
    const rerouteCoords = [originCoord, ...remainingCheckpoints];

    set({ isRerouting: true });
    try {
      const routeData = await fetchOSRMRoute(rerouteCoords);
      if (!routeData) return null;
      // Ignore stale reroute completions if session has already been reset/stopped.
      if (!get().isActive) return null;

      set({
        plannedRouteLocs: rerouteCoords,
        plannedRoutePath: routeData.coordinates,
        plannedDistanceMeter: routeData.distance,
        plannedRouteSteps: sanitizeRouteSteps(routeData.steps),
      });
      return routeData;
    } finally {
      set({ isRerouting: false });
    }
  },

  // ── Session Actions ─────────────────────────────────────────────────────────

  beginSessionPriming: () =>
    set((state) => {
      if (
        state.sessionPhase === MOVE_SESSION_PHASE.ACTIVE ||
        state.sessionPhase === MOVE_SESSION_PHASE.PAUSED
      ) {
        return {};
      }
      return {
        sessionPhase: MOVE_SESSION_PHASE.PRIMING,
        isSessionPriming: true,
        isActive: false,
        isPaused: false,
        lastSession: null,
      };
    }),
  endSessionPriming: () =>
    set((state) => {
      if (state.sessionPhase !== MOVE_SESSION_PHASE.PRIMING) {
        return { isSessionPriming: false };
      }
      return {
        sessionPhase: MOVE_SESSION_PHASE.IDLE,
        isSessionPriming: false,
      };
    }),

  startSession: (currentSteps) => {
    const state = get();
    if (state.timerInterval) clearInterval(state.timerInterval);

    const interval = setInterval(() => {
      set((s) => ({ sessionDurationSecs: s.sessionDurationSecs + 1 }));
    }, 1000);

    set({
      sessionPhase: MOVE_SESSION_PHASE.ACTIVE,
      isActive: true,
      isSessionPriming: false,
      isPaused: false,
      sessionStartSteps: currentSteps || 0,
      sessionSteps: 0,
      sessionDistance: 0,
      sessionDurationSecs: 0,
      sessionStartTime: Date.now(),
      timerInterval: interval,
      lastSession: null,
      sessionPath: [], // Clear path on new run
      isPlanning: false, // Exit planning mode automatically when starting
    });
  },

  updateSessionSteps: (currentSteps) => {
    const { isActive, isPaused, sessionStartSteps } = get();
    if (!isActive || isPaused) return;

    const steps = Math.max(0, currentSteps - sessionStartSteps);
    const distance = parseFloat((steps * 0.0008).toFixed(2)); // ~0.8m per step
    set({ sessionSteps: steps, sessionDistance: distance });
  },

  updateSessionPath: (coord) => {
    const { isActive, isPaused } = get();
    if (!isActive || isPaused) return;
    set((state) => ({ sessionPath: [...state.sessionPath, coord] }));
  },

  pauseSession: () => {
    const state = get();
    if (!state.isActive || state.isPaused) return;
    
    // Clear the timer so time stops accumulating
    if (state.timerInterval) clearInterval(state.timerInterval);
    
    set({
      sessionPhase: MOVE_SESSION_PHASE.PAUSED,
      isPaused: true,
      timerInterval: null,
    });
  },

  resumeSession: () => {
    const state = get();
    if (!state.isActive || !state.isPaused) return;

    // Restart the timer
    const interval = setInterval(() => {
      set((s) => ({ sessionDurationSecs: s.sessionDurationSecs + 1 }));
    }, 1000);

    set({
      sessionPhase: MOVE_SESSION_PHASE.ACTIVE,
      isPaused: false,
      timerInterval: interval,
    });
  },

  stopSession: async () => {
    const state = get();
    if (!state.isActive) return null;
    if (state.timerInterval) clearInterval(state.timerInterval);

    const xpEarned = Math.floor(state.sessionSteps / 100);
    const session = {
      id: `${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      steps: state.sessionSteps,
      distance: state.sessionDistance,
      durationSecs: state.sessionDurationSecs,
      xpEarned,
      date: new Date().toISOString(),
      path: state.sessionPath,             // Save the actual driven route
      plannedPath: state.plannedRoutePath, // Save the planned route reference
      plannedSteps: state.plannedRouteSteps,
      feeling: null,
    };

    const nextHistory = [session, ...(Array.isArray(state.history) ? state.history : [])].slice(0, 50);

    // Transition UI state first so controls cannot race against async persistence.
    set({
      sessionPhase: MOVE_SESSION_PHASE.SUMMARY,
      isActive: false,
      isSessionPriming: false,
      isPaused: false,
      timerInterval: null,
      lastSession: session,
      history: nextHistory,
      sessionPath: [],
    });

    try {
      await AsyncStorage.setItem("session_history", JSON.stringify(nextHistory));
    } catch (e) {
      console.warn("Could not save session:", e);
    }

    return session;
  },

  updateLastSessionFeeling: async (feelingValue) => {
    const state = get();
    const last = state.lastSession;
    if (!last || !last.id) return;

    const normalized = Math.max(1, Math.min(5, Math.round(Number(feelingValue) || 3)));
    const updatedLast = { ...last, feeling: normalized };

    set({
      lastSession: updatedLast,
      history: state.history.map((session) =>
        session?.id === updatedLast.id ? { ...session, feeling: normalized } : session,
      ),
    });

    try {
      const raw = await AsyncStorage.getItem("session_history");
      const history = raw ? JSON.parse(raw) : [];
      const updatedHistory = history.map((session) =>
        session?.id === updatedLast.id ? { ...session, feeling: normalized } : session,
      );
      await AsyncStorage.setItem("session_history", JSON.stringify(updatedHistory));
    } catch (e) {
      console.warn("Could not save session feeling:", e);
    }
  },

  loadHistory: async () => {
    try {
      const rawHist = await AsyncStorage.getItem("session_history");
      const rawSaved = await AsyncStorage.getItem("saved_routes");
      
      set({ 
        history: rawHist ? JSON.parse(rawHist) : [],
        savedRoutes: rawSaved ? JSON.parse(rawSaved) : [],
      });
    } catch {
      set({ history: [], savedRoutes: [] });
    }
  },
  
  saveRoute: async (sessionInfo, customName) => {
    if (!sessionInfo || !sessionInfo.path || sessionInfo.path.length === 0) return;
    
    // Create a new route object based on the completed session
    const newRoute = {
      id: Date.now().toString(),
      name: customName || `Route ${new Date().toLocaleDateString()}`,
      distance: sessionInfo.distance, // stored in KM
      path: sessionInfo.path,
      steps: sessionInfo.plannedSteps || [],
      date: sessionInfo.date,
    };

    try {
      const state = get();
      const updatedRoutes = [newRoute, ...state.savedRoutes];
      set({ savedRoutes: updatedRoutes });
      await AsyncStorage.setItem("saved_routes", JSON.stringify(updatedRoutes));
    } catch (e) {
      console.warn("Could not save route inventory:", e);
    }
  },

  // Hard reset all in-run/planning UI state back to a clean idle map.
  resetMoveState: () => {
    const { timerInterval } = get();
    if (timerInterval) clearInterval(timerInterval);
    set((state) => ({
      sessionPhase: MOVE_SESSION_PHASE.IDLE,
      lastSession: null,
      isActive: false,
      isPaused: false,
      isSessionPriming: false,
      isPlanning: false,
      sessionStartSteps: 0,
      sessionSteps: 0,
      sessionDistance: 0,
      sessionDurationSecs: 0,
      sessionStartTime: null,
      sessionPath: [],
      plannedRouteLocs: [],
      plannedRoutePath: [],
      plannedDistanceMeter: 0,
      plannedRouteSteps: [],
      isPlanningRoute: false,
      isRerouting: false,
      planningRouteRequestId: state.planningRouteRequestId + 1,
      timerInterval: null,
    }));
  },

  // Kept for existing callers.
  dismissSummary: () => get().resetMoveState(),
}));

export const formatDuration = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export const formatPace = (steps, durationSecs) => {
  if (!steps || !durationSecs) return "--'--";
  const distKm = steps * 0.0008;
  if (distKm < 0.01) return "--'--";
  const secsPerKm = durationSecs / distKm;
  const mins = Math.floor(secsPerKm / 60);
  const secs = Math.floor(secsPerKm % 60).toString().padStart(2, "0");
  return `${mins}'${secs}`;
};
