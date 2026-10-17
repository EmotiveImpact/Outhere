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
// left and right: { source, focus: { x, y }, tint, zoom, glow, mute }. tint
// defaults to a light blue on the left and a light red on the right, and the
// right side gets a red glow from its top corner. mute greys a silhouette
// down (grayscale, 75% brightness).
//
// VersusName puts a name, a line under it and the side's colour bar at the
// foot of a half:
//   <VersusName side="left" name="You" sub="Level 14 · Pro" />

import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { useLayoutSize } from "./layout";
import { skiaParts, useSkiaReady } from "./skia";
import { EASE, F } from "./tokens";
import { SlabFade } from "./SlabFade";

// Approved Fighter Pack mock: light edge tints, the colour mostly in the bars.
const BLUE = "rgba(42,106,240,0.14)";
const RED = "rgba(255,60,70,0.16)";
const RED_GLOW = "rgba(255,50,62,0.3)";
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
export function VersusSplit({ left = {}, right = {}, height = 300, split = 0.5, slant = 0.16, seam = true, vs = "VS", vsSize = 44, vsGlow = true, fade = "rgba(2,3,8,0.95)", fadeFrom = 0.4, fadeTo = 0.88, animate = true, children, style }) {
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
            <VersusHalf width={W} height={H} side="left" polygon={[[0, 0], [topX, 0], [botX, H], [0, H]]} source={left.source} focus={left.focus} zoom={left.zoom} tint={left.tint ?? BLUE} glow={left.glow} mute={left.mute} fade={fade} fadeFrom={fadeFrom} fadeTo={fadeTo} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, inRight]}>
            <VersusHalf width={W} height={H} side="right" polygon={[[topX, 0], [W, 0], [W, H], [botX, H]]} source={right.source} focus={right.focus} zoom={right.zoom} tint={right.tint ?? RED} glow={right.glow === undefined ? RED_GLOW : right.glow} mute={right.mute} fade={fade} fadeFrom={fadeFrom} fadeTo={fadeTo} />
          </Animated.View>
        </>
      );
      if (seam) {
        // The seam starts a little above the box (.seam top -10%, height
        // 120%) and fades out before the names.
        const over = (H * 0.1 * slant * W) / H;
        line = (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, lightUp]}>
            <SeamCanvas width={W} height={H} from={[topX + over, -H * 0.1]} to={[botX - over, H * 1.1]} glowAt={vs && vsGlow ? [mid.x, mid.y] : null} glowSize={vsSize * 2.35} />
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
      {/* the bottom melts into the page, no hard edge (Edem, 2026-10-17) */}
      <SlabFade share={0.32} />
      {vs && mid ? (
        <Animated.View pointerEvents="none" style={[styles.vs, { left: mid.x - 80, top: mid.y - vsSize * 0.6 }, pop]}>
          {/* text-shadow: 0 5px 0 #1f62ff under 0 0 26px #82b4ff */}
          <Text style={[styles.vsText, styles.vsDrop, { fontSize: vsSize, lineHeight: vsSize * 1.1, top: vsSize * 0.08 }]}>{vs}</Text>
          <Text style={[styles.vsText, { fontSize: vsSize, lineHeight: vsSize * 1.1 }]}>{vs}</Text>
        </Animated.View>
      ) : null}
      {children}
    </View>
  );
}

/**
 * A name at the foot of one half (.r10vsh .n): the name, a small line under it
 * (level and membership), then a 28 by 3 bar in the side's colour.
 */
export function VersusName({ side = "left", name, sub, bottom = 16, inset = 18, children }) {
  const right = side === "right";
  return (
    <View pointerEvents="box-none" style={[styles.name, right ? { right: inset, alignItems: "flex-end" } : { left: inset }, { bottom }]}>
      <Text style={[styles.nameText, right && { textAlign: "right" }]} numberOfLines={1}>
        {name}
      </Text>
      {sub ? (
        <Text style={[styles.nameSub, right && { textAlign: "right" }]} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
      <View style={[styles.bar, right ? styles.barRed : styles.barBlue]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  plain: { position: "absolute", top: 0, bottom: 0, width: "50%", overflow: "hidden" },
  vs: { position: "absolute", width: 160, alignItems: "center" },
  // .r10vsh .vs: text-shadow 0 0 26px #82b4ff, 0 5px 0 #1f62ff
  vsText: { color: "#ffffff", fontFamily: F.display, letterSpacing: 1, textShadowColor: "rgba(130,180,255,0.95)", textShadowRadius: 26, textShadowOffset: { width: 0, height: 0 } },
  vsDrop: { position: "absolute", color: "#1f62ff", textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 26, textShadowOffset: { width: 0, height: 5 } },
  name: { position: "absolute", maxWidth: "46%" },
  nameText: { color: "#ffffff", fontFamily: F.display, fontSize: 22, lineHeight: 26, textTransform: "uppercase" },
  // .n small: 500 11px Inter, 70% white
  nameSub: { color: "rgba(255,255,255,0.7)", fontFamily: F.bodyMedium, fontSize: 11, lineHeight: 14, marginTop: 5 },
  bar: { width: 28, height: 3, borderRadius: 3, marginTop: 8 },
  barBlue: { backgroundColor: "#3b7bff", boxShadow: "0 0 10px rgba(59,123,255,0.7)" },
  barRed: { backgroundColor: "#ff4d55", boxShadow: "0 0 10px rgba(255,77,85,0.7)" },
});
