import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Switch, TextInput, Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import {
  Users, Flame, Zap, Trophy, Route, Target,
  Plus, LogIn, Share2, Heart, MessageCircle,
  TrendingUp, X, MapPin
} from "lucide-react-native";
import { useSettingsStore } from "@/utils/settingsStore";
import { StatusBar } from "expo-status-bar";
import { hapticSelection } from "@/services/haptics";

// ── MOCK DATA ─────────────────────────────────────────────────────────────────

const CLUB = {
  name: "GANG",
  members: 124,
  totalKm: 18742,
  inviteCode: "OUTHR-2024",
  weekGoalKm: 500,
  weekCurrentKm: 374,
};

const LEADERBOARD = [
  { id: "1", name: "You",             total_distance: 418,  total_steps: 42500, streak: 12, city: "London", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&auto=format", achievement: "Just 12 km behind the leader" },
  { id: "2", name: "Nicki Minaj",     total_distance: 319,  total_steps: 32000, streak: 21, city: "London", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&auto=format", achievement: "Furthest Run" },
  { id: "3", name: "Michel Jordan",   total_distance: 302,  total_steps: 31000, streak: 8,  city: "New York", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format", achievement: "Fastest This Week" },
  { id: "4", name: "Patrick Klüvert", total_distance: 112,  total_steps: 12500, streak: 5,  city: "London", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&auto=format", achievement: "Fastest 1k" },
  { id: "5", name: "Riyan Giggs",     total_distance: 49,   total_steps: 5000,  streak: 6,  city: "London", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&auto=format", achievement: "6 Week Streak" },
  { id: "6", name: "Romelu Lukaku",   total_distance: null, total_steps: 0,     streak: 0,  city: "London", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&auto=format", achievement: "Haven't Run Yet" },
];

const FEED = [
  { id: "f1", user: "Nicki Minaj",    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&auto=format", time: "2h ago",    distance: 14.2, pace: "5:12", caption: "Morning grind never stops 🔥",            likes: 18, comments: 4,  liked: false },
  { id: "f2", user: "Michel Jordan",  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format", time: "5h ago",    distance: 8.9,  pace: "4:48", caption: "Trail run with the boys, can't beat it.", likes: 31, comments: 7,  liked: true  },
  { id: "f3", user: "You",            avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&auto=format", time: "Yesterday", distance: 21.1, pace: "5:30", caption: "Half marathon down! 💪",                  likes: 42, comments: 12, liked: false },
  { id: "f4", user: "Patrick Klüvert",avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&auto=format", time: "2d ago",    distance: 5.0,  pace: "6:01", caption: "Back at it after the break.",              likes: 9,  comments: 2,  liked: false },
];

const CHALLENGES = [
  { id: "c1", title: "500 KM Club Week",        icon: Route,      color: "#00ff7f", current: 374, goal: 500,  unit: "KM",   participants: 18, daysLeft: 3,  joined: true  },
  { id: "c2", title: "30-Day Streak",           icon: Flame,      color: "#FF6B00", current: 12,  goal: 30,   unit: "days", participants: 42, daysLeft: 18, joined: true  },
  { id: "c3", title: "Speed Week — Sub 5 Pace", icon: Zap,        color: "#00BFFF", current: 2,   goal: 5,    unit: "runs", participants: 7,  daysLeft: 5,  joined: false },
  { id: "c4", title: "10,000 Steps Daily",      icon: Target,     color: "#AF52DE", current: 5,   goal: 7,    unit: "days", participants: 29, daysLeft: 2,  joined: false },
  { id: "c5", title: "Elevation King",          icon: TrendingUp, color: "#FFD700", current: 840, goal: 2000, unit: "m",    participants: 11, daysLeft: 10, joined: true  },
];

const MILESTONES = [
  { id: "m1", text: "Club has run 18,742 KM total!", icon: Trophy, color: "#FFD700" },
  { id: "m2", text: "You're on a 12-day streak 🔥",  icon: Flame,  color: "#FF6B00" },
  { id: "m3", text: "124 members this month!",        icon: Users,  color: "#00ff7f" },
];

const RANK_COLORS = { 1: "#FFD700", 2: "#C0C0C0", 3: "#CD7F32" };
const TABS = ["Leaderboard", "Feed", "Challenges", "Stats"];

// ── HELPERS ───────────────────────────────────────────────────────────────────

function ProgressBar({ current, goal, color, height = 6 }) {
  const pct = Math.min(current / goal, 1);
  return (
    <View style={{ height, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: height / 2, overflow: "hidden" }}>
      <View style={{ width: `${pct * 100}%`, height, backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

// ── SCREEN ────────────────────────────────────────────────────────────────────

export default function ClubScreen() {
  const insets = useSafeAreaInsets();
  const { showSteps, toggleMetric } = useSettingsStore();

  const [activeTab, setActiveTab] = useState("Leaderboard");
  const [filterPeriod, setFilterPeriod] = useState("Month");
  const [feed, setFeed] = useState(FEED);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [streakSort, setStreakSort] = useState(false);
  const [cityFilter, setCityFilter] = useState(false);

  const filtered = cityFilter 
    ? LEADERBOARD.filter(f => f.city === "London")
    : LEADERBOARD;

  const sorted = streakSort
    ? [...filtered].sort((a, b) => b.streak - a.streak)
    : filtered;

  const validKm = sorted.filter(f => f.total_distance);
  const clubAvgKm = Math.round(validKm.reduce((s, f) => s + f.total_distance, 0) / validKm.length);
  const myKm = LEADERBOARD[0].total_distance;

  const toggleLike = (id) =>
    setFeed(prev => prev.map(item =>
      item.id === id ? { ...item, liked: !item.liked, likes: item.liked ? item.likes - 1 : item.likes + 1 } : item
    ));

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar style="light" />
      <View style={{ flex: 1, paddingTop: insets.top }}>

        {/* ── UNIFIED TOP HEADER ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 }}>
          
          {/* Title & Actions Row */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
            <View>
              <Text style={{ color: "#00ff7f", fontSize: 13, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase" }}>Your Club</Text>
              <Text style={{ color: "#fff", fontSize: 32, fontWeight: "800", letterSpacing: -1, marginTop: 4 }}>{CLUB.name}</Text>
            </View>
            
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {/* KM / Steps toggle */}
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#151515", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#222", marginRight: 12 }}>
                <Text style={{ color: showSteps ? "#444" : "#00ff7f", fontSize: 11, fontWeight: "700", marginRight: 2 }}>KM</Text>
                <Switch
                  value={showSteps}
                  onValueChange={toggleMetric}
                  trackColor={{ false: "#222", true: "#005c29" }}
                  thumbColor={showSteps ? "#00ff7f" : "#555"}
                  style={{ transform: [{ scaleX: 0.65 }, { scaleY: 0.65 }] }}
                />
                <Text style={{ color: showSteps ? "#00ff7f" : "#444", fontSize: 11, fontWeight: "700", marginLeft: 2 }}>Steps</Text>
              </View>

              <TouchableOpacity onPress={() => setShowJoinModal(true)} style={{ width: 40, height: 40, backgroundColor: "#151515", borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#222", marginRight: 8 }}>
                <LogIn color="#888" size={18} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowCreateModal(true)} style={{ width: 40, height: 40, backgroundColor: "rgba(0, 255, 127, 0.1)", borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(0, 255, 127, 0.3)" }}>
                <Plus color="#00ff7f" size={20} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Stats Row */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <View>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: -0.5 }}>{CLUB.members.toLocaleString()}</Text>
              <Text style={{ color: "#777", fontSize: 13, fontWeight: "500", marginTop: 2 }}>Members</Text>
            </View>
            <View style={{ width: 1, height: "70%", backgroundColor: "#222" }} />
            <View>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: -0.5 }}>{(CLUB.totalKm / 1000).toFixed(1)}k <Text style={{ fontSize: 13, color: "#888", fontWeight: "600" }}>KM</Text></Text>
              <Text style={{ color: "#777", fontSize: 13, fontWeight: "500", marginTop: 2 }}>Total Distance</Text>
            </View>
            <View style={{ width: 1, height: "70%", backgroundColor: "#222" }} />
            <View>
              <Text style={{ color: "#00ff7f", fontSize: 22, fontWeight: "800", letterSpacing: -0.5 }}>Top 12%</Text>
              <Text style={{ color: "#777", fontSize: 13, fontWeight: "500", marginTop: 2 }}>Global Rank</Text>
            </View>
          </View>

          {/* Navigation Tabs (No longer wrapped in ScrollView to match Apple cleanliness) */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderColor: "#222" }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={{
                    paddingBottom: 12,
                    borderBottomWidth: isActive ? 2 : 0,
                    borderColor: "#00ff7f",
                  }}>
                  <Text style={{ 
                    color: isActive ? "#fff" : "#777", 
                    fontWeight: isActive ? "800" : "600", 
                    fontSize: 14 
                  }}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* ── TAB CONTENT ── */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

          {/* ════ LEADERBOARD ════ */}
          {activeTab === "Leaderboard" && (
            <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
              {/* Filters Row (Scrollable to save space) */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 24 }}>
                <View style={{ flexDirection: "row", alignItems: "center", paddingBottom: 4 }}>
                  {["Week", "Month", "All-time"].map((p, i) => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setFilterPeriod(p)}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: filterPeriod === p ? "#00ff7f22" : "rgba(255,255,255,0.03)",
                        borderWidth: 1,
                        borderColor: filterPeriod === p ? "#00ff7f" : "transparent",
                        marginRight: 8,
                      }}>
                      <Text style={{ color: filterPeriod === p ? "#00ff7f" : "#888", fontSize: 13, fontWeight: "600" }}>{p}</Text>
                    </TouchableOpacity>
                  ))}

                  <View style={{ width: 1, height: 20, backgroundColor: "#333", marginHorizontal: 8 }} />

                  <TouchableOpacity
                    onPress={() => setStreakSort(!streakSort)}
                    style={{
                      flexDirection: "row", alignItems: "center",
                      paddingHorizontal: 16, paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: streakSort ? "rgba(255,107,0,0.15)" : "rgba(255,255,255,0.03)",
                      borderWidth: 1,
                      borderColor: streakSort ? "#FF6B00" : "transparent",
                      marginRight: 8
                    }}>
                    <Flame color={streakSort ? "#FF6B00" : "#888"} size={14} style={{ marginRight: 6 }} />
                    <Text style={{ color: streakSort ? "#FF6B00" : "#888", fontSize: 13, fontWeight: "600" }}>Streak</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setCityFilter(!cityFilter)}
                    style={{
                      flexDirection: "row", alignItems: "center",
                      paddingHorizontal: 16, paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: cityFilter ? "rgba(0,191,255,0.15)" : "rgba(255,255,255,0.03)",
                      borderWidth: 1,
                      borderColor: cityFilter ? "#00BFFF" : "transparent",
                      marginRight: 16
                    }}>
                    <MapPin color={cityFilter ? "#00BFFF" : "#888"} size={14} style={{ marginRight: 6 }} />
                    <Text style={{ color: cityFilter ? "#00BFFF" : "#888", fontSize: 13, fontWeight: "600" }}>London</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              {/* Avatar row */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 16 }}>
                <View style={{ flexDirection: "row", paddingBottom: 4 }}>
                  {sorted.map((f, i) => {
                    const isUser = f.name === "You";
                    const rc = RANK_COLORS[i + 1];
                    return (
                      <View key={`av-${f.id}`} style={{ alignItems: "center", marginRight: 18 }}>
                        <View style={{ width: 58, height: 58, borderRadius: 29, borderWidth: 2.5, borderColor: isUser ? "#00ff7f" : (rc || "#2a2a2a"), overflow: "hidden" }}>
                          <Image source={{ uri: f.avatar }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                        </View>
                        <View style={{ marginTop: 4, backgroundColor: isUser ? "#00ff7f" : (rc || "#2a2a2a"), paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                          <Text style={{ color: rc || isUser ? "#000" : "#888", fontSize: 10, fontWeight: "800" }}>{i + 1}</Text>
                        </View>
                        <Text style={{ color: isUser ? "#00ff7f" : "#888", fontSize: 11, fontWeight: "600", marginTop: 4 }}>
                          {isUser ? "You" : f.name.split(" ")[0]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>

              {/* You vs Club Average Card */}
              <View style={{
                backgroundColor: "#161618",
                borderRadius: 20,
                padding: 20,
                marginBottom: 32,
                borderWidth: 1,
                borderColor: "#1e1e1e",
              }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                  <Text style={{ color: "#777", fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" }}>You vs Club Average</Text>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
                  <Text style={{ color: "#00ff7f", fontSize: 18, fontWeight: "700" }}>
                    You — <Text style={{ fontSize: 24, fontWeight: "800" }}>{myKm} {showSteps ? "Steps" : "KM"}</Text>
                  </Text>
                  <Text style={{ color: "#555", fontSize: 13, fontWeight: "600", paddingBottom: 3 }}>
                    Avg — {clubAvgKm} {showSteps ? "Steps" : "KM"}
                  </Text>
                </View>

                <ProgressBar current={myKm} goal={clubAvgKm * 1.5} color="#00ff7f" height={10} />

                <Text style={{ color: "#00ff7f", fontSize: 13, fontWeight: "600", marginTop: 12 }}>
                  +{myKm - clubAvgKm} {showSteps ? "Steps" : "KM"} above average 💪
                </Text>
              </View>

              {/* Rankings Title */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: "#777", fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" }}>RANKINGS · {filterPeriod.toUpperCase()}</Text>
              </View>

              {/* Rankings List */}
              <View style={{ paddingBottom: 40 }}>
                {sorted.map((f, index) => {
                  const rank = index + 1;
                  const rc = RANK_COLORS[rank];
                  const isUser = f.name === "You";
                  const stat = showSteps
                    ? (f.total_steps > 0 ? f.total_steps.toLocaleString() : "----")
                    : (f.total_distance ? `${f.total_distance}` : "----");
                  const unit = showSteps ? "steps" : "KM";
                  return (
                    <TouchableOpacity
                      key={f.id}
                      activeOpacity={0.8}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: isUser ? "rgba(0, 255, 127, 0.05)" : "transparent",
                        borderRadius: 20,
                        paddingVertical: 18,
                        paddingHorizontal: 16,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: isUser ? "rgba(0, 255, 127, 0.2)" : "rgba(255, 255, 255, 0.05)",
                      }}>
                      <Text style={{ color: rc || "#555", fontSize: 16, fontWeight: "800", width: 28, textAlign: "left" }}>{rank}</Text>
                      
                      <View style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: isUser ? "#00ff7f" : (rc || "#2a2a2a"), marginRight: 16, overflow: "hidden" }}>
                        <Image source={{ uri: f.avatar }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                          <Text style={{ color: isUser ? "#00ff7f" : "#fff", fontSize: 16, fontWeight: "700", letterSpacing: -0.2 }}>{isUser ? "You" : f.name}</Text>
                          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                            <Text style={{ color: isUser ? "#00ff7f" : "#fff", fontSize: 20, fontWeight: "800", letterSpacing: -0.5 }}>{stat}</Text>
                            {stat !== "----" && <Text style={{ color: "#666", fontSize: 12, marginLeft: 4, fontWeight: "600" }}>{unit}</Text>}
                          </View>
                        </View>

                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: rc || "#444", marginRight: 8 }} />
                            <Text style={{ color: "#888", fontSize: 13, fontWeight: "500" }}>{f.achievement}</Text>
                          </View>
                          {f.streak > 0 && (
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                              <Flame color="#FF6B00" size={12} style={{ marginRight: 4 }} opacity={0.8} />
                              <Text style={{ color: "#777", fontSize: 12, fontWeight: "600" }}>{f.streak}d</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ════ FEED ════ */}
          {activeTab === "Feed" && (
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              {feed.map((item, i) => (
                <View key={item.id} style={{ backgroundColor: "#161618", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#1a1a1a", marginBottom: i < feed.length - 1 ? 12 : 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                    <View style={{ width: 42, height: 42, borderRadius: 21, overflow: "hidden", marginRight: 12, borderWidth: 1.5, borderColor: item.user === "You" ? "#00ff7f" : "#2a2a2a" }}>
                      <Image source={{ uri: item.avatar }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: item.user === "You" ? "#00ff7f" : "#fff", fontWeight: "700", fontSize: 14 }}>{item.user}</Text>
                      <Text style={{ color: "#444", fontSize: 12, marginTop: 2 }}>{item.time}</Text>
                    </View>
                    <Share2 color="#333" size={16} />
                  </View>
                  <View style={{ flexDirection: "row", backgroundColor: "#0d0d0d", borderRadius: 12, padding: 14, marginBottom: 12 }}>
                    <View style={{ flex: 1, alignItems: "center" }}>
                      <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>{item.distance}</Text>
                      <Text style={{ color: "#555", fontSize: 11, marginTop: 2 }}>KM</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: "#1e1e1e" }} />
                    <View style={{ flex: 1, alignItems: "center" }}>
                      <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>{item.pace}</Text>
                      <Text style={{ color: "#555", fontSize: 11, marginTop: 2 }}>/km pace</Text>
                    </View>
                  </View>
                  <Text style={{ color: "#999", fontSize: 14, lineHeight: 20, marginBottom: 14 }}>{item.caption}</Text>
                  <View style={{ flexDirection: "row" }}>
                    <TouchableOpacity onPress={() => toggleLike(item.id)} style={{ flexDirection: "row", alignItems: "center", marginRight: 22 }}>
                      <Heart color={item.liked ? "#ff4d4d" : "#444"} size={18} fill={item.liked ? "#ff4d4d" : "transparent"} style={{ marginRight: 6 }} />
                      <Text style={{ color: "#555", fontSize: 13 }}>{item.likes}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ flexDirection: "row", alignItems: "center" }}>
                      <MessageCircle color="#444" size={18} style={{ marginRight: 6 }} />
                      <Text style={{ color: "#555", fontSize: 13 }}>{item.comments}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ════ CHALLENGES ════ */}
          {activeTab === "Challenges" && (
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              {CHALLENGES.map((c, i) => {
                const pct = Math.min(c.current / c.goal, 1);
                return (
                  <View key={c.id} style={{ backgroundColor: "#161618", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: c.joined ? `${c.color}22` : "#1a1a1a", marginBottom: i < CHALLENGES.length - 1 ? 12 : 0 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                      <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: `${c.color}18`, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                        <c.icon color={c.color} size={20} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>{c.title}</Text>
                        <Text style={{ color: "#555", fontSize: 12, marginTop: 2 }}>{c.participants} runners · {c.daysLeft}d left</Text>
                      </View>
                      <TouchableOpacity style={{ backgroundColor: c.joined ? "#1e1e1e" : `${c.color}22`, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, borderWidth: 1, borderColor: c.joined ? "#2a2a2a" : c.color }}>
                        <Text style={{ color: c.joined ? "#555" : c.color, fontWeight: "700", fontSize: 12 }}>{c.joined ? "Joined ✓" : "Join"}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text style={{ color: "#555", fontSize: 12 }}>{c.current} {c.unit}</Text>
                      <Text style={{ color: c.color, fontSize: 12, fontWeight: "700" }}>{Math.round(pct * 100)}%</Text>
                    </View>
                    <ProgressBar current={c.current} goal={c.goal} color={c.color} height={8} />
                    <Text style={{ color: "#333", fontSize: 11, marginTop: 6 }}>Goal: {c.goal} {c.unit}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* ════ STATS ════ */}
          {activeTab === "Stats" && (
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              {/* Weekly club goal */}
              <View style={{ backgroundColor: "#161618", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#1a1a1a", marginBottom: 16 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Weekly Club Goal</Text>
                  <Text style={{ color: "#00ff7f", fontWeight: "800", fontSize: 22 }}>
                    {CLUB.weekCurrentKm} <Text style={{ color: "#555", fontSize: 13 }}>/ {CLUB.weekGoalKm} KM</Text>
                  </Text>
                </View>
                <ProgressBar current={CLUB.weekCurrentKm} goal={CLUB.weekGoalKm} color="#00ff7f" height={10} />
                <Text style={{ color: "#555", fontSize: 12, marginTop: 8 }}>{CLUB.weekGoalKm - CLUB.weekCurrentKm} KM to go · 3 days left</Text>
              </View>

              {/* Streak board */}
              <Text style={{ color: "#444", fontSize: 11, fontWeight: "600", letterSpacing: 1, marginBottom: 12 }}>STREAK LEADERBOARD</Text>
              {[...LEADERBOARD].sort((a, b) => b.streak - a.streak).map((f, i) => (
                <View key={`st-${f.id}`} style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                  <Text style={{ color: RANK_COLORS[i + 1] || "#555", fontWeight: "800", fontSize: 14, width: 20, textAlign: "center", marginRight: 12 }}>{i + 1}</Text>
                  <View style={{ width: 38, height: 38, borderRadius: 19, overflow: "hidden", borderWidth: 1.5, borderColor: f.name === "You" ? "#00ff7f" : "#2a2a2a", marginRight: 12 }}>
                    <Image source={{ uri: f.avatar }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                  </View>
                  <Text style={{ color: f.name === "You" ? "#00ff7f" : "#fff", flex: 1, fontWeight: "600", fontSize: 14 }}>{f.name}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Flame color="#FF6B00" size={14} style={{ marginRight: 4 }} />
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{f.streak}</Text>
                    <Text style={{ color: "#555", fontSize: 12, marginLeft: 3 }}>days</Text>
                  </View>
                </View>
              ))}

              {/* Contributions */}
              <Text style={{ color: "#444", fontSize: 11, fontWeight: "600", letterSpacing: 1, marginBottom: 12, marginTop: 8 }}>CONTRIBUTION TO CLUB TOTAL</Text>
              {LEADERBOARD.map(f => {
                const contribution = f.total_distance ? ((f.total_distance / CLUB.totalKm) * 100).toFixed(1) : "0.0";
                return (
                  <View key={`cb-${f.id}`} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                      <Text style={{ color: f.name === "You" ? "#00ff7f" : "#aaa", fontSize: 13, fontWeight: "600" }}>{f.name}</Text>
                      <Text style={{ color: "#555", fontSize: 12 }}>{f.total_distance || 0} KM · {contribution}%</Text>
                    </View>
                    <ProgressBar current={f.total_distance || 0} goal={LEADERBOARD[0].total_distance} color={f.name === "You" ? "#00ff7f" : "#2a2a2a"} height={5} />
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* ── JOIN MODAL ── */}
        <Modal visible={showJoinModal} transparent animationType="slide">
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" }} onPress={() => setShowJoinModal(false)}>
            <Pressable style={{ backgroundColor: "#161618", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>Join a Club</Text>
                <TouchableOpacity onPress={() => setShowJoinModal(false)}><X color="#555" size={22} /></TouchableOpacity>
              </View>
              <Text style={{ color: "#555", fontSize: 13, marginBottom: 14 }}>Enter the invite code shared by a friend.</Text>
              <TextInput
                value={inviteInput}
                onChangeText={setInviteInput}
                placeholder="e.g. OUTHR-2024"
                placeholderTextColor="#333"
                style={{ backgroundColor: "#1a1a1a", borderRadius: 14, padding: 14, color: "#fff", fontSize: 16, fontWeight: "600", borderWidth: 1, borderColor: "#2a2a2a", marginBottom: 16, letterSpacing: 2 }}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={{ backgroundColor: "#00ff7f", padding: 16, borderRadius: 14, alignItems: "center" }}>
                <Text style={{ color: "#000", fontWeight: "800", fontSize: 16 }}>Join Club</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── CREATE MODAL ── */}
        <Modal visible={showCreateModal} transparent animationType="slide">
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" }} onPress={() => setShowCreateModal(false)}>
            <Pressable style={{ backgroundColor: "#161618", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>Create a Club</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}><X color="#555" size={22} /></TouchableOpacity>
              </View>
              <Text style={{ color: "#555", fontSize: 13, marginBottom: 14 }}>Give your club a name to get started (max 25 chars).</Text>
              <TextInput
                maxLength={25}
                placeholder="Club name..."
                placeholderTextColor="#333"
                style={{ backgroundColor: "#1a1a1a", borderRadius: 14, padding: 14, color: "#fff", fontSize: 16, borderWidth: 1, borderColor: "#2a2a2a", marginBottom: 14 }}
              />
              <View style={{ backgroundColor: "#0d1a11", borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#00ff7f22" }}>
                <Text style={{ color: "#555", fontSize: 12, marginBottom: 4 }}>Your invite code</Text>
                <Text style={{ color: "#00ff7f", fontWeight: "800", fontSize: 20, letterSpacing: 3 }}>{CLUB.inviteCode}</Text>
              </View>
              <TouchableOpacity style={{ backgroundColor: "#00ff7f", padding: 16, borderRadius: 14, alignItems: "center" }}>
                <Text style={{ color: "#000", fontWeight: "800", fontSize: 16 }}>Create Club</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

      </View>
    </View>
  );
}
