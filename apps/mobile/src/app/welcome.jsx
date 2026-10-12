// First screen for someone without a profile. One strong image that drifts
// slowly, the brand, a live count from the city and one clear way in.

import React, { useEffect } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { Footprints, Gift, Swords } from "lucide-react-native";
import { useOutsideNow } from "@/data/hooks";
import { Button, C, F, FadeIn, LiveDot, R, Row, S } from "@/components/ui";
import { formatNumber } from "@/utils/format";

const POINTS = [
  { icon: Footprints, title: "Walk to earn", tint: C.accent },
  { icon: Swords, title: "Battle your people", tint: C.fire },
  { icon: Gift, title: "Unlock rewards", tint: C.gold },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const outside = useOutsideNow("London");

  // Slow Ken Burns drift on the photo.
  const drift = useSharedValue(0);
  useEffect(() => {
    drift.value = withRepeat(withTiming(1, { duration: 14000, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [drift]);
  const photoStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1.04 + drift.value * 0.06 }, { translateY: drift.value * -10 }] }));

  const count = outside.data?.count;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, height: height * 0.7 }, photoStyle]}>
        <Image source={require("../../assets/images/welcome_fomo_1.png")} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
      </Animated.View>
      <LinearGradient
        colors={["rgba(10,10,10,0.55)", "rgba(10,10,10,0.05)", "rgba(10,10,10,0.6)", C.bg]}
        locations={[0, 0.22, 0.5, 0.66]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(0,255,127,0)", "rgba(0,255,127,0.10)", "rgba(0,255,127,0)"]}
        locations={[0.35, 0.58, 0.8]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <Row style={{ paddingTop: insets.top + S.md, paddingHorizontal: S.gutter, justifyContent: "space-between" }}>
        <Row gap={6}>
          <View style={styles.mark} />
          <Text style={styles.wordmark}>OUTHERE</Text>
        </Row>
        {count ? (
          <FadeIn delay={500}>
            <Row gap={8} style={styles.livePill}>
              <LiveDot size={7} />
              <Text style={styles.liveText}>{formatNumber(count)} out in London</Text>
            </Row>
          </FadeIn>
        ) : null}
      </Row>

      <View style={{ flex: 1, justifyContent: "flex-end", paddingHorizontal: S.gutter, paddingBottom: insets.bottom + S.lg }}>
        <FadeIn>
          <Text style={styles.kicker}>THE STEP GAME FOR YOUR CITY</Text>
          <Text style={styles.headline}>
            Get out.{"\n"}
            <Text style={{ color: C.accent }}>Get counted.</Text>
          </Text>
          <Text style={styles.sub}>Every step banks XP. Climb your city's board, battle your mates and spend what you earn.</Text>
        </FadeIn>

        <Row gap={S.sm} style={{ marginTop: S.xl }}>
          {POINTS.map(({ icon: Icon, title, tint }, i) => (
            <FadeIn key={title} index={i + 2} style={{ flex: 1 }}>
              <View style={styles.point}>
                <View style={[styles.pointIcon, { backgroundColor: `${tint}1f` }]}>
                  <Icon size={16} color={tint} />
                </View>
                <Text style={styles.pointText} numberOfLines={2}>{title}</Text>
              </View>
            </FadeIn>
          ))}
        </Row>

        <FadeIn index={6}>
          <Button title="Get started" size="lg" full onPress={() => router.push("/onboarding")} style={{ marginTop: S.xl }} />
          <Text style={styles.note}>Takes a minute. Everything stays on your phone for now.</Text>
        </FadeIn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { width: 10, height: 10, borderRadius: 3, backgroundColor: C.accent, transform: [{ rotate: "45deg" }] },
  wordmark: { color: C.text, fontFamily: F.display, fontSize: 17, letterSpacing: 5 },
  livePill: { height: 30, paddingHorizontal: 12, borderRadius: R.full, backgroundColor: "rgba(10,10,10,0.6)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  liveText: { color: C.text, fontSize: 12, fontWeight: "700" },
  kicker: { color: C.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1.8, marginBottom: S.sm },
  headline: { color: C.text, fontFamily: F.display, fontSize: 56, lineHeight: 56, letterSpacing: -1.5 },
  sub: { color: C.textDim, fontSize: 16, lineHeight: 23, marginTop: S.md },
  point: { height: 86, borderRadius: R.md + 2, padding: S.md, backgroundColor: "rgba(20,20,22,0.85)", borderWidth: 1, borderColor: C.border, justifyContent: "space-between" },
  pointIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  pointText: { color: C.text, fontSize: 13, fontWeight: "700", lineHeight: 17 },
  note: { color: C.textMute, fontSize: 12, textAlign: "center", marginTop: S.md },
});
