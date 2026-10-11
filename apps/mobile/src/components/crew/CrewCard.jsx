import React from "react";
import { View } from "react-native";
import { MapPin, ShieldCheck, Users } from "lucide-react-native";
import { Body, C, Card, Row, S, Title } from "@/components/ui";
import { formatKm } from "@/utils/format";
import { BadgePill, CrewLogo, PrivacyPill } from "./shared";

/** Discover card: logo on the crew accent, city, members, badge and privacy. */
export default function CrewCard({ crew, onPress, right }) {
  return (
    <Card onPress={onPress} padding={0} style={{ overflow: "hidden", marginBottom: S.md }}>
      <View style={{ height: 3, backgroundColor: crew.accent || C.accent }} />
      <View style={{ padding: S.lg, gap: S.md }}>
        <Row gap={S.md} style={{ alignItems: "flex-start" }}>
          <CrewLogo crew={crew} size={52} />
          <View style={{ flex: 1, gap: 4 }}>
            <Row gap={6}>
              <Title size={18} numberOfLines={1} style={{ flexShrink: 1 }}>
                {crew.name}
              </Title>
              {crew.verified ? <ShieldCheck size={15} color={C.black} /> : null}
            </Row>
            {crew.tagline ? (
              <Body dim size={13} numberOfLines={2}>
                {crew.tagline}
              </Body>
            ) : null}
          </View>
          {right}
        </Row>
        <Row gap={S.md} style={{ flexWrap: "wrap" }}>
          <Row gap={4}>
            <MapPin size={13} color={C.textMute} />
            <Body mute size={12}>{crew.city}</Body>
          </Row>
          <Row gap={4}>
            <Users size={13} color={C.textMute} />
            <Body mute size={12}>
              {crew.memberCount} {crew.memberCount === 1 ? "member" : "members"}
            </Body>
          </Row>
          <Body mute size={12}>{formatKm(crew.weekKm, "km", 0)} this week</Body>
        </Row>
        <Row gap={S.sm}>
          <BadgePill tier={crew.badgeTier} />
          <PrivacyPill privacy={crew.privacy} />
        </Row>
      </View>
    </Card>
  );
}
