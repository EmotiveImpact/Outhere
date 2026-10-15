// Choose your plan: monthly or yearly, three plan cards with their own card
// art, what the chosen plan unlocks, and one button that says what it costs.

import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CircleDot, Table } from "lucide-react-native";
import { useMembershipDetails } from "@/data/hooks";
import { Body, Button, C, F, FadeIn, PressableScale, R, Row, S, Screen, Segment, Skeleton } from "@/components/ui";
import { Slab } from "@/components/profile/parts";
import { PHOTOS } from "@/constants/photos";
import { PLAN_ORDER, PLANS, TRIAL_DAYS, UNLOCKS, money, priceLabel, yearlySaving } from "@/constants/plans";

const CARD_ART = { pro: PHOTOS.procard, black: PHOTOS.blackcard };

export default function ChoosePlan() {
  const router = useRouter();
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
      <Slab object={PHOTOS.blackcard} kicker="Outhere membership" top="Earn twice" bottom="as fast" height={250} />
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
              <FadeIn key={u.key} style={{ flex: 1, alignItems: "center", opacity: on ? 1 : 0.38 }}>
                <View style={styles.unlockArt}>
                  <Image source={PHOTOS[u.art]} style={StyleSheet.absoluteFill} contentFit="cover" />
                </View>
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
    <PressableScale onPress={onPress} scaleTo={0.96} style={[styles.plan, selected && styles.planOn]} accessibilityLabel={`${p.name}, ${money(price)}`}>
      {tier === "black" ? (
        <View style={styles.best}>
          <Text style={styles.bestText}>Most OUT</Text>
        </View>
      ) : null}
      <View style={styles.cardArt}>
        {CARD_ART[tier] ? (
          <Image source={CARD_ART[tier]} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <LinearGradient colors={["#3a414c", "#1d2229"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        )}
      </View>
      <Text style={styles.planName}>{p.name}</Text>
      <Text style={[styles.planPrice, selected && tier !== "free" && { color: C.accent }]}>{money(price)}</Text>
      <Body dim size={11.5}>
        {tier === "free" ? "for ever" : billing === "yearly" ? "a year" : "a month"}
      </Body>
      {current ? <Text style={styles.yours}>Your plan</Text> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  plan: { flex: 1, alignItems: "center", backgroundColor: C.surface, borderRadius: R.lg, paddingVertical: S.md, paddingHorizontal: 8, borderWidth: 1.5, borderColor: "transparent" },
  planOn: { borderColor: C.accent, backgroundColor: "#111a2b" },
  best: { position: "absolute", top: -10, paddingHorizontal: 8, height: 20, borderRadius: 10, backgroundColor: C.accent, justifyContent: "center", zIndex: 2 },
  bestText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 9.5, letterSpacing: 1, textTransform: "uppercase" },
  cardArt: { width: "100%", aspectRatio: 1.6, borderRadius: 8, overflow: "hidden", backgroundColor: "#000" },
  planName: { color: C.text, fontFamily: F.bodySemi, fontSize: 14, marginTop: S.sm },
  planPrice: { color: C.text, fontFamily: F.display, fontSize: 22, marginTop: 2 },
  yours: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginTop: 4 },
  unlockArt: { width: 72, height: 72, borderRadius: 14, overflow: "hidden", backgroundColor: "#000" },
  unlockTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 12.5, marginTop: S.sm, textAlign: "center" },
  unlockSub: { color: C.textDim, fontFamily: F.body, fontSize: 11, marginTop: 2, textAlign: "center" },
  fine: { color: C.textDim, fontFamily: F.body, fontSize: 12, textAlign: "center" },
});
