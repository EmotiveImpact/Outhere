// Idle bottom panel: pick an activity, then hit the big round Start.
// History and route planning sit either side of it.

import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { History, Route, X } from "lucide-react-native";
import { C, F, PressableScale, R, Row, S, toast } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";
import { useMoveStore } from "@/store/useMoveStore";
import { ACTIVITY_LIST, activityFor } from "./geo";
import { RoundControl, StartOrb } from "./MoveKit";

export default function StartPanel({ onStart, onPlan, onHistory, bottom }) {
  const activityType = useMoveStore((s) => s.activityType);
  const setActivityType = useMoveStore((s) => s.setActivityType);
  const plannedPath = useMoveStore((s) => s.plannedPath);
  const plannedDistanceM = useMoveStore((s) => s.plannedDistanceM);
  const clearPlan = useMoveStore((s) => s.clearPlan);
  const hasPlan = plannedPath.length > 1;
  const canPlan = Platform.OS !== "web";
  const activity = activityFor(activityType);

  const plan = () => (canPlan ? onPlan?.() : toast("Route planning lives in the app", "Open OutHere on your phone to plot a route."));

  return (
    <View style={[styles.panel, { marginBottom: bottom }]}>
      <Row gap={S.sm}>
        {ACTIVITY_LIST.map((a) => {
          const active = a.value === activityType;
          const Icon = a.icon;
          return (
            <View key={a.value} style={{ flex: 1 }}>
              <PressableScale
                accessibilityLabel={a.label}
                haptic={false}
                scaleTo={0.94}
                onPress={() => {
                  hapticSelection();
                  setActivityType(a.value);
                }}
                style={[styles.tile, active && styles.tileActive]}
              >
                <Icon size={22} color={active ? C.bg : C.textDim} strokeWidth={2.2} />
                <Text style={[styles.tileText, active && { color: C.bg }]}>{a.label}</Text>
              </PressableScale>
            </View>
          );
        })}
      </Row>

      {hasPlan ? (
        <Row style={styles.plan}>
          <Route size={16} color={C.textDim} />
          <Text style={styles.planText}>
            <Text style={styles.planKm}>{(plannedDistanceM / 1000).toFixed(2)} km</Text> route loaded
          </Text>
          <PressableScale onPress={clearPlan} hitSlop={10} accessibilityLabel="Clear route" style={styles.planClear}>
            <X size={16} color={C.textDim} />
          </PressableScale>
        </Row>
      ) : null}

      <Row style={styles.controls}>
        <RoundControl icon={History} label="History" onPress={onHistory} size={56} />
        <StartOrb label="Start" sub={activity.noun} accessibilityLabel={`Start ${activity.noun}`} onPress={onStart} />
        <RoundControl icon={Route} label={hasPlan ? "Edit route" : "Plan route"} onPress={plan} size={56} />
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginHorizontal: S.md, backgroundColor: "rgba(10,10,10,0.94)", borderRadius: R.xl, paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.xs, gap: S.md },
  tile: { height: 64, borderRadius: R.md, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: C.surface },
  tileActive: { backgroundColor: C.text },
  tileText: { color: C.textDim, fontSize: 14, fontWeight: "600" },
  plan: { paddingHorizontal: S.xs, gap: S.sm },
  planText: { flex: 1, color: C.textDim, fontSize: 13 },
  planKm: { color: C.text, fontWeight: "600" },
  planClear: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: C.surface },
  controls: { justifyContent: "space-between", alignItems: "center", paddingHorizontal: S.xs },
});
