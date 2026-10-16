// Rewards: spend OUT on partner perks. Shows balance, the weekly redemption
// allowance for your plan, the catalogue and the codes you've unlocked.

import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { engine, useEngineMutation, useProfile, useRedemptions, useRewards } from "@/data/hooks";
import { Body, C, Card, EmptyState, FadeIn, Header, R, Row, S, Screen, SectionHeader, Skeleton, Title, toast } from "@/components/ui";
import { BalanceHero, CategoryChips, CodeRow, RedeemSheet, RewardCard } from "@/components/profile/RewardParts";

export default function RewardsScreen() {
  const router = useRouter();
  const rewardsQ = useRewards();
  const redemptionsQ = useRedemptions();
  const { data: profile } = useProfile();
  const [category, setCategory] = useState("All");
  const [sheet, setSheet] = useState(null);
  const [burst, setBurst] = useState(0);

  const redeem = useEngineMutation(engine.redeemReward, {
    success: (rd) => `${rd.title} unlocked`,
    onSuccess: (rd) => {
      setSheet({ redemption: { ...rd, fresh: true } });
      setBurst((b) => b + 1);
    },
  });

  const data = rewardsQ.data;
  const categories = useMemo(() => ["All", ...new Set((data?.rewards || []).map((r) => r.category))], [data]);
  const list = (data?.rewards || []).filter((r) => category === "All" || r.category === category);

  // Tier and weekly-limit locks go through the engine so the upgrade sheet opens.
  const onRedeem = (r) => {
    if (r.canRedeem) return redeem.mutate(r.id);
    if (r.lockedReason?.endsWith("to go")) {
      toast(`${r.lockedReason}`, "Walk, keep your streak and win battles to earn more.");
      return undefined;
    }
    setSheet(null);
    return redeem.mutate(r.id);
  };

  const refresh = () => {
    rewardsQ.refetch();
    redemptionsQ.refetch();
  };

  const codes = redemptionsQ.data || [];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen header={<Header back title="Rewards" />} onRefresh={refresh} refreshing={rewardsQ.isRefetching}>
        {rewardsQ.isPending ? (
          <View style={{ gap: S.lg }}>
            <Skeleton height={250} radius={R.lg} />
            <Row gap={S.sm}>
              {[60, 70, 96, 70].map((w, i) => (
                <Skeleton key={i} width={w} height={38} radius={19} />
              ))}
            </Row>
            <Row gap={S.md}>
              <View style={{ flex: 1 }}>
                <Skeleton height={250} radius={R.lg} />
              </View>
              <View style={{ flex: 1 }}>
                <Skeleton height={250} radius={R.lg} />
              </View>
            </Row>
          </View>
        ) : !data ? (
          <EmptyState title="Rewards unavailable" body="Set up your profile to start earning OUT." />
        ) : (
          <>
            <FadeIn>
              <BalanceHero data={data} tier={profile?.tier} onUpgrade={() => router.push("/membership")} />
            </FadeIn>

            <SectionHeader title="Spend your OUT" />
            <CategoryChips categories={categories} value={category} onChange={setCategory} />
            <View style={{ gap: S.md }}>
              {pairs(list).map((row, i) => (
                <FadeIn key={row.map((r) => r.id).join()} index={i}>
                  <Row gap={S.md} style={{ alignItems: "stretch" }}>
                    {row.map((r) => (
                      <View key={r.id} style={{ flex: 1 }}>
                        <RewardCard reward={r} balance={data.balance} onOpen={() => setSheet({ reward: r })} />
                      </View>
                    ))}
                    {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
                  </Row>
                </FadeIn>
              ))}
            </View>

            <SectionHeader title="Your codes" />
            {redemptionsQ.isPending ? (
              <Skeleton height={140} radius={R.lg} />
            ) : codes.length ? (
              <Card padding={0}>
                {codes.map((r, i) => (
                  <CodeRow key={r.id} redemption={r} first={i === 0} onOpen={() => setSheet({ redemption: r })} />
                ))}
              </Card>
            ) : (
              <Card padding={S.xl}>
                <Title size={17}>No codes yet</Title>
                <Body dim size={13} style={{ marginTop: 4 }}>
                  Redeem a reward and your code lands here, ready to show at the till.
                </Body>
              </Card>
            )}
          </>
        )}
      </Screen>
      <RedeemSheet state={sheet} balance={data?.balance || 0} busy={redeem.isPending} burst={burst} onRedeem={onRedeem} onClose={() => setSheet(null)} />
    </View>
  );
}

const pairs = (list) => {
  const out = [];
  for (let i = 0; i < list.length; i += 2) out.push(list.slice(i, i + 2));
  return out;
};
