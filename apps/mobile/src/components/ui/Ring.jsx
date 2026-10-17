// The membership ring and the out-now dot, used wherever a photo appears.
//
//   Free  thin grey line, lighter at the top
//   Pro   blue ring, bright at the top left, with a soft blue glow
//   Black gunmetal ring with a light that travels round it
//
// In the stories row only (story="unwatched" or "watched"), the ring is about
// the story and membership is not shown: a thick bright blue ring that glows
// until watched, then a thin grey line. Everywhere else the ring is membership.
//
// The dot always sits at the bottom right: blue while someone is out (with a
// slow ping), red once they have just stopped. Clubs get a rounded square
// instead of a circle. The photo inside is shaded at the bottom and has a
// faint edge, like .oh-ring::after in the prototype.
//
// With no photo, a member is their runner silhouette (pass `runner`: "man" or
// "woman", from their "Your runner" choice), the same fallback the Fighter
// Pack uses. Initials only show for things that have no runner, like a club.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { PHOTOS } from "@/constants/photos";
import { C, F } from "./tokens";

// Gradients run top left to bottom right unless noted (the prototype's conic
// and 160deg gradients, flattened so lists stay cheap to draw).
const RING = {
  // .oh-ring.free .oh-tr: linear-gradient(180deg, #8d95a4, #4a5160)
  free: { width: 1.5, colours: ["#8d95a4", "#4a5160"], vertical: true },
  // .oh-ring.pro: conic(--action, --blue-hi 28%, --blue 52%, --action 78%), --shadow-ring-pro
  pro: { width: 2.5, colours: ["#82b4ff", "#3d8bff", "#2a6af0", "#2a6af0"], locations: [0, 0.38, 0.75, 1], glow: "0 0 26px -6px rgba(61,139,255,0.7)" },
  black: { width: 3, glow: "0 0 22px -8px rgba(241,245,250,0.45)" },
};

const STORY = {
  // .r11stories unwatched: 3.5px, linear-gradient(160deg, #b9d5ff, #4f9bff 45%, #2a6af0), drop-shadow 7px
  unwatched: { width: 3.5, colours: ["#b9d5ff", "#4f9bff", "#2a6af0"], locations: [0, 0.45, 1], glow: "0 0 10px 0 rgba(79,155,255,0.6)" },
  watched: { width: 1.5, colours: ["#5a6272", "#5a6272"] },
};

const initialsOf = (name = "") =>
  name
    .split(/[\s._]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

function TravellingLight({ size, radius }) {
  const reduce = useReducedMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    turn.value = withRepeat(withTiming(360, { duration: 3600, easing: Easing.linear }), -1, false);
  }, [reduce, turn]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden", backgroundColor: "#3a4049" }]}>
      <Animated.View style={[{ position: "absolute", left: -size * 0.25, top: -size * 0.25, width: size * 1.5, height: size * 1.5 }, spin]}>
        <LinearGradient
          colors={["#2b3038", "#59616c", "#f2f5f8", "#59616c", "#2b3038", "#2b3038"]}
          locations={[0, 0.3, 0.42, 0.54, 0.75, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/** The out-now ping: a soft copy of the dot that swells and fades (oh-ping). */
function Ping({ size }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    p.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false);
  }, [reduce, p]);
  const swell = useAnimatedStyle(() => ({ opacity: 0.7 * (1 - p.value), transform: [{ scale: 1 + 1.6 * p.value }] }));
  if (reduce) return null;
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: C.out }, swell]} />;
}

/**
 * The dot at the bottom right of a photo: blue "out", red "stopped". It sits
 * in a ring of the screen colour (`edge`) so it reads on top of the photo.
 */
export function Dot({ state, size = 10, edge = C.bg, style }) {
  if (state !== "out" && state !== "stopped") return null;
  const out = state === "out";
  const gap = Math.max(1.5, Math.min(2.5, size * 0.2));
  return (
    <View style={[{ width: size, height: size }, style]}>
      {out ? <Ping size={size} /> : null}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          // box-shadow: 0 0 0 2.5px var(--bg), 0 0 12px rgba(61,139,255,.9)
          boxShadow: `0 0 0 ${gap}px ${edge}, 0 0 12px ${out ? "rgba(61,139,255,0.9)" : "rgba(255,77,85,0.8)"}`,
        }}
      >
        {/* radial-gradient(circle at 35% 30%, #b9d5ff, var(--out) 62%) */}
        <LinearGradient colors={out ? ["#b9d5ff", C.out] : ["#ff8b92", C.alert]} locations={[0, 0.62]} start={{ x: 0.2, y: 0.1 }} end={{ x: 0.8, y: 0.9 }} style={StyleSheet.absoluteFill} />
      </View>
    </View>
  );
}

export function Ring({ size = 44, tier: membership, dot, story, square = false, ringColour, source, runner, name = "", style }) {
  const [failed, setFailed] = useState(false);
  const storyMode = story === "unwatched" || story === "watched";
  const tier = storyMode ? null : membership;
  const spec = storyMode ? STORY[story] : RING[tier] || (ringColour ? { width: 2, colours: [ringColour, ringColour] } : null);
  const ringW = spec ? Math.min(spec.width, Math.max(1.5, size * 0.09)) : 0;
  // --g: the dark gap between ring and photo
  const gap = spec ? Math.max(1.5, Math.min(3, size * 0.045)) : 0;
  const inner = size - (ringW + gap) * 2;
  const radius = square ? size * 0.28 : size / 2;
  const innerRadius = square ? inner * 0.26 : inner / 2;
  const dotSize = Math.max(9, Math.round(size * 0.25));
  const shade = size >= 30;
  const own = source && !failed ? source : null;
  const figure = !own && runner ? (runner === "woman" ? PHOTOS.silhouetteFemale : PHOTOS.silhouetteMale) : null;

  return (
    <View style={[{ width: size, height: size, borderRadius: radius }, spec?.glow ? { boxShadow: spec.glow } : null, style]}>
      {tier === "black" ? (
        <TravellingLight size={size} radius={radius} />
      ) : spec ? (
        <LinearGradient
          colors={spec.colours}
          locations={spec.locations}
          start={spec.vertical ? { x: 0.5, y: 0 } : { x: 0.15, y: 0 }}
          end={spec.vertical ? { x: 0.5, y: 1 } : { x: 0.85, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
      ) : null}
      {spec ? (
        <View style={{ position: "absolute", left: ringW, top: ringW, width: size - ringW * 2, height: size - ringW * 2, borderRadius: square ? radius - ringW : (size - ringW * 2) / 2, backgroundColor: C.bg }} />
      ) : null}
      <View
        style={{
          position: "absolute",
          left: ringW + gap,
          top: ringW + gap,
          width: inner,
          height: inner,
          borderRadius: innerRadius,
          overflow: "hidden",
          backgroundColor: C.surfaceHigh,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {figure ? (
          <Image source={figure} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ top: "18%", left: "50%" }} />
        ) : (
          <Text style={{ color: C.textDim, fontFamily: F.display, fontSize: inner * 0.4 }}>{initialsOf(name)}</Text>
        )}
        {own ? <Image source={own} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} onError={() => setFailed(true)} /> : null}
        {/* .oh-ring::after: a faint edge and a little shade at the bottom */}
        {shade ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: innerRadius, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 -8px 14px -8px rgba(0,0,0,0.6)" }]} /> : null}
      </View>
      <Dot state={dot} size={dotSize} style={{ position: "absolute", right: square ? -2 : 0, bottom: square ? -2 : 0 }} />
    </View>
  );
}
