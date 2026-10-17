// Choose your plan: monthly or yearly, three plan cards with their own card
// art, what the chosen plan unlocks, and one button that says what it costs.

import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CircleDot, Table } from "@/components/ui/icons";
import { useMembershipDetails } from "@/data/hooks";
import { BlackCard, BlendImage, Body, Button, C, F, FadeIn, R, Row, S, Screen, Segment, Skeleton, Surface } from "@/components/ui";
import { Slab } from "@/components/profile/parts";
import { PHOTOS } from "@/constants/photos";
import { PLAN_ORDER, PLANS, TRIAL_DAYS, UNLOCKS, money, priceLabel, yearlySaving } from "@/constants/plans";

const CARD_ART = { pro: PHOTOS.procard, black: PHOTOS.blackcard };

export default function ChoosePlan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { data: m, isPending } = useMembershipDetails();
  const [billing, setBilling] = useState(params.billing === "monthly" ? "monthly" : "yearly");
  const [plan, setPlan] = useState(params.plan === "pro" ? "pro" : "black");

  const current = m?.tier || "free";
  const isCurrent = plan === current && (plan === "free" || !m?.billing || m.billing === billing);
  const trial = !m?.trialUsed;
  const p = PLANS[plan];

  const cta = () => {
    if (plan === "free" || isCurrent) return router.push("/membership/manage");
    router.push({ pathname: "/membership/checkout", params: { plan, billing } });
  };

  const ctaLabel =
    plan === "free"
      ? current === "free"
        ? "You're on Free"
        : "Manage your plan"
      : isCurrent
        ? "Manage your plan"
        : `Go ${p.name} · ${priceLabel(plan, billing)}`;

  return (
    <Screen padded={false} style={{ paddingTop: 0 }}>
      <Slab object={PHOTOS.blackcard} objectSize={290} objectStyle={{ right: -64, top: insets.top - 10 }} kicker="Outhere membership" top="Earn twice" bottom="as fast" height={248} />
      <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg, gap: S.md }}>
        <Segment
          options={[
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: `Yearly · save ${yearlySaving("black")}%` },
          ]}
          value={billing}
          onChange={setBilling}
        />

        {isPending ? (
          <Skeleton height={150} radius={R.lg} />
        ) : (
          <Row gap={S.sm} style={{ alignItems: "stretch" }}>
            {PLAN_ORDER.map((t) => (
              <PlanCard key={t} tier={t} billing={billing} selected={plan === t} current={current === t} onPress={() => setPlan(t)} />
            ))}
          </Row>
        )}

        <Row gap={S.sm} style={{ alignItems: "flex-start", marginTop: S.xs }}>
          {UNLOCKS.map((u) => {
            const on = u.on.includes(plan);
            return (
              <FadeIn key={u.key} style={[styles.unlock, { opacity: on ? 1 : 0.35 }]}>
                {/* .unlock img: the object blended onto the tile, no black box */}
                <BlendImage source={PHOTOS[u.art]} size={72} mask="soft" grey={on ? 0 : 1} />
                <Text style={styles.unlockTitle}>{u.key === "out" && plan === "pro" ? "1.5x OUT" : u.key === "drops" && plan === "pro" ? "Early drops" : u.title}</Text>
                <Text style={styles.unlockSub}>{u.key === "drops" && plan === "pro" ? "an hour before everyone" : u.sub}</Text>
              </FadeIn>
            );
          })}
        </Row>

        <Button title={ctaLabel} size="lg" full onPress={cta} disabled={plan === "free" && current === "free"} style={{ marginTop: S.sm }} />
        <Text style={styles.fine}>
          {plan === "free" ? "Free stays free. Steps, streaks, clubs and battles." : trial ? `${TRIAL_DAYS} days free, then cancel any time in Settings` : "Cancel any time in Settings"}
        </Text>

        <Row gap={S.sm} style={{ marginTop: S.sm }}>
          <Button title="Compare plans" icon={Table} variant="secondary" size="sm" onPress={() => router.push({ pathname: "/membership/compare", params: { billing } })} style={{ flex: 1 }} />
          <Button title="What rings mean" icon={CircleDot} variant="secondary" size="sm" onPress={() => router.push("/membership/rings")} style={{ flex: 1 }} />
        </Row>
      </View>
    </Screen>
  );
}

function PlanCard({ tier, billing, selected, current, onPress }) {
  const p = PLANS[tier];
  const price = billing === "yearly" ? p.yearly : p.monthly;
  return (
    <View style={{ flex: 1 }}>
    <Surface tone={selected ? "blue" : "lit"} onPress={onPress} pressScale={0.96} radius={18} padding={null} style={{ flex: 1 }} contentStyle={styles.plan} accessibilityLabel={`${p.name}, ${money(price)}`}>
      <View style={styles.cardArt}>
        {tier === "black" ? (
          // The Black card as drawn: brushed metal with the sheen crossing it.
          <BlackCard width={78} tilt={-4} intensity={selected ? 1.1 : 0.8} />
        ) : CARD_ART[tier] ? (
          <BlendImage source={CARD_ART[tier]} width={92} height={60} mask="wide" zoom={1.25} />
        ) : (
          <View style={styles.freeCard}>
            <LinearGradient colors={["#3a4250", "#1a1f27"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          </View>
        )}
      </View>
      <Text style={styles.planName}>{p.name}</Text>
      <Text style={[styles.planPrice, selected && tier !== "free" && { color: C.accent }]}>{money(price)}</Text>
      <Body dim size={11.5}>
        {tier === "free" ? "for ever" : billing === "yearly" ? "a year" : "a month"}
      </Body>
      {current ? <Text style={styles.yours}>Your plan</Text> : null}
    </Surface>
      {tier === "black" ? (
        <View style={styles.best} pointerEvents="none">
          <Text style={styles.bestText}>Most OUT</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // .plan
  plan: { alignItems: "center", paddingTop: 10, paddingBottom: 11, paddingHorizontal: 8 },
  best: { position: "absolute", top: -9, alignSelf: "center", paddingHorizontal: 8, height: 18, borderRadius: 9, backgroundColor: C.accent, justifyContent: "center", zIndex: 2, boxShadow: "0 4px 12px -4px rgba(42,106,240,0.9)" },
  bestText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 9.5, letterSpacing: 1, textTransform: "uppercase" },
  cardArt: { width: 92, height: 60, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  freeCard: { width: 72, height: 46, borderRadius: 7, overflow: "hidden", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)" },
  planName: { color: C.text, fontFamily: F.bodySemi, fontSize: 14, marginTop: S.sm },
  planPrice: { color: C.text, fontFamily: F.display, fontSize: 22, marginTop: 2 },
  yours: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginTop: 4 },
  // .unlock div: a near black tile the object glows out of
  unlock: { flex: 1, alignItems: "center", backgroundColor: "#05080e", borderRadius: 18, paddingTop: 6, paddingHorizontal: 6, paddingBottom: 11 },
  unlockTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 12.5, marginTop: S.sm, textAlign: "center" },
  unlockSub: { color: C.textDim, fontFamily: F.body, fontSize: 11, marginTop: 2, textAlign: "center" },
  fine: { color: C.textDim, fontFamily: F.body, fontSize: 12, textAlign: "center" },
});
