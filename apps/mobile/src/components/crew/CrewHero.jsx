import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ShieldCheck } from "lucide-react-native";
import { AnimatedNumber, Body, C, F, ProgressBar, Row, S, Title } from "@/components/ui";
import { AvatarStack, BadgePill, CrewLogo, PrivacyPill, ROLE_LABEL, memberCountLabel, nextBadge } from "./shared";

/** Starts at 0 and switches to the real value after mount, so numbers count up. */
export function useCountUp(value) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(value), 120);
    return () => clearTimeout(t);
  }, [value]);
  return shown;
}

/**
 * Crew header on the plain canvas: logo (the crew's colour mark), name, then
 * the week's kilometres as the screen's hero number with the goal bar.
 */
export default function CrewHero({ crew, showRole = true }) {
  const goal = crew.weeklyGoalKm || 0;
  const weekKm = Number(crew.weekKm) || 0;
  const progress = goal > 0 ? weekKm / goal : 0;
  const next = nextBadge(weekKm);
  const members = crew.previewMembers || [];
  const km = useCountUp(weekKm);
  const bar = useCountUp(progress);
  const meta = [crew.city, memberCountLabel(crew.memberCount), showRole && crew.myRole ? ROLE_LABEL[crew.myRole] : null].filter(Boolean).join(" · ");

  return (
    <View>
      <Row gap={S.md} style={{ alignItems: "center" }}>
        <CrewLogo crew={crew} size={56} />
        <View style={{ flex: 1, gap: 2 }}>
          <Row gap={6}>
            <Title size={22} numberOfLines={2} style={{ flexShrink: 1, letterSpacing: -0.4 }}>
              {crew.name}
            </Title>
            {crew.verified ? <ShieldCheck size={16} color={C.textDim} /> : null}
          </Row>
          <Body dim size={13} numberOfLines={1}>
            {meta}
          </Body>
        </View>
      </Row>

      {crew.tagline ? (
        <Body dim size={15} style={{ marginTop: S.lg }} numberOfLines={2}>
          {crew.tagline}
        </Body>
      ) : null}

      <Row gap={S.sm} style={{ marginTop: S.md }}>
        <BadgePill tier={crew.badgeTier} />
        {crew.privacy === "invite" ? <PrivacyPill privacy={crew.privacy} style={{ height: 26, paddingHorizontal: 10 }} /> : null}
      </Row>

      <Row style={{ marginTop: S.xxl, justifyContent: "space-between", alignItems: "flex-end" }}>
        <View style={{ flexShrink: 1 }}>
          <Row gap={6} style={{ alignItems: "baseline" }}>
            <AnimatedNumber value={km} format={(v) => v.toFixed(1)} style={styles.big} />
            <Text style={styles.goal}>/ {goal} km</Text>
          </Row>
          <Body dim size={13}>this week</Body>
        </View>
        {members.length ? <AvatarStack players={members} total={crew.memberCount} size={28} ringColour={C.bg} /> : null}
      </Row>
      <ProgressBar value={bar} height={6} style={{ marginTop: S.lg }} />
      <Row gap={S.md} style={{ marginTop: S.sm, justifyContent: "space-between" }}>
        <Body dim size={13} numberOfLines={1} style={progress >= 1 ? { color: C.text } : null}>
          {progress >= 1 ? "Goal smashed. Keep stacking." : `${Math.max(0, goal - weekKm).toFixed(1)} km to goal`}
        </Body>
        {next ? (
          <Body dim size={13} numberOfLines={1}>
            {Math.ceil(next[1] - weekKm)} km to {next[0]}
          </Body>
        ) : null}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  big: { fontFamily: F.display, fontSize: 56, color: C.text, letterSpacing: -1, lineHeight: 62 },
  goal: { color: C.textDim, fontSize: 16, fontFamily: F.displayMedium },
});
