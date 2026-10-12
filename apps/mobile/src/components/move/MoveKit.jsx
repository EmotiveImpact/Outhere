// Small building blocks shared by the Move panels: the glowing start orb,
// round session controls, hold-to-finish, the GPS badge and stat cells.

import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from "react-native-reanimated";
import { Satellite } from "lucide-react-native";
import { C, F, Label, PressableScale, R } from "@/components/ui";
import { hapticHeavy, hapticImpact, hapticSuccess } from "@/services/haptics";

const SPRING = { damping: 16, stiffness: 300, mass: 0.6 };

/** Expanding ring that loops outwards from a circle. */
function PulseRing({ size, colour, delay = 0, duration = 1800 }) {
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
  const style = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - p.value), transform: [{ scale: 1 + p.value * 0.45 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: colour }, style]} />;
}

/** The big circular Start button, glowing and pulsing. */
export function StartOrb({ size = 116, label = "Start", sub, onPress, accessibilityLabel }) {
  return (
    <View style={{ width: size * 1.5, height: size * 1.5, alignItems: "center", justifyContent: "center" }}>
      <PulseRing size={size} colour={C.accent} />
      <PulseRing size={size} colour={C.accent} delay={900} />
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
        style={[styles.round, { width: size, height: size, borderRadius: size / 2, backgroundColor: t.bg, borderColor: t.border }, tone === "accent" && styles.glow]}
      >
        <Icon size={Math.round(size * 0.36)} color={t.fg} fill={tone === "accent" ? t.fg : "transparent"} />
      </PressableScale>
      {caption ? <Text style={styles.caption}>{label}</Text> : null}
    </View>
  );
}

const TONES = {
  accent: { bg: C.accent, fg: C.accentText, border: C.accent },
  neutral: { bg: C.surfaceHigh, fg: C.text, border: C.borderStrong },
  danger: { bg: C.danger, fg: "#fff", border: C.danger },
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
        <Animated.View style={[styles.round, { width: size, height: size, borderRadius: size / 2, backgroundColor: C.surfaceHigh, borderColor: `${colour}88`, overflow: "hidden" }, pressStyle]}>
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
  const colour = good ? C.accent : ok ? C.warn : C.textMute;
  const bars = good ? 3 : ok ? 2 : has ? 1 : 0;
  return (
    <View style={[styles.gps, style]}>
      <Satellite size={13} color={colour} />
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: 3, height: 5 + i * 3, borderRadius: 1, backgroundColor: i < bars ? colour : C.borderStrong }} />
        ))}
      </View>
      <Text style={[styles.gpsText, { color: has ? C.text : C.textDim }]}>{has ? (good ? "Strong GPS" : ok ? "Fair GPS" : "Weak GPS") : "Finding GPS"}</Text>
    </View>
  );
}

/** Label over a big number with a unit. */
export function StatCell({ label, value, unit, align = "center", size = 26, style }) {
  return (
    <View style={[{ flex: 1, alignItems: align === "center" ? "center" : "flex-start", gap: 4 }, style]}>
      <Label>{label}</Label>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
        <Text style={[styles.statValue, { fontSize: size }]} numberOfLines={1}>
          {value}
        </Text>
        {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.accent,
    shadowColor: C.accent,
    shadowOpacity: 0.7,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  orbText: { color: C.accentText, fontFamily: F.display, fontSize: 24, letterSpacing: 0.5, textTransform: "uppercase" },
  orbSub: { color: C.accentText, opacity: 0.7, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginTop: 1 },
  round: { alignItems: "center", justifyContent: "center", borderWidth: 1 },
  glow: { shadowColor: C.accent, shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  caption: { color: C.textDim, fontSize: 12, fontWeight: "600" },
  gps: { flexDirection: "row", alignItems: "center", gap: 6, height: 30, paddingHorizontal: 10, borderRadius: R.full, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  gpsText: { fontSize: 12, fontWeight: "600" },
  statValue: { color: C.text, fontFamily: F.display, letterSpacing: -0.5, fontVariant: ["tabular-nums"] },
  statUnit: { color: C.textMute, fontSize: 12, fontWeight: "600" },
});
