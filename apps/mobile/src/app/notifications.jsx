import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Bell, CalendarDays, CheckCheck, ChevronRight, Gift, ShoppingBag, Swords, Trash2, Users } from "lucide-react-native";
import { engine, useEngineMutation, useNotifications } from "@/data/hooks";
import { startOfDay } from "@/data/time";
import { C, EmptyState, FadeIn, Header, IconButton, Label, PressableScale, R, Row, S, Screen, Skeleton } from "@/components/ui";
import { timeAgo } from "@/utils/format";

const TYPES = {
  battles: { icon: Swords, tint: C.fire },
  crews: { icon: Users, tint: C.pro },
  drops: { icon: ShoppingBag, tint: "#b48cff" },
  events: { icon: CalendarDays, tint: "#00d4aa" },
  rewards: { icon: Gift, tint: C.gold },
};

// Notification titles from the engine sometimes end in an emoji; the tinted
// icon already carries the mood, so keep rows clean.
const cleanTitle = (t = "") => t.replace(/\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]️?$/u, "");

export default function NotificationsScreen() {
  const router = useRouter();
  const { data, isPending, refetch } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const markRead = useEngineMutation(engine.markNotificationRead);
  const markAll = useEngineMutation(engine.markAllNotificationsRead, { success: "All caught up" });
  const clear = useEngineMutation(engine.clearNotifications, { success: "Notifications cleared" });

  const list = data || [];
  const unread = list.filter((n) => !n.read).length;
  const midnight = startOfDay().getTime();
  const weekAgo = midnight - 6 * 86_400_000;
  const groups = [
    { title: "Today", items: list.filter((n) => n.at >= midnight) },
    { title: "This week", items: list.filter((n) => n.at < midnight && n.at >= weekAgo) },
    { title: "Earlier", items: list.filter((n) => n.at < weekAgo) },
  ];

  const open = (n) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.link) router.push(n.link);
  };

  const confirmClear = () =>
    Alert.alert("Clear notifications?", "This removes them all from this phone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => clear.mutate() },
    ]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <Screen
      onRefresh={onRefresh}
      refreshing={refreshing}
      header={<Header back title="Notifications" right={list.length ? <IconButton icon={Trash2} label="Clear all" onPress={confirmClear} /> : null} />}
    >
      {isPending ? (
        <NotificationsSkeleton />
      ) : !list.length ? (
        <EmptyState
          icon={Bell}
          title="All caught up"
          body="Battle invites, crew news, drops and rewards land here."
          action="Find a battle"
          onAction={() => router.push("/(tabs)/outside/arena")}
          style={{ marginTop: 80 }}
        />
      ) : (
        <>
          <Row style={styles.summary}>
            <Text style={styles.summaryText}>
              {unread ? (
                <>
                  <Text style={{ color: C.accent, fontWeight: "800" }}>{unread} new</Text>
                  {` of ${list.length}`}
                </>
              ) : (
                "You're all caught up"
              )}
            </Text>
            {unread ? (
              <PressableScale onPress={() => markAll.mutate()} scaleTo={0.94} hitSlop={8} style={styles.markAll}>
                <CheckCheck size={15} color={C.accent} />
                <Text style={styles.markAllText}>Mark all read</Text>
              </PressableScale>
            ) : null}
          </Row>
          {groups.map((g, gi) => (g.items.length ? <Group key={g.title} title={g.title} items={g.items} offset={gi * 3} onOpen={open} /> : null))}
        </>
      )}
    </Screen>
  );
}

function Group({ title, items, offset, onOpen }) {
  return (
    <View style={{ marginTop: S.xl }}>
      <Label style={{ marginBottom: S.sm, marginLeft: 4 }}>{title}</Label>
      <View style={styles.group}>
        {items.map((n, i) => (
          <FadeIn key={n.id} index={offset + i}>
            {i > 0 ? <View style={styles.sep} /> : null}
            <NotificationRow n={n} onPress={() => onOpen(n)} />
          </FadeIn>
        ))}
      </View>
    </View>
  );
}

function NotificationRow({ n, onPress }) {
  const type = TYPES[n.type] || { icon: Bell, tint: C.accent };
  const Icon = type.icon;
  const unread = !n.read;
  return (
    <PressableScale onPress={onPress} scaleTo={0.985} style={[styles.row, unread && styles.rowUnread]}>
      <View style={[styles.icon, { backgroundColor: `${type.tint}1f`, borderColor: unread ? `${type.tint}55` : "transparent" }]}>
        <Icon size={18} color={type.tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Row style={{ alignItems: "flex-start" }} gap={S.sm}>
          <Text style={[styles.title, !unread && { color: C.textDim, fontWeight: "600" }]} numberOfLines={2}>
            {cleanTitle(n.title)}
          </Text>
          <Text style={[styles.time, unread && { color: C.accent }]}>{timeAgo(n.at)}</Text>
        </Row>
        {n.body ? (
          <Text style={[styles.body, !unread && { color: C.textMute }]} numberOfLines={3}>
            {n.body}
          </Text>
        ) : null}
      </View>
      {n.link ? <ChevronRight size={16} color={C.textMute} style={{ alignSelf: "center" }} /> : null}
      {unread ? <View style={styles.dot} /> : null}
    </PressableScale>
  );
}

function NotificationsSkeleton() {
  return (
    <View style={{ marginTop: S.xl }}>
      <Skeleton width={70} height={11} style={{ marginBottom: S.md, marginLeft: 4 }} />
      <View style={[styles.group, { padding: S.lg, gap: S.xl }]}>
        {[0, 1, 2, 3].map((i) => (
          <Row key={i} gap={S.md} style={{ alignItems: "flex-start" }}>
            <Skeleton width={40} height={40} radius={20} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton width="65%" height={14} />
              <Skeleton width="90%" height={12} />
            </View>
          </Row>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { justifyContent: "space-between", marginTop: S.xs, minHeight: 36 },
  summaryText: { color: C.textDim, fontSize: 14, fontWeight: "600" },
  markAll: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 12, borderRadius: R.full, backgroundColor: C.accentDim },
  markAllText: { color: C.accent, fontSize: 13, fontWeight: "700" },
  group: { borderRadius: R.lg, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, overflow: "hidden" },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginLeft: 68 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: S.md, paddingVertical: 14, paddingLeft: S.lg, paddingRight: S.md, minHeight: 64 },
  rowUnread: { backgroundColor: "rgba(0,255,127,0.035)" },
  icon: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, color: C.text, fontSize: 15, fontWeight: "700", lineHeight: 20 },
  time: { color: C.textMute, fontSize: 12, fontWeight: "600", marginTop: 2 },
  body: { color: C.textDim, fontSize: 13, lineHeight: 18, marginTop: 3 },
  dot: { position: "absolute", left: 6, top: 30, width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent },
});
