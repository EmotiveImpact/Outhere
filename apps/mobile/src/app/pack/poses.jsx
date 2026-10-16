// Your poses: pick the race, win and respect pose the game shows. Pro gets the
// first of each; Black picks from all four and gets new ones each season, so
// Free and Pro can see what they're missing.

import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { engine, useEngineMutation, usePackCredits, usePackState } from "@/data/hooks";
import { F, PressableScale, imageSource } from "@/components/ui";
import { POSE_SETS, poseAllowed } from "@/constants/pack";
import { PACK_SAMPLES } from "@/constants/photos";
import { INK, MUTE, OUT, PackButton, PackScreen, PackTitle, Spacer, Sub } from "@/components/pack/PackKit";

// What a pose looks like before it's yours: the bundled samples, as in the mock.
const PREVIEW = {
  "race-sprint": { source: PACK_SAMPLES.stride },
  "race-nightRun": { source: PACK_SAMPLES.stride, focus: 0.1 },
  "race-hoodUp": { source: PACK_SAMPLES.rooftop, focus: 0.75 },
  "race-finishLean": { source: PACK_SAMPLES.stride, flip: true },
  "win-fistUp": { source: PACK_SAMPLES.win },
  "win-roar": { source: PACK_SAMPLES.win, flip: true },
  "win-crown": { source: PACK_SAMPLES.rooftop, flip: true, focus: 0.75 },
  "win-pointUp": { source: PACK_SAMPLES.win, focus: 0.04 },
  "respect-nod": { source: PACK_SAMPLES.respect },
  "respect-fistBump": { source: PACK_SAMPLES.respectFist },
  "respect-handOnHeart": { source: PACK_SAMPLES.respectHeart },
  "respect-slowClap": { source: PACK_SAMPLES.respectClap },
};

const EXTRA_POSES = POSE_SETS.reduce((n, s) => n + s.poses.length - 1, 0);

export default function PackPoses() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { data: state } = usePackState();
  const { data: credits } = usePackCredits();
  const pick = useEngineMutation(engine.setPackPose);
  const tier = credits?.tier || "free";
  const tile = Math.floor((Math.min(width, 520) - 36 - 18) / 4);
  const winPic = state?.fighter?.win;

  return (
    <PackScreen label="Your poses" gap={8} scroll bg={winPic ? imageSource(winPic) : PACK_SAMPLES.win} bgFocus={0.18} bgOpacity={0.4}>
      <Spacer />
      <PackTitle top="Strike a" em="pose" size={30} />
      <Sub>Each moment in the game shows the pose you pick.</Sub>
      {POSE_SETS.map((set) => (
        <View key={set.key} style={{ gap: 8, marginTop: 2 }}>
          <View style={styles.prow}>
            <Text style={styles.prowTitle}>{set.label}</Text>
            <Text style={styles.prowUse}>{set.use}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {set.poses.map((pose) => {
              const own = (state?.images || []).find((i) => i.set === set.key && i.pose === pose.key && i.url);
              const preview = PREVIEW[`${set.key}-${pose.key}`] || {};
              const allowed = poseAllowed(tier, set.key, pose.key);
              const on = allowed && (state?.picks?.[set.key] || set.poses[0].key) === pose.key;
              return (
                <PressableScale
                  key={pose.key}
                  onPress={() => (allowed ? !on && pick.mutate({ set: set.key, pose: pose.key }) : router.push("/membership"))}
                  scaleTo={0.94}
                  accessibilityLabel={`${set.label}: ${pose.label}${allowed ? "" : ", comes with Black"}`}
                  accessibilityState={{ selected: on }}
                  style={{ width: tile, gap: 4 }}
                >
                  <View style={[styles.pose, { width: tile, height: tile }, on && styles.poseOn, !allowed && styles.poseLock]}>
                    <Image
                      source={own ? imageSource(own.url) : preview.source}
                      style={[StyleSheet.absoluteFill, !own && preview.flip && { transform: [{ scaleX: -1 }] }]}
                      contentFit="cover"
                      contentPosition={{ top: `${(preview.focus ?? 0.18) * 100}%`, left: "50%" }}
                      blurRadius={allowed ? 0 : 1}
                    />
                    {allowed ? null : <View style={[StyleSheet.absoluteFill, styles.dim]} />}
                  </View>
                  {allowed ? null : (
                    <View style={styles.chip}>
                      <Text style={styles.chipText}>BLACK</Text>
                    </View>
                  )}
                  <Text style={[styles.poseLabel, on && { color: INK }]} numberOfLines={1}>
                    {pose.label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </View>
      ))}
      {tier === "black" ? (
        <PackButton title="Done" onPress={() => router.replace("/(tabs)/profile")} style={{ marginTop: 6 }} />
      ) : (
        <PackButton title={`Unlock ${EXTRA_POSES} more poses with Black`} variant="black" onPress={() => router.push("/membership")} style={{ marginTop: 6 }} />
      )}
    </PackScreen>
  );
}

const styles = StyleSheet.create({
  prow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
  prowTitle: { color: INK, fontFamily: F.displayMedium, fontSize: 15, letterSpacing: 0.6, textTransform: "uppercase" },
  prowUse: { flexShrink: 1, color: MUTE, fontFamily: F.body, fontSize: 9.5, textAlign: "right" },
  pose: { borderRadius: 10, overflow: "hidden", backgroundColor: "#12151a" },
  poseOn: { borderWidth: 2, borderColor: OUT, boxShadow: "0 0 14px rgba(79,155,255,0.6)" },
  poseLock: { borderWidth: 1, borderColor: "rgba(200,210,230,0.35)" },
  // saturate(.4) brightness(.55): a grey wash over a locked pose
  dim: { backgroundColor: "rgba(10,12,16,0.5)" },
  chip: { position: "absolute", top: 4, alignSelf: "center", paddingVertical: 2, paddingHorizontal: 5, borderRadius: 99, backgroundColor: "#d9dde5" },
  chipText: { color: "#0b0d12", fontFamily: F.bodySemi, fontSize: 7.5, letterSpacing: 0.6 },
  poseLabel: { color: MUTE, fontFamily: F.body, fontSize: 9.5, textAlign: "center" },
});
