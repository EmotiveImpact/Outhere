// Route planning controls: tap the map to drop points, the route snaps to
// paths, then save it or head back to start.

import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { Bookmark, Check, Trash2, Undo2 } from "lucide-react-native";
import { Body, Button, C, F, Label, R, Row, S, toast } from "@/components/ui";
import { useMoveStore } from "@/store/useMoveStore";

export default function PlanPanel({ onDone, bottom }) {
  const waypoints = useMoveStore((s) => s.waypoints);
  const plannedPath = useMoveStore((s) => s.plannedPath);
  const plannedDistanceM = useMoveStore((s) => s.plannedDistanceM);
  const isRouting = useMoveStore((s) => s.isRouting);
  const undoWaypoint = useMoveStore((s) => s.undoWaypoint);
  const clearPlan = useMoveStore((s) => s.clearPlan);
  const saveCurrentRoute = useMoveStore((s) => s.saveCurrentRoute);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState(null);

  const hasRoute = plannedPath.length > 1;

  useEffect(() => setSavedName(null), [waypoints]);

  const save = async () => {
    const route = await saveCurrentRoute(name);
    if (route) {
      toast.success("Route saved", `"${route.name}" is under Saved routes`);
      setSavedName(route.name);
      setNaming(false);
      setName("");
    }
  };

  return (
    <View style={[styles.panel, { marginBottom: bottom }]}>
      <Row style={{ justifyContent: "space-between" }}>
        <View>
          <Label>Planned distance</Label>
          <Row gap={S.sm}>
            <Text style={styles.km}>{(plannedDistanceM / 1000).toFixed(2)} km</Text>
            {isRouting ? <ActivityIndicator size="small" color={C.accent} /> : null}
          </Row>
        </View>
        <Row gap={S.sm}>
          <Button title="Undo" icon={Undo2} variant="secondary" size="sm" disabled={!waypoints.length} onPress={undoWaypoint} />
          <Button title="Clear" icon={Trash2} variant="secondary" size="sm" disabled={!waypoints.length && !hasRoute} onPress={clearPlan} />
        </Row>
      </Row>

      <Body dim size={13}>
        {savedName ? `Saved as "${savedName}". Find it under Saved routes.` : waypoints.length ? "Keep tapping to add points. The route follows paths and streets." : "Tap the map to drop your first point."}
      </Body>

      {naming ? (
        <Row gap={S.sm}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name this route"
            placeholderTextColor={C.textMute}
            autoFocus
            maxLength={40}
            onSubmitEditing={save}
            style={styles.input}
          />
          <Button title="Save" size="sm" onPress={save} />
        </Row>
      ) : null}

      <Row gap={S.sm}>
        {!naming ? (
          <View style={{ flex: 1 }}>
            <Button title="Save route" icon={Bookmark} variant="secondary" disabled={!hasRoute || isRouting} onPress={() => setNaming(true)} full />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Button title="Done" icon={Check} onPress={onDone} full />
        </View>
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginHorizontal: S.md, backgroundColor: "rgba(10,10,10,0.94)", borderRadius: R.xl, borderWidth: 1, borderColor: C.border, padding: S.lg, gap: S.md },
  km: { color: C.text, fontFamily: F.display, fontSize: 32, letterSpacing: -0.8 },
  input: { flex: 1, height: 36, borderRadius: R.full, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.surface, color: C.text, paddingHorizontal: S.md, fontSize: 14 },
});
