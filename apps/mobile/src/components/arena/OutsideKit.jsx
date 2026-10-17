// Pieces the Outside screens share: the full bleed hero with its blue glow,
// round glass buttons over it, glass chips, the three stat boxes, a fixed
// bottom bar with two buttons, the OUT coin and a switch. Built from the
// design kit in components/ui (the finish kit: see components/ui/FINISH.md).

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, MoreHorizontal, Share2, X } from "@/components/ui/icons";
import { BlendImage, Button, C, F, FINISH, GlowBackdrop, Grain, Meter, PhotoBackground, PressableScale, R, Row, S, Surface, splitShadow } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";
import { SlabFade } from "@/components/ui/SlabFade";

const pct = (v) => (typeof v === "string" ? parseFloat(v) / 100 : v);
const rgba = (hex, a) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const SLAB_EDGE = splitShadow(FINISH.slabEdge);
const GLASS_EDGE = splitShadow(FINISH.glassEdge);

/** A soft blue light, as if a street lamp is just off screen. Drawn by the kit's GlowBackdrop. */
export function Glow({ x = "72%", y = "24%", r = "70%", colour = "#2a6af0", opacity = 0.42, style }) {
  const layers = React.useMemo(
    () => [{ x: pct(x), y: pct(y), rx: pct(r), ry: pct(r), stops: [[0, rgba(colour, opacity)], [0.55, rgba(colour, opacity * 0.25)], [1, rgba(colour, 0)]] }],
    [x, y, r, colour, opacity]
  );
  return <GlowBackdrop layers={layers} base={null} style={style} />;
}

/**
 * The screen hero (.oh-slab): full bleed under the status bar, rounded at
 * the bottom and lit along its lower edge, with a kicker and a two tone
 * headline. `photo` lays a picture underneath (faded the prototype's way,
 * with a slow push in); `object` floats a 3D object on the right with its
 * black dropped out (objectSize, objectStyle to place it). Film grain over
 * both. The text leaves room at the top for the Outside pills or the round
 * buttons.
 */
export function GlowHero({ photo, photoFocus, object, objectSize, objectStyle, kicker, kickerColour = C.accentHi, top, bottom, sub, height = 300, children, after, style, center = false, glow = true, photoOpacity = 1, headlineSize }) {
  const insets = useSafeAreaInsets();
  const size = objectSize || height * 0.86;
  return (
    <View style={[styles.heroFrame, { boxShadow: SLAB_EDGE.outer }, style]}>
      <View style={[styles.hero, { minHeight: height + insets.top }]}>
        {photo ? (
          <PhotoBackground source={photo} opacity={photoOpacity} focus={photoFocus} fade="slab" to="2,5,12" kenBurns glow={glow} grain={0} />
        ) : glow ? (
          <GlowBackdrop preset="slab" />
        ) : null}
        {object ? <BlendImage source={object} size={size} float glow={260} style={[{ position: "absolute", right: -24, top: insets.top + 20 }, objectStyle]} /> : null}
        <Grain amount={0.06} />
        <SlabFade />
        <View style={[styles.heroText, { paddingTop: insets.top + 64 }, center && { alignItems: "center" }]}>
          {kicker ? <Text style={[styles.kicker, { color: kickerColour }, center && { textAlign: "center" }]}>{kicker}</Text> : null}
          {top != null ? (
            <Text style={[styles.headline, headlineSize && { fontSize: headlineSize, lineHeight: headlineSize * 0.96 }, center && { textAlign: "center" }]} numberOfLines={2} adjustsFontSizeToFit>
              {top}
            </Text>
          ) : null}
          {bottom != null ? (
            <Text style={[styles.headline, styles.blue, headlineSize && { fontSize: headlineSize, lineHeight: headlineSize * 0.96 }, center && { textAlign: "center" }]} numberOfLines={2} adjustsFontSizeToFit>
              {bottom}
            </Text>
          ) : null}
          {sub ? <Text style={[styles.sub, center && { textAlign: "center" }]}>{sub}</Text> : null}
          {children}
        </View>
        {after}
      </View>
    </View>
  );
}

/** Round glass button for the top of a screen (.oh-btn.glass.icon): frosted, lit along its edge. */
export function GlassButton({ icon: Icon, onPress, label, size = 42, style }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.9} hitSlop={8} accessibilityLabel={label} style={[styles.glassButton, { width: size, height: size, borderRadius: size / 2, boxShadow: GLASS_EDGE.outer }, style]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: size / 2, boxShadow: GLASS_EDGE.inset }]} />
      <View>
        <Icon size={20} color={C.text} />
      </View>
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
    accent: [[styles.chip, { backgroundColor: "rgba(61,139,255,0.18)", boxShadow: "inset 0 1px 0 rgba(130,180,255,0.45), inset 0 0 0 1px rgba(61,139,255,0.3), 0 10px 24px -14px rgba(42,106,240,0.7)" }], C.accentHi],
    danger: [[styles.chip, { backgroundColor: "rgba(255,77,85,0.14)", boxShadow: "inset 0 1px 0 rgba(255,139,146,0.4), inset 0 0 0 1px rgba(255,77,85,0.35)" }], "#ff8a90"],
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
        <Surface key={it.label} tone={glass ? "glass" : "lit"} radius={R.md} padding={null} style={{ flex: 1 }} contentStyle={styles.statBox}>
          <Text style={[styles.statValue, it.accent && { color: C.accent }]} numberOfLines={1} adjustsFontSizeToFit>
            {it.value}
          </Text>
          <Text style={[styles.statLabel, glass && { color: "rgba(255,255,255,0.65)" }]} numberOfLines={1}>
            {it.label}
          </Text>
        </Surface>
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
      {secondary ? <Button variant="secondary" size="md" style={{ flex: 1, height: 52, paddingHorizontal: 10 }} {...secondary} title={secondary.title} /> : null}
      {primary ? <Button size="md" style={{ flex: 1, height: 52, paddingHorizontal: 10 }} {...primary} /> : null}
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

/** On or off: the kit's Toggle. */
export { Toggle } from "@/components/ui";

/** A bar filled to `value` (0 to 1): the kit's Meter, glowing, with light flowing along it. */
export function Bar({ value = 0, colour = C.accent, track, height = 6, cap = false, style }) {
  const tone = colour === C.danger || colour === C.alert ? "red" : colour === C.gold || colour === C.warn ? "gold" : colour === C.textDim || colour === C.textMute ? "grey" : "blue";
  return <Meter value={value} size={height} tone={tone} cap={cap} track={track} style={style} />;
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
  heroFrame: { borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  heroRadius: { borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  hero: { borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: "hidden", justifyContent: "flex-end", backgroundColor: FINISH.slab.base },
  heroText: { paddingHorizontal: S.gutter, paddingBottom: S.xl },
  kicker: { fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase", marginBottom: 8 },
  headline: { color: C.text, fontFamily: F.display, fontSize: 50, lineHeight: 48, textTransform: "uppercase", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 30, textShadowOffset: { width: 0, height: 2 } },
  blue: { color: C.accent, textShadowColor: "rgba(61,139,255,0.45)", textShadowRadius: 22, textShadowOffset: { width: 0, height: 0 } },
  sub: { color: C.textSoft, fontFamily: F.body, fontSize: 14, lineHeight: 20, marginTop: 10, maxWidth: 330 },
  glassButton: { backgroundColor: "rgba(20,24,31,0.55)", alignItems: "center", justifyContent: "center" },
  topBar: { position: "absolute", left: S.gutter, right: S.gutter, flexDirection: "row", alignItems: "center", zIndex: 10 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", height: 32, paddingHorizontal: 12, borderRadius: R.full, backgroundColor: "rgba(255,255,255,0.1)", boxShadow: FINISH.glassEdge },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontFamily: F.bodySemi, fontSize: 13 },
  chipValue: { fontFamily: F.display, fontSize: 15, letterSpacing: 0.5 },
  statBox: { minHeight: 62, paddingVertical: 10, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  statValue: { color: C.text, fontFamily: F.display, fontSize: 24, lineHeight: 26 },
  statLabel: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: S.gutter, paddingTop: S.xl },
  sectionLabel: { color: C.text, fontFamily: F.bodySemi, fontSize: 16 },
  sectionRight: { color: C.accent, fontFamily: F.bodyMedium, fontSize: 13 },
});
