// Feel: haptics, rolling numbers and the spring from a card into its page.
// Three cards. Haptics shows every named moment as a tile; press one and it
// plays on the phone while its waveform (each hit a bar on a timeline) lights
// up in time, so the pattern reads on the web too. Rolling numbers drives a
// big RollingNumber and a CountUp. Springs is the card to page lift.

import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Body, C, CountUp, F, GlowButton, Kicker, Lift, LiveDot, R, RollingNumber, Row, S, Surface } from "@/components/ui";
import { HITS, MOMENTS, haptic, hapticsAvailable } from "@/services/haptics";
import { Coin } from "@/components/arena/OutsideKit";

// Every tile shares one timeline so a tap and a win can be compared by eye.
const TIMELINE = 480;
const SUB_GAP = 70; // ms between the bars of one notification

const LABELS = {
  tap: ["Tap", "a main button"],
  select: ["Select", "a selection"],
  beat: ["Beat", "3, 2, 1"],
  go: ["Go", "heavy + success"],
  swipe: ["Swipe", "battle or pass"],
  commit: ["Commit", "stake, claim"],
  win: ["Win", "rising + success"],
  lose: ["Lose", "soft + error"],
  levelUp: ["Level up", "four rising"],
  holdTick: ["Hold tick", "every 250ms"],
  holdDone: ["Hold done", "heavy"],
  slideEnd: ["Slide end", "success"],
  warn: ["Warn", "off route, GPS"],
};

/** The bars of one moment laid on the timeline: [{ at, strength }]. */
const barsOf = (name) =>
  (MOMENTS[name] || []).flatMap((h) => {
    const kind = HITS[h.hit] || HITS.light;
    return kind.bars.map((strength, i) => ({ at: h.at + i * SUB_GAP, strength }));
  });

/** One bar: dim until the playhead passes it, then it flares blue and settles lit. */
function Bar({ at, strength, t, height }) {
  const style = useAnimatedStyle(() => {
    const ms = t.value * TIMELINE;
    const since = ms - at;
    const lit = t.value > 0 && since >= 0;
    const flare = lit ? Math.max(0, 1 - since / 160) : 0;
    return {
      opacity: lit ? 1 : 0.38,
      transform: [{ scaleY: 1 + flare * 0.25 }],
      backgroundColor: lit ? "#4f9bff" : "rgba(255,255,255,0.45)",
      boxShadow: `0 0 ${Math.round(10 * flare)}px rgba(79,155,255,${(0.9 * flare).toFixed(2)})`,
    };
  });
  return <Animated.View style={[styles.bar, { left: `${(at / TIMELINE) * 100}%`, height: 6 + strength * (height - 6) }, style]} />;
}

/** The waveform of a moment and the playhead that sweeps it when played. */
function Wave({ name, t, height = 34 }) {
  const bars = barsOf(name);
  const head = useAnimatedStyle(() => ({ left: `${t.value * 100}%`, opacity: t.value > 0 && t.value < 1 ? 0.9 : 0 }));
  return (
    <View style={[styles.wave, { height }]}>
      <View style={styles.baseline} />
      {bars.map((b, i) => (
        <Bar key={i} at={b.at} strength={b.strength} t={t} height={height} />
      ))}
      <Animated.View style={[styles.head, head]} />
    </View>
  );
}

function MomentTile({ name }) {
  const t = useSharedValue(0);
  const [title, sub] = LABELS[name] || [name, ""];
  const fire = () => {
    haptic[name]?.();
    t.value = 0;
    t.value = withTiming(1, { duration: TIMELINE + 120, easing: Easing.linear });
  };
  return (
    <Surface tone="sunk" radius={16} padding={null} onPress={fire} haptic={false} pressScale={0.96} accessibilityLabel={`Play ${title}`} style={styles.tile} contentStyle={styles.tileBody}>
      <Text style={styles.tileTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.tileSub} numberOfLines={1}>
        {sub}
      </Text>
      <Wave name={name} t={t} />
    </Surface>
  );
}

function HapticsCard() {
  const live = hapticsAvailable();
  return (
    <>
      <Kicker style={styles.k}>Haptics</Kicker>
      <Surface radius={22} padding={S.lg}>
        <Text style={styles.cardTitle}>Thirteen moments</Text>
        <Body dim size={13} style={{ marginTop: 2 }}>
          {live ? "Tap one to feel it. Each bar is a hit; a notification is the system's own little pattern." : "Haptics play on a phone. On the web and in the simulator they stay silent, so each tile draws its pattern: every bar is a hit, lit as it would land."}
        </Body>
        <View style={styles.grid}>
          {Object.keys(MOMENTS).map((name) => (
            <MomentTile key={name} name={name} />
          ))}
        </View>
      </Surface>
    </>
  );
}

// ── Rolling numbers ───────────────────────────────────────────────────────────

const START = 12480;
const randomOut = () => Math.floor(Math.random() * 250000);

function RollingCard() {
  const [n, setN] = useState(START);
  const [seed, setSeed] = useState(0);
  const bump = (by) => setN((v) => Math.max(0, v + by));
  return (
    <>
      <Kicker style={styles.k}>Rolling numbers</Kicker>
      <Surface radius={22} padding={S.lg}>
        <Text style={styles.cardTitle}>Every digit is a wheel</Text>
        <Body dim size={13} style={{ marginTop: 2 }}>
          Each column rolls to its new digit on a spring with a little overshoot, staggered from the right by 30ms. Separators stay put; new digits slide in from below, old ones slide up and fade.
        </Body>
        <View style={styles.big}>
          <RollingNumber value={n} size={64} lineHeight={66} letterSpacing={-1} />
          <Text style={styles.unit}>OUT</Text>
        </View>
        <Row gap={S.sm} style={{ flexWrap: "wrap" }}>
          <GlowButton title="+1" size="sm" variant="quiet" onPress={() => bump(1)} />
          <GlowButton title="+25" size="sm" variant="quiet" onPress={() => bump(25)} />
          <GlowButton title="+1,000" size="sm" variant="quiet" onPress={() => bump(1000)} />
          <GlowButton title="Random" size="sm" variant="outline" onPress={() => setN(randomOut())} />
          <GlowButton title="Reset" size="sm" variant="ghost" onPress={() => setN(START)} />
        </Row>

        <View style={styles.divider} />
        <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
          <View>
            <Text style={styles.small}>CountUp, a result revealed</Text>
            <Row gap={8} style={{ marginTop: 4 }}>
              <Coin size={22} />
              <CountUp key={seed} from={0} value={2850} duration={1600} prefix="+" suffix=" OUT" size={34} lineHeight={38} colour="#cfe2ff" suffixStyle={{ fontSize: 16, color: C.textDim, marginLeft: 2 }} />
            </Row>
          </View>
          <GlowButton title="Reveal" size="sm" haptic="win" onPress={() => setSeed((s) => s + 1)} />
        </Row>
        <Body mute size={12} style={{ marginTop: S.sm }}>
          Counts on the kit's expo ease, feeding the wheels a new target every 70ms so the units spin and the thousands settle first.
        </Body>
      </Surface>
    </>
  );
}

// ── Springs ───────────────────────────────────────────────────────────────────

function SpringsCard() {
  const [state, setState] = useState("Rest");
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const press = () => {
    setState("Lifting into the page");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("Settled back to 1"), 1300);
  };
  return (
    <>
      <Kicker style={styles.k}>Springs</Kicker>
      <Surface radius={22} padding={S.lg}>
        <Text style={styles.cardTitle}>Card into page</Text>
        <Body dim size={13} style={{ marginTop: 2 }}>
          A club card or a drop card sinks under the finger, then springs to 1.02 and holds while the page slides in, so it reads as the card opening. Then it settles, ready for when you come back.
        </Body>
        <View style={{ marginTop: S.lg }}>
          <Lift onPress={press} hold={1100}>
            <Surface radius={20} padding={null} contentStyle={styles.club} accessibilityLabel="Open the club">
              <View style={styles.crest}>
                <Text style={styles.crestText}>HH</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Row gap={6}>
                  <Text style={styles.clubName}>Hackney Harriers</Text>
                  <LiveDot size={7} />
                </Row>
                <Text style={styles.small}>Tuesdays 7pm · London Fields</Text>
                <Text style={styles.small}>5k and 10k · 4:30 to 6:00 /km</Text>
              </View>
              <View style={styles.inChip}>
                <Text style={styles.inText}>In</Text>
              </View>
            </Surface>
          </Lift>
        </View>
        <Row gap={8} style={{ marginTop: S.md }}>
          <View style={[styles.stateDot, state !== "Rest" && { backgroundColor: "#4f9bff", boxShadow: "0 0 8px #4f9bff" }]} />
          <Text style={styles.small}>{state}</Text>
        </Row>
      </Surface>
    </>
  );
}

export default function FeelDemo() {
  return (
    <View>
      <HapticsCard />
      <RollingCard />
      <SpringsCard />
    </View>
  );
}

const styles = StyleSheet.create({
  k: { marginTop: S.xl, marginBottom: S.sm },
  cardTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 17, letterSpacing: -0.2 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 12.5 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: S.sm, marginTop: S.lg },
  // three to a row, the last row left ragged rather than stretched
  tile: { width: "31.4%", flexGrow: 0 },
  tileBody: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 8 },
  tileTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  tileSub: { color: C.textMute, fontFamily: F.body, fontSize: 10.5, marginTop: 1 },
  // the waveform: a faint baseline, bars rising from it, a playhead sweeping across
  wave: { marginTop: 8, justifyContent: "flex-end" },
  baseline: { position: "absolute", left: 0, right: 0, bottom: 0, height: 1, backgroundColor: "rgba(255,255,255,0.1)" },
  bar: { position: "absolute", bottom: 0, width: 4, borderRadius: 2, transformOrigin: "bottom" },
  head: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(130,180,255,0.8)" },
  big: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: S.lg, marginBottom: S.md },
  unit: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 15, marginBottom: 12 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginVertical: S.lg },
  club: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  crest: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(61,139,255,0.16)", boxShadow: "inset 0 1px 0 rgba(130,180,255,0.4), inset 0 0 0 1px rgba(61,139,255,0.3)" },
  crestText: { color: C.accentHi, fontFamily: F.display, fontSize: 18 },
  clubName: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  inChip: { paddingHorizontal: 10, height: 24, borderRadius: R.full, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center" },
  inText: { color: C.accent, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 0.6 },
  stateDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)" },
});
