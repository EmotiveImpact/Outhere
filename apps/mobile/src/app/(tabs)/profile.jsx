// Your profile, laid out as the prototype's profile9 (with 059's Pro layout):
// a full strength photo slab, your photo in its membership ring overlapping
// it, the membership line, the level card, your three numbers, badges and
// the streak card that leads back to Challenges. From the earlier rounds:
// the level number lit in the level card (profile) and the OUT wallet card
// with the 3D coin (profile5). Below that, the doors to your friends, invites
// and emotes, membership, step history and runs, in the same finish.

import React, { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, Flame, Gift, MoreHorizontal, Pencil, Search, Settings, Share2, Smile, Snowflake, Users } from "@/components/ui/icons";
import { useBadges, useChallenges, useMyCrews, useProfile, useRuns, useSettings, useStreakStatus, useWallet } from "@/data/hooks";
import { BlendImage, C, Divider, F, FadeIn, ListRow, Row, Screen, Sheet, Surface, Title } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { GUTTER, ProfileHero, LevelCard } from "@/components/profile/PlayerCard";
import StepHistory from "@/components/profile/StepHistory";
import EditProfileSheet from "@/components/profile/EditProfileSheet";
import { MembershipCard, ProfileSkeleton, RecentRuns } from "@/components/profile/ProfileExtras";
import { BadgeTile, IconWell, PillTag, RoundGlass, StatTrio } from "@/components/profile/parts";
import { formatNumber } from "@/utils/format";
import { inviteLink } from "@/constants/plans";

const TIER_LINE = { free: "Free member", pro: "Pro member", black: "Black member" };

/** .sec-head: a small semibold title with a blue link on the right. */
function SecHead({ title, action, onAction }) {
  return (
    <Row style={styles.secHead}>
      <Text style={styles.secTitle}>{title}</Text>
      {action ? (
        <Text style={styles.secLink} onPress={onAction} suppressHighlighting>
          {action}
        </Text>
      ) : null}
    </Row>
  );
}

/** .card.nudge: an icon or object on the left, two lines, and a pill on the right. */
function Nudge({ lead, title, line, action, onPress }) {
  return (
    <Surface radius={20} padding={null} onPress={onPress} contentStyle={styles.nudge}>
      {lead}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.nudgeTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.nudgeLine} numberOfLines={2}>
          {line}
        </Text>
      </View>
      <PillTag title={action} />
    </Surface>
  );
}

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
  const wallet = walletQ.data;
  const weekAgo = Date.now() - 7 * 86400000;
  const week = (wallet?.transactions || []).filter((t) => t.type === "out" && t.amount > 0 && t.at >= weekAgo).reduce((n, t) => n + t.amount, 0);

  const shareProfile = () => Share.share({ message: `I'm on Outhere as @${p.username}. Come find me: https://${inviteLink(p.username)}` }).catch(() => {});

  return (
    <Screen tab style={{ paddingTop: 0 }} onRefresh={refresh} refreshing={profileQ.isRefetching} padded={false}>
      <ProfileHero
        profile={p}
        clubName={club}
        onTryPro={go("/membership")}
        onAvatar={() => setEditing(true)}
        right={<RoundGlass icon={MoreHorizontal} label="More" onPress={() => setMenu(true)} />}
      />
      <View style={styles.body}>
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

        <SecHead title="Badges" action={badges ? `${badges.earnedCount} of ${badges.total}` : undefined} onAction={go("/badges")} />
        <Row gap={8} style={{ alignItems: "stretch" }}>
          {shelf.map((b) => (
            <BadgeTile key={b.id} badge={b} onPress={go("/badges")} />
          ))}
        </Row>

        <FadeIn index={2}>
          <Nudge
            lead={<IconWell icon={atRisk ? Snowflake : Flame} colour={atRisk ? C.warn : undefined} />}
            title={`${p.streak} day streak`}
            line={
              atRisk
                ? `${formatNumber(streak.stepsLeft)} steps to keep it · ${streak.hoursLeft} hours left`
                : pool.length
                  ? `Challenges · ${done} of ${pool.length} done today`
                  : "Challenges · pick one for today"
            }
            action={atRisk ? "Save it" : "Open"}
            onPress={atRisk ? go("/streak") : go("/(tabs)/outside/challenges")}
          />
        </FadeIn>

        <FadeIn index={3}>
          <Nudge
            lead={<BlendImage source={PHOTOS.coin} size={40} mask="tight" />}
            title={`${formatNumber(wallet?.out ?? p.out)} OUT`}
            line={week ? `${TIER_LINE[p.tier] || TIER_LINE.free} · earned ${formatNumber(week)} this week` : `${TIER_LINE[p.tier] || TIER_LINE.free} · spend it on drops and events`}
            action="Wallet"
            onPress={go("/wallet")}
          />
        </FadeIn>

        <SecHead title="You" />
        <Surface radius={20} padding={null} contentStyle={{ paddingLeft: 14, paddingRight: 14 }}>
          <ListRow leading={<IconWell icon={Users} size={34} />} title="Friends" subtitle={`${p.followingCount} following · ${p.followersCount} followers`} onPress={go("/friends")} />
          <Divider />
          <ListRow leading={<IconWell icon={Gift} size={34} />} title="Invite friends" subtitle="Give 500 OUT, get 500" onPress={go("/friends/invite")} />
          <Divider />
          <ListRow leading={<IconWell icon={Smile} size={34} />} title="Emotes" subtitle="Your collection and your tray" onPress={go("/emotes")} />
        </Surface>

        <SecHead title="Membership" />
        <MembershipCard tier={p.tier} onPress={p.tier === "free" ? go("/membership") : go("/membership/manage")} />

        <SecHead title="Step history" />
        <StepHistory goal={p.dailyGoal || 10000} />

        <SecHead title="Recent runs" action={runsQ.data?.length ? "Start a run" : undefined} onAction={go("/(tabs)/move")} />
        <RecentRuns runs={runsQ.data} loading={runsQ.isPending} units={units} onStart={go("/(tabs)/move")} />
      </View>

      <EditProfileSheet visible={editing} profile={p} onClose={() => setEditing(false)} />
      <Sheet visible={menu} onClose={() => setMenu(false)}>
        <Title size={22} style={{ marginBottom: 8 }}>
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
  // .body: gap 13, padding 18, pulled up under the identity row
  body: { paddingHorizontal: GUTTER, marginTop: 13, gap: 13 },
  secHead: { justifyContent: "space-between", alignItems: "baseline", marginTop: 1 },
  secTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5, letterSpacing: 0.1 },
  secLink: { color: C.accent, fontFamily: F.bodyMedium, fontSize: 12.5 },
  nudge: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 12, paddingBottom: 12, paddingLeft: 14, paddingRight: 14 },
  nudgeTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  nudgeLine: { color: C.textDim, fontFamily: F.body, fontSize: 11, marginTop: 2 },
});
