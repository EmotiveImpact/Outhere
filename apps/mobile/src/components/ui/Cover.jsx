// Image surface for events, drops, news and crews. Underneath every photo sits
// a generated "night route" artwork in the item's accent colour, so a card
// still looks designed while the photo loads, offline, or if it fails.

import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path } from "react-native-svg";
import { seededRandom } from "@/data/random";

/** Accepts a remote URL string or a bundled require() number. */
export const imageSource = (src) => (src == null ? null : typeof src === "number" ? src : typeof src === "string" ? { uri: src } : src);

const ACCENTS = ["#00ff7f", "#3DA9FC", "#9B5CFF", "#FF6B35", "#FFD700", "#00d4aa"];

export const accentFor = (seed = "") => {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
};

function RouteArt({ seed, accent }) {
  const paths = useMemo(() => {
    const rnd = seededRandom(`cover:${seed}`);
    const lines = [];
    for (let l = 0; l < 5; l += 1) {
      let x = rnd() * 20;
      let y = 20 + rnd() * 60;
      let d = `M ${x} ${y}`;
      for (let s = 0; s < 4; s += 1) {
        const nx = x + 20 + rnd() * 15;
        const ny = Math.max(5, Math.min(95, y + (rnd() - 0.5) * 50));
        d += ` Q ${x + (nx - x) / 2} ${ny + (rnd() - 0.5) * 30} ${nx} ${ny}`;
        x = nx;
        y = ny;
      }
      lines.push({ d, w: l === 0 ? 1.6 : 0.5 + rnd() * 0.6, o: l === 0 ? 0.95 : 0.18 + rnd() * 0.25 });
    }
    const dots = Array.from({ length: 18 }, () => ({ cx: rnd() * 100, cy: rnd() * 100, r: 0.4 + rnd() * 0.9, o: 0.15 + rnd() * 0.4 }));
    return { lines, dots };
  }, [seed]);

  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
      {paths.dots.map((dot, i) => (
        <Circle key={i} cx={dot.cx} cy={dot.cy} r={dot.r} fill={accent} opacity={dot.o} />
      ))}
      {paths.lines.map((line, i) => (
        <Path key={i} d={line.d} stroke={accent} strokeWidth={line.w} fill="none" opacity={line.o} strokeLinecap="round" />
      ))}
    </Svg>
  );
}

/**
 * Cover image with generated fallback art.
 * - `source`: URL string or require() number (optional)
 * - `seed`: stable id so the art is the same every time
 * - `accent`: art colour (defaults to one picked from the seed)
 * - `scrim`: darken the bottom for text laid over the image
 */
export function Cover({ source, seed = "outhere", accent, scrim = false, style, children, contentFit = "cover" }) {
  const colour = accent || accentFor(seed);
  const src = imageSource(source);
  return (
    <View style={[{ overflow: "hidden", backgroundColor: "#0d0f0e" }, style]}>
      <LinearGradient
        colors={[`${colour}40`, "#0d0f0e", "#07130c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <RouteArt seed={seed} accent={colour} />
      {src ? <Image source={src} style={StyleSheet.absoluteFill} contentFit={contentFit} transition={250} /> : null}
      {scrim ? (
        <LinearGradient colors={["transparent", "rgba(10,10,10,0.55)", "rgba(10,10,10,0.95)"]} locations={[0.3, 0.7, 1]} style={StyleSheet.absoluteFill} />
      ) : null}
      {children}
    </View>
  );
}

export default Cover;
