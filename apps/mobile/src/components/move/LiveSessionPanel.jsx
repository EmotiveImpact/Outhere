// Bottom HUD while a session is recording: hero distance, time and pace,
// GPS quality and the big pause / resume / hold-to-finish controls.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Pause, Play, Square } from "lucide-react-native";
import { AnimatedNumber, C, F, Label, LiveDot, R, Row, S } from "@/components/ui";
import { formatDuration, formatPace } from "@/utils/format";
import { MOVE_SESSION_PHASE, sessionSeconds, useMoveStore } from "@/store/useMoveStore";
import { activityFor, paceFor } from "./geo";
import { GpsBadge, HoldButton, RoundControl, StatCell } from "./MoveKit";

const useTick = (on) => {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!on) return undefined;
    const id = setInterval(() => setN((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [on]);
};

const kmh = (secPerKm) => (secPerKm ? (3600 / secPerKm).toFixed(1) : "--");

export default function LiveSessionPanel({ onFinish, accuracy, bottomInset = 0 }) {
  const s = useMoveStore();
  const paused = s.sessionPhase === MOVE_SESSION_PHASE.PAUSED;
  useTick(!paused);

  const seconds = sessionSeconds(s);
  const km = s.distanceM / 1000;
  const activity = activityFor(s.activityType);
  const avgPace = paceFor(km, seconds);
  const ride = s.activityType === "ride";

  return (
    <View style={[styles.panel, { paddingBottom: S.lg + bottomInset }]}>
      <LinearGradient
        pointerEvents="none"
        colors={[paused ? "rgba(255,193,7,0.10)" : "rgba(0,255,127,0.10)", "transparent"]}
        style={[StyleSheet.absoluteFill, { borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, height: 160 }]}
      />
      <Row style={{ justifyContent: "space-between" }}>
        <Row gap={8}>
          {paused ? <View style={styles.pausedDot} /> : <LiveDot size={9} />}
          <Label style={{ color: paused ? C.warn : C.accent }}>{paused ? "Paused" : `${activity.label} recording`}</Label>
        </Row>
        <GpsBadge accuracy={accuracy} />
      </Row>

      <View style={styles.hero}>
        <AnimatedNumber value={km} format={(v) => v.toFixed(2)} duration={500} style={[styles.distance, paused && { color: C.textDim }]} />
        <Text style={styles.unit}>KM</Text>
      </View>

      <View style={styles.grid}>
        <StatCell label="Time" value={formatDuration(seconds)} />
        <View style={styles.rule} />
        {ride ? <StatCell label="Speed" value={kmh(s.currentPace)} unit="km/h" /> : <StatCell label="Pace" value={formatPace(s.currentPace)} unit="/km" />}
        <View style={styles.rule} />
        {ride ? <StatCell label="Avg" value={kmh(avgPace)} unit="km/h" /> : <StatCell label="Avg pace" value={formatPace(avgPace)} unit="/km" />}
      </View>

      <Row style={styles.controls}>
        {paused ? (
          <>
            <HoldButton icon={Square} label="Finish" onComplete={onFinish} size={72} />
            <RoundControl icon={Play} label="Resume" onPress={s.resume} tone="accent" size={88} />
          </>
        ) : (
          <RoundControl icon={Pause} label="Pause" onPress={s.pause} tone="accent" size={88} />
        )}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: C.bg,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: C.border,
    paddingHorizontal: S.gutter,
    paddingTop: S.xl,
    gap: S.lg,
    overflow: "hidden",
  },
  pausedDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.warn },
  hero: { alignItems: "center", marginTop: -S.xs },
  distance: { color: C.text, fontFamily: F.display, fontSize: 64, lineHeight: 70, letterSpacing: -1.5, fontVariant: ["tabular-nums"] },
  unit: { color: C.textMute, fontSize: 12, fontWeight: "800", letterSpacing: 2, marginTop: -2 },
  grid: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, paddingVertical: S.lg },
  rule: { width: 1, alignSelf: "stretch", backgroundColor: C.border },
  controls: { justifyContent: "center", alignItems: "flex-start", gap: 48, marginTop: S.xs },
});
