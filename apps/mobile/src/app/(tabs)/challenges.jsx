import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { CalendarClock, Check, Coins, Gift, Target, Users, Zap } from "lucide-react-native";
import { engine, useChallenges, useEngineMutation } from "@/data/hooks";
import { Body, Button, C, Card, EmptyState, F, Header, Loading, Pill, ProgressBar, R, Row, S, Screen, SectionHeader, StatTile, Title } from "@/components/ui";
import { countdown, dateLabel, formatKm, formatNumber } from "@/utils/format";
import { useNow } from "@/components/arena/shared";
import { hapticSuccess } from "@/services/haptics";

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

  const join = useEngineMutation(engine.joinChallenge, { onSuccess: () => hapticSuccess() });
  const claim = useEngineMutation(engine.claimChallenge, {
    onSuccess: (reward) => {
      hapticSuccess();
      Alert.alert("Reward claimed", `+${reward?.xp ?? 0} XP${reward?.out ? ` and +${reward.out} OUT` : ""} added to your balance.`);
    },
  });

  const list = data || [];
  const ready = list.filter((c) => c.status === "complete");
  const joined = list.filter((c) => c.status === "joined" || c.status === "complete").length;
  const upForGrabs = list.filter((c) => c.status !== "claimed").reduce((sum, c) => sum + c.rewardXp, 0);

  return (
    <Screen
      tab
      header={<Header back title="Challenges" subtitle="Hit the target, bank the reward" />}
      onRefresh={refetch}
      refreshing={isRefetching}
    >
      {isPending ? (
        <Loading />
      ) : !list.length ? (
        <EmptyState icon={Target} title="No challenges right now" body="New ones land every day and every week." action="Go to the Arena" onAction={() => router.push("/outside/arena")} />
      ) : (
        <>
          <Row gap={S.sm}>
            <StatTile label="Joined" value={`${joined}/${list.length}`} />
            <StatTile label="To claim" value={ready.length} accent={ready.length > 0} />
            <StatTile label="Up for grabs" value={`${formatNumber(upForGrabs)}`} hint="XP" />
          </Row>

          {SECTIONS.map((section) => {
            const items = list.filter((c) => c.status === section.key);
            if (!items.length) return null;
            return (
              <View key={section.key}>
                <SectionHeader title={section.title} />
                <View style={{ gap: S.md }}>
                  {items.map((c) => (
                    <ChallengeCard
                      key={c.id}
                      challenge={c}
                      now={now}
                      joining={join.isPending && join.variables === c.id}
                      claiming={claim.isPending && claim.variables === c.id}
                      onJoin={() => join.mutate(c.id)}
                      onClaim={() => claim.mutate(c.id)}
                    />
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

function ChallengeCard({ challenge: c, now, joining, claiming, onJoin, onClaim }) {
  const done = c.status === "complete";
  const claimed = c.status === "claimed";
  const upcoming = c.status === "upcoming";
  const timeText = upcoming ? `Starts ${dateLabel(c.startsAt)}` : claimed ? "Done" : `${countdown(c.endsAt, now)} left`;

  return (
    <Card highlight={done}>
      <Row style={{ justifyContent: "space-between" }}>
        <Pill label={PERIOD_LABEL[c.period] || c.period.toUpperCase()} tone={done ? "accent" : "neutral"} />
        <Row gap={6}>
          <CalendarClock size={13} color={C.textMute} />
          <Text style={styles.meta}>{timeText}</Text>
        </Row>
      </Row>

      <Title size={21} style={{ marginTop: S.md }}>{c.title}</Title>
      <Body dim size={14} style={{ marginTop: 4 }}>{c.description}</Body>

      {!upcoming ? (
        <View style={{ marginTop: S.lg }}>
          <Row style={{ justifyContent: "space-between", marginBottom: S.sm }}>
            <Text style={styles.progress}>
              {amount(c, c.progress)}
              <Text style={styles.target}> / {amount(c, c.target)}</Text>
            </Text>
            <Text style={[styles.percent, done || claimed ? { color: C.accent } : null]}>{Math.round(c.percent * 100)}%</Text>
          </Row>
          <ProgressBar value={c.percent} colour={c.joined || claimed ? C.accent : C.borderStrong} />
          {!c.joined && c.progress > 0 ? <Body mute size={12} style={{ marginTop: S.sm }}>Your steps already count. Join to lock it in.</Body> : null}
        </View>
      ) : null}

      <Row style={{ justifyContent: "space-between", marginTop: S.lg }}>
        <Row gap={S.md}>
          <Row gap={4}>
            <Zap size={14} color={C.accent} fill={C.accent} />
            <Text style={styles.reward}>+{c.rewardXp} XP</Text>
          </Row>
          {c.rewardOut ? (
            <Row gap={4}>
              <Coins size={14} color={C.gold} />
              <Text style={[styles.reward, { color: C.gold }]}>+{c.rewardOut} OUT</Text>
            </Row>
          ) : null}
        </Row>
        <Row gap={4}>
          <Users size={13} color={C.textMute} />
          <Text style={styles.meta}>{formatNumber(c.participants)} in</Text>
        </Row>
      </Row>

      {done ? (
        <Button title="Claim reward" icon={Gift} onPress={onClaim} loading={claiming} full style={{ marginTop: S.lg }} />
      ) : c.status === "open" || upcoming ? (
        <Button title={upcoming ? "Join early" : "Join challenge"} variant="secondary" onPress={onJoin} loading={joining} full style={{ marginTop: S.lg }} />
      ) : claimed ? (
        <Row gap={6} style={styles.claimed}>
          <Check size={15} color={C.accent} />
          <Text style={{ color: C.accent, fontWeight: "700", fontSize: 13 }}>Reward banked</Text>
        </Row>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  meta: { color: C.textMute, fontSize: 12, fontWeight: "600" },
  progress: { color: C.text, fontFamily: F.display, fontSize: 17 },
  target: { color: C.textMute, fontFamily: F.displayMedium, fontSize: 13 },
  percent: { color: C.textDim, fontFamily: F.displayMedium, fontSize: 14 },
  reward: { color: C.accent, fontFamily: F.displayMedium, fontSize: 14 },
  claimed: { marginTop: S.lg, alignSelf: "flex-start", paddingHorizontal: 12, height: 30, borderRadius: R.full, backgroundColor: C.accentDim },
});
