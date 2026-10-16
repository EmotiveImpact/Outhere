// Invite friends: give 500, get 500. Milestones at 1, 3, 5 and 10 friends,
// up to a free month of Black, everyone you've already brought in (joined,
// or still walking to their 10k), and your link to share. New members can
// say who invited them in their first week.

import React, { useState } from "react";
import { Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Share2, UserPlus } from "lucide-react-native";
import { engine, useEngineMutation, useReferrals } from "@/data/hooks";
import { AnimatedBar, Avatar, Body, C, F, FadeIn, FINISH, GlowButton, PressableScale, Row, Screen, Skeleton, Surface } from "@/components/ui";
import { StackTabBar } from "@/components/AppTabBar";
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
  // Everyone you've brought in: the ones still walking first (closest to 10k on top), then those who made it.
  const invited = r ? [...r.pending, ...r.joined] : [];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen tab padded={false} style={{ paddingTop: 0 }} onRefresh={refetch} refreshing={isRefetching}>
        {/* .slab with the gift: the blue lit present floating on the right */}
        <Slab
          object={PHOTOS.gift}
          objectSize={212}
          objectStyle={{ right: -14 }}
          kicker="Invite friends"
          top={`Give ${REFERRAL.out},`}
          bottom={`get ${REFERRAL.out}`}
          sub={`They get ${REFERRAL.out} OUT to start. You get ${REFERRAL.out} OUT when they walk 10k.`}
          height={262}
          onBack={() => (router.canGoBack() ? router.back() : router.replace("/friends"))}
        />
        <View style={{ paddingHorizontal: 18, paddingTop: 16, gap: 10 }}>
          {!r ? (
            <Skeleton height={150} radius={20} />
          ) : (
            <FadeIn>
              {/* .card.ms: friends joined, the four milestones on a track */}
              <Surface radius={20} padding={null} contentStyle={styles.ms}>
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
                          {on ? <LinearGradient colors={FINISH.act} locations={FINISH.actStops} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} /> : null}
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
                  <Row gap={8} style={{ marginTop: 14 }}>
                    <Row gap={0}>
                      {r.joined.slice(0, 4).map((f, i) => (
                        <Avatar key={f.player?.id || i} uri={f.player?.avatar} name={f.player?.name} size={22} style={{ marginLeft: i ? -7 : 0 }} />
                      ))}
                    </Row>
                    <Text style={styles.dim}>{names(r.joined)}</Text>
                  </Row>
                ) : (
                  <Text style={[styles.dim, { marginTop: 14 }]}>Share your link. Each friend who walks 10k earns you {REFERRAL.out} OUT.</Text>
                )}
              </Surface>
            </FadeIn>
          )}

          {nearly ? (
            <FadeIn index={1}>
              <Surface radius={20} padding={null} contentStyle={styles.nearly}>
                <Avatar uri={nearly.player?.avatar} name={nearly.player?.name} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{nearly.player?.name?.split(" ")[0]} is nearly there</Text>
                  <Text style={styles.dim}>
                    {formatNumber(nearly.steps)} of {formatNumber(r.target)} steps to unlock your {REFERRAL.out}
                  </Text>
                  <AnimatedBar value={nearly.steps / r.target} height={5} colour={C.accent} track="rgba(255,255,255,0.08)" style={{ marginTop: 8 }} />
                </View>
              </Surface>
            </FadeIn>
          ) : null}

          <GlowButton title="Share your link" icon={Share2} size="lg" full onPress={share} disabled={!r} style={{ marginTop: 4, height: 54 }} />
          {r ? (
            <Text style={[styles.dim, { textAlign: "center" }]}>
              {r.link}
              {r.earnedOut ? ` · ${formatNumber(r.earnedOut)} OUT earned so far` : ""}
            </Text>
          ) : null}

          {/* Everyone you've already invited who joined, and how far they are */}
          {r ? (
            <View style={{ gap: 9, marginTop: 6 }}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={styles.secHead}>Your invites</Text>
                {invited.length ? <Text style={styles.secLink}>{invited.length} signed up</Text> : null}
              </Row>
              {invited.length ? (
                <Surface radius={20} padding={null}>
                  {invited.map((f, i) => (
                    <PressableScale key={f.player?.id || i} onPress={() => f.player?.id && router.push(`/player/${f.player.id}`)} scaleTo={0.98} accessibilityLabel={f.player?.name} style={[styles.inviteRow, i > 0 && styles.line]}>
                      <Avatar uri={f.player?.avatar} name={f.player?.name} tier={f.player?.tier} size={36} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name} numberOfLines={1}>
                          {f.player?.name}
                        </Text>
                        {f.qualified ? (
                          <Text style={styles.dim}>Walked their 10k</Text>
                        ) : (
                          <AnimatedBar value={f.steps / (r.target || REFERRAL.stepsToQualify)} height={4} colour={C.accent} track="rgba(255,255,255,0.08)" style={{ marginTop: 6, width: "80%" }} />
                        )}
                      </View>
                      {f.qualified ? <Text style={styles.earned}>+{REFERRAL.out} OUT</Text> : <Text style={styles.dim}>{formatNumber(f.steps)} steps</Text>}
                    </PressableScale>
                  ))}
                </Surface>
              ) : (
                <Surface radius={20} padding={null} contentStyle={styles.nearly}>
                  <Body dim size={12.5} style={{ flex: 1 }}>
                    No one yet. When a friend joins from your link they show up here, with how close they are to their 10k.
                  </Body>
                </Surface>
              )}
            </View>
          ) : null}

          {r?.referredBy ? (
            <Surface radius={20} padding={null} contentStyle={styles.nearly}>
              <Avatar uri={r.referredBy.avatar} name={r.referredBy.name} tier={r.referredBy.tier} size={38} />
              <Body dim size={12.5} style={{ flex: 1 }}>
                {r.referredBy.name} invited you. You both got {REFERRAL.out} OUT.
              </Body>
            </Surface>
          ) : r?.canClaim ? (
            <View style={{ gap: 9, marginTop: 6 }}>
              <Text style={styles.secHead}>Did a friend invite you?</Text>
              <View style={styles.claim}>
                <View>
                  <UserPlus size={17} color={C.textDim} />
                </View>
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
              <Text style={styles.dim}>You get {REFERRAL.out} OUT to start. Counts in your first week.</Text>
            </View>
          ) : null}
        </View>
      </Screen>
      <StackTabBar current="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  ms: { paddingTop: 14, paddingBottom: 14, paddingLeft: 14, paddingRight: 14 },
  nearly: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 12, paddingBottom: 12, paddingLeft: 14, paddingRight: 14 },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5 },
  dim: { color: C.textDim, fontFamily: F.body, fontSize: 11.5, marginTop: 2 },
  secHead: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5 },
  secLink: { color: C.accent, fontFamily: F.bodySemi, fontSize: 12 },
  earned: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 12, textShadowColor: "rgba(61,139,255,0.6)", textShadowRadius: 10 },
  // .mtrack: a 3px line, 24px nodes lit on the act gradient once reached
  track: { height: 44, marginTop: 14, marginHorizontal: 22 },
  trackLine: { position: "absolute", left: 0, right: 0, top: 10.5, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.08)" },
  trackOn: { right: undefined, backgroundColor: C.accent, boxShadow: "0 0 10px rgba(61,139,255,0.7)" },
  node: { position: "absolute", top: 0, width: 80, marginLeft: -40, alignItems: "center" },
  dot: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#1d222b", alignItems: "center", justifyContent: "center", overflow: "hidden", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" },
  dotOn: { boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 0 14px rgba(61,139,255,0.8)", overflow: "visible" },
  dotText: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 10.5 },
  nodeLabel: { color: C.textMute, fontFamily: F.body, fontSize: 10, marginTop: 6 },
  inviteRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 14 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  claim: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#14171d", borderRadius: 18, paddingLeft: 16, paddingRight: 8, height: 52, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), inset 0 0 0 1px rgba(255,255,255,0.05)" },
  input: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 14, height: 46, outlineStyle: "none" },
});
