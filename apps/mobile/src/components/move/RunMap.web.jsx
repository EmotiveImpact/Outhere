// Web stand-in for the Move map. react-native-maps has no web build, so the
// web version draws the route on a dark panel instead.

import React, { forwardRef, useImperativeHandle, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MapPin } from "lucide-react-native";
import { C, Cover } from "@/components/ui";
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
        <>
          <Cover seed="move-web-map" accent="#1d6b46" style={[StyleSheet.absoluteFill, { opacity: 0.4 }]} />
          <View style={styles.note}>
            <MapPin size={20} color={C.textDim} />
            <Text style={styles.noteText}>The live map runs in the OutHere app on your phone.</Text>
          </View>
        </>
      )}
    </View>
  );
});

export default RunMap;

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", backgroundColor: "#0e0f0e", justifyContent: "center" },
  preview: { backgroundColor: "transparent", borderWidth: 0 },
  note: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 40, paddingBottom: 220 },
  noteText: { color: C.textDim, fontSize: 13, textAlign: "center" },
});
