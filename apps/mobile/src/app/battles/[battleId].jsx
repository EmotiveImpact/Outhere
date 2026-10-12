import React, { useEffect } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Flag, RotateCcw, Swords } from "lucide-react-native";
import { engine, useBattle, useEngineMutation } from "@/data/hooks";
import { Body, Button, C, Card, Divider, EmptyState, F, FadeIn, Header, LiveDot, R, Row, S, Screen, Skeleton, Title } from "@/components/ui";
import { statusPill } from "@/components/arena/BattleCard";
import { Countdown, FaceOffRow, ResultCard } from "@/components/arena/FaceOff";
import Confetti from "@/components/arena/Confetti";
import { battlePrize, BATTLE_PRIZES, durationLabel, metricValue, playerName, rivalColour, useNow } from "@/components/arena/shared";
import { dateLabel, timeLabel } from "@/utils/format";

export default function BattleScreen() {
  const { battleId } = useLocalSearchParams();
  const id = Array.isArray(battleId) ? battleId[0] : battleId;
  const router = useRouter();
  const now = useNow(1000);
  const { data: battle, isPending, error, refetch, isRefetching } = useBattle(id);

  const respond = useEngineMutation(engine.respondToBattle, {
    success: (b) => (b?.status === "active" ? `Game on vs ${playerName(b.opponent?.player)}` : "Invite declined"),
    onSuccess: (_, [, accept]) => {
      if (!accept) router.back();
    },
  });
  const cancel = useEngineMutation(engine.cancelBattle, { success: "Battle called off" });

  const live = battle?.status === "active";
  const ended = live && battle.endAt && now >= battle.endAt;

  // Settle as soon as the clock runs out, and keep live scores moving.
  useEffect(() => {
    if (ended) refetch();
  }, [ended, refetch]);
  useEffect(() => {
    if (!live) return undefined;
    const t = setInterval(() => refetch(), 30 * 1000);
    return () => clearInterval(t);
  }, [live, refetch]);

  if (isPending) {
    return (
      <Screen header={<Header back title="Battle" />}>
        <Skeleton height={420} radius={20} />
        <Skeleton height={150} radius={20} style={{ marginTop: S.lg }} />
      </Screen>
    );
  }

  if (error || !battle) {
    return (
      <Screen header={<Header back title="Battle" />}>
        <EmptyState title="Battle not found" body="It may have been called off or declined." action="Back to the Arena" onAction={() => router.replace("/outside/arena")} />
      </Screen>
    );
  }

  const { me, opponent, metric } = battle;
  const opp = opponent.player;
  const rival = rivalColour(opp);
  const gap = Math.abs(me.value - opponent.value);
  const prize = battle.prize || battlePrize(battle.result);
  const remaining = Math.max(0, (battle.endAt || 0) - now);
  const won = battle.status === "complete" && battle.result === "won";
  const canCancel = live && battle.isChallenger !== false;
  const rematch = () => router.push(`/battles/new?opponent=${opp?.id}`);

  const confirmCancel = () =>
    Alert.alert("Call it off?", `The battle with ${opp?.name} ends now with no winner and no XP.`, [
      { text: "Keep going", style: "cancel" },
      { text: "Call it off", style: "destructive", onPress: () => cancel.mutate(battle.id) },
    ]);

  const iLead = battle.leader === "me";
  const standing = live
    ? iLead
      ? `You're ahead by ${metricValue(metric, gap)}`
      : battle.leader
        ? `${opp?.name} is ahead by ${metricValue(metric, gap)}`
        : "Dead level. Get moving."
    : battle.status === "pending"
      ? battle.incoming
        ? `${opp?.name} has called you out. Clock starts when you accept.`
        : `Waiting on ${opp?.name} to accept.`
      : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen
        header={<Header back title="Battle" subtitle={`${durationLabel(battle.durationHours)} · ${metric === "distance" ? "Distance" : "Steps"}`} />}
        onRefresh={refetch}
        refreshing={isRefetching}
      >
        <FadeIn>
          <View style={styles.hero}>
            <Row style={{ justifyContent: "space-between" }}>
              {live ? (
                <Row gap={8}>
                  <LiveDot size={8} />
                  <Text style={styles.liveText}>LIVE</Text>
                </Row>
              ) : (
                statusPill(battle)
              )}
              {battle.endAt ? (
                <Text style={styles.meta}>
                  {live ? "Ends" : "Ended"} {timeLabel(battle.endAt)}
                </Text>
              ) : (
                <Text style={styles.meta}>Sent {timeLabel(battle.createdAt)}</Text>
              )}
            </Row>

            {live ? (
              <View style={{ marginTop: S.xl }}>
                <Countdown ms={remaining} />
                <Text style={[styles.meta, { textAlign: "center", marginTop: S.sm }]}>left on the clock</Text>
              </View>
            ) : null}

            <View style={{ marginTop: S.xxl }}>
              <FaceOffRow battle={battle} rival={rival} onOpponent={() => router.push(`/player/${opp?.id}`)} />
            </View>
            {standing ? <Text style={[styles.standing, live && iLead && { color: C.text }]}>{standing}</Text> : null}
          </View>
        </FadeIn>

        {battle.status === "complete" ? <ResultCard battle={battle} prize={prize} rival={rival} /> : null}

        {battle.status === "cancelled" ? (
          <Card style={{ marginTop: S.lg, alignItems: "center", paddingVertical: S.xl, borderWidth: 0 }}>
            <Text style={styles.cancelTitle}>Called off</Text>
            <Body dim size={14} style={{ marginTop: 4 }}>No winner, no XP. Run it back any time.</Body>
          </Card>
        ) : null}

        <View style={{ marginTop: S.xl, gap: S.md }}>
          {battle.incoming ? (
            <Row>
              <View style={{ flex: 1 }}>
                <Button title="Decline" variant="secondary" onPress={() => respond.mutate([battle.id, false])} disabled={respond.isPending} full />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Accept" onPress={() => respond.mutate([battle.id, true])} loading={respond.isPending} full />
              </View>
            </Row>
          ) : null}
          {battle.status === "complete" || battle.status === "cancelled" ? <Button title={`Rematch ${opp?.name}`} icon={RotateCcw} size="lg" onPress={rematch} full /> : null}
        </View>

        <Title size={20} style={{ marginTop: S.xxl + 4, marginBottom: S.sm }}>Details</Title>
        <View>
          <Info label="Format" value={`${durationLabel(battle.durationHours)} · most ${metric === "distance" ? "distance" : "steps"} wins`} />
          {battle.startAt ? <Info label="Started" value={`${dateLabel(battle.startAt)}, ${timeLabel(battle.startAt)}`} /> : <Info label="Sent" value={`${dateLabel(battle.createdAt)}, ${timeLabel(battle.createdAt)}`} />}
          {battle.endAt ? <Info label={live ? "Ends" : "Ended"} value={`${dateLabel(battle.endAt)}, ${timeLabel(battle.endAt)}`} /> : null}
          <Info label="Winner gets" value={`${BATTLE_PRIZES.win.xp} XP + ${BATTLE_PRIZES.win.out} OUT`} />
          <Info label="Everyone else" value={`${BATTLE_PRIZES.other.xp} XP for showing up`} last />
        </View>

        {canCancel ? (
          <Button title="Call it off" variant="danger" size="sm" icon={Flag} onPress={confirmCancel} loading={cancel.isPending} style={{ marginTop: S.lg, alignSelf: "center" }} />
        ) : null}
      </Screen>
      {won ? <Confetti seed={battle.id} height={700} /> : null}
    </View>
  );
}

function Info({ label, value, last = false }) {
  return (
    <>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start", paddingVertical: S.md }} gap={S.lg}>
        <Body dim size={15}>{label}</Body>
        <Body size={15} style={{ flex: 1, textAlign: "right" }}>{value}</Body>
      </Row>
      {last ? null : <Divider />}
    </>
  );
}

const styles = StyleSheet.create({
  hero: { padding: S.xl, borderRadius: R.lg, backgroundColor: C.surface },
  liveText: { color: C.text, fontSize: 12, fontWeight: "600", letterSpacing: 1 },
  meta: { color: C.textDim, fontSize: 13 },
  standing: { color: C.textDim, fontSize: 15, fontWeight: "600", textAlign: "center", marginTop: S.lg },
  cancelTitle: { color: C.text, fontFamily: F.display, fontSize: 22, marginTop: S.sm },
});
