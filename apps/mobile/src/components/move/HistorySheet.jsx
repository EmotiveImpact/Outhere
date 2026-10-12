// Past runs (from the engine) and saved planned routes, in one sheet.

import React, { useEffect, useState } from "react";
import { Alert, FlatList, Modal, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Footprints, Route, Trash2, X } from "lucide-react-native";
import { AnimatedNumber, C, EmptyState, F, FadeIn, IconButton, Label, PressableScale, R, Row, S, Segment, Skeleton, Title, toast, ModalToastHost } from "@/components/ui";
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
    <FadeIn style={styles.totals}>
      <LinearGradient colors={["rgba(0,255,127,0.14)", "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Label>All time</Label>
      <Row gap={6} style={{ alignItems: "baseline", marginTop: 2 }}>
        <AnimatedNumber value={totalKm} format={(v) => v.toFixed(totalKm < 10 ? 2 : 1)} style={styles.totalKm} />
        <Text style={styles.totalUnit}>km</Text>
      </Row>
      <Row gap={S.xl} style={{ marginTop: S.md }}>
        <Mini label="Sessions" value={String(runs.length)} />
        <Mini label="Time out" value={hours ? `${hours}h ${mins}m` : `${mins}m`} />
        <Mini label="This week" value={`${weekKm.toFixed(weekKm < 10 ? 2 : 1)} km`} accent={weekKm > 0} />
      </Row>
    </FadeIn>
  );
}

const Mini = ({ label, value, accent }) => (
  <View style={{ gap: 2 }}>
    <Label>{label}</Label>
    <Text style={[styles.miniValue, accent && { color: C.accent }]}>{value}</Text>
  </View>
);

function RunCard({ item, index, onOpen }) {
  const activity = activityFor(item.type);
  const Icon = activity.icon;
  return (
    <FadeIn index={index}>
      <PressableScale onPress={() => onOpen(item.id)} scaleTo={0.98} accessibilityLabel={item.title} style={styles.card}>
        <RoutePreview route={item.route} height={84} radius={14} strokeWidth={2.5} style={{ width: 84 }} />
        <View style={{ flex: 1, gap: 4 }}>
          <Row gap={6}>
            <Icon size={13} color={C.accent} />
            <Text style={styles.kind}>{activity.label}</Text>
          </Row>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {dateLabel(item.startedAt || item.endedAt)}, {timeLabel(item.startedAt || item.endedAt)}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Row gap={3} style={{ alignItems: "baseline" }}>
            <Text style={styles.cardKm}>{Number(item.distanceKm).toFixed(2)}</Text>
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
      <View style={{ paddingHorizontal: S.gutter, gap: S.sm }}>
        <Skeleton height={150} radius={R.lg} style={{ marginBottom: S.md }} />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={110} radius={R.lg} />
        ))}
      </View>
    );
  }
  const list = runs || [];
  return (
    <FlatList
      data={list}
      keyExtractor={(r) => r.id}
      contentContainerStyle={{ paddingHorizontal: S.gutter, paddingBottom: bottom + S.xxl, gap: S.sm }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} />}
      ListHeaderComponent={
        list.length ? (
          <View style={{ marginBottom: S.md }}>
            <Totals runs={list} />
            <Text style={styles.section}>Recent sessions</Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <EmptyState icon={Footprints} title="Nothing logged yet" body="Finish a walk, run or ride and it lands here with its route." action="Start a session" onAction={onStart} />
      }
      renderItem={({ item, index }) => <RunCard item={item} index={index} onOpen={onOpen} />}
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
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={<EmptyState icon={Route} title="No saved routes" body="Plot a loop on the map, save it, and run it again whenever." />}
      renderItem={({ item, index }) => (
        <FadeIn index={index}>
          <PressableScale
            onPress={() => {
              applySavedRoute(item);
              toast.success("Route loaded", `${Number(item.distance || 0).toFixed(2)} km, ready when you are`);
              onUse();
            }}
            scaleTo={0.98}
            accessibilityLabel={`Load ${item.name}`}
            style={styles.card}
          >
            <RoutePreview route={item.path} height={84} radius={14} strokeWidth={2.5} style={{ width: 84 }} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.name}
              </Text>
              <Row gap={3} style={{ alignItems: "baseline" }}>
                <Text style={[styles.cardKm, { fontSize: 20 }]}>{Number(item.distance || 0).toFixed(2)}</Text>
                <Text style={styles.meta}>km</Text>
              </Row>
              <Text style={styles.meta}>{item.date ? `Saved ${dateLabel(new Date(item.date).getTime())}` : "Tap to load"}</Text>
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
  totals: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: "rgba(0,255,127,0.3)", padding: S.xl, overflow: "hidden" },
  totalKm: { color: C.text, fontFamily: F.display, fontSize: 48, lineHeight: 52, letterSpacing: -1.2, fontVariant: ["tabular-nums"] },
  totalUnit: { color: C.textDim, fontFamily: F.displayMedium, fontSize: 18 },
  miniValue: { color: C.text, fontFamily: F.displayMedium, fontSize: 16 },
  section: { color: C.text, fontFamily: F.display, fontSize: 19, marginTop: S.xxl },
  card: { flexDirection: "row", alignItems: "center", gap: S.md, backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.md },
  kind: { color: C.accent, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  cardTitle: { color: C.text, fontSize: 16, fontWeight: "600" },
  cardKm: { color: C.text, fontFamily: F.display, fontSize: 26, letterSpacing: -0.6, fontVariant: ["tabular-nums"] },
  meta: { color: C.textDim, fontSize: 12 },
});
