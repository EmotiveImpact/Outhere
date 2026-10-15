import React from "react";
import { Redirect, Tabs } from "expo-router";
import { useProfile } from "@/data/hooks";
import { C } from "@/components/ui";
import { TabsTabBar } from "@/components/AppTabBar";
import { useMoveStore } from "@/store/useMoveStore";

// Five buttons, in Edem's order: Home, Move, Outside, Crew, Profile. The bar
// itself is the kit's TabBar (components/ui/TabBar.jsx): the active tab
// glows, the others dim, no lines, pills or outlines. It slides away while a
// run is in progress (focus mode).

export default function TabLayout() {
  const { data: profile, isPending } = useProfile();
  const isFocusMode = useMoveStore((s) => s.sessionPhase !== "idle" || s.hideTabs);

  // Not signed in or no profile yet: send them to the start.
  if (!isPending && !profile) return <Redirect href="/welcome" />;

  return (
    <Tabs
      tabBar={(props) => <TabsTabBar {...props} hidden={isFocusMode} />}
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
