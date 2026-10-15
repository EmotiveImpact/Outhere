// Someone else's profile: their photo and ring, where they're from and their
// club, your head to head this week above their numbers, and Challenge as
// the main button. Message opens your shared club's chat when you share one.

import React, { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { MessageSquare, MoreHorizontal, Share2, Swords, UserPlus } from "lucide-react-native";
import { engine, useEngineMutation, usePlayerCard } from "@/data/hooks";
import { AnimatedBar, Avatar, Button, C, EmptyState, F, FadeIn, GlowButton, Header, LiveDot, R, Row, S, Screen, Sheet, Skeleton, Surface, imageSource, toast } from "@/components/ui";
import { StackTabBar } from "@/components/AppTabBar";
import { useCrewFocus } from "@/components/crew/shared";
import { RoundGlass, Slab, StatTrio } from "@/components/profile/parts";
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
    if (!p.sharedClubId) return toast(`You can message ${first} once you share a club.`);
    focusClub(p.sharedClubId);
    router.push("/(tabs)/club");
  };
  const shareProfile = () => {
    setMenu(false);
    Share.share({ message: `${p.name} is on Outhere: https://${inviteLink(p.username)}` }).catch(() => {});
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
    <Screen tab padded={false} style={{ paddingTop: 0 }} onRefresh={refetch} refreshing={isRefetching}>
      {/* .slab.photo 300: the whole runner in frame (focus high), first name only. */}
      <Slab
        photo={imageSource(p.avatar) || PHOTOS.walk}
        focus={{ x: 0.5, y: 0.18 }}
        kicker={kicker}
        top={first}
        bottom={last || undefined}
        height={286}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/outside"))}
        right={<RoundGlass icon={MoreHorizontal} onPress={() => setMenu(true)} label="More" />}
      >
        <Row gap={6} style={{ marginTop: 6 }}>
          {p.isOutside ? <LiveDot size={6} /> : null}
          <Text style={styles.meta}>{p.isOutside ? `Out now · ${meta}` : meta}</Text>
        </Row>
        {p.bio ? (
          <Text style={styles.bio} numberOfLines={1}>
            {p.bio}
          </Text>
        ) : null}
      </Slab>

      <View style={{ paddingHorizontal: 18, paddingTop: 14, gap: 10 }}>
        <FadeIn>
          {/* .card.vs: you and them this week, a thin blue bar between the two totals */}
          <Surface radius={20} padding={null} contentStyle={styles.vs}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={styles.cardTitle}>You and {first} this week</Text>
              <Text style={styles.dim}>
                {w.battles ? `${w.battles} battle${w.battles === 1 ? "" : "s"} · ${share}` : share}
              </Text>
            </Row>
            <Row gap={8} style={{ marginTop: 9 }}>
              <Avatar uri={p.me?.avatar} name={p.me?.name} size={26} />
              <Text style={styles.num}>{compactNumber(w.mine)}</Text>
              <View style={{ flex: 1 }}>
                <AnimatedBar value={total ? w.mine / total : 0.5} height={6} colour={C.accent} track="rgba(255,255,255,0.08)" />
              </View>
              <Text style={styles.num}>{compactNumber(w.theirs)}</Text>
              <Avatar uri={p.avatar} name={p.name} size={26} />
            </Row>
          </Surface>
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

        {/* .row3: Challenge (the act button, glowing), Follow or Following (quiet), and a message square */}
        <Row gap={8} style={{ marginTop: 2 }}>
          <GlowButton title="Challenge" icon={Swords} size="md" onPress={challenge} style={[styles.btn, { flex: 1 }]} textStyle={styles.btnText} />
          {p.isFollowing ? (
            <GlowButton title="Following" variant="quiet" size="md" loading={busy} onPress={() => unfollow.mutate(p.id)} style={[styles.btn, { flex: 1 }]} textStyle={styles.btnText} />
          ) : (
            <GlowButton title="Follow" icon={UserPlus} variant="quiet" size="md" loading={busy} onPress={() => follow.mutate(p.id)} style={[styles.btn, { flex: 1 }]} textStyle={styles.btnText} />
          )}
          <GlowButton icon={MessageSquare} square variant="quiet" size="md" onPress={message} accessibilityLabel={p.sharedClubId ? "Message in your club" : `Message ${first}`} style={styles.btn} />
        </Row>

        {p.club ? (
          <Surface radius={20} padding={null} contentStyle={styles.club} onPress={() => router.push(`/crew/${p.club.id}`)} accessibilityLabel={p.club.name}>
            <Row gap={12}>
              <Avatar uri={typeof p.club.logo === "string" ? p.club.logo : undefined} source={typeof p.club.logo === "string" ? undefined : p.club.logo} name={p.club.name} size={38} square />
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
          </Surface>
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
    {/* Someone else's profile sits under Crew in the prototype. */}
    <StackTabBar current="club" />
    </View>
  );
}

const styles = StyleSheet.create({
  meta: { color: "rgba(255,255,255,0.78)", fontFamily: F.body, fontSize: 12.5 },
  bio: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: 4, maxWidth: 300 },
  vs: { paddingTop: 12, paddingBottom: 12, paddingLeft: 14, paddingRight: 14 },
  club: { paddingTop: 11, paddingBottom: 11, paddingLeft: 12, paddingRight: 14 },
  cardTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  dim: { color: C.textDim, fontFamily: F.body, fontSize: 11.5 },
  num: { color: C.text, fontFamily: F.bodySemi, fontSize: 12.5 },
  btn: { height: 48, paddingHorizontal: 16 },
  btnText: { fontSize: 14.5 },
});
