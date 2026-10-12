// Small pieces shared by the Crew tab, crew detail and create screens.

import React, { useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import Svg, { Path } from "react-native-svg";
import { Check, Globe, Lock } from "lucide-react-native";
import { create } from "zustand";
import { Avatar, C, Cover, F, LiveDot, Pill, PressableScale } from "@/components/ui";

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

export const crewAccent = (crew) => crew?.accent || C.accent;

export const playerName = (p) => (p?.isMe ? "You" : p?.name || p?.username || "Former member");

export const memberCountLabel = (n) => `${n} ${n === 1 ? "member" : "members"}`;

const initialsOf = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

// Hexagonal medal, flat in the tier colour. Reads as a badge, not a tag.
const HEX = "M12 1.5 L21.5 7 L21.5 17 L12 22.5 L2.5 17 L2.5 7 Z";

export function BadgeMedal({ tier, size = 28 }) {
  const colour = BADGE_COLOURS[tier] || C.textDim;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" style={{ position: "absolute" }}>
        <Path d={HEX} fill={colour} />
      </Svg>
      <Text style={{ color: "rgba(0,0,0,0.72)", fontFamily: F.display, fontSize: size * 0.36, marginTop: 1 }}>{(tier || "?")[0]}</Text>
    </View>
  );
}

/** Medal plus tier name, for crew headers. Neutral pill; the medal carries the colour. */
export const BadgePill = ({ tier, style, size = "sm" }) => {
  const big = size === "lg";
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingLeft: 3,
          paddingRight: big ? 12 : 10,
          height: big ? 32 : 26,
          borderRadius: 99,
          backgroundColor: C.surfaceHigh,
          alignSelf: "flex-start",
        },
        style,
      ]}
    >
      <BadgeMedal tier={tier} size={big ? 26 : 20} />
      <Text style={{ color: C.text, fontSize: big ? 13 : 12, fontWeight: "600" }}>{tier}</Text>
    </View>
  );
};

export const PrivacyPill = ({ privacy, style }) =>
  privacy === "invite" ? <Pill label="Invite only" icon={Lock} style={style} /> : <Pill label="Public" icon={Globe} style={style} />;

/**
 * Crew logo: the crew's route art in its accent with a monogram, and the
 * uploaded logo on top when it loads. Every crew looks distinct offline.
 */
export function CrewLogo({ crew, size = 52, radius, ring = true }) {
  const r = radius ?? size * 0.3;
  const accent = crewAccent(crew);
  const [failed, setFailed] = useState(false);
  const logo = crew?.logo && !failed ? crew.logo : null;
  return (
    <Cover
      seed={`crew:${crew?.id || crew?.name || "new"}`}
      accent={accent}
      style={{
        width: size,
        height: size,
        borderRadius: r,
        borderWidth: ring ? 1.5 : 0,
        borderColor: accent,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: C.text,
          fontFamily: F.display,
          fontSize: size * 0.36,
          letterSpacing: -0.5,
          textShadowColor: "rgba(0,0,0,0.6)",
          textShadowRadius: 6,
        }}
      >
        {initialsOf(crew?.name)}
      </Text>
      {logo ? (
        <Image
          source={typeof logo === "string" ? { uri: logo } : logo}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
          transition={200}
          onError={() => setFailed(true)}
        />
      ) : null}
    </Cover>
  );
}

/**
 * Player avatar for crew screens: coloured initials in the player's colour,
 * the photo on top only once it has loaded, and an optional live dot.
 */
export function PlayerAvatar({ player, size = 40, ring, outside = false, style }) {
  const [failed, setFailed] = useState(false);
  const uri = player?.avatar && !failed ? player.avatar : null;
  const inset = ring ? 2 : 0;
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Avatar name={player?.name || player?.username || ""} colour={player?.color} size={size} ring={ring} />
      {uri ? (
        <Image
          source={typeof uri === "string" ? { uri } : uri}
          onError={() => setFailed(true)}
          contentFit="cover"
          transition={200}
          style={{ position: "absolute", top: inset, left: inset, width: size - inset * 2, height: size - inset * 2, borderRadius: size }}
        />
      ) : null}
      {outside ? (
        <View style={{ position: "absolute", right: -1, bottom: -1, padding: 2, borderRadius: 99, backgroundColor: C.bg }}>
          <LiveDot size={Math.max(8, size * 0.22)} />
        </View>
      ) : null}
    </View>
  );
}

/** Overlapping avatars with a "+n" chip when there are more. */
export function AvatarStack({ players = [], total, size = 28, max = 4, ringColour = C.surface }) {
  const shown = players.slice(0, max);
  const extra = Math.max(0, (total ?? players.length) - shown.length);
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {shown.map((p, i) => (
        <PlayerAvatar key={p.id || i} player={p} size={size} ring={ringColour} style={{ marginLeft: i ? -size * 0.32 : 0, zIndex: max - i }} />
      ))}
      {extra > 0 ? (
        <View
          style={{
            marginLeft: -size * 0.32,
            height: size,
            minWidth: size,
            paddingHorizontal: 6,
            borderRadius: size,
            backgroundColor: C.surfaceHigh,
            borderWidth: 2,
            borderColor: ringColour,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: C.textDim, fontSize: size * 0.36, fontWeight: "700" }}>+{extra}</Text>
        </View>
      ) : null}
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
          <PressableScale
            key={c}
            onPress={() => onChange(c)}
            scaleTo={0.88}
            accessibilityLabel={`Accent ${c}`}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              borderWidth: 2,
              borderColor: active ? c : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, alignItems: "center", justifyContent: "center" }}>
              {active ? <Check size={16} color="#000" strokeWidth={3} /> : null}
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}
