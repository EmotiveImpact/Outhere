import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Trophy, ChevronRight, Zap, Swords, Clock, Sunrise, Flame, Activity, ShieldAlert } from "lucide-react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { hapticSelection } from "@/services/haptics";
import { useUserStore } from "@/store/userStore";

const fetchLeaderboard = async () => {
  try {
    const res = await fetch("/api/leaderboard");
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
};

const fallbackFriends = [
  { id: "1", name: "Sarah", avatar_url: "https://i.pravatar.cc/150?img=1" },
  { id: "2", name: "Mike", avatar_url: "https://i.pravatar.cc/150?img=2" },
  { id: "3", name: "Jazz", avatar_url: "https://i.pravatar.cc/150?img=3" },
  { id: "4", name: "Kobe", avatar_url: "https://i.pravatar.cc/150?img=4" },
  { id: "5", name: "Lena", avatar_url: "https://i.pravatar.cc/150?img=5" },
];

const fallbackEvents = [
  {
    id: "event-1",
    title: "10k on Sunday",
    image_url:
      "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=600&h=300&fit=crop",
    participant_count: 35,
  },
  {
    id: "event-2",
    title: "Trail Run",
    image_url:
      "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=600&h=300&fit=crop",
    participant_count: 22,
  },
];

export default function Challenges() {
  const insets = useSafeAreaInsets();
  const [showChallenge, setShowChallenge] = useState(false);
  const [xpStake, setXpStake] = useState("");
  const [selectedFriend, setSelectedFriend] = useState(null);

  // useUserStore individual selectors for stability
  const yourXP = useUserStore((s) => s.xp) || 0;

  const { data: friends } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
  });

  const friendList = useMemo(() => {
    return Array.isArray(friends) && friends.length > 0 ? friends : fallbackFriends;
  }, [friends]);

  const weeklyChallenge = {
    title: "Run 20km This Week",
    current: 12.5,
    target: 20,
    daysLeft: 3,
  };

  const events = fallbackEvents;

  const challenges = [
    { id: 1, title: "Early Bird", desc: "Run before 7am", icon: Sunrise, progress: 3, total: 5, xpReward: 50, color: "#00ff7f" },
    { id: 2, title: "Speed Demon", desc: "Run 5km under 25min", icon: Zap, progress: 1, total: 1, xpReward: 100, color: "#00ff7f" },
    { id: 3, title: "Consistent Runner", desc: "Run 5 days in a row", icon: Flame, progress: 2, total: 5, xpReward: 150, color: "#00ff7f" },
    { id: 4, title: "Long Distance", desc: "Run 10km in one session", icon: Activity, progress: 0, total: 1, xpReward: 200, color: "#00ff7f" },
  ];

  const activeBattles = [
    {
      id: 1, opponent: "Sarah",
      avatar: "https://images.unsplash.cc/photo-1494790108377-be9c29b29330?w=200",
      stake: 100, timeLeft: "2h 34m", yourScore: 8420, opponentScore: 7650, winning: true,
    },
    {
      id: 2, opponent: "Mike",
      avatar: "https://images.unsplash.cc/photo-1507003211169-0a1dd7228f2d?w=200",
      stake: 75, timeLeft: "5h 12m", yourScore: 4200, opponentScore: 5100, winning: false,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar style="light" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <Text style={{ color: "#fff", fontSize: 32, fontWeight: "800", letterSpacing: -1 }}>
            Challenges
          </Text>
          <View style={{ backgroundColor: "rgba(0, 255, 127, 0.1)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, flexDirection: "row", alignItems: "center" }}>
            <Zap color="#00ff7f" size={14} fill="#00ff7f" />
            <Text style={{ color: "#00ff7f", fontWeight: "800", fontSize: 14, marginLeft: 6, letterSpacing: -0.3 }}>
              {yourXP.toLocaleString()} XP
            </Text>
          </View>
        </View>

        {/* ── WEEKLY CHALLENGE CARD ── */}
        <View style={{
          backgroundColor: "#161618",
          borderRadius: 28,
          padding: 22,
          marginBottom: 28,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 6,
        }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#555", fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
                WEEKLY CHALLENGE
              </Text>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: -0.5 }}>
                {weeklyChallenge.title}
              </Text>
              <Text style={{ color: "#666", fontSize: 13, marginTop: 6, letterSpacing: 0.2 }}>
                {weeklyChallenge.daysLeft} days left · +200 XP
              </Text>
            </View>
            <View style={{ backgroundColor: "rgba(0, 255, 127, 0.1)", borderRadius: 16, padding: 12 }}>
              <Trophy color="#00ff7f" size={28} />
            </View>
          </View>

          {/* Progress bar */}
          <View style={{ marginTop: 8 }}>
            <View style={{ height: 6, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
              <View style={{
                height: "100%",
                width: `${(weeklyChallenge.current / weeklyChallenge.target) * 100}%`,
                backgroundColor: "#00ff7f",
                borderRadius: 3,
              }} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14, letterSpacing: -0.3 }}>
                {weeklyChallenge.current} km
              </Text>
              <Text style={{ color: "#555", fontSize: 13 }}>
                {weeklyChallenge.target} km
              </Text>
            </View>
          </View>
        </View>

        {/* ── ACTIVE BATTLES HEADER ── */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: -0.5 }}>
            Active Battles
          </Text>
          <TouchableOpacity
            onPress={() => { hapticSelection(); setShowChallenge(!showChallenge); }}
            style={{
              backgroundColor: "#00ff7f",
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 16,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Swords color="#000" size={14} strokeWidth={2.5} />
            <Text style={{ color: "#000", fontWeight: "800", fontSize: 13, marginLeft: 6, letterSpacing: 0.3 }}>
              New Battle
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── NEW BATTLE FORM ── */}
        {showChallenge && (
          <View style={{
            backgroundColor: "#161618",
            borderRadius: 24,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: "rgba(0, 255, 127, 0.15)",
          }}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16, marginBottom: 16, letterSpacing: -0.3 }}>
              Choose Opponent
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, flexGrow: 0 }}>
              {friendList.slice(0, 5).map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  onPress={() => { hapticSelection(); setSelectedFriend(friend.id); }}
                  style={{
                    alignItems: "center",
                    marginRight: 12,
                    backgroundColor: selectedFriend === friend.id ? "rgba(0,255,127,0.1)" : "#1e1e20",
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 18,
                    borderWidth: selectedFriend === friend.id ? 1 : 0,
                    borderColor: "rgba(0,255,127,0.3)",
                  }}
                >
                  <Image
                    source={{ uri: friend.avatar_url }}
                    style={{ width: 40, height: 40, borderRadius: 20, marginBottom: 8 }}
                  />
                  <Text style={{ color: selectedFriend === friend.id ? "#00ff7f" : "#888", fontSize: 12, fontWeight: "600" }}>
                    {friend.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={{ color: "#555", fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
              XP STAKE ({yourXP} available)
            </Text>
            <TextInput
              value={xpStake}
              onChangeText={setXpStake}
              placeholder="Enter XP amount..."
              placeholderTextColor="#333"
              keyboardType="numeric"
              style={{
                backgroundColor: "#1e1e20",
                color: "#fff",
                padding: 14,
                borderRadius: 16,
                marginBottom: 14,
                fontSize: 16,
                fontWeight: "600",
              }}
            />
            <TouchableOpacity style={{
              backgroundColor: "#00ff7f",
              padding: 16,
              borderRadius: 18,
              alignItems: "center",
            }}>
              <Text style={{ color: "#000", fontWeight: "800", fontSize: 15, letterSpacing: 0.3 }}>
                Send Challenge
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── BATTLE CARDS ── */}
        {activeBattles.map((battle) => (
          <TouchableOpacity
            key={battle.id}
            activeOpacity={0.7}
            style={{
              backgroundColor: "#161618",
              borderRadius: 24,
              padding: 18,
              marginBottom: 12,
              borderWidth: 1.5,
              borderColor: battle.winning ? "rgba(0, 255, 127, 0.3)" : "rgba(0, 255, 127, 0.3)",
              shadowColor: battle.winning ? "#00ff7f" : "#00ff7f",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
            }}
          >
            {/* Battle header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Image
                  source={{ uri: battle.avatar }}
                  style={{ width: 42, height: 42, borderRadius: 21, marginRight: 12, borderWidth: 2, borderColor: battle.winning ? "rgba(0,255,127,0.3)" : "rgba(0,255,127,0.3)" }}
                />
                <View>
                  <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15, letterSpacing: -0.3 }}>
                    vs {battle.opponent}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
                    <Clock color="#555" size={11} />
                    <Text style={{ color: "#555", fontSize: 12, marginLeft: 4, fontWeight: "600" }}>
                      {battle.timeLeft} left
                    </Text>
                  </View>
                </View>
              </View>
              <View style={{ backgroundColor: "rgba(0, 255, 127, 0.1)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
                <Text style={{ color: "#00ff7f", fontWeight: "800", fontSize: 12, letterSpacing: 0.3 }}>
                  {battle.stake} XP
                </Text>
              </View>
            </View>

            {/* Scores */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#555", fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>YOU</Text>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 20, letterSpacing: -0.5 }}>
                  {battle.yourScore.toLocaleString()}
                </Text>
              </View>
              <View style={{ backgroundColor: battle.winning ? "rgba(0,255,127,0.1)" : "rgba(0,255,127,0.1)", borderRadius: 12, padding: 8 }}>
                <Swords color={battle.winning ? "#00ff7f" : "#00ff7f"} size={20} />
              </View>
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={{ color: "#555", fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                  {battle.opponent.toUpperCase()}
                </Text>
                <Text style={{ color: "#888", fontWeight: "800", fontSize: 20, letterSpacing: -0.5 }}>
                  {battle.opponentScore.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Status pill */}
            <View style={{ alignItems: "center", marginTop: 14 }}>
              <View style={{
                backgroundColor: battle.winning ? "rgba(0,255,127,0.1)" : "rgba(0,255,127,0.1)",
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 12,
              }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {battle.winning ? <Flame color="#00ff7f" size={12} style={{ marginRight: 6 }} /> : <ShieldAlert color="#00ff7f" size={12} style={{ marginRight: 6 }} />}
                    <Text style={{ color: battle.winning ? "#00ff7f" : "#00ff7f", fontSize: 12, fontWeight: "800", letterSpacing: 0.3 }}>
                      {battle.winning ? "You're Winning" : "Catch Up"}
                    </Text>
                  </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* ── EVENTS ── */}
        <View style={{ marginTop: 12 }}>
          <Text
            style={{
              color: "#fff",
              fontSize: 20,
              fontWeight: "700",
              paddingHorizontal: 0,
              marginBottom: 18,
            }}
          >
            Upcoming Events
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ gap: 14, paddingRight: 20 }}
          >
            {events.map((event, index) => (
              <View
                key={event.id || `event-${index}`}
                style={{
                  width: 300,
                  height: 200,
                  borderRadius: 20,
                  overflow: "hidden",
                }}
              >
                <Image
                  source={{ uri: event.image_url || event.image }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.9)"]}
                  locations={[0.1, 1]}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    justifyContent: "space-between",
                    padding: 20,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800" }}>
                    {event.title}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#00ff7f",
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        borderRadius: 25,
                      }}
                    >
                      <Text style={{ color: "#000", fontSize: 15, fontWeight: "800" }}>
                        Enroll now
                      </Text>
                    </TouchableOpacity>
                    <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
                      {(event.participant_count ?? event.participants ?? 0)} joined
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── DAILY CHALLENGES SECTION ── */}
        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: -0.5, marginTop: 24, marginBottom: 16 }}>
          Daily Challenges
        </Text>

        {/* Steps challenge */}
        <View style={{
          backgroundColor: "#161618",
          borderRadius: 24,
          padding: 20,
          marginBottom: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
        }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15, marginBottom: 4, letterSpacing: -0.3 }}>
                Complete Daily Steps
              </Text>
              <Text style={{ color: "#555", fontSize: 12, fontWeight: "500" }}>
                Hit 10,000 steps today
              </Text>
            </View>
            <View style={{ backgroundColor: "rgba(0, 255, 127, 0.1)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 }}>
              <Text style={{ color: "#00ff7f", fontWeight: "800", fontSize: 13 }}>+25 XP</Text>
            </View>
          </View>
          <View style={{ marginTop: 14, height: 5, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
            <View style={{ height: "100%", width: "65%", backgroundColor: "#00ff7f", borderRadius: 3 }} />
          </View>
          <Text style={{ color: "#555", fontSize: 11, marginTop: 6, fontWeight: "600" }}>
            6,500 / 10,000 steps
          </Text>
        </View>

        {/* Club challenge */}
        <View style={{
          backgroundColor: "#161618",
          borderRadius: 24,
          padding: 20,
          marginBottom: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
        }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15, marginBottom: 4, letterSpacing: -0.3 }}>
                Win the Day in Your Club
              </Text>
              <Text style={{ color: "#555", fontSize: 12, fontWeight: "500" }}>
                Get most steps in your club
              </Text>
            </View>
            <View style={{ backgroundColor: "rgba(0, 255, 127, 0.1)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14 }}>
              <Text style={{ color: "#00ff7f", fontWeight: "800", fontSize: 13 }}>+50 XP</Text>
            </View>
          </View>
        </View>

        {/* ── ACHIEVEMENTS SECTION ── */}
        <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: -0.5, marginTop: 24, marginBottom: 16 }}>
          Achievements
        </Text>

        {challenges.map((challenge) => (
          <TouchableOpacity
            key={challenge.id}
            activeOpacity={0.7}
            style={{
              backgroundColor: "#161618",
              borderRadius: 22,
              padding: 18,
              marginBottom: 10,
              flexDirection: "row",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
            }}
          >
            {/* Icon */}
            <View style={{
              width: 50,
              height: 50,
              borderRadius: 18,
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              justifyContent: "center",
              alignItems: "center",
              marginRight: 14,
            }}>
              <challenge.icon color={challenge.color || "#555"} size={24} />
            </View>

            {/* Content */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14, letterSpacing: -0.3 }}>
                  {challenge.title}
                </Text>
                <Text style={{ color: "#00ff7f", fontSize: 11, fontWeight: "800", letterSpacing: 0.3 }}>
                  +{challenge.xpReward} XP
                </Text>
              </View>
              <Text style={{ color: "#555", fontSize: 12, marginBottom: 8, fontWeight: "500" }}>
                {challenge.desc}
              </Text>
              <View style={{ height: 4, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <View style={{
                  height: "100%",
                  width: `${(challenge.progress / challenge.total) * 100}%`,
                  backgroundColor: challenge.progress === challenge.total ? "#00ff7f" : "rgba(0, 255, 127, 0.5)",
                  borderRadius: 2,
                }} />
              </View>
              <Text style={{ color: "#444", fontSize: 10, marginTop: 5, fontWeight: "600", letterSpacing: 0.3 }}>
                {challenge.progress}/{challenge.total} completed
              </Text>
            </View>

            <ChevronRight color="#333" size={18} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
