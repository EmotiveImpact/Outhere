// One run: the route, the numbers and the splits worked out from the track,
// with the fastest kilometre lit up, then what it earned.

import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bookmark, ChevronLeft, ChevronRight, Route as RouteIcon, Share2, Trash2 } from "@/components/ui/icons";
import { C, EmptyState, F, FadeIn, PressableScale, S, Skeleton } from "@/components/ui";
import { engine, useEngineMutation, useRunDetail } from "@/data/hooks";
import { formatDuration, formatPace } from "@/utils/format";
import { PHOTOS } from "@/constants/photos";
import { RoundGlass } from "@/components/move/parts";
import { EarnChips, FeelSlider, LitCard, Slab, Splits, StatCards, twoLines, whenLabel } from "@/components/move/RunBits";

export default function RunDetail() {
  const { runId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: run, isPending } = useRunDetail(runId);
  const [feel, setFeel] = useState(null);

  useEffect(() => setFeel(run?.feel ?? null), [run?.id, run?.feel]);

  const rate = useEngineMutation(engine.rateRun, { silent: true });
  const remove = useEngineMutation(engine.deleteRun, { success: "Run deleted", onSuccess: () => router.back() });
  const keep = useEngineMutation(engine.saveRoute, { success: (r) => `${r.name} saved to your routes`, onSuccess: (r) => router.push(`/routes/${r.id}`) });

  const back = () => (router.canGoBack() ? router.back() : router.navigate("/runs"));

  if (isPending) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 60, paddingHorizontal: S.gutter, gap: S.md }]}>
        <Skeleton height={240} radius={26} />
        <Skeleton height={80} radius={18} />
        <Skeleton height={220} radius={20} />
      </View>
    );
  }
  if (!run) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 80 }]}>
        <EmptyState title="Run not found" body="It may have been deleted." action="Back" onAction={back} />
      </View>
    );
  }

  const [l1, l2] = twoLines(run.title || "Your run");
  const pace = run.paceSecPerKm || (run.distanceKm ? run.durationSec / run.distanceKm : null);
  const hasMap = run.route?.length > 1;
  const confirmDelete = () =>
    Alert.alert("Delete this run?", "It comes off your history and your totals. What it earned stays.", [
      { text: "Keep it", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(run.id) },
    ]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <Slab
          route={hasMap ? run.route : null}
          object={hasMap ? null : PHOTOS.shoe}
          height={300}
          kicker={[whenLabel(run.startedAt, { time: true }), run.area].filter(Boolean).join(" · ")}
          top={l1}
          bottom={l2}
          left={<RoundGlass icon={ChevronLeft} label="Back" onPress={back} />}
          right={<RoundGlass icon={Share2} label="Share your run" onPress={() => router.push(`/runs/share/${run.id}`)} />}
        />
        <View style={styles.body}>
          <FadeIn>
            <StatCards
              items={[
                { label: "km", value: run.distanceKm.toFixed(run.distanceKm >= 10 ? 1 : 2).replace(/0$/, "") },
                { label: "Time", value: formatDuration(run.durationSec) },
                { label: "Avg pace", value: formatPace(pace), accent: run.isPb },
              ]}
            />
          </FadeIn>
          {run.splits?.length ? (
            <FadeIn index={1}>
              <Splits splits={run.splits} />
            </FadeIn>
          ) : null}
          <FadeIn index={2}>
            <EarnChips xp={run.earned?.xp || 0} out={run.earned?.out || 0} steps={run.steps} climbM={run.climbM} />
          </FadeIn>
          <FadeIn index={3}>
            <LitCard style={styles.box}>
              <FeelSlider
                value={feel}
                onChange={(v) => {
                  setFeel(v);
                  rate.mutate([run.id, v]);
                }}
              />
            </LitCard>
          </FadeIn>
          <FadeIn index={4}>
            {run.routeId && run.routeName ? (
              <PressableScale onPress={() => router.push(`/routes/${run.routeId}`)} accessibilityLabel={`Open ${run.routeName}`}>
                <LitCard style={styles.link}>
                  <RouteIcon size={18} color={C.accentHi} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.linkTitle}>{run.routeName}</Text>
                    <Text style={styles.linkSub}>See your best and who's fastest here</Text>
                  </View>
                  <ChevronRight size={18} color={C.textDim} />
                </LitCard>
              </PressableScale>
            ) : hasMap && run.distanceKm >= 0.3 ? (
              <PressableScale
                onPress={() => keep.mutate({ name: (run.title || "My route").slice(0, 30), path: run.route, distanceKm: run.distanceKm, climbM: run.climbM, hideEnds: true })}
                accessibilityLabel="Save as a route"
              >
                <LitCard style={styles.link}>
                  <Bookmark size={18} color={C.accentHi} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.linkTitle}>Save as a route</Text>
                    <Text style={styles.linkSub}>Run it again and race this time</Text>
                  </View>
                  <ChevronRight size={18} color={C.textDim} />
                </LitCard>
              </PressableScale>
            ) : null}
          </FadeIn>
          <PressableScale onPress={confirmDelete} style={styles.delete} accessibilityLabel="Delete run">
            <Trash2 size={15} color={C.danger} />
            <Text style={styles.deleteText}>Delete run</Text>
          </PressableScale>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  // .body.nt
  body: { paddingHorizontal: 18, paddingTop: 16, gap: 12 },
  box: { padding: 16 },
  link: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  linkTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5 },
  linkSub: { color: C.textDim, fontFamily: F.body, fontSize: 11, marginTop: 2 },
  delete: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  deleteText: { color: C.danger, fontFamily: F.bodySemi, fontSize: 13 },
});
