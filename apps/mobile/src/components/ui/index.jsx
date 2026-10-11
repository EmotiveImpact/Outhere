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

// ── Tokens ────────────────────────────────────────────────────────────────────

export const C = {
  bg: "#0a0a0a",
  surface: "#141416",
  surfaceHigh: "#1c1c1f",
  border: "#232326",
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

export const IconButton = ({ icon: Icon, onPress, badge, size = 20, label, style }) => (
  <Pressable
    onPress={() => {
      hapticSelection();
      onPress?.();
    }}
    hitSlop={8}
    accessibilityRole="button"
    accessibilityLabel={label}
    style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }, style]}
  >
    <Icon size={size} color={C.text} />
    {badge ? (
      <View style={styles.badgeDot}>
        <Text style={styles.badgeDotText}>{badge > 9 ? "9+" : badge}</Text>
      </View>
    ) : null}
  </Pressable>
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
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      style={({ pressed }) => [...base, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}
    >
      {children}
    </Pressable>
  );
}

export const SectionHeader = ({ title, action, onAction, style }) => (
  <Row style={[{ justifyContent: "space-between", marginTop: S.xxl, marginBottom: S.md }, style]}>
    <Title size={19}>{title}</Title>
    {action ? (
      <Pressable onPress={onAction} hitSlop={8}>
        <Text style={{ color: C.accent, fontSize: 14, fontWeight: "600" }}>{action}</Text>
      </Pressable>
    ) : null}
  </Row>
);

export const Divider = ({ style }) => <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: C.border }, style]} />;

// ── Controls ──────────────────────────────────────────────────────────────────

const BUTTON_VARIANTS = {
  primary: { bg: C.accent, fg: C.accentText, border: C.accent },
  secondary: { bg: C.surfaceHigh, fg: C.text, border: C.borderStrong },
  ghost: { bg: "transparent", fg: C.text, border: "transparent" },
  outline: { bg: "transparent", fg: C.accent, border: C.accent },
  danger: { bg: C.dangerDim, fg: C.danger, border: "rgba(255,69,58,0.4)" },
};

export function Button({ title, onPress, variant = "primary", size = "md", icon: Icon, loading = false, disabled = false, full = false, style }) {
  const v = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  const height = size === "sm" ? 36 : size === "lg" ? 56 : 48;
  const off = disabled || loading;
  return (
    <Pressable
      disabled={off}
      onPress={() => {
        hapticSelection();
        onPress?.();
      }}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { height, backgroundColor: v.bg, borderColor: v.border, paddingHorizontal: size === "sm" ? 14 : 20 },
        full && { alignSelf: "stretch" },
        off && { opacity: 0.45 },
        pressed && !off && { opacity: 0.8, transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {Icon ? <Icon size={size === "sm" ? 15 : 18} color={v.fg} /> : null}
          <Text style={{ color: v.fg, fontFamily: F.displayMedium, fontSize: size === "sm" ? 14 : 16, letterSpacing: 0.2 }}>{title}</Text>
        </>
      )}
    </Pressable>
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

export function Avatar({ uri, name = "", size = 44, ring, outside = false, style }) {
  const initials = name
    .split(/[\s._]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <View style={[{ width: size, height: size }, style]}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          backgroundColor: C.surfaceHigh,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: ring ? 2 : 0,
          borderColor: ring || "transparent",
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={150} />
        ) : (
          <Text style={{ color: C.textDim, fontFamily: F.displayMedium, fontSize: size * 0.36 }}>{initials || "?"}</Text>
        )}
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
  <View style={[{ height, borderRadius: height, backgroundColor: track, overflow: "hidden" }, style]}>
    <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: "100%", borderRadius: height, backgroundColor: colour }} />
  </View>
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
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      style={({ pressed }) => pressed && { opacity: 0.6 }}
    >
      {content}
    </Pressable>
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
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center", marginBottom: S.lg }}>
          <Icon size={28} color={C.accent} />
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
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  badgeDot: { position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.bg },
  badgeDotText: { color: C.accentText, fontSize: 10, fontWeight: "800" },
  card: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border },
  cardHighlight: { borderColor: "rgba(0,255,127,0.35)", backgroundColor: "#0f1a14" },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: S.sm, borderRadius: R.full, borderWidth: 1 },
  segment: { flexDirection: "row", backgroundColor: C.surface, borderRadius: R.full, padding: 4, borderWidth: 1, borderColor: C.border },
  segmentItem: { flex: 1, height: 34, borderRadius: R.full, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  segmentItemActive: { backgroundColor: C.accent },
  segmentText: { color: C.textDim, fontSize: 13, fontWeight: "600" },
  segmentTextActive: { color: C.accentText },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, height: 22, borderRadius: R.full, alignSelf: "flex-start" },
  pillText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  statTile: { flex: 1, backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.md, gap: 4 },
  statValue: { color: C.text, fontFamily: F.display, fontSize: 24 },
});
