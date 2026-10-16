// Why it's fair: switch between totals and squads to see why a small place
// can beat a big one. Then the three rules in plain words.

import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCityFixture, useCityLeague } from "@/data/hooks";
import { C, F, Meter, Row, S, Segment, Surface, TAB_BAR_SPACE } from "@/components/ui";
import { GlowHero, TopBar } from "@/components/arena/OutsideKit";
import { StackTabBar } from "@/components/AppTabBar";
import { PHOTOS } from "@/constants/photos";
import { compactNumber, formatNumber } from "@/utils/format";

const RULES = [
  ["Same size squads", "Both sides field the same number. A cup tie uses the smaller side's size."],
  ["Drawn at random on Friday", "From everyone active three days that week, so nobody stacks the team."],
  ["Turnout bonus", "Up to 10% more for the side where more of its squad shows up."],
];

export default function Fair() {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState("squads");
  const f = useCityFixture().data;
  const league = useCityLeague().data;

  // Your fixture if you have one, else the biggest side against the smallest.
  const sides = league?.sides || [];
  const big = f ? (f.home.active >= f.away.active ? f.home : f.away) : sides.slice().sort((a, b) => b.active - a.active)[0];
  const small = f ? (f.home.active >= f.away.active ? f.away : f.home) : sides.slice().sort((a, b) => a.active - b.active)[0];
  // A squad's number is its average steps; a total is roughly that times everyone active.
  // Before Saturday a fixture side has no squad average yet, so use its week in the league.
  const week = (x) => sides.find((y) => y.kind === x.kind && y.id === x.id)?.score || 0;
  const bigSquad = big ? big.squadAvg || big.score || week(big) : 0;
  const smallSquad = small ? small.squadAvg || small.score || week(small) : 0;
  const rows =
    big && small
      ? view === "totals"
        ? [
            [big.name, big.active * bigSquad, false],
            [small.name, small.active * smallSquad, true],
          ]
        : [
            [big.name, bigSquad, false],
            [small.name, smallSquad, true],
          ]
      : [];
  const max = Math.max(1, ...rows.map((x) => x[1]));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_SPACE }}>
        <GlowHero height={230} object={PHOTOS.shield} objectSize={240} objectStyle={{ right: -44, top: insets.top - 16 }} kicker="How city battles stay fair" top={small ? `${formatNumber(small.active)} can beat` : "Small can beat"} bottom={big ? formatNumber(big.active) : "big"} />
        <View style={{ paddingHorizontal: S.gutter, gap: S.md, marginTop: S.lg }}>
          <Segment
            options={[
              { value: "totals", label: "Totals" },
              { value: "squads", label: "Squads" },
            ]}
            value={view}
            onChange={setView}
          />
          {rows.length ? (
            <Surface padding={S.lg}>
              {rows.map(([name, v, hi]) => (
                <Row key={name} gap={S.md} style={{ paddingVertical: 7 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {name}
                  </Text>
                  <Meter value={v / max} size={12} flow={hi} cap={hi} style={[{ flex: 1 }, !hi && { opacity: 0.6 }]} />
                  <Text style={styles.value}>{view === "totals" ? compactNumber(v) : formatNumber(v)}</Text>
                </Row>
              ))}
              <Text style={[styles.small, { marginTop: S.sm }]}>
                {view === "totals" ? "Add up everyone's steps and the bigger place always wins. That's not a game." : "Same size squads, picked at random. Now it's about who moves more."}
              </Text>
            </Surface>
          ) : null}
          <Surface padding={S.lg}>
            {RULES.map(([t, d], i) => (
              <Row key={t} gap={S.md} style={[{ alignItems: "flex-start", paddingVertical: 10 }, i > 0 && styles.line]}>
                <Text style={styles.num}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ruleTitle}>{t}</Text>
                  <Text style={styles.small}>{d}</Text>
                </View>
              </Row>
            ))}
          </Surface>
        </View>
      </ScrollView>
      <TopBar />
      <StackTabBar current="outside" />
    </View>
  );
}

const styles = StyleSheet.create({
  name: { width: 96, color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  value: { width: 56, textAlign: "right", color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  num: { width: 18, color: C.accent, fontFamily: F.display, fontSize: 22 },
  ruleTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
});
