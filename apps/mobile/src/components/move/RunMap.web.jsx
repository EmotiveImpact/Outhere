// Web stand-in for the Move map. react-native-maps has no web build, so the
// web version draws the same layers (track, routes, numbered points, people,
// dots, the way back) on a dark street texture with SVG, centred on you, and
// turns taps into coordinates so routes can be drawn here too.

import React, { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, G, Path, Polyline, RadialGradient, Rect, Stop } from "react-native-svg";
import { Image } from "expo-image";
import { C, F, imageSource } from "@/components/ui";
import { seededRandom } from "@/data/random";
import { DEFAULT_REGION, isCoord } from "./geo";

const M_PER_DEG = 111320;
const MPP = { map: 3.4, pilot: 1.7, street: 0.75 }; // metres per pixel
const PAD = { top: 120, right: 50, bottom: 320, left: 50 };

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

// Streets that stay put as you move: a jittered grid in degrees, seeded per cell.
function Streets({ project, centre, w, h, mpp }) {
  const step = 0.0022;
  const span = Math.max(w, h) * mpp * 1.6;
  const dLat = span / M_PER_DEG;
  const dLon = dLat / Math.cos((centre.latitude * Math.PI) / 180);
  const lines = [];
  const lat0 = Math.floor((centre.latitude - dLat) / step) * step;
  const lon0 = Math.floor((centre.longitude - dLon) / step) * step;
  for (let lat = lat0, i = 0; lat < centre.latitude + dLat && i < 80; lat += step, i += 1) {
    const r = seededRandom(`la${lat.toFixed(4)}`);
    const pts = [];
    for (let k = 0; k <= 6; k += 1) pts.push(project({ latitude: lat + (r() - 0.5) * step * 0.5, longitude: centre.longitude - dLon + (k * dLon) / 3 }));
    lines.push({ pts, width: r() > 0.8 ? 6 : r() > 0.4 ? 3 : 1.6 });
  }
  for (let lon = lon0, i = 0; lon < centre.longitude + dLon && i < 80; lon += step * 1.4, i += 1) {
    const r = seededRandom(`lo${lon.toFixed(4)}`);
    const pts = [];
    for (let k = 0; k <= 6; k += 1) pts.push(project({ latitude: centre.latitude - dLat + (k * dLat) / 3, longitude: lon + (r() - 0.5) * step * 0.7 }));
    lines.push({ pts, width: r() > 0.8 ? 6 : r() > 0.45 ? 3 : 1.6 });
  }
  const parks = [];
  for (let i = 0; i < 5; i += 1) {
    const r = seededRandom(`park${(centre.latitude * 100).toFixed(0)}${(centre.longitude * 100).toFixed(0)}${i}`);
    const p = project({ latitude: centre.latitude + (r() - 0.5) * dLat, longitude: centre.longitude + (r() - 0.5) * dLon });
    parks.push({ ...p, rw: (80 + r() * 160) / mpp * 1.4, rh: (60 + r() * 140) / mpp * 1.4 });
  }
  const r = seededRandom(`river${centre.latitude.toFixed(2)}`);
  const ry = h * (0.25 + r() * 0.5);
  const river = `M -50 ${ry} C ${w * 0.3} ${ry - 90 * r()}, ${w * 0.6} ${ry + 120 * r()}, ${w + 50} ${ry - 40}`;
  return (
    <G>
      {parks.map((p, i) => (
        <Rect key={`pk${i}`} x={p.x - p.rw / 2} y={p.y - p.rh / 2} width={p.rw} height={p.rh} rx={18} fill="#0f1a16" />
      ))}
      <Path d={river} stroke="#0a1626" strokeWidth={90 / mpp + 10} fill="none" />
      {lines.map((l, i) => (
        <Polyline key={i} points={l.pts.map((p) => `${p.x},${p.y}`).join(" ")} stroke={l.width > 4 ? "#252c38" : "#1a202a"} strokeWidth={l.width} fill="none" strokeLinecap="round" />
      ))}
    </G>
  );
}

const RunMap = forwardRef(function RunMap(
  {
    userLocation,
    follow = false,
    camera = "map",
    segments = [],
    trackColour = C.accent,
    plannedPath = [],
    plannedStyle = "dots",
    waypoints = [],
    routes = [],
    people = [],
    dots = [],
    trails = [],
    rejoin = null,
    userTone = null,
    onPress,
    fitTo,
    padding = PAD,
    showsUser = true,
    style,
  },
  ref,
) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [nudge, setNudge] = useState(0);
  useImperativeHandle(ref, () => ({ recenter: () => setNudge((n) => n + 1), fit: () => setNudge((n) => n + 1) }));

  const view = useMemo(() => {
    const { w, h } = size;
    if (!w || !h) return null;
    const me = isCoord(userLocation) ? userLocation : null;
    const fitPts = (fitTo?.length ? fitTo : !follow ? [...plannedPath, ...routes.flatMap((r) => r.path || [])] : []).filter(isCoord);
    let centre = me || { latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude };
    let mpp = MPP[camera] || MPP.map;
    let cy = h * (camera === "pilot" ? 0.62 : 0.45);
    if (fitPts.length > 1) {
      const b = boundsOf(me && !fitTo?.length ? [...fitPts, me] : fitPts);
      const kx = Math.cos((((b.minLat + b.maxLat) / 2) * Math.PI) / 180);
      const spanX = Math.max(60, (b.maxLon - b.minLon) * M_PER_DEG * kx);
      const spanY = Math.max(60, (b.maxLat - b.minLat) * M_PER_DEG);
      mpp = Math.max(spanX / Math.max(80, w - padding.left - padding.right), spanY / Math.max(80, h - padding.top - padding.bottom), 1.2);
      centre = { latitude: (b.minLat + b.maxLat) / 2, longitude: (b.minLon + b.maxLon) / 2 };
      cy = padding.top + (h - padding.top - padding.bottom) / 2;
    }
    const kx = Math.cos((centre.latitude * Math.PI) / 180);
    const cx = fitPts.length > 1 ? padding.left + (w - padding.left - padding.right) / 2 : w / 2;
    const project = (p) => ({ x: cx + ((p.longitude - centre.longitude) * M_PER_DEG * kx) / mpp, y: cy - ((p.latitude - centre.latitude) * M_PER_DEG) / mpp });
    const unproject = (x, y) => ({ latitude: centre.latitude - ((y - cy) * mpp) / M_PER_DEG, longitude: centre.longitude + ((x - cx) * mpp) / (M_PER_DEG * kx) });
    return { project, unproject, centre, mpp, w, h };
  }, [size, userLocation?.latitude, userLocation?.longitude, follow, camera, fitTo, plannedPath, routes, nudge, padding]);

  const line = (pts) => (pts || []).filter(isCoord).map((p) => view.project(p)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const me = view && isCoord(userLocation) ? view.project(userLocation) : null;
  const start = segments.find((s) => s.length)?.[0];
  const tone = userTone === "danger" ? C.danger : userTone === "grey" ? "#6f7c92" : C.accent;

  const press = (e) => {
    if (!onPress || !view) return;
    const ne = e.nativeEvent || {};
    let x = ne.locationX;
    let y = ne.locationY;
    // A mouse click comes through as a plain DOM event: work it out from the box.
    if (!Number.isFinite(x) && Number.isFinite(ne.clientX) && e.currentTarget?.getBoundingClientRect) {
      const box = e.currentTarget.getBoundingClientRect();
      x = ne.clientX - box.left;
      y = ne.clientY - box.top;
    }
    if (Number.isFinite(x) && Number.isFinite(y)) onPress(view.unproject(x, y));
  };

  const pilot = camera === "pilot";

  return (
    <View style={[styles.wrap, style]} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {view ? (
        <Pressable onPress={onPress ? press : undefined} style={[StyleSheet.absoluteFill, pilot && styles.tilt]} accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={onPress ? "Map. Tap to add a point" : "Map"}>
          <Svg width={view.w} height={view.h} pointerEvents="none">
            <Defs>
              <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={C.accent} stopOpacity="0.35" />
                <Stop offset="1" stopColor={C.accent} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x={0} y={0} width={view.w} height={view.h} fill="#0c1016" />
            <Streets project={view.project} centre={view.centre} w={view.w} h={view.h} mpp={view.mpp} />
            {routes.map((r) =>
              r.path?.length > 1 ? (
                <Polyline key={`r-${r.key}`} points={line(r.path)} stroke={r.active ? C.accent : "#5d7fb8"} strokeOpacity={r.active ? 1 : 0.38} strokeWidth={r.active ? 7 : 4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ) : null,
            )}
            {trails.map((t, i) => (t.length > 1 ? <Polyline key={`t-${i}`} points={line(t)} stroke={C.accentHi} strokeOpacity={0.7} strokeWidth={4} fill="none" strokeLinecap="round" /> : null))}
            {plannedPath.length > 1 ? (
              <Polyline
                points={line(plannedPath)}
                stroke={plannedStyle === "faint" ? C.accentHi : C.accent}
                strokeOpacity={plannedStyle === "faint" ? 0.45 : 1}
                strokeWidth={plannedStyle === "dots" ? 7 : 7}
                strokeDasharray={plannedStyle === "dots" ? "0.1 14" : undefined}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            {segments.map((seg, i) => (seg.length > 1 ? <Polyline key={`s-${i}`} points={line(seg)} stroke={trackColour} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null))}
            {rejoin && isCoord(rejoin.from) && isCoord(rejoin.to) ? (
              <Polyline points={line([rejoin.from, rejoin.to])} stroke={C.accentHi} strokeWidth={5} strokeDasharray="0.1 11" strokeLinecap="round" fill="none" />
            ) : null}
            {dots.map((d, i) => {
              const p = view.project(d);
              return <Circle key={`d-${i}`} cx={p.x} cy={p.y} r={6} fill="#07090c" stroke="#5d7fb8" strokeWidth={2.5} />;
            })}
            {start
              ? (() => {
                  const p = view.project(start);
                  return <Circle cx={p.x} cy={p.y} r={8} fill={C.bg} stroke={C.accentHi} strokeWidth={4} />;
                })()
              : null}
            {waypoints.map((wp, i) => {
              const p = view.project(wp);
              return i === 0 ? (
                <Circle key={`w-${i}`} cx={p.x} cy={p.y} r={11} fill={C.bg} stroke={C.accentHi} strokeWidth={4} />
              ) : (
                <Circle key={`w-${i}`} cx={p.x} cy={p.y} r={14} fill={C.accent} stroke={C.bg} strokeWidth={3.5} />
              );
            })}
            {showsUser && me ? (
              <G>
                <Circle cx={me.x} cy={me.y} r={34} fill="url(#glow)" />
                <Circle cx={me.x} cy={me.y} r={11} fill="#fff" stroke={tone} strokeWidth={6} />
              </G>
            ) : null}
          </Svg>
          {waypoints.map((wp, i) => {
            if (i === 0) return null;
            const p = view.project(wp);
            return (
              <Text key={`wt-${i}`} pointerEvents="none" style={[styles.wpText, { left: p.x - 14, top: p.y - 8 }]}>
                {i}
              </Text>
            );
          })}
          {people.map((person) => {
            const p = view.project(person);
            const s = person.crew ? 44 : 34;
            return (
              <View key={person.id} pointerEvents="none" style={[styles.face, { left: p.x - s / 2, top: p.y - s / 2, width: s, height: s, borderRadius: s / 2 }]}>
                <Image source={imageSource(person.avatar)} style={{ width: s - 6, height: s - 6, borderRadius: (s - 6) / 2 }} contentFit="cover" />
              </View>
            );
          })}
        </Pressable>
      ) : null}
    </View>
  );
});

export default RunMap;

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: "#0c1016" },
  tilt: { transform: [{ perspective: 900 }, { rotateX: "48deg" }, { scale: 1.5 }] },
  wpText: { position: "absolute", width: 28, textAlign: "center", color: "#fff", fontFamily: F.bodySemi, fontSize: 12 },
  face: { position: "absolute", borderWidth: 3, borderColor: C.accentHi, backgroundColor: C.bg, alignItems: "center", justifyContent: "center", overflow: "hidden" },
});
