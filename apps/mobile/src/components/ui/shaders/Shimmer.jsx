// Heat and liquid for the bars.
//
// Shimmer is the live tug of war: blue from the left, red from the right,
// a travelling refraction ripple through the fill, light flowing towards the
// middle and a hot white core where the two meet. TugBar draws it when
// `live` is on; it fills the bar's box and bleeds a little for the glow.
//
// LiquidBar is a Meter's fill as a liquid: a bright meniscus along the top,
// a slow surface wave, a trembling leading edge with a rim of light.
//
// LiquidRing is the same liquid as an arc, for the step ring: the fill runs
// round from the top with a wave at its leading edge.
//
// All three take a Reanimated shared value for the amount, so they ease with
// the bar they belong to. Until Skia is ready they render nothing, and the
// plain bar underneath shows.

import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { useSkiaReady } from "../skia";
import { EASE } from "../tokens";
import { useLiveCanvas } from "./clock";

const shaderParts = () => require("./parts");
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
export function Shimmer({ share = 0.5, height = 8, bleed = 12, paused = false, style }) {
  const ready = useSkiaReady();
  const { ref, onLayout, size, clock } = useLiveCanvas({ paused });
  const p = useAmount(share);
  let bar = null;
  if (ready && size) {
    const { TugCanvas } = shaderParts();
    bar = <TugCanvas width={size.width} height={height} bleed={bleed} clock={clock} share={p} />;
  }
  return (
    <View ref={ref} onLayout={onLayout} pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, top: -bleed, height: height + bleed * 2 }, style]}>
      {bar}
    </View>
  );
}

/** A Meter's liquid fill. progress: a shared value 0 to 1. Fills the track it sits in. */
export function LiquidBar({ progress, tone = "blue", paused = false, style }) {
  const ready = useSkiaReady();
  const { ref, onLayout, size, clock } = useLiveCanvas({ paused });
  const p = useAmount(progress);
  let fill = null;
  if (ready && size) {
    const { LiquidBarCanvas } = shaderParts();
    fill = <LiquidBarCanvas width={size.width} height={size.height} clock={clock} progress={p} tone={tone} />;
  }
  return (
    <View ref={ref} onLayout={onLayout} pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      {fill}
    </View>
  );
}

/**
 * A liquid arc. value: 0 to 1 (a number or a shared value). size and stroke
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
    const { LiquidRingCanvas } = shaderParts();
    ring = <LiquidRingCanvas size={size} stroke={stroke} clock={clock} progress={p} tone={tone} track={track} />;
  }
  return (
    <View ref={ref} onLayout={onLayout} style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>{ring}</View>
      {children}
    </View>
  );
}
