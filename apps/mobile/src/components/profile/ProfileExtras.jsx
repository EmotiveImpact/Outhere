// Recent runs, the membership card, and the profile's loading skeleton.

import React from "react";
import { Text, View } from "react-native";
import { ChevronRight, Play } from "lucide-react-native";
import { formatDuration, formatKm, formatPace, tierLabel, timeAgo } from "@/utils/format";
import { priceLabel } from "@/constants/plans";
import { BlendImage, Body, C, Card, Divider, F, FadeIn, ListRow, PressableScale, R, Row, S, Skeleton, Surface, Title, tierColour } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";

export function RecentRuns({ runs, loading, units, onStart, onOpen }) {
  if (loading) return <Skeleton height={150} radius={R.lg} />;
  if (!runs?.length) {
    return (
      <PressableScale onPress={onStart} scaleTo={0.98} accessibilityLabel="Start your first run">
        <Card padding={S.xl}>
          <Row gap={S.lg}>
            <View style={{ flex: 1 }}>
              <Title size={20}>Your first route is out there</Title>
              <Body dim size={13} style={{ marginTop: 4 }}>
                Track a run or walk and it lands here.
              </Body>
            </View>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.text, alignItems: "center", justifyContent: "center" }}>
              <Play size={18} color={C.bg} fill={C.bg} />
            </View>
          </Row>
        </Card>
      </PressableScale>
    );
  }
  return (
    <Card padding={0} style={{ paddingHorizontal: S.lg }}>
      {runs.map((r, i) => (
        <View key={r.id}>
          {i ? <Divider /> : null}
          <ListRow
            onPress={onOpen ? () => onOpen(r) : undefined}
            chevron={false}
            style={{ paddingVertical: S.lg }}
            title={r.title}
            subtitle={`${timeAgo(r.startedAt)} · ${formatDuration(r.durationSec)} · ${formatPace(r.paceSecPerKm)} /km`}
            trailing={<Text style={{ color: C.text, fontFamily: F.display, fontSize: 18, letterSpacing: -0.3 }}>{formatKm(r.distanceKm, units, 2)}</Text>}
          />
        </View>
      ))}
    </Card>
  );
}

export function MembershipCard({ tier, onPress }) {
  const edge = tier === "free" ? null : tierColour(tier);
  const line =
    tier === "free"
      ? `Go Pro for 1.5x OUT on every km, from ${priceLabel("pro")}.`
      : tier === "pro"
        ? "1.5x OUT, unlimited battles and a streak freeze a month."
        : "2x OUT, first pick of every drop and private events.";
  // The tier's own card object, blended onto the lit surface (.card.tier .card3d).
  const art = tier === "black" ? PHOTOS.blackcard : tier === "pro" ? PHOTOS.procard : PHOTOS.card;
  return (
    <Surface radius={20} padding={null} onPress={onPress} accessibilityLabel="Membership" contentStyle={{ paddingTop: 14, paddingBottom: 14, paddingLeft: 10, paddingRight: 14 }}>
      {edge ? <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, backgroundColor: edge }} /> : null}
      <Row gap={10}>
        <BlendImage source={art} size={64} mask="tight" />
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontFamily: F.display, fontSize: 18, textTransform: "uppercase" }}>Outhere {tierLabel(tier)}</Text>
          <Body dim size={12} style={{ marginTop: 2, lineHeight: 17 }}>
            {line}
          </Body>
        </View>
        <ChevronRight size={18} color={C.textMute} />
      </Row>
    </Surface>
  );
}

export function ProfileSkeleton() {
  return (
    <FadeIn>
      <View style={{ borderRadius: R.lg, backgroundColor: C.surface, padding: S.xl, gap: S.lg }}>
        <Row gap={S.lg}>
          <Skeleton width={88} height={88} radius={44} />
          <View style={{ flex: 1, gap: S.sm }}>
            <Skeleton width="70%" height={24} />
            <Skeleton width="45%" height={14} />
            <Skeleton width="55%" height={20} radius={10} />
          </View>
        </Row>
        <Skeleton height={8} radius={4} />
        <Skeleton width="60%" height={18} />
      </View>
      <Skeleton height={240} radius={R.lg} style={{ marginTop: S.xxl }} />
    </FadeIn>
  );
}
