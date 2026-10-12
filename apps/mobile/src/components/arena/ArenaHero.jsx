// "Battle anyone" hero at the top of the Arena: record in big numbers and the
// one call to action that matters here.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { AnimatedNumber, Button, C, F, R, Row, S } from "@/components/ui";
import { BATTLE_PRIZES } from "./shared";

export const limitsText = (limits) => {
  if (!limits) return "";
  const live = `${limits.active} of ${limits.maxActive} live`;
  if (!Number.isFinite(limits.battlesPerWeek)) return `Unlimited battles · ${live}`;
  return `${limits.createdThisWeek} of ${limits.battlesPerWeek} started this week · ${live}`;
};

export default function ArenaHero({ record, limits, quiet = false }) {
  const router = useRouter();
  const played = record.won + record.lost + record.draw;
  const rate = played ? Math.round((record.won / played) * 100) : null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Battle anyone</Text>
      <Text style={styles.sub}>
        Most steps takes {BATTLE_PRIZES.win.xp} XP and {BATTLE_PRIZES.win.out} OUT.
      </Text>

      <Row gap={0} style={styles.record}>
        <Stat label="won" value={record.won} />
        <Stat label="lost" value={record.lost} />
        <Stat label="drawn" value={record.draw} />
        {rate !== null ? <Stat label="win rate" value={rate} suffix="%" /> : null}
      </Row>

      <Button
        title="Start a battle"
        variant={quiet ? "secondary" : "primary"}
        size="lg"
        onPress={() => router.push("/battles/new")}
        full
        style={{ marginTop: S.xl }}
      />
      {limits ? <Text style={styles.limits}>{limitsText(limits)}</Text> : null}
    </View>
  );
}

function Stat({ label, value, suffix = "" }) {
  return (
    <View style={{ flex: 1, alignItems: "flex-start" }}>
      <AnimatedNumber value={value} format={(v) => `${Math.round(v)}${suffix}`} style={styles.statValue} />
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: S.xl, padding: S.xl, borderRadius: R.lg, backgroundColor: C.surface },
  title: { color: C.text, fontFamily: F.display, fontSize: 28, letterSpacing: -0.6 },
  sub: { color: C.textDim, fontSize: 15, lineHeight: 21, marginTop: 6 },
  record: { marginTop: S.xl, alignItems: "stretch" },
  statValue: { color: C.text, fontFamily: F.display, fontSize: 32, letterSpacing: -0.8, lineHeight: 36 },
  statLabel: { color: C.textDim, fontSize: 13, marginTop: 2 },
  limits: { color: C.textMute, fontSize: 12, textAlign: "center", marginTop: S.md },
});
