// A club v club friendly. Incoming and still a mystery: "Here comes a
// challenger club" (cvcChallenger), members vote and the captain decides.
// A relay plays out leg by leg with the runners' faces (clubRelay); the other
// modes show both clubs' scores on the tug bar, or sealed envelopes for a
// blind time trial, and at the end, who took it.

import React, { useEffect } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { ArrowRight, ChevronLeft, Lock, RotateCcw, ThumbsDown, ThumbsUp, Users } from "lucide-react-native";
import { Button, C, EmptyState, F, LiveDot, Row, S, Screen, Skeleton, Surface, TugBar, PhotoBackground, useScreenTop } from "@/components/ui";
import { imageSource } from "@/components/ui/Cover";
import { PHOTOS } from "@/constants/photos";
import { clubModeOf, clubScoreLabel, clubTugShare } from "@/constants/clubModes";
import { engine, useClubBattle, useCrew, useEngineMutation } from "@/data/hooks";
import { useNow } from "@/components/arena/shared";
import { Chip, ClubCrest, GlassRound, RED, startsLabel, whenLabel } from "@/components/clubs/parts";

const lengthLabel = (b) => {
  const h = Math.round((b.endAt - b.startAt) / 3600000);
  return h >= 24 ? `${Math.round(h / 24)} days` : `${h} hour${h === 1 ? "" : "s"}`;
};

const countdown = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}:${String(s % 60).padStart(2, "0")}`;
};

const legTime = (sec) => (sec == null ? "–" : `${Math.floor(sec / 60)}'${String(Math.round(sec % 60)).padStart(2, "0")}"`);

const goBack = (router) => (router.canGoBack() ? router.back() : router.replace("/(tabs)/club"));

// ── cvcChallenger ──────────────────────────────────────────────────────────────

/** .r11ch .band: the blue banner, tilted, with a sheen running along it. */
function Band({ top }) {
  const reduce = useReducedMotion();
  const x = useSharedValue(-1);
  useEffect(() => {
    if (!reduce) x.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.linear }), -1, false);
  }, [reduce, x]);
  const sheen = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 420 }, { skewX: "-20deg" }] }));
  return (
    <View style={[styles.band, { top }]}>
      <LinearGradient colors={["#1d4fd0", "#3d8bff", "#1d4fd0"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      <Animated.View pointerEvents="none" style={[styles.sheen, sheen]}>
        <LinearGradient colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.45)", "rgba(255,255,255,0)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Text style={styles.bandSmall}>Here comes a</Text>
      <Text style={styles.bandBig}>Challenger club</Text>
    </View>
  );
}

function Challenger({ b, vote, respond }) {
  const insets = useSafeAreaInsets();
  const top = useScreenTop();
  const router = useRouter();
  const facts = [
    [`${b.squad} v ${b.squad}`, "Squads"],
    [clubModeOf(b.mode).short || b.modeName, "Battle on"],
    [lengthLabel(b), "Length"],
    ["Friendly", "No league points"],
  ];
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <PhotoBackground source={PHOTOS.clubrun} opacity={0.62} focus={{ x: 0.5, y: 0.2 }} fade={[[0, 0.25], [0.4, 0], [0.74, 0.9], [1, 0.95]]} to="2,4,9" glow={false} grain={0.05} kenBurns />
      <Band top={top + 62} />
      <View style={[styles.mid, { top: top + 182 }]}>
        <Chip tone="glass" icon={Users} label={`Your members voted  ${b.votes.yes} yes · ${b.votes.no} no`} style={{ alignSelf: "center" }} />
      </View>
      <GlassRound icon={ChevronLeft} label="Back" onPress={() => goBack(router)} style={{ position: "absolute", top, left: 18 }} />

      {/* .r11ch .box */}
      <Surface tone="glass" radius={24} padding={16} style={[styles.box, { bottom: insets.bottom + 22 }]}>
        <Row gap={12}>
          <View style={styles.qr}>
            <LinearGradient colors={["#0e2756", "#05080e"]} style={[StyleSheet.absoluteFill, { borderRadius: 25 }]} />
            <Text style={styles.qrText}>?</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.whoTitle}>A club near you</Text>
            <Text style={styles.whoSub}>Matched at random. Both clubs see who at the reveal. Starts {startsLabel(b.startAt)}.</Text>
          </View>
        </Row>
        <Row style={{ marginTop: 14 }}>
          {facts.map(([v, l], i) => (
            <View key={l} style={[styles.fact, i && styles.factLine]}>
              <Text style={styles.factBig} numberOfLines={1} adjustsFontSizeToFit>
                {v}
              </Text>
              <Text style={styles.factSmall}>
                {l}
              </Text>
            </View>
          ))}
        </Row>
        {b.canRespond ? (
          <Row gap={8} style={{ marginTop: 14 }}>
            <Button title="Decline" variant="glass" onPress={() => respond.mutate([b.id, false])} style={{ flex: 1 }} />
            <Button title="Accept for the club" onPress={() => respond.mutate([b.id, true])} loading={respond.isPending} style={{ flex: 1.4 }} />
          </Row>
        ) : b.canVote ? (
          <>
            <Row gap={8} style={{ marginTop: 14 }}>
              <Button title="No" icon={ThumbsDown} variant={b.votes.mine === false ? "outline" : "glass"} onPress={() => vote.mutate([b.id, false])} style={{ flex: 1 }} />
              <Button title="We're in" icon={ThumbsUp} variant={b.votes.mine === true ? "outline" : "primary"} onPress={() => vote.mutate([b.id, true])} loading={vote.isPending} style={{ flex: 1.4 }} />
            </Row>
            <Text style={[styles.whoSub, { textAlign: "center", marginTop: 10 }]}>
              {b.votes.mine == null ? "Your captain decides once the club has had its say." : "Your vote is in. Your captain decides."}
            </Text>
          </>
        ) : (
          <Text style={[styles.whoSub, { marginTop: 12 }]}>Waiting on your captain.</Text>
        )}
      </Surface>
    </View>
  );
}

// ── clubRelay ─────────────────────────────────────────────────────────────────

/** One side's ten legs (.r11relay .legs): faces for the legs run, a ring on the leg running now. */
function Legs({ runners = [], done, of, now, side, planned }) {
  const blue = side === "a";
  return (
    <View style={styles.legs}>
      {Array.from({ length: of }, (_, i) => {
        const ran = i < done;
        const isNow = now && i === done;
        const face = runners[i]?.avatar;
        const show = blue && face && (ran || isNow || planned);
        return (
          <View
            key={i}
            style={[
              styles.leg,
              !blue && ran && { backgroundColor: "rgba(255,77,85,0.4)" },
              blue && ran && styles.legRanA,
              isNow && (blue ? styles.legNowA : styles.legNowB),
            ]}
          >
            {show ? (
              <Image source={imageSource(face)} style={[StyleSheet.absoluteFill, planned && !ran && !isNow && { opacity: 0.4 }]} contentFit="cover" />
            ) : blue ? (
              <Text style={[styles.legNo, (ran || isNow) && { color: "#9cc4ff" }]}>{i + 1}</Text>
            ) : null}
            {blue && ran ? <View style={styles.legBar} /> : null}
          </View>
        );
      })}
    </View>
  );
}

function Relay({ b, them, now, actions }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const top = useScreenTop();
  const { data: crew } = useCrew(b.myClub?.id);
  const finished = b.status === "finished";
  const live = b.status === "live";
  const of = b.legsOf || 10;
  const mineDone = b.myLegs ?? (finished ? of : 0);
  const theirDone = b.theirLegs ?? (finished ? of : 0);
  // The leg order: the squad's runners in club order, ten of them.
  // Runners the app doesn't model show as their leg number.
  const runners = (crew?.members || []).map((m) => m.player).filter(Boolean).slice(0, of);
  const myLeg = runners.findIndex((p) => p.isMe);
  const onNow = live && mineDone < of ? runners[mineDone] : null;

  // Who leads: at the same number of legs, the lower total; otherwise more legs run.
  const level = mineDone === theirDone;
  const gapSec = level && b.myScore != null && b.theirScore != null ? Math.abs(b.myScore - b.theirScore) : null;
  const ahead = level ? (b.myScore != null && b.theirScore != null ? b.myScore < b.theirScore : null) : mineDone > theirDone;
  const legsGap = Math.abs(mineDone - theirDone);
  const gapLabel = gapSec != null ? (gapSec >= 60 ? `${Math.floor(gapSec / 60)}m ${gapSec % 60}s` : `${gapSec} s`) : legsGap ? `${legsGap} leg${legsGap === 1 ? "" : "s"}` : "–";
  const short = b.myClub?.short || "Your club";

  let line1 = short;
  let line2 = "Relay friendly";
  if (finished) {
    line1 = b.draw ? "Honours" : b.won ? short : them?.short || "They";
    line2 = b.draw ? "even" : "take the relay";
  } else if (live && ahead != null && (gapSec || legsGap)) {
    line2 = `${ahead ? "lead" : "trail"} by ${gapLabel}`;
  } else if (live) {
    line2 = "level";
  } else if (them) {
    line2 = `v ${them.short}`;
  }

  const status = finished ? "Full time" : live ? countdown(b.endAt - now) : b.status === "accepted" ? countdown(b.startAt - now) : null;
  const myLast = b.myLegTimes?.length ? b.myLegTimes[b.myLegTimes.length - 1] : null;

  return (
    <View style={{ flex: 1, backgroundColor: "#03050a" }}>
      {/* .r11race: a pool of blue light from the top */}
      <LinearGradient colors={["#0d2148", "#060b16", "#03050a"]} locations={[0, 0.32, 0.62]} style={StyleSheet.absoluteFill} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: top, paddingHorizontal: 18, paddingBottom: insets.bottom + 30, gap: 14 }}>
        <Row gap={10}>
          <GlassRound icon={ChevronLeft} label="Back" onPress={() => goBack(router)} />
          <View style={styles.rec}>
            {live ? <LiveDot size={7} /> : <View style={[styles.recDot, finished && { backgroundColor: C.textMute }]} />}
            <Text style={styles.recText}>Club relay</Text>
          </View>
          <View style={{ flex: 1 }} />
          {status ? <Text style={styles.clock}>{status}</Text> : <Text style={styles.waiting}>Awaiting reply</Text>}
        </Row>

        <View>
          <Text style={styles.kickBlue}>
            {of} × 1 km{live && mineDone < of ? ` · Leg ${mineDone + 1}` : finished ? " · full time" : b.status === "accepted" ? ` · starts ${startsLabel(b.startAt)}` : ""}
          </Text>
          <Text style={styles.race}>
            {line1}
          </Text>
          <Text style={[styles.race, styles.raceBlue, finished && b.won === false && { color: "#ff8a90", textShadowColor: "rgba(255,77,85,0.35)" }]}>
            {line2}
          </Text>
        </View>

        {/* .r11relay */}
        <View style={styles.relay}>
          <LinearGradient colors={["#0b1424", "#070b14"]} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
          <Text style={styles.relayName}>{short}</Text>
          <Legs runners={runners} done={mineDone} of={of} now={live} side="a" planned={!live && !finished} />
          <Text style={[styles.relayName, { color: "#ff8a90", marginTop: 12 }]}>{them?.short || "Them"}</Text>
          <Legs done={theirDone} of={of} now={live} side="b" />
        </View>

        {/* .r11mine */}
        {myLeg >= 0 && !finished ? (
          <Surface radius={20} padding={null} contentStyle={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
            <View style={styles.ni}>
              <ArrowRight size={18} color={C.accentHi} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mineTitle}>{myLeg < mineDone ? `You ran leg ${myLeg + 1}` : `You're leg ${myLeg + 1}`}</Text>
              <Text style={styles.mineSub}>
                {myLeg < mineDone
                  ? `${legTime(b.myLegTimes?.[myLeg])} for your kilometre. Cheer the rest home.`
                  : onNow && myLeg > mineDone
                    ? `${onNow.name?.split(" ")[0] || "The runner"} is on leg ${mineDone + 1}. Tap phones at the line to take the handover.`
                    : onNow
                      ? "You're running now. Hand over by tapping phones at the line."
                      : `Ten 1 km legs by ten different runners. Tap phones at the line to hand over.`}
              </Text>
            </View>
          </Surface>
        ) : null}

        {/* .pace */}
        <Row style={{ marginTop: 2 }}>
          {(live || finished
            ? [
                [live ? `Leg ${Math.max(1, mineDone)} ${mineDone ? "done" : "now"}` : "Total", live ? legTime(myLast) : clubScoreLabel(b.mode, b.myScore), false],
                [`${them?.short || "Them"} legs`, `${theirDone} of ${of}`, true],
                ["Gap", gapLabel, false],
              ]
            : [
                ["Squads", `${b.squad} v ${b.squad}`, false],
                ["Starts", whenLabel(b.startAt).split(" · ").pop(), false],
                ["Counts for", "Friendly", false],
              ]
          ).map(([l, v, red], i) => (
            <View key={l} style={[styles.pace, i && styles.factLine]}>
              <Text style={styles.paceSmall} numberOfLines={1}>
                {l}
              </Text>
              <Text style={[styles.paceBig, red && { color: "#ff8a90" }]} numberOfLines={1} adjustsFontSizeToFit>
                {v}
              </Text>
            </View>
          ))}
        </Row>
        {actions}
      </ScrollView>
    </View>
  );
}

// ── The other modes ────────────────────────────────────────────────────────────

export default function ClubBattle() {
  const { battleId } = useLocalSearchParams();
  const id = String(battleId || "");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const top = useScreenTop();
  const now = useNow(1000);
  const { data: b, isPending, isError, refetch, isRefetching } = useClubBattle(id);
  const vote = useEngineMutation(engine.voteClubBattle, { success: (r) => (r.votes.mine ? "You voted in" : "You voted no") });
  const respond = useEngineMutation(engine.respondClubBattle, { success: (r) => (r.status === "declined" ? "Declined" : "Accepted for the club") });
  const cancel = useEngineMutation(engine.cancelClubBattle, { success: "Called off" });

  if (isPending) {
    return (
      <Screen>
        <Skeleton height={320} radius={26} style={{ marginTop: S.lg }} />
      </Screen>
    );
  }
  if (isError || !b) {
    return (
      <Screen>
        <EmptyState title="That friendly has gone" body="It may have been called off." action="Back" onAction={() => router.back()} />
      </Screen>
    );
  }
  if (b.hidden && b.status === "pending") return <Challenger b={b} vote={vote} respond={respond} />;

  const them = b.opponent;
  const finished = b.status === "finished";
  const live = b.status === "live";

  const actions = (
    <View style={{ gap: 8, marginTop: 4 }}>
      {live && ["live_race", "relay", "blind_time_trial"].includes(b.mode) ? <Button title="Go run" size="lg" full onPress={() => router.push("/(tabs)/move")} /> : null}
      {live && b.mode === "turnout_night" ? <Button title="Find tonight's club run" size="lg" full onPress={() => router.push(`/crew/${b.myClub?.id}`)} /> : null}
      {b.canRespond && b.status === "pending" ? (
        <Row gap={8}>
          <Button title="Decline" variant="quiet" onPress={() => respond.mutate([b.id, false])} style={{ flex: 1 }} />
          <Button title="Accept for the club" onPress={() => respond.mutate([b.id, true])} style={{ flex: 1.4 }} />
        </Row>
      ) : null}
      {finished && b.isCaptain && them ? (
        <Button title={`Rematch ${them.short}`} icon={RotateCcw} size="lg" full onPress={() => router.push(`/clubs/challenge?club=${b.myClub?.id}&opponent=${them.id}&mode=${b.mode}`)} />
      ) : null}
      {b.canCancel ? (
        <Button
          title="Call it off"
          variant="ghost"
          size="sm"
          full
          onPress={() =>
            Alert.alert("Call it off?", "The friendly ends with no result.", [
              { text: "Keep it", style: "cancel" },
              { text: "Call it off", style: "destructive", onPress: () => cancel.mutate(b.id) },
            ])
          }
        />
      ) : null}
    </View>
  );

  if (b.mode === "relay") return <Relay b={b} them={them} now={now} actions={actions} />;

  // Long club names would clip beside the crests, so size both by the longer one.
  const sideSize = Math.min(22, Math.floor(180 / Math.max((b.myClub?.short || "").length, (them?.short || "").length, 8)));
  const statusChip = finished
    ? "Full time"
    : live
      ? `Live · ${countdown(b.endAt - now)} left`
      : b.status === "accepted"
        ? `Starts in ${countdown(b.startAt - now)}`
        : b.status === "pending"
          ? "Waiting on their captain"
          : b.status === "declined"
            ? "Declined"
            : "Called off";
  const headline = finished ? (b.draw ? "Honours even" : b.won ? `${b.myClub?.short} take it` : `${them?.short || "They"} take it`) : b.modeName;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen padded={false} style={{ paddingTop: 0 }} onRefresh={refetch} refreshing={isRefetching}>
        <View style={[styles.hero, { height: 300 + insets.top }]}>
          <PhotoBackground source={imageSource(them?.cover) || PHOTOS.derby} fade="hero" glow={false} grain={0.05} />
          <LinearGradient colors={["rgba(61,139,255,0.24)", "rgba(61,139,255,0)", "rgba(255,77,85,0)", "rgba(255,77,85,0.2)"]} locations={[0, 0.4, 0.6, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={["rgba(7,9,12,0)", C.bg]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 110 }} />
          <View style={{ paddingHorizontal: 18, paddingBottom: 40 }}>
            <Text style={styles.kickBlue}>Club v club · {b.tag} · friendly</Text>
            <Text style={[styles.big, finished && b.won && styles.raceBlue, finished && b.won === false && { color: "#ff8a90" }]} numberOfLines={2} adjustsFontSizeToFit>
              {headline}
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 18, gap: 12 }}>
          {/* .oh-score */}
          <Surface radius={24} padding={null} style={{ marginTop: -26 }} contentStyle={{ padding: 16 }}>
            <Row style={{ justifyContent: "space-between" }}>
              <Row gap={8} style={{ flex: 1 }}>
                <ClubCrest club={b.myClub} size={34} />
                <Text style={[styles.side, styles.sideBlue, { fontSize: sideSize }]} numberOfLines={1}>
                  {b.myClub?.short}
                </Text>
              </Row>
              <Text style={styles.vs}>VS</Text>
              <Row gap={8} style={{ flex: 1, justifyContent: "flex-end" }}>
                <Text style={[styles.side, styles.sideRed, { fontSize: sideSize }]} numberOfLines={1}>
                  {them?.short || "?"}
                </Text>
                <ClubCrest club={them} size={34} />
              </Row>
            </Row>

            {b.sealed ? (
              // .r11seal: both clubs' times in sealed envelopes
              <Row gap={8} style={{ marginTop: 16 }}>
                {[b.myClub?.short, them?.short].map((n, i) => (
                  <Surface key={i} tone="sunk" radius={18} padding={14} style={{ flex: 1, boxShadow: i ? "inset 0 0 0 1.5px rgba(255,77,85,0.35)" : "inset 0 0 0 1.5px rgba(79,155,255,0.5)" }} contentStyle={{ alignItems: "center", gap: 4 }}>
                    <View style={[styles.lock, i && styles.lockRed]}>
                      <Lock size={20} color={i ? "#ffb3b7" : "#cfe1ff"} />
                    </View>
                    <Text style={styles.envTitle}>{n}</Text>
                    <Text style={styles.mineSub}>Average 5 km, sealed</Text>
                  </Surface>
                ))}
              </Row>
            ) : (
              <>
                <Row style={{ justifyContent: "space-between", marginTop: 16, alignItems: "flex-end" }}>
                  <Text style={[styles.score, styles.sideBlue]}>{clubScoreLabel(b.mode, b.myScore)}</Text>
                  <Text style={[styles.score, styles.sideRed]}>{clubScoreLabel(b.mode, b.theirScore)}</Text>
                </Row>
                <TugBar share={clubTugShare(b.mode, b.myScore, b.theirScore)} height={10} style={{ marginTop: 10 }} />
              </>
            )}
            <Text style={[styles.mineSub, { marginTop: 14 }]}>
              {b.mode === "steps"
                ? "Squad average counted steps a day, lifted by club run turnout."
                : b.mode === "live_race"
                  ? "Kilometres run by the squad inside the hour."
                  : b.mode === "blind_time_trial"
                    ? "Every squad member runs 5 km. Times open at the end."
                    : "Share of the club checked in to a club run tonight."}
            </Text>
          </Surface>

          <Surface radius={22} padding={null} contentStyle={{ paddingVertical: 12 }}>
            <Row>
              {[
                ["Squads", `${b.squad} v ${b.squad}`],
                [finished ? "Ended" : live ? "Ends" : "Starts", whenLabel(finished || live ? b.endAt : b.startAt).split(" · ").pop()],
                ["Counts for", "Friendly"],
              ].map(([l, v], i) => (
                <View key={l} style={[styles.pace, i && styles.factLine]}>
                  <Text style={styles.paceSmall}>{l}</Text>
                  <Text style={[styles.paceBig, { fontSize: 18 }]} numberOfLines={1} adjustsFontSizeToFit>
                    {v}
                  </Text>
                </View>
              ))}
            </Row>
          </Surface>
          {actions}
        </View>
      </Screen>
      <Row style={[styles.nav, { top }]}>
        <GlassRound icon={ChevronLeft} label="Back" onPress={() => goBack(router)} />
        <Chip label={statusChip} tone={live ? "live" : "glass"} />
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { position: "absolute", left: -20, right: -20, paddingTop: 14, paddingBottom: 12, paddingHorizontal: 38, overflow: "hidden", transform: [{ rotate: "-6deg" }], boxShadow: "0 0 40px rgba(61,139,255,0.6)" },
  sheen: { position: "absolute", top: -20, bottom: -20, left: 0, width: 160 },
  bandSmall: { color: "#fff", fontFamily: F.bodySemi, fontSize: 12, letterSpacing: 2, textTransform: "uppercase" },
  bandBig: { color: "#fff", fontFamily: F.display, fontSize: 34, lineHeight: 34, marginTop: 4, textTransform: "uppercase", fontStyle: "italic", letterSpacing: 0.5 },
  mid: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  box: { position: "absolute", left: 14, right: 14 },
  qr: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 2.5px #3d8bff, 0 0 22px rgba(61,139,255,0.6)" },
  qrText: { color: "#9cc4ff", fontFamily: F.display, fontSize: 26, textShadowColor: "rgba(79,155,255,0.8)", textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } },
  whoTitle: { color: "#fff", fontFamily: F.bodySemi, fontSize: 15 },
  whoSub: { color: "#a3adbd", fontFamily: F.body, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  fact: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  factLine: { borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.1)" },
  factBig: { color: "#fff", fontFamily: F.display, fontSize: 18 },
  factSmall: { color: "#a3adbd", fontFamily: F.body, fontSize: 9, marginTop: 2, textAlign: "center" },

  rec: { flexDirection: "row", alignItems: "center", gap: 7, height: 36, paddingHorizontal: 14, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.08)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 0 1px rgba(255,255,255,0.08)" },
  recDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.accent },
  recText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  waiting: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 12 },
  clock: { color: "#fff", fontFamily: F.display, fontSize: 22 },
  kickBlue: { color: "#9cc4ff", fontFamily: F.bodySemi, fontSize: 10.5, letterSpacing: 1.7, textTransform: "uppercase", marginBottom: 8 },
  race: { color: "#fff", fontFamily: F.display, fontSize: 40, lineHeight: 38, textTransform: "uppercase" },
  raceBlue: { color: C.accent, textShadowColor: "rgba(61,139,255,0.4)", textShadowRadius: 26, textShadowOffset: { width: 0, height: 0 } },
  relay: { borderRadius: 20, paddingVertical: 14, paddingHorizontal: 12, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" },
  relayName: { color: "#82b4ff", fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase" },
  legs: { flexDirection: "row", gap: 4, marginTop: 7 },
  leg: { flex: 1, height: 28, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.07)", overflow: "hidden" },
  legNo: { color: C.textMute, fontFamily: F.bodySemi, fontSize: 10, textAlign: "center", lineHeight: 28 },
  legRanA: { backgroundColor: "#16213a" },
  legBar: { position: "absolute", left: 0, right: 0, bottom: 0, height: 3, backgroundColor: C.accent },
  legNowA: { overflow: "visible", boxShadow: "0 0 0 2px #fff, 0 0 14px rgba(130,180,255,0.8)" },
  legNowB: { backgroundColor: "rgba(255,77,85,0.25)", boxShadow: "0 0 0 2px #ff4d55, 0 0 12px rgba(255,77,85,0.45)" },
  ni: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(79,155,255,0.16)" },
  mineTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5 },
  mineSub: { color: C.textDim, fontFamily: F.body, fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  pace: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  paceSmall: { color: "#a3adbd", fontFamily: F.body, fontSize: 10 },
  paceBig: { color: "#fff", fontFamily: F.display, fontSize: 24, marginTop: 3 },

  hero: { overflow: "hidden", justifyContent: "flex-end" },
  nav: { position: "absolute", left: 18, right: 18, justifyContent: "space-between" },
  big: { color: C.text, fontFamily: F.display, fontSize: 46, lineHeight: 46, textTransform: "uppercase", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 30, textShadowOffset: { width: 0, height: 2 } },
  side: { fontFamily: F.display, fontSize: 22, textTransform: "uppercase", flexShrink: 1 },
  sideBlue: { color: "#7fb0ff", textShadowColor: "rgba(61,139,255,0.45)", textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },
  sideRed: { color: "#ff8a90", textShadowColor: "rgba(255,77,85,0.4)", textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },
  vs: { color: C.textMute, fontFamily: F.display, fontSize: 16, marginHorizontal: S.sm, fontStyle: "italic" },
  score: { fontFamily: F.display, fontSize: 36 },
  lock: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 6, backgroundColor: "rgba(79,155,255,0.2)", boxShadow: "0 0 0 1px rgba(130,180,255,0.5), 0 0 24px rgba(79,155,255,0.5)" },
  lockRed: { backgroundColor: "rgba(255,77,85,0.16)", boxShadow: "0 0 0 1px rgba(255,138,144,0.4), 0 0 20px rgba(255,77,85,0.35)" },
  envTitle: { color: C.text, fontFamily: F.display, fontSize: 20, textTransform: "uppercase" },
});
