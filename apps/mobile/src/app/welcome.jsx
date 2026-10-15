// First screen for someone new. It opens on the launch (the open O draws
// itself in, the dot springs into the gap, OUTHERE, GET OUTSIDE and how many
// are out), then the launch lifts away: the mark flies up into the corner,
// the photo settles in behind and the line, the live count and the slider
// rise into place. One big photo, one line and one action: slide to start.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { Easing, useReducedMotion } from "react-native-reanimated";
import { MoreHorizontal } from "lucide-react-native";
import { isRemote, useOutsideCount } from "@/data/hooks";
import { C, F, FadeIn, LiveDot, PressableScale, R, Row, S, SlideToStart, Wordmark, useScreenTop } from "@/components/ui";
import { LAUNCH, LaunchStage } from "@/components/ui/LaunchScreen";
import { PHOTOS } from "@/constants/photos";
import { formatNumber } from "@/utils/format";

// The launch plays once per app session; coming back to this page skips it.
let launched = false;
const SMALL = 25; // the mark beside OUTHERE (Wordmark height 20)

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const reduce = useReducedMotion();
  // .w-top: padding 24px 20px round a 38px row; the first control sits 24 down.
  const top = useScreenTop(2);
  // Signed out, so the whole UK.
  const outside = useOutsideCount(null);
  const count = outside.data?.count;
  const start = () => setTimeout(() => router.push("/onboarding"), 260);

  const [intro] = useState(() => !launched && !reduce);
  const [phase, setPhase] = useState(intro ? "on" : "gone");
  useEffect(() => {
    launched = true;
    if (!intro) return undefined;
    const lift = setTimeout(() => setPhase("lifting"), LAUNCH.show);
    const gone = setTimeout(() => setPhase("gone"), LAUNCH.show + LAUNCH.lift + 80);
    return () => {
      clearTimeout(lift);
      clearTimeout(gone);
    };
  }, [intro]);
  // Everything on the page waits for the launch to lift.
  const wait = intro ? LAUNCH.show + 200 : 0;
  const shown = phase !== "on";

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <MotiView
        from={{ scale: 1.07, opacity: intro ? 0 : 1 }}
        animate={shown ? { scale: 1, opacity: 1 } : { scale: 1.07, opacity: 0 }}
        transition={{ type: "timing", duration: 2600, easing: Easing.bezier(0.2, 0.6, 0.2, 1), opacity: { type: "timing", duration: 700 } }}
        style={StyleSheet.absoluteFill}
      >
        <Image source={PHOTOS.welcome11} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ left: "42%", top: "30%" }} transition={300} accessibilityLabel="A runner on the Southbank at sunrise" />
      </MotiView>
      {/* .hero::after */}
      <LinearGradient
        colors={["rgba(2,5,12,0.6)", "rgba(2,5,12,0)", "rgba(2,5,12,0)", "rgba(2,5,12,0.78)", "#02050c"]}
        locations={[0, 0.2, 0.42, 0.63, 0.82]}
        style={StyleSheet.absoluteFill}
      />

      <Row style={[styles.top, { paddingTop: top }]}>
        <MotiView from={{ opacity: intro ? 0 : 1 }} animate={{ opacity: shown ? 1 : 0 }} transition={{ type: "timing", duration: 260, delay: intro ? LAUNCH.lift - 180 : 0 }}>
          <Wordmark height={20} ink="#fff" sub="UK" />
        </MotiView>
        <FadeIn delay={wait + 120}>
          <PressableScale onPress={() => router.push("/onboarding")} scaleTo={0.9} hitSlop={8} style={styles.round} accessibilityLabel="Already a member? Sign in">
            <View>
              <MoreHorizontal size={18} color="#fff" />
            </View>
          </PressableScale>
        </FadeIn>
      </Row>

      <View style={[styles.body, { paddingBottom: insets.bottom + 34 }]}>
        {shown ? (
          <>
            <FadeIn delay={intro ? 200 : 300}>
              <Row gap={8} style={styles.live}>
                <LiveDot size={7} />
                <Text style={styles.liveText}>
                  <Text style={{ fontFamily: F.bodySemi }}>{count != null ? formatNumber(count) : "The UK"}</Text>
                  {count != null ? " outside in the UK right now" : " is out right now"}
                </Text>
              </Row>
            </FadeIn>
            <FadeIn delay={intro ? 320 : 420}>
              <Text style={styles.headline}>Walk. Run.</Text>
              <Text style={[styles.headline, styles.blue]}>Earn your city.</Text>
              <Text style={styles.sub}>Every step turns into XP and OUT. Spend them on drops, battles and nights out across the city.</Text>
            </FadeIn>
            <FadeIn delay={intro ? 440 : 560}>
              <SlideToStart label="Get out there" done="You're out" onComplete={start} style={{ marginTop: 14 }} />
              {isRemote ? (
                <PressableScale onPress={() => router.push("/onboarding")} hitSlop={10} style={{ alignSelf: "center", marginTop: S.lg }}>
                  <Text style={styles.signIn}>
                    Already a member? <Text style={{ color: C.text, fontFamily: F.bodySemi }}>Sign in</Text>
                  </Text>
                </PressableScale>
              ) : null}
            </FadeIn>
          </>
        ) : null}
      </View>

      {phase !== "gone" ? <LaunchStage count={count} lifting={phase !== "on"} to={{ x: 20, y: top + (38 - SMALL) / 2, size: SMALL }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#02050c", overflow: "hidden" },
  top: { paddingHorizontal: 20, justifyContent: "space-between", minHeight: 38 },
  round: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(10,14,20,0.45)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" },
  body: { flex: 1, justifyContent: "flex-end", paddingHorizontal: 20, gap: 12 },
  live: { alignSelf: "flex-start", paddingVertical: 7, paddingLeft: 10, paddingRight: 12, borderRadius: R.full, backgroundColor: "rgba(10,16,28,0.5)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)", marginBottom: 4 },
  liveText: { color: "#fff", fontFamily: F.bodyMedium, fontSize: 11.5 },
  headline: { color: "#fff", fontFamily: F.display, fontSize: 54, lineHeight: 52, textTransform: "uppercase", letterSpacing: 0.3 },
  blue: { color: "#4b93ff", textShadowColor: "rgba(61,139,255,0.35)", textShadowRadius: 28, textShadowOffset: { width: 0, height: 0 } },
  sub: { color: "#c3cad6", fontFamily: F.body, fontSize: 13.5, lineHeight: 20, marginTop: 12, maxWidth: 290 },
  signIn: { color: "#a3adbd", fontFamily: F.body, fontSize: 14 },
});
