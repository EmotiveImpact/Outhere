// The on/off switch. A recessed track that fills with the blue that acts, a
// lit white thumb that springs across, and a soft blue glow when it is on.
// The thumb stretches a little while it is held, as on iOS. One look for
// every switch in the app.
//
//   <Toggle value={on} onChange={setOn} label="Show me on the map" />

import React, { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { hapticSelection } from "@/services/haptics";
import { FINISH } from "./tokens";

const W = 50;
const H = 30;
const PAD = 3;
const KNOB = H - PAD * 2;
const STRETCH = 6;
const SPRING = { damping: 16, stiffness: 300, mass: 0.7 };

const TRACK_OFF = ["#0b0d11", "#14171d"];
const GLOSS = ["rgba(255,255,255,0.2)", "rgba(255,255,255,0.04)", "rgba(255,255,255,0)"];
const KNOB_BODY = ["#ffffff", "#e2e7ef"];

export function Toggle({ value, onChange, disabled = false, label, style }) {
  const on = !!value;
  const t = useSharedValue(on ? 1 : 0);
  const held = useSharedValue(0);
  useEffect(() => {
    t.value = withSpring(on ? 1 : 0, SPRING);
  }, [on, t]);
  const fill = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, t.value)) }));
  const knob = useAnimatedStyle(() => {
    const w = KNOB + held.value * STRETCH;
    return { width: w, transform: [{ translateX: t.value * (W - PAD * 2 - w) }] };
  });
  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => {
        held.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) });
      }}
      onPressOut={() => {
        held.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) });
      }}
      onPress={() => {
        hapticSelection();
        onChange?.(!on);
      }}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: on, disabled }}
      accessibilityLabel={label}
      style={[{ opacity: disabled ? 0.45 : 1 }, style]}
    >
      <View style={styles.frame}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glow, fill]} />
        <View style={styles.track}>
          <LinearGradient colors={TRACK_OFF} style={StyleSheet.absoluteFill} />
          <Animated.View style={[StyleSheet.absoluteFill, fill]}>
            <LinearGradient colors={FINISH.act} locations={FINISH.actStops} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={GLOSS} locations={[0, 0.5, 0.6]} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.trackEdge]} />
        </View>
        <Animated.View style={[styles.knob, knob]}>
          <View style={styles.knobBody}>
            <LinearGradient colors={KNOB_BODY} style={StyleSheet.absoluteFill} />
          </View>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: { width: W, height: H, borderRadius: H / 2, boxShadow: "0 1px 0 rgba(255,255,255,0.05)" },
  glow: { borderRadius: H / 2, boxShadow: "0 0 0 1px rgba(61,139,255,0.35), 0 6px 16px -6px rgba(42,106,240,0.9)" },
  track: { ...StyleSheet.absoluteFill, borderRadius: H / 2, overflow: "hidden" },
  trackEdge: { borderRadius: H / 2, boxShadow: "inset 0 1px 2px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.07)" },
  knob: { position: "absolute", top: PAD, left: PAD, height: KNOB, borderRadius: KNOB / 2, boxShadow: "0 2px 5px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(0,0,0,0.2)" },
  knobBody: { ...StyleSheet.absoluteFill, borderRadius: KNOB / 2, overflow: "hidden" },
});
