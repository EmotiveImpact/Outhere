import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Lock, ShieldCheck } from "lucide-react-native";
import { Body, C, Card, F, ProgressBar, Row, S } from "@/components/ui";
import { useCountUp } from "./CrewHero";
import { BadgeMedal, CrewLogo, memberCountLabel } from "./shared";

/** Discover card: logo, name, one meta line and the week's progress. */
export default function CrewCard({ crew, onPress, right, style }) {
  const goal = crew.weeklyGoalKm || 100;
  const weekKm = Number(crew.weekKm) || 0;
  const bar = useCountUp(goal ? weekKm / goal : 0);

  return (
    <Card onPress={onPress} style={[{ marginBottom: S.md }, style]}>
      <Row gap={S.md} style={{ alignItems: "flex-start" }}>
        <CrewLogo crew={crew} size={48} />
        <View style={{ flex: 1 }}>
          <Row gap={6}>
            <Text style={styles.name} numberOfLines={1}>
              {crew.name}
            </Text>
            {crew.verified ? <ShieldCheck size={14} color={C.textDim} /> : null}
          </Row>
          {crew.tagline ? (
            <Body dim size={13} numberOfLines={1} style={{ marginTop: 2 }}>
              {crew.tagline}
            </Body>
          ) : null}
        </View>
        {right}
      </Row>

      <Row gap={6} style={{ marginTop: S.lg }}>
        <BadgeMedal tier={crew.badgeTier} size={16} />
        <Body mute size={13} numberOfLines={1} style={{ flex: 1 }}>
          {crew.city} · {memberCountLabel(crew.memberCount)}
        </Body>
        {crew.privacy === "invite" ? <Lock size={13} color={C.textMute} accessibilityLabel="Invite only" /> : null}
      </Row>

      <Row style={{ justifyContent: "space-between", alignItems: "baseline", marginTop: S.md, marginBottom: 6 }}>
        <Body mute size={13}>This week</Body>
        <Text style={styles.km}>
          {weekKm.toFixed(0)}
          <Text style={styles.kmGoal}> / {goal} km</Text>
        </Text>
      </Row>
      <ProgressBar value={bar} height={4} colour={C.textDim} />
    </Card>
  );
}

const styles = StyleSheet.create({
  name: { color: C.text, fontFamily: F.display, fontSize: 17, flexShrink: 1 },
  km: { color: C.text, fontFamily: F.display, fontSize: 14 },
  kmGoal: { color: C.textMute, fontFamily: F.displayMedium, fontSize: 13 },
});
