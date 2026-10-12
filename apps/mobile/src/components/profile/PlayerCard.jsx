// The top of the profile: a player card with the level ring, identity, tier,
// XP progress and social counts.

import React from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin, Pencil } from "lucide-react-native";
import { compactNumber, formatNumber } from "@/utils/format";
import { AnimatedNumber, Body, Button, C, F, FadeIn, Label, Pill, ProgressBar, R, Row, S, TierBadge, Title } from "@/components/ui";
import { LevelRing } from "./shared";

export default function PlayerCard({ profile: p, onEdit }) {
  const colour = p.color || C.accent;
  const { level } = p;
  const toNext = Math.max(0, level.xpForNext - level.xpIntoLevel);
  const place = [p.area, p.city].filter(Boolean).join(", ");
  return (
    <FadeIn>
      <View style={{ borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: "hidden", backgroundColor: C.surface }}>
        <LinearGradient
          colors={[`${colour}2e`, `${colour}0a`, "rgba(20,20,22,0)"]}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {/* Faint oversized level number, for a bit of trading-card attitude. */}
        <Text
          style={{ position: "absolute", right: -6, top: -22, fontFamily: F.display, fontSize: 150, color: "rgba(255,255,255,0.035)", letterSpacing: -6 }}
          accessible={false}
        >
          {level.level}
        </Text>

        <View style={{ padding: S.xl }}>
          <Row gap={S.lg} style={{ alignItems: "center" }}>
            <LevelRing uri={p.avatar} name={p.name || p.username} colour={colour} size={104} progress={level.progress} level={level.level} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Title size={26} numberOfLines={1} adjustsFontSizeToFit style={{ letterSpacing: -0.6 }}>
                {p.name || p.username}
              </Title>
              <Body dim size={14} numberOfLines={1}>
                @{p.username}
              </Body>
              <Row gap={6} style={{ marginTop: S.sm, flexWrap: "wrap" }}>
                <Pill label={level.title.toUpperCase()} tone="accent" />
                {p.tier === "free" ? <Pill label="FREE" tone="neutral" /> : <TierBadge tier={p.tier} />}
              </Row>
              {place ? (
                <Row gap={4} style={{ marginTop: S.sm }}>
                  <MapPin size={12} color={C.textMute} />
                  <Body mute size={12} numberOfLines={1} style={{ flexShrink: 1 }}>
                    {place}
                  </Body>
                </Row>
              ) : null}
            </View>
          </Row>

          {p.bio ? (
            <Body size={14} dim style={{ marginTop: S.lg }}>
              {p.bio}
            </Body>
          ) : null}

          <View style={{ marginTop: S.xl }}>
            <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
              <View>
                <Label>Level {level.level} XP</Label>
                <Row gap={4} style={{ alignItems: "baseline", marginTop: 2 }}>
                  <AnimatedNumber value={level.xpIntoLevel} style={{ color: C.text, fontFamily: F.display, fontSize: 22, letterSpacing: -0.5 }} />
                  <Text style={{ color: C.textMute, fontFamily: F.displayMedium, fontSize: 14 }}>/ {formatNumber(level.xpForNext)}</Text>
                </Row>
              </View>
              <Body mute size={12} style={{ marginBottom: 3 }}>
                {formatNumber(toNext)} XP to level {level.level + 1}
              </Body>
            </Row>
            <ProgressBar value={level.progress} height={6} style={{ marginTop: S.sm }} colour={colour} />
          </View>

          <View style={{ height: 1, backgroundColor: C.border, marginVertical: S.lg }} />

          <Row gap={S.xl}>
            <Count value={p.followersCount} label="Followers" />
            <Count value={p.followingCount} label="Following" />
            <Count value={p.crewsCount} label={p.crewsCount === 1 ? "Crew" : "Crews"} />
            <View style={{ flex: 1 }} />
            <Button title="Edit" icon={Pencil} size="sm" variant="secondary" onPress={onEdit} style={{ height: 40 }} />
          </Row>
        </View>
      </View>
    </FadeIn>
  );
}

const Count = ({ value, label }) => (
  <View>
    <Text style={{ color: C.text, fontFamily: F.display, fontSize: 18 }}>{compactNumber(value)}</Text>
    <Text style={{ color: C.textMute, fontSize: 12 }}>{label}</Text>
  </View>
);
