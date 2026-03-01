import React from "react";
import { ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Clock3, Package } from "lucide-react-native";

const NEON = "#00ff7f";

const PLACEHOLDERS = [
  { id: "d1", title: "OutHere Tee Drop", countdown: "02D : 09H : 11M" },
  { id: "d2", title: "Sponsor Recovery Kit", countdown: "05D : 01H : 48M" },
];

export default function OutsideDropsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar style="light" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <Package color={NEON} size={18} />
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", marginLeft: 8 }}>
            Drops
          </Text>
        </View>

        {PLACEHOLDERS.map((drop) => (
          <View
            key={drop.id}
            style={{
              backgroundColor: "#161618",
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "#232326",
              padding: 16,
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Clock3 color={NEON} size={14} />
              <Text style={{ color: "#9efac8", marginLeft: 6, fontSize: 12, fontWeight: "800" }}>
                {drop.countdown}
              </Text>
            </View>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800", marginTop: 8 }}>
              {drop.title}
            </Text>
            <Text style={{ color: "#777", fontSize: 12, marginTop: 8 }}>
              Drop details and redemption flow live here.
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
