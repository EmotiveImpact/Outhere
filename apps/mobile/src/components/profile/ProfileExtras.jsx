// Recent runs, the membership card, and the profile's loading skeleton.

import React from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight, Crown, Play, Route } from "lucide-react-native";
import { formatDuration, formatKm, formatPace, tierLabel, timeAgo } from "@/utils/format";
import { Body, C, Card, Cover, F, FadeIn, Label, ListRow, PressableScale, R, Row, S, Skeleton, Title, tierColour } from "@/components/ui";

export function RecentRuns({ runs, loading, units, onStart, onOpen }) {
  if (loading) return <Skeleton height={150} radius={R.lg} />;
  if (!runs?.length) {
    return (
      <PressableScale onPress={onStart} scaleTo={0.98} accessibilityLabel="Start your first run">
        <Cover seed="first-run" accent={C.accent} scrim style={{ height: 168, borderRadius: R.lg, borderWidth: 1, borderColor: C.border }}>
          <View style={{ flex: 1, justifyContent: "flex-end", padding: S.xl }}>
            <Label style={{ color: C.accent }}>First run</Label>
            <Title size={22} style={{ marginTop: 4 }}>
              Your first route is out there
            </Title>
            <Row style={{ justifyContent: "space-between", marginTop: S.sm }}>
              <Body dim size={13} style={{ flex: 1 }}>
                Track a run or walk and it lands here.
              </Body>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" }}>
                <Play size={18} color={C.accentText} fill={C.accentText} />
              </View>
            </Row>
          </View>
        </Cover>
      </PressableScale>
    );
  }
  return (
    <Card padding={0} style={{ paddingHorizontal: S.lg }}>
      {runs.map((r, i) => (
        <ListRow
          key={r.id}
          onPress={onOpen ? () => onOpen(r) : undefined}
          chevron={false}
          style={i ? { borderTopWidth: 1, borderTopColor: C.border } : null}
          leading={
            <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center" }}>
              <Route size={18} color={C.accent} />
            </View>
          }
          title={r.title}
          subtitle={`${timeAgo(r.startedAt)} · ${formatDuration(r.durationSec)} · ${formatPace(r.paceSecPerKm)} /km`}
          trailing={<Text style={{ color: C.text, fontFamily: F.display, fontSize: 18, letterSpacing: -0.3 }}>{formatKm(r.distanceKm, units, 2)}</Text>}
        />
      ))}
    </Card>
  );
}

const TIER_COLOURS = {
  free: ["rgba(0,255,127,0.14)", "rgba(20,20,22,0)"],
  pro: ["rgba(124,196,255,0.2)", "rgba(20,20,22,0)"],
  black: ["#3a3a3e", "#151517"],
};

export function MembershipCard({ tier, blackEligible, onPress }) {
  const colour = tier === "free" ? C.accent : tierColour(tier);
  const line =
    tier === "free"
      ? "Go Pro for 1.2x XP, unlimited battles and more rewards."
      : tier === "pro"
        ? blackEligible
          ? "You've unlocked Black. Take a look."
          : "Keep a 14 day streak to unlock Black."
        : "Top tier. 1.5x XP and Black-only drops.";
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} accessibilityLabel="Membership">
      <View style={{ borderRadius: R.lg, borderWidth: 1, borderColor: tier === "pro" ? "rgba(124,196,255,0.35)" : C.border, overflow: "hidden", backgroundColor: C.surface }}>
        <LinearGradient colors={TIER_COLOURS[tier] || TIER_COLOURS.free} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: S.lg }}>
          <Row gap={S.md}>
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(0,0,0,0.35)", borderWidth: 1, borderColor: `${colour}55`, alignItems: "center", justifyContent: "center" }}>
              <Crown size={20} color={colour} />
            </View>
            <View style={{ flex: 1 }}>
              <Label>Your plan</Label>
              <Text style={{ color: tier === "free" ? C.text : colour, fontFamily: F.display, fontSize: 18, marginTop: 1 }}>OutHere {tierLabel(tier)}</Text>
              <Body dim size={13}>
                {line}
              </Body>
            </View>
            <ChevronRight size={18} color={C.textMute} />
          </Row>
        </LinearGradient>
      </View>
    </PressableScale>
  );
}

export function ProfileSkeleton() {
  return (
    <FadeIn>
      <View style={{ borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.xl, gap: S.lg }}>
        <Row gap={S.lg}>
          <Skeleton width={104} height={104} radius={52} />
          <View style={{ flex: 1, gap: S.sm }}>
            <Skeleton width="70%" height={24} />
            <Skeleton width="45%" height={14} />
            <Skeleton width="55%" height={20} radius={10} />
          </View>
        </Row>
        <Skeleton height={8} radius={4} />
        <Skeleton width="60%" height={18} />
      </View>
      <Skeleton height={150} radius={R.lg} style={{ marginTop: S.xxl }} />
      <Row gap={S.sm} style={{ marginTop: S.sm }}>
        <View style={{ flex: 1 }}><Skeleton height={92} radius={R.md} /></View>
        <View style={{ flex: 1 }}><Skeleton height={92} radius={R.md} /></View>
        <View style={{ flex: 1 }}><Skeleton height={92} radius={R.md} /></View>
      </Row>
    </FadeIn>
  );
}
