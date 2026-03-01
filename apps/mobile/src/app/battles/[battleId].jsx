import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock3,
  Share2,
  Swords,
  Trophy,
  Zap,
  Timer,
  Shield,
} from "lucide-react-native";
import { Image } from "expo-image";
import { battlesAPI, userAPI } from "@/services/api";
import { useUserStore } from "@/store/userStore";
import { hapticSelection, hapticSuccess } from "@/services/haptics";

const NEON = "#00ff7f";
const SURFACE = "#161618";

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatNumber = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString();
};

const useCountdown = (endAt) => {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      if (!endAt) { setTime("--"); return; }
      const end = new Date(endAt).getTime();
      const diff = Math.max(0, end - Date.now());
      if (diff <= 0) { setTime("Ended"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setTime(`${d}d ${h}h ${m}m`);
      else setTime(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endAt]);

  return time;
};

// Animated step bar
function StepBar({ value, total, color, delay = 0 }) {
  const anim = useRef(new Animated.Value(0)).current;
  const pct = total > 0 ? Math.min(1, value / total) : 0;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 900,
      delay,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={{ height: 6, backgroundColor: "#232326", borderRadius: 3, overflow: "hidden" }}>
      <Animated.View style={{ width, height: "100%", backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function BattleDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { battleId } = useLocalSearchParams();
  const battleIdParam = Array.isArray(battleId) ? battleId[0] : battleId;
  const myDeviceId = useUserStore((s) => s.deviceId);

  const { data: battle, isLoading } = useQuery({
    queryKey: ["battle", battleIdParam],
    queryFn: () => battlesAPI.get(battleIdParam),
    enabled: !!battleIdParam,
    refetchInterval: 1000,
  });

  const { data: creator } = useQuery({
    queryKey: ["battle-user", battle?.creator_device_id],
    queryFn: () => userAPI.get(battle?.creator_device_id),
    enabled: !!battle?.creator_device_id,
    refetchInterval: 60000,
  });

  const { data: opponent } = useQuery({
    queryKey: ["battle-user", battle?.opponent_device_id],
    queryFn: () => userAPI.get(battle?.opponent_device_id),
    enabled: !!battle?.opponent_device_id,
    refetchInterval: 60000,
  });

  const countdown = useCountdown(battle?.end_at);

  const creatorSteps = battle?.creator_steps ?? 0;
  const opponentSteps = battle?.opponent_steps ?? 0;
  const totalSteps = Math.max(creatorSteps + opponentSteps, 1);

  const isComplete = battle?.status === "complete";
  const myIsCreator = battle?.creator_device_id === myDeviceId;
  const iWon = isComplete && battle?.winner_device_id === myDeviceId;
  const isDraw = isComplete && !battle?.winner_device_id;

  const winnerName = useMemo(() => {
    if (!battle?.winner_device_id) return "Draw";
    if (battle.winner_device_id === battle.creator_device_id) return creator?.username || "Creator";
    if (battle.winner_device_id === battle.opponent_device_id) return opponent?.username || "Opponent";
    return "Winner";
  }, [battle, creator, opponent]);

  const creatorName = creator?.username || "You";
  const opponentName = opponent?.username || "Opponent";

  const handleShare = async () => {
    try {
      const battleUrl = battleIdParam ? Linking.createURL(`/battles/${battleIdParam}`) : "";
      const resultLabel = isComplete
        ? (isDraw ? "Draw" : iWon ? "You Won" : "You Lost")
        : "Live Battle";
      await Share.share({
        message: `OutHere Battle: ${creatorName} vs ${opponentName} · ${resultLabel} · ${creatorSteps.toLocaleString()} vs ${opponentSteps.toLocaleString()} steps${battleUrl ? ` · ${battleUrl}` : ""}`,
        url: battleUrl || undefined,
      });
      hapticSuccess();
    } catch { /* ignore */ }
  };

  const handleBack = () => {
    hapticSelection();
    if (typeof router.canGoBack === "function" && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/outside/arena");
  };

  if (isLoading || !battle) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a0a", alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(0,255,127,0.1)", alignItems: "center", justifyContent: "center" }}>
          <Swords color={NEON} size={22} />
        </View>
        <Text style={{ color: "#555", fontSize: 13, marginTop: 12, fontWeight: "600" }}>Loading battle...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar style="light" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 48,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Back & Share row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <TouchableOpacity
            onPress={handleBack}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <ArrowLeft color="#aaa" size={16} />
            <Text style={{ color: "#aaa", fontWeight: "700", fontSize: 14 }}>Arena</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShare}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: SURFACE, borderWidth: 1, borderColor: "#2a2a2d", alignItems: "center", justifyContent: "center" }}
          >
            <Share2 color="#777" size={16} />
          </TouchableOpacity>
        </View>

        {/* Status badge */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: isComplete ? "rgba(255,255,255,0.06)" : "rgba(0,255,127,0.1)",
            borderWidth: 1,
            borderColor: isComplete ? "#2a2a2d" : "rgba(0,255,127,0.25)",
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}>
            {!isComplete && (
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: NEON, shadowColor: NEON, shadowOpacity: 0.9, shadowRadius: 4 }} />
            )}
            <Text style={{ color: isComplete ? "#777" : NEON, fontSize: 12, fontWeight: "800", letterSpacing: 0.5 }}>
              {isComplete ? "FINISHED" : "LIVE"}
            </Text>
          </View>
          <Text style={{ color: "#444", fontSize: 12 }}>
            {battle.metric === "distance" ? "Distance" : "Steps"} · {battle.duration_hours ? `${battle.duration_hours}h` : ""}
          </Text>
        </View>

        {/* ─── VS Card ─── */}
        <View style={{
          backgroundColor: SURFACE,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: "#1e1e22",
          padding: 20,
          marginBottom: 14,
        }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
            <Swords color={NEON} size={16} />
            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "800", marginLeft: 8 }}>Battle</Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
            {/* Creator */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#222", borderWidth: 1.5, borderColor: myIsCreator ? NEON : "#2a2a2d", overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                  {creator?.avatar_url
                    ? <Image source={{ uri: creator.avatar_url }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                    : <Text style={{ color: "#555", fontWeight: "800", fontSize: 13 }}>{creatorName[0]?.toUpperCase()}</Text>
                  }
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: myIsCreator ? NEON : "#fff", fontWeight: "700", fontSize: 13 }} numberOfLines={1}>{creatorName}</Text>
                  {myIsCreator && <Text style={{ color: "#555", fontSize: 10 }}>You</Text>}
                </View>
              </View>
              <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900", letterSpacing: -1, marginBottom: 6 }}>
                {formatNumber(creatorSteps)}
              </Text>
              <StepBar value={creatorSteps} total={totalSteps} color={myIsCreator ? NEON : "#555"} delay={100} />
            </View>

            {/* VS divider */}
            <View style={{ alignItems: "center", paddingBottom: 8 }}>
              <Text style={{ color: "#333", fontSize: 13, fontWeight: "900" }}>VS</Text>
            </View>

            {/* Opponent */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, flexDirection: "row-reverse" }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#222", borderWidth: 1.5, borderColor: !myIsCreator ? NEON : "#2a2a2d", overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                  {opponent?.avatar_url
                    ? <Image source={{ uri: opponent.avatar_url }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                    : <Text style={{ color: "#555", fontWeight: "800", fontSize: 13 }}>{opponentName[0]?.toUpperCase()}</Text>
                  }
                </View>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={{ color: !myIsCreator ? NEON : "#fff", fontWeight: "700", fontSize: 13 }} numberOfLines={1}>{opponentName}</Text>
                  {!myIsCreator && <Text style={{ color: "#555", fontSize: 10 }}>You</Text>}
                </View>
              </View>
              <Text style={{ color: "#fff", fontSize: 28, fontWeight: "900", letterSpacing: -1, marginBottom: 6, textAlign: "right" }}>
                {formatNumber(opponentSteps)}
              </Text>
              <StepBar value={opponentSteps} total={totalSteps} color={!myIsCreator ? NEON : "#555"} delay={200} />
            </View>
          </View>
        </View>

        {/* ─── Countdown / Status Card ─── */}
        {!isComplete && (
          <View style={{
            backgroundColor: SURFACE,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "#1e1e22",
            padding: 16,
            marginBottom: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(0,255,127,0.1)", alignItems: "center", justifyContent: "center" }}>
              <Timer color={NEON} size={18} />
            </View>
            <View>
              <Text style={{ color: "#555", fontSize: 11, fontWeight: "700", marginBottom: 2 }}>Time Remaining</Text>
              <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: -0.5, fontVariant: ["tabular-nums"] }}>{countdown}</Text>
            </View>
          </View>
        )}

        {/* ─── Winner Card ─── */}
        {isComplete && (
          <View style={{
            backgroundColor: isDraw ? "rgba(255,255,255,0.04)" : iWon ? "rgba(0,255,127,0.08)" : "rgba(239,68,68,0.06)",
            borderRadius: 24,
            borderWidth: 1,
            borderColor: isDraw ? "#2a2a2d" : iWon ? "rgba(0,255,127,0.25)" : "rgba(239,68,68,0.2)",
            padding: 20,
            marginBottom: 14,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Trophy color={isDraw ? "#777" : iWon ? NEON : "#ef4444"} size={20} />
              <Text style={{ color: isDraw ? "#777" : iWon ? "#fff" : "#ef4444", fontSize: 20, fontWeight: "900" }}>
                {isDraw ? "Draw" : iWon ? "You Won!" : "You Lost"}
              </Text>
            </View>

            <Text style={{ color: "#555", fontSize: 13, marginBottom: 4 }}>
              Winner: <Text style={{ color: "#fff", fontWeight: "700" }}>{winnerName}</Text>
            </Text>
            <Text style={{ color: "#555", fontSize: 13, marginBottom: 16 }}>
              Score: <Text style={{ color: NEON, fontWeight: "700" }}>{formatNumber(creatorSteps)}</Text>
              {" vs "}
              <Text style={{ color: "#999", fontWeight: "700" }}>{formatNumber(opponentSteps)}</Text>
              {" steps"}
            </Text>

            <TouchableOpacity
              onPress={handleShare}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                alignSelf: "flex-start",
                backgroundColor: iWon ? NEON : "#1f1f22",
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 12,
              }}
            >
              <Share2 color={iWon ? "#000" : "#aaa"} size={14} />
              <Text style={{ color: iWon ? "#000" : "#aaa", fontWeight: "800", fontSize: 13 }}>Share Result</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Battle Info ─── */}
        <View style={{
          backgroundColor: SURFACE,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "#1e1e22",
          padding: 16,
        }}>
          <Text style={{ color: "#555", fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Battle Info</Text>
          {[
            ["Battle ID", battleIdParam ? `${battleIdParam.slice(0, 8)}…` : "--"],
            ["Status", battle.status?.toUpperCase() || "ACTIVE"],
            ["Metric", battle.metric === "distance" ? "Distance (KM)" : "Steps"],
            ["Ends", battle.end_at ? new Date(battle.end_at).toLocaleString() : "--"],
          ].map(([label, value]) => (
            <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#1e1e22" }}>
              <Text style={{ color: "#555", fontSize: 13 }}>{label}</Text>
              <Text style={{ color: "#aaa", fontSize: 13, fontWeight: "600" }}>{value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
