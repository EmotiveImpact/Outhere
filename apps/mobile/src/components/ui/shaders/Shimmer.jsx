// Light for the bars and the ring, in neon: a steady white-hot core inside
// the colour and a smooth halo round it (see looks.jsx).
//
// Shimmer is the live tug of war: blue from the left, red from the right and
// a white-hot point where they meet. TugBar draws it when `live` is on.
//
// LiquidBar is a Meter's fill, with a clean bright tip at its head.
//
// LiquidRing is the same light as an arc, for the step ring.
//
// Shimmer and LiquidBar take `look`: neon (the default), glass or pulse.
//
// Every one of them blooms past its own edge: the canvas is bigger than the
// bar or ring by `bleed` on each side and sits over it at -bleed, so the glow
// feathers out into the card instead of stopping at a box. All three take a
// Reanimated shared value for the amount, so they ease with the bar they
// belong to. Until Skia is ready they render nothing and the plain bar shows.

import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { useSkiaReady } from "../skia";
import { EASE } from "../tokens";
import { useLiveCanvas } from "./clock";

const shaderLooks = () => require("./looks");
const EXPO = Easing.bezier(...EASE.expo);

/** Turns a number or a shared value into a shared value. */
function useAmount(value, duration = 1400) {
  const own = useSharedValue(typeof value === "number" ? value : 0);
  const isShared = value && typeof value === "object" && "value" in value;
  const n = isShared ? 0 : Math.max(0, Math.min(1, Number(value) || 0));
  useEffect(() => {
    if (isShared) return;
    own.value = withTiming(n, { duration, easing: EXPO });
  }, [n, duration, isShared, own]);
  return isShared ? value : own;
}

/**
 * The live tug bar. share: your fraction 0 to 1 (a number or a shared value).
 * height: the bar. bleed: room above and below for the glow. Absolute: lay
 * it over the bar's box.
 */
export function Shimmer({ share = 0.5, height = 8, bleed = Math.max(14, height * 1.6), look = "neon", paused = false, style }) {
  const ready = useSkiaReady();
  const { ref, onLayout, size, clock } = useLiveCanvas({ paused });
  const p = useAmount(share);
  let bar = null;
  if (ready && size) {
    const { LookTugCanvas } = shaderLooks();
    bar = <LookTugCanvas look={look} width={size.width} height={height} bleed={bleed} clock={clock} share={p} />;
  }
  return (
    <View ref={ref} onLayout={onLayout} pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, top: 0, height }, style]}>
      <View style={{ position: "absolute", left: -bleed, top: -bleed }}>{bar}</View>
    </View>
  );
}

/** A Meter's lit fill. progress: a shared value 0 to 1. Fills the track it sits in and blooms past it. */
export function LiquidBar({ progress, tone = "blue", look = "neon", paused = false, style }) {
  const ready = useSkiaReady();
  const { ref, onLayout, size, clock } = useLiveCanvas({ paused });
  const p = useAmount(progress);
  let fill = null;
  if (ready && size) {
    const bleed = Math.max(14, size.height * 1.8);
    const { LookBarCanvas } = shaderLooks();
    fill = (
      <View style={{ position: "absolute", left: -bleed, top: -bleed }}>
        <LookBarCanvas look={look} width={size.width} height={size.height} bleed={bleed} clock={clock} progress={p} tone={tone} />
      </View>
    );
  }
  return (
    <View ref={ref} onLayout={onLayout} pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      {fill}
    </View>
  );
}

/**
 * A lit arc. value: 0 to 1 (a number or a shared value). size and stroke
 * in px. tone: blue | red | gold | grey. track: the colour of the empty ring
 * (null for none). duration: how long the fill eases. Children sit in the
 * middle. Until Skia is ready it shows `fallback` (or nothing).
 */
export function LiquidRing({ value = 0, size = 220, stroke = 12, tone = "blue", track = "#1b1f26", duration = 1100, paused = false, fallback = null, children, style }) {
  const ready = useSkiaReady();
  const { ref, onLayout, clock } = useLiveCanvas({ paused });
  const p = useAmount(value, duration);
  let ring = fallback;
  if (ready) {
    const { LookRingCanvas } = shaderLooks();
    const bleed = Math.round(stroke * 2.2);
    ring = (
      <View style={{ position: "absolute", left: -bleed, top: -bleed }}>
        <LookRingCanvas size={size} stroke={stroke} bleed={bleed} clock={clock} progress={p} tone={tone} track={track} />
      </View>
    );
  }
  return (
    <View ref={ref} onLayout={onLayout} style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>{ring}</View>
      {children}
    </View>
  );
}
