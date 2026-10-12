// Top three in the city today, plus the player's own row when they're further down.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Trophy } from "lucide-react-native";
import { Avatar, Button, C, F, PressableScale, R, S, Skeleton } from "@/components/ui";
import { formatNumber } from "@/utils/format";

const MEDALS = ["#FFD700", "#d7dde3", "#d39b6a"];

export default function MiniBoard({ board, loading, onPlayer, onSettings, onMove }) {
  if (loading || !board) {
    return (
      <View style={[styles.card, { gap: 10, padding: S.md }]}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.sm }}>
            <Skeleton width={18} height={14} />
            <Skeleton width={36} height={36} radius={18} />
            <Skeleton width="45%" height={14} />
          </View>
        ))}
      </View>
    );
  }
  const top = board.entries.slice(0, 3);
  if (!top.length || !top[0].value) {
    return (
      <View style={[styles.card, { alignItems: "center", padding: S.xl }]}>
        <Trophy size={24} color={C.gold} />
        <Text style={styles.emptyTitle}>The board's wide open</Text>
        <Text style={styles.footer}>Nobody's logged steps here yet today. Take first place.</Text>
        <Button title="Start a walk" size="sm" onPress={onMove} style={{ marginTop: S.md }} />
      </View>
    );
  }
  const me = board.me;
  const rows = me && me.rank > 3 ? [...top, me] : top;
  return (
    <View style={[styles.card, { padding: S.sm }]}>
      {rows.map((row, i) => {
        const medal = MEDALS[row.rank - 1];
        return (
          <React.Fragment key={row.player.id}>
            {i === 3 ? <View style={styles.gap}><View style={styles.gapDot} /><View style={styles.gapDot} /><View style={styles.gapDot} /></View> : null}
            <PressableScale onPress={() => onPlayer(row.player.id)} scaleTo={0.98} style={[styles.row, row.isMe && styles.rowMe]}>
              <View style={[styles.rank, medal && { backgroundColor: `${medal}1f` }]}>
                <Text style={[styles.rankText, medal && { color: medal }, row.isMe && !medal && { color: C.accent }]}>{row.rank}</Text>
              </View>
              <Avatar uri={row.player.avatar} name={row.player.name} colour={row.player.color} size={36} ring={row.isMe ? C.accent : undefined} />
              <Text style={[styles.name, row.isMe && { fontWeight: "800" }]} numberOfLines={1}>
                {row.isMe ? "You" : row.player.name}
              </Text>
              <Text style={[styles.value, row.isMe && { color: C.accent }]}>{formatNumber(row.value)}</Text>
            </PressableScale>
          </React.Fragment>
        );
      })}
      {board.hiddenMe ? (
        <Text style={styles.footer} onPress={onSettings}>
          You're hidden from leaderboards. Change it in Settings.
        </Text>
      ) : me ? (
        <Text style={styles.footer}>
          You're #{me.rank} of {board.entries.length} in {board.city} today
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: R.lg, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  row: { flexDirection: "row", alignItems: "center", gap: S.md, minHeight: 52, paddingHorizontal: S.sm, borderRadius: 14 },
  rowMe: { backgroundColor: C.accentDim },
  rank: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  rankText: { color: C.textDim, fontFamily: F.display, fontSize: 15 },
  name: { flex: 1, color: C.text, fontSize: 15, fontWeight: "600" },
  value: { color: C.text, fontFamily: F.displayMedium, fontSize: 15, marginRight: S.sm },
  gap: { flexDirection: "row", justifyContent: "center", gap: 4, paddingVertical: 4 },
  gapDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: C.textMute },
  footer: { color: C.textMute, fontSize: 12, textAlign: "center", paddingVertical: S.sm, paddingHorizontal: S.md },
  emptyTitle: { color: C.text, fontFamily: F.display, fontSize: 17, marginTop: S.sm },
});
