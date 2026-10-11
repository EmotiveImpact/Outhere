// Lightweight route thumbnail drawn with SVG. Works everywhere (lists, web)
// without mounting a map.

import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { Route } from "lucide-react-native";
import { C, R } from "@/components/ui";
import { isCoord } from "./geo";

export default function RoutePreview({ route = [], height = 120, radius = R.md, strokeWidth = 3.5, style }) {
  const [width, setWidth] = useState(0);
  const pts = useMemo(() => (route || []).filter(isCoord), [route]);

  const geometry = useMemo(() => {
    if (pts.length < 2 || !width) return null;
    const pad = 14;
    const midLat = (Math.max(...pts.map((p) => p.latitude)) + Math.min(...pts.map((p) => p.latitude))) / 2;
    const kx = Math.cos((midLat * Math.PI) / 180); // keep shapes in proportion
    const xs = pts.map((p) => p.longitude * kx);
    const ys = pts.map((p) => -p.latitude);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const spanX = Math.max(...xs) - minX || 1e-6;
    const spanY = Math.max(...ys) - minY || 1e-6;
    const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
    const offX = (width - spanX * scale) / 2;
    const offY = (height - spanY * scale) / 2;
    const xy = xs.map((x, i) => [offX + (x - minX) * scale, offY + (ys[i] - minY) * scale]);
    const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    return { d, start: xy[0], end: xy[xy.length - 1] };
  }, [pts, width, height]);

  return (
    <View style={[styles.box, { height, borderRadius: radius }, style]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {geometry ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="route" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={C.accent} />
              <Stop offset="1" stopColor="#b6ffd9" />
            </LinearGradient>
          </Defs>
          <Path d={geometry.d} stroke="url(#route)" strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={geometry.start[0]} cy={geometry.start[1]} r={4.5} fill={C.accent} stroke={C.bg} strokeWidth={2} />
          <Circle cx={geometry.end[0]} cy={geometry.end[1]} r={4.5} fill="#fff" stroke={C.bg} strokeWidth={2} />
        </Svg>
      ) : (
        <View style={styles.empty}>
          <Route size={22} color={C.textMute} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: "#0f1110", borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
});
