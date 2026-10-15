// The two states before the map: finding you (a pin pulses while GPS and
// motion lock on, each ticking off) and location off (the pin drains to grey
// and one line says what you get back by turning it on).

import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import { Check } from "lucide-react-native";
import { Button, C, F, PressableScale, R, S } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";

function Seek({ delay, size }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1, false));
    return () => cancelAnimation(p);
  }, [p, delay]);
  const style = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - p.value), transform: [{ scale: 0.6 + p.value * 1.2 }] }));
  return <Animated.View pointerEvents="none" style={[styles.seek, { width: size, height: size, borderRadius: size / 2, marginLeft: -size / 2, marginTop: -size / 2 }, style]} />;
}

function Orb({ off, size = 220 }) {
  return (
    <View style={[styles.orbWrap, { width: size, height: size }]}>
      {!off ? [0, 800, 1600].map((d) => <Seek key={d} delay={d} size={size * 1.3} />) : null}
      <View style={[styles.orb, { width: size, height: size, borderRadius: size / 2 }, off && styles.orbOff]}>
        <Image source={PHOTOS.pin} style={{ width: size, height: size, opacity: off ? 0.35 : 1 }} contentFit="cover" />
        {off ? <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(120,128,140,0.35)" }]} /> : null}
      </View>
    </View>
  );
}

function Backdrop({ off }) {
  return (
    <LinearGradient
      colors={off ? ["#26292e", "#1b1d21", "#0c0d10"] : ["#16243d", "#0d1625", "#07090c"]}
      locations={[0, 0.55, 1]}
      style={StyleSheet.absoluteFill}
    />
  );
}

export function LocatingView({ gps, motion, top }) {
  return (
    <View style={styles.fill}>
      <Backdrop />
      <View style={[styles.stage, { paddingTop: top + 70 }]}>
        <Orb />
        <Text style={styles.big}>Finding</Text>
        <Text style={[styles.big, { color: C.accent }]}>you</Text>
        <View style={styles.status}>
          <View style={[styles.pill, gps && styles.pillOk]}>
            {gps ? <Check size={14} color={C.accentHi} strokeWidth={3} /> : <View style={styles.spin} />}
            <Text style={styles.pillText}>{gps ? "GPS locked" : "GPS"}</Text>
          </View>
          <View style={[styles.pill, motion && styles.pillOk]}>
            {motion ? <Check size={14} color={C.accentHi} strokeWidth={3} /> : <View style={styles.spin} />}
            <Text style={styles.pillText}>Motion</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function LocationOffView({ top, bottom, canAskAgain, onTurnOn, onNotNow }) {
  return (
    <View style={styles.fill}>
      <Backdrop off />
      <View style={[styles.stage, { paddingTop: top + 50 }]}>
        <Orb off />
        <Text style={styles.big}>Location</Text>
        <Text style={[styles.big, { color: C.accent }]}>is off</Text>
        <Text style={styles.copy}>Turn it on to track your routes and see who's outside near you.</Text>
      </View>
      <View style={[styles.actions, { bottom }]}>
        <Button title={canAskAgain ? "Turn on location" : "Open settings"} size="lg" full onPress={onTurnOn} />
        <PressableScale onPress={onNotNow} accessibilityLabel="Not now" style={{ alignSelf: "center", padding: S.sm }}>
          <Text style={styles.notNow}>Not now</Text>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg },
  stage: { alignItems: "center", paddingHorizontal: S.xxl },
  orbWrap: { alignItems: "center", justifyContent: "center", marginBottom: S.xxl },
  orb: { overflow: "hidden", backgroundColor: "#0b1730", shadowColor: C.accent, shadowOpacity: 0.55, shadowRadius: 50, shadowOffset: { width: 0, height: 0 } },
  orbOff: { shadowOpacity: 0, backgroundColor: "#2a2d33" },
  seek: { position: "absolute", left: "50%", top: "50%", borderWidth: 1.5, borderColor: C.accentHi },
  big: { color: C.text, fontFamily: F.display, fontSize: 60, lineHeight: 58, textTransform: "uppercase", textAlign: "center" },
  copy: { color: C.textSoft, fontFamily: F.body, fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: S.md, maxWidth: 320 },
  status: { flexDirection: "row", gap: S.sm, marginTop: S.xl },
  pill: { flexDirection: "row", alignItems: "center", gap: 8, height: 36, paddingHorizontal: 14, borderRadius: R.full, backgroundColor: "rgba(18,22,30,0.8)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.1)" },
  pillOk: { borderColor: "rgba(61,139,255,0.35)" },
  pillText: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5 },
  spin: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: C.accent, borderRightColor: "transparent" },
  actions: { position: "absolute", left: S.lg, right: S.lg, gap: S.sm },
  notNow: { color: C.textSoft, fontFamily: F.bodySemi, fontSize: 14 },
});
