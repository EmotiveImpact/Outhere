// Web stand-in for the Move map. react-native-maps has no web build, so the
// web version draws the route on a dark panel instead.

import React, { forwardRef, useImperativeHandle, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MapPin } from "lucide-react-native";
import { C } from "@/components/ui";
import RoutePreview from "./RoutePreview";

const RunMap = forwardRef(function RunMap({ segments = [], plannedPath = [], fitTo, style }, ref) {
  const [height, setHeight] = useState(0);
  useImperativeHandle(ref, () => ({ recenter: () => {}, fit: () => {} }));
  const route = fitTo?.length ? fitTo : segments.flat().length > 1 ? segments.flat() : plannedPath;
  return (
    <View style={[styles.wrap, style]} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {route.length > 1 && height > 0 ? (
        <RoutePreview route={route} height={Math.min(height, 420)} radius={0} strokeWidth={5} style={styles.preview} />
      ) : (
        <View style={styles.note}>
          <MapPin size={20} color={C.textMute} />
          <Text style={styles.noteText}>The live map runs in the OutHere app on your phone.</Text>
        </View>
      )}
    </View>
  );
});

export default RunMap;

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: "#0e0f0e", justifyContent: "center" },
  preview: { backgroundColor: "transparent", borderWidth: 0 },
  note: { alignItems: "center", gap: 8, paddingHorizontal: 40 },
  noteText: { color: C.textMute, fontSize: 13, textAlign: "center" },
});
