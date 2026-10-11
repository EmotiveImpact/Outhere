// Small pieces shared by the Crew tab, crew detail and create screens.

import React from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Globe, Lock } from "lucide-react-native";
import { create } from "zustand";
import { C, F, Pill } from "@/components/ui";

// Which crew the Crew tab shows. Other screens set it before sending the
// player to the tab (after creating or joining a crew, or "Open in Crew tab").
export const useCrewFocus = create((set) => ({
  crewId: null,
  focus: (crewId) => set({ crewId }),
}));

export const BADGE_COLOURS = {
  Bronze: "#cd7f32",
  Silver: "#c0c0c0",
  Gold: "#ffd700",
  Platinum: "#7fe3ff",
  Obsidian: "#e5e4e2",
};

// Weekly km needed for the next badge tier (mirrors engine.crewBadgeTier).
const BADGE_STEPS = [
  ["Silver", 50],
  ["Gold", 120],
  ["Platinum", 200],
  ["Obsidian", 300],
];

export const nextBadge = (weekKm) => BADGE_STEPS.find(([, km]) => weekKm < km) || null;

export const ROLE_LABEL = { owner: "Owner", admin: "Admin", member: "Member" };

export const BadgePill = ({ tier, style }) => {
  const colour = BADGE_COLOURS[tier] || C.textDim;
  return (
    <View
      style={[
        { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, height: 22, borderRadius: 99, backgroundColor: `${colour}22`, alignSelf: "flex-start" },
        style,
      ]}
    >
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colour }} />
      <Text style={{ color: colour, fontSize: 11, fontWeight: "700", letterSpacing: 0.4 }}>{(tier || "").toUpperCase()}</Text>
    </View>
  );
};

export const PrivacyPill = ({ privacy, style }) =>
  privacy === "invite" ? <Pill label="Invite only" icon={Lock} style={style} /> : <Pill label="Public" icon={Globe} style={style} />;

/** Crew logo, or the crew's initials on its accent colour. */
export function CrewLogo({ crew, size = 52, radius }) {
  const r = radius ?? size * 0.3;
  const accent = crew?.accent || C.accent;
  const initials = (crew?.name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        overflow: "hidden",
        backgroundColor: `${accent}26`,
        borderWidth: 1.5,
        borderColor: accent,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {crew?.logo ? (
        <Image source={{ uri: crew.logo }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={150} />
      ) : (
        <Text style={{ color: accent, fontFamily: F.display, fontSize: size * 0.36 }}>{initials}</Text>
      )}
    </View>
  );
}

/** Row of round swatches for picking a crew accent colour. */
export function AccentPicker({ colours, value, onChange }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {colours.map((c) => {
        const active = c.toLowerCase() === (value || "").toLowerCase();
        return (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            accessibilityRole="button"
            accessibilityLabel={`Accent ${c}`}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: active ? C.text : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c }} />
          </Pressable>
        );
      })}
    </View>
  );
}
