import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft, SlidersHorizontal, Users, Trophy, Medal,
  Heart, Zap, ChevronRight,
} from "lucide-react-native";
import { hapticSelection } from "@/services/haptics";

// ── NOTIFICATION DATA ──────────────────────────────────────────────────────────

const NOTIFICATIONS = [
  {
    id: "n1",
    category: "Club",
    icon: Users,
    title: "Your club hit its weekly goal!",
    description: "URBAN EXPLORERS reached 500 KM this week. Amazing teamwork — keep pushing together.",
    time: "2h ago",
    read: false,
    action: null,
  },
  {
    id: "n2",
    category: "Challenge",
    icon: Trophy,
    title: "New Challenge Available",
    description: "\"Weekend Warrior\" just dropped — complete 3 runs this weekend to earn bonus XP.",
    time: "3h ago",
    read: false,
    action: "View Challenge",
  },
  {
    id: "n3",
    category: "Social",
    icon: Heart,
    title: "Nicki Minaj liked your run",
    description: "Your half marathon post received 42 likes and 12 comments. Nice work!",
    time: "5h ago",
    read: false,
    action: null,
  },
  {
    id: "n4",
    category: "Achievement",
    icon: Medal,
    title: "Badge Unlocked: 100K Club",
    description: "You've run a total of 100 km. Welcome to the 100K Club — only 8% of runners reach this milestone.",
    time: "Yesterday",
    read: true,
    action: "View Badge",
  },
  {
    id: "n5",
    category: "Move",
    icon: Zap,
    title: "Weekly Recap: 12.4 KM",
    description: "You ran 12.4 KM across 4 sessions last week. That's 30% more than the previous week.",
    time: "Yesterday",
    read: true,
    action: null,
  },
  {
    id: "n6",
    category: "Club",
    icon: Users,
    title: "Patrick Klüvert joined the club",
    description: "Your club now has 125 members. Share the invite code to grow your crew.",
    time: "2 days ago",
    read: true,
    action: null,
  },
  {
    id: "n7",
    category: "Challenge",
    icon: Trophy,
    title: "Battle Update: You're Winning!",
    description: "You're 2.3 KM ahead of Michel Jordan in your active battle. Keep it up to claim the win.",
    time: "2 days ago",
    read: true,
    action: "View Battle",
  },
  {
    id: "n8",
    category: "Achievement",
    icon: Medal,
    title: "7-Day Streak Unlocked",
    description: "Consistency is everything. You've been active for 7 days straight — streak master!",
    time: "3 days ago",
    read: true,
    action: null,
  },
  {
    id: "n9",
    category: "Move",
    icon: Zap,
    title: "New Personal Best!",
    description: "You just set a new 5K record at 24:38. That's 12 seconds faster than your previous best.",
    time: "4 days ago",
    read: true,
    action: "View Run",
  },
  {
    id: "n10",
    category: "Social",
    icon: Heart,
    title: "3 new comments on your post",
    description: "Michel Jordan, Patrick and Riyan left comments on your morning grind post.",
    time: "5 days ago",
    read: true,
    action: null,
  },
];

const CATEGORIES = ["All", "Club", "Challenge", "Achievement", "Social", "Move"];

const CATEGORY_COLORS = {
  Club: "#00ff7f",
  Challenge: "#00ff7f",
  Achievement: "#00ff7f",
  Social: "#00ff7f",
  Move: "#00ff7f",
};

// ── COMPONENT ──────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("All");

  const filtered = activeFilter === "All"
    ? NOTIFICATIONS
    : NOTIFICATIONS.filter((n) => n.category === activeFilter);

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar style="light" />
      <View style={{ flex: 1, paddingTop: insets.top }}>

        {/* ── HEADER ── */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 16,
        }}>
          <TouchableOpacity
            onPress={() => { router.back(); hapticSelection(); }}
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: "#161618",
              alignItems: "center", justifyContent: "center",
              borderWidth: 1, borderColor: "#222",
            }}
          >
            <ArrowLeft color="#fff" size={22} />
          </TouchableOpacity>

          <Text style={{
            color: "#fff", fontSize: 20, fontWeight: "800",
            letterSpacing: -0.3,
          }}>
            Notifications
          </Text>

          <TouchableOpacity
            onPress={() => hapticSelection()}
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: "#161618",
              alignItems: "center", justifyContent: "center",
              borderWidth: 1, borderColor: "#222",
            }}
          >
            <SlidersHorizontal color="#00ff7f" size={20} />
          </TouchableOpacity>
        </View>

        {/* ── FILTER PILLS ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginBottom: 8 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeFilter === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => { setActiveFilter(cat); hapticSelection(); }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isActive ? "rgba(0,255,127,0.15)" : "#161618",
                  borderWidth: 1,
                  borderColor: isActive ? "#00ff7f" : "#222",
                }}
              >
                <Text style={{
                  color: isActive ? "#00ff7f" : "#888",
                  fontSize: 13,
                  fontWeight: "700",
                }}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── NOTIFICATION LIST ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: insets.bottom + 30,
          }}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <View
                key={item.id}
                style={{
                  backgroundColor: "#161618",
                  borderRadius: 24,
                  padding: 20,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: !item.read ? "rgba(0,255,127,0.15)" : "#1e1e1e",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  {/* Icon Circle */}
                  <View style={{
                    width: 48, height: 48, borderRadius: 24,
                    backgroundColor: "rgba(0,255,127,0.1)",
                    alignItems: "center", justifyContent: "center",
                    marginRight: 16,
                    borderWidth: 1,
                    borderColor: "rgba(0,255,127,0.2)",
                  }}>
                    <IconComponent color="#00ff7f" size={22} />
                    {!item.read && (
                      <View style={{
                        position: "absolute", top: 0, right: 0,
                        width: 10, height: 10, borderRadius: 5,
                        backgroundColor: "#00ff7f",
                        borderWidth: 2, borderColor: "#161618",
                      }} />
                    )}
                  </View>

                  {/* Content */}
                  <View style={{ flex: 1 }}>
                    {/* Category + Time */}
                    <View style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}>
                      <Text style={{
                        color: "#00ff7f",
                        fontSize: 12,
                        fontWeight: "800",
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                      }}>
                        {item.category}
                      </Text>
                      <Text style={{
                        color: "#555",
                        fontSize: 11,
                        fontWeight: "600",
                      }}>
                        {item.time}
                      </Text>
                    </View>

                    {/* Title */}
                    <Text style={{
                      color: "#fff",
                      fontSize: 18,
                      fontWeight: "800",
                      letterSpacing: -0.3,
                      lineHeight: 24,
                      marginBottom: 8,
                    }}>
                      {item.title}
                    </Text>

                    {/* Description */}
                    <Text style={{
                      color: "#888",
                      fontSize: 14,
                      lineHeight: 20,
                      fontWeight: "400",
                    }}>
                      {item.description}
                    </Text>

                    {/* Action Button */}
                    {item.action && (
                      <TouchableOpacity
                        onPress={() => hapticSelection()}
                        style={{
                          alignSelf: "flex-start",
                          marginTop: 14,
                          backgroundColor: "rgba(0,255,127,0.1)",
                          borderWidth: 1,
                          borderColor: "#00ff7f",
                          borderRadius: 20,
                          paddingHorizontal: 18,
                          paddingVertical: 10,
                        }}
                      >
                        <Text style={{
                          color: "#00ff7f",
                          fontSize: 13,
                          fontWeight: "700",
                        }}>
                          {item.action}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}

          {filtered.length === 0 && (
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Text style={{ color: "#333", fontSize: 40, marginBottom: 12 }}>
                ✔
              </Text>
              <Text style={{ color: "#555", fontSize: 16, fontWeight: "600" }}>
                You're all caught up
              </Text>
              <Text style={{ color: "#333", fontSize: 13, marginTop: 6 }}>
                No {activeFilter.toLowerCase()} notifications right now.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}
