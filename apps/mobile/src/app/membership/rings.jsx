// What the rings mean: thin grey for Free, blue for Pro, gunmetal with a
// travelling light for Black, and the dot: blue while out, red once stopped.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useProfile } from "@/data/hooks";
import { Avatar, Button, C, Card, F, FadeIn, Row, S, Screen } from "@/components/ui";
import { Slab } from "@/components/profile/parts";
import { StackTabBar } from "@/components/AppTabBar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PHOTOS } from "@/constants/photos";

export default function RingKey() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: p } = useProfile();
  const photo = p?.avatar || PHOTOS.kemi;
  const rows = [
    { tier: "free", title: "Free", body: "A thin grey line. Just you, no fuss." },
    { tier: "pro", title: "Pro", body: "A blue ring with a soft glow." },
    { tier: "black", title: "Black", body: "Silver on gunmetal, with light that travels round it." },
    { tier: "pro", dot: "out", title: "Out now", body: "A blue dot on any ring means they're outside right now." },
    { tier: "free", dot: "stopped", title: "Just stopped", body: "It turns red when they stop, then fades after half an hour." },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
    <Screen padded={false} tab style={{ paddingTop: 0 }}>
      <Slab object={PHOTOS.blackcard} objectSize={230} objectStyle={{ right: -46, top: insets.top + 6 }} kicker="Membership" top="The ring" bottom="says it all" sub="Everyone sees your ring, wherever your photo shows up." height={250} />
      <View style={{ paddingHorizontal: S.gutter, paddingTop: 14 }}>
        <Card padding={0} style={{ paddingHorizontal: 14, paddingVertical: 4 }}>
          {rows.map((r, i) => (
            <FadeIn key={r.title} index={i}>
              <Row gap={16} style={[styles.row, i > 0 && styles.line]}>
                <Avatar uri={typeof photo === "string" ? photo : undefined} source={typeof photo === "string" ? undefined : photo} name={p?.name || "You"} tier={r.tier} dot={r.dot} size={52} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{r.title}</Text>
                  <Text style={styles.body}>{r.body}</Text>
                </View>
              </Row>
            </FadeIn>
          ))}
        </Card>
        <Button title="See the plans" variant="secondary" full style={{ marginTop: S.lg }} onPress={() => router.push("/membership")} />
      </View>
    </Screen>
    {/* The prototype draws the ring key with the tab bar, Profile lit. */}
    <StackTabBar current="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 12 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5 },
  body: { color: C.textDim, fontFamily: F.body, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
});
