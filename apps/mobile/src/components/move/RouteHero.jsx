// Hero artwork for a run: generated night-route art with the real GPS line
// drawn over it, a bottom scrim, and whatever sits on top (title, distance).

import React from "react";
import { StyleSheet, View } from "react-native";
import { C, Cover, R } from "@/components/ui";
import { isCoord } from "./geo";
import RoutePreview from "./RoutePreview";

export default function RouteHero({ route = [], seed = "run", height = 240, children, style }) {
  const pts = (route || []).filter(isCoord);
  return (
    <Cover seed={`route-${seed}`} accent={pts.length > 1 ? "#1d6b46" : C.accent} scrim style={[styles.box, { height }, style]}>
      {pts.length > 1 ? (
        <RoutePreview route={pts} height={height * 0.72} radius={0} strokeWidth={5} style={styles.line} />
      ) : null}
      <View style={styles.content}>{children}</View>
    </Cover>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: R.lg, borderWidth: 1, borderColor: C.border },
  line: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: "transparent", borderWidth: 0 },
  content: { flex: 1, justifyContent: "flex-end", padding: 20 },
});
