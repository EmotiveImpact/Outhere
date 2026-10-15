// Outhere design kit, midnight finish. Every screen builds from these so
// spacing, type and colour stay consistent: a near-black blue canvas, surfaces
// lit from above, Barlow Condensed for headlines and numbers, Inter for copy.
//
// Colour rule: blue acts, red is stop. Blue fills forward actions and the
// out now dot; red is only for End, Pause, Leave, the opponent in a 1v1 and
// the just stopped dot. The ring round a photo only ever means membership.

import React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { hapticSelection } from "@/services/haptics";
import { AnimatedBar, PressableScale } from "./motion";
import { Ring } from "./Ring";
import { imageSource } from "./Cover";
import { C, F, LIT, R, S } from "./tokens";

export { PressableScale, FadeIn, Skeleton, SkeletonList, AnimatedNumber, AnimatedBar, LiveDot } from "./motion";
export { Cover, imageSource, accentFor } from "./Cover";
export { Sheet } from "./Sheet";
export { Ring, Dot } from "./Ring";
export { Hero } from "./Hero";
export { Logo, Wordmark } from "./Logo";
export { SlideToStart } from "./SlideToStart";
export { toast, ToastHost, ModalToastHost } from "./Toast";

// ── Tokens ────────────────────────────────────────────────────────────────────

export { C, F, S, R, LIT } from "./tokens";

// Room left at the bottom of tab screens so content clears the tab bar.
export const TAB_BAR_SPACE = 110;

export const tierColour = (tier) => (tier === "black" ? C.black : tier === "pro" ? C.pro : C.textDim);



// ── Text ──────────────────────────────────────────────────────────────────────

/**
 * Headlines. Big sizes use upright Barlow Condensed in capitals; small
 * sizes (card titles) use Inter. `blue` is the second tone of a two-tone
 * headline: <Title>8,412 steps</Title><Title blue>and counting</Title>.
 */
export const Title = ({ children, size = 28, blue = false, style, ...rest }) => {
  const display = size >= 24;
  return (
    <Text
      style={[
        display
          ? { fontFamily: F.display, fontSize: size * 1.12, lineHeight: size * 1.08, textTransform: "uppercase", letterSpacing: 0.2 }
          : { fontFamily: F.bodySemi, fontSize: size, letterSpacing: -0.2 },
        { color: blue ? C.accent : C.text },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
};

/** Two-tone headline used once per screen: white line then blue line. */
export const Headline = ({ top, bottom, size = 40, style }) => (
  <View style={style}>
    <Title size={size} numberOfLines={2} adjustsFontSizeToFit>{top}</Title>
    {bottom ? <Title size={size} blue numberOfLines={2} adjustsFontSizeToFit>{bottom}</Title> : null}
  </View>
);

/** Small tracked blue caption over a headline: "YOUR STREAK". */
export const Kicker = ({ children, colour = C.accent, style }) => (
  <Text style={[{ color: colour, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }, style]}>{children}</Text>
);

export const Label = ({ children, style, ...rest }) => (
  <Text style={[styles.label, style]} {...rest}>
    {children}
  </Text>
);

export const Body = ({ children, dim, mute, size = 15, style, ...rest }) => (
  <Text style={[{ fontFamily: F.body, fontSize: size, lineHeight: size * 1.4, color: mute ? C.textMute : dim ? C.textDim : C.text }, style]} {...rest}>
    {children}
  </Text>
);

// ── Layout ────────────────────────────────────────────────────────────────────

/**
 * Full screen container. `scroll` wraps content in a ScrollView with optional
 * pull to refresh; `tab` adds bottom space for the tab bar.
 */
export function Screen({ children, scroll = true, tab = false, onRefresh, refreshing = false, padded = true, header, contentStyle, style }) {
  const insets = useSafeAreaInsets();
  const bottom = (tab ? TAB_BAR_SPACE : 32) + insets.bottom;
  const inner = padded ? { paddingHorizontal: S.gutter } : null;
  return (
    <View style={[{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }, style]}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[inner, { paddingBottom: bottom }, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} /> : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

/** Screen header with optional back button and a right-hand slot. */
export function Header({ title, subtitle, back = false, onBack, right, large = false, style }) {
  const router = useRouter();
  const goBack = () => {
    hapticSelection();
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };
  return (
    <View style={[styles.header, style]}>
      {back ? (
        <Pressable onPress={goBack} hitSlop={12} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Back">
          <ChevronLeft size={22} color={C.text} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        {title ? <Title size={large ? 32 : back ? 20 : 26}>{title}</Title> : null}
        {subtitle ? <Body dim size={13} style={{ marginTop: 2 }}>{subtitle}</Body> : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

export const IconButton = ({ icon: Icon, onPress, badge, size = 20, label, active = false, style }) => (
  <PressableScale onPress={onPress} hitSlop={8} accessibilityLabel={label} scaleTo={0.9} style={[styles.iconButton, active && { backgroundColor: C.text }, style]}>
    <Icon size={size} color={active ? C.bg : C.text} />
    {badge ? (
      <View style={styles.badgeDot}>
        <Text style={styles.badgeDotText}>{badge > 9 ? "9+" : badge}</Text>
      </View>
    ) : null}
  </PressableScale>
);

export const Row = ({ children, gap = S.sm, style, ...rest }) => (
  <View style={[{ flexDirection: "row", alignItems: "center", gap }, style]} {...rest}>
    {children}
  </View>
);

export const Spacer = ({ h = S.lg }) => <View style={{ height: h }} />;

// ── Surfaces ──────────────────────────────────────────────────────────────────

export function Card({ children, onPress, highlight = false, padding = S.lg, style }) {
  const base = [styles.card, highlight && styles.cardHighlight, style];
  const inner = (
    <>
      <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { borderRadius: R.lg }]} />
      <View style={{ padding }}>{children}</View>
    </>
  );
  if (!onPress) return <View style={base}>{inner}</View>;
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={base}>
      {inner}
    </PressableScale>
  );
}

export const SectionHeader = ({ title, action, onAction, style }) => (
  <Row style={[{ justifyContent: "space-between", marginTop: S.xxl, marginBottom: S.md }, style]}>
    <Title size={20}>{title}</Title>
    {action ? (
      <Pressable onPress={onAction} hitSlop={8}>
        <Text style={{ color: C.accent, fontSize: 13, fontFamily: F.bodyMedium }}>{action}</Text>
      </Pressable>
    ) : null}
  </Row>
);

export const Divider = ({ style }) => <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: C.border }, style]} />;

// ── Controls ──────────────────────────────────────────────────────────────────

const BUTTON_VARIANTS = {
  primary: { bg: C.accent, fg: C.accentText, gradient: [C.accent, C.accentDeep] },
  secondary: { bg: C.surfaceHigh, fg: C.text },
  ghost: { bg: "transparent", fg: C.text },
  outline: { bg: C.accentDim, fg: C.accentHi },
  danger: { bg: C.danger, fg: "#ffffff", gradient: ["#ff5c63", "#e0343d"] },
};

/** Borderless pill buttons. Primary is the blue gradient with a soft glow. */
export function Button({ title, onPress, variant = "primary", size = "md", icon: Icon, iconRight: IconRight, loading = false, disabled = false, full = false, accessibilityLabel, style }) {
  const v = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  const height = size === "sm" ? 36 : size === "lg" ? 58 : 48;
  const off = disabled || loading;
  const big = size === "lg";
  return (
    <PressableScale
      disabled={off}
      onPress={onPress}
      scaleTo={0.96}
      accessibilityLabel={accessibilityLabel || title}
      style={[
        styles.button,
        { height, backgroundColor: v.gradient ? "transparent" : v.bg, paddingHorizontal: size === "sm" ? 14 : 22 },
        v.gradient && !off && { shadowColor: v.bg, shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
        full && { alignSelf: "stretch" },
        off && { opacity: 0.45 },
        style,
      ]}
    >
      {v.gradient ? (
        <LinearGradient colors={v.gradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: R.full }]} />
      ) : null}
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {Icon ? <Icon size={size === "sm" ? 15 : 18} color={v.fg} /> : null}
          <Text
            style={
              big
                ? { color: v.fg, fontFamily: F.display, fontSize: 20, letterSpacing: 1.6, textTransform: "uppercase" }
                : { color: v.fg, fontFamily: F.bodySemi, fontSize: size === "sm" ? 13 : 15 }
            }
          >
            {title}
          </Text>
          {IconRight ? <IconRight size={size === "sm" ? 15 : 18} color={v.fg} /> : null}
        </>
      )}
    </PressableScale>
  );
}

/** Pill tabs. options: [{ value, label }] or strings. */
export function Segment({ options, value, onChange, style }) {
  return (
    <View style={[styles.segment, style]}>
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              hapticSelection();
              onChange(opt.value);
            }}
            style={[styles.segmentItem, active && styles.segmentItemActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Small rounded label. tone: accent | neutral | danger | warn | pro | black | fire */
export function Pill({ label, tone = "neutral", icon: Icon, style }) {
  const tones = {
    accent: [C.accentDim, C.accent],
    neutral: [C.surfaceHigh, C.textDim],
    danger: [C.dangerDim, C.danger],
    warn: ["rgba(255,181,71,0.14)", C.warn],
    pro: ["rgba(61,139,255,0.16)", C.accentHi],
    black: ["rgba(154,163,174,0.16)", "#d9dee5"],
    fire: ["rgba(255,122,61,0.15)", C.fire],
  };
  const [bg, fg] = tones[tone] || tones.neutral;
  return (
    <View style={[styles.pill, { backgroundColor: bg }, style]}>
      {Icon ? <Icon size={12} color={fg} /> : null}
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export const TierBadge = ({ tier, style }) =>
  tier && tier !== "free" ? <Pill label={tier === "black" ? "BLACK" : "PRO"} tone={tier} style={style} /> : null;

// ── Data display ──────────────────────────────────────────────────────────────

/**
 * A person's photo. The ring shows their membership (pass `tier`), the dot at
 * the bottom right shows they are out now (`dot="out"`, blue) or have just
 * stopped (`dot="stopped"`, red). In the stories row only, pass
 * `story="unwatched"` or `"watched"`: the ring then shows the story, not
 * membership. Clubs pass `square`. Old callers may still pass `outside`.
 */
export function Avatar({ uri, source, name = "", size = 44, tier, dot, outside = false, story, square = false, ring, style }) {
  return (
    <Ring
      size={size}
      tier={tier}
      dot={dot || (outside ? "out" : null)}
      story={story}
      square={square}
      ringColour={ring}
      source={source ?? imageSource(uri)}
      name={name}
      style={style}
    />
  );
}

export const StatTile = ({ label, value, hint, accent = false, style }) => (
  <View style={[styles.statTile, style]}>
    <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { borderRadius: R.md }]} />
    <Text style={[styles.statValue, accent && { color: C.accent }]} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    {hint ? <Body mute size={12}>{hint}</Body> : null}
  </View>
);

export const ProgressBar = ({ value = 0, height = 8, colour = C.accent, track = C.surfaceHigh, style }) => (
  <AnimatedBar value={value} height={height} colour={colour} track={track} style={style} />
);

/** Tappable list row with leading element, title, subtitle and trailing slot. */
export function ListRow({ leading, title, subtitle, trailing, onPress, chevron = !!onPress, style }) {
  const content = (
    <Row gap={S.md} style={[{ paddingVertical: S.md }, style]}>
      {leading}
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontSize: 15, fontFamily: F.bodySemi }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: C.textDim, fontSize: 13, marginTop: 2, fontFamily: F.body }} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {chevron ? <ChevronRight size={18} color={C.textMute} /> : null}
    </Row>
  );
  if (!onPress) return content;
  return (
    <PressableScale onPress={onPress} scaleTo={0.985}>
      {content}
    </PressableScale>
  );
}

// ── States ────────────────────────────────────────────────────────────────────

export const Loading = ({ style }) => (
  <View style={[{ paddingVertical: 48, alignItems: "center" }, style]}>
    <ActivityIndicator color={C.accent} />
  </View>
);

export function EmptyState({ icon: Icon, title, body, action, onAction, style }) {
  return (
    <View style={[{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 24 }, style]}>
      {Icon ? (
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center", marginBottom: S.lg }}>
          <Icon size={28} color={C.textDim} />
        </View>
      ) : null}
      <Title size={20} style={{ textAlign: "center" }}>{title}</Title>
      {body ? <Body dim style={{ textAlign: "center", marginTop: S.sm }}>{body}</Body> : null}
      {action ? <Button title={action} onPress={onAction} style={{ marginTop: S.xl }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: C.textDim, fontSize: 11, fontFamily: F.bodySemi, letterSpacing: 1.4, textTransform: "uppercase" },
  header: { flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.gutter, paddingTop: S.sm, paddingBottom: S.md },
  headerRight: { flexDirection: "row", alignItems: "center", gap: S.sm },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(27,31,38,0.85)", alignItems: "center", justifyContent: "center", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  badgeDot: { position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.bg },
  badgeDotText: { color: C.accentText, fontSize: 10, fontFamily: F.bodySemi },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.04)",
    borderTopColor: C.hairlineTop,
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 4,
  },
  cardHighlight: { borderColor: "rgba(61,139,255,0.35)" },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: S.sm, borderRadius: R.full, overflow: "visible" },
  segment: { flexDirection: "row", backgroundColor: C.surface, borderRadius: R.full, padding: 4 },
  segmentItem: { flex: 1, height: 34, borderRadius: R.full, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  segmentItemActive: { backgroundColor: C.accent },
  segmentText: { color: C.textDim, fontSize: 13, fontFamily: F.bodySemi },
  segmentTextActive: { color: C.accentText },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, height: 22, borderRadius: R.full, alignSelf: "flex-start" },
  pillText: { fontSize: 11, fontFamily: F.bodySemi, letterSpacing: 0.6 },
  statTile: { flex: 1, backgroundColor: C.surface, borderRadius: R.md, padding: S.md, gap: 2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  statValue: { color: C.text, fontFamily: F.display, fontSize: 28 },
  statLabel: { color: C.textDim, fontSize: 12, fontFamily: F.body },
});
