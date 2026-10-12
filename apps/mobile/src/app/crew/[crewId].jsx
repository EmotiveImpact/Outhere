// Public crew page. Works for members and non-members: hero, stats, members
// and leaderboard, with Join / Leave / Open in Crew tab.

import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowRight, ChevronRight, DoorOpen, Share2, Users } from "lucide-react-native";
import { AnimatedNumber, Body, Button, C, Card, EmptyState, F, FadeIn, Header, IconButton, LiveDot, PressableScale, Row, S, Screen, SectionHeader, Skeleton } from "@/components/ui";
import { engine, useCrew, useEngineMutation } from "@/data/hooks";
import { compactNumber } from "@/utils/format";
import CrewHero, { useCountUp } from "@/components/crew/CrewHero";
import CrewLeaderboard from "@/components/crew/CrewLeaderboard";
import { shareInvite } from "@/components/crew/CrewSettings";
import { PlayerAvatar, ROLE_LABEL, playerName, useCrewFocus } from "@/components/crew/shared";

function Stat({ value, format, hint, live }) {
  const shown = useCountUp(value);
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <AnimatedNumber value={shown} format={format} style={styles.statValue} />
      <Row gap={6}>
        {live ? <LiveDot size={6} /> : null}
        <Body dim size={13} numberOfLines={1}>
          {hint}
        </Body>
      </Row>
    </View>
  );
}

function DetailSkeleton() {
  return (
    <View style={{ gap: S.md }}>
      <Row gap={S.md}>
        <Skeleton width={56} height={56} radius={17} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="60%" height={20} />
          <Skeleton width="40%" height={12} />
        </View>
      </Row>
      <Skeleton width="50%" height={56} style={{ marginTop: S.xl }} />
      <Skeleton height={6} />
      <Skeleton height={56} radius={99} style={{ marginTop: S.xl }} />
    </View>
  );
}

export default function CrewDetail() {
  const { crewId } = useLocalSearchParams();
  const id = String(crewId || "");
  const router = useRouter();
  const focus = useCrewFocus((s) => s.focus);
  const { data: crew, isPending, isError, refetch, isRefetching } = useCrew(id);
  const [code, setCode] = useState("");

  const join = useEngineMutation(engine.joinCrew, { success: (c) => `You're in ${c.name}`, onSuccess: () => focus(id) });
  const joinByCode = useEngineMutation(engine.joinCrewByCode, {
    success: (c) => `You're in ${c.name}`,
    onSuccess: (joined) => {
      setCode("");
      focus(joined.id);
      if (joined.id !== id) router.replace(`/crew/${joined.id}`);
    },
  });
  const leave = useEngineMutation(engine.leaveCrew, { success: () => `You left ${crew?.name || "the crew"}` });

  const openInTab = () => {
    focus(id);
    router.dismissTo("/(tabs)/club");
  };

  const openPlayer = (p) => router.push(p.isMe ? "/(tabs)/profile" : `/player/${p.id}`);

  const confirmLeave = () =>
    Alert.alert(
      `Leave ${crew.name}?`,
      crew.myRole === "owner"
        ? crew.memberCount > 1
          ? "You own this crew. Ownership passes to an admin, or the longest standing member."
          : "You're the only member, so the crew will be deleted."
        : "You can rejoin later if it's public or you have the code.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () =>
            leave.mutate(id, {
              onSuccess: () => {
                if (crew.myRole === "owner" && crew.memberCount <= 1) router.back();
              },
            }),
        },
      ]
    );

  if (isPending) {
    return (
      <Screen header={<Header back title="Crew" />}>
        <DetailSkeleton />
      </Screen>
    );
  }

  if (isError || !crew) {
    return (
      <Screen header={<Header back title="Crew" />}>
        <EmptyState title="Crew not found" body="It may have been deleted by its owner." action="Browse crews" onAction={() => router.dismissTo("/(tabs)/club")} />
      </Screen>
    );
  }

  const members = crew.members || [];
  const totalWeekSteps = members.reduce((sum, m) => sum + (m.weekSteps || 0), 0);
  const outsideNow = members.filter((m) => m.isOutside).length;
  const ROLE_ORDER = { owner: 0, admin: 1, member: 2 };
  const ranked = [...members].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);

  return (
    <Screen
      onRefresh={refetch}
      refreshing={isRefetching}
      header={<Header back title="Crew" right={crew.isMember && crew.inviteCode ? <IconButton icon={Share2} onPress={() => shareInvite(crew)} label="Share invite code" /> : null} />}
    >
      <FadeIn>
        <CrewHero crew={crew} />
      </FadeIn>

      <FadeIn index={1} style={{ marginTop: S.xxl }}>
        {crew.isMember ? (
          <Row gap={S.sm}>
            <View style={{ flex: 1 }}>
              <Button title="Open in Crew tab" icon={ArrowRight} onPress={openInTab} full size="lg" />
            </View>
            <Button title="Leave" icon={DoorOpen} variant="secondary" onPress={confirmLeave} loading={leave.isPending} size="lg" />
          </Row>
        ) : crew.privacy === "public" ? (
          <Button title={`Join ${crew.name}`} icon={Users} onPress={() => join.mutate(id)} loading={join.isPending} full size="lg" />
        ) : (
          <View>
            <Text style={styles.cardTitle}>Invite only</Text>
            <Body dim size={13} style={{ marginTop: 2 }}>
              Ask a member for the crew code.
            </Body>
            <Row gap={S.sm} style={{ marginTop: S.md }}>
              <TextInput
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase().replace(/\s/g, ""))}
                placeholder="CREW CODE"
                placeholderTextColor={C.textMute}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                style={styles.input}
                accessibilityLabel="Crew invite code"
              />
              <Button title="Join" onPress={() => joinByCode.mutate(code)} disabled={!code.trim()} loading={joinByCode.isPending} size="lg" />
            </Row>
          </View>
        )}
      </FadeIn>

      <FadeIn index={2}>
        <Row gap={S.lg} style={{ marginTop: S.xxl }}>
          <Stat value={totalWeekSteps} format={compactNumber} hint="steps this week" />
          <Stat value={outsideNow} hint="outside now" live={outsideNow > 0} />
        </Row>
      </FadeIn>

      <SectionHeader title="Members" style={{ marginTop: S.xxl + 4 }} />
      <Card padding={0}>
        {ranked.slice(0, 8).map((m, i) => (
          <PressableScale key={m.player.id} onPress={() => openPlayer(m.player)} scaleTo={0.985} style={[styles.row, i > 0 && styles.divider]}>
            <PlayerAvatar player={m.player} size={40} outside={m.isOutside} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {playerName(m.player)}
              </Text>
              <Body dim size={13} numberOfLines={1}>
                {m.role !== "member" ? `${ROLE_LABEL[m.role]} · ` : ""}
                {compactNumber(m.weekSteps)} steps this week
              </Body>
            </View>
            <ChevronRight size={18} color={C.textMute} />
          </PressableScale>
        ))}
        {members.length > 8 ? (
          <Body mute size={13} style={{ padding: S.lg, paddingTop: S.sm }}>
            and {members.length - 8} more
          </Body>
        ) : null}
      </Card>

      <SectionHeader title="Leaderboard" style={{ marginTop: S.xxl + 4 }} />
      <CrewLeaderboard crew={crew} limit={10} embedded />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { color: C.text, fontFamily: F.displayMedium, fontSize: 16 },
  input: { flex: 1, minWidth: 0, height: 56, borderRadius: 16, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.surface, color: C.text, paddingHorizontal: S.lg, fontSize: 17, fontFamily: F.display, letterSpacing: 4 },
  statValue: { color: C.text, fontFamily: F.display, fontSize: 28, letterSpacing: -0.5 },
  row: { flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  name: { color: C.text, fontSize: 15, fontWeight: "600" },
});
