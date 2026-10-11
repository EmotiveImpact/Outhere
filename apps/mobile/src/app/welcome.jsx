// First screen for someone without a profile. One strong image, the brand and
// three short reasons to get going.

import React from "react";
import { View, Text, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { Footprints, Gift, Swords } from "lucide-react-native";
import { Body, Button, C, F, Row, S } from "@/components/ui";

const { height } = Dimensions.get("window");

const POINTS = [
  { icon: Footprints, title: "Walk to earn", body: "Every step banks XP and OUT." },
  { icon: Swords, title: "Battle your people", body: "Take on friends and your crew." },
  { icon: Gift, title: "Unlock the good stuff", body: "Events, drops and partner rewards." },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      <Image
        source={require("../../assets/images/welcome_fomo_1.png")}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: height * 0.66 }}
        contentFit="cover"
        transition={300}
      />
      <LinearGradient
        colors={["rgba(10,10,10,0.35)", "rgba(10,10,10,0.2)", "rgba(10,10,10,0.85)", C.bg]}
        locations={[0, 0.3, 0.55, 0.68]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <View style={{ paddingTop: insets.top + S.lg, alignItems: "center" }}>
        <Text style={{ color: C.text, fontFamily: F.display, fontSize: 18, letterSpacing: 6 }}>OUTHERE</Text>
      </View>

      <View style={{ flex: 1, justifyContent: "flex-end", paddingHorizontal: S.gutter, paddingBottom: insets.bottom + S.xl }}>
        <MotiView from={{ opacity: 0, translateY: 16 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 500 }}>
          <Text style={{ color: C.text, fontFamily: F.display, fontSize: 44, lineHeight: 46, letterSpacing: -0.8 }}>
            Get out.{"\n"}
            <Text style={{ color: C.accent }}>Get counted.</Text>
          </Text>
          <Body dim size={16} style={{ marginTop: S.md }}>
            The step game for your city. Move more, climb the board, and get rewarded for it.
          </Body>
        </MotiView>

        <View style={{ marginTop: S.xxl, gap: S.lg }}>
          {POINTS.map(({ icon: Icon, title, body }, i) => (
            <MotiView
              key={title}
              from={{ opacity: 0, translateX: -12 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: "timing", duration: 400, delay: 200 + i * 120 }}
            >
              <Row gap={S.md}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center" }}>
                  <Icon size={19} color={C.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontFamily: F.displayMedium, fontSize: 16 }}>{title}</Text>
                  <Body dim size={13}>{body}</Body>
                </View>
              </Row>
            </MotiView>
          ))}
        </View>

        <Button title="Get started" size="lg" full onPress={() => router.push("/onboarding")} style={{ marginTop: S.xxl + S.sm }} />
        <Body mute size={12} style={{ textAlign: "center", marginTop: S.md }}>
          Takes about a minute. Everything stays on your phone for now.
        </Body>
      </View>
    </View>
  );
}
