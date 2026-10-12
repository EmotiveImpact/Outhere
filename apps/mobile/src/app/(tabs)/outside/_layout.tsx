import React, { useCallback, useEffect, useRef, useState } from "react";
import { Slot, usePathname, useRouter } from "expo-router";
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Coins, Zap } from "lucide-react-native";
import { useOutsideNow, useProfile } from "@/data/hooks";
import * as UI from "@/components/ui";
import { compactNumber, formatNumber } from "@/utils/format";
import { hapticSelection } from "@/services/haptics";

// The kit is plain JS, so its inferred prop types are too strict for TS here.
const { AnimatedNumber, C, F, LiveDot, PressableScale, R, S } = UI as any;

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
  const profile = useProfile().data as { xp?: number; out?: number; city?: string } | null | undefined;
  const outsideNow = useOutsideNow(profile?.city).data as { count?: number } | undefined;
  const outCount = outsideNow?.count ?? 0;

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
          <View style={{ flex: 1 }}>
            <View style={styles.eyebrow}>
              <LiveDot size={6} />
              <Text style={styles.eyebrowText} numberOfLines={1}>
                {profile?.city ? `${profile.city} · ` : ""}
                {outCount ? `${formatNumber(outCount)} outside now` : "Live"}
              </Text>
            </View>
            <Text style={styles.title}>Outside</Text>
          </View>

          <View style={styles.balances}>
            <PressableScale onPress={() => router.push("/(tabs)/profile" as any)} accessibilityLabel="Your XP" scaleTo={0.92} style={[styles.balance, styles.balanceXp]}>
              <View style={[styles.balanceIcon, { backgroundColor: "rgba(0,255,127,0.16)" }]}>
                <Zap color={C.accent} size={11} fill={C.accent} />
              </View>
              <AnimatedNumber value={profile?.xp ?? 0} format={compactNumber} style={styles.balanceText} />
              <Text style={styles.balanceUnit}>XP</Text>
            </PressableScale>
            <PressableScale onPress={() => router.push("/rewards" as any)} accessibilityLabel="Your OUT balance" scaleTo={0.92} style={[styles.balance, styles.balanceOut]}>
              <View style={[styles.balanceIcon, { backgroundColor: "rgba(255,215,0,0.16)" }]}>
                <Coins color={C.gold} size={11} />
              </View>
              <AnimatedNumber value={profile?.out ?? 0} format={compactNumber} style={styles.balanceText} />
              <Text style={[styles.balanceUnit, { color: "rgba(255,215,0,0.7)" }]}>OUT</Text>
            </PressableScale>
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
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: S.lg },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 2 },
  eyebrowText: { color: C.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" },
  title: { color: C.text, fontFamily: F.display, fontSize: 34, letterSpacing: -1, lineHeight: 40 },
  balances: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  balance: { flexDirection: "row", alignItems: "center", gap: 5, height: 32, paddingLeft: 4, paddingRight: 10, borderRadius: R.full, borderWidth: 1 },
  balanceXp: { backgroundColor: "rgba(0,255,127,0.07)", borderColor: "rgba(0,255,127,0.22)" },
  balanceOut: { backgroundColor: "rgba(255,215,0,0.06)", borderColor: "rgba(255,215,0,0.2)" },
  balanceIcon: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  balanceText: { color: C.text, fontFamily: F.display, fontSize: 14, letterSpacing: -0.2 },
  balanceUnit: { color: "rgba(0,255,127,0.75)", fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  tabs: { flexDirection: "row", gap: S.xl + 2, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.borderStrong },
  tab: { paddingBottom: S.md, paddingTop: 4, paddingHorizontal: 2, minHeight: 36, justifyContent: "flex-end" },
  tabText: { color: C.textMute, fontFamily: F.displayMedium, fontSize: 16, letterSpacing: 0.1 },
  tabTextActive: { color: C.text },
  underline: {
    position: "absolute",
    bottom: -1,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.accent,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
});
