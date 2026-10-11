import React, { useEffect } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { Check, Clock3, Coins, Flag, RotateCcw, Swords, Trophy, X, Zap } from "lucide-react-native";
import { engine, useBattle, useEngineMutation } from "@/data/hooks";
import { Avatar, Body, Button, C, Card, EmptyState, F, Header, Label, Loading, ProgressBar, R, Row, S, Screen, Title } from "@/components/ui";
import { TugBar, statusPill } from "@/components/arena/BattleCard";
import { battlePrize, BATTLE_PRIZES, durationLabel, metricShort, metricUnit, metricValue, playerName, useNow } from "@/components/arena/shared";
import { countdown, dateLabel, formatDuration, timeLabel } from "@/utils/format";
import { hapticSuccess } from "@/services/haptics";

export default function BattleScreen() {
  const { battleId } = useLocalSearchParams();
  const id = Array.isArray(battleId) ? battleId[0] : battleId;
  const router = useRouter();
  const now = useNow(1000);
  const { data: battle, isPending, error, refetch, isRefetching } = useBattle(id);

  const respond = useEngineMutation(engine.respondToBattle, {
    onSuccess: (_, [, accept]) => {
      if (accept) hapticSuccess();
      else router.back();
    },
  });
  const cancel = useEngineMutation(engine.cancelBattle);

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
        <Loading />
      </Screen>
    );
  }

  if (error || !battle) {
    return (
      <Screen header={<Header back title="Battle" />}>
        <EmptyState icon={Swords} title="Battle not found" body="It may have been called off or declined." action="Back to the Arena" onAction={() => router.replace("/outside/arena")} />
      </Screen>
    );
  }

  const { me, opponent, metric } = battle;
  const opp = opponent.player;
  const top = Math.max(me.value, opponent.value, 1);
  const gap = Math.abs(me.value - opponent.value);
  const prize = battle.prize || battlePrize(battle.result);
  const remaining = Math.max(0, (battle.endAt || 0) - now);
  // Engine battles do not say who started them yet; assume me unless told otherwise.
  const canCancel = live && battle.isChallenger !== false;
  const rematch = () => router.push(`/battles/new?opponent=${opp?.id}`);

  const confirmCancel = () =>
    Alert.alert("Call it off?", `The battle with ${opp?.name} ends now with no winner and no XP.`, [
      { text: "Keep going", style: "cancel" },
      { text: "Call it off", style: "destructive", onPress: () => cancel.mutate(battle.id) },
    ]);

  const standing = live
    ? battle.leader === "me"
      ? `You're ahead by ${metricValue(metric, gap)}`
      : battle.leader
        ? `${opp?.name} is ahead by ${metricValue(metric, gap)}`
        : "Dead level. Get moving."
    : null;

  return (
    <Screen header={<Header back title="Battle" subtitle={`${durationLabel(battle.durationHours)} · ${metric === "distance" ? "Distance" : "Steps"}`} />} onRefresh={refetch} refreshing={isRefetching}>
      <Card padding={0} style={{ overflow: "hidden" }} highlight={battle.result === "won" || (live && battle.leader === "me")}>
        <LinearGradient colors={["rgba(0,255,127,0.14)", "rgba(0,255,127,0)"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ padding: S.xl }}>
          <Row style={{ justifyContent: "space-between" }}>
            {statusPill(battle)}
            {live ? (
              <Row gap={6}>
                <Clock3 size={14} color={C.textDim} />
                <Text style={styles.meta}>Ends {timeLabel(battle.endAt)}</Text>
              </Row>
            ) : null}
          </Row>

          {live ? (
            <View style={{ alignItems: "center", marginTop: S.xl }}>
              <Text style={styles.clock}>{remaining > 86_400_000 ? countdown(battle.endAt, now) : formatDuration(remaining / 1000)}</Text>
              <Label style={{ marginTop: 2 }}>left on the clock</Label>
            </View>
          ) : null}

          <Row style={{ marginTop: S.xl, alignItems: "flex-start" }}>
            <Fighter player={me.player} value={me.value} metric={metric} lead={battle.leader === "me" || battle.result === "won"} />
            <View style={styles.vsBubble}>
              <Text style={styles.vs}>VS</Text>
            </View>
            <Fighter
              player={opp}
              value={opponent.value}
              metric={metric}
              lead={(battle.leader && battle.leader !== "me") || battle.result === "lost"}
              onPress={() => router.push(`/player/${opp?.id}`)}
            />
          </Row>

          {battle.status !== "pending" ? <TugBar mine={me.value} theirs={opponent.value} height={10} style={{ marginTop: S.xl }} /> : null}
          {standing ? <Body dim size={14} style={{ textAlign: "center", marginTop: S.md }}>{standing}</Body> : null}
        </LinearGradient>
      </Card>

      {battle.status === "complete" ? (
        <MotiView from={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", damping: 16 }}>
          <Card style={{ marginTop: S.lg, alignItems: "center", paddingVertical: S.xl }} highlight={battle.result === "won"}>
            <Trophy size={30} color={battle.result === "won" ? C.gold : C.textMute} />
            <Title size={26} style={{ marginTop: S.sm }}>
              {battle.result === "won" ? "You won" : battle.result === "lost" ? `${opp?.name} took it` : "Honours even"}
            </Title>
            <Body dim size={14} style={{ marginTop: 4, textAlign: "center" }}>
              {metricValue(metric, me.value)} to {metricValue(metric, opponent.value)}
            </Body>
            {prize ? (
              <Row gap={S.sm} style={{ marginTop: S.lg }}>
                <Reward icon={Zap} colour={C.accent} label={`+${prize.xp} XP`} />
                {prize.out ? <Reward icon={Coins} colour={C.gold} label={`+${prize.out} OUT`} /> : null}
              </Row>
            ) : null}
          </Card>
        </MotiView>
      ) : null}

      {battle.status === "cancelled" ? (
        <Card style={{ marginTop: S.lg, alignItems: "center" }}>
          <Flag size={24} color={C.textMute} />
          <Title size={20} style={{ marginTop: S.sm }}>Called off</Title>
          <Body dim size={14} style={{ marginTop: 4 }}>No winner, no XP. Run it back any time.</Body>
        </Card>
      ) : null}

      {battle.status !== "pending" ? (
        <Card style={{ marginTop: S.lg, gap: S.lg }}>
          <Label>Progress</Label>
          <Track name="You" value={me.value} metric={metric} share={me.value / top} colour={C.accent} />
          <Track name={opp?.name} value={opponent.value} metric={metric} share={opponent.value / top} colour={C.textDim} />
        </Card>
      ) : null}

      <Card style={{ marginTop: S.lg, gap: S.md }}>
        <Info label="Format" value={`${durationLabel(battle.durationHours)} · most ${metric === "distance" ? "distance" : "steps"} wins`} />
        {battle.startAt ? <Info label="Started" value={`${dateLabel(battle.startAt)}, ${timeLabel(battle.startAt)}`} /> : <Info label="Sent" value={`${dateLabel(battle.createdAt)}, ${timeLabel(battle.createdAt)}`} />}
        {battle.endAt ? <Info label={live ? "Ends" : "Ended"} value={`${dateLabel(battle.endAt)}, ${timeLabel(battle.endAt)}`} /> : null}
        <Info label="Prize" value={`Winner ${BATTLE_PRIZES.win.xp} XP + ${BATTLE_PRIZES.win.out} OUT, otherwise ${BATTLE_PRIZES.other.xp} XP`} />
      </Card>

      <View style={{ marginTop: S.xl, gap: S.md }}>
        {battle.incoming ? (
          <Row>
            <Button title="Decline" variant="secondary" icon={X} onPress={() => respond.mutate([battle.id, false])} disabled={respond.isPending} style={{ flex: 1 }} />
            <Button title="Accept" icon={Check} onPress={() => respond.mutate([battle.id, true])} loading={respond.isPending} style={{ flex: 1 }} />
          </Row>
        ) : null}
        {battle.status === "complete" || battle.status === "cancelled" ? <Button title={`Rematch ${opp?.name}`} icon={RotateCcw} onPress={rematch} full /> : null}
        {canCancel ? <Button title="Call it off" variant="danger" icon={Flag} onPress={confirmCancel} loading={cancel.isPending} full /> : null}
      </View>
    </Screen>
  );
}

function Fighter({ player, value, metric, lead, onPress }) {
  const body = (
    <View style={{ alignItems: "center" }}>
      <Avatar uri={player?.avatar} name={player?.name || ""} size={76} ring={lead ? C.accent : C.borderStrong} />
      <Text style={styles.fighterName} numberOfLines={1}>
        {playerName(player)}
      </Text>
      <Text style={[styles.fighterValue, lead && { color: C.accent }]} numberOfLines={1} adjustsFontSizeToFit>
        {metricShort(metric, value)}
      </Text>
      <Text style={styles.fighterUnit}>{metricUnit(metric)}</Text>
    </View>
  );
  if (!onPress) return <View style={{ flex: 1 }}>{body}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.7 }]}>
      {body}
    </Pressable>
  );
}

function Track({ name, value, metric, share, colour }) {
  return (
    <View>
      <Row style={{ justifyContent: "space-between", marginBottom: S.sm }}>
        <Text style={styles.trackName}>{name}</Text>
        <Text style={styles.trackValue}>{metricValue(metric, value)}</Text>
      </Row>
      <ProgressBar value={share} colour={colour} height={8} />
    </View>
  );
}

function Info({ label, value }) {
  return (
    <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }} gap={S.lg}>
      <Body mute size={14}>{label}</Body>
      <Body size={14} style={{ flex: 1, textAlign: "right" }}>{value}</Body>
    </Row>
  );
}

function Reward({ icon: Icon, colour, label }) {
  return (
    <View style={[styles.reward, { borderColor: colour }]}>
      <Icon size={15} color={colour} />
      <Text style={[styles.rewardText, { color: colour }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  meta: { color: C.textDim, fontSize: 12, fontWeight: "600" },
  clock: { color: C.text, fontFamily: F.display, fontSize: 46, letterSpacing: -1, fontVariant: ["tabular-nums"] },
  vsBubble: { width: 40, height: 40, borderRadius: 20, marginTop: 18, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.borderStrong, alignItems: "center", justifyContent: "center" },
  vs: { color: C.textDim, fontFamily: F.display, fontSize: 13 },
  fighterName: { color: C.textDim, fontSize: 14, fontWeight: "600", marginTop: S.sm, maxWidth: "90%" },
  fighterValue: { color: C.text, fontFamily: F.display, fontSize: 34, marginTop: 2 },
  fighterUnit: { color: C.textMute, fontSize: 12, fontWeight: "600" },
  trackName: { color: C.text, fontSize: 14, fontWeight: "600" },
  trackValue: { color: C.textDim, fontFamily: F.displayMedium, fontSize: 14 },
  reward: { flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 14, borderRadius: R.full, borderWidth: 1 },
  rewardText: { fontFamily: F.display, fontSize: 15 },
});
