import React, { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Bell, CalendarDays, CheckCheck, ChevronRight, Gift, ShoppingBag, Swords, Trash2, Users } from "lucide-react-native";
import { engine, useEngineMutation, useNotifications } from "@/data/hooks";
import { startOfDay } from "@/data/time";
import { C, EmptyState, FadeIn, Header, IconButton, PressableScale, R, Row, S, Screen, Skeleton } from "@/components/ui";
import { timeAgo } from "@/utils/format";

const TYPES = {
  battles: Swords,
  crews: Users,
  drops: ShoppingBag,
  events: CalendarDays,
  rewards: Gift,
};

// Notification titles from the engine sometimes end in an emoji; the type
// icon already says what it is, so keep rows clean.
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
                  <Text style={{ color: C.text, fontWeight: "600" }}>{unread} new</Text>
                  {` of ${list.length}`}
                </>
              ) : (
                "You're all caught up"
              )}
            </Text>
            {unread ? (
              <PressableScale onPress={() => markAll.mutate()} scaleTo={0.94} hitSlop={8} style={styles.markAll}>
                <CheckCheck size={15} color={C.textDim} />
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
    <View style={{ marginTop: S.xxl }}>
      <Text style={styles.groupTitle}>{title}</Text>
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
  const Icon = TYPES[n.type] || Bell;
  const unread = !n.read;
  return (
    <PressableScale onPress={onPress} scaleTo={0.985} style={styles.row}>
      <View style={styles.icon}>
        <Icon size={18} color={unread ? C.text : C.textDim} />
      </View>
      <View style={{ flex: 1 }}>
        <Row style={{ alignItems: "flex-start" }} gap={S.sm}>
          <Text style={[styles.title, !unread && { color: C.textDim, fontWeight: "500" }]} numberOfLines={2}>
            {cleanTitle(n.title)}
          </Text>
          <Text style={styles.time}>{timeAgo(n.at)}</Text>
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
  groupTitle: { color: C.textDim, fontSize: 13, fontWeight: "600", marginBottom: S.sm, marginLeft: 4 },
  summary: { justifyContent: "space-between", marginTop: S.xs, minHeight: 36 },
  summaryText: { color: C.textDim, fontSize: 14 },
  markAll: { flexDirection: "row", alignItems: "center", gap: 6, height: 36 },
  markAllText: { color: C.textDim, fontSize: 14, fontWeight: "600" },
  group: { borderRadius: R.lg, backgroundColor: C.surface, overflow: "hidden" },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginLeft: 68 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: S.md, paddingVertical: 14, paddingLeft: S.lg, paddingRight: S.md, minHeight: 64 },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, color: C.text, fontSize: 15, fontWeight: "600", lineHeight: 20 },
  time: { color: C.textMute, fontSize: 13, marginTop: 1 },
  body: { color: C.textDim, fontSize: 13, lineHeight: 18, marginTop: 3 },
  dot: { position: "absolute", left: 6, top: 31, width: 6, height: 6, borderRadius: 3, backgroundColor: C.text },
});
