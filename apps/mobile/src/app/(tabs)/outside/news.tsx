import React from "react";
import { ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useOutsideScrollPersistence } from "@/hooks/useOutsideScrollPersistence";

const NEON = "#00ff7f";
const SURFACE = "#161618";

const CATEGORIES = {
  update: { label: "UPDATE", color: NEON },
  recap: { label: "RECAP", color: "#a78bfa" },
  highlight: { label: "HIGHLIGHT", color: "#fbbf24" },
  drop: { label: "DROP", color: "#f472b6" },
  event: { label: "EVENT", color: "#38bdf8" },
};

const NEWS_ITEMS = [
  {
    id: "n1",
    category: "update",
    title: "Arena Season 2 Begins",
    body: "Weekly ladders reset every Monday at midnight UTC. New XP multipliers active.",
    time: "2h ago",
  },
  {
    id: "n2",
    category: "highlight",
    title: "South London Crews Hit 1M Steps",
    body: "Combined crew steps crossed the million mark this week. Huge.",
    time: "5h ago",
  },
  {
    id: "n3",
    category: "recap",
    title: "Night Run Recap — Southbank",
    body: "89 people showed up. 12,400 average steps. Bonus XP awarded to all check-ins.",
    time: "Yesterday",
  },
  {
    id: "n4",
    category: "drop",
    title: "Performance Tee Drop Now Live",
    body: "47 remaining. 150 OUT to claim. Pro and Black members got early access.",
    time: "Yesterday",
  },
  {
    id: "n5",
    category: "event",
    title: "Manchester Morning Move Club Added",
    body: "New weekly event in Piccadilly Gardens. Wednesdays at 6 AM.",
    time: "2 days ago",
  },
  {
    id: "n6",
    category: "update",
    title: "Black Tier Eligibility Updated",
    body: "14-day active streak now unlocks Black eligibility permanently. Keep moving.",
    time: "3 days ago",
  },
];

export default function OutsideNewsScreen() {
  const { scrollRef, handleScroll } = useOutsideScrollPersistence("news");

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar style="light" />
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Section Label */}
        <Text
          style={{
            color: "#555",
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: 1.2,
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Latest
        </Text>

        {NEWS_ITEMS.map((item, index) => {
          const cat = CATEGORIES[item.category] || CATEGORIES.update;
          return (
            <View
              key={item.id}
              style={{
                backgroundColor: SURFACE,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: "#1e1e20",
                padding: 16,
                marginBottom: 10,
              }}
            >
              {/* Top row: Category tag + timestamp */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    backgroundColor: `${cat.color}12`,
                    borderWidth: 1,
                    borderColor: `${cat.color}25`,
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  }}
                >
                  <Text
                    style={{
                      color: cat.color,
                      fontSize: 9,
                      fontWeight: "800",
                      letterSpacing: 0.8,
                    }}
                  >
                    {cat.label}
                  </Text>
                </View>
                <Text style={{ color: "#555", fontSize: 11, fontWeight: "600" }}>
                  {item.time}
                </Text>
              </View>

              {/* Title */}
              <Text
                style={{
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: "800",
                  marginBottom: 4,
                  lineHeight: 20,
                }}
                numberOfLines={2}
              >
                {item.title}
              </Text>

              {/* Body */}
              <Text
                style={{ color: "#777", fontSize: 13, lineHeight: 18 }}
                numberOfLines={2}
              >
                {item.body}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
