// Compact row of three chips under the hero: streak, level and OUT balance.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Coins, Flame, Zap } from "lucide-react-native";
import { AnimatedBar, AnimatedNumber, C, F, PressableScale, R, S } from "@/components/ui";

export default function StatChips({ streak = 0, checkedIn, level, out = 0, onStreak, onLevel, onOut }) {
  const lit = streak > 0;
  return (
    <View style={{ flexDirection: "row", gap: S.sm }}>
      <Chip onPress={onStreak} tint={C.fire} active={lit}>
        <Flame size={16} color={C.fire} fill={lit ? C.fire : "transparent"} />
        <AnimatedNumber value={streak} style={styles.value} />
        <Text style={styles.caption} numberOfLines={1}>{checkedIn ? "day streak" : lit ? "check in!" : "day streak"}</Text>
      </Chip>
      <Chip onPress={onLevel} tint={C.accent}>
        <Zap size={16} color={C.accent} fill={C.accent} />
        <Text style={styles.value}>Lv {level?.level ?? 1}</Text>
        <AnimatedBar value={level?.progress || 0} height={4} style={{ marginTop: 6, alignSelf: "stretch" }} />
      </Chip>
      <Chip onPress={onOut} tint={C.gold}>
        <Coins size={16} color={C.gold} />
        <AnimatedNumber value={out} style={styles.value} adjustsFontSizeToFit />
        <Text style={styles.caption}>OUT</Text>
      </Chip>
    </View>
  );
}

function Chip({ children, onPress, tint, active }) {
  return (
    <View style={{ flex: 1 }}>
      <PressableScale onPress={onPress} scaleTo={0.95} style={[styles.chip, active && { borderColor: `${tint}55`, backgroundColor: `${tint}14` }]}>
        <View style={[styles.glow, { backgroundColor: tint }]} />
        {children}
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { height: 92, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, padding: S.md, justifyContent: "space-between", overflow: "hidden" },
  glow: { position: "absolute", top: -36, right: -36, width: 64, height: 64, borderRadius: 32, opacity: 0.1 },
  value: { color: C.text, fontFamily: F.display, fontSize: 24, letterSpacing: -0.5, marginTop: 4 },
  caption: { color: C.textMute, fontSize: 11, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
});
