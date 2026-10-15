// Two sides of a battle, split by a slanted cut with a glowing white seam:
// each fighter's photo is lit from their own edge in their colour (blue for
// you, red for the opponent) and fades to the floor. The prototype's .vs9,
// .r10vsh and .r11fg.
//
//   <VersusSplit left={{ source: PHOTOS.fighterA }} right={{ source: PHOTOS.fighterB }} />
//   <VersusSplit height={214} slant={0.08} left={...} right={...}>
//     <Text>...</Text>                    laid over the split, e.g. names and scores
//   </VersusSplit>
//
// left and right: { source, focus: { x, y }, tint, zoom }. tint defaults to
// blue on the left and red on the right.

import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useLayoutSize } from "./layout";
import { skiaParts, useSkiaReady } from "./skia";
import { EASE, F } from "./tokens";

const BLUE = "rgba(42,106,240,0.5)";
const RED = "rgba(255,77,85,0.45)";
const EXPO = Easing.bezier(...EASE.expo);

/** Plain halves for before Skia is ready: straight cut, no seam. */
function PlainHalf({ side, half }) {
  return (
    <View style={[styles.plain, side === "left" ? { left: 0 } : { right: 0 }]}>
      {half.source ? <Image source={half.source} contentFit="cover" style={StyleSheet.absoluteFill} /> : null}
    </View>
  );
}

/**
 * height: px. split: where the seam crosses the middle (0 to 1 of the width).
 * slant: how far the seam leans, as a fraction of the width (top right to
 * bottom left; .r11fg is 0.16, .r10vsh 0.08). seam: the glowing line. vs: the
 * label at the seam (null for none). fade: the floor colour photos fade into,
 * fadeFrom: where that fade starts (0 to 1 of the height). animate: the two
 * sides slide in from their edges and the seam lights up.
 */
export function VersusSplit({ left = {}, right = {}, height = 300, split = 0.5, slant = 0.16, seam = true, vs = "VS", vsSize = 44, fade = "rgba(2,3,8,0.95)", fadeFrom = 0.45, animate = true, children, style }) {
  const ready = useSkiaReady();
  const [box, onLayout] = useLayoutSize();
  const reduce = useReducedMotion();
  const p = useSharedValue(animate && !reduce ? 0 : 1);
  useEffect(() => {
    if (!animate || reduce) return;
    p.value = withDelay(80, withTiming(1, { duration: 900, easing: EXPO }));
  }, [animate, reduce, p]);
  const inLeft = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateX: (1 - p.value) * -48 }] }));
  const inRight = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateX: (1 - p.value) * 48 }] }));
  const lightUp = useAnimatedStyle(() => ({ opacity: Math.max(0, (p.value - 0.4) / 0.6) }));
  const pop = useAnimatedStyle(() => ({ opacity: Math.max(0, (p.value - 0.55) / 0.45), transform: [{ scale: 1.6 - 0.6 * p.value }, { skewX: "-8deg" }] }));

  let halves = null;
  let line = null;
  let mid = null;
  if (box) {
    const W = box.width;
    const H = height;
    const topX = W * (split + slant / 2);
    const botX = W * (split - slant / 2);
    mid = { x: W * split, y: H / 2 };
    if (ready) {
      const { VersusHalf, SeamCanvas } = skiaParts();
      halves = (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, inLeft]}>
            <VersusHalf width={W} height={H} side="left" polygon={[[0, 0], [topX, 0], [botX, H], [0, H]]} source={left.source} focus={left.focus} zoom={left.zoom} tint={left.tint ?? BLUE} fade={fade} fadeFrom={fadeFrom} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, inRight]}>
            <VersusHalf width={W} height={H} side="right" polygon={[[topX, 0], [W, 0], [W, H], [botX, H]]} source={right.source} focus={right.focus} zoom={right.zoom} tint={right.tint ?? RED} fade={fade} fadeFrom={fadeFrom} />
          </Animated.View>
        </>
      );
      if (seam) {
        // The seam runs a little past the box so its ends fade outside it.
        line = (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, lightUp]}>
            <SeamCanvas width={W} height={H} from={[topX, -H * 0.05]} to={[botX, H * 1.05]} />
          </Animated.View>
        );
      }
    } else {
      halves = (
        <>
          <PlainHalf side="left" half={left} />
          <PlainHalf side="right" half={right} />
        </>
      );
    }
  }

  return (
    <View onLayout={onLayout} style={[{ height, overflow: "hidden", backgroundColor: "#020308" }, style]}>
      {halves}
      {line}
      {vs && mid ? (
        <Animated.View pointerEvents="none" style={[styles.vs, { left: mid.x - 60, top: mid.y - vsSize * 0.62 }, pop]}>
          <Text style={[styles.vsText, { fontSize: vsSize, lineHeight: vsSize * 1.1 }]}>{vs}</Text>
        </Animated.View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  plain: { position: "absolute", top: 0, bottom: 0, width: "50%", overflow: "hidden" },
  vs: { position: "absolute", width: 120, alignItems: "center" },
  // .r10vsh .vs: 44px, text-shadow 0 0 30px rgba(130,180,255,.9)
  vsText: { color: "#ffffff", fontFamily: F.display, letterSpacing: 1, textShadowColor: "rgba(130,180,255,0.9)", textShadowRadius: 30, textShadowOffset: { width: 0, height: 0 } },
});
