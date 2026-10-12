// One saved run: the distance, a few stats, the route, share and delete.

import React from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Body, Button, C, EmptyState, F, FadeIn, R, S, Skeleton, Title } from "@/components/ui";
import { engine, useEngineMutation, useRun } from "@/data/hooks";
import { dateLabel, timeLabel } from "@/utils/format";
import { activityFor, isCoord, rewardsFor } from "./geo";
import RouteHero from "./RouteHero";
import RunMap from "./RunMap";
import RunStatGrid from "./RunStatGrid";
import ShareToCrew from "./ShareToCrew";

export default function RunDetail({ runId, onDeleted, onLeave, bottomInset = 0 }) {
  const { data: run, isPending } = useRun(runId);
  const remove = useEngineMutation(engine.deleteRun, { success: "Session deleted", onSuccess: onDeleted });

  if (isPending) {
    return (
      <View style={{ paddingHorizontal: S.gutter, gap: S.lg }}>
        <Skeleton width={120} height={12} />
        <Skeleton width="70%" height={30} />
        <Skeleton height={240} radius={R.lg} />
        <Skeleton height={84} radius={R.lg} />
      </View>
    );
  }
  if (!run) {
    return <EmptyState title="Session gone" body="This one has been deleted from your history." action="Back to history" onAction={onDeleted} />;
  }

  const route = (run.route || []).filter(isCoord);
  const activity = activityFor(run.type);
  const xp = rewardsFor(run.distanceKm).xp;
  const nativeMap = Platform.OS !== "web" && route.length > 1;

  const confirmDelete = () =>
    Alert.alert("Delete this session?", "It comes off your history. XP and OUT you already earned stay in your wallet.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(run.id) },
    ]);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: S.gutter, paddingBottom: bottomInset + S.xxl }} showsVerticalScrollIndicator={false}>
      <FadeIn>
        <Body dim size={13}>
          {activity.label}, {dateLabel(run.startedAt)} at {timeLabel(run.startedAt)}
          {xp > 0 ? `, +${xp} XP` : ""}
        </Body>
        <Title size={22} style={{ marginTop: 2 }} numberOfLines={2}>
          {run.title}
        </Title>
      </FadeIn>

      <FadeIn index={1} style={styles.hero}>
        <Text style={styles.km}>{Number(run.distanceKm || 0).toFixed(2)}</Text>
        <Body dim>Kilometres</Body>
      </FadeIn>

      <FadeIn index={2}>
        <RunStatGrid run={run} />
      </FadeIn>

      <FadeIn index={3} style={{ marginTop: S.xxl }}>
        {nativeMap ? (
          <View style={styles.mapBox}>
            <RunMap fitTo={route} segments={[route]} interactive={false} showsUser={false} style={StyleSheet.absoluteFill} />
          </View>
        ) : route.length > 1 ? (
          <RouteHero route={route} height={220} />
        ) : (
          <Body mute size={13}>No GPS line was recorded for this one.</Body>
        )}
      </FadeIn>

      <FadeIn index={4} style={{ marginTop: S.xxl }}>
        <ShareToCrew runId={run.id} onBeforeNavigate={onLeave} />
      </FadeIn>
      <Button title="Delete session" variant="danger" loading={remove.isPending} onPress={confirmDelete} full style={{ marginTop: S.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: S.xxl, marginBottom: S.xl },
  km: { color: C.text, fontFamily: F.display, fontSize: 96, lineHeight: 100, letterSpacing: -3, fontVariant: ["tabular-nums"] },
  mapBox: { height: 240, borderRadius: R.lg, overflow: "hidden", backgroundColor: C.surface },
});
