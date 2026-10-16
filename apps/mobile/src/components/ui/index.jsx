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
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { PressableScale } from "./motion";
import { Ring } from "./Ring";
import { imageSource } from "./Cover";
import { GlowButton } from "./GlowButton";
import { Meter } from "./Meter";
import { Surface } from "./Surface";
import { useLayoutSize } from "./layout";
import { C, EASE, F, FINISH, LIT, R, S, splitShadow } from "./tokens";

export { PressableScale, FadeIn, Skeleton, SkeletonList, AnimatedNumber, AnimatedBar, LiveDot } from "./motion";
export { Cover, imageSource, accentFor } from "./Cover";
export { Sheet } from "./Sheet";
export { Ring, Dot } from "./Ring";
export { Hero } from "./Hero";
export { Logo, Wordmark } from "./Logo";
export { SlideToStart } from "./SlideToStart";
export { toast, ToastHost, ModalToastHost } from "./Toast";
export { ErrorState, OfflineBanner, StillCounting, SyncList } from "./states";

// The finish kit: see FINISH.md in this folder.
export { Surface, SURFACE_TONES, IconTile } from "./Surface";
export { GlowButton, GLOW_BUTTONS } from "./GlowButton";
export { Meter, METER_TONES, TugBar } from "./Meter";
export { BlendImage } from "./BlendImage";
export { GlowBackdrop } from "./GlowBackdrop";
export { Grain } from "./Grain";
export { PhotoBackground } from "./PhotoBackground";
export { VersusSplit } from "./VersusSplit";
export { Spotlight, SpotlightNumber, hypeColour, HYPE_COLOURS } from "./Spotlight";
export { TabBar } from "./TabBar";
export { GLOWS, MASKS } from "./glows";
export { TOP_GAP, SCREEN_TOP, TAB_BAR, useScreenTop, useTabBarBottom, ScreenTop, useLayoutSize } from "./layout";
export { useSkiaReady } from "./skia";
export { RollingNumber, CountUp, Lift } from "./Rolling";

// The shader kit (shaders/): brushed metal, aurora, heat and liquid, foil, city lights.
export { Sheen, Aurora, Shimmer, LiquidBar, LiquidRing, Foil, CityLights, BlackCard, useLiveCanvas } from "./shaders";

// ── Tokens ────────────────────────────────────────────────────────────────────

export { C, F, S, R, LIT, FINISH, EASE, splitShadow } from "./tokens";

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
    {active ? null : <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { borderRadius: 21 }]} />}
    {active ? null : <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.iconButtonEdge]} />}
    {/* Wrapped so the icon paints above the lit body on the web too. */}
    <View>
      <Icon size={size} color={active ? C.bg : C.text} />
    </View>
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

/**
 * A card: the kit's lit Surface (see Surface.jsx). `highlight` tints it blue
 * for your own row. Tappable cards sink and light up under the finger.
 * Padding in `style` adds to `padding`, as it always has.
 */
export function Card({ children, onPress, highlight = false, padding = S.lg, tone, style }) {
  return (
    <Surface tone={tone || (highlight ? "blue" : "lit")} padding={0} onPress={onPress} style={style}>
      <View style={{ padding }}>{children}</View>
    </Surface>
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

/**
 * Pill buttons: the kit's GlowButton (see GlowButton.jsx). variant: primary
 * (blue, acts), secondary (a lit quiet button), outline, ghost, glass, or
 * danger / stop (red, only for End, Pause and Leave).
 */
export function Button({ title, onPress, variant = "primary", size = "md", icon, iconRight, lead, loading = false, disabled = false, full = false, accessibilityLabel, style }) {
  return (
    <GlowButton
      title={title}
      onPress={onPress}
      variant={variant}
      size={size}
      icon={icon}
      iconRight={iconRight}
      lead={lead}
      loading={loading}
      disabled={disabled}
      full={full}
      square={!title && !!icon}
      accessibilityLabel={accessibilityLabel}
      style={style}
    />
  );
}

const SEG_TRACK = splitShadow(`${FINISH.litEdge}, 0 14px 28px -20px #000`);
const SEG_THUMB = splitShadow("inset 0 1px 0 rgba(255,255,255,0.3), 0 8px 20px -8px rgba(42,106,240,0.95)");

/**
 * Pill tabs (.seg, round ten): a lit track with a blue thumb that slides to the
 * chosen option on a spring. options: [{ value, label }] or strings.
 */
export function Segment({ options, value, onChange, style }) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const index = Math.max(0, opts.findIndex((o) => o.value === value));
  const [box, onLayout] = useLayoutSize();
  const slot = box ? (box.width - 8) / opts.length : 0;
  const x = useSharedValue(index * slot);
  React.useEffect(() => {
    x.value = box ? withSpring(index * slot, EASE.thumb) : index * slot;
  }, [index, slot, box, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={[styles.segment, { boxShadow: SEG_TRACK.outer }, style]} onLayout={onLayout}>
      <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { borderRadius: R.full }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: R.full, boxShadow: SEG_TRACK.inset }]} />
      {slot ? (
        <Animated.View pointerEvents="none" style={[styles.segmentThumb, { width: slot, boxShadow: SEG_THUMB.outer }, thumb]}>
          <View style={styles.segmentThumbBody}>
            <LinearGradient colors={FINISH.act} locations={FINISH.actStops} style={StyleSheet.absoluteFill} />
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: R.full, boxShadow: SEG_THUMB.inset }]} />
          </View>
        </Animated.View>
      ) : null}
      {opts.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              hapticSelection();
              onChange(opt.value);
            }}
            style={styles.segmentItem}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
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
  <Surface radius={R.md} padding={S.md} style={[{ flex: 1 }, style]} contentStyle={{ gap: 2 }}>
    <Text style={[styles.statValue, accent && { color: C.accent }]} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    {hint ? <Body mute size={12}>{hint}</Body> : null}
  </Surface>
);

/**
 * A progress bar: the kit's Meter (see Meter.jsx), a recessed track with a
 * glowing fill. Old callers pass height and colour; red, gold and grey map
 * to the Meter's tones.
 */
export const ProgressBar = ({ value = 0, height = 8, colour, tone, track, cap = false, style }) => (
  <Meter value={value} size={Math.max(6, height)} tone={tone || toneOf(colour)} cap={cap} track={track === C.surfaceHigh ? undefined : track} style={style} />
);

const toneOf = (colour) =>
  colour === C.danger || colour === C.alert
    ? "red"
    : colour === C.gold || colour === C.warn
      ? "gold"
      : colour === C.textDim || colour === C.textMute || colour === C.free
        ? "grey"
        : "blue";

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
        <Surface radius={32} padding={0} style={{ width: 64, height: 64, marginBottom: S.lg }} contentStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Icon size={28} color={C.accentHi} />
        </Surface>
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
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", boxShadow: FINISH.shadowCard },
  iconButtonEdge: { borderRadius: 21, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.05)" },
  badgeDot: { position: "absolute", top: -2, right: -2, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.bg },
  badgeDotText: { color: C.accentText, fontSize: 10, fontFamily: F.bodySemi },
  segment: { flexDirection: "row", borderRadius: R.full, padding: 4 },
  segmentThumb: { position: "absolute", top: 4, bottom: 4, left: 4, borderRadius: R.full },
  segmentThumbBody: { ...StyleSheet.absoluteFillObject, borderRadius: R.full, overflow: "hidden" },
  segmentItem: { flex: 1, height: 34, borderRadius: R.full, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  segmentText: { color: C.textSoft, fontSize: 13, fontFamily: F.bodyMedium },
  segmentTextActive: { color: C.accentText, fontFamily: F.bodySemi },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, height: 22, borderRadius: R.full, alignSelf: "flex-start" },
  pillText: { fontSize: 11, fontFamily: F.bodySemi, letterSpacing: 0.6 },
  statValue: { color: C.text, fontFamily: F.display, fontSize: 28 },
  statLabel: { color: C.textDim, fontSize: 12, fontFamily: F.body },
});
