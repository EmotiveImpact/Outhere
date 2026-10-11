// Membership: compare Free, Pro and Black, see Black eligibility and switch
// plan. Payments aren't live, so switching is free in this build.

import React from "react";
import { Alert, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Crown, Flame, Info, Lock } from "lucide-react-native";
import { TIER_PERKS, TIER_RULES, TIERS } from "@/data/engine";
import { engine, useEngineMutation, useMembership } from "@/data/hooks";
import { hapticSuccess } from "@/services/haptics";
import { tierLabel } from "@/utils/format";
import { Body, Button, C, Card, F, Header, Label, Loading, Pill, ProgressBar, R, Row, S, Screen, Title, tierColour } from "@/components/ui";

const TAGLINES = {
  free: "Everything you need to get moving.",
  pro: "For people who are out most days.",
  black: "For the ones who never miss.",
};

const rank = (t) => TIERS.indexOf(t);
const fmtLimit = (n) => (n === Infinity ? "Unlimited" : String(n));

export default function MembershipScreen() {
  const { data: m, isPending, refetch, isRefetching } = useMembership();
  const setTier = useEngineMutation(engine.setTier, {
    onSuccess: (_, tier) => {
      hapticSuccess();
      Alert.alert(`You're on ${tierLabel(tier)}`, tier === "free" ? "You're back on Free." : "Your new perks are live.");
    },
  });

  const choose = (tier) => {
    if (!m || tier === m.tier) return;
    if (rank(tier) < rank(m.tier)) {
      Alert.alert(
        `Switch to ${tierLabel(tier)}?`,
        `You'll lose ${tierLabel(m.tier)} perks straight away, like the ${TIER_RULES[m.tier].xpMultiplier}x XP boost and higher limits.`,
        [
          { text: "Keep my plan", style: "cancel" },
          { text: "Switch", style: "destructive", onPress: () => setTier.mutate(tier) },
        ]
      );
      return;
    }
    setTier.mutate(tier);
  };

  return (
    <Screen header={<Header back title="Membership" />} onRefresh={refetch} refreshing={isRefetching}>
      {isPending || !m ? (
        <Loading />
      ) : (
        <>
          <LinearGradient
            colors={m.tier === "black" ? ["#2a2a2c", "#141416"] : m.tier === "pro" ? ["#13263a", "#141416"] : ["#0f1a14", "#141416"]}
            style={{ borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.xl }}
          >
            <Label>Your plan</Label>
            <Row style={{ marginTop: S.sm, justifyContent: "space-between" }}>
              <Title size={36} style={{ color: m.tier === "free" ? C.text : tierColour(m.tier) }}>
                {tierLabel(m.tier)}
              </Title>
              <Crown size={28} color={m.tier === "free" ? C.textMute : tierColour(m.tier)} />
            </Row>
            <Body dim style={{ marginTop: S.xs }}>
              {TAGLINES[m.tier]}
            </Body>
            <Row gap={S.lg} style={{ marginTop: S.lg }}>
              <Stat label="XP boost" value={`${m.rules.xpMultiplier}x`} />
              <Stat label="Rewards a week" value={fmtLimit(m.rules.redemptionsPerWeek)} />
              <Stat label="Battles a week" value={fmtLimit(m.rules.battlesPerWeek)} />
            </Row>
          </LinearGradient>

          <Row gap={S.sm} style={{ marginTop: S.lg, padding: S.md, borderRadius: R.md, backgroundColor: "rgba(255,193,7,0.08)", borderWidth: 1, borderColor: "rgba(255,193,7,0.25)", alignItems: "flex-start" }}>
            <Info size={16} color={C.warn} style={{ marginTop: 2 }} />
            <Body size={13} style={{ flex: 1, color: C.warn }}>
              Payments aren't live yet. In this build you can switch plans for free.
            </Body>
          </Row>

          <BlackProgress m={m} />

          <View style={{ marginTop: S.xxl, gap: S.lg }}>
            {TIERS.map((tier) => (
              <PlanCard key={tier} tier={tier} m={m} onChoose={choose} busy={setTier.isPending && setTier.variables === tier} />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const Stat = ({ label, value }) => (
  <View style={{ flex: 1 }}>
    <Text style={{ color: C.text, fontFamily: F.display, fontSize: 20 }}>{value}</Text>
    <Body mute size={11}>
      {label}
    </Body>
  </View>
);

function BlackProgress({ m }) {
  if (m.tier === "black") return null;
  const value = Math.min(1, m.streak / m.streakNeeded);
  return (
    <Card style={{ marginTop: S.lg }} highlight={m.blackEligible}>
      <Row style={{ justifyContent: "space-between" }}>
        <Row gap={S.sm}>
          <Flame size={18} color={m.blackEligible ? C.accent : C.fire} />
          <Text style={{ color: C.text, fontFamily: F.displayMedium, fontSize: 16 }}>{m.blackEligible ? "Black unlocked" : "Road to Black"}</Text>
        </Row>
        {!m.blackEligible ? (
          <Text style={{ color: C.textDim, fontWeight: "700" }}>
            {m.streak}/{m.streakNeeded} days
          </Text>
        ) : null}
      </Row>
      <Body dim size={13} style={{ marginTop: S.sm }}>
        {m.blackEligible
          ? "You hit a 14 day streak. Black stays open to you for good."
          : `Black opens up after a ${m.streakNeeded} day streak. ${Math.max(0, m.streakNeeded - m.streak)} more active day${m.streakNeeded - m.streak === 1 ? "" : "s"} to go.`}
      </Body>
      {!m.blackEligible ? <ProgressBar value={value} colour={C.fire} style={{ marginTop: S.md }} /> : null}
    </Card>
  );
}

function PlanCard({ tier, m, onChoose, busy }) {
  const current = m.tier === tier;
  const locked = tier === "black" && !m.blackEligible;
  const colour = tier === "free" ? C.text : tierColour(tier);
  const upgrade = rank(tier) > rank(m.tier);
  const perks = TIER_PERKS[tier] || [];
  return (
    <Card padding={S.xl} highlight={current} style={tier === "black" && !current ? { borderColor: C.borderStrong } : null}>
      <Row style={{ justifyContent: "space-between" }}>
        <Title size={26} style={{ color: colour }}>
          {tierLabel(tier)}
        </Title>
        {current ? <Pill label="CURRENT" tone="accent" /> : locked ? <Pill label="LOCKED" tone="neutral" icon={Lock} /> : null}
      </Row>
      <Body dim size={14} style={{ marginTop: 2 }}>
        {TAGLINES[tier]}
      </Body>
      <View style={{ marginTop: S.lg, gap: S.sm }}>
        {perks.map((p) => (
          <Row key={p} gap={S.sm} style={{ alignItems: "flex-start" }}>
            <Check size={16} color={tier === "free" ? C.textDim : colour} style={{ marginTop: 2 }} />
            <Body size={14} style={{ flex: 1 }}>
              {p}
            </Body>
          </Row>
        ))}
      </View>
      {current ? null : (
        <Button
          title={locked ? `Needs a ${m.streakNeeded} day streak` : upgrade ? `Switch to ${tierLabel(tier)}` : `Downgrade to ${tierLabel(tier)}`}
          variant={locked ? "secondary" : upgrade ? "primary" : "ghost"}
          disabled={locked}
          loading={busy}
          full
          onPress={() => onChoose(tier)}
          style={{ marginTop: S.xl }}
        />
      )}
    </Card>
  );
}
