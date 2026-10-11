// Compact versus card used in the Arena battle lists.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Check, X } from "lucide-react-native";
import { Avatar, Button, C, Card, F, Pill, Row, S } from "@/components/ui";
import { countdown, timeAgo } from "@/utils/format";
import { durationLabel, metricShort, metricUnit, playerName } from "./shared";

export function statusPill(battle) {
  if (battle.status === "active") return <Pill label="LIVE" tone="accent" />;
  if (battle.status === "pending") return <Pill label={battle.incoming ? "INVITE" : "WAITING"} tone="warn" />;
  if (battle.status === "cancelled") return <Pill label="CANCELLED" tone="neutral" />;
  if (battle.status === "declined") return <Pill label="DECLINED" tone="neutral" />;
  if (battle.result === "won") return <Pill label="WON" tone="accent" />;
  if (battle.result === "lost") return <Pill label="LOST" tone="danger" />;
  return <Pill label="DRAW" tone="neutral" />;
}

/** Two-sided bar: my share of the combined total in green. */
export function TugBar({ mine = 0, theirs = 0, height = 6, style }) {
  const total = mine + theirs;
  const share = total > 0 ? mine / total : 0.5;
  return (
    <View style={[{ height, borderRadius: height, flexDirection: "row", overflow: "hidden", backgroundColor: C.surfaceHigh, gap: 2 }, style]}>
      <View style={{ flex: Math.max(share, 0.02), backgroundColor: C.accent }} />
      <View style={{ flex: Math.max(1 - share, 0.02), backgroundColor: C.borderStrong }} />
    </View>
  );
}

export default function BattleCard({ battle, now = Date.now(), onAccept, onDecline, busy = false, style }) {
  const router = useRouter();
  const { me, opponent, metric, status } = battle;
  const live = status === "active";
  const leading = live && battle.leader === "me";
  const timeText = live
    ? `${countdown(battle.endAt, now)} left`
    : status === "pending"
      ? `${durationLabel(battle.durationHours)} battle`
      : timeAgo(battle.endAt || battle.createdAt);

  return (
    <Card onPress={() => router.push(`/battles/${battle.id}`)} highlight={leading} style={style}>
      <Row style={{ justifyContent: "space-between" }}>
        {statusPill(battle)}
        <Text style={styles.meta}>{timeText}</Text>
      </Row>

      <Row style={{ marginTop: S.lg, justifyContent: "space-between" }}>
        <Side player={me.player} value={me.value} metric={metric} lead={battle.leader === "me" || battle.result === "won"} />
        <Text style={styles.vs}>VS</Text>
        <Side
          player={opponent.player}
          value={opponent.value}
          metric={metric}
          lead={(battle.leader && battle.leader !== "me") || battle.result === "lost"}
          right
        />
      </Row>

      {status !== "pending" ? <TugBar mine={me.value} theirs={opponent.value} style={{ marginTop: S.lg }} /> : null}

      {battle.incoming ? (
        <Row style={{ marginTop: S.lg }}>
          <Button title="Decline" variant="secondary" size="sm" icon={X} onPress={onDecline} disabled={busy} style={{ flex: 1 }} />
          <Button title="Accept" size="sm" icon={Check} onPress={onAccept} loading={busy} style={{ flex: 1 }} />
        </Row>
      ) : null}
    </Card>
  );
}

function Side({ player, value, metric, lead, right = false }) {
  return (
    <Row gap={S.sm} style={[{ flex: 1 }, right && { flexDirection: "row-reverse" }]}>
      <Avatar uri={player?.avatar} name={player?.name || ""} size={38} ring={lead ? C.accent : undefined} />
      <View style={{ flex: 1, alignItems: right ? "flex-end" : "flex-start" }}>
        <Text style={styles.name} numberOfLines={1}>
          {playerName(player)}
        </Text>
        <Text style={[styles.value, lead && { color: C.accent }]} numberOfLines={1}>
          {metricShort(metric, value)}
          <Text style={styles.unit}> {metricUnit(metric)}</Text>
        </Text>
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  meta: { color: C.textDim, fontSize: 12, fontWeight: "600" },
  vs: { color: C.textMute, fontFamily: F.display, fontSize: 13, marginHorizontal: S.sm },
  name: { color: C.textDim, fontSize: 13, fontWeight: "600" },
  value: { color: C.text, fontFamily: F.display, fontSize: 20, marginTop: 1 },
  unit: { color: C.textMute, fontFamily: F.displayMedium, fontSize: 12 },
});
