// Swipe to battle: fair matches as a stack of cards. Drag the top card right
// to pick them, left to pass, or use the buttons. Picks wait on the next
// screen for you to choose one and set the battle up. The card's edge is
// their membership ring. Under 18s don't see Swipe at all (the server checks
// is_minor and hands back an empty deck).

import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { Ban, Crosshair, Layers, ShieldCheck, Swords, X, Zap } from "lucide-react-native";
import { Chip, NoPhoto, RoundAction } from "@/components/arena/BattleKit";
import { engine, useCityLeague, useEngineMutation, useMysterySettings, usePicks, usePlaySide, useProfile, useSwipeDeck } from "@/data/hooks";
import { C, EmptyState, F, imageSource, R, Row, S, Segment, Skeleton } from "@/components/ui";
import { GlassButton, GlassChip, GlowHero, TopBar } from "@/components/arena/OutsideKit";
import { compactNumber, formatNumber } from "@/utils/format";
import { divisionName } from "@/data/outsideShared";
import { haptic } from "@/services/haptics";

const RING = { pro: "#3d8bff", black: "#8d97a5", free: "rgba(255,255,255,0.18)" };
const FLING = 420;
// The prototype's card is 256 x 346 on a 340 phone: slimmer than the screen.
const CARD_W = 294;
const CARD_H = 400;

export function RivalStats({ card }) {
  const pct = card.played ? Math.round((card.wins / card.played) * 100) : 0;
  return (
    <Row gap={S.sm} style={{ marginTop: S.md }}>
      {[
        [compactNumber(card.avgSteps), "Daily avg"],
        [`${pct}%`, "Wins"],
        [String(card.level), "Level"],
      ].map(([v, l]) => (
        <View key={l} style={styles.stat}>
          <Text style={styles.statValue}>{v}</Text>
          <Text style={styles.statLabel}>{l}</Text>
        </View>
      ))}
    </Row>
  );
}

function CardFace({ card }) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={[styles.card, { borderColor: RING[card.tier] || RING.free }, card.tier === "pro" && styles.cardGlow]}>
      {card.avatar && !failed ? <Image source={imageSource(card.avatar)} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ top: "18%", left: "50%" }} transition={150} onError={() => setFailed(true)} /> : <NoPhoto side="left" name={card.name} size={150} />}
      {/* the side light and the floor, as on the prototype's .r10card */}
      <LinearGradient colors={["rgba(42,106,240,0.28)", "rgba(42,106,240,0)"]} start={{ x: 0, y: 0.6 }} end={{ x: 0.6, y: 0.4 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={["rgba(7,9,12,0.25)", "rgba(7,9,12,0)", "rgba(7,9,12,0.96)"]} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
      <Row style={{ justifyContent: "space-between", padding: S.md }}>
        {card.dot === "out" ? <GlassChip dot={C.accent} label="Out now" /> : <View />}
        {card.fair ? <GlassChip icon={Zap} label="Fair match" /> : null}
      </Row>
      <View style={{ flex: 1 }} />
      <View style={{ padding: S.lg }}>
        <Text style={styles.cardName} numberOfLines={1} adjustsFontSizeToFit>
          {card.name.split(" ")[0]}
        </Text>
        <Row gap={6}>
          <Crosshair size={13} color={C.accentHi} />
          <Text style={styles.cardWhere} numberOfLines={1}>
            {[card.area, card.city].filter(Boolean).join(", ")}
          </Text>
        </Row>
        <RivalStats card={card} />
      </View>
    </View>
  );
}

function SwipeCard({ card, onDone }) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const pan = Gesture.Pan()
    .onChange((e) => {
      x.value += e.changeX;
      y.value += e.changeY * 0.3;
    })
    .onEnd((e) => {
      const go = Math.abs(x.value) > 110 || Math.abs(e.velocityX) > 900;
      if (go) {
        const dir = x.value > 0 || (x.value === 0 && e.velocityX > 0) ? 1 : -1;
        x.value = withTiming(dir * FLING * 1.4, { duration: 200 }, () => runOnJS(onDone)(card, dir > 0));
      } else {
        x.value = withSpring(0);
        y.value = withSpring(0);
      }
    });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { rotate: `${interpolate(x.value, [-FLING, 0, FLING], [-14, 0, 14])}deg` }],
  }));
  const pickTag = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [20, 120], [0, 1], "clamp") }));
  const passTag = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-120, -20], [1, 0], "clamp") }));
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[StyleSheet.absoluteFill, style]}>
        <CardFace card={card} />
        <Animated.View style={[styles.tag, styles.tagPick, pickTag]}>
          <Text style={styles.tagText}>Pick</Text>
        </Animated.View>
        <Animated.View style={[styles.tag, styles.tagPass, passTag]}>
          <Text style={styles.tagText}>Pass</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

export default function SwipeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState("near");
  const deck = useSwipeDeck(scope);
  const picks = usePicks().data || [];
  const side = usePlaySide().data;
  const city = useProfile().data?.city;
  const settings = useMysterySettings().data;
  const myDivision = useCityLeague().data?.sides?.find((x) => x.mine)?.division;
  const [gone, setGone] = useState([]);
  const swipe = useEngineMutation(engine.swipeRival, { silent: false });
  const block = useEngineMutation(engine.blockPlayer, { success: "Blocked. They won't be told" });

  const cards = useMemo(() => (deck.data || []).filter((c) => !gone.includes(c.id)), [deck.data, gone]);
  const top = cards[0];

  const done = (card, pick) => {
    haptic.swipe();
    setGone((g) => [...g, card.id]);
    swipe.mutate([card.id, pick]);
  };

  const scopes = [
    { value: "near", label: "Near me" },
    { value: "city", label: side?.cityName || city || "My city" },
    { value: "division", label: myDivision ? divisionName(myDivision) : "My league" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <GlowHero height={130} kicker="Fair matches near you" top="Find a" bottom="rival" />
      <View style={{ paddingHorizontal: S.gutter, marginTop: S.md }}>
        <Segment options={scopes} value={scope} onChange={(v) => setScope(v)} />
      </View>

      <View style={styles.stage}>
        {settings?.minor ? (
          <EmptyState icon={ShieldCheck} title="Swipe opens at 18" body="Under 18s can battle friends and their club. Strangers can't find you here." />
        ) : deck.isPending ? (
          <Skeleton height={CARD_H} width={CARD_W} radius={28} style={{ alignSelf: "center" }} />
        ) : !top ? (
          <EmptyState title="That's everyone for now" body={scope === "near" ? "Try your city or your league, or come back tomorrow for new faces." : "New faces land every day."} action={picks.length ? `See your ${picks.length} picks` : undefined} onAction={() => router.push("/swipe/picks")} />
        ) : (
          <View style={{ height: CARD_H, width: CARD_W, alignSelf: "center" }}>
            {cards[2] ? <View style={[StyleSheet.absoluteFill, styles.behind2]}><CardFace card={cards[2]} /></View> : null}
            {cards[1] ? <View style={[StyleSheet.absoluteFill, styles.behind1]}><CardFace card={cards[1]} /></View> : null}
            <SwipeCard key={top.id} card={top} onDone={done} />
          </View>
        )}
      </View>

      {top && !settings?.minor ? (
        <Row gap={S.lg} style={[styles.actions, { paddingBottom: insets.bottom + S.lg }]}>
          <RoundAction
            icon={Ban}
            size={44}
            onPress={() => {
              setGone((g) => [...g, top.id]);
              block.mutate(top.id);
            }}
            accessibilityLabel={`Block ${top.name}`}
          />
          <RoundAction icon={X} size={60} onPress={() => done(top, false)} accessibilityLabel="Pass" />
          <RoundAction icon={Swords} size={78} go onPress={() => done(top, true)} accessibilityLabel={`Pick ${top.name}`} />
          <RoundAction icon={Layers} size={44} onPress={() => router.push("/swipe/mystery")} accessibilityLabel="Mystery challengers" />
        </Row>
      ) : null}

      <TopBar
        right={
          <>
            <GlassButton icon={ShieldCheck} size={38} onPress={() => router.push("/swipe/safety")} label="Safety" />
            <Chip tone={picks.length ? "blue" : "glass"} icon={Swords} label={`${formatNumber(picks.length)} ${picks.length === 1 ? "pick" : "picks"}`} onPress={() => router.push("/swipe/picks")} style={{ height: 38 }} />
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, paddingHorizontal: S.gutter, paddingTop: S.lg, justifyContent: "flex-start" },
  card: { flex: 1, borderRadius: 28, overflow: "hidden", backgroundColor: "#0b0e13", borderWidth: 2 },
  cardGlow: { boxShadow: "0 0 34px -6px rgba(61,139,255,0.7), 0 30px 60px -24px #000" },
  behind1: { transform: [{ translateX: 150 }, { rotate: "6deg" }, { scale: 0.92 }], opacity: 0.35 },
  behind2: { transform: [{ translateX: -150 }, { rotate: "-6deg" }, { scale: 0.92 }], opacity: 0.3 },
  cardName: { color: "#fff", fontFamily: F.display, fontSize: 48, lineHeight: 50, textTransform: "uppercase", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 18 },
  cardWhere: { color: C.textSoft, fontFamily: F.body, fontSize: 13 },
  stat: { flex: 1, padding: 10, borderRadius: R.md, backgroundColor: "rgba(255,255,255,0.09)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.07)" },
  statValue: { color: "#fff", fontFamily: F.display, fontSize: 22, lineHeight: 24 },
  statLabel: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" },
  tag: { position: "absolute", top: 70, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, borderWidth: 3 },
  tagPick: { left: 22, borderColor: C.accent, transform: [{ rotate: "-12deg" }] },
  tagPass: { right: 22, borderColor: "#fff", transform: [{ rotate: "12deg" }] },
  tagText: { color: "#fff", fontFamily: F.display, fontSize: 28, textTransform: "uppercase" },
  actions: { justifyContent: "center", alignItems: "center", paddingTop: S.md },
});
