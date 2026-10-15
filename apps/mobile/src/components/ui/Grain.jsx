// Film grain, the prototype's .phone::after: fractal noise at a whisper,
// lightening and darkening like an overlay. Lay it over photos, heroes and
// countdowns; the root layout lays one over the whole app.
//
//   <Grain />                 .phone::after, opacity .05
//   <Grain amount={0.07} />   .oh-slab::before and .oh-hype::before

import React from "react";
import { StyleSheet, View } from "react-native";
import { useLayoutSize } from "./layout";
import { skiaParts, useSkiaReady } from "./skia";

export function Grain({ amount = 0.05, style }) {
  const ready = useSkiaReady();
  const [size, onLayout] = useLayoutSize();
  let grain = null;
  if (ready && size) {
    const { GrainCanvas } = skiaParts();
    grain = <GrainCanvas width={size.width} height={size.height} amount={amount} />;
  }
  return (
    <View pointerEvents="none" onLayout={onLayout} style={[StyleSheet.absoluteFill, style]}>
      {grain}
    </View>
  );
}
