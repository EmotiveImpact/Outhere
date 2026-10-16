// One-shot confetti burst for a won battle. Plain views and Reanimated, so it
// runs in Expo Go with no extra packages.

import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { seededRandom } from "@/data/random";

const COLOURS = ["#3d8bff", "#FFD700", "#ffffff", "#3DA9FC", "#FF6FB5", "#9B5CFF"];

function Piece({ x, delay, drift, spin, colour, w, h, fall }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 1900, easing: Easing.out(Easing.quad) }));
  }, [p, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: p.value < 0.8 ? 1 : (1 - p.value) * 5,
    transform: [
      { translateY: -20 + p.value * fall },
      { translateX: p.value * drift },
      { rotate: `${p.value * spin}deg` },
    ],
  }));
  return <Animated.View style={[{ position: "absolute", top: 0, left: `${x}%`, width: w, height: h, borderRadius: 1.5, backgroundColor: colour }, style]} />;
}

export default function Confetti({ seed = "win", count = 34, height = 420 }) {
  const pieces = useMemo(() => {
    const rnd = seededRandom(`confetti:${seed}`);
    return Array.from({ length: count }, (_, i) => ({
      key: i,
      x: rnd() * 100,
      delay: rnd() * 350,
      drift: (rnd() - 0.5) * 80,
      spin: (rnd() - 0.5) * 720,
      colour: COLOURS[i % COLOURS.length],
      w: 5 + rnd() * 4,
      h: 8 + rnd() * 6,
      fall: height * (0.55 + rnd() * 0.45),
    }));
  }, [seed, count, height]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
      {pieces.map(({ key, ...p }) => (
        <Piece key={key} {...p} />
      ))}
    </View>
  );
}
