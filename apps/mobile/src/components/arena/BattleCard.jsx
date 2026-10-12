// Versus cards used in the Arena battle lists: invites face the two players
// off across a VS badge, live battles show who is winning the tug of war.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Clock3, X } from "lucide-react-native";
import { Avatar, Button, C, F, LiveDot, Pill, PressableScale, R, Row, S } from "@/components/ui";
import { countdown, timeAgo } from "@/utils/format";
import { durationLabel, formatScore, metricUnit, playerName, rivalColour } from "./shared";
import { TugBar } from "./TugBar";

export { TugBar };

export function statusPill(battle) {
  if (battle.status === "active") return <Pill label="LIVE" tone="accent" />;
  if (battle.status === "pending") return <Pill label={battle.incoming ? "INVITE" : "WAITING"} tone="warn" />;
  if (battle.status === "cancelled") return <Pill label="CALLED OFF" tone="neutral" />;
  if (battle.status === "declined") return <Pill label="DECLINED" tone="neutral" />;
  if (battle.result === "won") return <Pill label="WON" tone="accent" />;
  if (battle.result === "lost") return <Pill label="LOST" tone="danger" />;
  return <Pill label="DRAW" tone="neutral" />;
}

/** Round VS badge that sits between two fighters. */
export function VsBadge({ size = 40, style }) {
  return (
    <View style={[styles.vsBadge, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Text style={[styles.vsText, { fontSize: size * 0.34 }]}>VS</Text>
    </View>
  );
}

export const metricName = (metric) => (metric === "distance" ? "Distance" : "Steps");

export default function BattleCard({ battle, now = Date.now(), onAccept, onDecline, busy = false, style }) {
  const router = useRouter();
  const open = () => router.push(`/battles/${battle.id}`);
  if (battle.status === "pending") return <InviteCard battle={battle} onPress={open} onAccept={onAccept} onDecline={onDecline} busy={busy} style={style} />;
  return <LiveCard battle={battle} now={now} onPress={open} style={style} />;
}

function InviteCard({ battle, onPress, onAccept, onDecline, busy, style }) {
  const { me, opponent, metric } = battle;
  const rival = rivalColour(opponent.player);
  return (
    <PressableScale onPress={onPress} scaleTo={0.985} style={[styles.card, style]}>
      <LinearGradient
        colors={["rgba(0,255,127,0.10)", "rgba(20,20,22,0)", `${rival}22`]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <Row style={{ justifyContent: "space-between" }}>
        {statusPill(battle)}
        <Row gap={6}>
          <Clock3 size={13} color={C.textDim} />
          <Text style={styles.meta}>
            {durationLabel(battle.durationHours)} · {metricName(metric)}
          </Text>
        </Row>
      </Row>

      <Row style={{ marginTop: S.lg, alignItems: "flex-start" }}>
        <Face player={me.player} colour={C.accent} />
        <VsBadge size={44} style={{ marginTop: 12 }} />
        <Face player={opponent.player} colour={rival} />
      </Row>

      <Text style={styles.inviteLine}>
        {battle.incoming
          ? `${playerName(opponent.player)} wants a ${durationLabel(battle.durationHours)} ${metric === "distance" ? "distance" : "step"} battle.`
          : `Waiting on ${playerName(opponent.player)} to accept.`}
      </Text>

      {battle.incoming ? (
        <Row style={{ marginTop: S.lg }}>
          <View style={{ flex: 1 }}>
            <Button title="Decline" variant="secondary" icon={X} onPress={onDecline} disabled={busy} full />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Accept" icon={Check} onPress={onAccept} loading={busy} full />
          </View>
        </Row>
      ) : null}
    </PressableScale>
  );
}

function Face({ player, colour }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Avatar uri={player?.avatar} name={player?.name || ""} colour={player?.isMe ? C.accent : colour} size={64} ring={colour} />
      <Text style={styles.faceName} numberOfLines={1}>
        {playerName(player)}
      </Text>
      {player?.area ? (
        <Text style={styles.faceSub} numberOfLines={1}>
          {player.area}
        </Text>
      ) : null}
    </View>
  );
}

function LiveCard({ battle, now, onPress, style }) {
  const { me, opponent, metric, status } = battle;
  const live = status === "active";
  const rival = rivalColour(opponent.player);
  const iLead = battle.leader === "me" || battle.result === "won";
  const theyLead = (battle.leader && battle.leader !== "me") || battle.result === "lost";
  const gap = Math.abs(me.value - opponent.value);
  const standing = iLead
    ? `You lead by ${formatScore(metric, gap)} ${metricUnit(metric)}`
    : theyLead
      ? `${playerName(opponent.player)} leads by ${formatScore(metric, gap)} ${metricUnit(metric)}`
      : "Dead level. First to move takes it.";

  return (
    <PressableScale onPress={onPress} scaleTo={0.985} style={[styles.card, iLead && live && styles.cardLead, style]}>
      {iLead && live ? (
        <LinearGradient colors={["rgba(0,255,127,0.10)", "rgba(0,255,127,0)"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      ) : null}
      <Row style={{ justifyContent: "space-between" }}>
        {live ? (
          <Row gap={8}>
            <LiveDot size={7} />
            <Text style={styles.liveText}>LIVE</Text>
          </Row>
        ) : (
          statusPill(battle)
        )}
        <Text style={styles.meta}>{live ? `${countdown(battle.endAt, now)} left` : timeAgo(battle.endAt || battle.createdAt)}</Text>
      </Row>

      <Row style={{ marginTop: S.lg }}>
        <Side player={me.player} value={me.value} metric={metric} lead={iLead} colour={C.accent} />
        <VsBadge size={32} />
        <Side player={opponent.player} value={opponent.value} metric={metric} lead={theyLead} colour={rival} right />
      </Row>

      <TugBar mine={me.value} theirs={opponent.value} rival={rival} height={8} style={{ marginTop: S.lg }} />
      <Text style={[styles.standing, iLead && { color: C.accent }]}>{standing}</Text>
    </PressableScale>
  );
}

function Side({ player, value, metric, lead, colour, right = false }) {
  return (
    <Row gap={S.sm + 2} style={[{ flex: 1 }, right && { flexDirection: "row-reverse" }]}>
      <Avatar uri={player?.avatar} name={player?.name || ""} colour={colour} size={42} ring={lead ? colour : undefined} />
      <View style={{ flex: 1, alignItems: right ? "flex-end" : "flex-start" }}>
        <Text style={styles.name} numberOfLines={1}>
          {playerName(player)}
        </Text>
        <Text style={[styles.value, lead && { color: colour === C.accent ? C.accent : C.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {formatScore(metric, value)}
        </Text>
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg, overflow: "hidden" },
  cardLead: { borderColor: "rgba(0,255,127,0.35)" },
  meta: { color: C.textDim, fontSize: 12, fontWeight: "600" },
  liveText: { color: C.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  vsBadge: { alignItems: "center", justifyContent: "center", backgroundColor: C.bg, borderWidth: 1, borderColor: C.borderStrong },
  vsText: { color: C.text, fontFamily: F.display, letterSpacing: 0.5 },
  faceName: { color: C.text, fontFamily: F.displayMedium, fontSize: 16, marginTop: S.sm, maxWidth: "92%" },
  faceSub: { color: C.textMute, fontSize: 12, marginTop: 1 },
  inviteLine: { color: C.textDim, fontSize: 14, textAlign: "center", marginTop: S.lg },
  name: { color: C.textDim, fontSize: 13, fontWeight: "600" },
  value: { color: C.textDim, fontFamily: F.display, fontSize: 24, letterSpacing: -0.5, marginTop: 1 },
  standing: { color: C.textDim, fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: S.sm },
});
