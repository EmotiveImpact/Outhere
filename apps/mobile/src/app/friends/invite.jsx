// Invite friends: give 500, get 500. Milestones at 1, 3, 5 and 10 friends,
// up to a free month of Black, the friends nearly at their 10k, and your
// link to share. New members can say who invited them in their first week.

import React, { useState } from "react";
import { Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Share2, UserPlus } from "lucide-react-native";
import { engine, useEngineMutation, useReferrals } from "@/data/hooks";
import { AnimatedBar, Avatar, Body, Button, C, Card, F, FadeIn, R, Row, S, Screen, SectionHeader, Skeleton } from "@/components/ui";
import { PillButton, Slab } from "@/components/profile/parts";
import { PHOTOS } from "@/constants/photos";
import { REFERRAL } from "@/constants/plans";
import { formatNumber } from "@/utils/format";

const names = (list) => {
  const n = list.map((f) => f.player?.name?.split(" ")[0]).filter(Boolean);
  if (n.length <= 1) return n[0] || "";
  if (n.length <= 3) return `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`;
  return `${n.slice(0, 2).join(", ")} and ${n.length - 2} more`;
};

export default function Invite() {
  const router = useRouter();
  const { data: r, refetch, isRefetching } = useReferrals();
  const [code, setCode] = useState("");
  const claim = useEngineMutation(engine.claimReferral, { success: "500 OUT is yours. Welcome in" });

  const share = async () => {
    if (!r) return;
    try {
      await Share.share({ message: `Come out with me on Outhere. You get ${REFERRAL.out} OUT to start, and I get ${REFERRAL.out} when you walk your first 10k: https://${r.link}` });
      await engine.recordInviteShare();
      refetch();
    } catch {
      // closed the sheet
    }
  };

  const count = r?.qualifiedCount || 0;
  const ms = r?.milestones || REFERRAL.milestones;
  // Milestones sit evenly along the track; the fill moves between them.
  const at = (i) => (ms.length > 1 ? i / (ms.length - 1) : 1);
  const fill = (() => {
    let prev = 0;
    for (let i = 0; i < ms.length; i++) {
      if (count < ms[i].friends) return i === 0 ? 0 : at(i - 1) + (at(i) - at(i - 1)) * ((count - prev) / (ms[i].friends - prev));
      prev = ms[i].friends;
    }
    return 1;
  })();
  const nearly = r?.pending?.[0];

  return (
    <Screen padded={false} style={{ paddingTop: 0 }} onRefresh={refetch} refreshing={isRefetching}>
      <Slab
        photo={PHOTOS.friends}
        kicker="Invite friends"
        top={`Give ${REFERRAL.out},`}
        bottom={`get ${REFERRAL.out}`}
        sub={`They get ${REFERRAL.out} OUT to start. You get ${REFERRAL.out} OUT when they walk 10k.`}
        height={256}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/friends"))}
      />
      <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg, gap: S.md }}>
        {!r ? (
          <Skeleton height={170} radius={R.lg} />
        ) : (
          <FadeIn>
            <Card padding={S.lg}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={styles.title}>
                  {count} friend{count === 1 ? "" : "s"} joined
                </Text>
                <Text style={styles.dim} numberOfLines={1}>
                  {r.next ? `${r.next.left} more for ${r.next.tier ? `a free ${r.next.reward}` : r.next.reward}` : "All milestones done"}
                </Text>
              </Row>
              <View style={styles.track}>
                <View style={styles.trackLine} />
                <View style={[styles.trackLine, styles.trackOn, { width: `${fill * 100}%` }]} />
                {ms.map((m, i) => {
                  const on = count >= m.friends;
                  return (
                    <View key={m.friends} style={[styles.node, { left: `${at(i) * 100}%` }]}>
                      <View style={[styles.dot, on && styles.dotOn]}>
                        <Text style={[styles.dotText, on && { color: "#fff" }]}>{m.friends}</Text>
                      </View>
                      <Text style={[styles.nodeLabel, on && { color: C.textSoft }]} numberOfLines={1}>
                        {m.reward}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {r.joined.length ? (
                <Row gap={S.sm} style={{ marginTop: S.xl }}>
                  <Row gap={0}>
                    {r.joined.slice(0, 4).map((f, i) => (
                      <Avatar key={f.player?.id || i} uri={f.player?.avatar} name={f.player?.name} tier={f.player?.tier} size={26} style={{ marginLeft: i ? -8 : 0 }} />
                    ))}
                  </Row>
                  <Text style={styles.dim}>{names(r.joined)}</Text>
                </Row>
              ) : (
                <Text style={[styles.dim, { marginTop: S.xl }]}>Share your link. Each friend who walks 10k earns you {REFERRAL.out} OUT.</Text>
              )}
            </Card>
          </FadeIn>
        )}

        {nearly ? (
          <FadeIn index={1}>
            <Card padding={S.md}>
              <Row gap={S.md}>
                <Avatar uri={nearly.player?.avatar} name={nearly.player?.name} tier={nearly.player?.tier} size={46} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{nearly.player?.name?.split(" ")[0]} is nearly there</Text>
                  <Text style={styles.dim}>
                    {formatNumber(nearly.steps)} of {formatNumber(r.target)} steps to unlock your {REFERRAL.out}
                  </Text>
                  <AnimatedBar value={nearly.steps / r.target} height={6} colour={C.accent} track={C.surfaceHigh} style={{ marginTop: S.sm }} />
                </View>
              </Row>
            </Card>
          </FadeIn>
        ) : null}

        {r && r.pending.length > 1 ? (
          <Card padding={0} style={{ paddingHorizontal: S.md }}>
            {r.pending.slice(1, 6).map((f, i) => (
              <Row key={f.player?.id || i} gap={S.md} style={[{ paddingVertical: 10 }, i > 0 && styles.line]}>
                <Avatar uri={f.player?.avatar} name={f.player?.name} tier={f.player?.tier} size={34} />
                <Text style={[styles.title, { flex: 1, fontSize: 14 }]} numberOfLines={1}>
                  {f.player?.name}
                </Text>
                <Text style={styles.dim}>{formatNumber(f.steps)} steps</Text>
              </Row>
            ))}
          </Card>
        ) : null}

        <Button title="Share your link" icon={Share2} size="lg" full onPress={share} disabled={!r} style={{ marginTop: S.sm }} />
        {r ? (
          <Text style={[styles.dim, { textAlign: "center" }]}>
            {r.link}
            {r.earnedOut ? ` · ${formatNumber(r.earnedOut)} OUT earned so far` : ""}
          </Text>
        ) : null}

        {r?.referredBy ? (
          <Card padding={S.md}>
            <Row gap={S.md}>
              <Avatar uri={r.referredBy.avatar} name={r.referredBy.name} tier={r.referredBy.tier} size={40} />
              <Body dim size={13.5} style={{ flex: 1 }}>
                {r.referredBy.name} invited you. You both got {REFERRAL.out} OUT.
              </Body>
            </Row>
          </Card>
        ) : r?.canClaim ? (
          <View style={{ marginTop: S.md }}>
            <SectionHeader title="Did a friend invite you?" />
            <View style={styles.claim}>
              <UserPlus size={18} color={C.textDim} />
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="Their @username"
                placeholderTextColor={C.textMute}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                accessibilityLabel="Their username"
              />
              <PillButton title="Add" disabled={!code.trim() || claim.isPending} onPress={() => claim.mutate(code)} />
            </View>
            <Text style={[styles.dim, { marginTop: S.sm }]}>You get {REFERRAL.out} OUT to start. Counts in your first week.</Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  dim: { color: C.textDim, fontFamily: F.body, fontSize: 12.5, marginTop: 2 },
  track: { height: 52, marginTop: S.lg, marginHorizontal: 18 },
  trackLine: { position: "absolute", left: 0, right: 0, top: 13, height: 4, borderRadius: 2, backgroundColor: C.surfaceHigh },
  trackOn: { right: undefined, backgroundColor: C.accent },
  node: { position: "absolute", top: 0, width: 80, marginLeft: -40, alignItems: "center" },
  dot: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.surface },
  dotOn: { backgroundColor: C.accent, borderColor: "rgba(130,180,255,0.6)" },
  dotText: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 12 },
  nodeLabel: { color: C.textMute, fontFamily: F.body, fontSize: 11, marginTop: 5 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  claim: { flexDirection: "row", alignItems: "center", gap: S.md, backgroundColor: C.surface, borderRadius: R.lg, paddingHorizontal: S.lg, height: 60, overflow: "hidden" },
  input: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 15, height: 50, outlineStyle: "none" },
});
