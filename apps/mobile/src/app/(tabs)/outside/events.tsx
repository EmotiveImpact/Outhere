import React from "react";
import { ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { CalendarDays, MapPin } from "lucide-react-native";

const NEON = "#00ff7f";

const PLACEHOLDERS = [
  { id: "e1", title: "City Night Run", location: "Southbank" },
  { id: "e2", title: "Crew Link-Up", location: "Victoria Park" },
  { id: "e3", title: "Sponsor Pop-Up", location: "Canary Wharf" },
];

export default function OutsideEventsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <StatusBar style="light" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <CalendarDays color={NEON} size={18} />
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800", marginLeft: 8 }}>
            Events
          </Text>
        </View>

        {PLACEHOLDERS.map((event) => (
          <View
            key={event.id}
            style={{
              backgroundColor: "#161618",
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "#232326",
              padding: 16,
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>
              {event.title}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
              <MapPin color="#9efac8" size={13} />
              <Text style={{ color: "#9efac8", fontSize: 12, fontWeight: "700", marginLeft: 6 }}>
                {event.location}
              </Text>
            </View>
            <Text style={{ color: "#777", fontSize: 12, marginTop: 8 }}>
              Event details and RSVP live here.
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
