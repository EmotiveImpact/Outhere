import React from "react";
import { ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Megaphone } from "lucide-react-native";

const NEON = "#00ff7f";

const NEWS_ITEMS = [
  {
    id: "n1",
    title: "Arena Season Update",
    body: "Weekly ladders reset every Monday at midnight UTC.",
  },
  {
    id: "n2",
    title: "Community Highlight",
    body: "South London crews crossed 1M combined steps this week.",
  },
  {
    id: "n3",
    title: "Event Recap",
    body: "Last night’s link-up awarded bonus XP to all check-ins.",
  },
];

export default function OutsideNewsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar style="light" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <Megaphone color={NEON} size={18} />
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", marginLeft: 8 }}>
            News
          </Text>
        </View>

        {NEWS_ITEMS.map((item) => (
          <View
            key={item.id}
            style={{
              backgroundColor: "#161618",
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "#232326",
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>
              {item.title}
            </Text>
            <Text style={{ color: "#777", fontSize: 13, marginTop: 8, lineHeight: 20 }}>
              {item.body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
