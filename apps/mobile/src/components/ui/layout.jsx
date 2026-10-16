// Where things sit. The prototype puts the first control on every screen
// (back button, glass pills, title) 22px below the top of the phone, and the
// floating tab bar 20px above the bottom, 14px in from each side.
//
// On a phone the status bar comes first, so the rule is: first control at
// insets.top + TOP_GAP. The web export reports no status bar, so its safe
// area polyfill (polyfills/web/safeAreaContext.web.jsx) reserves 14px and
// the same rule lands on the prototype's 22px. Never hard code a top offset.

import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const TOP_GAP = 8;
export const SCREEN_TOP = 22; // the prototype's .m-top / .fl top, for reference

// .tabbar / .oh-phone .oh-tabbar
export const TAB_BAR = { side: 14, bottom: 20, height: 60, radius: 26 };

/** The y of the first control on a screen. */
export function useScreenTop(extra = 0) {
  const insets = useSafeAreaInsets();
  return insets.top + TOP_GAP + extra;
}

/** How far the floating tab bar sits off the bottom on this device. */
export function useTabBarBottom() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom - 10, TAB_BAR.bottom);
}

/** A spacer the height of the status bar plus the gap, for screens with their own header. */
export function ScreenTop({ extra = 0 }) {
  const top = useScreenTop(extra);
  return <View style={{ height: top }} />;
}

/** Measures a view: const [size, onLayout] = useLayoutSize(). */
export function useLayoutSize(initial = null) {
  const [size, setSize] = useState(initial);
  const onLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((s) => (s && Math.abs(s.width - width) < 0.5 && Math.abs(s.height - height) < 0.5 ? s : { width, height }));
  }, []);
  return [size, onLayout];
}
