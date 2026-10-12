// Quick actions as a 2x2 grid of tactile tiles.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ArrowUpRight } from "lucide-react-native";
import { C, F, PressableScale, R, S } from "@/components/ui";

export default function QuickTiles({ items }) {
  return (
    <View style={styles.grid}>
      {items.map(({ key, icon: Icon, label, hint, tint, onPress }) => (
        <View key={key} style={styles.cell}>
          <PressableScale onPress={onPress} scaleTo={0.95} style={styles.tile}>
            <View style={[styles.wash, { backgroundColor: tint }]} />
            <View style={[styles.icon, { backgroundColor: `${tint}1f` }]}>
              <Icon size={20} color={tint} />
            </View>
            <ArrowUpRight size={16} color={C.textMute} style={styles.arrow} />
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
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -S.xs },
  cell: { width: "50%", padding: S.xs },
  tile: { height: 120, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, padding: S.lg, justifyContent: "space-between", overflow: "hidden" },
  wash: { position: "absolute", bottom: -70, right: -60, width: 130, height: 130, borderRadius: 65, opacity: 0.06 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  arrow: { position: "absolute", top: S.lg, right: S.lg },
  label: { color: C.text, fontFamily: F.display, fontSize: 17 },
  hint: { color: C.textMute, fontSize: 12, marginTop: 2 },
});
