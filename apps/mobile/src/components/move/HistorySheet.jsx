// Past runs (from the engine) and saved planned routes, in one sheet.

import React, { useEffect, useState } from "react";
import { Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Footprints, Route, Trash2, X } from "lucide-react-native";
import { Body, C, EmptyState, F, IconButton, Loading, R, Row, S, Segment, Title } from "@/components/ui";
import { useRuns } from "@/data/hooks";
import { dateLabel, formatDuration, timeAgo } from "@/utils/format";
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
          <Title size={24} style={{ flex: 1 }}>
            {runId ? "Run" : "Your moves"}
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
              style={{ marginHorizontal: S.gutter, marginBottom: S.md }}
            />
            {tab === "runs" ? <RunList onOpen={setRunId} bottom={insets.bottom} /> : <RouteList onUse={onClose} bottom={insets.bottom} />}
          </>
        )}
      </View>
    </Modal>
  );
}

function RunList({ onOpen, bottom }) {
  const { data: runs, isPending, refetch, isRefetching } = useRuns(100);
  if (isPending) return <Loading />;
  const totalKm = (runs || []).reduce((sum, r) => sum + (r.distanceKm || 0), 0);
  return (
    <FlatList
      data={runs || []}
      keyExtractor={(r) => r.id}
      contentContainerStyle={{ paddingHorizontal: S.gutter, paddingBottom: bottom + S.xxl, gap: S.sm }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} />}
      ListHeaderComponent={
        runs?.length ? (
          <Body dim size={13} style={{ marginBottom: S.xs }}>
            {runs.length} {runs.length === 1 ? "session" : "sessions"}, {totalKm.toFixed(1)} km in total
          </Body>
        ) : null
      }
      ListEmptyComponent={<EmptyState icon={Footprints} title="No runs yet" body="Finish a walk, run or ride and it lands here." />}
      renderItem={({ item }) => {
        const Icon = activityFor(item.type).icon;
        return (
          <Pressable onPress={() => onOpen(item.id)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}>
            <RoutePreview route={item.route} height={64} radius={R.sm} strokeWidth={2.5} style={{ width: 64 }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Row gap={6}>
                <Icon size={14} color={C.accent} />
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
              </Row>
              <Text style={styles.rowMeta}>{timeAgo(item.endedAt)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.rowKm}>{Number(item.distanceKm).toFixed(2)}</Text>
              <Text style={styles.rowMeta}>km · {formatDuration(item.durationSec)}</Text>
            </View>
          </Pressable>
        );
      }}
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
      contentContainerStyle={{ paddingHorizontal: S.gutter, paddingBottom: bottom + S.xxl, gap: S.sm }}
      ListEmptyComponent={<EmptyState icon={Route} title="No saved routes" body="Plan a route on the map, then save it to run again later." />}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => {
            applySavedRoute(item);
            onUse();
          }}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
        >
          <RoutePreview route={item.path} height={64} radius={R.sm} strokeWidth={2.5} style={{ width: 64 }} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.rowMeta}>
              {Number(item.distance || 0).toFixed(2)} km{item.date ? ` · saved ${dateLabel(new Date(item.date).getTime())}` : ""}
            </Text>
            <Text style={[styles.rowMeta, { color: C.accent }]}>Tap to load on the map</Text>
          </View>
          <IconButton icon={Trash2} size={16} label="Delete route" onPress={() => confirmDelete(item)} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: S.gutter, marginBottom: S.lg, gap: S.md },
  row: { flexDirection: "row", alignItems: "center", gap: S.md, backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.md },
  rowTitle: { color: C.text, fontSize: 15, fontWeight: "600", flexShrink: 1 },
  rowMeta: { color: C.textDim, fontSize: 12 },
  rowKm: { color: C.text, fontFamily: F.display, fontSize: 22 },
});
