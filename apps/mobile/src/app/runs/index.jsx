// Run history (the prototype's runs): the slab with the year's kilometres
// and the bars blended in, then every session with its own little night map,
// by week, month or year, with the tab bar along the bottom.

import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Footprints, Route as RouteIcon, ShieldCheck } from "lucide-react-native";
import { C, EmptyState, F, FadeIn, PressableScale, Segment, Skeleton, TAB_BAR_SPACE } from "@/components/ui";
import { StackTabBar } from "@/components/AppTabBar";
import { useRunHistory } from "@/data/hooks";
import { formatNumber, formatPace } from "@/utils/format";
import { RoundGlass } from "@/components/move/parts";
import { LitCard, Slab, whenLabel } from "@/components/move/RunBits";
import { MapArt } from "@/components/move/MapTexture";
import { MOVE_IMAGES } from "@/components/move/images";

const PERIODS = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const kmText = (km) => (km >= 100 ? Math.round(km) : km >= 10 ? km.toFixed(1) : km.toFixed(km % 1 ? 2 : 1).replace(/0$/, ""));

function RunRow({ run, first, onPress }) {
  const sub = [whenLabel(run.startedAt, { time: first })];
  if (run.type === "walk") sub.push(`${formatNumber(run.steps)} steps`);
  else if (run.paceSecPerKm) sub.push(`${formatPace(run.paceSecPerKm)} /km`);
  if (run.isPb) sub.push("PB");
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} accessibilityLabel={`${run.title}, ${run.distanceKm} km, ${sub.join(", ")}`} style={[styles.row, !first && styles.rule]}>
      <View style={styles.thumb}>
        {run.route?.length > 1 ? <MapArt width={52} height={52} lines={[{ path: run.route, width: 3.5 }]} start={false} end={false} pad={{ top: 9, right: 9, bottom: 9, left: 9 }} shade={false} /> : <Footprints size={20} color={C.accentHi} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {run.title}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {sub.join(" · ")}
        </Text>
      </View>
      <Text style={styles.km}>
        {kmText(run.distanceKm)}
        <Text style={styles.kmUnit}> km</Text>
      </Text>
    </PressableScale>
  );
}

export default function RunHistory() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState("month");
  const { data, isPending } = useRunHistory(period);
  const runs = data?.runs || [];
  const back = () => (router.canGoBack() ? router.back() : router.navigate("/(tabs)/move"));

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + insets.bottom + 10 }} showsVerticalScrollIndicator={false}>
        <Slab
          object={MOVE_IMAGES.bars}
          objectSize={200}
          objectStyle={{ right: -30, top: 14 }}
          height={222}
          kicker={`Your runs · ${data?.year || new Date().getFullYear()}`}
          top={`${formatNumber(data?.yearKm || 0)} km`}
          bottom="This year"
          left={<RoundGlass icon={ChevronLeft} label="Back" onPress={back} />}
          right={
            <View style={{ flexDirection: "row", gap: 8 }}>
              <RoundGlass icon={ShieldCheck} label="Live sharing" onPress={() => router.push("/runs/safety")} />
              <RoundGlass icon={RouteIcon} label="Your routes" onPress={() => router.push("/routes")} />
            </View>
          }
        />
        <View style={styles.body}>
          <Segment options={PERIODS} value={period} onChange={setPeriod} />
          {isPending ? (
            <Skeleton height={300} radius={20} />
          ) : runs.length ? (
            <FadeIn key={period}>
              <Text style={styles.total}>{`${data.count} ${data.count === 1 ? "session" : "sessions"} · ${kmText(data.totalKm)} km this ${period}`}</Text>
              <LitCard style={styles.list}>
                {runs.map((r, i) => (
                  <RunRow key={r.id} run={r} first={i === 0} onPress={() => router.push(`/runs/${r.id}`)} />
                ))}
              </LitCard>
            </FadeIn>
          ) : (
            <EmptyState icon={Footprints} title={`Nothing this ${period} yet`} body="Every run, walk and ride you record lands here with its own map." action="Get out here" onAction={() => router.navigate("/(tabs)/move")} />
          )}
        </View>
      </ScrollView>
      <StackTabBar current="move" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  // .body: 16 down, 18 in, 12 apart
  body: { paddingHorizontal: 18, paddingTop: 16, gap: 12 },
  total: { color: C.textDim, fontFamily: F.body, fontSize: 11.5, marginBottom: 10, marginLeft: 4 },
  list: { borderRadius: 20 },
  // .runlist .li
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 14 },
  rule: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  thumb: { width: 52, height: 52, borderRadius: 13, overflow: "hidden", backgroundColor: "#05080e", alignItems: "center", justifyContent: "center" },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5 },
  sub: { color: C.textDim, fontFamily: F.body, fontSize: 11, marginTop: 3 },
  km: { color: C.text, fontFamily: F.display, fontSize: 22, fontVariant: ["tabular-nums"] },
  kmUnit: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 11 },
});
