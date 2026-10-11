// Daily step bars for the last 7 or 30 days, with the daily goal as a line.

import React, { useState } from "react";
import { Text, View } from "react-native";
import { BarChart3 } from "lucide-react-native";
import { useStepHistory } from "@/data/hooks";
import { compactNumber, formatNumber } from "@/utils/format";
import { Body, C, Card, EmptyState, F, Label, Loading, Row, S, Segment } from "@/components/ui";

const CHART_H = 120;
const weekday = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "narrow" });
};
const dayOfMonth = (key) => String(Number(key.slice(8)));

export default function StepHistory({ goal = 10000 }) {
  const [days, setDays] = useState(7);
  const { data, isPending } = useStepHistory(days);
  const list = data || [];
  const total = list.reduce((s, d) => s + d.steps, 0);
  const activeDays = list.filter((d) => d.active).length;
  const max = Math.max(goal, ...list.map((d) => d.steps), 1);
  const goalY = (goal / max) * CHART_H;

  return (
    <Card>
      <Row style={{ justifyContent: "space-between" }}>
        <View>
          <Label>Last {days} days</Label>
          <Text style={{ color: C.text, fontFamily: F.display, fontSize: 26, marginTop: 2 }}>{formatNumber(total)}</Text>
          <Body mute size={12}>
            steps · {activeDays} active day{activeDays === 1 ? "" : "s"} · avg {compactNumber(list.length ? total / list.length : 0)}
          </Body>
        </View>
        <Segment options={[{ value: 7, label: "7D" }, { value: 30, label: "30D" }]} value={days} onChange={setDays} style={{ width: 112 }} />
      </Row>

      {isPending ? (
        <Loading style={{ paddingVertical: 40 }} />
      ) : total === 0 ? (
        <EmptyState icon={BarChart3} title="No steps yet" body="Your daily steps show up here as you move." style={{ paddingVertical: 24 }} />
      ) : (
        <View style={{ marginTop: S.xl }}>
          <View style={{ height: CHART_H, flexDirection: "row", alignItems: "flex-end", gap: days === 7 ? 10 : 3 }}>
            <View style={{ position: "absolute", left: 0, right: 0, bottom: goalY, height: 1, borderTopWidth: 1, borderStyle: "dashed", borderColor: C.borderStrong }} />
            {list.map((d) => {
              const h = Math.max(3, (d.steps / max) * CHART_H);
              const hit = d.steps >= goal;
              return <View key={d.date} style={{ flex: 1, height: h, borderRadius: days === 7 ? 6 : 2, backgroundColor: hit ? C.accent : d.active ? "rgba(0,255,127,0.45)" : C.surfaceHigh }} />;
            })}
          </View>
          <Row gap={days === 7 ? 10 : 3} style={{ marginTop: S.sm }}>
            {list.map((d, i) => (
              <Text key={d.date} style={{ flex: 1, textAlign: "center", color: C.textMute, fontSize: 10 }} numberOfLines={1}>
                {days === 7 ? weekday(d.date) : i % 5 === 0 || i === list.length - 1 ? dayOfMonth(d.date) : ""}
              </Text>
            ))}
          </Row>
          <Body mute size={11} style={{ marginTop: S.sm }}>
            Dashed line is your {compactNumber(goal)} daily goal.
          </Body>
        </View>
      )}
    </Card>
  );
}
