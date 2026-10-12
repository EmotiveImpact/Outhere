// Home hero: the step ring, a line that moves with progress, today's numbers
// and one clear action. A compact notice sits at the foot when the phone
// can't count steps.

import React from "react";
import { Linking, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Check, ChevronRight, Footprints, TriangleAlert } from "lucide-react-native";
import { Button, C, F, Label, PressableScale, R, Row, S } from "@/components/ui";
import { compactNumber, formatKm, formatNumber } from "@/utils/format";
import StepRing from "./StepRing";

export function motivation(steps, goal) {
  const p = goal > 0 ? steps / goal : 0;
  if (p >= 1) return { title: "Goal smashed.", body: "Everything from here is bonus XP." };
  if (p >= 0.8) return { title: "Nearly there.", body: `${formatNumber(goal - steps)} steps. One more lap round the block.` };
  if (p >= 0.5) return { title: "Past halfway.", body: "Don't let it cool off now." };
  if (steps > 0) return { title: "You're moving.", body: `${formatNumber(goal - steps)} to go. Every 1,000 banks 5 XP.` };
  return { title: "Fresh day.", body: "The first steps are the ones that count. Get out there." };
}

export default function StepHero({ steps, goal, today, units, checkedIn, checkingIn, onCheckIn, onMove, pedometer, onDevTools }) {
  const { width } = useWindowDimensions();
  const ringSize = Math.min(216, width - 140);
  const done = steps >= goal;
  const line = motivation(steps, goal);
  const date = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={done ? ["rgba(0,255,127,0.24)", "rgba(0,255,127,0.04)", "rgba(0,255,127,0)"] : ["rgba(0,255,127,0.14)", "rgba(0,255,127,0.02)", "rgba(0,255,127,0)"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Row style={{ justifyContent: "space-between", paddingHorizontal: S.xl, paddingTop: S.lg }}>
        <Label style={{ color: C.accent }}>Today</Label>
        <Text style={styles.date}>{date}</Text>
      </Row>

      <View style={{ alignItems: "center", marginTop: S.sm }}>
        <StepRing steps={steps} goal={goal} size={ringSize} />
      </View>

      <View style={{ alignItems: "center", paddingHorizontal: S.xl, marginTop: S.xs }}>
        <Text style={[styles.lineTitle, done && { color: C.accent }]}>{line.title}</Text>
        <Text style={styles.lineBody}>{line.body}</Text>
      </View>

      <Row style={styles.stats}>
        <HeroStat label="Distance" value={formatKm(today?.distance || 0, units)} />
        <View style={styles.statDivider} />
        <HeroStat label="Active" value={`${today?.activeMinutes || 0} min`} />
        <View style={styles.statDivider} />
        <HeroStat label="Goal" value={compactNumber(goal)} />
      </Row>

      <View style={{ paddingHorizontal: S.lg, paddingBottom: S.lg }}>
        {checkedIn ? (
          <Button title="Start a walk" icon={Footprints} size="lg" onPress={onMove} full />
        ) : (
          <Button title="Check in  +20 XP" icon={Check} size="lg" loading={checkingIn} onPress={onCheckIn} full />
        )}
      </View>

      <PedometerNotice {...pedometer} onDevTools={onDevTools} />
    </View>
  );
}

const HeroStat = ({ label, value }) => (
  <View style={{ alignItems: "center", flex: 1 }}>
    <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
    <Label style={{ marginTop: 3 }}>{label}</Label>
  </View>
);

function PedometerNotice({ available, permission, onDevTools }) {
  if (available === null || available === undefined || (available && permission === "granted")) return null;
  const denied = available && permission === "denied";
  const action = denied ? () => Linking.openSettings() : __DEV__ ? onDevTools : null;
  const body = (
    <Row gap={10} style={styles.notice}>
      <TriangleAlert size={15} color={C.warn} />
      <View style={{ flex: 1 }}>
        <Text style={styles.noticeTitle} numberOfLines={1}>
          {denied ? "Step counting is off" : "No step counter on this device"}
        </Text>
        <Text style={styles.noticeBody} numberOfLines={1}>
          {denied ? "Allow Motion & Fitness in phone settings" : __DEV__ ? "Add test steps in Settings" : "Steps come in on your phone"}
        </Text>
      </View>
      {action ? <ChevronRight size={16} color={C.textMute} /> : null}
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
  card: { borderRadius: R.lg + 4, borderWidth: 1, borderColor: "rgba(0,255,127,0.22)", backgroundColor: C.surface, overflow: "hidden" },
  date: { color: C.textDim, fontSize: 12, fontWeight: "600" },
  lineTitle: { color: C.text, fontFamily: F.display, fontSize: 22, letterSpacing: -0.3 },
  lineBody: { color: C.textDim, fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 4 },
  stats: { marginHorizontal: S.lg, marginTop: S.lg, marginBottom: S.lg, paddingVertical: S.md, borderRadius: R.md, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: C.border },
  statValue: { fontFamily: F.displayMedium, fontSize: 18, color: C.text },
  statDivider: { width: 1, height: 26, backgroundColor: C.border },
  notice: { borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: S.lg, paddingVertical: S.md, backgroundColor: "rgba(255,193,7,0.05)" },
  noticeTitle: { color: C.text, fontSize: 13, fontWeight: "700" },
  noticeBody: { color: C.textMute, fontSize: 12, marginTop: 1 },
});
