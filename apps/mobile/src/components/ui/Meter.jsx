// The prototype's .oh-bar: a recessed track with a glowing gradient fill that
// eases to its value, a band of light flowing along it and, optionally, a
// bright cap at the leading end.
//
//   <Meter value={0.62} />                     .oh-bar (10px, the default)
//   <Meter value={0.62} size="sm" />           .oh-bar, 6px, inside rows
//   <Meter value={0.62} size="lg" cap />       a goal or fair score bar
//   <Meter value={0.4} tone="red" />           the opponent, in a 1v1
//   <Meter value={0.3} tone="grey" flow={false} />   locked or past

import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useLayoutSize } from "./layout";
import { EASE, FINISH } from "./tokens";

export const METER_TONES = {
  blue: { fill: FINISH.bar, stops: FINISH.barStops, glow: "rgba(61,139,255,0.55)", cap: "#82b4ff" },
  red: { fill: ["#a91c25", "#ff4d55", "#ff8b92"], stops: FINISH.barStops, glow: "rgba(255,77,85,0.5)", cap: "#ff8b92" },
  gold: { fill: ["#b9861f", "#f5c451", "#ffe39a"], stops: FINISH.barStops, glow: "rgba(245,196,81,0.45)", cap: "#ffe39a" },
  grey: { fill: ["#3a404c", "#5d6574", "#8a93a3"], stops: FINISH.barStops, glow: null, cap: "#c4cad4" },
};

const SIZES = { sm: 6, md: 10, lg: 14 };
const EXPO = Easing.bezier(...EASE.expo);

/** The band of light flowing along the fill (.oh-bar i::before, oh-flow). */
function Flow({ width }) {
  const reduce = useReducedMotion();
  const x = useSharedValue(-1.2);
  useEffect(() => {
    if (reduce || !width) return undefined;
    // 40% wide, from -120% to 320% of its own width over 60% of 2.8s, after 1.4s
    x.value = withDelay(1400, withRepeat(withSequence(withTiming(3.2, { duration: 1680, easing: Easing.inOut(Easing.quad) }), withTiming(3.2, { duration: 1120 }), withTiming(-1.2, { duration: 0 })), -1, false));
    return () => cancelAnimation(x);
  }, [reduce, width, x]);
  const band = width * 0.4;
  const move = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * band }] }));
  if (!width) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.flow, { width: band }, move]}>
      <LinearGradient colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.45)", "rgba(255,255,255,0)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

/**
 * value: 0 to 1. size: sm (6) | md (10) | lg (14), or a number of px.
 * tone: blue | red | gold | grey. flow: the moving band of light. cap: the
 * bright dot at the end. glow: the coloured bloom round the fill.
 * duration: how long the fill takes to ease to a new value.
 */
export function Meter({ value = 0, size = "md", tone = "blue", flow = true, cap = false, glow = true, duration = 1400, track, style }) {
  const h = typeof size === "number" ? size : SIZES[size] || SIZES.md;
  const t = METER_TONES[tone] || METER_TONES.blue;
  const [box, onLayout] = useLayoutSize();
  const p = useSharedValue(0);
  const v = Math.max(0, Math.min(1, Number(value) || 0));
  useEffect(() => {
    p.value = withTiming(v, { duration, easing: EXPO });
  }, [v, duration, p]);
  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  const end = useAnimatedStyle(() => ({ left: `${p.value * 100}%`, opacity: p.value > 0.01 ? 1 : 0 }));
  const fillWidth = box ? box.width * v : 0;
  const dot = h >= 10 ? 9 : 6;
  return (
    <View onLayout={onLayout} style={[styles.track, { height: h, borderRadius: h }, track ? { backgroundColor: track } : null, style]}>
      <Animated.View style={[{ height: h, borderRadius: h }, glow && t.glow ? { boxShadow: `0 0 14px ${t.glow}` } : null, fill]}>
        <View style={[StyleSheet.absoluteFill, { borderRadius: h, overflow: "hidden" }]}>
          <LinearGradient colors={t.fill} locations={t.stops} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          {flow && fillWidth > h ? <Flow width={fillWidth} /> : null}
        </View>
      </Animated.View>
      {cap ? <Animated.View pointerEvents="none" style={[styles.cap, { width: dot, height: dot, borderRadius: dot, marginLeft: -dot / 2, marginTop: -dot / 2, boxShadow: `0 0 10px 2px ${t.cap}` }, end]} /> : null}
    </View>
  );
}

/**
 * The tug of war in a 1v1 (.oh-tug): your blue share from the left, their
 * red from the right, both glowing, and a white spark where they meet.
 * share: your fraction, 0 to 1.
 */
export function TugBar({ share = 0.5, height = 8, style }) {
  const p = useSharedValue(0.5);
  const v = Math.max(0.02, Math.min(0.98, Number(share) || 0.5));
  useEffect(() => {
    p.value = withTiming(v, { duration: 1400, easing: EXPO });
  }, [v, p]);
  const mine = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  const spark = useAnimatedStyle(() => ({ left: `${p.value * 100}%` }));
  return (
    <View style={[{ height, borderRadius: height, flexDirection: "row", backgroundColor: "rgba(255,255,255,0.05)" }, style]}>
      <Animated.View style={[{ height, borderTopLeftRadius: height, borderBottomLeftRadius: height, boxShadow: "0 0 14px rgba(61,139,255,0.5)" }, mine]}>
        <LinearGradient colors={["#1f55d0", "#3d8bff"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[StyleSheet.absoluteFill, { borderTopLeftRadius: height, borderBottomLeftRadius: height }]} />
      </Animated.View>
      <View style={{ flex: 1, height, borderTopRightRadius: height, borderBottomRightRadius: height, boxShadow: "0 0 14px rgba(255,77,85,0.4)" }}>
        <LinearGradient colors={["#ff4d55", "#a91c25"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[StyleSheet.absoluteFill, { borderTopRightRadius: height, borderBottomRightRadius: height }]} />
      </View>
      {/* .spark: 4 by 20, white, glowing white then blue */}
      <Animated.View pointerEvents="none" style={[styles.spark, { top: height / 2 - 10 }, spark]} />
    </View>
  );
}

const styles = StyleSheet.create({
  spark: { position: "absolute", width: 4, height: 20, marginLeft: -2, borderRadius: 3, backgroundColor: "#ffffff", boxShadow: "0 0 10px 3px rgba(255,255,255,0.7), 0 0 26px 8px rgba(130,180,255,0.4)" },
  // background rgba(255,255,255,.06), box-shadow inset 0 1px 2px rgba(0,0,0,.6)
  track: { backgroundColor: "rgba(255,255,255,0.06)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.6)" },
  flow: { position: "absolute", top: 0, bottom: 0, left: 0 },
  cap: { position: "absolute", top: "50%", backgroundColor: "#ffffff" },
});
