// Stats tab: when the crew moves, as a heat grid across the week by time of
// day, then the month's runs, average pace and OUT earned.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Flame } from "@/components/ui/icons";
import { Body, C, F, Row, S, Skeleton, StatTile, Surface } from "@/components/ui";
import { useCrewStats } from "@/data/hooks";
import { compactNumber, formatNumber, formatPace } from "@/utils/format";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

// Near black for a quiet hour up to bright blue for the busiest, with more
// contrast low down so a quiet slot reads as quiet.
const LOW = [22, 30, 44];
const HIGH = [79, 155, 255];
const heatColour = (v) => {
  const t = Math.max(0, Math.min(1, v));
  const c = LOW.map((lo, i) => Math.round(lo + (HIGH[i] - lo) * Math.pow(t, 1.15)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

export function HeatGrid({ stats }) {
  const peak = Math.max(0, ...stats.heat.flat());
  return (
    <Surface radius={22} padding={null} contentStyle={{ padding: 14 }}>
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
            <View
              key={c}
              style={[styles.cell, { backgroundColor: heatColour(v) }, v > 0.15 && styles.cellLit, peak > 0 && v === peak && styles.cellPeak]}
              accessibilityLabel={`${WEEKDAYS[c]} ${stats.slots[r]}: ${Math.round(v * 100)}%${peak > 0 && v === peak ? ", the busiest" : ""}`}
            />
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
    </Surface>
  );
}

export default function CrewStats({ crew }) {
  const stats = useCrewStats(crew.id);
  const s = stats.data;
  return (
    <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg }}>
      {s ? <HeatGrid stats={s} /> : <Skeleton height={260} radius={20} />}
      <Row gap={8} style={{ marginTop: 10 }}>
        <StatTile value={s ? formatNumber(s.runs) : "-"} label="Runs" />
        <StatTile value={s ? formatPace(s.avgPaceSec) : "-"} label="Avg pace" />
        <StatTile value={s ? compactNumber(s.out) : "-"} label="OUT" />
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  h: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  accent: { color: C.accent, fontFamily: F.bodySemi, fontSize: 13 },
  weekday: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 11, textAlign: "center" },
  slotLabel: { width: 26, color: C.textDim, fontFamily: F.body, fontSize: 11 },
  cell: { flex: 1, height: 28, borderRadius: 7 },
  cellLit: { boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)" },
  // the busiest slot glows (.r11heat .pk)
  cellPeak: { boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 0 0 1.5px rgba(207,225,255,0.85), 0 0 18px rgba(79,155,255,0.8)" },
});
