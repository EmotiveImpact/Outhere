// The launch: the open O draws itself in, the dot springs into the gap, then
// OUTHERE, GET OUTSIDE and how many are out right now. It plays once when the
// app opens at its front door and fades into whatever is underneath. Deep
// links skip it, and so does reduced motion.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { usePathname } from "expo-router";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { MotiView } from "moti";
import { useReducedMotion } from "react-native-reanimated";
import { useOutsideCount, useProfile } from "@/data/hooks";
import { formatNumber } from "@/utils/format";
import { Logo } from "./Logo";
import { C, F, R } from "./tokens";

const SHOW_MS = 1900;
const FADE_MS = 420;
const GLOW = 520;

export default function LaunchScreen() {
  const path = usePathname();
  const reduce = useReducedMotion();
  // Decided once, on the first render: only a cold open at the front door plays it.
  const [play] = useState(() => !reduce && (!path || path === "/"));
  const [phase, setPhase] = useState(play ? "on" : "gone");
  const { data: profile } = useProfile();
  const count = useOutsideCount(profile?.cityId || null).data?.count;
  const where = profile?.cityId ? profile.city : "the UK";

  useEffect(() => {
    if (!play) return undefined;
    const fade = setTimeout(() => setPhase("fading"), SHOW_MS);
    const gone = setTimeout(() => setPhase("gone"), SHOW_MS + FADE_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(gone);
    };
  }, [play]);

  if (phase === "gone") return null;
  return (
    <MotiView
      pointerEvents={phase === "on" ? "auto" : "none"}
      from={{ opacity: 1 }}
      animate={{ opacity: phase === "fading" ? 0 : 1 }}
      transition={{ type: "timing", duration: FADE_MS }}
      style={styles.screen}
      accessibilityLabel="Outhere"
    >
      <Svg width={GLOW} height={GLOW} style={styles.glow} pointerEvents="none">
        <Defs>
          <RadialGradient id="launchGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#1f5fd6" stopOpacity="0.55" />
            <Stop offset="0.45" stopColor="#163f8f" stopOpacity="0.22" />
            <Stop offset="1" stopColor="#07090c" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={GLOW / 2} cy={GLOW / 2} r={GLOW / 2} fill="url(#launchGlow)" />
      </Svg>
      <Logo size={150} animate />
      <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 420, delay: 900 }} style={{ alignItems: "center" }}>
        <Text style={styles.word}>OUTHERE</Text>
        <Text style={styles.line}>GET OUTSIDE</Text>
      </MotiView>
      {count ? (
        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ type: "timing", duration: 380, delay: 1150 }} style={styles.pill}>
          <View style={styles.dot} />
          <Text style={styles.pillText}>
            {formatNumber(count)} out in {where} now
          </Text>
        </MotiView>
      ) : null}
    </MotiView>
  );
}

const styles = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFillObject, zIndex: 50, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", top: "50%", left: "50%", marginTop: -GLOW / 2 - 40, marginLeft: -GLOW / 2 },
  word: { color: C.text, fontFamily: F.display, fontSize: 30, letterSpacing: 3, marginTop: 36 },
  line: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 3, marginTop: 14 },
  pill: { position: "absolute", bottom: 110, flexDirection: "row", alignItems: "center", gap: 8, height: 34, paddingHorizontal: 14, borderRadius: R.full, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.16)" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.out },
  pillText: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
});
