// Today's steps against the daily goal: a quiet track with one green arc that
// sweeps round as the day fills up. The number does the talking.

import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import { AnimatedNumber, C, F } from "@/components/ui";
import { formatNumber } from "@/utils/format";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function StepRing({ steps = 0, goal = 10000, size = 220, stroke = 12 }) {
  const c = size / 2;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const ratio = goal > 0 ? Math.min(1, steps / goal) : 0;
  const done = steps >= goal;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(ratio, { duration: 1100, easing: Easing.out(Easing.cubic) });
  }, [ratio, progress]);

  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - progress.value) }));
  const big = steps >= 10000;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={c} cy={c} r={r} stroke={C.surfaceHigh} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={c}
          cy={c}
          r={r}
          stroke={C.accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={arcProps}
        />
      </Svg>

      <AnimatedNumber
        value={steps}
        duration={1100}
        style={{ fontFamily: F.display, fontSize: big ? 52 : 60, lineHeight: big ? 60 : 68, color: C.text, letterSpacing: -1 }}
        adjustsFontSizeToFit
      />
      <Text style={{ color: C.textDim, fontSize: 13 }}>
        {done ? `${Math.round((steps / goal) * 100)}% of goal` : `of ${formatNumber(goal)} steps`}
      </Text>
    </View>
  );
}
