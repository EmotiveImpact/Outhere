// One saved run: route hero, stats, share and delete.

import React from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Footprints, Trash2 } from "lucide-react-native";
import { Body, Button, C, EmptyState, F, FadeIn, Label, R, Row, S, Skeleton, Title } from "@/components/ui";
import { engine, useEngineMutation, useRun } from "@/data/hooks";
import { dateLabel, timeLabel } from "@/utils/format";
import { activityFor, isCoord, rewardsFor } from "./geo";
import RouteHero from "./RouteHero";
import RunMap from "./RunMap";
import RunStatGrid from "./RunStatGrid";
import ShareToCrew from "./ShareToCrew";

function Distance({ km }) {
  return (
    <>
      <Label style={{ color: C.textDim }}>Distance</Label>
      <Row gap={6} style={{ alignItems: "baseline" }}>
        <Text style={styles.km}>{Number(km || 0).toFixed(2)}</Text>
        <Text style={styles.unit}>km</Text>
      </Row>
    </>
  );
}

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
    return <EmptyState icon={Footprints} title="Session gone" body="This one has been deleted from your history." action="Back to history" onAction={onDeleted} />;
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
    <ScrollView contentContainerStyle={{ paddingHorizontal: S.gutter, paddingBottom: bottomInset + S.xxl, gap: S.lg }} showsVerticalScrollIndicator={false}>
      <FadeIn>
        <Row gap={6}>
          <activity.icon size={13} color={C.accent} />
          <Label style={{ color: C.accent }}>{activity.label}</Label>
          {xp > 0 ? <Label style={{ marginLeft: S.sm }}>{`+${xp} XP`}</Label> : null}
        </Row>
        <Title size={30} style={{ marginTop: S.xs, letterSpacing: -0.5 }} numberOfLines={2}>
          {run.title}
        </Title>
        <Body dim size={14} style={{ marginTop: 2 }}>
          {dateLabel(run.startedAt)} at {timeLabel(run.startedAt)}
        </Body>
      </FadeIn>

      <FadeIn index={1}>
        {nativeMap ? (
          <View style={styles.mapBox}>
            <RunMap fitTo={route} segments={[route]} interactive={false} showsUser={false} style={StyleSheet.absoluteFill} />
            <LinearGradient pointerEvents="none" colors={["transparent", "rgba(10,10,10,0.92)"]} style={styles.mapScrim} />
            <View pointerEvents="none" style={styles.mapLabel}>
              <Distance km={run.distanceKm} />
            </View>
          </View>
        ) : (
          <RouteHero route={route} seed={run.id} height={240}>
            <Distance km={run.distanceKm} />
          </RouteHero>
        )}
        {route.length < 2 ? (
          <Body mute size={13} style={{ marginTop: S.sm }}>
            No GPS line was recorded for this one.
          </Body>
        ) : null}
      </FadeIn>

      <FadeIn index={2}>
        <RunStatGrid run={run} />
      </FadeIn>
      <FadeIn index={3}>
        <ShareToCrew runId={run.id} onBeforeNavigate={onLeave} />
      </FadeIn>
      <Button title="Delete session" icon={Trash2} variant="danger" loading={remove.isPending} onPress={confirmDelete} full />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  km: { color: C.text, fontFamily: F.display, fontSize: 52, lineHeight: 56, letterSpacing: -1.2, fontVariant: ["tabular-nums"] },
  unit: { color: C.textDim, fontFamily: F.displayMedium, fontSize: 18 },
  mapBox: { height: 260, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: "hidden", backgroundColor: C.surface },
  mapScrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: 130 },
  mapLabel: { position: "absolute", left: 20, bottom: 18 },
});
