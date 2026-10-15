// A strip over the map when this run counts for a battle: which one, the
// distance, and for a live race the gap to the rival. Taps through to it.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ghost, Lock, MapPin, Swords, Zap } from "lucide-react-native";
import { useBattles } from "@/data/hooks";
import { C, F, PressableScale, R, Row, S } from "@/components/ui";
import { MOVE_SESSION_PHASE, useMoveStore } from "@/store/useMoveStore";
import { distanceLabel, timeLabel } from "@/constants/battleModes";

const ICON = { live_race: Zap, blind_time_trial: Lock, ghost_race: Ghost, hold_the_route: MapPin };

export function useCountingBattles() {
  const { data } = useBattles("active");
  const now = Date.now();
  return (data || []).filter((b) => b.timed && b.phase === "live" && (b.mode === "hold_the_route" || !b.myTimeIn) && (!b.startAt || b.startAt - now < 15000));
}

export default function BattleBanner({ top }) {
  const router = useRouter();
  const battles = useCountingBattles();
  const phase = useMoveStore((s) => s.sessionPhase);
  const distanceM = useMoveStore((s) => s.distanceM);
  const [now, setNow] = useState(Date.now());
  const recording = phase === MOVE_SESSION_PHASE.ACTIVE || phase === MOVE_SESSION_PHASE.PAUSED;
  useEffect(() => {
    if (!recording) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [recording]);

  const b = battles[0];
  if (!b) return null;
  const Icon = ICON[b.mode] || Swords;
  const rival = b.opponent?.player?.name || "your rival";
  let line = `${distanceLabel(b.distanceM)} counts against ${rival}`;
  if (b.mode === "blind_time_trial") line = `${distanceLabel(b.distanceM)}, sealed. ${rival} won't see your time.`;
  if (b.mode === "ghost_race" && b.ghostSec) line = `${rival}'s ghost: ${timeLabel(b.ghostSec)} for ${distanceLabel(b.distanceM)}`;
  if (b.mode === "hold_the_route") line = `${distanceLabel(b.distanceM)} route. Your best time counts.`;
  if (b.mode === "live_race" && recording && b.rivalPaceSec && b.startAt) {
    const theirs = Math.min(b.distanceM, ((now - b.startAt) / 1000 / b.rivalPaceSec) * 1000);
    const gap = Math.round(distanceM - theirs);
    line = gap >= 0 ? `You're ${gap} m ahead of ${rival}` : `${rival} is ${-gap} m ahead`;
  }

  return (
    <PressableScale onPress={() => router.push(`/battles/${b.id}`)} scaleTo={0.98} style={[styles.wrap, { top }]}>
      <View style={styles.icon}>
        <Icon size={16} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.kick}>{b.modeName} · this run counts</Text>
        <Text style={styles.line} numberOfLines={1}>
          {line}
        </Text>
      </View>
      {battles.length > 1 ? (
        <Row gap={4}>
          <Text style={styles.more}>+{battles.length - 1}</Text>
        </Row>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: S.gutter, right: S.gutter, flexDirection: "row", alignItems: "center", gap: S.md, padding: S.md, borderRadius: R.lg, backgroundColor: "rgba(10,14,20,0.88)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.12)" },
  icon: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  kick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase" },
  line: { color: "#fff", fontFamily: F.bodySemi, fontSize: 13.5, marginTop: 2 },
  more: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 12 },
});
