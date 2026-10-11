// Bottom HUD while a session is recording: distance, time, pace, controls.

import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MotiView } from "moti";
import { Pause, Play, Square } from "lucide-react-native";
import { C, F, Label, R, Row, S } from "@/components/ui";
import { formatDuration, formatPace } from "@/utils/format";
import { hapticHeavy } from "@/services/haptics";
import { MOVE_SESSION_PHASE, sessionSeconds, useMoveStore } from "@/store/useMoveStore";
import { activityFor, paceFor } from "./geo";

const useTick = (on) => {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!on) return undefined;
    const id = setInterval(() => setN((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [on]);
};

export default function LiveSessionPanel({ onFinish, bottomInset = 0 }) {
  const s = useMoveStore();
  const paused = s.sessionPhase === MOVE_SESSION_PHASE.PAUSED;
  useTick(!paused);

  const seconds = sessionSeconds(s);
  const km = s.distanceM / 1000;
  const activity = activityFor(s.activityType);
  const avgPace = paceFor(km, seconds);
  const ride = s.activityType === "ride";
  const speed = (v) => (v ? `${(3600 / v).toFixed(1)}` : "--");

  return (
    <View style={[styles.panel, { paddingBottom: S.xl + bottomInset }]}>
      <Row style={{ justifyContent: "space-between" }}>
        <Row gap={6}>
          <View style={[styles.dot, { backgroundColor: paused ? C.warn : C.accent }]} />
          <Label style={{ color: paused ? C.warn : C.accent }}>{paused ? "Paused" : `${activity.label} live`}</Label>
        </Row>
        <Text style={styles.time}>{formatDuration(seconds)}</Text>
      </Row>

      <View style={styles.hero}>
        <Text style={styles.distance} adjustsFontSizeToFit numberOfLines={1}>
          {km.toFixed(2)}
        </Text>
        <Text style={styles.unit}>km</Text>
      </View>

      <Row gap={S.sm}>
        <Metric label={ride ? "Speed" : "Pace"} value={ride ? speed(s.currentPace) : formatPace(s.currentPace)} unit={ride ? "km/h" : "/km"} />
        <Metric label={ride ? "Avg speed" : "Avg pace"} value={ride ? speed(avgPace) : formatPace(avgPace)} unit={ride ? "km/h" : "/km"} />
      </Row>

      <Row gap={S.xl} style={styles.controls}>
        {paused ? (
          <>
            <RoundButton label="Finish" onPress={onFinish} icon={Square} tone="light" />
            <RoundButton label="Resume" onPress={s.resume} icon={Play} tone="accent" big />
          </>
        ) : (
          <RoundButton label="Pause" onPress={s.pause} icon={Pause} tone="accent" big />
        )}
      </Row>
    </View>
  );
}

const Metric = ({ label, value, unit }) => (
  <View style={styles.metric}>
    <Label>{label}</Label>
    <Row gap={4} style={{ alignItems: "baseline" }}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricUnit}>{unit}</Text>
    </Row>
  </View>
);

function RoundButton({ label, onPress, icon: Icon, tone, big }) {
  const size = big ? 84 : 64;
  const bg = tone === "accent" ? C.accent : C.surfaceHigh;
  const fg = tone === "accent" ? C.accentText : C.text;
  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <MotiView from={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 16 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => {
            hapticHeavy();
            onPress?.();
          }}
          style={({ pressed }) => [
            { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center" },
            tone !== "accent" && { borderWidth: 1, borderColor: C.borderStrong },
            pressed && { transform: [{ scale: 0.94 }], opacity: 0.9 },
          ]}
        >
          <Icon size={big ? 32 : 24} color={fg} fill={fg} />
        </Pressable>
      </MotiView>
      <Text style={styles.btnLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: C.bg,
    borderTopLeftRadius: R.xl,
    borderTopRightRadius: R.xl,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: S.gutter,
    paddingTop: S.xl,
    gap: S.lg,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  time: { color: C.text, fontFamily: F.displayMedium, fontSize: 22, fontVariant: ["tabular-nums"] },
  hero: { flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 8 },
  distance: { color: C.text, fontFamily: F.display, fontSize: 88, lineHeight: 92, letterSpacing: -2, fontVariant: ["tabular-nums"] },
  unit: { color: C.textDim, fontFamily: F.displayMedium, fontSize: 22 },
  metric: { flex: 1, backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.md, gap: 4 },
  metricValue: { color: C.text, fontFamily: F.display, fontSize: 24, fontVariant: ["tabular-nums"] },
  metricUnit: { color: C.textMute, fontSize: 12 },
  controls: { justifyContent: "center", marginTop: S.xs },
  btnLabel: { color: C.textDim, fontSize: 12, fontWeight: "600" },
});
