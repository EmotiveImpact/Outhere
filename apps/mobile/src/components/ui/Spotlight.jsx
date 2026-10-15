// The countdown stage (.hype in the prototype): a dark veil with light at its
// heart, rays that warp outwards on every beat, shock rings that burst from
// the number, a dark rim and film grain. On GO the whole screen floods blue.
//
//   <Spotlight beat={n} go={n === 0} photo={PHOTOS.city}>
//     <SpotlightNumber value={n === 0 ? "GO" : n} colour={hypeColour(n)} />
//     ...chip, labels, buttons
//   </Spotlight>
//
// Spotlight fills the screen; lay everything else out inside it. `centreY`
// is where the light, rays and rings centre (the number's middle).

import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";
import { GlowBackdrop } from "./GlowBackdrop";
import { Grain } from "./Grain";
import { PhotoBackground } from "./PhotoBackground";
import { useLayoutSize } from "./layout";
import { skiaParts, useSkiaReady } from "./skia";
import { F } from "./tokens";

/** The colour of each beat: .hype.n3, .n2, .n1 and .go. */
export const HYPE_COLOURS = { 3: "#82b4ff", 2: "#4b93ff", 1: "#1f62ff", 0: "#ffffff" };
export const hypeColour = (n) => HYPE_COLOURS[n] ?? HYPE_COLOURS[3];

const WARP = 1200; // .hype .warp is 1200px square
const SHOCK = 190; // .hype .shock

const warpEase = Easing.bezier(0.2, 0.8, 0.2, 1);
const shockEase = Easing.bezier(0.1, 0.7, 0.3, 1);

/** One beat of light: the warp rays and two shock rings, replayed when `beat` changes. */
function Beat({ beat, go, colour, cx, cy }) {
  const ready = useSkiaReady();
  const reduce = useReducedMotion();
  const warp = useSharedValue(reduce ? 1 : 0);
  const ring = useSharedValue(reduce ? 1 : 0);
  const ring2 = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    warp.value = 0;
    ring.value = 0;
    ring2.value = 0;
    warp.value = withTiming(1, { duration: 1000, easing: warpEase });
    ring.value = withTiming(1, { duration: 1000, easing: shockEase });
    ring2.value = withDelay(120, withTiming(1, { duration: 1000, easing: shockEase }));
  }, [beat, reduce, warp, ring, ring2]);
  // @keyframes warp7: scale .55 to 1.15, opacity 0, 1 at 30%, .5 at the end
  const rays = useAnimatedStyle(() => ({
    opacity: warp.value < 0.3 ? warp.value / 0.3 : 1 - ((warp.value - 0.3) / 0.7) * 0.5,
    transform: [{ scale: 0.55 + warp.value * 0.6 }],
  }));
  // @keyframes shock7: scale .3 to 2.6, opacity 1 to 0
  const shock = useAnimatedStyle(() => ({ opacity: 1 - ring.value, transform: [{ scale: 0.3 + ring.value * 2.3 }] }));
  const shock2 = useAnimatedStyle(() => ({ opacity: 1 - ring2.value, transform: [{ scale: 0.3 + ring2.value * 2.3 }] }));
  if (!ready) return null;
  const { RaysCanvas, ShockCanvas } = skiaParts();
  const box = SHOCK + 120; // room for the bloom
  const at = (s) => ({ position: "absolute", left: cx - s / 2, top: cy - s / 2, width: s, height: s });
  return (
    <>
      <Animated.View pointerEvents="none" style={[at(WARP), rays]}>
        <RaysCanvas key={go ? "go" : "beat"} size={WARP} colour={go ? "rgba(255,255,255,0.35)" : "rgba(130,180,255,0.22)"} />
      </Animated.View>
      {reduce ? null : (
        <>
          <Animated.View pointerEvents="none" style={[at(box), shock]}>
            <ShockCanvas key={colour} size={box} radius={SHOCK / 2} colour={colour} line={3} />
          </Animated.View>
          <Animated.View pointerEvents="none" style={[at(box), shock2]}>
            <ShockCanvas key={colour} size={box} radius={SHOCK / 2} colour={colour} line={1.5} />
          </Animated.View>
        </>
      )}
    </>
  );
}

/**
 * beat: changes on every count (the rays and rings replay). go: flood blue.
 * colour: the beat's colour (hypeColour(n)). photo: an optional picture under
 * the veil (.hype .hbg). centreY: px from the top where the light centres
 * (defaults to 39% of the height, where the prototype puts its number).
 * clear: no floor colour, so whatever sits behind (the run's map) shows
 * through the veil. veil: a GLOWS preset name, or layers, for a countdown
 * that needs its own veil (defaults to the .hype veil). backdrop: a node
 * drawn under the veil in place of a photo (a blended crest, say).
 */
export function Spotlight({ beat, go = false, colour, photo, photoOpacity = 1, backdrop, centreY, grain = 0.07, clear = false, veil = "hype", children, style }) {
  const [size, onLayout] = useLayoutSize();
  const flood = useSharedValue(go ? 1 : 0);
  useEffect(() => {
    flood.value = withTiming(go ? 1 : 0, { duration: 450, easing: Easing.out(Easing.cubic) });
  }, [go, flood]);
  const goLight = useAnimatedStyle(() => ({ opacity: flood.value }));
  const c = colour || (go ? HYPE_COLOURS[0] : HYPE_COLOURS[3]);
  const cy = centreY ?? (size ? size.height * 0.39 : 0);
  return (
    <View onLayout={onLayout} style={[styles.fill, clear && styles.clear, style]}>
      {backdrop || (photo ? <PhotoBackground source={photo} opacity={photoOpacity} fade="none" glow={false} grain={0} /> : null)}
      <GlowBackdrop preset={typeof veil === "string" ? veil : "hype"} layers={Array.isArray(veil) ? veil : undefined} base={photo || backdrop || clear ? null : undefined} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, goLight]}>
        <GlowBackdrop preset="hypeGo" />
      </Animated.View>
      {size ? <Beat beat={beat} go={go} colour={c} cx={size.width / 2} cy={cy} /> : null}
      <GlowBackdrop preset="vignette" />
      {grain ? <Grain amount={grain} /> : null}
      {children}
    </View>
  );
}

/**
 * The big number (.hype .hn): it slams in from 2.4x with a little overshoot,
 * glowing in the beat's colour, while a ghost of it swells and fades.
 */
export function SpotlightNumber({ value, colour = HYPE_COLOURS[3], size, style }) {
  const reduce = useReducedMotion();
  const go = typeof value === "string";
  const fontSize = size || (go ? 210 : 300);
  const slam = useSharedValue(reduce ? 1 : 0);
  const ghost = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    slam.value = 0;
    ghost.value = 0;
    slam.value = withTiming(1, { duration: 1000, easing: Easing.bezier(0.2, 1.4, 0.4, 1) });
    ghost.value = withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 1000, easing: shockEase }));
  }, [value, reduce, slam, ghost]);
  // @keyframes slam7: scale 2.4 to 1, opacity 0 to 1 by 35%
  const main = useAnimatedStyle(() => ({ opacity: Math.min(1, slam.value / 0.35), transform: [{ scale: 2.4 - 1.4 * slam.value }] }));
  // @keyframes ghost7: scale 1 to 1.9, opacity .9 to 0
  const echo = useAnimatedStyle(() => ({ opacity: 0.9 * (1 - ghost.value), transform: [{ scale: 1 + 0.9 * ghost.value }] }));
  const text = { fontFamily: F.display, fontSize, lineHeight: fontSize * 0.92, letterSpacing: go ? 0 : -4, textAlign: "center", includeFontPadding: false };
  return (
    <View pointerEvents="none" style={[styles.number, style]}>
      {reduce ? null : <Animated.Text style={[text, styles.abs, { color: "transparent", textShadowColor: colour, textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } }, echo]}>{value}</Animated.Text>}
      <Animated.Text style={[text, { color: "#ffffff", textShadowColor: colour, textShadowRadius: 50, textShadowOffset: { width: 0, height: 0 } }, main]}>{value}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: "hidden", backgroundColor: "#03050a" },
  clear: { backgroundColor: "transparent" },
  number: { alignItems: "center", justifyContent: "center" },
  abs: { position: "absolute", left: 0, right: 0 },
});
