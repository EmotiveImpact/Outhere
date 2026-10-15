// Your profile: the photo in its membership ring, level, your three numbers,
// badges, and the streak card that leads back to Challenges. Below that, the
// doors to your wallet, friends, emotes and membership, step history and runs.

import React, { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, Flame, Gift, MoreHorizontal, Pencil, Search, Settings, Share2, Smile, Snowflake, Users, Wallet } from "lucide-react-native";
import { useBadges, useChallenges, useMyCrews, useProfile, useRuns, useSettings, useStreakStatus, useWallet } from "@/data/hooks";
import { Body, C, Card, Divider, F, FadeIn, IconButton, ListRow, Row, S, Screen, SectionHeader, Sheet, Title } from "@/components/ui";
import { ProfileHero, LevelCard } from "@/components/profile/PlayerCard";
import StepHistory from "@/components/profile/StepHistory";
import EditProfileSheet from "@/components/profile/EditProfileSheet";
import { MembershipCard, ProfileSkeleton, RecentRuns } from "@/components/profile/ProfileExtras";
import { BadgeTile, IconWell, PillButton, StatTrio } from "@/components/profile/parts";
import { formatNumber } from "@/utils/format";
import { inviteLink } from "@/constants/plans";

export default function ProfileScreen() {
  const router = useRouter();
  const profileQ = useProfile();
  const walletQ = useWallet();
  const runsQ = useRuns(5);
  const badgesQ = useBadges();
  const streakQ = useStreakStatus();
  const { data: challenges } = useChallenges();
  const { data: crews } = useMyCrews();
  const { data: settings } = useSettings();
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(false);
  const p = profileQ.data;
  const units = settings?.units || "km";

  const refresh = () => {
    profileQ.refetch();
    walletQ.refetch();
    runsQ.refetch();
    badgesQ.refetch();
    streakQ.refetch();
  };

  if (profileQ.isPending || !p) {
    return (
      <Screen tab>
        <ProfileSkeleton />
      </Screen>
    );
  }

  const go = (path) => () => router.push(path);
  const badges = badgesQ.data;
  // Two latest earned, then the closest one still to win.
  const earned = (badges?.items || []).filter((b) => b.earned).sort((a, b) => (b.earnedAt || 0) - (a.earnedAt || 0));
  const nextUp = (badges?.items || []).filter((b) => !b.earned).sort((a, b) => b.progress - a.progress);
  const shelf = [...earned.slice(0, 2), ...nextUp].slice(0, 3);

  const today = (challenges || []).filter((c) => c.period === "day");
  const pool = today.length ? today : (challenges || []).filter((c) => c.joined);
  const done = pool.filter((c) => c.status === "complete" || c.status === "claimed").length;
  const streak = streakQ.data;
  const atRisk = !!streak?.atRisk;
  const club = crews?.[0]?.name || null;

  const shareProfile = () => Share.share({ message: `I'm on Outhere as @${p.username}. Come find me: https://${inviteLink(p.username)}` }).catch(() => {});

  return (
    <Screen tab style={{ paddingTop: 0 }} onRefresh={refresh} refreshing={profileQ.isRefetching} padded={false}>
      <ProfileHero
        profile={p}
        clubName={club}
        onTryPro={go("/membership")}
        onAvatar={() => setEditing(true)}
        right={<IconButton icon={MoreHorizontal} label="More" onPress={() => setMenu(true)} />}
      />
      <View style={{ paddingHorizontal: S.gutter, marginTop: S.lg, gap: S.md }}>
        <LevelCard level={p.level} />
        <FadeIn index={1}>
          <StatTrio
            items={[
              { value: p.totals.steps, label: "Steps" },
              { value: Math.round(p.totals.distance), label: units === "mi" ? "mi" : "km" },
              { value: String(p.streak), label: "Day streak" },
            ]}
          />
        </FadeIn>
      </View>

      <View style={{ paddingHorizontal: S.gutter }}>
        <SectionHeader title="Badges" action={badges ? `${badges.earnedCount} of ${badges.total}` : undefined} onAction={go("/badges")} />
        <Row gap={S.sm} style={{ alignItems: "stretch" }}>
          {shelf.map((b) => (
            <BadgeTile key={b.id} badge={b} onPress={go("/badges")} />
          ))}
        </Row>

        <FadeIn index={2}>
          <Card padding={S.lg} style={{ marginTop: S.lg }} onPress={atRisk ? go("/streak") : go("/(tabs)/outside/challenges")}>
            <Row gap={S.md}>
              <IconWell icon={atRisk ? Snowflake : Flame} colour={atRisk ? C.warn : C.accentHi} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{p.streak} day streak</Text>
                <Body dim size={13} numberOfLines={2}>
                  {atRisk
                    ? `${formatNumber(streak.stepsLeft)} steps to keep it · ${streak.hoursLeft} hours left`
                    : pool.length
                      ? `Challenges · ${done} of ${pool.length} done today`
                      : "Challenges · pick one for today"}
                </Body>
              </View>
              <PillButton title={atRisk ? "Save it" : "Open"} onPress={atRisk ? go("/streak") : go("/(tabs)/outside/challenges")} />
            </Row>
          </Card>
        </FadeIn>

        <SectionHeader title="You" />
        <Card padding={0} style={{ paddingHorizontal: S.lg }}>
          <ListRow leading={<IconWell icon={Wallet} size={36} />} title="Wallet" subtitle={`${formatNumber(walletQ.data?.out ?? p.out)} OUT`} onPress={go("/wallet")} />
          <Divider />
          <ListRow leading={<IconWell icon={Users} size={36} />} title="Friends" subtitle={`${p.followingCount} following · ${p.followersCount} followers`} onPress={go("/friends")} />
          <Divider />
          <ListRow leading={<IconWell icon={Gift} size={36} />} title="Invite friends" subtitle="Give 500 OUT, get 500" onPress={go("/friends/invite")} />
          <Divider />
          <ListRow leading={<IconWell icon={Smile} size={36} />} title="Emotes" subtitle="Your collection and your tray" onPress={go("/emotes")} />
        </Card>

        <SectionHeader title="Membership" />
        <MembershipCard tier={p.tier} onPress={p.tier === "free" ? go("/membership") : go("/membership/manage")} />

        <SectionHeader title="Step history" />
        <StepHistory goal={p.dailyGoal || 10000} />

        <SectionHeader title="Recent runs" action={runsQ.data?.length ? "Start a run" : undefined} onAction={go("/(tabs)/move")} />
        <RecentRuns runs={runsQ.data} loading={runsQ.isPending} units={units} onStart={go("/(tabs)/move")} />
      </View>

      <EditProfileSheet visible={editing} profile={p} onClose={() => setEditing(false)} />
      <Sheet visible={menu} onClose={() => setMenu(false)}>
        <Title size={22} style={{ marginBottom: S.sm }}>
          @{p.username}
        </Title>
        {[
          { icon: Pencil, label: "Edit profile", on: () => setEditing(true) },
          { icon: Share2, label: "Share my profile", on: shareProfile },
          { icon: Search, label: "Search Outhere", on: go("/search") },
          { icon: Settings, label: "Settings", on: go("/settings") },
        ].map((it) => (
          <ListRow
            key={it.label}
            leading={<it.icon size={20} color={C.text} />}
            title={it.label}
            trailing={<ChevronRight size={16} color={C.textMute} />}
            chevron={false}
            onPress={() => {
              setMenu(false);
              it.on();
            }}
          />
        ))}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 16 },
});
