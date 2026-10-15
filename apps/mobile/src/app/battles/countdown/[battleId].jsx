// The versus screen before a 1v1, like a fighting game: both sides slide in,
// the head to head sits up top, and VS turns into the count. When the battle
// is live it hands over to the battle screen; while it waits on the other
// side to accept, it says so.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInLeft, FadeInRight, ZoomIn } from "react-native-reanimated";
import { useBattle, useHeadToHead, useProfile } from "@/data/hooks";
import { Avatar, Button, C, F, R, Row, S, Skeleton } from "@/components/ui";
import { BottomBar, StatBoxes, TopBar } from "@/components/arena/OutsideKit";
import { durationLabel } from "@/components/arena/shared";
import { distanceLabel } from "@/constants/battleModes";
import { formatNumber } from "@/utils/format";
import { hapticSelection } from "@/services/haptics";

const BLUE = "#3d8bff";
const RED = "#ff4d55";

const lineFor = (p) => [p?.level ? `Level ${p.level}` : null, (p?.wins ?? p?.record?.wins) != null ? `${formatNumber(p.wins ?? p.record.wins)} wins` : null, !p?.level ? p?.area || p?.city : null].filter(Boolean).join(" · ");

export default function BattleCountdown() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { battleId } = useLocalSearchParams();
  const id = String(battleId || "");
  const { data: battle, refetch } = useBattle(id);
  const me = useProfile().data;
  const opp = battle?.opponent?.player;
  const h2h = useHeadToHead(opp?.id).data;
  const [count, setCount] = useState(null);

  const live = battle?.status === "active";
  const waiting = battle?.status === "pending";

  // VS holds for a beat, then counts 3, 2, 1 and opens the battle.
  useEffect(() => {
    if (!live) return undefined;
    let n = 4;
    const t = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(t);
        router.replace(`/battles/${id}`);
        return;
      }
      hapticSelection();
      setCount(n);
    }, 900);
    return () => clearInterval(t);
  }, [live, id, router]);

  // Waiting on them: check now and then whether they've said yes.
  useEffect(() => {
    if (!waiting) return undefined;
    const t = setInterval(() => refetch(), 5000);
    return () => clearInterval(t);
  }, [waiting, refetch]);

  if (!battle) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: S.gutter, paddingTop: insets.top + 80 }}>
        <Skeleton height={400} radius={R.lg} />
        <TopBar />
      </View>
    );
  }

  const oppName = (opp?.name || "Rival").split(" ")[0];
  const myName = (me?.name || "You").split(" ")[0];
  const kicker = `1v1${battle.rematchOf ? " · Rematch" : battle.isSurprise ? " · Mystery" : ""}`;
  const format = battle.mode === "most_steps" ? `${durationLabel(battle.durationHours || 24)} · most ${battle.metric === "distance" ? "km" : battle.metric === "minutes" ? "minutes" : "steps"}` : `${battle.modeName}${battle.distanceM ? ` · ${distanceLabel(battle.distanceM)}` : ""}`;
  const mine = h2h?.mine || 0;
  const theirs = h2h?.theirs || 0;
  const segs = Math.max(5, mine + theirs);
  const pot = (battle.stakeOut || 0) * 2;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <LinearGradient
        colors={["#0d2a66", "#081634", "#3a0b12", "#5e1219"]}
        locations={[0, 0.5, 0.5, 1]}
        start={{ x: 0.25, y: 0 }}
        end={{ x: 0.75, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.slash} />

      <View style={{ paddingTop: insets.top + 70, paddingHorizontal: S.gutter }}>
        <Row style={{ justifyContent: "space-between" }}>
          <Text style={styles.kick}>{kicker}</Text>
          <Text style={styles.format}>{format}</Text>
        </Row>
        <Row gap={6} style={{ marginTop: S.md }}>
          {Array.from({ length: segs }, (_, i) => (
            <View key={i} style={[styles.seg, { backgroundColor: i < mine ? BLUE : i >= segs - theirs ? RED : "rgba(255,255,255,0.15)" }]} />
          ))}
        </Row>
        <Row style={{ justifyContent: "space-between", marginTop: 6 }}>
          <Text style={styles.h2h}>You {mine}</Text>
          <Text style={styles.h2h}>Head to head</Text>
          <Text style={styles.h2h}>
            {oppName} {theirs}
          </Text>
        </Row>
      </View>

      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: S.gutter }}>
        <Animated.View entering={FadeInLeft.duration(450)}>
          <Row gap={S.md}>
            <Avatar uri={me?.avatar} name={me?.name || "You"} size={58} style={styles.ringBlue} />
            <View>
              <Text style={styles.name}>{myName}</Text>
              <Text style={styles.line}>{lineFor(me)}</Text>
            </View>
          </Row>
        </Animated.View>

        <View style={styles.centre}>
          <Animated.View key={count ?? "vs"} entering={ZoomIn.springify().damping(10)} style={styles.orb}>
            <Text style={[styles.orbText, waiting && { fontSize: 20, lineHeight: 24, textAlign: "center" }]}>{waiting ? `Waiting on\n${oppName}` : count ?? "VS"}</Text>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInRight.duration(450).delay(150)} style={{ alignSelf: "flex-end" }}>
          <Row gap={S.md}>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.name}>{oppName}</Text>
              <Text style={styles.line}>{lineFor(opp)}</Text>
            </View>
            <Avatar uri={opp?.avatar} name={opp?.name} size={58} style={styles.ringDark} />
          </Row>
        </Animated.View>
      </View>

      <BottomBar style={{ position: "relative" }}>
        <StatBoxes
          glass
          items={[
            { value: formatNumber(battle.stakeOut || 0), label: "OUT each" },
            { value: formatNumber(pot || 15), label: "to the winner" },
            { value: battle.mode === "most_steps" ? durationLabel(battle.durationHours || 24).replace(" days", "d").replace(" hours", "h") : distanceLabel(battle.distanceM), label: battle.mode === "most_steps" ? "on the clock" : "distance" },
          ]}
        />
        {waiting ? (
          <>
            <Text style={styles.wait}>Sent. The clock starts when {oppName} accepts.</Text>
            <Button title="Back to the Arena" variant="secondary" size="lg" full onPress={() => router.replace("/outside/arena")} style={{ marginTop: S.md }} />
          </>
        ) : !live ? (
          <Button title="See the battle" variant="secondary" size="lg" full onPress={() => router.replace(`/battles/${id}`)} style={{ marginTop: S.md }} />
        ) : null}
      </BottomBar>
      <TopBar onBack={() => router.replace(live ? `/battles/${id}` : "/outside/arena")} />
    </View>
  );
}

const styles = StyleSheet.create({
  slash: { position: "absolute", left: "50%", top: -100, bottom: -100, width: 2, backgroundColor: "rgba(255,255,255,0.55)", transform: [{ rotate: "22deg" }] },
  kick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" },
  format: { color: C.textSoft, fontFamily: F.bodySemi, fontSize: 12 },
  seg: { flex: 1, height: 4, borderRadius: 2 },
  h2h: { color: C.textSoft, fontFamily: F.body, fontSize: 12 },
  name: { color: "#fff", fontFamily: F.display, fontSize: 36, lineHeight: 38 },
  line: { color: C.textSoft, fontFamily: F.body, fontSize: 12 },
  ringBlue: { borderWidth: 3, borderColor: BLUE, borderRadius: 999 },
  ringDark: { borderWidth: 3, borderColor: "#1a1d24", borderRadius: 999 },
  centre: { alignItems: "center", marginVertical: S.xl },
  orb: { width: 120, height: 120, borderRadius: 60, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.8)", backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", shadowColor: "#fff", shadowOpacity: 0.5, shadowRadius: 30, shadowOffset: { width: 0, height: 0 } },
  orbText: { color: "#fff", fontFamily: F.display, fontSize: 52, lineHeight: 56 },
  wait: { color: C.textSoft, fontFamily: F.body, fontSize: 13, textAlign: "center", marginTop: S.md },
});
