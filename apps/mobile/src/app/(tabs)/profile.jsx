// Your profile: a player card up top, then how you're doing and what you've earned.

import React, { useState } from "react";
import { useRouter } from "expo-router";
import { Settings } from "lucide-react-native";
import { useProfile, useRuns, useSettings, useWallet } from "@/data/hooks";
import { FadeIn, IconButton, Row, S, Screen, SectionHeader, Title } from "@/components/ui";
import PlayerCard from "@/components/profile/PlayerCard";
import StatsBlock from "@/components/profile/StatsBlock";
import Badges from "@/components/profile/Badges";
import WalletCard from "@/components/profile/WalletCard";
import StepHistory from "@/components/profile/StepHistory";
import EditProfileSheet from "@/components/profile/EditProfileSheet";
import { MembershipCard, ProfileSkeleton, RecentRuns } from "@/components/profile/ProfileExtras";

export default function ProfileScreen() {
  const router = useRouter();
  const profileQ = useProfile();
  const walletQ = useWallet();
  const runsQ = useRuns(5);
  const { data: settings } = useSettings();
  const [editing, setEditing] = useState(false);
  const p = profileQ.data;
  const units = settings?.units || "km";

  const refresh = () => {
    profileQ.refetch();
    walletQ.refetch();
    runsQ.refetch();
  };

  const header = (
    <Row style={{ paddingHorizontal: S.gutter, paddingTop: S.sm, paddingBottom: S.md, justifyContent: "space-between" }}>
      <Title size={30} style={{ letterSpacing: -0.8 }}>
        Profile
      </Title>
      <IconButton icon={Settings} label="Settings" onPress={() => router.push("/settings")} style={{ width: 44, height: 44, borderRadius: 22 }} />
    </Row>
  );

  if (profileQ.isPending || !p) {
    return (
      <Screen tab header={header}>
        <ProfileSkeleton />
      </Screen>
    );
  }

  const earned = p.badges.filter((b) => b.earned).length;
  const goRun = () => router.push("/(tabs)/move");

  return (
    <Screen tab header={header} onRefresh={refresh} refreshing={profileQ.isRefetching}>
      <PlayerCard profile={p} onEdit={() => setEditing(true)} />

      <SectionHeader title="Stats" />
      <StatsBlock profile={p} units={units} />

      <SectionHeader title="Wallet" />
      <FadeIn>
        <WalletCard wallet={walletQ.data} loading={walletQ.isPending} onRewards={() => router.push("/rewards")} />
      </FadeIn>

      <SectionHeader title={`Badges · ${earned} of ${p.badges.length}`} />
      <Badges badges={p.badges} />

      <SectionHeader title="Step history" />
      <StepHistory goal={p.dailyGoal || 10000} />

      <SectionHeader title="Recent runs" action={runsQ.data?.length ? "Start a run" : undefined} onAction={goRun} />
      <RecentRuns runs={runsQ.data} loading={runsQ.isPending} units={units} onStart={goRun} />

      <SectionHeader title="Membership" />
      <MembershipCard tier={p.tier} blackEligible={p.blackEligible} onPress={() => router.push("/membership")} />

      <EditProfileSheet visible={editing} profile={p} onClose={() => setEditing(false)} />
    </Screen>
  );
}
