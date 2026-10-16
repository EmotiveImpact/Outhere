// The clock every shader runs on, and when it stops.
//
// A live Skia canvas redraws whenever a shared value in its uniforms moves,
// so each effect drives one shared value, in seconds, from a Reanimated frame
// callback. The callback is switched off whenever the effect cannot be seen:
// the app is in the background, the screen is behind another one, the box
// has scrolled out of view, or the person asked for reduced motion. Paused
// canvases keep their last frame and cost nothing.

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, Dimensions, Platform } from "react-native";
import { NavigationContext } from "@react-navigation/native";
import { useFrameCallback, useReducedMotion, useSharedValue } from "react-native-reanimated";
import { useLayoutSize } from "../layout";

/** True while the app is in the foreground. */
export function useAppActive() {
  const [active, setActive] = useState(() => AppState.currentState !== "background" && AppState.currentState !== "inactive");
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => setActive(s === "active" || s === "unknown" || !s));
    return () => sub.remove();
  }, []);
  return active;
}

/** True while the screen this sits on is the one in front (always, outside a navigator). */
export function useScreenFocused() {
  const nav = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => (nav ? nav.isFocused() : true));
  useEffect(() => {
    if (!nav) return undefined;
    setFocused(nav.isFocused());
    const onFocus = nav.addListener("focus", () => setFocused(true));
    const onBlur = nav.addListener("blur", () => setFocused(false));
    return () => {
      onFocus();
      onBlur();
    };
  }, [nav]);
  return focused;
}

const MARGIN = 48;

/**
 * True while the view behind `ref` is inside the window. The web watches it
 * with an IntersectionObserver; elsewhere it is measured once a second.
 */
export function useOnScreen(ref, enabled = true) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (!enabled) return undefined;
    const node = ref.current;
    if (!node) return undefined;
    if (Platform.OS === "web") {
      if (typeof IntersectionObserver === "undefined" || typeof node.getBoundingClientRect !== "function") return undefined;
      const io = new IntersectionObserver((entries) => setOn(entries.some((e) => e.isIntersecting)), { rootMargin: `${MARGIN}px` });
      io.observe(node);
      return () => io.disconnect();
    }
    let alive = true;
    const check = () => {
      if (!alive || typeof node.measureInWindow !== "function") return;
      node.measureInWindow((x, y, w, h) => {
        if (!alive) return;
        const { width: W, height: H } = Dimensions.get("window");
        const visible = w > 0 && h > 0 ? y + h > -MARGIN && y < H + MARGIN && x + w > -MARGIN && x < W + MARGIN : true;
        setOn(visible);
      });
    };
    check();
    const id = setInterval(check, 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [ref, enabled]);
  return on;
}

/**
 * Everything a live canvas needs: a ref and onLayout for its box, the box's
 * size, a clock in seconds that only runs while the canvas can be seen, and
 * whether it is running. `paused` stops it from the outside.
 */
export function useLiveCanvas({ paused = false } = {}) {
  const ref = useRef(null);
  const [size, onLayout] = useLayoutSize();
  const reduce = useReducedMotion();
  const appActive = useAppActive();
  const focused = useScreenFocused();
  const onScreen = useOnScreen(ref, !!size);
  const running = !paused && !reduce && appActive && focused && onScreen && !!size;

  const clock = useSharedValue(0);
  const tick = useCallback(
    (info) => {
      "worklet";
      // Accumulate frame deltas so a pause never makes the picture jump.
      const dt = info.timeSincePreviousFrame;
      if (dt != null && dt > 0 && dt < 200) clock.value += dt / 1000;
    },
    [clock]
  );
  const frame = useFrameCallback(tick, false);
  useEffect(() => {
    frame.setActive(running);
  }, [running, frame]);

  return { ref, onLayout, size, clock, running };
}
