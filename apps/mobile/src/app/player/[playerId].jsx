import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { MapPin, Swords, UserCheck, UserPlus } from "lucide-react-native";
import { engine, useEngineMutation, usePlayer } from "@/data/hooks";
import { AnimatedNumber, Avatar, Cover, Body, Button, C, Card, Divider, EmptyState, F, FadeIn, Header, ListRow, LiveDot, Row, S, Screen, SectionHeader, Skeleton, TierBadge, toast } from "@/components/ui";
import { compactNumber, formatNumber } from "@/utils/format";

export default function PlayerScreen() {
  const { playerId } = useLocalSearchParams();
  const id = Array.isArray(playerId) ? playerId[0] : playerId;
  if (id === "me") return <Redirect href="/(tabs)/profile" />;
  return <PlayerProfile id={id} />;
}

function PlayerProfile({ id }) {
  const router = useRouter();
  const { data: player, isPending, error, refetch, isRefetching } = usePlayer(id);
  const follow = useEngineMutation(engine.follow, { success: () => `Following ${player?.name || "them"}` });
  const unfollow = useEngineMutation(engine.unfollow, { onSuccess: () => toast(`Unfollowed ${player?.name || "them"}`) });

  if (isPending) {
    return (
      <Screen header={<Header back />}>
        <View style={{ alignItems: "center", gap: S.md, paddingTop: S.lg }}>
          <Skeleton width={112} height={112} radius={56} />
          <Skeleton width={160} height={28} />
          <Skeleton width={120} height={14} />
          <Skeleton height={80} radius={20} style={{ marginTop: S.xl }} />
        </View>
      </Screen>
    );
  }

  if (error || !player) {
    return (
      <Screen header={<Header back />}>
        <EmptyState title="Player not found" body="They may have left OutHere." action="Back to the Arena" onAction={() => router.replace("/outside/arena")} />
      </Screen>
    );
  }

  const colour = player.color || C.textDim;
  const record = player.recordVsMe || { wins: 0, losses: 0 };
  const played = record.wins + record.losses;
  const busy = follow.isPending || unfollow.isPending;
  const place = [player.area, player.city].filter(Boolean).join(", ");
  const battle = () => router.push(`/battles/new?opponent=${player.id}`);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen padded={false} header={<Header back title={`@${player.username}`} />} onRefresh={refetch} refreshing={isRefetching}>
        <FadeIn>
          <View style={styles.hero}>
            <View style={[styles.ring, { borderColor: colour }]}>
              <Avatar uri={player.avatar} name={player.name} colour={colour} size={96} />
            </View>

            <Row gap={S.sm} style={{ marginTop: S.lg }}>
              <Text style={styles.name} numberOfLines={1}>
                {player.name}
              </Text>
              <TierBadge tier={player.tier} />
            </Row>
            {place || player.isOutside ? (
              <Row gap={5} style={{ marginTop: 4 }}>
                {place ? (
                  <>
                    <MapPin size={13} color={C.textDim} />
                    <Text style={styles.place}>{place}</Text>
                  </>
                ) : null}
                {player.isOutside ? (
                  <>
                    {place ? <Text style={styles.place}> · </Text> : null}
                    <LiveDot size={6} />
                    <Text style={styles.place}>Outside now</Text>
                  </>
                ) : null}
              </Row>
            ) : null}
            {player.bio ? <Text style={styles.bio}>{player.bio}</Text> : null}

            <Row gap={S.sm} style={{ marginTop: S.xl, alignSelf: "stretch" }}>
              <View style={{ flex: 1 }}>
                {player.isFollowing ? (
                  <Button title="Following" variant="secondary" icon={UserCheck} onPress={() => unfollow.mutate(player.id)} loading={busy} full />
                ) : (
                  <Button title="Follow" variant="secondary" icon={UserPlus} onPress={() => follow.mutate(player.id)} loading={busy} full />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Battle" icon={Swords} onPress={battle} full />
              </View>
            </Row>
          </View>
        </FadeIn>

        <View style={{ paddingHorizontal: S.gutter }}>
          <FadeIn index={1}>
            <View style={styles.stats}>
              <Stat value={player.todaySteps} hint="steps today" />
              <Stat value={player.weekSteps} hint="this week" compact />
              <Stat value={player.streak} hint="day streak" />
              <Stat value={player.xp} hint="XP" compact />
            </View>
          </FadeIn>

          <SectionHeader title="You vs them" />
          <FadeIn index={2}>
            <Card padding={S.xl} style={{ borderWidth: 0 }}>
              {played ? (
                <Row style={{ justifyContent: "space-around" }}>
                  <Score label="You" value={record.wins} highlight={record.wins >= record.losses} />
                  <Text style={styles.dash}>:</Text>
                  <Score label={player.name} value={record.losses} highlight={record.losses > record.wins} />
                </Row>
              ) : (
                <Body dim>
                  No battles between you yet. {player.name} is on {formatNumber(player.todaySteps)} steps today.
                </Body>
              )}
              <Button title={played ? "Run it back" : "Challenge to a battle"} variant="secondary" onPress={battle} full style={{ marginTop: S.lg }} />
            </Card>
          </FadeIn>

          {player.crews?.length ? (
            <>
              <SectionHeader title="Crews" />
              <View>
                {player.crews.map((crew, i) => (
                  <React.Fragment key={crew.id}>
                    {i > 0 ? <Divider style={{ marginLeft: 54 }} /> : null}
                    <ListRow
                      leading={<Cover source={crew.logo} seed={crew.id} accent={crew.accent} style={styles.crewLogo} />}
                      title={crew.name}
                      onPress={() => router.push(`/crew/${crew.id}`)}
                    />
                  </React.Fragment>
                ))}
              </View>
            </>
          ) : null}
        </View>
      </Screen>
    </View>
  );
}

function Stat({ value, hint, compact = false }) {
  return (
    <View style={{ flex: 1, alignItems: "flex-start" }}>
      <AnimatedNumber value={value || 0} format={compact ? compactNumber : undefined} adjustsFontSizeToFit style={styles.statValue} />
      <Text style={styles.statHint} numberOfLines={1}>{hint}</Text>
    </View>
  );
}

function Score({ label, value, highlight }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={[styles.score, highlight && { color: C.text }]}>{value}</Text>
      <Text style={styles.statHint} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingHorizontal: S.gutter, paddingTop: S.md, paddingBottom: S.xl },
  ring: { padding: 3, borderRadius: 60, borderWidth: 2 },
  name: { color: C.text, fontFamily: F.display, fontSize: 30, letterSpacing: -0.6, flexShrink: 1 },
  place: { color: C.textDim, fontSize: 13 },
  bio: { textAlign: "center", marginTop: S.md, color: C.textDim, fontSize: 15, lineHeight: 21, maxWidth: 320 },
  stats: { flexDirection: "row", gap: S.md, paddingTop: S.sm },
  statValue: { color: C.text, fontFamily: F.display, fontSize: 24, letterSpacing: -0.5 },
  statHint: { color: C.textDim, fontSize: 13, marginTop: 2 },
  score: { color: C.textDim, fontFamily: F.display, fontSize: 48, letterSpacing: -1 },
  dash: { color: C.textMute, fontFamily: F.display, fontSize: 32 },
  crewLogo: { width: 42, height: 42, borderRadius: 21 },
});
