import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { CalendarDays, Clock3, MapPin, Users, Zap } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useOutsideScrollPersistence } from "@/hooks/useOutsideScrollPersistence";
import { hapticSelection } from "@/services/haptics";

const NEON = "#00ff7f";
const SURFACE = "#161618";

const EVENTS = [
  {
    id: "e1",
    title: "City Night Run",
    city: "London",
    location: "Southbank",
    date: "Sat, Mar 1 · 7:00 PM",
    organizer: "outHere",
    rsvpCount: 89,
    capacity: 150,
    xpReward: 200,
  },
  {
    id: "e2",
    title: "Crew Link-Up",
    city: "London",
    location: "Victoria Park",
    date: "Sun, Mar 2 · 10:00 AM",
    organizer: "crew",
    rsvpCount: 34,
    capacity: 60,
    xpReward: 100,
  },
  {
    id: "e3",
    title: "Sponsor Pop-Up Miles",
    city: "London",
    location: "Canary Wharf",
    date: "Tue, Mar 4 · 6:30 PM",
    organizer: "sponsor",
    rsvpCount: 112,
    capacity: 200,
    xpReward: 300,
  },
  {
    id: "e4",
    title: "Morning Move Club",
    city: "Manchester",
    location: "Piccadilly Gardens",
    date: "Wed, Mar 5 · 6:00 AM",
    organizer: "outHere",
    rsvpCount: 22,
    capacity: 40,
    xpReward: 150,
  },
  {
    id: "e5",
    title: "Urban Exploration Walk",
    city: "London",
    location: "Shoreditch",
    date: "Fri, Mar 7 · 3:00 PM",
    organizer: "crew",
    rsvpCount: 47,
    capacity: 80,
    xpReward: 125,
  },
];

const ORGANIZER_COLORS = {
  outHere: NEON,
  crew: "#a78bfa",
  sponsor: "#fbbf24",
};

export default function OutsideEventsScreen() {
  const { scrollRef, handleScroll } = useOutsideScrollPersistence("events");
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar style="light" />
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Section Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              color: "#555",
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            Upcoming
          </Text>
          <Text style={{ color: "#444", fontSize: 12, fontWeight: "600" }}>
            {EVENTS.length} events
          </Text>
        </View>

        {EVENTS.map((event) => {
          const fillPct = Math.min(100, (event.rsvpCount / event.capacity) * 100);
          const organizerColor = ORGANIZER_COLORS[event.organizer] || NEON;

          return (
            <TouchableOpacity
              key={event.id}
              activeOpacity={0.85}
              onPress={() => {
                hapticSelection();
                router.push(`/events/${event.id}`);
              }}
              style={{
                backgroundColor: SURFACE,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "#232326",
                padding: 16,
                marginBottom: 12,
              }}
            >
              {/* Top row: Title + organizer badge */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 16, fontWeight: "800", flex: 1 }}
                  numberOfLines={1}
                >
                  {event.title}
                </Text>
                <View
                  style={{
                    backgroundColor: `${organizerColor}15`,
                    borderWidth: 1,
                    borderColor: `${organizerColor}30`,
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    marginLeft: 10,
                  }}
                >
                  <Text
                    style={{
                      color: organizerColor,
                      fontSize: 10,
                      fontWeight: "700",
                      textTransform: "uppercase",
                    }}
                  >
                    {event.organizer}
                  </Text>
                </View>
              </View>

              {/* Location row */}
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                <MapPin color="#9efac8" size={13} />
                <Text
                  style={{
                    color: "#9efac8",
                    fontSize: 12,
                    fontWeight: "700",
                    marginLeft: 6,
                  }}
                >
                  {event.city} · {event.location}
                </Text>
              </View>

              {/* Date row */}
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                <Clock3 color="#666" size={12} />
                <Text style={{ color: "#666", fontSize: 12, marginLeft: 6 }}>
                  {event.date}
                </Text>
              </View>

              {/* Bottom row: RSVP bar + XP reward + RSVP button */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Users color="#777" size={11} />
                      <Text style={{ color: "#777", fontSize: 11, fontWeight: "600" }}>
                        {event.rsvpCount}/{event.capacity}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <Zap color={NEON} size={10} fill={NEON} />
                      <Text style={{ color: NEON, fontSize: 10, fontWeight: "700" }}>
                        +{event.xpReward} XP
                      </Text>
                    </View>
                  </View>
                  <View
                    style={{
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: "#232326",
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        width: `${fillPct}%`,
                        height: "100%",
                        backgroundColor: "rgba(0,255,127,0.5)",
                        borderRadius: 2,
                      }}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => hapticSelection()}
                  style={{
                    backgroundColor: "rgba(0,255,127,0.12)",
                    borderWidth: 1,
                    borderColor: "rgba(0,255,127,0.3)",
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                  }}
                >
                  <Text style={{ color: NEON, fontSize: 12, fontWeight: "800" }}>
                    RSVP
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
