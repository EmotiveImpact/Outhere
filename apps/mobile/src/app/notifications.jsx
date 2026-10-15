// What you missed: battle invites you can answer in place, then everything
// else grouped by time. Older and read ones fade back.

import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Bell, CalendarDays, CheckCheck, Flame, Gift, MoreHorizontal, Settings2, ShoppingBag, Swords, Trash2, Users } from "lucide-react-native";
import { engine, useBattles, useEngineMutation, useNotifications, useProfile } from "@/data/hooks";
import { startOfDay } from "@/data/time";
import { Avatar, Button, C, EmptyState, F, FadeIn, PressableScale, R, S, Sheet, Skeleton } from "@/components/ui";
import { imageSource } from "@/components/ui/Cover";
import { HeroPage, RoundButton, confirmAsk } from "@/components/account/parts";
import { timeAgo } from "@/utils/format";

const TYPES = { battles: Swords, crews: Users, drops: ShoppingBag, events: CalendarDays, rewards: Gift };
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Titles from the engine sometimes end in an emoji; the icon already says it.
const cleanTitle = (t = "") => t.replace(/\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]️?$/u, "");

// 14m, 2h, 9am, Mon, 12 Oct.
const when = (at) => {
  const mins = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (mins < 180) return `${Math.round(mins / 60)}h`;
  const d = new Date(at);
  if (at >= startOfDay().getTime()) {
    const h = d.getHours();
    const m = d.getMinutes();
    return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
  }
  if (Date.now() - at < 6 * 86_400_000) return DAYS[d.getDay()];
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { data, isPending } = useNotifications();
  const { data: battles } = useBattles("pending");
  const [menu, setMenu] = useState(false);
  const markRead = useEngineMutation(engine.markNotificationRead);
  const markAll = useEngineMutation(engine.markAllNotificationsRead, { success: "All caught up" });
  const clear = useEngineMutation(engine.clearNotifications, { success: "Notifications cleared" });

  const list = data || [];
  const invites = (battles || []).filter((b) => b.incoming);
  const unread = list.filter((n) => !n.read).length + invites.length;
  const midnight = startOfDay().getTime();
  const weekAgo = midnight - 6 * 86_400_000;
  const groups = [
    { title: "Today", items: list.filter((n) => n.at >= midnight) },
    { title: "This week", items: list.filter((n) => n.at < midnight && n.at >= weekAgo) },
    { title: "Earlier", items: list.filter((n) => n.at < weekAgo) },
  ].filter((g) => g.items.length);

  const open = (n) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.link) router.push(n.link);
  };

  return (
    <HeroPage
      kicker={`Notifications${unread ? ` · ${unread} new` : ""}`}
      top="What you"
      bottom="missed"
      height={190}
      right={<RoundButton icon={MoreHorizontal} label="More" onPress={() => setMenu(true)} />}
      bodyStyle={{ gap: 10 }}
    >
      {invites.map((b, i) => (
        <FadeIn key={b.id} index={i}>
          <Invite battle={b} />
        </FadeIn>
      ))}

      {isPending ? (
        <Skeleton height={280} radius={R.lg} />
      ) : !list.length && !invites.length ? (
        <EmptyState icon={Bell} title="All caught up" body="Battle invites, club news, drops and rewards land here." action="Find a battle" onAction={() => router.push("/(tabs)/outside/arena")} style={{ marginTop: 20 }} />
      ) : (
        groups.map((g, gi) => (
          <FadeIn key={g.title} index={invites.length + gi}>
            {gi > 0 || invites.length ? <Text style={styles.groupTitle}>{g.title}</Text> : null}
            <View style={styles.group}>
              {g.items.map((n, i) => (
                <React.Fragment key={n.id}>
                  {i > 0 ? <View style={styles.sep} /> : null}
                  <Item n={n} faded={n.read || n.at < weekAgo} onPress={() => open(n)} />
                </React.Fragment>
              ))}
            </View>
          </FadeIn>
        ))
      )}

      <Sheet visible={menu} onClose={() => setMenu(false)}>
        <View style={{ gap: 4, paddingTop: S.sm }}>
          <MenuRow
            icon={CheckCheck}
            title="Mark all read"
            disabled={!list.some((n) => !n.read)}
            onPress={() => {
              setMenu(false);
              markAll.mutate();
            }}
          />
          <MenuRow
            icon={Settings2}
            title="What pings you"
            onPress={() => {
              setMenu(false);
              router.push("/settings/pings");
            }}
          />
          <MenuRow
            icon={Trash2}
            title="Clear all"
            danger
            disabled={!list.length}
            onPress={async () => {
              setMenu(false);
              if (await confirmAsk({ title: "Clear notifications?", body: "This removes them all.", ok: "Clear", danger: true })) clear.mutate();
            }}
          />
        </View>
      </Sheet>
    </HeroPage>
  );
}

function Invite({ battle }) {
  const router = useRouter();
  const { data: me } = useProfile();
  const opp = battle.opponent?.player || {};
  const respond = useEngineMutation(engine.respondToBattle, {
    onSuccess: (_r, [id, yes]) => {
      if (yes) router.push(`/battles/${id}`);
    },
  });
  const busy = respond.isPending;
  const bits = [battle.stakeOut ? `${battle.stakeOut} OUT` : null, battle.durationHours ? `${battle.durationHours} hours` : battle.modeName, battle.createdAt ? `${timeAgo(battle.createdAt)}` : null].filter(Boolean);
  return (
    <View style={{ gap: 10 }}>
      <PressableScale onPress={() => router.push(`/battles/${battle.id}`)} scaleTo={0.98} style={styles.invite}>
        <View style={styles.vs}>
          <Avatar uri={opp.avatar} name={opp.name} tier={opp.tier} size={44} />
          <View style={styles.vsBadge}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          <Avatar uri={me?.avatar} name={me?.name || me?.username} tier={me?.tier} size={44} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.inviteTitle} numberOfLines={1}>
            {opp.name || "Someone"} wants a battle
          </Text>
          <Text style={styles.inviteSub} numberOfLines={1}>
            {bits.join(" · ")}
          </Text>
        </View>
      </PressableScale>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button title="Accept" size="md" loading={busy && respond.variables?.[1]} disabled={busy} onPress={() => respond.mutate([battle.id, true])} style={{ flex: 1 }} />
        <Button title="Not now" variant="secondary" disabled={busy} onPress={() => respond.mutate([battle.id, false])} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function Item({ n, faded, onPress }) {
  const Icon = n.type === "rewards" && /streak/i.test(n.title) ? Flame : TYPES[n.type] || Bell;
  const unread = !n.read;
  return (
    <PressableScale onPress={onPress} scaleTo={0.985} style={[styles.row, faded && { opacity: 0.55 }]}>
      {n.image ? (
        <Avatar source={imageSource(n.image)} name={n.title} size={40} />
      ) : (
        <View style={[styles.icon, n.type === "rewards" && styles.iconBlue]}>
          <Icon size={18} color={n.type === "rewards" ? C.accent : C.textSoft} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={2}>
          {cleanTitle(n.title)}
        </Text>
        {n.body ? (
          <Text style={styles.body} numberOfLines={2}>
            {n.body}
          </Text>
        ) : null}
      </View>
      <Text style={styles.time}>{when(n.at)}</Text>
      {unread ? <View style={styles.dot} /> : null}
    </PressableScale>
  );
}

function MenuRow({ icon: Icon, title, onPress, danger, disabled }) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} scaleTo={0.98} style={[styles.menuRow, disabled && { opacity: 0.4 }]}>
      <Icon size={19} color={danger ? C.danger : C.text} />
      <Text style={[styles.menuText, danger && { color: C.danger }]}>{title}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  groupTitle: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 8, marginTop: 6, marginLeft: 4 },
  group: { borderRadius: R.lg, backgroundColor: C.surface, overflow: "hidden", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginLeft: 68 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: S.lg, minHeight: 64 },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
  iconBlue: { backgroundColor: "rgba(61,139,255,0.16)" },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 14, lineHeight: 19 },
  body: { color: C.textDim, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  time: { color: C.textDim, fontFamily: F.body, fontSize: 12, alignSelf: "flex-start", marginTop: 2 },
  dot: { position: "absolute", left: 6, top: 30, width: 5, height: 5, borderRadius: 3, backgroundColor: C.accent },
  invite: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.12)" },
  vs: { flexDirection: "row", alignItems: "center" },
  vsBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", marginHorizontal: -6, zIndex: 2, borderWidth: 2, borderColor: C.surface },
  vsText: { color: "#fff", fontFamily: F.display, fontSize: 11 },
  inviteTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 16 },
  inviteSub: { color: C.textSoft, fontFamily: F.body, fontSize: 13, marginTop: 3 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, height: 54, paddingHorizontal: 4 },
  menuText: { color: C.text, fontFamily: F.bodyMedium, fontSize: 16 },
});
