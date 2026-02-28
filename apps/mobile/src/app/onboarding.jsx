import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ImageBackground,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useUserStore } from "@/store/userStore";
import { hapticHeavy, hapticSuccess, hapticSelection, hapticError } from "@/services/haptics";
import { userAPI, groupsAPI } from "@/services/api";
import { CITIES } from "@/constants/theme";
import { BlurView } from "expo-blur";
import { Check, X, Search, Users } from "lucide-react-native";

// Mock/Static list of major cities for autocomplete
const MAJOR_CITIES = [
  "London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Sheffield", 
  "Liverpool", "Bristol", "Edinburgh", "Leicester", "Coventry", "Belfast",
  "Paris", "Berlin", "New York", "Los Angeles", "Tokyo", "Lagos"
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const { deviceId, setOnboarded, setUser } = useUserStore();

  const [onboardUsername, setOnboardUsername] = useState("");
  const [onboardCity, setOnboardCity] = useState("");
  const [clubCode, setClubCode] = useState("");
  const [onboardLoading, setOnboardLoading] = useState(false);

  // Username Availability State
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState("idle"); // 'idle' | 'checking' | 'available' | 'taken' | 'error'

  // City Autocomplete State
  const [showCityResults, setShowCityResults] = useState(false);
  const [filteredCities, setFilteredCities] = useState([]);

  // Debounced Username Check
  useEffect(() => {
    if (onboardUsername.length < 3) {
      setUsernameStatus("idle");
      return;
    }

    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      try {
        // In real backend: await userAPI.checkUsername(onboardUsername)
        // For now, we mock valid if not 'admin' or 'dev'
        const isTaken = ["admin", "dev", "test", "root"].includes(onboardUsername.toLowerCase());
        
        if (isTaken) {
          setUsernameStatus("taken");
          hapticError();
        } else {
          setUsernameStatus("available");
        }
      } catch (err) {
        setUsernameStatus("error");
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [onboardUsername]);

  // City Filter
  useEffect(() => {
    if (onboardCity.length > 0) {
      const results = MAJOR_CITIES.filter(city => 
        city.toLowerCase().includes(onboardCity.toLowerCase())
      );
      setFilteredCities(results);
      setShowCityResults(results.length > 0 && onboardCity !== results[0]);
    } else {
      setShowCityResults(false);
    }
  }, [onboardCity]);

  const handleOnboard = async () => {
    if (!onboardUsername.trim() || usernameStatus !== "available") {
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
      city: onboardCity || "London",
      total_steps: 0,
      total_distance: 0,
      outside_score: 0,
      current_streak: 1,
      longest_streak: 1,
      daily_goal: 10000,
      weekly_goal: 20,
      avatar_color: "#00ff7f",
      is_outside: false,
    };

    try {
      // 1. Create User
      const apiUser = await userAPI.create(localUser);
      setUser(apiUser);

      // 2. Optional Group Join by Code
      if (clubCode.trim()) {
        try {
          await groupsAPI.joinByCode(clubCode.trim(), deviceId);
        } catch (e) {
          console.log("Failed to join squad by code during onboarding:", e);
        }
      }
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
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingTop: insets.top + 40,
              paddingBottom: insets.bottom + 40,
              paddingHorizontal: 28,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View>
              <Text style={{ color: "#fff", fontSize: 44, fontWeight: "900", letterSpacing: -1.5 }}>
                OUTHERE
              </Text>
              <Text style={{ color: "#00ff7f", fontSize: 18, fontWeight: "800", marginTop: 4, letterSpacing: 2 }}>
                WE OUTSIDE.
              </Text>
            </View>

            {/* Form */}
            <View style={{ marginTop: 40 }}>
              
              {/* Username Section */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                  <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
                    CHOOSE YOUR TAG
                  </Text>
                  {usernameStatus === "checking" && <ActivityIndicator size="small" color="#00ff7f" />}
                  {usernameStatus === "available" && <Text style={{ color: "#00ff7f", fontSize: 10, fontWeight: "800" }}>AVAILABLE</Text>}
                  {usernameStatus === "taken" && <Text style={{ color: "#ff453a", fontSize: 10, fontWeight: "800" }}>TAG TAKEN</Text>}
                </View>
                
                <View style={{ 
                  flexDirection: "row", 
                  alignItems: "center", 
                  backgroundColor: "rgba(20,20,22,0.8)", 
                  borderRadius: 20, 
                  paddingHorizontal: 18, 
                  paddingVertical: 16,
                  borderWidth: 1,
                  borderColor: usernameStatus === "taken" ? "#ff453a" : usernameStatus === "available" ? "#00ff7f" : "transparent"
                }}>
                  <Text style={{ color: "#555", fontSize: 18, marginRight: 8 }}>@</Text>
                  <TextInput
                    style={{ flex: 1, color: "#fff", fontSize: 18, fontWeight: "600" }}
                    value={onboardUsername}
                    onChangeText={setOnboardUsername}
                    placeholder="your username"
                    placeholderTextColor="#444"
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={20}
                  />
                  {usernameStatus === "available" && <Check size={20} color="#00ff7f" />}
                  {usernameStatus === "taken" && <X size={20} color="#ff453a" />}
                </View>
                {usernameStatus === "taken" && (
                  <Text style={{ color: "#ff453a", fontSize: 12, marginTop: 8, fontWeight: "600" }}>
                    That tag is already out there. Pick another.
                  </Text>
                )}
              </View>

              {/* City Autocomplete Section */}
              <View style={{ marginBottom: 24, zIndex: 10 }}>
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
                  YOUR CITY
                </Text>
                <View style={{ 
                  flexDirection: "row", 
                  alignItems: "center", 
                  backgroundColor: "rgba(20,20,22,0.8)", 
                  borderRadius: 20, 
                  paddingHorizontal: 18, 
                  paddingVertical: 16 
                }}>
                  <Search size={18} color="#555" style={{ marginRight: 12 }} />
                  <TextInput
                    style={{ flex: 1, color: "#fff", fontSize: 18, fontWeight: "600" }}
                    value={onboardCity}
                    onChangeText={setOnboardCity}
                    placeholder="e.g. London"
                    placeholderTextColor="#444"
                    onFocus={() => setShowCityResults(filteredCities.length > 0)}
                  />
                </View>

                {showCityResults && (
                  <View style={{ 
                    position: "absolute", 
                    top: 80, 
                    left: 0, 
                    right: 0, 
                    backgroundColor: "#161618", 
                    borderRadius: 20, 
                    padding: 8, 
                    borderWidth: 1,
                    borderColor: "#333",
                    zIndex: 100,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.5,
                    shadowRadius: 15,
                  }}>
                    {filteredCities.slice(0, 4).map((city) => (
                      <TouchableOpacity
                        key={city}
                        onPress={() => {
                          setOnboardCity(city);
                          setShowCityResults(false);
                          hapticSelection();
                        }}
                        style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: "#222" }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "600" }}>{city}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* SQUAD Code Section */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
                  SQUAD CODE (OPTIONAL)
                </Text>
                <View style={{ 
                  flexDirection: "row", 
                  alignItems: "center", 
                  backgroundColor: "rgba(20,20,22,0.8)", 
                  borderRadius: 20, 
                  paddingHorizontal: 18, 
                  paddingVertical: 16 
                }}>
                  <Users size={18} color="#555" style={{ marginRight: 12 }} />
                  <TextInput
                    style={{ flex: 1, color: "#fff", fontSize: 18, fontWeight: "600" }}
                    value={clubCode}
                    onChangeText={setClubCode}
                    placeholder="SQUAD JOIN CODE"
                    placeholderTextColor="#444"
                    autoCapitalize="characters"
                  />
                </View>
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 8 }}>
                  If you have an invite code for your squad, drop it here.
                </Text>
              </View>

            </View>

            {/* Bottom Section */}
            <View style={{ marginTop: "auto" }}>
              <TouchableOpacity
                onPress={handleOnboard}
                disabled={usernameStatus !== "available" || onboardLoading}
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: usernameStatus === "available" ? "#00ff7f" : "rgba(30,30,30,0.8)",
                  borderRadius: 20,
                  paddingVertical: 18,
                  opacity: usernameStatus === "available" ? 1 : 0.5,
                }}
              >
                <Text style={{ color: usernameStatus === "available" ? "#000" : "#888", fontSize: 17, fontWeight: "800", letterSpacing: 0.5 }}>
                  {onboardLoading ? "SETTING UP..." : "LET'S GO →"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleDevBypass} style={{ alignItems: "center", marginTop: 24, paddingVertical: 12 }}>
                <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>⚡ DEV BYPASS</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </BlurView>
    </ImageBackground>
  );
}

