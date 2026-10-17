// The bottom of a screen's top slab melts into the page: no border, no lit
// edge, no shadow, the picture simply fades out to the page colour. Edem
// asked for this on 2026-10-17 ("no borders... fade into the background").
// Drop it in as the last background layer of any slab, before the text.

import React from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { C } from "./tokens";

const CLEAR = "rgba(7,9,12,0)"; // C.bg, see-through

/** share: how much of the slab, from the bottom, the fade covers. */
export function SlabFade({ share = 0.42 }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[CLEAR, "rgba(7,9,12,0.55)", "rgba(7,9,12,0.88)", C.bg]}
      locations={[0, 0.45, 0.78, 1]}
      style={[styles.fade, { height: `${share * 100}%` }]}
    />
  );
}

const styles = StyleSheet.create({
  fade: { position: "absolute", left: 0, right: 0, bottom: 0 },
});
