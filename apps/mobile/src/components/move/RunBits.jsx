// Pieces shared by the run summary, run history, run detail, routes and
// safety, in the prototype's finish: the slab hero (.slab) with the route lit
// on the night map or an object blended in, three lit stat cards (.grid3),
// the earn chips (.earn), the "How did it feel?" slider, splits with the
// fastest km lit (.splits) and the climb chart.

import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";
import { Footprints, TrendingUp, Zap } from "lucide-react-native";
import { BlendImage, C, F, FINISH, GlowBackdrop, Grain, PressableScale, splitShadow } from "@/components/ui";
import { Coin } from "@/components/profile/shared";
import { formatNumber, formatPace } from "@/utils/format";
import { hapticSelection } from "@/services/haptics";
import { MapArt } from "./MapTexture";

const EDGE = splitShadow(FINISH.slabEdge);

/** A lit card (.card in the finish): the lit gradient, a bright top edge and a long soft shadow. */
export function LitCard({ children, style, radius = 20 }) {
  const flat = StyleSheet.flatten(style) || {};
  return (
    <View style={[styles.lit, { borderRadius: radius }, flat]}>
      {/* Behind the content (zIndex -1), so icons and charts draw over the light on the web too. */}
      <LinearGradient colors={["#191d24", "#12151a"]} style={[StyleSheet.absoluteFill, styles.under, { borderRadius: radius }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.under, { borderRadius: radius, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 0 1px rgba(255,255,255,0.03)" }]} />
      {children}
    </View>
  );
}

/**
 * The slab at the top of a page (.slab). height is the prototype's, from the
 * top of the phone; the status bar is added on top. route: lit on the night
 * map (lines adds more, e.g. a red stretch). object: blended in on the right
 * (objectSize, objectStyle: { right, top } in the prototype's px).
 * kicker, top and bottom: the two-tone headline. left and right: the round
 * controls at the top.
 */
export function Slab({ route, lines, face, object, objectSize = 200, objectStyle, kicker, top: line1, bottom: line2, height = 280, size = 44, left, right, mapPad, children }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const h = height - 14 + insets.top;
  const hasMap = route?.length > 1;
  // The route fills the slab above the headline, like the prototype's.
  const pad = mapPad || { top: insets.top + 44, right: 28, bottom: Math.round(h * 0.4), left: 28 };
  const place = { right: -30, top: 14, ...objectStyle };
  return (
    <View style={[styles.slabWrap, { boxShadow: EDGE.outer }]}>
      <View style={[styles.slab, { height: h }]}>
        {hasMap ? (
          <>
            <MapArt width={width} height={h} lines={lines || [{ path: route, width: 9 }]} fit={route} face={face} pad={pad} shadeTop={0.6} shadeBottom={0.7} style={StyleSheet.absoluteFill} />
            {/* .veil2 */}
            <LinearGradient colors={["rgba(3,5,10,0)", "rgba(3,5,10,0.85)"]} locations={[0.4, 0.88]} style={StyleSheet.absoluteFill} pointerEvents="none" />
          </>
        ) : (
          <GlowBackdrop preset="slab" />
        )}
        {object && !hasMap ? <BlendImage source={object} size={objectSize} mask={[0.5, 0.71]} style={[styles.object, { right: place.right, top: insets.top - 14 + place.top }]} /> : null}
        <Grain amount={0.06} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.slabRound, { boxShadow: EDGE.inset }]} />
        <View style={[styles.slabTop, { top: insets.top + 8 }]} pointerEvents="box-none">
          <View>{left}</View>
          <View>{right}</View>
        </View>
        <View style={styles.slabText} pointerEvents="box-none">
          {kicker ? (
            <Text style={styles.kicker} numberOfLines={1}>
              {kicker}
            </Text>
          ) : null}
          {line1 ? (
            <Text style={[styles.headline, { fontSize: size, lineHeight: size * 0.92 }, styles.first]} numberOfLines={1} adjustsFontSizeToFit>
              {line1}
            </Text>
          ) : null}
          {line2 ? (
            <Text style={[styles.headline, { fontSize: size, lineHeight: size * 0.92, color: "#4b93ff" }]} numberOfLines={1} adjustsFontSizeToFit>
              {line2}
            </Text>
          ) : null}
          {children}
        </View>
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

/** .grid3: three lit cards, the number big and the label under it. */
export function StatCards({ items }) {
  return (
    <View style={styles.cards}>
      {items.map((it) => (
        <LitCard key={it.label} style={styles.card}>
          <Text style={[styles.cardValue, it.accent && { color: C.accentHi }]} numberOfLines={1} adjustsFontSizeToFit>
            {it.value}
          </Text>
          <Text style={styles.cardLabel} numberOfLines={1}>
            {it.label}
          </Text>
        </LitCard>
      ))}
    </View>
  );
}

/** .earn: what it earned, in blue. */
export function EarnChips({ xp, out, steps, climbM }) {
  return (
    <View style={styles.earn}>
      <View style={styles.chip}>
        <Zap size={16} color={C.accent} />
        <Text style={styles.chipText}>{`+${formatNumber(xp)} XP`}</Text>
      </View>
      <View style={styles.chip}>
        <Coin size={16} />
        <Text style={styles.chipText}>{`+${formatNumber(out)} OUT`}</Text>
      </View>
      {climbM != null ? (
        <View style={styles.chip}>
          <TrendingUp size={16} color={C.accent} />
          <Text style={styles.chipText}>{`${climbM} m climb`}</Text>
        </View>
      ) : (
        <View style={styles.chip}>
          <Footprints size={16} color={C.accent} />
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
  const at = v ? `${((v - 1) / 4) * 100}%` : 0;
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.feelHead}>
        <Text style={styles.feelQ}>How did it feel?</Text>
        <Text style={styles.feelA}>{v ? FEELS[v - 1] : ""}</Text>
      </View>
      <View style={styles.track} accessibilityRole="adjustable" accessibilityLabel="How did it feel?" accessibilityValue={{ text: v ? FEELS[v - 1] : "Not set" }}>
        <View style={styles.trackBase} />
        {v ? (
          <View style={[styles.trackFill, { width: at }]}>
            <LinearGradient colors={FINISH.bar || ["#2a6af0", "#4b93ff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          </View>
        ) : null}
        {v ? <View style={[styles.knob, { left: at }]} /> : null}
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
          <Text key={f} style={[styles.feelLabel, i === 0 && { textAlign: "left" }, i === 4 && { textAlign: "right" }, v === i + 1 && { color: C.text, fontFamily: F.bodySemi }]}>
            {f}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** .splits: each km, the fastest one lit. */
export function Splits({ splits }) {
  if (!splits?.length) return null;
  const secs = splits.map((s) => s.sec);
  const fast = Math.min(...secs);
  const slow = Math.max(...secs);
  const fastest = splits.find((s) => s.fastest);
  return (
    <LitCard style={styles.splits}>
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
            <Text style={[styles.splitT, s.fastest && { color: C.accent }]}>{formatPace(s.sec)}</Text>
          </View>
        );
      })}
    </LitCard>
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
    <LitCard style={styles.box}>
      <View style={styles.boxHead}>
        <Text style={styles.boxTitle}>Climb</Text>
        <Text style={styles.boxSide}>{[climbM != null ? `${climbM} m` : null, note].filter(Boolean).join(" · ")}</Text>
      </View>
      <Svg width="100%" height={46} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <Defs>
          <SvgGradient id="climb" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={C.accent} stopOpacity="0.45" />
            <Stop offset="1" stopColor={C.accent} stopOpacity="0" />
          </SvgGradient>
        </Defs>
        <Path d={`${line} L${w} ${h} L0 ${h} Z`} fill="url(#climb)" />
        <Path d={line} stroke={C.accentHi} strokeWidth={2} fill="none" />
      </Svg>
    </LitCard>
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
  lit: { overflow: "hidden", zIndex: 0, boxShadow: "0 18px 30px -18px rgba(0,0,0,0.85)" },
  under: { zIndex: -1 },
  // .slab: radius 0 0 34 34, lit along its lower edge
  slabWrap: { borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  slab: { backgroundColor: "#030407", borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: "hidden" },
  slabRound: { borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  object: { position: "absolute" },
  slabTop: { position: "absolute", left: 18, right: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  // .slab .hl: 18 in, 22 up
  slabText: { position: "absolute", left: 18, right: 18, bottom: 22 },
  kicker: { color: "#82b4ff", fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase" },
  headline: { color: "#fff", fontFamily: F.display, textTransform: "uppercase", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 30, textShadowOffset: { width: 0, height: 2 } },
  first: { marginTop: 7 },
  // .grid3
  cards: { flexDirection: "row", gap: 8 },
  card: { flex: 1, padding: 12 },
  cardValue: { color: C.text, fontFamily: F.display, fontSize: 24, lineHeight: 24, fontVariant: ["tabular-nums"], marginBottom: 4 },
  cardLabel: { color: C.textDim, fontFamily: F.body, fontSize: 10.5 },
  // .earn
  earn: { flexDirection: "row", gap: 8 },
  chip: { flex: 1, paddingVertical: 10, borderRadius: 14, backgroundColor: "rgba(61,139,255,0.13)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  chipText: { color: C.accent, fontFamily: F.bodySemi, fontSize: 13 },
  feelHead: { flexDirection: "row", justifyContent: "space-between" },
  feelQ: { color: C.textSoft, fontFamily: F.body, fontSize: 13 },
  feelA: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  track: { height: 28, justifyContent: "center", marginHorizontal: 0 },
  trackBase: { position: "absolute", left: 0, right: 0, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5)" },
  trackFill: { position: "absolute", left: 0, height: 6, borderRadius: 3, overflow: "hidden", boxShadow: "0 0 10px rgba(61,139,255,0.6)" },
  // .feel .track b: white, ringed in blue
  knob: { position: "absolute", width: 24, height: 24, borderRadius: 12, marginLeft: -12, backgroundColor: "#fff", boxShadow: "0 0 0 5px #3d8bff, 0 0 18px rgba(61,139,255,0.6), 0 4px 12px rgba(0,0,0,0.3)" },
  hits: { ...StyleSheet.absoluteFill, flexDirection: "row", marginHorizontal: -12, backgroundColor: "transparent" },
  hit: { flex: 1, height: 28 },
  feelLabels: { flexDirection: "row", justifyContent: "space-between" },
  feelLabel: { color: C.textDim, fontFamily: F.body, fontSize: 10.5, flex: 1, textAlign: "center" },
  // .splits
  splits: { paddingVertical: 12, paddingHorizontal: 14, gap: 5 },
  box: { padding: 14, gap: 8 },
  boxHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  boxTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 12.5 },
  boxSide: { color: C.textDim, fontFamily: F.body, fontSize: 11 },
  split: { flexDirection: "row", alignItems: "center", gap: 8, height: 14 },
  splitN: { color: C.textSoft, fontFamily: F.body, fontSize: 10.5, width: 14 },
  splitBar: { height: 7, borderRadius: 5, backgroundColor: "#22406f" },
  splitBarOn: { backgroundColor: C.accent, boxShadow: "0 0 8px rgba(61,139,255,0.8)" },
  splitT: { color: C.text, fontFamily: F.bodySemi, fontSize: 10.5, width: 38, textAlign: "right", fontVariant: ["tabular-nums"] },
});
