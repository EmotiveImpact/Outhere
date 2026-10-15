import React, { useEffect, useRef } from "react";
import { Redirect, Tabs } from "expo-router";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Compass, Home, Route, Users } from "lucide-react-native";
import { MotiView } from "moti";
import { useProfile } from "@/data/hooks";
import { Avatar, C, F } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";
import { useMoveStore } from "@/store/useMoveStore";

// Five buttons, in Edem's order: Home, Move, Outside, Crew, Profile.
// Challenges lives inside Outside, so it has no button of its own.
const ORDER = ["index", "move", "outside", "club", "profile"];
const ICONS = { index: Home, move: Route, outside: Compass, club: Users };
const LABELS = { index: "Home", move: "Move", outside: "Outside", club: "Crew", profile: "Profile" };

// The active tab glows: light blue icon with a soft bloom behind it and a
// white label. Others dim. No lines, pills or outlines.
function TabButton({ name, focused, onPress, profile }) {
  const Icon = ICONS[name];
  return (
    <Pressable onPress={onPress} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={LABELS[name]}>
      <MotiView
        animate={{ opacity: focused ? 1 : 0, scale: focused ? 1 : 0.6 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        style={styles.bloom}
        pointerEvents="none"
      />
      <MotiView animate={{ opacity: focused ? 1 : 0.55, scale: focused ? 1.04 : 1 }} transition={{ type: "spring", stiffness: 350, damping: 20 }} style={{ alignItems: "center" }}>
        <View style={styles.icon}>
          {name === "profile" ? (
            <Avatar uri={profile?.avatar} name={profile?.name || profile?.username || ""} tier={profile?.tier || "free"} size={26} />
          ) : (
            <Icon size={22} color={focused ? C.accentHi : C.text} strokeWidth={focused ? 2.2 : 1.8} />
          )}
        </View>
        <Text style={[styles.label, { color: focused ? C.text : C.textSoft }]} numberOfLines={1}>
          {LABELS[name]}
        </Text>
      </MotiView>
    </Pressable>
  );
}

function FloatingTabBar({ state, navigation, profile, hidden }) {
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(hidden ? 0 : 1)).current;

  // Slides away while a run is in progress (focus mode).
  useEffect(() => {
    anim.stopAnimation();
    if (hidden) Animated.timing(anim, { toValue: 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    else Animated.spring(anim, { toValue: 1, damping: 20, stiffness: 220, mass: 0.9, useNativeDriver: true }).start();
  }, [hidden, anim]);

  const current = state.routes[state.index]?.name;
  return (
    <Animated.View
      pointerEvents={hidden ? "none" : "box-none"}
      style={[
        styles.wrap,
        { bottom: Math.max(insets.bottom - 8, 10) },
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [140, 0] }) }] },
      ]}
    >
      <View style={styles.bar}>
        {Platform.OS === "ios" ? (
          <BlurView tint="dark" intensity={50} style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(14,17,22,0.72)" }]} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(14,17,22,0.97)" }]} />
        )}
        {ORDER.map((name) => {
          const route = state.routes.find((r) => r.name === name);
          if (!route) return null;
          const focused = current === name;
          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              hapticSelection();
              navigation.navigate(route.name);
            }
          };
          return <TabButton key={name} name={name} focused={focused} onPress={onPress} profile={profile} />;
        })}
      </View>
    </Animated.View>
  );
}

export default function TabLayout() {
  const { data: profile, isPending } = useProfile();
  const isFocusMode = useMoveStore((s) => s.sessionPhase !== "idle" || s.hideTabs);

  // Not signed in or no profile yet: send them to the start.
  if (!isPending && !profile) return <Redirect href="/welcome" />;

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} profile={profile} hidden={isFocusMode} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="move" options={{ title: "Move" }} />
      <Tabs.Screen name="outside" options={{ title: "Outside" }} />
      <Tabs.Screen name="club" options={{ title: "Crew" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="challenges" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 14, right: 14 },
  bar: {
    flexDirection: "row",
    height: 66,
    borderRadius: 26,
    overflow: "hidden",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.09)",
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center" },
  bloom: {
    position: "absolute",
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(61,139,255,0.16)",
    shadowColor: C.accent,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  icon: { height: 28, justifyContent: "center", alignItems: "center" },
  label: { fontFamily: F.bodyMedium, fontSize: 11, marginTop: 3, letterSpacing: 0.1 },
});
