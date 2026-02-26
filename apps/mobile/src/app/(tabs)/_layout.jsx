import { Tabs } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { Home, Trophy, Users } from "lucide-react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import { MotiView } from "moti";
import { Image } from "expo-image";
import { hapticSelection } from "@/services/haptics";

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

export default function TabLayout() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  const avatarUrl = data?.user?.avatar_url || fallbackAvatar;

  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          hapticSelection();
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
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
        name="challenges"
        options={{
          title: "Challenges",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedIcon focused={focused}>
              <Trophy color={color} size={24} />
            </AnimatedIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="run"
        options={{
          title: "MOVE",
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
          title: "Gang",
          tabBarIcon: ({ color, focused }) => (
            <AnimatedIcon focused={focused}>
              <Users color={color} size={24} />
            </AnimatedIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
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
    </Tabs>
  );
}
