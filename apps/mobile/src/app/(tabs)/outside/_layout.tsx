import React, { useCallback, useRef, useState } from "react";
import { Slot, usePathname, useRouter } from "expo-router";
import { Animated, LayoutChangeEvent, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Coins, Wallet, Zap } from "lucide-react-native";
import { useUserStore } from "@/store/userStore";

const NEON = "#00ff7f";
const SURFACE = "#161618";
const BORDER = "#232326";

const SUB_TABS = [
  { key: "arena", label: "Arena", href: "/outside/arena" },
  { key: "events", label: "Events", href: "/outside/events" },
  { key: "drops", label: "Drops", href: "/outside/drops" },
  { key: "news", label: "News", href: "/outside/news" },
];

const formatNumber = (value: number) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString();
};

export default function OutsideLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const xp = useUserStore((s) => s.xp) || 0;
  const out = useUserStore((s) => s.out) || 0;

  const activeTab =
    SUB_TABS.find((tab) => pathname?.startsWith(tab.href))?.key || "arena";
  const activeIndex = SUB_TABS.findIndex((t) => t.key === activeTab);

  // Animated underline
  const underlineAnim = useRef(new Animated.Value(0)).current;
  const tabWidths = useRef<number[]>([0, 0, 0, 0]);
  const tabXPositions = useRef<number[]>([0, 0, 0, 0]);
  const [tabsMeasured, setTabsMeasured] = useState(false);

  const handleTabLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      tabWidths.current[index] = width;
      tabXPositions.current[index] = x;

      // Check if all tabs are measured
      if (tabWidths.current.every((w) => w > 0)) {
        setTabsMeasured(true);
        // Set initial position
        Animated.timing(underlineAnim, {
          toValue: tabXPositions.current[activeIndex] || 0,
          duration: 0,
          useNativeDriver: true,
        }).start();
      }
    },
    [activeIndex, underlineAnim]
  );

  const switchTab = useCallback(
    (tab: (typeof SUB_TABS)[number], index: number) => {
      if (tab.key === activeTab) return;

      // Animate underline
      Animated.spring(underlineAnim, {
        toValue: tabXPositions.current[index] || 0,
        damping: 22,
        stiffness: 280,
        mass: 0.8,
        useNativeDriver: true,
      }).start();

      // Use replace to avoid stacking history
      router.replace(tab.href as any);
    },
    [activeTab, router, underlineAnim]
  );

  const underlineWidth = tabsMeasured
    ? tabWidths.current[activeIndex] || 0
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      {/* ─── Persistent Outside Header ─── */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 6,
          backgroundColor: "#0a0a0a",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          {/* Left: Title + Live dot */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text
              style={{
                color: "#fff",
                fontSize: 28,
                fontWeight: "900",
                letterSpacing: -1,
              }}
            >
              Outside
            </Text>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: NEON,
                shadowColor: NEON,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 6,
              }}
            />
          </View>

          {/* Right: XP pill + OUT pill */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                backgroundColor: "rgba(0, 255, 127, 0.1)",
                borderWidth: 1,
                borderColor: "rgba(0, 255, 127, 0.25)",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Zap color={NEON} size={12} fill={NEON} />
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "800",
                  fontSize: 12,
                  letterSpacing: -0.3,
                }}
              >
                {formatNumber(xp)}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: "rgba(255, 215, 0, 0.08)",
                borderWidth: 1,
                borderColor: "rgba(255, 215, 0, 0.2)",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Coins color="#ffd700" size={12} />
              <Text
                style={{
                  color: "#ffd700",
                  fontWeight: "800",
                  fontSize: 12,
                  letterSpacing: -0.3,
                }}
              >
                {formatNumber(out)}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── Animated Segmented Control ─── */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: SURFACE,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: BORDER,
            padding: 4,
            position: "relative",
          }}
        >
          {/* Animated neon underline */}
          {tabsMeasured && (
            <Animated.View
              style={{
                position: "absolute",
                bottom: 4,
                left: 4,
                height: 3,
                width: underlineWidth,
                borderRadius: 2,
                backgroundColor: NEON,
                shadowColor: NEON,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 8,
                transform: [{ translateX: underlineAnim }],
              }}
            />
          )}
          {SUB_TABS.map((tab, index) => {
            const isActive = tab.key === activeTab;
            return (
              <TouchableOpacity
                key={tab.key}
                onLayout={(e) => handleTabLayout(index, e)}
                onPress={() => switchTab(tab, index)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  paddingVertical: 10,
                  paddingBottom: 12,
                  alignItems: "center",
                  backgroundColor: isActive
                    ? "rgba(0,255,127,0.1)"
                    : "transparent",
                }}
              >
                <Text
                  style={{
                    color: isActive ? "#fff" : "#5a5a60",
                    fontSize: 12,
                    fontWeight: "800",
                    letterSpacing: 0.6,
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

      {/* ─── Subpage Content ─── */}
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
    </View>
  );
}
