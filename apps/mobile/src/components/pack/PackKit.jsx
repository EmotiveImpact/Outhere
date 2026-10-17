// The pieces every Fighter Pack screen is built from, to the approved mock
// (https://claude.ai/artifact/V4xNmSEqR7ESv6N6k1Qmdr): the four step bar of a
// bank style ID check, the two tone headline, the dotted points, the consent
// tick, the check list, the padlock line and the big buttons.

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Lock, X } from "@/components/ui/icons";
import { C, F, PressableScale, TOP_GAP } from "@/components/ui";

export const OUT = "#4f9bff";
export const ACT = "#2a6af0";
export const INK = "#f3f5f8";
export const MUTE = "#8a93a3";
export const LINE = "rgba(255,255,255,0.08)";
export const PHONE = "#04070d";

/**
 * A pack screen: an optional photo behind that fades to the floor (.bgimg), a
 * close button, then the content in a column (.screen: 18px sides, 12 gap).
 * step: 1 to 4 shows the ID check bar; label: the small line instead.
 */
export function PackScreen({ step, stepLabel, label, bg, bgFocus = 0.2, bgOpacity = 1, gap = 12, scroll = false, onClose, children, behind }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const close = onClose || (() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile")));
  return (
    <View style={{ flex: 1, backgroundColor: PHONE }}>
      {bg ? (
        <View style={[StyleSheet.absoluteFill, { opacity: bgOpacity }]} pointerEvents="none">
          <Image source={bg} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ top: `${bgFocus * 100}%`, left: "50%" }} transition={250} />
          {/* linear-gradient(180deg, rgba(4,7,13,.15), transparent 30%, rgba(6,11,22,.85) 62%, the floor 82%) */}
          <LinearGradient colors={["rgba(4,7,13,0.15)", "rgba(4,7,13,0)", "rgba(6,11,22,0.85)", PHONE]} locations={[0, 0.3, 0.62, 0.82]} style={StyleSheet.absoluteFill} />
        </View>
      ) : null}
      {behind}
      {scroll ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingTop: insets.top + TOP_GAP, paddingBottom: insets.bottom + 22, gap }]}>
          <Head close={close} step={step} stepLabel={stepLabel} label={label} />
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.screen, { paddingTop: insets.top + TOP_GAP, paddingBottom: insets.bottom + 22, gap }]}>
          <Head close={close} step={step} stepLabel={stepLabel} label={label} />
          {children}
        </View>
      )}
    </View>
  );
}

function Head({ close, step, stepLabel, label }) {
  return (
    <>
      <View style={styles.top}>
        <PressableScale onPress={close} scaleTo={0.9} accessibilityLabel="Close" style={styles.close}>
          <X size={18} color={INK} />
        </PressableScale>
      </View>
      {step ? <StepBar step={step} label={stepLabel} /> : null}
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </>
  );
}

/** .kyc and .kycl: four bars, then "Step 2 of 4" and the step's name. */
export function StepBar({ step, label }) {
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.kyc}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.kycBar, i <= step && styles.kycOn]} />
        ))}
      </View>
      <View style={styles.kycl}>
        <Text style={styles.kyclText}>Step {step} of 4</Text>
        <Text style={[styles.kyclText, { color: INK }]}>{label}</Text>
      </View>
    </View>
  );
}

/** .h: Barlow 600 uppercase at .92 line height, the second part in blue. */
export function PackTitle({ top, em, size = 38, center = false, style }) {
  return (
    <Text style={[styles.h, { fontSize: size, lineHeight: size * 0.96 }, center && { textAlign: "center" }, style]}>
      {top}
      {em ? <Text style={{ color: OUT }}>{top ? ` ${em}` : em}</Text> : null}
    </Text>
  );
}

export function Sub({ children, center, style }) {
  return <Text style={[styles.sub, center && { textAlign: "center" }, style]}>{children}</Text>;
}

/** .points: lines led by a glowing blue dot. */
export function Points({ items }) {
  return (
    <View style={{ gap: 9 }}>
      {items.map((t) => (
        <View key={t} style={styles.point}>
          <View style={styles.pointDot} />
          <Text style={styles.pointText}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

/** .tick: the consent box. */
export function TickBox({ value, onChange, children }) {
  return (
    <PressableScale onPress={() => onChange(!value)} scaleTo={0.98} accessibilityRole="checkbox" accessibilityState={{ checked: value }} style={styles.tick}>
      <View style={[styles.box, value && styles.boxOn]}>{value ? <Check size={14} color="#fff" strokeWidth={3} /> : null}</View>
      <Text style={styles.tickText}>{children}</Text>
    </PressableScale>
  );
}

/** .checks: ticked, current (a blue ring) or still to come. */
export function Checks({ items, center = false }) {
  return (
    <View style={[{ gap: 6 }, center && { alignItems: "center" }]}>
      {items.map((c) => (
        <View key={c.label} style={styles.check}>
          <View style={[styles.checkDot, c.state === "ok" && styles.checkOk, c.state === "now" && styles.checkNow]}>{c.state === "ok" ? <Check size={10} color="#fff" strokeWidth={3.4} /> : null}</View>
          <Text style={[styles.checkText, c.state && { color: INK }]}>{c.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** .lockline: the small padlock promise under a button. */
export function LockLine({ children }) {
  return (
    <View style={styles.lockline}>
      <Lock size={12} color={MUTE} />
      <Text style={styles.locklineText}>{children}</Text>
    </View>
  );
}

const BTN = {
  primary: { colors: ["#3b7bff", ACT], shadow: "0 10px 24px rgba(42,106,240,0.35)", inset: "inset 0 1px 0 rgba(255,255,255,0.25)", text: "#fff" },
  ghost: { colors: ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.06)"], shadow: null, inset: "inset 0 1px 0 rgba(255,255,255,0.08)", text: INK },
  black: { colors: ["#2a2f39", "#0d1016", "#3a404c"], locations: [0, 0.55, 1], diagonal: true, shadow: "0 0 0 1px rgba(200,210,230,0.3), 0 10px 24px rgba(0,0,0,0.5)", inset: "inset 0 1px 0 rgba(255,255,255,0.25)", text: "#fff" },
};

/** .btn: the full width button (primary, ghost or black). */
export function PackButton({ title, onPress, variant = "primary", disabled, loading, style }) {
  const v = BTN[variant];
  const off = disabled || loading;
  return (
    <PressableScale onPress={off ? undefined : onPress} disabled={off} scaleTo={0.97} accessibilityLabel={title} style={[styles.btnWrap, v.shadow && !off && { boxShadow: v.shadow }, off && { opacity: 0.5 }, style]}>
      <View style={styles.btn}>
        <LinearGradient colors={v.colors} locations={v.locations} start={v.diagonal ? { x: 0, y: 0 } : { x: 0.5, y: 0 }} end={v.diagonal ? { x: 1, y: 1 } : { x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 16, boxShadow: v.inset }]} />
        <Text style={[styles.btnText, { color: v.text }]}>{loading ? "One moment" : title}</Text>
      </View>
    </PressableScale>
  );
}

/** .card: a quiet lit box for small print. */
export function QuietCard({ children, style }) {
  return (
    <View style={[styles.card, style]}>
      <LinearGradient colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)"]} style={[StyleSheet.absoluteFill, { borderRadius: 18 }]} />
      {children}
    </View>
  );
}

export const Spacer = () => <View style={{ flex: 1 }} />;

export const packStyles = StyleSheet.create({
  label: { color: MUTE, fontFamily: F.bodySemi, fontSize: 10.5, letterSpacing: 1.3, textTransform: "uppercase" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  rowText: { color: MUTE, fontFamily: F.body, fontSize: 12 },
  rowBold: { color: INK, fontFamily: F.bodySemi, fontSize: 12, fontVariant: ["tabular-nums"] },
  small: { color: MUTE, fontFamily: F.body, fontSize: 12.5, lineHeight: 18 },
});

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 18 },
  scroll: { flexGrow: 1, paddingHorizontal: 18 },
  top: { flexDirection: "row", marginBottom: 2 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)" },
  label: packStyles.label,
  kyc: { flexDirection: "row", gap: 4 },
  kycBar: { flex: 1, height: 3, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.14)" },
  kycOn: { backgroundColor: OUT, boxShadow: `0 0 8px ${OUT}` },
  kycl: { flexDirection: "row", justifyContent: "space-between" },
  kyclText: { color: MUTE, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" },
  h: { color: INK, fontFamily: F.displayMedium, textTransform: "uppercase", letterSpacing: 0.3 },
  sub: { color: MUTE, fontFamily: F.body, fontSize: 12.5, lineHeight: 18 },
  point: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  pointDot: { width: 7, height: 7, borderRadius: 4, marginTop: 6, marginLeft: 5, marginRight: 6, backgroundColor: OUT, boxShadow: `0 0 8px ${OUT}` },
  pointText: { flex: 1, color: "#c9d3ea", fontFamily: F.body, fontSize: 12.5, lineHeight: 18 },
  tick: { flexDirection: "row", alignItems: "center", gap: 10 },
  box: { width: 22, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)" },
  boxOn: { backgroundColor: ACT, borderColor: ACT, boxShadow: "0 0 10px rgba(79,155,255,0.6)" },
  tickText: { flex: 1, color: INK, fontFamily: F.bodyMedium, fontSize: 12 },
  check: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkDot: { width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.25)" },
  checkOk: { backgroundColor: ACT, borderColor: ACT, boxShadow: "0 0 8px rgba(79,155,255,0.6)" },
  checkNow: { borderWidth: 2, borderColor: OUT },
  checkText: { color: MUTE, fontFamily: F.body, fontSize: 12 },
  lockline: { flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center" },
  locklineText: { color: MUTE, fontFamily: F.body, fontSize: 11 },
  btnWrap: { borderRadius: 16 },
  btn: { borderRadius: 16, overflow: "hidden", paddingVertical: 15, alignItems: "center" },
  btnText: { fontFamily: F.bodySemi, fontSize: 14 },
  card: { borderRadius: 18, padding: 14, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" },
});

