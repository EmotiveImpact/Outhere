// Everything over the map while a run is recording, laid out and lit like
// the prototype's map screens:
// MapPanel      the overview sheet: distance, pace, steps, XP and OUT, goal
// HoldPanel     finishing is a press and hold with a filling red ring
// PilotPanel    sat nav for your feet: next turn up top, arrive in N min
// StreetPanel   zoomed in, pace big enough to read mid-stride
// OffRoutePanel rerouting back to the planned line
// PausedPanel   the clock has stopped
// GpsLostCard   signal lost, steps keep counting
// GhostChip     racing your best on this route
// LockOverlay   ignores touches until held

import React, { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { Ghost, Lock, Pause, Play, Square, Unlock, Zap } from "@/components/ui/icons";
import { BlendImage, C, F, GlowButton, LIT, Meter, PressableScale, R } from "@/components/ui";
import { Coin } from "@/components/profile/shared";
import { formatDuration, formatNumber, formatPace } from "@/utils/format";
import { haptic, hapticImpact, holdTicks } from "@/services/haptics";
import { Dash, Glass, MapSheet } from "./parts";
import { MOVE_IMAGES } from "./images";
import { Image } from "expo-image";
import { PHOTOS } from "@/constants/photos";

const HOLD_MS = 1200;

/** .controls .btn.sec: the square lit pause button beside the main action. */
function SecPause({ paused, onPress, size = 54, glass = false, label }) {
  const Icon = paused ? Play : Pause;
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label || (paused ? "Resume" : "Pause")} scaleTo={0.92} style={[styles.secBtn, { width: size, height: size, borderRadius: size / 2 }, glass && styles.secGlass]}>
      {glass ? null : <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]} />}
      <View>
        <Icon size={20} color="#fff" fill="#fff" />
      </View>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: size / 2, boxShadow: glass ? "inset 0 0 0 1px rgba(255,255,255,0.08)" : "inset 0 1px 0 rgba(255,255,255,0.09), inset 0 0 0 1px rgba(255,255,255,0.045)" }]} />
    </PressableScale>
  );
}

/** .fl.gl.panel: a glass panel floating 14 in from the sides. */
function Panel({ bottom, children, style }) {
  return (
    <Glass style={[styles.floatPanel, { bottom }, style]} radius={24}>
      {children}
    </Glass>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────

export function MapPanel({ km, avgPace, steps, xp, out, goalKm, paused, onPause, onFinish, bottomInset }) {
  const { height } = useWindowDimensions();
  const pc = goalKm ? Math.min(1, km / goalKm) : 0;
  return (
    // .sheet starts 430 down the screen and runs to the bottom.
    <MapSheet bottomInset={bottomInset} style={{ minHeight: Math.max(380, height - 430) }}>
      <View style={styles.bigRow}>
        <View>
          <Text style={styles.xs}>Distance</Text>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text style={styles.bigKm}>{km.toFixed(2)}</Text>
            <Text style={styles.bigUnit}>KM</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.xs}>Avg pace</Text>
          <Text style={styles.pace}>{formatPace(avgPace)}</Text>
        </View>
      </View>
      <Dash
        boxed
        items={[
          { value: formatNumber(steps), label: "Steps" },
          { value: `+${xp}`, label: "XP", icon: <Zap size={14} color={C.accent} fill={C.accent} /> },
          { value: `+${out}`, label: "OUT", icon: <Coin size={15} /> },
        ]}
      />
      {goalKm ? (
        <View style={{ gap: 7 }}>
          <View style={styles.goalRow}>
            <Text style={styles.xs}>{`Goal ${goalKm % 1 ? goalKm.toFixed(1) : goalKm} km`}</Text>
            <Text style={[styles.xs, { fontVariant: ["tabular-nums"] }]}>{`${Math.round(pc * 100)}%`}</Text>
          </View>
          <Meter value={pc} size={6} />
        </View>
      ) : null}
      <View style={[styles.controls, { marginTop: "auto" }]}>
        <SecPause paused={paused} onPress={onPause} />
        <GlowButton title={out > 0 ? `Finish and claim ${out} OUT` : "Finish"} onPress={onFinish} style={{ flex: 1 }} />
      </View>
    </MapSheet>
  );
}

// ── Press and hold to finish ─────────────────────────────────────────────────

/**
 * .r11hold: a 96 pt red ring that fills while you hold, the core sinking
 * under your thumb (r11press). Untouched, the core breathes so it reads as
 * something to press and hold.
 */
function HoldRing({ size = 96, onHoldChange, onDone }) {
  const reduce = useReducedMotion();
  const [p, setP] = useState(0);
  const raf = useRef(null);
  const startAt = useRef(0);
  const done = useRef(false);
  const ticks = useRef(null); // stops the soft haptic ticks while holding
  const press = useSharedValue(0);
  const idle = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    idle.value = withRepeat(withSequence(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) })), -1, false);
  }, [reduce, idle]);

  const stop = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    ticks.current?.();
    ticks.current = null;
  };
  useEffect(() => stop, []);

  const tick = () => {
    const v = Math.min(1, (Date.now() - startAt.current) / HOLD_MS);
    setP(v);
    if (v >= 1) {
      stop();
      if (!done.current) {
        done.current = true;
        haptic.holdDone();
        onDone();
      }
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };

  const down = () => {
    done.current = false;
    startAt.current = Date.now();
    press.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) });
    onHoldChange(true, HOLD_MS);
    stop();
    ticks.current = holdTicks(250);
    raf.current = requestAnimationFrame(tick);
  };
  const up = () => {
    stop();
    press.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.back(2)) });
    if (!done.current) {
      setP(0);
      onHoldChange(false);
    }
  };

  const core = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.08 - (1 - press.value) * idle.value * 0.035 }] }));
  const halo = useAnimatedStyle(() => ({ opacity: 0.35 + press.value * 0.45 + (1 - press.value) * idle.value * 0.25 }));

  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const inset = 12;
  return (
    <Pressable onPressIn={down} onPressOut={up} accessibilityRole="button" accessibilityLabel="Hold to finish" accessibilityHint="Press and hold to finish the run" hitSlop={10}>
      <View style={{ width: size, height: size }}>
        <Animated.View pointerEvents="none" style={[styles.holdHalo, { left: -14, top: -14, width: size + 28, height: size + 28, borderRadius: (size + 28) / 2 }, halo]} />
        <Svg width={size} height={size} style={[StyleSheet.absoluteFill, { transform: [{ rotate: "-90deg" }] }]}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,77,85,0.18)" strokeWidth={6} fill="none" />
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.danger} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={`${circ}`} strokeDashoffset={circ * (1 - p)} opacity={p > 0 ? 1 : 0} />
        </Svg>
        <Animated.View style={[styles.holdCore, { left: inset, top: inset, width: size - inset * 2, height: size - inset * 2, borderRadius: size }, core]}>
          {/* radial-gradient(circle at 50% 30%, #ff6a70, #d92f3a 70%) */}
          <LinearGradient colors={["#ff6a70", "#ec4650", "#d92f3a"]} locations={[0, 0.45, 1]} style={[StyleSheet.absoluteFill, { borderRadius: size }]} />
          <View>
            <Square size={22} color="#fff" fill="#fff" strokeWidth={0} />
          </View>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: size, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)" }]} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

/** .r11pz: the round side buttons beside the hold ring. */
function SideButton({ icon: Icon, label, onPress, fill }) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} scaleTo={0.92} style={styles.sideBtn}>
      <View>
        <Icon size={18} color="#fff" fill={fill ? "#fff" : "none"} />
      </View>
      <Text style={styles.sideText}>{label}</Text>
    </PressableScale>
  );
}

export function HoldPanel({ km, pace, out, paused, onPause, onLock, onFinish, onIdle, bottom }) {
  const [holding, setHolding] = useState(false);
  const [left, setLeft] = useState(HOLD_MS);
  const until = useRef(0);

  // Not touched for a few seconds: back to the run.
  useEffect(() => {
    if (holding) return undefined;
    const t = setTimeout(onIdle, 6000);
    return () => clearTimeout(t);
  }, [holding]);

  useEffect(() => {
    if (!holding) return undefined;
    const id = setInterval(() => setLeft(Math.max(0, until.current - Date.now())), 100);
    return () => clearInterval(id);
  }, [holding]);

  return (
    <Panel bottom={bottom}>
      <Dash
        items={[
          { value: km.toFixed(2), label: "km" },
          { value: formatPace(pace), label: "Pace" },
          { value: `+${out}`, label: "OUT" },
        ]}
      />
      <View style={styles.holdRow}>
        <SideButton icon={paused ? Play : Pause} fill label={paused ? "Resume" : "Pause"} onPress={onPause} />
        <HoldRing
          onHoldChange={(on, ms) => {
            setHolding(on);
            if (on) {
              until.current = Date.now() + ms;
              setLeft(ms);
            }
          }}
          onDone={onFinish}
        />
        <SideButton icon={Lock} label="Lock" onPress={onLock} />
      </View>
      <View style={styles.holdText}>
        <Text style={styles.holdTitle}>{holding ? "Keep holding to finish" : "Hold to finish"}</Text>
        <Text style={styles.holdSub}>{holding ? (left < 1000 ? "Less than a second to go. Let go to keep running." : "Let go to keep running.") : "Press and hold the red button. A tap won't end your run."}</Text>
      </View>
    </Panel>
  );
}

// ── Pilot and street ─────────────────────────────────────────────────────────

/**
 * Pilot's horizon (mPilot's hero): the city at night across the top, shaded
 * like the prototype, fading into the tilted map so your real route runs
 * out towards it.
 */
export function PilotSky() {
  const { height } = useWindowDimensions();
  const h = Math.round(height * 0.5);
  return (
    <View pointerEvents="none" style={[styles.sky, { height: h + 120 }]}>
      <Image source={PHOTOS.city} contentFit="cover" contentPosition={{ left: "50%", top: "30%" }} style={{ width: "100%", height: h }} />
      <LinearGradient colors={["rgba(2,5,12,0.55)", "rgba(2,5,12,0)", "rgba(2,5,12,0)", "rgba(5,8,14,0.9)", "#05080e"]} locations={[0, 0.3, 0.55, 0.88, 1]} style={[StyleSheet.absoluteFill, { height: h }]} />
      <LinearGradient colors={["#05080e", "rgba(5,8,14,0)"]} style={{ height: 120 }} />
    </View>
  );
}

export function PilotPanel({ seconds, km, pace, paused, onPause, arriveLabel, onFinish, bottom }) {
  return (
    <Panel bottom={bottom} style={{ paddingHorizontal: 10 }}>
      <Dash
        items={[
          { value: formatDuration(seconds), label: "Time" },
          { value: km.toFixed(2), label: "km" },
          { value: formatPace(pace), label: "Pace" },
        ]}
      />
      <View style={[styles.controls, { marginTop: 14, gap: 8 }]}>
        <SecPause paused={paused} onPress={onPause} size={50} glass />
        <GlowButton title={arriveLabel || "Finish"} onPress={onFinish} style={{ flex: 1, height: 50 }} />
      </View>
    </Panel>
  );
}

export function StreetPanel({ pace, km, cadence, out, onPress, bottom }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.99} accessibilityLabel="Show controls" style={[styles.floatAbs, { bottom }]}>
      <Glass radius={24} style={{ alignItems: "center", paddingTop: 18, paddingBottom: 16, paddingHorizontal: 16 }}>
        <Text style={styles.kick}>Live dash</Text>
        <Text style={styles.streetPace} numberOfLines={1} adjustsFontSizeToFit>
          {formatPace(pace)}
        </Text>
        <Text style={styles.muted12}>Current pace per km</Text>
        <Dash
          style={{ marginTop: 16, alignSelf: "stretch" }}
          items={[
            { value: km.toFixed(2), label: "km" },
            { value: cadence ? `${cadence}` : "--", label: "Cadence" },
            { value: `+${out}`, label: "OUT" },
          ]}
        />
      </Glass>
    </PressableScale>
  );
}

// ── Off route ────────────────────────────────────────────────────────────────

function Spinner() {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1, false);
  }, [reduce, t]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${t.value * 360}deg` }] }));
  return <Animated.View style={[styles.spin, spin]} />;
}

export function OffRoutePanel({ km, seconds, out, paused, onPause, onEndRoute, bottom }) {
  useEffect(() => {
    haptic.warn();
  }, []);
  return (
    <Panel bottom={bottom}>
      <View style={styles.reroute}>
        <Spinner />
        <Text style={styles.rerouteText}>Rerouting. Your steps and distance still count, we're just finding the way back.</Text>
      </View>
      <Dash
        style={{ marginTop: 12 }}
        items={[
          { value: km.toFixed(2), label: "km" },
          { value: formatDuration(seconds), label: "Time" },
          { value: `+${out}`, label: "OUT" },
        ]}
      />
      <View style={[styles.controls, { marginTop: 14, gap: 8 }]}>
        <GlowButton title="End route, keep running" variant="glass" shine={false} onPress={onEndRoute} style={{ flex: 1 }} />
        <GlowButton square icon={paused ? Play : Pause} accessibilityLabel={paused ? "Resume" : "Pause"} onPress={onPause} shine={false} style={{ width: 54 }} />
      </View>
    </Panel>
  );
}

// ── Paused ───────────────────────────────────────────────────────────────────

export function PausedWord({ seconds, km, top }) {
  return (
    <View pointerEvents="none" style={[styles.pausedWrap, { top }]}>
      <Text style={styles.pausedWord}>Paused</Text>
      <Text style={styles.pausedSub}>{`${formatDuration(seconds)} · ${km.toFixed(2)} km · we stopped the clock`}</Text>
    </View>
  );
}

export function PausedPanel({ km, pace, out, onFinish, onResume, bottom }) {
  return (
    <Panel bottom={bottom}>
      <Dash
        items={[
          { value: km.toFixed(2), label: "km" },
          { value: formatPace(pace), label: "Pace" },
          { value: `+${out}`, label: "OUT" },
        ]}
      />
      <View style={[styles.controls, { marginTop: 16, gap: 8 }]}>
        <GlowButton title="Finish" variant="glass" shine={false} onPress={onFinish} style={{ flex: 1 }} />
        <GlowButton title="Resume" icon={Play} onPress={onResume} style={{ flex: 1 }} />
      </View>
    </Panel>
  );
}

// ── GPS lost ─────────────────────────────────────────────────────────────────

/** .gpscard: the lost signal pin, blended, with what still counts. */
export function GpsLostCard({ top }) {
  useEffect(() => {
    haptic.warn();
  }, []);
  return (
    <View style={[styles.gpsCard, { top }]}>
      <Glass radius={26} style={styles.gpsInner}>
        <BlendImage source={MOVE_IMAGES.gpsLost} size={150} mask="soft" />
        <Text style={styles.gpsTitle}>Signal lost</Text>
        <Text style={styles.gpsSub}>Steps are still counting. We'll fill in your distance when GPS is back.</Text>
      </Glass>
    </View>
  );
}

export function GpsLostPanel({ steps, lastKm, out, paused, onPause, onKeepGoing, bottomInset }) {
  const { height } = useWindowDimensions();
  return (
    <MapSheet bottomInset={bottomInset} style={{ minHeight: Math.max(260, height - 532) }}>
      <Dash
        boxed
        style={{ marginTop: 4 }}
        items={[
          { value: formatNumber(steps), label: "Steps" },
          { value: `${lastKm.toFixed(1)} km`, label: "Last fix" },
          { value: `+${out}`, label: "OUT", icon: <Coin size={15} /> },
        ]}
      />
      <View style={[styles.controls, { marginTop: "auto" }]}>
        <SecPause paused={paused} onPress={onPause} />
        <GlowButton title="Keep going" onPress={onKeepGoing} style={{ flex: 1 }} />
      </View>
    </MapSheet>
  );
}

// ── Ghost ────────────────────────────────────────────────────────────────────

/** .ghost-chip */
export function GhostChip({ diffM, top }) {
  const ahead = diffM >= 0;
  const m = Math.abs(Math.round(diffM / 10) * 10);
  return (
    <Glass style={[styles.ghost, { top }]} radius={14}>
      <View style={styles.ghostIcon}>
        <Ghost size={16} color={C.accentHi} />
      </View>
      <View>
        <Text style={styles.ghostTitle}>{ahead ? "Beating your best" : "Chasing your best"}</Text>
        <Text style={styles.ghostSub}>{m < 10 ? "Neck and neck with your ghost" : ahead ? `Ghost is ${m} m behind` : `Ghost is ${m} m ahead`}</Text>
      </View>
    </Glass>
  );
}

// ── Lock ─────────────────────────────────────────────────────────────────────

export function LockOverlay({ onUnlock, bottom }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Screen locked" />
      <PressableScale onLongPress={onUnlock} onPress={() => hapticImpact()} accessibilityLabel="Hold to unlock" style={[styles.unlockWrap, { bottom }]}>
        <Glass radius={R.full} style={styles.unlock}>
          <View>
            <Unlock size={18} color="#fff" />
          </View>
          <Text style={styles.unlockText}>Hold to unlock</Text>
        </Glass>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  sky: { position: "absolute", left: 0, right: 0, top: 0, ...(Platform.OS === "web" ? { willChange: "transform" } : null) },
  xs: { color: C.textDim, fontFamily: F.body, fontSize: 11, marginBottom: 8 },
  muted12: { color: "#a3adbd", fontFamily: F.body, fontSize: 12 },
  kick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.8, textTransform: "uppercase" },
  bigRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  bigKm: { color: C.text, fontFamily: F.display, fontSize: 66, lineHeight: 58, letterSpacing: 0.2, fontVariant: ["tabular-nums"] },
  bigUnit: { color: C.textDim, fontFamily: F.display, fontSize: 20, marginLeft: 4, letterSpacing: 0.6 },
  pace: { color: C.text, fontFamily: F.display, fontSize: 30, lineHeight: 28, marginTop: -3, fontVariant: ["tabular-nums"] },
  goalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: -8 },
  controls: { flexDirection: "row", alignItems: "center", gap: 10 },
  secBtn: { alignItems: "center", justifyContent: "center", boxShadow: "0 22px 40px -26px rgba(0,0,0,0.95), 0 2px 6px -2px rgba(0,0,0,0.5)" },
  secGlass: { backgroundColor: "rgba(255,255,255,0.1)", boxShadow: "none" },
  floatPanel: { position: "absolute", left: 14, right: 14, padding: 16 },
  floatAbs: { position: "absolute", left: 14, right: 14 },
  holdRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingHorizontal: 6 },
  holdHalo: { position: "absolute", backgroundColor: "rgba(255,77,85,0.14)", boxShadow: "0 0 30px 6px rgba(255,77,85,0.35)" },
  holdCore: { position: "absolute", overflow: "hidden", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 26px -8px rgba(255,77,85,0.8)" },
  sideBtn: { width: 62, height: 62, borderRadius: 31, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", gap: 2 },
  sideText: { color: "rgba(255,255,255,0.75)", fontFamily: F.bodySemi, fontSize: 9 },
  holdText: { alignItems: "center", gap: 3, marginTop: 10 },
  holdTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  holdSub: { color: "#a3adbd", fontFamily: F.body, fontSize: 11, textAlign: "center" },
  streetPace: { color: C.text, fontFamily: F.display, fontSize: 96, lineHeight: 82, marginTop: 10, marginBottom: 2, fontVariant: ["tabular-nums"] },
  reroute: { flexDirection: "row", alignItems: "center", gap: 10 },
  rerouteText: { flex: 1, color: "#c9d3e2", fontFamily: F.body, fontSize: 12, lineHeight: 17 },
  spin: { width: 18, height: 18, borderRadius: 9, borderWidth: 2.5, borderColor: "rgba(130,180,255,0.25)", borderTopColor: C.accentHi },
  pausedWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  pausedWord: { color: "#fff", fontFamily: F.display, fontSize: 76, lineHeight: 70, textTransform: "uppercase", letterSpacing: 2 },
  pausedSub: { color: "rgba(255,255,255,0.75)", fontFamily: F.body, fontSize: 13, marginTop: 10 },
  gpsCard: { position: "absolute", left: 36, right: 36 },
  gpsInner: { alignItems: "center", paddingTop: 6, paddingBottom: 18, paddingHorizontal: 18, gap: 6, backgroundColor: "rgba(8,12,20,0.62)" },
  gpsTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  gpsSub: { color: "#b4bfd0", fontFamily: F.body, fontSize: 11.5, lineHeight: 17, textAlign: "center" },
  ghost: { position: "absolute", left: 18, flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 8, paddingLeft: 8, paddingRight: 12 },
  ghostIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: "rgba(130,180,255,0.18)", alignItems: "center", justifyContent: "center" },
  ghostTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 12 },
  ghostSub: { color: "rgba(255,255,255,0.7)", fontFamily: F.body, fontSize: 10.5 },
  unlockWrap: { position: "absolute", alignSelf: "center" },
  unlock: { flexDirection: "row", alignItems: "center", gap: 8, height: 50, paddingHorizontal: 22 },
  unlockText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 15 },
});
