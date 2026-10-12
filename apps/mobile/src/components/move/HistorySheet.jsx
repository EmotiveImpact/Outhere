// Past runs (from the engine) and saved planned routes, in one sheet.

import React, { useEffect, useState } from "react";
import { Alert, FlatList, Modal, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Trash2, X } from "lucide-react-native";
import { AnimatedNumber, Body, C, Divider, EmptyState, F, FadeIn, IconButton, PressableScale, R, Row, S, Segment, Skeleton, Title, toast, ModalToastHost } from "@/components/ui";
import { useRuns } from "@/data/hooks";
import { dateLabel, formatDuration, timeLabel } from "@/utils/format";
import { useMoveStore } from "@/store/useMoveStore";
import { activityFor } from "./geo";
import RoutePreview from "./RoutePreview";
import RunDetail from "./RunDetail";

export default function HistorySheet({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState("runs");
  const [runId, setRunId] = useState(null);

  useEffect(() => {
    if (!visible) setRunId(null);
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={runId ? () => setRunId(null) : onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: S.lg }}>
        <Row style={styles.header}>
          {runId ? <IconButton icon={ChevronLeft} label="Back" onPress={() => setRunId(null)} /> : null}
          <Title size={runId ? 20 : 28} style={{ flex: 1 }}>
            {runId ? "Session" : "Your moves"}
          </Title>
          <IconButton icon={X} label="Close" onPress={onClose} />
        </Row>

        {runId ? (
          <RunDetail runId={runId} onDeleted={() => setRunId(null)} onLeave={onClose} bottomInset={insets.bottom} />
        ) : (
          <>
            <Segment
              options={[
                { value: "runs", label: "History" },
                { value: "routes", label: "Saved routes" },
              ]}
              value={tab}
              onChange={setTab}
              style={{ marginHorizontal: S.gutter, marginBottom: S.lg }}
            />
            {tab === "runs" ? <RunList onOpen={setRunId} onStart={onClose} bottom={insets.bottom} /> : <RouteList onUse={onClose} bottom={insets.bottom} />}
          </>
        )}
      </View>
      {visible ? <ModalToastHost /> : null}
    </Modal>
  );
}

const weekStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
};

function Totals({ runs }) {
  const totalKm = runs.reduce((sum, r) => sum + (Number(r.distanceKm) || 0), 0);
  const totalSec = runs.reduce((sum, r) => sum + (Number(r.durationSec) || 0), 0);
  const since = weekStart();
  const weekKm = runs.filter((r) => (r.endedAt || 0) >= since).reduce((sum, r) => sum + (Number(r.distanceKm) || 0), 0);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.round((totalSec % 3600) / 60);
  return (
    <FadeIn>
      <AnimatedNumber value={totalKm} format={(v) => v.toFixed(totalKm < 10 ? 2 : 1)} style={styles.totalKm} />
      <Body dim>Kilometres all time</Body>
      <Row style={{ marginTop: S.xl }}>
        <Mini label="Sessions" value={String(runs.length)} />
        <Mini label="Time out" value={hours ? `${hours}h ${mins}m` : `${mins}m`} />
        <Mini label="This week" value={`${weekKm.toFixed(weekKm < 10 ? 2 : 1)} km`} />
      </Row>
    </FadeIn>
  );
}

const Mini = ({ label, value }) => (
  <View style={{ flex: 1, gap: 2 }}>
    <Text style={styles.miniValue}>{value}</Text>
    <Text style={styles.meta}>{label}</Text>
  </View>
);

function RunRow({ item, index, onOpen }) {
  const activity = activityFor(item.type);
  return (
    <FadeIn index={index}>
      {index ? <Divider /> : null}
      <PressableScale onPress={() => onOpen(item.id)} scaleTo={0.98} accessibilityLabel={item.title} style={styles.row}>
        <RoutePreview route={item.route} height={56} radius={12} strokeWidth={2} style={{ width: 56 }} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {activity.label}, {dateLabel(item.startedAt || item.endedAt)} {timeLabel(item.startedAt || item.endedAt)}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          <Row gap={3} style={{ alignItems: "baseline" }}>
            <Text style={styles.rowKm}>{Number(item.distanceKm).toFixed(2)}</Text>
            <Text style={styles.meta}>km</Text>
          </Row>
          <Text style={styles.meta}>{formatDuration(item.durationSec)}</Text>
        </View>
      </PressableScale>
    </FadeIn>
  );
}

function RunList({ onOpen, onStart, bottom }) {
  const { data: runs, isPending, refetch, isRefetching } = useRuns(100);
  if (isPending) {
    return (
      <View style={{ paddingHorizontal: S.gutter, gap: S.md }}>
        <Skeleton width={160} height={52} style={{ marginBottom: S.xl }} />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={64} radius={R.md} />
        ))}
      </View>
    );
  }
  const list = runs || [];
  return (
    <FlatList
      data={list}
      keyExtractor={(r) => r.id}
      contentContainerStyle={{ paddingHorizontal: S.gutter, paddingBottom: bottom + S.xxl }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} />}
      ListHeaderComponent={
        list.length ? (
          <View style={{ marginBottom: S.sm }}>
            <Totals runs={list} />
            <Text style={styles.section}>Recent sessions</Text>
          </View>
        ) : null
      }
      ListEmptyComponent={<EmptyState title="Nothing logged yet" body="Finish a walk, run or ride and it lands here with its route." action="Start a session" onAction={onStart} />}
      renderItem={({ item, index }) => <RunRow item={item} index={index} onOpen={onOpen} />}
    />
  );
}

function RouteList({ onUse, bottom }) {
  const routes = useMoveStore((s) => s.savedRoutes);
  const applySavedRoute = useMoveStore((s) => s.applySavedRoute);
  const deleteSavedRoute = useMoveStore((s) => s.deleteSavedRoute);

  const confirmDelete = (route) =>
    Alert.alert("Delete route?", `"${route.name}" will be removed from this phone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteSavedRoute(route.id) },
    ]);

  return (
    <FlatList
      data={routes}
      keyExtractor={(r) => r.id}
      contentContainerStyle={{ paddingHorizontal: S.gutter, paddingBottom: bottom + S.xxl }}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={<EmptyState title="No saved routes" body="Plot a loop on the map, save it, and run it again whenever." />}
      renderItem={({ item, index }) => (
        <FadeIn index={index}>
          {index ? <Divider /> : null}
          <PressableScale
            onPress={() => {
              applySavedRoute(item);
              toast.success("Route loaded", `${Number(item.distance || 0).toFixed(2)} km, ready when you are`);
              onUse();
            }}
            scaleTo={0.98}
            accessibilityLabel={`Load ${item.name}`}
            style={styles.row}
          >
            <RoutePreview route={item.path} height={56} radius={12} strokeWidth={2} style={{ width: 56 }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {`${Number(item.distance || 0).toFixed(2)} km`}
                {item.date ? `, saved ${dateLabel(new Date(item.date).getTime())}` : ""}
              </Text>
            </View>
            <IconButton icon={Trash2} size={16} label="Delete route" onPress={() => confirmDelete(item)} />
          </PressableScale>
        </FadeIn>
      )}
    />
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: S.gutter, marginBottom: S.lg, gap: S.md },
  totalKm: { color: C.text, fontFamily: F.display, fontSize: 64, lineHeight: 68, letterSpacing: -2, fontVariant: ["tabular-nums"] },
  miniValue: { color: C.text, fontFamily: F.display, fontSize: 20, letterSpacing: -0.3 },
  section: { color: C.text, fontFamily: F.display, fontSize: 20, marginTop: 32 },
  row: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.md },
  rowTitle: { color: C.text, fontSize: 15, fontWeight: "600" },
  rowKm: { color: C.text, fontFamily: F.display, fontSize: 20, letterSpacing: -0.4, fontVariant: ["tabular-nums"] },
  meta: { color: C.textDim, fontSize: 13 },
});
