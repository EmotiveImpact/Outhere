import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { House, Users, Trophy, BarChart3, UserRound } from 'lucide-react-native';
import { useUserStore } from '../../src/store/userStore';
import { useThemeStore } from '../../src/store/themeStore';
import { CurvedBottomTabs } from '../../src/components/base/curved-bottom-tabs';

export default function TabLayout() {
  const { initializeDevice } = useUserStore();
  const { colors } = useThemeStore();

  useEffect(() => {
    initializeDevice();
  }, [initializeDevice]);

  return (
    <Tabs
      tabBar={(props) => (
        <CurvedBottomTabs
          {...props}
          gradients={[colors.backgroundSecondary, colors.background]}
        />
      )}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: '',
          tabBarIcon: ({ color, size }) => (
            <House size={size + 1} color={color} strokeWidth={2.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Squads',
          tabBarLabel: '',
          tabBarIcon: ({ color, size }) => (
            <Users size={size + 1} color={color} strokeWidth={2.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Ranks',
          tabBarLabel: '',
          tabBarIcon: ({ color, size }) => (
            <Trophy size={size + 1} color={color} strokeWidth={2.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarLabel: '',
          tabBarIcon: ({ color, size }) => (
            <BarChart3 size={size + 1} color={color} strokeWidth={2.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: '',
          tabBarIcon: ({ color, size }) => (
            <UserRound size={size + 1} color={color} strokeWidth={2.5} />
          ),
        }}
      />
    </Tabs>
  );
}
