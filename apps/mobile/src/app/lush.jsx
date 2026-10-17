// The lush layer on one page: buttons and controls, Skia shaders, haptics,
// rolling numbers and 3D.
// Reached from Settings › The lush layer, or open /lush.

import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Header, Kicker, Screen, Segment, S, useSkiaReady } from "@/components/ui";
import ControlsDemo from "@/components/lush/ControlsDemo";
import ShadersDemo from "@/components/lush/ShadersDemo";
import FeelDemo from "@/components/lush/FeelDemo";
import ThreeDemo from "@/components/lush/ThreeDemo";

const TABS = [
  { value: "buttons", label: "Buttons" },
  { value: "shaders", label: "Shaders" },
  { value: "feel", label: "Feel" },
  { value: "three", label: "3D" },
];

export default function LushLab() {
  const ready = useSkiaReady();
  const [tab, setTab] = useState("buttons");
  return (
    <Screen header={<Header back title="The lush layer" subtitle={ready ? "Skia ready" : "Skia loading"} />}>
      <Segment options={TABS} value={tab} onChange={setTab} style={styles.seg} />
      {tab === "buttons" ? <ControlsDemo /> : null}
      {tab === "shaders" ? <ShadersDemo ready={ready} /> : null}
      {tab === "feel" ? <FeelDemo ready={ready} /> : null}
      {tab === "three" ? <ThreeDemo ready={ready} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  seg: { marginBottom: S.lg },
});
