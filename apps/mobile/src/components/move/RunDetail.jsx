// One saved run: map of the route, stats, share and delete.

import React from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { Body, Button, C, Label, Loading, R, S, Title } from "@/components/ui";
import { engine, useEngineMutation, useRun } from "@/data/hooks";
import { dateLabel, timeLabel } from "@/utils/format";
import { activityFor, isCoord } from "./geo";
import RoutePreview from "./RoutePreview";
import RunMap from "./RunMap";
import RunStatGrid from "./RunStatGrid";
import ShareToCrew from "./ShareToCrew";

export default function RunDetail({ runId, onDeleted, onLeave, bottomInset = 0 }) {
  const { data: run, isPending } = useRun(runId);
  const remove = useEngineMutation(engine.deleteRun, { onSuccess: onDeleted });

  if (isPending) return <Loading />;
  if (!run) {
    return (
      <View style={{ padding: S.gutter }}>
        <Body dim>This run has been deleted.</Body>
      </View>
    );
  }

  const route = (run.route || []).filter(isCoord);
  const activity = activityFor(run.type);

  const confirmDelete = () =>
    Alert.alert("Delete this run?", "The run comes off your history. XP and OUT you already earned stay in your wallet.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(run.id) },
    ]);

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: S.gutter, paddingBottom: bottomInset + S.xxl, gap: S.lg }} showsVerticalScrollIndicator={false}>
      <View>
        <Label style={{ color: C.accent }}>{activity.label}</Label>
        <Title size={30} style={{ marginTop: S.xs }}>
          {run.title}
        </Title>
        <Body dim size={14} style={{ marginTop: 2 }}>
          {dateLabel(run.startedAt)} at {timeLabel(run.startedAt)}
        </Body>
      </View>

      {route.length > 1 ? (
        <RunMap fitTo={route} segments={[route]} interactive={false} showsUser={false} style={styles.map} />
      ) : (
        <RoutePreview route={route} height={120} radius={R.lg} />
      )}
      {route.length < 2 ? <Body mute size={13}>No GPS route was recorded for this one.</Body> : null}

      <RunStatGrid run={run} />
      <ShareToCrew runId={run.id} onBeforeNavigate={onLeave} />
      <Button title="Delete run" icon={Trash2} variant="danger" loading={remove.isPending} onPress={confirmDelete} full />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  map: { height: 240, borderRadius: R.lg, borderWidth: 1, borderColor: C.border },
});
