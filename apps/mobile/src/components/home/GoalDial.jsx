// Today card: a blue dial for the daily goal with the day's XP, OUT and
// streak beside it.

import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import { Coins, Flame, Zap } from "lucide-react-native";
import { AnimatedNumber, C, Card, F, Row, S } from "@/components/ui";
import { formatNumber } from "@/utils/format";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function Dial({ value = 0, size = 112, stroke = 10, children }) {
  const c = size / 2;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(Math.min(1, Math.max(0, value)), { duration: 1100, easing: Easing.out(Easing.cubic) });
  }, [value, progress]);
  const arc = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - progress.value) }));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Defs>
          <SvgGradient id="dial" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={C.accentHi} />
            <Stop offset="1" stopColor={C.accentDeep} />
          </SvgGradient>
        </Defs>
        <Circle cx={c} cy={c} r={r} stroke={C.surfaceHigh} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={c}
          cy={c}
          r={r}
          stroke="url(#dial)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={arc}
        />
      </Svg>
      {children}
    </View>
  );
}

const Stat = ({ icon: Icon, label, value, unit }) => (
  <Row gap={10} style={{ alignItems: "flex-start" }}>
    <Icon size={15} color={C.accent} style={{ marginTop: 2 }} />
    <View>
      <Text style={styles.statLabel}>{label}</Text>
      <Row gap={4} style={{ alignItems: "baseline" }}>
        <AnimatedNumber value={value} format={formatNumber} style={styles.statValue} />
        {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
      </Row>
    </View>
  </Row>
);

export default function GoalDial({ steps, goal, xp, out, streak, size = 112 }) {
  const ratio = goal > 0 ? steps / goal : 0;
  return (
    <Card padding={S.lg}>
      <Row gap={S.xl}>
        <Dial value={ratio} size={size}>
          <Text style={styles.pct}>{Math.round(ratio * 100)}%</Text>
          <Text style={styles.pctLabel}>of {formatNumber(goal / 1000)}k goal</Text>
        </Dial>
        <View style={{ flex: 1, gap: 10 }}>
          <Stat icon={Zap} label="XP today" value={xp} />
          <Stat icon={Coins} label="OUT earned" value={out} unit="OUT" />
          <Stat icon={Flame} label="Streak" value={streak} unit={streak === 1 ? "day" : "days"} />
        </View>
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  pct: { color: C.text, fontFamily: F.display, fontSize: 30, lineHeight: 32 },
  pctLabel: { color: C.textDim, fontFamily: F.body, fontSize: 11 },
  statLabel: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  statValue: { color: C.text, fontFamily: F.display, fontSize: 20, lineHeight: 22 },
  statUnit: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 0.6 },
});
