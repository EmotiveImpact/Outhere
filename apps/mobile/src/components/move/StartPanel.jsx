// Idle bottom panel: pick an activity, then hit the big glowing Start.
// History and route planning sit either side of it.

import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { History, Route, X } from "lucide-react-native";
import { C, F, Label, PressableScale, R, Row, S, toast } from "@/components/ui";
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
                <Icon size={24} color={active ? C.accentText : C.textDim} strokeWidth={2.2} />
                <Text style={[styles.tileText, active && { color: C.accentText }]}>{a.label}</Text>
              </PressableScale>
            </View>
          );
        })}
      </Row>

      {hasPlan ? (
        <Row style={styles.plan}>
          <View style={styles.planIcon}>
            <Route size={16} color={C.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Label>Route loaded</Label>
            <Text style={styles.planKm}>{(plannedDistanceM / 1000).toFixed(2)} km</Text>
          </View>
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
  panel: { marginHorizontal: S.md, backgroundColor: "rgba(10,10,10,0.95)", borderRadius: R.xl, borderWidth: 1, borderColor: C.border, paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.xs, gap: S.sm },
  tile: { height: 72, borderRadius: 18, alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border },
  tileActive: { backgroundColor: C.accent, borderColor: C.accent },
  tileText: { color: C.textDim, fontFamily: F.displayMedium, fontSize: 15, letterSpacing: 0.2 },
  plan: { backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: "rgba(0,255,127,0.3)", paddingVertical: S.sm, paddingHorizontal: S.md, gap: S.md },
  planIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center" },
  planKm: { color: C.text, fontFamily: F.display, fontSize: 17, marginTop: 1 },
  planClear: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: C.surfaceHigh },
  controls: { justifyContent: "space-between", alignItems: "center", paddingHorizontal: S.xs },
});
