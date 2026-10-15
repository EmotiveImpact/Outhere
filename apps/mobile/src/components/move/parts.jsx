// Floating pieces the Move screens share: the round glass buttons and the
// status chip at the top, glass panels and the bottom sheet, the three number
// dash, the Map / Pilot / Street switch, the turn banner and a toggle row.

import React from "react";
import { Platform, StyleSheet, Switch, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { CornerUpLeft, CornerUpRight, MoveUp, Undo2 } from "lucide-react-native";
import { C, F, PressableScale, R, S } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";

export const GLASS = "rgba(18,22,30,0.78)";

/** Translucent rounded surface, blurred where the platform can. */
export function Glass({ children, style, radius = R.lg, intensity = 30 }) {
  return (
    <View style={[{ borderRadius: radius, overflow: "hidden", backgroundColor: Platform.OS === "ios" ? "rgba(18,22,30,0.55)" : GLASS }, styles.edge, style]}>
      {Platform.OS === "ios" ? <BlurView tint="dark" intensity={intensity} style={StyleSheet.absoluteFill} /> : null}
      {children}
    </View>
  );
}

/** 42 pt round glass button. */
export function RoundGlass({ icon: Icon, onPress, label, tone, size = 42, style }) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} scaleTo={0.9} hitSlop={6} style={[styles.round, { width: size, height: size, borderRadius: size / 2 }, tone === "accent" && { backgroundColor: C.accent }, style]}>
      <Icon size={Math.round(size * 0.45)} color="#fff" />
    </PressableScale>
  );
}

/** "● LIVE 24:18" style chip. tone: accent | danger | warn | none */
export function RecChip({ children, tone = "accent", icon: Icon, onPress, label }) {
  const dot = tone === "danger" ? C.danger : tone === "warn" ? C.warn : C.out;
  const body = (
    <View style={[styles.chip, tone === "danger" && styles.chipDanger]}>
      {Icon ? <Icon size={14} color="#fff" /> : tone !== "none" ? <View style={[styles.chipDot, { backgroundColor: dot, shadowColor: dot }]} /> : null}
      <Text style={styles.chipText} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} scaleTo={0.96}>
      {body}
    </PressableScale>
  );
}

/** Left button, centre chip, right button, under the status bar. */
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

/** The white sheet over the bottom of the map, with its handle. */
export function MapSheet({ children, style, bottomInset = 0 }) {
  return (
    <View style={[styles.sheet, { paddingBottom: S.lg + bottomInset }, style]}>
      <View style={styles.handle} />
      {children}
    </View>
  );
}

/** Three numbers in a row with hairlines between. items: [{ value, label, accent, icon }] */
export function Dash({ items, size = 24, style, boxed = false }) {
  return (
    <View style={[styles.dash, boxed && styles.dashBox, style]}>
      {items.map((it, i) => (
        <View key={it.label} style={[styles.dashCell, i > 0 && styles.dashRule]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            {it.icon || null}
            <Text style={[styles.dashValue, { fontSize: size }, it.accent && { color: C.accentHi }]} numberOfLines={1} adjustsFontSizeToFit>
              {it.value}
            </Text>
          </View>
          <Text style={styles.dashLabel} numberOfLines={1}>
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

export function ModeSwitch({ value, onChange, style }) {
  return (
    <Glass radius={R.full} style={[{ flexDirection: "row", padding: 4 }, style]}>
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

/** The blue sat nav card: arrow, distance, what to do. */
export function TurnBanner({ dir = "straight", metres, text, style }) {
  const Icon = TURN_ICONS[dir] || MoveUp;
  return (
    <View style={[styles.turn, style]}>
      <View style={styles.turnArrow}>
        <Icon size={26} color="#fff" strokeWidth={2.6} />
      </View>
      <View style={{ flex: 1 }}>
        {metres != null ? <Text style={styles.turnM}>{metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.max(0, Math.round(metres / 10) * 10)} m`}</Text> : null}
        <Text style={styles.turnText}>{text}</Text>
      </View>
    </View>
  );
}

/** A settings row with an icon, two lines of text and a switch. */
export function ToggleRow({ icon: Icon, title, sub, value, onChange, first }) {
  return (
    <View style={[styles.toggle, !first && styles.toggleRule]}>
      {Icon ? <Icon size={18} color={C.textDim} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleTitle}>{title}</Text>
        {sub ? <Text style={styles.toggleSub}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          hapticSelection();
          onChange(v);
        }}
        trackColor={{ false: C.surfaceHigh, true: C.accent }}
        thumbColor="#fff"
        ios_backgroundColor={C.surfaceHigh}
        accessibilityLabel={title}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  edge: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.09)" },
  round: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(18,22,30,0.72)", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.1)" },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, height: 34, paddingHorizontal: 14, borderRadius: R.full, backgroundColor: "rgba(18,22,30,0.78)", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(255,255,255,0.1)" },
  chipDanger: { backgroundColor: "rgba(255,77,85,0.22)" },
  chipDot: { width: 7, height: 7, borderRadius: 4, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  chipText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 13, letterSpacing: 0.6, fontVariant: ["tabular-nums"] },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", paddingHorizontal: S.lg, gap: S.sm },
  side: { width: 52 },
  centre: { flex: 1, alignItems: "center" },
  sheet: {
    backgroundColor: "#0b0e13",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: S.lg,
    paddingTop: 10,
    gap: S.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  handle: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)", marginBottom: 6 },
  dash: { flexDirection: "row", alignItems: "center" },
  dashBox: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: R.md, paddingVertical: S.md },
  dashCell: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  dashRule: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: "rgba(255,255,255,0.14)" },
  dashValue: { color: C.text, fontFamily: F.display, letterSpacing: 0.2, fontVariant: ["tabular-nums"] },
  dashLabel: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  mode: { flex: 1, height: 34, borderRadius: R.full, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  modeOn: { backgroundColor: C.accent },
  modeText: { color: C.textSoft, fontFamily: F.bodySemi, fontSize: 12.5, letterSpacing: 1 },
  turn: { flexDirection: "row", alignItems: "center", gap: S.md, backgroundColor: C.accent, borderRadius: 22, padding: S.md, shadowColor: C.accent, shadowOpacity: 0.5, shadowRadius: 22, shadowOffset: { width: 0, height: 10 } },
  turnArrow: { width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  turnM: { color: "#fff", fontFamily: F.display, fontSize: 30, lineHeight: 32 },
  turnText: { color: "#fff", fontFamily: F.bodyMedium, fontSize: 13.5, lineHeight: 18 },
  toggle: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.md, paddingHorizontal: S.lg },
  toggleRule: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  toggleTitle: { color: C.text, fontFamily: F.bodyMedium, fontSize: 15 },
  toggleSub: { color: C.textDim, fontFamily: F.body, fontSize: 12.5, marginTop: 2 },
});
