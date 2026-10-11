import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Trophy } from "lucide-react-native";
import { Avatar, Body, C, Card, EmptyState, F, Loading, S, Segment } from "@/components/ui";
import { useCrewLeaderboard } from "@/data/hooks";
import { compactNumber } from "@/utils/format";

const MEDALS = { 1: "#ffd700", 2: "#c0c0c0", 3: "#cd7f32" };

/** Crew members ranked by steps for the week or month. `limit` trims the list. */
export default function CrewLeaderboard({ crew, limit, embedded = false }) {
  const router = useRouter();
  const [period, setPeriod] = useState("week");
  const board = useCrewLeaderboard(crew.id, period);
  const rows = (board.data || []).slice(0, limit || undefined);
  const accent = crew.accent || C.accent;

  return (
    <View>
      <Segment
        options={[
          { value: "week", label: "This week" },
          { value: "month", label: "This month" },
        ]}
        value={period}
        onChange={setPeriod}
        style={{ marginBottom: S.md }}
      />
      {board.isPending ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState icon={Trophy} title="Nobody on the board yet" body="Steps from crew members show up here." />
      ) : (
        <Card padding={0} style={embedded ? null : { marginBottom: S.md }}>
          {rows.map((r, i) => (
            <Pressable
              key={r.player.id}
              onPress={() => router.push(r.isMe ? "/(tabs)/profile" : `/player/${r.player.id}`)}
              style={({ pressed }) => [styles.row, i > 0 && styles.divider, r.isMe && { backgroundColor: `${accent}14` }, pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.rank, MEDALS[r.rank] && { color: MEDALS[r.rank] }]}>{r.rank}</Text>
              <Avatar uri={r.player.avatar} name={r.player.name || r.player.username} size={38} ring={MEDALS[r.rank]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {r.isMe ? "You" : r.player.name || r.player.username}
                </Text>
                <Body mute size={12}>
                  {r.km.toFixed(1)} km{r.role !== "member" ? ` · ${r.role === "owner" ? "Owner" : "Admin"}` : ""}
                </Body>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.steps, r.rank === 1 && { color: accent }]}>{compactNumber(r.steps)}</Text>
                <Body mute size={11}>steps</Body>
              </View>
            </Pressable>
          ))}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  rank: { width: 22, textAlign: "center", color: C.textMute, fontFamily: F.display, fontSize: 16 },
  name: { color: C.text, fontSize: 15, fontWeight: "600" },
  steps: { color: C.text, fontFamily: F.display, fontSize: 18 },
});
