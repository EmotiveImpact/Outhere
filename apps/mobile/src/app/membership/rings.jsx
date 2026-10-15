// What the rings mean: thin grey for Free, blue for Pro, gunmetal with a
// travelling light for Black, and the dot: blue while out, red once stopped.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useProfile } from "@/data/hooks";
import { Avatar, Button, C, Card, F, FadeIn, Row, S, Screen } from "@/components/ui";
import { Slab } from "@/components/profile/parts";
import { PHOTOS } from "@/constants/photos";

export default function RingKey() {
  const router = useRouter();
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
    <Screen padded={false} style={{ paddingTop: 0 }}>
      <Slab object={PHOTOS.blackcard} kicker="Membership" top="The ring" bottom="says it all" sub="Everyone sees your ring, wherever your photo shows up." height={280} />
      <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg }}>
        <Card padding={0} style={{ paddingHorizontal: S.lg, paddingVertical: S.sm }}>
          {rows.map((r, i) => (
            <FadeIn key={r.title} index={i}>
              <Row gap={S.lg} style={[styles.row, i > 0 && styles.line]}>
                <Avatar uri={typeof photo === "string" ? photo : undefined} source={typeof photo === "string" ? undefined : photo} name={p?.name || "You"} tier={r.tier} dot={r.dot} size={56} />
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
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: S.md },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  body: { color: C.textDim, fontFamily: F.body, fontSize: 13, lineHeight: 18, marginTop: 2 },
});
