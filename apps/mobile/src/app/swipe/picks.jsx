// Your right swipes become your picks. Choose one, then what you battle on,
// how long and the stake. Picks last a week.

import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Send } from "@/components/ui/icons";
import { engine, useEngineMutation, usePicks, useProfile } from "@/data/hooks";
import { Avatar, C, EmptyState, F, GlowButton, PressableScale, R, Row, S, Segment, Skeleton, Surface } from "@/components/ui";
import { BottomBar, GlowHero, TopBar } from "@/components/arena/OutsideKit";
import { formatNumber } from "@/utils/format";

const METRICS = [
  { value: "steps", label: "Steps" },
  { value: "distance", label: "Distance" },
  { value: "minutes", label: "Minutes" },
];
const LENGTHS = [
  { value: 24, label: "24 hours" },
  { value: 72, label: "3 days" },
  { value: 168, label: "7 days" },
];
const STAKES = [0, 50, 100, 250];
const RING = { pro: "#3d8bff", black: "#8d97a5" };

export default function PicksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: picks, isPending } = usePicks();
  const me = useProfile().data;
  const [picked, setPicked] = useState(null);
  const [metric, setMetric] = useState("steps");
  const [hours, setHours] = useState(72);
  const [stake, setStake] = useState(100);
  const out = me?.out ?? 0;

  useEffect(() => {
    if (!picked && picks?.[0]) setPicked(picks[0].id);
  }, [picks, picked]);
  useEffect(() => {
    if (me && stake > out) setStake([...STAKES].reverse().find((v) => v <= out) ?? 0);
  }, [me, out, stake]);

  const rival = (picks || []).find((p) => p.id === picked);
  const send = useEngineMutation(engine.challengePick, {
    success: (b) => `Challenge sent to ${b?.opponent?.player?.name || rival?.name}`,
    onSuccess: (b) => router.replace(`/battles/countdown/${b.id}`),
  });

  const lo = rival && me?.level ? Math.min(rival.level, me.level) : null;
  const hi = rival && me?.level ? Math.max(rival.level, me.level) : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 + insets.bottom }}>
        <GlowHero height={140} kicker="Your picks" top="Choose your" bottom="rival" />
        {isPending ? (
          <Skeleton height={120} radius={R.lg} style={{ margin: S.gutter }} />
        ) : !picks?.length ? (
          <EmptyState title="No picks yet" body="Swipe right on someone and they wait here for a week." action="Find a rival" onAction={() => router.replace("/swipe")} />
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.gutter, gap: S.lg, paddingTop: S.lg }}>
              {picks.map((p) => {
                const on = p.id === picked;
                return (
                  <PressableScale key={p.id} onPress={() => setPicked(p.id)} scaleTo={0.94} style={{ alignItems: "center", width: 84 }} accessibilityLabel={p.name}>
                    <View style={[styles.ring, { borderColor: RING[p.tier] || "rgba(255,255,255,0.25)" }, on && styles.ringOn]}>
                      <Avatar uri={p.avatar} name={p.name} size={72} />
                      {on ? (
                        <View style={styles.tick}>
                          <Check size={12} color="#fff" strokeWidth={3} />
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.name, !on && { color: C.textDim }]} numberOfLines={1}>
                      {p.name.split(" ")[0]}
                    </Text>
                  </PressableScale>
                );
              })}
            </ScrollView>
            <Surface padding={S.lg} style={{ marginHorizontal: S.gutter, marginTop: S.xl }} contentStyle={{ gap: S.sm }}>
              <Text style={styles.label}>Battle on</Text>
              <Segment options={METRICS} value={metric} onChange={setMetric} />
              <Text style={[styles.label, { marginTop: S.md }]}>How long</Text>
              <Segment options={LENGTHS} value={hours} onChange={setHours} />
              <Row style={{ justifyContent: "space-between", marginTop: S.md }}>
                <Text style={styles.label}>Stake</Text>
                <Text style={[styles.label, { color: C.textDim }]}>You have {formatNumber(out)} OUT</Text>
              </Row>
              <Segment options={STAKES.filter((v) => v <= Math.max(out, 0) || v === 0).map((v) => ({ value: v, label: v ? String(v) : "None" }))} value={stake} onChange={setStake} />
            </Surface>
            <Text style={styles.note}>
              {stake ? `Winner takes ${formatNumber(stake * 2)} OUT.` : "Winner takes the XP."}
              {lo ? ` You are both Level ${lo === hi ? lo : `${lo} to ${hi}`}.` : ""}
            </Text>
          </>
        )}
      </ScrollView>
      {rival ? (
        <BottomBar>
          <GlowButton title={`Send challenge to ${rival.name.split(" ")[0]}`} icon={Send} size="lg" full loading={send.isPending} onPress={() => send.mutate({ rivalId: rival.id, metric, durationHours: hours, stakeOut: stake })} />
        </BottomBar>
      ) : null}
      <TopBar />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { padding: 3, borderRadius: 999, borderWidth: 2 },
  ringOn: { boxShadow: "0 0 22px rgba(61,139,255,0.65)" },
  tick: { position: "absolute", right: -2, top: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.bg },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 14, marginTop: S.sm },
  label: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  note: { color: C.textDim, fontFamily: F.body, fontSize: 13, textAlign: "center", marginTop: S.md, paddingHorizontal: S.gutter },
});
