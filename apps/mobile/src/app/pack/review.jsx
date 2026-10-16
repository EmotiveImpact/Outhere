// Your pack: each picture in the place the game shows it. Re-roll any one for
// a credit; it swaps in when it lands. Then on to the poses.

import React, { useEffect, useRef } from "react";
import { Alert, Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { RotateCw } from "lucide-react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { engine, useEngineMutation, usePackCredits, usePackState } from "@/data/hooks";
import { F, PressableScale, imageSource } from "@/components/ui";
import { REROLL_COST } from "@/constants/pack";
import { MUTE, PackButton, PackScreen, PackTitle, packStyles } from "@/components/pack/PackKit";

// The order and names the review shows, to the mock.
const TILES = [
  { key: "profile", label: "Profile pic", focus: 0.18 },
  { key: "vs", label: "VS, your side", focus: 0.3 },
  { key: "vsMirror", label: "VS, their side", focus: 0.3 },
  { key: "sprint", label: "Race", focus: 0.3 },
  { key: "win", label: "Win", focus: 0.25 },
  { key: "respect", label: "Respect", focus: 0.2 },
  { key: "swipe", label: "Swipe card", focus: 0.2 },
  { key: "background", label: "Profile background", focus: 0.7, wide: true },
  { key: "blackEdition", label: "Black edition", focus: 0.2 },
  { key: "clubKit", label: "Club kit", focus: 0.2 },
];

export default function PackReview() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { data: state } = usePackState();
  const { data: credits } = usePackCredits();
  const reroll = useEngineMutation(engine.rerollPackSlot, { success: `Making a new one · ${REROLL_COST} credit` });
  const remove = useEngineMutation(engine.deletePack, { success: "Pack deleted", onSuccess: () => router.replace("/(tabs)/profile") });

  // A pack that isn't ready yet belongs on the making screen.
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current || !state) return;
    if (state.status === "making" || state.status === "none") {
      sent.current = true;
      router.replace("/pack");
    }
  }, [state, router]);

  const byName = Object.fromEntries((state?.images || []).map((i) => [i.name, i]));
  const tiles = TILES.filter((t) => byName[t.key]);
  const w = Math.floor((Math.min(width, 520) - 36 - 10) / 3);

  const confirmDelete = () => {
    const go = () => remove.mutate();
    if (Platform.OS === "web") return go();
    Alert.alert("Delete your pack?", "Every picture goes, and your photo or silhouette comes back. Credits already spent stay spent.", [
      { text: "Keep it", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: go },
    ]);
  };

  return (
    <PackScreen label="Your Fighter Pack" gap={8} scroll>
      <PackTitle top="Pick where" em="each goes" size={28} />
      <View style={styles.grid}>
        {tiles.map((t) => {
          const img = byName[t.key];
          return (
            <View key={t.key} style={{ width: t.wide ? w * 2 + 5 : w, gap: 4 }}>
              <Tile url={img.url} pending={img.status === "pending"} focus={t.focus} height={t.wide ? w : w * 1.25} wide={t.wide} onReroll={() => reroll.mutate(t.key)} busy={reroll.isPending} />
              <Text style={styles.label}>{t.label}</Text>
            </View>
          );
        })}
      </View>
      <View style={[packStyles.row, { alignItems: "center", marginTop: 4 }]}>
        <Text style={packStyles.rowText}>Re-roll any picture for {REROLL_COST} credit</Text>
        <Text style={packStyles.rowBold}>{credits ? `${credits.balance} credits left` : ""}</Text>
      </View>
      <PackButton title="Use my pack" onPress={() => router.push("/pack/poses")} style={{ marginTop: 4 }} />
      <PressableScale onPress={confirmDelete} scaleTo={0.97} style={{ alignSelf: "center", padding: 8 }} accessibilityLabel="Delete my pack">
        <Text style={styles.delete}>Delete my pack</Text>
      </PressableScale>
    </PackScreen>
  );
}

function Tile({ url, pending, focus, height, wide, onReroll, busy }) {
  const reduce = useReducedMotion();
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = pending && !reduce ? withRepeat(withTiming(0.45, { duration: 700 }), -1, true) : withTiming(1, { duration: 200 });
  }, [pending, reduce, pulse]);
  const fade = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <View style={[styles.slot, { height }]}>
      <Animated.View style={[StyleSheet.absoluteFill, fade]}>
        {url ? <Image source={imageSource(url)} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ top: `${focus * 100}%`, left: "50%" }} transition={300} /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: "#16233b" }]} />}
      </Animated.View>
      {pending ? null : (
        <PressableScale onPress={onReroll} disabled={busy} scaleTo={0.85} accessibilityLabel="Re-roll this picture" style={[styles.reroll, wide && { width: 24, height: 24, borderRadius: 12 }]}>
          <RotateCw size={11} color="#fff" strokeWidth={2.2} />
        </PressableScale>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  slot: { borderRadius: 10, overflow: "hidden", backgroundColor: "#12151a" },
  label: { color: MUTE, fontFamily: F.body, fontSize: 9.5, textAlign: "center" },
  // .reroll: a small dark round button in the corner
  reroll: { position: "absolute", right: 4, bottom: 4, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(4,7,13,0.75)" },
  delete: { color: MUTE, fontFamily: F.bodyMedium, fontSize: 12 },
});
