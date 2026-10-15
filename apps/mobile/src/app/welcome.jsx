// First screen for someone new. One big photo, the mark, a live count of
// who's out across the UK right now, one line and one action: slide to start.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { isRemote, useOutsideCount } from "@/data/hooks";
import { C, F, FadeIn, LiveDot, PressableScale, R, Row, S, SlideToStart, Wordmark } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { formatNumber } from "@/utils/format";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Signed out, so the whole UK.
  const outside = useOutsideCount(null);
  const count = outside.data?.count;
  const start = () => setTimeout(() => router.push("/onboarding"), 260);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <MotiView from={{ scale: 1.07 }} animate={{ scale: 1 }} transition={{ type: "timing", duration: 2600 }} style={StyleSheet.absoluteFill}>
        <Image source={PHOTOS.welcome11} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ left: "42%", top: "30%" }} transition={300} accessibilityLabel="A runner on the Southbank at sunrise" />
      </MotiView>
      <LinearGradient
        colors={["rgba(2,5,12,0.6)", "rgba(2,5,12,0)", "rgba(2,5,12,0)", "rgba(2,5,12,0.78)", "#02050c"]}
        locations={[0, 0.2, 0.42, 0.63, 0.82]}
        style={StyleSheet.absoluteFill}
      />

      <Row style={{ paddingTop: insets.top + S.md, paddingHorizontal: S.gutter, justifyContent: "space-between" }}>
        <Wordmark height={20} ink="#fff" sub="UK" animate />
      </Row>

      <View style={[styles.body, { paddingBottom: insets.bottom + S.xl }]}>
        <FadeIn delay={300}>
          <Row gap={8} style={styles.live}>
            <LiveDot size={7} />
            <Text style={styles.liveText}>
              <Text style={{ fontFamily: F.bodySemi }}>{count != null ? formatNumber(count) : "The UK"}</Text>
              {count != null ? " outside in the UK right now" : " is out right now"}
            </Text>
          </Row>
        </FadeIn>
        <FadeIn delay={420}>
          <Text style={styles.headline}>Walk. Run.</Text>
          <Text style={[styles.headline, { color: "#4b93ff" }]}>Earn your city.</Text>
          <Text style={styles.sub}>Every step turns into XP and OUT. Spend them on drops, battles and nights out across the city.</Text>
        </FadeIn>
        <FadeIn delay={560}>
          <SlideToStart label="Get out there" done="You're out" onComplete={start} style={{ marginTop: S.xl }} />
          {isRemote ? (
            <PressableScale onPress={() => router.push("/onboarding")} hitSlop={10} style={{ alignSelf: "center", marginTop: S.lg }}>
              <Text style={styles.signIn}>
                Already a member? <Text style={{ color: C.text, fontFamily: F.bodySemi }}>Sign in</Text>
              </Text>
            </PressableScale>
          ) : null}
        </FadeIn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#02050c", overflow: "hidden" },
  body: { flex: 1, justifyContent: "flex-end", paddingHorizontal: S.gutter, gap: 12 },
  live: { alignSelf: "flex-start", paddingVertical: 7, paddingLeft: 10, paddingRight: 12, borderRadius: R.full, backgroundColor: "rgba(10,16,28,0.55)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.14)", marginBottom: 4 },
  liveText: { color: "#fff", fontFamily: F.body, fontSize: 12 },
  headline: { color: "#fff", fontFamily: F.display, fontSize: 56, lineHeight: 54, textTransform: "uppercase", letterSpacing: 0.3 },
  sub: { color: "#c3cad6", fontFamily: F.body, fontSize: 14, lineHeight: 21, marginTop: S.md, maxWidth: 300 },
  signIn: { color: "#a3adbd", fontFamily: F.body, fontSize: 14 },
});
