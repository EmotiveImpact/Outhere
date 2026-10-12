// Stats for a finished run in one calm card. `withDistance` adds distance as
// a fourth stat (detail views); summaries show distance in the hero instead.

import React from "react";
import { StyleSheet, View } from "react-native";
import { C, R, S } from "@/components/ui";
import { formatDuration, formatPace } from "@/utils/format";
import { caloriesFor, paceFor } from "./geo";
import { StatCell } from "./MoveKit";

export default function RunStatGrid({ run, withDistance = false }) {
  const km = Number(run?.distanceKm) || 0;
  const sec = Number(run?.durationSec) || 0;
  const pace = run?.paceSecPerKm || paceFor(km, sec);
  const ride = run?.type === "ride";
  const calories = run?.calories ?? caloriesFor(run?.type, km);
  const paceCell = ride ? (
    <StatCell label="Avg speed" value={pace ? (3600 / pace).toFixed(1) : "--"} unit="km/h" align="left" />
  ) : (
    <StatCell label="Avg pace" value={formatPace(pace)} unit="/km" align="left" />
  );
  const time = <StatCell label="Time" value={formatDuration(sec)} align="left" />;
  const kcal = <StatCell label="Calories" value={String(calories)} unit="kcal" align="left" />;

  if (!withDistance) {
    return (
      <View style={[styles.card, styles.row]}>
        {time}
        <View style={styles.vRule} />
        {paceCell}
        <View style={styles.vRule} />
        {kcal}
      </View>
    );
  }
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <StatCell label="Distance" value={km.toFixed(2)} unit="km" align="left" />
        <View style={styles.vRule} />
        {time}
      </View>
      <View style={styles.hRule} />
      <View style={styles.row}>
        {paceCell}
        <View style={styles.vRule} />
        {kcal}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, paddingHorizontal: S.lg },
  row: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.lg },
  vRule: { width: 1, alignSelf: "stretch", backgroundColor: C.border },
  hRule: { height: 1, backgroundColor: C.border },
});
