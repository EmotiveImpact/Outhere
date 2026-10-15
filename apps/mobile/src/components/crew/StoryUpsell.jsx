// What a Free member gets on tapping the + on their ring: posting stories is
// for Pro and Black members, and watching and reacting stays free.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Camera, Heart, Users } from "lucide-react-native";
import { Body, Button, C, F, Kicker, Row, S, Sheet } from "@/components/ui";

const PERKS = [
  { icon: Camera, title: "Your run on your photo", sub: "Distance, pace and route stuck on top" },
  { icon: Users, title: "Post to your club or everyone", sub: "Friends, My club or Everyone" },
  { icon: Heart, title: "Cheers and replies come back", sub: "Straight to your chat" },
];

export const PRO_PRICE = "£5.99";

export function StoryUpsellBody({ onUpgrade, onClose }) {
  return (
    <View>
      <Kicker style={{ marginTop: S.sm }}>Your story</Kicker>
      <Text style={styles.title}>
        Posting is for <Text style={{ color: C.accent }}>members</Text>
      </Text>
      <Body dim style={{ marginTop: S.sm }}>
        You can watch every story and react for free. Pro and Black members post their own, and each one is gone in 24 hours.
      </Body>
      <View style={{ marginTop: S.lg, gap: S.md }}>
        {PERKS.map(({ icon: Icon, title, sub }) => (
          <Row key={title} gap={S.md} style={{ alignItems: "flex-start" }}>
            <Icon size={18} color={C.accent} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.perk}>{title}</Text>
              <Body dim size={13}>
                {sub}
              </Body>
            </View>
          </Row>
        ))}
      </View>
      <Button title={`Go Pro · ${PRO_PRICE} a month`} size="lg" full onPress={onUpgrade} style={{ marginTop: S.xl }} />
      <Button title="Not now" variant="ghost" full onPress={onClose} style={{ marginTop: S.xs }} />
    </View>
  );
}

export default function StoryUpsell({ visible, onClose }) {
  const router = useRouter();
  return (
    <Sheet visible={visible} onClose={onClose}>
      <StoryUpsellBody
        onClose={onClose}
        onUpgrade={() => {
          onClose();
          router.push("/membership");
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: { color: C.text, fontFamily: F.display, fontSize: 38, lineHeight: 42, textTransform: "uppercase", marginTop: 6 },
  perk: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
});
