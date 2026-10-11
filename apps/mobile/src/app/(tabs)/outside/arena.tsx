import React, { useCallback, useRef, useState } from "react";
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotiView } from "moti";
import { EyeOff, Users } from "lucide-react-native";
import { useBattleLimits, useBattles, useLeaderboard } from "@/data/hooks";
import * as UI from "@/components/ui";
import BattlesHubJs from "@/components/arena/BattlesHub";
import * as Leader from "@/components/arena/LeaderRow";
import { METRICS } from "@/components/arena/shared";
import { useOutsideScrollPersistence } from "@/hooks/useOutsideScrollPersistence";
import { hapticSelection } from "@/services/haptics";

const SCOPES = [
  { value: "city", label: "City" },
  { value: "global", label: "Global" },
  { value: "friends", label: "Friends" },
];

// The design kit and arena components are plain JS; their inferred prop types
// mark every prop as required, so read them loosely here.
const { Body, C, EmptyState, Loading, R, S, Segment, TAB_BAR_SPACE, Title } = UI as any;
const { LeaderRow, Podium } = Leader as any;
const BattlesHub = BattlesHubJs as any;

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const PERIOD_TEXT: Record<string, string> = { today: "Today", week: "This week", month: "Last 30 days" };

// Room the floating tab bar covers at the bottom of the screen.
const TAB_BAR_COVER = 66;

export default function ArenaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState("city");
  const [period, setPeriod] = useState("week");
  const [metric, setMetric] = useState("steps");

  const board = useLeaderboard({ scope, period, metric });
  const battles = useBattles();
  const limits = useBattleLimits();
  const { scrollRef, handleScroll } = useOutsideScrollPersistence("arena");

  const data: any = board.data;
  const entries: any[] = data?.entries || [];
  const meEntry = data?.me || null;
  const timeless = metric === "xp" || metric === "streak";
  const openPlayer = (entry: any) => router.push(entry.isMe ? "/(tabs)/profile" : (`/player/${entry.player.id}` as any));

  // Track where my row sits so it can be pinned while it is off screen.
  const geo = useRef({ scrollY: 0, viewH: 0, listY: 0, rowsY: 0, rowY: -1, rowH: 0, inPodium: false });
  const [meVisible, setMeVisible] = useState(true);
  const checkVisible = useCallback(() => {
    const g = geo.current;
    if (g.rowY < 0 || !g.viewH) return setMeVisible(true);
    const top = g.listY + (g.inPodium ? 0 : g.rowsY) + g.rowY;
    const bottom = top + g.rowH;
    const visibleBottom = g.scrollY + g.viewH - TAB_BAR_COVER - insets.bottom;
    setMeVisible(bottom > g.scrollY + 8 && top < visibleBottom - 8);
  }, [insets.bottom]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    geo.current.scrollY = e.nativeEvent.contentOffset.y;
    checkVisible();
    handleScroll(e);
  };
  const onMyRowLayout = (e: LayoutChangeEvent, inPodium = false) => {
    geo.current.inPodium = inPodium;
    geo.current.rowY = e.nativeEvent.layout.y;
    geo.current.rowH = e.nativeEvent.layout.height;
    checkVisible();
  };

  const refreshing = board.isRefetching || battles.isRefetching;
  const onRefresh = () => {
    board.refetch();
    battles.refetch();
    limits.refetch();
  };

  const podium = entries.length >= 3 && scope !== "friends" ? entries.slice(0, 3) : [];
  const rows = entries.slice(podium.length);
  const meInPodium = podium.some((e) => e.isMe);
  if (!meEntry && geo.current.rowY !== -1) geo.current.rowY = -1;

  const scopeText = scope === "city" ? data?.city || "Your city" : scope === "global" ? "Everywhere" : "You and who you follow";

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={32}
        onLayout={(e) => {
          geo.current.viewH = e.nativeEvent.layout.height;
          checkVisible();
        }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: S.gutter, paddingBottom: TAB_BAR_SPACE + insets.bottom + 64 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      >
        <BattlesHub />

        <View style={styles.rankHead}>
          <Title size={24}>Rankings</Title>
          <Body dim size={13} style={{ marginTop: 2 }}>
            {scopeText} · {timeless ? (metric === "xp" ? "All time" : "Current streaks") : PERIOD_TEXT[period]}
          </Body>
        </View>

        <Segment options={SCOPES} value={scope} onChange={setScope} />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: S.md, marginHorizontal: -S.gutter }} contentContainerStyle={{ paddingHorizontal: S.gutter, gap: S.sm }}>
          {METRICS.map((m) => {
            const active = m.value === metric;
            return (
              <Pressable
                key={m.value}
                onPress={() => {
                  hapticSelection();
                  setMetric(m.value);
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {!timeless ? <Segment options={PERIODS} value={period} onChange={setPeriod} style={{ marginTop: S.md }} /> : null}

        {data?.hiddenMe ? (
          <Pressable onPress={() => router.push("/settings")} style={styles.notice}>
            <EyeOff size={16} color={C.textDim} />
            <Body dim size={13} style={{ flex: 1 }}>
              You're hidden from rankings. Tap to change it in Settings.
            </Body>
          </Pressable>
        ) : null}

        <View
          style={{ marginTop: S.xl }}
          onLayout={(e) => {
            geo.current.listY = e.nativeEvent.layout.y;
            checkVisible();
          }}
        >
          {board.isPending ? (
            <Loading />
          ) : scope === "friends" && entries.filter((e) => !e.isMe).length === 0 ? (
            <EmptyState
              icon={Users}
              title="No one to race yet"
              body="Follow players from their profile and they'll show up here. Start by checking who's top in your city."
              action="See my city"
              onAction={() => setScope("city")}
            />
          ) : entries.length === 0 ? (
            <EmptyState icon={Users} title="Nobody here yet" body="Rankings fill up as people move. Check back soon." />
          ) : (
            <MotiView key={`${scope}-${period}-${metric}`} from={{ opacity: 0, translateY: 6 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 220 }}>
              {podium.length ? (
                <View onLayout={meInPodium ? (e) => onMyRowLayout(e, true) : undefined}>
                  <Podium entries={podium} metric={metric} onPress={openPlayer} />
                </View>
              ) : null}
              <View
                style={{ gap: 2 }}
                onLayout={(e) => {
                  geo.current.rowsY = e.nativeEvent.layout.y;
                  checkVisible();
                }}
              >
                {rows.map((entry) => (
                  <View key={entry.player.id} onLayout={entry.isMe ? (e) => onMyRowLayout(e) : undefined}>
                    <LeaderRow entry={entry} metric={metric} onPress={openPlayer} />
                  </View>
                ))}
              </View>
            </MotiView>
          )}
        </View>
      </ScrollView>

      {meEntry && !meVisible && !board.isPending ? (
        <MotiView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 180 }}
          style={[styles.pinned, { bottom: TAB_BAR_COVER + insets.bottom + S.sm }]}
        >
          <LeaderRow entry={meEntry} metric={metric} onPress={openPlayer} pinned />
        </MotiView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rankHead: { marginTop: S.xxl + S.sm, marginBottom: S.lg },
  chip: { height: 34, paddingHorizontal: S.lg, borderRadius: R.full, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  chipActive: { borderColor: C.accent, backgroundColor: C.accentDim },
  chipText: { color: C.textDim, fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: C.accent },
  notice: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.lg, padding: S.md, borderRadius: R.md, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  pinned: { position: "absolute", left: S.gutter - 4, right: S.gutter - 4 },
});
