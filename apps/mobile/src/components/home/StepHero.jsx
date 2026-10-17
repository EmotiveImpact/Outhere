// Home hero: no box, just the step ring on the canvas, a line that moves with
// progress, today's distance and active time, and one clear action. A quiet
// notice sits underneath when the phone can't count steps.

import React from "react";
import { Linking, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Check, ChevronRight, Footprints } from "@/components/ui/icons";
import { Button, C, F, PressableScale, Row, S } from "@/components/ui";
import { formatKm, formatNumber } from "@/utils/format";
import StepRing from "./StepRing";

export function motivation(steps, goal) {
  const p = goal > 0 ? steps / goal : 0;
  if (p >= 1) return { title: "Goal smashed.", body: "Everything from here is bonus XP." };
  if (p >= 0.8) return { title: "Nearly there.", body: `${formatNumber(goal - steps)} steps to go.` };
  if (p >= 0.5) return { title: "Past halfway.", body: "Don't let it cool off now." };
  if (steps > 0) return { title: "You're moving.", body: `${formatNumber(goal - steps)} to go. Every 1,000 banks 5 XP.` };
  return { title: "Fresh day.", body: "The first steps are the ones that count." };
}

export default function StepHero({ steps, goal, today, units, checkedIn, checkingIn, onCheckIn, onMove, pedometer, onDevTools }) {
  const { width } = useWindowDimensions();
  const ringSize = Math.min(232, width - 120);
  const line = motivation(steps, goal);
  const date = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <View>
      <Text style={styles.date}>{date}</Text>

      <View style={{ alignItems: "center", marginTop: S.xl }}>
        <StepRing steps={steps} goal={goal} size={ringSize} />
      </View>

      <View style={{ alignItems: "center", marginTop: S.xxl }}>
        <Text style={styles.lineTitle}>{line.title}</Text>
        <Text style={styles.lineBody}>{line.body}</Text>
      </View>

      <Row style={styles.stats} gap={S.xxl + S.lg}>
        <HeroStat value={formatKm(today?.distance || 0, units)} label="distance" />
        <HeroStat value={`${today?.activeMinutes || 0}`} label="active min" />
      </Row>

      {checkedIn ? (
        <Button title="Start a walk" icon={Footprints} size="lg" onPress={onMove} full />
      ) : (
        <Button title="Check in  +20 XP" icon={Check} size="lg" loading={checkingIn} onPress={onCheckIn} full />
      )}

      <PedometerNotice {...pedometer} onDevTools={onDevTools} />
    </View>
  );
}

const HeroStat = ({ label, value }) => (
  <View style={{ alignItems: "center" }}>
    <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

function PedometerNotice({ available, permission, onDevTools }) {
  if (available === null || available === undefined || (available && permission === "granted")) return null;
  const denied = available && permission === "denied";
  const action = denied ? () => Linking.openSettings() : __DEV__ ? onDevTools : null;
  const body = (
    <Row gap={6} style={styles.notice}>
      <Text style={styles.noticeText} numberOfLines={2}>
        {denied ? "Step counting is off. Allow Motion & Fitness in phone settings." : __DEV__ ? "No step counter here. Add test steps in Settings." : "No step counter on this device."}
      </Text>
      {action ? <ChevronRight size={14} color={C.textMute} /> : null}
    </Row>
  );
  if (!action) return body;
  return (
    <PressableScale onPress={action} scaleTo={0.98}>
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  date: { color: C.textDim, fontSize: 13, textAlign: "center" },
  lineTitle: { color: C.text, fontFamily: F.display, fontSize: 22, letterSpacing: -0.3 },
  lineBody: { color: C.textDim, fontSize: 15, lineHeight: 21, textAlign: "center", marginTop: 4 },
  stats: { justifyContent: "center", marginTop: S.xl, marginBottom: S.xxl },
  statValue: { fontFamily: F.displayMedium, fontSize: 20, color: C.text },
  statLabel: { color: C.textDim, fontSize: 13, marginTop: 2 },
  notice: { justifyContent: "center", marginTop: S.md, paddingHorizontal: S.lg },
  noticeText: { color: C.textMute, fontSize: 13, textAlign: "center", flexShrink: 1 },
});
