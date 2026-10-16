// The reveal: both of you find out who at the same moment, only once you've
// both accepted. Then straight into the battle.

import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInLeft, FadeInRight } from "react-native-reanimated";
import { useBattle, useMysteryOffer, useProfile } from "@/data/hooks";
import { C, EmptyState, F, GlowButton, R, Row, S, Skeleton, VersusSplit } from "@/components/ui";
import { Chip, Facts, GlassCard } from "@/components/arena/BattleKit";
import { lengthWord, metricWord } from "@/data/outsideShared";
import { tierLabel, formatNumber } from "@/utils/format";
import { fighterPhoto } from "@/utils/fighter";

export default function Reveal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { offer: offerId } = useLocalSearchParams();
  const { data: offer, isPending } = useMysteryOffer(typeof offerId === "string" ? offerId : null);
  const battle = useBattle(offer?.battleId).data;
  const me = useProfile().data;
  const { height } = useWindowDimensions();

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
      {/* .r11rv: the two halves slide in from their edges and meet at a lit seam */}
      <VersusSplit
        height={height * 0.78}
        slant={0.16}
        vsSize={64}
        left={{ source: fighterPhoto(me, "vs").source, focus: { x: 0.5, y: 0.22 } }}
        right={{ source: fighterPhoto(offer.rival, "vsMirror").source, focus: { x: 0.5, y: 0.22 } }}
        fade="rgba(7,9,12,1)"
        fadeFrom={0.5}
      >
        <Text style={[styles.kick, { top: insets.top + 24 }]}>Challenger revealed</Text>
        <View style={styles.middle}>
          <Animated.View entering={FadeInLeft.duration(500).delay(300)} style={{ flex: 1 }}>
            <Text style={styles.name}>You</Text>
            <Text style={styles.small}>
              Level {offer.me.level} · {tierLabel(offer.me.tier)}
            </Text>
          </Animated.View>
          <Animated.View entering={FadeInRight.duration(500).delay(450)} style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={styles.name} numberOfLines={1}>
              {offer.rival.name.split(" ")[0]}
            </Text>
            <Text style={styles.small}>
              Level {offer.rival.level} · {tierLabel(offer.rival.tier)}
            </Text>
          </Animated.View>
        </View>
      </VersusSplit>
      <Animated.View entering={FadeInDown.delay(600).duration(500)} style={[styles.card, { bottom: insets.bottom + S.md }]}>
        <GlassCard>
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={styles.met}>{offer.rival.metBefore ? "You've met before" : "First time you've met"}</Text>
            {!offer.rival.metBefore ? <Chip tone="blue" label="New rival" /> : null}
          </Row>
          <Facts
            size={20}
            style={{ marginVertical: S.lg }}
            items={[
              { value: metricWord(offer.metric), label: "Battle on" },
              { value: lengthWord(offer.durationHours), label: endsLine || "Length" },
              { value: formatNumber((stake || 0) * 2 || 15), label: "OUT to the winner" },
            ]}
          />
          <GlowButton title="Let's go" size="lg" full onPress={() => router.replace(`/battles/${offer.battleId}`)} />
        </GlassCard>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  kick: { position: "absolute", left: 0, right: 0, textAlign: "center", color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" },
  middle: { position: "absolute", left: S.gutter, right: S.gutter, top: "44%", flexDirection: "row", alignItems: "flex-end" },
  name: { color: "#fff", fontFamily: F.display, fontSize: 40, lineHeight: 42, fontStyle: "italic", textTransform: "uppercase", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 16 },
  small: { color: C.textSoft, fontFamily: F.body, fontSize: 12 },
  card: { position: "absolute", left: S.md, right: S.md },
  met: { color: C.text, fontFamily: F.bodyMedium, fontSize: 14 },
});
