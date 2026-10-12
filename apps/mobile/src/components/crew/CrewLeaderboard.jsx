import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Crown, Trophy } from "lucide-react-native";
import { AnimatedNumber, Body, C, Card, EmptyState, F, FadeIn, PressableScale, S, Skeleton } from "@/components/ui";
import { useCrewLeaderboard } from "@/data/hooks";
import { compactNumber } from "@/utils/format";
import CrewTabs from "./CrewTabs";
import { PlayerAvatar, crewAccent, playerName } from "./shared";

const MEDALS = { 1: "#ffd700", 2: "#c0c0c0", 3: "#cd7f32" };
const PODIUM_ORDER = [2, 1, 3];

const hrefFor = (r) => (r.isMe ? "/(tabs)/profile" : `/player/${r.player.id}`);

function Podium({ rows, accent }) {
  const router = useRouter();
  return (
    <View style={styles.podium}>
      {PODIUM_ORDER.map((rank) => {
        const r = rows[rank - 1];
        if (!r) return <View key={rank} style={{ flex: 1 }} />;
        const first = rank === 1;
        const medal = MEDALS[rank];
        return (
          <PressableScale key={r.player.id} onPress={() => router.push(hrefFor(r))} style={[styles.podiumCol, first && { marginTop: -S.md }]}>
            {first ? <Crown size={18} color={medal} style={{ marginBottom: 4 }} /> : <View style={{ height: 22 }} />}
            <PlayerAvatar player={r.player} size={first ? 64 : 52} ring={medal} />
            <View style={[styles.rankChip, { backgroundColor: medal }]}>
              <Text style={styles.rankChipText}>{rank}</Text>
            </View>
            <Text style={styles.podiumName} numberOfLines={1}>
              {playerName(r.player)}
            </Text>
            <AnimatedNumber value={r.steps} format={compactNumber} style={[styles.podiumSteps, first && { color: accent, fontSize: 22 }]} />
            <Body mute size={11}>{r.km.toFixed(1)} km</Body>
          </PressableScale>
        );
      })}
    </View>
  );
}

function BoardSkeleton() {
  return (
    <View style={{ gap: S.md }}>
      <Skeleton height={170} radius={20} />
      <Skeleton height={64} radius={20} />
      <Skeleton height={64} radius={20} />
    </View>
  );
}

/** Crew members ranked by steps for the week or month. `limit` trims the list. */
export default function CrewLeaderboard({ crew, limit, embedded = false }) {
  const router = useRouter();
  const [period, setPeriod] = useState("week");
  const board = useCrewLeaderboard(crew.id, period);
  const rows = (board.data || []).slice(0, limit || undefined);
  const accent = crewAccent(crew);
  const usePodium = rows.length >= 3;
  const rest = usePodium ? rows.slice(3) : rows;

  return (
    <View style={embedded ? null : { marginBottom: S.md }}>
      <CrewTabs
        options={[
          { value: "week", label: "This week" },
          { value: "month", label: "This month" },
        ]}
        value={period}
        onChange={setPeriod}
        colour="#2c2c31"
        activeText={C.text}
        style={{ marginBottom: S.md }}
      />
      {board.isPending ? (
        <BoardSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState icon={Trophy} title="Nobody on the board yet" body="Steps from crew members show up here." />
      ) : (
        <>
          {usePodium ? (
            <FadeIn>
              <Card style={{ paddingTop: S.xl }}>
                <Podium rows={rows} accent={accent} />
              </Card>
            </FadeIn>
          ) : null}
          {rest.length ? (
            <Card padding={0} style={{ marginTop: usePodium ? S.md : 0 }}>
              {rest.map((r, i) => (
                <FadeIn key={r.player.id} index={i}>
                  <PressableScale
                    onPress={() => router.push(hrefFor(r))}
                    scaleTo={0.985}
                    style={[styles.row, i > 0 && styles.divider, r.isMe && { backgroundColor: `${accent}14` }]}
                  >
                    <Text style={[styles.rank, MEDALS[r.rank] && { color: MEDALS[r.rank] }]}>{r.rank}</Text>
                    <PlayerAvatar player={r.player} size={38} ring={MEDALS[r.rank]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>
                        {playerName(r.player)}
                      </Text>
                      <Body mute size={12}>
                        {r.km.toFixed(1)} km{r.role !== "member" ? ` · ${r.role === "owner" ? "Owner" : "Admin"}` : ""}
                      </Body>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.steps}>{compactNumber(r.steps)}</Text>
                      <Body mute size={11}>steps</Body>
                    </View>
                  </PressableScale>
                </FadeIn>
              ))}
            </Card>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  podium: { flexDirection: "row", alignItems: "flex-end", gap: S.sm },
  podiumCol: { flex: 1, alignItems: "center" },
  rankChip: { marginTop: -10, minWidth: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.surface },
  rankChipText: { color: "#111", fontFamily: F.display, fontSize: 12 },
  podiumName: { color: C.text, fontSize: 13, fontWeight: "600", marginTop: 6, maxWidth: "100%" },
  podiumSteps: { color: C.text, fontFamily: F.display, fontSize: 18, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  rank: { width: 22, textAlign: "center", color: C.textMute, fontFamily: F.display, fontSize: 16 },
  name: { color: C.text, fontSize: 15, fontWeight: "600" },
  steps: { color: C.text, fontFamily: F.display, fontSize: 18 },
});
