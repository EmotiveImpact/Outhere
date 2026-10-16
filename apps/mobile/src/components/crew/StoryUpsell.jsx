// What a Free member gets on tapping the + on their ring: posting stories is
// for Pro and Black members, and watching and reacting stays free. It rises
// over a darker scrim than the usual sheet (.r11up), so the feed behind falls
// right back.

import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { Camera, Heart, Users } from "lucide-react-native";
import { Button, C, F, IconTile, ModalToastHost, Row, S } from "@/components/ui";

const PERKS = [
  { icon: Camera, title: "Your run on your photo", sub: "Distance, pace and route stuck on top" },
  { icon: Users, title: "Post to your club or everyone", sub: "Friends, My club or Everyone" },
  { icon: Heart, title: "Cheers and replies come back", sub: "Straight to your chat" },
];

export const PRO_PRICE = "£5.99";

export function StoryUpsellBody({ onUpgrade, onClose }) {
  return (
    <View>
      <Text style={styles.kick}>Your story</Text>
      <Text style={styles.title}>
        Posting is for <Text style={styles.blue}>members</Text>
      </Text>
      <Text style={styles.body}>You can watch every story and react for free. Pro and Black members post their own, and each one is gone in 24 hours.</Text>
      <View style={{ marginTop: 16, gap: 12 }}>
        {PERKS.map(({ icon, title, sub }) => (
          <Row key={title} gap={12}>
            <IconTile icon={icon} tone="blue" size={34} iconSize={16} />
            <View style={{ flex: 1 }}>
              <Text style={styles.perk}>{title}</Text>
              <Text style={styles.perkSub}>{sub}</Text>
            </View>
          </Row>
        ))}
      </View>
      <Button title={`Go Pro · ${PRO_PRICE} a month`} full onPress={onUpgrade} style={{ marginTop: 22 }} />
      <Button title="Not now" variant="ghost" size="sm" full onPress={onClose} style={{ marginTop: 6 }} />
    </View>
  );
}

export default function StoryUpsell({ visible, onClose }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {visible ? (
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(160)} style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(2,3,6,0.82)" }]}>
            <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
          </Animated.View>
          <Animated.View entering={SlideInDown.springify().damping(20).stiffness(220)} exiting={SlideOutDown.duration(200)} style={styles.sheet}>
            <LinearGradient colors={["#10141c", "#07090c"]} locations={[0, 0.6]} style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 28, borderTopRightRadius: 28 }]} />
            <View style={styles.handle} />
            <View style={{ paddingHorizontal: 22, paddingBottom: insets.bottom + 18 }}>
              <StoryUpsellBody
                onClose={onClose}
                onUpgrade={() => {
                  onClose();
                  router.push("/membership");
                }}
              />
            </View>
          </Animated.View>
        </View>
      ) : null}
      {visible ? <ModalToastHost /> : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 -20px 50px -10px rgba(0,0,0,0.8)" },
  handle: { alignSelf: "center", width: 38, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", marginTop: 10, marginBottom: 14 },
  kick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 10.5, letterSpacing: 1.7, textTransform: "uppercase", marginTop: S.xs },
  title: { color: C.text, fontFamily: F.display, fontSize: 34, lineHeight: 36, textTransform: "uppercase", marginTop: 8 },
  blue: { color: C.accent, textShadowColor: "rgba(61,139,255,0.45)", textShadowRadius: 24, textShadowOffset: { width: 0, height: 0 } },
  body: { color: C.textDim, fontFamily: F.body, fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  perk: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  perkSub: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: 1 },
});
