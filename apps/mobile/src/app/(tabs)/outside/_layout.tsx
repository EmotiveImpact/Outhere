import React from "react";
import { Slot, usePathname, useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SUB_TABS = [
  { key: "arena", label: "Arena", href: "/outside/arena" },
  { key: "events", label: "Events", href: "/outside/events" },
  { key: "drops", label: "Drops", href: "/outside/drops" },
  { key: "news", label: "News", href: "/outside/news" },
];

export default function OutsideLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab =
    SUB_TABS.find((tab) => pathname?.startsWith(tab.href))?.key || "arena";

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: "#1c1c1f",
          backgroundColor: "#0a0a0a",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "#161618",
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "#232326",
            padding: 4,
          }}
        >
          {SUB_TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => router.replace(tab.href)}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  paddingVertical: 8,
                  alignItems: "center",
                  backgroundColor: isActive ? "rgba(0,255,127,0.16)" : "transparent",
                  borderWidth: isActive ? 1 : 0,
                  borderColor: isActive ? "rgba(0,255,127,0.4)" : "transparent",
                }}
              >
                <Text
                  style={{
                    color: isActive ? "#9efac8" : "#7a7a80",
                    fontSize: 12,
                    fontWeight: "800",
                    letterSpacing: 0.2,
                    textTransform: "uppercase",
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
    </View>
  );
}
