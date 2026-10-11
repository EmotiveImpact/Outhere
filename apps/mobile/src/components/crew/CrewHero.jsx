import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin, ShieldCheck } from "lucide-react-native";
import { Avatar, Body, C, F, Label, ProgressBar, Row, S, Title } from "@/components/ui";
import { BadgePill, BADGE_COLOURS, CrewLogo, PrivacyPill, ROLE_LABEL, nextBadge } from "./shared";

/** Crew header: logo, name, tagline, badge tier and the weekly goal. */
export default function CrewHero({ crew, showRole = true }) {
  const accent = crew.accent || C.accent;
  const goal = crew.weeklyGoalKm || 0;
  const progress = goal > 0 ? crew.weekKm / goal : 0;
  const next = nextBadge(crew.weekKm);
  const members = crew.previewMembers || [];

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={[`${accent}33`, `${accent}08`, "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Row gap={S.md} style={{ alignItems: "flex-start" }}>
        <CrewLogo crew={crew} size={64} />
        <View style={{ flex: 1, gap: 4 }}>
          <Row gap={6}>
            <Title size={24} numberOfLines={2} style={{ flexShrink: 1 }}>
              {crew.name}
            </Title>
            {crew.verified ? <ShieldCheck size={17} color={C.black} /> : null}
          </Row>
          {crew.tagline ? <Body dim size={14}>{crew.tagline}</Body> : null}
          <Row gap={4} style={{ marginTop: 2 }}>
            <MapPin size={13} color={C.textMute} />
            <Body mute size={12}>
              {crew.city} · {crew.memberCount} {crew.memberCount === 1 ? "member" : "members"}
            </Body>
          </Row>
        </View>
      </Row>

      <Row gap={S.sm} style={{ marginTop: S.md, flexWrap: "wrap" }}>
        <BadgePill tier={crew.badgeTier} />
        <PrivacyPill privacy={crew.privacy} />
        {showRole && crew.myRole ? (
          <View style={[styles.rolePill, { borderColor: accent }]}>
            <Text style={{ color: accent, fontSize: 11, fontWeight: "700" }}>{ROLE_LABEL[crew.myRole].toUpperCase()}</Text>
          </View>
        ) : null}
      </Row>

      <View style={{ marginTop: S.lg }}>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
          <View>
            <Label>This week</Label>
            <Row gap={6} style={{ alignItems: "baseline", marginTop: 2 }}>
              <Text style={styles.big}>{crew.weekKm.toFixed(1)}</Text>
              <Body dim size={14}>/ {goal} km</Body>
            </Row>
          </View>
          {members.length ? (
            <Row gap={0}>
              {members.slice(0, 4).map((p, i) => (
                <Avatar key={p.id} uri={p.avatar} name={p.name || p.username} size={28} ring={C.bg} style={{ marginLeft: i ? -8 : 0 }} />
              ))}
            </Row>
          ) : null}
        </Row>
        <ProgressBar value={progress} colour={accent} height={8} style={{ marginTop: S.sm }} />
        <Body mute size={12} style={{ marginTop: S.sm }}>
          {progress >= 1 ? "Weekly goal smashed. Keep stacking." : `${Math.max(0, goal - crew.weekKm).toFixed(1)} km to the weekly goal`}
          {next ? (
            <Text style={{ color: BADGE_COLOURS[next[0]] }}>{`  ·  ${(next[1] - crew.weekKm).toFixed(0)} km to ${next[0]}`}</Text>
          ) : null}
        </Body>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 24, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, padding: S.lg, overflow: "hidden" },
  big: { fontFamily: F.display, fontSize: 32, color: C.text },
  rolePill: { height: 22, paddingHorizontal: 8, borderRadius: 99, borderWidth: 1, justifyContent: "center" },
});
