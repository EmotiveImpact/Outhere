import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check } from "@/components/ui/icons";
import { engine, useBattles, useChallenges, useEngineMutation, useProfile, useStepHistory } from "@/data/hooks";
import { PHOTOS } from "@/constants/photos";
import { AnimatedNumber, Button, C, EmptyState, F, FadeIn, Pill, PressableScale, ProgressBar, R, Row, S, SectionHeader, Skeleton, Surface, TAB_BAR_SPACE, toast } from "@/components/ui";
import { countdown, dateLabel, formatKm, formatNumber } from "@/utils/format";
import { useNow } from "@/components/arena/shared";
import { Bar, GlowHero, SectionLabel, TopBar } from "@/components/arena/OutsideKit";

const PERIOD_LABEL = { day: "Today", week: "This week", weekend: "Weekend" };

const amount = (c, v) => (c.metric === "distance" ? formatKm(v) : `${formatNumber(v)} steps`);

const SECTIONS = [
  { key: "complete", title: "Ready to claim" },
  { key: "joined", title: "In progress" },
  { key: "open", title: "Open to join" },
  { key: "upcoming", title: "Coming up" },
  { key: "claimed", title: "Claimed" },
];

// The streak flame on top, every day of the month underneath (blue for a day
// outside), then the challenges to chase.
function StreakHero({ streak, days }) {
  const insets = useSafeAreaInsets();
  const now = new Date();
  const month = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const inMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const activeByDate = new Map((days || []).map((d) => [d.date, d.active || d.steps >= 3000]));
  const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = now.getDate();
  const outside = Array.from({ length: today }, (_, i) => activeByDate.get(key(new Date(now.getFullYear(), now.getMonth(), i + 1)))).filter(Boolean).length;
  const cells = [...Array(lead).fill(null), ...Array.from({ length: inMonth }, (_, i) => i + 1)];
  return (
    <View>
      {/* .slab with the flame object (chal6): the streak is the hero. */}
      <GlowHero object={PHOTOS.flame} objectSize={206} objectStyle={{ right: -30, top: insets.top + 22 }} height={222} kicker="Your streak" top={`${streak} ${streak === 1 ? "day" : "days"}`} bottom="outside" />
      <View style={{ paddingHorizontal: S.gutter }}>
      <Row style={{ justifyContent: "space-between", alignItems: "baseline", marginTop: 14, marginBottom: 10 }}>
        <Text style={styles.month}>{month}</Text>
        <Text style={styles.monthMeta}>
          <Text style={{ color: C.accent, fontFamily: F.bodySemi }}>
            {outside} of {today}
          </Text>{" "}
          days outside so far
        </Text>
      </Row>
      <View style={styles.grid}>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <Text key={`h${i}`} style={styles.dow}>{d}</Text>
        ))}
        {cells.map((n, i) => {
          if (!n) return <View key={`e${i}`} style={styles.cell} />;
          const isToday = n === today;
          const future = n > today;
          const active = !future && activeByDate.get(key(new Date(now.getFullYear(), now.getMonth(), n)));
          return (
            <View key={n} style={styles.cell}>
              <View style={[styles.day, active && styles.dayOn, isToday && styles.dayToday]}>
                <Text style={[styles.dayText, !future && { color: C.textSoft }, (active || isToday) && { color: C.text }]}>{n}</Text>
              </View>
            </View>
          );
        })}
      </View>
      </View>
    </View>
  );
}

// Today: the day's challenges, your check-in and your live battle, ticked off
// as you go. Every reward shown is one you actually get.
function TodayCard({ list, profile, battles, onClaim }) {
  const tasks = [];
  if (profile) tasks.push({ key: "checkin", title: "Check in today", done: !!profile.checkedInToday, reward: "+XP" });
  for (const c of list.filter((x) => x.period === "day")) {
    tasks.push({ key: c.id, title: c.metric === "distance" ? formatKm(c.target) : `${formatNumber(c.target)} steps`, done: c.status === "complete" || c.status === "claimed", progress: c.percent, reward: `+${formatNumber(c.rewardXp)} XP`, claim: c.status === "complete" ? () => onClaim(c.id) : null });
  }
  const live = (battles || []).find((b) => b.status === "active" && b.phase === "live" && !b.timed);
  if (live) {
    const name = live.opponent.player?.name || "your rival";
    tasks.push({ key: live.id, title: `Lead ${name} at the whistle`, done: live.leader === "me", reward: `+${15 + (live.stakeOut || 0) * 2} OUT` });
  }
  if (!tasks.length) return null;
  const done = tasks.filter((t) => t.done).length;
  return (
    <View style={{ paddingHorizontal: S.gutter }}>
      <SectionLabel right={`${done} of ${tasks.length} done`} style={{ marginTop: S.lg, marginBottom: 10 }}>Today</SectionLabel>
      <Surface radius={20} padding={null} contentStyle={styles.today}>
        {tasks.map((t, i) => (
          <PressableScale key={t.key} disabled={!t.claim} onPress={t.claim || undefined} scaleTo={0.98} style={[styles.task, i > 0 && styles.taskLine]}>
            <View style={[styles.check, t.done && styles.checkOn]}>{t.done ? <Check size={14} color="#fff" strokeWidth={3} /> : null}</View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.taskTitle, t.done && styles.taskDone]} numberOfLines={1}>
                {t.title}
              </Text>
              {!t.done && t.progress != null ? <Bar value={t.progress} style={{ marginTop: 6, width: "70%" }} /> : null}
            </View>
            <Text style={styles.taskReward}>{t.claim ? "Claim" : t.reward}</Text>
          </PressableScale>
        ))}
      </Surface>
    </View>
  );
}

export default function ChallengesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const inOutside = usePathname()?.startsWith("/outside");
  const profile = useProfile().data;
  const battles = useBattles().data;
  const month = useStepHistory(31).data;
  const now = useNow(30 * 1000);
  const { data, isPending, refetch, isRefetching } = useChallenges();

  const list = data || [];
  const titleFor = (id) => list.find((c) => c.id === id)?.title || "challenge";

  const join = useEngineMutation(engine.joinChallenge, {
    onSuccess: (_, id) => toast.success("You're in", `${titleFor(id)}. Your steps already count.`),
  });
  const claim = useEngineMutation(engine.claimChallenge, {
    onSuccess: (reward, id) =>
      toast.success(`+${formatNumber(reward?.xp ?? 0)} XP${reward?.out ? ` · +${reward.out} OUT` : ""}`, `${titleFor(id)} banked. Nice work.`),
  });

  const ready = list.filter((c) => c.status === "complete");
  const joined = list.filter((c) => c.status === "joined" || c.status === "complete").length;
  const live = list.filter((c) => c.status !== "claimed");
  const upForGrabs = live.reduce((sum, c) => sum + c.rewardXp, 0);
  const outForGrabs = live.reduce((sum, c) => sum + (c.rewardOut || 0), 0);

  let index = 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + insets.bottom + 24 }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} progressViewOffset={insets.top + 60} />}
    >
      {isPending ? (
        <View style={{ gap: S.md, paddingHorizontal: S.gutter, paddingTop: insets.top + 70 }}>
          <Skeleton height={168} radius={20} />
          <Skeleton width={140} height={20} style={{ marginTop: S.lg }} />
          <Skeleton height={230} radius={20} />
          <Skeleton height={230} radius={20} />
        </View>
      ) : !list.length ? (
        <EmptyState style={{ paddingTop: insets.top + 90 }} title="No challenges right now" body="New ones land every day and every week." action="Go to the Arena" onAction={() => router.push("/outside/arena")} />
      ) : (
        <>
          <StreakHero streak={profile?.streak || 0} days={month} />
          <TodayCard list={list} profile={profile} battles={battles} onClaim={(id) => claim.mutate(id)} />
          <View style={{ paddingHorizontal: S.gutter }}>
          <FadeIn>
            <Surface radius={R.lg} padding={S.xl} style={{ marginTop: S.xxl }}>
              <Row gap={8} style={{ alignItems: "flex-end" }}>
                <AnimatedNumber value={upForGrabs} style={styles.heroValue} />
                <Text style={styles.heroUnit}>XP</Text>
              </Row>
              <Text style={styles.heroMeta}>
                up for grabs{outForGrabs ? `, plus ${formatNumber(outForGrabs)} OUT` : ""}
              </Text>
              <Row gap={0} style={styles.heroStats}>
                <HeroStat label="joined" value={`${joined} of ${list.length}`} />
                <HeroStat label="to claim" value={String(ready.length)} />
                <HeroStat label="live now" value={String(list.filter((c) => c.status !== "upcoming" && c.status !== "claimed").length)} />
              </Row>
            </Surface>
          </FadeIn>

          {SECTIONS.map((section) => {
            const items = list.filter((c) => c.status === section.key);
            if (!items.length) return null;
            return (
              <View key={section.key}>
                <SectionHeader title={section.title} />
                <View style={{ gap: S.md }}>
                  {items.map((c, i) => (
                    <FadeIn key={c.id} index={index++}>
                      <ChallengeCard
                        challenge={c}
                        now={now}
                        primary={section.key === "complete" && i === 0}
                        joining={join.isPending && join.variables === c.id}
                        claiming={claim.isPending && claim.variables === c.id}
                        onJoin={() => join.mutate(c.id)}
                        onClaim={() => claim.mutate(c.id)}
                      />
                    </FadeIn>
                  ))}
                </View>
              </View>
            );
          })}
          </View>
        </>
      )}
    </ScrollView>
    {!inOutside ? <TopBar /> : null}
    </View>
  );
}

function HeroStat({ label, value }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function ChallengeCard({ challenge: c, now, primary, joining, claiming, onJoin, onClaim }) {
  const done = c.status === "complete";
  const claimed = c.status === "claimed";
  const upcoming = c.status === "upcoming";
  const timeText = upcoming ? `Starts ${dateLabel(c.startsAt)}` : claimed ? "Done" : `${countdown(c.endsAt, now)} left`;
  const pct = Math.round(c.percent * 100);

  return (
    <Surface radius={R.lg} padding={S.lg} style={claimed ? { opacity: 0.7 } : null}>
      <Row style={{ justifyContent: "space-between" }}>
        <Pill label={PERIOD_LABEL[c.period] || String(c.period)} />
        <Text style={styles.meta}>{timeText}</Text>
      </Row>

      <Text style={styles.title}>{c.title}</Text>
      <Text style={styles.desc}>{c.description}</Text>

      {!upcoming ? (
        <View style={{ marginTop: S.lg }}>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-end", marginBottom: S.sm }}>
            <Text style={styles.progress} numberOfLines={1}>
              {amount(c, c.progress)}
              <Text style={styles.target}> of {amount(c, c.target)}</Text>
            </Text>
            <Text style={[styles.percent, (done || claimed) && { color: C.text }]}>{pct}%</Text>
          </Row>
          <ProgressBar value={c.percent} height={6} colour={c.joined || claimed ? C.accent : C.borderStrong} />
          {!c.joined && c.progress > 0 ? <Text style={styles.note}>Your steps already count. Join to lock it in.</Text> : null}
        </View>
      ) : null}

      <Row style={{ justifyContent: "space-between", marginTop: S.lg }}>
        <Text style={styles.rewardText}>
          +{formatNumber(c.rewardXp)} XP{c.rewardOut ? ` · +${c.rewardOut} OUT` : ""}
        </Text>
        <Text style={styles.meta}>{formatNumber(c.participants)} in</Text>
      </Row>

      {done ? (
        <Button title="Claim reward" variant={primary ? "primary" : "secondary"} size="lg" onPress={onClaim} loading={claiming} full style={{ marginTop: S.lg }} />
      ) : c.status === "open" || upcoming ? (
        <Button title={upcoming ? "Join early" : "Join challenge"} variant="secondary" onPress={onJoin} loading={joining} full style={{ marginTop: S.lg }} />
      ) : claimed ? (
        <Row gap={6} style={styles.claimed}>
          <Check size={15} color={C.textDim} strokeWidth={2.5} />
          <Text style={styles.claimedText}>Reward banked</Text>
        </Row>
      ) : (
        <Row gap={6} style={styles.joined}>
          <Text style={styles.joinedText}>Joined · {amount(c, Math.max(0, c.target - c.progress))} to go</Text>
        </Row>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  today: { paddingHorizontal: 14, paddingVertical: 4 },
  task: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: 11 },
  taskLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  check: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: "#222731", alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: C.accent, borderColor: C.accent, boxShadow: "0 0 10px rgba(61,139,255,0.45)" },
  taskTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  taskDone: { color: C.textDim, textDecorationLine: "line-through" },
  taskReward: { color: C.accent, fontFamily: F.bodySemi, fontSize: 12.5 },
  // .calhead and .cal.sm
  month: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  monthMeta: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -2 },
  dow: { width: `${100 / 7}%`, textAlign: "center", color: C.textDim, fontFamily: F.body, fontSize: 10.5, marginBottom: 2 },
  cell: { width: `${100 / 7}%`, padding: 2 },
  day: { height: 27, borderRadius: 8, backgroundColor: "#12151a", alignItems: "center", justifyContent: "center" },
  dayOn: { backgroundColor: "#1e3456" },
  dayToday: { backgroundColor: C.accent, boxShadow: "0 0 12px rgba(61,139,255,0.38)" },
  dayText: { color: "#4a5160", fontFamily: F.bodySemi, fontSize: 12 },
  heroValue: { color: C.text, fontFamily: F.display, fontSize: 56, letterSpacing: -1.5, lineHeight: 60 },
  heroUnit: { color: C.textDim, fontFamily: F.display, fontSize: 22, marginBottom: 8 },
  heroMeta: { color: C.textDim, fontSize: 15, marginTop: 2 },
  heroStats: { marginTop: S.xl },
  heroStatValue: { color: C.text, fontFamily: F.display, fontSize: 20 },
  heroStatLabel: { color: C.textDim, fontSize: 13, marginTop: 2 },
  meta: { color: C.textDim, fontSize: 13 },
  title: { color: C.text, fontFamily: F.display, fontSize: 26, textTransform: "uppercase", marginTop: S.md },
  desc: { color: C.textDim, fontSize: 15, lineHeight: 21, marginTop: 4 },
  progress: { color: C.text, fontFamily: F.display, fontSize: 17, flexShrink: 1 },
  target: { color: C.textMute, fontFamily: F.displayMedium, fontSize: 13 },
  percent: { color: C.textDim, fontFamily: F.display, fontSize: 15 },
  note: { color: C.textMute, fontSize: 13, marginTop: S.sm },
  rewardText: { color: C.text, fontFamily: F.displayMedium, fontSize: 15 },
  claimed: { marginTop: S.lg },
  claimedText: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 13 },
  joined: { marginTop: S.lg },
  joinedText: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 13 },
});
