// Public crew page. Works for members and non-members: header, stats, members
// and leaderboard, with Join / Leave / Open in Crew tab.

import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowRight, DoorOpen, KeyRound, Share2, Users } from "lucide-react-native";
import { Avatar, Body, Button, C, Card, EmptyState, F, Header, IconButton, Loading, Row, S, Screen, SectionHeader, StatTile } from "@/components/ui";
import { engine, useCrew, useEngineMutation } from "@/data/hooks";
import { compactNumber } from "@/utils/format";
import CrewHero from "@/components/crew/CrewHero";
import CrewLeaderboard from "@/components/crew/CrewLeaderboard";
import { shareInvite } from "@/components/crew/CrewSettings";
import { ROLE_LABEL, useCrewFocus } from "@/components/crew/shared";

export default function CrewDetail() {
  const { crewId } = useLocalSearchParams();
  const id = String(crewId || "");
  const router = useRouter();
  const focus = useCrewFocus((s) => s.focus);
  const { data: crew, isPending, isError, refetch, isRefetching } = useCrew(id);
  const [code, setCode] = useState("");

  const join = useEngineMutation(engine.joinCrew, { onSuccess: () => focus(id) });
  const joinByCode = useEngineMutation(engine.joinCrewByCode, {
    onSuccess: (joined) => {
      setCode("");
      focus(joined.id);
      if (joined.id !== id) router.replace(`/crew/${joined.id}`);
    },
  });
  const leave = useEngineMutation(engine.leaveCrew);

  const openInTab = () => {
    focus(id);
    router.dismissTo("/(tabs)/club");
  };

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
        <Loading />
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

  const members = crew.members || [];
  const totalWeekSteps = members.reduce((sum, m) => sum + (m.weekSteps || 0), 0);
  const outsideNow = members.filter((m) => m.isOutside).length;

  return (
    <Screen
      onRefresh={refetch}
      refreshing={isRefetching}
      header={
        <Header back title={crew.name} right={crew.isMember && crew.inviteCode ? <IconButton icon={Share2} onPress={() => shareInvite(crew)} label="Share invite code" /> : null} />
      }
    >
      <CrewHero crew={crew} />

      <View style={{ marginTop: S.lg }}>
        {crew.isMember ? (
          <Row gap={S.sm}>
            <Button title="Open in Crew tab" icon={ArrowRight} onPress={openInTab} style={{ flex: 1 }} />
            <Button title="Leave" icon={DoorOpen} variant="secondary" onPress={confirmLeave} loading={leave.isPending} />
          </Row>
        ) : crew.privacy === "public" ? (
          <Button title={`Join ${crew.name}`} icon={Users} onPress={() => join.mutate(id)} loading={join.isPending} full size="lg" />
        ) : (
          <Card>
            <Row gap={S.sm}>
              <KeyRound size={16} color={C.accent} />
              <Text style={styles.cardTitle}>Invite only</Text>
            </Row>
            <Body dim size={13} style={{ marginTop: 4 }}>
              Ask a member for the crew code and enter it here.
            </Body>
            <Row gap={S.sm} style={{ marginTop: S.md }}>
              <TextInput
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                placeholder="Crew code"
                placeholderTextColor={C.textMute}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
                style={styles.input}
              />
              <Button title="Join" onPress={() => joinByCode.mutate(code)} disabled={!code.trim()} loading={joinByCode.isPending} />
            </Row>
          </Card>
        )}
      </View>

      <Row gap={S.sm} style={{ marginTop: S.lg }}>
        <StatTile label="Steps" value={compactNumber(totalWeekSteps)} hint="this week" />
        <StatTile label="Members" value={String(crew.memberCount)} hint={`${outsideNow} outside now`} accent={outsideNow > 0} />
        <StatTile label="Goal" value={`${crew.weeklyGoalKm}`} hint="km a week" />
      </Row>

      {crew.owner ? (
        <Card style={{ marginTop: S.md }} onPress={() => router.push(crew.owner.isMe ? "/(tabs)/profile" : `/player/${crew.owner.id}`)}>
          <Row gap={S.md}>
            <Avatar uri={crew.owner.avatar} name={crew.owner.name || crew.owner.username} size={40} />
            <View style={{ flex: 1 }}>
              <Body mute size={12}>Run by</Body>
              <Text style={styles.name}>{crew.owner.isMe ? "You" : crew.owner.name || crew.owner.username}</Text>
            </View>
            <ArrowRight size={18} color={C.textMute} />
          </Row>
        </Card>
      ) : null}

      <SectionHeader title="Members" />
      <Card padding={0}>
        {members.slice(0, 8).map((m, i) => (
          <Pressable
            key={m.player.id}
            onPress={() => router.push(m.player.isMe ? "/(tabs)/profile" : `/player/${m.player.id}`)}
            style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && { opacity: 0.6 }]}
          >
            <Avatar uri={m.player.avatar} name={m.player.name || m.player.username} size={38} outside={m.isOutside} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {m.player.isMe ? "You" : m.player.name || m.player.username}
              </Text>
              <Body mute size={12}>@{m.player.username}</Body>
            </View>
            {m.role !== "member" ? <Text style={[styles.role, { color: crew.accent || C.accent }]}>{ROLE_LABEL[m.role]}</Text> : null}
          </Pressable>
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
  input: { flex: 1, height: 46, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh, color: C.text, paddingHorizontal: S.md, fontSize: 15, fontFamily: F.displayMedium, letterSpacing: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  name: { color: C.text, fontSize: 15, fontWeight: "600" },
  role: { fontSize: 12, fontWeight: "700" },
});
