// New 1v1 the quick way. The headline is the bet: pick a face, nudge the
// stake, pick how long, and the coin, headline and pot all update. Other
// modes (live race, blind trial, ghost, last one standing, hold the route)
// live in the full builder at /battles/new.

import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Minus, Plus, Search, Swords } from "lucide-react-native";
import { engine, useBattleLimits, useEngineMutation, usePlayer, useRivalRoster, useWallet } from "@/data/hooks";
import { Avatar, Button, C, F, PressableScale, R, Row, S, Segment, Skeleton } from "@/components/ui";
import { BottomBar, Coin, GlowHero, SectionLabel, TopBar } from "@/components/arena/OutsideKit";
import { limitsText } from "@/components/arena/ArenaHero";
import { compactNumber, formatNumber } from "@/utils/format";

const STEP = 10;
const MAX_STAKE = 500;
const LENGTHS = [
  { value: 24, label: "24 hours" },
  { value: 72, label: "3 days" },
  { value: 168, label: "1 week" },
];

export default function CreateBattle() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const initial = typeof params.opponent === "string" ? params.opponent : null;
  const roster = useRivalRoster();
  const wallet = useWallet();
  const limits = useBattleLimits().data;
  const [picked, setPicked] = useState(initial);
  const [stake, setStake] = useState(50);
  const [hours, setHours] = useState(24);
  const extra = usePlayer(initial).data;

  const people = (roster.data?.roster || []).slice(0, 8);
  const list = extra && !people.some((r) => r.player.id === extra.id) ? [{ player: extra, avgSteps: null }, ...people] : people;
  useEffect(() => {
    if (!picked && list[0]) setPicked(list[0].player.id);
  }, [picked, list]);

  const out = wallet.data?.out ?? 0;
  useEffect(() => {
    if (wallet.data && stake > out) setStake(Math.max(0, Math.floor(out / STEP) * STEP));
  }, [wallet.data, out, stake]);

  const rival = list.find((r) => r.player.id === picked)?.player;
  const first = (rival?.name || "them").split(" ")[0];
  const blocked = limits && !limits.canCreate;

  const create = useEngineMutation(engine.createBattle, {
    success: (b) => `Challenge sent to ${b?.opponent?.player?.name || first}`,
    onSuccess: (b) => router.replace(`/battles/countdown/${b.id}`),
  });

  const send = () => create.mutate({ opponentId: picked, mode: "most_steps", durationHours: hours, stakeOut: stake });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 + insets.bottom }}>
        <GlowHero height={200} kicker="New 1v1" top={stake ? `Put ${formatNumber(stake)} OUT` : "Just for"} bottom={stake ? "on it" : "the glory"} />
        <View style={{ paddingHorizontal: S.gutter }}>
          <SectionLabel right="Search" onRight={() => router.push("/battles/new")}>
            Pick your opponent
          </SectionLabel>
        </View>
        {roster.isPending ? (
          <Row gap={S.sm} style={{ paddingHorizontal: S.gutter }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} width={80} height={112} radius={R.md} />
            ))}
          </Row>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.gutter, gap: S.sm }}>
            {list.map((r) => {
              const on = r.player.id === picked;
              return (
                <PressableScale key={r.player.id} onPress={() => setPicked(r.player.id)} scaleTo={0.95} style={[styles.face, on && styles.faceOn]} accessibilityLabel={r.player.name}>
                  <View>
                    <Avatar uri={r.player.avatar} name={r.player.name} size={54} tier={r.player.tier} />
                    {on ? (
                      <View style={styles.tick}>
                        <Check size={11} color="#fff" strokeWidth={3} />
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.faceName} numberOfLines={1}>
                    {r.player.name.split(" ")[0]}
                  </Text>
                  <Text style={styles.faceSub}>{r.avgSteps != null ? `${compactNumber(r.avgSteps)} a day` : r.player.area || ""}</Text>
                </PressableScale>
              );
            })}
            <PressableScale onPress={() => router.push("/battles/new")} scaleTo={0.95} style={[styles.face, { justifyContent: "center" }]} accessibilityLabel="Find someone">
              <Search size={22} color={C.textDim} />
              <Text style={[styles.faceSub, { marginTop: 6 }]}>Find someone</Text>
            </PressableScale>
          </ScrollView>
        )}

        <View style={{ paddingHorizontal: S.gutter }}>
          <View style={styles.stake}>
            <PressableScale onPress={() => setStake((v) => Math.max(0, v - STEP))} disabled={stake <= 0} scaleTo={0.9} style={styles.round} accessibilityLabel="Less">
              <Minus size={18} color={C.text} />
            </PressableScale>
            <View style={{ alignItems: "center" }}>
              <Row gap={S.sm}>
                <Coin size={24} />
                <Text style={styles.stakeValue}>{formatNumber(stake)}</Text>
              </Row>
              <Text style={styles.faceSub}>{stake ? `Winner takes ${formatNumber(stake * 2)} OUT` : "No stake, just XP"}</Text>
            </View>
            <PressableScale onPress={() => setStake((v) => Math.min(MAX_STAKE, out, v + STEP))} disabled={stake + STEP > Math.min(MAX_STAKE, out)} scaleTo={0.9} style={styles.round} accessibilityLabel="More">
              <Plus size={18} color={C.text} />
            </PressableScale>
          </View>
          <Segment options={LENGTHS} value={hours} onChange={setHours} style={{ marginTop: S.md }} />
          <Text style={[styles.faceSub, { marginTop: S.md, textAlign: "center" }]}>
            Most steps when the clock runs out wins. You have {formatNumber(out)} OUT.{limits ? ` ${limitsText(limits)}` : ""}
          </Text>
          <Button title="Other battle modes" variant="ghost" onPress={() => router.push(picked ? `/battles/new?opponent=${picked}` : "/battles/new")} style={{ alignSelf: "center", marginTop: S.sm }} />
        </View>
      </ScrollView>
      <BottomBar>
        <Button
          title={blocked ? "Over your battle limit" : `Challenge ${first}`}
          icon={Swords}
          size="lg"
          full
          disabled={!picked || blocked || stake > out}
          loading={create.isPending}
          onPress={send}
        />
      </BottomBar>
      <TopBar />
    </View>
  );
}

const styles = StyleSheet.create({
  face: { width: 82, paddingVertical: S.md, borderRadius: R.md, backgroundColor: C.surface, alignItems: "center", borderWidth: 1.5, borderColor: "transparent" },
  faceOn: { borderColor: C.accent, backgroundColor: "rgba(61,139,255,0.1)" },
  tick: { position: "absolute", right: -4, top: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.bg },
  faceName: { color: C.text, fontFamily: F.bodySemi, fontSize: 14, marginTop: 8 },
  faceSub: { color: C.textDim, fontFamily: F.body, fontSize: 11 },
  stake: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: S.lg, padding: S.lg, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.1)" },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
  stakeValue: { color: C.text, fontFamily: F.display, fontSize: 44, lineHeight: 48 },
});
