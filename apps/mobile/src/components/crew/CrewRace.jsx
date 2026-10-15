// Leaderboard tab: the week is a race. Every member's face sits where they
// are on the track, the gap to the next person is one tap from a walk, and
// the whole crew is in a table underneath, by week, month or all time.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { ChevronDown, Crown, TrendingUp } from "lucide-react-native";
import { Body, Button, C, Card, F, FadeIn, PressableScale, Row, S, SkeletonList } from "@/components/ui";
import { useCrewRace } from "@/data/hooks";
import { compactNumber, formatNumber } from "@/utils/format";
import ActionSheet from "./ActionSheet";
import { PlayerAvatar, playerName } from "./shared";

const PERIODS = [
  { value: "week", label: "Week", title: "This week's race" },
  { value: "month", label: "Month", title: "This month's race" },
  { value: "all", label: "All time", title: "All time" },
];

const FACE = 30;

function Lane({ row, index }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withTiming(Math.max(0.04, Math.min(1, row.share)), { duration: 800 + index * 90, easing: Easing.out(Easing.cubic) });
  }, [row.share, index, v]);
  const fill = useAnimatedStyle(() => ({ width: `${v.value * 100}%` }));
  const face = useAnimatedStyle(() => ({ left: `${v.value * 100}%` }));
  const me = row.isMe;
  return (
    <Row gap={S.md} style={styles.lane}>
      <Text style={[styles.rank, me && { color: C.accent }]}>{row.rank}</Text>
      <View style={styles.trackWrap}>
        <View style={styles.track} />
        <Animated.View style={[styles.fill, fill]}>
          <LinearGradient colors={me ? ["#1d4ea6", C.accent] : ["#18335f", "#2f6fd6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View style={[styles.face, face]}>
          <PlayerAvatar player={row.player} size={FACE} outside={row.isOutside} style={me ? styles.meFace : null} />
        </Animated.View>
      </View>
      <Text style={[styles.value, me && { color: C.accent }]}>{compactNumber(row.steps)}</Text>
    </Row>
  );
}

function walkTime(min) {
  const m = Math.max(1, Math.round(min || 0));
  if (m < 60) return `${m} ${m === 1 ? "minute" : "minutes"}`;
  const h = Math.round(m / 30) / 2;
  return `${h % 1 ? h.toFixed(1) : h} ${h === 1 ? "hour" : "hours"}`;
}

function Nudge({ nudge, period }) {
  const router = useRouter();
  if (!nudge) return null;
  const name = playerName(nudge.target).split(" ")[0];
  const pass = nudge.kind === "pass";
  const title = pass ? `${formatNumber(nudge.gap)} steps to pass ${name}` : `You lead by ${formatNumber(nudge.gap)} steps`;
  const sub = pass ? `About ${walkTime(nudge.minutes)} of walking` : `${name} is next. Keep moving ${period === "week" ? "this week" : "and stay there"}.`;
  return (
    <Card padding={S.lg} style={{ marginTop: S.md }}>
      <Row gap={S.md}>
        <View style={styles.nudgeIcon}>{pass ? <TrendingUp size={18} color={C.accentHi} /> : <Crown size={18} color={C.accentHi} />}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.nudgeTitle} numberOfLines={2}>
            {title}
          </Text>
          <Body dim size={13}>
            {sub}
          </Body>
        </View>
        <Button title="Go" size="sm" onPress={() => router.push("/(tabs)/move")} accessibilityLabel="Go for a walk" />
      </Row>
    </Card>
  );
}

export default function CrewRace({ crew }) {
  const router = useRouter();
  const [period, setPeriod] = useState("week");
  const [picking, setPicking] = useState(false);
  const race = useCrewRace(crew.id, period);
  const info = PERIODS.find((p) => p.value === period);
  const rows = race.data?.rows || [];
  const top = rows.slice(0, 5);
  const me = race.data?.me;
  const lanes = me && me.rank > 5 ? [...top.slice(0, 4), me] : top;

  return (
    <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg }}>
      <Row style={{ justifyContent: "space-between", marginBottom: S.md }}>
        <Text style={styles.h}>{info.title}</Text>
        <PressableScale onPress={() => setPicking(true)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4 }} accessibilityLabel={`Showing ${info.label}. Change`}>
          <Text style={styles.period}>{info.label}</Text>
          <ChevronDown size={15} color={C.accent} />
        </PressableScale>
      </Row>

      {race.isPending ? (
        <SkeletonList count={1} height={250} />
      ) : (
        <Card padding={S.md}>
          {lanes.map((r, i) => (
            <Lane key={`${period}:${r.player.id}`} row={r} index={i} />
          ))}
        </Card>
      )}

      <Nudge nudge={race.data?.nudge} period={period} />

      {rows.length ? (
        <>
          <Row style={{ justifyContent: "space-between", marginTop: S.xxl, marginBottom: S.md }}>
            <Text style={styles.h}>The whole crew</Text>
            <Body dim size={13}>
              {rows.length} {rows.length === 1 ? "runner" : "runners"}
            </Body>
          </Row>
          <Card padding={0} style={{ overflow: "hidden" }}>
            {rows.map((r, i) => (
              <FadeIn key={`${period}:t:${r.player.id}`} index={Math.min(i, 8)}>
                <PressableScale
                  onPress={() => router.push(r.isMe ? "/(tabs)/profile" : `/player/${r.player.id}`)}
                  scaleTo={0.985}
                  style={[styles.tableRow, i > 0 && styles.divider, r.isMe && { backgroundColor: "rgba(61,139,255,0.08)" }]}
                >
                  <Text style={[styles.tableRank, r.rank === 1 && { color: C.accent }]}>{r.rank}</Text>
                  <PlayerAvatar player={r.player} size={40} outside={r.isOutside} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {playerName(r.player)}
                    </Text>
                    <Body dim size={12}>
                      {compactNumber(r.steps)} steps
                    </Body>
                  </View>
                  <Text style={styles.km}>
                    {r.km.toFixed(1)}
                    <Text style={styles.kmUnit}> km</Text>
                  </Text>
                </PressableScale>
              </FadeIn>
            ))}
          </Card>
        </>
      ) : null}

      <ActionSheet
        visible={picking}
        title="Show the race for"
        options={PERIODS.map((p) => ({ label: p.label, hint: p.value === period ? "Showing now" : undefined, onPress: () => setPeriod(p.value) }))}
        onClose={() => setPicking(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  h: { color: C.text, fontFamily: F.bodySemi, fontSize: 17 },
  period: { color: C.accent, fontFamily: F.bodySemi, fontSize: 14 },
  lane: { height: 52 },
  rank: { width: 16, color: C.textDim, fontFamily: F.display, fontSize: 18, textAlign: "center" },
  trackWrap: { flex: 1, height: FACE + 6, justifyContent: "center", marginRight: FACE / 2 },
  track: { position: "absolute", left: 0, right: 0, height: 5, borderRadius: 3, backgroundColor: C.surfaceHigh },
  fill: { position: "absolute", left: 0, height: 5, borderRadius: 3, overflow: "hidden" },
  face: { position: "absolute", top: 3, marginLeft: -FACE / 2 },
  meFace: { borderRadius: FACE, shadowColor: C.accent, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  value: { width: 52, textAlign: "right", color: C.text, fontFamily: F.display, fontSize: 19 },
  nudgeIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center" },
  nudgeTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  tableRow: { flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  tableRank: { width: 18, color: C.textDim, fontFamily: F.display, fontSize: 17 },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  km: { color: C.text, fontFamily: F.display, fontSize: 22 },
  kmUnit: { color: C.textDim, fontFamily: F.displayMedium, fontSize: 13 },
});
