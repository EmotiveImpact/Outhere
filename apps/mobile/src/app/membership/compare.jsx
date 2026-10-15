// Compare plans (mem2b): the headline with the Pro and Black cards fanned
// behind it, each plan as its membership ring on your own photo lined up
// over its column, then the table with the Black column lit in a silver
// sheen, and the promise that paying never changes a score.

import React, { useEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { Calendar, Check, ChevronLeft, Flame, Ghost, Layers, ShoppingBag, Swords, Zap } from "lucide-react-native";
import { useMembershipDetails, useProfile } from "@/data/hooks";
import { Avatar, BlendImage, Button, C, F, FadeIn, GlowBackdrop, IconButton, Row, S, Surface, useLayoutSize, useScreenTop } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { COMPARE, PLAN_ORDER, PLANS, TRIAL_DAYS, priceLabel } from "@/constants/plans";

const ICONS = { zap: Zap, swords: Swords, "shopping-bag": ShoppingBag, calendar: Calendar, ghost: Ghost, flame: Flame, layers: Layers };

// .r11cmp .r: grid-template-columns 1.55fr 1fr 1fr 1fr, shared by the faces
// above so each ring sits over its own column.
const LABEL_FLEX = 1.55;
const BAND = `${100 / (LABEL_FLEX + 3)}%`;

export default function ComparePlans() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const top = useScreenTop();
  const { billing = "monthly" } = useLocalSearchParams();
  const { data: p } = useProfile();
  const { data: m } = useMembershipDetails();
  const trial = !m?.trialUsed;
  const onBlack = m?.tier === "black";
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/membership"));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <GlowBackdrop preset="slab" style={styles.light} />
      {/* .r11fan: the Pro and Black cards fanned out top right */}
      <BlendImage source={PHOTOS.procard} width={140} height={110} mask="wide" rotate={14} dim={0.6} style={[styles.fan, { right: -30, top: top + 42 }]} />
      <BlendImage source={PHOTOS.blackcard} width={140} height={110} mask="wide" rotate={-6} dim={0.9} float style={[styles.fan, { right: 0, top: top + 64 }]} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: top, paddingHorizontal: S.gutter, paddingBottom: insets.bottom + 32 }}>
        <IconButton icon={ChevronLeft} onPress={goBack} label="Back" />
        <View style={{ marginTop: 12 }}>
          <Text style={styles.kicker}>Compare plans</Text>
          <Text style={styles.h}>What each</Text>
          <Text style={[styles.h, styles.hBlue]}>plan gets you</Text>
        </View>

        <Row gap={0} style={{ alignItems: "stretch", marginTop: S.lg }}>
          <View style={{ flex: LABEL_FLEX }} />
          {PLAN_ORDER.map((t) => (
            <View key={t} style={styles.head}>
              {t === "black" ? (
                <View style={styles.headOn} pointerEvents="none">
                  <LinearGradient colors={["rgba(255,255,255,0.09)", "rgba(255,255,255,0.02)"]} style={StyleSheet.absoluteFill} />
                </View>
              ) : null}
              {t === "pro" ? (
                <View style={styles.pop}>
                  <Text style={styles.popText}>Most picked</Text>
                </View>
              ) : null}
              <Avatar uri={p?.avatar} name={p?.name || "You"} tier={t} size={40} />
              <Text style={styles.headName}>{PLANS[t].name}</Text>
              <Text style={[styles.headPrice, t === "black" && { color: "#cfd8e6" }]}>{priceLabel(t, String(billing))}</Text>
            </View>
          ))}
        </Row>

        <FadeIn>
          <Surface radius={20} padding={null} style={{ marginTop: 12 }} contentStyle={styles.table}>
            <SilverBand />
            {COMPARE.map((row, i) => {
              const Icon = ICONS[row.icon] || Zap;
              return (
                <Row key={row.key} gap={0} style={[styles.row, i > 0 && styles.rowLine]}>
                  <Row gap={7} style={{ flex: LABEL_FLEX, paddingLeft: 12 }}>
                    <Icon size={14} color={C.accentHi} />
                    <Text style={styles.label} numberOfLines={2}>
                      {row.label}
                    </Text>
                  </Row>
                  {PLAN_ORDER.map((t) => (
                    <View key={t} style={styles.cell}>
                      <Cell value={row.cells[t]} on={t === "black"} />
                    </View>
                  ))}
                </Row>
              );
            })}
          </Surface>
        </FadeIn>

        <Text style={styles.fine}>Same game for everyone. Battles, club runs and fixtures score the same on every plan.</Text>

        <Button
          title={onBlack ? "Manage your plan" : trial ? `Go Black · ${TRIAL_DAYS} days free` : `Go Black · ${priceLabel("black", String(billing))}`}
          size="lg"
          full
          style={{ marginTop: S.lg }}
          onPress={() => (onBlack ? router.push("/membership/manage") : router.push({ pathname: "/membership/checkout", params: { plan: "black", billing: String(billing) } }))}
        />
      </ScrollView>
    </View>
  );
}

/** .r11cmp .band: the Black column in brushed silver, a sheen sweeping down it. */
function SilverBand() {
  const reduce = useReducedMotion();
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    sweep.value = withRepeat(withTiming(1, { duration: 5000, easing: Easing.bezier(0.45, 0, 0.2, 1) }), -1, false);
  }, [reduce, sweep]);
  const [size, onLayout] = useLayoutSize();
  const h = size?.height || 0;
  const moving = useAnimatedStyle(() => ({ transform: [{ translateY: h * (-2 + sweep.value * 3) }] }));
  return (
    <View pointerEvents="none" onLayout={onLayout} style={[styles.band, { width: BAND }]}>
      <LinearGradient colors={["rgba(255,255,255,0.075)", "rgba(255,255,255,0.015)"]} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.sheen, { height: h * 3 || "300%" }, moving]}>
        <LinearGradient colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.09)", "rgba(255,255,255,0)"]} locations={[0.35, 0.5, 0.65]} start={{ x: 0, y: 0.1 }} end={{ x: 1, y: 0.9 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <View style={styles.bandEdge} />
    </View>
  );
}

function Cell({ value, on }) {
  if (value === false) return <Text style={styles.no}>–</Text>;
  if (value === true) return <Check size={15} color={C.accentHi} strokeWidth={2.4} />;
  if (value && typeof value === "object") {
    return (
      <View style={{ alignItems: "center", gap: 4 }}>
        <Text style={[styles.val, on && styles.valOn]}>{value.label}</Text>
        <View style={styles.mx}>
          <LinearGradient colors={["#2a6af0", "#82b4ff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.mxFill, { width: `${value.value * 100}%` }]} />
        </View>
      </View>
    );
  }
  return (
    <Text style={[styles.val, on && styles.valOn]} numberOfLines={2}>
      {value}
    </Text>
  );
}

const styles = StyleSheet.create({
  light: { position: "absolute", left: 0, right: 0, top: 0, height: 330, opacity: 0.8 },
  fan: { position: "absolute" },
  kicker: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase", marginBottom: 8 },
  h: { color: C.text, fontFamily: F.display, fontSize: 38, lineHeight: 37, textTransform: "uppercase", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 30, textShadowOffset: { width: 0, height: 2 } },
  hBlue: { color: C.accent, textShadowColor: "rgba(61,139,255,0.35)", textShadowRadius: 28, textShadowOffset: { width: 0, height: 0 } },
  // .r11plans .pl
  head: { flex: 1, alignItems: "center", gap: 5, paddingTop: 12, paddingBottom: 10, paddingHorizontal: 2 },
  headOn: { ...StyleSheet.absoluteFillObject, borderRadius: 16, overflow: "hidden", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 0 0 1px rgba(255,255,255,0.08)" },
  headName: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5, marginTop: 1 },
  headPrice: { color: C.textDim, fontFamily: F.body, fontSize: 10.5, textAlign: "center", lineHeight: 13 },
  pop: { position: "absolute", top: -8, paddingHorizontal: 6, height: 17, borderRadius: 9, backgroundColor: "#2a6af0", justifyContent: "center", zIndex: 2 },
  popText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 9.5 },
  // .r11cmp
  table: { paddingVertical: 4, overflow: "hidden" },
  band: { position: "absolute", top: 0, bottom: 0, right: 0, overflow: "hidden" },
  bandEdge: { position: "absolute", left: 0, top: 0, bottom: 0, width: 1, backgroundColor: "rgba(255,255,255,0.07)" },
  sheen: { position: "absolute", left: 0, right: 0, top: 0 },
  row: { minHeight: 36 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.07)" },
  label: { color: C.text, fontFamily: F.bodyMedium, fontSize: 11.5, flex: 1, lineHeight: 14 },
  cell: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 2 },
  val: { color: C.textSoft, fontFamily: F.body, fontSize: 11.5, textAlign: "center" },
  valOn: { color: "#fff", fontFamily: F.bodySemi },
  no: { color: "#4a5160", fontSize: 14 },
  mx: { width: 36, height: 4, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  mxFill: { height: 4, borderRadius: 4 },
  fine: { color: C.textDim, fontFamily: F.body, fontSize: 12, textAlign: "center", marginTop: S.lg, lineHeight: 17 },
});
