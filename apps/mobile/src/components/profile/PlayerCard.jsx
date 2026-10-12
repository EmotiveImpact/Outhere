// The top of the profile: avatar in its level ring, identity, XP progress and
// social counts on one calm card.

import React from "react";
import { Text, View } from "react-native";
import { Pencil } from "lucide-react-native";
import { compactNumber, formatNumber } from "@/utils/format";
import { AnimatedNumber, Body, Button, C, Card, Divider, F, FadeIn, ProgressBar, Row, S, TierBadge, Title } from "@/components/ui";
import { LevelRing } from "./shared";

export default function PlayerCard({ profile: p, onEdit }) {
  const colour = p.color || C.accent;
  const { level } = p;
  const toNext = Math.max(0, level.xpForNext - level.xpIntoLevel);
  const place = [p.area, p.city].filter(Boolean).join(", ");
  return (
    <FadeIn>
      <Card padding={S.xl}>
        <Row gap={S.lg} style={{ alignItems: "center" }}>
          <LevelRing uri={p.avatar} name={p.name || p.username} colour={colour} size={88} progress={level.progress} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Row gap={S.sm}>
              <Title size={24} numberOfLines={1} style={{ letterSpacing: -0.5, flexShrink: 1 }}>
                {p.name || p.username}
              </Title>
              <TierBadge tier={p.tier} />
            </Row>
            <Body dim size={13} numberOfLines={1} style={{ marginTop: 2 }}>
              @{p.username}
            </Body>
            <Body mute size={13} numberOfLines={1} style={{ marginTop: 2 }}>
              Level {level.level} · {level.title}
              {place ? ` · ${place}` : ""}
            </Body>
          </View>
        </Row>

        {p.bio ? (
          <Body size={15} dim style={{ marginTop: S.lg }}>
            {p.bio}
          </Body>
        ) : null}

        <View style={{ marginTop: S.xl }}>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
            <Row gap={4} style={{ alignItems: "baseline" }}>
              <AnimatedNumber value={level.xpIntoLevel} style={{ color: C.text, fontFamily: F.display, fontSize: 20, letterSpacing: -0.4 }} />
              <Text style={{ color: C.textMute, fontFamily: F.displayMedium, fontSize: 14 }}>/ {formatNumber(level.xpForNext)} XP</Text>
            </Row>
            <Body mute size={13}>
              {formatNumber(toNext)} to level {level.level + 1}
            </Body>
          </Row>
          <ProgressBar value={level.progress} height={4} style={{ marginTop: S.sm }} />
        </View>

        <Divider style={{ marginVertical: S.lg }} />

        <Row gap={S.xl}>
          <Count value={p.followersCount} label="Followers" />
          <Count value={p.followingCount} label="Following" />
          <Count value={p.crewsCount} label={p.crewsCount === 1 ? "Crew" : "Crews"} />
          <View style={{ flex: 1 }} />
          <Button title="Edit" icon={Pencil} size="sm" variant="secondary" onPress={onEdit} />
        </Row>
      </Card>
    </FadeIn>
  );
}

const Count = ({ value, label }) => (
  <View>
    <Text style={{ color: C.text, fontFamily: F.display, fontSize: 18 }}>{compactNumber(value)}</Text>
    <Text style={{ color: C.textDim, fontSize: 13 }}>{label}</Text>
  </View>
);
