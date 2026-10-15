// Stats tab: when the crew moves, as a heat grid across the week by time of
// day, then the month's runs, average pace and OUT earned.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Flame } from "lucide-react-native";
import { Body, C, Card, F, Row, S, Skeleton, StatTile } from "@/components/ui";
import { useCrewStats } from "@/data/hooks";
import { compactNumber, formatNumber, formatPace } from "@/utils/format";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

// Dark navy for a quiet hour up to bright blue for the busiest.
const LOW = [27, 39, 58];
const HIGH = [79, 155, 255];
const heatColour = (v) => {
  const t = Math.max(0, Math.min(1, v));
  const c = LOW.map((lo, i) => Math.round(lo + (HIGH[i] - lo) * Math.pow(t, 0.8)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

export function HeatGrid({ stats }) {
  return (
    <Card padding={S.lg}>
      <Row style={{ justifyContent: "space-between", marginBottom: S.md }}>
        <Text style={styles.h}>When we move</Text>
        <Text style={styles.accent}>This month</Text>
      </Row>
      <Row gap={6} style={{ marginBottom: 6 }}>
        <View style={styles.slotLabel} />
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={[styles.weekday, { flex: 1 }]}>
            {d}
          </Text>
        ))}
      </Row>
      {stats.heat.map((row, r) => (
        <Row key={r} gap={6} style={{ marginBottom: 6 }}>
          <Text style={styles.slotLabel}>{stats.slots[r]}</Text>
          {row.map((v, c) => (
            <View key={c} style={[styles.cell, { backgroundColor: heatColour(v) }]} accessibilityLabel={`${WEEKDAYS[c]} ${stats.slots[r]}: ${Math.round(v * 100)}%`} />
          ))}
        </Row>
      ))}
      {stats.busiest ? (
        <Row gap={6} style={{ marginTop: S.sm }}>
          <Flame size={14} color={C.accent} />
          <Body dim size={13}>
            {"Busiest: "}
            <Text style={{ color: C.text, fontFamily: F.bodySemi }}>{stats.busiest}</Text>
          </Body>
        </Row>
      ) : (
        <Body dim size={13} style={{ marginTop: S.sm }}>
          No runs yet this month. The first one lights it up.
        </Body>
      )}
    </Card>
  );
}

export default function CrewStats({ crew }) {
  const stats = useCrewStats(crew.id);
  const s = stats.data;
  return (
    <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg }}>
      {s ? <HeatGrid stats={s} /> : <Skeleton height={260} radius={20} />}
      <Row gap={S.md} style={{ marginTop: S.md }}>
        <StatTile value={s ? formatNumber(s.runs) : "-"} label="Runs" />
        <StatTile value={s ? formatPace(s.avgPaceSec) : "-"} label="Avg pace" />
        <StatTile value={s ? compactNumber(s.out) : "-"} label="OUT" />
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  h: { color: C.text, fontFamily: F.bodySemi, fontSize: 17 },
  accent: { color: C.accent, fontFamily: F.bodySemi, fontSize: 13 },
  weekday: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 11, textAlign: "center" },
  slotLabel: { width: 26, color: C.textDim, fontFamily: F.body, fontSize: 11 },
  cell: { flex: 1, height: 28, borderRadius: 7 },
});
