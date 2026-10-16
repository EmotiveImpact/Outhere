import React, { useCallback, useEffect, useRef, useState } from "react";
import { Slot, usePathname, useRouter } from "expo-router";
import { Animated, LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as UI from "@/components/ui";
import { hapticSelection } from "@/services/haptics";

// The kit is plain JS, so its inferred prop types are too strict for TS here.
const { C, F, FINISH, R, S, splitShadow } = UI as any;

// .seg.gl with the round ten finish: see-through glass lit along its edge,
// and the act gradient thumb (.r10thumb) that springs between sections.
const TRACK = splitShadow("inset 0 1px 0 rgba(255,255,255,0.09), inset 0 0 0 1px rgba(255,255,255,0.045), 0 14px 28px -20px #000");
const THUMB = splitShadow("inset 0 1px 0 rgba(255,255,255,0.3), 0 8px 20px -8px rgba(42,106,240,0.95)");

const SUB_TABS = [
  { key: "arena", label: "Arena", href: "/outside/arena" },
  { key: "challenges", label: "Challenges", href: "/outside/challenges" },
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

  // The pills float over each section's full bleed hero.
  return (
    <View style={styles.root}>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>

      <View style={[styles.bar, { top: insets.top + S.sm }]} pointerEvents="box-none">
        <View style={[styles.tabs, { boxShadow: TRACK.outer }]}>
          <View style={styles.glass} pointerEvents="none">
            {Platform.OS === "android" ? null : <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Platform.OS === "android" ? "rgba(10,14,20,0.85)" : "rgba(10,14,20,0.5)" }]} />
            <View style={[StyleSheet.absoluteFill, { borderRadius: R.full, boxShadow: TRACK.inset }]} />
          </View>
          {measured ? (
            <Animated.View style={[styles.underline, { left: underlineX, width: underlineW, boxShadow: THUMB.outer }]} pointerEvents="none">
              <View style={styles.thumbBody}>
                <LinearGradient colors={FINISH.act} locations={FINISH.actStops} style={StyleSheet.absoluteFill} />
                <View style={[StyleSheet.absoluteFill, { borderRadius: R.full, boxShadow: THUMB.inset }]} />
              </View>
            </Animated.View>
          ) : null}
          {SUB_TABS.map((tab, index) => {
            const active = tab.key === activeTab;
            return (
              <Pressable
                key={tab.key}
                onLayout={(e) => onTabLayout(index, e)}
                onPress={() => switchTab(tab)}
                hitSlop={{ top: 8, bottom: 4, left: 2, right: 2 }}
                style={styles.tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  bar: { position: "absolute", left: 14, right: 14, zIndex: 20 },
  // Glass pill row: the active section sits in a blue pill that springs across.
  tabs: { flexDirection: "row", justifyContent: "space-between", borderRadius: R.full, padding: 4 },
  glass: { ...StyleSheet.absoluteFillObject, borderRadius: R.full, overflow: "hidden" },
  tab: { height: 34, paddingHorizontal: 10, justifyContent: "center", alignItems: "center", flexGrow: 1, zIndex: 1 },
  tabText: { color: "#c9d0db", fontFamily: F.bodyMedium, fontSize: 12.5 },
  tabTextActive: { color: C.accentText, fontFamily: F.bodySemi },
  underline: { position: "absolute", top: 4, height: 34, borderRadius: R.full },
  thumbBody: { ...StyleSheet.absoluteFillObject, borderRadius: R.full, overflow: "hidden" },
});
