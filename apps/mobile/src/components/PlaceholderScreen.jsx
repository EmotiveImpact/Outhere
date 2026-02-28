import React from "react";
import { View, Text } from "react-native";
import MobileLayout from "@/components/MobileLayout";

export default function PlaceholderScreen({ name }) {
  return (
    <MobileLayout isTabScreen={true}>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#FFFFFF", fontSize: 20 }}>{name} Screen</Text>
        <Text style={{ color: "#8E8E93", marginTop: 10 }}>Coming Soon</Text>
      </View>
    </MobileLayout>
  );
}
