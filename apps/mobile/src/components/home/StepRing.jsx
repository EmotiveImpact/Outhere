// Today's steps against the daily goal, drawn as a ring.

import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import { C, F, Label } from "@/components/ui";
import { formatNumber } from "@/utils/format";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function StepRing({ steps = 0, goal = 10000, size = 220, stroke = 16 }) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(0);
  const ratio = goal > 0 ? Math.min(1, steps / goal) : 0;

  useEffect(() => {
    progress.value = withTiming(ratio, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [ratio, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const done = steps >= goal;
  const left = Math.max(0, goal - steps);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#7dffbe" />
            <Stop offset="1" stopColor={C.accent} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.surfaceHigh} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
        />
      </Svg>
      <Label>Steps today</Label>
      <Text style={{ fontFamily: F.display, fontSize: 46, color: C.text, letterSpacing: -1, marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit>
        {formatNumber(steps)}
      </Text>
      <Text style={{ color: done ? C.accent : C.textDim, fontSize: 13, fontWeight: "600", marginTop: 2 }}>
        {done ? "Goal smashed" : `${formatNumber(left)} to go`}
      </Text>
    </View>
  );
}
