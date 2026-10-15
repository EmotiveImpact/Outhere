// The reveal: both of you find out who at the same moment, only once you've
// both accepted. Then straight into the battle.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInLeft, FadeInRight, ZoomIn } from "react-native-reanimated";
import { useBattle, useMysteryOffer } from "@/data/hooks";
import { Button, C, EmptyState, F, R, Row, S, Skeleton } from "@/components/ui";
import { lengthWord, metricWord } from "@/data/outsideShared";
import { tierLabel, formatNumber } from "@/utils/format";

export default function Reveal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { offer: offerId } = useLocalSearchParams();
  const { data: offer, isPending } = useMysteryOffer(typeof offerId === "string" ? offerId : null);
  const battle = useBattle(offer?.battleId).data;

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "flex-end", padding: S.gutter, paddingBottom: insets.bottom + S.xl }}>
        <Skeleton height={180} radius={R.xl} />
      </View>
    );
  }
  if (!offer?.rival) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 80 }}>
        <EmptyState title="Not revealed yet" body="You both have to say yes first." action="Back" onAction={() => router.replace("/outside/arena")} />
      </View>
    );
  }

  const ends = battle?.endAt ? new Date(battle.endAt) : null;
  const endsLine = ends ? `Ends ${ends.toLocaleDateString("en-GB", { weekday: "short" })} ${ends.toLocaleTimeString("en-GB", { hour: "numeric", hour12: true }).replace(" ", "")}` : "";
  const stake = battle?.stakeOut ?? offer.stakeOut;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <LinearGradient colors={["rgba(42,106,240,0.6)", "#07090c", "#07090c", "rgba(160,32,40,0.6)"]} locations={[0, 0.38, 0.62, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      <Text style={[styles.kick, { top: insets.top + 24 }]}>Challenger revealed</Text>
      <View style={styles.middle}>
        <Animated.View entering={FadeInLeft.duration(500)} style={{ flex: 1 }}>
          <Text style={styles.name}>You</Text>
          <Text style={styles.small}>
            Level {offer.me.level} · {tierLabel(offer.me.tier)}
          </Text>
        </Animated.View>
        <Animated.Text entering={ZoomIn.delay(350).springify().damping(9)} style={styles.vs}>
          VS
        </Animated.Text>
        <Animated.View entering={FadeInRight.duration(500).delay(150)} style={{ flex: 1, alignItems: "flex-end" }}>
          <Text style={styles.name} numberOfLines={1}>
            {offer.rival.name.split(" ")[0]}
          </Text>
          <Text style={styles.small}>
            Level {offer.rival.level} · {tierLabel(offer.rival.tier)}
          </Text>
        </Animated.View>
      </View>
      <View style={[styles.card, { bottom: insets.bottom + S.lg }]}>
        <Row style={{ justifyContent: "space-between" }}>
          <Text style={styles.met}>{offer.rival.metBefore ? "You've met before" : "First time you've met"}</Text>
          {!offer.rival.metBefore ? (
            <View style={styles.newPill}>
              <Text style={styles.newText}>New rival</Text>
            </View>
          ) : null}
        </Row>
        <Row style={{ marginVertical: S.lg }}>
          {[
            [metricWord(offer.metric), "Battle on"],
            [lengthWord(offer.durationHours), endsLine || "Length"],
            [formatNumber((stake || 0) * 2 || 15), "OUT to the winner"],
          ].map(([v, l], i) => (
            <View key={i} style={[{ flex: 1, alignItems: "center" }, i > 0 && styles.cellLine]}>
              <Text style={styles.statValue}>{v}</Text>
              <Text style={styles.small}>{l}</Text>
            </View>
          ))}
        </Row>
        <Button title="Let's go" size="lg" full onPress={() => router.replace(`/battles/${offer.battleId}`)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kick: { position: "absolute", left: S.gutter, color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" },
  middle: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: S.gutter, paddingBottom: 160 },
  name: { color: "#fff", fontFamily: F.display, fontSize: 34, fontStyle: "italic", textTransform: "uppercase" },
  small: { color: C.textSoft, fontFamily: F.body, fontSize: 12 },
  vs: { color: "#fff", fontFamily: F.display, fontSize: 64, fontStyle: "italic", textShadowColor: "#3d8bff", textShadowRadius: 24, textShadowOffset: { width: 0, height: 0 }, marginHorizontal: S.sm, marginBottom: 60 },
  card: { position: "absolute", left: S.md, right: S.md, padding: S.lg, borderRadius: R.xl, backgroundColor: "rgba(18,21,26,0.97)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.14)" },
  met: { color: C.text, fontFamily: F.bodyMedium, fontSize: 14 },
  newPill: { paddingHorizontal: 14, height: 32, borderRadius: R.full, backgroundColor: "rgba(61,139,255,0.3)", justifyContent: "center" },
  newText: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 13 },
  cellLine: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: C.border },
  statValue: { color: C.text, fontFamily: F.display, fontSize: 20 },
});
