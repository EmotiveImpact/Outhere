// A photo behind a hero, card or whole screen, finished the prototype's way:
// darkened at the top so controls read, faded to the floor at the bottom so
// text sits on it, blue light rising from below and a little film grain.
//
//   <PhotoBackground source={PHOTOS.battle} />                    .oh-slab.photo
//   <PhotoBackground source={PHOTOS.city} fade="hero" kenBurns />  a full bleed hero
//   <PhotoBackground source={photo} fade="card" glow={false} />    a photo card
//
// It fills its parent (absolute), so put it first inside a sized view.

import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { GlowBackdrop } from "./GlowBackdrop";
import { Grain } from "./Grain";

// Each fade is a top-to-bottom gradient in the colour of the floor. `to` is
// that colour as "r,g,b".
const FADES = {
  // .oh-slab.photo::after: (rgba(2,5,12,.55) 0, 0 22%, 0 40%, .8 72%, .97 100%)
  slab: [[0, 0.55], [0.22, 0], [0.4, 0], [0.72, 0.8], [1, 0.97]],
  // a full bleed hero: a lighter top, the bottom third fully into the screen
  hero: [[0, 0.5], [0.18, 0.1], [0.42, 0.05], [0.75, 0.82], [1, 1]],
  // .oh-feat / photo cards: only the lower half darkens, for a caption
  card: [[0, 0.1], [0.4, 0], [0.7, 0.6], [1, 0.92]],
  // behind a whole screen's content: dark throughout, a window at the top
  soft: [[0, 0.55], [0.25, 0.45], [0.55, 0.8], [1, 1]],
  none: null,
};

/**
 * source: the photo. fade: slab | hero | card | soft | none, or a list of
 * [position, alpha]. to: the floor colour as "r,g,b" (the screen's own
 * background by default). opacity: of the photo itself. focus: { x, y } of
 * the photo to keep in frame. kenBurns: an 18s slow push in. glow: the blue
 * light from below (.oh-slab.photo::before). grain: film grain amount, 0 for none.
 */
export function PhotoBackground({ source, fade = "slab", to = "7,9,12", opacity = 1, focus, kenBurns = false, glow = true, grain = 0.06, children, style }) {
  const reduce = useReducedMotion();
  const push = useSharedValue(0);
  useEffect(() => {
    if (!kenBurns || reduce) return;
    push.value = withRepeat(withTiming(1, { duration: 18000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [kenBurns, reduce, push]);
  const moving = useAnimatedStyle(() => ({ transform: [{ scale: 1.02 + push.value * 0.08 }] }));
  const stops = Array.isArray(fade) ? fade : FADES[fade];
  const position = focus ? { left: `${focus.x * 100}%`, top: `${focus.y * 100}%` } : "center";
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, kenBurns ? moving : null]}>
        <Image source={source} contentFit="cover" contentPosition={position} transition={200} style={[StyleSheet.absoluteFill, { opacity }]} />
      </Animated.View>
      {stops ? (
        <LinearGradient colors={stops.map(([, a]) => `rgba(${to},${a})`)} locations={stops.map(([p]) => p)} style={StyleSheet.absoluteFill} />
      ) : null}
      {glow ? <GlowBackdrop preset="photo" /> : null}
      {grain ? <Grain amount={grain} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
});
