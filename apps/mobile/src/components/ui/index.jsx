// OutHere design kit. Every screen builds from these so spacing, type and
// colour stay consistent: near-black canvas, one neon green accent, Clash
// Grotesk for headings and numbers, system font for body copy.

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
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { hapticSelection } from "@/services/haptics";
import { AnimatedBar, PressableScale } from "./motion";

export { PressableScale, FadeIn, Skeleton, SkeletonList, AnimatedNumber, AnimatedBar, LiveDot } from "./motion";
export { Cover, imageSource, accentFor } from "./Cover";
export { Sheet } from "./Sheet";
export { toast, ToastHost, ModalToastHost } from "./Toast";

// ── Tokens ────────────────────────────────────────────────────────────────────

export const C = {
  bg: "#0a0a0a",
  surface: "#121214",
  surfaceHigh: "#1a1a1d",
  border: "#1f1f22",
  borderStrong: "#34343a",
  text: "#ffffff",
  textDim: "#a1a1a6",
  textMute: "#636366",
  accent: "#00ff7f",
  accentDim: "rgba(0,255,127,0.12)",
  accentText: "#04140b",
  danger: "#ff453a",
  dangerDim: "rgba(255,69,58,0.12)",
  warn: "#ffc107",
  fire: "#ff6b35",
  gold: "#ffd700",
  pro: "#7cc4ff",
  black: "#e5e4e2",
};

export const F = {
  display: "ClashGrotesk-Bold",
  displayMedium: "ClashGrotesk-Medium",
};

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, gutter: 20 };
export const R = { sm: 10, md: 14, lg: 20, xl: 28, full: 999 };

// Room left at the bottom of tab screens so content clears the tab bar.
export const TAB_BAR_SPACE = 110;

export const tierColour = (tier) => (tier === "black" ? C.black : tier === "pro" ? C.pro : C.textDim);

// ── Text ──────────────────────────────────────────────────────────────────────

export const Title = ({ children, size = 28, style, ...rest }) => (
  <Text style={[{ fontFamily: F.display, fontSize: size, color: C.text, letterSpacing: -0.3 }, style]} {...rest}>
    {children}
  </Text>
);

export const Label = ({ children, style, ...rest }) => (
  <Text style={[styles.label, style]} {...rest}>
    {children}
  </Text>
);

export const Body = ({ children, dim, mute, size = 15, style, ...rest }) => (
  <Text style={[{ fontSize: size, lineHeight: size * 1.4, color: mute ? C.textMute : dim ? C.textDim : C.text }, style]} {...rest}>
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
  const base = [styles.card, { padding }, highlight && styles.cardHighlight, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={base}>
      {children}
    </PressableScale>
  );
}

export const SectionHeader = ({ title, action, onAction, style }) => (
  <Row style={[{ justifyContent: "space-between", marginTop: S.xxl, marginBottom: S.md }, style]}>
    <Title size={20}>{title}</Title>
    {action ? (
      <Pressable onPress={onAction} hitSlop={8}>
        <Text style={{ color: C.textDim, fontSize: 14, fontWeight: "600" }}>{action}</Text>
      </Pressable>
    ) : null}
  </Row>
);

export const Divider = ({ style }) => <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: C.border }, style]} />;

// ── Controls ──────────────────────────────────────────────────────────────────

const BUTTON_VARIANTS = {
  primary: { bg: C.accent, fg: C.accentText, border: C.accent },
  secondary: { bg: C.surfaceHigh, fg: C.text, border: "transparent" },
  ghost: { bg: "transparent", fg: C.text, border: "transparent" },
  outline: { bg: "transparent", fg: C.accent, border: C.accent },
  danger: { bg: C.dangerDim, fg: C.danger, border: "rgba(255,69,58,0.4)" },
};

export function Button({ title, onPress, variant = "primary", size = "md", icon: Icon, iconRight: IconRight, loading = false, disabled = false, full = false, style }) {
  const v = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  const height = size === "sm" ? 36 : size === "lg" ? 56 : 48;
  const off = disabled || loading;
  return (
    <PressableScale
      disabled={off}
      onPress={onPress}
      scaleTo={0.96}
      style={[
        styles.button,
        { height, backgroundColor: v.bg, borderColor: v.border, paddingHorizontal: size === "sm" ? 14 : 20 },
        full && { alignSelf: "stretch" },
        off && { opacity: 0.45 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {Icon ? <Icon size={size === "sm" ? 15 : 18} color={v.fg} /> : null}
          <Text style={{ color: v.fg, fontFamily: F.displayMedium, fontSize: size === "sm" ? 14 : 16, letterSpacing: 0.2 }}>{title}</Text>
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
    warn: ["rgba(255,193,7,0.14)", C.warn],
    pro: ["rgba(124,196,255,0.14)", C.pro],
    black: ["rgba(229,228,226,0.12)", C.black],
    fire: ["rgba(255,107,53,0.15)", C.fire],
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

const AVATAR_COLOURS = ["#FF6B35", "#3DA9FC", "#9B5CFF", "#00d4aa", "#FFD700", "#FF6FB5", "#7CFC00"];
const colourFromName = (name) => {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
};

/**
 * Round avatar. Coloured initials always sit underneath, so a slow or failed
 * photo still shows something personal.
 */
export function Avatar({ uri, name = "", size = 44, ring, colour, outside = false, style }) {
  const [failed, setFailed] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const initials = name
    .split(/[\s._]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  const tint = colour || colourFromName(name || "?");
  return (
    <View style={[{ width: size, height: size }, style]}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          backgroundColor: `${tint}26`,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: ring ? 2 : 0,
          borderColor: ring || "transparent",
        }}
      >
        <Text style={{ color: tint, fontFamily: F.display, fontSize: size * 0.38 }}>{initials || "?"}</Text>
        {uri && !failed ? (
          <Image
            source={{ uri }}
            style={[StyleSheet.absoluteFill, { opacity: loaded ? 1 : 0 }]}
            contentFit="cover"
            transition={200}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        ) : null}
      </View>
      {outside ? (
        <View
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: Math.max(10, size * 0.26),
            height: Math.max(10, size * 0.26),
            borderRadius: 99,
            backgroundColor: C.accent,
            borderWidth: 2,
            borderColor: C.bg,
          }}
        />
      ) : null}
    </View>
  );
}

export const StatTile = ({ label, value, hint, accent = false, style }) => (
  <View style={[styles.statTile, style]}>
    <Label>{label}</Label>
    <Text style={[styles.statValue, accent && { color: C.accent }]} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
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
        <Text style={{ color: C.text, fontSize: 15, fontWeight: "600" }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: C.textDim, fontSize: 13, marginTop: 2 }} numberOfLines={2}>
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
  label: { color: C.textMute, fontSize: 11, fontWeight: "700", letterSpacing: 1.1, textTransform: "uppercase" },
  header: { flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.gutter, paddingTop: S.sm, paddingBottom: S.md },
  headerRight: { flexDirection: "row", alignItems: "center", gap: S.sm },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  badgeDot: { position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.bg },
  badgeDotText: { color: C.accentText, fontSize: 10, fontWeight: "800" },
  card: { backgroundColor: C.surface, borderRadius: R.lg },
  cardHighlight: { borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "#161618" },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: S.sm, borderRadius: R.full, borderWidth: 1 },
  segment: { flexDirection: "row", backgroundColor: C.surface, borderRadius: R.full, padding: 4 },
  segmentItem: { flex: 1, height: 34, borderRadius: R.full, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  segmentItemActive: { backgroundColor: C.text },
  segmentText: { color: C.textDim, fontSize: 13, fontWeight: "600" },
  segmentTextActive: { color: C.bg },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, height: 22, borderRadius: R.full, alignSelf: "flex-start" },
  pillText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  statTile: { flex: 1, backgroundColor: C.surface, borderRadius: R.md, padding: S.md, gap: 4 },
  statValue: { color: C.text, fontFamily: F.display, fontSize: 24 },
});
