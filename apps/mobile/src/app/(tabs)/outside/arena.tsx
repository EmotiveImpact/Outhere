import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  CircleAlert,
  Globe2,
  MapPin,
  Swords,
  Trophy,
  Zap,
} from "lucide-react-native";
import { battlesAPI, challengesAPI, leaderboardAPI, membershipAPI } from "@/services/api";
import { hapticSelection } from "@/services/haptics";
import { useUserStore } from "@/store/userStore";
import { useOutsideScrollPersistence } from "@/hooks/useOutsideScrollPersistence";

const NEON = "#00ff7f";
const SURFACE = "#161618";

const fallbackRankings = {
  city: [
    { id: "city-1", name: "You", value: 8420 },
    { id: "city-2", name: "Jay", value: 8050 },
    { id: "city-3", name: "Mina", value: 7920 },
  ],
  global: [
    { id: "global-1", name: "Niko", value: 21420 },
    { id: "global-2", name: "Isha", value: 20990 },
    { id: "global-3", name: "Raf", value: 20440 },
  ],
};

const fallbackChallenges = [
  {
    id: "challenge-1",
    title: "Daily 10K Steps",
    subtitle: "Hit 10,000 steps today",
    progress: 6500,
    target: 10000,
  },
  {
    id: "challenge-2",
    title: "City Sprint",
    subtitle: "Add 20,000 steps this week",
    progress: 12400,
    target: 20000,
  },
  {
    id: "challenge-3",
    title: "Streak Builder",
    subtitle: "Check in 5 days in a row",
    progress: 2,
    target: 5,
  },
];

const formatNumber = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString();
};

export default function ArenaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const city = useUserStore((s) => s.user?.city);
  const deviceId = useUserStore((s) => s.deviceId);

  const [rankScope, setRankScope] = useState("city");
  const [showBattleModal, setShowBattleModal] = useState(false);
  const [opponentUsername, setOpponentUsername] = useState("");
  const [durationHours, setDurationHours] = useState(24);
  const [battleError, setBattleError] = useState("");
  const [isCreatingBattle, setIsCreatingBattle] = useState(false);
  const { scrollRef, handleScroll } = useOutsideScrollPersistence("arena");

  const [membershipTier, setMembershipTier] = useState("free");
  const { data: membershipData } = useQuery({
    queryKey: ["membership-status", deviceId],
    queryFn: () => membershipAPI.getStatus(deviceId),
    enabled: !!deviceId,
  });

  React.useEffect(() => {
    if (membershipData?.membership_tier) {
      setMembershipTier(membershipData.membership_tier.toLowerCase());
    }
  }, [membershipData]);

  const { data: rankingData, isLoading: isRankingLoading } = useQuery({
    queryKey: ["arena", "rankings", rankScope, city],
    queryFn: () =>
      leaderboardAPI.get(
        "daily",
        rankScope === "city" && city ? city : undefined
      ),
    staleTime: 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { data: challengeData, isLoading: isChallengesLoading } = useQuery({
    queryKey: ["arena", "challenges", city],
    queryFn: () => challengesAPI.getAll(city),
    staleTime: 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const {
    data: activeBattleData,
    isLoading: isBattlesLoading,
    refetch: refetchBattles,
  } = useQuery({
    queryKey: ["arena", "battles", "active", deviceId],
    queryFn: () => battlesAPI.getForUser(deviceId, "active"),
    enabled: !!deviceId,
    staleTime: 30 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const rankings = useMemo(() => {
    const raw = Array.isArray(rankingData)
      ? rankingData
      : Array.isArray(rankingData?.leaderboard)
        ? rankingData.leaderboard
        : [];

    if (!raw.length) return fallbackRankings[rankScope];

    return raw.slice(0, 3).map((item, index) => ({
      id: item.id || item.device_id || item.username || `rank-${index}`,
      name: item.username || item.name || `Player ${index + 1}`,
      value:
        item.steps ??
        item.total_steps ??
        item.score ??
        item.distance ??
        item.xp ??
        0,
    }));
  }, [rankingData, rankScope]);

  const challenges = useMemo(() => {
    const raw = Array.isArray(challengeData)
      ? challengeData
      : Array.isArray(challengeData?.challenges)
        ? challengeData.challenges
        : [];

    if (!raw.length) return fallbackChallenges;

    return raw.slice(0, 3).map((item, index) => {
      const progress = Number(
        item.progress ??
          item.current_progress ??
          item.current ??
          item.steps_done ??
          0
      );
      const target = Number(
        item.target ??
          item.target_steps ??
          item.goal ??
          item.goal_steps ??
          10000
      );

      return {
        id: item.id || `challenge-${index}`,
        title: item.title || item.name || `Challenge ${index + 1}`,
        subtitle:
          item.description ||
          (item.city ? `${item.city} challenge` : "Keep moving to complete"),
        progress: Number.isFinite(progress) ? progress : 0,
        target: Number.isFinite(target) && target > 0 ? target : 10000,
      };
    });
  }, [challengeData]);

  const activeBattles = useMemo(() => {
    const raw = Array.isArray(activeBattleData) ? activeBattleData : [];
    const normalized = raw.map((battle, index) => ({
      id: battle.id || `battle-${index}`,
      opponentName:
        battle.creator_device_id === deviceId
          ? battle.opponent_device_id
          : battle.creator_device_id,
      endAt: battle.end_at,
    }));

    if (normalized.length >= 3) return normalized;

    const fallback = [
      {
        id: "fallback-b1",
        opponentName: "sarah.run",
        endAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "fallback-b2",
        opponentName: "mike.steps",
        endAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "fallback-b3",
        opponentName: "lena.moves",
        endAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    return [...normalized, ...fallback].slice(0, 3);
  }, [activeBattleData, deviceId]);

  const formatTimeLeft = (endAt) => {
    const end = new Date(endAt).getTime();
    const diff = Math.max(0, end - Date.now());
    if (diff <= 0) return "Ended";
    const totalMinutes = Math.floor(diff / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const createBattle = async () => {
    if (!deviceId) return;
    if (!opponentUsername.trim()) {
      setBattleError("Enter opponent username");
      return;
    }

    if (membershipTier === "free" && activeBattles.length >= 1) {
      setBattleError("Free tier is limited to 1 active battle.");
      return;
    }

    setIsCreatingBattle(true);
    setBattleError("");
    try {
      const users = await leaderboardAPI.get("all-time");
      const match = (Array.isArray(users) ? users : []).find(
        (u) =>
          String(u.username || "")
            .trim()
            .toLowerCase() === opponentUsername.trim().toLowerCase()
      );

      if (!match?.device_id) {
        setBattleError("Username not found");
        return;
      }
      if (match.device_id === deviceId) {
        setBattleError("Choose another opponent");
        return;
      }

      const created = await battlesAPI.create({
        creator_device_id: deviceId,
        opponent_device_id: match.device_id,
        duration_hours: durationHours,
      });

      setShowBattleModal(false);
      setOpponentUsername("");
      setDurationHours(24);
      await refetchBattles();

      if (created?.id) {
        router.push(`/battles/${created.id}`);
      }
    } catch (error) {
      setBattleError(error?.data?.detail || "Could not create battle");
    } finally {
      setIsCreatingBattle(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar style="light" />
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Rankings Card ─── */}
        <View
          style={{
            backgroundColor: SURFACE,
            borderRadius: 24,
            padding: 20,
            marginBottom: 14,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Trophy color={NEON} size={18} />
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>
                Rankings
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  hapticSelection();
                  setRankScope("city");
                }}
                style={{
                  backgroundColor:
                    rankScope === "city" ? "rgba(0,255,127,0.15)" : "#1f1f22",
                  borderWidth: 1,
                  borderColor:
                    rankScope === "city" ? "rgba(0,255,127,0.35)" : "#2a2a2d",
                  borderRadius: 14,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <MapPin color={rankScope === "city" ? NEON : "#777"} size={12} />
                <Text
                  style={{
                    color: rankScope === "city" ? "#fff" : "#888",
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  City
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  hapticSelection();
                  setRankScope("global");
                }}
                style={{
                  backgroundColor:
                    rankScope === "global"
                      ? "rgba(0,255,127,0.15)"
                      : "#1f1f22",
                  borderWidth: 1,
                  borderColor:
                    rankScope === "global"
                      ? "rgba(0,255,127,0.35)"
                      : "#2a2a2d",
                  borderRadius: 14,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Globe2 color={rankScope === "global" ? NEON : "#777"} size={12} />
                <Text
                  style={{
                    color: rankScope === "global" ? "#fff" : "#888",
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  Global
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {isRankingLoading ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <ActivityIndicator color={NEON} />
            </View>
          ) : (
            rankings.map((entry, index) => (
              <View
                key={entry.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 10,
                  borderBottomWidth: index === rankings.length - 1 ? 0 : 1,
                  borderBottomColor: "#202024",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text
                    style={{
                      color: "#777",
                      width: 24,
                      fontWeight: "700",
                    }}
                  >
                    {index + 1}
                  </Text>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
                    {entry.name}
                  </Text>
                </View>
                <Text style={{ color: NEON, fontWeight: "800" }}>
                  {formatNumber(entry.value)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* ─── Challenges Card ─── */}
        <View
          style={{
            backgroundColor: SURFACE,
            borderRadius: 24,
            padding: 20,
            marginBottom: 14,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Zap color={NEON} size={18} />
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>
                Challenges
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                hapticSelection();
                router.push("/challenges");
              }}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <Text
                style={{
                  color: "#888",
                  fontSize: 12,
                  fontWeight: "700",
                  marginRight: 3,
                }}
              >
                View all
              </Text>
              <ChevronRight color="#888" size={13} />
            </TouchableOpacity>
          </View>

          {isChallengesLoading ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <ActivityIndicator color={NEON} />
            </View>
          ) : (
            challenges.map((challenge, index) => {
              const progressPct = Math.min(
                100,
                (challenge.progress / challenge.target) * 100
              );

              return (
                <View
                  key={challenge.id}
                  style={{
                    marginBottom: index === challenges.length - 1 ? 0 : 14,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", flex: 1 }}>
                      {challenge.title}
                    </Text>
                    <Text style={{ color: NEON, fontWeight: "800", fontSize: 12 }}>
                      {formatNumber(challenge.progress)}/{formatNumber(challenge.target)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: "#666",
                      fontSize: 12,
                      marginBottom: 8,
                    }}
                  >
                    {challenge.subtitle}
                  </Text>
                  <View
                    style={{
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: "#232326",
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        width: `${progressPct}%`,
                        height: "100%",
                        backgroundColor: NEON,
                        borderRadius: 3,
                      }}
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ─── Active Battles Card ─── */}
        <View
          style={{
            backgroundColor: SURFACE,
            borderRadius: 24,
            padding: 20,
            marginBottom: 14,
          }}
        >
          {/* Battle creation modal */}
          <Modal
            visible={showBattleModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowBattleModal(false)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.7)",
                justifyContent: "center",
                paddingHorizontal: 20,
              }}
            >
              <View
                style={{
                  backgroundColor: "#111113",
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: "#2a2a2d",
                  padding: 18,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800", marginBottom: 14 }}>
                  New Battle
                </Text>
                <Text style={{ color: "#777", fontSize: 12, marginBottom: 8 }}>
                  Opponent username
                </Text>
                <TextInput
                  value={opponentUsername}
                  onChangeText={setOpponentUsername}
                  placeholder="e.g. sarah.run"
                  placeholderTextColor="#555"
                  autoCapitalize="none"
                  style={{
                    backgroundColor: "#1b1b1d",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#2a2a2d",
                    color: "#fff",
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    marginBottom: 14,
                  }}
                />
                <Text style={{ color: "#777", fontSize: 12, marginBottom: 8 }}>
                  Duration
                </Text>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                  {[2, 6, 24, 168].map((hours) => (
                    <TouchableOpacity
                      key={hours}
                      onPress={() => setDurationHours(hours)}
                      style={{
                        backgroundColor:
                          durationHours === hours ? "rgba(0,255,127,0.2)" : "#1b1b1d",
                        borderColor:
                          durationHours === hours ? "rgba(0,255,127,0.4)" : "#2a2a2d",
                        borderWidth: 1,
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                        {hours === 168 ? "7d" : `${hours}h`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {!!battleError && (
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                    <CircleAlert color="#ff6b6b" size={14} />
                    <Text style={{ color: "#ff6b6b", marginLeft: 6, fontSize: 12 }}>
                      {battleError}
                    </Text>
                  </View>
                )}
                <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setShowBattleModal(false)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      borderRadius: 10,
                      backgroundColor: "#1b1b1d",
                    }}
                  >
                    <Text style={{ color: "#aaa", fontWeight: "700" }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={createBattle}
                    disabled={isCreatingBattle}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      borderRadius: 10,
                      backgroundColor: NEON,
                    }}
                  >
                    <Text style={{ color: "#000", fontWeight: "800" }}>
                      {isCreatingBattle ? "Creating..." : "Create"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Swords color={NEON} size={18} />
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>
                Active Battles
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                hapticSelection();
                setShowBattleModal(true);
              }}
              style={{
                backgroundColor: NEON,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 14,
              }}
            >
              <Text style={{ color: "#000", fontWeight: "800", fontSize: 12 }}>
                New Battle
              </Text>
            </TouchableOpacity>
          </View>

          {isBattlesLoading ? (
            <View style={{ paddingVertical: 20, alignItems: "center" }}>
              <ActivityIndicator color={NEON} />
            </View>
          ) : (
            activeBattles.map((battle, index) => (
              <TouchableOpacity
                key={battle.id}
                onPress={() => {
                  if (!battle.id.startsWith("fallback-")) {
                    router.push(`/battles/${battle.id}`);
                  }
                }}
                activeOpacity={0.8}
                style={{
                  backgroundColor: "#1e1e20",
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "#2a2a2d",
                  padding: 12,
                  marginTop: index === 0 ? 2 : 10,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700" }}>
                    vs {battle.opponentName}
                  </Text>
                  <Text style={{ color: "#9efac8", fontSize: 12, fontWeight: "700" }}>
                    {formatTimeLeft(battle.endAt)}
                  </Text>
                </View>
                <Text style={{ color: "#666", fontSize: 12 }}>
                  Tap to view battle detail
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
