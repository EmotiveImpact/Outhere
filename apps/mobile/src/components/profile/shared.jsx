// Small pieces shared by the profile screen and its edit sheet.

import React from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import { C, F } from "@/components/ui";

// Preset avatars. Stored on the profile as a plain image URL so every other
// screen (tab bar, leaderboards, crews) can show them with <Avatar uri>.
const dice = (style, seed) => `https://api.dicebear.com/9.x/${style}/png?seed=${seed}&size=256`;
export const PRESET_AVATARS = [
  dice("glass", "outhere-1"),
  dice("glass", "outhere-7"),
  dice("shapes", "outhere-3"),
  dice("shapes", "outhere-9"),
  dice("rings", "outhere-2"),
  dice("rings", "outhere-5"),
];

// Colours for the initials avatar.
export const AVATAR_COLOURS = ["#00ff7f", "#3DA9FC", "#9B5CFF", "#FF6B35", "#ffd700", "#ff4f8b"];

export const initialsOf = (name = "") =>
  name
    .split(/[\s._]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

/** The player's own avatar: their image, or initials on their chosen colour. */
export function MeAvatar({ uri, name, colour = C.accent, size = 88, ring = true }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        padding: ring ? 3 : 0,
        borderWidth: ring ? 2 : 0,
        borderColor: colour,
      }}
    >
      <View style={{ flex: 1, borderRadius: size, overflow: "hidden", backgroundColor: uri ? C.surfaceHigh : `${colour}26`, alignItems: "center", justifyContent: "center" }}>
        {uri ? (
          <Image source={{ uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={150} />
        ) : (
          <Text style={{ color: colour, fontFamily: F.display, fontSize: size * 0.34 }}>{initialsOf(name)}</Text>
        )}
      </View>
    </View>
  );
}
