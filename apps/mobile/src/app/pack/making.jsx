// Making the pack: the pictures arrive one by one as the screen polls. Any
// that fails a check is made again once for free, or refunded.

import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { usePackState } from "@/data/hooks";
import { Meter, imageSource } from "@/components/ui";
import { SLOTS } from "@/constants/pack";
import { PackButton, PackScreen, PackTitle, QuietCard, Spacer, packStyles } from "@/components/pack/PackKit";

export default function PackMaking() {
  const router = useRouter();
  const { data: state } = usePackState();
  // The grid shows the base pictures; Black's extra poses count in the bar.
  const all = state?.images || [];
  const images = all.filter((i) => i.name === i.slot);
  const shown = images.length || SLOTS.length;
  const total = all.length || SLOTS.length;
  const made = all.filter((i) => i.status === "ready").length;

  useEffect(() => {
    if (state?.status === "ready") router.replace("/pack/review");
    if (state?.status === "failed") router.replace("/pack/verified");
  }, [state?.status, router]);

  return (
    <PackScreen label="Making your pack">
      <PackTitle top="Lacing up" em={`${total} looks`} />
      <View style={styles.grid}>
        {Array.from({ length: shown }, (_, i) => {
          const img = images[i];
          return <Slot key={img?.name || i} url={img?.status === "ready" ? img.url : null} />;
        })}
      </View>
      <Meter value={made / total} size={6} />
      <View style={packStyles.row}>
        <Text style={packStyles.rowText}>Checking each image looks like you</Text>
        <Text style={packStyles.rowBold}>
          {made} of {total}
        </Text>
      </View>
      <Spacer />
      <QuietCard>
        <Text style={packStyles.small}>Usually under a minute. You can leave this screen; we'll send a notification when it's ready.</Text>
      </QuietCard>
      <PackButton title="Keep playing" variant="ghost" onPress={() => router.replace("/(tabs)")} />
    </PackScreen>
  );
}

/** .slot: a 9:16 tile, shimmering until its picture lands. */
function Slot({ url }) {
  const reduce = useReducedMotion();
  const pulse = useSharedValue(0.55);
  useEffect(() => {
    if (url || reduce) return;
    pulse.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [url, reduce, pulse]);
  const wait = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <View style={styles.slot}>
      {url ? <Image source={imageSource(url)} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ top: "20%", left: "50%" }} transition={350} /> : <Animated.View style={[StyleSheet.absoluteFill, styles.wait, wait]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  slot: { width: "23.4%", aspectRatio: 9 / 16, borderRadius: 10, overflow: "hidden", backgroundColor: "#12151a" },
  wait: { backgroundColor: "#16233b" },
});
