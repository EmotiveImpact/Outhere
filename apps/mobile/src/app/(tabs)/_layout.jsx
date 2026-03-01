import React, { useEffect, useRef, useState } from "react";
import { Tabs } from "expo-router";
import { BottomTabBar } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import { Animated, Easing, View } from "react-native";
import { Home, Trophy, Users } from "lucide-react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { MotiView } from "moti";
import { Image } from "expo-image";
import { hapticSelection } from "@/services/haptics";
import { useMoveStore } from "@/store/useMoveStore";

const AnimatedIcon = ({ focused, children }) => (
  <MotiView
    animate={{ 
      scale: focused ? 1.2 : 1,
      opacity: focused ? 1 : 0.8
    }}
    transition={{ type: "spring", stiffness: 350, damping: 15 }}
  >
    {children}
  </MotiView>
);

const fallbackAvatar =
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200";

const fetchDashboard = async () => {
  try {
    const res = await fetch("/api/dashboard");
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
};

const FocusModeTabBar = ({ isFocusMode, animatedStyle, ...props }) => {
  return (
    <Animated.View
      pointerEvents={isFocusMode ? "none" : "auto"}
      style={animatedStyle}
    >
      <BottomTabBar {...props} />
    </Animated.View>
  );
};

export default function TabLayout() {
  const isFocusMode = useMoveStore((s) => s.sessionPhase !== "idle");
  const tabAnim = useRef(new Animated.Value(isFocusMode ? 0 : 1)).current;

  useEffect(() => {
    tabAnim.stopAnimation();
    if (isFocusMode) {
      Animated.timing(tabAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.spring(tabAnim, {
      toValue: 1,
      damping: 20,
      stiffness: 220,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  }, [isFocusMode, tabAnim]);

  const animatedTabBarStyle = {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    transform: [
      {
        translateY: tabAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [110, 0],
        }),
      },
    ],
    opacity: tabAnim,
  };

  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  const avatarUrl = data?.user?.avatar_url || fallbackAvatar;

  return (
    <Tabs
      tabBar={(props) => (
        <FocusModeTabBar
          {...props}
          isFocusMode={isFocusMode}
          animatedStyle={animatedTabBarStyle}
        />
      )}
      screenListeners={{
        tabPress: () => {
          hapticSelection();
        },
      }}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: "#0a0a0a",
        },
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "#000",
          borderTopWidth: 0,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: "#00ff7f",
        tabBarInactiveTintColor: "#666",
        tabBarLabelStyle: {
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedIcon focused={focused}>
              <Home color={color} size={24} />
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
              <Trophy color={color} size={24} />
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
              <FontAwesome5 name="running" size={22} color={color} />
            </AnimatedIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="club"
        options={{
          title: "Clubs",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedIcon focused={focused}>
              <Users color={color} size={24} />
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
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  borderWidth: 1.5,
                  borderColor: color,
                  overflow: "hidden",
                }}
              >
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              </View>
            </AnimatedIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
