import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { CalendarClock, Check, Coins, Gift, Target, Users, Zap } from "lucide-react-native";
import { engine, useChallenges, useEngineMutation } from "@/data/hooks";
import { AnimatedNumber, Button, C, EmptyState, F, FadeIn, Header, Label, Pill, ProgressBar, R, Row, S, Screen, SectionHeader, Skeleton, toast } from "@/components/ui";
import { countdown, dateLabel, formatKm, formatNumber } from "@/utils/format";
import { useNow } from "@/components/arena/shared";

const PERIOD_LABEL = { day: "TODAY", week: "THIS WEEK", weekend: "WEEKEND" };

const amount = (c, v) => (c.metric === "distance" ? formatKm(v) : `${formatNumber(v)} steps`);

const SECTIONS = [
  { key: "complete", title: "Ready to claim" },
  { key: "joined", title: "In progress" },
  { key: "open", title: "Open to join" },
  { key: "upcoming", title: "Coming up" },
  { key: "claimed", title: "Claimed" },
];

export default function ChallengesScreen() {
  const router = useRouter();
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
    <Screen tab header={<Header back title="Challenges" subtitle="Hit the target, bank the reward" />} onRefresh={refetch} refreshing={isRefetching}>
      {isPending ? (
        <View style={{ gap: S.md }}>
          <Skeleton height={168} radius={20} />
          <Skeleton width={140} height={20} style={{ marginTop: S.lg }} />
          <Skeleton height={230} radius={20} />
          <Skeleton height={230} radius={20} />
        </View>
      ) : !list.length ? (
        <EmptyState icon={Target} title="No challenges right now" body="New ones land every day and every week." action="Go to the Arena" onAction={() => router.push("/outside/arena")} />
      ) : (
        <>
          <FadeIn>
            <View style={styles.hero}>
              <LinearGradient colors={["rgba(0,255,127,0.22)", "rgba(0,255,127,0.03)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Label style={{ color: C.accent }}>Up for grabs</Label>
              <Row gap={8} style={{ alignItems: "flex-end", marginTop: 4 }}>
                <AnimatedNumber value={upForGrabs} style={styles.heroValue} />
                <Text style={styles.heroUnit}>XP</Text>
                {outForGrabs ? (
                  <Row gap={4} style={{ marginLeft: S.sm, marginBottom: 8 }}>
                    <Coins size={15} color={C.gold} />
                    <Text style={styles.heroOut}>+{formatNumber(outForGrabs)} OUT</Text>
                  </Row>
                ) : null}
              </Row>
              <Row gap={0} style={styles.heroStats}>
                <HeroStat label="Joined" value={`${joined} of ${list.length}`} />
                <View style={styles.rule} />
                <HeroStat label="To claim" value={String(ready.length)} accent={ready.length > 0} />
                <View style={styles.rule} />
                <HeroStat label="Live now" value={String(list.filter((c) => c.status !== "upcoming" && c.status !== "claimed").length)} />
              </Row>
            </View>
          </FadeIn>

          {SECTIONS.map((section) => {
            const items = list.filter((c) => c.status === section.key);
            if (!items.length) return null;
            return (
              <View key={section.key}>
                <SectionHeader title={section.title} />
                <View style={{ gap: S.md }}>
                  {items.map((c) => (
                    <FadeIn key={c.id} index={index++}>
                      <ChallengeCard
                        challenge={c}
                        now={now}
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
        </>
      )}
    </Screen>
  );
}

function HeroStat({ label, value, accent = false }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.heroStatValue, accent && { color: C.accent }]}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

function ChallengeCard({ challenge: c, now, joining, claiming, onJoin, onClaim }) {
  const done = c.status === "complete";
  const claimed = c.status === "claimed";
  const upcoming = c.status === "upcoming";
  const timeText = upcoming ? `Starts ${dateLabel(c.startsAt)}` : claimed ? "Done" : `${countdown(c.endsAt, now)} left`;
  const pct = Math.round(c.percent * 100);

  return (
    <View style={[styles.card, done && styles.cardDone, claimed && { opacity: 0.7 }]}>
      {done ? <LinearGradient colors={["rgba(0,255,127,0.16)", "rgba(0,255,127,0)"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
      <Row style={{ justifyContent: "space-between" }}>
        <Pill label={PERIOD_LABEL[c.period] || String(c.period).toUpperCase()} tone={done ? "accent" : "neutral"} />
        <Row gap={6}>
          <CalendarClock size={13} color={C.textMute} />
          <Text style={styles.meta}>{timeText}</Text>
        </Row>
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
            <Text style={[styles.percent, (done || claimed) && { color: C.accent }]}>{pct}%</Text>
          </Row>
          <ProgressBar value={c.percent} height={10} colour={c.joined || claimed ? C.accent : "#4a4a52"} />
          {!c.joined && c.progress > 0 ? <Text style={styles.note}>Your steps already count. Join to lock it in.</Text> : null}
        </View>
      ) : null}

      <Row style={{ justifyContent: "space-between", marginTop: S.lg }}>
        <Row gap={S.sm}>
          <View style={[styles.reward, { backgroundColor: C.accentDim }]}>
            <Zap size={13} color={C.accent} fill={C.accent} />
            <Text style={styles.rewardText}>+{formatNumber(c.rewardXp)} XP</Text>
          </View>
          {c.rewardOut ? (
            <View style={[styles.reward, { backgroundColor: "rgba(255,215,0,0.1)" }]}>
              <Coins size={13} color={C.gold} />
              <Text style={[styles.rewardText, { color: C.gold }]}>+{c.rewardOut} OUT</Text>
            </View>
          ) : null}
        </Row>
        <Row gap={4}>
          <Users size={13} color={C.textMute} />
          <Text style={styles.meta}>{formatNumber(c.participants)} in</Text>
        </Row>
      </Row>

      {done ? (
        <Button title="Claim reward" icon={Gift} size="lg" onPress={onClaim} loading={claiming} full style={{ marginTop: S.lg }} />
      ) : c.status === "open" || upcoming ? (
        <Button title={upcoming ? "Join early" : "Join challenge"} variant="secondary" onPress={onJoin} loading={joining} full style={{ marginTop: S.lg }} />
      ) : claimed ? (
        <Row gap={6} style={styles.claimed}>
          <Check size={15} color={C.accent} strokeWidth={3} />
          <Text style={styles.claimedText}>Reward banked</Text>
        </Row>
      ) : (
        <Row gap={6} style={styles.joined}>
          <View style={styles.joinedDot} />
          <Text style={styles.joinedText}>Joined · {amount(c, Math.max(0, c.target - c.progress))} to go</Text>
        </Row>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: S.xl, borderRadius: R.lg, borderWidth: 1, borderColor: "rgba(0,255,127,0.28)", backgroundColor: "#0c120f", overflow: "hidden" },
  heroValue: { color: C.text, fontFamily: F.display, fontSize: 56, letterSpacing: -1.5, lineHeight: 60 },
  heroUnit: { color: C.accent, fontFamily: F.display, fontSize: 22, marginBottom: 8 },
  heroOut: { color: C.gold, fontFamily: F.displayMedium, fontSize: 15 },
  heroStats: { marginTop: S.lg, paddingTop: S.lg, borderTopWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.12)" },
  rule: { width: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.12)", marginHorizontal: S.md },
  heroStatValue: { color: C.text, fontFamily: F.display, fontSize: 20 },
  heroStatLabel: { color: C.textMute, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 },
  card: { padding: S.lg, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, overflow: "hidden" },
  cardDone: { borderColor: "rgba(0,255,127,0.45)" },
  meta: { color: C.textMute, fontSize: 12, fontWeight: "600" },
  title: { color: C.text, fontFamily: F.display, fontSize: 21, letterSpacing: -0.3, marginTop: S.md },
  desc: { color: C.textDim, fontSize: 14, lineHeight: 20, marginTop: 4 },
  progress: { color: C.text, fontFamily: F.display, fontSize: 17, flexShrink: 1 },
  target: { color: C.textMute, fontFamily: F.displayMedium, fontSize: 13 },
  percent: { color: C.textDim, fontFamily: F.display, fontSize: 15 },
  note: { color: C.textMute, fontSize: 12, marginTop: S.sm },
  reward: { flexDirection: "row", alignItems: "center", gap: 5, height: 28, paddingHorizontal: 10, borderRadius: R.full },
  rewardText: { color: C.accent, fontFamily: F.displayMedium, fontSize: 13 },
  claimed: { marginTop: S.lg, alignSelf: "flex-start", paddingHorizontal: 12, height: 32, borderRadius: R.full, backgroundColor: C.accentDim },
  claimedText: { color: C.accent, fontWeight: "700", fontSize: 13 },
  joined: { marginTop: S.lg, alignSelf: "flex-start", paddingHorizontal: 12, height: 32, borderRadius: R.full, backgroundColor: C.surfaceHigh },
  joinedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent },
  joinedText: { color: C.textDim, fontWeight: "700", fontSize: 13 },
});
