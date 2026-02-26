import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ImageBackground,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useUserStore } from "@/store/userStore";
import { hapticHeavy, hapticSuccess, hapticSelection, hapticError } from "@/services/haptics";
import { userAPI } from "@/services/api";
import { CITIES } from "@/constants/theme";
import { BlurView } from "expo-blur";

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const { deviceId, setOnboarded, setUser } = useUserStore();

  const [onboardUsername, setOnboardUsername] = useState("");
  const [onboardCity, setOnboardCity] = useState("London");
  const [onboardLoading, setOnboardLoading] = useState(false);

  const handleOnboard = async () => {
    if (!onboardUsername.trim()) {
      hapticError();
      return;
    }
    setOnboardLoading(true);
    hapticSelection();
    
    const localUser = {
      id: deviceId || "local",
      device_id: deviceId || "local",
      username: onboardUsername.trim(),
      name: onboardUsername.trim(),
      city: onboardCity,
      borough: "Central",
      total_steps: 0,
      total_distance: 0,
      outside_score: 0,
      current_streak: 0,
      longest_streak: 0,
      daily_goal: 10000,
      weekly_goal: 20,
      avatar_color: "#00ff7f",
      is_outside: false,
    };

    try {
      const apiUser = await userAPI.create(localUser);
      setUser(apiUser);
    } catch {
      setUser(localUser);
    }

    await setOnboarded(true);
    setOnboardLoading(false);
    hapticSuccess();
    router.replace("/(tabs)");
  };

  const handleDevBypass = async () => {
    hapticSelection();
    setUser({
      id: deviceId || "dev",
      device_id: deviceId || "dev",
      username: "dev_user",
      name: "Dev",
      city: "London",
      borough: "Central",
      total_steps: 4200,
      total_distance: 3.2,
      outside_score: 42,
      current_streak: 3,
      longest_streak: 7,
      daily_goal: 10000,
      weekly_goal: 20,
      avatar_color: "#00ff7f",
      is_outside: true,
    });
    await setOnboarded(true);
    router.replace("/(tabs)");
  };

  return (
    <ImageBackground 
      source={require("../../assets/images/onboarding_bg.png")} 
      style={{ flex: 1, backgroundColor: "#0a0a0a" }}
    >
      <BlurView intensity={80} tint="dark" style={{ flex: 1 }}>
        <StatusBar style="light" />
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 60,
            paddingBottom: insets.bottom + 40,
            paddingHorizontal: 28,
            justifyContent: "space-between",
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View>
            <Text style={{ color: "#fff", fontSize: 44, fontWeight: "900", letterSpacing: -1.5, fontFamily: "ClashGrotesk-Bold" }}>
              OUT HERE
            </Text>
            <Text style={{ color: "#00ff7f", fontSize: 18, fontWeight: "800", marginTop: 4, letterSpacing: 2 }}>
              WE OUTSIDE.
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, marginTop: 24, lineHeight: 24 }}>
              Track your steps, compete with your city, stay outside.
            </Text>
          </View>

          {/* Form */}
          <View style={{ marginTop: 40, flex: 1, justifyContent: "center" }}>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
              CHOOSE YOUR TAG
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(20,20,22,0.8)", borderRadius: 20, paddingHorizontal: 18, paddingVertical: 16 }}>
              <Text style={{ color: "#555", fontSize: 18, marginRight: 8 }}>@</Text>
              <TextInput
                style={{ flex: 1, color: "#fff", fontSize: 18, fontWeight: "600" }}
                value={onboardUsername}
                onChangeText={setOnboardUsername}
                placeholder="your username"
                placeholderTextColor="#555"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
              />
            </View>

            {/* City selector */}
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 28, marginBottom: 12 }}>
              YOUR CITY
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 50 }}>
              {CITIES.map((c) => (
                <TouchableOpacity
                  key={c.name}
                  onPress={() => { hapticSelection(); setOnboardCity(c.name); }}
                  style={{
                    backgroundColor: onboardCity === c.name ? "rgba(0,255,127,0.15)" : "rgba(20,20,22,0.8)",
                    borderRadius: 14,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    marginRight: 8,
                    borderWidth: onboardCity === c.name ? 1 : 0,
                    borderColor: "rgba(0,255,127,0.5)",
                  }}
                >
                  <Text style={{ color: onboardCity === c.name ? "#00ff7f" : "#aaa", fontSize: 14, fontWeight: "600" }}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* GO button */}
          <View style={{ marginTop: 32 }}>
            <TouchableOpacity
              onPress={handleOnboard}
              disabled={!onboardUsername.trim() || onboardLoading}
              style={{
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: onboardUsername.trim() ? "#00ff7f" : "rgba(30,30,30,0.8)",
                borderRadius: 20,
                paddingVertical: 18,
                opacity: onboardUsername.trim() ? 1 : 0.5,
              }}
            >
              <Text style={{ color: onboardUsername.trim() ? "#000" : "#888", fontSize: 17, fontWeight: "800", letterSpacing: 0.5 }}>
                {onboardLoading ? "SETTING UP..." : "LET'S GO →"}
              </Text>
            </TouchableOpacity>

            {/* DEV BYPASS */}
            <TouchableOpacity onPress={handleDevBypass} style={{ alignItems: "center", marginTop: 20, paddingVertical: 12, backgroundColor: "rgba(20,20,20,0.5)", borderRadius: 14, borderWidth: 1, borderColor: "#333", borderStyle: "dashed" }}>
              <Text style={{ color: "#888", fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>⚡ DEV BYPASS</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </BlurView>
    </ImageBackground>
  );
}
