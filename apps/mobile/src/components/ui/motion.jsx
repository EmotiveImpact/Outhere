// Motion primitives. Small, quick and springy: things should feel physical
// without slowing anyone down.

import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { hapticSelection } from "@/services/haptics";

const SPRING = { damping: 18, stiffness: 320, mass: 0.6 };

/**
 * Pressable that dips slightly when touched and springs back. Use for any
 * tappable surface. `haptic` fires a selection tick on press.
 */
export function PressableScale({ children, onPress, onLongPress, disabled, scaleTo = 0.97, haptic = true, style, hitSlop, accessibilityLabel, accessibilityRole = "button" }) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => {
        scale.value = withSpring(scaleTo, SPRING);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING);
      }}
      onPress={() => {
        if (haptic) hapticSelection();
        onPress?.();
      }}
      onLongPress={onLongPress}
    >
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  );
}

/**
 * Fades and lifts content in on mount. Pass `index` inside lists for a short
 * stagger (capped so long lists never wait).
 */
export function FadeIn({ children, index = 0, delay = 0, style }) {
  const d = delay + Math.min(index, 8) * 45;
  return (
    <Animated.View entering={FadeInDown.duration(320).delay(d).springify().damping(18)} style={style}>
      {children}
    </Animated.View>
  );
}

/** Pulsing placeholder block for loading states. */
export function Skeleton({ width = "100%", height = 16, radius = 8, style }) {
  const o = useSharedValue(0.45);
  useEffect(() => {
    o.value = withRepeat(withTiming(0.9, { duration: 750, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [o]);
  const animated = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: "#1f1f23" }, animated, style]} />;
}

/** A stack of skeleton cards, for list screens while their query loads. */
export function SkeletonList({ count = 4, height = 88, gap = 12, style }) {
  return (
    <View style={[{ gap }, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={height} radius={20} />
      ))}
    </View>
  );
}

/**
 * Number that counts to its new value. `format` turns the in-between number
 * into text (defaults to a rounded, comma-grouped number).
 */
export function AnimatedNumber({ value = 0, format, duration = 650, style, numberOfLines = 1, adjustsFontSizeToFit }) {
  const target = Number(value) || 0;
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target) return undefined;
    const t0 = Date.now();
    let raf;
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = start + (target - start) * eased;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = target;
    };
  }, [target, duration]);
  const text = format ? format(shown) : Math.round(shown).toLocaleString("en-GB");
  return (
    <Text style={style} numberOfLines={numberOfLines} adjustsFontSizeToFit={adjustsFontSizeToFit}>
      {text}
    </Text>
  );
}

/** Progress bar whose fill eases to its value. */
export function AnimatedBar({ value = 0, height = 8, colour = "#00ff7f", track = "#1c1c1f", style }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withTiming(Math.max(0, Math.min(1, value)), { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [value, w]);
  const animated = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={[{ height, borderRadius: height, backgroundColor: track, overflow: "hidden" }, style]}>
      <Animated.View style={[{ height: "100%", borderRadius: height, backgroundColor: colour }, animated]} />
    </View>
  );
}

/** Soft pulsing dot, for "live" and "outside now" indicators. */
export function LiveDot({ size = 8, colour = "#00ff7f", style }) {
  const s = useSharedValue(1);
  useEffect(() => {
    s.value = withRepeat(withTiming(2.2, { duration: 1200, easing: Easing.out(Easing.quad) }), -1, false);
  }, [s]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: 1 - (s.value - 1) / 1.2 }));
  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      <Animated.View style={[{ position: "absolute", width: size, height: size, borderRadius: size, backgroundColor: colour }, ring]} />
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: colour }} />
    </View>
  );
}
