// Start a route from anywhere in the app: load it into the Move store, begin
// the countdown and jump to the Move tab, which takes it from there.

import { toast } from "@/components/ui";
import { MOVE_SESSION_PHASE, useMoveStore } from "@/store/useMoveStore";

export const runRoute = (router, route, { ghost = false } = {}) => {
  const s = useMoveStore.getState();
  if (s.sessionPhase !== MOVE_SESSION_PHASE.IDLE) {
    toast.error("You're already out", "Finish this session first.");
    router.navigate("/(tabs)/move");
    return false;
  }
  if (!s.followRoute(route, { ghost })) {
    toast.error("Can't start that route", "It has no line to follow.");
    return false;
  }
  s.setPlanning(false);
  s.clearPlan();
  s.beginCountdown();
  router.navigate("/(tabs)/move");
  return true;
};

/** Open the Move map ready to draw a new route. */
export const drawNewRoute = (router) => {
  const s = useMoveStore.getState();
  if (s.sessionPhase !== MOVE_SESSION_PHASE.IDLE) return router.navigate("/(tabs)/move");
  s.clearPlan();
  s.setPlanning(true);
  router.navigate("/(tabs)/move");
};
