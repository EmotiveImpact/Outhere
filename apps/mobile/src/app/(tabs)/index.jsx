// Home. Built to fit one screen: greeting with the membership mark, the
// friends row (rings for membership, dots for who is out), the two-tone
// headline, today's dial, three quick buttons and the outside now carousel.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import ConfettiCannon from "react-native-confetti-cannon";
import { Bell, Plus, Route, ShoppingBag, Swords } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { engine, useChallenges, useDrops, useEvents, useFriends, useOutsideNow, useProfile, useUnreadCount } from "@/data/hooks";
import { useStepStatus } from "@/hooks/useStepSync";
import { Avatar, C, F, FadeIn, IconButton, Kicker, LIT, PressableScale, R, Row, S, Screen, Skeleton, Title, toast } from "@/components/ui";
import GoalDial from "@/components/home/GoalDial";
import OutsideCarousel from "@/components/home/OutsideCarousel";
import { PHOTOS } from "@/constants/photos";
import { hapticSuccess } from "@/services/haptics";
import { dateLabel, formatNumber, greeting } from "@/utils/format";

const QUICK = [
  { key: "move", icon: Route, label: "Move", hint: "Track", href: "/(tabs)/move" },
  { key: "battle", icon: Swords, label: "1v1", hint: "Battle", href: "/outside/arena" },
  { key: "drops", icon: ShoppingBag, label: "Drops", hint: "Spend", href: "/outside/drops" },
];

function TierMark({ tier }) {
  if (tier !== "pro" && tier !== "black") return null;
  return (
    <View style={[styles.mark, tier === "black" ? styles.markBlack : styles.markPro]}>
      <Text style={[styles.markText, { color: tier === "black" ? "#e6eaef" : C.accentHi }]}>{tier === "black" ? "BLACK" : "PRO"}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const profileQ = useProfile();
  const profile = profileQ.data;
  const unreadQ = useUnreadCount();
  const friendsQ = useFriends();
  const outsideQ = useOutsideNow(profile?.city);
  const eventsQ = useEvents(profile?.city);
  const challengesQ = useChallenges();
  const dropsQ = useDrops();
  const { liveSteps } = useStepStatus();
  const [confetti, setConfetti] = useState(0);

  const goal = profile?.dailyGoal || 10000;
  const steps = Math.max(profile?.today?.steps || 0, liveSteps || 0);

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

  const slides = useMemo(() => {
    if (!profile) return [];
    const out = outsideQ.data;
    const nextEvent = (eventsQ.data || []).find((e) => e.startAt > Date.now());
    const chase = (challengesQ.data || []).find((c) => c.status === "joined" || c.status === "open");
    const drop = (dropsQ.data || []).find((d) => d.status !== "soldout");
    const friendsOut = (friendsQ.data || []).filter((f) => f.isOutside);
    const list = [
      {
        key: "live",
        live: true,
        kicker: "Live now",
        title: formatNumber(out?.count ?? 0),
        body: friendsOut.length
          ? `outside in ${profile.city}. ${friendsOut.slice(0, 2).map((f) => f.name).join(" and ")} ${friendsOut.length > 1 ? "are" : "is"} out near you.`
          : `outside in ${profile.city} right now.`,
        faces: (out?.people || []).slice(0, 4),
        image: PHOTOS.navCity,
        onPress: () => router.push("/(tabs)/move"),
      },
    ];
    if (nextEvent)
      list.push({ key: "event", kicker: dateLabel(nextEvent.startAt), title: nextEvent.title, body: `${nextEvent.location} · ${nextEvent.rsvpCount} going`, image: nextEvent.image || PHOTOS.event, onPress: () => router.push(`/events/${nextEvent.id}`) });
    if (chase)
      list.push({ key: "challenge", kicker: "Challenge", title: chase.title, body: `${chase.description} +${chase.rewardXp} XP`, image: PHOTOS.flame, onPress: () => router.push("/outside/challenges") });
    if (drop)
      list.push({ key: "drop", kicker: drop.status === "live" ? "Drop live" : "Next drop", title: drop.title, body: drop.subtitle || "Limited run. Spend your OUT.", image: drop.image || PHOTOS.tee, onPress: () => router.push(`/drops/${drop.id}`) });
    return list;
  }, [profile, outsideQ.data, eventsQ.data, challengesQ.data, dropsQ.data, friendsQ.data, router]);

  if (!profile) return <HomeSkeleton />;

  const name = (profile.name || profile.username || "").split(" ")[0];
  const level = profile.level?.level ?? profile.level;
  const line = [
    profile.foundingNumber ? `Founding member #${profile.foundingNumber}` : null,
    `Level ${level}`,
    profile.area || profile.borough || profile.city,
    !profile.foundingNumber && profile.streak ? `${profile.streak} day streak` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const friends = friendsQ.data || [];
  const done = steps >= goal;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen tab padded>
        {/* Greeting */}
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start", paddingTop: S.md }}>
          <View style={{ flex: 1 }}>
            <Kicker colour={C.textDim}>{`Good ${greeting().toLowerCase().replace("late one", "evening")}`}</Kicker>
            <Row gap={8} style={{ marginTop: 2 }}>
              <Title size={38} numberOfLines={1} style={{ flexShrink: 1 }}>{name}</Title>
              <TierMark tier={profile.tier} />
            </Row>
            <Text style={styles.line} numberOfLines={1}>{line}</Text>
          </View>
          <IconButton icon={Bell} label="Notifications" badge={unreadQ.data || 0} onPress={() => router.push("/notifications")} />
        </Row>

        {/* Stories row: here the ring shows the story (blue until watched,
            then grey), not membership. Dots still show who's out. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.gutter, marginTop: S.lg }} contentContainerStyle={{ paddingHorizontal: S.gutter, gap: 14 }}>
          <PressableScale onPress={() => router.push("/(tabs)/profile")} style={styles.friend}>
            <View>
              <Avatar uri={profile.avatar} name={name} story="watched" size={56} />
              <View style={styles.add}>
                <Plus size={12} color="#fff" strokeWidth={3} />
              </View>
            </View>
            <Text style={styles.friendName}>You</Text>
          </PressableScale>
          {friends.map((f) => (
            <PressableScale
              key={f.id}
              onPress={() => {
                if (f.story === "unwatched") engine.markStoryWatched(f.id).catch(() => {});
                router.push(`/player/${f.id}`);
              }}
              style={styles.friend}
            >
              <Avatar uri={f.avatar} name={f.name} dot={f.dot || (f.isOutside ? "out" : null)} story={f.story || "watched"} size={56} />
              <Text style={[styles.friendName, f.isOutside && { color: C.text }]} numberOfLines={1}>{f.name}</Text>
            </PressableScale>
          ))}
          {!friends.length ? (
            <PressableScale onPress={() => router.push("/(tabs)/club")} style={styles.friend}>
              <View style={styles.findFriends}>
                <Plus size={20} color={C.textDim} />
              </View>
              <Text style={styles.friendName}>Find people</Text>
            </PressableScale>
          ) : null}
        </ScrollView>

        <FadeIn index={0} style={{ marginTop: S.lg }}>
          <Title size={36}>{done ? "Goal smashed" : `${formatNumber(steps)} steps`}</Title>
          <Title size={36} blue>{done ? `${formatNumber(steps)} and counting` : "and counting"}</Title>
        </FadeIn>

        <FadeIn index={1} style={{ marginTop: S.md }}>
          <GoalDial steps={steps} goal={goal} xp={profile.today?.xp || 0} out={profile.today?.out || 0} streak={profile.streak || 0} size={width < 370 ? 96 : 112} />
        </FadeIn>

        <FadeIn index={2} style={{ marginTop: S.md }}>
          <Row gap={S.md}>
            {QUICK.map(({ key, icon: Icon, label, hint, href }) => (
              <PressableScale key={key} onPress={() => router.push(href)} scaleTo={0.95} style={styles.quick}>
                <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { borderRadius: R.lg }]} />
                <View style={styles.quickIcon}>
                  <Icon size={18} color={C.accentHi} />
                </View>
                <Text style={styles.quickLabel}>{label}</Text>
                <Text style={styles.quickHint}>{hint}</Text>
              </PressableScale>
            ))}
          </Row>
        </FadeIn>

        <FadeIn index={3} style={{ marginTop: S.md }}>
          <OutsideCarousel slides={slides} height={width < 370 ? 128 : 146} />
        </FadeIn>
      </Screen>

      {confetti ? (
        <ConfettiCannon key={confetti} count={140} origin={{ x: width / 2, y: -20 }} fadeOut autoStart explosionSpeed={420} fallSpeed={2600} colors={[C.accent, "#ffffff", C.accentHi, C.out]} />
      ) : null}
    </View>
  );
}

function HomeSkeleton() {
  return (
    <Screen tab scroll={false}>
      <View style={{ paddingTop: S.md, gap: 8 }}>
        <Skeleton width={110} height={12} />
        <Skeleton width={180} height={38} />
        <Skeleton width={240} height={12} />
      </View>
      <Row gap={14} style={{ marginTop: S.lg }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width={56} height={56} radius={28} />
        ))}
      </Row>
      <Skeleton height={80} width={260} style={{ marginTop: S.lg }} />
      <Skeleton height={150} radius={20} style={{ marginTop: S.md }} />
      <Skeleton height={96} radius={20} style={{ marginTop: S.md }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: { color: C.textDim, fontFamily: F.body, fontSize: 13, marginTop: 2 },
  mark: { height: 20, paddingHorizontal: 7, borderRadius: 5, justifyContent: "center", marginTop: 4 },
  markPro: { backgroundColor: "rgba(61,139,255,0.16)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(130,180,255,0.6)" },
  markBlack: { backgroundColor: "#2a3038", borderWidth: StyleSheet.hairlineWidth, borderColor: "#7d8691" },
  markText: { fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.6 },
  friend: { alignItems: "center", width: 60 },
  friendName: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: 6 },
  add: { position: "absolute", right: -1, bottom: -1, width: 20, height: 20, borderRadius: 10, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.bg },
  findFriends: { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, borderColor: C.borderStrong, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  quick: { flex: 1, height: 96, borderRadius: R.lg, alignItems: "center", justifyContent: "center", backgroundColor: C.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  quickIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(61,139,255,0.14)", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  quickLabel: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  quickHint: { color: C.textDim, fontFamily: F.body, fontSize: 11, marginTop: 1 },
});
