// First screen for someone without a profile. One strong image, the brand, a
// live count from the city and one clear way in.

import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useOutsideNow } from "@/data/hooks";
import { Button, C, F, FadeIn, LiveDot, R, Row, S } from "@/components/ui";
import { formatNumber } from "@/utils/format";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const outside = useOutsideNow("London");

  const count = outside.data?.count;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: height * 0.72 }}>
        <Image source={require("../../assets/images/welcome_fomo_1.png")} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
      </View>
      <LinearGradient
        colors={["rgba(10,10,10,0.55)", "rgba(10,10,10,0.05)", "rgba(10,10,10,0.6)", C.bg]}
        locations={[0, 0.22, 0.5, 0.66]}
        style={StyleSheet.absoluteFill}
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
          <Text style={styles.headline}>
            Get out.{"\n"}Get counted.
          </Text>
          <Text style={styles.sub}>Every step banks XP. Climb your city's board, battle your mates and spend what you earn.</Text>
        </FadeIn>

        <FadeIn index={3}>
          <Button title="Get started" size="lg" full onPress={() => router.push("/onboarding")} style={{ marginTop: 32 }} />
          <Text style={styles.note}>Takes a minute. Everything stays on your phone.</Text>
        </FadeIn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { width: 10, height: 10, borderRadius: 3, backgroundColor: C.accent, transform: [{ rotate: "45deg" }] },
  wordmark: { color: C.text, fontFamily: F.display, fontSize: 17, letterSpacing: 5 },
  livePill: { height: 30, paddingHorizontal: 12, borderRadius: R.full, backgroundColor: "rgba(10,10,10,0.6)" },
  liveText: { color: C.text, fontSize: 13, fontWeight: "600" },
  headline: { color: C.text, fontFamily: F.display, fontSize: 56, lineHeight: 58, letterSpacing: -1.5 },
  sub: { color: C.textDim, fontSize: 16, lineHeight: 23, marginTop: S.lg },
  note: { color: C.textMute, fontSize: 13, textAlign: "center", marginTop: S.md },
});
