import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Flame, MapPin, Swords, UserCheck, UserPlus, Users } from "lucide-react-native";
import { engine, useEngineMutation, usePlayer } from "@/data/hooks";
import { AnimatedNumber, Avatar, Cover, Body, Button, C, Card, EmptyState, F, FadeIn, Header, Label, ListRow, LiveDot, R, Row, S, Screen, SectionHeader, Skeleton, TierBadge, toast } from "@/components/ui";
import { compactNumber, formatNumber } from "@/utils/format";

export default function PlayerScreen() {
  const { playerId } = useLocalSearchParams();
  const id = Array.isArray(playerId) ? playerId[0] : playerId;
  if (id === "me") return <Redirect href="/(tabs)/profile" />;
  return <PlayerProfile id={id} />;
}

function PlayerProfile({ id }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
        <EmptyState icon={Users} title="Player not found" body="They may have left OutHere." action="Back to the Arena" onAction={() => router.replace("/outside/arena")} />
      </Screen>
    );
  }

  const colour = player.color || C.accent;
  const record = player.recordVsMe || { wins: 0, losses: 0 };
  const played = record.wins + record.losses;
  const busy = follow.isPending || unfollow.isPending;
  const place = [player.area, player.city].filter(Boolean).join(", ");
  const battle = () => router.push(`/battles/new?opponent=${player.id}`);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Personal wash: the player's colour, faint, fading into the canvas. */}
      <LinearGradient
        pointerEvents="none"
        colors={[`${colour}30`, `${colour}0f`, "rgba(10,10,10,0)"]}
        locations={[0, 0.5, 1]}
        style={[styles.wash, { height: 420 + insets.top }]}
      />
      <Screen style={{ backgroundColor: "transparent" }} padded={false} header={<Header back title={`@${player.username}`} />} onRefresh={refetch} refreshing={isRefetching}>
        <FadeIn>
          <View style={styles.hero}>
            <View style={[styles.ring, { borderColor: colour, shadowColor: colour }]}>
              <Avatar uri={player.avatar} name={player.name} colour={colour} size={108} />
            </View>
            {player.isOutside ? (
              <Row gap={6} style={styles.outside}>
                <LiveDot size={6} colour={C.accentText} />
                <Text style={styles.outsideText}>OUTSIDE NOW</Text>
              </Row>
            ) : null}

            <Row gap={S.sm} style={{ marginTop: player.isOutside ? S.md : S.lg }}>
              <Text style={styles.name} numberOfLines={1}>
                {player.name}
              </Text>
              <TierBadge tier={player.tier} />
            </Row>
            {place ? (
              <Row gap={5} style={{ marginTop: 4 }}>
                <MapPin size={13} color={C.textDim} />
                <Text style={styles.place}>{place}</Text>
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
              <Stat label="Today" value={player.todaySteps} hint="steps" accent={player.isOutside} />
              <View style={styles.rule} />
              <Stat label="Week" value={player.weekSteps} hint="steps" compact />
              <View style={styles.rule} />
              <Stat label="Streak" value={player.streak} hint={player.streak === 1 ? "day" : "days"} />
              <View style={styles.rule} />
              <Stat label="XP" value={player.xp} hint="all time" compact />
            </View>
          </FadeIn>

          <SectionHeader title="You vs them" />
          <FadeIn index={2}>
            <Card padding={S.xl}>
              {played ? (
                <Row style={{ justifyContent: "space-around" }}>
                  <Score label="You" value={record.wins} highlight={record.wins >= record.losses} colour={C.accent} />
                  <Text style={styles.dash}>:</Text>
                  <Score label={player.name} value={record.losses} highlight={record.losses > record.wins} colour={colour} />
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
              <Button title={played ? "Run it back" : "Challenge to a battle"} icon={Swords} onPress={battle} full style={{ marginTop: S.lg }} />
            </Card>
          </FadeIn>

          {player.crews?.length ? (
            <>
              <SectionHeader title="Crews" />
              <Card padding={S.md} style={{ paddingVertical: 0 }}>
                {player.crews.map((crew, i) => (
                  <ListRow
                    key={crew.id}
                    style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.border } : null}
                    leading={<Cover source={crew.logo} seed={crew.id} accent={crew.accent} style={[styles.crewLogo, { borderColor: crew.accent || C.border }]} />}
                    title={crew.name}
                    subtitle="Crew"
                    onPress={() => router.push(`/crew/${crew.id}`)}
                  />
                ))}
              </Card>
            </>
          ) : null}
        </View>
      </Screen>
    </View>
  );
}

function Stat({ label, value, hint, accent = false, compact = false }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <AnimatedNumber value={value || 0} format={compact ? compactNumber : undefined} adjustsFontSizeToFit style={[styles.statValue, accent && { color: C.accent }]} />
      <Label style={{ marginTop: 2, fontSize: 10 }}>{label}</Label>
      <Text style={styles.statHint}>{hint}</Text>
    </View>
  );
}

function Score({ label, value, highlight, colour }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={[styles.score, highlight && { color: colour === C.accent ? C.accent : C.text }]}>{value}</Text>
      <Label style={{ marginTop: 2 }} numberOfLines={1}>
        {label}
      </Label>
    </View>
  );
}

const styles = StyleSheet.create({
  wash: { position: "absolute", top: 0, left: 0, right: 0 },
  hero: { alignItems: "center", paddingHorizontal: S.gutter, paddingTop: S.md, paddingBottom: S.xl },
  ring: { padding: 4, borderRadius: 70, borderWidth: 2.5, backgroundColor: C.bg, shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } },
  outside: { marginTop: -14, height: 24, paddingHorizontal: 10, borderRadius: R.full, backgroundColor: C.accent, borderWidth: 2, borderColor: C.bg },
  outsideText: { color: C.accentText, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  name: { color: C.text, fontFamily: F.display, fontSize: 32, letterSpacing: -0.8, flexShrink: 1 },
  place: { color: C.textDim, fontSize: 14 },
  bio: { textAlign: "center", marginTop: S.md, color: C.textDim, fontSize: 15, lineHeight: 21, maxWidth: 320 },
  stats: { flexDirection: "row", paddingVertical: S.lg, paddingHorizontal: S.sm, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  rule: { width: StyleSheet.hairlineWidth, backgroundColor: C.border },
  statValue: { color: C.text, fontFamily: F.display, fontSize: 22, letterSpacing: -0.5 },
  statHint: { color: C.textMute, fontSize: 11 },
  score: { color: C.textDim, fontFamily: F.display, fontSize: 48, letterSpacing: -1 },
  dash: { color: C.textMute, fontFamily: F.display, fontSize: 32 },
  crewLogo: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5 },
  iconWrap: { width: 40, height: 40, borderRadius: R.full, backgroundColor: "rgba(255,107,53,0.15)", alignItems: "center", justifyContent: "center" },
});
