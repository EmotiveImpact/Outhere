// The membership ring and the out-now dot, used wherever a photo appears.
//
//   Free  thin grey line
//   Pro   blue ring with a soft glow
//   Black gunmetal ring with a light that travels round it
//
// In the stories row only (story="unwatched" or "watched"), the ring is about
// the story and membership is not shown: bright blue until watched, then a
// thin grey line. Everywhere else the ring is membership.
//
// The dot always sits at the bottom right: blue while someone is out, red
// once they have just stopped. Clubs get a rounded square instead of a circle.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { C, F } from "./tokens";

const RING = {
  free: { width: 1.5, colour: C.free },
  pro: { width: 2.5, colour: C.pro },
  black: { width: 3, colour: "#59616c" },
};

const STORY = {
  unwatched: { width: 2.5, colour: C.accent },
  watched: { width: 1.5, colour: C.free },
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

export function Dot({ state, size = 10, style }) {
  if (state !== "out" && state !== "stopped") return null;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: state === "out" ? C.out : C.alert,
          borderWidth: Math.max(1.5, size * 0.18),
          borderColor: C.bg,
        },
        state === "out" && { shadowColor: C.out, shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
        style,
      ]}
    />
  );
}

export function Ring({ size = 44, tier: membership, dot, story, square = false, ringColour, source, name = "", style }) {
  const [failed, setFailed] = useState(false);
  const storyMode = story === "unwatched" || story === "watched";
  const tier = storyMode ? null : membership;
  const spec = storyMode ? STORY[story] : RING[tier] || (ringColour ? { width: 2, colour: ringColour } : null);
  const ringW = spec ? spec.width : 0;
  const gap = spec ? Math.max(1.5, size * 0.04) : 0;
  const inner = size - (ringW + gap) * 2;
  const radius = square ? size * 0.28 : size / 2;
  const innerRadius = square ? inner * 0.26 : inner / 2;
  const dotSize = Math.max(9, Math.round(size * 0.24));

  return (
    <View
      style={[
        { width: size, height: size },
        story === "unwatched" && { borderRadius: radius, shadowColor: C.accent, shadowOpacity: 0.75, shadowRadius: size * 0.18, shadowOffset: { width: 0, height: 0 } },
        style,
      ]}
    >
      {tier === "black" ? (
        <TravellingLight size={size} radius={radius} />
      ) : spec ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: radius, borderWidth: ringW, borderColor: spec.colour },
            tier === "pro" && { shadowColor: C.pro, shadowOpacity: 0.7, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
          ]}
        />
      ) : null}
      {tier === "black" ? (
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
        <Text style={{ color: C.textDim, fontFamily: F.display, fontSize: inner * 0.4 }}>{initialsOf(name)}</Text>
        {source && !failed ? (
          <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} onError={() => setFailed(true)} />
        ) : null}
      </View>
      <Dot state={dot} size={dotSize} style={{ position: "absolute", right: square ? -2 : 0, bottom: square ? -2 : 0 }} />
    </View>
  );
}
