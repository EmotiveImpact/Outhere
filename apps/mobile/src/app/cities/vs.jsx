// City v city on Saturday: same-size squads drawn at random, bars for squad
// average and turnout, and the score adds the two together. Your squad
// number and what you need to beat their average sit underneath. Before
// Saturday the big numbers are each side's average this week, from the league.

import React from "react";
import { RefreshControl, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight, Scale, Timer } from "@/components/ui/icons";
import { useCityFixture, useCityLeague } from "@/data/hooks";
import { C, EmptyState, F, GlowButton, Meter, R, Row, S, Skeleton, Surface, TAB_BAR_SPACE } from "@/components/ui";
import { GlowHero, TopBar } from "@/components/arena/OutsideKit";
import { cityPhoto, hasCityPhoto } from "@/components/arena/CityParts";
import { StackTabBar } from "@/components/AppTabBar";
import { formatNumber } from "@/utils/format";

/** One measure, both sides: values on the outside, label in the middle, two lit bars. */
function Pair({ label, left, right, lv, rv }) {
  const max = Math.max(1, lv, rv);
  return (
    <View style={{ marginTop: S.md }}>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
        <Text style={styles.pairValue}>{left}</Text>
        <Text style={styles.pairLabel}>{label}</Text>
        <Text style={styles.pairValue}>{right}</Text>
      </Row>
      <Row gap={S.lg} style={{ marginTop: 6 }}>
        <Meter value={lv / max} size={8} flow={false} glow={false} style={{ flex: 1, opacity: 0.6 }} />
        <Meter value={rv / max} size={8} cap style={{ flex: 1 }} />
      </Row>
    </View>
  );
}

export default function CityVs() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const { data: f, isPending, refetch, isRefetching } = useCityFixture(typeof id === "string" ? id : null);
  const league = useCityLeague().data;

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Skeleton height={280 + insets.top} radius={30} />
        <Skeleton height={260} radius={R.lg} style={{ margin: S.gutter }} />
        <TopBar />
      </View>
    );
  }
  if (!f) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 80 }}>
        <EmptyState title="No fixture this week" body="Your side plays when it has a division. Rising places play for their region." action="See the league" onAction={() => router.replace("/cities")} />
        <TopBar />
      </View>
    );
  }

  const { home, away, mine } = f;
  const mineSide = mine?.side === "away" ? away : home;
  const other = mine?.side === "away" ? home : away;
  const live = f.status === "live";
  const before = f.status === "upcoming";
  // Before kick off the match score is nothing yet, so show each side's week from the league.
  const week = (x) => (league?.sides || []).find((s) => s.kind === x.kind && s.id === x.id)?.score || 0;
  const big = (x) => (before ? week(x) : x.score);
  const avg = (x) => (before ? week(x) : x.squadAvg);
  const kicker = `${live ? "Live" : f.status === "done" ? "Full time" : "Saturday"} · ${f.division}${live ? " · Saturday" : ""}`;
  const share = () => Share.share({ message: `${home.name} vs ${away.name} on Outhere this Saturday. ${f.squadSize} a side.` }).catch(() => {});
  // The away city's photo (the place you're up against), else the home city's.
  const photo = hasCityPhoto(other.id) ? cityPhoto(other.id) : cityPhoto(mineSide.id);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_SPACE }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} progressViewOffset={insets.top + 60} />}
      >
        <GlowHero height={300} photo={photo} kicker={live ? `●  ${kicker}` : kicker} kickerColour={live ? "#ff8a90" : C.accentHi} top={home.name} bottom={`vs ${away.name}`} />
        <View style={{ paddingHorizontal: S.gutter, gap: S.md, marginTop: S.lg }}>
          <Surface padding={S.lg}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={styles.side}>{home.name}</Text>
              <Text style={styles.side}>{away.name}</Text>
            </Row>
            <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.big}>{formatNumber(big(home))}</Text>
              <Text style={styles.scoreLabel}>{before ? "This week" : "Score"}</Text>
              <Text style={[styles.big, styles.bigBlue]}>{formatNumber(big(away))}</Text>
            </Row>
            <View style={styles.divider} />
            <Pair label={before ? "Average steps\nthis week" : "Squad average\nsteps"} left={formatNumber(avg(home))} right={formatNumber(avg(away))} lv={avg(home)} rv={avg(away)} />
            <Pair label="Turnout" left={`${home.turnout}%`} right={`${away.turnout}%`} lv={home.turnout} rv={away.turnout} />
            <Pair label="Squad" left={`${formatNumber(home.squad)} of ${formatNumber(home.active)}`} right={`${formatNumber(away.squad)} of ${formatNumber(away.active)}`} lv={home.squad} rv={away.squad} />
            <Text style={[styles.small, { marginTop: S.md, textAlign: "center" }]}>
              {before ? "On Saturday the score is the squad average, plus up to 10% for turnout." : "Score is the squad average, plus up to 10% for turnout."}
            </Text>
          </Surface>

          {mine ? (
            <Surface padding={S.md} onPress={() => router.push(mine.answer ? "/cities/countdown?kind=city" : "/cities/called-up")} pressScale={0.98} contentStyle={styles.squad}>
              <View style={styles.num}>
                <Text style={styles.numText}>#{mine.number}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.squadTitle}>{mine.answer === "in" ? `You're in ${mineSide.name}'s squad` : `You're called up for ${mineSide.name}`}</Text>
                <Text style={styles.small}>
                  {before
                    ? `Saturday, all day. ${other.name} average ${formatNumber(week(other))} steps this week.`
                    : `${formatNumber(mine.steps)} steps so far · ${formatNumber(mine.toBeat)} to beat their average`}
                </Text>
              </View>
              <View>
                <ChevronRight size={18} color={C.textSoft} />
              </View>
            </Surface>
          ) : (
            <Text style={styles.small}>Squads are drawn at random on Friday from everyone active three days that week.</Text>
          )}
          {live && mine?.answer === "in" ? <GlowButton title="Go time" icon={Timer} size="lg" full onPress={() => router.push("/cities/countdown?kind=city")} /> : null}
          <GlowButton title="Why it's fair" icon={Scale} variant="quiet" size="sm" onPress={() => router.push("/cities/fair")} style={{ alignSelf: "center" }} />
        </View>
      </ScrollView>
      <TopBar onShare={share} />
      <StackTabBar current="outside" />
    </View>
  );
}

const styles = StyleSheet.create({
  side: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase" },
  big: { color: C.text, fontFamily: F.display, fontSize: 40, lineHeight: 44 },
  bigBlue: { color: C.accent, textShadowColor: "rgba(61,139,255,0.55)", textShadowRadius: 16, textShadowOffset: { width: 0, height: 0 } },
  scoreLabel: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", textAlign: "center" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginTop: S.md },
  pairValue: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  pairLabel: { color: C.textDim, fontFamily: F.body, fontSize: 11, textAlign: "center" },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  squad: { flexDirection: "row", alignItems: "center", gap: S.md },
  num: { width: 52, height: 52, borderRadius: 14, backgroundColor: "#0d1a33", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(130,180,255,0.5), inset 0 0 0 1px rgba(61,139,255,0.55), 0 8px 20px -8px rgba(42,106,240,0.8)" },
  numText: { color: C.text, fontFamily: F.display, fontSize: 18 },
  squadTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
});
