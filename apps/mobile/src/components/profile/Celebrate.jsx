// A quick confetti burst for big moments (new plan, reward unlocked). Mount it
// with a changing `burst` number; each change fires one burst.

import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

const COUNT = 36;

function Particle({ angle, dist, size, colour, delay, spin, round, originY }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 1300, easing: Easing.out(Easing.cubic) }));
  }, [p, delay]);
  const style = useAnimatedStyle(() => {
    const t = p.value;
    return {
      opacity: t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25,
      transform: [
        { translateX: Math.cos(angle) * dist * t },
        { translateY: Math.sin(angle) * dist * t + 260 * t * t },
        { rotate: `${spin * t}deg` },
        { scale: t < 0.1 ? t * 10 : 1 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        { position: "absolute", left: "50%", top: originY, width: size, height: round ? size : size * 0.45, borderRadius: round ? size : 2, backgroundColor: colour },
        style,
      ]}
    />
  );
}

export default function Celebrate({ burst = 0, colours = ["#00ff7f", "#ffffff", "#7cc4ff", "#ffd700", "#e5e4e2"], originY = "38%" }) {
  const parts = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        angle: -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.6,
        dist: 120 + Math.random() * 180,
        size: 7 + Math.random() * 7,
        colour: colours[i % colours.length],
        delay: Math.random() * 120,
        spin: (Math.random() - 0.5) * 720,
        round: i % 3 === 0,
      })),
    // A fresh set of particles for every burst.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [burst]
  );
  if (!burst) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {parts.map((pt, i) => (
        <Particle key={`${burst}-${i}`} {...pt} originY={originY} />
      ))}
    </View>
  );
}
