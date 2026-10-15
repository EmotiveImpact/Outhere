// The top of the profile: a lit slab, the photo in its membership ring, name
// and membership line, then level progress and the social counts.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pencil } from "lucide-react-native";
import { compactNumber, formatNumber } from "@/utils/format";
import { AnimatedNumber, Avatar, Button, C, Card, F, FadeIn, ProgressBar, Row, S } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";

const MEMBER_LINE = {
  free: "Free member",
  pro: "Pro member",
  black: "Black member",
};

export function ProfileHero({ profile: p, right }) {
  const insets = useSafeAreaInsets();
  const words = (p.name || p.username || "").split(" ");
  const club = p.homeClubName || null;
  return (
    <View style={[styles.slab, { paddingTop: insets.top + S.sm }]}>
      <Image source={p.tier === "black" ? PHOTOS.blackhero : PHOTOS.hero} style={[StyleSheet.absoluteFill, { opacity: 0.38 }]} contentFit="cover" />
      <LinearGradient colors={["rgba(14,30,64,0.55)", "rgba(7,9,12,0.4)", C.bg]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <Row style={{ justifyContent: "flex-end", paddingHorizontal: S.gutter }}>{right}</Row>
      <Row gap={S.lg} style={styles.identity}>
        <Avatar uri={p.avatar} name={p.name || p.username} tier={p.tier} dot={p.isOutside ? "out" : null} size={104} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit>
            {words.join("\n")}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            Level {p.level.level}
            {club ? ` · ${club}` : p.area ? ` · ${p.area}` : ` · ${p.city}`}
          </Text>
          <Text style={[styles.member, p.tier === "pro" && { color: C.accentHi }, p.tier === "black" && { color: "#dfe4ea" }]} numberOfLines={1}>
            {MEMBER_LINE[p.tier] || MEMBER_LINE.free}
            {p.foundingNumber ? ` · founding #${p.foundingNumber}` : ""}
            {p.tier === "free" || !p.tier ? <Text style={{ color: C.accent }}> · Try Pro</Text> : null}
          </Text>
        </View>
      </Row>
    </View>
  );
}

export default function PlayerCard({ profile: p, onEdit }) {
  const { level } = p;
  const toNext = Math.max(0, level.xpForNext - level.xpIntoLevel);
  return (
    <FadeIn>
      <Card padding={S.lg}>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
          <Text style={styles.level}>Level {level.level}</Text>
          <Row gap={4} style={{ alignItems: "baseline" }}>
            <AnimatedNumber value={level.xpIntoLevel} format={formatNumber} style={styles.xp} />
            <Text style={styles.xpOf}>/ {formatNumber(level.xpForNext)} XP</Text>
          </Row>
        </Row>
        <ProgressBar value={level.progress} height={6} style={{ marginTop: S.sm }} />
        <Text style={styles.toNext}>
          {formatNumber(toNext)} XP to level {level.level + 1} · {level.title}
        </Text>
      </Card>

      {p.bio ? <Text style={styles.bio}>{p.bio}</Text> : null}

      <Row gap={S.xl} style={{ marginTop: S.lg }}>
        <Count value={p.followersCount} label="Followers" />
        <Count value={p.followingCount} label="Following" />
        <Count value={p.crewsCount} label={p.crewsCount === 1 ? "Crew" : "Crews"} />
        <View style={{ flex: 1 }} />
        <Button title="Edit" icon={Pencil} size="sm" variant="secondary" onPress={onEdit} />
      </Row>
    </FadeIn>
  );
}

const Count = ({ value, label }) => (
  <View>
    <Text style={{ color: C.text, fontFamily: F.display, fontSize: 22 }}>{compactNumber(value)}</Text>
    <Text style={{ color: C.textDim, fontFamily: F.body, fontSize: 12 }}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  slab: { paddingBottom: S.xl, marginBottom: S.md, overflow: "hidden" },
  identity: { paddingHorizontal: S.gutter, marginTop: 48, alignItems: "center" },
  name: { color: C.text, fontFamily: F.display, fontSize: 44, lineHeight: 42, textTransform: "uppercase" },
  meta: { color: C.textSoft, fontFamily: F.body, fontSize: 13, marginTop: 4 },
  member: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", marginTop: 6 },
  level: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  xp: { color: C.text, fontFamily: F.display, fontSize: 18 },
  xpOf: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  toNext: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: S.sm },
  bio: { color: C.textSoft, fontFamily: F.body, fontSize: 15, lineHeight: 21, marginTop: S.lg },
});
