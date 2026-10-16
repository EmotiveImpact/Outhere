// Haptics: a small vocabulary of named moments on top of expo-haptics. Every
// moment is a pattern (one or more hits at an offset in ms), so the same
// table drives the phone and the waveform drawing in the lush demo. All of
// it is silent on the web, in the simulator and when the player has turned
// haptics off (kept in step by EngineBridge via setHapticsEnabled).
//
//   import { haptic } from "@/services/haptics";
//   haptic.tap();          a main button press
//   haptic.go();           GO on a countdown
//   const stop = holdTicks(); ... stop();   soft ticks while holding to end
//
// The older helpers (hapticSelection, hapticSuccess, hapticError,
// hapticImpact, hapticHeavy) still work and route through the same gate.

import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import * as Device from "expo-device";

let enabled = true;
export const setHapticsEnabled = (value) => {
  enabled = value !== false;
};

// The simulator reports isDevice false; a test runner has no value at all.
const onDevice = Platform.OS !== "web" && Device.isDevice !== false;
export const hapticsAvailable = () => onDevice;
const canPlay = () => enabled && onDevice;

const Impact = Haptics.ImpactFeedbackStyle || {};
const Notify = Haptics.NotificationFeedbackType || {};

// Every kind of hit, with a strength (0 to 1) the demo draws it at. A
// notification is the system's own little pattern, so it is drawn as more
// than one bar.
export const HITS = {
  selection: { strength: 0.35, bars: [0.35] },
  soft: { strength: 0.3, bars: [0.3] },
  light: { strength: 0.45, bars: [0.45] },
  medium: { strength: 0.65, bars: [0.65] },
  rigid: { strength: 0.75, bars: [0.75] },
  heavy: { strength: 1, bars: [1] },
  success: { strength: 0.8, bars: [0.5, 0.85] },
  warning: { strength: 0.7, bars: [0.7, 0.45] },
  error: { strength: 0.8, bars: [0.6, 0.6, 0.8] },
};

const play1 = (kind) => {
  switch (kind) {
    case "selection":
      return Haptics.selectionAsync();
    case "soft":
      return Haptics.impactAsync(Impact.Soft);
    case "light":
      return Haptics.impactAsync(Impact.Light);
    case "medium":
      return Haptics.impactAsync(Impact.Medium);
    case "rigid":
      return Haptics.impactAsync(Impact.Rigid);
    case "heavy":
      return Haptics.impactAsync(Impact.Heavy);
    case "success":
      return Haptics.notificationAsync(Notify.Success);
    case "warning":
      return Haptics.notificationAsync(Notify.Warning);
    case "error":
      return Haptics.notificationAsync(Notify.Error);
    default:
      return Promise.resolve();
  }
};

/**
 * The moments. Each is a list of hits: { at } in ms from the start and the
 * kind of hit. Composed where that reads better than a single tap.
 */
export const MOMENTS = {
  // every main button press
  tap: [{ at: 0, hit: "light" }],
  // a selection changed: segments, toggles, pickers
  select: [{ at: 0, hit: "selection" }],
  // a countdown beat: 3, 2, 1
  beat: [{ at: 0, hit: "medium" }],
  // GO: a heavy hit, then the success pattern 80ms later
  go: [{ at: 0, hit: "heavy" }, { at: 80, hit: "success" }],
  // Battle or Pass on a swipe card
  swipe: [{ at: 0, hit: "rigid" }],
  // a stake placed, a drop claimed, a challenge sent
  commit: [{ at: 0, hit: "medium" }, { at: 90, hit: "light" }],
  // you won: three rising taps then success
  win: [{ at: 0, hit: "light" }, { at: 110, hit: "medium" }, { at: 220, hit: "heavy" }, { at: 360, hit: "success" }],
  // not this time: one soft, then error
  lose: [{ at: 0, hit: "soft" }, { at: 160, hit: "error" }],
  // a level up: a quick ascending run of four
  levelUp: [{ at: 0, hit: "soft" }, { at: 70, hit: "light" }, { at: 140, hit: "medium" }, { at: 210, hit: "heavy" }],
  // one soft tick while holding to end a run (holdTicks repeats it)
  holdTick: [{ at: 0, hit: "soft" }],
  // the hold completed
  holdDone: [{ at: 0, hit: "heavy" }],
  // a slide to start completed
  slideEnd: [{ at: 0, hit: "success" }],
  // off route, GPS lost
  warn: [{ at: 0, hit: "warning" }],
};

/** How long a moment lasts, for the demo's timeline (ms). */
export const momentLength = (name) => {
  const hits = MOMENTS[name] || [];
  return hits.reduce((m, h) => Math.max(m, h.at + 90 * ((HITS[h.hit]?.bars.length || 1) - 1) + 60), 0);
};

const timers = new Set();

/** Plays a named moment. Resolves when the last hit has been sent. */
export const play = (name) => {
  const hits = MOMENTS[name];
  if (!hits || !canPlay()) return Promise.resolve();
  return Promise.all(
    hits.map(
      (h) =>
        new Promise((resolve) => {
          const fire = () =>
            Promise.resolve()
              .then(() => play1(h.hit))
              .catch(() => {})
              .then(resolve);
          if (h.at <= 0) {
            fire();
            return;
          }
          let t = null;
          t = setTimeout(() => {
            timers.delete(t);
            fire();
          }, h.at);
          timers.add(t);
        }),
    ),
  ).then(() => undefined);
};

/** Drops any hits still waiting to play (a screen unmounting mid pattern). */
export const cancelHaptics = () => {
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
};

/** haptic.tap(), haptic.go(), ... one function per moment. */
export const haptic = Object.fromEntries(Object.keys(MOMENTS).map((name) => [name, () => play(name)]));

/**
 * Soft ticks every `every` ms while something is held, starting now.
 * Returns the function that stops them.
 */
export const holdTicks = (every = 250) => {
  if (!canPlay()) return () => {};
  haptic.holdTick();
  const id = setInterval(() => haptic.holdTick(), every);
  return () => clearInterval(id);
};

// ── The older helpers ─────────────────────────────────────────────────────────

export const hapticSelection = () => play("select");
export const hapticSuccess = () => play("slideEnd");
export const hapticError = async () => {
  if (!canPlay()) return;
  try {
    await Haptics.notificationAsync(Notify.Error);
  } catch {
    // Silently fail
  }
};

export const hapticImpact = async (style = Impact.Medium) => {
  if (!canPlay()) return;
  try {
    await Haptics.impactAsync(style);
  } catch {
    // Silently fail
  }
};

export const hapticHeavy = () => play("holdDone");
