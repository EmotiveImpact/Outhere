import React, { useCallback, useRef, useState } from "react";
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotiView } from "moti";
import { EyeOff } from "lucide-react-native";
import { useBattleLimits, useBattles, useLeaderboard } from "@/data/hooks";
import * as UI from "@/components/ui";
import BattlesHubJs from "@/components/arena/BattlesHub";
import * as Leader from "@/components/arena/LeaderRow";
import { useOutsideScrollPersistence } from "@/hooks/useOutsideScrollPersistence";

const SCOPES = [
  { value: "city", label: "City" },
  { value: "global", label: "Global" },
  { value: "friends", label: "Friends" },
];

// The design kit and arena components are plain JS; their inferred prop types
// mark every prop as required, so read them loosely here.
const { Body, C, EmptyState, F, PressableScale, R, S, Segment, Skeleton, TAB_BAR_SPACE, Title } = UI as any;
const { LeaderRow, MetricChips, PinnedMeRow, Podium } = Leader as any;
const BattlesHub = BattlesHubJs as any;

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "30 days" },
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
    // Only pin once the rankings are on screen, so it never covers the battles.
    const boardInView = g.listY > 0 && visibleBottom > g.listY + 120;
    setMeVisible(!boardInView || (bottom > g.scrollY + 8 && top < visibleBottom - 8));
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
  const ahead = meEntry && meEntry.rank > 1 ? entries[meEntry.rank - 2] : null;
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
        contentContainerStyle={{ paddingHorizontal: S.gutter, paddingBottom: TAB_BAR_SPACE + insets.bottom + 72 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      >
        <BattlesHub />

        <View style={styles.rankHead}>
          <View style={{ flex: 1 }}>
            <Title size={20}>Rankings</Title>
            <Body dim size={13} style={{ marginTop: 2 }}>
              {scopeText} · {timeless ? (metric === "xp" ? "All time" : "Current streaks") : PERIOD_TEXT[period]}
            </Body>
          </View>
        </View>

        <Segment options={SCOPES} value={scope} onChange={setScope} />
        <MetricChips value={metric} onChange={setMetric} style={{ marginTop: S.md }} />

        {!timeless ? (
          <View style={styles.periods}>
            {PERIODS.map((p) => {
              const active = p.value === period;
              return (
                <PressableScale key={p.value} onPress={() => setPeriod(p.value)} scaleTo={0.94} style={[styles.period, active && styles.periodActive]}>
                  <Text style={[styles.periodText, active && styles.periodTextActive]}>{p.label}</Text>
                </PressableScale>
              );
            })}
          </View>
        ) : null}

        {data?.hiddenMe ? (
          <PressableScale onPress={() => router.push("/settings")} style={styles.notice}>
            <EyeOff size={16} color={C.textDim} />
            <Body dim size={13} style={{ flex: 1 }}>
              You're hidden from rankings. Change it in Settings.
            </Body>
          </PressableScale>
        ) : null}

        <View
          style={{ marginTop: S.xl }}
          onLayout={(e) => {
            geo.current.listY = e.nativeEvent.layout.y;
            checkVisible();
          }}
        >
          {board.isPending ? (
            <BoardSkeleton />
          ) : scope === "friends" && entries.filter((e) => !e.isMe).length === 0 ? (
            <EmptyState
              title="No one to race yet"
              body="Follow players from their profile and they'll show up here."
              action="See my city"
              onAction={() => setScope("city")}
            />
          ) : entries.length === 0 ? (
            <EmptyState title="Nobody here yet" body="Rankings fill up as people move. Check back soon." />
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
          from={{ opacity: 0, translateY: 16 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "spring", damping: 18 }}
          style={[styles.pinned, { bottom: TAB_BAR_COVER + insets.bottom + S.md }]}
        >
          <PinnedMeRow entry={meEntry} metric={metric} ahead={ahead} onPress={openPlayer} />
        </MotiView>
      ) : null}
    </View>
  );
}

function BoardSkeleton() {
  return (
    <View>
      <View style={{ flexDirection: "row", gap: S.sm, alignItems: "flex-end", marginBottom: S.lg }}>
        {[60, 76, 60].map((size, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center", gap: S.sm }}>
            <Skeleton width={size} height={size} radius={size} />
            <Skeleton width={56} height={12} />
            <Skeleton height={i === 1 ? 56 : 32} radius={14} />
          </View>
        ))}
      </View>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: 12, paddingHorizontal: S.md }}>
          <Skeleton width={18} height={14} />
          <Skeleton width={40} height={40} radius={20} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="50%" height={13} />
            <Skeleton width="70%" height={10} />
          </View>
          <Skeleton width={44} height={18} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rankHead: { flexDirection: "row", alignItems: "center", marginTop: S.xxl + 4, marginBottom: S.lg },
  periods: { flexDirection: "row", gap: S.lg, marginTop: S.lg, paddingHorizontal: 2 },
  period: { minHeight: 32, justifyContent: "center", borderBottomWidth: 2, borderColor: "transparent" },
  periodActive: { borderColor: C.text },
  periodText: { color: C.textMute, fontFamily: F.displayMedium, fontSize: 15 },
  periodTextActive: { color: C.text },
  notice: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.lg, padding: S.md, borderRadius: R.md, backgroundColor: C.surface },
  pinned: { position: "absolute", left: S.gutter - 6, right: S.gutter - 6 },
});
