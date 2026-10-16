// The live race and the blind time trial, each in the prototype's round
// eleven look:
//   RaceScreen   the lobby (.r11 race lobby): the globe drawing a line from
//                you to them, both ready lights and the start count; then
//                the race itself (.r11race): two lanes, pace and emotes.
//   SealedScreen a blind time trial still running (.r11seal): both photos
//                behind frosted glass until both times are in.
//   RevealScreen a finished blind time trial (.r11blr): rays, the two
//                portrait cards turned over and the winner lit.

import React, { useEffect, useRef, useState } from "react";
import { Alert, Platform, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown, FadeOut, FlipInEasyY, ZoomIn } from "react-native-reanimated";
import Svg, { Circle as SvgCircle } from "react-native-svg";
import { Check, Clock3, Eye, Flag, Lock, Play, Share2, Swords, Zap } from "lucide-react-native";
import { engine, useBattle, useBattleEmotes, useEngineMutation, useHeadToHead } from "@/data/hooks";
import { C, CountUp, F, Foil, GlowBackdrop, GlowButton, IconTile, PressableScale, R, Row, S, Surface, useLayoutSize, useScreenTop } from "@/components/ui";
import { haptic } from "@/services/haptics";
import { BottomBar, Coin } from "@/components/arena/OutsideKit";
import { Chip, EmoteTile, EMOTE_FOR_CODE, Facts, Headline, NavRow, PortraitCard, PortraitMini, SlantTag, TurningRays } from "@/components/arena/BattleKit";
import { RaceGlobe, cityPoint, kmApart } from "@/components/arena/RaceGlobe";
import Confetti from "@/components/arena/Confetti";
import { BATTLE_PRIZES, playerName, useNow } from "@/components/arena/shared";
import { BATTLE_EMOTES, emoteLabel } from "@/data/seedOutside";
import { BLIND_START_HOURS, distanceLabel, timeLabel } from "@/constants/battleModes";
import { PHOTOS } from "@/constants/photos";
import { formatNumber, timeLabel as clockLabel } from "@/utils/format";

const BLUE = "#4f9bff";
const RED = "#ff5a62";

/** Seconds a km as 4'58". */
const paceLabel = (sec) => (sec ? `${Math.floor(sec / 60)}'${String(Math.round(sec % 60)).padStart(2, "0")}"` : "--");

const firstName = (p) => (p?.name || "Rival").split(" ")[0];

/** You, with a stand-in photo until you add your own. */
const meOf = (b) => ({ ...(b.me.player || {}), name: "You", avatar: b.me.player?.avatar || PHOTOS.fighterA });

function useRaceActions(battle) {
  const router = useRouter();
  const ready = useEngineMutation(engine.readyBattle, { success: (b) => (b?.phase === "live" ? "Race on" : "You're on the line") });
  const cancel = useEngineMutation(engine.cancelBattle, { success: "Battle called off" });
  const rematch = useEngineMutation(engine.rematchBattle, {
    success: (b) => `Rematch sent to ${playerName(b?.opponent?.player)}`,
    onSuccess: (b) => router.replace(`/battles/countdown/${b.id}`),
  });
  const send = useEngineMutation(engine.sendBattleEmote, { silent: true });
  const confirmCancel = () => {
    const go = () => cancel.mutate(battle.id);
    if (Platform.OS === "web") return go();
    Alert.alert("Call it off?", `The race with ${firstName(battle.opponent.player)} ends now with no winner and no XP.`, [
      { text: "Keep going", style: "cancel" },
      { text: "Call it off", style: "destructive", onPress: go },
    ]);
  };
  return { ready, cancel, confirmCancel, rematch, send };
}

// Keep a running battle fresh: their side moves on the engine's clock.
function useFresh(battle, ms) {
  const { data, refetch } = useBattle(battle.id);
  useEffect(() => {
    const t = setInterval(() => refetch(), ms);
    return () => clearInterval(t);
  }, [refetch, ms]);
  return data || battle;
}

// ── Emote burst ───────────────────────────────────────────────────────────────

/** An emote someone fired, big in the middle of the screen with its glow. */
export function EmoteBurst({ code, onDone }) {
  const emote = BATTLE_EMOTES.find((e) => e.code === code);
  useEffect(() => {
    const t = setTimeout(onDone, 1400);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]} pointerEvents="none">
      <Animated.View entering={ZoomIn.springify().damping(9)} exiting={FadeOut.duration(250)} style={{ alignItems: "center" }}>
        {emote ? (
          <View style={{ width: 200, height: 200, alignItems: "center", justifyContent: "center" }}>
            <GlowBackdrop preset="orb" breathe style={{ top: -20, bottom: -20, left: -20, right: -20 }} />
            <Foil source={emote.image} size={200} mask="burst" />
          </View>
        ) : null}
        <Text style={styles.burstText}>{emoteLabel(code)}</Text>
      </Animated.View>
    </View>
  );
}

/** The four emote tiles along the bottom of a race (.r11race .emo). */
function EmoteRow({ battle, send, onFire, style }) {
  const codes = ["fire", "respect", "too_slow", "speed"];
  return (
    <Row gap={10} style={[{ justifyContent: "center" }, style]}>
      {codes.map((code, i) => (
        <EmoteTile
          key={code}
          id={EMOTE_FOR_CODE[code]}
          size={66}
          glow={i === 0}
          accessibilityLabel={`Send ${emoteLabel(code)}`}
          onPress={() => {
            onFire(code);
            send.mutate([battle.id, code]);
          }}
        />
      ))}
    </Row>
  );
}

// ── Live race ─────────────────────────────────────────────────────────────────

/** A live race: the lobby and start count, then the race. */
export function RaceScreen({ battle }) {
  const now = useNow(250);
  const b = useFresh(battle, battle.phase === "lobby" ? 3000 : 20000);
  const startsIn = b.startAt ? b.startAt - now : null;
  if (b.phase === "lobby" || (startsIn != null && startsIn > 0)) return <RaceLobby battle={b} startsIn={startsIn} />;
  return <LiveRace battle={b} now={now} />;
}

function apartLabel(me, them) {
  const km = kmApart(cityPoint(me?.city), cityPoint(them?.city));
  if (km < 60) return "Same city";
  const n = km >= 1000 ? Math.round(km / 100) * 100 : Math.round(km / 10) * 10;
  return `${formatNumber(n)} km apart`;
}

function RaceLobby({ battle: b, startsIn }) {
  const insets = useSafeAreaInsets();
  const top = useScreenTop();
  const { ready, confirmCancel, cancel } = useRaceActions(b);
  const me = meOf(b);
  const them = b.opponent.player;
  const name = firstName(them);
  const counting = startsIn != null && startsIn > 0;
  const canCancel = b.isChallenger !== false && b.phase === "lobby";
  const prize = BATTLE_PRIZES.win.out + (b.stakeOut || 0) * 2;

  return (
    <View style={styles.screen}>
      <GlowBackdrop preset="screen" style={StyleSheet.absoluteFill} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <RaceGlobe me={me} them={{ ...them, name }} height={top + 360} style={{ marginTop: 0 }} />
        <View style={styles.body}>
          <Animated.View entering={FadeInDown.delay(250).duration(500)}>
            <Headline kick={`Live race · ${distanceLabel(b.distanceM)}`} top="Same start," bottom={apartLabel(me, them)} size={44} />
          </Animated.View>
          <Row gap={S.sm} style={{ marginTop: S.lg }}>
            <ReadyLight on={b.readyMe || counting} label={b.readyMe || counting ? "You're ready" : "You"} />
            <ReadyLight on={b.readyThem || counting} label={b.readyThem || counting ? `${name} is ready` : `${name}`} />
          </Row>

          {counting ? (
            <StartCount ms={startsIn} />
          ) : !b.readyMe ? (
            <GlowButton title="I'm ready" size="lg" full onPress={() => ready.mutate(b.id)} loading={ready.isPending} style={{ marginTop: S.lg }} />
          ) : null}

          <Text style={styles.foot}>
            {counting ? "Start your run on Move when it hits zero. First to the distance wins." : `When you're both ready the countdown starts on both phones at the same moment. Then start your run on Move.`}
          </Text>

          <Surface padding={S.md} style={{ marginTop: S.lg }}>
            <Facts
              size={20}
              items={[
                { value: distanceLabel(b.distanceM), label: "first to" },
                { value: b.stakeOut ? `${formatNumber(b.stakeOut)} OUT` : "None", label: "stake each" },
                { value: `${formatNumber(prize)} OUT`, label: "to the winner" },
              ]}
            />
          </Surface>

          {canCancel ? (
            <PressableScale onPress={confirmCancel} disabled={cancel.isPending} style={styles.callOff} accessibilityLabel="Call it off">
              <Flag size={14} color="#ff8b92" />
              <Text style={styles.callOffText}>Call it off</Text>
            </PressableScale>
          ) : null}
        </View>
      </ScrollView>
      <NavRow float right={<Chip tone="glass" dot={counting ? C.out : C.warn} label={counting ? "Starting" : "At the start"} />} />
    </View>
  );
}

function ReadyLight({ on, label }) {
  return (
    <Surface tone={on ? "blue" : "lit"} radius={16} padding={null} style={{ flex: 1 }} contentStyle={styles.ready}>
      <View style={[styles.readyDot, on && styles.readyDotOn]}>{on ? <Check size={13} color="#fff" strokeWidth={3} /> : null}</View>
      <Text style={[styles.readyText, on && { color: C.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Surface>
  );
}

function StartCount({ ms }) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return (
    <Surface tone="blue" padding={null} style={{ marginTop: S.md }} contentStyle={styles.count}>
      <Text style={styles.countNum}>0:{String(s).padStart(2, "0")}</Text>
      <Text style={styles.countText}>The countdown runs on both phones at the same moment</Text>
    </Surface>
  );
}

function LiveRace({ battle: b, now }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { send } = useRaceActions(b);
  const [burst, setBurst] = useState(null);
  const emotes = useBattleEmotes(b.id).data || [];
  const seen = useRef(null);
  useEffect(() => {
    const latest = emotes[0];
    if (!latest) return;
    if (seen.current && latest.id !== seen.current && !latest.mine && BATTLE_EMOTES.some((x) => x.code === latest.code)) setBurst({ code: latest.code, key: latest.id });
    seen.current = latest.id;
  }, [emotes]);

  const them = b.opponent.player;
  const name = firstName(them);
  const me = meOf(b);
  const km = (b.distanceM || 5000) / 1000;
  const elapsed = Math.max(0, (now - (b.startAt || now)) / 1000);
  const pace = b.rivalPaceSec;
  const theirKm = b.theirTimeIn ? km : pace ? Math.min(km, elapsed / pace) : 0;
  const myKm = b.myTimeIn ? km : null;
  const mm = Math.floor(elapsed / 60);
  const clock = mm >= 60 ? `${Math.floor(mm / 60)}:${String(mm % 60).padStart(2, "0")}:${String(Math.floor(elapsed % 60)).padStart(2, "0")}` : `${mm}:${String(Math.floor(elapsed % 60)).padStart(2, "0")}`;
  const [top, bottom] = b.myTimeIn
    ? ["You're home in", timeLabel(b.me.value)]
    : b.theirTimeIn
      ? [`${name}'s home in`, timeLabel(b.opponent.value)]
      : [`${name} is`, `${theirKm.toFixed(2)} km in`];
  const finishAt = b.startAt && pace ? b.startAt + pace * km * 1000 : null;

  return (
    <View style={styles.screen}>
      <GlowBackdrop preset="screen" style={StyleSheet.absoluteFill} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 140 }}>
        <View style={styles.body}>
          <NavRow
            right={
              <Row gap={10}>
                <Chip tone="glass" dot={C.out} label="Live race" />
                <Text style={styles.clock}>{clock}</Text>
              </Row>
            }
          />
          <Animated.View entering={FadeInDown.duration(450)} style={{ marginTop: S.xl }}>
            <Headline kick={`First to ${distanceLabel(b.distanceM)}`} top={top} bottom={bottom} size={46} />
          </Animated.View>

          <Surface padding={S.lg} style={{ marginTop: S.lg }}>
            <Lane label={`You · ${me.city || "Here"}`} value={myKm == null ? "Not started" : `${myKm.toFixed(2)} km`} share={myKm == null ? 0 : myKm / km} side="left" person={me} />
            <View style={{ height: S.lg }} />
            <Lane label={`${name} · ${them?.city || "Out there"}`} value={`${theirKm.toFixed(2)} km`} share={theirKm / km} side="right" person={them} />
            <View pointerEvents="none" style={styles.finish} />
          </Surface>

          <Facts
            style={{ marginTop: S.lg }}
            items={[
              { value: b.myTimeIn ? paceLabel(b.me.value / km) : "--", label: "Your pace" },
              { value: paceLabel(pace), label: `${name}'s pace`, colour: "#ff8b92" },
              { value: b.stakeOut ? `${formatNumber(b.stakeOut * 2)}` : "150 XP", label: b.stakeOut ? "OUT pot" : "to the winner" },
            ]}
          />

          <Surface padding={S.md} style={{ marginTop: S.lg }} contentStyle={styles.nudge}>
            <IconTile icon={Zap} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.nudgeTitle}>{b.theirTimeIn ? `${name} ran ${timeLabel(b.opponent.value)}` : finishAt ? `${name} finishes about ${clockLabel(finishAt)}` : `${name} is running`}</Text>
              <Text style={styles.nudgeText}>{b.myTimeIn ? "Your time is in. Now it's down to them." : `At ${paceLabel(pace)} a km. Start your run on Move to beat it.`}</Text>
            </View>
          </Surface>

          {!b.myTimeIn ? <GlowButton title={`Go run ${distanceLabel(b.distanceM)}`} icon={Play} size="lg" full onPress={() => router.push("/(tabs)/move")} style={{ marginTop: S.lg }} /> : null}
        </View>
      </ScrollView>
      <View style={[styles.emoteDock, { paddingBottom: Math.max(insets.bottom, S.lg) }]}>
        <LinearGradient colors={["rgba(7,9,12,0)", "rgba(7,9,12,0.94)", C.bg]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <EmoteRow battle={b} send={send} onFire={(code) => setBurst({ code, key: Date.now() })} />
      </View>
      {burst ? <EmoteBurst key={burst.key} code={burst.code} onDone={() => setBurst(null)} /> : null}
    </View>
  );
}

/** One runner's lane: a thick track, the fill in their colour, their photo riding the end. */
function Lane({ label, value, share, side, person }) {
  const blue = side === "left";
  const [box, onLayout] = useLayoutSize();
  const w = box?.width || 0;
  const x = Math.max(0, Math.min(1, share)) * w;
  return (
    <View>
      <Row style={{ justifyContent: "space-between", marginBottom: 10 }}>
        <Text style={styles.laneLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.laneValue, { color: blue ? C.text : "#ff8b92" }]}>{value}</Text>
      </Row>
      <View style={styles.track} onLayout={onLayout}>
        <View style={[styles.trackFill, { width: Math.max(14, x), boxShadow: `0 0 18px ${blue ? "rgba(79,155,255,0.6)" : "rgba(255,90,98,0.55)"}` }]}>
          <LinearGradient colors={blue ? ["#1f55d0", "#4f9bff"] : ["#a81f2a", "#ff5a62"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 7 }]} />
        </View>
      </View>
      {w ? <PortraitMini source={person?.avatar} name={person?.name} side={side} width={34} height={34} radius={11} style={{ position: "absolute", left: Math.max(0, Math.min(w - 34, x - 17)), bottom: -10 }} /> : null}
    </View>
  );
}

// ── Blind time trial: sealed ──────────────────────────────────────────────────

export function SealedScreen({ battle }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const now = useNow(30000);
  const b = useFresh(battle, 30000);
  const them = b.opponent.player;
  const name = firstName(them);
  const me = meOf(b);
  const startBy = (b.startAt || now) + BLIND_START_HOURS * 3600 * 1000;
  const startLeft = Math.max(0, startBy - now);
  const left = Math.max(0, (b.endAt || now) - now);
  const h = Math.floor(left / 3600000);
  const ends = h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h left` : `${h}h ${Math.floor((left % 3600000) / 60000)}m left`;

  return (
    <View style={styles.screen}>
      <GlowBackdrop preset="screen" style={StyleSheet.absoluteFill} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={styles.body}>
          <NavRow right={<Chip tone="glass" icon={Lock} label="Sealed" />} />
          <Animated.View entering={FadeInDown.duration(450)} style={{ marginTop: S.xl }}>
            <Headline kick={`Blind time trial · ${distanceLabel(b.distanceM)}`} top={b.myTimeIn ? "Your time" : "One go,"} bottom={b.myTimeIn ? "is sealed" : "both sealed"} size={46} />
          </Animated.View>

          <Row gap={S.sm} style={{ marginTop: S.lg }}>
            <PortraitCard source={me.avatar} name="You" side="left" blur={Platform.OS === "web" ? 5 : 14} dim={0.8} height={236} style={{ flex: 1 }}>
              <SealMark>{b.myTimeIn ? <Lock size={26} color="#fff" /> : <Play size={26} color="#fff" />}</SealMark>
              <Text style={styles.envName}>You</Text>
              <Text style={styles.envLine}>{b.myTimeIn ? `Done · ${timeLabel(b.me.value)}` : "Not run yet"}</Text>
              <Text style={[styles.envFoot, { color: "#82b4ff" }]}>{b.myTimeIn ? `Hidden from ${name}` : `One go at ${distanceLabel(b.distanceM)}`}</Text>
            </PortraitCard>
            <PortraitCard source={them?.avatar} name={name} side="right" blur={Platform.OS === "web" ? 5 : 14} dim={0.8} height={236} style={{ flex: 1 }}>
              <SealMark>{b.theirTimeIn ? <Lock size={26} color="#fff" /> : <StartRing ms={startLeft} total={BLIND_START_HOURS * 3600 * 1000} />}</SealMark>
              <Text style={styles.envName} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.envLine}>{b.theirTimeIn ? "Done · sealed" : "Hasn't started"}</Text>
              <Text style={[styles.envFoot, { color: "#ff8b92" }]}>{b.theirTimeIn ? (b.myTimeIn ? "Opens when the clock ends" : "Opens when you've run") : `Must start within ${BLIND_START_HOURS} hours`}</Text>
            </PortraitCard>
          </Row>

          <Surface padding={S.lg} style={{ marginTop: S.lg }} contentStyle={{ gap: S.md }}>
            <Rule icon={Check} title="Run it whenever, wherever" sub={`Any flat ${distanceLabel(b.distanceM)}. One go each, no retries.`} />
            <Rule icon={Eye} title="Nobody sees a time until both are in" sub="So nobody can chase a number" />
            <Rule icon={Clock3} title={`${BLIND_START_HOURS} hours to start, then ${ends}`} sub={`If ${name} doesn't post a time, you win and your stake comes back.`} />
          </Surface>

          {!b.myTimeIn ? <GlowButton title={`Go run ${distanceLabel(b.distanceM)}`} icon={Play} size="lg" full onPress={() => router.push("/(tabs)/move")} style={{ marginTop: S.lg }} /> : <Chip tone="glass" icon={Clock3} label={`Reveal in ${ends.replace(" left", "")}`} style={{ alignSelf: "center", marginTop: S.lg }} />}
        </View>
      </ScrollView>
    </View>
  );
}

function SealMark({ children }) {
  return (
    <View style={styles.sealWrap} pointerEvents="none">
      <View style={styles.seal}>{children}</View>
    </View>
  );
}

/** How long they have left to start, as a ring that runs down. */
function StartRing({ ms, total }) {
  const size = 92;
  const r = 40;
  const c = 2 * Math.PI * r;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", margin: -16 }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <SvgCircle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.14)" strokeWidth={5} fill="none" />
        <SvgCircle cx={size / 2} cy={size / 2} r={r} stroke={BLUE} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={`${c * Math.max(0.02, ms / total)} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <Text style={styles.ringText}>
        {h}:{String(m).padStart(2, "0")}
      </Text>
    </View>
  );
}

function Rule({ icon: Icon, title, sub }) {
  return (
    <Row gap={S.md} style={{ alignItems: "flex-start" }}>
      <View style={styles.ruleIcon}>
        <Icon size={14} color={C.accentHi} strokeWidth={2.6} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.ruleTitle}>{title}</Text>
        <Text style={styles.ruleSub}>{sub}</Text>
      </View>
    </Row>
  );
}

// ── Blind time trial: the reveal ──────────────────────────────────────────────

export function RevealScreen({ battle: b }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { rematch } = useRaceActions(b);
  const h2h = useHeadToHead(b.opponent.player?.id).data;
  const them = b.opponent.player;
  const name = firstName(them);
  const me = meOf(b);
  const won = b.result === "won";
  const draw = b.result === "draw";
  const km = (b.distanceM || 5000) / 1000;
  const gap = b.me.value != null && b.opponent.value != null ? Math.abs(b.me.value - b.opponent.value) : null;
  const by = gap == null ? null : gap < 60 ? `${gap} second${gap === 1 ? "" : "s"}` : timeLabel(gap);
  const prize = b.prize || {};
  const share = () => Share.share({ message: `${won ? "Beat" : "Raced"} ${name} in a blind ${distanceLabel(b.distanceM)} on Outhere: ${timeLabel(b.me.value)} to ${timeLabel(b.opponent.value)}.` }).catch(() => {});
  const done = () => (router.canGoBack() ? router.back() : router.replace("/outside/arena"));
  // The reveal lands in the hand once the cards have turned.
  useEffect(() => {
    const t = setTimeout(() => (won ? haptic.win() : draw ? null : haptic.lose()), 700);
    return () => clearTimeout(t);
  }, [won, draw]);

  return (
    <View style={styles.screen}>
      <GlowBackdrop preset="screen" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]} pointerEvents="none">
        <TurningRays style={{ top: 40 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        <View style={styles.body}>
          <NavRow />
          <Animated.View entering={FadeInDown.duration(500)} style={{ marginTop: S.sm }}>
            <Headline center kick="Both times are in" top="The" bottom="Reveal" size={60} />
          </Animated.View>

          <Row gap={S.sm} style={{ marginTop: S.xl }}>
            <Animated.View entering={FlipInEasyY.delay(250).duration(650)} style={{ flex: 1 }}>
              <RevealCard person={me} side="left" time={b.me.value} km={km} win={won} label="You" />
            </Animated.View>
            <Animated.View entering={FlipInEasyY.delay(550).duration(650)} style={{ flex: 1 }}>
              <RevealCard person={them} side="right" time={b.opponent.value} km={km} win={!won && !draw} label={name} />
            </Animated.View>
          </Row>

          <Animated.View entering={FadeIn.delay(1100).duration(500)} style={{ alignItems: "center", marginTop: S.lg, gap: S.md }}>
            <Text style={styles.margin}>
              {draw ? "Dead heat. Same time to the second." : b.forfeit ? (won ? `${name} didn't post a time.` : "No time from you before the clock ran out.") : won ? "You won by " : `${name} won by `}
              {!draw && !b.forfeit && by ? <Text style={{ color: "#fff", fontFamily: F.bodySemi }}>{by}</Text> : null}
            </Text>
            <Row gap={S.sm}>
              {prize.out ? <Chip tone="blue" icon={() => <Coin size={14} />} label={`+${formatNumber(prize.out)} OUT`} /> : null}
              {prize.xp ? <Chip tone="blue" icon={Zap} label={`+${formatNumber(prize.xp)} XP`} /> : null}
            </Row>
            {h2h?.played ? (
              <Text style={styles.h2h}>
                Head to head: you {h2h.mine}, {name} {h2h.theirs}
              </Text>
            ) : null}
          </Animated.View>
        </View>
      </ScrollView>
      <BottomBar>
        <Row gap={S.sm}>
          {won ? (
            <>
              <GlowButton title="Rematch" variant="quiet" loading={rematch.isPending} onPress={() => rematch.mutate(b.id)} style={{ flex: 1 }} />
              <GlowButton title="Share" icon={Share2} onPress={share} style={{ flex: 1.4 }} />
            </>
          ) : (
            <>
              <GlowButton title="Done" variant="quiet" onPress={done} style={{ flex: 1 }} />
              <GlowButton title={`Rematch ${name}`} icon={Swords} loading={rematch.isPending} onPress={() => rematch.mutate(b.id)} style={{ flex: 1.4 }} />
            </>
          )}
        </Row>
      </BottomBar>
      {won ? <Confetti seed={b.id} height={700} /> : null}
    </View>
  );
}

function RevealCard({ person, side, time, km, win, label }) {
  const blue = side === "left";
  return (
    <PortraitCard source={person?.avatar} name={label} side={side} glow={win} dim={win ? 1 : 0.7} height={262}>
      {win ? <SlantTag label="Winner" colour={blue ? "#2a6af0" : "#e2323c"} style={styles.winTag} /> : null}
      {/* the time counts up from nought as the card turns over */}
      {time ? (
        <CountUp value={time} duration={1500} delay={blue ? 500 : 800} format={timeLabel} size={44} lineHeight={46} colour={win ? (blue ? "#b9d6ff" : "#ffc2c5") : "#c9d0db"} style={{ justifyContent: "center" }} textStyle={styles.revealShadow} />
      ) : (
        <Text style={[styles.revealTime, { color: "#c9d0db" }]}>{timeLabel(time)}</Text>
      )}
      <Text style={styles.revealSub} numberOfLines={1}>
        {label} · {time ? `${paceLabel(time / km)} /km` : "no time"}
      </Text>
    </PortraitCard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  body: { paddingHorizontal: S.gutter },
  foot: { color: C.textDim, fontFamily: F.body, fontSize: 12.5, lineHeight: 18, textAlign: "center", marginTop: S.md, paddingHorizontal: S.sm },
  ready: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, height: 52 },
  readyDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  readyDotOn: { backgroundColor: "#2a6af0", borderColor: "#4f9bff", boxShadow: "0 0 12px rgba(79,155,255,0.7)" },
  readyText: { flex: 1, color: C.textDim, fontFamily: F.bodySemi, fontSize: 14 },
  count: { flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.lg, paddingVertical: S.md },
  countNum: { color: "#9fc4ff", fontFamily: F.display, fontSize: 52, lineHeight: 56, textShadowColor: "rgba(61,139,255,0.7)", textShadowRadius: 20, textShadowOffset: { width: 0, height: 0 } },
  countText: { flex: 1, color: C.text, fontFamily: F.bodySemi, fontSize: 13, lineHeight: 17 },
  callOff: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", marginTop: S.lg, paddingHorizontal: 14, height: 36, borderRadius: R.full, backgroundColor: "rgba(255,77,85,0.1)" },
  callOffText: { color: "#ff8b92", fontFamily: F.bodySemi, fontSize: 13 },
  clock: { color: C.text, fontFamily: F.display, fontSize: 26, letterSpacing: 0.5 },
  laneLabel: { flex: 1, color: C.textSoft, fontFamily: F.bodyMedium, fontSize: 13 },
  laneValue: { fontFamily: F.display, fontSize: 22, lineHeight: 24 },
  track: { height: 14, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.06)", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.6)" },
  trackFill: { height: 14, borderRadius: 7 },
  finish: { position: "absolute", right: S.lg + 2, top: 12, bottom: 12, width: 0, borderLeftWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.35)" },
  nudge: { flexDirection: "row", alignItems: "center", gap: S.md },
  nudgeTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  nudgeText: { color: C.textDim, fontFamily: F.body, fontSize: 12.5, marginTop: 2 },
  emoteDock: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: S.xl },
  burstText: { color: "#fff", fontFamily: F.display, fontSize: 32, textTransform: "uppercase", marginTop: S.sm, textShadowColor: "rgba(61,139,255,0.7)", textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },
  sealWrap: { position: "absolute", left: 0, right: 0, top: 30, alignItems: "center" },
  seal: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), inset 0 0 0 1px rgba(255,255,255,0.18), 0 0 30px rgba(61,139,255,0.25)" },
  ringText: { color: "#fff", fontFamily: F.display, fontSize: 26 },
  envName: { color: "#fff", fontFamily: F.display, fontSize: 26, lineHeight: 28, textTransform: "uppercase", textAlign: "center" },
  envLine: { color: C.textSoft, fontFamily: F.bodyMedium, fontSize: 13, textAlign: "center", marginTop: 2 },
  envFoot: { fontFamily: F.bodyMedium, fontSize: 11.5, textAlign: "center", marginTop: 4 },
  ruleIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(61,139,255,0.16)", alignItems: "center", justifyContent: "center", marginTop: 1, boxShadow: "inset 0 1px 0 rgba(130,180,255,0.4)" },
  ruleTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14.5 },
  ruleSub: { color: C.textDim, fontFamily: F.body, fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  margin: { color: C.textSoft, fontFamily: F.body, fontSize: 16, textAlign: "center" },
  h2h: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  winTag: { position: "absolute", top: 12, left: 12 },
  revealTime: { fontFamily: F.display, fontSize: 44, lineHeight: 46, textAlign: "center", textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 12 },
  revealShadow: { textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 12 },
  revealSub: { color: C.textSoft, fontFamily: F.body, fontSize: 12, textAlign: "center", marginTop: 2 },
});
