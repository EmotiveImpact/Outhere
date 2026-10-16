// The floating tab bar (.oh-tabbar): frosted glass lit along its top edge,
// floating 14px in from the sides. The active tab glows: a soft blue bloom
// slides behind it on a spring, its icon turns light blue with a glow and its
// label turns white. The others dim. No lines, pills or outlines.
//
//   <TabBar items={[{ key, label, icon, render }]} current="index" onSelect={(key) => ...} />
//
// The app's own five tabs, with navigation, are in components/AppTabBar.jsx.

import React, { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { GlowBackdrop } from "./GlowBackdrop";
import { TAB_BAR, useLayoutSize, useTabBarBottom } from "./layout";
import { C, EASE, F, FINISH, splitShadow } from "./tokens";

const EDGE = splitShadow(FINISH.tabBarEdge);
const ACTIVE_ICON = "#9cc4ff";

// filter: drop-shadow(0 0 6px rgba(61,139,255,.9)) drop-shadow(0 0 16px rgba(61,139,255,.45))
const ICON_GLOW = Platform.select({
  ios: { shadowColor: "#3d8bff", shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  default: { filter: "drop-shadow(0 0 6px rgba(61,139,255,0.9)) drop-shadow(0 0 16px rgba(61,139,255,0.45))" },
});

function Tab({ item, focused, onPress }) {
  const on = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    on.value = withTiming(focused ? 1 : 0, { duration: 350 });
  }, [focused, on]);
  const fade = useAnimatedStyle(() => ({ opacity: 0.55 + 0.45 * on.value }));
  const pop = useSharedValue(1);
  useEffect(() => {
    if (!focused) return;
    // @keyframes oh-pop: a quick swell when chosen
    pop.value = 0.86;
    pop.value = withSpring(1, EASE.thumb);
  }, [focused, pop]);
  const swell = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const Icon = item.icon;
  return (
    <Pressable onPress={onPress} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={item.label}>
      <Animated.View style={[styles.inner, fade]}>
        <Animated.View style={[styles.icon, focused ? ICON_GLOW : null, swell]}>
          {item.render ? item.render(focused) : <Icon size={21} color={focused ? ACTIVE_ICON : C.textDim} strokeWidth={focused ? 2 : 1.8} />}
        </Animated.View>
        <Text style={[styles.label, focused ? styles.labelOn : null]} numberOfLines={1}>
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/**
 * items: [{ key, label, icon (lucide), render(focused) for a custom icon such
 * as the profile ring }]. current: the active key. onSelect(key). hidden:
 * slides the bar away (focus mode). floating: false renders it in place
 * rather than pinned to the bottom of the screen.
 */
export function TabBar({ items, current, onSelect, hidden = false, floating = true, style }) {
  const bottom = useTabBarBottom();
  const [size, onLayout] = useLayoutSize();
  const index = Math.max(0, items.findIndex((i) => i.key === current));
  const slot = size ? (size.width - 4) / items.length : 0;
  const x = useSharedValue(index * slot);
  useEffect(() => {
    // .light slides with --ease-thumb over .65s
    x.value = size ? withSpring(index * slot, EASE.thumb) : index * slot;
  }, [index, slot, size, x]);
  const light = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const shown = useSharedValue(hidden ? 0 : 1);
  useEffect(() => {
    shown.value = hidden ? withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) }) : withSpring(1, { damping: 20, stiffness: 220, mass: 0.9 });
  }, [hidden, shown]);
  const slide = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateY: (1 - shown.value) * 140 }] }));

  return (
    <Animated.View pointerEvents={hidden ? "none" : "box-none"} style={[floating ? [styles.wrap, { bottom }] : null, slide, style]}>
      <View style={[styles.bar, { boxShadow: EDGE.outer }]} onLayout={onLayout}>
        <View style={styles.glass}>
          {Platform.OS === "android" ? null : <BlurView tint="dark" intensity={60} style={StyleSheet.absoluteFill} />}
          <LinearGradient colors={Platform.OS === "android" ? ["rgba(28,32,40,0.97)", "rgba(14,17,22,0.98)"] : FINISH.tabBar} style={StyleSheet.absoluteFill} />
          {slot ? (
            <Animated.View pointerEvents="none" style={[styles.light, { width: slot }, light]}>
              <GlowBackdrop preset="tab" />
            </Animated.View>
          ) : null}
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: TAB_BAR.radius, boxShadow: EDGE.inset }]} />
        </View>
        {items.map((item) => (
          <Tab key={item.key} item={item} focused={item.key === current} onPress={() => onSelect?.(item.key)} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: TAB_BAR.side, right: TAB_BAR.side },
  bar: { flexDirection: "row", height: TAB_BAR.height, borderRadius: TAB_BAR.radius, paddingHorizontal: 2 },
  glass: { ...StyleSheet.absoluteFill, borderRadius: TAB_BAR.radius, overflow: "hidden" },
  light: { position: "absolute", top: 0, bottom: 0, left: 2 },
  item: { flex: 1, alignItems: "center", justifyContent: "center" },
  inner: { alignItems: "center", gap: 5 },
  icon: { height: 23, justifyContent: "center", alignItems: "center" },
  // .oh-tabbar span: 10px Medium; .on: white with a blue glow
  label: { fontFamily: F.bodyMedium, fontSize: 10, letterSpacing: -0.05, color: C.textDim },
  labelOn: { color: "#ffffff", textShadowColor: "rgba(130,180,255,0.55)", textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } },
});
