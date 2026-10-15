// Pick a mode: the six ways to battle as photo cards, two to a row.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Flame, Footprints, Ghost, Lock, MapPin, Zap } from "lucide-react-native";
import { C, F, PressableScale, R, S } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { BATTLE_MODES } from "@/constants/battleModes";

export const MODE_ART = {
  live_race: { tag: "LIVE", icon: Zap, photo: PHOTOS.rivalMei },
  blind_time_trial: { tag: "SEALED", icon: Lock, photo: PHOTOS.rivalZain },
  most_steps: { tag: "CLASSIC", icon: Footprints, photo: PHOTOS.rivalAmara },
  ghost_race: { tag: "GHOST", icon: Ghost, photo: PHOTOS.rivalTobi },
  last_one_standing: { tag: "SURVIVAL", icon: Flame, photo: PHOTOS.rivalHannah },
  hold_the_route: { tag: "TURF", icon: MapPin, photo: PHOTOS.kemi },
};

const ORDER = ["live_race", "blind_time_trial", "most_steps", "ghost_race", "last_one_standing", "hold_the_route"];

export function ModePicker({ value, onChange }) {
  const modes = ORDER.map((k) => BATTLE_MODES.find((m) => m.key === k));
  return (
    <View style={styles.grid}>
      {modes.map((m) => {
        const art = MODE_ART[m.key];
        const Icon = art.icon;
        const on = m.key === value;
        return (
          <PressableScale key={m.key} onPress={() => onChange(m.key)} scaleTo={0.97} accessibilityLabel={m.name} accessibilityState={{ selected: on }} style={[styles.card, on && styles.on]}>
            <Image source={art.photo} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={["rgba(7,9,12,0.15)", "rgba(7,9,12,0.92)"]} locations={[0.1, 0.75]} style={StyleSheet.absoluteFill} />
            <View style={[styles.icon, on && { backgroundColor: C.accent }]}>
              <Icon size={16} color="#fff" />
            </View>
            <View style={styles.text}>
              <Text style={[styles.tag, on && { color: C.accentHi }]}>{art.tag}</Text>
              <Text style={styles.name}>{m.name}</Text>
              <Text style={styles.line} numberOfLines={3}>
                {m.line}
              </Text>
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  card: { flexBasis: "48%", flexGrow: 1, height: 196, borderRadius: R.lg, overflow: "hidden", backgroundColor: C.surface, borderWidth: 2, borderColor: "transparent", justifyContent: "flex-end" },
  on: { borderColor: C.accent },
  icon: { position: "absolute", top: 10, left: 10, width: 32, height: 32, borderRadius: 11, backgroundColor: "rgba(10,14,20,0.6)", alignItems: "center", justifyContent: "center" },
  text: { padding: 12 },
  tag: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 9.5, letterSpacing: 1.2 },
  name: { color: "#fff", fontFamily: F.display, fontSize: 22, textTransform: "uppercase", lineHeight: 22, marginTop: 3 },
  line: { color: "#c3cad6", fontFamily: F.body, fontSize: 11, lineHeight: 15, marginTop: 4 },
});
