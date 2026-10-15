// Everything over the map while a run is recording:
// MapPanel      the overview: distance, pace, steps, XP and OUT ticking, goal
// HoldPanel     finishing is a press and hold with a filling red ring
// PilotPanel    sat nav for your feet: next turn up top, arrive in N min
// StreetPanel   zoomed in, pace big enough to read mid-stride
// OffRoutePanel rerouting back to the planned line
// PausedPanel   the clock has stopped
// GpsLostCard   signal lost, steps keep counting
// GhostChip     racing your best on this route
// LockOverlay   ignores touches until held

import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Svg, { Circle } from "react-native-svg";
import { Ghost, Lock, Pause, Play, Square, Unlock, Zap } from "lucide-react-native";
import { AnimatedBar, Button, C, F, PressableScale, R, S } from "@/components/ui";
import { Coin } from "@/components/profile/shared";
import { formatDuration, formatNumber, formatPace } from "@/utils/format";
import { hapticImpact, hapticSuccess } from "@/services/haptics";
import { Dash, Glass, MapSheet } from "./parts";
import { MOVE_IMAGES } from "./images";

const HOLD_MS = 1200;

function RoundPause({ paused, onPress, size = 56, label }) {
  const Icon = paused ? Play : Pause;
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label || (paused ? "Resume" : "Pause")} scaleTo={0.9} style={[styles.roundBtn, { width: size, height: size, borderRadius: size / 2 }]}>
      <Icon size={22} color="#fff" fill="#fff" />
    </PressableScale>
  );
}

// ── Overview ─────────────────────────────────────────────────────────────────

export function MapPanel({ km, avgPace, steps, xp, out, goalKm, paused, onPause, onFinish, bottomInset }) {
  const pc = goalKm ? Math.min(1, km / goalKm) : 0;
  return (
    <MapSheet bottomInset={bottomInset}>
      <View style={styles.bigRow}>
        <View>
          <Text style={styles.small}>Distance</Text>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text style={styles.bigKm}>{km.toFixed(2)}</Text>
            <Text style={styles.bigUnit}>KM</Text>
          </View>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.small}>Avg pace</Text>
          <Text style={styles.pace}>{formatPace(avgPace)}</Text>
        </View>
      </View>
      <Dash
        boxed
        size={21}
        items={[
          { value: formatNumber(steps), label: "Steps" },
          { value: `+${xp}`, label: "XP", icon: <Zap size={14} color={C.accent} fill={C.accent} /> },
          { value: `+${out}`, label: "OUT", icon: <Coin size={15} /> },
        ]}
      />
      {goalKm ? (
        <View style={{ gap: 6 }}>
          <View style={styles.goalRow}>
            <Text style={styles.small}>{`Goal ${goalKm % 1 ? goalKm.toFixed(1) : goalKm} km`}</Text>
            <Text style={styles.small}>{`${Math.round(pc * 100)}%`}</Text>
          </View>
          <AnimatedBar value={pc} height={6} colour={C.accent} track="rgba(255,255,255,0.1)" />
        </View>
      ) : null}
      <View style={styles.controls}>
        <RoundPause paused={paused} onPress={onPause} />
        <Button title={out > 0 ? `Finish and claim ${out} OUT` : "Finish"} onPress={onFinish} style={{ flex: 1, height: 56 }} />
      </View>
    </MapSheet>
  );
}

// ── Press and hold to finish ─────────────────────────────────────────────────

function HoldRing({ size = 108, onHoldChange, onDone }) {
  const [p, setP] = useState(0);
  const raf = useRef(null);
  const startAt = useRef(0);
  const done = useRef(false);

  const stop = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
  };
  useEffect(() => stop, []);

  const tick = () => {
    const v = Math.min(1, (Date.now() - startAt.current) / HOLD_MS);
    setP(v);
    if (v >= 1) {
      stop();
      if (!done.current) {
        done.current = true;
        hapticSuccess();
        onDone();
      }
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };

  const down = () => {
    hapticImpact();
    done.current = false;
    startAt.current = Date.now();
    onHoldChange(true, HOLD_MS);
    stop();
    raf.current = requestAnimationFrame(tick);
  };
  const up = () => {
    stop();
    if (!done.current) {
      setP(0);
      onHoldChange(false);
    }
  };

  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  return (
    <Pressable onPressIn={down} onPressOut={up} accessibilityRole="button" accessibilityLabel="Hold to finish" accessibilityHint="Press and hold to finish the run">
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,77,85,0.22)" strokeWidth={8} fill="none" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={C.danger}
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circ}`}
            strokeDashoffset={circ * (1 - p)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={[styles.holdCore, { width: size - 30, height: size - 30, borderRadius: (size - 30) / 2, transform: [{ scale: 1 - p * 0.06 }] }]}>
          <Square size={18} color="#fff" fill="#fff" />
        </View>
      </View>
    </Pressable>
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
    <Glass style={[styles.floatPanel, { bottom }]} radius={26}>
      <Dash
        size={26}
        items={[
          { value: km.toFixed(2), label: "km" },
          { value: formatPace(pace), label: "Pace" },
          { value: `+${out}`, label: "OUT" },
        ]}
      />
      <View style={styles.holdRow}>
        <PressableScale onPress={onPause} accessibilityLabel={paused ? "Resume" : "Pause"} style={styles.sideBtn}>
          {paused ? <Play size={18} color="#fff" fill="#fff" /> : <Pause size={18} color="#fff" fill="#fff" />}
          <Text style={styles.sideText}>{paused ? "Resume" : "Pause"}</Text>
        </PressableScale>
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
        <PressableScale onPress={onLock} accessibilityLabel="Lock the screen" style={styles.sideBtn}>
          <Lock size={18} color="#fff" />
          <Text style={styles.sideText}>Lock</Text>
        </PressableScale>
      </View>
      <View style={{ alignItems: "center", gap: 3 }}>
        <Text style={styles.holdTitle}>{holding ? "Keep holding to finish" : "Hold to finish"}</Text>
        <Text style={styles.holdSub}>{holding ? (left < 1000 ? "Less than a second to go. Let go to keep running." : "Let go to keep running.") : "Press and hold the red button. A tap won't end your run."}</Text>
      </View>
    </Glass>
  );
}

// ── Pilot and street ─────────────────────────────────────────────────────────

export function PilotPanel({ seconds, km, pace, paused, onPause, arriveLabel, onFinish, bottom }) {
  return (
    <Glass style={[styles.floatPanel, { bottom }]} radius={26}>
      <Dash
        size={30}
        items={[
          { value: formatDuration(seconds), label: "Time" },
          { value: km.toFixed(2), label: "km" },
          { value: formatPace(pace), label: "Pace" },
        ]}
      />
      <View style={styles.controls}>
        <RoundPause paused={paused} onPress={onPause} size={52} />
        <Button title={arriveLabel || "Finish"} onPress={onFinish} style={{ flex: 1, height: 52 }} />
      </View>
    </Glass>
  );
}

export function StreetPanel({ pace, km, cadence, out, onPress, bottom }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.99} accessibilityLabel="Show controls" style={[styles.floatPanel, { bottom, padding: 0 }]}>
      <Glass radius={26} style={{ alignItems: "center", paddingVertical: S.lg, paddingHorizontal: S.lg }}>
        <Text style={styles.kick}>Live dash</Text>
        <Text style={styles.streetPace} numberOfLines={1} adjustsFontSizeToFit>
          {formatPace(pace)}
        </Text>
        <Text style={styles.small}>Current pace per km</Text>
        <Dash
          style={{ marginTop: S.lg, alignSelf: "stretch" }}
          size={26}
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

export function OffRoutePanel({ km, seconds, out, paused, onPause, onEndRoute, bottom }) {
  return (
    <Glass style={[styles.floatPanel, { bottom }]} radius={26}>
      <View style={styles.reroute}>
        <View style={styles.spin} />
        <Text style={styles.rerouteText}>Rerouting. Your steps and distance still count, we're just finding the way back.</Text>
      </View>
      <Dash
        size={28}
        items={[
          { value: km.toFixed(2), label: "km" },
          { value: formatDuration(seconds), label: "Time" },
          { value: `+${out}`, label: "OUT" },
        ]}
      />
      <View style={styles.controls}>
        <Button title="End route, keep running" variant="secondary" onPress={onEndRoute} style={{ flex: 1, height: 52, backgroundColor: "rgba(255,255,255,0.1)" }} />
        <RoundPause paused={paused} onPress={onPause} size={52} />
      </View>
    </Glass>
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
    <Glass style={[styles.floatPanel, { bottom }]} radius={26}>
      <Dash
        size={28}
        items={[
          { value: km.toFixed(2), label: "km" },
          { value: formatPace(pace), label: "Pace" },
          { value: `+${out}`, label: "OUT" },
        ]}
      />
      <View style={styles.controls}>
        <Button title="Finish" variant="secondary" onPress={onFinish} style={{ flex: 1, height: 52, backgroundColor: "rgba(255,255,255,0.1)" }} />
        <Button title="Resume" icon={Play} onPress={onResume} style={{ flex: 1, height: 52 }} />
      </View>
    </Glass>
  );
}

// ── GPS lost ─────────────────────────────────────────────────────────────────

export function GpsLostCard({ top }) {
  return (
    <Glass style={[styles.gpsCard, { top }]} radius={26}>
      <Image source={MOVE_IMAGES.gpsLost} style={styles.gpsImg} contentFit="cover" />
      <View style={styles.gpsText}>
        <Text style={styles.gpsTitle}>Signal lost</Text>
        <Text style={styles.gpsSub}>Steps are still counting. We'll fill in your distance when GPS is back.</Text>
      </View>
    </Glass>
  );
}

export function GpsLostPanel({ steps, lastKm, out, paused, onPause, onKeepGoing, bottomInset }) {
  return (
    <MapSheet bottomInset={bottomInset}>
      <Dash
        boxed
        size={22}
        items={[
          { value: formatNumber(steps), label: "Steps" },
          { value: `${lastKm.toFixed(1)} km`, label: "Last fix" },
          { value: `+${out}`, label: "OUT", icon: <Coin size={15} /> },
        ]}
      />
      <View style={styles.controls}>
        <RoundPause paused={paused} onPress={onPause} />
        <Button title="Keep going" onPress={onKeepGoing} style={{ flex: 1, height: 56 }} />
      </View>
    </MapSheet>
  );
}

// ── Ghost ────────────────────────────────────────────────────────────────────

export function GhostChip({ diffM, top }) {
  const ahead = diffM >= 0;
  const m = Math.abs(Math.round(diffM / 10) * 10);
  return (
    <Glass style={[styles.ghost, { top }]} radius={18}>
      <View style={styles.ghostIcon}>
        <Ghost size={18} color={C.accentHi} />
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
      <PressableScale onLongPress={onUnlock} onPress={() => hapticImpact()} accessibilityLabel="Hold to unlock" style={[styles.unlock, { bottom }]}>
        <Unlock size={18} color="#fff" />
        <Text style={styles.unlockText}>Hold to unlock</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  small: { color: C.textDim, fontFamily: F.body, fontSize: 13 },
  kick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" },
  bigRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  bigKm: { color: C.text, fontFamily: F.display, fontSize: 84, lineHeight: 86, letterSpacing: -1, fontVariant: ["tabular-nums"] },
  bigUnit: { color: C.textDim, fontFamily: F.display, fontSize: 24, marginLeft: 4 },
  pace: { color: C.text, fontFamily: F.display, fontSize: 36, fontVariant: ["tabular-nums"] },
  goalRow: { flexDirection: "row", justifyContent: "space-between" },
  controls: { flexDirection: "row", alignItems: "center", gap: 10 },
  roundBtn: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)" },
  floatPanel: { position: "absolute", left: S.lg, right: S.lg, padding: S.lg, gap: S.lg },
  holdRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: S.sm },
  holdCore: { backgroundColor: C.danger, alignItems: "center", justifyContent: "center", shadowColor: C.danger, shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } },
  sideBtn: { width: 66, height: 66, borderRadius: 33, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", gap: 3 },
  sideText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 11 },
  holdTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 16 },
  holdSub: { color: C.textDim, fontFamily: F.body, fontSize: 12.5, textAlign: "center" },
  streetPace: { color: C.text, fontFamily: F.display, fontSize: 120, lineHeight: 118, marginTop: 6, fontVariant: ["tabular-nums"] },
  reroute: { flexDirection: "row", alignItems: "center", gap: 10 },
  rerouteText: { flex: 1, color: C.textSoft, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
  spin: { width: 18, height: 18, borderRadius: 9, borderWidth: 2.5, borderColor: C.accent, borderRightColor: "transparent" },
  pausedWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  pausedWord: { color: "#fff", fontFamily: F.display, fontSize: 96, lineHeight: 96, textTransform: "uppercase", letterSpacing: 1 },
  pausedSub: { color: "rgba(255,255,255,0.8)", fontFamily: F.body, fontSize: 14, marginTop: 6 },
  gpsCard: { position: "absolute", left: S.xxl + 8, right: S.xxl + 8, overflow: "hidden" },
  gpsImg: { width: "100%", height: 160, opacity: 0.85 },
  gpsText: { padding: S.lg, alignItems: "center", gap: 6 },
  gpsTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 17 },
  gpsSub: { color: C.textSoft, fontFamily: F.body, fontSize: 13, lineHeight: 18, textAlign: "center" },
  ghost: { position: "absolute", left: S.lg, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12 },
  ghostIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(61,139,255,0.18)", alignItems: "center", justifyContent: "center" },
  ghostTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  ghostSub: { color: C.textSoft, fontFamily: F.body, fontSize: 12.5 },
  unlock: { position: "absolute", alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, height: 50, paddingHorizontal: 22, borderRadius: R.full, backgroundColor: "rgba(18,22,30,0.92)" },
  unlockText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 15 },
});
