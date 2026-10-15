// Home. Built to fit one screen: greeting with the membership mark, the
// stories row (rings for stories, dots for who is out), the two-tone
// headline, today's dial (tap it for your week), three quick buttons and the
// carousel sitting just above the tab bar. Offline it keeps counting and
// lists what is waiting to sync; if Home can't load it says so and offers
// one button to try again.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import ConfettiCannon from "react-native-confetti-cannon";
import { Bell, CheckCheck, ChevronsRight, Flame, Plus, Route, ShoppingBag, Swords } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  engine,
  useBattles,
  useChallenges,
  useDrops,
  useEngineMutation,
  useEvents,
  useFriends,
  useOutsideNow,
  useProfile,
  useRuns,
  useStories,
  useUnreadCount,
} from "@/data/hooks";
import { useStepStatus } from "@/hooks/useStepSync";
import { OPENED_WITH_STATE, STATE_PREVIEW, useOnline } from "@/hooks/useOnline";
import { Avatar, C, ErrorState, F, FadeIn, IconButton, Kicker, LIT, OfflineBanner, PressableScale, R, Row, S, Screen, Skeleton, SyncList, Title, toast } from "@/components/ui";
import GoalDial, { Dial } from "@/components/home/GoalDial";
import OutsideCarousel from "@/components/home/OutsideCarousel";
import { PHOTOS } from "@/constants/photos";
import { hapticSuccess } from "@/services/haptics";
import { dateLabel, formatKm, formatNumber, greeting, tierLabel } from "@/utils/format";
import { Surface } from "@/components/ui/Surface";

const QUICK = [
  { key: "move", icon: Route, label: "Move", hint: "Track", href: "/(tabs)/move" },
  { key: "battle", icon: Swords, label: "1v1", hint: "Battle", href: "/outside/arena" },
  { key: "drops", icon: ShoppingBag, label: "Drops", hint: "Spend", href: "/outside/drops" },
];

function TierMark({ tier }) {
  if (tier !== "pro" && tier !== "black") return null;
  return (
    <View style={[styles.mark, tier === "black" ? styles.markBlack : styles.markPro]}>
      <Text style={[styles.markText, { color: tier === "black" ? "#e6eaef" : "#fff" }]}>{tier === "black" ? "BLACK" : "PRO"}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const params = useLocalSearchParams();
  const preview = STATE_PREVIEW ? params?.state || OPENED_WITH_STATE : null;
  const online = useOnline() && preview !== "offline";
  const profileQ = useProfile();
  const { liveSteps } = useStepStatus();
  const [retrying, setRetrying] = useState(false);

  if (preview === "loading" || (profileQ.isPending && !profileQ.data)) return <HomeSkeleton />;
  if (preview === "error" || (profileQ.isError && !profileQ.data)) {
    const retry = async () => {
      setRetrying(true);
      await profileQ.refetch().catch(() => {});
      setRetrying(false);
    };
    return (
      <Screen tab padded={false} style={{ paddingTop: 0 }}>
        <ErrorState what="your home" steps={liveSteps ?? null} onRetry={retry} retrying={retrying} />
      </Screen>
    );
  }
  if (!profileQ.data) return <HomeSkeleton />;
  if (!online) return <OfflineHome profile={profileQ.data} liveSteps={liveSteps} />;
  return <OnlineHome profile={profileQ.data} liveSteps={liveSteps} />;
}

function OnlineHome({ profile, liveSteps }) {
  const router = useRouter();
  const { width, height: screenH } = useWindowDimensions();
  const unreadQ = useUnreadCount();
  const friendsQ = useFriends();
  const { data: myStories } = useStories(profile?.id);
  const outsideQ = useOutsideNow(profile?.city);
  const eventsQ = useEvents(profile?.city);
  const challengesQ = useChallenges();
  const dropsQ = useDrops();
  const [confetti, setConfetti] = useState(0);
  const remind = useEngineMutation(engine.toggleDropReminder, { success: (d) => (d?.reminder === false ? "Reminder off" : "We'll ping you when it drops") });
  const join = useEngineMutation(engine.joinChallenge);

  const goal = profile?.dailyGoal || 10000;
  const steps = Math.max(profile?.today?.steps || 0, liveSteps || 0);

  // Celebrate the moment the goal is crossed while the app is open.
  const prevSteps = useRef(null);
  useEffect(() => {
    if (prevSteps.current != null && prevSteps.current < goal && steps >= goal) {
      hapticSuccess();
      toast.success("Daily goal smashed", "+40 XP   +4 OUT");
      setConfetti((n) => n + 1);
    }
    prevSteps.current = steps;
  }, [steps, goal]);

  const slides = useMemo(() => {
    const out = outsideQ.data;
    const nextEvent = (eventsQ.data || []).find((e) => e.startAt > Date.now());
    const today = (challengesQ.data || []).find((c) => c.period === "day" && c.status !== "claimed");
    const chase = (challengesQ.data || []).find((c) => c.period !== "day" && (c.status === "joined" || c.status === "open"));
    const drop = (dropsQ.data || []).find((d) => d.status !== "soldout");
    const friendsOut = (friendsQ.data || []).filter((f) => f.isOutside);
    const place = profile.city || "your city";
    const list = [
      {
        key: "live",
        live: true,
        kicker: "Live now",
        title: formatNumber(out?.count ?? 0),
        body: (() => {
          const names = friendsOut.slice(0, 2).map((f) => f.name).join(" and ");
          const verb = friendsOut.length > 1 ? "are" : "is";
          if (!out?.count) return friendsOut.length ? `outside in ${place} yet. ${names} ${verb} out elsewhere.` : `outside in ${place} yet. Be the first out.`;
          return friendsOut.length ? `outside in ${place}. ${names} ${verb} out too.` : `outside in ${place} right now.`;
        })(),
        faces: (out?.people || []).slice(0, 4),
        image: PHOTOS.navCity,
        onPress: () => router.push("/(tabs)/move"),
      },
    ];
    if (nextEvent)
      list.push({ key: "event", kicker: dateLabel(nextEvent.startAt), title: nextEvent.title, body: `${nextEvent.location} · ${nextEvent.rsvpCount} going`, image: nextEvent.image || PHOTOS.event, onPress: () => router.push(`/events/${nextEvent.id}`) });
    if (chase)
      list.push({ key: "challenge", kicker: "Challenge", title: chase.title, body: `${chase.description} +${chase.rewardXp} XP`, image: PHOTOS.flame, onPress: () => router.push("/outside/challenges") });
    if (drop) {
      const opens = drop.status === "upcoming" ? drop.releaseAt : null;
      list.push({
        key: "drop",
        icon: ShoppingBag,
        kicker: drop.status === "live" ? "Drop · live now" : drop.status === "early" ? "Drop · early access" : `Drop · ${drop.tag || "next up"}`,
        title: drop.title,
        body: drop.status === "live" ? `${drop.remaining} left. Spend your OUT.` : drop.subtitle || "Limited run.",
        countdownTo: opens,
        countdownLabel: "Drops in",
        onPress: () => router.push(`/drops/${drop.id}`),
        action:
          drop.status === "upcoming" || drop.status === "early"
            ? { label: drop.reminder ? "Reminder on" : "Remind me", onPress: () => remind.mutate(drop.id) }
            : { label: "Shop", primary: true, onPress: () => router.push(`/drops/${drop.id}`) },
      });
    }
    // Today's challenge goes last, as in the demo.
    const target = today?.target || goal;
    const left = Math.max(0, target - steps);
    list.push({
      key: "today",
      icon: Flame,
      kicker: "Today's challenge",
      title: `${formatNumber(target)} steps`,
      body: left > 0 ? `${formatNumber(left)} to go${profile.streak ? ` · keeps your ${profile.streak} day streak` : ""}` : "Done. Your streak is safe for today.",
      onPress: () => router.push("/outside/challenges"),
      action: {
        label: left > 0 ? "Go" : "See all",
        primary: true,
        onPress: () => {
          if (today && !today.joined && today.status === "open") join.mutate(today.id);
          router.push(left > 0 ? "/(tabs)/move" : "/outside/challenges");
        },
      },
    });
    return list;
  }, [profile, outsideQ.data, eventsQ.data, challengesQ.data, dropsQ.data, friendsQ.data, router, steps, goal, remind, join]);

  const name = (profile.name || profile.username || "").split(" ")[0];
  const level = profile.level?.level ?? profile.level;
  const line = [
    profile.tier === "black" && profile.foundingNumber ? `Founding member #${profile.foundingNumber}` : null,
    `Level ${level}`,
    profile.area || profile.city,
    profile.tier !== "black" && profile.streak ? `${profile.streak} day streak` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const friends = friendsQ.data || [];
  const done = steps >= goal;
  const compact = screenH < 760;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen tab padded contentStyle={{ flexGrow: 1 }}>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.gutter, marginTop: compact ? S.md : S.lg, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: S.gutter, gap: 14 }}>
          <View style={styles.friend}>
            <PressableScale onPress={() => router.push(myStories?.length ? `/stories/${profile.id}` : "/stories/new")} accessibilityLabel={myStories?.length ? "Your story" : "Add a story"}>
              <Avatar uri={profile.avatar} name={name} story={myStories?.length ? "watched" : undefined} size={56} />
            </PressableScale>
            <PressableScale onPress={() => router.push("/stories/new")} hitSlop={8} style={styles.add} accessibilityLabel="Add a story">
              <Plus size={12} color="#fff" strokeWidth={3} />
            </PressableScale>
            <Text style={styles.friendName}>You</Text>
          </View>
          {friends.map((f, i) => (
            <PressableScale
              key={f.id}
              onPress={() => {
                if (!f.story) return router.push(`/player/${f.id}`);
                // Play this person, then everyone after them with something new.
                const queue = friends.slice(i + 1).filter((x) => x.story === "unwatched").map((x) => x.id).join(",");
                router.push({ pathname: "/stories/[authorId]", params: { authorId: f.id, queue } });
              }}
              style={styles.friend}
            >
              <Avatar uri={f.avatar} name={f.name} dot={f.dot || (f.isOutside ? "out" : null)} story={f.story || "watched"} size={56} />
              <Text style={[styles.friendName, f.story === "unwatched" && { color: C.text }]} numberOfLines={1}>{f.name}</Text>
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

        <FadeIn index={0} style={{ marginTop: compact ? S.md : S.lg }}>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
            <View style={{ flex: 1 }}>
              <Title size={36}>{done ? "Goal smashed" : `${formatNumber(steps)} steps`}</Title>
              <Title size={36} blue>{done ? `${formatNumber(steps)} and counting` : "and counting"}</Title>
            </View>
          </Row>
        </FadeIn>

        <FadeIn index={1} style={{ marginTop: S.md }}>
          <PressableScale onPress={() => router.push("/week")} scaleTo={0.985} accessibilityLabel="See your week">
            <GoalDial steps={steps} goal={goal} xp={profile.today?.xp || 0} out={profile.today?.out || 0} streak={profile.streak || 0} size={width < 370 || compact ? 96 : 112} />
            <View style={styles.seeWeek} pointerEvents="none">
              <Text style={styles.seeWeekText}>See week</Text>
              <ChevronsRight size={13} color={C.textDim} />
            </View>
          </PressableScale>
        </FadeIn>

        <FadeIn index={2} style={{ marginTop: S.md }}>
          <Row gap={S.md}>
            {QUICK.map(({ key, icon: Icon, label, hint, href }) => (
              <PressableScale key={key} onPress={() => router.push(href)} scaleTo={0.95} style={[styles.quick, compact && { height: 84 }]}>
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

        {/* Pushes the carousel down to sit just above the tab bar. */}
        <View style={{ flex: 1, minHeight: S.md }} />

        <FadeIn index={3}>
          <OutsideCarousel slides={slides} height={width < 370 || compact ? 120 : 132} />
        </FadeIn>
      </Screen>

      {confetti ? (
        <ConfettiCannon key={confetti} count={140} origin={{ x: width / 2, y: -20 }} fadeOut autoStart explosionSpeed={420} fallSpeed={2600} colors={[C.accent, "#ffffff", C.accentHi, C.out]} />
      ) : null}
    </View>
  );
}

// ── Offline ───────────────────────────────────────────────────────────────────
// Steps keep counting on the phone; anything that needs the server is listed
// as waiting, from what the app already had on screen.

function OfflineHome({ profile, liveSteps }) {
  const battlesQ = useBattles("active");
  const challengesQ = useChallenges();
  const runsQ = useRuns(5);
  const steps = Math.max(profile?.today?.steps || 0, liveSteps || 0);
  const goal = profile?.dailyGoal || 10000;
  const name = (profile.name || profile.username || "").split(" ")[0];
  const greet = greeting().replace("Late one", "Evening");

  const items = [];
  const todayStart = new Date().setHours(0, 0, 0, 0);
  for (const r of (runsQ.data || []).filter((x) => (x.endedAt || 0) >= todayStart).slice(0, 2)) {
    items.push({ key: `run:${r.id}`, icon: Route, title: r.title || "Today's run", sub: `${formatKm(r.distanceKm || 0)} ${r.kind === "walk" ? "walk" : "run"}${r.outEarned ? ` · +${r.outEarned} OUT` : ""}` });
  }
  const day = (challengesQ.data || []).filter((c) => c.period === "day");
  if (day.length) {
    const doneN = day.filter((c) => c.status === "complete" || c.status === "claimed").length;
    items.push({ key: "tasks", icon: CheckCheck, title: "Daily tasks", sub: `${doneN} of ${day.length} done` });
  }
  for (const b of (battlesQ.data || []).slice(0, 2)) {
    items.push({ key: `battle:${b.id}`, icon: Swords, title: `Battle vs ${b.opponent?.player?.name || "your rival"}`, sub: "Score updates when you're back" });
  }
  if (!items.length) items.push({ key: "steps", icon: Route, title: "Today's steps", sub: `${formatNumber(steps)} steps to send` });

  return (
    // states/offline: the amber bar, hello, what's saved on the phone, what's waiting, and the live count greyed
    <Screen tab padded={false} contentStyle={{ paddingHorizontal: 18, paddingTop: 8, gap: 14 }}>
      <OfflineBanner />
      <Row gap={12}>
        <Avatar uri={profile.avatar} name={name} tier={profile.tier} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={offStyles.hello}>{`${greet}, ${name}`}</Text>
          <Text style={offStyles.helloSmall} numberOfLines={1}>
            {[tierLabel(profile.tier), `Level ${profile.level?.level ?? profile.level}`, profile.area || profile.city].filter(Boolean).join(" · ")}
          </Text>
        </View>
      </Row>
      <Surface radius={20} padding={null} contentStyle={offStyles.ring}>
        <Dial value={goal ? steps / goal : 0} size={112}>
          <Text style={offStyles.num}>{formatNumber(steps)}</Text>
          <Text style={offStyles.unit}>steps</Text>
        </Dial>
        <View style={{ flex: 1 }}>
          <Text style={offStyles.title}>Saved on this phone</Text>
          <Text style={offStyles.body}>Counted from your phone's motion chip, no signal needed</Text>
        </View>
      </Surface>
      <SyncList items={items} />
      <Surface radius={20} padding={null} style={{ opacity: 0.6 }} contentStyle={offStyles.live}>
        <View style={styles.greyDot} />
        <View style={{ flex: 1 }}>
          <Text style={offStyles.title}>Outside now</Text>
          <Text style={offStyles.body}>The live count comes back with your signal</Text>
        </View>
        <Text style={offStyles.body}>–</Text>
      </Surface>
    </Screen>
  );
}

// ── Loading ───────────────────────────────────────────────────────────────────
// Shapes in the layout of the real screen, so nothing jumps when it arrives.

function HomeSkeleton() {
  return (
    // states/loading: shimmer shapes in Home's own layout, 15 apart
    <Screen tab scroll={false} padded={false} contentStyle={{ paddingHorizontal: 18, paddingTop: 8, gap: 15 }}>
      <Row gap={12}>
        <Skeleton width={44} height={44} radius={22} />
        <View style={{ flex: 1, gap: 7 }}>
          <Skeleton width="60%" height={13} radius={7} />
          <Skeleton width="40%" height={10} radius={5} />
        </View>
      </Row>
      <Skeleton height={250} radius={26} />
      <Row gap={8}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={74} radius={18} style={{ flex: 1 }} />
        ))}
      </Row>
      <Skeleton height={96} radius={20} />
      <Skeleton height={60} radius={18} />
    </Screen>
  );
}

// The offline Home (.offring, .offlive, .hello).
const offStyles = StyleSheet.create({
  hello: { color: C.text, fontFamily: F.bodyMedium, fontSize: 13.5 },
  helloSmall: { color: C.textDim, fontFamily: F.bodyMedium, fontSize: 11, marginTop: 2 },
  ring: { flexDirection: "row", alignItems: "center", gap: 16, paddingTop: 14, paddingBottom: 14, paddingLeft: 14, paddingRight: 14 },
  live: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 13, paddingBottom: 13, paddingLeft: 14, paddingRight: 14 },
  num: { color: C.text, fontFamily: F.display, fontSize: 26, lineHeight: 28 },
  unit: { color: C.textDim, fontFamily: F.body, fontSize: 10 },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 14, marginBottom: 3 },
  body: { color: C.textDim, fontFamily: F.body, fontSize: 11, lineHeight: 15.5 },
});

const styles = StyleSheet.create({
  line: { color: C.textDim, fontFamily: F.body, fontSize: 13, marginTop: 2 },
  mark: { height: 20, paddingHorizontal: 7, borderRadius: 5, justifyContent: "center", marginTop: 4 },
  markPro: { backgroundColor: C.accent, shadowColor: C.accent, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  markBlack: { backgroundColor: "#2a3038", borderWidth: StyleSheet.hairlineWidth, borderColor: "#7d8691" },
  markText: { fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.6 },
  friend: { alignItems: "center", width: 60 },
  friendName: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: 6 },
  add: { position: "absolute", right: 1, top: 37, width: 20, height: 20, borderRadius: 10, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.bg },
  findFriends: { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, borderColor: C.borderStrong, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  seeWeek: { position: "absolute", right: S.lg, bottom: 10, flexDirection: "row", alignItems: "center", gap: 2 },
  seeWeekText: { color: C.textDim, fontFamily: F.bodyMedium, fontSize: 11 },
  quick: { flex: 1, height: 88, borderRadius: R.lg, alignItems: "center", justifyContent: "center", backgroundColor: C.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  quickIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(61,139,255,0.14)", borderWidth: 1, borderColor: "rgba(61,139,255,0.3)", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  quickLabel: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  quickHint: { color: C.textDim, fontFamily: F.body, fontSize: 11, marginTop: 1 },
  offName: { color: C.text, fontFamily: F.bodySemi, fontSize: 17 },
  savedCard: { flexDirection: "row", alignItems: "center", gap: S.lg, padding: S.lg, borderRadius: R.lg, backgroundColor: C.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  savedNum: { color: C.text, fontFamily: F.display, fontSize: 26, lineHeight: 28 },
  savedUnit: { color: C.textDim, fontFamily: F.body, fontSize: 11 },
  savedTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 16 },
  savedBody: { color: C.textDim, fontFamily: F.body, fontSize: 13, lineHeight: 18, marginTop: 2 },
  greyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.textMute },
});
