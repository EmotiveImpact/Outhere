import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin, ShieldCheck, Target } from "lucide-react-native";
import { AnimatedNumber, Body, C, Cover, F, Label, ProgressBar, Row, S, Title } from "@/components/ui";
import { AvatarStack, BadgePill, BADGE_COLOURS, CrewLogo, PrivacyPill, ROLE_LABEL, crewAccent, memberCountLabel, nextBadge } from "./shared";

/** Starts at 0 and switches to the real value after mount, so numbers count up. */
export function useCountUp(value) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(value), 120);
    return () => clearTimeout(t);
  }, [value]);
  return shown;
}

/** Crew header: route art in the crew colour, badge, weekly km and goal. */
export default function CrewHero({ crew, showRole = true }) {
  const accent = crewAccent(crew);
  const goal = crew.weeklyGoalKm || 0;
  const weekKm = Number(crew.weekKm) || 0;
  const progress = goal > 0 ? weekKm / goal : 0;
  const next = nextBadge(weekKm);
  const members = crew.previewMembers || [];
  const km = useCountUp(weekKm);
  const bar = useCountUp(progress);

  return (
    <View style={[styles.wrap, { borderColor: `${accent}55` }]}>
      <Cover seed={`crew:${crew.id}`} accent={accent} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[`${accent}38`, "rgba(14,14,16,0.82)", "rgba(14,14,16,0.97)"]}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Row gap={S.md} style={{ alignItems: "center" }}>
        <CrewLogo crew={crew} size={64} />
        <View style={{ flex: 1, gap: 3 }}>
          <Row gap={6}>
            <Title size={24} numberOfLines={2} style={{ flexShrink: 1, letterSpacing: -0.5 }}>
              {crew.name}
            </Title>
            {crew.verified ? <ShieldCheck size={17} color={C.black} /> : null}
          </Row>
          <Row gap={4}>
            <MapPin size={12} color={C.textDim} />
            <Body dim size={12}>
              {crew.city} · {memberCountLabel(crew.memberCount)}
            </Body>
          </Row>
        </View>
      </Row>

      {crew.tagline ? (
        <Body size={14} style={{ marginTop: S.md, color: "#d8d8dc" }} numberOfLines={2}>
          {crew.tagline}
        </Body>
      ) : null}

      <Row gap={S.sm} style={{ marginTop: S.md, flexWrap: "wrap" }}>
        <BadgePill tier={crew.badgeTier} />
        <PrivacyPill privacy={crew.privacy} style={{ height: 26, paddingHorizontal: 10 }} />
        {showRole && crew.myRole ? (
          <View style={[styles.rolePill, { borderColor: `${accent}88`, backgroundColor: `${accent}1a` }]}>
            <Text style={{ color: accent, fontSize: 11, fontWeight: "800", letterSpacing: 0.6 }}>{ROLE_LABEL[crew.myRole].toUpperCase()}</Text>
          </View>
        ) : null}
      </Row>

      <View style={styles.weekBox}>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
          <View style={{ flexShrink: 1 }}>
            <Label>This week</Label>
            <Row gap={6} style={{ alignItems: "baseline", marginTop: 2 }}>
              <AnimatedNumber value={km} format={(v) => v.toFixed(1)} style={styles.big} />
              <Text style={styles.goal}>/ {goal} km</Text>
            </Row>
          </View>
          {members.length ? <AvatarStack players={members} total={crew.memberCount} size={30} ringColour="#141416" /> : null}
        </Row>
        <ProgressBar value={bar} colour={accent} height={10} track="rgba(255,255,255,0.08)" style={{ marginTop: S.md }} />
        <Row gap={S.md} style={{ marginTop: S.sm, justifyContent: "space-between" }}>
          <Row gap={5} style={{ flexShrink: 1 }}>
            <Target size={13} color={progress >= 1 ? accent : C.textMute} />
            <Body mute size={12} numberOfLines={1} style={progress >= 1 ? { color: accent } : null}>
              {progress >= 1 ? "Goal smashed. Keep stacking." : `${Math.max(0, goal - weekKm).toFixed(1)} km to goal`}
            </Body>
          </Row>
          {next ? (
            <Text style={{ color: BADGE_COLOURS[next[0]], fontSize: 12, fontWeight: "700" }} numberOfLines={1}>
              {Math.ceil(next[1] - weekKm)} km to {next[0]}
            </Text>
          ) : null}
        </Row>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 24, borderWidth: 1, backgroundColor: C.surface, padding: S.lg, overflow: "hidden" },
  big: { fontFamily: F.display, fontSize: 48, color: C.text, letterSpacing: -1.5, lineHeight: 54 },
  goal: { color: C.textDim, fontSize: 15, fontFamily: F.displayMedium },
  rolePill: { height: 26, paddingHorizontal: 10, borderRadius: 99, borderWidth: 1, justifyContent: "center" },
  weekBox: { marginTop: S.lg, padding: S.md, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
});
