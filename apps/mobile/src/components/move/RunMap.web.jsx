// Web stand-in for the Move map. react-native-maps has no web build, so the
// web version draws the same layers (track, routes, numbered points, people,
// dots, the way back) over the prototype's night street texture, centred on
// you, and turns taps into coordinates so routes can be drawn here too.
// Lines glow like the prototype's path(), people are faces in their
// membership ring or lit dots, and you are your own face with a pulse.

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Polyline } from "react-native-svg";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { Avatar, C, F } from "@/components/ui";
import { DEFAULT_REGION, isCoord } from "./geo";
import { GlowLine, LitDot, MapShade, MapTiles } from "./MapTexture";

const M_PER_DEG = 111320;
const MPP = { map: 2.6, pilot: 1.5, street: 0.62 }; // metres per pixel
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

/** The face() pulse: a soft disc that swells and fades, every 2.4s. */
function Pulse({ x, y, r, colour }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, false);
  }, [reduce, t]);
  const s = useAnimatedStyle(() => {
    const k = t.value < 0.5 ? t.value * 2 : 2 - t.value * 2;
    return { opacity: 1 - k, transform: [{ scale: 0.65 + k * 0.65 }] };
  });
  const d = r * 4;
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: x - d / 2, top: y - d / 2, width: d, height: d, borderRadius: d / 2, backgroundColor: colour }, s]} />;
}

const RunMap = forwardRef(function RunMap(
  {
    userLocation,
    userAvatar,
    userName = "",
    userTier,
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
    tone = "blue",
    blur = 0,
    shade = true,
    focusY,
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
    let cy = h * (focusY ?? (camera === "pilot" ? 0.62 : 0.45));
    if (fitPts.length > 1) {
      const b = boundsOf(me && !fitTo?.length ? [...fitPts, me] : fitPts);
      const kx = Math.cos((((b.minLat + b.maxLat) / 2) * Math.PI) / 180);
      const spanX = Math.max(60, (b.maxLon - b.minLon) * M_PER_DEG * kx);
      const spanY = Math.max(60, (b.maxLat - b.minLat) * M_PER_DEG);
      mpp = Math.max(spanX / Math.max(80, w - padding.left - padding.right), spanY / Math.max(80, h - padding.top - padding.bottom), 1);
      centre = { latitude: (b.minLat + b.maxLat) / 2, longitude: (b.minLon + b.maxLon) / 2 };
      cy = padding.top + (h - padding.top - padding.bottom) / 2;
    }
    const kx = Math.cos((centre.latitude * Math.PI) / 180);
    const cx = fitPts.length > 1 ? padding.left + (w - padding.left - padding.right) / 2 : w / 2;
    const project = (p) => ({ x: cx + ((p.longitude - centre.longitude) * M_PER_DEG * kx) / mpp, y: cy - ((p.latitude - centre.latitude) * M_PER_DEG) / mpp });
    const unproject = (x, y) => ({ latitude: centre.latitude - ((y - cy) * mpp) / M_PER_DEG, longitude: centre.longitude + ((x - cx) * mpp) / (M_PER_DEG * kx) });
    return { project, unproject, centre, mpp, w, h };
  }, [size, userLocation?.latitude, userLocation?.longitude, follow, camera, fitTo, plannedPath, routes, nudge, padding, focusY]);

  const line = (pts) => (pts || []).filter(isCoord).map((p) => view.project(p)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const me = view && isCoord(userLocation) ? view.project(userLocation) : null;
  const start = segments.find((s) => s.length)?.[0];
  const danger = userTone === "danger";
  const grey = userTone === "grey";
  const pilot = camera === "pilot";
  const street = camera === "street";
  // Lines thin out as you zoom in, like the prototype's street view.
  const lw = street ? 9 : pilot ? 8 : 7;

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

  const meSize = street ? 64 : 48;

  return (
    <View style={[styles.wrap, style]} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {view ? (
        <Pressable onPress={onPress ? press : undefined} style={[StyleSheet.absoluteFill, pilot && styles.tilt]} accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={onPress ? "Map. Tap to add a point" : "Map"}>
          <MapTiles project={view.project} centre={view.centre} mpp={view.mpp} w={view.w} h={view.h} tone={tone} blur={blur} />
          <Svg width={view.w} height={view.h} style={StyleSheet.absoluteFill} pointerEvents="none">
            {routes.map((r) =>
              r.path?.length > 1 ? <GlowLine key={`r-${r.key}`} points={line(r.path)} colour={r.active ? C.accent : "#82b4ff"} width={r.active ? lw : 5} glow={r.active} opacity={r.active ? 1 : 0.4} /> : null,
            )}
            {trails.map((t, i) => (t.length > 1 ? <GlowLine key={`t-${i}`} points={line(t)} colour={C.accentHi} width={6} /> : null))}
            {plannedPath.length > 1 ? (
              plannedStyle === "dots" ? (
                <GlowLine points={line(plannedPath)} colour={C.accent} width={9} dash="0.1 16" />
              ) : (
                <GlowLine points={line(plannedPath)} colour={plannedStyle === "faint" ? C.accentHi : C.accent} width={lw} glow={plannedStyle !== "faint"} opacity={plannedStyle === "faint" ? 0.45 : 1} />
              )
            ) : null}
            {segments.map((seg, i) => (seg.length > 1 ? <GlowLine key={`s-${i}`} points={line(seg)} colour={trackColour} width={lw} glow={!grey} /> : null))}
            {rejoin && isCoord(rejoin.from) && isCoord(rejoin.to) ? (
              <Polyline points={line([rejoin.from, rejoin.to])} stroke={C.accentHi} strokeWidth={5} strokeDasharray="0.1 11" strokeLinecap="round" fill="none" />
            ) : null}
            {dots.map((d, i) => {
              const p = view.project(d);
              return <LitDot key={`d-${i}`} x={p.x} y={p.y} r={7} />;
            })}
            {start
              ? (() => {
                  const p = view.project(start);
                  return <Circle cx={p.x} cy={p.y} r={11} fill="#07090c" stroke={grey ? "#6f7c92" : "#82b4ff"} strokeWidth={5} />;
                })()
              : null}
            {waypoints.map((wp, i) => {
              const p = view.project(wp);
              return (
                <G key={`w-${i}`}>
                  <Circle cx={p.x} cy={p.y} r={17} fill={i === 0 ? "#07090c" : C.accent} stroke={i === 0 ? "#82b4ff" : "#07090c"} strokeWidth={4} />
                </G>
              );
            })}
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
            const s = person.crew ? 48 : 40;
            return (
              <View key={person.id} pointerEvents="none" style={[styles.face, { left: p.x - s / 2, top: p.y - s / 2 }]}>
                <Avatar uri={person.avatar} name={person.name} size={s} tier={person.tier || "pro"} />
              </View>
            );
          })}
          {showsUser && me ? (
            <>
              {!grey ? <Pulse x={me.x} y={me.y} r={meSize / 2} colour={danger ? "rgba(255,77,85,0.3)" : "rgba(61,139,255,0.22)"} /> : null}
              <View pointerEvents="none" style={[styles.face, { left: me.x - meSize / 2, top: me.y - meSize / 2, opacity: grey ? 0.7 : 1 }, danger && styles.meDanger]}>
                <Avatar uri={userAvatar} name={userName || "You"} size={meSize} tier={userTier || "pro"} />
              </View>
            </>
          ) : null}
        </Pressable>
      ) : null}
      {view && shade ? <MapShade /> : null}
    </View>
  );
});

export default RunMap;

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: "#05080e" },
  // .tilt: perspective(620px) rotateX(54deg), from 62% down
  tilt: { transform: [{ perspective: 760 }, { rotateX: "50deg" }, { scale: 1.55 }] },
  wpText: { position: "absolute", width: 28, textAlign: "center", color: "#fff", fontFamily: F.bodySemi, fontSize: 13 },
  face: { position: "absolute" },
  meDanger: { borderRadius: 999, boxShadow: "0 0 22px 6px rgba(255,77,85,0.7)" },
});
