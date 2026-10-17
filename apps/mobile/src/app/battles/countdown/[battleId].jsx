// The versus screen before a 1v1, like a fighting game. Where the build can
// play Rive it is the 1v1 card (rive/versus): the intro picked for the
// battle (seam strike, tale of the tape, cinematic or Let's Run), then the
// card holds a moment and the battle opens. In Expo Go it is the prototype's
// .vs9 in React Native: both fighters slide in on either side of a slanted,
// glowing seam, the head to head sits up top, and VS turns into the count.
// Each beat flashes white and fires a ring from the middle while the number
// slams in (SpotlightNumber). Either way, while it waits on the other side
// to accept, it says so.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Animated, { Easing, FadeIn, FadeInLeft, FadeInRight, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { useBattle, useHeadToHead, usePlayer, useProfile } from "@/data/hooks";
import { INTRO_MS, VersusCard, pickIntro, riveAvailable, versusCard } from "@/components/rive";
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
  return riveAvailable ? <CardCountdown /> : <SplitCountdown />;
}

// The card is 390 x 844 and covers the screen; its stake tiles start 736 down.
const CARD = { w: 390, h: 844, tiles: 736 };
// How long the card holds once it is up before the battle opens. The tape
// holds longer so its numbers can be read.
const HOLD_MS = { tape: 2600, cinematic: 1400, letsRun: 1400, strike: 1400 };

/** The 1v1 card. */
function CardCountdown() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { battleId } = useLocalSearchParams();
  const id = String(battleId || "");
  const { data: battle, refetch } = useBattle(id);
  const me = useProfile().data;
  const opp = battle?.opponent?.player;
  const h2hQuery = useHeadToHead(opp?.id);
  const h2h = h2hQuery.data;

  // The intro is picked once the battle and the head to head are in (or a
  // moment has passed without the head to head), and then it stays.
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 1500);
    return () => clearTimeout(t);
  }, []);
  const picked = useRef(null);
  if (!picked.current && battle && me && (h2hQuery.status !== "pending" || !opp?.id || waited)) picked.current = pickIntro(battle, h2h);
  const intro = picked.current;

  const needStats = intro === "tape" || intro === "cinematic";
  const youStats = usePlayer(needStats ? me?.id : undefined).data;
  const themStats = usePlayer(needStats ? opp?.id : undefined).data;
  const card = useMemo(
    () => (intro ? versusCard({ battle, me, opp, h2h, stats: { you: youStats, them: themStats }, intro }) : null),
    [intro, battle, me, opp, h2h, youStats, themStats],
  );

  const live = battle?.status === "active";
  const waiting = battle?.status === "pending";

  // Up once the intro has played; if the card never says it started, carry on anyway.
  const [started, setStarted] = useState(false);
  const [up, setUp] = useState(false);
  useEffect(() => {
    if (!intro) return undefined;
    const t = setTimeout(() => setStarted(true), 2500);
    return () => clearTimeout(t);
  }, [intro]);
  useEffect(() => {
    if (!started) return undefined;
    const t = setTimeout(() => setUp(true), INTRO_MS[intro] || INTRO_MS.strike);
    return () => clearTimeout(t);
  }, [started, intro]);

  // Live: hold, then GO and the battle opens.
  useEffect(() => {
    if (!live || !up) return undefined;
    const t = setTimeout(() => {
      haptic.go();
      router.replace(`/battles/${id}`);
    }, HOLD_MS[intro] || HOLD_MS.strike);
    return () => clearTimeout(t);
  }, [live, up, intro, id, router]);

  // Waiting on them: check now and then whether they've said yes.
  useEffect(() => {
    if (!waiting) return undefined;
    const t = setInterval(() => refetch(), 5000);
    return () => clearInterval(t);
  }, [waiting, refetch]);

  const onCue = (name) => {
    if (name === "slam" || name === "letsRun") haptic.beat();
    else if (name === "cutIn") haptic.select();
    else if (name === "addPack") router.push("/pack");
  };

  if (!card) {
    return (
      <View style={{ flex: 1, backgroundColor: "#04060b" }}>
        <TopBar onBack={() => router.replace("/outside/arena")} />
      </View>
    );
  }

  const oppName = (opp?.name || "Rival").split(" ")[0];
  const scale = Math.max(width / CARD.w, height / CARD.h);
  const tilesTop = (height - CARD.h * scale) / 2 + CARD.tiles * scale;
  return (
    <View style={{ flex: 1, backgroundColor: "#04060b" }}>
      <VersusCard card={card} onCue={onCue} onReady={() => setStarted(true)} style={StyleSheet.absoluteFill} />
      {up && !live ? (
        <Animated.View entering={FadeIn.duration(400)} style={[styles.panel, { bottom: height - tilesTop + 14 }]}>
          {waiting ? <Text style={styles.panelText}>Sent. The clock starts when {oppName} accepts.</Text> : null}
          <GlowButton
            title={waiting ? "Back to the Arena" : "See the battle"}
            variant="glass"
            full
            onPress={() => router.replace(waiting ? "/outside/arena" : `/battles/${id}`)}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** The prototype's .vs9 in React Native, for builds without Rive (Expo Go). */
function SplitCountdown() {
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
        <Avatar uri={me?.fighter?.profile || me?.avatar} runner={me?.runner} runnerFigure={me?.runnerFigure} name={me?.name || "You"} size={46} tier={me?.tier} />
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
  panel: { position: "absolute", left: 18, right: 18, gap: S.sm, padding: S.md, borderRadius: 22, backgroundColor: "rgba(4,6,11,0.72)" },
  panelText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 14, textAlign: "center" },
});
