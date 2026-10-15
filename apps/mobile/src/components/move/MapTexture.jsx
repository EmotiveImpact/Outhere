// The prototype's map (.mapx): its night street texture, tinted blue
// (--map-filter, baked into map-blue.jpg), with the route lit and glowing on
// top, faces and dots for people, and the shade along the top and bottom
// edges (.mapx::after).
//
// MapTiles   the texture laid over a projected map, pinned to the ground so
//            streets stay put as you move. Mirrored tiles, so no seams.
// MapShade   the top and bottom shade.
// MapArt     a still map that fits one or more lines into its box: route
//            thumbnails, the run summary card, the run review, heroes.
//
// Lines and faces follow the prototype's helpers: path() draws a wide soft
// glow under each line, face() a photo in a ring, dotp() a lit dot.

import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, G, Polyline } from "react-native-svg";
import { C } from "@/components/ui";
import { isCoord } from "./geo";

export const MAP_TEXTURES = {
  blue: require("../../../assets/images/move/map-blue.jpg"),
  grey: require("../../../assets/images/move/map-grey.jpg"),
};

const TEX_W = 940;
const TEX_H = 1680;
const M_PER_TEX = 2.2; // metres of ground per texture pixel
const M_PER_DEG = 111320;
const MAX_TILES = 40;

/** Longitude metres per degree, fixed per half degree of latitude so tiles never drift. */
const kxFor = (lat) => Math.cos(((Math.round(lat * 2) / 2) * Math.PI) / 180);

/**
 * The texture under a projected map. project maps { latitude, longitude } to
 * px; centre and mpp (metres per px) say what the box shows.
 */
export function MapTiles({ project, centre, mpp, w, h, tone = "blue", blur = 0, opacity = 1 }) {
  const tiles = useMemo(() => {
    if (!project || !centre || !w || !h || !mpp) return [];
    const kx = kxFor(centre.latitude);
    const tileLat = (TEX_H * M_PER_TEX) / M_PER_DEG;
    const tileLon = (TEX_W * M_PER_TEX) / (M_PER_DEG * kx);
    const spanLat = ((h * mpp) / M_PER_DEG) * 0.75 + tileLat;
    const spanLon = ((w * mpp) / (M_PER_DEG * kx)) * 0.75 + tileLon;
    const j0 = Math.floor((centre.latitude - spanLat) / tileLat);
    const j1 = Math.floor((centre.latitude + spanLat) / tileLat);
    const i0 = Math.floor((centre.longitude - spanLon) / tileLon);
    const i1 = Math.floor((centre.longitude + spanLon) / tileLon);
    const out = [];
    for (let j = j0; j <= j1; j += 1) {
      for (let i = i0; i <= i1; i += 1) {
        if (out.length >= MAX_TILES) break;
        const a = project({ latitude: (j + 1) * tileLat, longitude: i * tileLon });
        const b = project({ latitude: j * tileLat, longitude: (i + 1) * tileLon });
        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);
        const tw = Math.abs(b.x - a.x);
        const th = Math.abs(b.y - a.y);
        if (x > w || y > h || x + tw < 0 || y + th < 0) continue;
        out.push({ key: `${i}:${j}`, x, y, tw, th, fx: Math.abs(i) % 2 === 1, fy: Math.abs(j) % 2 === 1 });
      }
    }
    return out;
  }, [project, centre?.latitude, centre?.longitude, mpp, w, h]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      {tiles.map((t) => (
        <Image
          key={t.key}
          source={MAP_TEXTURES[tone] || MAP_TEXTURES.blue}
          blurRadius={blur}
          contentFit="fill"
          cachePolicy="memory-disk"
          style={{ position: "absolute", left: t.x - 0.5, top: t.y - 0.5, width: t.tw + 1, height: t.th + 1, transform: [{ scaleX: t.fx ? -1 : 1 }, { scaleY: t.fy ? -1 : 1 }] }}
        />
      ))}
    </View>
  );
}

/** .mapx::after: shade along the top and bottom edges so chips and sheets read. */
export function MapShade({ top = 0.6, bottom = 0.7, stops = [0.2, 0.62] }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[`rgba(4,7,12,${top})`, "rgba(4,7,12,0)", "rgba(4,7,12,0)", `rgba(4,7,12,${bottom})`]}
      locations={[0, stops[0], stops[1], 1]}
      style={StyleSheet.absoluteFill}
    />
  );
}

/** path(): a glowing line. The glow is two wide, faint strokes underneath. */
export function GlowLine({ points, colour = C.accent, width = 7, glow = true, dash, opacity = 1 }) {
  if (!points) return null;
  return (
    <G opacity={opacity}>
      {glow ? <Polyline points={points} stroke={colour} strokeOpacity={0.1} strokeWidth={width * 3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {glow ? <Polyline points={points} stroke={colour} strokeOpacity={0.2} strokeWidth={width * 2.1} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
      <Polyline points={points} stroke={colour} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} />
    </G>
  );
}

/** dotp(): someone out now, a lit dot with a soft halo. */
export function LitDot({ x, y, r = 7 }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={r * 2.1} fill="rgba(130,180,255,0.18)" />
      <Circle cx={x} cy={y} r={r} fill="#9cc4ff" stroke="#07090c" strokeWidth={3} />
    </G>
  );
}

const boundsOf = (pts) => {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  pts.forEach((p) => {
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
    minLon = Math.min(minLon, p.longitude);
    maxLon = Math.max(maxLon, p.longitude);
  });
  return { minLat, maxLat, minLon, maxLon };
};

/** Fits coordinates into a w by h box with padding; returns project and what it shows. */
export function fitView(coords, w, h, pad = {}) {
  const pts = (coords || []).filter(isCoord);
  if (!pts.length || !w || !h) return null;
  const p = { top: 24, right: 24, bottom: 24, left: 24, ...pad };
  const b = boundsOf(pts);
  const centre = { latitude: (b.minLat + b.maxLat) / 2, longitude: (b.minLon + b.maxLon) / 2 };
  const kx = Math.cos((centre.latitude * Math.PI) / 180);
  const spanX = Math.max(120, (b.maxLon - b.minLon) * M_PER_DEG * kx);
  const spanY = Math.max(120, (b.maxLat - b.minLat) * M_PER_DEG);
  const mpp = Math.max(spanX / Math.max(40, w - p.left - p.right), spanY / Math.max(40, h - p.top - p.bottom), 0.6);
  const cx = p.left + (w - p.left - p.right) / 2;
  const cy = p.top + (h - p.top - p.bottom) / 2;
  const project = (q) => ({ x: cx + ((q.longitude - centre.longitude) * M_PER_DEG * kx) / mpp, y: cy - ((q.latitude - centre.latitude) * M_PER_DEG) / mpp });
  return { project, centre, mpp };
}

const linePoints = (project, path) =>
  (path || [])
    .filter(isCoord)
    .map((q) => project(q))
    .map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`)
    .join(" ");

/**
 * A still map. lines: [{ path, colour, width, glow, dash }] (the first one is
 * fitted unless fit is given). start / end: draw the prototype's start ring
 * and finish dot on the first line. pad: room round the fitted lines.
 */
export function MapArt({ width, height, lines = [], fit, start = true, end = true, pad, tone = "blue", shade = true, shadeTop = 0.35, shadeBottom = 0.55, style, children }) {
  const view = useMemo(() => {
    const coords = fit || lines[0]?.path || [];
    return fitView(coords, width, height, pad);
  }, [fit, lines, width, height, pad]);
  const first = (lines[0]?.path || []).filter(isCoord);
  const a = view && start && first.length ? view.project(first[0]) : null;
  const z = view && end && first.length > 1 ? view.project(first[first.length - 1]) : null;
  return (
    <View style={[{ width, height, overflow: "hidden", backgroundColor: "#05080e" }, style]}>
      {view ? <MapTiles project={view.project} centre={view.centre} mpp={view.mpp} w={width} h={height} tone={tone} /> : null}
      {shade ? <MapShade top={shadeTop} bottom={shadeBottom} /> : null}
      {view ? (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
          {lines.map((l, i) => (
            <GlowLine key={i} points={linePoints(view.project, l.path)} colour={l.colour || C.accent} width={l.width || 7} glow={l.glow !== false} dash={l.dash} opacity={l.opacity ?? 1} />
          ))}
          {a ? <Circle cx={a.x} cy={a.y} r={7} fill="#07090c" stroke="#82b4ff" strokeWidth={3.5} /> : null}
          {z ? <Circle cx={z.x} cy={z.y} r={8.5} fill={C.accent} stroke="#fff" strokeWidth={3.5} /> : null}
        </Svg>
      ) : null}
      {children}
    </View>
  );
}
