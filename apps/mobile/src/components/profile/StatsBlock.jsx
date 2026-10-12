// Outside score as the hero number, the streak beside it, then lifetime
// numbers as plain columns on the same card.

import React from "react";
import { Text, View } from "react-native";
import { Flame } from "lucide-react-native";
import { compactNumber, formatKm } from "@/utils/format";
import { AnimatedNumber, Body, C, Card, Divider, F, FadeIn, Row, S } from "@/components/ui";

export default function StatsBlock({ profile: p, units = "km" }) {
  const record = p.battleRecord;
  const fresh = !p.outsideScore;
  const stats = [
    { label: "steps", value: p.totals.steps, format: (v) => compactNumber(v) },
    { label: "distance", value: p.totals.distance, format: (v) => formatKm(v, units) },
    { label: "runs", value: p.totals.runs },
    { label: "battle record", value: record.wins, format: (v) => `${Math.round(v)}-${record.losses}` },
    { label: "check-ins", value: p.eventsAttended },
    { label: "this week", value: p.week.distanceKm, format: (v) => formatKm(v, units) },
  ];
  return (
    <FadeIn>
      <Card padding={S.xl}>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <AnimatedNumber value={p.outsideScore} duration={1100} style={{ color: C.text, fontFamily: F.display, fontSize: 56, lineHeight: 62, letterSpacing: -1.5 }} />
            <Body dim size={13}>
              Outside score
            </Body>
          </View>
          <Streak streak={p.streak} best={p.longestStreak} />
        </Row>
        {fresh ? (
          <Body mute size={13} style={{ marginTop: S.md }}>
            Steps, streaks, battle wins and check-ins all push it up.
          </Body>
        ) : null}

        <Divider style={{ marginVertical: S.lg }} />

        <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: S.lg }}>
          {stats.map((t) => (
            <Stat key={t.label} {...t} />
          ))}
        </View>
      </Card>
    </FadeIn>
  );
}

function Streak({ streak, best }) {
  const on = streak > 0;
  return (
    <View style={{ alignItems: "flex-end", paddingTop: 6 }}>
      <Row gap={4}>
        <Flame size={18} color={on ? C.fire : C.textMute} fill={on ? C.fire : "transparent"} />
        <Text style={{ color: C.text, fontFamily: F.display, fontSize: 24 }}>{streak}</Text>
      </Row>
      <Body dim size={13}>
        {on ? "day streak" : "no streak"}
      </Body>
      <Body mute size={13}>
        best {best}
      </Body>
    </View>
  );
}

function Stat({ label, value, format }) {
  return (
    <View style={{ width: "33.33%" }}>
      <AnimatedNumber
        value={value}
        format={format}
        adjustsFontSizeToFit
        numberOfLines={1}
        style={{ color: value ? C.text : C.textDim, fontFamily: F.display, fontSize: 20, letterSpacing: -0.4 }}
      />
      <Text style={{ color: C.textDim, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
