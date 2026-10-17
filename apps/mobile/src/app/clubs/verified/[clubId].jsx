// Your club is official (clubVerified): the verified seal floating in the
// slab's light, then what it unlocks as a plain list (.r11un), not cards.

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Calendar, Share2, Swords, Users, X, Zap } from "@/components/ui/icons";
import { Button, C, F, Row, S, Screen, Skeleton } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { useCrew } from "@/data/hooks";
import { shareInvite } from "@/components/crew/CrewSettings";
import { useCrewFocus } from "@/components/crew/shared";
import { GlassRound, ObjectSlab } from "@/components/clubs/parts";

const UNLOCKS = [
  [Users, "Your crew is live", "Members join from your page or your invite link"],
  [Calendar, "Club runs with check-in", "Your weekly runs become events people can join"],
  [Swords, "Club v club", "Friendlies now, the Club League from next season"],
  [Zap, "Free Pro for organisers", "Plus club kit once you hit 25 members"],
];

export default function ClubVerified() {
  const { clubId } = useLocalSearchParams();
  const id = String(clubId || "");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const focus = useCrewFocus((s) => s.focus);
  const { data: crew } = useCrew(id);

  if (!crew) {
    return (
      <Screen>
        <Skeleton height={320} radius={26} style={{ marginTop: S.lg }} />
      </Screen>
    );
  }

  const date = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  const open = () => {
    focus(id);
    router.dismissTo("/(tabs)/club");
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }}>
        <ObjectSlab
          height={330}
          object={PHOTOS.verified}
          objectSize={240}
          objectTop={20}
          size={40}
          left={<GlassRound icon={X} label="Close" onPress={open} />}
          right={<GlassRound icon={Share2} label="Share your club" onPress={() => shareInvite(crew)} />}
          kicker={`Verified · ${date}`}
        >
          <Text style={styles.big} numberOfLines={2} adjustsFontSizeToFit>
            {crew.name}
          </Text>
          <Text style={styles.big}>
            is <Text style={styles.blue}>official</Text>
          </Text>
        </ObjectSlab>

        <View style={{ paddingHorizontal: 18, marginTop: 16, gap: 10, flex: 1 }}>
          {UNLOCKS.map(([Icon, title, line]) => (
            <Row key={title} gap={12} style={{ paddingVertical: 4 }}>
              {/* .lic: a round blue-tinted icon */}
              <View style={styles.lic}>
                <LinearGradient colors={["rgba(61,139,255,0.2)", "rgba(61,139,255,0.08)"]} style={[StyleSheet.absoluteFill, { borderRadius: 17 }]} />
                <View>
                  <Icon size={16} color={C.accentHi} />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.line}>{line}</Text>
              </View>
            </Row>
          ))}
          <View style={{ flex: 1, minHeight: 24 }} />
          <Button title="Invite your members" size="md" full onPress={() => shareInvite(crew)} />
          <Button title="Open your club" variant="ghost" size="sm" full onPress={open} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  big: { color: C.text, fontFamily: F.display, fontSize: 40, lineHeight: 39, textTransform: "uppercase", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 30, textShadowOffset: { width: 0, height: 2 } },
  blue: { color: "#4b93ff" },
  lic: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(130,180,255,0.3), inset 0 0 0 1px rgba(61,139,255,0.15)" },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5 },
  line: { color: C.textDim, fontFamily: F.body, fontSize: 11.5, marginTop: 2 },
});
