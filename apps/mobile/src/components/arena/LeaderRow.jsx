// One leaderboard row, plus the top three podium.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Crown } from "lucide-react-native";
import { Avatar, C, F, R, Row, S, TierBadge } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";
import { metricShort, metricUnit, metricValue, playerName } from "./shared";

const MEDAL = { 1: C.gold, 2: "#c0c0c8", 3: "#cd8a52" };

export function LeaderRow({ entry, metric, onPress, pinned = false, style }) {
  const { player, rank, value, isMe } = entry;
  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress?.(entry);
      }}
      style={({ pressed }) => [styles.row, isMe && styles.rowMe, pinned && styles.rowPinned, pressed && { opacity: 0.7 }, style]}
    >
      <Text style={[styles.rank, MEDAL[rank] && { color: MEDAL[rank] }, isMe && { color: C.accent }]}>{rank}</Text>
      <Avatar uri={player.avatar} name={player.name || ""} size={38} ring={isMe ? C.accent : undefined} />
      <View style={{ flex: 1 }}>
        <Row gap={6}>
          <Text style={[styles.name, isMe && { color: C.accent }]} numberOfLines={1}>
            {isMe ? `${player.name || player.username} (you)` : player.name}
          </Text>
          <TierBadge tier={player.tier} />
        </Row>
        <Text style={styles.sub} numberOfLines={1}>
          @{player.username}
          {player.area ? ` · ${player.area}` : player.city ? ` · ${player.city}` : ""}
        </Text>
      </View>
      <Text style={styles.value} numberOfLines={1}>
        {metricShort(metric, value)}
        <Text style={styles.unit}> {metricUnit(metric)}</Text>
      </Text>
    </Pressable>
  );
}

export function Podium({ entries, metric, onPress }) {
  // Visual order: 2nd, 1st, 3rd.
  const order = [entries[1], entries[0], entries[2]].filter(Boolean);
  return (
    <Row gap={S.sm} style={{ alignItems: "flex-end", marginBottom: S.lg }}>
      {order.map((entry) => {
        const first = entry.rank === 1;
        const size = first ? 68 : 54;
        return (
          <Pressable
            key={entry.player.id}
            onPress={() => {
              hapticSelection();
              onPress?.(entry);
            }}
            style={({ pressed }) => [styles.podium, first && styles.podiumFirst, entry.isMe && styles.rowMe, pressed && { opacity: 0.7 }]}
          >
            {first ? <Crown size={18} color={C.gold} style={{ marginBottom: 4 }} /> : null}
            <Avatar uri={entry.player.avatar} name={entry.player.name || ""} size={size} ring={MEDAL[entry.rank]} />
            <View style={[styles.medal, { backgroundColor: MEDAL[entry.rank] }]}>
              <Text style={styles.medalText}>{entry.rank}</Text>
            </View>
            <Text style={[styles.podiumName, entry.isMe && { color: C.accent }]} numberOfLines={1}>
              {playerName(entry.player)}
            </Text>
            <Text style={styles.podiumValue} numberOfLines={1} adjustsFontSizeToFit>
              {metricValue(metric, entry.value)}
            </Text>
          </Pressable>
        );
      })}
    </Row>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: 10, paddingHorizontal: S.md, borderRadius: R.md, borderWidth: 1, borderColor: "transparent" },
  rowMe: { backgroundColor: "#0f1a14", borderColor: "rgba(0,255,127,0.35)" },
  rowPinned: { backgroundColor: "#0f1a14", shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  rank: { width: 26, textAlign: "center", color: C.textMute, fontFamily: F.display, fontSize: 16 },
  name: { color: C.text, fontSize: 15, fontWeight: "600", flexShrink: 1 },
  sub: { color: C.textMute, fontSize: 12, marginTop: 2 },
  value: { color: C.text, fontFamily: F.display, fontSize: 17, maxWidth: 110 },
  unit: { color: C.textMute, fontFamily: F.displayMedium, fontSize: 11 },
  podium: { flex: 1, alignItems: "center", paddingVertical: S.lg, paddingHorizontal: S.sm, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  podiumFirst: { paddingVertical: S.xl, borderColor: "rgba(255,215,0,0.35)" },
  medal: { marginTop: -10, minWidth: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.surface },
  medalText: { color: "#111", fontSize: 11, fontWeight: "800" },
  podiumName: { color: C.text, fontSize: 14, fontWeight: "600", marginTop: S.sm, maxWidth: "100%" },
  podiumValue: { color: C.textDim, fontFamily: F.displayMedium, fontSize: 13, marginTop: 2 },
});
