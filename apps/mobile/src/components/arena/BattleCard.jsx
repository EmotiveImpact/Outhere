// Versus cards used in the Arena battle lists: invites face the two players
// off across a VS badge, live battles show who is winning the tug of war.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { C, F, GlowButton, LiveDot, Pill, R, Row, S, Surface, TugBar as KitTugBar } from "@/components/ui";
import { countdown, timeAgo } from "@/utils/format";
import { battleFormat, formatScore, ME, playerName, rivalColour, standingLine } from "./shared";
import { PortraitMini } from "./BattleKit";

/**
 * The 1v1 tug of war, on the finish kit's TugBar (blue from the left, red
 * from the right, a white spark where they meet). Takes the two scores.
 */
export function TugBar({ mine = 0, theirs = 0, height = 8, style }) {
  const total = (mine || 0) + (theirs || 0);
  return <KitTugBar share={total > 0 ? mine / total : 0.5} height={height} style={style} />;
}

export function statusPill(battle) {
  if (battle.status === "active") return <Pill label="LIVE" tone="accent" />;
  if (battle.status === "pending") return <Pill label={battle.incoming ? "INVITE" : "WAITING"} tone="neutral" />;
  if (battle.status === "cancelled") return <Pill label="CALLED OFF" tone="neutral" />;
  if (battle.status === "declined") return <Pill label="DECLINED" tone="neutral" />;
  if (battle.result === "won") return <Pill label="WON" tone="neutral" style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />;
  if (battle.result === "lost") return <Pill label="LOST" tone="neutral" />;
  return <Pill label="DRAW" tone="neutral" />;
}

/** Round VS badge that sits between two fighters: a gunmetal coin (.oh-score .vs). */
export function VsBadge({ size = 40, style }) {
  return (
    <View style={[styles.vsBadge, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <LinearGradient colors={["#3a414c", "#1c2027"]} style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]} />
      <Text style={[styles.vsText, { fontSize: size * 0.34 }]}>VS</Text>
    </View>
  );
}

export const metricName = (metric) => (metric === "distance" ? "Distance" : "Steps");

export default function BattleCard({ battle, now = Date.now(), onAccept, onDecline, busy = false, primary = true, style }) {
  const router = useRouter();
  const open = () => router.push(`/battles/${battle.id}`);
  if (battle.status === "pending") return <InviteCard battle={battle} onPress={open} onAccept={onAccept} onDecline={onDecline} busy={busy} primary={primary} style={style} />;
  return <LiveCard battle={battle} now={now} onPress={open} style={style} />;
}

function InviteCard({ battle, onPress, onAccept, onDecline, busy, primary, style }) {
  const { me, opponent } = battle;
  const rival = rivalColour(opponent.player);
  return (
    <Surface onPress={onPress} padding={S.lg} style={style}>
      <Row style={{ justifyContent: "space-between" }}>
        {statusPill(battle)}
        <Text style={styles.meta}>{battleFormat(battle)}</Text>
      </Row>

      <Row style={{ marginTop: S.lg, alignItems: "flex-start" }}>
        <Face player={me.player} colour={ME} />
        <VsBadge size={44} style={{ marginTop: 12 }} />
        <Face player={opponent.player} colour={rival} />
      </Row>

      <Text style={styles.inviteLine}>
        {battle.incoming
          ? `${playerName(opponent.player)} wants a battle: ${battleFormat(battle).toLowerCase()}.`
          : `Waiting on ${playerName(opponent.player)} to accept.`}
      </Text>

      {battle.incoming ? (
        <Row gap={S.sm} style={{ marginTop: S.lg }}>
          <GlowButton title="Decline" variant="quiet" onPress={onDecline} disabled={busy} style={{ flex: 1 }} />
          <GlowButton title="Accept" variant={primary ? "primary" : "quiet"} onPress={onAccept} loading={busy} style={{ flex: 1 }} />
        </Row>
      ) : null}
    </Surface>
  );
}

function Face({ player, colour }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <PortraitMini source={player?.avatar} name={player?.isMe ? "You" : player?.name} side={colour === ME ? "left" : "right"} width={64} height={64} radius={20} />
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
  const standing = live ? standingLine(battle, playerName(opponent.player)) : battleFormat(battle);

  return (
    <Surface onPress={onPress} padding={S.lg} style={style}>
      <Row style={{ justifyContent: "space-between" }}>
        {live ? (
          <Row gap={8}>
            <LiveDot size={7} />
            <Text style={styles.liveText}>LIVE</Text>
          </Row>
        ) : (
          statusPill(battle)
        )}
        <Text style={styles.meta}>{live ? (battle.endAt ? `${countdown(battle.endAt, now)} left` : "At the start line") : timeAgo(battle.endAt || battle.createdAt)}</Text>
      </Row>

      <Row style={{ marginTop: S.lg }}>
        <Side player={me.player} value={me.value} metric={metric} lead={iLead} colour={ME} />
        <VsBadge size={32} />
        <Side player={opponent.player} value={battle.sealed ? null : opponent.value} metric={metric} lead={theyLead} colour={rival} right />
      </Row>

      {battle.sealed || battle.phase === "lobby" ? null : (
        <TugBar mine={metric === "time" ? opponent.value || 0 : me.value || 0} theirs={metric === "time" ? me.value || 0 : opponent.value || 0} height={8} style={{ marginTop: S.lg }} />
      )}
      <Text style={[styles.standing, iLead && { color: C.text }]}>{standing}</Text>
    </Surface>
  );
}

function Side({ player, value, metric, lead, colour, right = false }) {
  return (
    <Row gap={S.sm + 2} style={[{ flex: 1 }, right && { flexDirection: "row-reverse" }]}>
      <PortraitMini source={player?.avatar} name={player?.isMe ? "You" : player?.name} side={colour === ME ? "left" : "right"} width={42} height={42} radius={13} />
      <View style={{ flex: 1, alignItems: right ? "flex-end" : "flex-start" }}>
        <Text style={styles.name} numberOfLines={1}>
          {playerName(player)}
        </Text>
        <Text style={[styles.value, lead && { color: C.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {formatScore(metric, value)}
        </Text>
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  meta: { color: C.textDim, fontSize: 13 },
  liveText: { color: C.text, fontSize: 11, fontWeight: "600", letterSpacing: 1 },
  vsBadge: { alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(255,255,255,0.06), 0 6px 14px -6px rgba(0,0,0,0.8)" },
  vsText: { color: "#c9d0db", fontFamily: F.display, letterSpacing: 0.5 },
  faceName: { color: C.text, fontFamily: F.displayMedium, fontSize: 16, marginTop: S.sm, maxWidth: "92%" },
  faceSub: { color: C.textMute, fontSize: 12, marginTop: 1 },
  inviteLine: { color: C.textDim, fontSize: 14, textAlign: "center", marginTop: S.lg },
  name: { color: C.textDim, fontSize: 13, fontWeight: "600" },
  value: { color: C.textDim, fontFamily: F.display, fontSize: 24, letterSpacing: -0.5, marginTop: 1 },
  standing: { color: C.textDim, fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: S.sm },
});
