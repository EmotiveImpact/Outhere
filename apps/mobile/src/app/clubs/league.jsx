// The club league: divisions by club size, groups of seven by area, six week
// seasons. Win the group for a star on your crest.

import React, { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Trophy } from "@/components/ui/icons";
import { C, EmptyState, F, Header, Row, S, Screen, Segment, SkeletonList, Surface } from "@/components/ui";
import { useClubLeague } from "@/data/hooks";
import { Chip, ClubCrest, PillButton, whenLabel } from "@/components/clubs/parts";

export default function ClubLeague() {
  const router = useRouter();
  const [div, setDiv] = useState(null);
  const { data: l, isPending, refetch, isRefetching } = useClubLeague();

  const head = (
    <Header
      back
      title=""
      right={
        l ? (
          <Chip icon={Trophy} label={`Week ${l.week} of ${l.weeks}`} />
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
      <Text style={[styles.big, styles.blue]}>league</Text>

      {l.divisions?.length ? <Segment options={l.divisions} value={div || l.division} onChange={setDiv} style={{ marginTop: 14 }} /> : null}

      {!l.inLeague ? (
        <EmptyState title="Your club joins next season" body="Official clubs are placed in a division by size and a group by area when a season starts." style={{ marginTop: S.xl }} />
      ) : div && div !== l.division ? (
        <Surface radius={22} padding={18} style={{ marginTop: 12 }}>
          <Text style={styles.cardTitle}>{div}</Text>
          <Text style={styles.note}>Clubs are placed by size, so {div} runs its own groups. Your table is in {l.division}.</Text>
        </Surface>
      ) : (
        // .r11table
        <Surface radius={22} padding={null} style={{ marginTop: 12 }} contentStyle={{ paddingTop: 4, paddingBottom: 10, paddingHorizontal: 12 }}>
          <Row style={[styles.tr, styles.th]}>
            <Text style={[styles.pos, styles.thText]} />
            <Text style={[styles.thText, { flex: 1, textAlign: "left" }]}>Club</Text>
            <Text style={[styles.num, styles.thText]}>W</Text>
            <Text style={[styles.num, styles.thText]}>L</Text>
            <Text style={[styles.pts, styles.thText]}>Pts</Text>
          </Row>
          {l.table.map((r, i) => (
            <Row key={r.id} style={[styles.tr, i === 0 && { borderTopColor: "transparent" }, r.isMine && styles.me]}>
              {r.isMine ? <LinearGradient colors={["rgba(74,134,255,0.24)", "rgba(74,134,255,0.06)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} /> : null}
              <Text style={[styles.pos, r.isMine && { color: C.accentHi }]}>{r.pos}</Text>
              <Row gap={8} style={{ flex: 1, minWidth: 0 }}>
                <ClubCrest club={r.club} size={22} radius={7} />
                <Text style={styles.clubName} numberOfLines={1}>
                  {r.club?.name}
                </Text>
              </Row>
              <Text style={styles.num}>{r.won}</Text>
              <Text style={styles.num}>{r.lost}</Text>
              <Text style={styles.pts}>{r.points}</Text>
            </Row>
          ))}
          <Text style={styles.zone}>Win the group for a star on your crest</Text>
        </Surface>
      )}

      {fx ? (
        // .r11next
        <Surface radius={22} padding={null} onPress={() => router.push(`/clubs/fixture/${fx.id}`)} style={{ marginTop: 12 }} contentStyle={{ paddingVertical: 13, paddingHorizontal: 14 }}>
          <Row gap={12}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardKick}>{fx.live ? "Live now" : "This week"}</Text>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {mine.club?.short} v {opp.club?.short}
              </Text>
              <Text style={styles.small}>
                {fx.isDerby ? "The derby · double points · " : ""}reveal {whenLabel(fx.revealAt).replace(" · ", " ")}
              </Text>
            </View>
            <PillButton title="Open" onPress={() => router.push(`/clubs/fixture/${fx.id}`)} />
          </Row>
        </Surface>
      ) : l.bye ? (
        <Text style={[styles.note, { marginTop: 12 }]}>No fixture for your club this week. Seven clubs means one rests each week.</Text>
      ) : null}
      <Text style={[styles.note, { marginTop: 14, textAlign: "center" }]}>
        Three points for a win, one for a draw, double for a derby. League fixtures are always steps, so every club size plays fair.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 10.5, letterSpacing: 1.7, textTransform: "uppercase", marginTop: S.sm, marginBottom: 8 },
  big: { color: C.text, fontFamily: F.display, fontSize: 38, lineHeight: 36, textTransform: "uppercase" },
  blue: { color: C.accent, textShadowColor: "rgba(61,139,255,0.35)", textShadowRadius: 24, textShadowOffset: { width: 0, height: 0 } },
  tr: { paddingVertical: 7, gap: 6, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
  th: { borderTopWidth: 0, paddingVertical: 8 },
  thText: { color: C.textMute, fontFamily: F.bodySemi, fontSize: 9.5, letterSpacing: 0.8, textTransform: "uppercase", textAlign: "center" },
  me: { marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 12, borderTopColor: "transparent", boxShadow: "inset 0 0 0 1px rgba(130,180,255,0.25)" },
  pos: { width: 20, color: C.textMute, fontFamily: F.bodySemi, fontSize: 12, textAlign: "center" },
  clubName: { color: C.text, fontFamily: F.bodySemi, fontSize: 12.5, flexShrink: 1 },
  num: { width: 22, color: C.textSoft, fontFamily: F.body, fontSize: 12, textAlign: "center" },
  pts: { width: 30, color: C.text, fontFamily: F.display, fontSize: 16, textAlign: "center" },
  zone: { color: C.textMute, fontFamily: F.body, fontSize: 10.5, paddingTop: 8, textAlign: "center" },
  cardKick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 10.5, letterSpacing: 1.6, textTransform: "uppercase" },
  cardTitle: { color: C.text, fontFamily: F.display, fontSize: 20, textTransform: "uppercase", marginTop: 5 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 11, marginTop: 2 },
  note: { color: C.textMute, fontFamily: F.body, fontSize: 11.5, lineHeight: 17, marginTop: 8 },
});
