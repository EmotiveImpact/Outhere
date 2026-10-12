// A finished run's GPS line drawn large on a plain surface. Optional
// children sit at the bottom (used for a short caption).

import React from "react";
import { StyleSheet, View } from "react-native";
import { C, R } from "@/components/ui";
import { isCoord } from "./geo";
import RoutePreview from "./RoutePreview";

export default function RouteHero({ route = [], height = 240, children, style }) {
  const pts = (route || []).filter(isCoord);
  if (pts.length < 2) return null;
  return (
    <View style={[styles.box, { height }, style]}>
      <RoutePreview route={pts} height={height} radius={0} strokeWidth={4} style={styles.line} />
      {children ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: R.lg, backgroundColor: C.surface, overflow: "hidden" },
  line: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: "transparent" },
  content: { flex: 1, justifyContent: "flex-end", padding: 20 },
});
