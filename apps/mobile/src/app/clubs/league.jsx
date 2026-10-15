// The club league: divisions by club size, groups of seven by area, six week
// seasons. Win the group for a star on your crest.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Trophy } from "lucide-react-native";
import { Body, C, Card, EmptyState, F, Header, R, Row, S, Screen, SkeletonList } from "@/components/ui";
import { useClubLeague } from "@/data/hooks";
import { Chip, ClubCrest, whenLabel } from "@/components/clubs/parts";

export default function ClubLeague() {
  const router = useRouter();
  const { data: l, isPending, refetch, isRefetching } = useClubLeague();

  const head = (
    <Header
      back
      title=""
      right={
        l ? (
          <View style={styles.weekChip}>
            <Trophy size={13} color={C.gold} />
            <Text style={styles.weekText}>
              Week {l.week} of {l.weeks}
            </Text>
          </View>
        ) : null
      }
    />
  );

  if (isPending) {
    return (
      <Screen header={head}>
        <SkeletonList count={7} height={48} gap={6} />
      </Screen>
    );
  }

  const fx = l?.fixture;
  const opp = fx ? (fx.mySide === "away" ? fx.home : fx.away) : null;
  const mine = fx ? (fx.mySide === "away" ? fx.away : fx.home) : null;

  return (
    <Screen header={head} onRefresh={refetch} refreshing={isRefetching}>
      <Text style={styles.kick}>
        {l.competition}
        {l.area ? ` · ${l.area}` : ""}
      </Text>
      <Text style={styles.big}>Club</Text>
      <Text style={[styles.big, { color: C.accent }]}>league</Text>

      {l.divisions?.length ? (
        <Row gap={6} style={{ marginTop: S.lg }}>
          {l.divisions.map((d) => (
            <View key={d} style={[styles.div, d === l.division && styles.divOn]}>
              <Text style={[styles.divText, d === l.division && { color: C.text }]}>{d}</Text>
            </View>
          ))}
        </Row>
      ) : null}

      {!l.inLeague ? (
        <EmptyState title="Your club joins next season" body="Official clubs are placed in a division by size and a group by area when a season starts." style={{ marginTop: S.xl }} />
      ) : (
        <Card padding={0} style={{ marginTop: S.lg }}>
          <Row style={[styles.tr, styles.th]}>
            <Text style={[styles.pos, styles.thText]} />
            <Text style={[styles.thText, { flex: 1 }]}>Club</Text>
            <Text style={[styles.num, styles.thText]}>W</Text>
            <Text style={[styles.num, styles.thText]}>L</Text>
            <Text style={[styles.pts, styles.thText]}>Pts</Text>
          </Row>
          {l.table.map((r) => (
            <Row key={r.id} style={[styles.tr, r.isMine && styles.me]}>
              <Text style={[styles.pos, r.pos === 1 && { color: C.gold }]}>{r.pos}</Text>
              <Row gap={S.sm} style={{ flex: 1, minWidth: 0 }}>
                <ClubCrest club={r.club} size={28} radius={8} />
                <Text style={[styles.clubName, r.isMine && { color: C.text }]} numberOfLines={1}>
                  {r.club?.name}
                </Text>
              </Row>
              <Text style={styles.num}>{r.won}</Text>
              <Text style={styles.num}>{r.lost}</Text>
              <Text style={[styles.pts, r.isMine && { color: C.accentHi }]}>{r.points}</Text>
            </Row>
          ))}
          <Text style={styles.zone}>Win the group for a star on your crest</Text>
        </Card>
      )}

      {fx ? (
        <Card onPress={() => router.push(`/clubs/fixture/${fx.id}`)} padding={S.lg} style={{ marginTop: S.md }}>
          <Row gap={S.md}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardKick}>This week</Text>
              <Text style={styles.cardTitle}>
                {mine.club?.short} v {opp.club?.short}
              </Text>
              <Body dim size={13}>
                {fx.isDerby ? "The derby · double points · " : ""}reveal {whenLabel(fx.revealAt).replace(" · ", " ")}
              </Body>
            </View>
            <Chip label="Open" tone="blue" />
          </Row>
        </Card>
      ) : l.bye ? (
        <Body dim size={13} style={{ marginTop: S.md }}>
          No fixture for your club this week. Seven clubs means one rests each week.
        </Body>
      ) : null}
      <Body mute size={12} style={{ marginTop: S.lg }}>
        Three points for a win, one for a draw, double for a derby. League fixtures are always steps, so every club size plays fair.
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  weekChip: { flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 99, backgroundColor: C.surface },
  weekText: { color: C.textSoft, fontFamily: F.bodySemi, fontSize: 12.5 },
  kick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.8, textTransform: "uppercase", marginTop: S.sm, marginBottom: 6 },
  big: { color: C.text, fontFamily: F.display, fontSize: 44, lineHeight: 44, textTransform: "uppercase" },
  div: { height: 32, paddingHorizontal: 12, borderRadius: 99, backgroundColor: C.surface, justifyContent: "center" },
  divOn: { backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.accent },
  divText: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 12.5 },
  tr: { paddingHorizontal: S.md, paddingVertical: 10, gap: S.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  th: { borderTopWidth: 0, paddingVertical: 8 },
  thText: { color: C.textMute, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1 },
  me: { backgroundColor: "rgba(61,139,255,0.10)" },
  pos: { width: 18, color: C.textDim, fontFamily: F.display, fontSize: 16, textAlign: "center" },
  clubName: { color: C.textSoft, fontFamily: F.bodySemi, fontSize: 14, flexShrink: 1 },
  num: { width: 22, color: C.textDim, fontFamily: F.bodyMedium, fontSize: 13, textAlign: "center" },
  pts: { width: 30, color: C.text, fontFamily: F.display, fontSize: 18, textAlign: "right" },
  zone: { color: C.gold, fontFamily: F.bodySemi, fontSize: 11.5, padding: S.md, textAlign: "center", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  cardKick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 10.5, letterSpacing: 1.6, textTransform: "uppercase" },
  cardTitle: { color: C.text, fontFamily: F.display, fontSize: 22, textTransform: "uppercase", marginTop: 3 },
});
