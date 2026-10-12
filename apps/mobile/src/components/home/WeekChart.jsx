// Seven day step bars. Bars grow in; today is highlighted and days at or over
// goal glow green. Empty days show a small dot so the week still reads.

import React, { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { C, S } from "@/components/ui";
import { compactNumber } from "@/utils/format";
import { startOfDay } from "@/data/time";

const HEIGHT = 120;
const PLOT = HEIGHT - 20;

function Bar({ value, max, index, hit, isToday }) {
  const h = useSharedValue(0);
  const target = value > 0 ? Math.max(6, (value / max) * PLOT) : 0;
  useEffect(() => {
    h.value = withDelay(index * 50, withTiming(target, { duration: 650, easing: Easing.out(Easing.cubic) }));
  }, [target, index, h]);
  const style = useAnimatedStyle(() => ({ height: h.value }));
  if (value <= 0) {
    return <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isToday ? C.accent : C.borderStrong, marginBottom: 1 }} />;
  }
  return (
    <Animated.View
      style={[
        {
          width: "100%",
          maxWidth: 28,
          borderRadius: 8,
          backgroundColor: hit ? C.accent : isToday ? "rgba(0,255,127,0.5)" : "#2a2a2f",
        },
        hit && { shadowColor: C.accent, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
        style,
      ]}
    />
  );
}

export default function WeekChart({ days = [], goal = 10000, todaySteps }) {
  const values = days.map((d, i) => (i === days.length - 1 && todaySteps != null ? Math.max(d.steps, todaySteps) : d.steps));
  const max = Math.max(goal * 1.1, ...values, 1);
  const goalY = HEIGHT - (goal / max) * PLOT;

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: S.md }}>
        <View style={{ width: 14, borderTopWidth: 1.5, borderStyle: "dashed", borderColor: "rgba(0,255,127,0.6)" }} />
        <Text style={{ color: C.textMute, fontSize: 11, fontWeight: "700", letterSpacing: 0.6 }}>GOAL {compactNumber(goal)}</Text>
        <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: C.accent, marginLeft: S.md }} />
        <Text style={{ color: C.textMute, fontSize: 11, fontWeight: "700", letterSpacing: 0.6 }}>HIT</Text>
      </View>
      <View style={{ height: HEIGHT, flexDirection: "row", alignItems: "flex-end", gap: S.sm }}>
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: goalY, borderTopWidth: 1, borderStyle: "dashed", borderColor: "rgba(0,255,127,0.3)" }} />
        {days.map((d, i) => {
          const v = values[i];
          const isToday = i === days.length - 1;
          return (
            <View key={d.date} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
              {v > 0 ? (
                <Text style={{ color: isToday ? C.text : C.textMute, fontSize: 10, fontWeight: "700", marginBottom: 4 }}>{compactNumber(v)}</Text>
              ) : null}
              <Bar value={v} max={max} index={i} hit={v >= goal} isToday={isToday} />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", gap: S.sm, marginTop: S.sm }}>
        {days.map((d, i) => {
          const isToday = i === days.length - 1;
          return (
            <Text key={d.date} style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: isToday ? "800" : "600", color: isToday ? C.accent : C.textMute }}>
              {isToday ? "Today" : startOfDay(d.date).toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 3)}
            </Text>
          );
        })}
      </View>
    </View>
  );
}
