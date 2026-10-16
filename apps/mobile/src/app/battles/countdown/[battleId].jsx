// The versus screen before a 1v1, like a fighting game (the prototype's
// .vs9): both fighters slide in on either side of a slanted, glowing seam,
// the head to head sits up top, and VS turns into the count. Each beat
// flashes white and fires a ring from the middle while the number slams in
// (SpotlightNumber). When the battle is live it hands over to the battle
// screen; while it waits on the other side to accept, it says so.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Animated, { Easing, FadeInLeft, FadeInRight, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { useBattle, useHeadToHead, useProfile } from "@/data/hooks";
import { fighterPhoto } from "@/utils/fighter";
import { Avatar, C, F, GlowButton, Grain, R, S, Skeleton, SpotlightNumber, VersusSplit } from "@/components/ui";
import { TopBar } from "@/components/arena/OutsideKit";
import { durationLabel } from "@/components/arena/shared";
import { distanceLabel } from "@/constants/battleModes";
import { formatNumber } from "@/utils/format";
import { haptic } from "@/services/haptics";

const BLUE = "#3d8bff";
const RED = "#ff5a5f";
const BEATS = ["VS", "3", "2", "1", "GO"];

const levelOf = (p) => (typeof p?.level === "object" ? p.level?.level : p?.level);
const lineFor = (p) => [levelOf(p) ? `Level ${levelOf(p)}` : null, (p?.wins ?? p?.record?.wins) != null ? `${formatNumber(p.wins ?? p.record.wins)} wins` : null, !levelOf(p) ? p?.area || p?.city : null].filter(Boolean).join(" · ");

/** .vflash and .vring: white light and a ring from the middle on every beat. */
function Burst({ beat, x, y }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    t.value = 0;
    t.value = withTiming(1, { duration: 800, easing: Easing.bezier(0.1, 0.7, 0.3, 1) });
  }, [beat, reduce, t]);
  const flash = useAnimatedStyle(() => ({ opacity: 1 - t.value, transform: [{ scale: 0.2 + t.value * 1.2 }] }));
  const ring = useAnimatedStyle(() => ({ opacity: 1 - t.value, transform: [{ scale: 0.3 + t.value * 2.3 }] }));
  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.flash, { left: x - 170, top: y - 170 }, flash]} />
      <Animated.View pointerEvents="none" style={[styles.ring, { left: x - 60, top: y - 60 }, ring]} />
    </>
  );
}

export default function BattleCountdown() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { battleId } = useLocalSearchParams();
  const id = String(battleId || "");
  const { data: battle, refetch } = useBattle(id);
  const me = useProfile().data;
  const opp = battle?.opponent?.player;
  const h2h = useHeadToHead(opp?.id).data;
  const [beat, setBeat] = useState(0);

  const live = battle?.status === "active";
  const waiting = battle?.status === "pending";

  // VS holds for a beat, then 3, 2, 1, GO and the battle opens.
  useEffect(() => {
    if (!live) return undefined;
    let i = 0;
    let t;
    const step = () => {
      t = setTimeout(
        () => {
          i += 1;
          if (i >= BEATS.length) {
            router.replace(`/battles/${id}`);
            return;
          }
          if (BEATS[i] === "GO") haptic.go();
          else haptic.beat();
          setBeat(i);
          step();
        },
        i === 0 ? 1600 : 900,
      );
    };
    step();
    return () => clearTimeout(t);
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

  // The prototype's .vs9, in px down a 844 screen; its top 22 sits at insets.top + 8.
  const y = (px) => insets.top - 14 + px;
  const oppName = (opp?.name || "Rival").split(" ")[0];
  const myName = (me?.name || "You").split(" ")[0];
  const kicker = `1v1${battle.rematchOf ? " · Rematch" : battle.isSurprise ? " · Mystery" : ""}`;
  const format = battle.mode === "most_steps" ? `${durationLabel(battle.durationHours || 24)} · most ${battle.metric === "distance" ? "km" : battle.metric === "minutes" ? "minutes" : "steps"}` : `${battle.modeName}${battle.distanceM ? ` · ${distanceLabel(battle.distanceM)}` : ""}`;
  const mine = h2h?.mine || 0;
  const theirs = h2h?.theirs || 0;
  const segs = Math.max(5, mine + theirs);
  const pot = (battle.stakeOut || 0) * 2;
  const word = BEATS[beat];
  const go = word === "GO";
  const mid = { x: width / 2, y: y(388) };

  return (
    <View style={{ flex: 1, backgroundColor: "#04060b" }}>
      <VersusSplit
        height={height}
        slant={0.32}
        vs={null}
        left={{ source: fighterPhoto(me, "vs").source, tint: "rgba(42,106,240,0.55)", focus: { x: 0.5, y: 0.18 } }}
        right={{ source: fighterPhoto(opp, "vsMirror").source, tint: "rgba(255,77,85,0.5)", focus: { x: 0.5, y: 0.25 } }}
        fade="rgba(4,6,11,0.92)"
        fadeFrom={0.62}
        fadeTo={1}
        style={StyleSheet.absoluteFill}
      />
      <Grain amount={0.06} />

      {/* .vtop, .vh2h and .vh2t: the format, then the head to head */}
      <View style={[styles.vtop, { top: y(70) }]}>
        <Text style={styles.kick}>{kicker}</Text>
        <Text style={styles.format}>{format}</Text>
      </View>
      <View style={[styles.h2h, { top: y(110) }]}>
        {Array.from({ length: segs }, (_, i) => {
          const c = i < mine ? BLUE : i >= segs - theirs ? RED : null;
          return <View key={i} style={[styles.seg, c ? { backgroundColor: c, boxShadow: `0 0 8px ${c}` } : null]} />;
        })}
      </View>
      <View style={[styles.h2t, { top: y(122) }]}>
        <Text style={styles.h2hText}>You {mine}</Text>
        <Text style={styles.h2hText}>Head to head</Text>
        <Text style={styles.h2hText}>
          {oppName} {theirs}
        </Text>
      </View>

      {/* .vname: you on the left at 300, them on the right at 556 */}
      <Animated.View entering={FadeInLeft.duration(600).delay(300)} style={[styles.name, { left: 18, top: y(300) }]}>
        <Avatar uri={me?.fighter?.profile || me?.avatar} name={me?.name || "You"} size={46} tier={me?.tier} />
        <View>
          <Text style={styles.nameText}>{myName}</Text>
          <Text style={styles.line}>{lineFor(me)}</Text>
        </View>
      </Animated.View>
      <Animated.View entering={FadeInRight.duration(600).delay(450)} style={[styles.name, styles.nameRight, { right: 18, top: y(556) }]}>
        <Avatar uri={opp?.fighter?.profile || opp?.avatar} name={opp?.name} size={46} tier={opp?.tier} />
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.nameText}>{oppName}</Text>
          <Text style={styles.line}>{lineFor(opp)}</Text>
        </View>
      </Animated.View>

      {/* .vmid: VS, then the count */}
      <Burst beat={beat} x={mid.x} y={mid.y} />
      {waiting ? (
        <View style={[styles.waitBox, { top: mid.y - 40 }]}>
          <Text style={styles.waitWord}>{`Waiting on\n${oppName}`}</Text>
        </View>
      ) : (
        <View pointerEvents="none" style={[styles.count, { top: mid.y - 75 }]}>
          <SpotlightNumber key={word} value={word === "VS" || go ? word : Number(word)} colour={go ? BLUE : "#82b4ff"} size={118} style={styles.italic} />
        </View>
      )}

      {/* .vstake */}
      <View style={[styles.bottom, { bottom: Math.max(40, insets.bottom + 26) }]}>
        <View style={styles.stakes}>
          {[
            { value: formatNumber(battle.stakeOut || 0), label: "OUT each" },
            { value: formatNumber(pot || 15), label: "to the winner" },
            { value: battle.mode === "most_steps" ? durationLabel(battle.durationHours || 24).replace(" days", "d").replace(" hours", "h") : distanceLabel(battle.distanceM), label: battle.mode === "most_steps" ? "on the clock" : "distance" },
          ].map((s) => (
            <View key={s.label} style={styles.stake}>
              <BlurView tint="dark" intensity={60} style={StyleSheet.absoluteFill} />
              <Text style={styles.stakeValue} numberOfLines={1} adjustsFontSizeToFit>
                {s.value}
              </Text>
              <Text style={styles.stakeLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
        {waiting ? (
          <>
            <Text style={styles.wait}>Sent. The clock starts when {oppName} accepts.</Text>
            <GlowButton title="Back to the Arena" variant="glass" full onPress={() => router.replace("/outside/arena")} />
          </>
        ) : !live ? (
          <GlowButton title="See the battle" variant="glass" full onPress={() => router.replace(`/battles/${id}`)} style={{ marginTop: S.md }} />
        ) : null}
      </View>
      <TopBar onBack={() => router.replace(live ? `/battles/${id}` : "/outside/arena")} />
    </View>
  );
}

const styles = StyleSheet.create({
  vtop: { position: "absolute", left: 18, right: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.8, textTransform: "uppercase" },
  format: { color: "rgba(255,255,255,0.75)", fontFamily: F.bodySemi, fontSize: 11 },
  h2h: { position: "absolute", left: 18, right: 18, flexDirection: "row", gap: 4 },
  seg: { flex: 1, height: 4, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.16)" },
  h2t: { position: "absolute", left: 18, right: 18, flexDirection: "row", justifyContent: "space-between" },
  h2hText: { color: "rgba(255,255,255,0.6)", fontFamily: F.body, fontSize: 10.5 },
  name: { position: "absolute", flexDirection: "row", alignItems: "center", gap: 10 },
  nameRight: { flexDirection: "row-reverse" },
  nameText: { color: "#fff", fontFamily: F.display, fontSize: 34, lineHeight: 32, letterSpacing: 0.5 },
  line: { color: "rgba(255,255,255,0.7)", fontFamily: F.bodyMedium, fontSize: 11 },
  flash: { position: "absolute", width: 340, height: 340, borderRadius: 170, backgroundColor: "rgba(130,180,255,0.18)", boxShadow: "0 0 90px 50px rgba(255,255,255,0.35)" },
  ring: { position: "absolute", width: 120, height: 120, borderRadius: 60, boxShadow: "0 0 0 3px #ffffff, 0 0 30px #82b4ff" },
  count: { position: "absolute", left: 0, right: 0, height: 150, justifyContent: "center" },
  italic: { transform: [{ skewX: "-10deg" }] },
  waitBox: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  waitWord: { color: "#fff", fontFamily: F.display, fontSize: 30, lineHeight: 32, textAlign: "center", textTransform: "uppercase", textShadowColor: "rgba(130,180,255,0.9)", textShadowRadius: 24, textShadowOffset: { width: 0, height: 0 } },
  bottom: { position: "absolute", left: 18, right: 18, gap: S.sm },
  stakes: { flexDirection: "row", gap: 8 },
  stake: { flex: 1, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 6, alignItems: "center", backgroundColor: "rgba(255,255,255,0.09)", overflow: "hidden" },
  stakeValue: { color: "#fff", fontFamily: F.display, fontSize: 22, lineHeight: 24, marginBottom: 2 },
  stakeLabel: { color: "rgba(255,255,255,0.7)", fontFamily: F.body, fontSize: 10.5, textAlign: "center" },
  wait: { color: C.textSoft, fontFamily: F.body, fontSize: 13, textAlign: "center", marginVertical: S.sm },
});
