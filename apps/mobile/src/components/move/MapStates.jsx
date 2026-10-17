// The two states before the map, laid out like the prototype's mLocating and
// mOff: the night map blurred under a veil (grey when location is off), the
// pin orb with its black dropped out, seek rings pulsing from it while GPS
// and motion lock on, each ticking off, and the big two-tone headline.

import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Check } from "@/components/ui/icons";
import { BlendImage, C, F, GlowButton, PressableScale, R } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { MAP_TEXTURES, MapShade } from "./MapTexture";

const ORB = 230;

// Lit dots scattered on the blurred map, like the prototype's ROADS dots.
const DOTS = [
  [0.29, 0.1], [0.85, 0.27], [0.23, 0.36], [0.72, 0.5], [0.12, 0.54], [0.95, 0.56], [0.6, 0.66], [0.38, 0.72], [0.8, 0.8], [0.18, 0.86],
];

/** .seek i: a ring that swells out of the orb and fades, every 2.4s. */
function Seek({ delay }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1, false));
    return () => cancelAnimation(p);
  }, [p, delay]);
  const style = useAnimatedStyle(() => ({ opacity: 1 - p.value, transform: [{ scale: 0.4 + p.value * 1.8 }] }));
  return <Animated.View pointerEvents="none" style={[styles.seek, style]} />;
}

/** .orb: a dark blue pool with the pin blended into it. */
function Orb({ off, top }) {
  return (
    <View style={[styles.orb, { top }]} pointerEvents="none">
      <Svg width={ORB} height={ORB} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="orbPool" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={off ? "#202329" : "#0d2452"} />
            <Stop offset="0.58" stopColor={off ? "#0b0c0f" : "#05080f"} />
            <Stop offset="0.71" stopColor="#05080f" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={ORB / 2} cy={ORB / 2} r={ORB / 2} fill="url(#orbPool)" />
      </Svg>
      <BlendImage source={PHOTOS.pin} size={ORB} mask={[0.5, 0.7]} grey={off ? 1 : 0} dim={off ? 0.85 : 1} />
    </View>
  );
}

/** The map under it all: blurred, veiled, grey when location is off. */
function Backdrop({ off }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image source={off ? MAP_TEXTURES.grey : MAP_TEXTURES.blue} blurRadius={4} contentFit="cover" style={StyleSheet.absoluteFill} />
      {off ? null : (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(4,7,12,0.55)" }]} />
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            {DOTS.map(([x, y]) => (
              <React.Fragment key={`${x}${y}`}>
                <Circle cx={`${x * 100}%`} cy={`${y * 100}%`} r={6} fill="rgba(130,180,255,0.12)" />
                <Circle cx={`${x * 100}%`} cy={`${y * 100}%`} r={3.5} fill="#2a3a52" stroke="#07090c" strokeWidth={2} />
              </React.Fragment>
            ))}
          </Svg>
        </>
      )}
      <MapShade />
    </View>
  );
}

/** .spin: a quarter ring going round. */
function Spin() {
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(r);
  }, [r]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value * 360}deg` }] }));
  return <Animated.View style={[styles.spin, style]} />;
}

function Status({ ok, label }) {
  return (
    <View style={styles.pill}>
      <BlurView tint="dark" intensity={70} style={StyleSheet.absoluteFill} />
      {ok ? <Check size={14} color={C.accent} strokeWidth={3} /> : <Spin />}
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

// The prototype's y, in px down an 844 screen, lands at insets.top - 14 + y.
const at = (top, px) => top - 14 + px;

export function LocatingView({ gps, motion, top }) {
  return (
    <View style={styles.fill}>
      <Backdrop />
      <View style={[styles.seekAt, { top: at(top, 253) }]} pointerEvents="none">
        {[0, 800, 1600].map((d) => (
          <Seek key={d} delay={d} />
        ))}
      </View>
      <Orb top={at(top, 110)} />
      <View style={[styles.msg, { top: at(top, 372) }]}>
        <Text style={styles.big}>Finding</Text>
        <Text style={[styles.big, styles.blue]}>you</Text>
        <View style={styles.status}>
          <Status ok={gps} label={gps ? "GPS locked" : "GPS"} />
          <Status ok={motion} label="Motion" />
        </View>
      </View>
    </View>
  );
}

export function LocationOffView({ top, bottom, canAskAgain, onTurnOn, onNotNow }) {
  return (
    <View style={styles.fill}>
      <Backdrop off />
      <Orb off top={at(top, 84)} />
      <View style={[styles.msg, styles.offMsg, { top: at(top, 330) }]}>
        <Text style={[styles.big, styles.offBig]}>Location</Text>
        <Text style={[styles.big, styles.offBig, styles.blue]}>is off</Text>
        <Text style={styles.copy}>Turn it on to track your routes and see who's outside near you.</Text>
      </View>
      <View style={[styles.actions, { bottom: Math.max(bottom, 108) }]}>
        <GlowButton title={canAskAgain ? "Turn on location" : "Open settings"} size="lg" full onPress={onTurnOn} />
        <PressableScale onPress={onNotNow} accessibilityLabel="Not now" hitSlop={10}>
          <Text style={styles.notNow}>Not now</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#05080e", overflow: "hidden" },
  orb: { position: "absolute", left: "50%", marginLeft: -ORB / 2, width: ORB, height: ORB, alignItems: "center", justifyContent: "center" },
  seekAt: { position: "absolute", left: "50%", width: 0, height: 0 },
  seek: { position: "absolute", left: -70, top: -70, width: 140, height: 140, borderRadius: 70, borderWidth: 1.5, borderColor: "rgba(75,147,255,0.6)" },
  msg: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  offMsg: { paddingHorizontal: 26 },
  // .display 48px, line-height .92
  big: { color: "#fff", fontFamily: F.display, fontSize: 48, lineHeight: 44, textTransform: "uppercase", textAlign: "center" },
  offBig: { fontSize: 46, lineHeight: 42 },
  blue: { color: "#4b93ff" },
  copy: { color: "rgba(255,255,255,0.8)", fontFamily: F.body, fontSize: 13, lineHeight: 19.5, textAlign: "center", marginTop: 12 },
  status: { flexDirection: "row", gap: 8, marginTop: 14 },
  // .statusrow span.gl
  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 11, borderRadius: R.full, overflow: "hidden", backgroundColor: "rgba(10,14,20,0.64)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" },
  pillText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 11.5 },
  spin: { width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: C.accent, borderRightColor: "transparent", borderBottomColor: "transparent" },
  actions: { position: "absolute", left: 14, right: 14, gap: 12, alignItems: "center" },
  notNow: { color: "rgba(255,255,255,0.75)", fontFamily: F.bodySemi, fontSize: 12.5 },
});
