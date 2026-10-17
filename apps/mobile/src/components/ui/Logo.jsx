// The Outhere mark: an open O with its gap at the bottom right and the blue
// out now dot sitting in the gap, the same as a photo ring with its dot.
// Weight A (Edem's pick): ring 12, dot 9, space 5, round ends, on a 100 box.
// With `animate`, the ring draws itself in and then the dot springs into place.
// Where the build can play Rive (not Expo Go), an animated mark in the house
// colours is the Rive one (rive/logo): the same landing with a ping, a glow
// that breathes and a light tap in the hand as the dot lands.

import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import { C, F } from "./tokens";
import RiveLogo from "../rive/RiveLogo";
import { riveAvailable } from "../rive/runtime";
import { haptic } from "@/services/haptics";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Geometry, the same maths as the concept demo's logo().
export function logoGeometry({ w = 12, dot = 9, space = 5, cap = "round" } = {}) {
  const r = 50 - Math.max(w / 2, dot) - 1;
  const a = Math.PI / 4; // bottom right
  const ext = cap === "round" ? w / 2 : 0;
  const g = Math.asin(Math.min(0.95, (dot + space + ext) / r));
  const a1 = a + g;
  const a2 = a - g + 2 * Math.PI;
  const pt = (t) => `${(50 + r * Math.cos(t)).toFixed(2)} ${(50 + r * Math.sin(t)).toFixed(2)}`;
  const arc = `M${pt(a1)} A${r} ${r} 0 1 1 ${pt(a2)}`;
  const length = r * (a2 - a1);
  return { r, arc, length, cx: 50 + r * Math.cos(a), cy: 50 + r * Math.sin(a) };
}

export function Logo({ size = 40, ink = C.text, dotInk = C.out, w = 12, dot = 9, space = 5, animate = false, style }) {
  const reduce = useReducedMotion();
  const { arc, length, cx, cy } = logoGeometry({ w, dot, space });
  const play = animate && !reduce;
  const drawn = useSharedValue(play ? 0 : 1);
  const pop = useSharedValue(play ? 0 : 1);

  useEffect(() => {
    if (!play) return;
    drawn.value = withTiming(1, { duration: 1400, easing: Easing.out(Easing.exp) });
    pop.value = withDelay(850, withSpring(1, { damping: 9, stiffness: 180 }));
  }, [play, drawn, pop]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - drawn.value) }));
  const dotProps = useAnimatedProps(() => ({ r: dot * pop.value }));

  const house = ink === C.text && dotInk === C.out && w === 12 && dot === 9 && space === 5;
  if (play && house && riveAvailable) {
    return (
      <View style={style} accessible accessibilityRole="image" accessibilityLabel="Outhere">
        <RiveLogo size={size} onLanded={size >= 96 ? haptic.tap : undefined} />
      </View>
    );
  }

  return (
    <View style={[{ width: size, height: size }, style]} accessible accessibilityRole="image" accessibilityLabel="Outhere">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <AnimatedPath d={arc} fill="none" stroke={ink} strokeWidth={w} strokeLinecap="round" strokeDasharray={`${length} ${length}`} animatedProps={ringProps} />
        <AnimatedCircle cx={cx} cy={cy} fill={dotInk} animatedProps={dotProps} />
      </Svg>
    </View>
  );
}

// The mark beside OUTHERE, with an optional line underneath (e.g. LONDON).
export function Wordmark({ height = 22, ink = C.text, sub, animate = false, style }) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: height * 0.32 }, style]}>
      <Logo size={Math.round(height * 1.25)} ink={ink} animate={animate} />
      <View>
        <Text style={{ color: ink, fontFamily: F.display, fontSize: height, lineHeight: height * 0.92, letterSpacing: height * 0.07 }}>OUTHERE</Text>
        {sub ? <Text style={{ color: "#b9c3d3", fontFamily: F.bodySemi, fontSize: height * 0.36, letterSpacing: height * 0.24, marginTop: 3 }}>{sub}</Text> : null}
      </View>
    </View>
  );
}
