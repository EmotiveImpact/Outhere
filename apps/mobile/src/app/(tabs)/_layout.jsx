import React, { useEffect, useRef } from "react";
import { Redirect, Tabs } from "expo-router";
import { BottomTabBar } from "@react-navigation/bottom-tabs";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Compass, Home, Footprints, Users } from "lucide-react-native";
import { MotiView } from "moti";
import { useProfile } from "@/data/hooks";
import { Avatar, C } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";
import { useMoveStore } from "@/store/useMoveStore";

// Icon that settles with a small spring when its tab becomes active. The
// active state is the icon colour and a brighter label, nothing more.
const AnimatedIcon = ({ focused, children }) => (
  <View style={tabStyles.iconWrap}>
    <MotiView animate={{ scale: focused ? 1.04 : 1 }} transition={{ type: "spring", stiffness: 350, damping: 20 }}>
      {children}
    </MotiView>
  </View>
);

const TabLabel = ({ focused, children }) => (
  <Text style={[tabStyles.label, { color: focused ? C.text : C.textMute, fontWeight: focused ? "600" : "500" }]} numberOfLines={1}>
    {children}
  </Text>
);

const TabBackground = () =>
  Platform.OS === "ios" ? (
    <BlurView tint="dark" intensity={60} style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(8,8,9,0.72)" }]} />
  ) : (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(8,8,9,0.97)" }]} />
  );

// Slides the tab bar away while a run is in progress (focus mode).
const FocusModeTabBar = ({ isFocusMode, animatedStyle, ...props }) => (
  <Animated.View pointerEvents={isFocusMode ? "none" : "auto"} style={animatedStyle}>
    <BottomTabBar {...props} />
  </Animated.View>
);

export default function TabLayout() {
  const { data: profile, isPending } = useProfile();
  const insets = useSafeAreaInsets();
  // Home indicator phones get the inset; others a little breathing room.
  const bottomPad = insets.bottom > 0 ? insets.bottom - 4 : 10;
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
    transform: [{ translateY: tabAnim.interpolate({ inputRange: [0, 1], outputRange: [140, 0] }) }],
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
          height: 62 + bottomPad,
          paddingTop: 8,
          paddingBottom: bottomPad,
          backgroundColor: "transparent",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: "rgba(255,255,255,0.06)",
          elevation: 0,
        },
        tabBarBackground: TabBackground,
        tabBarItemStyle: { paddingTop: 2 },
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.textMute,
        tabBarLabel: ({ focused, children }) => <TabLabel focused={focused}>{children}</TabLabel>,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedIcon focused={focused}>
              <Home color={color} size={22} />
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
              <Compass color={color} size={22} />
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
              <Footprints color={color} size={22} />
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
              <Users color={color} size={22} />
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
              <Avatar uri={profile?.avatar} name={profile?.name || profile?.username || ""} size={24} ring={focused ? C.accent : "transparent"} colour={profile?.color} />
            </AnimatedIcon>
          ),
        }}
      />
      <Tabs.Screen name="challenges" options={{ href: null }} />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: { width: 56, height: 30, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 11, letterSpacing: 0.2, marginTop: 3 },
});
