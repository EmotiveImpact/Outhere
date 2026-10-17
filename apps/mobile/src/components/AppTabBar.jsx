// The app's five tabs on the kit's TabBar, in Edem's order: Home, Move,
// Outside, Crew, Profile. Challenges lives inside Outside, so it has no
// button of its own.
//
// TabsTabBar is what (tabs)/_layout passes to expo-router's Tabs.
// StackTabBar shows the same bar on a pushed screen that the prototype draws
// with a tab bar (for example the fair score): <StackTabBar current="outside" />.

import React from "react";
import { useRouter } from "expo-router";
import { Compass, Home, Route, Users } from "lucide-react-native";
import { useProfile } from "@/data/hooks";
import { Avatar, TabBar } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";

export const TAB_ORDER = ["index", "move", "outside", "club", "profile"];
const ICONS = { index: Home, move: Route, outside: Compass, club: Users };
const LABELS = { index: "Home", move: "Move", outside: "Outside", club: "Crew", profile: "Profile" };
const HREFS = { index: "/", move: "/move", outside: "/outside", club: "/club", profile: "/profile" };

function useItems() {
  const { data: profile } = useProfile();
  return TAB_ORDER.map((key) => ({
    key,
    label: LABELS[key],
    icon: ICONS[key],
    render:
      key === "profile"
        ? () => <Avatar uri={profile?.avatar} name={profile?.name || profile?.username || ""} tier={profile?.tier || "free"} size={23} />
        : undefined,
  }));
}

/**
 * For <Tabs tabBar={...}>. Since expo-router 58 the tab bar gets `emitter`
 * and `navigateToTab` rather than `navigation`; tapping a tab called the old
 * navigation.emit and closed the app.
 */
export function TabsTabBar({ state, emitter, navigateToTab, hidden }) {
  const items = useItems();
  const current = state.routes[state.index]?.name;
  const onSelect = (key) => {
    const route = state.routes.find((r) => r.name === key);
    if (!route) return;
    const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (key !== current && !event.defaultPrevented) {
      hapticSelection();
      navigateToTab(route.key);
    }
  };
  return <TabBar items={items.filter((i) => state.routes.some((r) => r.name === i.key))} current={current} onSelect={onSelect} hidden={hidden} />;
}

/** The tab bar on a stack screen; tapping a tab goes back to that tab. */
export function StackTabBar({ current }) {
  const router = useRouter();
  const items = useItems();
  return (
    <TabBar
      items={items}
      current={current}
      onSelect={(key) => {
        hapticSelection();
        router.navigate(HREFS[key]);
      }}
    />
  );
}
