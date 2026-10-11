import React, { useEffect, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import ConfettiCannon from "react-native-confetti-cannon";
import { Bell, CalendarDays, Check, ChevronRight, Coins, Flame, Footprints, ShoppingBag, Swords, Zap } from "lucide-react-native";
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
import {
  Avatar,
  Body,
  Button,
  C,
  Card,
  F,
  IconButton,
  Label,
  Loading,
  ProgressBar,
  Row,
  S,
  Screen,
  SectionHeader,
  Title,
} from "@/components/ui";
import StepRing from "@/components/home/StepRing";
import WeekChart from "@/components/home/WeekChart";
import { hapticSuccess } from "@/services/haptics";
import { compactNumber, formatKm, formatNumber, greeting } from "@/utils/format";

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
      hapticSuccess();
      setConfetti((n) => n + 1);
    },
  });
  const setOutside = useEngineMutation(engine.updateProfile);

  const goal = profile?.dailyGoal || 10000;
  const steps = Math.max(profile?.today?.steps || 0, liveSteps || 0);
  const units = settingsQ.data?.units || "km";

  // Celebrate the moment the goal is crossed while the app is open.
  const prevSteps = useRef(null);
  useEffect(() => {
    if (!profile) return;
    if (prevSteps.current != null && prevSteps.current < goal && steps >= goal) {
      hapticSuccess();
      setConfetti((n) => n + 1);
    }
    prevSteps.current = steps;
  }, [steps, goal, profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([profileQ.refetch(), historyQ.refetch(), friendsQ.refetch(), outsideQ.refetch(), boardQ.refetch(), unreadQ.refetch()]);
    setRefreshing(false);
  };

  if (!profile) {
    return (
      <Screen tab>
        <Loading style={{ marginTop: 120 }} />
      </Screen>
    );
  }

  const level = profile.level;
  const friendsOutside = (friendsQ.data || []).filter((f) => f.isOutside);
  const outsideHidden = settingsQ.data?.privacy?.showOutsideStatus === false;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen tab onRefresh={onRefresh} refreshing={refreshing}>
        {/* Greeting */}
        <Row style={{ justifyContent: "space-between", paddingTop: S.md }}>
          <View style={{ flex: 1 }}>
            <Body dim size={14}>{greeting()},</Body>
            <Title size={30} numberOfLines={1}>{profile.name || profile.username}</Title>
          </View>
          <IconButton icon={Bell} label="Notifications" badge={unreadQ.data || 0} onPress={() => router.push("/notifications")} />
        </Row>

        {/* Steps hero */}
        <Card style={{ marginTop: S.xl, alignItems: "center", overflow: "hidden" }} padding={S.xl}>
          <LinearGradient colors={["rgba(0,255,127,0.10)", "rgba(0,255,127,0)"]} style={StyleSheet.absoluteFill} />
          <StepRing steps={steps} goal={goal} size={Math.min(230, width - 120)} />
          <Row style={{ marginTop: S.xl, alignSelf: "stretch", justifyContent: "space-around" }}>
            <HeroStat label="Distance" value={formatKm(profile.today.distance, units)} />
            <HeroStat label="Active" value={`${profile.today.activeMinutes || 0} min`} />
            <HeroStat label="Goal" value={compactNumber(goal)} />
          </Row>
        </Card>

        <PedometerNotice available={available} permission={permission} onDevTools={() => router.push("/settings")} />

        {/* Check-in and streak */}
        <Card style={{ marginTop: S.md }} highlight={!profile.checkedInToday}>
          <Row gap={S.md}>
            <View style={styles.flameWrap}>
              <Flame size={22} color={C.fire} fill={profile.streak > 0 ? C.fire : "transparent"} />
            </View>
            <View style={{ flex: 1 }}>
              <Title size={22}>{profile.streak} day streak</Title>
              <Body dim size={13}>
                {profile.checkedInToday ? "Checked in today. Back tomorrow to keep it alive." : "Check in to keep your streak going (+20 XP, +2 OUT)."}
              </Body>
            </View>
          </Row>
          <Button
            title={profile.checkedInToday ? "Checked in" : "Check in for today"}
            icon={Check}
            disabled={profile.checkedInToday}
            loading={checkIn.isPending}
            onPress={() => checkIn.mutate()}
            style={{ marginTop: S.lg }}
            full
          />
        </Card>

        {/* Level and wallet */}
        <Row style={{ marginTop: S.md, alignItems: "stretch" }} gap={S.md}>
          <Card style={{ flex: 1.4 }} onPress={() => router.push("/(tabs)/profile")}>
            <Row gap={6}>
              <Zap size={14} color={C.accent} />
              <Label>Level {level.level}</Label>
            </Row>
            <Title size={19} style={{ marginTop: 6 }} numberOfLines={1}>{level.title}</Title>
            <ProgressBar value={level.progress} style={{ marginTop: S.md }} />
            <Body mute size={12} style={{ marginTop: 6 }}>
              {formatNumber(level.xpIntoLevel)} / {formatNumber(level.xpForNext)} XP
            </Body>
          </Card>
          <Card style={{ flex: 1 }} onPress={() => router.push("/rewards")}>
            <Row gap={6}>
              <Coins size={14} color={C.gold} />
              <Label>OUT</Label>
            </Row>
            <Text style={styles.bigNumber} numberOfLines={1} adjustsFontSizeToFit>{formatNumber(profile.out)}</Text>
            <Body mute size={12}>Spend on rewards</Body>
          </Card>
        </Row>

        {/* Outside now */}
        <SectionHeader title="Outside now" />
        <Card>
          <Row style={{ justifyContent: "space-between" }}>
            <View style={{ flex: 1, paddingRight: S.md }}>
              <Text style={{ color: C.text, fontSize: 15, fontWeight: "700" }}>
                {profile.isOutside ? "You're outside" : "Heading out?"}
              </Text>
              <Body dim size={13} style={{ marginTop: 2 }}>
                {outsideHidden
                  ? "Your outside status is hidden in Settings."
                  : `${outsideQ.data?.count ?? 0} out in ${profile.city} right now`}
              </Body>
            </View>
            <OutsideToggle
              on={!!profile.isOutside}
              busy={setOutside.isPending}
              onPress={() => setOutside.mutate({ isOutside: !profile.isOutside })}
            />
          </Row>
          {friendsOutside.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.lg, marginTop: S.lg }}>
              {friendsOutside.slice(0, 6).map((f) => (
                <Pressable key={f.id} onPress={() => router.push(`/player/${f.id}`)} style={{ alignItems: "center", width: 52 }}>
                  <Avatar uri={f.avatar} name={f.name} size={48} outside ring={C.accent} />
                  <Text style={{ color: C.textDim, fontSize: 11, marginTop: 6 }} numberOfLines={1}>{f.name}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Body mute size={13} style={{ marginTop: S.md }}>
              {friendsQ.data?.length ? "None of the people you follow are out yet." : "Follow people to see when they're out."}
            </Body>
          )}
        </Card>

        {/* Week chart */}
        <SectionHeader title="Last 7 days" />
        <Card>
          {historyQ.data ? <WeekChart days={historyQ.data} goal={goal} todaySteps={steps} /> : <Loading style={{ paddingVertical: 40 }} />}
          {historyQ.data ? (
            <Row style={{ marginTop: S.lg, justifyContent: "space-between" }}>
              <Body dim size={13}>
                {formatNumber(historyQ.data.slice(0, -1).reduce((sum, d) => sum + d.steps, 0) + steps)} steps in 7 days
              </Body>
              <Body dim size={13}>{historyQ.data.filter((d) => d.active).length} active days</Body>
            </Row>
          ) : null}
        </Card>

        {/* Quick links */}
        <SectionHeader title="Get into it" />
        <Row gap={S.md}>
          <QuickLink icon={Swords} label="Battles" onPress={() => router.push("/(tabs)/outside/arena")} />
          <QuickLink icon={CalendarDays} label="Events" onPress={() => router.push("/(tabs)/outside/events")} />
          <QuickLink icon={ShoppingBag} label="Drops" onPress={() => router.push("/(tabs)/outside/drops")} />
        </Row>

        {/* Mini city leaderboard */}
        <SectionHeader title={`${profile.city} today`} action="See all" onAction={() => router.push("/(tabs)/outside/arena")} />
        <MiniBoard board={boardQ.data} loading={boardQ.isPending} onPlayer={(id) => router.push(id === "me" ? "/(tabs)/profile" : `/player/${id}`)} />
      </Screen>

      {confetti ? (
        <ConfettiCannon
          key={confetti}
          count={120}
          origin={{ x: width / 2, y: -20 }}
          fadeOut
          autoStart
          colors={[C.accent, "#ffffff", "#7dffbe", C.gold]}
        />
      ) : null}
    </View>
  );
}

const HeroStat = ({ label, value }) => (
  <View style={{ alignItems: "center", flex: 1 }}>
    <Text style={{ fontFamily: F.displayMedium, fontSize: 18, color: C.text }} numberOfLines={1}>{value}</Text>
    <Label style={{ marginTop: 2 }}>{label}</Label>
  </View>
);

function PedometerNotice({ available, permission, onDevTools }) {
  if (available === null || (available && permission === "granted")) return null;
  const denied = available && permission === "denied";
  return (
    <Card style={{ marginTop: S.md }}>
      <Row gap={S.md} style={{ alignItems: "flex-start" }}>
        <View style={styles.noticeIcon}>
          <Footprints size={18} color={C.warn} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontSize: 15, fontWeight: "700" }}>
            {denied ? "Step counting is off" : "No step counter here"}
          </Text>
          <Body dim size={13} style={{ marginTop: 2 }}>
            {denied
              ? "Allow Motion & Fitness for OutHere in your phone settings so your steps count."
              : "This device can't count steps (web or a simulator). On your phone they'll come in on their own."}
          </Body>
          {denied ? (
            <Button title="Open phone settings" size="sm" variant="secondary" onPress={() => Linking.openSettings()} style={{ marginTop: S.md, alignSelf: "flex-start" }} />
          ) : __DEV__ ? (
            <Button title="Add test steps in Settings" size="sm" variant="secondary" onPress={onDevTools} style={{ marginTop: S.md, alignSelf: "flex-start" }} />
          ) : null}
        </View>
      </Row>
    </Card>
  );
}

const OutsideToggle = ({ on, busy, onPress }) => (
  <Pressable
    onPress={onPress}
    disabled={busy}
    accessibilityRole="switch"
    accessibilityState={{ checked: on }}
    accessibilityLabel="I'm outside"
    style={[styles.toggle, on && styles.toggleOn, busy && { opacity: 0.6 }]}
  >
    <View style={[styles.toggleDot, on && { backgroundColor: C.accentText }]} />
    <Text style={[styles.toggleText, on && { color: C.accentText }]}>{on ? "I'm out" : "I'm outside"}</Text>
  </Pressable>
);

const QuickLink = ({ icon: Icon, label, onPress }) => (
  <Card onPress={onPress} style={{ flex: 1, alignItems: "center" }} padding={S.lg}>
    <View style={styles.quickIcon}>
      <Icon size={20} color={C.accent} />
    </View>
    <Text style={{ color: C.text, fontFamily: F.displayMedium, fontSize: 15, marginTop: S.sm }}>{label}</Text>
  </Card>
);

function MiniBoard({ board, loading, onPlayer }) {
  if (loading || !board) {
    return (
      <Card>
        <Loading style={{ paddingVertical: 24 }} />
      </Card>
    );
  }
  const top = board.entries.slice(0, 3);
  const me = board.me;
  const rows = me && me.rank > 3 ? [...top, me] : top;
  return (
    <Card padding={S.sm}>
      {rows.map((row, i) => (
        <React.Fragment key={row.player.id}>
          {i === 3 ? <Text style={{ color: C.textMute, textAlign: "center", marginVertical: 2 }}>...</Text> : null}
          <Pressable onPress={() => onPlayer(row.player.id)} style={[styles.boardRow, row.isMe && styles.boardRowMe]}>
            <Text style={[styles.rank, row.rank === 1 && { color: C.gold }, row.isMe && { color: C.accent }]}>{row.rank}</Text>
            <Avatar uri={row.player.avatar} name={row.player.name} size={34} />
            <Text style={{ flex: 1, color: C.text, fontSize: 15, fontWeight: row.isMe ? "800" : "600" }} numberOfLines={1}>
              {row.isMe ? "You" : row.player.name}
            </Text>
            <Text style={{ color: row.isMe ? C.accent : C.textDim, fontFamily: F.displayMedium, fontSize: 15 }}>{formatNumber(row.value)}</Text>
            <ChevronRight size={16} color={C.textMute} />
          </Pressable>
        </React.Fragment>
      ))}
      {board.hiddenMe ? (
        <Body mute size={12} style={{ textAlign: "center", paddingVertical: S.sm }}>
          You're hidden from leaderboards. Change it in Settings.
        </Body>
      ) : me ? (
        <Body mute size={12} style={{ textAlign: "center", paddingVertical: S.sm }}>
          You're #{me.rank} of {board.entries.length} in {board.city} today
        </Body>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  bigNumber: { color: C.text, fontFamily: F.display, fontSize: 28, marginTop: 6 },
  flameWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,107,53,0.14)", alignItems: "center", justifyContent: "center" },
  noticeIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,193,7,0.14)", alignItems: "center", justifyContent: "center" },
  quickIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center" },
  toggle: { flexDirection: "row", alignItems: "center", gap: 8, height: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.surfaceHigh },
  toggleOn: { backgroundColor: C.accent, borderColor: C.accent },
  toggleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.textMute },
  toggleText: { color: C.text, fontSize: 13, fontWeight: "700" },
  boardRow: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: 10, paddingHorizontal: S.md, borderRadius: 14 },
  boardRowMe: { backgroundColor: C.accentDim },
  rank: { width: 22, color: C.textDim, fontFamily: F.display, fontSize: 16, textAlign: "center" },
});
