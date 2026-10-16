// One battle. The hero changes with the mode: a start line for a live race,
// sealed envelopes for a blind time trial, their ghost for a ghost race, the
// day's target for last one standing and the route for hold the route.

import React, { useEffect } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, Flag, Ghost, Lock, MapPin, Play, RotateCcw } from "lucide-react-native";
import { engine, useBattle, useEngineMutation } from "@/data/hooks";
import { AnimatedBar, Body, Button, C, Card, Divider, EmptyState, F, FadeIn, Header, LiveDot, R, Row, S, Screen, Skeleton, Title } from "@/components/ui";
import { statusPill } from "@/components/arena/BattleCard";
import { Countdown, FaceOffRow, ResultCard } from "@/components/arena/FaceOff";
import Confetti from "@/components/arena/Confetti";
import { battleFormat, battlePrize, BATTLE_PRIZES, ME, playerName, rivalColour, standingLine, useNow } from "@/components/arena/shared";
import { distanceLabel, timeLabel } from "@/constants/battleModes";
import { dateLabel, formatNumber, timeLabel as clockLabel } from "@/utils/format";

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
  const ready = useEngineMutation(engine.readyBattle, { success: (b) => (b?.phase === "live" ? "Race on" : "You're on the line") });

  const live = battle?.status === "active";
  const ended = live && battle.endAt && now >= battle.endAt;

  // Settle as soon as the clock runs out, and keep live scores moving.
  useEffect(() => {
    if (ended) refetch();
  }, [ended, refetch]);
  useEffect(() => {
    if (!live) return undefined;
    const t = setInterval(() => refetch(), battle?.phase === "lobby" ? 5000 : 30 * 1000);
    return () => clearInterval(t);
  }, [live, battle?.phase, refetch]);

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

  const opp = battle.opponent.player;
  const oppName = opp?.name || "your rival";
  const rival = rivalColour(opp);
  const prize = battle.prize || battlePrize(battle.result);
  const remaining = Math.max(0, (battle.endAt || 0) - now);
  const won = battle.status === "complete" && battle.result === "won";
  const canCancel = live && battle.isChallenger !== false && battle.phase !== "live";
  const startsIn = battle.startAt ? battle.startAt - now : null;
  const toMove = () => router.push("/(tabs)/move");
  const rematch = () => router.push(`/battles/new?opponent=${opp?.id}&mode=${battle.mode}`);

  const confirmCancel = () => {
    const go = () => cancel.mutate(battle.id);
    if (Platform.OS === "web") return go();
    Alert.alert("Call it off?", `The battle with ${oppName} ends now with no winner and no XP.`, [
      { text: "Keep going", style: "cancel" },
      { text: "Call it off", style: "destructive", onPress: go },
    ]);
  };

  const standing = live ? standingLine(battle, oppName) : battle.status === "pending" ? (battle.incoming ? `${oppName} has called you out. The clock starts when you accept.` : `Waiting on ${oppName} to accept.`) : null;
  const needsRun = live && battle.timed && !battle.myTimeIn && battle.phase === "live" && (startsIn == null || startsIn <= 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen header={<Header back title={battle.modeName || "Battle"} subtitle={`vs ${oppName}`} />} onRefresh={refetch} refreshing={isRefetching}>
        <FadeIn>
          <View style={styles.hero}>
            <Row style={{ justifyContent: "space-between" }}>
              {live ? (
                <Row gap={8}>
                  <LiveDot size={8} colour={battle.phase === "lobby" ? C.warn : C.out} />
                  <Text style={styles.liveText}>{battle.phase === "lobby" ? "AT THE START" : battle.sealed ? "SEALED" : "LIVE"}</Text>
                </Row>
              ) : (
                statusPill(battle)
              )}
              <Text style={styles.meta}>{battle.endAt ? `${live ? "Ends" : "Ended"} ${clockLabel(battle.endAt)}` : `Sent ${clockLabel(battle.createdAt)}`}</Text>
            </Row>

            {battle.phase === "lobby" ? (
              <Lobby battle={battle} oppName={oppName} onReady={() => ready.mutate(battle.id)} busy={ready.isPending} />
            ) : live && battle.mode === "live_race" && startsIn != null && startsIn > 0 ? (
              <StartCount ms={startsIn} />
            ) : live && battle.endAt ? (
              <View style={{ marginTop: S.xl }}>
                <Countdown ms={remaining} />
                <Text style={[styles.meta, { textAlign: "center", marginTop: S.sm }]}>left on the clock</Text>
              </View>
            ) : null}

            {battle.phase !== "lobby" ? (
              <View style={{ marginTop: S.xxl }}>
                {battle.mode === "blind_time_trial" && battle.sealed ? <Envelopes battle={battle} oppName={oppName} /> : <FaceOffRow battle={battle} rival={rival} onOpponent={() => router.push(`/player/${opp?.id}`)} />}
              </View>
            ) : null}
            {standing ? <Text style={[styles.standing, battle.leader === "me" && { color: C.text }]}>{standing}</Text> : null}
          </View>
        </FadeIn>

        {live && battle.mode === "ghost_race" && battle.ghostSec ? <GhostCard battle={battle} oppName={oppName} /> : null}
        {live && battle.mode === "last_one_standing" ? <StandingCard battle={battle} oppName={oppName} /> : null}
        {battle.mode === "hold_the_route" ? <RouteCard battle={battle} /> : null}

        {battle.status === "complete" ? (
          <>
            {battle.mode === "blind_time_trial" ? <Text style={styles.reveal}>Both times are in</Text> : null}
            <ResultCard battle={battle} prize={prize} rival={rival} />
            {battle.forfeit ? <Body dim size={13} style={{ textAlign: "center", marginTop: S.sm }}>{battle.result === "won" ? `${oppName} didn't post a time.` : "No time from you before the clock ran out."}</Body> : null}
          </>
        ) : null}

        {battle.status === "cancelled" ? (
          <Card style={{ marginTop: S.lg, alignItems: "center", paddingVertical: S.xl, borderWidth: 0 }}>
            <Text style={styles.cancelTitle}>Called off</Text>
            <Body dim size={14} style={{ marginTop: 4 }}>
              No winner, no XP{battle.stakeOut ? ", and your stake is back" : ""}. Run it back any time.
            </Body>
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
          {needsRun ? <Button title={battle.mode === "hold_the_route" ? "Run the route" : `Go run ${distanceLabel(battle.distanceM)}`} icon={Play} size="lg" onPress={toMove} full /> : null}
          {live && battle.mode === "hold_the_route" && battle.myTimeIn ? <Button title="Go again" icon={Play} variant="secondary" onPress={toMove} full /> : null}
          {battle.status === "complete" || battle.status === "cancelled" ? <Button title={`Rematch ${oppName}`} icon={RotateCcw} size="lg" onPress={rematch} full /> : null}
        </View>

        <Title size={20} style={{ marginTop: S.xxl + 4, marginBottom: S.sm }}>Details</Title>
        <View>
          <Info label="Format" value={battleFormat(battle)} />
          {battle.startAt ? <Info label="Started" value={`${dateLabel(battle.startAt)}, ${clockLabel(battle.startAt)}`} /> : <Info label="Sent" value={`${dateLabel(battle.createdAt)}, ${clockLabel(battle.createdAt)}`} />}
          {battle.endAt ? <Info label={live ? "Ends" : "Ended"} value={`${dateLabel(battle.endAt)}, ${clockLabel(battle.endAt)}`} /> : null}
          {battle.stakeOut ? <Info label="Stake" value={`${battle.stakeOut} OUT each`} /> : null}
          <Info label="Winner gets" value={`${BATTLE_PRIZES.win.xp} XP + ${BATTLE_PRIZES.win.out + (battle.stakeOut || 0) * 2} OUT`} />
          <Info label="Everyone else" value={`${BATTLE_PRIZES.other.xp} XP for showing up`} last />
        </View>

        {canCancel ? <Button title="Call it off" variant="danger" size="sm" icon={Flag} onPress={confirmCancel} loading={cancel.isPending} style={{ marginTop: S.lg, alignSelf: "center" }} /> : null}
      </Screen>
      {won ? <Confetti seed={battle.id} height={700} /> : null}
    </View>
  );
}

// Live race, before the start: both press ready.
function Lobby({ battle, oppName, onReady, busy }) {
  return (
    <View style={{ marginTop: S.xl }}>
      <Text style={styles.kick}>Live race · {distanceLabel(battle.distanceM)}</Text>
      <Text style={styles.big}>
        Same start,{"\n"}
        <Text style={{ color: C.accent }}>wherever you are</Text>
      </Text>
      <Row gap={S.sm} style={{ marginTop: S.lg }}>
        <ReadyLight on={battle.readyMe} label={battle.readyMe ? "You're ready" : "You"} />
        <ReadyLight on={battle.readyThem} label={battle.readyThem ? `${oppName} is ready` : oppName} />
      </Row>
      {!battle.readyMe ? <Button title="I'm ready" size="lg" full onPress={onReady} loading={busy} style={{ marginTop: S.lg }} /> : null}
      <Body dim size={12} style={{ marginTop: S.md }}>
        When you're both ready the countdown starts on both phones at the same moment. Then start your run on Move.
      </Body>
    </View>
  );
}

function ReadyLight({ on, label }) {
  return (
    <View style={[styles.readyLight, on && styles.readyOn]}>
      <View style={[styles.readyDot, on && { backgroundColor: C.accent }]}>{on ? <Check size={11} color="#fff" strokeWidth={3} /> : null}</View>
      <Text style={[styles.readyText, on && { color: C.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function StartCount({ ms }) {
  const s = Math.ceil(ms / 1000);
  return (
    <View style={{ marginTop: S.xl, alignItems: "center" }}>
      <Text style={styles.count}>{s}</Text>
      <Text style={styles.meta}>Start your run on Move when it hits zero</Text>
    </View>
  );
}

// Blind time trial: both times in sealed envelopes until both are in.
function Envelopes({ battle, oppName }) {
  return (
    <Row gap={S.sm}>
      <Envelope colour={ME} title="You" line={battle.myTimeIn ? `Done · ${timeLabel(battle.me.value)}` : "Not run yet"} foot={battle.myTimeIn ? `Hidden from ${oppName}` : `One go at ${distanceLabel(battle.distanceM)}`} />
      <Envelope colour={C.danger} title={oppName} line={battle.theirTimeIn ? "Done · sealed" : "Not run yet"} foot={battle.theirTimeIn ? "Opens when you've run" : "Must start within 12 hours"} />
    </Row>
  );
}

function Envelope({ colour, title, line, foot }) {
  return (
    <View style={[styles.envelope, { borderColor: `${colour}55` }]}>
      <View style={[styles.lock, { backgroundColor: `${colour}22` }]}>
        <Lock size={18} color={colour} />
      </View>
      <Text style={styles.envTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.envLine}>{line}</Text>
      <Text style={styles.envFoot}>{foot}</Text>
    </View>
  );
}

function GhostCard({ battle, oppName }) {
  const km = (battle.distanceM || 0) / 1000;
  const pace = km ? Math.round(battle.ghostSec / km) : null;
  return (
    <Card style={{ marginTop: S.lg, borderWidth: 0 }} padding={S.lg}>
      <Row gap={S.md}>
        <View style={styles.ghostIcon}>
          <Ghost size={20} color={C.accentHi} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{oppName}'s ghost</Text>
          <Body dim size={13}>
            {timeLabel(battle.ghostSec)} over {distanceLabel(battle.distanceM)}, {pace ? `${Math.floor(pace / 60)}'${String(pace % 60).padStart(2, "0")}" a km` : ""}. Beat it.
          </Body>
        </View>
      </Row>
    </Card>
  );
}

function StandingCard({ battle, oppName }) {
  const target = battle.target || 8000;
  const mine = battle.todaySteps?.me || 0;
  const theirs = battle.todaySteps?.them || 0;
  return (
    <Card style={{ marginTop: S.lg, borderWidth: 0 }} padding={S.lg}>
      <Row style={{ justifyContent: "space-between" }}>
        <Text style={styles.cardTitle}>Today's target</Text>
        <Text style={styles.target}>{formatNumber(target)}</Text>
      </Row>
      <Body dim size={12} style={{ marginTop: 2 }}>
        Up 1,000 every day. Miss it and you're out.
      </Body>
      <View style={{ marginTop: S.md, gap: S.sm }}>
        <TargetRow label="You" value={mine} target={target} colour={ME} />
        <TargetRow label={oppName} value={theirs} target={target} colour={C.danger} />
      </View>
    </Card>
  );
}

function TargetRow({ label, value, target, colour }) {
  return (
    <View>
      <Row style={{ justifyContent: "space-between" }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value >= target ? "Safe today" : `${formatNumber(target - value)} to go`}</Text>
      </Row>
      <AnimatedBar value={Math.min(1, value / target)} colour={colour} height={6} style={{ marginTop: 5 }} />
    </View>
  );
}

function RouteCard({ battle }) {
  return (
    <Card style={{ marginTop: S.lg, borderWidth: 0 }} padding={S.lg}>
      <Row gap={S.md}>
        <View style={styles.ghostIcon}>
          <MapPin size={20} color={C.accentHi} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{battle.routeName || `Any ${distanceLabel(battle.distanceM)} loop`}</Text>
          <Body dim size={13}>
            {distanceLabel(battle.distanceM)}. Any run that covers 95% of it is a go, and your best time counts.
          </Body>
        </View>
      </Row>
    </Card>
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
  liveText: { color: C.text, fontFamily: F.bodySemi, fontSize: 12, letterSpacing: 1 },
  meta: { color: C.textDim, fontFamily: F.body, fontSize: 13 },
  standing: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 14, textAlign: "center", marginTop: S.lg },
  cancelTitle: { color: C.text, fontFamily: F.display, fontSize: 22, marginTop: S.sm, textTransform: "uppercase" },
  kick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.8, textTransform: "uppercase" },
  big: { color: C.text, fontFamily: F.display, fontSize: 36, lineHeight: 36, textTransform: "uppercase", marginTop: 6 },
  readyLight: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, padding: S.md, borderRadius: R.md, backgroundColor: C.surfaceHigh },
  readyOn: { backgroundColor: "rgba(61,139,255,0.14)" },
  readyDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: C.borderStrong, alignItems: "center", justifyContent: "center" },
  readyText: { flex: 1, color: C.textDim, fontFamily: F.bodySemi, fontSize: 13 },
  count: { color: C.out, fontFamily: F.display, fontSize: 120, lineHeight: 120, textShadowColor: "rgba(61,139,255,0.6)", textShadowRadius: 30 },
  envelope: { flex: 1, padding: S.lg, borderRadius: R.lg, backgroundColor: "#0e1117", borderWidth: 1, minHeight: 170 },
  lock: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  envTitle: { color: C.text, fontFamily: F.display, fontSize: 24, textTransform: "uppercase", marginTop: S.md },
  envLine: { color: C.textSoft, fontFamily: F.bodySemi, fontSize: 13, marginTop: 2 },
  envFoot: { color: C.textDim, fontFamily: F.body, fontSize: 11.5, marginTop: S.sm },
  reveal: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.8, textTransform: "uppercase", textAlign: "center", marginTop: S.xl },
  ghostIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  target: { color: C.text, fontFamily: F.display, fontSize: 26 },
  rowLabel: { color: C.textSoft, fontFamily: F.bodySemi, fontSize: 13 },
  rowValue: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
});
