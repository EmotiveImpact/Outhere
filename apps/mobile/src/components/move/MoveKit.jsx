// Small building blocks shared by the Move panels: the round Start button,
// session controls, hold-to-finish, the GPS badge and stat cells.

import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from "react-native-reanimated";
import { C, F, PressableScale, R } from "@/components/ui";
import { hapticHeavy, hapticImpact, hapticSuccess } from "@/services/haptics";

const SPRING = { damping: 16, stiffness: 300, mass: 0.6 };

/** One soft ring that drifts outwards from the Start button. */
function PulseRing({ size, colour, delay = 0, duration = 2400 }) {
  const p = useSharedValue(0);
  useEffect(() => {
    const id = setTimeout(() => {
      p.value = withRepeat(withTiming(1, { duration, easing: Easing.out(Easing.quad) }), -1, false);
    }, delay);
    return () => {
      clearTimeout(id);
      cancelAnimation(p);
    };
  }, [p, delay, duration]);
  const style = useAnimatedStyle(() => ({ opacity: 0.22 * (1 - p.value), transform: [{ scale: 1 + p.value * 0.3 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: colour }, style]} />;
}

/** The big round Start button with a single quiet pulse. */
export function StartOrb({ size = 108, label = "Start", sub, onPress, accessibilityLabel }) {
  return (
    <View style={{ width: size * 1.36, height: size * 1.36, alignItems: "center", justifyContent: "center" }}>
      <PulseRing size={size} colour={C.accent} />
      <PressableScale
        onPress={() => {
          hapticHeavy();
          onPress?.();
        }}
        haptic={false}
        scaleTo={0.92}
        accessibilityLabel={accessibilityLabel || label}
        style={[styles.orb, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <Text style={styles.orbText}>{label}</Text>
        {sub ? <Text style={styles.orbSub}>{sub}</Text> : null}
      </PressableScale>
    </View>
  );
}

/** Round icon control with a caption underneath. */
export function RoundControl({ icon: Icon, label, onPress, size = 64, tone = "neutral", disabled, caption = true }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <View style={{ alignItems: "center", gap: 8, opacity: disabled ? 0.4 : 1 }}>
      <PressableScale
        disabled={disabled}
        onPress={() => {
          hapticImpact();
          onPress?.();
        }}
        haptic={false}
        scaleTo={0.9}
        accessibilityLabel={label}
        style={[styles.round, { width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg }]}
      >
        <Icon size={Math.round(size * 0.36)} color={t.fg} fill={tone === "accent" ? t.fg : "transparent"} />
      </PressableScale>
      {caption ? <Text style={styles.caption}>{label}</Text> : null}
    </View>
  );
}

const TONES = {
  accent: { bg: C.accent, fg: C.accentText },
  neutral: { bg: C.surfaceHigh, fg: C.text },
  danger: { bg: C.danger, fg: "#fff" },
};

/**
 * Round button that only fires after being held for `holdMs`. A fill grows
 * inside while held, so the gesture explains itself.
 */
export function HoldButton({ icon: Icon, label, hint = "Hold", onComplete, size = 72, holdMs = 900, colour = C.danger }) {
  const fill = useSharedValue(0);
  const press = useSharedValue(1);
  const timer = useRef(null);
  const done = useRef(false);

  useEffect(() => () => clearTimeout(timer.current), []);

  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scale: fill.value }], opacity: 0.35 + fill.value * 0.65 }));
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));

  const start = () => {
    done.current = false;
    hapticImpact();
    press.value = withSpring(0.92, SPRING);
    fill.value = withTiming(1, { duration: holdMs, easing: Easing.linear });
    timer.current = setTimeout(() => {
      done.current = true;
      hapticSuccess();
      onComplete?.();
    }, holdMs);
  };
  const end = () => {
    clearTimeout(timer.current);
    press.value = withSpring(1, SPRING);
    if (!done.current) fill.value = withTiming(0, { duration: 180 });
  };

  return (
    <View style={{ alignItems: "center", gap: 8 }}>
      <Pressable onPressIn={start} onPressOut={end} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={`${hint} to ${label.toLowerCase()}`}>
        <Animated.View style={[styles.round, { width: size, height: size, borderRadius: size / 2, backgroundColor: C.surfaceHigh, overflow: "hidden" }, pressStyle]}>
          <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: colour }, fillStyle]} />
          <Icon size={Math.round(size * 0.34)} color="#fff" fill="#fff" />
        </Animated.View>
      </Pressable>
      <Text style={styles.caption}>{`${hint} to ${label.toLowerCase()}`}</Text>
    </View>
  );
}

/** GPS quality badge from a location's accuracy in metres. */
export function GpsBadge({ accuracy, style }) {
  const has = Number.isFinite(accuracy) && accuracy > 0;
  const good = has && accuracy < 15;
  const ok = has && accuracy < 30;
  const colour = good ? C.text : ok ? C.warn : C.textMute;
  const bars = good ? 3 : ok ? 2 : has ? 1 : 0;
  return (
    <View style={[styles.gps, style]}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: 3, height: 5 + i * 3, borderRadius: 1, backgroundColor: i < bars ? colour : C.borderStrong }} />
        ))}
      </View>
      <Text style={styles.gpsText}>{has ? (good ? "GPS" : ok ? "Fair GPS" : "Weak GPS") : "Finding GPS"}</Text>
    </View>
  );
}

/** A number with its unit, and a quiet sentence-case label underneath. */
export function StatCell({ label, value, unit, align = "center", size = 26, style }) {
  return (
    <View style={[{ flex: 1, alignItems: align === "center" ? "center" : "flex-start", gap: 2 }, style]}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
        <Text style={[styles.statValue, { fontSize: size }]} numberOfLines={1}>
          {value}
        </Text>
        {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  orb: { alignItems: "center", justifyContent: "center", backgroundColor: C.accent },
  orbText: { color: C.accentText, fontFamily: F.display, fontSize: 24, letterSpacing: -0.2 },
  orbSub: { color: C.accentText, opacity: 0.65, fontSize: 13, fontWeight: "600", marginTop: -1 },
  round: { alignItems: "center", justifyContent: "center" },
  caption: { color: C.textDim, fontSize: 12, fontWeight: "600" },
  gps: { flexDirection: "row", alignItems: "center", gap: 6, height: 28, paddingHorizontal: 10, borderRadius: R.full, backgroundColor: C.surface },
  gpsText: { color: C.textDim, fontSize: 12, fontWeight: "600" },
  statValue: { color: C.text, fontFamily: F.display, letterSpacing: -0.5, fontVariant: ["tabular-nums"] },
  statUnit: { color: C.textDim, fontSize: 13, fontWeight: "600" },
  statLabel: { color: C.textDim, fontSize: 13 },
});
