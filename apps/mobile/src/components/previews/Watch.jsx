// The Apple Watch app as a preview: ten screens from the round eleven
// prototype drawn inside a watch at real proportions, each on its own full
// screen stage with the blue glow behind it (WatchPage). Tapping moves through
// a run the way the prototype does: the face, start and the 3, 2, 1, the live
// numbers, a turn, the battle, club v club, a new challenger, the club check
// in, hold to finish and run saved. WatchFlow keeps the older single stage
// with chips. Also the round six "on the watch" page, with the watch photo.

import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { Bell, Check, CornerUpLeft, CornerUpRight, Flame, Play, Swords, X, Zap } from "@/components/ui/icons";
import { C, F, LiveDot, Logo } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { hapticImpact, hapticSelection, hapticSuccess } from "@/services/haptics";
import { compactNumber, formatDuration, formatNumber, formatPace } from "@/utils/format";
import { ArcRing, OutCoin, PhoneFrame } from "./bits";
import { clock, shortDate } from "./data";

// The prototype's watch is 236 by 284 points, shown at 1.14 times.
const W = 236;
const H = 284;
const SCALE = 1.14;

const BLUE_SOFT = "#9cc4ff";
const BLUE_HI = "#82b4ff";
const BLUE_BIG = "#6aa6ff";
const GREY = "#a3adbd";

// The prototype's example run, used until a run is going on Move.
const SAMPLE = {
  live: { km: 3.21, seconds: 1000, pace: 302, steps: 4180, pct: 0.64, out: 12 },
  turn: { dir: "left", metres: 200, label: "Left onto Stamford Street" },
  battle: { rival: "Amara", mine: 18240, theirs: 17812, diff: 428, endsIn: "2d 14h" },
  done: { km: 5.06, out: 19, xp: 320, ahead: "Ahead of Amara by 1,602" },
  fixture: { label: "Derby", endsIn: "2h 40m", us: { name: "Southbank", score: 14197, out: 18, squad: 25 }, them: { name: "Peckham", score: 13936 }, line: "You added +50 to the average" },
  club: { club: "Southbank Runners", where: "Tate Modern · 7pm", line: "38 here so far", logo: PHOTOS.crest },
  end: { km: 4.82, seconds: 1458 },
  route: { name: "Southbank Loop", km: 4.9 },
  challenger: { low: 15, high: 22, stake: 100 },
};

export const WATCH_SCREENS = [
  { key: "face", label: "Watch face", h: "On the watch face", p: "Steps, streak and who's out, one glance away." },
  { key: "start", label: "Start", h: "Start from your wrist", p: "Pick a route on the phone or the watch. One tap, then the countdown." },
  { key: "live", label: "Live run", h: "Live run", p: "Big numbers you can read mid stride. Splits buzz each kilometre." },
  { key: "turn", label: "Turn by turn", h: "Turn by turn", p: "A tap on the wrist before each turn. No phone in your hand." },
  { key: "battle", label: "Battle", h: "Battle on your wrist", p: "The score live, and three emotes you can fire without stopping." },
  { key: "cvc", label: "Club v club", h: "Club v club on your wrist", p: "The derby score, what your run added, and how many of the squad are out." },
  { key: "challenger", label: "New challenger", h: "Here comes a new challenger", p: "A buzz, a stripe and a question mark. Answer with one tap." },
  { key: "club", label: "Club check in", h: "Check in at the club run", p: "Hold your wrist near the host's phone and you're counted for the club." },
  { key: "end", label: "Hold to finish", h: "Hold to finish", p: "A full second's hold ends the run, so a sleeve or a bump never does." },
  { key: "done", label: "Run saved", h: "Run saved", p: "What you earned, your streak and the battle, before you've caught your breath." },
];

const leadLine = (b) => (b.diff > 0 ? `You lead by ${formatNumber(b.diff)}` : b.diff < 0 ? `${b.rival} leads by ${formatNumber(-b.diff)}` : "All square");

// ── The watch ─────────────────────────────────────────────────────────────────

function Crown() {
  return (
    <View style={styles.crown}>
      {Array.from({ length: 10 }, (_, i) => (
        <View key={i} style={{ height: 2, marginBottom: 2, backgroundColor: "#5b616b" }} />
      ))}
    </View>
  );
}

/** The watch body at the prototype's size and scale, with whatever screen goes inside. */
export function WatchFrame({ children, flush = false }) {
  return (
    <View style={{ width: W * SCALE, height: H * SCALE, alignSelf: "center" }}>
      <View style={[styles.watch, { left: (W * SCALE - W) / 2, top: (H * SCALE - H) / 2, transform: [{ scale: SCALE }] }]}>
        <LinearGradient colors={["#4a4f58", "#1a1d22", "#0b0c0f", "#2c3038"]} locations={[0, 0.4, 0.7, 1]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 66 }]} />
        <Crown />
        <View style={styles.side} />
        <View style={[styles.screen, flush && { padding: 0 }]}>{children}</View>
      </View>
    </View>
  );
}

const WTop = ({ left, right, leftWhite = false }) => (
  <View style={styles.wtop}>
    {typeof left === "string" ? <Text style={[styles.wtopText, { color: leftWhite ? "#fff" : BLUE_SOFT }]}>{left}</Text> : left}
    <Text style={[styles.wtopText, { color: "#fff" }]}>{right}</Text>
  </View>
);

// ── The ten screens ───────────────────────────────────────────────────────────

function Face({ d }) {
  const pct = d.goal ? d.steps / d.goal : 0;
  return (
    <View style={styles.face}>
      <Logo size={22} style={{ marginTop: -4 }} />
      <Text style={styles.faceTime}>{clock(d.now)}</Text>
      <Text style={styles.faceDate}>{shortDate(d.now)}</Text>
      <ArcRing size={54} stroke={5} pct={pct} style={[styles.cx, { left: 4 }]}>
        <Text style={styles.cxNum}>{compactNumber(d.steps)}</Text>
      </ArcRing>
      <View style={[styles.cx, styles.cxRound]}>
        <Flame size={14} color="#ff8a3d" style={{ position: "absolute", top: 8 }} />
        <Text style={[styles.cxNum, { fontSize: 16, marginTop: 14 }]}>{d.streak}</Text>
      </View>
      <View style={styles.faceOut}>
        <LiveDot size={7} />
        <Text style={styles.faceOutText}>{d.outNow != null ? `${formatNumber(d.outNow)} out now` : "1,284 out now"}</Text>
      </View>
    </View>
  );
}

function Start({ d, count, onGo }) {
  const route = d.route || SAMPLE.route;
  return (
    <>
      <WTop left="Move" right={clock(d.now)} />
      <View style={styles.centre}>
        {count ? (
          <MotiView key={count} from={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "timing", duration: 260 }}>
            <Text style={styles.count}>{count}</Text>
          </MotiView>
        ) : (
          <>
            <Text style={styles.small12} numberOfLines={1}>{route.name}</Text>
            <Text style={styles.startKm}>{`${Number(route.km || 0).toFixed(1)} km`}</Text>
            <MotiView from={{ scale: 1 }} animate={{ scale: 1.05 }} transition={{ type: "timing", duration: 1000, loop: true, repeatReverse: true }} style={styles.goGlow}>
              <Pressable onPress={onGo} accessibilityRole="button" accessibilityLabel="Start" style={styles.go}>
                <GoFill />
                {/* Wrapped so the icon paints above the gradient on the web too. */}
                <View>
                  <Play size={34} color="#fff" fill="#fff" style={{ marginLeft: 4 }} />
                </View>
              </Pressable>
            </MotiView>
            <Text style={styles.em}>Tap to start · 3, 2, 1</Text>
          </>
        )}
      </View>
    </>
  );
}

const GoFill = () => (
  <Svg width={86} height={86} style={StyleSheet.absoluteFill}>
    <Defs>
      <RadialGradient id="go" cx="50%" cy="30%" r="70%">
        <Stop offset="0" stopColor="#5aa0ff" />
        <Stop offset="1" stopColor="#2a6af0" />
      </RadialGradient>
    </Defs>
    <Circle cx={43} cy={43} r={43} fill="url(#go)" />
  </Svg>
);

function Live({ d }) {
  const r = d.run;
  const v = r ? { km: r.km, seconds: r.seconds, pace: r.pace, steps: r.steps, pct: r.goalKm ? r.km / r.goalKm : 0, out: r.out } : SAMPLE.live;
  return (
    <>
      <WTop
        left={
          <View style={styles.lv}>
            <LiveDot size={7} colour={r?.paused ? C.danger : C.out} />
            <Text style={[styles.wtopText, { color: "#fff" }]}>{r?.paused ? "PAUSED" : "LIVE"}</Text>
          </View>
        }
        right={formatDuration(v.seconds)}
      />
      <View style={styles.live}>
        <Text style={styles.liveKm}>
          {v.km.toFixed(2)}
          <Text style={styles.liveUnit}> KM</Text>
        </Text>
        <View style={styles.two}>
          <View>
            <Text style={styles.twoLabel}>Pace</Text>
            <Text style={styles.twoNum}>{formatPace(v.pace)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.twoLabel}>Steps</Text>
            <Text style={styles.twoNum}>{formatNumber(v.steps)}</Text>
          </View>
        </View>
        <Bar pct={v.pct} />
        <View style={styles.outRow}>
          <OutCoin size={16} />
          <Text style={styles.outText}>{`+${v.out} OUT`}</Text>
        </View>
      </View>
    </>
  );
}

const Bar = ({ pct, track = "rgba(255,255,255,0.12)" }) => (
  <View style={[styles.bar, { backgroundColor: track }]}>
    <LinearGradient colors={["#2a6af0", BLUE_HI]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${Math.round(Math.max(0, Math.min(1, pct)) * 100)}%`, height: "100%", borderRadius: 6 }} />
  </View>
);

function Turn({ d }) {
  const t = d.run?.nextTurn || SAMPLE.turn;
  const Icon = t.dir === "right" ? CornerUpRight : CornerUpLeft;
  return (
    <LinearGradient colors={["#2a6af0", "#16408f"]} style={styles.turn}>
      <View style={styles.turnIcon}>
        <Icon size={34} color="#fff" strokeWidth={2.6} />
      </View>
      <Text style={styles.turnM}>{`${t.metres} m`}</Text>
      <Text style={styles.turnText}>{t.label}</Text>
      <Svg width={120} height={40} viewBox="0 0 120 40" style={{ marginTop: 8 }}>
        <Path d="M6 34 C30 34 40 10 64 12 S100 30 114 8" fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={4} strokeLinecap="round" />
        <Circle cx={64} cy={12} r={5} fill="#fff" stroke="#3d8bff" strokeWidth={3} />
      </Svg>
    </LinearGradient>
  );
}

function Score({ b, tray, onEmote }) {
  const share = b.mine + b.theirs > 0 ? b.mine / (b.mine + b.theirs) : 0.5;
  return (
    <>
      <View style={styles.sc}>
        <Text style={styles.scMine}>{formatNumber(b.mine)}</Text>
        <Text style={[styles.scName, { color: BLUE_HI }, b.small && { fontSize: 10 }]}>{b.us}</Text>
      </View>
      <View style={[styles.bar, { backgroundColor: "rgba(255,77,85,0.55)" }]}>
        <LinearGradient colors={["#2a6af0", BLUE_HI]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${share * 100}%`, height: "100%", borderRadius: 6 }} />
      </View>
      <View style={styles.sc}>
        <Text style={styles.scTheirs}>{formatNumber(b.theirs)}</Text>
        <Text style={[styles.scName, { color: "#ff7a80" }, b.small && { fontSize: 10 }]}>{b.them}</Text>
      </View>
      <Text style={styles.lead}>{b.line}</Text>
      {tray ? (
        <View style={styles.emotes}>
          {tray.map((art, i) => (
            <Pressable key={i} onPress={() => onEmote(art)} accessibilityRole="button" accessibilityLabel="Fire an emote" hitSlop={4}>
              <Image source={art} style={styles.emote} contentFit="cover" />
            </Pressable>
          ))}
        </View>
      ) : null}
    </>
  );
}

function Battle({ d, onEmote }) {
  const b = d.battle || SAMPLE.battle;
  const tray = d.emotes || [PHOTOS.emoteFlame, PHOTOS.emoteFist, PHOTOS.emoteSnail];
  return (
    <>
      <WTop left={`VS ${b.rival}`} leftWhite right={b.endsIn || ""} />
      <View style={styles.bat}>
        <Score b={{ mine: b.mine, theirs: b.theirs, us: "You", them: b.rival, line: leadLine(b) }} tray={tray} onEmote={onEmote} />
      </View>
    </>
  );
}

function Cvc({ d }) {
  const f = d.fixture || SAMPLE.fixture;
  const squad = f.us.squad || 25;
  const on = Math.min(squad, f.us.out);
  return (
    <>
      <WTop left={f.label} leftWhite right={f.endsIn || ""} />
      <View style={styles.bat}>
        <Score b={{ mine: f.us.score, theirs: f.them.score, us: f.us.name, them: f.them.name, line: f.line, small: true }} />
        <View style={styles.dots}>
          {Array.from({ length: squad }, (_, i) =>
            i < on ? (
              <LinearGradient key={i} colors={[BLUE_HI, "#2a6af0"]} style={styles.dotCell} />
            ) : (
              <View key={i} style={[styles.dotCell, { backgroundColor: "rgba(255,255,255,0.08)" }]} />
            ),
          )}
        </View>
        <Text style={styles.dotsLine}>{`${on} of ${squad} out tonight`}</Text>
      </View>
    </>
  );
}

function Challenger({ d, onAnswer }) {
  const c = d.challenger || SAMPLE.challenger;
  return (
    <View style={{ flex: 1 }}>
      <Image source={PHOTOS.challenger} style={[StyleSheet.absoluteFill, { opacity: 0.55 }]} contentFit="cover" contentPosition={{ left: "50%", top: "18%" }} />
      <View style={styles.ch}>
        <MotiView from={{ shadowOpacity: 0.8 }} animate={{ shadowOpacity: 1 }} transition={{ type: "timing", duration: 700, loop: true, repeatReverse: true }} style={styles.band}>
          <Text style={styles.bandText}>New challenger</Text>
        </MotiView>
        <Text style={styles.q}>?</Text>
        <Text style={styles.chLine}>{`Level ${c.low}–${c.high}${c.stake ? ` · ${c.stake} OUT` : ""}`}</Text>
        <View style={styles.yn}>
          <Pressable onPress={() => onAnswer(false)} accessibilityRole="button" accessibilityLabel="Decline" style={[styles.ynBtn, styles.ynNo]}>
            <View>
              <X size={22} color="#fff" strokeWidth={2.4} />
            </View>
          </Pressable>
          <Pressable onPress={() => onAnswer(true)} accessibilityRole="button" accessibilityLabel="Accept" style={[styles.ynBtn, styles.ynYes]}>
            <LinearGradient colors={["#5aa0ff", "#2a6af0", "#1f56d6"]} locations={[0, 0.55, 1]} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 23 }]} />
            <View>
              <Check size={22} color="#fff" strokeWidth={2.6} />
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Club({ d, done, onCheckIn }) {
  const c = d.clubRun || SAMPLE.club;
  return (
    <>
      <WTop left="Club run" right={clock(d.now)} />
      <View style={styles.centre}>
        {/* Your own club's run, so its crest wears the blue ring (a ring means membership), lit from behind. */}
        <View style={styles.crestRing}>
          <Image source={c.logo || PHOTOS.crest} style={styles.crest} contentFit="cover" />
        </View>
        <Text style={styles.clubName} numberOfLines={1}>{c.club}</Text>
        <Text style={styles.small11}>{c.where}</Text>
        <Pressable onPress={onCheckIn} accessibilityRole="button" accessibilityLabel="Check in" style={styles.ckWrap}>
          <LinearGradient colors={["#5aa0ff", "#2a6af0", "#1f56d6"]} locations={[0, 0.6, 1]} style={styles.ck}>
            <View>
              <Check size={16} color="#fff" strokeWidth={2.6} />
            </View>
            <Text style={styles.ckText}>{done ? "Checked in" : "Check in"}</Text>
          </LinearGradient>
        </Pressable>
        <Text style={[styles.em, { marginTop: 6 }]}>{done ? "Counted for the club" : c.line}</Text>
      </View>
    </>
  );
}

const HOLD_MS = 1000;

function End({ d, onDone }) {
  const r = d.run;
  const v = r ? { km: r.km, seconds: r.seconds } : SAMPLE.end;
  const [held, setHeld] = useState(null); // 0..1 while holding
  const timer = useRef(null);
  const stop = () => {
    clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  const press = () => {
    hapticImpact();
    const from = Date.now();
    stop();
    timer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - from) / HOLD_MS);
      setHeld(p);
      if (p >= 1) {
        stop();
        hapticSuccess();
        onDone();
      }
    }, 16);
  };
  const release = () => {
    if (timer.current) {
      stop();
      setHeld(null);
    }
  };
  return (
    <View style={styles.centre}>
      <Pressable onPressIn={press} onPressOut={release} accessibilityRole="button" accessibilityLabel="Hold to finish" style={{ marginBottom: 8 }}>
        <HoldRing pct={held ?? 0.7} size={92} />
      </Pressable>
      <Text style={styles.endTitle}>{held != null ? "Keep holding" : "Hold to finish"}</Text>
      <Text style={styles.small11}>{`${v.km.toFixed(2)} km · ${formatDuration(v.seconds)}`}</Text>
    </View>
  );
}

/** The red hold ring with the stop button in it, as on the phone. */
export function HoldRing({ pct, size }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size }}>
      {/* .r11hold: the ring glows red (drop-shadow) */}
      <View pointerEvents="none" style={[styles.holdBloom, { borderRadius: size / 2 }]} />
      <Svg width={size} height={size} style={[StyleSheet.absoluteFill, { transform: [{ rotate: "-90deg" }] }]}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,77,85,0.18)" strokeWidth={6} />
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ff4d55" strokeOpacity={0.35} strokeWidth={12} strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - pct)} />
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ff4d55" strokeWidth={6} strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - pct)} />
      </Svg>
      <View style={styles.holdCore}>
        <Svg width={size - 24} height={size - 24} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="hold" cx="50%" cy="30%" r="70%">
              <Stop offset="0" stopColor="#ff6a70" />
              <Stop offset="1" stopColor="#d92f3a" />
            </RadialGradient>
          </Defs>
          <Circle cx={(size - 24) / 2} cy={(size - 24) / 2} r={(size - 24) / 2} fill="url(#hold)" />
        </Svg>
        <View>
          <Svg width={26} height={26} viewBox="0 0 24 24">
            <Rect x={7} y={7} width={10} height={10} rx={2} fill="#fff" />
          </Svg>
        </View>
      </View>
    </View>
  );
}

function Done({ d }) {
  const r = d.run || d.lastRun;
  const v = r ? { km: r.km, out: r.out, xp: r.xp } : SAMPLE.done;
  const b = d.battle;
  const line = b ? (b.diff >= 0 ? `Ahead of ${b.rival} by ${formatNumber(b.diff)}` : `${formatNumber(-b.diff)} behind ${b.rival}`) : SAMPLE.done.ahead;
  return (
    <>
      <WTop left="Run saved" right={clock(d.now)} />
      <View style={[styles.centre, { gap: 7 }]}>
        <Text style={styles.doneKm}>
          {v.km.toFixed(2)}
          <Text style={styles.doneUnit}> KM</Text>
        </Text>
        <View style={styles.ern}>
          <View style={styles.ernItem}>
            <OutCoin size={16} />
            <Text style={styles.ernText}>{`+${v.out}`}</Text>
          </View>
          <View style={styles.ernItem}>
            <Zap size={15} color={BLUE_HI} />
            <Text style={styles.ernText}>{`+${formatNumber(v.xp)}`}</Text>
          </View>
        </View>
        <View style={styles.stk}>
          <Flame size={14} color="#ff8a3d" />
          <Text style={styles.stkText}>{`${d.streak} ${d.streak === 1 ? "day" : "days"} outside`}</Text>
        </View>
        <Text style={styles.em}>{line}</Text>
      </View>
    </>
  );
}

// ── The flow ──────────────────────────────────────────────────────────────────

export function WatchFlow({ d }) {
  const [at, setAt] = useState(0);
  const [count, setCount] = useState(null);
  const [checked, setChecked] = useState(false);
  const [burst, setBurst] = useState(null);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const go = (i) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setCount(null);
    setChecked(false);
    setBurst(null);
    setAt((i + WATCH_SCREENS.length) % WATCH_SCREENS.length);
  };
  const next = () => {
    hapticSelection();
    go(at + 1);
  };
  const key = WATCH_SCREENS[at].key;

  const startCountdown = () => {
    hapticImpact();
    setCount(3);
    later(() => setCount(2), 700);
    later(() => setCount(1), 1400);
    later(() => go(2), 2100);
  };
  const emote = (art) => {
    hapticImpact();
    setBurst(art);
    later(() => setBurst(null), 900);
  };
  const checkIn = () => {
    hapticSuccess();
    setChecked(true);
    later(() => go(8), 900);
  };

  // Screens with their own buttons handle taps themselves; the rest move on
  // with a tap anywhere.
  const tapToMove = ["face", "live", "turn", "battle", "cvc", "done"].includes(key);
  const screen = {
    face: <Face d={d} />,
    start: <Start d={d} count={count} onGo={startCountdown} />,
    live: <Live d={d} />,
    turn: <Turn d={d} />,
    battle: <Battle d={d} onEmote={emote} />,
    cvc: <Cvc d={d} />,
    challenger: <Challenger d={d} onAnswer={() => next()} />,
    club: <Club d={d} done={checked} onCheckIn={checkIn} />,
    end: <End d={d} onDone={() => go(9)} />,
    done: <Done d={d} />,
  }[key];
  const s = WATCH_SCREENS[at];

  return (
    <View>
      <View style={styles.stage} testID="preview-watch">
        <StageGlow />
        <Tap onPress={tapToMove ? next : null} label={`${s.label}. Tap for the next screen`}>
          <WatchFrame flush={key === "turn" || key === "challenger"}>
            <MotiView key={key} from={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "timing", duration: 220 }} style={{ flex: 1 }}>
              {screen}
            </MotiView>
            {burst ? (
              <MotiView from={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1.6, opacity: 1 }} transition={{ type: "timing", duration: 360 }} style={styles.burst} pointerEvents="none">
                <Image source={burst} style={{ width: 70, height: 70, borderRadius: 18 }} contentFit="cover" />
              </MotiView>
            ) : null}
          </WatchFrame>
        </Tap>
        <View style={styles.cap}>
          <Text style={styles.capH}>{s.h}</Text>
          <Text style={styles.capP}>{s.p}</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {WATCH_SCREENS.map((x, i) => (
          <Pressable key={x.key} onPress={() => go(i)} style={[styles.chip, i === at && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: i === at }}>
            <Text style={[styles.chipText, i === at && { color: "#fff" }]}>{x.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * One watch screen on its own full screen stage (.r11wst): the blue glow, the
 * watch and the caption under it, filling the page. onGo(i) moves the pager
 * to watch screen i, so the run plays through page by page.
 */
export function WatchPage({ d, index, onGo }) {
  const [count, setCount] = useState(null);
  const [checked, setChecked] = useState(false);
  const [burst, setBurst] = useState(null);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  const s = WATCH_SCREENS[index];
  const key = s.key;
  const go = (i) => onGo?.((i + WATCH_SCREENS.length) % WATCH_SCREENS.length);
  const next = () => {
    hapticSelection();
    go(index + 1);
  };
  const startCountdown = () => {
    hapticImpact();
    setCount(3);
    later(() => setCount(2), 700);
    later(() => setCount(1), 1400);
    later(() => {
      setCount(null);
      go(2);
    }, 2100);
  };
  const emote = (art) => {
    hapticImpact();
    setBurst(art);
    later(() => setBurst(null), 900);
  };
  const checkIn = () => {
    hapticSuccess();
    setChecked(true);
    later(() => go(8), 900);
  };
  const tapToMove = ["face", "live", "turn", "battle", "cvc", "done"].includes(key);
  const screen = {
    face: <Face d={d} />,
    start: <Start d={d} count={count} onGo={startCountdown} />,
    live: <Live d={d} />,
    turn: <Turn d={d} />,
    battle: <Battle d={d} onEmote={emote} />,
    cvc: <Cvc d={d} />,
    challenger: <Challenger d={d} onAnswer={() => next()} />,
    club: <Club d={d} done={checked} onCheckIn={checkIn} />,
    end: <End d={d} onDone={() => go(9)} />,
    done: <Done d={d} />,
  }[key];

  return (
    <View style={styles.page} testID={`preview-watch-${key}`}>
      <StageGlow />
      <BlueBloom />
      <View style={styles.pageInner}>
        <Tap onPress={tapToMove ? next : null} label={`${s.label}. Tap for the next screen`}>
          <WatchFrame flush={key === "turn" || key === "challenger"}>
            <View style={{ flex: 1 }}>{screen}</View>
            {burst ? (
              <MotiView from={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1.6, opacity: 1 }} transition={{ type: "timing", duration: 360 }} style={styles.burst} pointerEvents="none">
                <Image source={burst} style={{ width: 70, height: 70, borderRadius: 18 }} contentFit="cover" />
              </MotiView>
            ) : null}
          </WatchFrame>
        </Tap>
        <View style={styles.cap}>
          <Text style={styles.capH}>{s.h}</Text>
          <Text style={styles.capP}>{s.p}</Text>
        </View>
      </View>
    </View>
  );
}

// The blue bloom right behind the watch, on top of the stage light.
function BlueBloom() {
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="bloom" cx="50%" cy="38%" rx="55%" ry="28%" fx="50%" fy="38%">
          <Stop offset="0" stopColor="#3d8bff" stopOpacity={0.3} />
          <Stop offset="0.5" stopColor="#2a6af0" stopOpacity={0.12} />
          <Stop offset="1" stopColor="#03050a" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={100} height={100} fill="url(#bloom)" />
    </Svg>
  );
}

// The whole watch is one button on screens that move on with a tap; on the
// others its own buttons do the work.
const Tap = ({ onPress, label, children }) =>
  onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {children}
    </Pressable>
  ) : (
    <View>{children}</View>
  );

// The soft blue glow behind the watch.
function StageGlow() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id="stage" cx="50%" cy="36%" rx="70%" ry="40%" fx="50%" fy="36%">
          <Stop offset="0" stopColor="#0d2148" />
          <Stop offset="0.72" stopColor="#03050a" />
          <Stop offset="1" stopColor="#03050a" />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={100} height={100} fill="url(#stage)" />
    </Svg>
  );
}

// ── Round six: on the watch ───────────────────────────────────────────────────

export function WatchRunPage({ d }) {
  const r = d.run;
  const v = r ? { km: r.km, pace: r.pace, seconds: r.seconds, pct: r.goalKm ? r.km / r.goalKm : 0, out: r.out, paused: r.paused } : { km: 4.82, pace: 302, seconds: 1458, pct: 0.96, out: 18, paused: false };
  return (
    <PhoneFrame style={{ backgroundColor: "#000" }} testID="preview-watchRun">
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="wrun" cx="50%" cy="30%" rx="70%" ry="45%" fx="50%" fy="30%">
            <Stop offset="0" stopColor="#0b1a33" />
            <Stop offset="0.7" stopColor="#000" />
            <Stop offset="1" stopColor="#000" />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={100} fill="url(#wrun)" />
      </Svg>
      <View style={styles.wrWrap}>
        <Image source={PHOTOS.watch} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel="A smart watch on a black background" />
        <View style={styles.wscr}>
          <View style={styles.wt}>
            <View style={styles.lv}>
              <LiveDot size={6} colour={v.paused ? C.danger : C.out} />
              <Text style={[styles.wtText, { color: v.paused ? "#ff8b95" : BLUE_HI, letterSpacing: 0.8, fontSize: 8 }]}>{v.paused ? "PAUSED" : "RUN"}</Text>
            </View>
            <Text style={styles.wtText}>{clock(d.now)}</Text>
          </View>
          <Text style={styles.wkm}>
            {v.km.toFixed(2)}
            <Text style={styles.wkmUnit}> KM</Text>
          </Text>
          <View style={styles.wrow}>
            <View>
              <Text style={styles.wrowLabel}>Pace</Text>
              <Text style={styles.wrowNum}>{formatPace(v.pace)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.wrowLabel}>Time</Text>
              <Text style={styles.wrowNum}>{formatDuration(v.seconds)}</Text>
            </View>
          </View>
          <View style={styles.wbar}>
            <View style={{ width: `${Math.round(Math.min(1, v.pct) * 100)}%`, height: "100%", backgroundColor: C.accent }} />
          </View>
          <View style={styles.wout}>
            <OutCoin size={12} />
            <Text style={styles.woutText}>{`+${v.out} OUT`}</Text>
          </View>
        </View>
      </View>
      <View style={styles.wBody}>
        <Text style={styles.wKick}>Outhere on your wrist</Text>
        <View>
          <Text style={styles.wH2}>Leave the phone.</Text>
          <Text style={[styles.wH2, { color: C.accent }]}>Keep the streak.</Text>
        </View>
        <View style={styles.chips6}>
          {[
            [Zap, "Live pace and OUT"],
            [Swords, "Battle score"],
            [Bell, "Haptic splits"],
          ].map(([Icon, label]) => (
            <View key={label} style={styles.chip6}>
              <Icon size={13} color={C.accent} />
              <Text style={styles.chip6Text}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </PhoneFrame>
  );
}

const display = (size, extra) => ({ fontFamily: F.display, fontSize: size, lineHeight: size, color: "#fff", ...extra });

const styles = StyleSheet.create({
  watch: {
    position: "absolute",
    width: W,
    height: H,
    borderRadius: 66,
    padding: 11,
    shadowColor: "#000",
    shadowOpacity: 0.9,
    shadowRadius: 35,
    shadowOffset: { width: 0, height: 40 },
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  crown: { position: "absolute", right: -9, top: 74, width: 12, height: 40, borderRadius: 5, backgroundColor: "#2a2e35", paddingTop: 1, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  side: { position: "absolute", right: -5, top: 136, width: 6, height: 46, borderRadius: 3, backgroundColor: "#2a2e35" },
  screen: { flex: 1, borderRadius: 56, backgroundColor: "#000", overflow: "hidden", paddingTop: 20, paddingHorizontal: 18, paddingBottom: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.04)" },

  wtop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 10 },
  wtopText: { fontFamily: F.bodySemi, fontSize: 12, lineHeight: 15 },
  lv: { flexDirection: "row", alignItems: "center", gap: 5 },
  centre: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  small12: { fontFamily: F.body, fontSize: 12, color: GREY },
  small11: { fontFamily: F.body, fontSize: 11, color: GREY },
  em: { fontFamily: F.body, fontSize: 10.5, color: BLUE_HI, textAlign: "center" },

  face: { flex: 1, alignItems: "center" },
  faceTime: display(70, { lineHeight: 63, letterSpacing: -1, marginTop: 6 }),
  faceDate: { fontFamily: F.bodySemi, fontSize: 13, color: BLUE_SOFT, marginTop: 4 },
  cx: { position: "absolute", bottom: 28, width: 54, height: 54, alignItems: "center", justifyContent: "center" },
  cxRound: { right: 4, borderRadius: 27, backgroundColor: "rgba(255,255,255,0.07)" },
  cxNum: display(13),
  faceOut: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 6 },
  faceOutText: { fontFamily: F.body, fontSize: 11, color: "#c9d3e2" },

  startKm: display(26, { marginTop: 3 }),
  goGlow: { marginTop: 10, marginBottom: 8, borderRadius: 43, shadowColor: C.accent, shadowOpacity: 0.6, shadowRadius: 15, shadowOffset: { width: 0, height: 0 } },
  go: { width: 86, height: 86, borderRadius: 43, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  count: display(96, { color: BLUE_BIG, lineHeight: 96 }),

  live: { flex: 1, justifyContent: "center", gap: 9, paddingHorizontal: 6 },
  liveKm: display(64, { lineHeight: 56, color: BLUE_BIG }),
  liveUnit: { fontFamily: F.display, fontSize: 14, color: "#fff" },
  two: { flexDirection: "row", justifyContent: "space-between" },
  twoLabel: { fontFamily: F.body, fontSize: 11, color: GREY },
  twoNum: display(22, { marginTop: 2 }),
  bar: { height: 6, borderRadius: 6, overflow: "hidden" },
  outRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  outText: { fontFamily: F.bodySemi, fontSize: 13, color: "#fff" },

  turn: { flex: 1, paddingTop: 30, paddingHorizontal: 20, paddingBottom: 18, alignItems: "center", justifyContent: "center" },
  turnIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  turnM: display(46, { lineHeight: 42, marginTop: 10 }),
  turnText: { fontFamily: F.body, fontSize: 12, lineHeight: 16, color: "rgba(255,255,255,0.9)", marginTop: 4, textAlign: "center" },

  bat: { flex: 1, justifyContent: "center", gap: 6, paddingHorizontal: 4 },
  sc: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  scMine: display(30),
  scTheirs: display(24, { color: GREY }),
  scName: { fontFamily: F.body, fontSize: 11, lineHeight: 14, marginBottom: 2 },
  lead: { fontFamily: F.bodySemi, fontSize: 11.5, color: BLUE_SOFT, marginTop: 2 },
  emotes: { flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 4 },
  emote: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#0b1424", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  dots: { flexDirection: "row", gap: 2, marginTop: 4 },
  dotCell: { flex: 1, height: 9, borderRadius: 2 },
  dotsLine: { fontFamily: F.body, fontSize: 10, color: GREY, textAlign: "center" },

  ch: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  band: { backgroundColor: "#2a6af0", paddingVertical: 7, paddingHorizontal: 12, transform: [{ rotate: "-5deg" }], shadowColor: C.accent, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  bandText: { fontFamily: F.display, fontSize: 15, lineHeight: 15, color: "#fff", textTransform: "uppercase", transform: [{ skewX: "-10deg" }] },
  q: display(56, { color: BLUE_SOFT, marginTop: 6, textShadowColor: "rgba(79,155,255,0.9)", textShadowRadius: 22, textShadowOffset: { width: 0, height: 0 } }),
  chLine: { fontFamily: F.body, fontSize: 11, color: "#dbe3ef" },
  yn: { flexDirection: "row", gap: 22, marginTop: 10 },
  ynBtn: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  ynNo: { backgroundColor: "rgba(255,255,255,0.14)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)" },
  // .wch .yn .y: the act gradient, lit inside and glowing round the edge
  ynYes: { boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 18px rgba(61,139,255,0.85), 0 0 36px rgba(42,106,240,0.45)" },

  // .wclub img: 46 round with a 2px blue ring and a soft blue bloom
  crestRing: { width: 50, height: 50, borderRadius: 25, padding: 2, backgroundColor: "#3d8bff", boxShadow: "0 0 16px rgba(61,139,255,0.75), 0 0 32px rgba(42,106,240,0.35)" },
  crest: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#05080e" },
  clubName: { fontFamily: F.bodySemi, fontSize: 14, color: "#fff", marginTop: 4 },
  ckWrap: { marginTop: 9, borderRadius: 999, boxShadow: "0 8px 22px -6px rgba(42,106,240,0.95), 0 0 18px rgba(61,139,255,0.55)" },
  ck: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 11, paddingHorizontal: 20, borderRadius: 999, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)" },
  ckText: { fontFamily: F.bodySemi, fontSize: 14, color: "#fff" },

  holdCore: { position: "absolute", left: 12, top: 12, right: 12, bottom: 12, borderRadius: 999, alignItems: "center", justifyContent: "center", boxShadow: "0 10px 26px -4px rgba(255,77,85,0.85), inset 0 1px 0 rgba(255,255,255,0.3)" },
  holdBloom: { ...StyleSheet.absoluteFill, boxShadow: "0 0 26px rgba(255,77,85,0.55), 0 0 50px rgba(255,77,85,0.25)" },
  endTitle: { fontFamily: F.bodySemi, fontSize: 15, color: "#fff" },

  doneKm: display(54, { lineHeight: 48, color: BLUE_BIG }),
  doneUnit: { fontFamily: F.display, fontSize: 13, color: "#fff" },
  ern: { flexDirection: "row", gap: 14 },
  ernItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  ernText: { fontFamily: F.bodySemi, fontSize: 15, color: "#fff" },
  stk: { flexDirection: "row", alignItems: "center", gap: 5 },
  stkText: { fontFamily: F.bodySemi, fontSize: 12, color: "#fff" },

  burst: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" },

  // .r11wst as a whole page: the watch a little above the middle, the caption 58 under it
  page: { flex: 1, backgroundColor: "#03050a", overflow: "hidden" },
  pageInner: { flex: 1, alignItems: "center", justifyContent: "center", gap: 58, paddingHorizontal: 22, paddingBottom: 30 },
  stage: { borderRadius: 28, overflow: "hidden", paddingTop: 44, paddingBottom: 30, paddingHorizontal: 22, alignItems: "center", gap: 46, backgroundColor: "#03050a" },
  cap: { alignItems: "center", maxWidth: 270 },
  capH: { fontFamily: F.display, fontSize: 26, lineHeight: 26, color: "#e9edf3", textAlign: "center", textTransform: "uppercase" },
  capP: { fontFamily: F.body, fontSize: 12, lineHeight: 18, color: C.textDim, textAlign: "center", marginTop: 8 },
  chips: { gap: 8, paddingTop: 14, paddingBottom: 2 },
  chip: { height: 32, paddingHorizontal: 13, borderRadius: 999, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  chipOn: { backgroundColor: C.accent },
  chipText: { fontFamily: F.bodySemi, fontSize: 12, color: C.textDim },

  wrWrap: { position: "absolute", top: 34, left: 0, right: 0, aspectRatio: 1 },
  wscr: { position: "absolute", left: "30.6%", top: "25.4%", width: "38.8%", height: "46.2%", borderRadius: 20, paddingTop: 10, paddingHorizontal: 10, paddingBottom: 9, gap: 4, overflow: "hidden" },
  wt: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  wtText: { fontFamily: F.bodySemi, fontSize: 9, color: "#fff" },
  wkm: display(38, { lineHeight: 33, color: BLUE_BIG, marginTop: 4 }),
  wkmUnit: { fontFamily: F.display, fontSize: 11, color: "#fff" },
  wrow: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  wrowLabel: { fontFamily: F.body, fontSize: 8, color: "#9aa6b8" },
  wrowNum: display(15, { marginTop: 2 }),
  wbar: { height: 4, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden", marginTop: 3 },
  wout: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: "auto" },
  woutText: { fontFamily: F.bodySemi, fontSize: 9.5, color: "#fff" },
  wBody: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingBottom: 34, gap: 12 },
  wKick: { fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2, color: BLUE_HI, textTransform: "uppercase" },
  wH2: display(40, { lineHeight: 38, textTransform: "uppercase" }),
  chips6: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip6: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" },
  chip6Text: { fontFamily: F.bodySemi, fontSize: 11, color: "#fff" },
});
