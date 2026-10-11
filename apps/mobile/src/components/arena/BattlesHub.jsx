// Battles block on the Arena: start a battle, invites, live battles, results.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { History, Swords } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { engine, useBattleLimits, useBattles, useEngineMutation } from "@/data/hooks";
import { Avatar, Body, Button, C, Card, F, ListRow, Loading, R, Row, S, SectionHeader, Title } from "@/components/ui";
import { formatNumber, timeAgo } from "@/utils/format";
import BattleCard, { statusPill } from "./BattleCard";
import { metricUnit, useNow } from "./shared";

const formatScore = (metric, v) => (metric === "distance" ? Number(v || 0).toFixed(1) : formatNumber(v));

export const limitsText = (limits) => {
  if (!limits) return "";
  const live = `${limits.active} of ${limits.maxActive} live`;
  if (!Number.isFinite(limits.battlesPerWeek)) return `Unlimited battles · ${live}`;
  return `${limits.createdThisWeek} of ${limits.battlesPerWeek} started this week · ${live}`;
};

export default function BattlesHub() {
  const router = useRouter();
  const now = useNow(1000);
  const { data: battles, isPending } = useBattles();
  const { data: limits } = useBattleLimits();
  const respond = useEngineMutation(engine.respondToBattle);

  const list = battles || [];
  const invites = list.filter((b) => b.status === "pending");
  const live = list.filter((b) => b.status === "active");
  const recent = list
    .filter((b) => b.status === "complete" || b.status === "cancelled")
    .sort((a, b) => (b.endAt || b.createdAt) - (a.endAt || a.createdAt))
    .slice(0, 5);
  const record = list.filter((b) => b.status === "complete").reduce(
    (acc, b) => ({ ...acc, [b.result]: (acc[b.result] || 0) + 1 }),
    { won: 0, lost: 0, draw: 0 }
  );
  const busyId = respond.isPending ? (Array.isArray(respond.variables) ? respond.variables[0] : null) : null;

  return (
    <View>
      <Card padding={0} style={{ overflow: "hidden", marginTop: S.xl }}>
        <LinearGradient colors={["rgba(0,255,127,0.16)", "rgba(0,255,127,0)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Title size={24}>Battle anyone</Title>
              <Body dim size={14} style={{ marginTop: 4 }}>
                Pick a rival, set the clock, most steps wins 150 XP and 15 OUT.
              </Body>
            </View>
            <View style={styles.heroIcon}>
              <Swords size={22} color={C.accent} />
            </View>
          </Row>
          <Row gap={S.lg} style={{ marginTop: S.lg }}>
            <Stat label="Won" value={record.won} accent />
            <Stat label="Lost" value={record.lost} />
            <Stat label="Drawn" value={record.draw} />
          </Row>
          <Button title="Start a battle" icon={Swords} onPress={() => router.push("/battles/new")} style={{ marginTop: S.lg }} full />
          {limits ? <Text style={styles.limits}>{limitsText(limits)}</Text> : null}
        </LinearGradient>
      </Card>

      {isPending ? <Loading /> : null}

      {invites.length ? (
        <>
          <SectionHeader title={`Invites (${invites.length})`} />
          <View style={{ gap: S.md }}>
            {invites.map((b) => (
              <BattleCard
                key={b.id}
                battle={b}
                now={now}
                busy={busyId === b.id}
                onAccept={() => respond.mutate([b.id, true])}
                onDecline={() => respond.mutate([b.id, false])}
              />
            ))}
          </View>
        </>
      ) : null}

      {live.length ? (
        <>
          <SectionHeader title="Live battles" />
          <View style={{ gap: S.md }}>
            {live.map((b) => (
              <BattleCard key={b.id} battle={b} now={now} />
            ))}
          </View>
        </>
      ) : null}

      {recent.length ? (
        <>
          <SectionHeader title="Recent results" />
          <Card padding={S.md} style={{ paddingVertical: 0 }}>
            {recent.map((b, i) => (
              <ListRow
                key={b.id}
                style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.border } : null}
                leading={<Avatar uri={b.opponent.player?.avatar} name={b.opponent.player?.name || ""} size={36} />}
                title={`vs ${b.opponent.player?.name || "Rival"}`}
                subtitle={
                  b.status === "cancelled"
                    ? `Called off · ${timeAgo(b.createdAt)}`
                    : `${formatScore(b.metric, b.me.value)} to ${formatScore(b.metric, b.opponent.value)} ${metricUnit(b.metric)} · ${timeAgo(b.endAt)}`
                }
                trailing={statusPill(b)}
                onPress={() => router.push(`/battles/${b.id}`)}
              />
            ))}
          </Card>
        </>
      ) : null}

      {!isPending && !list.length ? (
        <Row gap={S.md} style={styles.hint}>
          <History size={18} color={C.textMute} />
          <Body mute size={13} style={{ flex: 1 }}>
            Your battles show up here. Friends make the best rivals, so start with someone you follow.
          </Body>
        </Row>
      ) : null}
    </View>
  );
}

function Stat({ label, value, accent = false }) {
  return (
    <View>
      <Text style={[styles.statValue, accent && { color: C.accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { padding: S.xl, borderRadius: R.lg },
  heroIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center", marginLeft: S.md },
  statValue: { color: C.text, fontFamily: F.display, fontSize: 22 },
  statLabel: { color: C.textMute, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  limits: { color: C.textMute, fontSize: 12, textAlign: "center", marginTop: S.md },
  hint: { marginTop: S.lg, padding: S.lg, borderRadius: R.md, borderWidth: 1, borderColor: C.border, borderStyle: "dashed", alignItems: "flex-start" },
});
