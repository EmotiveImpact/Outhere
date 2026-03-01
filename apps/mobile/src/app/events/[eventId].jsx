import React, { useMemo, useState } from "react";
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
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Ticket,
  Trophy,
} from "lucide-react-native";
import { eventsAPI } from "@/services/api";
import { useUserStore } from "@/store/userStore";

const NEON = "#00ff7f";

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time TBA";
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { eventId } = useLocalSearchParams();
  const deviceId = useUserStore((state) => state.deviceId);
  const setUser = useUserStore((state) => state.setUser);

  const [actionMessage, setActionMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: event,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => eventsAPI.get(eventId),
    enabled: !!eventId,
    refetchInterval: 30000,
  });

  const rsvpCount = Array.isArray(event?.rsvps) ? event.rsvps.length : 0;
  const checkinCount = Array.isArray(event?.checkins) ? event.checkins.length : 0;

  const isRsvped = useMemo(() => {
    if (!deviceId || !Array.isArray(event?.rsvps)) return false;
    return event.rsvps.includes(deviceId);
  }, [event?.rsvps, deviceId]);

  const isCheckedIn = useMemo(() => {
    if (!deviceId || !Array.isArray(event?.checkins)) return false;
    return event.checkins.includes(deviceId);
  }, [event?.checkins, deviceId]);

  const handleRSVP = async () => {
    if (!deviceId || !eventId) return;
    setIsSubmitting(true);
    setActionMessage("");
    try {
      const response = await eventsAPI.rsvp(eventId, deviceId);
      await refetch();
      setActionMessage(
        response?.already_rsvped ? "You already RSVPed." : "RSVP confirmed."
      );
    } catch (error) {
      setActionMessage(error?.data?.detail || "Could not RSVP right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckIn = async () => {
    if (!deviceId || !eventId) return;
    setIsSubmitting(true);
    setActionMessage("");
    try {
      const response = await eventsAPI.checkIn(eventId, deviceId);
      if (response?.user) {
        setUser(response.user);
      }
      await refetch();
      if (response?.already_checked_in) {
        setActionMessage("Already checked in.");
      } else {
        setActionMessage(
          `Checked in. +${response?.xp_awarded || 0} XP · +${response?.out_awarded || 0} OUT`
        );
      }
    } catch (error) {
      setActionMessage(error?.data?.detail || "Check-in not available yet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !event) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0a0a0a",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={NEON} />
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
          <Text style={{ color: "#aaa", marginLeft: 6, fontWeight: "700" }}>
            Back
          </Text>
        </TouchableOpacity>

        <View
          style={{
            backgroundColor: "#161618",
            borderRadius: 24,
            padding: 20,
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <CalendarDays color={NEON} size={18} />
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800", marginLeft: 8 }}>
              Event Detail
            </Text>
          </View>
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800" }}>
            {event.title}
          </Text>
          <Text style={{ color: "#888", fontSize: 13, marginTop: 10, lineHeight: 20 }}>
            {event.description}
          </Text>
          <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
              <MapPin color="#9efac8" size={14} />
              <Text style={{ color: "#9efac8", marginLeft: 6, fontWeight: "700" }}>
                {event.city} • {event.location}
              </Text>
            </View>
            <Text style={{ color: "#aaa", fontSize: 12 }}>
              Starts: {formatDateTime(event.start_at)}
            </Text>
            <Text style={{ color: "#aaa", fontSize: 12, marginTop: 2 }}>
              Ends: {formatDateTime(event.end_at)}
            </Text>
            <Text style={{ color: "#666", fontSize: 11, marginTop: 6 }}>
              Check-in window: 1 hour before start until 1 hour after end
            </Text>
          </View>
        </View>

        <View
          style={{
            backgroundColor: "#161618",
            borderRadius: 24,
            padding: 20,
            marginBottom: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Ticket color={NEON} size={16} />
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800", marginLeft: 8 }}>
              Attendance
            </Text>
          </View>
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {rsvpCount} RSVPs
            {event.capacity > 0 ? ` / ${event.capacity}` : ""}
          </Text>
          <Text style={{ color: "#aaa", marginTop: 4 }}>{checkinCount} checked in</Text>

          <View style={{ flexDirection: "row", marginTop: 14 }}>
            <TouchableOpacity
              disabled={isSubmitting || !deviceId}
              onPress={handleRSVP}
              style={{
                flex: 1,
                backgroundColor: isRsvped ? "#1f1f21" : NEON,
                borderRadius: 12,
                paddingVertical: 11,
                alignItems: "center",
                marginRight: 8,
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              <Text style={{ color: isRsvped ? "#bbb" : "#000", fontWeight: "800" }}>
                {isRsvped ? "RSVPed" : "RSVP"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={isSubmitting || !deviceId}
              onPress={handleCheckIn}
              style={{
                flex: 1,
                backgroundColor: isCheckedIn ? "#1f1f21" : "rgba(0,255,127,0.12)",
                borderRadius: 12,
                paddingVertical: 11,
                alignItems: "center",
                borderWidth: 1,
                borderColor: isCheckedIn ? "#2a2a2d" : "rgba(0,255,127,0.35)",
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              <Text style={{ color: isCheckedIn ? "#bbb" : "#9efac8", fontWeight: "800" }}>
                {isCheckedIn ? "Checked In" : "Check In"}
              </Text>
            </TouchableOpacity>
          </View>

          {!!actionMessage && (
            <Text style={{ color: "#9efac8", fontSize: 12, marginTop: 10 }}>
              {actionMessage}
            </Text>
          )}
        </View>

        <View
          style={{
            backgroundColor: "rgba(0,255,127,0.08)",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "rgba(0,255,127,0.25)",
            padding: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Trophy color={NEON} size={16} />
            <Text style={{ color: "#fff", fontWeight: "800", marginLeft: 8 }}>
              Check-In Rewards
            </Text>
          </View>
          <Text style={{ color: "#9efac8", fontWeight: "700" }}>
            Event check-in awards XP + OUT and unlocks an event badge.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
