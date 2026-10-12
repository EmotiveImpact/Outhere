// Battles block on the Arena: the hero, invites, live battles and results.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { engine, useBattleLimits, useBattles, useEngineMutation } from "@/data/hooks";
import { Avatar, C, Card, F, FadeIn, ListRow, S, SectionHeader, Skeleton } from "@/components/ui";
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
        <ArenaHero record={record} limits={limits} quiet={invites.some((b) => b.incoming)} />
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
                  primary={b.id === invites.find((x) => x.incoming)?.id}
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
          <Card padding={S.lg} style={{ paddingVertical: 0, borderWidth: 0 }}>
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
          <View style={styles.hint}>
            <Text style={styles.hintTitle}>No battles yet</Text>
            <Text style={styles.hintBody}>Friends make the best rivals. Start with someone you follow.</Text>
          </View>
        </FadeIn>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { marginTop: S.xxl, paddingHorizontal: 2 },
  hintTitle: { color: C.text, fontFamily: F.display, fontSize: 20 },
  hintBody: { color: C.textDim, fontSize: 15, marginTop: 4, lineHeight: 21 },
});
