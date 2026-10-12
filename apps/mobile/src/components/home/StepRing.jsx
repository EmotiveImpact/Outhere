// Today's steps against the daily goal: a gradient ring with a soft glow,
// fine tick marks on the track and a glowing head that rides the progress.

import React, { useEffect, useMemo } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, RadialGradient, Stop } from "react-native-svg";
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import { AnimatedNumber, C, F, Label } from "@/components/ui";
import { formatNumber } from "@/utils/format";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const TICKS = 60;

export default function StepRing({ steps = 0, goal = 10000, size = 220, stroke = 14 }) {
  const c = size / 2;
  const r = (size - stroke) / 2 - 10;
  const circumference = 2 * Math.PI * r;
  const ratio = goal > 0 ? Math.min(1, steps / goal) : 0;
  const done = steps >= goal;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(ratio, { duration: 1100, easing: Easing.out(Easing.cubic) });
  }, [ratio, progress]);

  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - progress.value) }));
  // Glow pass uses the same arc, wider and faint.
  const glowProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - progress.value) }));
  const headGlow = useAnimatedProps(() => {
    const a = progress.value * Math.PI * 2;
    return { cx: c + Math.cos(a) * r, cy: c + Math.sin(a) * r, opacity: progress.value > 0.004 ? 1 : 0 };
  });
  const headDot = useAnimatedProps(() => {
    const a = progress.value * Math.PI * 2;
    return { cx: c + Math.cos(a) * r, cy: c + Math.sin(a) * r, opacity: progress.value > 0.004 ? 1 : 0 };
  });

  const ticks = useMemo(() => {
    const inner = r - stroke / 2 - 8;
    return Array.from({ length: TICKS }, (_, i) => {
      const a = (i / TICKS) * Math.PI * 2;
      const major = i % 5 === 0;
      const len = major ? 6 : 3;
      return {
        x1: c + Math.cos(a) * inner,
        y1: c + Math.sin(a) * inner,
        x2: c + Math.cos(a) * (inner - len),
        y2: c + Math.sin(a) * (inner - len),
        lit: i / TICKS < ratio,
        major,
      };
    });
  }, [c, r, stroke, ratio]);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#c6ffe2" />
            <Stop offset="0.45" stopColor="#5dffb0" />
            <Stop offset="1" stopColor={C.accent} />
          </LinearGradient>
          <RadialGradient id="core" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={C.accent} stopOpacity={done ? 0.22 : 0.1} />
            <Stop offset="0.7" stopColor={C.accent} stopOpacity={0.02} />
            <Stop offset="1" stopColor={C.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        <Circle cx={c} cy={c} r={r - stroke} fill="url(#core)" />

        {ticks.map((t, i) => (
          <Line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.lit ? C.accent : "#ffffff"}
            strokeOpacity={t.lit ? 0.7 : t.major ? 0.22 : 0.1}
            strokeWidth={t.major ? 1.6 : 1}
            strokeLinecap="round"
          />
        ))}

        <Circle cx={c} cy={c} r={r} stroke="#1c221f" strokeWidth={stroke} fill="none" />
        <Circle cx={c} cy={c} r={r} stroke="rgba(0,255,127,0.07)" strokeWidth={stroke} fill="none" />

        <AnimatedCircle
          cx={c}
          cy={c}
          r={r}
          stroke={C.accent}
          strokeOpacity={0.18}
          strokeWidth={stroke + 12}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={glowProps}
        />
        <AnimatedCircle
          cx={c}
          cy={c}
          r={r}
          stroke="url(#ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={arcProps}
        />

        {/* Glowing head at the leading edge. */}
        <AnimatedCircle cx={c + r} cy={c} r={stroke * 0.95} fill={C.accent} fillOpacity={0.25} animatedProps={headGlow} />
        <AnimatedCircle cx={c + r} cy={c} r={stroke * 0.36} fill="#ffffff" animatedProps={headDot} />

        {/* Start marker so an empty ring still reads as a track. */}
        <Circle cx={c + r} cy={c} r={3} fill={ratio > 0 ? "transparent" : C.accent} />
      </Svg>

      <Label style={{ color: C.textDim }}>Steps today</Label>
      <AnimatedNumber
        value={steps}
        duration={1100}
        style={{ fontFamily: F.display, fontSize: Math.round(size * (steps >= 10000 ? 0.2 : 0.25)), lineHeight: Math.round(size * (steps >= 10000 ? 0.24 : 0.29)), color: C.text, letterSpacing: -1.5, marginTop: 2 }}
        adjustsFontSizeToFit
      />
      <Text style={{ color: done ? C.accent : C.textMute, fontSize: 13, fontWeight: "600" }}>
        {done ? `${Math.round((steps / goal) * 100)}% of goal` : `of ${formatNumber(goal)}`}
      </Text>
    </View>
  );
}
