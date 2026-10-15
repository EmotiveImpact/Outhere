// Idle bottom panel: pick an activity, plan a route or look back, then the
// big blue Touch grass button starts the quick count and the run.

import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { ArrowRight, History, MapPin, Route, X } from "lucide-react-native";
import { Button, C, F, PressableScale, R, Row, S, toast } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";
import { useMoveStore } from "@/store/useMoveStore";
import { ACTIVITY_LIST, activityFor } from "./geo";

export default function StartPanel({ onStart, onPlan, onHistory, bottom }) {
  const activityType = useMoveStore((s) => s.activityType);
  const setActivityType = useMoveStore((s) => s.setActivityType);
  const plannedPath = useMoveStore((s) => s.plannedPath);
  const plannedDistanceM = useMoveStore((s) => s.plannedDistanceM);
  const clearPlan = useMoveStore((s) => s.clearPlan);
  const hasPlan = plannedPath.length > 1;
  const canPlan = Platform.OS !== "web";
  const activity = activityFor(activityType);

  const plan = () => (canPlan ? onPlan?.() : toast("Route planning lives in the app", "Open Outhere on your phone to plot a route."));

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
                <Icon size={20} color={active ? C.accentHi : C.textDim} strokeWidth={2.2} />
                <Text style={[styles.tileText, active && { color: C.text }]}>{a.label}</Text>
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

      <Row gap={S.sm}>
        <Button title={hasPlan ? "Edit route" : "Plan a route"} icon={MapPin} variant="secondary" onPress={plan} style={{ flex: 1 }} />
        <Button title="History" icon={History} variant="secondary" onPress={onHistory} style={{ flex: 1 }} />
      </Row>
      <Button title="Touch grass" iconRight={ArrowRight} size="lg" full onPress={onStart} accessibilityLabel={`Start ${activity.noun}`} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginHorizontal: S.md, backgroundColor: "rgba(10,13,17,0.94)", borderRadius: R.xl, padding: S.lg, gap: S.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  tile: { height: 58, borderRadius: R.md, alignItems: "center", justifyContent: "center", gap: 3, backgroundColor: C.surface },
  tileActive: { backgroundColor: "rgba(61,139,255,0.18)" },
  tileText: { color: C.textDim, fontSize: 13, fontFamily: F.bodySemi },
  plan: { paddingHorizontal: S.xs, gap: S.sm },
  planText: { flex: 1, color: C.textDim, fontSize: 13 },
  planKm: { color: C.text, fontFamily: F.bodySemi },
  planClear: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: C.surface },
});
