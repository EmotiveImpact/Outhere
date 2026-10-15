// One battle. An invite gets the stake, the length and the prize with Accept
// as the big button. A live most-steps battle is the versus screen: live
// score, the pot and a boost, and a tray of emotes and set lines (no chat).
// A finished one says who won and puts Rematch right there. The other five
// modes keep their own views (start line, sealed envelopes, ghost, target,
// route) in ClassicBattle.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeOut, ZoomIn } from "react-native-reanimated";
import { Clock3, Share2, Swords, TrendingUp, Trophy, Zap } from "lucide-react-native";
import { engine, useBattle, useBattleEmotes, useBattles, useEngineMutation, useHeadToHead, useProfile } from "@/data/hooks";
import { Avatar, BlendImage, C, F, LiveDot, PressableScale, R, Row, S, Skeleton, Surface, TugBar, VersusSplit, imageSource } from "@/components/ui";
import { BottomBar, ButtonPair, Coin, GlassChip, GlowHero, StatBoxes, TopBar } from "@/components/arena/OutsideKit";
import ClassicBattle from "@/components/arena/ClassicBattle";
import Confetti from "@/components/arena/Confetti";
import { durationLabel, formatScore, metricUnit, playerName, useNow } from "@/components/arena/shared";
import { BATTLE_EMOTES, BATTLE_LINES, emoteLabel } from "@/data/seedOutside";
import { PHOTOS } from "@/constants/photos";
import { distanceLabel } from "@/constants/battleModes";
import { formatNumber } from "@/utils/format";

const BLUE = "#3d8bff";
const BOOST_OUT = 20;

const clockText = (ms) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(t / 86400);
  const h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (d > 0) return `${d}d ${h}h left`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const lengthLabel = (b) => (b.distanceM && b.mode !== "most_steps" ? distanceLabel(b.distanceM) : durationLabel(b.durationHours || 24));
const goalLabel = (b) => (b.mode === "most_steps" ? `most ${b.metric === "distance" ? "km" : b.metric === "minutes" ? "minutes" : "steps"}` : b.modeName?.toLowerCase() || "battle");
const isStepWindow = (b) => b.mode === "most_steps";

export default function BattleScreen() {
  const { battleId } = useLocalSearchParams();
  const id = Array.isArray(battleId) ? battleId[0] : battleId;
  const { data: battle, isPending, error } = useBattle(id);

  if (isPending) return <Loading />;
  if (error || !battle) return <ClassicBattle />;
  if (battle.status === "pending" && battle.incoming) return <Invite battle={battle} />;
  if (isStepWindow(battle) && battle.status === "active") return <LiveBattle battle={battle} />;
  if (battle.status === "complete" && (isStepWindow(battle) || battle.mode === "live_race" || battle.mode === "ghost_race")) return <Result battle={battle} />;
  return <ClassicBattle />;
}

function Loading() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Skeleton height={220 + insets.top} radius={0} />
      <View style={{ padding: S.gutter, gap: S.md }}>
        <Skeleton height={160} radius={R.lg} />
        <Skeleton height={70} radius={R.lg} />
      </View>
      <TopBar />
    </View>
  );
}

function useBattleActions(battle) {
  const router = useRouter();
  const respond = useEngineMutation(engine.respondToBattle, {
    success: (b) => (b?.status === "active" ? `Game on vs ${playerName(b.opponent?.player)}` : "Invite declined"),
    onSuccess: (b, [, accept]) => {
      if (accept && b?.status === "active") router.replace(`/battles/countdown/${b.id}`);
      else if (router.canGoBack()) router.back();
      else router.replace("/outside/arena");
    },
  });
  const rematch = useEngineMutation(engine.rematchBattle, {
    success: (b) => `Rematch sent to ${playerName(b?.opponent?.player)}`,
    onSuccess: (b) => router.replace(`/battles/countdown/${b.id}`),
  });
  return { respond, rematch };
}

// ── Invite ────────────────────────────────────────────────────────────────────

function Invite({ battle }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const me = useProfile().data;
  const { respond } = useBattleActions(battle);
  const opp = battle.opponent.player;
  const first = (opp?.name || "They").split(" ")[0];
  const kick = `1v1 challenge${battle.rematchOf ? " · Rematch" : battle.isSurprise ? " · Mystery" : ""}`;
  const pot = (battle.stakeOut || 0) * 2;
  const short = battle.stakeOut && me && me.out < battle.stakeOut;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <LinearGradient colors={["#07090c", "#0b1220", "#07090c"]} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.inviteBody, { paddingBottom: insets.bottom + 120 }]}>
        <Text style={styles.kick}>{kick}</Text>
        <Row gap={S.lg} style={{ alignItems: "center", marginTop: S.md }}>
          <Avatar uri={opp?.avatar} name={opp?.name} size={84} style={styles.ringWhite} />
          <Text style={styles.vsSmall}>vs</Text>
          <Avatar uri={me?.avatar} name={me?.name || "You"} size={84} style={styles.ringBlue} />
        </Row>
        <Text style={styles.inviteTitle} numberOfLines={2} adjustsFontSizeToFit>
          {battle.rematchOf ? `${first} wants` : `${first} calls`}
        </Text>
        <Text style={[styles.inviteTitle, styles.blueGlow]} numberOfLines={1} adjustsFontSizeToFit>
          {battle.rematchOf ? "a rematch" : "you out"}
        </Text>
        <StatBoxes
          style={{ marginTop: S.xl, alignSelf: "stretch" }}
          items={[
            { value: battle.stakeOut ? formatNumber(battle.stakeOut) : "0", label: battle.stakeOut ? "OUT each" : "no stake" },
            { value: lengthLabel(battle).replace(" days", "d").replace(" hours", "h"), label: goalLabel(battle) },
            { value: formatNumber(pot || 15), label: "to the winner" },
          ]}
        />
        {short ? <Text style={styles.warn}>You need {formatNumber(battle.stakeOut)} OUT to accept. You have {formatNumber(me.out)}.</Text> : null}
      </View>
      <BottomBar>
        <ButtonPair
          secondary={{ title: "Decline", disabled: respond.isPending, onPress: () => respond.mutate([battle.id, false]) }}
          primary={{ title: "Accept", loading: respond.isPending, disabled: short, onPress: () => respond.mutate([battle.id, true]) }}
        />
      </BottomBar>
      <TopBar close onMore={() => router.push(`/player/${opp?.id}`)} />
    </View>
  );
}

// ── Live: most steps ──────────────────────────────────────────────────────────

function Burst({ code, onDone }) {
  const emote = BATTLE_EMOTES.find((e) => e.code === code);
  useEffect(() => {
    const t = setTimeout(onDone, 1300);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <View style={styles.burstWrap} pointerEvents="none">
      <Animated.View entering={ZoomIn.springify().damping(9)} exiting={FadeOut.duration(250)} style={{ alignItems: "center" }}>
        {emote ? <BlendImage source={emote.image} size={190} mask="burst" glow={230} /> : null}
        <Text style={styles.burstText}>{emoteLabel(code)}</Text>
      </Animated.View>
    </View>
  );
}

function LiveBattle({ battle }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const now = useNow(1000);
  const { data: fresh, refetch } = useBattle(battle.id);
  const b = fresh || battle;
  const emotes = useBattleEmotes(b.id).data || [];
  const [burst, setBurst] = useState(null);
  const seen = useRef(null);

  const send = useEngineMutation(engine.sendBattleEmote, { onSuccess: (e) => BATTLE_EMOTES.some((x) => x.code === e.code) && setBurst({ code: e.code, key: e.id }) });
  const boost = useEngineMutation(engine.boostBattle, { success: "Boosted. Double XP if you win" });

  // Their emotes burst over the screen when they land.
  useEffect(() => {
    const latest = emotes[0];
    if (!latest) return;
    if (seen.current && latest.id !== seen.current && !latest.mine && BATTLE_EMOTES.some((x) => x.code === latest.code)) setBurst({ code: latest.code, key: latest.id });
    seen.current = latest.id;
  }, [emotes]);

  const remaining = Math.max(0, (b.endAt || 0) - now);
  useEffect(() => {
    if (b.endAt && remaining === 0) refetch();
  }, [remaining, b.endAt, refetch]);
  useEffect(() => {
    const t = setInterval(() => refetch(), 30_000);
    return () => clearInterval(t);
  }, [refetch]);

  const opp = b.opponent.player;
  const oppName = (opp?.name || "Rival").split(" ")[0];
  const mine = b.me.value || 0;
  const theirs = b.opponent.value || 0;
  const share = mine + theirs ? mine / (mine + theirs) : 0.5;
  const gap = Math.abs(mine - theirs);
  const unit = metricUnit(b.metric);
  const lead = b.leader === "me" ? `You lead by ${formatScore(b.metric, gap)}` : b.leader ? `${oppName} leads by ${formatScore(b.metric, gap)}` : "Dead level";
  const areas = [b.me.player?.area, opp?.area].every(Boolean) ? `${b.me.player.area} vs ${opp.area}` : null;
  const pot = (b.stakeOut || 0) * 2;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 190 + insets.bottom }}>
        {/* Versus header (.r10vsh): you lit blue on the left, them red on the right, split by a glowing seam. */}
        <VersusSplit
          height={200 + insets.top}
          slant={0.08}
          left={{ source: imageSource(b.me.player?.avatar) || PHOTOS.fighterA, tint: "rgba(42,106,240,0.35)", focus: { x: 0.5, y: 0.2 } }}
          right={{ source: imageSource(opp?.avatar) || PHOTOS.fighterB, tint: "rgba(255,77,85,0.32)", focus: { x: 0.5, y: 0.2 } }}
          fade="rgba(7,9,12,1)"
          fadeFrom={0.55}
        >
          <Text style={[styles.sideName, { left: S.gutter }]}>You</Text>
          <Text style={[styles.sideName, { right: S.gutter, textAlign: "right" }]} numberOfLines={1}>
            {oppName}
          </Text>
        </VersusSplit>

        <View style={{ paddingHorizontal: S.gutter, marginTop: -16 }}>
          <Surface padding={S.lg}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={styles.scoreLabel}>You</Text>
              <Text style={styles.scoreLabel}>{oppName}</Text>
            </Row>
            <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
              <Text style={[styles.score, styles.scoreMine]} numberOfLines={1} adjustsFontSizeToFit>
                {formatScore(b.metric, mine)}
              </Text>
              <View style={styles.vsDot}>
                <Text style={styles.vsDotText}>VS</Text>
              </View>
              <Text style={[styles.score, styles.scoreTheirs]} numberOfLines={1} adjustsFontSizeToFit>
                {formatScore(b.metric, theirs)}
              </Text>
            </Row>
            <TugBar share={share} style={{ marginTop: S.lg, marginBottom: 4 }} />
            <Row style={{ justifyContent: "space-between", marginTop: S.sm }}>
              <Text style={styles.small}>
                <Text style={{ color: C.text }}>{lead}</Text>
                {unit && b.leader ? ` ${unit}` : ""}
              </Text>
              {areas ? <Text style={styles.small}>{areas}</Text> : null}
            </Row>
          </Surface>

          <Row gap={S.sm} style={{ marginTop: S.md }}>
            <GlassChip icon={Clock3} label="Ends in" value={clockText(remaining)} tone="accent" />
            {b.isSurprise ? <GlassChip label="Mystery battle" /> : null}
          </Row>

          <Surface padding={S.md} style={{ marginTop: S.md }} contentStyle={styles.pot}>
            <BlendImage source={PHOTOS.coin} size={52} mask="wide" />
            <View style={{ flex: 1 }}>
              <Text style={styles.potTitle}>{pot ? `${formatNumber(pot)} OUT pot` : "Bragging rights"}</Text>
              <Text style={styles.small}>{pot ? `${formatNumber(b.stakeOut)} each · winner takes all` : "Win for 150 XP and 15 OUT"}</Text>
            </View>
            {b.boosted ? <Text style={styles.boosted}>×2 XP</Text> : null}
          </Surface>

          {/* The set lines, newest at the bottom: theirs on the right, yours on the left. */}
          <View style={{ marginTop: S.lg, gap: S.sm }}>
            {emotes
              .slice(0, 5)
              .reverse()
              .map((e) => {
                const art = BATTLE_EMOTES.find((x) => x.code === e.code)?.image;
                return (
                  <View key={e.id} style={[styles.bubble, e.mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    {art ? <BlendImage source={art} size={24} mask="tight" /> : <Avatar uri={e.mine ? b.me.player?.avatar : opp?.avatar} name={e.mine ? b.me.player?.name || "You" : oppName} size={22} />}
                    <Text style={styles.bubbleText}>{emoteLabel(e.code)}</Text>
                  </View>
                );
              })}
          </View>

        </View>
      </ScrollView>

      <View style={[styles.tray, { bottom: insets.bottom + S.sm }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.md }}>
          {!b.boosted ? (
            <PressableScale onPress={() => boost.mutate(b.id)} disabled={boost.isPending} scaleTo={0.92} style={[styles.emote, styles.boostTile]} accessibilityLabel={`Boost for ${BOOST_OUT} OUT`}>
              <Zap size={22} color="#fff" />
              <Text style={styles.boostText}>{BOOST_OUT} OUT</Text>
            </PressableScale>
          ) : null}
          {BATTLE_EMOTES.map((e) => (
            <PressableScale key={e.code} onPress={() => send.mutate([b.id, e.code])} scaleTo={0.88} style={styles.emote} accessibilityLabel={e.label}>
              <BlendImage source={e.image} size={50} mask="tight" />
            </PressableScale>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.md, marginTop: S.sm }}>
          {BATTLE_LINES.map((l) => (
            <PressableScale key={l.code} onPress={() => send.mutate([b.id, l.code])} scaleTo={0.94} style={styles.line}>
              <Text style={styles.lineText}>{l.label}</Text>
            </PressableScale>
          ))}
        </ScrollView>
      </View>

      <TopBar
        center={
          <View style={styles.livePill}>
            <LiveDot size={7} />
            <Text style={styles.livePillText}>Live · {remaining > 86_400_000 ? clockText(remaining) : `${clockText(remaining)} left`}</Text>
          </View>
        }
        onMore={() => router.push(`/player/${opp?.id}`)}
      />
      {burst ? <Burst key={burst.key} code={burst.code} onDone={() => setBurst(null)} /> : null}
    </View>
  );
}

// ── Result ────────────────────────────────────────────────────────────────────

function winStreak(battles) {
  const done = (battles || []).filter((x) => x.status === "complete").sort((a, z) => (z.completedAt || z.endAt || 0) - (a.completedAt || a.endAt || 0));
  let n = 0;
  for (const x of done) {
    if (x.result === "won") n += 1;
    else break;
  }
  return n;
}

function Result({ battle }) {
  const router = useRouter();
  const { rematch } = useBattleActions(battle);
  const all = useBattles().data;
  const h2h = useHeadToHead(battle.opponent.player?.id).data;
  const opp = battle.opponent.player;
  const oppName = (opp?.name || "Rival").split(" ")[0];
  const won = battle.result === "won";
  const draw = battle.result === "draw";
  const mine = battle.me.value;
  const theirs = battle.opponent.value;
  const diff = (mine || 0) - (theirs || 0);
  const streak = useMemo(() => (won ? winStreak(all) : 0), [won, all]);
  const prize = battle.prize || {};
  const lostLately = !won && !draw && battle.completedAt && Date.now() - battle.completedAt < 86_400_000;
  const halfStake = lostLately && battle.stakeOut ? Math.floor(battle.stakeOut / 2) : null;
  const metric = battle.mode === "most_steps" ? battle.metric : "time";
  const kicker = won ? `Battle over · Beat ${oppName}` : draw ? "Battle over · Dead heat" : `Battle over · ${oppName} won`;
  const [top, bottom] = won ? ["You", "won"] : draw ? ["All", "square"] : diff && Math.abs(diff) / Math.max(1, theirs || 1) < 0.08 ? ["So", "close"] : ["Not", "this time"];
  const ratio = mine != null && theirs != null && mine + theirs ? mine / (mine + theirs) : 0.5;
  const share = () =>
    Share.share({ message: `${won ? "Beat" : "Battled"} ${oppName} on Outhere: ${formatScore(metric, mine)} to ${formatScore(metric, theirs)}${metric === "steps" ? " steps" : ""}.` }).catch(() => {});

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <GlowHero height={300} center kicker={kicker} kickerColour={won ? C.accentHi : C.textDim}>
          <Text style={styles.resultTitle} numberOfLines={1} adjustsFontSizeToFit>
            {top} <Text style={won ? styles.blueGlow : { color: "#a9b4c4" }}>{bottom}</Text>
          </Text>
        </GlowHero>
        <View style={{ paddingHorizontal: S.gutter, marginTop: S.lg, gap: S.md }}>
          <View style={styles.strip}>
            <Avatar uri={battle.me.player?.avatar} name={battle.me.player?.name || "You"} size={40} style={won ? styles.ringBlueThin : null} />
            <View style={{ flex: 1 }}>
              <Text style={styles.stripScore}>{formatScore(metric, mine)}</Text>
              <Text style={styles.small}>You</Text>
            </View>
            <View style={{ alignItems: "center", width: 54 }}>
              <Text style={styles.small}>{metric === "time" ? "" : `${diff > 0 ? "+" : diff < 0 ? "−" : ""}${formatScore(metric, Math.abs(diff))}`}</Text>
              <View style={styles.miniBar}>
                <View style={{ width: `${ratio * 100}%`, height: "100%", backgroundColor: won ? BLUE : "#a9b4c4", borderRadius: 3 }} />
              </View>
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={styles.stripScore}>{formatScore(metric, theirs)}</Text>
              <Text style={styles.small}>{oppName}</Text>
            </View>
            <Avatar uri={opp?.avatar} name={opp?.name} size={40} />
          </View>

          {won || draw ? (
            <View style={{ alignItems: "center", gap: S.sm }}>
              <Row gap={S.sm}>
                {prize.out ? <GlassChip icon={() => <Coin size={14} />} label={`+${formatNumber(prize.out)} OUT`} /> : null}
                {prize.xp ? <GlassChip icon={Zap} label={`+${formatNumber(prize.xp)} XP`} tone="accent" /> : null}
              </Row>
              {streak >= 2 ? <GlassChip icon={Trophy} label={`${streak} wins in a row`} /> : null}
              {h2h?.played ? <Text style={styles.small}>Head to head: you {h2h.mine}, {oppName} {h2h.theirs}</Text> : null}
            </View>
          ) : (
            <>
              {halfStake ? (
                <View style={styles.offer}>
                  <View style={styles.offerIcon}>
                    <TrendingUp size={18} color={C.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.potTitle}>Rematch at {formatNumber(halfStake)} OUT</Text>
                    <Text style={styles.small}>Half stake for 24 hours after a loss</Text>
                  </View>
                </View>
              ) : null}
              <Text style={[styles.small, { textAlign: "center" }]}>
                {prize.xp ? `+${formatNumber(prize.xp)} XP for showing up.` : ""} {h2h?.played ? `Head to head: you ${h2h.mine}, ${oppName} ${h2h.theirs}.` : ""}
              </Text>
            </>
          )}
        </View>
      </ScrollView>
      <BottomBar>
        <ButtonPair
          secondary={won ? { title: "Share", icon: Share2, onPress: share } : { title: "Done", onPress: () => (router.canGoBack() ? router.back() : router.replace("/outside/arena")) }}
          primary={{ title: won ? "Rematch" : `Rematch ${oppName}`, icon: Swords, loading: rematch.isPending, onPress: () => rematch.mutate(battle.id) }}
        />
      </BottomBar>
      <TopBar />
      {won ? <Confetti seed={battle.id} height={700} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" },
  inviteBody: { flex: 1, justifyContent: "flex-end", alignItems: "center", paddingHorizontal: S.gutter },
  ringWhite: { borderWidth: 3, borderColor: "#e9edf3", borderRadius: 999 },
  ringBlue: { borderWidth: 3, borderColor: BLUE, borderRadius: 999, shadowColor: BLUE, shadowOpacity: 0.7, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } },
  ringBlueThin: { borderWidth: 2, borderColor: BLUE, borderRadius: 999 },
  vsSmall: { color: C.text, fontFamily: F.display, fontSize: 26 },
  inviteTitle: { color: C.text, fontFamily: F.display, fontSize: 48, lineHeight: 50, textTransform: "uppercase", textAlign: "center", marginTop: S.lg },
  blueGlow: { color: C.accent, textShadowColor: "rgba(61,139,255,0.5)", textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 }, marginTop: 0 },
  warn: { color: C.warn, fontFamily: F.body, fontSize: 13, marginTop: S.md, textAlign: "center" },
  sideName: { position: "absolute", bottom: 26, color: "#fff", fontFamily: F.display, fontSize: 22, textTransform: "uppercase", maxWidth: "45%" },
  scoreLabel: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase" },
  score: { flex: 1, fontFamily: F.display, fontSize: 44, lineHeight: 48 },
  // .oh-score .head b: blue-hi and #ff8b92, each glowing in its colour
  scoreMine: { color: "#82b4ff", textShadowColor: "rgba(61,139,255,0.5)", textShadowRadius: 26, textShadowOffset: { width: 0, height: 0 } },
  scoreTheirs: { color: "#ff8b92", textAlign: "right", textShadowColor: "rgba(255,77,85,0.45)", textShadowRadius: 26, textShadowOffset: { width: 0, height: 0 } },
  // .oh-score .vs: a gunmetal coin
  vsDot: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#2b3038", alignItems: "center", justifyContent: "center", marginHorizontal: S.sm, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 0 0 1px rgba(255,255,255,0.06), 0 6px 14px -6px rgba(0,0,0,0.8)" },
  vsDotText: { color: "#c9d0db", fontFamily: F.display, fontSize: 14, letterSpacing: 0.5 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  pot: { flexDirection: "row", alignItems: "center", gap: S.md },
  potTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  boosted: { color: C.accent, fontFamily: F.display, fontSize: 18 },
  bubble: { flexDirection: "row", alignItems: "center", gap: 8, maxWidth: "75%", paddingHorizontal: 12, height: 38, borderRadius: 19 },
  bubbleMine: { alignSelf: "flex-start", backgroundColor: "#2a6af0", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 10px 24px -10px rgba(42,106,240,0.9)" },
  bubbleTheirs: { alignSelf: "flex-end", backgroundColor: "#1b1f26", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.09), inset 0 0 0 1px rgba(255,255,255,0.045)" },
  bubbleText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 14 },
  // the emote tray floats like the tab bar: frosted, lit along its edge
  tray: { position: "absolute", left: S.md, right: S.md, paddingVertical: S.md, borderRadius: 26, backgroundColor: "rgba(18,21,26,0.94)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.06), 0 24px 50px -18px rgba(0,0,0,0.95)" },
  emote: { width: 58, height: 58, borderRadius: 16, backgroundColor: "#15181e", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.04)" },
  boostTile: { backgroundColor: "#2a6af0", gap: 2, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -1px 0 rgba(0,0,0,0.28), 0 10px 22px -10px rgba(42,106,240,0.9)" },
  boostText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 10 },
  line: { height: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: "#1b1f26", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" },
  lineText: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  livePill: { flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 12, borderRadius: R.full, backgroundColor: "rgba(12,15,20,0.6)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.2)", alignSelf: "flex-end" },
  livePillText: { color: C.text, fontFamily: F.bodySemi, fontSize: 12 },
  burstWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  burstText: { color: "#fff", fontFamily: F.display, fontSize: 30, textTransform: "uppercase", marginTop: S.sm, textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 10 },
  resultTitle: { color: C.text, fontFamily: F.display, fontSize: 60, lineHeight: 62, textTransform: "uppercase", textAlign: "center" },
  strip: { flexDirection: "row", alignItems: "center", gap: S.sm, padding: S.md, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.12)" },
  stripScore: { color: C.text, fontFamily: F.display, fontSize: 24, lineHeight: 26 },
  miniBar: { width: 30, height: 6, borderRadius: 3, backgroundColor: C.surfaceHigh, marginTop: 4, overflow: "hidden" },
  offer: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.lg, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.12)" },
  offerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(61,139,255,0.14)", alignItems: "center", justifyContent: "center" },
});
