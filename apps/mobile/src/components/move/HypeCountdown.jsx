// The countdown before every run: 3, 2, 1, GO slam in with a shockwave and
// speed lines, the colour heats up from 3 to 1 and GO floods the screen blue.
// Your route, the time to beat, the OUT on offer and your streak sit
// underneath. On GO the whole layer shrinks into your pin as the map comes
// into focus (the parent scales the map back from 1.12). Start now skips it.

import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotiView } from "moti";
import Svg, { Defs, Line, RadialGradient, Rect, Stop, Text as SvgText } from "react-native-svg";
import { ChevronLeft } from "lucide-react-native";
import { C, F, PressableScale, R, S } from "@/components/ui";
import { hapticHeavy, hapticSuccess } from "@/services/haptics";
import { RoundGlass } from "./parts";

const BEATS = [
  { n: "3", c: "#82b4ff", line: "Laces tight" },
  { n: "2", c: "#4b93ff", line: "Phone away" },
  { n: "1", c: "#1f62ff", line: "Breathe" },
  { n: "GO", c: "#ffffff", line: "Go get it" },
];

function Warp({ w, h, cx, cy, colour, go }) {
  const lines = [];
  const R2 = Math.max(w, h);
  for (let i = 0; i < 96; i += 1) {
    const a = (i / 96) * Math.PI * 2;
    lines.push(<Line key={i} x1={cx + Math.cos(a) * 30} y1={cy + Math.sin(a) * 30} x2={cx + Math.cos(a) * R2} y2={cy + Math.sin(a) * R2} stroke="url(#warpFade)" strokeWidth={i % 3 === 0 ? 2.2 : 1.2} />);
  }
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="warpFade" cx={cx} cy={cy} r={R2 * 0.75} gradientUnits="userSpaceOnUse">
          <Stop offset="0.1" stopColor={colour} stopOpacity="0" />
          <Stop offset="0.3" stopColor={colour} stopOpacity={go ? 0.45 : 0.3} />
          <Stop offset="0.62" stopColor={colour} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {lines}
    </Svg>
  );
}

function Veil({ w, h, go }) {
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="veil" cx="50%" cy="44%" r="75%">
          {go ? <Stop offset="0" stopColor="#3d8bff" stopOpacity="1" /> : <Stop offset="0" stopColor="#0a1e46" stopOpacity="0.6" />}
          {go ? <Stop offset="0.65" stopColor="#0b2f80" stopOpacity="1" /> : <Stop offset="0.75" stopColor="#03050a" stopOpacity="0.93" />}
          {go ? <Stop offset="1" stopColor="#04122e" stopOpacity="1" /> : <Stop offset="1" stopColor="#03050a" stopOpacity="0.96" />}
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width={w} height={h} fill="url(#veil)" />
    </Svg>
  );
}

export default function HypeCountdown({ routeLabel, kickers = [], stakes = [], onGo, onCancel }) {
  const insets = useSafeAreaInsets();
  const { width: w, height: h } = useWindowDimensions();
  const [i, setI] = useState(0);
  const done = useRef(false);

  const go = () => {
    if (done.current) return;
    done.current = true;
    hapticSuccess();
    onGo?.();
  };

  useEffect(() => {
    if (i < 3) hapticHeavy();
    const t = setTimeout(() => (i < 3 ? setI(i + 1) : go()), i < 3 ? 1000 : 650);
    return () => clearTimeout(t);
  }, [i]);

  const beat = BEATS[i];
  const isGo = beat.n === "GO";
  const cy = h * 0.42;
  const numSize = isGo ? Math.min(220, w * 0.56) : Math.min(330, w * 0.85);

  return (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.15 }}
      exitTransition={{ type: "timing", duration: 420 }}
      transition={{ type: "timing", duration: 180 }}
      style={[StyleSheet.absoluteFill, { zIndex: 20 }]}
    >
      <Veil w={w} h={h} go={isGo} />
      <MotiView key={`warp${i}`} from={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "timing", duration: 700 }} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Warp w={w} h={h} cx={w / 2} cy={cy} colour={isGo ? "#ffffff" : "#82b4ff"} go={isGo} />
      </MotiView>

      {/* Shockwaves */}
      {[0, 120].map((delay) => (
        <MotiView
          key={`shock${i}-${delay}`}
          from={{ scale: 0.35, opacity: 1 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{ type: "timing", duration: 900, delay }}
          pointerEvents="none"
          style={[styles.shock, { left: w / 2 - 110, top: cy - 110, borderColor: beat.c, shadowColor: beat.c, borderWidth: delay ? 1.5 : 3 }]}
        />
      ))}

      {/* Ghost outlines, then the number slamming in */}
      {[0, 80].map((delay) => (
        <MotiView
          key={`ghost${i}-${delay}`}
          from={{ scale: 1, opacity: 0.9 }}
          animate={{ scale: 1.55, opacity: 0 }}
          transition={{ type: "timing", duration: 900, delay }}
          pointerEvents="none"
          style={[styles.numWrap, { top: cy - numSize * 0.55, height: numSize * 1.1 }]}
        >
          <Svg width={w} height={numSize * 1.1}>
            <SvgText x={w / 2} y={numSize * 0.92} textAnchor="middle" fontFamily={F.display} fontSize={numSize} fill="none" stroke={beat.c} strokeWidth={delay ? 1 : 2}>
              {beat.n}
            </SvgText>
          </Svg>
        </MotiView>
      ))}
      <MotiView
        key={`num${i}`}
        from={{ scale: 2.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 11, stiffness: 190, mass: 0.8 }}
        pointerEvents="none"
        style={[styles.numWrap, { top: cy - numSize * 0.55, height: numSize * 1.1 }]}
      >
        <Text style={[styles.num, { fontSize: numSize, lineHeight: numSize * 1.1, textShadowColor: isGo ? "#ffffff" : beat.c }]} accessibilityLiveRegion="assertive">
          {beat.n}
        </Text>
      </MotiView>

      <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
        <View style={styles.topRow}>
          <RoundGlass icon={ChevronLeft} label="Cancel" onPress={onCancel} />
          <View style={styles.routeChip}>
            <View style={styles.redDot} />
            <Text style={styles.routeText} numberOfLines={1}>
              {routeLabel}
            </Text>
          </View>
          <View style={{ width: 42 }} />
        </View>
        <View style={styles.bars}>
          {BEATS.map((b, k) => (
            <View key={b.n} style={[styles.bar, k <= i && { backgroundColor: beat.c, shadowColor: beat.c }]} />
          ))}
        </View>
      </View>

      <View style={[styles.lower, { top: cy + numSize * 0.48 }]} pointerEvents="box-none">
        <Text style={styles.kicker} numberOfLines={1}>
          {kickers[i] || ""}
        </Text>
        <MotiView key={`hl${i}`} from={{ translateY: 14, opacity: 0 }} animate={{ translateY: 0, opacity: 1 }} transition={{ type: "timing", duration: 380, delay: 120 }}>
          <Text style={styles.headline}>{beat.line}</Text>
        </MotiView>
        <View style={styles.stakes}>
          {stakes.map((s) => (
            <View key={s.label} style={styles.stake}>
              <Text style={styles.stakeValue} numberOfLines={1} adjustsFontSizeToFit>
                {s.value}
              </Text>
              <Text style={styles.stakeLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.foot, { bottom: insets.bottom + 26 }]}>
        <PressableScale onPress={onCancel} accessibilityLabel="Cancel" style={styles.footBtn}>
          <Text style={styles.cancel}>Cancel</Text>
        </PressableScale>
        <PressableScale onPress={go} accessibilityLabel="Start now" style={[styles.footBtn, styles.startNow]}>
          <Text style={[styles.cancel, { color: "#fff" }]}>Start now</Text>
        </PressableScale>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  shock: { position: "absolute", width: 220, height: 220, borderRadius: 110, shadowOpacity: 1, shadowRadius: 30, shadowOffset: { width: 0, height: 0 } },
  numWrap: { position: "absolute", left: 0, right: 0, alignItems: "center", justifyContent: "center" },
  num: { color: "#fff", fontFamily: F.display, textAlign: "center", textShadowRadius: 44, textShadowOffset: { width: 0, height: 0 }, includeFontPadding: false },
  top: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: S.lg, gap: S.lg },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  routeChip: { flexDirection: "row", alignItems: "center", gap: 8, height: 34, paddingHorizontal: 14, borderRadius: R.full, backgroundColor: "rgba(255,255,255,0.1)", maxWidth: "70%" },
  redDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#ff5a5f", shadowColor: "#ff5a5f", shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  routeText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 13 },
  bars: { flexDirection: "row", gap: 6 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  lower: { position: "absolute", left: S.lg, right: S.lg, alignItems: "center" },
  kicker: { color: "rgba(255,255,255,0.6)", fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase" },
  headline: { color: "#fff", fontFamily: F.display, fontSize: 36, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 10 },
  stakes: { flexDirection: "row", gap: 8, marginTop: S.xl, alignSelf: "stretch" },
  stake: { flex: 1, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 18, paddingVertical: 12, paddingHorizontal: 6, alignItems: "center" },
  stakeValue: { color: "#fff", fontFamily: F.display, fontSize: 26 },
  stakeLabel: { color: "rgba(255,255,255,0.65)", fontFamily: F.body, fontSize: 12, marginTop: 2, textAlign: "center" },
  foot: { position: "absolute", left: S.lg, right: S.lg, flexDirection: "row", gap: S.sm },
  footBtn: { flex: 1, height: 52, borderRadius: R.full, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)" },
  startNow: { backgroundColor: "rgba(61,139,255,0.35)" },
  cancel: { color: "rgba(255,255,255,0.75)", fontFamily: F.bodySemi, fontSize: 15 },
});
