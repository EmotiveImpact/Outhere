// Someone else's profile: their photo and ring, where they're from and their
// club, your head to head this week above their numbers, and Challenge as
// the main button. Message opens your shared club's chat when you share one.

import React, { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { MessageSquare, MoreHorizontal, Share2, Swords, UserCheck, UserPlus } from "lucide-react-native";
import { engine, useEngineMutation, usePlayerCard } from "@/data/hooks";
import { AnimatedBar, Avatar, Body, Button, C, Card, EmptyState, F, FadeIn, Header, IconButton, LiveDot, PressableScale, R, Row, S, Screen, Sheet, Skeleton, imageSource, toast } from "@/components/ui";
import { useCrewFocus } from "@/components/crew/shared";
import { Slab, StatTrio } from "@/components/profile/parts";
import { PHOTOS } from "@/constants/photos";
import { PLANS, inviteLink } from "@/constants/plans";
import { compactNumber } from "@/utils/format";

export default function PlayerScreen() {
  const { playerId } = useLocalSearchParams();
  const id = Array.isArray(playerId) ? playerId[0] : playerId;
  if (id === "me") return <Redirect href="/(tabs)/profile" />;
  return <PlayerProfile id={id} />;
}

function PlayerProfile({ id }) {
  const router = useRouter();
  const focusClub = useCrewFocus((s) => s.focus);
  const { data: p, isPending, error, refetch, isRefetching } = usePlayerCard(id);
  const [menu, setMenu] = useState(false);
  const follow = useEngineMutation(engine.follow, { success: () => `Following ${p?.name || "them"}` });
  const unfollow = useEngineMutation(engine.unfollow, { onSuccess: () => toast(`Unfollowed ${p?.name || "them"}`) });

  if (isPending) {
    return (
      <Screen padded={false} style={{ paddingTop: 0 }}>
        <Skeleton height={300} radius={0} />
        <View style={{ padding: S.gutter, gap: S.md }}>
          <Skeleton height={86} radius={R.lg} />
          <Skeleton height={86} radius={R.lg} />
        </View>
      </Screen>
    );
  }
  if (error || !p) {
    return (
      <Screen header={<Header back />}>
        <EmptyState title="Player not found" body="They may have left Outhere." action="Back to Outside" onAction={() => router.replace("/(tabs)/outside")} />
      </Screen>
    );
  }

  const [first, ...rest] = (p.name || "").split(" ");
  const last = rest.join(" ");
  const place = p.area || p.city;
  const kicker = [place, p.club?.name].filter(Boolean).join(" · ") || `@${p.username}`;
  const meta = [`Level ${p.level?.level || 1}`, p.streak ? `${p.streak} day streak` : null, p.tier !== "free" ? PLANS[p.tier]?.name : null].filter(Boolean).join(" · ");
  const w = p.week;
  const total = w.mine + w.theirs;
  const share = w.battles ? (w.myWins === w.theirWins ? `${w.myWins} each` : w.myWins > w.theirWins ? `You lead ${w.myWins}–${w.theirWins}` : `${first} leads ${w.theirWins}–${w.myWins}`) : "No battles yet";
  const busy = follow.isPending || unfollow.isPending;
  const challenge = () => router.push({ pathname: "/battles/new", params: { opponent: p.id } });
  const message = () => {
    focusClub(p.sharedClubId);
    router.push("/(tabs)/club");
  };
  const shareProfile = () => {
    setMenu(false);
    Share.share({ message: `${p.name} is on Outhere: https://${inviteLink(p.username)}` }).catch(() => {});
  };

  return (
    <Screen padded={false} style={{ paddingTop: 0 }} onRefresh={refetch} refreshing={isRefetching}>
      <Slab
        photo={imageSource(p.avatar) || PHOTOS.walk}
        kicker={kicker}
        top={first}
        bottom={last || undefined}
        height={300}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/outside"))}
        right={<IconButton icon={MoreHorizontal} onPress={() => setMenu(true)} label="More" />}
      >
        <Row gap={6} style={{ marginTop: 8 }}>
          {p.isOutside ? <LiveDot size={6} /> : null}
          <Text style={styles.meta}>{p.isOutside ? `Out now · ${meta}` : meta}</Text>
        </Row>
      </Slab>

      <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg, gap: S.md }}>
        {p.bio ? <Body dim size={14}>{p.bio}</Body> : null}
        <FadeIn>
          <Card padding={S.lg}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={styles.cardTitle}>You and {first} this week</Text>
              <Text style={styles.dim}>
                {w.battles ? `${w.battles} battle${w.battles === 1 ? "" : "s"} · ${share}` : share}
              </Text>
            </Row>
            <Row gap={S.sm} style={{ marginTop: S.md }}>
              <Avatar uri={p.me?.avatar} name={p.me?.name} tier={p.me?.tier} size={30} />
              <Text style={styles.num}>{compactNumber(w.mine)}</Text>
              <View style={{ flex: 1 }}>
                <AnimatedBar value={total ? w.mine / total : 0.5} height={8} colour={C.accent} track={C.surfaceHigh} />
              </View>
              <Text style={styles.num}>{compactNumber(w.theirs)}</Text>
              <Avatar uri={p.avatar} name={p.name} tier={p.tier} size={30} />
            </Row>
          </Card>
        </FadeIn>

        <FadeIn index={1}>
          <StatTrio
            items={[
              { label: "Steps", value: p.totals.steps },
              { label: "km", value: p.totals.km },
              { label: "Badges", value: p.totals.badges },
            ]}
          />
        </FadeIn>

        <Row gap={S.sm} style={{ marginTop: S.xs }}>
          <View style={{ flex: 1 }}>
            <Button title="Challenge" icon={Swords} size="lg" full onPress={challenge} />
          </View>
          <View style={{ flex: 1 }}>
            {p.isFollowing ? (
              <Button title="Following" icon={UserCheck} variant="secondary" size="lg" full loading={busy} onPress={() => unfollow.mutate(p.id)} />
            ) : (
              <Button title="Follow" icon={UserPlus} variant="secondary" size="lg" full loading={busy} onPress={() => follow.mutate(p.id)} />
            )}
          </View>
          {p.sharedClubId ? (
            <PressableScale onPress={message} scaleTo={0.94} accessibilityLabel="Message in your club" style={styles.msg}>
              <MessageSquare size={20} color={C.text} />
            </PressableScale>
          ) : null}
        </Row>

        {p.club ? (
          <Card padding={S.md} onPress={() => router.push(`/crew/${p.club.id}`)}>
            <Row gap={S.md}>
              <Avatar uri={typeof p.club.logo === "string" ? p.club.logo : undefined} source={typeof p.club.logo === "string" ? undefined : p.club.logo} name={p.club.name} size={40} square />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {p.club.name}
                </Text>
                <Text style={styles.dim} numberOfLines={1}>
                  {[`${p.club.memberCount} members`, p.club.area || p.club.city].filter(Boolean).join(" · ")}
                </Text>
              </View>
              {p.sharedClubId ? <Text style={styles.dim}>Your club too</Text> : null}
            </Row>
          </Card>
        ) : null}
      </View>

      <Sheet visible={menu} onClose={() => setMenu(false)}>
        <Text style={[styles.cardTitle, { marginBottom: S.md }]}>@{p.username}</Text>
        <Button title="Share their profile" icon={Share2} variant="secondary" full onPress={shareProfile} />
        {p.story ? (
          <Button
            title="See their story"
            variant="secondary"
            full
            style={{ marginTop: S.sm }}
            onPress={() => {
              setMenu(false);
              router.push(`/stories/${p.id}`);
            }}
          />
        ) : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { color: C.textSoft, fontFamily: F.body, fontSize: 14 },
  cardTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14.5 },
  dim: { color: C.textDim, fontFamily: F.body, fontSize: 12.5 },
  num: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  msg: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
});
