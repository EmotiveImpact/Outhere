import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Zap, Flame, MapPin, Share2 } from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import ConfettiCannon from "react-native-confetti-cannon";
import { useMoveStore, formatDuration, formatPace } from "@/store/useMoveStore";
import { useUserStore } from "@/store/userStore";
import { hapticHeavy, hapticSuccess, hapticSelection } from "@/services/haptics";

// Mock "who's moving now" — will be replaced with real club data
const MOVING_NOW = [
  { id: "1", name: "Sarah", avatar: "https://i.pravatar.cc/150?img=1" },
  { id: "2", name: "Mike", avatar: "https://i.pravatar.cc/150?img=2" },
  { id: "3", name: "Jazz", avatar: "https://i.pravatar.cc/150?img=3" },
];

export default function MoveScreen() {
  const insets = useSafeAreaInsets();

  // Read from userStore directly — no need to call usePedometer again (it's running in index.jsx)
  const streak = useUserStore((s) => s.streak);
  const xp = useUserStore((s) => s.xp);
  const earnXP = useUserStore((s) => s.earnXP);
  const updateStreak = useUserStore((s) => s.updateStreak);
  const todayStats = useUserStore((s) => s.todayStats);

  // Read pedometer totals from the store (updated by usePedometer in index.jsx)
  // We store current steps in todayStats.steps via updateTodayStats
  const allDaySteps = todayStats?.steps ?? 0;
  const allDayDistanceKm = todayStats?.distance ?? 0;

  const isActive = useMoveStore((s) => s.isActive);
  const sessionSteps = useMoveStore((s) => s.sessionSteps);
  const sessionDistance = useMoveStore((s) => s.sessionDistance);
  const sessionDurationSecs = useMoveStore((s) => s.sessionDurationSecs);
  const lastSession = useMoveStore((s) => s.lastSession);
  const startSession = useMoveStore((s) => s.startSession);
  const updateSessionSteps = useMoveStore((s) => s.updateSessionSteps);
  const stopSession = useMoveStore((s) => s.stopSession);

  // Pulsing animation for the MOVE button (only when idle)
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const animRef = useRef(null);

  useEffect(() => {
    if (!isActive && !lastSession) {
      animRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      );
      animRef.current.start();
    } else {
      if (animRef.current) animRef.current.stop();
      pulseAnim.setValue(1);
    }

    return () => {
      if (animRef.current) animRef.current.stop();
    };
  }, [isActive, lastSession]);

  // Feed live all-day steps into session delta
  useEffect(() => {
    if (isActive && allDaySteps > 0) {
      updateSessionSteps(allDaySteps);
    }
  }, [allDaySteps, isActive]);

  const handleStart = () => {
    hapticHeavy();
    startSession(allDaySteps);
  };

  const handleStop = async () => {
    hapticSuccess();
    const session = await stopSession();
    if (session && session.xpEarned > 0) {
      await earnXP(session.xpEarned);
      await updateStreak();
    }
  };

  const handleDismissSummary = () => {
    useMoveStore.setState({ lastSession: null });
  };

  const pace = formatPace(sessionSteps, sessionDurationSecs);

  // ── SUMMARY STATE ────────────────────────────────────────────────────────────
  if (lastSession) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
        <StatusBar style="light" />
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 40,
            paddingBottom: insets.bottom + 60,
            paddingHorizontal: 24,
          }}
        >
          {/* Header */}
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <Text style={{ color: "#00ff7f", fontSize: 13, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>
              Session Complete
            </Text>
            <Text style={{ color: "#fff", fontSize: 38, fontWeight: "900", letterSpacing: -1.5, marginTop: 8 }}>
              GREAT MOVE
            </Text>
          </View>

          {/* Big stats card */}
          <View style={{
            backgroundColor: "#161618",
            borderRadius: 32,
            padding: 28,
            shadowColor: "#00ff7f",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.08,
            shadowRadius: 24,
          }}>
            <View style={{ alignItems: "center", marginBottom: 28 }}>
              <Text style={{ color: "#555", fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>
                STEPS
              </Text>
              <Text style={{ color: "#fff", fontSize: 64, fontWeight: "900", letterSpacing: -2 }}>
                {lastSession.steps.toLocaleString()}
              </Text>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text style={{ color: "#555", fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>DISTANCE</Text>
                <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", letterSpacing: -0.5 }}>{lastSession.distance}</Text>
                <Text style={{ color: "#555", fontSize: 11, marginTop: 2 }}>km</Text>
              </View>
              <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text style={{ color: "#555", fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>TIME</Text>
                <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", letterSpacing: -0.5 }}>{formatDuration(lastSession.durationSecs)}</Text>
                <Text style={{ color: "#555", fontSize: 11, marginTop: 2 }}>min</Text>
              </View>
              <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.06)" }} />
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text style={{ color: "#555", fontSize: 10, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>PACE</Text>
                <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", letterSpacing: -0.5 }}>{formatPace(lastSession.steps, lastSession.durationSecs)}</Text>
                <Text style={{ color: "#555", fontSize: 11, marginTop: 2 }}>/km</Text>
              </View>
            </View>
          </View>

          {/* XP + Streak earned */}
          <View style={{ flexDirection: "row", marginTop: 20 }}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,255,127,0.08)", borderRadius: 20, padding: 18, alignItems: "center", borderWidth: 1, borderColor: "rgba(0,255,127,0.15)", marginRight: 10 }}>
              <Zap color="#00ff7f" size={20} />
              <Text style={{ color: "#00ff7f", fontSize: 22, fontWeight: "900", marginTop: 8, letterSpacing: -0.5 }}>+{lastSession.xpEarned}</Text>
              <Text style={{ color: "#555", fontSize: 11, fontWeight: "600", marginTop: 2 }}>XP EARNED</Text>
            </View>
            {streak > 0 && (
              <View style={{ flex: 1, backgroundColor: "rgba(0,255,127,0.08)", borderRadius: 20, padding: 18, alignItems: "center", borderWidth: 1, borderColor: "rgba(0,255,127,0.15)" }}>
                <Flame color="#00ff7f" size={20} />
                <Text style={{ color: "#00ff7f", fontSize: 22, fontWeight: "900", marginTop: 8 }}>{streak}</Text>
                <Text style={{ color: "#555", fontSize: 11, fontWeight: "600", marginTop: 2 }}>DAY STREAK</Text>
              </View>
            )}
          </View>

        {lastSession.xpEarned > 0 && (
          <ConfettiCannon
            count={60}
            origin={{ x: -10, y: 0 }}
            fadeOut={true}
            fallSpeed={3000}
            autoStart={true}
          />
        )}

          {/* Actions */}
          <View style={{ marginTop: 20 }}>
            <TouchableOpacity
              style={{ backgroundColor: "#161618", borderRadius: 20, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 12 }}
              onPress={() => hapticSelection()}
            >
              <Share2 color="#fff" size={16} />
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700", marginLeft: 8 }}>Share Session</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleDismissSummary} style={{ alignItems: "center", paddingVertical: 14 }}>
              <Text style={{ color: "#555", fontSize: 14, fontWeight: "600" }}>Back to MOVE</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── ACTIVE STATE ─────────────────────────────────────────────────────────────
  if (isActive) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
        <StatusBar style="light" />
        <View style={{
          flex: 1,
          paddingTop: insets.top + 20,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 80,
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          {/* Live indicator */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#ff4444", marginRight: 8 }} />
            <Text style={{ color: "#ff4444", fontSize: 13, fontWeight: "700", letterSpacing: 1.5 }}>
              LIVE · {formatDuration(sessionDurationSecs)}
            </Text>
          </View>

          {/* Main step counter */}
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "#00ff7f", fontSize: 80, fontWeight: "900", letterSpacing: -3, lineHeight: 88 }}>
              {sessionSteps.toLocaleString()}
            </Text>
            <Text style={{ color: "#555", fontSize: 16, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 4 }}>
              STEPS
            </Text>

            {/* Sub stats */}
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 28 }}>
              <View style={{ alignItems: "center", marginRight: 32 }}>
                <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800", letterSpacing: -0.5 }}>{sessionDistance.toFixed(2)}</Text>
                <Text style={{ color: "#555", fontSize: 11, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>KM</Text>
              </View>
              <View style={{ width: 1, height: 40, backgroundColor: "rgba(255,255,255,0.06)", marginRight: 32 }} />
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800", letterSpacing: -0.5 }}>{pace}</Text>
                <Text style={{ color: "#555", fontSize: 11, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>PACE</Text>
              </View>
            </View>
          </View>

          {/* Broadcast pill */}
          <TouchableOpacity
            onPress={() => hapticSelection()}
            style={{ backgroundColor: "rgba(0,255,127,0.08)", borderWidth: 1, borderColor: "rgba(0,255,127,0.2)", borderRadius: 20, paddingHorizontal: 20, paddingVertical: 12, flexDirection: "row", alignItems: "center" }}
          >
            <MapPin color="#00ff7f" size={14} />
            <Text style={{ color: "#00ff7f", fontSize: 13, fontWeight: "700", marginLeft: 8, letterSpacing: 0.5 }}>BROADCAST: I'M OUTSIDE</Text>
          </TouchableOpacity>

          {/* STOP button */}
          <TouchableOpacity
            onPress={handleStop}
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: "#ff4444",
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#ff4444",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.4,
              shadowRadius: 20,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "900", letterSpacing: 1 }}>STOP</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── IDLE STATE ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar style="light" />
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 10,
        }}
      >
        {/* TOP SECTION: Header & Active Movers */}
        <View style={{ paddingHorizontal: 24 }}>
          {/* Header */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <View>
              <Text style={{ color: "#555", fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" }}>READY TO</Text>
              <Text style={{ color: "#fff", fontSize: 34, fontWeight: "900", letterSpacing: -1.5, marginTop: 2 }}>RUN</Text>
            </View>
            <View style={{ backgroundColor: "#1c1c1e", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#2c2c2e" }}>
              <Zap color="#00ff7f" size={14} fill="#00ff7f" />
              <Text style={{ color: "#00ff7f", fontWeight: "800", fontSize: 14, marginLeft: 8 }}>{(xp || 0).toLocaleString()} XP</Text>
            </View>
          </View>

          {/* Who's moving now */}
          <View style={{ backgroundColor: "#161618", borderRadius: 28, padding: 20, borderWidth: 1, borderColor: "#1c1c1e" }}>
            <Text style={{ color: "#666", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>
              WHO'S MOVING NOW
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {MOVING_NOW.map((person, i) => (
                  <View key={person.id} style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    marginLeft: i === 0 ? 0 : -12,
                    borderWidth: 2.5,
                    borderColor: "#161618",
                    overflow: "hidden",
                    backgroundColor: "#222"
                  }}>
                    <Image source={{ uri: person.avatar }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                  </View>
                ))}
              </View>
              <View style={{ marginLeft: 16 }}>
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>{MOVING_NOW.length} Active</Text>
                <Text style={{ color: "#555", fontSize: 12, marginTop: 2 }}>From your club</Text>
              </View>
            </View>
          </View>
        </View>

        {/* MIDDLE SECTION: Centered Hero Orb (Absolute to guarantee dead center) */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", zIndex: 1, pointerEvents: "box-none" }}>
          <Animated.View style={{ 
            transform: [{ scale: pulseAnim }],
            shadowColor: "#00ff7f",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.45,
            shadowRadius: 50,
          }}>
            <TouchableOpacity
              onPress={handleStart}
              activeOpacity={0.8}
              style={{
                width: 200,
                height: 200,
                borderRadius: 100,
                backgroundColor: "#00ff7f",
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 8,
                borderColor: "rgba(0, 255, 127, 0.15)",
              }}
            >
              <Text style={{ color: "#000", fontSize: 32, fontWeight: "950", letterSpacing: 1 }}>MOVE</Text>
              <Text style={{ color: "rgba(0,0,0,0.4)", fontSize: 11, fontWeight: "800", marginTop: 4, letterSpacing: 1.5 }}>TAP TO START</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Spacer to push stats to the bottom */}
        <View style={{ flex: 1 }} />

        {/* BOTTOM SECTION: Today's Stats */}
        <View style={{ paddingHorizontal: 24, zIndex: 10 }}>
          <View style={{ backgroundColor: "#161618", borderRadius: 28, padding: 24, borderWidth: 1, borderColor: "#1c1c1e" }}>
            <Text style={{ color: "#666", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 20, textAlign: "center" }}>
              TODAY SO FAR
            </Text>
            
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {/* Col 1 */}
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontSize: 26, fontWeight: "900", letterSpacing: -1 }}>
                  {allDaySteps > 0 ? allDaySteps.toLocaleString() : "0"}
                </Text>
                <Text style={{ color: "#555", fontSize: 10, marginTop: 6, fontWeight: "700", letterSpacing: 1 }}>STEPS</Text>
              </View>

              <View style={{ width: 1, height: 30, backgroundColor: "#222" }} />

              {/* Col 2 */}
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontSize: 26, fontWeight: "900", letterSpacing: -1 }}>
                  {allDayDistanceKm > 0 ? allDayDistanceKm.toFixed(1) : "0.0"}
                </Text>
                <Text style={{ color: "#555", fontSize: 10, marginTop: 6, fontWeight: "700", letterSpacing: 1 }}>KM</Text>
              </View>

              <View style={{ width: 1, height: 30, backgroundColor: "#222" }} />

              {/* Col 3 */}
              <View style={{ flex: 1, alignItems: "center" }}>
                {streak > 0 ? (
                  <>
                    <Text style={{ color: "#00ff7f", fontSize: 26, fontWeight: "900", letterSpacing: -1 }}>{streak}</Text>
                    <Text style={{ color: "#555", fontSize: 10, marginTop: 6, fontWeight: "700", letterSpacing: 1 }}>STREAK</Text>
                  </>
                ) : (
                  <>
                    <Text style={{ color: "#222", fontSize: 26, fontWeight: "900" }}>--</Text>
                    <Text style={{ color: "#444", fontSize: 10, marginTop: 6, fontWeight: "700", letterSpacing: 1 }}>STREAK</Text>
                  </>
                )}
              </View>
            </View>
          </View>
          
          {/* GPS + Streak status - Footer style */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 12 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#00ff7f", marginRight: 8, shadowColor: "#00ff7f", shadowOpacity: 0.5, shadowRadius: 4 }} />
              <Text style={{ color: "#444", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 }}>GPS ACTIVE</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 12 }}>
              <Flame color={streak > 0 ? "#00ff7f" : "#222"} size={12} style={{ marginRight: 6 }} />
              <Text style={{ color: "#444", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 }}>
                {streak > 0 ? `${streak}D STREAK` : "STREAK IDLE"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
