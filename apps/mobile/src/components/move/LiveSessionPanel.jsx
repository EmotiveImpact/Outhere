// Bottom HUD while a session is recording: one huge distance, three quiet
// stats, and the pause / resume / hold-to-finish controls.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Pause, Play, Square } from "lucide-react-native";
import { AnimatedNumber, C, F, LiveDot, R, Row, S } from "@/components/ui";
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
      <Row style={{ justifyContent: "space-between" }}>
        <Row gap={8}>
          {paused ? <View style={styles.pausedDot} /> : <LiveDot size={8} />}
          <Text style={styles.status}>{paused ? "Paused" : activity.label}</Text>
        </Row>
        <GpsBadge accuracy={accuracy} />
      </Row>

      <View style={styles.hero}>
        <AnimatedNumber value={km} format={(v) => v.toFixed(2)} duration={500} style={[styles.distance, paused && { color: C.textDim }]} />
        <Text style={styles.unit}>Kilometres</Text>
      </View>

      <View style={styles.stats}>
        <StatCell label="Time" value={formatDuration(seconds)} size={24} />
        {ride ? <StatCell label="Speed" value={kmh(s.currentPace)} unit="km/h" size={24} /> : <StatCell label="Pace" value={formatPace(s.currentPace)} unit="/km" size={24} />}
        {ride ? <StatCell label="Avg speed" value={kmh(avgPace)} unit="km/h" size={24} /> : <StatCell label="Avg pace" value={formatPace(avgPace)} unit="/km" size={24} />}
      </View>

      <Row style={styles.controls}>
        {paused ? (
          <>
            <HoldButton icon={Square} label="Finish" onComplete={onFinish} size={72} />
            <RoundControl icon={Play} label="Resume" onPress={s.resume} tone="accent" size={84} />
          </>
        ) : (
          <RoundControl icon={Pause} label="Pause" onPress={s.pause} tone="accent" size={84} />
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
    paddingHorizontal: S.gutter,
    paddingTop: S.xl,
    gap: S.xl,
  },
  pausedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.warn },
  status: { color: C.textDim, fontSize: 13, fontWeight: "600" },
  hero: { alignItems: "center" },
  distance: { color: C.text, fontFamily: F.display, fontSize: 96, lineHeight: 100, letterSpacing: -3, fontVariant: ["tabular-nums"] },
  unit: { color: C.textDim, fontSize: 15, marginTop: -2 },
  stats: { flexDirection: "row", alignItems: "flex-start" },
  controls: { justifyContent: "center", alignItems: "flex-start", gap: 48 },
});
