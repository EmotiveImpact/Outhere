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
import { hapticSelection } from "@/services/haptics";
import { useLayoutSize } from "./layout";
import { C, EASE, F, FINISH, LIT, R, splitShadow } from "./tokens";

const EDGE = ["rgba(255,255,255,0.12)", "rgba(255,255,255,0.03)", "rgba(255,255,255,0.03)", "rgba(255,255,255,0.05)"];

export const GLOW_BUTTONS = {
  primary: { body: FINISH.act, stops: FINISH.actStops, shadow: FINISH.actShadow, fg: "#ffffff", sheen: 0.3 },
  stop: { body: FINISH.stop, stops: FINISH.actStops, shadow: FINISH.stopShadow, fg: "#ffffff", sheen: 0.3 },
  quiet: { body: LIT, edge: EDGE, shadow: FINISH.shadowCard, fg: C.text, sheen: 0.08, lead: "quiet" },
  glass: { body: ["rgba(255,255,255,0.11)", "rgba(255,255,255,0.09)"], shadow: FINISH.glassEdge, fg: "#ffffff", sheen: 0.2 },
  // a quiet blue: .oh-chip.blue as a button
  outline: { body: ["rgba(61,139,255,0.2)", "rgba(61,139,255,0.1)"], shadow: "inset 0 1px 0 rgba(130,180,255,0.35), inset 0 0 0 1px rgba(61,139,255,0.3)", fg: C.accentHi, sheen: 0.1 },
  ghost: { body: null, shadow: null, fg: C.text, sheen: 0 },
};
// Older names: secondary is the quiet lit button, danger the stop.
GLOW_BUTTONS.secondary = GLOW_BUTTONS.quiet;
GLOW_BUTTONS.danger = GLOW_BUTTONS.stop;

const SIZES = {
  sm: { height: 36, pad: 16, font: 13, icon: 14, gap: 6 },
  md: { height: 54, pad: 26, font: 15, icon: 18, gap: 10 },
  lg: { height: 58, pad: 28, font: 16, icon: 18, gap: 10 },
};

const GLIDE = Easing.bezier(...EASE.glide);

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
      {/* linear-gradient(105deg, transparent 30%, .3 48%, .08 54%, transparent 68%) */}
      <LinearGradient
        colors={["rgba(255,255,255,0)", `rgba(255,255,255,${strength})`, `rgba(255,255,255,${strength * 0.27})`, "rgba(255,255,255,0)"]}
        locations={[0.3, 0.48, 0.54, 0.68]}
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
 * only button as wide as it is tall (.oh-btn.icon).
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
  const v = GLOW_BUTTONS[variant] || GLOW_BUTTONS.primary;
  const s = SIZES[size] || SIZES.md;
  const off = disabled || loading;
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
          <Lead size={15} strokeWidth={2.2} color={v.lead === "quiet" ? C.accentHi : v.fg} />
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
        if (haptic) hapticSelection();
        setPresses((n) => n + 1);
        onPress?.();
      }}
      style={[full ? { alignSelf: "stretch" } : null, outer]}
    >
      {({ pressed }) => (
        <Animated.View style={[{ height: h, borderRadius: R.full }, shadow.outer && !off ? { boxShadow: shadow.outer } : null, off && { opacity: 0.45 }, lift]}>
          {v.edge ? <LinearGradient colors={v.edge} locations={[0, 0.42, 0.78, 1]} style={[StyleSheet.absoluteFill, { borderRadius: R.full }]} /> : null}
          <View style={[styles.body, v.edge ? styles.inEdge : null]}>
            {backgroundColor ? <View style={[StyleSheet.absoluteFill, { backgroundColor }]} /> : v.body ? <LinearGradient colors={v.body} locations={v.stops} style={StyleSheet.absoluteFill} /> : null}
            {pressed ? <View style={[StyleSheet.absoluteFill, styles.bright]} /> : null}
            <Sheen width={box?.width} strength={v.sheen} loop={loop} trigger={presses} />
            {shadow.inset ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: R.full, boxShadow: shadow.inset }]} /> : null}
          </View>
          <View style={[styles.row, { gap: s.gap, paddingHorizontal: pad }, square && { width: h }]}>{label}</View>
        </Animated.View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { ...StyleSheet.absoluteFillObject, borderRadius: R.full, overflow: "hidden" },
  inEdge: { top: 1, left: 1, right: 1, bottom: 1 },
  row: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  bright: { backgroundColor: "rgba(255,255,255,0.06)" },
  lead: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.18)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)" },
  leadQuiet: { backgroundColor: "rgba(61,139,255,0.16)", boxShadow: "inset 0 0 0 1px rgba(61,139,255,0.25)" },
});
