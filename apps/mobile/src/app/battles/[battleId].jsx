// One battle. An invite gets the stake, the length and the prize with Accept
// as the big button. A live most-steps battle is the versus screen: live
// score, the pot and a boost, and a tray of emotes and set lines (no chat).
// A finished one says who won and puts Rematch right there. The other five
// modes keep their own views (start line, sealed envelopes, ghost, target,
// route) in ClassicBattle.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Clock3, Share2, Swords, TrendingUp, Trophy, Zap } from "lucide-react-native";
import { engine, useBattle, useBattleEmotes, useBattles, useEngineMutation, useHeadToHead, useProfile } from "@/data/hooks";
import { BlendImage, C, F, GlowBackdrop, GlowButton, Grain, IconTile, LiveDot, Meter, PhotoBackground, PressableScale, R, Row, S, Skeleton, Surface, TugBar, VersusSplit, imageSource } from "@/components/ui";
import { BottomBar, Coin, GlassChip, StatBoxes, TopBar } from "@/components/arena/OutsideKit";
import { Bubble, Chip, EmoteTile, EMOTE_FOR_CODE, Headline, PortraitMini } from "@/components/arena/BattleKit";
import { EmoteBurst } from "@/components/arena/RaceScreens";
import ClassicBattle from "@/components/arena/ClassicBattle";
import { RaceScreen, RevealScreen, SealedScreen } from "@/components/arena/RaceScreens";
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
  if (battle.mode === "live_race" && battle.status === "active") return <RaceScreen battle={battle} />;
  if (battle.mode === "blind_time_trial" && battle.status === "active") return <SealedScreen battle={battle} />;
  if (battle.mode === "blind_time_trial" && battle.status === "complete") return <RevealScreen battle={battle} />;
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
      {/* .r10inv: two runners side by side, fading into the floor */}
      <PhotoBackground source={PHOTOS.battle} fade="hero" focus={{ x: 0.5, y: 0.25 }} kenBurns glow />
      <View style={[styles.inviteBody, { paddingBottom: insets.bottom + 110 }]}>
        <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: "center", alignSelf: "stretch" }}>
          <Text style={styles.kick}>{kick}</Text>
          <Row gap={S.md} style={{ alignItems: "center", marginTop: S.md }}>
            <PortraitMini source={opp?.avatar} name={first} side="right" width={74} height={84} radius={20} />
            <Text style={styles.vsSmall}>vs</Text>
            <PortraitMini source={me?.avatar || PHOTOS.fighterA} name="You" side="left" width={74} height={84} radius={20} />
          </Row>
          <Headline center top={battle.rematchOf ? `${first} wants` : `${first} calls`} bottom={battle.rematchOf ? "a rematch" : "you out"} size={50} style={{ marginTop: S.lg, alignSelf: "stretch" }} />
          <StatBoxes
            glass
            style={{ marginTop: S.xl, alignSelf: "stretch" }}
            items={[
              { value: battle.stakeOut ? formatNumber(battle.stakeOut) : "0", label: battle.stakeOut ? "OUT each" : "no stake" },
              { value: lengthLabel(battle).replace(" days", "d").replace(" hours", "h"), label: goalLabel(battle) },
              { value: formatNumber(pot || 15), label: "to the winner" },
            ]}
          />
          {short ? <Text style={styles.warn}>You need {formatNumber(battle.stakeOut)} OUT to accept. You have {formatNumber(me.out)}.</Text> : null}
        </Animated.View>
      </View>
      <BottomBar>
        <Row gap={S.sm}>
          <GlowButton title="Decline" variant="quiet" disabled={respond.isPending} onPress={() => respond.mutate([battle.id, false])} style={{ flex: 1 }} />
          <GlowButton title="Accept" loading={respond.isPending} disabled={short} onPress={() => respond.mutate([battle.id, true])} style={{ flex: 1.3 }} />
        </Row>
      </BottomBar>
      <TopBar close onMore={() => router.push(`/player/${opp?.id}`)} />
    </View>
  );
}

// ── Live: most steps ──────────────────────────────────────────────────────────

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
          height={250 + insets.top}
          slant={0.13}
          vsSize={52}
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

        <View style={{ paddingHorizontal: S.gutter, marginTop: -30 }}>
          <Surface padding={S.lg} style={{ boxShadow: "0 30px 60px -24px #000, 0 0 40px -18px rgba(61,139,255,0.5)" }}>
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
            <TugBar share={share} height={12} style={{ marginTop: S.lg, marginBottom: 4 }} />
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
              .map((e) => (
                <Bubble key={e.id} mine={e.mine} emote={BATTLE_EMOTES.find((x) => x.code === e.code)?.image} label={emoteLabel(e.code)} />
              ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.tray, { bottom: insets.bottom + S.sm }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: S.md }}>
          {!b.boosted ? (
            <PressableScale onPress={() => boost.mutate(b.id)} disabled={boost.isPending} scaleTo={0.92} style={[styles.emote, styles.boostTile]} accessibilityLabel={`Boost for ${BOOST_OUT} OUT`}>
              <Zap size={22} color="#fff" />
              <Text style={styles.boostText}>{BOOST_OUT} OUT</Text>
            </PressableScale>
          ) : null}
          {BATTLE_EMOTES.map((e, i) => (
            <EmoteTile key={e.code} id={EMOTE_FOR_CODE[e.code]} source={EMOTE_FOR_CODE[e.code] ? undefined : e.image} size={58} radius={18} glow={i === 0} onPress={() => send.mutate([b.id, e.code])} accessibilityLabel={e.label} />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.md, marginTop: S.md }}>
          {BATTLE_LINES.map((l) => (
            <Chip key={l.code} label={l.label} onPress={() => send.mutate([b.id, l.code])} style={{ height: 38 }} />
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
      {burst ? <EmoteBurst key={burst.key} code={burst.code} onDone={() => setBurst(null)} /> : null}
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
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
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
  const objectSize = Math.min(width * 0.7, 280);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* .r10res: the crown for a win, the trophy greyed out for a loss, over the lit slab */}
        <View style={[styles.slab, { height: insets.top + 360 }]}>
          <GlowBackdrop preset="slab" style={StyleSheet.absoluteFill} layers={[{ x: 0.5, y: 0.34, rx: 0.8, ry: 0.6, stops: [[0, won ? "#123a80" : "#141c2c"], [0.55, "#060b16"], [1, "#030407"]] }]} base="#030407" />
          <View style={{ position: "absolute", top: insets.top + 6, left: (width - objectSize) / 2 }}>
            <BlendImage source={won || draw ? PHOTOS.crown : PHOTOS.trophy} size={objectSize} float glow={won ? objectSize : false} grey={won || draw ? 0 : 0.85} dim={won || draw ? 1 : 0.8} />
          </View>
          <Grain amount={0.06} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.slabEdge]} />
          <View style={styles.slabText}>
            <Text style={[styles.kick, !won && { color: C.textDim }]}>{kicker}</Text>
            <Text style={styles.resultTitle} numberOfLines={1} adjustsFontSizeToFit>
              {top} <Text style={won ? styles.blueGlow : { color: "#a9b4c4" }}>{bottom}</Text>
            </Text>
          </View>
        </View>
        <View style={{ paddingHorizontal: S.gutter, marginTop: S.lg, gap: S.md }}>
          <Surface padding={S.md} contentStyle={styles.strip}>
            <PortraitMini source={battle.me.player?.avatar || PHOTOS.fighterA} name="You" side="left" width={42} height={42} radius={13} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.stripScore, won && { color: "#cfe2ff" }]}>{formatScore(metric, mine)}</Text>
              <Text style={styles.small}>You</Text>
            </View>
            <View style={{ alignItems: "center", width: 58 }}>
              <Text style={styles.small}>{metric === "time" ? "" : `${diff > 0 ? "+" : diff < 0 ? "−" : ""}${formatScore(metric, Math.abs(diff))}`}</Text>
              <Meter value={ratio} size={6} tone={won ? "blue" : "grey"} flow={false} style={{ width: 40, marginTop: 5 }} />
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={styles.stripScore}>{formatScore(metric, theirs)}</Text>
              <Text style={styles.small}>{oppName}</Text>
            </View>
            <PortraitMini source={opp?.avatar} name={oppName} side="right" width={42} height={42} radius={13} />
          </Surface>

          {won || draw ? (
            <View style={{ alignItems: "center", gap: S.sm }}>
              <Row gap={S.sm}>
                {prize.out ? <Chip tone="blue" icon={() => <Coin size={14} />} label={`+${formatNumber(prize.out)} OUT`} /> : null}
                {prize.xp ? <Chip tone="blue" icon={Zap} label={`+${formatNumber(prize.xp)} XP`} /> : null}
              </Row>
              {streak >= 2 ? <Chip icon={Trophy} label={`${streak} wins in a row`} style={{ alignSelf: "center" }} /> : null}
              {h2h?.played ? <Text style={styles.small}>Head to head: you {h2h.mine}, {oppName} {h2h.theirs}</Text> : null}
            </View>
          ) : (
            <>
              {halfStake ? (
                <Surface padding={S.lg} contentStyle={styles.offer}>
                  <IconTile icon={TrendingUp} size={42} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.potTitle}>Rematch at {formatNumber(halfStake)} OUT</Text>
                    <Text style={styles.small}>Half stake for 24 hours after a loss</Text>
                  </View>
                </Surface>
              ) : null}
              <Text style={[styles.small, { textAlign: "center" }]}>
                {prize.xp ? `+${formatNumber(prize.xp)} XP for showing up.` : ""} {h2h?.played ? `Head to head: you ${h2h.mine}, ${oppName} ${h2h.theirs}.` : ""}
              </Text>
            </>
          )}
        </View>
      </ScrollView>
      <BottomBar>
        <Row gap={S.sm}>
          {won ? <GlowButton title="Share" variant="quiet" icon={Share2} onPress={share} style={{ flex: 1 }} /> : <GlowButton title="Done" variant="quiet" onPress={() => (router.canGoBack() ? router.back() : router.replace("/outside/arena"))} style={{ flex: 1 }} />}
          <GlowButton title={won ? "Rematch" : `Rematch ${oppName}`} icon={Swords} loading={rematch.isPending} onPress={() => rematch.mutate(battle.id)} style={{ flex: 1.3 }} />
        </Row>
      </BottomBar>
      <TopBar />
      {won ? <Confetti seed={battle.id} height={700} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  kick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" },
  inviteBody: { flex: 1, justifyContent: "flex-end", alignItems: "center", paddingHorizontal: S.gutter },
  vsSmall: { color: C.text, fontFamily: F.display, fontSize: 28, textShadowColor: "rgba(61,139,255,0.6)", textShadowRadius: 16, textShadowOffset: { width: 0, height: 0 } },
  inviteTitle: { color: C.text, fontFamily: F.display, fontSize: 48, lineHeight: 50, textTransform: "uppercase", textAlign: "center", marginTop: S.lg },
  blueGlow: { color: C.accent, textShadowColor: "rgba(61,139,255,0.5)", textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 }, marginTop: 0 },
  warn: { color: C.warn, fontFamily: F.body, fontSize: 13, marginTop: S.md, textAlign: "center" },
  sideName: { position: "absolute", bottom: 44, color: "#fff", fontFamily: F.display, fontSize: 22, textTransform: "uppercase", maxWidth: "45%" },
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
  // the emote tray floats like the tab bar: frosted, lit along its edge
  tray: { position: "absolute", left: S.md, right: S.md, paddingVertical: S.md, borderRadius: 26, backgroundColor: "rgba(18,21,26,0.94)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.06), 0 24px 50px -18px rgba(0,0,0,0.95)" },
  emote: { width: 58, height: 58, borderRadius: 18, backgroundColor: "#15181e", alignItems: "center", justifyContent: "center" },
  boostTile: { backgroundColor: "#2a6af0", gap: 2, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -1px 0 rgba(0,0,0,0.28), 0 10px 22px -10px rgba(42,106,240,0.9)" },
  boostText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 10 },
  livePill: { flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 12, borderRadius: R.full, backgroundColor: "rgba(12,15,20,0.6)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.2)", alignSelf: "flex-end" },
  livePillText: { color: C.text, fontFamily: F.bodySemi, fontSize: 12 },
  resultTitle: { color: C.text, fontFamily: F.display, fontSize: 64, lineHeight: 66, textTransform: "uppercase", textAlign: "center", marginTop: 6 },
  strip: { flexDirection: "row", alignItems: "center", gap: S.sm },
  slab: { borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: "hidden", justifyContent: "flex-end", backgroundColor: "#030407" },
  slabEdge: { borderBottomLeftRadius: 34, borderBottomRightRadius: 34, boxShadow: "inset 0 -1px 0 rgba(130,180,255,0.35), inset 0 0 0 1px rgba(255,255,255,0.05)" },
  slabText: { alignItems: "center", paddingHorizontal: S.gutter, paddingBottom: S.xl },
  stripScore: { color: C.text, fontFamily: F.display, fontSize: 24, lineHeight: 26 },
  offer: { flexDirection: "row", alignItems: "center", gap: S.md },
});
