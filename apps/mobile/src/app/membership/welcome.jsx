// Welcome to Black (or Pro): the card arrives with what just switched on.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Calendar, ShoppingBag, Swords, Zap } from "lucide-react-native";
import { Button, C, F, Kicker, R, Row, S } from "@/components/ui";
import Celebrate from "@/components/profile/Celebrate";
import { PHOTOS } from "@/constants/photos";
import { PLANS } from "@/constants/plans";

const LIVE = {
  black: [
    { icon: Zap, label: "2x OUT is live" },
    { icon: ShoppingBag, label: "First pick on" },
    { icon: Calendar, label: "Black events" },
  ],
  pro: [
    { icon: Zap, label: "1.5x OUT is live" },
    { icon: ShoppingBag, label: "Drops an hour early" },
    { icon: Swords, label: "Unlimited battles" },
  ],
};

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { plan: raw } = useLocalSearchParams();
  const plan = raw === "pro" ? "pro" : "black";
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setBurst(1), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Image source={plan === "black" ? PHOTOS.blackhero : PHOTOS.hero} style={[StyleSheet.absoluteFill, { opacity: 0.45 }]} contentFit="cover" />
      <LinearGradient colors={["rgba(7,9,12,0.2)", "rgba(7,9,12,0.55)", C.bg]} locations={[0, 0.45, 0.8]} style={StyleSheet.absoluteFill} />
      <Animated.View entering={FadeInUp.duration(700).springify().damping(16)} style={[styles.card, { marginTop: insets.top + 70 }]}>
        <Image source={plan === "black" ? PHOTOS.blackcard : PHOTOS.procard} style={StyleSheet.absoluteFill} contentFit="cover" />
      </Animated.View>
      <View style={{ flex: 1 }} />
      <Animated.View entering={FadeInDown.delay(250).duration(500)} style={[styles.body, { paddingBottom: insets.bottom + S.xl }]}>
        <Kicker colour={C.accentHi}>Membership active</Kicker>
        <Text style={styles.h}>Welcome</Text>
        <Text style={styles.h}>
          to <Text style={{ color: C.accent }}>{PLANS[plan].name}</Text>
        </Text>
        <Row gap={S.sm} style={{ flexWrap: "wrap", marginTop: S.lg }}>
          {LIVE[plan].map(({ icon: Icon, label }) => (
            <Row key={label} gap={6} style={styles.chip}>
              <Icon size={14} color={C.accentHi} />
              <Text style={styles.chipText}>{label}</Text>
            </Row>
          ))}
        </Row>
        <Button title="See your first drop" size="lg" full style={{ marginTop: S.xl }} onPress={() => router.replace("/(tabs)/outside/drops")} />
        <Button title="Back to your profile" variant="ghost" full style={{ marginTop: S.sm }} onPress={() => router.replace("/(tabs)/profile")} />
      </Animated.View>
      <Celebrate burst={burst} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: "center", width: "82%", aspectRatio: 1, borderRadius: R.lg, overflow: "hidden", transform: [{ rotate: "-4deg" }], shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 30, shadowOffset: { width: 0, height: 20 } },
  body: { paddingHorizontal: S.gutter },
  h: { color: C.text, fontFamily: F.display, fontSize: 58, lineHeight: 58, textTransform: "uppercase" },
  chip: { height: 34, paddingHorizontal: 12, borderRadius: R.full, backgroundColor: "rgba(27,31,38,0.9)" },
  chipText: { color: C.text, fontFamily: F.bodySemi, fontSize: 12.5 },
});
