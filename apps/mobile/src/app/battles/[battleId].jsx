import React, { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock3, Share2, Swords, Trophy } from "lucide-react-native";
import { battlesAPI, userAPI } from "@/services/api";

const NEON = "#00ff7f";

const formatNumber = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString();
};

const formatCountdown = (endAt) => {
  if (!endAt) return "--";
  const end = new Date(endAt).getTime();
  const diff = Math.max(0, end - Date.now());
  if (diff <= 0) return "Ended";
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

export default function BattleDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { battleId } = useLocalSearchParams();

  const { data: battle, isLoading } = useQuery({
    queryKey: ["battle", battleId],
    queryFn: () => battlesAPI.get(battleId),
    enabled: !!battleId,
    refetchInterval: 30000,
  });

  const { data: creator } = useQuery({
    queryKey: ["battle", battleId, "creator", battle?.creator_device_id],
    queryFn: () => userAPI.get(battle?.creator_device_id),
    enabled: !!battle?.creator_device_id,
    refetchInterval: 60000,
  });

  const { data: opponent } = useQuery({
    queryKey: ["battle", battleId, "opponent", battle?.opponent_device_id],
    queryFn: () => userAPI.get(battle?.opponent_device_id),
    enabled: !!battle?.opponent_device_id,
    refetchInterval: 60000,
  });

  const winnerName = useMemo(() => {
    if (!battle?.winner_device_id) return "Draw";
    if (battle.winner_device_id === battle.creator_device_id) {
      return creator?.username || "Creator";
    }
    if (battle.winner_device_id === battle.opponent_device_id) {
      return opponent?.username || "Opponent";
    }
    return "Winner";
  }, [battle, creator, opponent]);

  if (isLoading || !battle) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={NEON} />
      </View>
    );
  }

  const creatorSteps = battle.creator_steps ?? 0;
  const opponentSteps = battle.opponent_steps ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar style="light" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <ArrowLeft color="#aaa" size={16} />
          <Text style={{ color: "#aaa", marginLeft: 6, fontWeight: "700" }}>Back</Text>
        </TouchableOpacity>

        <View
          style={{
            backgroundColor: "#161618",
            borderRadius: 24,
            padding: 20,
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Swords color={NEON} size={18} />
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800", marginLeft: 8 }}>
              Battle Detail
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <Clock3 color="#9efac8" size={14} />
            <Text style={{ color: "#9efac8", marginLeft: 6, fontWeight: "700" }}>
              {battle.status === "complete" ? "Complete" : formatCountdown(battle.end_at)}
            </Text>
          </View>

          <Text style={{ color: "#666", fontSize: 12 }}>Status: {battle.status}</Text>
        </View>

        <View
          style={{
            backgroundColor: "#161618",
            borderRadius: 24,
            padding: 20,
            marginBottom: 14,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800", marginBottom: 12 }}>
            Participants
          </Text>

          <View
            style={{
              backgroundColor: "#1e1e20",
              borderRadius: 14,
              padding: 12,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: "#2a2a2d",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>{creator?.username || "Creator"}</Text>
            <Text style={{ color: "#9efac8", marginTop: 4, fontWeight: "800" }}>
              {formatNumber(creatorSteps)} steps
            </Text>
          </View>

          <View
            style={{
              backgroundColor: "#1e1e20",
              borderRadius: 14,
              padding: 12,
              borderWidth: 1,
              borderColor: "#2a2a2d",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>{opponent?.username || "Opponent"}</Text>
            <Text style={{ color: "#9efac8", marginTop: 4, fontWeight: "800" }}>
              {formatNumber(opponentSteps)} steps
            </Text>
          </View>
        </View>

        {battle.status === "complete" && (
          <View
            style={{
              backgroundColor: "rgba(0,255,127,0.08)",
              borderRadius: 24,
              borderWidth: 1,
              borderColor: "rgba(0,255,127,0.25)",
              padding: 20,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
              <Trophy color={NEON} size={18} />
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800", marginLeft: 8 }}>
                Result Card
              </Text>
            </View>
            <Text style={{ color: "#9efac8", fontWeight: "800", fontSize: 16 }}>
              Winner: {winnerName}
            </Text>
            <Text style={{ color: "#aaa", marginTop: 6 }}>
              Final score: {formatNumber(creatorSteps)} - {formatNumber(opponentSteps)}
            </Text>
            <TouchableOpacity
              style={{
                marginTop: 14,
                backgroundColor: NEON,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                alignSelf: "flex-start",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Share2 color="#000" size={14} />
              <Text style={{ color: "#000", fontWeight: "800", marginLeft: 6 }}>Share Result</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
