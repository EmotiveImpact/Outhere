// Daily step bars for the last 7 or 30 days, with the daily goal as a line.

import React, { useState } from "react";
import { Text, View } from "react-native";
import { useStepHistory } from "@/data/hooks";
import { compactNumber } from "@/utils/format";
import { AnimatedNumber, Body, C, Card, F, Label, Row, S, Segment, Skeleton } from "@/components/ui";

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
          <AnimatedNumber value={total} style={{ color: C.text, fontFamily: F.display, fontSize: 28, letterSpacing: -0.6, marginTop: 2 }} />
          <Body dim size={13}>
            steps · {activeDays} active day{activeDays === 1 ? "" : "s"} · avg {compactNumber(list.length ? total / list.length : 0)}
          </Body>
        </View>
        <Segment options={[{ value: 7, label: "7D" }, { value: 30, label: "30D" }]} value={days} onChange={setDays} style={{ width: 112 }} />
      </Row>

      {isPending ? (
        <Row gap={10} style={{ height: CHART_H, alignItems: "flex-end", marginTop: S.xl }}>
          {[0.4, 0.7, 0.5, 0.9, 0.6, 0.3, 0.8].map((h, i) => (
            <View key={i} style={{ flex: 1 }}>
              <Skeleton height={CHART_H * h} radius={6} />
            </View>
          ))}
        </Row>
      ) : (
        <View style={{ marginTop: S.xl }}>
          <View style={{ height: CHART_H, flexDirection: "row", alignItems: "flex-end", gap: days === 7 ? 10 : 3 }}>
            <View style={{ position: "absolute", left: 0, right: 0, bottom: goalY, height: 1, borderTopWidth: 1, borderStyle: "dashed", borderColor: C.borderStrong }} />
            {list.map((d) => {
              const h = Math.max(4, (d.steps / max) * CHART_H);
              const hit = d.steps >= goal;
              return <View key={d.date} style={{ flex: 1, height: h, borderRadius: days === 7 ? 6 : 2, backgroundColor: hit ? C.accent : d.active ? C.borderStrong : C.surfaceHigh }} />;
            })}
            {total === 0 ? (
              <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 24, alignItems: "center", justifyContent: "center" }}>
                <Body dim size={13}>
                  Day one starts now.
                </Body>
              </View>
            ) : null}
          </View>
          <Row gap={days === 7 ? 10 : 3} style={{ marginTop: S.sm }}>
            {list.map((d, i) => (
              <Text key={d.date} style={{ flex: 1, textAlign: "center", color: C.textMute, fontSize: 10 }} numberOfLines={1}>
                {days === 7 ? weekday(d.date) : i % 5 === 0 || i === list.length - 1 ? dayOfMonth(d.date) : ""}
              </Text>
            ))}
          </Row>
          <Row gap={6} style={{ marginTop: S.md }}>
            <View style={{ width: 14, height: 0, borderTopWidth: 1, borderStyle: "dashed", borderColor: C.textMute }} />
            <Body mute size={11}>
              {compactNumber(goal)} daily goal
            </Body>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: C.accent, marginLeft: S.sm }} />
            <Body mute size={11}>
              goal hit
            </Body>
          </Row>
        </View>
      )}
    </Card>
  );
}
