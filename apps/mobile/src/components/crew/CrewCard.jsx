import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Lock, MapPin, ShieldCheck } from "lucide-react-native";
import { Body, C, Card, Cover, F, ProgressBar, Row, S, Title } from "@/components/ui";
import { useCountUp } from "./CrewHero";
import { AvatarStack, BadgeMedal, CrewLogo, crewAccent, memberCountLabel } from "./shared";

/** Discover card: a band of crew route art, logo, members and weekly km. */
export default function CrewCard({ crew, onPress, right, style }) {
  const accent = crewAccent(crew);
  const goal = crew.weeklyGoalKm || 100;
  const weekKm = Number(crew.weekKm) || 0;
  const bar = useCountUp(goal ? weekKm / goal : 0);

  return (
    <Card onPress={onPress} padding={0} style={[{ overflow: "hidden", marginBottom: S.md }, style]}>
      <Cover seed={`crew:${crew.id}`} accent={accent} style={styles.band}>
        <LinearGradient colors={["transparent", "rgba(20,20,22,0.9)"]} style={StyleSheet.absoluteFill} />
        <Row gap={6} style={styles.bandTop}>
          {crew.privacy === "invite" ? (
            <View style={styles.chip}>
              <Lock size={11} color={C.text} />
              <Text style={styles.chipText}>Invite only</Text>
            </View>
          ) : null}
          <View style={[styles.chip, { paddingLeft: 2 }]}>
            <BadgeMedal tier={crew.badgeTier} size={18} />
            <Text style={styles.chipText}>{crew.badgeTier}</Text>
          </View>
        </Row>
      </Cover>

      <View style={styles.body}>
        <Row gap={S.md} style={{ alignItems: "flex-end", marginTop: -34 }}>
          <View style={styles.logoRing}>
            <CrewLogo crew={crew} size={56} />
          </View>
          <View style={{ flex: 1 }} />
          {right}
        </Row>

        <Row gap={6} style={{ marginTop: S.sm }}>
          <Title size={18} numberOfLines={1} style={{ flexShrink: 1 }}>
            {crew.name}
          </Title>
          {crew.verified ? <ShieldCheck size={15} color={C.black} /> : null}
        </Row>
        {crew.tagline ? (
          <Body dim size={13} numberOfLines={2} style={{ marginTop: 2 }}>
            {crew.tagline}
          </Body>
        ) : null}

        <Row gap={S.sm} style={{ marginTop: S.md }}>
          {crew.previewMembers?.length ? <AvatarStack players={crew.previewMembers} total={crew.memberCount} size={24} max={3} /> : null}
          <Body mute size={12} style={{ flex: 1 }} numberOfLines={1}>
            {memberCountLabel(crew.memberCount)}
          </Body>
          <Row gap={3}>
            <MapPin size={12} color={C.textMute} />
            <Body mute size={12}>{crew.city}</Body>
          </Row>
        </Row>

        <View style={{ marginTop: S.md }}>
          <Row style={{ justifyContent: "space-between", marginBottom: 6 }}>
            <Text style={styles.kmLabel}>THIS WEEK</Text>
            <Text style={styles.km}>
              {weekKm.toFixed(0)}
              <Text style={styles.kmGoal}> / {goal} km</Text>
            </Text>
          </Row>
          <ProgressBar value={bar} colour={accent} height={6} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  band: { height: 84 },
  bandTop: { position: "absolute", top: S.md, right: S.md },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, height: 24, paddingHorizontal: 8, borderRadius: 99, backgroundColor: "rgba(0,0,0,0.55)" },
  chipText: { color: C.text, fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  body: { paddingHorizontal: S.lg, paddingBottom: S.lg },
  logoRing: { padding: 3, borderRadius: 22, backgroundColor: C.surface },
  kmLabel: { color: C.textMute, fontSize: 11, fontWeight: "700", letterSpacing: 1.1 },
  km: { color: C.text, fontFamily: F.display, fontSize: 14 },
  kmGoal: { color: C.textMute, fontFamily: F.displayMedium, fontSize: 12 },
});
