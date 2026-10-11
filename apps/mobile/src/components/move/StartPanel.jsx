// Idle bottom panel: pick an activity, optionally plan a route, then go.

import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Play, Route, X } from "lucide-react-native";
import { Button, C, F, Label, R, Row, S } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";
import { useMoveStore } from "@/store/useMoveStore";
import { ACTIVITY_LIST, activityFor } from "./geo";

export default function StartPanel({ onStart, onPlan, bottom }) {
  const activityType = useMoveStore((s) => s.activityType);
  const setActivityType = useMoveStore((s) => s.setActivityType);
  const plannedPath = useMoveStore((s) => s.plannedPath);
  const plannedDistanceM = useMoveStore((s) => s.plannedDistanceM);
  const clearPlan = useMoveStore((s) => s.clearPlan);
  const hasPlan = plannedPath.length > 1;
  const canPlan = Platform.OS !== "web";

  return (
    <View style={[styles.panel, { marginBottom: bottom }]}>
      <Row gap={S.sm}>
        {ACTIVITY_LIST.map((a) => {
          const active = a.value === activityType;
          const Icon = a.icon;
          return (
            <Pressable
              key={a.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                hapticSelection();
                setActivityType(a.value);
              }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Icon size={18} color={active ? C.accentText : C.textDim} />
              <Text style={[styles.chipText, active && { color: C.accentText }]}>{a.label}</Text>
            </Pressable>
          );
        })}
      </Row>

      {hasPlan ? (
        <Row style={styles.plan}>
          <Route size={18} color={C.accent} />
          <View style={{ flex: 1 }}>
            <Label>Planned route</Label>
            <Text style={styles.planKm}>{(plannedDistanceM / 1000).toFixed(2)} km</Text>
          </View>
          {canPlan ? (
            <Pressable onPress={onPlan} hitSlop={8}>
              <Text style={styles.link}>Edit</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={clearPlan} hitSlop={8} accessibilityLabel="Clear route" style={{ marginLeft: S.md }}>
            <X size={18} color={C.textDim} />
          </Pressable>
        </Row>
      ) : null}

      <Row gap={S.sm}>
        {canPlan && !hasPlan ? <Button title="Plan route" icon={Route} variant="secondary" size="lg" onPress={onPlan} style={{ flex: 1 }} /> : null}
        <Button title={`Start ${activityFor(activityType).noun}`} icon={Play} size="lg" onPress={onStart} style={{ flex: 1.4 }} />
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginHorizontal: S.md, backgroundColor: "rgba(10,10,10,0.94)", borderRadius: R.xl, borderWidth: 1, borderColor: C.border, padding: S.lg, gap: S.md },
  chip: { flex: 1, height: 44, borderRadius: R.full, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.border },
  chipActive: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { color: C.textDim, fontFamily: F.displayMedium, fontSize: 15 },
  plan: { backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.md, gap: S.md },
  planKm: { color: C.text, fontFamily: F.display, fontSize: 18, marginTop: 2 },
  link: { color: C.accent, fontWeight: "700", fontSize: 14 },
});
