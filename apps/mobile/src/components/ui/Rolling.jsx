// Rolling numbers. Every digit is its own column that rolls to the new value
// on a spring with a little overshoot, the columns staggered from the right
// by 30ms so a change ripples leftwards like a mechanical counter. Thousands
// separators, decimal points and the prefix and suffix stay put. New digits
// slide in from below, digits no longer needed slide up and fade. With
// reduce motion on, everything jumps straight to the new value.
//
//   <RollingNumber value={12480} size={58} />                    12,480
//   <RollingNumber value={out} prefix="+" suffix=" OUT" weight="semi" size={16} />
//   <RollingNumber value={secs} format={timeLabel} mono />       digits roll, the colon stays
//   <CountUp from={0} value={prize} duration={1400} size={44} />  counts up on mount
//
// Lift is the spring from a card into its page: on press the card grows to
// 1.02 and holds while the next screen slides in, then settles back.

import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from "react-native-reanimated";
import { C, EASE, F } from "./tokens";

// A touch past the mark and back: the digit lands like a real wheel.
const SPRING = { damping: 15, stiffness: 190, mass: 0.9 };
const STAGGER = 30;
const WHEEL = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

const defaultFormat = (v) => Math.round(v).toLocaleString("en-GB");

const fontFor = (weight) => {
  if (weight === "medium") return F.bodyMedium;
  if (weight === "semi" || weight === "semibold") return F.bodySemi;
  if (weight === "displayMedium") return F.displayMedium;
  return F.display;
};

/** One digit wheel: 0 to 9 and a 0 again, so 9 rolls on into 0 without a jump. */
function Wheel({ digit, dir, delay, height, textStyle, reduce }) {
  const pos = useSharedValue(digit);
  useEffect(() => {
    const p = pos.value;
    const cur = ((p % 10) + 10) % 10;
    const base = p - cur;
    let to = base + digit;
    // Going up, a smaller digit means we passed 0: keep rolling forward.
    // Going down, a bigger digit means we roll back through 0.
    if (dir >= 0 && digit < Math.floor(cur)) to += 10;
    else if (dir < 0 && digit > Math.ceil(cur)) to -= 10;
    if (to === p) return;
    pos.value = reduce ? to : withDelay(delay, withSpring(to, SPRING));
  }, [digit, dir, delay, reduce, pos]);
  const roll = useAnimatedStyle(() => ({ transform: [{ translateY: -(((pos.value % 10) + 10) % 10) * height }] }));
  return (
    <View style={{ height, overflow: "hidden" }}>
      {/* The widest digit sizes the column; the wheel sits over it. */}
      <Text style={[textStyle, { opacity: 0 }]} accessible={false}>
        8
      </Text>
      <Animated.View style={[StyleSheet.absoluteFill, roll]}>
        {WHEEL.map((d, i) => (
          <Text key={i} style={[textStyle, styles.wheelDigit, { top: i * height }]} accessible={false}>
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

/**
 * value: the number. format: number to text (default en-GB with commas).
 * prefix and suffix do not roll. size: font size. weight: display (Barlow)
 * | displayMedium | medium (Inter 500) | semi (Inter 600). colour. mono:
 * tabular figures. lineHeight defaults to a tight display line. upper puts
 * the prefix and suffix in capitals, like a Title.
 */
export function RollingNumber({ value = 0, format = defaultFormat, prefix, suffix, size = 32, weight = "display", colour = C.text, mono = false, lineHeight, letterSpacing, upper = false, style, textStyle: extraText, prefixStyle, suffixStyle, accessibilityLabel }) {
  const reduce = useReducedMotion();
  const n = Number(value) || 0;
  const prev = useRef(n);
  const dir = n >= prev.current ? 1 : -1;
  useEffect(() => {
    prev.current = n;
  }, [n]);

  const h = lineHeight || Math.round(size * 1.04);
  const textStyle = [{ fontFamily: fontFor(weight), fontSize: size, lineHeight: h, color: colour, letterSpacing: letterSpacing ?? (weight === "display" || weight === "displayMedium" ? -0.5 : -0.2) }, mono ? styles.mono : null, extraText];
  const sideStyle = [textStyle, upper ? styles.upper : null];

  const text = String(format(n));
  const chars = text.split("");
  const last = chars.length - 1;
  // Keyed from the right so the units column stays the units column when a
  // digit is added on the left; a separator keeps its own key.
  const cells = chars.map((ch, i) => {
    const digit = /\d/.test(ch);
    return { key: `${last - i}${digit ? "d" : ch}`, ch, digit, fromRight: last - i };
  });

  const entering = reduce ? undefined : FadeInDown.duration(320).springify().damping(16).stiffness(220);
  const exiting = reduce ? undefined : FadeOutUp.duration(200);

  return (
    <View style={[styles.row, style]} accessible accessibilityRole="text" accessibilityLabel={accessibilityLabel || `${prefix || ""}${text}${suffix || ""}`}>
      {prefix != null && prefix !== "" ? <Text style={[sideStyle, prefixStyle]}>{prefix}</Text> : null}
      {cells.map((c) => (
        <Animated.View key={c.key} entering={entering} exiting={exiting} style={{ height: h }}>
          {c.digit ? (
            <Wheel digit={Number(c.ch)} dir={dir} delay={c.fromRight * STAGGER} height={h} textStyle={textStyle} reduce={reduce} />
          ) : (
            <Text style={textStyle} accessible={false}>
              {c.ch}
            </Text>
          )}
        </Animated.View>
      ))}
      {suffix != null && suffix !== "" ? <Text style={[sideStyle, suffixStyle]}>{suffix}</Text> : null}
    </View>
  );
}

// ── CountUp ───────────────────────────────────────────────────────────────────

/** cubic-bezier(x1, y1, x2, y2) as a function of progress, for the JS thread. */
const bezier = ([x1, y1, x2, y2]) => {
  const a = (a1, a2) => 1 - 3 * a2 + 3 * a1;
  const b = (a1, a2) => 3 * a2 - 6 * a1;
  const c = (a1) => 3 * a1;
  const calc = (t, a1, a2) => ((a(a1, a2) * t + b(a1, a2)) * t + c(a1)) * t;
  const slope = (t, a1, a2) => 3 * a(a1, a2) * t * t + 2 * b(a1, a2) * t + c(a1);
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const s = slope(t, x1, x2);
      if (Math.abs(s) < 1e-6) break;
      t -= (calc(t, x1, x2) - x) / s;
    }
    return calc(t, y1, y2);
  };
};
const expoOut = bezier(EASE.expo);

/**
 * Counts from `from` to `value` over `duration` ms on the kit's expo ease,
 * feeding a RollingNumber so the wheels spin and settle. `delay` holds the
 * start; `step` is how often the wheels get a new target (ms). Any other
 * prop goes to RollingNumber.
 */
export function CountUp({ from = 0, value = 0, duration = 1400, delay = 0, step = 70, onDone, ...rest }) {
  const reduce = useReducedMotion();
  const target = Number(value) || 0;
  const [shown, setShown] = useState(reduce ? target : from);
  useEffect(() => {
    if (reduce) {
      setShown(target);
      return undefined;
    }
    setShown(from);
    let raf = null;
    let last = -Infinity;
    const t0 = Date.now() + delay;
    const tick = () => {
      const now = Date.now();
      const p = Math.min(1, Math.max(0, (now - t0) / duration));
      if (p >= 1) {
        setShown(target);
        onDone?.();
        return;
      }
      if (now - last >= step) {
        last = now;
        setShown(from + (target - from) * expoOut(p));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // onDone is read when the count lands, not watched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, from, duration, delay, step, reduce]);
  return <RollingNumber value={shown} {...rest} />;
}

// ── Lift ──────────────────────────────────────────────────────────────────────

/**
 * The spring from a card into its page. Wrap the tappable card and move its
 * onPress here: on press the card grows to `to` (1.02) on the kit's thumb
 * spring and holds for `hold` ms while the next screen slides in, then
 * settles back so it is at rest when you return. The card's own sink on
 * press still happens underneath.
 *
 *   <Lift onPress={() => router.push(`/crew/${club.id}`)}>
 *     <Surface ... />
 *   </Lift>
 */
export function Lift({ children, onPress, to = 1.02, hold = 520, style }) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const lift = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const press = () => {
    if (!reduce) {
      scale.value = withSpring(to, EASE.thumb);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        scale.value = withSpring(1, EASE.thumb);
      }, hold);
    }
    onPress?.();
  };
  const child = React.Children.only(children);
  return <Animated.View style={[style, lift]}>{React.cloneElement(child, { onPress: press })}</Animated.View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end" },
  wheelDigit: { position: "absolute", left: 0, right: 0, textAlign: "center" },
  mono: { fontVariant: ["tabular-nums"] },
  upper: { textTransform: "uppercase" },
});
