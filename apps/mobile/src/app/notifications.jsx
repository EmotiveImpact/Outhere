import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Bell, CalendarDays, Gift, ShoppingBag, Swords, Trash2, Users } from "lucide-react-native";
import { engine, useEngineMutation, useNotifications } from "@/data/hooks";
import { startOfDay } from "@/data/time";
import { Body, C, EmptyState, Header, IconButton, Label, Loading, Row, S, Screen } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";
import { timeAgo } from "@/utils/format";

const TYPE_ICON = {
  battles: Swords,
  crews: Users,
  drops: ShoppingBag,
  events: CalendarDays,
  rewards: Gift,
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { data, isPending, refetch } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const markRead = useEngineMutation(engine.markNotificationRead);
  const markAll = useEngineMutation(engine.markAllNotificationsRead);
  const clear = useEngineMutation(engine.clearNotifications);

  const list = data || [];
  const hasUnread = list.some((n) => !n.read);
  const midnight = startOfDay().getTime();
  const today = list.filter((n) => n.at >= midnight);
  const earlier = list.filter((n) => n.at < midnight);

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
      header={
        <Header
          back
          title="Notifications"
          right={
list.length ? <IconButton icon={Trash2} label="Clear all" onPress={confirmClear} /> : null
          }
        />
      }
    >
      {isPending ? (
        <Loading />
      ) : !list.length ? (
        <EmptyState icon={Bell} title="All caught up" body="Battle invites, crew news, drops and rewards will land here." style={{ marginTop: 60 }} />
      ) : (
        <>
          {hasUnread ? (
            <Pressable onPress={() => { hapticSelection(); markAll.mutate(); }} hitSlop={8} style={{ alignSelf: "flex-end", marginTop: S.xs }}>
              <Text style={{ color: C.accent, fontSize: 13, fontWeight: "700" }}>Mark all read</Text>
            </Pressable>
          ) : null}
          <Group title="Today" items={today} onOpen={open} />
          <Group title="Earlier" items={earlier} onOpen={open} />
        </>
      )}
    </Screen>
  );
}

function Group({ title, items, onOpen }) {
  if (!items.length) return null;
  return (
    <View style={{ marginTop: S.lg }}>
      <Label style={{ marginBottom: S.sm }}>{title}</Label>
      <View style={{ gap: S.sm }}>
        {items.map((n) => (
          <NotificationRow key={n.id} n={n} onPress={() => onOpen(n)} />
        ))}
      </View>
    </View>
  );
}

function NotificationRow({ n, onPress }) {
  const Icon = TYPE_ICON[n.type] || Bell;
  const unread = !n.read;
  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      style={({ pressed }) => [styles.row, unread && styles.rowUnread, pressed && { opacity: 0.75 }]}
    >
      <View style={[styles.icon, unread && { backgroundColor: C.accentDim }]}>
        <Icon size={18} color={unread ? C.accent : C.textDim} />
      </View>
      <View style={{ flex: 1 }}>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <Text style={[styles.title, !unread && { color: C.textDim }]} numberOfLines={2}>
            {n.title}
          </Text>
          <Text style={styles.time}>{timeAgo(n.at)}</Text>
        </Row>
        {n.body ? (
          <Body dim={unread} mute={!unread} size={13} style={{ marginTop: 3 }}>
            {n.body}
          </Body>
        ) : null}
      </View>
      {unread ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: S.md, padding: S.md, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  rowUnread: { borderColor: "rgba(0,255,127,0.25)", backgroundColor: "#0f1a14" },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, color: C.text, fontSize: 15, fontWeight: "700", paddingRight: S.sm },
  time: { color: C.textMute, fontSize: 12, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent, marginTop: 6 },
});
