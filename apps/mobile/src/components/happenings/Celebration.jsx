// A short confetti burst with a headline, laid over the screen after a win
// (checking in, reserving a drop). Renders nothing until `trigger` changes.

import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { C, F } from "@/components/ui";

const COLOURS = [C.accent, C.gold, "#3DA9FC", "#FF6B35", "#9B5CFF", C.text];

function Particle({ angle, distance, colour, size, delay }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [p, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: p.value < 0.7 ? 1 : 1 - (p.value - 0.7) / 0.3,
    transform: [
      { translateX: Math.cos(angle) * distance * p.value },
      { translateY: Math.sin(angle) * distance * p.value + 60 * p.value * p.value },
      { rotate: `${p.value * 360}deg` },
      { scale: 1 - p.value * 0.3 },
    ],
  }));
  return <Animated.View style={[{ position: "absolute", width: size, height: size * 0.6, borderRadius: 2, backgroundColor: colour }, style]} />;
}

function Burst({ title, subtitle }) {
  const pop = useSharedValue(0);
  useEffect(() => {
    pop.value = withSequence(withSpring(1, { damping: 9, stiffness: 180 }), withDelay(900, withTiming(0, { duration: 260 })));
  }, [pop]);
  const textStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.value * 1.4), transform: [{ scale: 0.6 + pop.value * 0.4 }] }));
  const parts = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        angle: (i / 26) * Math.PI * 2 + (i % 3) * 0.2,
        distance: 110 + (i % 5) * 26,
        colour: COLOURS[i % COLOURS.length],
        size: 8 + (i % 4) * 2,
        delay: (i % 4) * 30,
      })),
    [],
  );
  return (
    <View pointerEvents="none" style={styles.root}>
      <View style={styles.centre}>
        {parts.map((p, i) => (
          <Particle key={i} {...p} />
        ))}
        <Animated.View style={[styles.badge, textStyle]}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </Animated.View>
      </View>
    </View>
  );
}

/** Pass a new `trigger` value (e.g. Date.now()) to fire the burst. */
export default function Celebration({ trigger, title, subtitle }) {
  const [shown, setShown] = useState(null);
  useEffect(() => {
    if (!trigger) return undefined;
    setShown(trigger);
    const t = setTimeout(() => setShown(null), 1500);
    return () => clearTimeout(t);
  }, [trigger]);
  if (!shown) return null;
  return <Burst key={shown} title={title} subtitle={subtitle} />;
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", zIndex: 50 },
  centre: { alignItems: "center", justifyContent: "center", marginTop: -80 },
  badge: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 16, borderRadius: 24, backgroundColor: "rgba(18,18,20,0.94)" },
  title: { color: C.text, fontFamily: F.display, fontSize: 40, letterSpacing: -1 },
  subtitle: { color: C.textDim, fontSize: 14, fontWeight: "600", marginTop: 2 },
});
