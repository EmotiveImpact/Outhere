// The top of your profile: a photo slab, your photo in its membership ring
// overlapping it, your name, level and club, and the membership line. Then
// the level card with XP to the next level.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatNumber } from "@/utils/format";
import { AnimatedNumber, Avatar, C, Card, F, FadeIn, PressableScale, ProgressBar, Row, S } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { MemberLine } from "./parts";

const SLAB = 196;

export function ProfileHero({ profile: p, clubName, right, onTryPro, onAvatar }) {
  const insets = useSafeAreaInsets();
  const place = clubName || p.area || p.city;
  return (
    <View>
      <View style={[styles.slab, { height: SLAB + insets.top }]}>
        <Image source={p.tier === "black" ? PHOTOS.blackhero : PHOTOS.hero} style={[StyleSheet.absoluteFill, { opacity: 0.55 }]} contentFit="cover" />
        <LinearGradient colors={["rgba(14,30,64,0.45)", "rgba(7,9,12,0.2)", "rgba(7,9,12,0.85)"]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <Row style={{ position: "absolute", top: insets.top + S.sm, right: S.gutter }}>{right}</Row>
      </View>
      <Row gap={S.lg} style={styles.identity}>
        <PressableScale onPress={onAvatar} scaleTo={0.96} accessibilityLabel="Edit your photo">
          <View style={styles.avatarWell}>
            <Avatar uri={p.avatar} name={p.name || p.username} tier={p.tier} dot={p.isOutside ? "out" : null} size={104} />
          </View>
        </PressableScale>
        <View style={{ flex: 1, minWidth: 0, paddingTop: 50 }}>
          <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit>
            {p.name || p.username}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            Level {p.level.level}
            {place ? ` · ${place}` : ""}
          </Text>
          <MemberLine tier={p.tier} foundingNumber={p.tier === "black" ? p.foundingNumber : null} onTryPro={onTryPro} />
        </View>
      </Row>
    </View>
  );
}

export function LevelCard({ level, onPress }) {
  return (
    <FadeIn>
      <Card padding={S.lg} onPress={onPress}>
        <Row style={{ justifyContent: "space-between", alignItems: "baseline" }}>
          <Text style={styles.level}>Level {level.level}</Text>
          <Row gap={4} style={{ alignItems: "baseline" }}>
            <AnimatedNumber value={level.xpIntoLevel + (level.nextLevelAt - level.xpForNext)} format={formatNumber} style={styles.xp} />
            <Text style={styles.xpOf}>/ {formatNumber(level.nextLevelAt)} XP</Text>
          </Row>
        </Row>
        <ProgressBar value={level.progress} height={6} style={{ marginTop: S.md }} />
      </Card>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  slab: { overflow: "hidden", borderBottomLeftRadius: 30, borderBottomRightRadius: 30, backgroundColor: "#0b0e13" },
  identity: { paddingHorizontal: S.gutter, marginTop: -58, alignItems: "flex-start" },
  avatarWell: { borderRadius: 60, padding: 4, backgroundColor: C.bg },
  name: { color: C.text, fontFamily: F.display, fontSize: 34, lineHeight: 36, textTransform: "uppercase" },
  meta: { color: C.textSoft, fontFamily: F.body, fontSize: 13, marginTop: 2 },
  level: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  xp: { color: C.textSoft, fontFamily: F.body, fontSize: 13 },
  xpOf: { color: C.textDim, fontFamily: F.body, fontSize: 13 },
});
