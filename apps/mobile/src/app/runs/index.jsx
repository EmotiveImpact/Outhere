// Run history: every session with its own little map, by week, month or
// year, under the kilometres you've done this year.

import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Footprints, Route as RouteIcon, ShieldCheck } from "lucide-react-native";
import { C, EmptyState, F, FadeIn, PressableScale, S, Segment, Skeleton } from "@/components/ui";
import { useRunHistory } from "@/data/hooks";
import { formatNumber, formatPace } from "@/utils/format";
import { RoundGlass } from "@/components/move/parts";
import { Slab, whenLabel } from "@/components/move/RunBits";
import RoutePreview from "@/components/move/RoutePreview";
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
      <RoutePreview route={run.route} height={56} radius={14} strokeWidth={3} style={styles.thumb} />
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
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <Slab
          object={MOVE_IMAGES.bars}
          height={220}
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
              <View style={styles.list}>
                {runs.map((r, i) => (
                  <RunRow key={r.id} run={r} first={i === 0} onPress={() => router.push(`/runs/${r.id}`)} />
                ))}
              </View>
            </FadeIn>
          ) : (
            <EmptyState icon={Footprints} title={`Nothing this ${period} yet`} body="Every run, walk and ride you record lands here with its own map." action="Get out here" onAction={() => router.navigate("/(tabs)/move")} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  body: { paddingHorizontal: S.gutter, paddingTop: S.lg, gap: S.md },
  total: { color: C.textDim, fontFamily: F.body, fontSize: 13, marginBottom: S.sm, marginLeft: 4 },
  list: { backgroundColor: C.surface, borderRadius: 20, paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  thumb: { width: 56, backgroundColor: "#16202e" },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 15.5 },
  sub: { color: C.textDim, fontFamily: F.body, fontSize: 13, marginTop: 3 },
  km: { color: C.text, fontFamily: F.display, fontSize: 26, fontVariant: ["tabular-nums"] },
  kmUnit: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 12 },
});
