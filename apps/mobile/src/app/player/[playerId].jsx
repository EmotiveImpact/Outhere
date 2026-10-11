import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Flame, MapPin, Swords, UserCheck, UserPlus, Users } from "lucide-react-native";
import { engine, useEngineMutation, usePlayer } from "@/data/hooks";
import { Avatar, Body, Button, C, Card, EmptyState, F, Header, Label, ListRow, Loading, Pill, R, Row, S, Screen, SectionHeader, StatTile, TierBadge, Title } from "@/components/ui";
import { compactNumber, formatNumber } from "@/utils/format";
import { hapticSuccess } from "@/services/haptics";

export default function PlayerScreen() {
  const { playerId } = useLocalSearchParams();
  const id = Array.isArray(playerId) ? playerId[0] : playerId;
  if (id === "me") return <Redirect href="/(tabs)/profile" />;
  return <PlayerProfile id={id} />;
}

function PlayerProfile({ id }) {
  const router = useRouter();
  const { data: player, isPending, error, refetch, isRefetching } = usePlayer(id);
  const follow = useEngineMutation(engine.follow, { onSuccess: () => hapticSuccess() });
  const unfollow = useEngineMutation(engine.unfollow);

  if (isPending) {
    return (
      <Screen header={<Header back />}>
        <Loading />
      </Screen>
    );
  }

  if (error || !player) {
    return (
      <Screen header={<Header back />}>
        <EmptyState icon={Users} title="Player not found" body="They may have left OutHere." action="Back to the Arena" onAction={() => router.replace("/outside/arena")} />
      </Screen>
    );
  }

  const accent = player.color || C.accent;
  const record = player.recordVsMe || { wins: 0, losses: 0 };
  const played = record.wins + record.losses;
  const busy = follow.isPending || unfollow.isPending;

  return (
    <Screen padded={false} header={<Header back title={`@${player.username}`} />} onRefresh={refetch} refreshing={isRefetching}>
      <LinearGradient colors={[`${accent}33`, "rgba(10,10,10,0)"]} style={styles.hero}>
        <Avatar uri={player.avatar} name={player.name} size={104} ring={player.isOutside ? C.accent : C.borderStrong} outside={player.isOutside} />
        <Row gap={S.sm} style={{ marginTop: S.lg }}>
          <Title size={30}>{player.name}</Title>
          <TierBadge tier={player.tier} />
        </Row>
        <Row gap={6} style={{ marginTop: S.xs }}>
          <MapPin size={14} color={C.textDim} />
          <Body dim size={14}>{[player.area, player.city].filter(Boolean).join(", ")}</Body>
        </Row>
        <Pill
          label={player.isOutside ? "OUTSIDE NOW" : "INDOORS"}
          tone={player.isOutside ? "accent" : "neutral"}
          style={{ alignSelf: "center", marginTop: S.md }}
        />
        {player.bio ? <Body size={15} style={styles.bio}>{player.bio}</Body> : null}

        <Row gap={S.sm} style={{ marginTop: S.xl, alignSelf: "stretch" }}>
          {player.isFollowing ? (
            <Button title="Following" variant="secondary" icon={UserCheck} onPress={() => unfollow.mutate(player.id)} loading={busy} style={{ flex: 1 }} />
          ) : (
            <Button title="Follow" icon={UserPlus} onPress={() => follow.mutate(player.id)} loading={busy} style={{ flex: 1 }} />
          )}
          <Button title="Battle" variant="outline" icon={Swords} onPress={() => router.push(`/battles/new?opponent=${player.id}`)} style={{ flex: 1 }} />
        </Row>
      </LinearGradient>

      <View style={{ paddingHorizontal: S.gutter }}>
        <Row gap={S.sm}>
          <StatTile label="Today" value={formatNumber(player.todaySteps)} hint="steps" accent={player.isOutside} />
          <StatTile label="Streak" value={`${player.streak}`} hint={player.streak === 1 ? "day" : "days"} />
        </Row>
        <Row gap={S.sm} style={{ marginTop: S.sm }}>
          <StatTile label="This week" value={compactNumber(player.weekSteps)} hint="steps" />
          <StatTile label="XP" value={compactNumber(player.xp)} hint="all time" />
        </Row>

        <SectionHeader title="You vs them" />
        <Card>
          {played ? (
            <Row style={{ justifyContent: "space-around" }}>
              <Score label="Your wins" value={record.wins} highlight={record.wins >= record.losses} />
              <View style={styles.rule} />
              <Score label={`${player.name}'s wins`} value={record.losses} highlight={record.losses > record.wins} />
            </Row>
          ) : (
            <Row gap={S.md}>
              <View style={styles.iconWrap}>
                <Flame size={20} color={C.fire} />
              </View>
              <Body dim size={14} style={{ flex: 1 }}>
                No battles between you yet. {player.name} is on {formatNumber(player.todaySteps)} steps today.
              </Body>
            </Row>
          )}
          <Button
            title={played ? "Run it back" : "Challenge to a battle"}
            icon={Swords}
            onPress={() => router.push(`/battles/new?opponent=${player.id}`)}
            full
            style={{ marginTop: S.lg }}
          />
        </Card>

        {player.crews?.length ? (
          <>
            <SectionHeader title="Crews" />
            <Card padding={S.md} style={{ paddingVertical: 0 }}>
              {player.crews.map((crew, i) => (
                <ListRow
                  key={crew.id}
                  style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.border } : null}
                  leading={<Avatar uri={crew.logo} name={crew.name} size={40} ring={crew.accent} />}
                  title={crew.name}
                  onPress={() => router.push(`/crew/${crew.id}`)}
                />
              ))}
            </Card>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

function Score({ label, value, highlight }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={[styles.score, highlight && { color: C.accent }]}>{value}</Text>
      <Label style={{ marginTop: 2 }} numberOfLines={1}>{label}</Label>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingHorizontal: S.gutter, paddingTop: S.lg, paddingBottom: S.xxl, marginBottom: S.sm },
  bio: { textAlign: "center", marginTop: S.lg, color: C.textDim, maxWidth: 320 },
  score: { color: C.text, fontFamily: F.display, fontSize: 36 },
  rule: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", backgroundColor: C.border },
  iconWrap: { width: 40, height: 40, borderRadius: R.full, backgroundColor: "rgba(255,107,53,0.15)", alignItems: "center", justifyContent: "center" },
});
