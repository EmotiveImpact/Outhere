// "Battle anyone" hero at the top of the Arena: record in big numbers and the
// one call to action that matters here.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Swords } from "lucide-react-native";
import { AnimatedNumber, Button, C, F, Label, R, Row, S } from "@/components/ui";
import { BATTLE_PRIZES } from "./shared";

export const limitsText = (limits) => {
  if (!limits) return "";
  const live = `${limits.active} of ${limits.maxActive} live`;
  if (!Number.isFinite(limits.battlesPerWeek)) return `Unlimited battles · ${live}`;
  return `${limits.createdThisWeek} of ${limits.battlesPerWeek} started this week · ${live}`;
};

export default function ArenaHero({ record, limits }) {
  const router = useRouter();
  const played = record.won + record.lost + record.draw;
  const rate = played ? Math.round((record.won / played) * 100) : null;

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={["rgba(0,255,127,0.26)", "rgba(0,255,127,0.06)", "rgba(20,20,22,0)"]}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.decor} pointerEvents="none">
        <Swords size={170} color="rgba(0,255,127,0.07)" strokeWidth={1.2} />
      </View>

      <Label style={{ color: C.accent }}>The Arena</Label>
      <Text style={styles.title}>Battle anyone</Text>
      <Text style={styles.sub}>
        Pick a rival, set the clock. Most steps takes {BATTLE_PRIZES.win.xp} XP and {BATTLE_PRIZES.win.out} OUT.
      </Text>

      <Row gap={0} style={styles.record}>
        <Stat label="Won" value={record.won} accent />
        <View style={styles.rule} />
        <Stat label="Lost" value={record.lost} />
        <View style={styles.rule} />
        <Stat label="Drawn" value={record.draw} />
        {rate !== null ? (
          <>
            <View style={styles.rule} />
            <Stat label="Win rate" value={rate} suffix="%" />
          </>
        ) : null}
      </Row>

      <Button title="Start a battle" icon={Swords} size="lg" onPress={() => router.push("/battles/new")} full style={{ marginTop: S.xl }} />
      {limits ? <Text style={styles.limits}>{limitsText(limits)}</Text> : null}
    </View>
  );
}

function Stat({ label, value, accent = false, suffix = "" }) {
  return (
    <View style={{ flex: 1, alignItems: "flex-start" }}>
      <AnimatedNumber value={value} format={(v) => `${Math.round(v)}${suffix}`} style={[styles.statValue, accent && { color: C.accent }]} />
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: S.xl, padding: S.xl, borderRadius: R.lg, borderWidth: 1, borderColor: "rgba(0,255,127,0.28)", backgroundColor: "#0c120f", overflow: "hidden" },
  decor: { position: "absolute", right: -34, top: -26, transform: [{ rotate: "-12deg" }] },
  title: { color: C.text, fontFamily: F.display, fontSize: 32, letterSpacing: -0.8, marginTop: 6 },
  sub: { color: C.textDim, fontSize: 15, lineHeight: 21, marginTop: 6 },
  record: { marginTop: S.xl, alignItems: "stretch" },
  rule: { width: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.14)", marginHorizontal: S.md },
  statValue: { color: C.text, fontFamily: F.display, fontSize: 40, letterSpacing: -1, lineHeight: 44 },
  statLabel: { color: C.textMute, fontSize: 11, fontWeight: "700", letterSpacing: 1.1, textTransform: "uppercase", marginTop: 2 },
  limits: { color: C.textMute, fontSize: 12, textAlign: "center", marginTop: S.md },
});
