// Stats for a finished run as plain columns: time, pace (or speed) and
// calories. Distance sits in the hero above it.

import React from "react";
import { StyleSheet, View } from "react-native";
import { S } from "@/components/ui";
import { formatDuration, formatPace } from "@/utils/format";
import { caloriesFor, paceFor } from "./geo";
import { StatCell } from "./MoveKit";

export default function RunStatGrid({ run, style }) {
  const km = Number(run?.distanceKm) || 0;
  const sec = Number(run?.durationSec) || 0;
  const pace = run?.paceSecPerKm || paceFor(km, sec);
  const ride = run?.type === "ride";
  const calories = run?.calories ?? caloriesFor(run?.type, km);
  return (
    <View style={[styles.row, style]}>
      <StatCell label="Time" value={formatDuration(sec)} align="left" />
      {ride ? (
        <StatCell label="Avg speed" value={pace ? (3600 / pace).toFixed(1) : "--"} unit="km/h" align="left" />
      ) : (
        <StatCell label="Avg pace" value={formatPace(pace)} unit="/km" align="left" />
      )}
      <StatCell label="Calories" value={String(calories)} unit="kcal" align="left" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: S.md },
});
