// Building blocks for getting started and the Settings screens: the glowing
// slab hero, a top bar with step dashes, grouped cards of rows, the blue
// toggle and a small segmented control, all in the demo's style.

import React from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { ChevronLeft, ChevronsRight } from "lucide-react-native";
import { C, F, LIT, PressableScale, R, S } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";

/**
 * Asks before something that can't be undone. Resolves true when the member
 * says yes. The web has no native alert buttons, so it uses the browser's.
 */
export const confirmAsk = ({ title, body = "", ok = "OK", danger = false }) =>
  new Promise((resolve) => {
    if (Platform.OS === "web") {
      resolve(typeof window !== "undefined" && window.confirm(body ? `${title}\n\n${body}` : title));
      return;
    }
    Alert.alert(title, body, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: ok, style: danger ? "destructive" : "default", onPress: () => resolve(true) },
    ]);
  });

/** Round back button used across these screens. */
export function BackButton({ onPress, style }) {
  const router = useRouter();
  const go = () => {
    hapticSelection();
    if (onPress) return onPress();
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };
  return (
    <PressableScale onPress={go} hitSlop={10} scaleTo={0.9} accessibilityLabel="Back" style={[styles.round, style]}>
      <ChevronLeft size={20} color={C.text} />
    </PressableScale>
  );
}

/** Round icon button for the top corners. */
export function RoundButton({ icon: Icon, onPress, label, style }) {
  return (
    <PressableScale onPress={onPress} hitSlop={10} scaleTo={0.9} accessibilityLabel={label} style={[styles.round, style]}>
      <Icon size={18} color={C.text} />
    </PressableScale>
  );
}

/** Back on the left, a centred title, an optional round button on the right. */
export function TopBar({ title, right, onBack, style }) {
  return (
    <View style={[styles.topBar, style]}>
      <BackButton onPress={onBack} />
      <Text style={styles.topTitle} numberOfLines={1}>
        {title}
      </Text>
      {right || <View style={{ width: 40 }} />}
    </View>
  );
}

/** Four short dashes, the current one long and blue. */
export function StepDashes({ count = 4, index = 0 }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
      {Array.from({ length: count }, (_, i) => (
        <MotiView
          key={i}
          animate={{ width: i === index ? 30 : 16, backgroundColor: i === index ? C.accent : i < index ? "#2c3a52" : "#262b35" }}
          transition={{ type: "timing", duration: 260 }}
          style={{ height: 4, borderRadius: 2 }}
        />
      ))}
    </View>
  );
}

/** Back, dashes and Skip, floating over a hero. */
export function OnboardingBar({ index, onBack, onSkip, top = 0 }) {
  return (
    <View style={[styles.bar, { top }]}>
      <BackButton onPress={onBack} />
      <StepDashes index={index} />
      {onSkip ? (
        <Pressable onPress={onSkip} hitSlop={12} accessibilityRole="button">
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      ) : (
        <View style={{ width: 42 }} />
      )}
    </View>
  );
}

/**
 * The dark slab with a blue glow in its top right, a kicker and a two-tone
 * headline. Rounded at the bottom. Pass `photo` content as children behind.
 */
export function GlowHero({ kicker, top, bottom, height = 300, background, object, children, style }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.slab, { height: height + insets.top }, style]}>
      {background}
      {!background && !object ? (
        <>
          <LinearGradient colors={["#0d1524", "#080b11"]} style={StyleSheet.absoluteFill} />
          <Glow />
          <LinearGradient colors={["rgba(61,139,255,0.10)", "rgba(61,139,255,0)"]} start={{ x: 0.75, y: 0.15 }} end={{ x: 0.2, y: 0.95 }} style={StyleSheet.absoluteFill} />
        </>
      ) : null}
      {object ? (
        // The object photos are shot on black, so the slab goes black behind
        // them and the blue light sits over the top.
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]} />
          <Image source={object} contentFit="contain" style={{ position: "absolute", right: -30, top: insets.top + 18, width: height * 0.9, height: height * 0.9 }} />
          <Glow opacity={0.3} />
          <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.85)"]} start={{ x: 0.5, y: 0.3 }} end={{ x: 0.2, y: 1 }} style={StyleSheet.absoluteFill} />
        </>
      ) : null}
      <View style={styles.heroText}>
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        {top ? (
          <Text style={styles.headline} numberOfLines={2} adjustsFontSizeToFit>
            {top}
          </Text>
        ) : null}
        {bottom ? (
          <Text style={[styles.headline, styles.blue]} numberOfLines={2} adjustsFontSizeToFit>
            {bottom}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/**
 * A settings page whose top is the glowing slab: back on the left, an
 * optional round button on the right, then the body under it.
 */
export function HeroPage({ kicker, top, bottom, height = 210, right, background, object, children, bodyStyle }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <GlowHero kicker={kicker} top={top} bottom={bottom} height={height} background={background} object={object} />
        <View style={[{ paddingHorizontal: S.gutter, paddingTop: S.lg, gap: S.md }, bodyStyle]}>{children}</View>
      </ScrollView>
      <View style={[styles.heroBar, { top: insets.top + S.sm }]}>
        <BackButton />
        {right || null}
      </View>
    </View>
  );
}

/** A soft blue light in the top right of a slab. */
export function Glow({ size = 420, right = -120, top = -60, opacity = 0.42 }) {
  return (
    <Svg pointerEvents="none" width={size} height={size} style={{ position: "absolute", right, top }}>
      <Defs>
        <RadialGradient id="slabGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#3d8bff" stopOpacity={opacity} />
          <Stop offset="0.45" stopColor="#2a5fc0" stopOpacity={opacity * 0.45} />
          <Stop offset="1" stopColor="#0d1524" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#slabGlow)" />
    </Svg>
  );
}

/** Headline without a slab, for screens whose top is plain. */
export function PlainHeadline({ kicker, top, bottom, size = 46, style }) {
  return (
    <View style={style}>
      {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
      <Text style={[styles.headline, { fontSize: size, lineHeight: size }]}>{top}</Text>
      {bottom ? <Text style={[styles.headline, styles.blue, { fontSize: size, lineHeight: size }]}>{bottom}</Text> : null}
    </View>
  );
}

/** A rounded card holding rows separated by hairlines. */
export function Group({ children, highlight = false, style }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.group, highlight && styles.groupOn, style]}>
      <LinearGradient colors={highlight ? ["#15233a", "#101a2b"] : LIT} style={[StyleSheet.absoluteFill, { borderRadius: R.lg }]} />
      {rows.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <View style={styles.sep} /> : null}
          {child}
        </React.Fragment>
      ))}
    </View>
  );
}

/** One row: icon, title, a line under it, then whatever sits on the right. */
export function Row({ icon: Icon, title, hint, value, right, onPress, danger = false, chevron, iconColour, disabled, children }) {
  const showChevron = chevron ?? (!!onPress && !right);
  const body = (
    <View style={[styles.row, disabled && { opacity: 0.45 }]}>
      {Icon ? <Icon size={19} color={danger ? C.danger : iconColour || C.textDim} strokeWidth={1.8} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, danger && { color: C.danger }]}>{title}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
        {children}
      </View>
      {value != null ? <Text style={styles.rowValue}>{value}</Text> : null}
      {right}
      {showChevron ? <ChevronsRight size={16} color={C.textDim} /> : null}
    </View>
  );
  if (!onPress || disabled) return body;
  return (
    <PressableScale onPress={onPress} scaleTo={0.985}>
      {body}
    </PressableScale>
  );
}

/** The blue pill toggle from the demo. */
export function Toggle({ value, onChange, disabled = false, label }) {
  const on = !!value;
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        hapticSelection();
        onChange?.(!on);
      }}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: on, disabled }}
      accessibilityLabel={label}
      style={{ opacity: disabled ? 0.45 : 1 }}
    >
      <MotiView animate={{ backgroundColor: on ? C.accent : "#1d222b" }} transition={{ type: "timing", duration: 180 }} style={[styles.track, on && styles.trackOn]}>
        <MotiView animate={{ translateX: on ? 20 : 0 }} transition={{ type: "spring", damping: 18, stiffness: 260 }} style={styles.thumb} />
      </MotiView>
    </Pressable>
  );
}

/** Small segmented control: km / miles, Hype / Calm / Off. */
export function MiniSegment({ options, value, onChange, style }) {
  return (
    <View style={[styles.seg, style]}>
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              if (active) return;
              hapticSelection();
              onChange(opt.value);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.segItem, active && styles.segItemOn]}
          >
            <Text style={[styles.segText, active && { color: "#fff" }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A small line of help text with an optional icon, under a card. */
export function Note({ icon: Icon, children, style }) {
  return (
    <View style={[{ flexDirection: "row", gap: 10, alignItems: "flex-start", paddingHorizontal: 4 }, style]}>
      {Icon ? <Icon size={14} color={C.accent} style={{ marginTop: 2 }} /> : null}
      <Text style={styles.note}>{children}</Text>
    </View>
  );
}

export const accountStyles = StyleSheet.create({
  field: { borderRadius: R.lg, backgroundColor: C.surface, paddingHorizontal: S.lg, paddingTop: 12, paddingBottom: 12, borderWidth: 1, borderColor: "transparent" },
  fieldOn: { borderColor: C.accent, backgroundColor: "#0f1726" },
  fieldLabel: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  input: { color: C.text, fontFamily: F.bodySemi, fontSize: 17, paddingVertical: 4, marginTop: 2, outlineStyle: "none" },
});

const styles = StyleSheet.create({
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(18,21,26,0.85)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  heroBar: { position: "absolute", left: S.gutter, right: S.gutter, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 56, paddingHorizontal: S.gutter },
  topTitle: { flex: 1, textAlign: "center", color: C.text, fontFamily: F.bodySemi, fontSize: 16 },
  bar: { position: "absolute", left: S.gutter, right: S.gutter, zIndex: 5, flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 44 },
  skip: { color: C.textSoft, fontFamily: F.bodyMedium, fontSize: 14 },
  slab: { backgroundColor: "#0b0e13", borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: "hidden", justifyContent: "flex-end" },
  glow: { position: "absolute", width: 260, height: 260, borderRadius: 130, right: -30, top: 20, backgroundColor: "rgba(40,90,190,0.20)" },
  heroText: { paddingHorizontal: S.gutter, paddingBottom: S.xl },
  kicker: { color: C.accent, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase", marginBottom: 8 },
  headline: { color: C.text, fontFamily: F.display, fontSize: 48, lineHeight: 48, textTransform: "uppercase" },
  blue: { color: C.accent, textShadowColor: "rgba(61,139,255,0.45)", textShadowRadius: 18 },
  group: { borderRadius: R.lg, backgroundColor: C.surface, overflow: "hidden", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  groupOn: { borderWidth: 1, borderColor: "rgba(61,139,255,0.55)" },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginLeft: S.lg },
  row: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 56, paddingVertical: 12, paddingHorizontal: S.lg },
  rowTitle: { color: C.text, fontFamily: F.bodyMedium, fontSize: 15 },
  rowHint: { color: C.textDim, fontFamily: F.body, fontSize: 12, lineHeight: 16, marginTop: 2 },
  rowValue: { color: C.textDim, fontFamily: F.body, fontSize: 13 },
  track: { width: 46, height: 28, borderRadius: 14, padding: 3, borderWidth: 1, borderColor: "#2a303b" },
  trackOn: { borderColor: C.accent, shadowColor: C.accent, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  thumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },
  seg: { flexDirection: "row", padding: 3, borderRadius: R.full, backgroundColor: "#0c0f14", borderWidth: StyleSheet.hairlineWidth, borderColor: "#2a303b" },
  segItem: { minWidth: 46, height: 30, paddingHorizontal: 12, borderRadius: R.full, alignItems: "center", justifyContent: "center" },
  segItemOn: { backgroundColor: C.accent, shadowColor: C.accent, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  segText: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 13 },
  note: { flex: 1, color: C.textDim, fontFamily: F.body, fontSize: 12, lineHeight: 18 },
});
