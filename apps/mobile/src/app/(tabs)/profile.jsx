import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Pressable, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, Pattern, Rect, Circle } from "react-native-svg";
import { Calendar as RNCalendar } from "react-native-calendars";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Image } from "expo-image";
import {
  Calendar,
  Medal,
  Route,
  Timer,
  Trophy,
  Settings,
  Target,
  Clock,
  ChevronRight,
  Zap,
  Flame,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useUserStore } from "@/store/userStore";
import { hapticSelection, hapticSuccess, hapticError } from "@/services/haptics";
import { useMoveStore } from "@/store/useMoveStore";

const fallbackUser = {
  id: 1,
  name: "John",
  avatar_url:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
  bio: "Runner and community builder.",
  location: "Los Angeles",
  goal: "Run 100km this month",
};

const fallbackRuns = [
  {
    id: "fallback-1",
    created_at: new Date().toISOString(),
    distance: 5.2,
    duration_seconds: 28 * 60 + 45,
    pace_seconds_per_km: 5 * 60 + 32,
    calories: 342,
  },
  {
    id: "fallback-2",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    distance: 4.8,
    duration_seconds: 26 * 60 + 20,
    pace_seconds_per_km: 5 * 60 + 29,
    calories: 298,
  },
  {
    id: "fallback-3",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    distance: 6.1,
    duration_seconds: 35 * 60 + 10,
    pace_seconds_per_km: 5 * 60 + 46,
    calories: 410,
  },
  {
    id: "fallback-4",
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    distance: 2.4,
    duration_seconds: 13 * 60 + 50,
    pace_seconds_per_km: 5 * 60 + 46,
    calories: 190,
  },
];

const runRanges = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "all", label: "ALL" },
];

const toNumber = (value, fallback = 0) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toInt = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDistance = (value) => `${toNumber(value).toFixed(1)} km`;

const formatTime = (secondsValue) => {
  const seconds = toInt(secondsValue);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const formatPace = (secondsValue) => {
  const seconds = toInt(secondsValue);
  if (seconds <= 0) return "0'00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}'${secs.toString().padStart(2, "0")}`;
};

const formatCalendarDate = (value) => {
  const date = toDate(value);
  if (!date) return "Today";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const dateKey = (value) => {
  const date = toDate(value);
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
};

const formatFieldLabel = (key) =>
  key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getRunStreak = (runs) => {
  if (!runs.length) return 0;

  const uniqueDays = [
    ...new Set(
      runs
        .map((run) => dateKey(run.created_at || run.date))
        .filter(Boolean),
    ),
  ].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (!uniqueDays.length) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i += 1) {
    const prev = new Date(uniqueDays[i - 1]);
    const curr = new Date(uniqueDays[i]);
    const diffDays = Math.round((prev - curr) / 86400000);
    if (diffDays === 1) streak += 1;
    else break;
  }

  return streak;
};

const getLast7DaysTrend = (runs) => {
  const today = new Date();
  const days = [];

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date(today.getTime() - i * 86400000);
    const key = dateKey(date.toISOString());
    const label = date.toLocaleDateString("en-US", { weekday: "short" });
    const distance = runs
      .filter((run) => dateKey(run.created_at || run.date) === key)
      .reduce((sum, run) => sum + toNumber(run.distance), 0);

    days.push({ key, label, distance });
  }

  const maxDistance = Math.max(...days.map((day) => day.distance), 1);
  return days.map((day) => ({
    ...day,
    height: Math.max(8, Math.round((day.distance / maxDistance) * 70)),
  }));
};

/**
 * Calculates the user's progress against a specific daily distance goal.
 * @param {number} distanceRun - The total distance the user ran on this day
 * @param {number} dailyGoal - The target distance for the day
 * @returns {number} A ratio between 0.0 and 1.0 representing the progress
 */
export const calculateDailyGoalProgress = (distanceRun, dailyGoal = 5) => {
  if (!distanceRun || distanceRun <= 0) return 0;
  return Math.min(distanceRun / dailyGoal, 1);
};

const getWeeklySummaryFromRuns = (runs) => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 6 * 86400000);
  const weekRuns = runs.filter((run) => {
    const created = toDate(run.created_at || run.date);
    return created ? created >= weekAgo : false;
  });

  if (!weekRuns.length) {
    return {
      totalRuns: 0,
      totalDistance: 0,
      totalCalories: 0,
      avgPaceSeconds: 0,
    };
  }

  const totalDistance = weekRuns.reduce(
    (sum, run) => sum + toNumber(run.distance),
    0,
  );
  const totalCalories = weekRuns.reduce(
    (sum, run) => sum + toInt(run.calories),
    0,
  );
  const totalPace = weekRuns.reduce(
    (sum, run) => sum + toInt(run.pace_seconds_per_km),
    0,
  );

  return {
    totalRuns: weekRuns.length,
    totalDistance,
    totalCalories,
    avgPaceSeconds: Math.round(totalPace / weekRuns.length),
  };
};

const getRecordsFromRuns = (runs) => {
  if (!runs.length) {
    return {
      bestDistance: 0,
      longestDurationSeconds: 0,
      fastestPaceSeconds: 0,
    };
  }

  const bestDistance = runs.reduce(
    (max, run) => Math.max(max, toNumber(run.distance)),
    0,
  );
  const longestDurationSeconds = runs.reduce(
    (max, run) => Math.max(max, toInt(run.duration_seconds)),
    0,
  );
  const fastestPaceSeconds = runs.reduce((min, run) => {
    const pace = toInt(run.pace_seconds_per_km);
    if (pace <= 0) return min;
    if (min === 0) return pace;
    return Math.min(min, pace);
  }, 0);

  return {
    bestDistance,
    longestDurationSeconds,
    fastestPaceSeconds,
  };
};

const getUserFields = (user) =>
  Object.entries(user || {}).filter(([, value]) =>
    ["string", "number", "boolean"].includes(typeof value),
  );

const getAchievements = ({ summary, friendCount, eventsCount }) => {
  const totalRuns = toInt(summary?.totalRuns);
  const totalDistance = toNumber(summary?.totalDistance);
  const currentStreak = toInt(summary?.currentStreak);
  const longestStreak = toInt(summary?.longestStreak);

  return [
    {
      id: "first-run",
      title: "First Run",
      description: "Complete your first tracked run",
      progress: Math.min(totalRuns / 1, 1),
      earned: totalRuns >= 1,
    },
    {
      id: "ten-runs",
      title: "Consistency",
      description: "Finish 10 runs",
      progress: Math.min(totalRuns / 10, 1),
      earned: totalRuns >= 10,
    },
    {
      id: "distance-100",
      title: "100K Club",
      description: "Run a total of 100km",
      progress: Math.min(totalDistance / 100, 1),
      earned: totalDistance >= 100,
    },
    {
      id: "social",
      title: "Squad Up",
      description: "Have 5 friends in your club",
      progress: Math.min(friendCount / 5, 1),
      earned: friendCount >= 5,
    },
    {
      id: "streak",
      title: "Streak Master",
      description: "Reach a 7-day streak",
      progress: Math.min(currentStreak / 7, 1),
      earned: longestStreak >= 7,
    },
    {
      id: "events",
      title: "Event Ready",
      description: "Join 3 running events",
      progress: Math.min(eventsCount / 3, 1),
      earned: eventsCount >= 3,
    },
  ];
};

const fetchDashboard = async () => {
  try {
    const res = await fetch("/api/dashboard");
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
};

const fetchProfile = async () => {
  try {
    const res = await fetch("/api/profile");
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
};

const fetchLeaderboard = async () => {
  try {
    const res = await fetch("/api/leaderboard");
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
};

const fetchRuns = async ({ pageParam = 0, queryKey }) => {
  try {
    const [, range] = queryKey;
    const res = await fetch(`/api/runs?range=${range}&limit=8&offset=${pageParam}`);
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
};

const updateProfile = async (payload) => {
  try {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user: storeUser, weeklyGoal, xp, streak, squadName } = useUserStore();
  const [selectedRange, setSelectedRange] = useState("30d");
  const [isEditing, setIsEditing] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [showRunDetail, setShowRunDetail] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [form, setForm] = useState({
    name: "",
    avatar_url: "",
    bio: "",
    location: "",
    goal: "",
  });

  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    isRefetching: isDashboardRefetching,
    refetch: refetchDashboard,
  } = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard });

  const {
    data: profileData,
    isLoading: isProfileLoading,
    isRefetching: isProfileRefetching,
    refetch: refetchProfile,
  } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });

  const {
    data: friendsData,
    isRefetching: isFriendsRefetching,
    refetch: refetchFriends,
  } = useQuery({ queryKey: ["leaderboard"], queryFn: fetchLeaderboard });

  const {
    data: runsPages,
    isLoading: isRunsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchRuns,
    isRefetching: isRunsRefetching,
  } = useInfiniteQuery({
    queryKey: ["runs", selectedRange],
    queryFn: fetchRuns,
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage?.pagination?.nextOffset ?? undefined,
  });

  const saveProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      setSaveMessage("Profile updated.");
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: () => {
      setSaveMessage("Could not update profile right now.");
    },
  });

  const user = storeUser || profileData?.user || dashboardData?.user || fallbackUser;
  const events = Array.isArray(dashboardData?.events) ? dashboardData.events : [];
  const friendList = Array.isArray(friendsData) ? friendsData : [];
  const userRank = friendList.findIndex((friend) => friend.id === user.id) + 1;

  const { history: localHistory, loadHistory } = useMoveStore();

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    setForm({
      name: user?.name || user?.username || "",
      avatar_url: user?.avatar_url || "",
      bio: user?.bio || "",
      location: user?.location || "",
      goal: user?.goal || "",
    });
  }, [user?.name, user?.avatar_url, user?.bio, user?.location, user?.goal]);

  const allRuns = useMemo(() => {
    const pagedRuns = runsPages?.pages?.flatMap((page) => page?.runs || []) || [];
    
    // Combine local history with API runs
    // Prepend local sessions (recent-first)
    const combined = [...localHistory, ...pagedRuns];

    if (combined.length > 0) {
      return combined.sort(
        (a, b) =>
          new Date(b.created_at || b.date).getTime() -
          new Date(a.created_at || a.date).getTime(),
      );
    }

    if (Array.isArray(dashboardData?.recentRuns) && dashboardData.recentRuns.length > 0) {
      return dashboardData.recentRuns;
    }

    if (dashboardData?.lastRun) {
      return [dashboardData.lastRun, ...fallbackRuns.slice(1)];
    }

    return fallbackRuns;
  }, [runsPages, dashboardData?.recentRuns, dashboardData?.lastRun]);

  const profileSummary = useMemo(() => {
    const apiSummary = profileData?.summary;
    if (apiSummary) {
      return {
        totalRuns: toInt(apiSummary.totalRuns),
        totalDistance: toNumber(apiSummary.totalDistance),
        totalCalories: toInt(apiSummary.totalCalories),
        avgPaceSeconds: toInt(apiSummary.avgPaceSeconds),
        weekRuns: toInt(apiSummary.weekRuns),
        weekDistance: toNumber(apiSummary.weekDistance),
        weekCalories: toInt(apiSummary.weekCalories),
        bestDistance: toNumber(apiSummary.bestDistance),
        longestDurationSeconds: toInt(apiSummary.longestDurationSeconds),
        fastestPaceSeconds: toInt(apiSummary.fastestPaceSeconds),
        currentStreak: toInt(apiSummary.currentStreak),
        longestStreak: toInt(apiSummary.longestStreak),
      };
    }

    const weekly = getWeeklySummaryFromRuns(allRuns);
    const records = getRecordsFromRuns(allRuns);
    return {
      totalRuns: allRuns.length,
      totalDistance: allRuns.reduce((sum, run) => sum + toNumber(run.distance), 0),
      totalCalories: allRuns.reduce((sum, run) => sum + toInt(run.calories), 0),
      avgPaceSeconds: weekly.avgPaceSeconds,
      weekRuns: weekly.totalRuns,
      weekDistance: weekly.totalDistance,
      weekCalories: weekly.totalCalories,
      bestDistance: records.bestDistance,
      longestDurationSeconds: records.longestDurationSeconds,
      fastestPaceSeconds: records.fastestPaceSeconds,
      currentStreak: getRunStreak(allRuns),
      longestStreak: getRunStreak(allRuns),
    };
  }, [profileData?.summary, allRuns]);

  const trend = useMemo(() => getLast7DaysTrend(allRuns), [allRuns]);
  const achievements = useMemo(
    () =>
      getAchievements({
        summary: profileSummary,
        friendCount: friendList.length,
        eventsCount: events.length,
      }),
    [profileSummary, friendList.length, events.length],
  );
  const markedDates = useMemo(() => {
    const marks = {};
    allRuns.forEach(run => {
      const date = dateKey(run.created_at || run.date);
      if (date) {
        marks[date] = { 
          marked: true, 
          dotColor: "#00ff7f", 
          selected: date === selectedDate,
          selectedColor: "#00ff7f",
          selectedTextColor: "#000"
        };
      }
    });
    // Ensure selected date is shown even if no run
    if (!marks[selectedDate]) {
      marks[selectedDate] = { selected: true, selectedColor: "#00ff7f", selectedTextColor: "#000" };
    }
    return marks;
  }, [allRuns, selectedDate]);

  const dailyRuns = useMemo(() => {
    return allRuns.filter(run => dateKey(run.created_at || run.date) === selectedDate);
  }, [allRuns, selectedDate]);

  const userFields = useMemo(() => getUserFields(user), [user]);

  const isScreenLoading = isDashboardLoading || isProfileLoading || isRunsLoading;
  const refreshing =
    isDashboardRefetching ||
    isProfileRefetching ||
    isFriendsRefetching ||
    isRunsRefetching;

  const onRefresh = () => {
    refetchDashboard();
    refetchProfile();
    refetchFriends();
    refetchRuns();
  };

  const handleSaveProfile = () => {
    setSaveMessage("");
    hapticSelection();
    saveProfileMutation.mutate({
      name: form.name,
      avatar_url: form.avatar_url,
      bio: form.bio,
      location: form.location,
      goal: form.goal,
    });
  };

  if (isScreenLoading) {
    return <View style={{ flex: 1, backgroundColor: "#0a0a0a" }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 30,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00ff7f"
          />
        }
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 30, fontWeight: "800", letterSpacing: -0.5 }}>
            Profile
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity
              onPress={() => {
                setIsEditing((value) => !value);
                setSaveMessage("");
              }}
              style={{
                backgroundColor: isEditing ? "#2a2a2a" : "#0d2818",
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 14,
              }}
            >
              <Text
                style={{
                  color: isEditing ? "#fff" : "#00ff7f",
                  fontWeight: "700",
                  fontSize: 12,
                }}
              >
                {isEditing ? "Cancel" : "Edit Profile"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/settings")}
              style={{
                backgroundColor: "#1a1a1a",
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Settings color="#fff" size={20} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={{
            marginTop: 18,
            backgroundColor: "#161618",
            borderRadius: 32,
            padding: 24,
            flexDirection: "row",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 8,
          }}
        >
          <Image
            source={{ uri: user.avatar_url || fallbackUser.avatar_url }}
            style={{ width: 96, height: 96, borderRadius: 48 }}
            contentFit="cover"
          />

          <View style={{ marginLeft: 18, flex: 1 }}>
            <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800", letterSpacing: -0.5 }}>
              {user.name || user.username || "Runner"}
            </Text>
            <Text style={{ color: "#666", fontSize: 13, marginTop: 4, letterSpacing: 0.3 }}>
              {user.location || "Location not set"}
            </Text>
            <Text style={{ color: "#999", fontSize: 13, marginTop: 6 }} numberOfLines={2}>
              {user.bio || "Add a short bio to make your profile stand out."}
            </Text>
            <View style={{ backgroundColor: "rgba(255,255,255,0.05)", alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 8 }}>
              <Text style={{ color: "#777", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 }}>SQUAD: {squadName.toUpperCase()}</Text>
            </View>
            <View style={{ flexDirection: "row", marginTop: 12, flexWrap: "wrap", gap: 8 }}>
              <View style={{ backgroundColor: "rgba(0, 255, 127, 0.1)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ color: "#00ff7f", fontSize: 12, fontWeight: "700" }}>
                  {friendList.length} Friends
                </Text>
              </View>
              <View style={{ backgroundColor: "rgba(255, 255, 255, 0.06)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                  {userRank > 0 ? `#${userRank}` : "Unranked"}
                </Text>
              </View>
              {xp > 0 && (
                <View style={{ backgroundColor: "rgba(0, 255, 127, 0.1)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' }}>
                  <Zap color="#00ff7f" size={12} style={{ marginRight: 6 }} />
                  <Text style={{ color: "#00ff7f", fontSize: 12, fontWeight: "800" }}>
                    {xp.toLocaleString()} XP
                  </Text>
                </View>
              )}
              {streak > 0 && (
                <View style={{ backgroundColor: "rgba(0, 255, 127, 0.1)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' }}>
                  <Flame color="#00ff7f" size={12} style={{ marginRight: 6 }} />
                  <Text style={{ color: "#00ff7f", fontSize: 12, fontWeight: "800" }}>
                    {streak} day streak
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── WEEKLY RECAP CARD ── */}
        <LinearGradient
          colors={["#00ff7f", "#00d4aa"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            marginTop: 24,
            borderRadius: 28,
            padding: 24,
            shadowColor: "#00ff7f",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 15,
            elevation: 8,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <View>
              <Text style={{ color: "rgba(0,0,0,0.6)", fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 }}>Weekly Recap</Text>
              <Text style={{ color: "#000", fontSize: 24, fontWeight: "800", marginTop: 2 }}>You're killing it!</Text>
            </View>
            <View style={{ backgroundColor: "rgba(255,255,255,0.2)", padding: 10, borderRadius: 16 }}>
              <Trophy color="#000" size={24} />
            </View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View>
              <Text style={{ color: "#000", fontSize: 22, fontWeight: "800" }}>{profileSummary.totalDistance || "12.4"} <Text style={{ fontSize: 12 }}>KM</Text></Text>
              <Text style={{ color: "rgba(0,0,0,0.5)", fontSize: 11, fontWeight: "700", marginTop: 4 }}>TOTAL DISTANCE</Text>
            </View>
            <View style={{ width: 1, backgroundColor: "rgba(0,0,0,0.1)", marginHorizontal: 15 }} />
            <View>
              <Text style={{ color: "#000", fontSize: 22, fontWeight: "800" }}>{profileSummary.totalDuration || "3h 42m"}</Text>
              <Text style={{ color: "rgba(0,0,0,0.5)", fontSize: 11, fontWeight: "700", marginTop: 4 }}>TOTAL TIME</Text>
            </View>
            <View style={{ width: 1, backgroundColor: "rgba(0,0,0,0.1)", marginHorizontal: 15 }} />
            <View>
              <Text style={{ color: "#000", fontSize: 22, fontWeight: "800" }}>+{xp} <Text style={{ fontSize: 12 }}>XP</Text></Text>
              <Text style={{ color: "rgba(0,0,0,0.5)", fontSize: 11, fontWeight: "700", marginTop: 4 }}>EARNED WEEKLY</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Achieved Goal Progress Card */}
        <View
          style={{
            marginTop: 18,
            backgroundColor: "#161618",
            borderRadius: 32,
            padding: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 8,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "500", letterSpacing: 0.2 }}>Achieved</Text>
            <Target color="#00ff7f" size={24} strokeWidth={2.5} />
          </View>
          
          <View style={{ position: "relative", backgroundColor: "#282A2E", borderRadius: 10, height: 44, overflow: "hidden", marginBottom: 30 }}>
            {/* Filled Teal Bar with Stripes */}
            <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min((profileSummary.weekDistance / 20) * 100, 100)}%`, backgroundColor: "#00ff7f", overflow: "hidden" }}>
              <Svg width="100%" height="100%">
                <Defs>
                  <Pattern id="stripes" patternUnits="userSpaceOnUse" width="28" height="28" patternTransform="rotate(25)">
                    <Rect width="14" height="28" fill="rgba(255,255,255,0.35)" />
                  </Pattern>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#stripes)" />
              </Svg>
            </View>
            
            {/* The Slanted Cutout Mask */}
            <View style={{ 
               position: "absolute", left: `${Math.min((profileSummary.weekDistance / 20) * 100, 100)}%`, top: -10, bottom: -10, width: 40,
               backgroundColor: "#282A2E",
               transform: [{ skewX: "-25deg" }],
               marginLeft: -15
            }} />

            <Text style={{ position: "absolute", right: 16, top: 14, color: "#8E8E93", fontSize: 12, fontWeight: "500" }}>
              {Math.max(0, 20 - profileSummary.weekDistance).toFixed(1)}km Left
            </Text>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 }}>
            {trend.map((day) => {
               // Calculate actual progress based on distance run vs a daily goal (currently defaulting to 5)
               const progress = calculateDailyGoalProgress(day.distance, 5);
               const isActive = day.distance > 0;
               const size = 36;
               const strokeWidth = 4.5;
               const radius = (size - strokeWidth) / 2;
               const circumference = radius * 2 * Math.PI;
               const strokeDashoffset = circumference - progress * circumference;

               return (
                 <View key={day.key} style={{ alignItems: "center" }}>
                   <View style={{ marginBottom: 12 }}>
                     <Svg width={size} height={size}>
                       {/* Background Track */}
                       <Circle
                         cx={size / 2}
                         cy={size / 2}
                         r={radius}
                         stroke="#282A2E"
                         strokeWidth={strokeWidth}
                         fill="none"
                       />
                       {/* Progress Ring */}
                       {isActive && (
                         <Circle
                           cx={size / 2}
                           cy={size / 2}
                           r={radius}
                           stroke="#7FE3D1"
                           strokeWidth={strokeWidth}
                           fill="none"
                           strokeDasharray={circumference}
                           strokeDashoffset={strokeDashoffset}
                           strokeLinecap="round"
                           transform={`rotate(-90 ${size / 2} ${size / 2})`}
                         />
                       )}
                     </Svg>
                   </View>
                   <Text style={{ color: isActive ? "#fff" : "#8E8E93", fontSize: 13, fontWeight: "500" }}>
                     {day.label}
                   </Text>
                 </View>
               );
            })}
          </View>
        </View>

        {isEditing ? (
          <View
            style={{
              marginTop: 14,
              backgroundColor: "#1a1a1a",
              borderRadius: 18,
              padding: 14,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 12 }}>
              Edit Profile Details
            </Text>

            <TextInput
              value={form.name}
              onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
              placeholder="Name"
              placeholderTextColor="#666"
              style={{
                backgroundColor: "#121212",
                color: "#fff",
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 10,
              }}
            />
            <TextInput
              value={form.avatar_url}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, avatar_url: value }))
              }
              placeholder="Avatar URL"
              placeholderTextColor="#666"
              autoCapitalize="none"
              style={{
                backgroundColor: "#121212",
                color: "#fff",
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 10,
              }}
            />
            <TextInput
              value={form.location}
              onChangeText={(value) =>
                setForm((prev) => ({ ...prev, location: value }))
              }
              placeholder="Location"
              placeholderTextColor="#666"
              style={{
                backgroundColor: "#121212",
                color: "#fff",
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 10,
              }}
            />
            <TextInput
              value={form.goal}
              onChangeText={(value) => setForm((prev) => ({ ...prev, goal: value }))}
              placeholder="Running Goal"
              placeholderTextColor="#666"
              style={{
                backgroundColor: "#121212",
                color: "#fff",
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 10,
              }}
            />
            <TextInput
              value={form.bio}
              onChangeText={(value) => setForm((prev) => ({ ...prev, bio: value }))}
              placeholder="Bio"
              placeholderTextColor="#666"
              multiline
              style={{
                backgroundColor: "#121212",
                color: "#fff",
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 12,
                minHeight: 72,
                textAlignVertical: "top",
              }}
            />

            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={saveProfileMutation.isPending}
              style={{
                backgroundColor: "#00ff7f",
                borderRadius: 12,
                paddingVertical: 11,
                alignItems: "center",
              }}
            >
              {saveProfileMutation.isPending ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={{ color: "#000", fontWeight: "700" }}>Save Profile</Text>
              )}
            </TouchableOpacity>
            {saveMessage ? (
              <Text style={{ color: "#888", marginTop: 10, fontSize: 12 }}>
                {saveMessage}
              </Text>
            ) : null}
          </View>
        ) : null}

        <TouchableOpacity
          onPress={() => {
            const { router } = require("expo-router");
            router.push("/onboarding");
          }}
          style={{
            backgroundColor: "#2a2a2a",
            borderRadius: 16,
            paddingVertical: 14,
            alignItems: "center",
            marginTop: 18,
            borderWidth: 1,
            borderColor: "#333",
          }}
        >
          <Text style={{ color: "#aaa", fontWeight: "700", fontSize: 13, letterSpacing: 0.5 }}>
            RETAKE ONBOARDING
          </Text>
        </TouchableOpacity>

        <View style={{ marginTop: 18 }}>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>
            Achievements
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 12 }}
            contentContainerStyle={{ paddingRight: 20 }}
          >
            {achievements.map((item) => (
              <View
                key={item.id}
                style={{
                  width: 190,
                  backgroundColor: "#161618",
                  borderRadius: 22,
                  padding: 16,
                  marginRight: 12,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: item.earned ? "rgba(0,255,127,0.1)" : "#2a2a2a",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Medal
                      size={16}
                      color={item.earned ? "#00ff7f" : "#666"}
                    />
                  </View>
                  <Text
                    style={{
                      marginLeft: 8,
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: "700",
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                </View>

                <Text
                  style={{ color: "#777", fontSize: 12, marginTop: 8, minHeight: 30 }}
                >
                  {item.description}
                </Text>

                <View
                  style={{
                    marginTop: 10,
                    height: 7,
                    backgroundColor: "#262626",
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${Math.round(item.progress * 100)}%`,
                      height: "100%",
                      backgroundColor: item.earned ? "#00ff7f" : "#666",
                    }}
                  />
                </View>

                <Text style={{ color: "#999", fontSize: 11, marginTop: 6 }}>
                  {Math.round(item.progress * 100)}%
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View
          style={{
            marginTop: 22,
            backgroundColor: "#161618",
            borderRadius: 32,
            padding: 24,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 8,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <Calendar color="#00ff7f" size={20} />
            <Text
              style={{
                color: "#fff",
                fontSize: 18,
                fontWeight: "700",
                marginLeft: 8,
              }}
            >
              This Week
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            <View style={{ width: "48%", marginBottom: 12 }}>
              <Text style={{ color: "#888", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>TOTAL DISTANCE</Text>
              <Text style={{ color: "#fff", fontSize: 32, fontWeight: "800", marginTop: 4, letterSpacing: -1 }}>
                {profileSummary.weekDistance.toFixed(1)}
              </Text>
              <Text style={{ color: "#555", fontSize: 12 }}>kilometers</Text>
            </View>

            <View style={{ width: "48%", marginBottom: 12 }}>
              <Text style={{ color: "#888", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>TOTAL RUNS</Text>
              <Text style={{ color: "#fff", fontSize: 32, fontWeight: "800", marginTop: 4, letterSpacing: -1 }}>
                {profileSummary.weekRuns}
              </Text>
              <Text style={{ color: "#555", fontSize: 12 }}>activities</Text>
            </View>

            <View style={{ width: "48%" }}>
              <Text style={{ color: "#888", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>AVG PACE</Text>
              <Text style={{ color: "#fff", fontSize: 32, fontWeight: "800", marginTop: 4, letterSpacing: -1 }}>
                {formatPace(profileSummary.avgPaceSeconds)}
              </Text>
              <Text style={{ color: "#555", fontSize: 12 }}>per km</Text>
            </View>

            <View style={{ width: "48%" }}>
              <Text style={{ color: "#888", fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>CALORIES</Text>
              <Text style={{ color: "#fff", fontSize: 32, fontWeight: "800", marginTop: 4, letterSpacing: -1 }}>
                {profileSummary.weekCalories}
              </Text>
              <Text style={{ color: "#555", fontSize: 12 }}>burned</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 14 }}>
          <View
            style={{
              width: "31.5%",
              backgroundColor: "#161618",
              borderRadius: 24,
              padding: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.2,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <Route color="#00ff7f" size={16} />
            <Text style={{ color: "#777", fontSize: 11, marginTop: 10 }}>BEST DISTANCE</Text>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginTop: 4 }}>
              {formatDistance(profileSummary.bestDistance).replace(" km", "")}
            </Text>
          </View>

          <View
            style={{
              width: "31.5%",
              backgroundColor: "#161618",
              borderRadius: 24,
              padding: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.2,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <Timer color="#00ff7f" size={16} />
            <Text style={{ color: "#777", fontSize: 11, marginTop: 10 }}>LONGEST TIME</Text>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginTop: 4 }}>
              {formatTime(profileSummary.longestDurationSeconds)}
            </Text>
          </View>

          <View
            style={{
              width: "31.5%",
              backgroundColor: "#161618",
              borderRadius: 24,
              padding: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.2,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <Trophy color="#00ff7f" size={16} />
            <Text style={{ color: "#777", fontSize: 11, marginTop: 10 }}>FASTEST PACE</Text>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginTop: 4 }}>
              {formatPace(profileSummary.fastestPaceSeconds)}
            </Text>
          </View>
        </View>

        <View
          style={{
            marginTop: 16,
            backgroundColor: "#161618",
            borderRadius: 28,
            padding: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.2,
            shadowRadius: 10,
            elevation: 4,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
              7 Day Trend
            </Text>
            <Text style={{ color: "#777", fontSize: 12 }}>
              {profileSummary.currentStreak} day streak
            </Text>
          </View>

          <View
            style={{
              marginTop: 14,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-end",
              height: 100,
            }}
          >
            {trend.map((day) => (
              <View key={day.key} style={{ alignItems: "center", width: "13%" }}>
                <View
                  style={{
                    width: 12,
                    height: day.height,
                    borderRadius: 8,
                    backgroundColor: day.distance > 0 ? "#00ff7f" : "#2a2a2a",
                  }}
                />
                <Text style={{ color: "#777", fontSize: 10, marginTop: 8 }}>{day.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── CALENDAR SECTION ── */}
        <View
          style={{
            marginTop: 24,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>
            Activity Calendar
          </Text>
        </View>

        <View style={{ marginTop: 16, backgroundColor: "#161618", borderRadius: 24, padding: 8, overflow: "hidden" }}>
          <RNCalendar
            theme={{
              backgroundColor: "#161618",
              calendarBackground: "#161618",
              textSectionTitleColor: "#888",
              selectedDayBackgroundColor: "#00ff7f",
              selectedDayTextColor: "#000",
              todayTextColor: "#00ff7f",
              dayTextColor: "#fff",
              textDisabledColor: "#444",
              dotColor: "#00ff7f",
              selectedDotColor: "#000",
              arrowColor: "#00ff7f",
              monthTextColor: "#fff",
              indicatorColor: "#00ff7f",
              textDayFontWeight: "600",
              textMonthFontWeight: "800",
              textDayHeaderFontWeight: "700",
              textDayFontSize: 14,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 12,
            }}
            markedDates={markedDates}
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
              hapticSelection();
            }}
          />
        </View>

        {/* ── DAILY RUNS FOR SELECTED DATE ── */}
        <View style={{ marginTop: 24 }}>
          <Text style={{ color: "#777", fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>
            Runs for {selectedDate}
          </Text>
          
          {dailyRuns.length === 0 ? (
            <View style={{ marginTop: 12, padding: 24, backgroundColor: "#161618", borderRadius: 20, alignItems: "center" }}>
              <Clock color="#2a2a2a" size={32} style={{ marginBottom: 8 }} />
              <Text style={{ color: "#444", fontWeight: "600" }}>No runs on this day.</Text>
            </View>
          ) : (
            dailyRuns.map((run, index) => (
              <TouchableOpacity
                key={run.id || `daily-${index}`}
                onPress={() => {
                  setSelectedRun(run);
                  setShowRunDetail(true);
                  hapticSelection();
                }}
                style={{
                  backgroundColor: "#161618",
                  borderRadius: 24,
                  padding: 18,
                  marginTop: 12,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.05)",
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800" }}>
                    {toNumber(run.distance).toFixed(1)} <Text style={{ fontSize: 14, color: "#777" }}>KM</Text>
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>{formatPace(run.pace_seconds_per_km)}</Text>
                      <Text style={{ color: "#444", fontSize: 10 }}>Pace</Text>
                    </View>
                    <ChevronRight color="#444" size={16} />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ── RUN DETAIL MODAL ── */}
        <Modal visible={showRunDetail} transparent animationType="slide">
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" }} onPress={() => setShowRunDetail(false)}>
            <Pressable style={{ backgroundColor: "#0a0a0a", borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 32, paddingBottom: 60 }}>
              <View style={{ width: 40, height: 4, backgroundColor: "#222", borderRadius: 2, alignSelf: "center", marginBottom: 32 }} />
              
              <Text style={{ color: "#00ff7f", fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.5 }}>Activity Details</Text>
              <Text style={{ color: "#fff", fontSize: 32, fontWeight: "800", marginTop: 4 }}>{selectedRun ? formatCalendarDate(selectedRun.created_at || selectedRun.date).split(',')[0] : ""}</Text>
              
              <View style={{ marginTop: 40, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                <View style={{ width: "45%", marginBottom: 32 }}>
                  <Text style={{ color: "#555", fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}>Distance</Text>
                  <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800", marginTop: 4 }}>{selectedRun ? toNumber(selectedRun.distance).toFixed(2) : "0.00"}</Text>
                  <Text style={{ color: "#444", fontSize: 12 }}>kilometers</Text>
                </View>
                <View style={{ width: "45%", marginBottom: 32 }}>
                  <Text style={{ color: "#555", fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}>Time</Text>
                  <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800", marginTop: 4 }}>{selectedRun ? formatTime(selectedRun.duration_seconds) : "00:00"}</Text>
                  <Text style={{ color: "#444", fontSize: 12 }}>duration</Text>
                </View>
                <View style={{ width: "45%" }}>
                  <Text style={{ color: "#555", fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}>Avg Pace</Text>
                  <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800", marginTop: 4 }}>{selectedRun ? formatPace(selectedRun.pace_seconds_per_km) : "0'00"}</Text>
                  <Text style={{ color: "#444", fontSize: 12 }}>per km</Text>
                </View>
                <View style={{ width: "45%" }}>
                  <Text style={{ color: "#555", fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}>Calories</Text>
                  <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800", marginTop: 4 }}>{selectedRun ? toInt(selectedRun.calories) : "0"}</Text>
                  <Text style={{ color: "#444", fontSize: 12 }}>burned</Text>
                </View>
              </View>

              <TouchableOpacity 
                onPress={() => setShowRunDetail(false)}
                style={{ backgroundColor: "#1a1a1a", padding: 18, borderRadius: 20, alignItems: "center", marginTop: 48 }}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Close</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        <View style={{ marginTop: 22 }}>
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>
            Upcoming Events
          </Text>
          {events.length > 0 ? (
            events.slice(0, 3).map((event, index) => (
              <View
                key={event.id || `event-${index}`}
                style={{
                  backgroundColor: "#161618",
                  borderRadius: 20,
                  padding: 12,
                  marginTop: 10,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                  {event.title || "Run Event"}
                </Text>
                <Text style={{ color: "#888", marginTop: 4, fontSize: 12 }}>
                  {formatCalendarDate(event.created_at)}
                </Text>
              </View>
            ))
          ) : (
            <View
              style={{
                backgroundColor: "#1a1a1a",
                borderRadius: 14,
                padding: 14,
                marginTop: 10,
              }}
            >
              <Text style={{ color: "#888" }}>No events yet.</Text>
            </View>
          )}
        </View>

        <View
          style={{
            marginTop: 24,
            backgroundColor: "#161618",
            borderRadius: 28,
            padding: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.2,
            shadowRadius: 10,
            elevation: 4,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 20, fontWeight: "700" }}>
            User Data
          </Text>

          <View style={{ marginTop: 12 }}>
            {userFields.length > 0 ? (
              userFields.map(([key, value]) => (
                <View
                  key={key}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: "#232323",
                  }}
                >
                  <Text style={{ color: "#888", fontSize: 13 }}>
                    {formatFieldLabel(key)}
                  </Text>
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 13,
                      textAlign: "right",
                      maxWidth: "60%",
                    }}
                    numberOfLines={1}
                  >
                    {String(value)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={{ color: "#888", fontSize: 14 }}>
                No profile data available.
              </Text>
            )}
          </View>
        </View>

        {/* ── LOGOUT BUTTON ── */}
        <TouchableOpacity
          onPress={() => {
            const { useUserStore } = require("@/store/userStore");
            const { router } = require("expo-router");
            useUserStore.getState().setOnboarded(false);
            router.push("/welcome");
          }}
          style={{
            backgroundColor: "#2a1515",
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
            marginTop: 32,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: "rgba(255, 69, 58, 0.3)",
          }}
        >
          <Text style={{ color: "#ff453a", fontWeight: "800", fontSize: 14, letterSpacing: 0.5 }}>
            LOG OUT
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}
