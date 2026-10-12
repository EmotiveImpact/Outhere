// Battles block on the Arena: the hero, invites, live battles and results.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Swords } from "lucide-react-native";
import { engine, useBattleLimits, useBattles, useEngineMutation } from "@/data/hooks";
import { Avatar, C, Card, F, FadeIn, ListRow, R, Row, S, SectionHeader, Skeleton } from "@/components/ui";
import { timeAgo } from "@/utils/format";
import BattleCard, { statusPill } from "./BattleCard";
import ArenaHero from "./ArenaHero";
import { formatScore, metricUnit, playerName, rivalColour, useNow } from "./shared";

export { limitsText } from "./ArenaHero";

export default function BattlesHub() {
  const router = useRouter();
  const now = useNow(1000);
  const { data: battles, isPending } = useBattles();
  const { data: limits } = useBattleLimits();
  const respond = useEngineMutation(engine.respondToBattle, {
    success: (b) => (b?.status === "active" ? `Game on vs ${playerName(b.opponent?.player)}` : "Invite declined"),
  });

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
      <FadeIn>
        <ArenaHero record={record} limits={limits} />
      </FadeIn>

      {isPending ? (
        <View style={{ marginTop: S.xxl, gap: S.md }}>
          <Skeleton width={140} height={20} />
          <Skeleton height={190} radius={20} />
        </View>
      ) : null}

      {invites.length ? (
        <>
          <SectionHeader title={invites.length > 1 ? `${invites.length} invites` : "Invite"} />
          <View style={{ gap: S.md }}>
            {invites.map((b, i) => (
              <FadeIn key={b.id} index={i}>
                <BattleCard
                  battle={b}
                  now={now}
                  busy={busyId === b.id}
                  onAccept={() => respond.mutate([b.id, true])}
                  onDecline={() => respond.mutate([b.id, false])}
                />
              </FadeIn>
            ))}
          </View>
        </>
      ) : null}

      {live.length ? (
        <>
          <SectionHeader title="Live battles" />
          <View style={{ gap: S.md }}>
            {live.map((b, i) => (
              <FadeIn key={b.id} index={i}>
                <BattleCard battle={b} now={now} />
              </FadeIn>
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
                leading={<Avatar uri={b.opponent.player?.avatar} name={b.opponent.player?.name || ""} colour={rivalColour(b.opponent.player)} size={40} />}
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
        <FadeIn delay={120}>
          <Row gap={S.md} style={styles.hint}>
            <View style={styles.hintIcon}>
              <Swords size={18} color={C.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hintTitle}>No battles yet</Text>
              <Text style={styles.hintBody}>Friends make the best rivals. Start with someone you follow.</Text>
            </View>
          </Row>
        </FadeIn>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { marginTop: S.lg, padding: S.lg, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, borderStyle: "dashed" },
  hintIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center" },
  hintTitle: { color: C.text, fontFamily: F.displayMedium, fontSize: 16 },
  hintBody: { color: C.textDim, fontSize: 13, marginTop: 2, lineHeight: 18 },
});
