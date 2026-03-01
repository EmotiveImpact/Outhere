import { useEffect, useRef, useState } from "react";
import { Animated, Easing, View, Text, ScrollView, TouchableOpacity, Switch, TextInput, Modal, Pressable, Dimensions, Alert, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import {
  Users, Flame, Zap, Trophy, Route, Target,
  Plus, LogIn, Share2, Heart, MessageCircle, MessageSquare,
  TrendingUp, X, MapPin, Send, Crown
} from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import { useSettingsStore } from "@/utils/settingsStore";
import { useUserStore } from "@/store/userStore";
import { useClubStore, DEFAULT_CLUB_AVATAR } from "@/store/useClubStore";
import { groupsAPI, membershipAPI } from "@/services/api";
import { StatusBar } from "expo-status-bar";
import { hapticSelection, hapticSuccess } from "@/services/haptics";
import Shimmer from "@/components/Shimmer";


// ── MOCK DATA ─────────────────────────────────────────────────────────────────

const CLUB = {
  name: "SQUAD",
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

const CHALLENGES = [
  { id: "c1", title: "500 KM Club Week",        icon: Route,      color: "#00ff7f", current: 374, goal: 500,  unit: "KM",   participants: 18, daysLeft: 3,  joined: true  },
  { id: "c2", title: "30-Day Streak",           icon: Flame,      color: "#00ff7f", current: 12,  goal: 30,   unit: "days", participants: 42, daysLeft: 18, joined: true  },
  { id: "c3", title: "Speed Week — Sub 5 Pace", icon: Zap,        color: "#00ff7f", current: 2,   goal: 5,    unit: "runs", participants: 7,  daysLeft: 5,  joined: false },
  { id: "c4", title: "10,000 Steps Daily",      icon: Target,     color: "#00ff7f", current: 5,   goal: 7,    unit: "days", participants: 29, daysLeft: 2,  joined: false },
  { id: "c5", title: "Elevation King",          icon: TrendingUp, color: "#00ff7f", current: 840, goal: 2000, unit: "m",    participants: 11, daysLeft: 10, joined: true  },
];

const MILESTONES = [
  { id: "m1", text: "Club has run 18,742 KM total!", icon: Trophy, color: "#00ff7f" },
  { id: "m2", text: "You're on a 12-day streak",  icon: Flame,  color: "#00ff7f" },
  { id: "m3", text: "124 members this month!",        icon: Users,  color: "#00ff7f" },
];

const RANK_COLORS = { 1: "#FFD700", 2: "#C0C0C0", 3: "#CD7F32" };
const TABS = ["Leaderboard", "Feed", "Chat", "Challenges", "Stats"];

// ── HELPERS ───────────────────────────────────────────────────────────────────

function ProgressBar({ current, goal, color, height = 6 }) {
  const pct = Math.min(current / goal, 1);
  return (
    <View style={{ height, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: height / 2, overflow: "hidden" }}>
      <View style={{ width: `${pct * 100}%`, height, backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

function HeartBurst({ trigger }) {
  const particleCount = 8;
  const particles = useRef(
    Array.from({ length: particleCount }, (_, index) => ({
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      scale: new Animated.Value(0.2),
      opacity: new Animated.Value(0),
      angle: (index / particleCount) * Math.PI * 2,
      distance: 14 + (index % 2) * 8,
    })),
  ).current;

  useEffect(() => {
    if (!trigger) return;

    particles.forEach((particle) => {
      particle.translateX.setValue(0);
      particle.translateY.setValue(0);
      particle.scale.setValue(0.2);
      particle.opacity.setValue(1);
    });

    const burstAnimation = Animated.parallel(
      particles.flatMap((particle, index) => [
        Animated.timing(particle.translateX, {
          toValue: Math.cos(particle.angle) * particle.distance,
          duration: 380,
          delay: index * 10,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(particle.translateY, {
          toValue: Math.sin(particle.angle) * particle.distance,
          duration: 380,
          delay: index * 10,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(particle.scale, {
          toValue: 1,
          duration: 250,
          delay: index * 10,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: 380,
          delay: index * 10,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    burstAnimation.start();
  }, [particles, trigger]);

  if (!trigger) return null;

  return (
    <View pointerEvents="none" style={{ position: "absolute", width: 42, height: 42, alignItems: "center", justifyContent: "center" }}>
      {particles.map((particle, index) => (
        <Animated.Text
          key={index}
          style={{
            position: "absolute",
            color: "#ff4d6d",
            fontSize: index % 2 === 0 ? 10 : 8,
            opacity: particle.opacity,
            transform: [
              { translateX: particle.translateX },
              { translateY: particle.translateY },
              { scale: particle.scale },
            ],
          }}
        >
          ♥
        </Animated.Text>
      ))}
    </View>
  );
}

function HapticTouchable({ onPressIn, onPress, disabled, ...props }) {
  const hasAction =
    typeof onPress === "function" || typeof props.onLongPress === "function";

  const handlePressIn = (event) => {
    if (!disabled && hasAction) {
      hapticSelection();
    }
    onPressIn?.(event);
  };

  return (
    <TouchableOpacity
      {...props}
      disabled={disabled}
      onPress={onPress}
      onPressIn={handlePressIn}
    />
  );
}

// ── SCREEN ────────────────────────────────────────────────────────────────────

export default function ClubScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { showSteps, toggleMetric } = useSettingsStore();
  const squadName = useUserStore(state => state.squadName);
  const setSquadName = useUserStore(state => state.setSquadName);
  const deviceId = useUserStore(state => state.deviceId);
  const feed = useClubStore((state) => state.feed);
  const addPost = useClubStore((state) => state.addPost);
  const toggleFeedLike = useClubStore((state) => state.toggleLike);
  const addFeedComment = useClubStore((state) => state.addComment);

  const [activeTab, setActiveTab] = useState("Leaderboard");
  const [filterPeriod, setFilterPeriod] = useState("Month");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [activePost, setActivePost] = useState(null);
  const [newPostText, setNewPostText] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [createClubName, setCreateClubName] = useState("");
  const [clubMeta, setClubMeta] = useState(CLUB);
  const [inviteCodePreview, setInviteCodePreview] = useState(CLUB.inviteCode);
  const [streakSort, setStreakSort] = useState(false);
  const [cityFilter, setCityFilter] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [burstTriggers, setBurstTriggers] = useState({});
  const [challenges, setChallenges] = useState(CHALLENGES);
  const [commentsByPost, setCommentsByPost] = useState({});
  const [membershipTier, setMembershipTier] = useState("free");
  const [userGroups, setUserGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [groupNameInput, setGroupNameInput] = useState("");
  const [groupTaglineInput, setGroupTaglineInput] = useState("");
  const [groupDescriptionInput, setGroupDescriptionInput] = useState("");
  const [groupPrivacy, setGroupPrivacy] = useState("public");
  const [groupLogoInput, setGroupLogoInput] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    if (typeof params?.tab === "string" && TABS.includes(params.tab)) {
      setActiveTab(params.tab);
    }
  }, [params?.tab]);

  useEffect(() => {
    setCommentsByPost((prev) => {
      let changed = false;
      const next = { ...prev };
      feed.forEach((item) => {
        if (!next[item.id]) {
          const hasExistingComments = Number(item.comments || 0) > 0;
          next[item.id] = hasExistingComments
            ? [
                {
                  id: `${item.id}-seed`,
                  user: "Squad Mate",
                  text: "Solid work. Keep it going.",
                  time: item.time || "Recently",
                },
              ]
            : [];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [feed]);

  const ownedCrewCount = userGroups.filter((group) => group?.creator_device_id === deviceId).length;
  const ownershipLimit = membershipTier === "black" ? 3 : membershipTier === "pro" ? 1 : 0;
  const canCreateCrew = ownershipLimit > 0;
  const myRole = activeGroup?.roles?.[deviceId]
    || (activeGroup?.creator_device_id === deviceId ? "owner" : "member");
  const isOwner = myRole === "owner";
  const canManageCrew = myRole === "owner" || myRole === "mod";

  const refreshCrewData = async () => {
    if (!deviceId) return;

    try {
      const [membership, groups] = await Promise.all([
        membershipAPI.getStatus(deviceId).catch(() => null),
        groupsAPI.getUserGroups(deviceId).catch(() => []),
      ]);

      const safeTier = String(membership?.membership_tier || "free").toLowerCase();
      setMembershipTier(["pro", "black"].includes(safeTier) ? safeTier : "free");

      const safeGroups = Array.isArray(groups) ? groups : [];
      setUserGroups(safeGroups);

      if (safeGroups.length > 0) {
        const preferredGroup =
          safeGroups.find((group) => group?.name === squadName)
          || safeGroups.find((group) => group?.creator_device_id === deviceId)
          || safeGroups[0];
        setActiveGroup(preferredGroup);
      } else {
        setActiveGroup(null);
      }
    } catch (error) {
      console.log("Failed to refresh crew data:", error);
    }
  };

  useEffect(() => {
    refreshCrewData();
  }, [deviceId]);

  useEffect(() => {
    if (!activeGroup) return;

    setClubMeta((prev) => ({
      ...prev,
      name: activeGroup.name || prev.name,
      inviteCode: activeGroup.invite_code || prev.inviteCode,
      members: Array.isArray(activeGroup.members) ? activeGroup.members.length : prev.members,
    }));
    setInviteCodePreview(activeGroup.invite_code || CLUB.inviteCode);
    setGroupNameInput(activeGroup.name || "");
    setGroupTaglineInput(activeGroup.tagline || "");
    setGroupDescriptionInput(activeGroup.description || "");
    setGroupPrivacy(activeGroup.privacy || "public");
    setGroupLogoInput(activeGroup.logo_url || "");

    if (activeGroup.name && activeGroup.name !== squadName) {
      setSquadName(activeGroup.name);
    }
  }, [activeGroup]);


  // Mock loading trigger for shimmer demo
  const triggerLoading = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };


  const filtered = cityFilter 
    ? LEADERBOARD.filter(f => f.city === "London")
    : LEADERBOARD;

  const sorted = streakSort
    ? [...filtered].sort((a, b) => b.streak - a.streak)
    : filtered;

  const validKm = sorted.filter(f => f.total_distance);
  const clubAvgKm = Math.round(validKm.reduce((s, f) => s + f.total_distance, 0) / validKm.length);
  const myKm = LEADERBOARD[0].total_distance;

  const toggleLike = (id) => {
    if (!id) return;
    const target = feed.find((item) => item?.id === id);
    if (target && !Boolean(target.liked)) {
      setBurstTriggers((prev) => ({
        ...prev,
        [id]: (prev[id] || 0) + 1,
      }));
    }

    toggleFeedLike(id);
  };

  const handleCreatePost = () => {
    if (!newPostText.trim()) return;
    addPost({
      user: "You",
      avatar: DEFAULT_CLUB_AVATAR,
      distance: (Math.random() * 10 + 2).toFixed(1),
      pace: (Math.random() * 2 + 4).toFixed(2),
      caption: newPostText.trim(),
    });
    setNewPostText("");
    setShowPostModal(false);
    hapticSuccess();
  };

  const generateInviteCode = (name) => {
    const head = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 5) || "CLUB";
    const tail = Math.floor(1000 + Math.random() * 9000);
    return `${head}-${tail}`;
  };

  const handleJoinClub = async () => {
    if (!deviceId) {
      Alert.alert("Unavailable", "Device identity is not ready yet.");
      return;
    }

    const code = inviteInput.trim().toUpperCase();
    if (!code) {
      Alert.alert("Invite Code Required", "Enter an invite code to join a club.");
      return;
    }

    try {
      const response = await groupsAPI.joinByCode(code, deviceId);
      const joinedGroup = response?.group || null;
      if (joinedGroup?.name) {
        await setSquadName(joinedGroup.name);
      }
      if (joinedGroup) {
        setActiveGroup(joinedGroup);
      }
      await refreshCrewData();
      setInviteInput("");
      setShowJoinModal(false);
      hapticSuccess();
      Alert.alert("Joined Club", `You joined ${joinedGroup?.name || "your crew"}.`);
    } catch (error) {
      const detail = error?.data?.detail;
      Alert.alert("Join Failed", detail || "Unable to join this club right now.");
    }
  };

  const handleCreateClub = async () => {
    if (!deviceId) {
      Alert.alert("Unavailable", "Device identity is not ready yet.");
      return;
    }

    if (!canCreateCrew) {
      Alert.alert("Pro or Black Required", "Upgrade to Pro or Black to create a crew.");
      return;
    }

    if (ownedCrewCount >= ownershipLimit) {
      Alert.alert("Ownership Limit Reached", `Your ${membershipTier.toUpperCase()} tier can own up to ${ownershipLimit} crew${ownershipLimit > 1 ? "s" : ""}.`);
      return;
    }

    const name = createClubName.trim();
    if (name.length < 3) {
      Alert.alert("Invalid Club Name", "Club name must be at least 3 characters.");
      return;
    }

    try {
      const createdGroup = await groupsAPI.create({
        name,
        description: "",
        creator_device_id: deviceId,
      });
      if (createdGroup?.name) {
        await setSquadName(createdGroup.name);
      }
      setActiveGroup(createdGroup || null);
      await refreshCrewData();
      setCreateClubName("");
      setShowCreateModal(false);
      hapticSuccess();
      Alert.alert("Club Created", `Invite code: ${createdGroup?.invite_code || generateInviteCode(name)}`);
    } catch (error) {
      const detail = error?.data?.detail;
      Alert.alert("Create Failed", detail || "Unable to create club right now.");
    }
  };

  const handleSaveCrewSettings = async () => {
    if (!activeGroup?.id || !deviceId) return;
    if (!canManageCrew) {
      Alert.alert("Admin Only", "Only crew owners or mods can update crew settings.");
      return;
    }

    setIsSavingSettings(true);
    try {
      const updatedGroup = await groupsAPI.updateSettings(activeGroup.id, {
        device_id: deviceId,
        name: groupNameInput,
        tagline: groupTaglineInput,
        description: groupDescriptionInput,
        privacy: groupPrivacy,
      });
      setActiveGroup(updatedGroup || activeGroup);
      if (updatedGroup?.name) {
        await setSquadName(updatedGroup.name);
      }
      await refreshCrewData();
      hapticSuccess();
      Alert.alert("Crew Updated", "Crew settings were saved.");
    } catch (error) {
      const detail = error?.data?.detail;
      Alert.alert("Update Failed", detail || "Unable to update crew settings right now.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleUploadLogo = async () => {
    if (!activeGroup?.id || !deviceId) return;
    if (!isOwner) {
      Alert.alert("Owner Only", "Only the crew owner can upload logos.");
      return;
    }

    const logoUrl = groupLogoInput.trim();
    if (!logoUrl) {
      Alert.alert("Logo Required", "Add a PNG or JPG logo URL first.");
      return;
    }

    const lower = logoUrl.toLowerCase();
    const mimeType = lower.endsWith(".png") ? "image/png" : "image/jpeg";

    setIsUploadingLogo(true);
    try {
      const response = await groupsAPI.uploadLogo(activeGroup.id, {
        device_id: deviceId,
        logo_url: logoUrl,
        mime_type: mimeType,
        width: 512,
        height: 512,
        size_bytes: 240000,
      });
      const updatedGroup = response?.group || activeGroup;
      setActiveGroup(updatedGroup);
      await refreshCrewData();
      hapticSuccess();
      Alert.alert("Logo Updated", "Crew logo uploaded.");
    } catch (error) {
      const detail = error?.data?.detail;
      Alert.alert("Upload Failed", detail || "Unable to upload logo right now.");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleToggleChallenge = (id) => {
    setChallenges((prev) =>
      prev.map((challenge) => {
        if (challenge.id !== id) return challenge;
        const joining = !challenge.joined;
        return {
          ...challenge,
          joined: joining,
          participants: Math.max(0, challenge.participants + (joining ? 1 : -1)),
        };
      }),
    );
    hapticSuccess();
  };

  const handleOpenComments = (post) => {
    setActivePost(post);
    setShowCommentsModal(true);
  };

  const handleAddComment = () => {
    const message = newCommentText.trim();
    if (!message || !activePost?.id) return;

    const nextComment = {
      id: `comment-${Date.now()}`,
      user: "You",
      text: message,
      time: "Just now",
    };

    setCommentsByPost((prev) => ({
      ...prev,
      [activePost.id]: [...(prev[activePost.id] || []), nextComment],
    }));
    setNewCommentText("");
    addFeedComment(activePost.id);
    setActivePost((prev) =>
      prev
        ? {
            ...prev,
            comments: (Number(prev.comments) || 0) + 1,
          }
        : prev,
    );
    hapticSuccess();
  };

  const handleSharePost = async (item) => {
    try {
      await Share.share({
        message: `${item.user}: ${item.caption} • ${item.distance} km • ${item.pace} pace`,
      });
    } catch {
      Alert.alert("Share Failed", "Unable to open share sheet right now.");
    }
  };

  const activeComments = activePost?.id ? commentsByPost[activePost.id] || [] : [];

  const [messages, setMessages] = useState([
    { id: "m1", user: "Nicki Minaj", text: "Who's ready for the run tonight?", time: "1:24 PM", isMe: false },
    { id: "m2", user: "Michel Jordan", text: "I'm in! Aiming for 10k today.", time: "1:26 PM", isMe: false },
    { id: "m3", user: "You", text: "Starting in 10 mins. See you there!", time: "1:30 PM", isMe: true },
  ]);
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    const msg = {
      id: `m${Date.now()}`,
      user: "You",
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true
    };
    setMessages([...messages, msg]);
    setNewMessage("");
    hapticSelection();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar style="light" />
      <View style={{ flex: 1, paddingTop: insets.top }}>

        {/* ── UNIFIED TOP HEADER ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 }}>
          
          {/* Title & Actions Row */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 1, marginRight: 12 }}>
              <View
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 18,
                  backgroundColor: "#151515",
                  borderWidth: 2,
                  borderColor: "rgba(0,255,127,0.45)",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  marginRight: 12,
                }}
              >
                {activeGroup?.logo_url ? (
                  <Image source={{ uri: activeGroup.logo_url }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                ) : (
                  <Text style={{ color: "#00ff7f", fontSize: 12, fontWeight: "800", letterSpacing: 1 }}>OUT</Text>
                )}
              </View>
              <View style={{ flexShrink: 1 }}>
                <Text style={{ color: "#00ff7f", fontSize: 13, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase" }}>Your Crew</Text>
                <Text style={{ color: "#fff", fontSize: 30, fontWeight: "800", letterSpacing: -1, marginTop: 4 }} numberOfLines={1}>
                  {activeGroup?.name || squadName}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                  <Crown color="#00ff7f" size={12} />
                  <Text style={{ color: "#8af6be", fontSize: 11, fontWeight: "700", marginLeft: 6, textTransform: "uppercase" }}>
                    {String(activeGroup?.tier_badge || "starter")}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <HapticTouchable onPress={() => setShowJoinModal(true)} style={{ width: 44, height: 44, backgroundColor: "#151515", borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#222", marginRight: 8 }}>
                <LogIn color="#00ff7f" size={20} />
              </HapticTouchable>
              <HapticTouchable onPress={() => setShowCreateModal(true)} style={{ width: 44, height: 44, backgroundColor: "rgba(0, 255, 127, 0.1)", borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(0, 255, 127, 0.3)" }}>
                <Plus color="#fff" size={24} />
              </HapticTouchable>
            </View>
          </View>

          {/* Quick Stats Row */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <View>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: -0.5 }}>{clubMeta.members.toLocaleString()}</Text>
              <Text style={{ color: "#777", fontSize: 13, fontWeight: "500", marginTop: 2 }}>Members</Text>
            </View>
            <View style={{ width: 1, height: "70%", backgroundColor: "#222" }} />
            <View>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: -0.5 }}>{(clubMeta.totalKm / 1000).toFixed(1)}k <Text style={{ fontSize: 13, color: "#888", fontWeight: "600" }}>KM</Text></Text>
              <Text style={{ color: "#777", fontSize: 13, fontWeight: "500", marginTop: 2 }}>Total Distance</Text>
            </View>
            <View style={{ width: 1, height: "70%", backgroundColor: "#222" }} />
            <View>
              <Text style={{ color: "#00ff7f", fontSize: 22, fontWeight: "800", letterSpacing: -0.5 }}>Top 12%</Text>
              <Text style={{ color: "#777", fontSize: 13, fontWeight: "500", marginTop: 2 }}>Global Rank</Text>
            </View>
          </View>

          <View style={{ backgroundColor: "#141416", borderRadius: 16, borderWidth: 1, borderColor: "#1f1f21", padding: 14, marginBottom: 16 }}>
            <Text style={{ color: "#9efac8", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>Membership</Text>
            <Text style={{ color: "#fff", marginTop: 6, fontSize: 14, fontWeight: "700" }}>
              {membershipTier.toUpperCase()} · Ownership {ownedCrewCount}/{ownershipLimit || 0}
            </Text>
            {membershipTier === "free" && (
              <Text style={{ color: "#888", marginTop: 4, fontSize: 12 }}>
                Free members cannot create crews or upload logos.
              </Text>
            )}
          </View>

          {activeGroup && canManageCrew && (
            <View style={{ backgroundColor: "#161618", borderRadius: 18, borderWidth: 1, borderColor: "#232325", padding: 14, marginBottom: 18 }}>
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "800", marginBottom: 10 }}>Admin Panel</Text>
              <TextInput
                value={groupNameInput}
                onChangeText={setGroupNameInput}
                placeholder="Crew name"
                placeholderTextColor="#444"
                style={{ backgroundColor: "#1a1a1a", borderRadius: 12, borderWidth: 1, borderColor: "#262628", color: "#fff", paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 }}
              />
              <TextInput
                value={groupTaglineInput}
                onChangeText={setGroupTaglineInput}
                placeholder="Tagline"
                placeholderTextColor="#444"
                maxLength={80}
                style={{ backgroundColor: "#1a1a1a", borderRadius: 12, borderWidth: 1, borderColor: "#262628", color: "#fff", paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 }}
              />
              <TextInput
                value={groupDescriptionInput}
                onChangeText={setGroupDescriptionInput}
                placeholder="Description"
                placeholderTextColor="#444"
                maxLength={280}
                multiline
                style={{ backgroundColor: "#1a1a1a", borderRadius: 12, borderWidth: 1, borderColor: "#262628", color: "#fff", paddingHorizontal: 12, paddingVertical: 10, minHeight: 70, textAlignVertical: "top", marginBottom: 8 }}
              />

              <View style={{ flexDirection: "row", marginBottom: 8 }}>
                {["public", "request", "invite"].map((privacy) => (
                  <HapticTouchable
                    key={privacy}
                    onPress={() => setGroupPrivacy(privacy)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: groupPrivacy === privacy ? "rgba(0,255,127,0.5)" : "#2b2b2d",
                      backgroundColor: groupPrivacy === privacy ? "rgba(0,255,127,0.12)" : "#1a1a1a",
                      marginRight: 8,
                    }}
                  >
                    <Text style={{ color: groupPrivacy === privacy ? "#9efac8" : "#888", fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}>
                      {privacy}
                    </Text>
                  </HapticTouchable>
                ))}
              </View>

              <TextInput
                value={groupLogoInput}
                onChangeText={setGroupLogoInput}
                placeholder="Logo URL (.png / .jpg)"
                placeholderTextColor="#444"
                autoCapitalize="none"
                style={{ backgroundColor: "#1a1a1a", borderRadius: 12, borderWidth: 1, borderColor: "#262628", color: "#fff", paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 }}
              />

              <View style={{ flexDirection: "row" }}>
                <HapticTouchable
                  disabled={isSavingSettings}
                  onPress={handleSaveCrewSettings}
                  style={{
                    flex: 1,
                    backgroundColor: "#00ff7f",
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    marginRight: 8,
                    opacity: isSavingSettings ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: "#000", fontSize: 12, fontWeight: "800" }}>
                    {isSavingSettings ? "Saving..." : "Save Settings"}
                  </Text>
                </HapticTouchable>
                <HapticTouchable
                  disabled={isUploadingLogo || !isOwner}
                  onPress={handleUploadLogo}
                  style={{
                    flex: 1,
                    backgroundColor: "#1f1f21",
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    borderWidth: 1,
                    borderColor: "#2c2c2f",
                    opacity: isUploadingLogo || !isOwner ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: "#aaa", fontSize: 12, fontWeight: "800" }}>
                    {isUploadingLogo ? "Uploading..." : "Upload Logo"}
                  </Text>
                </HapticTouchable>
              </View>
            </View>
          )}

          {/* Navigation Tabs (No longer wrapped in ScrollView to match Apple cleanliness) */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderColor: "#222" }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <HapticTouchable
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
                </HapticTouchable>
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
                    <HapticTouchable
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
                      <Text style={{ color: filterPeriod === p ? "#fff" : "#888", fontSize: 13, fontWeight: "600" }}>{p}</Text>
                    </HapticTouchable>
                  ))}

                  <View style={{ width: 1, height: 20, backgroundColor: "#333", marginHorizontal: 8 }} />

                  <HapticTouchable
                    onPress={() => setStreakSort(!streakSort)}
                    style={{
                      flexDirection: "row", alignItems: "center",
                      paddingHorizontal: 16, paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: streakSort ? "rgba(0,255,127,0.15)" : "rgba(255,255,255,0.03)",
                      borderWidth: 1,
                      borderColor: streakSort ? "#00ff7f" : "transparent",
                      marginRight: 8
                    }}>
                    <Flame color={streakSort ? "#fff" : "#888"} size={14} style={{ marginRight: 6 }} />
                    <Text style={{ color: streakSort ? "#fff" : "#888", fontSize: 13, fontWeight: "600" }}>Streak</Text>
                  </HapticTouchable>

                  <HapticTouchable
                    onPress={() => setCityFilter(!cityFilter)}
                    style={{
                      flexDirection: "row", alignItems: "center",
                      paddingHorizontal: 16, paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: cityFilter ? "rgba(0,255,127,0.15)" : "rgba(255,255,255,0.03)",
                      borderWidth: 1,
                      borderColor: cityFilter ? "#00ff7f" : "transparent",
                      marginRight: 16
                    }}>
                    <MapPin color={cityFilter ? "#fff" : "#888"} size={14} style={{ marginRight: 6 }} />
                    <Text style={{ color: cityFilter ? "#fff" : "#888", fontSize: 13, fontWeight: "600" }}>London</Text>
                  </HapticTouchable>
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
                  <Text style={{ color: "#777", fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" }}>You vs Squad Average</Text>
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
                  +{myKm - clubAvgKm} {showSteps ? "Steps" : "KM"} above average
                </Text>
              </View>

              {/* Rankings Title + Toggle */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ color: "#777", fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" }}>RANKINGS · {filterPeriod.toUpperCase()}</Text>
                
                {/* KM / Steps toggle moved here */}
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#151515", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 2, borderWidth: 1, borderColor: "#222" }}>
                  <Text style={{ color: showSteps ? "#444" : "#00ff7f", fontSize: 10, fontWeight: "700", marginRight: 2 }}>KM</Text>
                  <Switch
                    value={showSteps}
                    onValueChange={toggleMetric}
                    trackColor={{ false: "#222", true: "#005c29" }}
                    thumbColor={showSteps ? "#00ff7f" : "#555"}
                    style={{ transform: [{ scaleX: 0.6 }, { scaleY: 0.6 }] }}
                  />
                  <Text style={{ color: showSteps ? "#00ff7f" : "#444", fontSize: 10, fontWeight: "700", marginLeft: 2 }}>STEPS</Text>
                </View>
              </View>

              {/* Rankings List */}
              <View style={{ paddingBottom: 40 }}>
                {isLoading ? (
                  // SHIMMER LOADING STATE
                  [1, 2, 3, 4, 5].map((i) => (
                    <View key={`shimmer-${i}`} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 18, paddingHorizontal: 16, marginBottom: 8 }}>
                      <Shimmer width={28} height={16} style={{ marginRight: 16 }} />
                      <Shimmer width={48} height={48} borderRadius={24} style={{ marginRight: 16 }} />
                      <View style={{ flex: 1 }}>
                        <Shimmer width="60%" height={16} style={{ marginBottom: 8 }} />
                        <Shimmer width="40%" height={10} />
                      </View>
                    </View>
                  ))
                ) : (
                  sorted.map((f, index) => {
                    const rank = index + 1;
                    const rc = RANK_COLORS[rank];
                    const isUser = f.name === "You";
                    const stat = showSteps
                      ? (f.total_steps > 0 ? f.total_steps.toLocaleString() : "----")
                      : (f.total_distance ? `${f.total_distance}` : "----");
                    const unit = showSteps ? "steps" : "KM";
                    return (
                      <HapticTouchable
                        key={f.id}
                        activeOpacity={0.8}
                        onLongPress={triggerLoading}
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
                                <Flame color="#00ff7f" size={14} style={{ marginRight: 4 }} opacity={0.8} />
                                <Text style={{ color: "#777", fontSize: 12, fontWeight: "600" }}>{f.streak}d</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </HapticTouchable>
                    );
                  })
                )}
              </View>
            </View>
          )}

          {/* ════ FEED ════ */}
          {activeTab === "Feed" && (
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              {/* Post Trigger */}
              <HapticTouchable 
                onPress={() => setShowPostModal(true)}
                style={{ backgroundColor: "#161618", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#222", marginBottom: 20, flexDirection: "row", alignItems: "center" }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#00ff7f22", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                  <Plus color="#fff" size={20} />
                </View>
                <Text style={{ color: "#555", fontSize: 15, fontWeight: "600" }}>Share something with the squad...</Text>
              </HapticTouchable>

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
                    <HapticTouchable onPress={() => handleSharePost(item)}>
                      <Share2 color="#333" size={16} />
                    </HapticTouchable>
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
                    <HapticTouchable onPress={() => toggleLike(item.id)} style={{ flexDirection: "row", alignItems: "center", marginRight: 22 }}>
                      <View style={{ width: 22, height: 22, alignItems: "center", justifyContent: "center", marginRight: 6 }}>
                        <Heart color={item.liked ? "#ff4d4d" : "#444"} size={18} />
                        <HeartBurst trigger={burstTriggers[item.id] || 0} />
                      </View>
                      <Text style={{ color: "#555", fontSize: 13 }}>{item.likes}</Text>
                    </HapticTouchable>
                    <HapticTouchable 
                      onPress={() => handleOpenComments(item)}
                      style={{ flexDirection: "row", alignItems: "center" }}>
                      <MessageSquare color="#444" size={18} style={{ marginRight: 6 }} />
                      <Text style={{ color: "#555", fontSize: 13 }}>{item.comments}</Text>
                    </HapticTouchable>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ════ CHAT ════ */}
          {activeTab === "Chat" && (
            <View style={{ flex: 1, paddingHorizontal: 16 }}>
              <View style={{ height: Dimensions.get("window").height * 0.5 }}>
                <ScrollView 
                  showsVerticalScrollIndicator={false} 
                  contentContainerStyle={{ paddingBottom: 20 }}
                  ref={ref => ref?.scrollToEnd({ animated: true })}>
                  {messages.map((m) => (
                    <View 
                      key={m.id} 
                      style={{ 
                        alignSelf: m.isMe ? "flex-end" : "flex-start",
                        maxWidth: "80%",
                        marginBottom: 16
                      }}>
                      {!m.isMe && <Text style={{ color: "#555", fontSize: 11, fontWeight: "700", marginBottom: 4, marginLeft: 12 }}>{m.user}</Text>}
                      <View style={{
                        backgroundColor: m.isMe ? "#00ff7f" : "#1a1a1a",
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 20,
                        borderBottomRightRadius: m.isMe ? 4 : 20,
                        borderBottomLeftRadius: m.isMe ? 20 : 4,
                      }}>
                        <Text style={{ color: m.isMe ? "#000" : "#fff", fontSize: 15, fontWeight: "500" }}>{m.text}</Text>
                      </View>
                      <Text style={{ color: "#333", fontSize: 10, marginTop: 4, alignSelf: m.isMe ? "flex-end" : "flex-start", marginRight: m.isMe ? 4 : 0, marginLeft: m.isMe ? 0 : 4 }}>{m.time}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>

              {/* Chat Input */}
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#151515", borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: "#222" }}>
                <TextInput
                  style={{ flex: 1, color: "#fff", fontSize: 15 }}
                  placeholder="Type a message..."
                  placeholderTextColor="#444"
                  value={newMessage}
                  onChangeText={setNewMessage}
                />
                <HapticTouchable onPress={handleSendMessage}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#00ff7f", alignItems: "center", justifyContent: "center" }}>
                    <Send color="#000" size={18} />
                  </View>
                </HapticTouchable>
              </View>
            </View>
          )}

          {/* ════ CHALLENGES ════ */}
          {activeTab === "Challenges" && (
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              {challenges.map((c, i) => {
                const pct = Math.min(c.current / c.goal, 1);
                return (
                  <View key={c.id} style={{ backgroundColor: "#161618", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: c.joined ? "#00ff7f22" : "#1a1a1a", marginBottom: i < challenges.length - 1 ? 12 : 0 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                      <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: "rgba(0, 255, 127, 0.1)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                        <c.icon color="#fff" size={20} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>{c.title}</Text>
                        <Text style={{ color: "#555", fontSize: 12, marginTop: 2 }}>{c.participants} runners · {c.daysLeft}d left</Text>
                      </View>
                      <HapticTouchable onPress={() => handleToggleChallenge(c.id)} style={{ backgroundColor: c.joined ? "#1e1e1e" : "rgba(0, 255, 127, 0.1)", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, borderWidth: 1, borderColor: c.joined ? "#2a2a2a" : "#00ff7f" }}>
                        <Text style={{ color: c.joined ? "#555" : "#fff", fontWeight: "700", fontSize: 12 }}>{c.joined ? "Joined" : "Join"}</Text>
                      </HapticTouchable>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text style={{ color: "#555", fontSize: 12 }}>{c.current} {c.unit}</Text>
                      <Text style={{ color: "#00ff7f", fontSize: 12, fontWeight: "700" }}>{Math.round(pct * 100)}%</Text>
                    </View>
                    <ProgressBar current={c.current} goal={c.goal} color="#00ff7f" height={8} />
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
                    {clubMeta.weekCurrentKm} <Text style={{ color: "#555", fontSize: 13 }}>/ {clubMeta.weekGoalKm} KM</Text>
                  </Text>
                </View>
                <ProgressBar current={clubMeta.weekCurrentKm} goal={clubMeta.weekGoalKm} color="#00ff7f" height={10} />
                <Text style={{ color: "#555", fontSize: 12, marginTop: 8 }}>{clubMeta.weekGoalKm - clubMeta.weekCurrentKm} KM to go · 3 days left</Text>
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
                    <Flame color="#00ff7f" size={14} style={{ marginRight: 4 }} />
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{f.streak}</Text>
                    <Text style={{ color: "#555", fontSize: 12, marginLeft: 3 }}>days</Text>
                  </View>
                </View>
              ))}

              {/* Contributions */}
              <Text style={{ color: "#444", fontSize: 11, fontWeight: "600", letterSpacing: 1, marginBottom: 12, marginTop: 8 }}>CONTRIBUTION TO CLUB TOTAL</Text>
              {LEADERBOARD.map(f => {
                const contribution = f.total_distance ? ((f.total_distance / clubMeta.totalKm) * 100).toFixed(1) : "0.0";
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
                <HapticTouchable onPress={() => setShowJoinModal(false)}><X color="#555" size={22} /></HapticTouchable>
              </View>
              <Text style={{ color: "#555", fontSize: 13, marginBottom: 14 }}>Enter the invite code shared by a friend.</Text>
              <TextInput
                value={inviteInput}
                onChangeText={(value) => setInviteInput(value.toUpperCase())}
                placeholder="e.g. OUTHR-2024"
                placeholderTextColor="#333"
                style={{ backgroundColor: "#1a1a1a", borderRadius: 14, padding: 14, color: "#fff", fontSize: 16, fontWeight: "600", borderWidth: 1, borderColor: "#2a2a2a", marginBottom: 16, letterSpacing: 2 }}
                autoCapitalize="characters"
              />
              <HapticTouchable onPress={handleJoinClub} style={{ backgroundColor: "#00ff7f", padding: 16, borderRadius: 14, alignItems: "center" }}>
                <Text style={{ color: "#000", fontWeight: "800", fontSize: 16 }}>Join Club</Text>
              </HapticTouchable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── CREATE MODAL ── */}
        <Modal visible={showCreateModal} transparent animationType="slide">
          {/* ... existing modal content ... */}
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" }} onPress={() => setShowCreateModal(false)}>
            <Pressable style={{ backgroundColor: "#161618", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>Create a Club</Text>
                <HapticTouchable onPress={() => setShowCreateModal(false)}><X color="#555" size={22} /></HapticTouchable>
              </View>
              <Text style={{ color: "#555", fontSize: 13, marginBottom: 10 }}>Give your crew a name to get started (max 25 chars).</Text>
              <Text style={{ color: "#8af6be", fontSize: 12, marginBottom: 12 }}>
                {membershipTier.toUpperCase()} tier · Ownership {ownedCrewCount}/{ownershipLimit || 0}
              </Text>
              {!canCreateCrew && (
                <Text style={{ color: "#888", fontSize: 12, marginBottom: 10 }}>
                  Upgrade to Pro or Black to create a crew.
                </Text>
              )}
              <TextInput
                value={createClubName}
                onChangeText={setCreateClubName}
                maxLength={25}
                placeholder="Club name..."
                placeholderTextColor="#333"
                style={{ backgroundColor: "#1a1a1a", borderRadius: 14, padding: 14, color: "#fff", fontSize: 16, borderWidth: 1, borderColor: "#2a2a2a", marginBottom: 14 }}
              />
              <View style={{ backgroundColor: "#0d1a11", borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#00ff7f22" }}>
                <Text style={{ color: "#555", fontSize: 12, marginBottom: 4 }}>Your invite code</Text>
                <Text style={{ color: "#00ff7f", fontWeight: "800", fontSize: 20, letterSpacing: 3 }}>{inviteCodePreview}</Text>
              </View>
              <HapticTouchable
                onPress={handleCreateClub}
                disabled={!canCreateCrew || ownedCrewCount >= ownershipLimit}
                style={{
                  backgroundColor: !canCreateCrew || ownedCrewCount >= ownershipLimit ? "#2a2a2a" : "#00ff7f",
                  padding: 16,
                  borderRadius: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: !canCreateCrew || ownedCrewCount >= ownershipLimit ? "#777" : "#000", fontWeight: "800", fontSize: 16 }}>
                  Create Club
                </Text>
              </HapticTouchable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── POST MODAL ── */}
        <Modal visible={showPostModal} transparent animationType="slide">
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" }} onPress={() => setShowPostModal(false)}>
            <Pressable style={{ backgroundColor: "#161618", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>Create New Post</Text>
                <HapticTouchable onPress={() => setShowPostModal(false)}><X color="#555" size={22} /></HapticTouchable>
              </View>
              <TextInput
                multiline
                numberOfLines={4}
                value={newPostText}
                onChangeText={setNewPostText}
                placeholder="What's happening?"
                placeholderTextColor="#333"
                style={{ backgroundColor: "#1a1a1a", borderRadius: 14, padding: 14, color: "#fff", fontSize: 16, minHeight: 100, textAlignVertical: "top", marginBottom: 20 }}
              />
              <HapticTouchable 
                onPress={handleCreatePost}
                style={{ backgroundColor: "#00ff7f", padding: 16, borderRadius: 14, alignItems: "center" }}>
                <Text style={{ color: "#000", fontWeight: "800", fontSize: 16 }}>Post to Feed</Text>
              </HapticTouchable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── COMMENTS MODAL ── */}
        <Modal visible={showCommentsModal} transparent animationType="slide">
          <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" }} onPress={() => setShowCommentsModal(false)}>
            <Pressable style={{ backgroundColor: "#161618", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, height: "70%" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>Comments</Text>
                <HapticTouchable onPress={() => setShowCommentsModal(false)}><X color="#555" size={22} /></HapticTouchable>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                {activeComments.length === 0 ? (
                  <View style={{ alignItems: "center", marginTop: 40 }}>
                    <MessageSquare size={40} color="#222" style={{ marginBottom: 12 }} />
                    <Text style={{ color: "#444", fontWeight: "600" }}>No comments yet. Be the first!</Text>
                  </View>
                ) : (
                  activeComments.map((comment) => (
                    <View key={comment.id} style={{ flexDirection: "row", marginBottom: 20 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#222", marginRight: 12, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ color: "#aaa", fontSize: 12, fontWeight: "800" }}>{comment.user.slice(0, 1)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                          <Text style={{ color: "#666", fontSize: 12, fontWeight: "700", marginRight: 8 }}>{comment.user}</Text>
                          <Text style={{ color: "#444", fontSize: 11 }}>{comment.time}</Text>
                        </View>
                        <Text style={{ color: "#ccc", fontSize: 14 }}>{comment.text}</Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>

              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 20, backgroundColor: "#1a1a1a", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}>
                <TextInput
                  style={{ flex: 1, color: "#fff", fontSize: 14 }}
                  placeholder="Drop a comment..."
                  placeholderTextColor="#444"
                  value={newCommentText}
                  onChangeText={setNewCommentText}
                />
                <HapticTouchable onPress={handleAddComment}>
                  <Send color="#00ff7f" size={18} />
                </HapticTouchable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

      </View>
    </View>
  );
}
