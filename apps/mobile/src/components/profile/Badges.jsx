// Badges as plain medallions: earned ones are lit, locked ones sit dim with a
// small lock. Tap any medallion to see what it takes.

import React from "react";
import { Text, View } from "react-native";
import { Flame, Lock, MapPin, Route, Star, Swords, Trophy, Users } from "lucide-react-native";
import { C, FadeIn, PressableScale, S, toast } from "@/components/ui";

const ICONS = { star: Star, flame: Flame, swords: Swords, trophy: Trophy, "map-pin": MapPin, users: Users, route: Route };
const SIZE = 64;

export default function Badges({ badges }) {
  // Earned first, so the shelf leads with what you've done.
  const list = [...badges].sort((a, b) => Number(b.earned) - Number(a.earned));
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: S.xl }}>
      {list.map((b, i) => (
        <FadeIn key={b.id} index={i} style={{ width: "33.33%" }}>
          <Medallion badge={b} />
        </FadeIn>
      ))}
    </View>
  );
}

function Medallion({ badge: b }) {
  const Icon = ICONS[b.icon] || Star;
  const show = () => (b.earned ? toast.success(b.title, b.description) : toast(`${b.title} is locked`, b.description));
  return (
    <PressableScale onPress={show} scaleTo={0.92} accessibilityLabel={`${b.title}. ${b.earned ? "Earned" : "Locked"}. ${b.description}`} style={{ alignItems: "center", paddingHorizontal: 4 }}>
      <View
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          backgroundColor: b.earned ? C.surfaceHigh : C.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={24} color={b.earned ? C.text : C.textMute} strokeWidth={2} />
        {b.earned ? null : (
          <View
            style={{
              position: "absolute",
              bottom: -2,
              right: -2,
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: C.surfaceHigh,
              borderWidth: 2,
              borderColor: C.bg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Lock size={10} color={C.textDim} />
          </View>
        )}
      </View>
      <Text style={{ color: b.earned ? C.text : C.textDim, fontSize: 13, fontWeight: "600", marginTop: S.md, textAlign: "center" }} numberOfLines={1}>
        {b.title}
      </Text>
    </PressableScale>
  );
}
