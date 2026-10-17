// Here comes a new challenger: a random rival near your level. You see the
// level band, what you'd battle on, the length and the stake, never who.
// Accept or decline before the clock runs out.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInLeft } from "react-native-reanimated";
import { Clock3 } from "@/components/ui/icons";
import { engine, useEngineMutation, useMysteryOffer } from "@/data/hooks";
import { C, EmptyState, F, GlowButton, PhotoBackground, R, Row, S, Skeleton } from "@/components/ui";
import { GlassChip, TopBar } from "@/components/arena/OutsideKit";
import { Facts, GlassCard } from "@/components/arena/BattleKit";
import { useNow } from "@/components/arena/shared";
import { PHOTOS } from "@/constants/photos";
import { formatNumber } from "@/utils/format";
import { lengthWord, metricWord } from "@/data/outsideShared";

export default function Challenger() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { offer: offerId } = useLocalSearchParams();
  const { data: offer, isPending } = useMysteryOffer(typeof offerId === "string" ? offerId : null);
  const now = useNow(1000);
  const answer = useEngineMutation(engine.answerMystery, {
    onSuccess: (o) => {
      if (o.status === "revealed") router.replace(`/swipe/reveal?offer=${o.id}`);
    },
  });

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "flex-end", padding: S.gutter, paddingBottom: insets.bottom + S.xl }}>
        <Skeleton height={220} radius={R.xl} />
      </View>
    );
  }
  if (!offer) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 80 }}>
        <EmptyState title="No challenger right now" body="Switch mystery challengers on and one turns up when someone near your level is free." action="Mystery settings" onAction={() => router.replace("/swipe/mystery")} />
        <TopBar close />
      </View>
    );
  }

  const left = Math.max(0, offer.expiresAt - now);
  const mm = Math.floor(left / 60000);
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
  const open = offer.status === "open" && left > 0;
  const said = offer.myAnswer === true && offer.status === "closed";

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <PhotoBackground source={PHOTOS.challenger} fade={[[0, 0.45], [0.25, 0.1], [0.5, 0.15], [0.78, 0.9], [1, 1]]} kenBurns glow />
      <Animated.View entering={FadeInLeft.springify().damping(14)} style={[styles.banner, { top: insets.top + 80 }]}>
        <LinearGradient colors={["#2a6af0", "#5d9dff", "#2a6af0"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        <Text style={styles.bannerSmall}>Here comes a</Text>
        <Text style={styles.bannerBig}>New challenger</Text>
      </Animated.View>
      {open ? (
        <View style={{ position: "absolute", top: insets.top + 210, left: 0, right: 0, alignItems: "center" }}>
          <GlassChip icon={Clock3} label="Answer in" value={`${mm}:${ss}`} />
        </View>
      ) : null}

      <GlassCard style={[styles.card, { bottom: insets.bottom + S.md }]}>
        <Row gap={S.md}>
          <View style={styles.q}>
            <Text style={styles.qText}>?</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Someone in {offer.where || offer.whereCity}</Text>
            <Text style={styles.small}>Matched at random. You won't know who until you both say yes.</Text>
          </View>
        </Row>
        <Facts
          size={20}
          style={styles.stats}
          items={[
            { value: offer.levelLow === offer.levelHigh ? String(offer.levelLow) : `${offer.levelLow}–${offer.levelHigh}`, label: "Level" },
            { value: metricWord(offer.metric), label: "Battle on" },
            { value: lengthWord(offer.durationHours), label: "Length" },
            { value: offer.stakeOut ? formatNumber(offer.stakeOut) : "0", label: "OUT each" },
          ]}
        />
        {open ? (
          <Row gap={S.sm}>
            <GlowButton title="Decline" variant="quiet" size="lg" disabled={answer.isPending} onPress={() => answer.mutate([offer.id, false])} style={{ flex: 1 }} />
            <GlowButton title="Accept" size="lg" loading={answer.isPending} onPress={() => answer.mutate([offer.id, true])} style={{ flex: 1 }} />
          </Row>
        ) : offer.status === "revealed" ? (
          <GlowButton title="See who it is" size="lg" full onPress={() => router.replace(`/swipe/reveal?offer=${offer.id}`)} />
        ) : (
          <>
            <Text style={[styles.small, { textAlign: "center", marginBottom: S.md }]}>{said ? "They passed this time. No harm done." : offer.myAnswer === false ? "Declined. It never counts against you." : "Too late, that one's gone."}</Text>
            <GlowButton title="Done" variant="quiet" size="lg" full onPress={() => (router.canGoBack() ? router.back() : router.replace("/outside/arena"))} />
          </>
        )}
      </GlassCard>
      <TopBar close />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { position: "absolute", left: -20, right: -20, height: 86, justifyContent: "center", paddingLeft: 40, transform: [{ rotate: "-7deg" }], overflow: "hidden", boxShadow: "0 0 40px rgba(61,139,255,0.75), inset 0 1px 0 rgba(255,255,255,0.4)" },
  bannerSmall: { color: "#fff", fontFamily: F.bodySemi, fontSize: 13, letterSpacing: 2, textTransform: "uppercase" },
  bannerBig: { color: "#fff", fontFamily: F.display, fontSize: 36, lineHeight: 38, fontStyle: "italic", textTransform: "uppercase" },
  card: { position: "absolute", left: S.md, right: S.md },
  q: { width: 56, height: 56, borderRadius: 18, backgroundColor: "#0d1a33", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(130,180,255,0.55), inset 0 0 0 1.5px rgba(61,139,255,0.6), 0 0 22px -4px rgba(61,139,255,0.7)" },
  qText: { color: "#fff", fontFamily: F.display, fontSize: 26 },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 16 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 12, lineHeight: 16 },
  stats: { marginVertical: S.lg },
});
