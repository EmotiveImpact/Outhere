// One quiet strip under the hero: streak, level and OUT balance as plain
// columns on a single surface. Each column opens where that number lives.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AnimatedBar, AnimatedNumber, C, F, PressableScale, R, S } from "@/components/ui";

export default function StatChips({ streak = 0, level, out = 0, onStreak, onLevel, onOut }) {
  return (
    <View style={styles.strip}>
      <Column onPress={onStreak} label="day streak">
        <AnimatedNumber value={streak} style={styles.value} />
      </Column>
      <Column onPress={onLevel} label="level">
        <Text style={styles.value}>{level?.level ?? 1}</Text>
        <AnimatedBar value={level?.progress || 0} height={3} style={styles.bar} />
      </Column>
      <Column onPress={onOut} label="OUT">
        <AnimatedNumber value={out} style={styles.value} adjustsFontSizeToFit />
      </Column>
    </View>
  );
}

function Column({ children, label, onPress }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.95} style={styles.column}>
      {children}
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: "row", backgroundColor: C.surface, borderRadius: R.lg, paddingVertical: S.lg, paddingHorizontal: S.sm },
  column: { flex: 1, paddingHorizontal: S.sm },
  value: { color: C.text, fontFamily: F.display, fontSize: 26, letterSpacing: -0.5 },
  label: { color: C.textDim, fontSize: 13, marginTop: 2 },
  bar: { marginTop: 6, marginBottom: 2, alignSelf: "stretch", marginRight: S.md },
});
