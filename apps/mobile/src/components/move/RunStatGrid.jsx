// Two by two stats for a finished run: distance, time, pace (or speed), calories.

import React from "react";
import { View } from "react-native";
import { Row, S, StatTile } from "@/components/ui";
import { formatDuration, formatPace } from "@/utils/format";
import { caloriesFor, paceFor } from "./geo";

export default function RunStatGrid({ run }) {
  const km = Number(run?.distanceKm) || 0;
  const sec = Number(run?.durationSec) || 0;
  const pace = run?.paceSecPerKm || paceFor(km, sec);
  const ride = run?.type === "ride";
  const calories = run?.calories ?? caloriesFor(run?.type, km);
  return (
    <View style={{ gap: S.sm }}>
      <Row gap={S.sm}>
        <StatTile label="Distance" value={`${km.toFixed(2)} km`} accent />
        <StatTile label="Time" value={formatDuration(sec)} />
      </Row>
      <Row gap={S.sm}>
        {ride ? (
          <StatTile label="Avg speed" value={pace ? `${(3600 / pace).toFixed(1)} km/h` : "--"} />
        ) : (
          <StatTile label="Avg pace" value={pace ? `${formatPace(pace)} /km` : "--"} />
        )}
        <StatTile label="Calories" value={`${calories} kcal`} hint="Rough estimate" />
      </Row>
    </View>
  );
}
