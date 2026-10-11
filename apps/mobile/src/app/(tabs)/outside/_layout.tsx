import React, { useCallback, useEffect, useRef, useState } from "react";
import { Slot, usePathname, useRouter } from "expo-router";
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Coins, Zap } from "lucide-react-native";
import { useProfile } from "@/data/hooks";
import { C, F, R, S } from "@/components/ui";
import { compactNumber } from "@/utils/format";
import { hapticSelection } from "@/services/haptics";

const SUB_TABS = [
  { key: "arena", label: "Arena", href: "/outside/arena" },
  { key: "events", label: "Events", href: "/outside/events" },
  { key: "drops", label: "Drops", href: "/outside/drops" },
  { key: "news", label: "News", href: "/outside/news" },
] as const;

export const unstable_settings = {
  initialRouteName: "arena",
};

const SPRING = { damping: 24, stiffness: 300, mass: 0.7, useNativeDriver: false };

export default function OutsideLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const profile = useProfile().data as { xp?: number; out?: number } | null | undefined;

  const activeTab = SUB_TABS.find((tab) => pathname?.startsWith(tab.href))?.key || "arena";
  const activeIndex = SUB_TABS.findIndex((t) => t.key === activeTab);

  // Sliding underline under the active sub tab.
  const underlineX = useRef(new Animated.Value(0)).current;
  const underlineW = useRef(new Animated.Value(0)).current;
  const layouts = useRef<{ x: number; width: number }[]>([]);
  const [measured, setMeasured] = useState(false);

  const onTabLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      layouts.current[index] = { x, width };
      if (layouts.current.filter(Boolean).length === SUB_TABS.length) {
        const m = layouts.current[activeIndex];
        if (m) {
          underlineX.setValue(m.x);
          underlineW.setValue(m.width);
        }
        setMeasured(true);
      }
    },
    [activeIndex, underlineX, underlineW]
  );

  useEffect(() => {
    if (!measured) return;
    const m = layouts.current[activeIndex];
    if (!m) return;
    Animated.parallel([
      Animated.spring(underlineX, { toValue: m.x, ...SPRING }),
      Animated.spring(underlineW, { toValue: m.width, ...SPRING }),
    ]).start();
  }, [activeIndex, measured, underlineX, underlineW]);

  const switchTab = (tab: (typeof SUB_TABS)[number]) => {
    if (tab.key === activeTab) return;
    hapticSelection();
    router.navigate(tab.href as any);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + S.sm }]}>
        <View style={styles.topRow}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Outside</Text>
            <View style={styles.liveDot} />
          </View>

          <View style={styles.balances}>
            <Pressable
              onPress={() => {
                hapticSelection();
                router.push("/(tabs)/profile" as any);
              }}
              accessibilityLabel="Your XP"
              style={({ pressed }) => [styles.balance, styles.balanceXp, pressed && { opacity: 0.7 }]}
            >
              <Zap color={C.accent} size={13} fill={C.accent} />
              <Text style={styles.balanceText}>{compactNumber(profile?.xp ?? 0)}</Text>
              <Text style={styles.balanceUnit}>XP</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                hapticSelection();
                router.push("/rewards" as any);
              }}
              accessibilityLabel="Your OUT balance"
              style={({ pressed }) => [styles.balance, styles.balanceOut, pressed && { opacity: 0.7 }]}
            >
              <Coins color={C.gold} size={13} />
              <Text style={[styles.balanceText, { color: C.gold }]}>{compactNumber(profile?.out ?? 0)}</Text>
              <Text style={[styles.balanceUnit, { color: "rgba(255,215,0,0.6)" }]}>OUT</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.tabs}>
          {SUB_TABS.map((tab, index) => {
            const active = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                onLayout={(e) => onTabLayout(index, e)}
                onPress={() => switchTab(tab)}
                hitSlop={{ top: 8, bottom: 4, left: 6, right: 6 }}
                style={styles.tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
          {measured ? <Animated.View style={[styles.underline, { left: underlineX, width: underlineW }]} /> : null}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: S.gutter, backgroundColor: C.bg },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: S.lg },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { color: C.text, fontFamily: F.display, fontSize: 30, letterSpacing: -0.5 },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    backgroundColor: C.accent,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  balances: { flexDirection: "row", alignItems: "center", gap: S.sm },
  balance: { flexDirection: "row", alignItems: "center", gap: 5, height: 30, paddingHorizontal: 11, borderRadius: R.full, borderWidth: 1 },
  balanceXp: { backgroundColor: C.accentDim, borderColor: "rgba(0,255,127,0.25)" },
  balanceOut: { backgroundColor: "rgba(255,215,0,0.08)", borderColor: "rgba(255,215,0,0.22)" },
  balanceText: { color: C.text, fontFamily: F.display, fontSize: 14 },
  balanceUnit: { color: "rgba(0,255,127,0.7)", fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  tabs: { flexDirection: "row", gap: S.xl, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.borderStrong },
  tab: { paddingBottom: S.md, paddingHorizontal: 2 },
  tabText: { color: C.textMute, fontFamily: F.displayMedium, fontSize: 16 },
  tabTextActive: { color: C.text },
  underline: {
    position: "absolute",
    bottom: -StyleSheet.hairlineWidth,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: C.accent,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
});
