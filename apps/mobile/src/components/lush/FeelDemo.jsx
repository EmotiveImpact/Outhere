import React from "react";
import { Text } from "react-native";
import { C, F, Surface, S } from "@/components/ui";

export default function FeelDemo() {
  return (
    <Surface padding={S.lg}>
      <Text style={{ color: C.textDim, fontFamily: F.medium }}>Coming in this build.</Text>
    </Surface>
  );
}
