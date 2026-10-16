// Slow, soft, layered light: three blurred ribbons (two blues and a touch of
// violet) drifting against each other on a near-black field, with the kit's
// grain. One canvas, one layer, so it can sit behind a whole hero.
//
//   <Aurora style={StyleSheet.absoluteFill} />                     the sky itself
//   <Aurora field={false} opacity={0.5} />                          light only, over a photo
//
// colours: three CSS colours. speed: 1 is the slow default. intensity: how
// bright the ribbons. opacity: of the whole layer. field: draw the dark sky
// under the light (off to lay the light over something else). Fills its
// parent unless given a size in style.

import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSkiaReady } from "../skia";
import { useLiveCanvas } from "./clock";

const shaderParts = () => require("./parts");

export function Aurora({ colours, speed = 1, intensity = 1, opacity = 1, field = true, paused = false, children, style }) {
  const ready = useSkiaReady();
  const { ref, onLayout, size, clock } = useLiveCanvas({ paused: paused || speed <= 0 });
  let light = null;
  if (ready && size) {
    const { AuroraCanvas } = shaderParts();
    light = <AuroraCanvas width={size.width} height={size.height} clock={clock} colours={colours} speed={speed} intensity={intensity} field={field} />;
  } else if (field) {
    light = <LinearGradient colors={["#02040a", "#071a3f", "#02050c"]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />;
  }
  return (
    <View ref={ref} onLayout={onLayout} pointerEvents={children ? "box-none" : "none"} style={[StyleSheet.absoluteFill, style]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>{light}</View>
      {children}
    </View>
  );
}
