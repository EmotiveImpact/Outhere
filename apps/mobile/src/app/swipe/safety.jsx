// What strangers see on Swipe: your area, never your spot. Verified people
// only, block in one tap, or hide from Swipe completely.

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Crosshair, Lock } from "lucide-react-native";
import { engine, useEngineMutation, useMysterySettings, useProfile } from "@/data/hooks";
import { C, F, GlowBackdrop, IconTile, PhotoBackground, R, Row, S, Surface, imageSource } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
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
          {/* .r11safe: you, as a stranger sees you, on a lit photo card */}
          <Surface padding={null} radius={26} style={styles.preview} contentStyle={{ flex: 1, justifyContent: "flex-end" }}>
            <PhotoBackground source={imageSource(me?.avatar) || PHOTOS.fighterA} fade="card" focus={{ x: 0.5, y: 0.2 }} glow />
            <View style={styles.about}>
              <GlowBackdrop preset="orb" style={[StyleSheet.absoluteFill, { borderRadius: 44 }]} />
              <Text style={styles.aboutText}>About here</Text>
            </View>
            <View style={{ padding: S.lg }}>
              <Text style={styles.name}>{(me?.name || "You").split(" ")[0]}</Text>
              <Text style={styles.small}>
                Level {(typeof me?.level === "object" ? me.level?.level : me?.level) ?? 1} · {tierLabel(me?.tier)}
              </Text>
              <Row gap={6} style={{ marginTop: 6 }}>
                <Crosshair size={12} color={C.accentHi} />
                <Text style={[styles.small, { color: C.accentHi }]}>{me?.area || me?.city || "Your area"} · about 1 km</Text>
              </Row>
            </View>
          </Surface>

          <Surface padding={S.lg} contentStyle={{ paddingVertical: 6 }}>
            {POINTS.map(([t, d], i) => (
              <Row key={t} gap={S.md} style={[{ alignItems: "flex-start", paddingVertical: 10 }, i > 0 && styles.line]}>
                <IconTile icon={Check} size={26} radius={13} iconSize={13} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{t}</Text>
                  <Text style={styles.small}>{d}</Text>
                </View>
              </Row>
            ))}
          </Surface>

          <Surface tone={on ? "blue" : "lit"} padding={S.lg}>
            <Row gap={S.md}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Show me on Swipe</Text>
                <Text style={styles.small}>Turn off and only friends and your club can challenge you.</Text>
              </View>
              <Toggle value={on} disabled={set?.minor || toggle.isPending} onChange={(v) => toggle.mutate(v)} label="Show me on Swipe" />
            </Row>
          </Surface>
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
  preview: { height: 214 },
  about: { position: "absolute", right: 18, top: 18, width: 88, height: 88, borderRadius: 44, borderWidth: 1.5, borderColor: "rgba(130,180,255,0.75)", backgroundColor: "rgba(61,139,255,0.16)", alignItems: "center", justifyContent: "center", overflow: "hidden", boxShadow: "0 0 30px rgba(61,139,255,0.45)" },
  aboutText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 11 },
  name: { color: "#fff", fontFamily: F.display, fontSize: 34, lineHeight: 36, textTransform: "uppercase" },
  card: { padding: S.lg, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.1)" },
  cardOn: { backgroundColor: "rgba(61,139,255,0.1)", borderColor: "rgba(61,139,255,0.4)" },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  tick: { width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(61,139,255,0.18)", alignItems: "center", justifyContent: "center", marginTop: 1 },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
});
