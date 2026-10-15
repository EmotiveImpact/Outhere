// Pieces shared by the run summary, run history, run detail and routes:
// the slab hero with a map or object, three stat cards, the earn chips, the
// "How did it feel?" slider, splits with the fastest km lit and the climb
// chart.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";
import { Footprints, TrendingUp, Zap } from "lucide-react-native";
import { C, F, PressableScale, S } from "@/components/ui";
import { Coin } from "@/components/profile/shared";
import { formatNumber, formatPace } from "@/utils/format";
import { hapticSelection } from "@/services/haptics";
import RunMap from "./RunMap";

/** Rounded slab at the top of a page: a route (or an object) behind a two-tone headline. */
export function Slab({ route, object, kicker, top: line1, bottom: line2, height = 280, left, right, children }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.slab, { height: height + insets.top }]}>
      {route?.length > 1 ? (
        <RunMap style={StyleSheet.absoluteFill} fitTo={route} plannedPath={route} plannedStyle="solid" waypoints={[route[0]]} interactive={false} showsUser={false} padding={{ top: insets.top + 56, right: 40, bottom: Math.round(height * 0.5), left: 130 }} />
      ) : null}
      {object ? <Image source={object} style={[styles.object, { top: insets.top + 8 }]} contentFit="contain" /> : null}
      <LinearGradient colors={["rgba(7,9,12,0.25)", "rgba(7,9,12,0)", "rgba(7,9,12,0.92)"]} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={[styles.slabTop, { top: insets.top + 6 }]}>
        <View>{left}</View>
        <View>{right}</View>
      </View>
      <View style={styles.slabText}>
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        {line1 ? (
          <Text style={styles.headline} numberOfLines={1} adjustsFontSizeToFit>
            {line1}
          </Text>
        ) : null}
        {line2 ? (
          <Text style={[styles.headline, { color: C.accent }]} numberOfLines={1} adjustsFontSizeToFit>
            {line2}
          </Text>
        ) : null}
        {children}
      </View>
    </View>
  );
}

/** Splits a two word title over the two headline lines. */
export const twoLines = (title = "") => {
  const words = String(title).trim().split(/\s+/);
  if (words.length < 2) return [title, ""];
  const cut = Math.ceil(words.length / 2);
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
};

export function StatCards({ items }) {
  return (
    <View style={styles.cards}>
      {items.map((it) => (
        <View key={it.label} style={styles.card}>
          <Text style={[styles.cardValue, it.accent && { color: C.accentHi }]} numberOfLines={1} adjustsFontSizeToFit>
            {it.value}
          </Text>
          <Text style={styles.cardLabel}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function EarnChips({ xp, out, steps, climbM }) {
  return (
    <View style={styles.earn}>
      <View style={styles.chip}>
        <Zap size={16} color={C.accentHi} />
        <Text style={styles.chipText}>{`+${formatNumber(xp)} XP`}</Text>
      </View>
      <View style={styles.chip}>
        <Coin size={16} />
        <Text style={styles.chipText}>{`+${formatNumber(out)} OUT`}</Text>
      </View>
      {climbM != null ? (
        <View style={styles.chip}>
          <TrendingUp size={16} color={C.accentHi} />
          <Text style={styles.chipText}>{`${climbM} m climb`}</Text>
        </View>
      ) : (
        <View style={styles.chip}>
          <Footprints size={16} color={C.accentHi} />
          <Text style={styles.chipText}>{formatNumber(steps)}</Text>
        </View>
      )}
    </View>
  );
}

export const FEELS = ["Rough", "Tough", "Solid", "Great", "Amazing"];

/** Five stops from Rough to Amazing. value is 1 to 5, or null. */
export function FeelSlider({ value, onChange, disabled }) {
  const v = value || 0;
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.feelHead}>
        <Text style={styles.feelQ}>How did it feel?</Text>
        <Text style={styles.feelA}>{v ? FEELS[v - 1] : ""}</Text>
      </View>
      <View style={styles.track} accessibilityRole="adjustable" accessibilityLabel="How did it feel?" accessibilityValue={{ text: v ? FEELS[v - 1] : "Not set" }}>
        <View style={styles.trackBase} />
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.tick, { left: `${i * 25}%` }]} />
        ))}
        <View style={[styles.trackFill, { width: v ? `${((v - 1) / 4) * 100}%` : 0 }]} />
        {v ? <View style={[styles.knob, { left: `${((v - 1) / 4) * 100}%` }]} /> : null}
        <View style={styles.hits}>
          {FEELS.map((f, i) => (
            <PressableScale
              key={f}
              disabled={disabled}
              haptic={false}
              onPress={() => {
                hapticSelection();
                onChange(i + 1);
              }}
              accessibilityLabel={f}
              style={styles.hit}
            />
          ))}
        </View>
      </View>
      <View style={styles.feelLabels}>
        {FEELS.map((f, i) => (
          <Text key={f} style={[styles.feelLabel, v === i + 1 && { color: C.text, fontFamily: F.bodySemi }]}>
            {f}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function Splits({ splits }) {
  if (!splits?.length) return null;
  const secs = splits.map((s) => s.sec);
  const fast = Math.min(...secs);
  const slow = Math.max(...secs);
  const fastest = splits.find((s) => s.fastest);
  return (
    <View style={styles.box}>
      <View style={styles.boxHead}>
        <Text style={styles.boxTitle}>Splits</Text>
        {fastest ? <Text style={styles.boxSide}>{`Fastest km ${fastest.km} · ${formatPace(fastest.sec)}`}</Text> : null}
      </View>
      {splits.map((s) => {
        const w = slow === fast ? 0.7 : 0.35 + (0.65 * (slow - s.sec)) / (slow - fast);
        return (
          <View key={s.km} style={styles.split}>
            <Text style={styles.splitN}>{s.km}</Text>
            <View style={{ flex: 1 }}>
              <View style={[styles.splitBar, { width: `${Math.round(w * 100)}%` }, s.fastest && styles.splitBarOn]} />
            </View>
            <Text style={[styles.splitT, s.fastest && { color: C.accentHi }]}>{formatPace(s.sec)}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function ClimbChart({ profile, climbM, note }) {
  if (!profile?.length) return null;
  const w = 300;
  const h = 50;
  const min = Math.min(...profile);
  const max = Math.max(...profile);
  const span = Math.max(4, max - min);
  const pts = profile.map((a, i) => [(i / (profile.length - 1)) * w, h - 6 - ((a - min) / span) * (h - 14)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <View style={styles.box}>
      <View style={styles.boxHead}>
        <Text style={styles.boxTitle}>Climb</Text>
        <Text style={styles.boxSide}>{[climbM != null ? `${climbM} m` : null, note].filter(Boolean).join(" · ")}</Text>
      </View>
      <Svg width="100%" height={56} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <Defs>
          <SvgGradient id="climb" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={C.accent} stopOpacity="0.45" />
            <Stop offset="1" stopColor={C.accent} stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <Path d={`${line} L${w} ${h} L0 ${h} Z`} fill="url(#climb)" />
        <Path d={line} stroke={C.accentHi} strokeWidth={2} fill="none" />
      </Svg>
    </View>
  );
}

const clock12 = (d) => `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}${d.getHours() < 12 ? "am" : "pm"}`;

/** "Today, 6:12am", "Yesterday", "Sunday" this week, then "12 Oct". */
export const whenLabel = (ms, { time = false } = {}) => {
  const d = new Date(Number(ms));
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const ago = Math.round((today - day) / 86400000);
  const base =
    ago === 0
      ? "Today"
      : ago === 1
        ? "Yesterday"
        : ago < 7
          ? d.toLocaleDateString("en-GB", { weekday: "long" })
          : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : null) });
  return time ? `${base}, ${clock12(d)}` : base;
};

const styles = StyleSheet.create({
  slab: { backgroundColor: "#0b0e13", borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: "hidden", justifyContent: "flex-end" },
  object: { position: "absolute", right: -40, width: 240, height: 240 },
  slabTop: { position: "absolute", left: S.lg, right: S.lg, flexDirection: "row", justifyContent: "space-between" },
  slabText: { paddingHorizontal: S.gutter, paddingBottom: S.xl },
  kicker: { color: C.accent, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase", marginBottom: 6 },
  headline: { color: C.text, fontFamily: F.display, fontSize: 52, lineHeight: 52, textTransform: "uppercase" },
  cards: { flexDirection: "row", gap: 10 },
  card: { flex: 1, backgroundColor: C.surface, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  cardValue: { color: C.text, fontFamily: F.display, fontSize: 28, fontVariant: ["tabular-nums"] },
  cardLabel: { color: C.textDim, fontFamily: F.body, fontSize: 12.5, marginTop: 2 },
  earn: { flexDirection: "row", gap: 8 },
  chip: { flex: 1, height: 46, borderRadius: 14, backgroundColor: "rgba(61,139,255,0.12)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  chipText: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 14 },
  feelHead: { flexDirection: "row", justifyContent: "space-between" },
  feelQ: { color: C.textSoft, fontFamily: F.body, fontSize: 14 },
  feelA: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  track: { height: 28, justifyContent: "center", marginHorizontal: 12 },
  trackBase: { position: "absolute", left: 0, right: 0, height: 6, borderRadius: 3, backgroundColor: C.surfaceHigh },
  tick: { position: "absolute", width: 10, height: 10, borderRadius: 5, marginLeft: -5, backgroundColor: C.surfaceHigh },
  trackFill: { position: "absolute", left: 0, height: 6, borderRadius: 3, backgroundColor: C.accent },
  knob: { position: "absolute", width: 28, height: 28, borderRadius: 14, marginLeft: -14, backgroundColor: "#fff", borderWidth: 4, borderColor: C.accent, shadowColor: C.accent, shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  hits: { ...StyleSheet.absoluteFillObject, flexDirection: "row", marginHorizontal: -12, backgroundColor: "transparent" },
  hit: { flex: 1, height: 28 },
  feelLabels: { flexDirection: "row", justifyContent: "space-between" },
  feelLabel: { color: C.textDim, fontFamily: F.body, fontSize: 12.5, width: 64, textAlign: "center" },
  box: { backgroundColor: C.surface, borderRadius: 20, padding: S.lg, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  boxHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  boxTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  boxSide: { color: C.textDim, fontFamily: F.body, fontSize: 13 },
  split: { flexDirection: "row", alignItems: "center", gap: 12, height: 20 },
  splitN: { color: C.textDim, fontFamily: F.body, fontSize: 13, width: 18 },
  splitBar: { height: 7, borderRadius: 4, backgroundColor: "rgba(61,139,255,0.45)" },
  splitBarOn: { backgroundColor: C.accent, shadowColor: C.accent, shadowOpacity: 0.7, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  splitT: { color: C.text, fontFamily: F.bodySemi, fontSize: 13, width: 48, textAlign: "right", fontVariant: ["tabular-nums"] },
});

