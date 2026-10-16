// Brushed metal with a light that sweeps across it (the Black card's finish):
// fine horizontal brushing, a soft diagonal band that crosses every six
// seconds on a long ease, and a fainter second band behind it. The brushing
// catches the light, so the highlight reads as metal rather than a stripe.
//
//   <Sheen tone="black" radius={20}>...card content...</Sheen>
//   <Sheen tone="silver" intensity={0.6} style={StyleSheet.absoluteFill} />
//
// tone: silver | black | blue. speed: 1 is a pass every 6s. angle: of the
// band, degrees. intensity: how bright the light. radius: of the corners.
// children lay over the metal. Until Skia is ready it is a plain gradient.

import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSkiaReady } from "../skia";
import { useLiveCanvas } from "./clock";

const shaderParts = () => require("./parts");

const FALLBACK = {
  silver: ["#a6aeb8", "#737b86", "#9aa3ae"],
  black: ["#262b33", "#111419", "#1a1e25"],
  blue: ["#3a7bff", "#1b3f8f", "#2a6af0"],
};

export function Sheen({ tone = "silver", speed = 1, angle = 35, intensity = 1, radius = 20, paused = false, children, style, contentStyle }) {
  const ready = useSkiaReady();
  const { ref, onLayout, size, clock } = useLiveCanvas({ paused: paused || speed <= 0 });
  let metal = null;
  if (ready && size) {
    const { SheenCanvas } = shaderParts();
    metal = <SheenCanvas width={size.width} height={size.height} clock={clock} tone={tone} speed={speed} angle={angle} intensity={intensity} radius={radius} />;
  } else {
    metal = <LinearGradient colors={FALLBACK[tone] || FALLBACK.silver} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />;
  }
  return (
    <View ref={ref} onLayout={onLayout} style={[{ borderRadius: radius, overflow: "hidden" }, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>{metal}</View>
      {children != null ? <View style={[{ flex: 1 }, contentStyle]}>{children}</View> : null}
    </View>
  );
}
