import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, ChevronRight, Clock, Plus, Check, Zap, Flame, Radio } from "lucide-react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ConfettiCannon from "react-native-confetti-cannon";
import StepCounterWidget from "@/components/StepCounterWidget";
import { useUserStore } from "@/store/userStore";
import { hapticHeavy, hapticSuccess, hapticSelection, hapticError } from "@/services/haptics";
import { userAPI } from "@/services/api";
import { usePedometer } from "@/hooks/usePedometer";
import { CITIES } from "@/constants/theme";

const fetchDashboard = async () => {
  try {
    const res = await fetch("/api/dashboard");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
};

const fetchLeaderboard = async () => {
  try {
    const res = await fetch("/api/leaderboard");
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
};

const fallbackFriends = [
  {
    id: "fallback-1",
    name: "thaliamood",
    avatar_url: "https://i.pravatar.cc/150?img=1",
    total_distance: 6.4,
  },
  {
    id: "fallback-2",
    name: "lalo_rdz",
    avatar_url: "https://i.pravatar.cc/150?img=2",
    total_distance: 5.8,
  },
  {
    id: "fallback-3",
    name: "luigi_",
    avatar_url: "https://i.pravatar.cc/150?img=3",
    total_distance: 7.2,
  },
  {
    id: "fallback-4",
    name: "maria",
    avatar_url: "https://i.pravatar.cc/150?img=4",
    total_distance: 4.9,
  },
];

const MOTIVATIONAL_PHRASES = [
  "Ready to get moving?",
  "Ready to get active?",
  "Ready to put in work?",
  "Ready to start?",
  "Let's get out here!",
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const getRandomPhrase = () => {
  const idx = Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length);
  return MOTIVATIONAL_PHRASES[idx];
};

const formatDate = (value) => {
  if (!value) return "13/06/2024";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "13/06/2024";
  return date.toLocaleDateString("en-GB");
};

const formatDistance = (value) => {
  const distance = Number.parseFloat(value);
  if (!Number.isFinite(distance)) return "5.4";
  return distance.toFixed(1);
};

const formatPace = (value) => {
  const seconds = Number.parseInt(value, 10);
  if (!Number.isFinite(seconds)) return "6'04";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}'${secs.toString().padStart(2, "0")}`;
};

const formatTime = (value) => {
  const seconds = Number.parseInt(value, 10);
  if (!Number.isFinite(seconds)) return "20:12";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatDistanceTag = (value) => {
  const distance = Number.parseFloat(value);
  if (!Number.isFinite(distance)) return "0.0 KM";
  return `${distance.toFixed(1)} KM`;
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [hasAddedStory, setHasAddedStory] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const { user: storeUser, deviceId, weeklyGoal, setWeeklyGoal, setUser, streak, xp, earnXP, updateStreak, isOutside, toggleIsOutside, squadName } = useUserStore();
  const { currentSteps, distance, isTracking, startTracking, syncSteps } = usePedometer();

  
  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;

  // Start step tracking
  useEffect(() => {
    if (!isTracking) {
      startTracking();
    }
  }, [isTracking, startTracking]);

  // Load check-in state from AsyncStorage on mount
  useEffect(() => {
    if (!deviceId) return;
    const loadCheckIn = async () => {
      const today = new Date().toISOString().split("T")[0];
      const value = await AsyncStorage.getItem(`checkin_${deviceId}_${today}`);
      if (value === "true") setIsCheckedIn(true);
    };
    loadCheckIn();
  }, [deviceId]);

  const handleCheckIn = async () => {
    if (isCheckedIn) return;
    hapticHeavy();
    setIsCheckedIn(true);
    setShowConfetti(true);

    // Earn XP and update streak
    await earnXP(25);
    await updateStreak();

    // Persist check-in locally
    if (deviceId) {
      const today = new Date().toISOString().split("T")[0];
      await AsyncStorage.setItem(`checkin_${deviceId}_${today}`, "true");

      // Try to sync with backend (non-blocking)
      try {
        const result = await userAPI.checkIn(deviceId);
        if (result?.user) setUser(result.user);
        hapticSuccess();
      } catch {
        // Silently fail — check-in is persisted locally regardless
      }
    }
  };

  const motivationalPhrase = useMemo(() => getRandomPhrase(), []);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
  });

  const { data: friends } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
  });

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: "#0a0a0a" }} />;
  }

  const user = storeUser || data?.user || {
    name: "John",
    avatar_url:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
  };

  const lastRun = data?.lastRun;
  const friendStories = Array.isArray(friends) && friends.length > 0
    ? friends
    : fallbackFriends;

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar style="light" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 20,
          flexGrow: 1, // Allow content to fill space
        }}
        showsVerticalScrollIndicator={false}
        bounces={false} // Prevent unnecessary bouncing if content fits
      >
        {/* ── HEADER: Logo + Bell ── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontFamily: "ClashGrotesk-Medium",
              fontSize: 42,
              fontWeight: "500",
              letterSpacing: 4,
            }}
          >
            OUT HERE
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity
              onPress={() => {
                router.push("/notifications");
                hapticSelection();
              }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "#1a1a1a",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bell color="#fff" size={22} />
              {/* Notification Badge Dot */}
              <View style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 9,
                height: 9,
                borderRadius: 4.5,
                backgroundColor: "#00ff7f",
                borderWidth: 2,
                borderColor: "#1a1a1a",
              }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── FRIENDS STORIES ── */}
        <View style={{ marginTop: 16 }}>
          <View
            style={{
              marginBottom: 8,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>
              Friends
            </Text>
            <Text style={{ color: "#555", fontSize: 13 }}>
              {friendStories.length + (hasAddedStory ? 1 : 0)} active
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingTop: 8, gap: 14 }}
          >
            {/* Add Story */}
            <TouchableOpacity
              onPress={() => setHasAddedStory(true)}
              style={{ alignItems: "center", width: 78 }}
            >
              {hasAddedStory ? (
                <LinearGradient
                  colors={["#00ff7f", "#00d4aa"]}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    padding: 2.5,
                    alignItems: "center",
                    justifyContent: "center",
                    shadowColor: "#00ff7f",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.5,
                    shadowRadius: 8,
                    elevation: 5,
                  }}
                >
                  <Image
                    source={{ uri: user.avatar_url }}
                    style={{ width: 67, height: 67, borderRadius: 33.5 }}
                    contentFit="cover"
                  />
                  {isOutside && (
                    <View style={{
                      position: "absolute",
                      bottom: 2,
                      right: 2,
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      backgroundColor: "#00ff7f",
                      borderWidth: 2,
                      borderColor: "#0a0a0a",
                    }} />
                  )}
                </LinearGradient>
              ) : (
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: "#151515",
                    borderWidth: 2,
                    borderColor: "#2a2a2a",
                    borderStyle: "dashed",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Plus color="#555" size={28} />
                </View>
              )}
              <Text
                style={{
                  color: "#aaa",
                  fontSize: 11,
                  marginTop: 10,
                  maxWidth: 78,
                  textAlign: "center",
                }}
                numberOfLines={1}
              >
                {hasAddedStory ? "Your Story" : "Add Story"}
              </Text>
            </TouchableOpacity>

            {/* Friend Stories */}
            {friendStories.map((friend, index) => (
              <TouchableOpacity
                key={friend.id || `friend-${index}`}
                style={{ alignItems: "center", width: 78 }}
              >
                <View style={{ position: "relative" }}>
                  <LinearGradient
                    colors={["#00ff7f", "#00d4aa"]}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      padding: 2.5,
                      alignItems: "center",
                      justifyContent: "center",
                      shadowColor: "#00ff7f",
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.3,
                      shadowRadius: 6,
                      elevation: 4,
                    }}
                  >
                    <Image
                      source={{
                        uri: friend.avatar_url || `https://i.pravatar.cc/150?img=${index + 5}`,
                      }}
                      style={{ width: 67, height: 67, borderRadius: 33.5 }}
                      contentFit="cover"
                    />
                  </LinearGradient>
                  <View
                    style={{
                      position: "absolute",
                      top: -8,
                      right: -8,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: "#00ff7f",
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 10,
                      }}
                    >
                      <Text
                        style={{
                          color: "#000",
                          fontSize: 9,
                          fontWeight: "800",
                        }}
                      >
                        {formatDistanceTag(friend.total_distance)}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text
                  style={{
                    color: "#ccc",
                    fontSize: 11,
                    marginTop: 10,
                    maxWidth: 78,
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  {friend.name || `Runner ${index + 1}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── GREETING + MOTIVATIONAL TEXT + CHECK-IN ── */}
        <View style={{ marginTop: 24 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text style={{ color: "#888", fontSize: 16 }}>
                {getGreeting()} {user.name || user.username}!
              </Text>

              <Text
                style={{
                  color: "#fff",
                  fontSize: 22,
                  fontWeight: "600",
                  marginTop: 2,
                }}
              >
                {motivationalPhrase}
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {/* Check-in Button */}
              <TouchableOpacity
                activeOpacity={isCheckedIn ? 1 : 0.7}
                onPress={handleCheckIn}
                style={{
                  backgroundColor: isCheckedIn ? "#0d2818" : "#1a1a1a",
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: isCheckedIn ? "#00ff7f" : "#333",
                }}
              >
                <Text style={{ color: isCheckedIn ? "#00ff7f" : "#fff", fontSize: 13, fontWeight: "700" }}>
                  {isCheckedIn ? "Checked in ✓" : "Check in"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Streak + XP row */}
          {(streak > 0 || xp > 0) && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              {streak > 0 && (
                <View style={{ backgroundColor: "rgba(0, 255, 127, 0.1)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, flexDirection: "row", alignItems: "center" }}>
                  <Flame color="#00ff7f" size={12} style={{ marginRight: 6 }} />
                  <Text style={{ color: "#00ff7f", fontSize: 12, fontWeight: "800" }}>{streak} day streak</Text>
                </View>
              )}
              {xp > 0 && (
                <View style={{ backgroundColor: "rgba(0, 255, 127, 0.1)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, flexDirection: "row", alignItems: "center" }}>
                  <Zap color="#00ff7f" size={12} style={{ marginRight: 6 }} />
                  <Text style={{ color: "#00ff7f", fontSize: 12, fontWeight: "800" }}>{xp.toLocaleString()} XP</Text>
                </View>
              )}
            </View>
          )}

          {/* ── UNIFIED DASHBOARD WIDGET ── */}
          <View style={{ marginTop: 28 }}>
            <StepCounterWidget
              lastRun={lastRun}
              isCheckedIn={isCheckedIn}
              weeklyGoal={weeklyGoal}
              onGoalChange={(g) => setWeeklyGoal(g)}
              steps={currentSteps}
              distanceKm={distance}
              weeklyDistanceKm={distance}
            />
          </View>
        </View>

      </ScrollView>

      {/* Confetti Overlay */}
      {showConfetti && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }} pointerEvents="none">
          <ConfettiCannon 
            count={80} 
            origin={{ x: windowWidth / 2, y: windowHeight }} 
            autoStart={true}
            fadeOut={true}
            explosionSpeed={350}
            fallSpeed={3000}
            colors={["#00ff7f", "#ffffff", "#0d2818"]}
            onAnimationEnd={() => setShowConfetti(false)}
          />
        </View>
      )}
    </View>
  );
}
