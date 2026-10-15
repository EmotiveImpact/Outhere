// Pieces the Outside screens share: the full bleed hero with its blue glow,
// round glass buttons over it, glass chips, the three stat boxes, a fixed
// bottom bar with two buttons, the OUT coin and a switch. Built from the
// design kit in components/ui.

import React from "react";
import { Platform, StyleSheet, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { ChevronLeft, MoreHorizontal, Share2, X } from "lucide-react-native";
import { Button, C, F, LIT, PressableScale, R, Row, S } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";

let glowId = 0;

/** A soft blue light, as if a street lamp is just off screen. */
export function Glow({ x = "72%", y = "24%", r = "70%", colour = "#2a6af0", opacity = 0.42, style }) {
  const id = React.useMemo(() => `glow${(glowId += 1)}`, []);
  return (
    <Svg style={[StyleSheet.absoluteFill, style]} pointerEvents="none" width="100%" height="100%">
      <Defs>
        <RadialGradient id={id} cx={x} cy={y} rx={r} ry={r} fx={x} fy={y} gradientUnits="objectBoundingBox">
          <Stop offset="0" stopColor={colour} stopOpacity={opacity} />
          <Stop offset="0.55" stopColor={colour} stopOpacity={opacity * 0.25} />
          <Stop offset="1" stopColor={colour} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * The screen hero: full bleed under the status bar, rounded at the bottom,
 * with a kicker and a two tone headline. `photo` lays a picture underneath.
 * `top` leaves room for the Outside pills or the round buttons.
 */
export function GlowHero({ photo, kicker, kickerColour = C.accentHi, top, bottom, sub, height = 300, children, after, style, center = false, glow = true, photoOpacity = 0.55 }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.hero, { minHeight: height + insets.top }, style]}>
      <LinearGradient colors={["#0b1220", "#07090c"]} style={StyleSheet.absoluteFill} />
      {photo ? <Image source={photo} style={[StyleSheet.absoluteFill, { opacity: photoOpacity }]} contentFit="cover" transition={200} /> : null}
      {photo ? <LinearGradient colors={["rgba(7,9,12,0.35)", "rgba(7,9,12,0.2)", "rgba(7,9,12,0.94)"]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} /> : null}
      {glow ? <Glow /> : null}
      <View style={[styles.heroText, { paddingTop: insets.top + 64 }, center && { alignItems: "center" }]}>
        {kicker ? <Text style={[styles.kicker, { color: kickerColour }, center && { textAlign: "center" }]}>{kicker}</Text> : null}
        {top != null ? (
          <Text style={[styles.headline, center && { textAlign: "center" }]} numberOfLines={2} adjustsFontSizeToFit>
            {top}
          </Text>
        ) : null}
        {bottom != null ? (
          <Text style={[styles.headline, styles.blue, center && { textAlign: "center" }]} numberOfLines={2} adjustsFontSizeToFit>
            {bottom}
          </Text>
        ) : null}
        {sub ? <Text style={[styles.sub, center && { textAlign: "center" }]}>{sub}</Text> : null}
        {children}
      </View>
      {after}
    </View>
  );
}

/** Round glass button for the top of a screen. */
export function GlassButton({ icon: Icon, onPress, label, size = 42, style }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.9} hitSlop={8} accessibilityLabel={label} style={[styles.glassButton, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Icon size={20} color={C.text} />
    </PressableScale>
  );
}

/** Back (or close) on the left, anything on the right, floating over a hero. */
export function TopBar({ back = true, close = false, onBack, right, onShare, onMore, center, style }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = () => {
    hapticSelection();
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace("/outside/arena");
  };
  return (
    <View style={[styles.topBar, { top: insets.top + S.sm }, style]} pointerEvents="box-none">
      {back || close ? <GlassButton icon={close ? X : ChevronLeft} onPress={goBack} label={close ? "Close" : "Back"} /> : <View style={{ width: 42 }} />}
      <View style={{ flex: 1, alignItems: "center" }} pointerEvents="box-none">
        {center}
      </View>
      <Row gap={S.sm}>
        {right}
        {onShare ? <GlassButton icon={Share2} onPress={onShare} label="Share" /> : null}
        {onMore ? <GlassButton icon={MoreHorizontal} onPress={onMore} label="More" /> : null}
      </Row>
    </View>
  );
}

/** Small rounded glass label: "Ends in 03:41:20", "Live · 2d 14h left". */
export function GlassChip({ icon: Icon, label, value, dot, tone = "neutral", onPress, style }) {
  const tones = {
    neutral: [styles.chip, C.text],
    accent: [[styles.chip, { backgroundColor: "rgba(61,139,255,0.18)", borderColor: "rgba(61,139,255,0.35)" }], C.accentHi],
    danger: [[styles.chip, { backgroundColor: "rgba(255,77,85,0.14)", borderColor: "rgba(255,77,85,0.4)" }], "#ff8a90"],
  };
  const [box, fg] = tones[tone] || tones.neutral;
  const inner = (
    <>
      {dot ? <View style={[styles.chipDot, { backgroundColor: dot }]} /> : null}
      {Icon ? <Icon size={14} color={fg} /> : null}
      <Text style={[styles.chipText, { color: fg }]}>{label}</Text>
      {value ? <Text style={[styles.chipValue, { color: fg }]}>{value}</Text> : null}
    </>
  );
  if (onPress) {
    return (
      <PressableScale onPress={onPress} scaleTo={0.95} style={[box, style]}>
        {inner}
      </PressableScale>
    );
  }
  return <View style={[box, style]}>{inner}</View>;
}

/** Three (or so) boxes in a row: big number, small label. */
export function StatBoxes({ items, glass = false, style }) {
  return (
    <Row gap={S.sm} style={style}>
      {items.map((it) => (
        <View key={it.label} style={[styles.statBox, glass && styles.statBoxGlass]}>
          {!glass ? <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { borderRadius: R.md }]} /> : null}
          <Text style={[styles.statValue, it.accent && { color: C.accent }]} numberOfLines={1} adjustsFontSizeToFit>
            {it.value}
          </Text>
          <Text style={styles.statLabel} numberOfLines={1}>
            {it.label}
          </Text>
        </View>
      ))}
    </Row>
  );
}

/** Fixed bar at the bottom of a screen for the main action(s). */
export function BottomBar({ children, style }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, S.lg) }, style]}>
      <LinearGradient colors={["rgba(7,9,12,0)", "rgba(7,9,12,0.92)", C.bg]} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      {children}
    </View>
  );
}

/** Two buttons side by side: the quiet one and the main one. */
export function ButtonPair({ secondary, primary, style }) {
  return (
    <Row gap={S.sm} style={style}>
      {secondary ? <Button variant="secondary" size="lg" style={{ flex: 1 }} {...secondary} title={secondary.title} /> : null}
      {primary ? <Button size="lg" style={{ flex: 1 }} {...primary} /> : null}
    </Row>
  );
}

/** The OUT coin. */
export function Coin({ size = 18, style }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", alignItems: "center", justifyContent: "center" }, style]}>
      <LinearGradient colors={["#82b4ff", "#2a6af0"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
      <Text style={{ color: "#fff", fontFamily: F.display, fontSize: size * 0.55, lineHeight: size * 0.7 }}>O</Text>
    </View>
  );
}

/** On or off. */
export function Toggle({ value, onChange, disabled, label }) {
  return (
    <Switch
      value={!!value}
      disabled={disabled}
      onValueChange={(v) => {
        hapticSelection();
        onChange(v);
      }}
      accessibilityLabel={label}
      trackColor={{ false: C.surfaceHigh, true: C.accent }}
      thumbColor="#ffffff"
      {...(Platform.OS === "web" ? { activeThumbColor: "#ffffff" } : null)}
      ios_backgroundColor={C.surfaceHigh}
    />
  );
}

/** A thin bar, filled to `value` (0 to 1). */
export function Bar({ value = 0, colour = C.accent, track = "rgba(255,255,255,0.08)", height = 6, style }) {
  return (
    <View style={[{ height, borderRadius: height / 2, backgroundColor: track, overflow: "hidden" }, style]}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: "100%", borderRadius: height / 2, backgroundColor: colour }} />
    </View>
  );
}

/** Small letter spaced heading above a section. */
export const SectionLabel = ({ children, right, onRight, style }) => (
  <Row style={[{ justifyContent: "space-between", marginTop: S.xl, marginBottom: S.md }, style]}>
    <Text style={styles.sectionLabel}>{children}</Text>
    {right ? (
      <PressableScale onPress={onRight} scaleTo={0.94} hitSlop={8}>
        <Text style={styles.sectionRight}>{right}</Text>
      </PressableScale>
    ) : null}
  </Row>
);

export const ks = StyleSheet.create({
  // shared text styles for the Outside screens
  big: { color: C.text, fontFamily: F.display, fontSize: 30, lineHeight: 32 },
  label: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  dim: { color: C.textDim, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
  kicker: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase" },
});

const styles = StyleSheet.create({
  hero: { borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: "hidden", justifyContent: "flex-end", backgroundColor: "#07090c" },
  heroText: { paddingHorizontal: S.gutter, paddingBottom: S.xl },
  kicker: { fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase", marginBottom: 8 },
  headline: { color: C.text, fontFamily: F.display, fontSize: 50, lineHeight: 50, textTransform: "uppercase" },
  blue: { color: C.accent, textShadowColor: "rgba(61,139,255,0.45)", textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },
  sub: { color: C.textSoft, fontFamily: F.body, fontSize: 14, lineHeight: 20, marginTop: 10, maxWidth: 330 },
  glassButton: { backgroundColor: "rgba(12,15,20,0.55)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  topBar: { position: "absolute", left: S.gutter, right: S.gutter, flexDirection: "row", alignItems: "center", zIndex: 10 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", height: 32, paddingHorizontal: 12, borderRadius: R.full, backgroundColor: "rgba(27,31,38,0.8)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.14)" },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontFamily: F.bodySemi, fontSize: 13 },
  chipValue: { fontFamily: F.display, fontSize: 15, letterSpacing: 0.5 },
  statBox: { flex: 1, minHeight: 64, borderRadius: R.md, paddingVertical: 10, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: C.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  statBoxGlass: { backgroundColor: "rgba(255,255,255,0.07)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.1)" },
  statValue: { color: C.text, fontFamily: F.display, fontSize: 24, lineHeight: 26 },
  statLabel: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: S.gutter, paddingTop: S.xl },
  sectionLabel: { color: C.text, fontFamily: F.bodySemi, fontSize: 16 },
  sectionRight: { color: C.accent, fontFamily: F.bodyMedium, fontSize: 13 },
});
