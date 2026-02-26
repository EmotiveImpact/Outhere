import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Move Session Store — manages a single active MOVE session.
 *
 * A session captures the DELTA steps/distance from when you tapped MOVE,
 * not the all-day total. This is separate from usePedometer's passive tracking.
 */
export const useMoveStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  isActive: false,
  isPaused: false,
  sessionStartSteps: 0,      // pedometer reading at session start
  sessionSteps: 0,           // steps in THIS session only
  sessionDistance: 0,        // km in THIS session
  sessionDurationSecs: 0,    // elapsed seconds
  sessionStartTime: null,    // JS Date timestamp
  timerInterval: null,       // reference to setInterval for timer

  // Summary (cleared when starting new session)
  lastSession: null,         // { steps, distance, durationSecs, xpEarned, date }
  history: [],               // loaded from AsyncStorage

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Start a new MOVE session.
   * @param {number} currentSteps - current ALL-DAY step count from usePedometer
   */
  startSession: (currentSteps) => {
    const state = get();
    if (state.timerInterval) clearInterval(state.timerInterval);

    const interval = setInterval(() => {
      set((s) => ({ sessionDurationSecs: s.sessionDurationSecs + 1 }));
    }, 1000);

    set({
      isActive: true,
      isPaused: false,
      sessionStartSteps: currentSteps,
      sessionSteps: 0,
      sessionDistance: 0,
      sessionDurationSecs: 0,
      sessionStartTime: Date.now(),
      timerInterval: interval,
      lastSession: null,
    });
  },

  /**
   * Update session with latest all-day step count — called from usePedometer listener.
   * @param {number} currentSteps - current ALL-DAY step count
   */
  updateSessionSteps: (currentSteps) => {
    const { isActive, isPaused, sessionStartSteps } = get();
    if (!isActive || isPaused) return;

    const steps = Math.max(0, currentSteps - sessionStartSteps);
    const distance = parseFloat((steps * 0.0008).toFixed(2)); // ~0.8m per step
    set({ sessionSteps: steps, sessionDistance: distance });
  },

  /**
   * Stop the session and compute XP earned.
   * @returns {object} session summary
   */
  stopSession: async () => {
    const state = get();
    if (state.timerInterval) clearInterval(state.timerInterval);

    const xpEarned = Math.floor(state.sessionSteps / 100); // 1 XP per 100 steps
    const session = {
      steps: state.sessionSteps,
      distance: state.sessionDistance,
      durationSecs: state.sessionDurationSecs,
      xpEarned,
      date: new Date().toISOString(),
    };

    // Save to session history in AsyncStorage
    try {
      const raw = await AsyncStorage.getItem("session_history");
      const history = raw ? JSON.parse(raw) : [];
      history.unshift(session); // prepend (newest first)
      // Keep last 50 sessions
      await AsyncStorage.setItem("session_history", JSON.stringify(history.slice(0, 50)));
    } catch (e) {
      console.warn("Could not save session:", e);
    }

    set({
      isActive: false,
      isPaused: false,
      timerInterval: null,
      lastSession: session,
    });

    return session;
  },

  /** Load session history from AsyncStorage into state */
  loadHistory: async () => {
    try {
      const raw = await AsyncStorage.getItem("session_history");
      const parsed = raw ? JSON.parse(raw) : [];
      set({ history: parsed });
    } catch {
      set({ history: [] });
    }
  },
}));

/** Format seconds → "mm:ss" */
export const formatDuration = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

/** Format pace → "5'48"" */
export const formatPace = (steps, durationSecs) => {
  if (!steps || !durationSecs) return "--'--";
  const distKm = steps * 0.0008;
  if (distKm < 0.01) return "--'--";
  const secsPerKm = durationSecs / distKm;
  const mins = Math.floor(secsPerKm / 60);
  const secs = Math.floor(secsPerKm % 60).toString().padStart(2, "0");
  return `${mins}'${secs}`;
};
