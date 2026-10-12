import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import ConfettiCannon from "react-native-confetti-cannon";
import { Bell, CalendarDays, Gift, ShoppingBag, Swords } from "lucide-react-native";
import {
  engine,
  useEngineMutation,
  useFriends,
  useLeaderboard,
  useOutsideNow,
  useProfile,
  useSettings,
  useStepHistory,
  useUnreadCount,
} from "@/data/hooks";
import { useStepStatus } from "@/hooks/useStepSync";
import { Avatar, Body, C, FadeIn, IconButton, PressableScale, R, Row, S, Screen, Skeleton, Title, toast } from "@/components/ui";
import StepHero from "@/components/home/StepHero";
import StatChips from "@/components/home/StatChips";
import OutsideStrip from "@/components/home/OutsideStrip";
import WeekChart from "@/components/home/WeekChart";
import QuickTiles from "@/components/home/QuickTiles";
import MiniBoard from "@/components/home/MiniBoard";
import { hapticSuccess } from "@/services/haptics";
import { formatNumber, greeting } from "@/utils/format";

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const profileQ = useProfile();
  const settingsQ = useSettings();
  const unreadQ = useUnreadCount();
  const historyQ = useStepHistory(7);
  const friendsQ = useFriends();
  const profile = profileQ.data;
  const outsideQ = useOutsideNow(profile?.city);
  const boardQ = useLeaderboard({ scope: "city", period: "today" });
  const { available, permission, liveSteps } = useStepStatus();

  const [confetti, setConfetti] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const checkIn = useEngineMutation(engine.checkIn, {
    onSuccess: (res) => {
      if (res?.alreadyCheckedIn) return;
      toast.success(`Checked in. ${res?.streak || 1} day streak`, `+${res?.xp ?? 20} XP   +${res?.out ?? 2} OUT`);
      setConfetti((n) => n + 1);
    },
  });
  const setOutside = useEngineMutation(engine.updateProfile, {
    success: (p) => (p?.isOutside ? "You're out. Have a good one" : "Back in. Nice work"),
  });

  const goal = profile?.dailyGoal || 10000;
  const steps = Math.max(profile?.today?.steps || 0, liveSteps || 0);
  const units = settingsQ.data?.units || "km";

  // Celebrate the moment the goal is crossed while the app is open.
  const prevSteps = useRef(null);
  useEffect(() => {
    if (!profile) return;
    if (prevSteps.current != null && prevSteps.current < goal && steps >= goal) {
      hapticSuccess();
      toast.success("Daily goal smashed", "+40 XP   +4 OUT");
      setConfetti((n) => n + 1);
    }
    prevSteps.current = steps;
  }, [steps, goal, profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([profileQ.refetch(), historyQ.refetch(), friendsQ.refetch(), outsideQ.refetch(), boardQ.refetch(), unreadQ.refetch()]);
    setRefreshing(false);
  };

  if (!profile) return <HomeSkeleton />;

  const friendsOutside = (friendsQ.data || []).filter((f) => f.isOutside);
  const outsideHidden = settingsQ.data?.privacy?.showOutsideStatus === false;
  const history = historyQ.data;
  const weekTotal = history ? history.slice(0, -1).reduce((sum, d) => sum + d.steps, 0) + steps : 0;
  const activeDays = history ? history.filter((d, i) => d.active || (i === history.length - 1 && steps >= 5000)).length : 0;

  const tiles = [
    { key: "battles", icon: Swords, label: "Battles", hint: "Call someone out", onPress: () => router.push("/(tabs)/outside/arena") },
    { key: "events", icon: CalendarDays, label: "Events", hint: "Runs and meet-ups", onPress: () => router.push("/(tabs)/outside/events") },
    { key: "drops", icon: ShoppingBag, label: "Drops", hint: "Limited releases", onPress: () => router.push("/(tabs)/outside/drops") },
    { key: "rewards", icon: Gift, label: "Rewards", hint: `${formatNumber(profile.out)} OUT to spend`, onPress: () => router.push("/rewards") },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen tab onRefresh={onRefresh} refreshing={refreshing}>
        {/* Greeting */}
        <Row style={{ justifyContent: "space-between", paddingTop: S.md }} gap={S.md}>
          <PressableScale onPress={() => router.push("/(tabs)/profile")} scaleTo={0.94}>
            <Avatar uri={profile.avatar} name={profile.name || profile.username} colour={profile.color} size={44} outside={profile.isOutside} />
          </PressableScale>
          <View style={{ flex: 1 }}>
            <Body dim size={13}>{greeting()}</Body>
            <Title size={22} numberOfLines={1}>{profile.name || profile.username}</Title>
          </View>
          <IconButton icon={Bell} label="Notifications" badge={unreadQ.data || 0} onPress={() => router.push("/notifications")} style={{ width: 44, height: 44, borderRadius: 22 }} />
        </Row>

        <FadeIn index={0} style={{ marginTop: S.xxl }}>
          <StepHero
            steps={steps}
            goal={goal}
            today={profile.today}
            units={units}
            checkedIn={profile.checkedInToday}
            checkingIn={checkIn.isPending}
            onCheckIn={() => checkIn.mutate()}
            onMove={() => router.push("/(tabs)/move")}
            pedometer={{ available, permission }}
            onDevTools={() => router.push("/settings")}
          />
        </FadeIn>

        <FadeIn index={1} style={{ marginTop: S.xxl }}>
          <StatChips
            streak={profile.streak}
            level={profile.level}
            out={profile.out}
            onStreak={() => router.push("/(tabs)/profile")}
            onLevel={() => router.push("/(tabs)/profile")}
            onOut={() => router.push("/rewards")}
          />
        </FadeIn>

        <FadeIn index={2}>
          <Heading title="Outside now" />
          <OutsideStrip
            city={profile.city}
            count={outsideQ.data?.count ?? 0}
            people={outsideQ.data?.people || []}
            friends={friendsOutside}
            hasFriends={!!friendsQ.data?.length}
            isOutside={!!profile.isOutside}
            hidden={outsideHidden}
            busy={setOutside.isPending}
            onToggle={() => setOutside.mutate({ isOutside: !profile.isOutside })}
            onPlayer={(id) => router.push(`/player/${id}`)}
          />
        </FadeIn>

        <FadeIn index={3}>
          <Heading title="This week" meta={history ? `${formatNumber(weekTotal)} steps` : null} />
          <View style={styles.card}>
            {history ? <WeekChart days={history} goal={goal} todaySteps={steps} /> : <Skeleton height={140} radius={12} />}
            {history ? (
              <Row style={styles.chartFoot}>
                <Text style={styles.footText}>
                  <Text style={styles.footStrong}>{activeDays}</Text> of 7 active days
                </Text>
                <Text style={styles.footText}>
                  avg <Text style={styles.footStrong}>{formatNumber(weekTotal / 7)}</Text> a day
                </Text>
              </Row>
            ) : null}
          </View>
        </FadeIn>

        <FadeIn index={4}>
          <Heading title="Get into it" />
          <QuickTiles items={tiles} />
        </FadeIn>

        <FadeIn index={5}>
          <Heading title={`${profile.city} today`} action="See all" onAction={() => router.push("/(tabs)/outside/arena")} />
          <MiniBoard
            board={boardQ.data}
            loading={boardQ.isPending}
            onPlayer={(id) => router.push(id === "me" ? "/(tabs)/profile" : `/player/${id}`)}
            onSettings={() => router.push("/settings")}
            onMove={() => router.push("/(tabs)/move")}
          />
        </FadeIn>
      </Screen>

      {confetti ? (
        <ConfettiCannon key={confetti} count={140} origin={{ x: width / 2, y: -20 }} fadeOut autoStart explosionSpeed={420} fallSpeed={2600} colors={[C.accent, "#ffffff", "#7dffbe", C.gold, C.fire]} />
      ) : null}
    </View>
  );
}

function Heading({ title, meta, action, onAction }) {
  return (
    <Row style={{ justifyContent: "space-between", marginTop: 32, marginBottom: S.md }}>
      <Title size={20}>{title}</Title>
      {action ? (
        <PressableScale onPress={onAction} hitSlop={10} scaleTo={0.94}>
          <Text style={{ color: C.textDim, fontSize: 14, fontWeight: "600" }}>{action}</Text>
        </PressableScale>
      ) : meta ? (
        <Text style={{ color: C.textDim, fontSize: 13 }}>{meta}</Text>
      ) : null}
    </Row>
  );
}

function HomeSkeleton() {
  return (
    <Screen tab scroll={false}>
      <Row style={{ paddingTop: S.md }} gap={S.md}>
        <Skeleton width={44} height={44} radius={22} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width={70} height={12} />
          <Skeleton width={160} height={22} />
        </View>
      </Row>
      <Skeleton width={232} height={232} radius={116} style={{ marginTop: 52, alignSelf: "center" }} />
      <Skeleton width={160} height={22} style={{ marginTop: S.xxl, alignSelf: "center" }} />
      <Skeleton height={56} radius={28} style={{ marginTop: 84 }} />
      <Skeleton height={92} radius={20} style={{ marginTop: S.xxl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: R.lg, backgroundColor: C.surface, padding: S.lg },
  chartFoot: { marginTop: S.lg, paddingTop: S.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, justifyContent: "space-between" },
  footText: { color: C.textMute, fontSize: 13 },
  footStrong: { color: C.text, fontWeight: "600" },
});
