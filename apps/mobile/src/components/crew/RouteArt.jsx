// A run's route drawn as a glowing blue line on a dark street grid. Used on
// route cards in the chat, run posts in the feed and story stickers. Points
// are [lat, lng] pairs; the line keeps its true shape and fits the box.

import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { C } from "@/components/ui";
import { noise } from "@/data/random";

const W = 320;
const H = 160;

const project = (points, w, h, pad) => {
  const pts = (points || []).filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  if (pts.length < 2) return null;
  const midLat = pts.reduce((sum, p) => sum + p[0], 0) / pts.length;
  const k = Math.cos((midLat * Math.PI) / 180);
  const xs = pts.map((p) => p[1] * k);
  const ys = pts.map((p) => -p[0]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(1e-6, Math.max(...xs) - minX);
  const spanY = Math.max(1e-6, Math.max(...ys) - minY);
  const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY);
  const offX = (w - spanX * scale) / 2;
  const offY = (h - spanY * scale) / 2;
  return xs.map((x, i) => [offX + (x - minX) * scale, offY + (ys[i] - minY) * scale]);
};

export default function RouteArt({ points, seed = "route", height = 150, radius = 16, style, children }) {
  const line = useMemo(() => project(points, W, H, 22), [points]);
  // A few streets and the river, so the line sits on something.
  const streets = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const a = noise(`${seed}:s${i}`);
        const b = noise(`${seed}:e${i}`);
        return i % 2 ? [0, a * H, W, b * H] : [a * W, 0, b * W, H];
      }),
    [seed],
  );
  const river = useMemo(() => {
    const y = 30 + noise(`${seed}:river`) * (H - 60);
    return Array.from({ length: 9 }, (_, i) => `${(i / 8) * W},${y + Math.sin(i * 0.9 + noise(seed) * 6) * 14}`).join(" ");
  }, [seed]);
  const str = line ? line.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ") : "";
  return (
    <View style={[{ height, borderRadius: radius, overflow: "hidden", backgroundColor: "#0c121c" }, style]}>
      <LinearGradient colors={["#122033", "#0a0f17"]} style={StyleSheet.absoluteFill} />
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
        <Polyline points={river} fill="none" stroke="#173356" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
        {streets.map(([x1, y1, x2, y2], i) => (
          <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1f2a3a" strokeWidth={i % 3 ? 1.2 : 2.4} />
        ))}
        {line ? (
          <>
            <Polyline points={str} fill="none" stroke={C.accent} strokeOpacity={0.28} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
            <Polyline points={str} fill="none" stroke="#4f9bff" strokeWidth={3.6} strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx={line[0][0]} cy={line[0][1]} r={5.5} fill="#fff" stroke={C.accent} strokeWidth={2.5} />
          </>
        ) : null}
      </Svg>
      {children}
    </View>
  );
}
