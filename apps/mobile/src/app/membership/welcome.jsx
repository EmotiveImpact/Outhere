// Welcome to Black (or Pro): the card arrives with what just switched on.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Calendar, ShoppingBag, Swords, Zap } from "lucide-react-native";
import { BlendImage, Button, C, F, Kicker, PhotoBackground, R, Row, S } from "@/components/ui";
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
      {/* .hero: the photo at full strength, faded into the floor from the middle down */}
      <PhotoBackground source={plan === "black" ? PHOTOS.blackhero : PHOTOS.hero} fade={[[0, 0.6], [0.2, 0], [0.42, 0], [0.63, 0.78], [0.82, 1], [1, 1]]} to="2,5,12" focus={{ x: 0.5, y: 0.2 }} kenBurns />
      {/* .welcome-card: the card itself, its black dropped out so it floats over the photo */}
      <Animated.View entering={FadeInUp.duration(700).springify().damping(16)} style={[styles.card, { top: insets.top + 118 }]}>
        <BlendImage source={plan === "black" ? PHOTOS.blackcard : PHOTOS.procard} size={300} mask="wide" float glow={220} />
      </Animated.View>
      <View style={{ flex: 1 }} />
      <Animated.View entering={FadeInDown.delay(250).duration(500)} style={[styles.body, { paddingBottom: insets.bottom + S.md }]}>
        <Kicker colour={C.accentHi}>Membership active</Kicker>
        <Text style={styles.h}>Welcome</Text>
        <Text style={styles.h}>
          to <Text style={{ color: C.accent }}>{PLANS[plan].name}</Text>
        </Text>
        <Row gap={6} style={{ flexWrap: "wrap", marginTop: 12 }}>
          {LIVE[plan].map(({ icon: Icon, label }) => (
            <Row key={label} gap={6} style={styles.chip}>
              <Icon size={12} color={C.accentHi} />
              <Text style={styles.chipText}>{label}</Text>
            </Row>
          ))}
        </Row>
        <Button title="See your first drop" size="lg" full style={{ marginTop: 14 }} onPress={() => router.replace("/(tabs)/outside/drops")} />
        <Button title="Back to your profile" variant="ghost" size="sm" full style={{ marginTop: 4 }} onPress={() => router.replace("/(tabs)/profile")} />
      </Animated.View>
      <Celebrate burst={burst} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { position: "absolute", alignSelf: "center", width: 300, height: 300 },
  body: { paddingHorizontal: S.gutter },
  h: { color: C.text, fontFamily: F.display, fontSize: 50, lineHeight: 49, textTransform: "uppercase" },
  // .chips6.gl2: frosted glass over the photo
  chip: { height: 28, paddingHorizontal: 10, borderRadius: R.full, backgroundColor: "rgba(255,255,255,0.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 0 0 1px rgba(255,255,255,0.06)" },
  chipText: { color: C.text, fontFamily: F.bodySemi, fontSize: 11 },
});
