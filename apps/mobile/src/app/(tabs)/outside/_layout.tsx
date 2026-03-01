import React, { useCallback, useEffect, useRef, useState } from "react";
import { Slot, usePathname, useRouter } from "expo-router";
import { Animated, LayoutChangeEvent, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Coins, Zap } from "lucide-react-native";
import { useUserStore } from "@/store/userStore";

const NEON = "#00ff7f";

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

  // Animated underline position and width
  const underlineX = useRef(new Animated.Value(0)).current;
  const underlineW = useRef(new Animated.Value(0)).current;
  const tabMeasurements = useRef<{ x: number; width: number }[]>([]);
  const [measured, setMeasured] = useState(false);

  const handleTabLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      tabMeasurements.current[index] = { x, width };

      if (tabMeasurements.current.filter(Boolean).length === SUB_TABS.length) {
        setMeasured(true);
        const m = tabMeasurements.current[activeIndex];
        if (m) {
          underlineX.setValue(m.x);
          underlineW.setValue(m.width);
        }
      }
    },
    [activeIndex, underlineX, underlineW]
  );

  // Animate underline when active tab changes
  useEffect(() => {
    if (!measured) return;
    const m = tabMeasurements.current[activeIndex];
    if (!m) return;

    Animated.parallel([
      Animated.spring(underlineX, {
        toValue: m.x,
        damping: 24,
        stiffness: 300,
        mass: 0.7,
        useNativeDriver: false,
      }),
      Animated.spring(underlineW, {
        toValue: m.width,
        damping: 24,
        stiffness: 300,
        mass: 0.7,
        useNativeDriver: false,
      }),
    ]).start();
  }, [activeIndex, measured, underlineX, underlineW]);

  const switchTab = useCallback(
    (tab: (typeof SUB_TABS)[number]) => {
      if (tab.key === activeTab) return;
      router.replace(tab.href as any);
    },
    [activeTab, router]
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      {/* ─── Persistent Outside Header ─── */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 0,
          backgroundColor: "#0a0a0a",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 18,
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

        {/* ─── Clean Text Tabs with Sliding Underline ─── */}
        <View
          style={{
            flexDirection: "row",
            borderBottomWidth: 1,
            borderColor: "#1c1c1f",
            position: "relative",
          }}
        >
          {SUB_TABS.map((tab, index) => {
            const isActive = tab.key === activeTab;
            return (
              <TouchableOpacity
                key={tab.key}
                onLayout={(e) => handleTabLayout(index, e)}
                onPress={() => switchTab(tab)}
                activeOpacity={0.7}
                style={{
                  paddingBottom: 12,
                  paddingHorizontal: 2,
                  marginRight: 20,
                }}
              >
                <Text
                  style={{
                    color: isActive ? "#fff" : "#555",
                    fontSize: 15,
                    fontWeight: isActive ? "800" : "600",
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Animated green underline */}
          {measured && (
            <Animated.View
              style={{
                position: "absolute",
                bottom: 0,
                height: 2.5,
                borderRadius: 2,
                backgroundColor: NEON,
                shadowColor: NEON,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 6,
                left: underlineX,
                width: underlineW,
              }}
            />
          )}
        </View>
      </View>

      {/* ─── Subpage Content ─── */}
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
    </View>
  );
}
