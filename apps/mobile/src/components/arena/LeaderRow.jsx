// Leaderboard pieces: a ranked row, the pinned "you" row and the top three
// podium with gold, silver and bronze rings.

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Avatar,
  C,
  F,
  PressableScale,
  R,
  Row,
  S,
  TierBadge,
} from "@/components/ui";
import {
  ME,
  MEDAL,
  METRICS,
  metricShort,
  metricUnit,
  metricValue,
  playerName,
} from "./shared";

const avatarColour = (player) => (player?.isMe ? ME : player?.color);

export function LeaderRow({ entry, metric, onPress, style }) {
  const { player, rank, value, isMe } = entry;
  return (
    <PressableScale
      onPress={() => onPress?.(entry)}
      scaleTo={0.985}
      style={[styles.row, isMe && styles.rowMe, style]}
    >
      <Text style={[styles.rank, isMe && { color: C.text }]}>{rank}</Text>
      <Avatar
        uri={player.avatar}
        name={player.name || player.username || ""}
        colour={avatarColour(player)}
        size={40}
      />
      <View style={{ flex: 1 }}>
        <Row gap={6}>
          <Text
            style={styles.name}
            numberOfLines={1}
          >
            {isMe ? "You" : player.name}
          </Text>
          <TierBadge tier={player.tier} />
        </Row>
        <Text style={styles.sub} numberOfLines={1}>
          @{player.username}
          {player.area
            ? ` · ${player.area}`
            : player.city
              ? ` · ${player.city}`
              : ""}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.value} numberOfLines={1}>
          {metricShort(metric, value)}
        </Text>
        <Text style={styles.unit}>{metricUnit(metric)}</Text>
      </View>
    </PressableScale>
  );
}

/** Floating row that keeps your own position in view while you scroll. */
export function PinnedMeRow({ entry, metric, ahead, onPress }) {
  const gap = ahead ? Math.max(0, ahead.value - entry.value) : 0;
  const line = ahead
    ? gap > 0
      ? `${metricValue(metric, gap)} to pass ${playerName(ahead.player)}`
      : `Level with ${playerName(ahead.player)}. Nudge past.`
    : entry.rank === 1
      ? "Top of the board. Hold it."
      : `@${entry.player.username}`;
  return (
    <PressableScale
      onPress={() => onPress?.(entry)}
      scaleTo={0.98}
      style={styles.pinned}
    >
      <View style={styles.pinnedRank}>
        <Text style={styles.pinnedRankValue}>{entry.rank}</Text>
        <Text style={styles.pinnedRankLabel}>rank</Text>
      </View>
      <Avatar
        uri={entry.player.avatar}
        name={entry.player.name || entry.player.username || ""}
        colour={ME}
        size={40}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
          You
        </Text>
        <Text style={[styles.sub, { color: C.textDim }]} numberOfLines={1}>
          {line}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.value} numberOfLines={1}>
          {metricShort(metric, entry.value)}
        </Text>
        <Text style={styles.unit}>{metricUnit(metric)}</Text>
      </View>
    </PressableScale>
  );
}

export function Podium({ entries, metric, onPress }) {
  // Visual order: 2nd, 1st, 3rd.
  const order = [entries[1], entries[0], entries[2]].filter(Boolean);
  return (
    <Row gap={S.sm} style={{ alignItems: "flex-end", marginBottom: S.xl }}>
      {order.map((entry) => {
        const first = entry.rank === 1;
        const medal = MEDAL[entry.rank];
        const size = first ? 76 : 60;
        return (
          <View key={entry.player.id} style={{ flex: 1 }}>
            <PressableScale
              onPress={() => onPress?.(entry)}
              scaleTo={0.96}
              style={{ alignItems: "center" }}
            >
              <View
                style={[
                  styles.ring,
                  { borderColor: medal, borderRadius: size },
                ]}
              >
                <Avatar
                  uri={entry.player.avatar}
                  name={entry.player.name || entry.player.username || ""}
                  colour={avatarColour(entry.player)}
                  size={size}
                />
              </View>
              <View style={[styles.medal, { backgroundColor: medal }]}>
                <Text style={styles.medalText}>{entry.rank}</Text>
              </View>
              <Text
                style={styles.podiumName}
                numberOfLines={1}
              >
                {playerName(entry.player)}
              </Text>
              <Text
                style={[styles.podiumValue, first && { color: C.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {metricValue(metric, entry.value)}
              </Text>
            </PressableScale>
          </View>
        );
      })}
    </Row>
  );
}

/** Chips for picking what the board ranks by. */
export function MetricChips({ value, onChange, style }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[{ marginHorizontal: -S.gutter }, style]}
      contentContainerStyle={{ paddingHorizontal: S.gutter, gap: S.sm }}
    >
      {METRICS.map((m) => {
        const active = m.value === value;
        return (
          <PressableScale
            key={m.value}
            onPress={() => onChange(m.value)}
            scaleTo={0.93}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {m.label}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    paddingVertical: 10,
    paddingHorizontal: S.md,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  rowMe: { backgroundColor: C.surface },
  rank: {
    width: 24,
    textAlign: "center",
    color: C.textMute,
    fontFamily: F.display,
    fontSize: 16,
  },
  name: { color: C.text, fontSize: 15, fontWeight: "600", flexShrink: 1 },
  sub: { color: C.textMute, fontSize: 13, marginTop: 2 },
  value: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  unit: { color: C.textMute, fontSize: 12 },
  pinned: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    paddingVertical: 10,
    paddingHorizontal: S.md,
    borderRadius: R.lg,
    backgroundColor: C.surfaceHigh,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  pinnedRank: { width: 40, alignItems: "center" },
  pinnedRankLabel: { color: C.textMute, fontSize: 11 },
  pinnedRankValue: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 22,
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  ring: { padding: 3, borderWidth: 2 },
  medal: {
    marginTop: -12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: C.bg,
  },
  medalText: { color: "#111", fontSize: 11, fontWeight: "600" },
  podiumName: {
    color: C.text,
    fontFamily: F.displayMedium,
    fontSize: 15,
    marginTop: 6,
    maxWidth: "100%",
  },
  podiumValue: {
    color: C.textDim,
    fontSize: 13,
    marginTop: 2,
    maxWidth: "100%",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 36,
    paddingHorizontal: S.lg,
    borderRadius: R.full,
    backgroundColor: C.surface,
  },
  chipActive: { backgroundColor: C.text },
  chipText: { color: C.textDim, fontSize: 14, fontWeight: "600" },
  chipTextActive: { color: C.bg },
});
