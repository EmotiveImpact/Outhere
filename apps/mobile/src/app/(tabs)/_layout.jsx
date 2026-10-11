import React, { useEffect, useRef } from "react";
import { Redirect, Tabs } from "expo-router";
import { BottomTabBar } from "@react-navigation/bottom-tabs";
import { Animated, Easing, StyleSheet } from "react-native";
import { Compass, Home, Footprints, Users } from "lucide-react-native";
import { MotiView } from "moti";
import { useProfile } from "@/data/hooks";
import { Avatar, C } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";
import { useMoveStore } from "@/store/useMoveStore";

const AnimatedIcon = ({ focused, children }) => (
  <MotiView
    animate={{ scale: focused ? 1.1 : 1, opacity: focused ? 1 : 0.75 }}
    transition={{ type: "spring", stiffness: 350, damping: 18 }}
  >
    {children}
  </MotiView>
);

// Slides the tab bar away while a run is in progress (focus mode).
const FocusModeTabBar = ({ isFocusMode, animatedStyle, ...props }) => (
  <Animated.View pointerEvents={isFocusMode ? "none" : "auto"} style={animatedStyle}>
    <BottomTabBar {...props} />
  </Animated.View>
);

export default function TabLayout() {
  const { data: profile, isPending } = useProfile();
  const isFocusMode = useMoveStore((s) => s.sessionPhase !== "idle");
  const tabAnim = useRef(new Animated.Value(isFocusMode ? 0 : 1)).current;

  useEffect(() => {
    tabAnim.stopAnimation();
    if (isFocusMode) {
      Animated.timing(tabAnim, { toValue: 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      return;
    }
    Animated.spring(tabAnim, { toValue: 1, damping: 20, stiffness: 220, mass: 0.9, useNativeDriver: true }).start();
  }, [isFocusMode, tabAnim]);

  // No profile on this phone: send them to the start.
  if (!isPending && !profile) return <Redirect href="/welcome" />;

  const animatedTabBarStyle = {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    opacity: tabAnim,
    transform: [{ translateY: tabAnim.interpolate({ inputRange: [0, 1], outputRange: [110, 0] }) }],
  };

  return (
    <Tabs
      tabBar={(props) => <FocusModeTabBar {...props} isFocusMode={isFocusMode} animatedStyle={animatedTabBarStyle} />}
      screenListeners={{ tabPress: () => hapticSelection() }}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: C.bg },
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#000",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: C.border,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.textMute,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", letterSpacing: 0.2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedIcon focused={focused}>
              <Home color={color} size={23} />
            </AnimatedIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="outside"
        options={{
          title: "Outside",
          href: "/outside/arena",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedIcon focused={focused}>
              <Compass color={color} size={23} />
            </AnimatedIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="move"
        options={{
          title: "Move",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedIcon focused={focused}>
              <Footprints color={color} size={23} />
            </AnimatedIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="club"
        options={{
          title: "Crew",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedIcon focused={focused}>
              <Users color={color} size={23} />
            </AnimatedIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedIcon focused={focused}>
              <Avatar uri={profile?.avatar} name={profile?.name || profile?.username || ""} size={26} ring={color} colour={profile?.avatar ? undefined : profile?.color} />
            </AnimatedIcon>
          ),
        }}
      />
      <Tabs.Screen name="challenges" options={{ href: null }} />
    </Tabs>
  );
}
