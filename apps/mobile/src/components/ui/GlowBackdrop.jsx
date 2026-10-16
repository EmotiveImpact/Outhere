// Blue light behind heroes, countdowns and whole screens, drawn with Skia so
// the gradients are smooth (dithered, no banding on dark blues). Presets are
// the prototype's own radial gradients, see glows.js.
//
//   <GlowBackdrop preset="slab" />                 the hero slab
//   <GlowBackdrop preset="screen" />               ambient light behind a screen
//   <GlowBackdrop preset="orb" breathe style={{ width: 260, height: 260 }} />
//   <GlowBackdrop layers={[{ x, y, rx, ry, stops }]} base="#030407" />

import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { GLOWS } from "./glows";
import { useLayoutSize } from "./layout";
import { skiaParts, useSkiaReady } from "./skia";

let svgId = 0;

// Before Skia is ready (the web, for a moment) the same light as SVG.
function SvgGlow({ width, height, layers }) {
  const ids = useMemo(() => layers.map(() => `glowbk${(svgId += 1)}`), [layers]);
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        {layers.map((l, i) => (
          <RadialGradient key={ids[i]} id={ids[i]} cx={l.x * width} cy={l.y * height} rx={l.rx * width} ry={l.ry * height} fx={l.x * width} fy={l.y * height} gradientUnits="userSpaceOnUse">
            {l.stops.map(([p, c], j) => (
              <Stop key={j} offset={p} stopColor={c} />
            ))}
          </RadialGradient>
        ))}
      </Defs>
      {layers.map((l, i) => (
        <Rect key={ids[i]} x={0} y={0} width={width} height={height} fill={`url(#${ids[i]})`} />
      ))}
    </Svg>
  );
}

/**
 * preset: a name from glows.js. layers/base override it. breathe: the slow
 * pulse of .oh-slab .glow (opacity to .55, scale to .92 over 5s).
 */
export function GlowBackdrop({ preset = "slab", layers, base, breathe = false, opacity = 1, style, children }) {
  const ready = useSkiaReady();
  const [size, onLayout] = useLayoutSize();
  const def = GLOWS[preset] || GLOWS.slab;
  const lay = layers || def.layers || [];
  const fill = base !== undefined ? base : def.base;
  const reduce = useReducedMotion();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!breathe || reduce) return;
    pulse.value = withRepeat(withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [breathe, reduce, pulse]);
  const anim = useAnimatedStyle(() => ({ opacity: opacity * (1 - pulse.value * 0.45), transform: [{ scale: 1 - pulse.value * 0.08 }] }));

  let light = null;
  if (size) {
    if (ready) {
      const { GlowCanvas } = skiaParts();
      light = <GlowCanvas width={size.width} height={size.height} layers={lay} />;
    } else {
      light = <SvgGlow width={size.width} height={size.height} layers={lay} />;
    }
  }
  return (
    <View pointerEvents="none" onLayout={onLayout} style={[StyleSheet.absoluteFill, style]}>
      {fill ? <View style={[StyleSheet.absoluteFill, { backgroundColor: fill, opacity }]} /> : null}
      <Animated.View style={[StyleSheet.absoluteFill, anim]}>{light}</Animated.View>
      {children}
    </View>
  );
}
