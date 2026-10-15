// Your club is official: the verified seal and what it unlocks.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Calendar, Swords, Users, X, Zap } from "lucide-react-native";
import {
  Body,
  Button,
  C,
  F,
  IconButton,
  R,
  Row,
  S,
  Screen,
  Skeleton,
} from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { useCrew } from "@/data/hooks";
import { shareInvite } from "@/components/crew/CrewSettings";
import { useCrewFocus } from "@/components/crew/shared";

const UNLOCKS = [
  [
    Users,
    "Your crew is live",
    "Members join from your page or your invite link",
  ],
  [
    Calendar,
    "Club runs with check-in",
    "Your weekly runs become events people can join",
  ],
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

  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });
  const open = () => {
    focus(id);
    router.dismissTo("/(tabs)/club");
  };

  return (
    <Screen padded={false} style={{ paddingTop: 0 }}>
      <View style={[styles.slab, { paddingTop: insets.top }]}>
        <Image
          source={PHOTOS.verified}
          style={[styles.seal, { marginTop: insets.top + S.lg }]}
          contentFit="contain"
        />
        <Row style={[styles.top, { top: insets.top + S.sm }]}>
          <IconButton icon={X} onPress={open} label="Close" />
        </Row>
        <View style={{ padding: S.gutter }}>
          <Text style={styles.kick}>Verified · {date}</Text>
          <Text style={styles.big} numberOfLines={2} adjustsFontSizeToFit>
            {crew.name}
          </Text>
          <Text style={styles.big}>
            is <Text style={{ color: C.accent }}>official</Text>
          </Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: S.gutter, marginTop: S.lg, gap: S.sm }}>
        {UNLOCKS.map(([Icon, title, line]) => (
          <Row key={title} gap={S.md} style={styles.unlock}>
            <View style={styles.icon}>
              <Icon size={18} color={C.accentHi} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              <Body dim size={13}>
                {line}
              </Body>
            </View>
          </Row>
        ))}
        <Button
          title="Invite your members"
          size="lg"
          full
          onPress={() => shareInvite(crew)}
          style={{ marginTop: S.lg }}
        />
        <Button
          title="Open your club"
          variant="secondary"
          full
          onPress={open}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // The seal art sits on pure black, so the slab is pure black too.
  slab: {
    overflow: "hidden",
    backgroundColor: "#000",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  seal: { width: 200, height: 200, alignSelf: "center" },
  top: { position: "absolute", right: S.gutter },
  kick: {
    color: C.accentHi,
    fontFamily: F.bodySemi,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  big: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 40,
    lineHeight: 42,
    textTransform: "uppercase",
  },
  unlock: {
    padding: S.md,
    borderRadius: R.lg,
    backgroundColor: C.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    backgroundColor: C.accentDim,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
});
