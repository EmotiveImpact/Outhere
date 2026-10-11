// Seven day step bars. Today is highlighted; days at or over goal glow green.

import React from "react";
import { Text, View } from "react-native";
import { C, S } from "@/components/ui";
import { compactNumber } from "@/utils/format";
import { startOfDay } from "@/data/time";

const HEIGHT = 110;

export default function WeekChart({ days = [], goal = 10000, todaySteps }) {
  const values = days.map((d, i) => (i === days.length - 1 && todaySteps != null ? Math.max(d.steps, todaySteps) : d.steps));
  const max = Math.max(goal, ...values, 1);
  const goalY = HEIGHT - (goal / max) * (HEIGHT - 18);

  return (
    <View>
      <View style={{ height: HEIGHT, flexDirection: "row", alignItems: "flex-end", gap: S.sm }}>
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: 0, right: 0, top: goalY, borderTopWidth: 1, borderStyle: "dashed", borderColor: "rgba(0,255,127,0.35)" }}
        />
        {days.map((d, i) => {
          const v = values[i];
          const isToday = i === days.length - 1;
          const hit = v >= goal;
          return (
            <View key={d.date} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
              <Text style={{ color: isToday ? C.text : C.textMute, fontSize: 10, fontWeight: "600", marginBottom: 4 }}>
                {v > 0 ? compactNumber(v) : ""}
              </Text>
              <View
                style={{
                  width: "100%",
                  maxWidth: 30,
                  height: Math.max(4, (v / max) * (HEIGHT - 18)),
                  borderRadius: 8,
                  backgroundColor: hit ? C.accent : isToday ? "rgba(0,255,127,0.45)" : C.surfaceHigh,
                }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", gap: S.sm, marginTop: S.sm }}>
        {days.map((d, i) => (
          <Text
            key={d.date}
            style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: "600", color: i === days.length - 1 ? C.accent : C.textMute }}
          >
            {i === days.length - 1 ? "Today" : startOfDay(d.date).toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 3)}
          </Text>
        ))}
      </View>
    </View>
  );
}
