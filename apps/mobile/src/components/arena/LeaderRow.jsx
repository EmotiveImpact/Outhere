// Leaderboard pieces: a ranked row, the pinned "you" row and the top three
// podium with gold, silver and bronze rings.

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Crown, Flame, Footprints, Route, Zap } from "lucide-react-native";
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
  MEDAL,
  METRICS,
  metricShort,
  metricUnit,
  metricValue,
  playerName,
} from "./shared";

const avatarColour = (player) => (player?.isMe ? C.accent : player?.color);

export function LeaderRow({ entry, metric, onPress, style }) {
  const { player, rank, value, isMe } = entry;
  return (
    <PressableScale
      onPress={() => onPress?.(entry)}
      scaleTo={0.985}
      style={[styles.row, isMe && styles.rowMe, style]}
    >
      <Text style={[styles.rank, isMe && { color: C.accent }]}>{rank}</Text>
      <Avatar
        uri={player.avatar}
        name={player.name || player.username || ""}
        colour={avatarColour(player)}
        size={40}
        ring={isMe ? C.accent : undefined}
      />
      <View style={{ flex: 1 }}>
        <Row gap={6}>
          <Text
            style={[styles.name, isMe && { color: C.accent }]}
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
      <LinearGradient
        colors={["rgba(0,255,127,0.20)", "rgba(0,255,127,0.06)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.pinnedRank}>
        <Text style={styles.pinnedRankLabel}>RANK</Text>
        <Text style={styles.pinnedRankValue}>{entry.rank}</Text>
      </View>
      <Avatar
        uri={entry.player.avatar}
        name={entry.player.name || entry.player.username || ""}
        colour={C.accent}
        size={40}
        ring={C.accent}
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
        <Text style={[styles.value, { color: C.accent }]} numberOfLines={1}>
          {metricShort(metric, entry.value)}
        </Text>
        <Text style={styles.unit}>{metricUnit(metric)}</Text>
      </View>
    </PressableScale>
  );
}

const PEDESTAL = { 1: 56, 2: 38, 3: 26 };

export function Podium({ entries, metric, onPress }) {
  // Visual order: 2nd, 1st, 3rd.
  const order = [entries[1], entries[0], entries[2]].filter(Boolean);
  return (
    <Row gap={S.sm} style={{ alignItems: "flex-end", marginBottom: S.lg }}>
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
              {first ? (
                <Crown
                  size={22}
                  color={medal}
                  fill={medal}
                  style={{ marginBottom: 6 }}
                />
              ) : null}
              <View
                style={[
                  styles.glow,
                  { shadowColor: medal, borderRadius: size },
                ]}
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
              </View>
              <View style={[styles.medal, { backgroundColor: medal }]}>
                <Text style={styles.medalText}>{entry.rank}</Text>
              </View>
              <Text
                style={[styles.podiumName, entry.isMe && { color: C.accent }]}
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
              <LinearGradient
                colors={[`${medal}38`, `${medal}05`]}
                style={[
                  styles.pedestal,
                  { height: PEDESTAL[entry.rank], borderColor: `${medal}55` },
                ]}
              />
            </PressableScale>
          </View>
        );
      })}
    </Row>
  );
}

const METRIC_ICONS = {
  steps: Footprints,
  distance: Route,
  xp: Zap,
  streak: Flame,
};

/** Big tactile chips for picking what the board ranks by. */
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
        const Icon = METRIC_ICONS[m.value] || Footprints;
        return (
          <PressableScale
            key={m.value}
            onPress={() => onChange(m.value)}
            scaleTo={0.93}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Icon size={15} color={active ? C.bg : C.textDim} />
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
  rowMe: { backgroundColor: "#0f1a14", borderColor: "rgba(0,255,127,0.35)" },
  rank: {
    width: 24,
    textAlign: "center",
    color: C.textMute,
    fontFamily: F.display,
    fontSize: 16,
  },
  name: { color: C.text, fontSize: 15, fontWeight: "600", flexShrink: 1 },
  sub: { color: C.textMute, fontSize: 12, marginTop: 2 },
  value: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  unit: {
    color: C.textMute,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  pinned: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    paddingVertical: 10,
    paddingHorizontal: S.md,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: "rgba(0,255,127,0.45)",
    backgroundColor: "#0d1711",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  pinnedRank: { width: 40, alignItems: "center" },
  pinnedRankLabel: {
    color: C.accent,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },
  pinnedRankValue: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 22,
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  glow: {
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  ring: { padding: 3, borderWidth: 2.5, backgroundColor: C.bg },
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
  medalText: { color: "#111", fontSize: 11, fontWeight: "900" },
  podiumName: {
    color: C.text,
    fontFamily: F.displayMedium,
    fontSize: 15,
    marginTop: 6,
    maxWidth: "100%",
  },
  podiumValue: {
    color: C.textDim,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
    maxWidth: "100%",
  },
  pedestal: {
    alignSelf: "stretch",
    marginTop: S.md,
    borderTopLeftRadius: R.md,
    borderTopRightRadius: R.md,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 44,
    paddingHorizontal: S.lg,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  chipActive: { borderColor: C.text, backgroundColor: C.text },
  chipText: { color: C.textDim, fontSize: 14, fontWeight: "700" },
  chipTextActive: { color: C.bg },
});
