// The prototype's .oh-btn: a pill with a lit body, a bright top edge, a dark
// bottom edge and a coloured glow underneath. A sheen of light sweeps across
// it every few seconds (.shine) and again whenever it is pressed. It sinks
// on a spring when touched.
//
//   <GlowButton title="Start outside" onPress={go} />                 blue acts
//   <GlowButton title="End" variant="stop" icon={Square} />           red stops
//   <GlowButton title="Not now" variant="quiet" />                    a lit surface
//   <GlowButton title="Share" variant="glass" lead={Share2} />        over a photo
//   <GlowButton title="Join" size="sm" />                             .oh-btn.pill
//
// Blue is for forward actions only and red only for End, Pause and Leave.
// Never put a forward action on the stop variant.

import React, { useEffect } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { play as playHaptic } from "@/services/haptics";
import { useLayoutSize } from "./layout";
import { C, EASE, F, R, splitShadow } from "./tokens";

// Every button is built the same way: a 1px edge that is bright along the
// top and darker at the bottom, the body inside it, a soft gloss over the
// upper half, the sheen, a crisp white glint across the top edge where the
// light catches it, and the label. Underneath sits a tight coloured glow
// and a small dark shadow that grounds it.
const EDGE_STOPS = [0, 0.42, 0.78, 1];
const GLOSS = ["rgba(255,255,255,0.17)", "rgba(255,255,255,0.05)", "rgba(255,255,255,0)", "rgba(0,0,0,0.12)"];
const GLOSS_SOFT = ["rgba(255,255,255,0.05)", "rgba(255,255,255,0.015)", "rgba(255,255,255,0)", "rgba(0,0,0,0.1)"];
const GLOSS_STOPS = [0, 0.48, 0.62, 1];

export const GLOW_BUTTONS = {
  primary: {
    body: ["#5592ff", "#2f6ff3", "#2156d6"],
    stops: [0, 0.55, 1],
    edge: ["rgba(200,222,255,0.9)", "rgba(120,170,255,0.5)", "rgba(42,106,240,0.6)", "rgba(22,64,175,0.95)"],
    gloss: GLOSS,
    shadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 1px 2px rgba(0,0,0,0.5), 0 6px 14px -6px rgba(42,106,240,0.8), 0 16px 30px -18px rgba(42,106,240,0.45)",
    fg: "#ffffff",
    glint: 0.95,
    sheen: 0.34,
  },
  stop: {
    body: ["#f2545d", "#d92f39", "#b21f29"],
    stops: [0, 0.55, 1],
    edge: ["rgba(255,208,211,0.85)", "rgba(255,130,136,0.5)", "rgba(212,42,51,0.6)", "rgba(128,14,22,0.95)"],
    gloss: GLOSS,
    shadow: "inset 0 1px 0 rgba(255,255,255,0.28), 0 1px 2px rgba(0,0,0,0.5), 0 6px 14px -6px rgba(212,42,51,0.75), 0 16px 30px -18px rgba(212,42,51,0.4)",
    fg: "#ffffff",
    glint: 0.9,
    sheen: 0.3,
  },
  quiet: {
    body: ["#1f242c", "#15181e"],
    edge: ["rgba(255,255,255,0.17)", "rgba(255,255,255,0.05)", "rgba(255,255,255,0.035)", "rgba(255,255,255,0.07)"],
    gloss: GLOSS_SOFT,
    shadow: "0 0 0 1px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.5), 0 18px 32px -20px rgba(0,0,0,0.95)",
    fg: C.text,
    glint: 0.32,
    sheen: 0.09,
    lead: "quiet",
  },
  // frosted, over photos (see-through, so its edge is an inset line)
  glass: {
    body: ["rgba(255,255,255,0.15)", "rgba(255,255,255,0.07)"],
    gloss: GLOSS_SOFT,
    shadow: "inset 0 1px 0 rgba(255,255,255,0.34), inset 0 0 0 1px rgba(255,255,255,0.13), 0 12px 28px -14px rgba(0,0,0,0.7)",
    fg: "#ffffff",
    glint: 0.6,
    sheen: 0.2,
  },
  // a quiet blue: .oh-chip.blue as a button
  outline: {
    body: ["#16284d", "#0e1729"],
    edge: ["rgba(140,188,255,0.75)", "rgba(61,139,255,0.34)", "rgba(61,139,255,0.2)", "rgba(61,139,255,0.34)"],
    gloss: GLOSS_SOFT,
    shadow: "0 0 0 1px rgba(0,0,0,0.5), 0 12px 26px -16px rgba(42,106,240,0.6)",
    fg: C.accentHi,
    glint: 0.6,
    sheen: 0.12,
  },
  ghost: { body: null, shadow: null, fg: C.text, sheen: 0 },
};
// Older names: secondary is the quiet lit button, danger the stop.
GLOW_BUTTONS.secondary = GLOW_BUTTONS.quiet;
GLOW_BUTTONS.danger = GLOW_BUTTONS.stop;

// A switched off blue or red button goes grey and flat, so it reads as
// waiting rather than as a faded version of itself.
const DISABLED = {
  body: ["#171a20", "#121419"],
  edge: ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.03)", "rgba(255,255,255,0.02)", "rgba(255,255,255,0.04)"],
  shadow: "0 0 0 1px rgba(0,0,0,0.5)",
  fg: C.textMute,
  sheen: 0,
};
const COLOURED = new Set(["primary", "stop", "danger"]);

// The variants that act (or stop) get a light tap; the quiet ones a selection tick.
const TAPS = new Set(["primary", "stop", "danger", "glass"]);

const SIZES = {
  sm: { height: 36, pad: 16, font: 13, icon: 14, gap: 6 },
  md: { height: 54, pad: 26, font: 15, icon: 18, gap: 10 },
  lg: { height: 58, pad: 28, font: 16, icon: 18, gap: 10 },
};

const GLIDE = Easing.bezier(...EASE.glide);

// The little lit bubble behind a lead icon on the coloured buttons.
const LEAD = ["rgba(255,255,255,0.34)", "rgba(255,255,255,0.12)"];

/** The band of light, swept from off the left edge to off the right. */
function Sheen({ width, strength, loop, trigger }) {
  const reduce = useReducedMotion();
  const x = useSharedValue(-1.3);
  useEffect(() => {
    if (!loop || reduce || !width) return undefined;
    // @keyframes oh-shine: 0% -130%, 38% to 100% +130%, 4.2s, after 1.2s
    x.value = withDelay(1200, withRepeat(withSequence(withTiming(1.3, { duration: 1600, easing: GLIDE }), withTiming(1.3, { duration: 2600 }), withTiming(-1.3, { duration: 0 })), -1, false));
    return () => cancelAnimation(x);
  }, [loop, reduce, width, x]);
  useEffect(() => {
    if (!trigger || reduce) return;
    x.value = -1.3;
    x.value = withTiming(1.3, { duration: 1000, easing: GLIDE });
  }, [trigger, reduce, x]);
  const move = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * width }] }));
  if (!width || !strength) return null;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, move]}>
      {/* .oh-btn::after, a touch narrower so the band reads crisp */}
      <LinearGradient
        colors={["rgba(255,255,255,0)", `rgba(255,255,255,${strength})`, `rgba(255,255,255,${strength * 0.25})`, "rgba(255,255,255,0)"]}
        locations={[0.34, 0.47, 0.53, 0.64]}
        start={{ x: 0, y: 0.37 }}
        end={{ x: 1, y: 0.63 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

/**
 * variant: primary | stop | quiet | glass | ghost. size: sm | md | lg.
 * icon / iconRight: lucide icons beside the title. lead: an icon in its own
 * little circle at the start (.oh-btn .lead). shine: the sheen on a loop
 * (on by default for primary). full: stretch to the row. square: an icon
 * only button as wide as it is tall (.oh-btn.icon). haptic: true (default)
 * plays the tap moment on primary, stop and glass and a selection tick on
 * the rest; false for none; or the name of a moment ("commit", "go").
 */
export function GlowButton({
  title,
  onPress,
  variant = "primary",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  lead: Lead,
  loading = false,
  disabled = false,
  full = false,
  square = false,
  shine,
  haptic = true,
  accessibilityLabel,
  textStyle,
  style,
}) {
  const off = disabled || loading;
  const greyed = disabled && !loading && COLOURED.has(variant);
  const v = greyed ? DISABLED : GLOW_BUTTONS[variant] || GLOW_BUTTONS.primary;
  const s = SIZES[size] || SIZES.md;
  const [box, onLayout] = useLayoutSize();
  const scale = useSharedValue(1);
  const lift = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const [presses, setPresses] = React.useState(0);
  const loop = (shine ?? variant === "primary") && !off;
  const shadow = splitShadow(v.shadow);
  // A few looks can be set from style, as on the old Button: height,
  // paddingHorizontal and a flat backgroundColor go on the pill itself.
  const { height, paddingHorizontal, backgroundColor, borderWidth, borderColor, ...outer } = StyleSheet.flatten(style) || {};
  const h = height || s.height;
  const pad = square ? 0 : paddingHorizontal ?? s.pad;

  const label = loading ? (
    <ActivityIndicator color={v.fg} />
  ) : (
    <>
      {Lead ? (
        <View style={[styles.lead, v.lead === "quiet" ? styles.leadQuiet : null, { marginLeft: -pad / 2 }]}>
          {v.lead === "quiet" ? null : <LinearGradient colors={LEAD} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />}
          {v.lead === "quiet" ? null : <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.leadEdge]} />}
          <View>
            <Lead size={15} strokeWidth={2.2} color={v.lead === "quiet" ? C.accentHi : v.fg} />
          </View>
        </View>
      ) : null}
      {Icon ? (
        <View>
          <Icon size={s.icon} color={v.fg} />
        </View>
      ) : null}
      {title ? (
        <Text numberOfLines={1} style={[{ flexShrink: 1, color: v.fg, fontFamily: F.bodySemi, fontSize: s.font, letterSpacing: -0.15 }, textStyle]}>
          {title}
        </Text>
      ) : null}
      {IconRight ? (
        <View>
          <IconRight size={s.icon} color={v.fg} />
        </View>
      ) : null}
    </>
  );

  return (
    <Pressable
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: off }}
      onLayout={onLayout}
      onPressIn={() => {
        scale.value = withTiming(0.955, { duration: 140, easing: Easing.out(Easing.quad) });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, EASE.thumb);
      }}
      onPress={() => {
        // haptic: true plays tap (or select on the quiet variants), or name a moment.
        if (haptic) playHaptic(typeof haptic === "string" ? haptic : TAPS.has(variant) ? "tap" : "select");
        setPresses((n) => n + 1);
        onPress?.();
      }}
      style={[full ? { alignSelf: "stretch" } : null, outer]}
    >
      {({ pressed }) => (
        <Animated.View style={[{ height: h, borderRadius: R.full }, shadow.outer ? { boxShadow: shadow.outer } : null, disabled && !greyed && { opacity: 0.45 }, lift]}>
          {v.edge ? <LinearGradient colors={v.edge} locations={EDGE_STOPS} style={[StyleSheet.absoluteFill, { borderRadius: R.full }]} /> : null}
          <View style={[styles.body, v.edge ? styles.inEdge : null]}>
            {backgroundColor ? <View style={[StyleSheet.absoluteFill, { backgroundColor }]} /> : v.body ? <LinearGradient colors={v.body} locations={v.stops} style={StyleSheet.absoluteFill} /> : null}
            {v.gloss ? <LinearGradient colors={v.gloss} locations={GLOSS_STOPS} style={StyleSheet.absoluteFill} /> : null}
            {pressed ? <View style={[StyleSheet.absoluteFill, styles.bright]} /> : null}
            <Sheen width={box?.width} strength={v.sheen} loop={loop} trigger={presses} />
            {shadow.inset ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: R.full, boxShadow: shadow.inset }]} /> : null}
          </View>
          {v.glint ? (
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(255,255,255,0)", `rgba(255,255,255,${v.glint})`, "rgba(255,255,255,0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.glint, { left: h * 0.4, right: h * 0.4 }]}
            />
          ) : null}
          <View style={[styles.row, { gap: s.gap, paddingHorizontal: pad }, square && { width: h }]}>{label}</View>
        </Animated.View>
      )}
    </Pressable>
  );
}

/**
 * The primary button's lit blue as a fill that lays over its parent: for a
 * chosen tab or a sliding thumb, so they match the buttons exactly.
 */
export function ActFill() {
  const v = GLOW_BUTTONS.primary;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={v.edge} locations={EDGE_STOPS} style={[StyleSheet.absoluteFill, { borderRadius: R.full }]} />
      <View style={[styles.body, styles.inEdge]}>
        <LinearGradient colors={v.body} locations={v.stops} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={v.gloss} locations={GLOSS_STOPS} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.fillEdge]} />
      </View>
      <LinearGradient colors={["rgba(255,255,255,0)", `rgba(255,255,255,${v.glint})`, "rgba(255,255,255,0)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fillGlint} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { ...StyleSheet.absoluteFill, borderRadius: R.full, overflow: "hidden" },
  inEdge: { top: 1, left: 1, right: 1, bottom: 1 },
  glint: { position: "absolute", top: 0, height: 1 },
  fillEdge: { borderRadius: R.full, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28)" },
  fillGlint: { position: "absolute", top: 0, height: 1, left: "18%", right: "18%" },
  row: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  bright: { backgroundColor: "rgba(255,255,255,0.06)" },
  lead: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px -2px rgba(6,24,90,0.55)" },
  leadEdge: { borderRadius: 16, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5), inset 0 0 0 1px rgba(255,255,255,0.1)" },
  leadQuiet: { backgroundColor: "rgba(61,139,255,0.16)", boxShadow: "inset 0 0 0 1px rgba(61,139,255,0.25)" },
});
