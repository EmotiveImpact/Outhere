// Step 2 of 4, before the camera: three simple rules, like a bank's ID check.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Glasses, Sun, User } from "lucide-react-native";
import { F } from "@/components/ui";
import { SCAN_RULES } from "@/constants/pack";
import { INK, LINE, LockLine, OUT, PackButton, PackScreen, PackTitle, Spacer, Sub } from "@/components/pack/PackKit";

const ICONS = { sun: Sun, glasses: Glasses, user: User };

export default function PackReady() {
  const router = useRouter();
  return (
    <PackScreen step={2} stepLabel="Face scan">
      <Spacer />
      <PackTitle top="Quick" em="face scan" size={34} />
      <Sub>We check it's really you before we make anything. It takes about 20 seconds.</Sub>
      <View style={{ gap: 8 }}>
        {SCAN_RULES.map((r) => {
          const Icon = ICONS[r.icon] || User;
          return (
            <View key={r.title} style={styles.rule}>
              <View style={styles.icon}>
                <Icon size={17} color={OUT} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{r.title}</Text>
                <Text style={styles.body}>{r.body}</Text>
              </View>
            </View>
          );
        })}
      </View>
      <PackButton title="Start scan" onPress={() => router.push("/pack/scan")} />
      <LockLine>Photos are deleted within 24 hours</LockLine>
    </PackScreen>
  );
}

const styles = StyleSheet.create({
  // .ready li: a quiet row with the icon in a soft blue circle
  rule: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)", boxShadow: `inset 0 0 0 1px ${LINE}` },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(79,155,255,0.14)" },
  title: { color: INK, fontFamily: F.bodySemi, fontSize: 13 },
  body: { color: "#c9d3ea", fontFamily: F.body, fontSize: 12.5, marginTop: 1 },
});
