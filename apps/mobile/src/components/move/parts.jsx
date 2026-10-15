// Floating pieces the Move screens share: the round glass buttons and the
// status chip at the top, glass panels and the bottom sheet, the three number
// dash, the Map / Pilot / Street switch, the turn banner and a toggle row.
// Sizes, glass and light are the prototype's own (.gl, .round.glass, .rec,
// .m-top, .sheet, .dash, .trio, .modes, .turn).

import React, { useEffect } from "react";
import { Platform, StyleSheet, Switch, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { CornerUpLeft, CornerUpRight, MoveUp, Undo2 } from "lucide-react-native";
import { C, F, PressableScale, R, S } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";

export const GLASS = "rgba(10,14,20,0.64)";
const BLUR = Platform.OS === "ios" || Platform.OS === "web";
const EDGE = "inset 0 0 0 1px rgba(255,255,255,0.1)";

/** The edge of the glass, drawn above the content (an inset shadow paints under children). */
const Edge = ({ radius, shadow = EDGE }) => <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: shadow }]} />;

/** .gl: dark glass over the map, blurred where the platform can, with a faint edge. */
export function Glass({ children, style, radius = 24, intensity = 70 }) {
  return (
    <View style={[{ borderRadius: radius, overflow: "hidden", backgroundColor: BLUR ? "rgba(10,14,20,0.5)" : GLASS }, style]}>
      {BLUR ? <BlurView tint="dark" intensity={intensity} style={StyleSheet.absoluteFill} /> : null}
      {children}
      <Edge radius={radius} />
    </View>
  );
}

/** .round.glass: a 38 pt round glass button. tone="accent" lights it blue. */
export function RoundGlass({ icon: Icon, onPress, label, tone, size = 38, style }) {
  const on = tone === "accent";
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} scaleTo={0.9} hitSlop={8} style={[styles.round, { width: size, height: size, borderRadius: size / 2 }, on && styles.roundOn, style]}>
      {BLUR && !on ? <BlurView tint="dark" intensity={60} style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]} /> : null}
      <View>
        <Icon size={Math.round(size * 0.47)} color="#fff" strokeWidth={2} />
      </View>
      <Edge radius={size / 2} shadow={on ? "inset 0 1px 0 rgba(255,255,255,0.34), inset 0 0 0 1px rgba(130,180,255,0.4)" : EDGE} />
    </PressableScale>
  );
}

/** The live dot: blue with a ping (html[data-finish="new"] .rec .dot). */
export function PingDot({ colour = C.out, size = 7 }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false);
  }, [reduce, t]);
  const ring = useAnimatedStyle(() => ({ opacity: t.value < 0.8 ? 0.65 * (1 - t.value / 0.8) : 0, transform: [{ scale: 1 + Math.min(1, t.value / 0.8) * 2.6 }] }));
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size, backgroundColor: colour }, ring]} />
      <View style={[StyleSheet.absoluteFill, { borderRadius: size, backgroundColor: colour, boxShadow: `0 0 8px ${colour}` }]} />
    </View>
  );
}

/** .rec: "● LIVE 24:18" style chip. tone: accent | danger | warn | none */
export function RecChip({ children, tone = "accent", icon: Icon, onPress, label }) {
  const dot = tone === "danger" ? C.danger : tone === "warn" ? C.warn : C.out;
  const danger = tone === "danger";
  const body = (
    <View style={[styles.chip, danger && styles.chipDanger]}>
      {BLUR && !danger ? <BlurView tint="dark" intensity={60} style={[StyleSheet.absoluteFill, { borderRadius: R.full }]} /> : null}
      {Icon ? (
        <View>
          <Icon size={14} color="#fff" />
        </View>
      ) : tone !== "none" ? (
        <PingDot colour={dot} />
      ) : null}
      <Text style={[styles.chipText, danger && { color: "#ffb3b7" }]} numberOfLines={1}>
        {children}
      </Text>
      <Edge radius={R.full} shadow={danger ? "inset 0 0 0 1px rgba(255,77,85,0.45)" : EDGE} />
    </View>
  );
  if (!onPress) return body;
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} scaleTo={0.96}>
      {body}
    </PressableScale>
  );
}

/** .m-top: left button, centre chip, right button, 22 from the top. */
export function TopBar({ top, left, centre, right }) {
  return (
    <View style={[styles.topBar, { paddingTop: top }]} pointerEvents="box-none">
      <View style={styles.side}>{left}</View>
      <View style={styles.centre} pointerEvents="box-none">
        {centre}
      </View>
      <View style={[styles.side, { alignItems: "flex-end" }]}>{right}</View>
    </View>
  );
}

/** .sheet: the dark sheet over the bottom of the map, with its handle. */
export function MapSheet({ children, style, bottomInset = 0 }) {
  return (
    <View style={[styles.sheet, { paddingBottom: 30 + Math.max(0, bottomInset - 14) }, style]}>
      <View style={styles.handle} />
      {children}
    </View>
  );
}

/**
 * Three numbers in a row with hairlines between (.dash). boxed is the
 * prototype's .trio: a card with smaller, Inter numbers.
 * items: [{ value, label, accent, icon }]
 */
export function Dash({ items, size, style, boxed = false }) {
  const fs = size || (boxed ? 15 : 28);
  return (
    <View style={[styles.dash, boxed && styles.dashBox, style]}>
      {items.map((it, i) => (
        <View key={it.label} style={[styles.dashCell, i > 0 && (boxed ? styles.dashRuleBox : styles.dashRule)]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            {it.icon ? <View>{it.icon}</View> : null}
            <Text style={[boxed ? styles.trioValue : styles.dashValue, { fontSize: fs, lineHeight: boxed ? fs * 1.25 : fs * 0.95 }, it.accent && { color: C.accentHi }]} numberOfLines={1} adjustsFontSizeToFit>
              {it.value}
            </Text>
          </View>
          <Text style={[styles.dashLabel, boxed && { color: C.textDim, marginTop: 3 }]} numberOfLines={1}>
            {it.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const MODES = [
  { value: "map", label: "MAP" },
  { value: "pilot", label: "PILOT" },
  { value: "street", label: "STREET" },
];

/** .gl.modes: Map, Pilot, Street. */
export function ModeSwitch({ value, onChange, style }) {
  return (
    <Glass radius={R.full} style={[{ flexDirection: "row", padding: 4, gap: 4 }, style]}>
      {MODES.map((m) => (
        <PressableScale
          key={m.value}
          haptic={false}
          onPress={() => {
            hapticSelection();
            onChange(m.value);
          }}
          accessibilityLabel={`${m.label.toLowerCase()} view`}
          style={[styles.mode, value === m.value && styles.modeOn]}
        >
          <Text style={[styles.modeText, value === m.value && { color: "#fff" }]}>{m.label}</Text>
        </PressableScale>
      ))}
    </Glass>
  );
}

const TURN_ICONS = { left: CornerUpLeft, right: CornerUpRight, back: Undo2, straight: MoveUp };

/** .turn: the blue sat nav card. Arrow, distance, what to do. */
export function TurnBanner({ dir = "straight", metres, text, style }) {
  const Icon = TURN_ICONS[dir] || MoveUp;
  return (
    <View style={[styles.turn, style]}>
      <View style={styles.turnArrow}>
        <Icon size={28} color="#fff" strokeWidth={2.4} />
      </View>
      <View style={{ flex: 1 }}>
        {metres != null ? <Text style={styles.turnM}>{metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.max(0, Math.round(metres / 10) * 10)} m`}</Text> : null}
        <Text style={styles.turnText}>{text}</Text>
      </View>
    </View>
  );
}

/** .setlist .sr: a settings row with an icon, two lines of text and a switch. */
export function ToggleRow({ icon: Icon, title, sub, value, onChange, first, disabled }) {
  return (
    <View style={[styles.toggle, !first && styles.toggleRule, disabled && { opacity: 0.55 }]}>
      {Icon ? <Icon size={18} color={C.textDim} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleTitle}>{title}</Text>
        {sub ? <Text style={styles.toggleSub}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={(v) => {
          hapticSelection();
          onChange(v);
        }}
        trackColor={{ false: C.surfaceHigh, true: C.accentDeep }}
        thumbColor="#fff"
        {...(Platform.OS === "web" ? { activeThumbColor: "#fff", activeTrackColor: C.accentDeep } : null)}
        ios_backgroundColor={C.surfaceHigh}
        accessibilityLabel={title}
        style={Platform.OS === "web" ? { height: 30, width: 50 } : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  round: { alignItems: "center", justifyContent: "center", backgroundColor: BLUR ? "rgba(10,14,20,0.3)" : "rgba(10,14,20,0.6)" },
  roundOn: { backgroundColor: C.accentDeep, boxShadow: "0 8px 20px -8px rgba(42,106,240,0.9)" },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 9, paddingHorizontal: 14, borderRadius: R.full, backgroundColor: BLUR ? "rgba(10,14,20,0.42)" : "rgba(10,14,20,0.72)", overflow: "hidden" },
  chipDanger: { backgroundColor: "rgba(255,77,85,0.18)" },
  chipText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 12.5, lineHeight: 16, letterSpacing: 0.3, fontVariant: ["tabular-nums"] },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, gap: S.sm },
  side: { width: 52 },
  centre: { flex: 1, alignItems: "center" },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 12,
    gap: 14,
    boxShadow: "0 -14px 30px rgba(0,0,0,0.35)",
  },
  handle: { alignSelf: "center", width: 38, height: 4, borderRadius: 4, backgroundColor: "#4a5160", opacity: 0.7, marginBottom: 2 },
  dash: { flexDirection: "row", alignItems: "center" },
  dashBox: { backgroundColor: C.surface, borderRadius: 18, paddingVertical: 12 },
  dashCell: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  dashRule: { borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.1)" },
  dashRuleBox: { borderLeftWidth: 1, borderLeftColor: C.border },
  dashValue: { color: "#fff", fontFamily: F.display, letterSpacing: 0.2, fontVariant: ["tabular-nums"] },
  trioValue: { color: C.text, fontFamily: F.bodySemi, fontVariant: ["tabular-nums"] },
  dashLabel: { color: "#a3adbd", fontFamily: F.body, fontSize: 10.5, marginTop: 4 },
  mode: { flex: 1, borderRadius: R.full, alignItems: "center", justifyContent: "center", paddingVertical: 8 },
  modeOn: { backgroundColor: C.accent, boxShadow: "0 6px 16px -8px rgba(42,106,240,0.9)" },
  modeText: { color: "#a3adbd", fontFamily: F.bodySemi, fontSize: 11.5, letterSpacing: 0.4 },
  turn: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.accent, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 16, boxShadow: "0 14px 30px -12px rgba(61,139,255,0.7)" },
  turnArrow: { width: 50, height: 50, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  turnM: { color: "#fff", fontFamily: F.display, fontSize: 32, lineHeight: 30 },
  turnText: { color: "rgba(255,255,255,0.9)", fontFamily: F.bodyMedium, fontSize: 12.5, lineHeight: 17, marginTop: 3 },
  toggle: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: 12, paddingHorizontal: 14 },
  toggleRule: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  toggleTitle: { color: C.text, fontFamily: F.bodyMedium, fontSize: 13 },
  toggleSub: { color: C.textDim, fontFamily: F.body, fontSize: 10.5, marginTop: 2 },
});
