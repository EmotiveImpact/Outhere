// The first time you open a finished 1v1, the result lands on the 1v1 card
// (rive/versus) before the result screen: the card strikes in, VS bursts,
// YOU WIN! or YOU LOSE (with K.O. and the glass crack when the winner had at
// least double), then WINNER and LOSER on each side's result shot. A tap
// once the result is playing, or Continue at the end, opens the result
// screen. Only where the build can play Rive, and only once per battle on
// this phone, for battles that ended in the last week.

import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { VersusCard, riveAvailable, versusCard, versusResult } from "@/components/rive";
import { GlowButton, S } from "@/components/ui";
import { haptic } from "@/services/haptics";

const SEEN_KEY = "outhere.vsReveal.v1";
const WEEK_MS = 7 * 86_400_000;
// The card is 390 x 844 and covers the screen; its stake tiles start 736 down.
const CARD = { w: 390, h: 844, tiles: 736 };

/**
 * "checking", then "show" the first time this battle's result is opened
 * (and marks it seen) or "no". The second value ends the reveal.
 */
export function useFirstReveal(battle) {
  const eligible = riveAvailable && !!versusResult(battle) && Date.now() - (battle?.completedAt || battle?.endAt || 0) < WEEK_MS;
  const [state, setState] = useState(eligible ? "checking" : "no");
  const id = battle?.id;
  useEffect(() => {
    if (!eligible) return undefined;
    let alive = true;
    AsyncStorage.getItem(SEEN_KEY)
      .then((raw) => {
        const seen = JSON.parse(raw || "[]");
        if (!alive) return;
        if (seen.includes(id)) return setState("no");
        setState("show");
        return AsyncStorage.setItem(SEEN_KEY, JSON.stringify([id, ...seen].slice(0, 200)));
      })
      .catch(() => alive && setState("no"));
    return () => {
      alive = false;
    };
  }, [eligible, id]);
  return [state, () => setState("no")];
}

export default function VersusReveal({ battle, onDone }) {
  const { width, height } = useWindowDimensions();
  const card = useMemo(() => versusCard({ battle, me: battle.me.player, opp: battle.opponent.player, intro: "strike" }), [battle]);
  const outcome = useMemo(() => versusResult(battle), [battle]);
  const [slammed, setSlammed] = useState(false);
  const [result, setResult] = useState(null);
  const [done, setDone] = useState(false);

  // VS slams, a beat, then the result. Timers stand in if a cue never comes.
  useEffect(() => {
    const t = setTimeout(() => setSlammed(true), 2600);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!slammed) return undefined;
    const t = setTimeout(() => setResult(outcome), 900);
    return () => clearTimeout(t);
  }, [slammed, outcome]);
  useEffect(() => {
    if (!result) return undefined;
    const t = setTimeout(() => setDone(true), result.ko ? 7000 : 6000);
    return () => clearTimeout(t);
  }, [result]);

  const onCue = (name) => {
    if (name === "slam") {
      haptic.beat();
      setSlammed(true);
    } else if (name === "youWin") haptic.win();
    else if (name === "youLose") haptic.lose();
    else if (name === "knockout" || name === "shatter") haptic.beat();
    else if (name === "prize") {
      haptic.tap();
      setTimeout(() => setDone(true), 900);
    }
  };

  const scale = Math.max(width / CARD.w, height / CARD.h);
  const tilesTop = (height - CARD.h * scale) / 2 + CARD.tiles * scale;
  return (
    <View style={styles.screen}>
      <VersusCard card={card} result={result} onCue={onCue} style={StyleSheet.absoluteFill} />
      {result ? <Pressable accessibilityLabel="Carry on to the result" onPress={onDone} style={StyleSheet.absoluteFill} /> : null}
      {done ? (
        <Animated.View entering={FadeIn.duration(400)} style={[styles.panel, { bottom: height - tilesTop + 14 }]}>
          <GlowButton title="Continue" variant="glass" full onPress={onDone} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#04060b" },
  panel: { position: "absolute", left: 18, right: 18, gap: S.sm },
});
