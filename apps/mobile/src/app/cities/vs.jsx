// City v city on Saturday: same-size squads drawn at random, bars for squad
// average and turnout, and the score adds the two together. Your squad
// number and what you need to beat their average sit underneath.

import React from "react";
import { RefreshControl, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight, Timer } from "lucide-react-native";
import { useCityFixture } from "@/data/hooks";
import { Button, C, EmptyState, F, PressableScale, R, Row, S, Skeleton } from "@/components/ui";
import { GlowHero, TopBar } from "@/components/arena/OutsideKit";
import { formatNumber } from "@/utils/format";

function Pair({ label, left, right, lv, rv }) {
  const max = Math.max(1, lv, rv);
  return (
    <View style={{ marginTop: S.md }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Text style={styles.pairValue}>{left}</Text>
        <Text style={styles.pairLabel}>{label}</Text>
        <Text style={styles.pairValue}>{right}</Text>
      </Row>
      <Row gap={S.lg} style={{ marginTop: 4 }}>
        <View style={styles.track}>
          <View style={{ width: `${(lv / max) * 100}%`, height: "100%", backgroundColor: "#2f5ea8", borderRadius: 3, alignSelf: "flex-end" }} />
        </View>
        <View style={styles.track}>
          <View style={{ width: `${(rv / max) * 100}%`, height: "100%", backgroundColor: C.accent, borderRadius: 3 }} />
        </View>
      </Row>
    </View>
  );
}

export default function CityVs() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const { data: f, isPending, refetch, isRefetching } = useCityFixture(typeof id === "string" ? id : null);

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
  const kicker = `${live ? "Live" : f.status === "done" ? "Full time" : "Saturday"} · ${f.division}${live ? " · Saturday" : ""}`;
  const share = () => Share.share({ message: `${home.name} vs ${away.name} on Outhere this Saturday. ${f.squadSize} a side.` }).catch(() => {});

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} progressViewOffset={insets.top + 60} />}
      >
        <GlowHero height={250} kicker={kicker} kickerColour={live ? "#ff8a90" : C.accentHi} top={home.name} bottom={`vs ${away.name}`} />
        <View style={{ paddingHorizontal: S.gutter, gap: S.md, marginTop: S.lg }}>
          <View style={styles.card}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={styles.side}>{home.name}</Text>
              <Text style={styles.side}>{away.name}</Text>
            </Row>
            <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.big}>{formatNumber(home.score)}</Text>
              <Text style={styles.pairLabel}>Score</Text>
              <Text style={[styles.big, { color: C.accent }]}>{formatNumber(away.score)}</Text>
            </Row>
            <View style={styles.divider} />
            <Pair label={"Squad average\nsteps"} left={formatNumber(home.squadAvg)} right={formatNumber(away.squadAvg)} lv={home.squadAvg} rv={away.squadAvg} />
            <Pair label="Turnout" left={`${home.turnout}%`} right={`${away.turnout}%`} lv={home.turnout} rv={away.turnout} />
            <Pair label="Squad" left={`${formatNumber(home.squad)} of ${formatNumber(home.active)}`} right={`${formatNumber(away.squad)} of ${formatNumber(away.active)}`} lv={home.squad} rv={away.squad} />
            <Text style={[styles.small, { marginTop: S.md }]}>Score is the squad average, plus up to 10% for turnout.</Text>
          </View>

          {mine ? (
            <PressableScale onPress={() => router.push(mine.answer ? "/cities/countdown?kind=city" : "/cities/called-up")} scaleTo={0.98} style={styles.squad}>
              <View style={styles.num}>
                <Text style={styles.numText}>#{mine.number}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.squadTitle}>{mine.answer === "in" ? `You're in ${mineSide.name}'s squad` : `You're called up for ${mineSide.name}`}</Text>
                <Text style={styles.small}>
                  {f.status === "upcoming" ? `Saturday, all day. ${formatNumber(other.squadAvg || 0)} is their average so far.` : `${formatNumber(mine.steps)} steps so far · ${formatNumber(mine.toBeat)} to beat their average`}
                </Text>
              </View>
              <ChevronRight size={18} color={C.textDim} />
            </PressableScale>
          ) : (
            <Text style={styles.small}>Squads are drawn at random on Friday from everyone active three days that week.</Text>
          )}
          {live && mine?.answer === "in" ? <Button title="Go time" icon={Timer} size="lg" full onPress={() => router.push("/cities/countdown?kind=city")} /> : null}
          <Button title="Why it's fair" variant="ghost" onPress={() => router.push("/cities/fair")} style={{ alignSelf: "center" }} />
        </View>
      </ScrollView>
      <TopBar onShare={share} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: S.lg, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.12)" },
  side: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase" },
  big: { color: C.text, fontFamily: F.display, fontSize: 36, lineHeight: 40 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginTop: S.md },
  pairValue: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  pairLabel: { color: C.textDim, fontFamily: F.body, fontSize: 11, textAlign: "center" },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: C.surfaceHigh, overflow: "hidden" },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  squad: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.md, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.12)" },
  num: { width: 52, height: 52, borderRadius: 14, backgroundColor: "#0d1a33", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(61,139,255,0.6)" },
  numText: { color: C.text, fontFamily: F.display, fontSize: 18 },
  squadTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
});
