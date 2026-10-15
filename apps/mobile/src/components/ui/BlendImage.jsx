// A 3D object or product shot rendered on black, set onto a dark screen with
// no black box: Skia makes the black transparent (CSS mix-blend-mode:
// lighten, or screen) and fades the edge with a round mask, exactly as the
// prototype's .slab .obj, .orb img and .bal .c3d do.
//
//   <BlendImage source={PHOTOS.trophy} size={220} float glow />
//   <BlendImage source={PHOTOS.coin} width={120} height={90} mask="wide" />
//   <BlendImage source={PHOTOS.emoteFlame} size={44} mask="tight" mode="screen" />
//   <BlendImage source={PHOTOS.shield} style={StyleSheet.absoluteFill} />   fills its box
//
// Use it for anything shot on black (objects, emotes, badges, coins). Photos
// with their own background use PhotoBackground or a plain Image.

import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { GlowBackdrop } from "./GlowBackdrop";
import { MASKS } from "./glows";
import { useLayoutSize } from "./layout";
import { skiaParts, useSkiaReady } from "./skia";

/**
 * source: a require() or { uri }. size, or width and height; with neither it
 * fills the box its style gives it. mask: soft | wide | tight | burst | none,
 * or [inner, outer] as fractions of half the diagonal. mode: lighten | screen.
 * fit: cover | contain. zoom, rotate (degrees) and focus ({ x, y }, 0 to 1)
 * place the picture. grey (0 to 1) and dim (multiplier) quieten it, for
 * locked or past states. float: the slow 7s bob of .oh-slab .obj. glow: a
 * soft blue orb behind it (true, or a size in px).
 */
export function BlendImage({ source, size, width, height, mask = "soft", mode = "lighten", fit = "cover", zoom = 1, rotate = 0, focus, grey = 0, dim = 1, float = false, glow = false, style }) {
  const ready = useSkiaReady();
  const fixed = width || size ? { width: width || size, height: height || size } : null;
  const [measured, onLayout] = useLayoutSize();
  const box = fixed || measured;
  const stops = Array.isArray(mask) ? mask : MASKS[mask] ?? null;

  const reduce = useReducedMotion();
  const bob = useSharedValue(0);
  useEffect(() => {
    if (!float || reduce) return;
    bob.value = withRepeat(withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [float, reduce, bob]);
  const floating = useAnimatedStyle(() => ({ transform: [{ translateY: -8 * bob.value }, { rotate: `${-1.5 * bob.value}deg` }] }));

  let picture = null;
  if (box && ready) {
    const { KeyedImage } = skiaParts();
    picture = (
      <KeyedImage source={source} width={box.width} height={box.height} mask={stops} mode={mode} fit={fit} zoom={zoom} rotate={rotate} focus={focus} grey={grey} dim={dim} />
    );
  } else if (box) {
    // Without Skia the browser can still blend; elsewhere it shows plainly.
    picture = (
      <Image
        source={source}
        contentFit={fit}
        style={{ width: box.width, height: box.height, opacity: dim < 1 ? dim : 1, mixBlendMode: mode }}
      />
    );
  }

  // The orb is centred on the picture and may spill past it.
  const orb = glow && box ? (typeof glow === "number" ? glow : Math.round(box.width * 1.1)) : 0;
  const dx = box ? (orb - box.width) / 2 : 0;
  const dy = box ? (orb - box.height) / 2 : 0;
  return (
    <View pointerEvents="none" onLayout={fixed ? undefined : onLayout} style={[fixed, styles.centre, style]}>
      {orb ? <GlowBackdrop preset="orb" breathe style={{ top: -dy, bottom: -dy, left: -dx, right: -dx }} /> : null}
      <Animated.View style={float ? floating : null}>{picture}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: "center", justifyContent: "center" },
});
