// Challenges tab: the crew goal as one bar split by who put the kilometres
// in, the month's crew days (lit when the crew hit its daily target, outlined
// when it missed), then this week's crew challenges to join.

import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { Body, Button, C, F, FadeIn, Row, S, Skeleton, Surface } from "@/components/ui";
import { LinearGradient } from "expo-linear-gradient";
import { engine, useCrewChallenges, useCrewDays, useCrewGoal, useEngineMutation } from "@/data/hooks";
import { photoFor } from "@/data/seedCrew";
import { PlayerAvatar, playerName } from "./shared";

export const SHADES = ["#3d8bff", "#5c9dff", "#7cb1ff", "#9cc4ff", "#bcd7ff"];
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const kmText = (km) => (km >= 100 ? Math.round(km) : Math.round(km * 10) / 10).toLocaleString("en-GB");

export function GoalCard({ goal }) {
  if (!goal) return <Skeleton height={150} radius={20} />;
  const parts = goal.contributors.filter((c) => c.km > 0);
  const shown = parts.slice(0, 4);
  const rest = parts.slice(4).reduce((sum, c) => sum + c.share, 0);
  const segments = [...shown.map((c, i) => ({ key: c.player.id, share: c.share, colour: SHADES[i] })), ...(rest > 0 ? [{ key: "rest", share: rest, colour: SHADES[4] }] : [])];
  let left = 1;
  return (
    // the "412 of 500" goal card (.r11goal): one bar, split by who ran it
    <Surface radius={22} padding={null} contentStyle={{ padding: 16 }}>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
        <Text style={styles.big}>
          {kmText(goal.km)}
          <Text style={styles.of}> of {goal.goalKm.toLocaleString("en-GB")} km</Text>
        </Text>
        <Body dim size={13} style={{ marginBottom: 6 }}>
          {goal.pct >= 1 ? "Goal smashed" : `${Math.round(goal.pct * 100)}% there`}
        </Body>
      </Row>
      <View style={styles.goalTrack} accessibilityLabel={`${kmText(goal.km)} of ${goal.goalKm} kilometres`}>
        {segments.map((sg) => {
          const w = Math.max(0, Math.min(left, sg.share));
          left -= w;
          return w > 0 ? (
            <View key={sg.key} style={[styles.segment, { width: `${w * 100}%`, backgroundColor: sg.colour }]}>
              <View style={styles.segSheen} />
            </View>
          ) : null;
        })}
      </View>
      <Row style={{ justifyContent: "space-between", marginTop: S.md }}>
        {shown.map((c) => (
          <Row key={c.player.id} gap={6} accessibilityLabel={`${playerName(c.player)}: ${kmText(c.km)} km`}>
            <PlayerAvatar player={c.player} size={22} />
            <Text style={styles.legend}>
              <Text style={{ color: C.text, fontFamily: F.bodySemi }}>{kmText(c.km)}</Text> km
            </Text>
          </Row>
        ))}
      </Row>
    </Surface>
  );
}

export function CrewDays({ days }) {
  const { width } = useWindowDimensions();
  if (!days) return <Skeleton height={260} radius={20} />;
  const gap = 6;
  const cell = Math.floor((Math.min(width, 520) - S.gutter * 2 - gap * 6) / 7);
  const blanks = Array.from({ length: days.firstDow }, (_, i) => ({ blank: true, key: `b${i}` }));
  const cells = [...blanks, ...days.days.map((d) => ({ ...d, key: `d${d.day}` }))];
  return (
    <View>
      <Row style={{ justifyContent: "space-between", marginBottom: S.md }}>
        <Text style={styles.h}>Crew days</Text>
        <Body dim size={12}>
          {"Daily target hit on "}
          <Text style={{ color: C.accent, fontFamily: F.bodySemi }}>
            {days.hits} of {days.counted}
          </Text>
          {" days"}
        </Body>
      </Row>
      <Row gap={gap} style={{ marginBottom: 6 }}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={[styles.weekday, { width: cell }]}>
            {d}
          </Text>
        ))}
      </Row>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
        {cells.map((c) =>
          c.blank ? (
            <View key={c.key} style={{ width: cell, height: cell * 0.84 }} />
          ) : (
            <View
              key={c.key}
              accessibilityLabel={c.future ? `${c.day}` : `${c.day} ${MONTHS[days.month]}: ${c.km} km, ${c.hit ? "target hit" : "missed"}`}
              style={[
                styles.day,
                { width: cell, height: cell * 0.84 },
                c.future ? styles.dayFuture : c.today ? styles.dayToday : c.hit ? styles.dayHit : styles.dayMissed,
              ]}
            >
              {!c.future && (c.hit || c.today) ? <LinearGradient colors={c.today ? ["#5ea2ff", "#2a6af0"] : ["#244a85", "#18315a"]} style={[StyleSheet.absoluteFill, { borderRadius: 10 }]} /> : null}
              <Text style={[styles.dayText, c.future && { color: C.textMute }, c.today && { color: "#fff" }, !c.future && !c.hit && !c.today && { color: C.textDim }]}>{c.day}</Text>
            </View>
          ),
        )}
      </View>
      <Body mute size={12} style={{ marginTop: S.sm }}>
        Daily target is {days.targetKm} km, a seventh of the weekly goal.
      </Body>
    </View>
  );
}

function ChallengeRow({ crewId, ch, index }) {
  const join = useEngineMutation(engine.joinCrewChallenge, { success: (r) => (r.joined ? `You're in ${ch.title}` : null) });
  return (
    <FadeIn index={index}>
      <Surface radius={20} padding={null} style={{ marginBottom: 10 }} contentStyle={{ padding: 12 }}>
        <Row gap={12}>
          <Image source={photoFor(ch.image)} style={styles.chImage} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.chTitle} numberOfLines={1}>
              {ch.title}
            </Text>
            <Body dim size={13} numberOfLines={2}>
              {ch.description} · {ch.count} in
            </Body>
          </View>
          <Button
            title={ch.joined ? "Joined" : "Join"}
            size="sm"
            variant={ch.joined ? "quiet" : "primary"}
            style={{ height: 34, paddingHorizontal: 16 }}
            loading={join.isPending}
            onPress={() => join.mutate([crewId, ch.id, !ch.joined])}
            accessibilityLabel={ch.joined ? `Leave ${ch.title}` : `Join ${ch.title}`}
          />
        </Row>
      </Surface>
    </FadeIn>
  );
}

export default function CrewChallenges({ crew }) {
  const goal = useCrewGoal(crew.id);
  const days = useCrewDays(crew.id);
  const list = useCrewChallenges(crew.id);
  return (
    <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg }}>
      <GoalCard goal={goal.data} />
      <View style={{ marginTop: 22 }}>
        <CrewDays days={days.data} />
      </View>
      <Row style={{ justifyContent: "space-between", marginTop: S.xxl, marginBottom: S.md }}>
        <Text style={styles.h}>Crew challenges</Text>
        <Body dim size={12}>
          New every Monday
        </Body>
      </Row>
      {list.isPending ? <Skeleton height={80} radius={20} /> : (list.data || []).map((ch, i) => <ChallengeRow key={ch.id} crewId={crew.id} ch={ch} index={i} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  h: { color: C.text, fontFamily: F.bodySemi, fontSize: 17 },
  big: { color: C.text, fontFamily: F.display, fontSize: 42, lineHeight: 46 },
  of: { color: C.textSoft, fontFamily: F.displayMedium, fontSize: 18 },
  goalTrack: { flexDirection: "row", height: 14, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.07)", overflow: "hidden", marginTop: 14, gap: 2, boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5)" },
  segment: { height: "100%" },
  segSheen: { position: "absolute", left: 0, right: 0, top: 1, height: 3, backgroundColor: "rgba(255,255,255,0.25)" },
  legend: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  weekday: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 12, textAlign: "center" },
  day: { borderRadius: 10, alignItems: "center", justifyContent: "center" },
  dayHit: { boxShadow: "inset 0 1px 0 rgba(130,180,255,0.25)" },
  dayMissed: { backgroundColor: "rgba(255,255,255,0.03)", boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.16)" },
  dayToday: { boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 18px -4px rgba(42,106,240,0.85)" },
  dayFuture: { backgroundColor: "rgba(255,255,255,0.035)" },
  dayText: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  chImage: { width: 52, height: 52, borderRadius: 14, backgroundColor: C.surfaceHigh },
  chTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
});
