// Membership: compare Free, Pro and Black, see Black eligibility and switch
// plan. Payments aren't live, so switching is free in this build.

import React, { useState } from "react";
import { Alert, View } from "react-native";
import { Info } from "lucide-react-native";
import { TIER_PERKS, TIER_RULES, TIERS } from "@/data/engine";
import { engine, useEngineMutation, useMembership } from "@/data/hooks";
import { tierLabel } from "@/utils/format";
import { Body, C, FadeIn, Header, R, Row, S, Screen, Skeleton, Title } from "@/components/ui";
import { RoadToBlack, TierCard } from "@/components/profile/TierCard";
import Celebrate from "@/components/profile/Celebrate";

const rank = (t) => TIERS.indexOf(t);

export default function MembershipScreen() {
  const { data: m, isPending, refetch, isRefetching } = useMembership();
  const [burst, setBurst] = useState(0);
  const setTier = useEngineMutation(engine.setTier, {
    success: (p) => (p?.tier === "free" ? "You're back on Free" : `Welcome to ${tierLabel(p?.tier)}. Perks are live.`),
    onSuccess: (p) => {
      if (p?.tier !== "free") setBurst((b) => b + 1);
    },
  });

  const choose = (tier) => {
    if (!m || tier === m.tier) return;
    if (rank(tier) < rank(m.tier)) {
      Alert.alert(
        `Move to ${tierLabel(tier)}?`,
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

  // The one upgrade worth pushing: the cheapest plan above yours that's open.
  const nextUp = m ? TIERS.find((t) => rank(t) > rank(m.tier) && !(t === "black" && !m.blackEligible)) : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen header={<Header back title="Membership" />} onRefresh={refetch} refreshing={isRefetching}>
        <FadeIn>
          <Title size={30} style={{ letterSpacing: -0.8 }}>
            Level up how you move
          </Title>
          <Body dim style={{ marginTop: S.xs }}>
            More XP, more battles, more rewards.
          </Body>
          <Row gap={S.sm} style={{ marginTop: S.md }}>
            <Info size={14} color={C.textMute} />
            <Body mute size={13} style={{ flex: 1 }}>
              Payments aren't live yet, so switching is free in this build.
            </Body>
          </Row>
        </FadeIn>

        {isPending || !m ? (
          <View style={{ gap: S.lg, marginTop: S.xxl }}>
            <Skeleton height={130} radius={R.lg} />
            <Skeleton height={320} radius={R.lg} />
            <Skeleton height={360} radius={R.lg} />
          </View>
        ) : (
          <>
            {m.tier !== "black" ? (
              <FadeIn index={1} style={{ marginTop: S.xxl }}>
                <RoadToBlack streak={m.streak} needed={m.streakNeeded} eligible={m.blackEligible} />
              </FadeIn>
            ) : null}

            <View style={{ marginTop: S.xxl, gap: S.lg }}>
              {TIERS.map((tier, i) => (
                <FadeIn key={tier} index={i + 2}>
                  <TierCard
                    tier={tier}
                    rules={TIER_RULES[tier]}
                    perks={TIER_PERKS[tier] || []}
                    current={m.tier === tier}
                    locked={tier === "black" && !m.blackEligible}
                    upgrade={rank(tier) > rank(m.tier)}
                    primary={tier === nextUp}
                    streakNeeded={m.streakNeeded}
                    busy={setTier.isPending && setTier.variables === tier}
                    onChoose={choose}
                  />
                </FadeIn>
              ))}
            </View>
          </>
        )}
      </Screen>
      <Celebrate burst={burst} />
    </View>
  );
}
