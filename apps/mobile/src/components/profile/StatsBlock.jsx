// Outside score as the hero stat, then a tidy grid of lifetime numbers.

import React from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CalendarCheck, Flame, Footprints, Map, Route, Swords, TrendingUp } from "lucide-react-native";
import { compactNumber, formatKm } from "@/utils/format";
import { AnimatedNumber, Body, C, F, FadeIn, Label, R, Row, S } from "@/components/ui";

export default function StatsBlock({ profile: p, units = "km" }) {
  const record = p.battleRecord;
  const fresh = !p.outsideScore;
  const tiles = [
    { icon: Footprints, label: "Steps", value: p.totals.steps, format: (v) => compactNumber(v) },
    { icon: Map, label: "Distance", value: p.totals.distance, format: (v) => formatKm(v, units) },
    { icon: Route, label: "Runs", value: p.totals.runs },
    { icon: Swords, label: "Battles W-L", value: record.wins, format: (v) => `${Math.round(v)}-${record.losses}` },
    { icon: CalendarCheck, label: "Check-ins", value: p.eventsAttended },
    { icon: TrendingUp, label: "This week", value: p.week.distanceKm, format: (v) => formatKm(v, units) },
  ];
  return (
    <>
      <FadeIn>
        <View style={{ borderRadius: R.lg, borderWidth: 1, borderColor: "rgba(0,255,127,0.3)", overflow: "hidden", backgroundColor: C.surface }}>
          <LinearGradient
            colors={["rgba(0,255,127,0.16)", "rgba(0,255,127,0.03)", "rgba(20,20,22,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <View style={{ padding: S.xl }}>
            <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Label style={{ color: C.accent }}>Outside score</Label>
                <AnimatedNumber value={p.outsideScore} duration={1100} style={{ color: C.text, fontFamily: F.display, fontSize: 60, lineHeight: 66, letterSpacing: -2, marginTop: 2 }} />
              </View>
              <StreakChip streak={p.streak} best={p.longestStreak} />
            </Row>
            <Body dim size={13} style={{ marginTop: S.xs }}>
              {fresh
                ? "Your score starts here. Steps, streaks, battle wins and event check-ins all push it up."
                : "Built from your steps, streaks, battle wins and check-ins. Keep it climbing."}
            </Body>
          </View>
        </View>
      </FadeIn>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginTop: S.sm }}>
        {tiles.map((t, i) => (
          <FadeIn key={t.label} index={i + 1} style={{ width: "31.5%", flexGrow: 1 }}>
            <Tile {...t} />
          </FadeIn>
        ))}
      </View>
    </>
  );
}

function StreakChip({ streak, best }) {
  const on = streak > 0;
  return (
    <View
      style={{
        alignItems: "center",
        paddingHorizontal: S.md,
        paddingVertical: S.sm,
        borderRadius: R.md,
        backgroundColor: on ? "rgba(255,107,53,0.12)" : "rgba(255,255,255,0.04)",
        borderWidth: 1,
        borderColor: on ? "rgba(255,107,53,0.35)" : C.border,
        minWidth: 76,
      }}
    >
      <Row gap={4}>
        <Flame size={18} color={on ? C.fire : C.textMute} fill={on ? C.fire : "transparent"} />
        <Text style={{ color: C.text, fontFamily: F.display, fontSize: 24 }}>{streak}</Text>
      </Row>
      <Text style={{ color: on ? C.fire : C.textMute, fontSize: 11, fontWeight: "700", letterSpacing: 0.6 }}>{on ? "DAY STREAK" : "NO STREAK"}</Text>
      <Text style={{ color: C.textMute, fontSize: 11, marginTop: 1 }}>best {best}</Text>
    </View>
  );
}

function Tile({ icon: Icon, label, value, format }) {
  const zero = !value;
  return (
    <View style={{ backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.md, minHeight: 92, justifyContent: "space-between" }}>
      <Icon size={16} color={zero ? C.textMute : C.textDim} />
      <View style={{ marginTop: S.sm }}>
        <AnimatedNumber
          value={value}
          format={format}
          adjustsFontSizeToFit
          style={{ color: zero ? C.textDim : C.text, fontFamily: F.display, fontSize: 22, letterSpacing: -0.5 }}
        />
        <Text style={{ color: C.textMute, fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginTop: 2 }} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}
