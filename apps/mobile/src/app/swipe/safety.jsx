// What strangers see on Swipe: your area, never your spot. Verified people
// only, block in one tap, or hide from Swipe completely.

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Crosshair, Lock } from "lucide-react-native";
import { engine, useEngineMutation, useMysterySettings, useProfile } from "@/data/hooks";
import { C, F, imageSource, R, Row, S } from "@/components/ui";
import { GlowHero, Toggle, TopBar } from "@/components/arena/OutsideKit";
import { tierLabel } from "@/utils/format";

const POINTS = [
  ["Your area, never your spot", "Strangers see your area name. Never where you are, never your routes."],
  ["Real movers, over 18", "Only people who've signed up and logged a run appear. Under 18s never see Swipe."],
  ["Block in one tap", "The block button on any card. They're never told, and they drop off your battles and picks."],
];

export default function SwipeSafety() {
  const insets = useSafeAreaInsets();
  const me = useProfile().data;
  const set = useMysterySettings().data;
  const toggle = useEngineMutation(engine.setShowOnSwipe, { success: (on) => (on ? "You're on Swipe" : "Hidden from Swipe") });
  const on = set?.showOnSwipe !== false;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <GlowHero height={130} kicker="Swipe to battle" top="What strangers" bottom="can see" />
        <View style={{ paddingHorizontal: S.gutter, gap: S.md, marginTop: S.md }}>
          <View style={styles.preview}>
            {me?.avatar ? <Image source={imageSource(me.avatar)} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
            <LinearGradient colors={["rgba(7,9,12,0)", "rgba(7,9,12,0.9)"]} locations={[0.3, 1]} style={StyleSheet.absoluteFill} />
            <View style={styles.about}>
              <Text style={styles.aboutText}>About here</Text>
            </View>
            <View style={{ padding: S.lg }}>
              <Text style={styles.name}>{(me?.name || "You").split(" ")[0]}</Text>
              <Text style={styles.small}>
                Level {me?.level ?? 1} · {tierLabel(me?.tier)}
              </Text>
              <Row gap={6} style={{ marginTop: 6 }}>
                <Crosshair size={12} color={C.accentHi} />
                <Text style={[styles.small, { color: C.accentHi }]}>{me?.area || me?.city || "Your area"}</Text>
              </Row>
            </View>
          </View>

          <View style={styles.card}>
            {POINTS.map(([t, d], i) => (
              <Row key={t} gap={S.md} style={[{ alignItems: "flex-start", paddingVertical: 10 }, i > 0 && styles.line]}>
                <View style={styles.tick}>
                  <Check size={12} color={C.accent} strokeWidth={3} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{t}</Text>
                  <Text style={styles.small}>{d}</Text>
                </View>
              </Row>
            ))}
          </View>

          <View style={[styles.card, on && styles.cardOn]}>
            <Row gap={S.md}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Show me on Swipe</Text>
                <Text style={styles.small}>Turn off and only friends and your club can challenge you.</Text>
              </View>
              <Toggle value={on} disabled={set?.minor || toggle.isPending} onChange={(v) => toggle.mutate(v)} label="Show me on Swipe" />
            </Row>
          </View>
          {set?.minor ? (
            <Row gap={S.sm}>
              <Lock size={14} color={C.textDim} />
              <Text style={[styles.small, { flex: 1 }]}>You're under 18, so strangers can't find you on Swipe and mystery challengers are off.</Text>
            </Row>
          ) : null}
        </View>
      </ScrollView>
      <TopBar />
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { height: 190, borderRadius: R.lg, overflow: "hidden", backgroundColor: C.surface, justifyContent: "flex-end", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.14)" },
  about: { position: "absolute", right: 16, top: 16, width: 76, height: 76, borderRadius: 38, borderWidth: 1.5, borderColor: "rgba(130,180,255,0.7)", backgroundColor: "rgba(61,139,255,0.18)", alignItems: "center", justifyContent: "center" },
  aboutText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 11 },
  name: { color: "#fff", fontFamily: F.display, fontSize: 28 },
  card: { padding: S.lg, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.1)" },
  cardOn: { backgroundColor: "rgba(61,139,255,0.1)", borderColor: "rgba(61,139,255,0.4)" },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  tick: { width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(61,139,255,0.18)", alignItems: "center", justifyContent: "center", marginTop: 1 },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
});
