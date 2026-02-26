import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Switch, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Bell, 
  Shield, 
  HelpCircle, 
  LogOut,
  Activity
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useSettingsStore } from "@/utils/settingsStore";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

const SettingRow = ({ icon: Icon, iconBgColor, title, subtitle, rightElement, onPress, isLast }) => (
  <View>
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: iconBgColor,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 16,
        }}
      >
        <Icon color="#fff" size={18} strokeWidth={2.5} />
      </View>
      
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Text style={{ color: "#fff", fontSize: 17, fontWeight: "500" }}>{title}</Text>
        {subtitle && (
          <Text style={{ color: "#8E8E93", fontSize: 13, marginTop: 2 }}>{subtitle}</Text>
        )}
      </View>
      
      <View style={{ paddingLeft: 8 }}>
        {rightElement || <ChevronRight color="#8E8E93" size={20} />}
      </View>
    </TouchableOpacity>
    
    {!isLast && (
      <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginLeft: 64 }} />
    )}
  </View>
);

const SettingsGroup = ({ title, children }) => (
  <View style={{ marginBottom: 32 }}>
    {title && (
      <Text style={{ 
        color: "#8E8E93", 
        fontSize: 13, 
        fontWeight: "600",
        textTransform: "uppercase", 
        letterSpacing: 1,
        marginLeft: 20, 
        marginBottom: 8 
      }}>
        {title}
      </Text>
    )}
    <BlurView
      intensity={30}
      tint="dark"
      style={{
        marginHorizontal: 16,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: "rgba(28, 28, 30, 0.6)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
      }}
    >
      {children}
    </BlurView>
  </View>
);

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showSteps, toggleMetric } = useSettingsStore();

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <LinearGradient
        colors={["#121212", "#0a0a0a"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      
      <View style={{ paddingTop: insets.top, flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ 
              width: 40, 
              height: 40, 
              alignItems: "center", 
              justifyContent: "center",
              marginLeft: -8
            }}
          >
            <ChevronLeft color="#fff" size={28} />
          </TouchableOpacity>
          <Text style={{ 
            color: "#fff", 
            fontFamily: "ClashGrotesk-Medium",
            fontSize: 28, 
            marginLeft: 4,
            letterSpacing: 0.5
          }}>
            Settings
          </Text>
        </View>

        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingTop: 16 }}
          showsVerticalScrollIndicator={false}
        >
          <SettingsGroup title="Preferences">
            <SettingRow
              icon={Activity}
              iconBgColor="#00ff7f"
              title="Leaderboard Metric"
              subtitle="Show steps instead of distance"
              rightElement={
                <Switch
                  value={showSteps}
                  onValueChange={toggleMetric}
                  trackColor={{ false: "#3a3a3c", true: "#00d4aa" }}
                  thumbColor="#fff"
                  ios_backgroundColor="#3a3a3c"
                />
              }
            />
            <SettingRow
              icon={Bell}
              iconBgColor="#FF9500"
              title="Notifications"
              isLast
            />
          </SettingsGroup>

          <SettingsGroup title="Account">
            <SettingRow
              icon={User}
              iconBgColor="#007AFF"
              title="Edit Profile"
            />
            <SettingRow
              icon={Shield}
              iconBgColor="#34C759"
              title="Privacy"
            />
            <SettingRow
              icon={HelpCircle}
              iconBgColor="#5856D6"
              title="Help & Support"
              isLast
            />
          </SettingsGroup>
          
          <SettingsGroup>
            <SettingRow
              icon={LogOut}
              iconBgColor="#FF3B30"
              title="Log Out"
              rightElement={<View />}
              isLast
            />
          </SettingsGroup>
        </ScrollView>
      </View>
    </View>
  );
}
