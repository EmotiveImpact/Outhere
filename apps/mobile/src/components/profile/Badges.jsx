// Badges as medallions: earned ones glow, locked ones sit dim with a lock.
// Tap any medallion to see what it takes.

import React from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Flame, Lock, MapPin, Route, Star, Swords, Trophy, Users } from "lucide-react-native";
import { C, FadeIn, PressableScale, S, toast } from "@/components/ui";

const ICONS = { star: Star, flame: Flame, swords: Swords, trophy: Trophy, "map-pin": MapPin, users: Users, route: Route };
const SIZE = 68;

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
        style={
          b.earned
            ? { shadowColor: C.accent, shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 8, borderRadius: SIZE }
            : null
        }
      >
        {b.earned ? (
          <LinearGradient
            colors={["#7dffbc", C.accent, "#008f47"]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, padding: 3 }}
          >
            <LinearGradient
              colors={["#15291e", "#0a140f"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ flex: 1, borderRadius: SIZE, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(0,255,127,0.35)" }}
            >
              <Icon size={26} color={C.accent} strokeWidth={2.2} />
            </LinearGradient>
          </LinearGradient>
        ) : (
          <View
            style={{
              width: SIZE,
              height: SIZE,
              borderRadius: SIZE / 2,
              borderWidth: 2,
              borderColor: "#2a2a2f",
              borderStyle: "dashed",
              backgroundColor: "#111113",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={24} color="#3a3a40" strokeWidth={2} />
            <View
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: C.surfaceHigh,
                borderWidth: 2,
                borderColor: C.bg,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Lock size={11} color={C.textDim} />
            </View>
          </View>
        )}
      </View>
      <Text style={{ color: b.earned ? C.text : C.textDim, fontSize: 13, fontWeight: "700", marginTop: S.md, textAlign: "center" }} numberOfLines={1}>
        {b.title}
      </Text>
      <Text style={{ color: C.textMute, fontSize: 11, lineHeight: 14, marginTop: 2, textAlign: "center" }} numberOfLines={2}>
        {b.description}
      </Text>
    </PressableScale>
  );
}
