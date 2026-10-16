// Quick actions as a calm 2x2 grid: a neutral icon, a name and one short line.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { C, F, PressableScale, R, S } from "@/components/ui";

export default function QuickTiles({ items }) {
  return (
    <View style={styles.grid}>
      {items.map(({ key, icon: Icon, label, hint, onPress }) => (
        <View key={key} style={styles.cell}>
          <PressableScale onPress={onPress} scaleTo={0.96} style={styles.tile}>
            <Icon size={20} color={C.textDim} />
            <View>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.hint} numberOfLines={1}>{hint}</Text>
            </View>
          </PressableScale>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -S.xs - 2 },
  cell: { width: "50%", padding: S.xs + 2 },
  tile: { height: 116, borderRadius: R.lg, backgroundColor: C.surface, padding: S.lg, justifyContent: "space-between" },
  label: { color: C.text, fontFamily: F.display, fontSize: 17 },
  hint: { color: C.textDim, fontSize: 13, marginTop: 2 },
});
