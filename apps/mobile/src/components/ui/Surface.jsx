// The one surface recipe (.oh-mat in the prototype): a body lit from above,
// a 1px edge that is bright along the top and fades down the sides, and a
// long soft shadow that falls well below. Tappable surfaces sink on a spring
// (.oh-press) and a soft blue light blooms where the finger lands (.oh-spot).
//
//   <Surface>...</Surface>                          a card
//   <Surface onPress={open}>...</Surface>           a tappable card, with touch glow
//   <Surface tone="blue">...</Surface>              your own row, tinted blue
//   <Surface tone="glass" radius={R.full}>...</Surface>   over a photo
//   <Surface tone="sunk">...</Surface>              a well inside another surface

import React, { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { hapticSelection } from "@/services/haptics";
import { useLayoutSize } from "./layout";
import { skiaParts, useSkiaReady } from "./skia";
import { EASE, FINISH, LIT, R, S, splitShadow } from "./tokens";

// --oh-edge: linear-gradient(180deg, .12, .03 42%, .03 78%, .05)
const EDGE = { colors: ["rgba(255,255,255,0.12)", "rgba(255,255,255,0.03)", "rgba(255,255,255,0.03)", "rgba(255,255,255,0.05)"], locations: [0, 0.42, 0.78, 1] };

export const SURFACE_TONES = {
  lit: { body: LIT, edge: EDGE, outer: FINISH.shadowCard },
  // .oh-lead.me, .oh-chip.blue: tinted blue and lit along the edge
  blue: {
    body: ["#13213d", "#0f1626"],
    edge: { colors: ["rgba(130,180,255,0.6)", "rgba(61,139,255,0.3)", "rgba(61,139,255,0.22)", "rgba(61,139,255,0.3)"], locations: [0, 0.4, 0.8, 1] },
    outer: "0 14px 34px -16px rgba(42,106,240,0.65)",
  },
  // .oh-btn.glass, .oh-chip.glass: frosted, over photos
  // (see-through, so its edge is an inset line rather than a gradient behind)
  glass: { body: ["rgba(255,255,255,0.11)", "rgba(255,255,255,0.08)"], edge: null, ...splitShadow(FINISH.glassEdge) },
  // a well: darker than the card it sits in, shaded at the top
  sunk: {
    body: ["#0b0d11", "#0e1116"],
    edge: { colors: ["rgba(0,0,0,0.5)", "rgba(255,255,255,0.02)", "rgba(255,255,255,0.03)", "rgba(255,255,255,0.06)"], locations: [0, 0.4, 0.8, 1] },
    outer: null,
  },
};

const OUTER_KEYS = new Set(["flex", "flexGrow", "flexShrink", "flexBasis", "alignSelf", "width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight", "aspectRatio", "margin", "marginTop", "marginBottom", "marginLeft", "marginRight", "marginHorizontal", "marginVertical", "position", "top", "left", "right", "bottom", "zIndex", "opacity", "transform"]);

/** Layout and size go on the outside; everything else lays out the content. */
const splitStyle = (style) => {
  const flat = StyleSheet.flatten(style) || {};
  const outer = {};
  const inner = {};
  for (const [k, v] of Object.entries(flat)) (OUTER_KEYS.has(k) ? outer : inner)[k] = v;
  return { outer, inner };
};

/** The touch light: mounts on press, fades in quickly and out slowly, then goes. */
function TouchGlow({ at, size, radius, pressed }) {
  const ready = useSkiaReady();
  const o = useSharedValue(0);
  const [shown, setShown] = useState(false);
  const hide = useCallback(() => setShown(false), []);
  React.useEffect(() => {
    if (pressed) {
      setShown(true);
      o.value = withTiming(1, { duration: 120 });
    } else {
      o.value = withTiming(0, { duration: 500, easing: Easing.bezier(...EASE.glide) }, (done) => {
        if (done) runOnJS(hide)();
      });
    }
  }, [pressed, o, hide]);
  const fade = useAnimatedStyle(() => ({ opacity: o.value }));
  if (!ready || !size || !at || !shown) return null;
  const { TouchCanvas } = skiaParts();
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, fade]}>
      <TouchCanvas width={size.width} height={size.height} radius={radius} x={at.x} y={at.y} />
    </Animated.View>
  );
}

/**
 * tone: lit | blue | glass | sunk. radius and padding as usual (padding 0 for
 * edge-to-edge content such as photos). onPress/onLongPress make it tappable:
 * it sinks to `pressScale` and lights up under the finger (`touchGlow`).
 * `shadow={false}` drops the long shadow, for surfaces inside surfaces.
 * contentStyle lays out the content inside the edge.
 */
export function Surface({
  children,
  tone = "lit",
  radius = R.lg,
  padding = S.lg,
  onPress,
  onLongPress,
  disabled = false,
  haptic = true,
  pressScale = 0.955,
  touchGlow = true,
  shadow = true,
  accessibilityLabel,
  accessibilityRole,
  style,
  contentStyle,
}) {
  const t = SURFACE_TONES[tone] || SURFACE_TONES.lit;
  const { outer, inner } = splitStyle(style);
  const [size, onLayout] = useLayoutSize();
  const scale = useSharedValue(1);
  const lift = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const [pressed, setPressed] = useState(false);
  const at = useRef(null);
  const tappable = !!(onPress || onLongPress);

  const body = (
    <>
      {t.edge ? <LinearGradient colors={t.edge.colors} locations={t.edge.locations} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} /> : null}
      <View style={[styles.body, t.edge ? { margin: 1, borderRadius: Math.max(0, radius - 1) } : { borderRadius: radius }]}>
        <LinearGradient colors={t.body} style={StyleSheet.absoluteFill} />
        {pressed ? <View style={[StyleSheet.absoluteFill, styles.bright]} /> : null}
        <View style={[{ padding }, inner, contentStyle]}>{children}</View>
        {t.inset ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: t.inset }]} /> : null}
      </View>
      {tappable && touchGlow ? <TouchGlow at={at.current} size={size} radius={radius} pressed={pressed} /> : null}
    </>
  );
  const frame = [{ borderRadius: radius }, shadow && t.outer ? { boxShadow: t.outer } : null];

  if (!tappable) {
    return (
      <View style={[frame, outer]} onLayout={onLayout}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      style={outer}
      disabled={disabled}
      accessibilityRole={accessibilityRole || "button"}
      accessibilityLabel={accessibilityLabel}
      onLayout={onLayout}
      onPressIn={(e) => {
        const { locationX, locationY } = e.nativeEvent;
        at.current = { x: locationX ?? (size?.width || 0) / 2, y: locationY ?? 0 };
        scale.value = withTiming(pressScale, { duration: 140, easing: Easing.out(Easing.quad) });
        setPressed(true);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, EASE.thumb);
        setPressed(false);
      }}
      onPress={
        onPress
          ? () => {
              if (haptic) hapticSelection();
              onPress();
            }
          : undefined
      }
      onLongPress={onLongPress}
    >
      <Animated.View style={[frame, { flexGrow: 1 }, lift]}>{body}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { flexGrow: 1, overflow: "hidden" },
  // filter: brightness(1.06) while pressed
  bright: { backgroundColor: "rgba(255,255,255,0.035)" },
});

const TILE_TONES = {
  blue: { rgb: "61,139,255", fg: "#82b4ff" },
  red: { rgb: "255,77,85", fg: "#ff8b92" },
  gold: { rgb: "245,196,81", fg: "#f5c451" },
};

/**
 * The small lit icon square (.oh-tile, .oh-nudge .ni): tinted glass with a
 * bright top edge and a coloured glow underneath.
 *   <IconTile icon={Route} />   <IconTile icon={Flame} tone="red" size={36} />
 */
export function IconTile({ icon: Icon, tone = "blue", size = 42, radius = 12, iconSize = 20, style }) {
  const t = TILE_TONES[tone] || TILE_TONES.blue;
  return (
    <View style={[{ width: size, height: size, borderRadius: radius, alignItems: "center", justifyContent: "center", boxShadow: `0 8px 18px -10px rgba(${t.rgb},0.7)` }, style]}>
      {/* radial-gradient(120% 120% at 30% 0%, .34, .07 70%) */}
      <LinearGradient colors={[`rgba(${t.rgb},0.34)`, `rgba(${t.rgb},0.07)`]} locations={[0, 0.7]} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.14), inset 0 0 0 1px rgba(${t.rgb},0.3)` }]} />
      {Icon ? (
        <View>
          <Icon size={iconSize} color={t.fg} />
        </View>
      ) : null}
    </View>
  );
}
