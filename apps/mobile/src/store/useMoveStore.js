import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchOSRMRoute } from "@/services/routePlanning";

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

/**
 * Move Session Store — manages everything related to the Move tab:
 * 1. Passive / Session Step Tracking
 * 2. Route Planning (OSRM)
 * 3. Live GPS Path Tracking
 */
export const useMoveStore = create((set, get) => ({
  // ── Session State (Steps & Time) ───────────────────────────────────────────
  isActive: false,
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
  isRerouting: false,      // true while auto-reroute request is in flight

  // ── Live Tracking State ────────────────────────────────────────────────────
  sessionPath: [],         // Actual GPS coordinates tracked during the run

  // Summary & History
  lastSession: null,
  history: [],
  savedRoutes: [], // Inventory of user-saved routes

  // ── Planning Actions ────────────────────────────────────────────────────────
  setPlanning: (isPlanning) => set({ isPlanning }),
  
  clearPlannedRoute: () => set({
    plannedRouteLocs: [],
    plannedRoutePath: [],
    plannedDistanceMeter: 0,
    plannedRouteSteps: [],
    isPlanning: false,
  }),

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
      isPlanning: true,
    });
  },

  addPlannedLocation: async (coord) => {
    const { plannedRouteLocs } = get();
    const newLocs = [...plannedRouteLocs, coord];
    set({ plannedRouteLocs: newLocs });

    if (newLocs.length >= 2) {
      const routeData = await fetchOSRMRoute(newLocs);
      if (routeData) {
        set({
          plannedRoutePath: routeData.coordinates,
          plannedDistanceMeter: routeData.distance,
          plannedRouteSteps: sanitizeRouteSteps(routeData.steps),
        });
      }
    }
  },

  removeLastPlannedLocation: async () => {
    const { plannedRouteLocs } = get();
    if (plannedRouteLocs.length === 0) return;

    const newLocs = plannedRouteLocs.slice(0, -1);
    
    if (newLocs.length < 2) {
      set({ plannedRouteLocs: newLocs, plannedRoutePath: [], plannedDistanceMeter: 0, plannedRouteSteps: [] });
    } else {
      set({ plannedRouteLocs: newLocs });
      const routeData = await fetchOSRMRoute(newLocs);
      if (routeData) {
        set({
          plannedRoutePath: routeData.coordinates,
          plannedDistanceMeter: routeData.distance,
          plannedRouteSteps: sanitizeRouteSteps(routeData.steps),
        });
      }
    }
  },

  rerouteToDestination: async (originCoord) => {
    const { plannedRouteLocs, plannedRoutePath, isRerouting } = get();
    if (isRerouting) return null;
    if (!originCoord || !Number.isFinite(originCoord.latitude) || !Number.isFinite(originCoord.longitude)) {
      return null;
    }

    const destination =
      plannedRouteLocs.length > 0
        ? plannedRouteLocs[plannedRouteLocs.length - 1]
        : plannedRoutePath.length > 0
          ? plannedRoutePath[plannedRoutePath.length - 1]
          : null;

    if (!destination) return null;

    set({ isRerouting: true });
    try {
      const routeData = await fetchOSRMRoute([originCoord, destination]);
      if (!routeData) return null;

      set({
        plannedRouteLocs: [originCoord, destination],
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

  startSession: (currentSteps) => {
    const state = get();
    if (state.timerInterval) clearInterval(state.timerInterval);

    const interval = setInterval(() => {
      set((s) => ({ sessionDurationSecs: s.sessionDurationSecs + 1 }));
    }, 1000);

    set({
      isActive: true,
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
      isPaused: false,
      timerInterval: interval,
    });
  },

  stopSession: async () => {
    const state = get();
    if (state.timerInterval) clearInterval(state.timerInterval);

    const xpEarned = Math.floor(state.sessionSteps / 100);
    const session = {
      steps: state.sessionSteps,
      distance: state.sessionDistance,
      durationSecs: state.sessionDurationSecs,
      xpEarned,
      date: new Date().toISOString(),
      path: state.sessionPath,             // Save the actual driven route
      plannedPath: state.plannedRoutePath, // Save the planned route reference
      plannedSteps: state.plannedRouteSteps,
    };

    try {
      const raw = await AsyncStorage.getItem("session_history");
      const history = raw ? JSON.parse(raw) : [];
      history.unshift(session);
      await AsyncStorage.setItem("session_history", JSON.stringify(history.slice(0, 50)));
    } catch (e) {
      console.warn("Could not save session:", e);
    }

    set({
      isActive: false,
      isPaused: false,
      timerInterval: null,
      lastSession: session,
      sessionPath: [],
    });

    return session;
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

  // Set the last session to null to exit summary view
  dismissSummary: () => set({ lastSession: null }),
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
