// Public crew page. Works for members and non-members: hero, stats, members
// and leaderboard, with Join / Leave / Open in Crew tab.

import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowRight, ChevronRight, DoorOpen, KeyRound, Share2, Users } from "lucide-react-native";
import { AnimatedNumber, Body, Button, C, Card, EmptyState, F, FadeIn, Header, IconButton, Label, LiveDot, PressableScale, Row, S, Screen, SectionHeader, Skeleton } from "@/components/ui";
import { engine, useCrew, useEngineMutation } from "@/data/hooks";
import { compactNumber } from "@/utils/format";
import CrewHero, { useCountUp } from "@/components/crew/CrewHero";
import CrewLeaderboard from "@/components/crew/CrewLeaderboard";
import { shareInvite } from "@/components/crew/CrewSettings";
import { PlayerAvatar, ROLE_LABEL, crewAccent, playerName, useCrewFocus } from "@/components/crew/shared";

function Stat({ label, value, format, hint, live }) {
  const shown = useCountUp(value);
  return (
    <View style={styles.stat}>
      <Label>{label}</Label>
      <AnimatedNumber value={shown} format={format} style={styles.statValue} />
      <Row gap={5}>
        {live ? <LiveDot size={6} /> : null}
        <Body mute size={12} numberOfLines={1} style={live ? { color: C.accent } : null}>
          {hint}
        </Body>
      </Row>
    </View>
  );
}

function DetailSkeleton() {
  return (
    <View style={{ gap: S.md }}>
      <Skeleton height={300} radius={24} />
      <Skeleton height={56} radius={99} />
      <Row gap={S.sm}>
        <Skeleton height={92} radius={16} style={{ flex: 1 }} />
        <Skeleton height={92} radius={16} style={{ flex: 1 }} />
        <Skeleton height={92} radius={16} style={{ flex: 1 }} />
      </Row>
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
        <EmptyState icon={Users} title="Crew not found" body="It may have been deleted by its owner." action="Browse crews" onAction={() => router.dismissTo("/(tabs)/club")} />
      </Screen>
    );
  }

  const accent = crewAccent(crew);
  const members = crew.members || [];
  const totalWeekSteps = members.reduce((sum, m) => sum + (m.weekSteps || 0), 0);
  const outsideNow = members.filter((m) => m.isOutside).length;

  return (
    <Screen
      onRefresh={refetch}
      refreshing={isRefetching}
      header={<Header back title="Crew" right={crew.isMember && crew.inviteCode ? <IconButton icon={Share2} onPress={() => shareInvite(crew)} label="Share invite code" /> : null} />}
    >
      <FadeIn>
        <CrewHero crew={crew} />
      </FadeIn>

      <FadeIn index={1} style={{ marginTop: S.lg }}>
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
          <Card style={{ borderColor: `${accent}55` }}>
            <Row gap={S.sm}>
              <KeyRound size={16} color={accent} />
              <Text style={styles.cardTitle}>Invite only</Text>
            </Row>
            <Body dim size={13} style={{ marginTop: 4 }}>
              Ask a member for the crew code and drop it in.
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
              />
              <Button title="Join" onPress={() => joinByCode.mutate(code)} disabled={!code.trim()} loading={joinByCode.isPending} size="lg" />
            </Row>
          </Card>
        )}
      </FadeIn>

      <FadeIn index={2}>
        <Row gap={S.sm} style={{ marginTop: S.lg }}>
          <Stat label="Steps" value={totalWeekSteps} format={compactNumber} hint="this week" />
          <Stat label="Members" value={crew.memberCount} hint={outsideNow ? `${outsideNow} outside` : "none out now"} live={outsideNow > 0} />
          <Stat label="Goal" value={crew.weeklyGoalKm} hint="km a week" />
        </Row>
      </FadeIn>

      {crew.owner ? (
        <Card style={{ marginTop: S.md }} onPress={() => openPlayer(crew.owner)}>
          <Row gap={S.md}>
            <PlayerAvatar player={crew.owner} size={44} ring={C.gold} />
            <View style={{ flex: 1 }}>
              <Label>Run by</Label>
              <Text style={styles.name}>{playerName(crew.owner)}</Text>
            </View>
            <ChevronRight size={18} color={C.textMute} />
          </Row>
        </Card>
      ) : null}

      <SectionHeader title="Members" />
      <Card padding={0}>
        {members.slice(0, 8).map((m, i) => (
          <PressableScale key={m.player.id} onPress={() => openPlayer(m.player)} scaleTo={0.985} style={[styles.row, i > 0 && styles.divider]}>
            <PlayerAvatar player={m.player} size={40} outside={m.isOutside} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {playerName(m.player)}
              </Text>
              <Body mute size={12}>
                {compactNumber(m.weekSteps)} steps this week
              </Body>
            </View>
            {m.role !== "member" ? (
              <View style={[styles.role, { backgroundColor: `${accent}1a`, borderColor: `${accent}55` }]}>
                <Text style={[styles.roleText, { color: accent }]}>{ROLE_LABEL[m.role].toUpperCase()}</Text>
              </View>
            ) : null}
          </PressableScale>
        ))}
        {members.length > 8 ? (
          <Body mute size={13} style={{ padding: S.lg, paddingTop: S.sm }}>
            and {members.length - 8} more
          </Body>
        ) : null}
      </Card>

      <SectionHeader title="Leaderboard" />
      <CrewLeaderboard crew={crew} limit={10} embedded />
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { color: C.text, fontFamily: F.displayMedium, fontSize: 16 },
  input: { flex: 1, minWidth: 0, height: 56, borderRadius: 16, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.surfaceHigh, color: C.text, paddingHorizontal: S.lg, fontSize: 17, fontFamily: F.display, letterSpacing: 4 },
  stat: { flex: 1, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: S.md, gap: 4 },
  statValue: { color: C.text, fontFamily: F.display, fontSize: 26, letterSpacing: -0.5 },
  row: { flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  name: { color: C.text, fontSize: 15, fontWeight: "600", marginTop: 2 },
  role: { height: 24, paddingHorizontal: 8, borderRadius: 99, borderWidth: 1, justifyContent: "center" },
  roleText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
});
