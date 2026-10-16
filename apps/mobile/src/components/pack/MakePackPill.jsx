// "+ Make your pack": the small blue pill that sits on a member's own
// silhouette (or plain photo) until they have a Fighter Pack (.r10vsh
// .packbtn). Opens the pack flow, which shows the upgrade for Free members.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { F, PressableScale } from "@/components/ui";

export function MakePackPill({ label = "+ Make your pack", style }) {
  const router = useRouter();
  return (
    <PressableScale onPress={() => router.push("/pack")} scaleTo={0.95} accessibilityLabel="Make your Fighter Pack" style={[styles.wrap, style]}>
      <View style={styles.pill}>
        <LinearGradient colors={["#3b7bff", "#2a6af0"]} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.inset]} />
        <Text style={styles.text}>{label}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // box-shadow: 0 8px 22px rgba(42,106,240,.5); the pill clips, so the shadow sits outside it
  wrap: { borderRadius: 99, boxShadow: "0 8px 22px rgba(42,106,240,0.5)" },
  pill: { borderRadius: 99, overflow: "hidden", paddingVertical: 9, paddingHorizontal: 13 },
  inset: { borderRadius: 99, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)" },
  text: { color: "#ffffff", fontFamily: F.bodySemi, fontSize: 12, lineHeight: 14 },
});
