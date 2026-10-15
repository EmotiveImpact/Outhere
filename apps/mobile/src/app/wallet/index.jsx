// Your OUT wallet: the balance and this week, a way to earn more and the
// history, your plan's card, your badges and today's drop to claim.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { TrendingUp } from "lucide-react-native";
import { useBadges, useDrops, useMembershipDetails, useOutHistory, useProfile } from "@/data/hooks";
import { AnimatedNumber, Avatar, C, Card, F, FadeIn, LIT, PressableScale, R, Row, S, Screen, SectionHeader, Skeleton } from "@/components/ui";
import { BadgeTile, PillButton, Slab } from "@/components/profile/parts";
import { PHOTOS } from "@/constants/photos";
import { PLANS } from "@/constants/plans";
import { formatNumber } from "@/utils/format";

const CARD_COPY = {
  free: { title: "Outhere Free", body: "Every step earns OUT. Pro earns 1.5x and Black 2x.", art: PHOTOS.token },
  pro: { title: "Outhere Pro", body: "1.5x OUT on every km, drops an hour early and unlimited battles.", art: PHOTOS.procard },
  black: { title: "Outhere Black", body: "Double OUT on every km, first pick of drops and private events.", art: PHOTOS.blackcard },
};

export default function Wallet() {
  const router = useRouter();
  const { data: p } = useProfile();
  const history = useOutHistory();
  const { data: m } = useMembershipDetails();
  const { data: badges } = useBadges();
  const { data: drops } = useDrops();
  const h = history.data;
  const tier = m?.tier || p?.tier || "free";
  const card = CARD_COPY[tier] || CARD_COPY.free;

  const earned = (badges?.items || []).filter((b) => b.earned).sort((a, b) => (b.earnedAt || 0) - (a.earnedAt || 0));
  const nextUp = (badges?.items || []).filter((b) => !b.earned).sort((a, b) => b.progress - a.progress);
  const shelf = [...earned.slice(0, 2), ...nextUp].slice(0, 3);

  const now = Date.now();
  const openDrops = (drops || []).filter((d) => d.status !== "soldout" && !d.reservation && !d.reserved);
  const drop = openDrops.find((d) => d.status === "live" || d.status === "early") || openDrops.sort((a, b) => (a.releaseAt || a.dropAt || 0) - (b.releaseAt || b.dropAt || 0))[0];
  const openDrop = () => {
    if (!drop) return;
    const publicAt = drop.releaseAt || drop.dropAt || 0;
    if (tier !== "black" && now < publicAt) router.push(`/membership/drop/${drop.id}`);
    else router.push(`/drops/${drop.id}`);
  };

  return (
    <Screen padded={false} style={{ paddingTop: 0 }} onRefresh={history.refetch} refreshing={history.isRefetching}>
      <Slab
        object={PHOTOS.coin}
        kicker="Wallet"
        top="Your OUT"
        bottom="wallet"
        height={210}
        right={p ? <Avatar uri={p.avatar} name={p.name} tier={tier} size={40} /> : null}
      />
      <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg, gap: S.lg }}>
        {!h ? (
          <Skeleton height={180} radius={R.lg} />
        ) : (
          <FadeIn>
            <Card padding={S.lg}>
              <Text style={styles.label}>Balance</Text>
              <Row gap={6} style={{ alignItems: "flex-end" }}>
                <AnimatedNumber value={h.balance} format={formatNumber} style={styles.balance} />
                <Text style={styles.unit}>OUT</Text>
              </Row>
              <Row gap={6} style={{ marginTop: 2 }}>
                <TrendingUp size={14} color={C.accentHi} />
                <Text style={styles.week}>+{formatNumber(h.weekEarned)} this week</Text>
              </Row>
              {h.held ? <Text style={styles.held}>{formatNumber(h.held)} OUT clears soon</Text> : null}
              <Row gap={S.sm} style={{ marginTop: S.lg }}>
                <PillButton title="Earn more" onPress={() => router.push("/(tabs)/outside/challenges")} />
                <PillButton title="History" ghost onPress={() => router.push("/wallet/history")} />
              </Row>
            </Card>
          </FadeIn>
        )}

        <PressableScale onPress={() => router.push(tier === "free" ? "/membership" : "/membership/manage")} scaleTo={0.98} accessibilityLabel={card.title}>
          <View style={styles.plan}>
            <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { borderRadius: R.lg }]} />
            <Image source={card.art} style={styles.planArt} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={styles.planTitle}>{card.title}</Text>
              <Text style={styles.planBody}>{card.body}</Text>
              {tier === "free" ? <Text style={styles.planLink}>See {PLANS.pro.name} and {PLANS.black.name}</Text> : null}
            </View>
          </View>
        </PressableScale>

        <View>
          <SectionHeader title="Badges" action={badges ? `${badges.earnedCount} of ${badges.total}` : undefined} onAction={() => router.push("/badges")} />
          <Row gap={S.sm}>
            {shelf.length
              ? shelf.map((b) => <BadgeTile key={b.id} badge={b} onPress={() => router.push("/badges")} />)
              : [0, 1, 2].map((i) => <Skeleton key={i} height={150} radius={R.md} style={{ flex: 1 }} />)}
          </Row>
        </View>

        {drop ? (
          <PressableScale onPress={openDrop} scaleTo={0.98} accessibilityLabel={drop.title}>
            <Card padding={S.md}>
              <Row gap={S.md}>
                <Image source={drop.image || PHOTOS.shoe} style={styles.dropArt} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropKicker}>{drop.status === "live" ? "Today's drop" : "Next drop"}</Text>
                  <Text style={styles.dropTitle} numberOfLines={1}>
                    {drop.title}
                  </Text>
                  <Row gap={6} style={{ marginTop: 3 }}>
                    {drop.priceOut != null ? <Image source={PHOTOS.coin} style={{ width: 16, height: 16, borderRadius: 8 }} /> : null}
                    <Text style={styles.dropMeta} numberOfLines={1}>
                      <Text style={{ color: C.text, fontFamily: F.bodySemi }}>
                        {drop.priceOut != null ? `${formatNumber(drop.priceOut)} OUT` : `£${Number(drop.priceGbp || 0).toFixed(Number(drop.priceGbp) % 1 ? 2 : 0)}`}
                      </Text>
                      {drop.remaining != null ? ` · ${drop.remaining} left` : ""}
                    </Text>
                  </Row>
                </View>
                <PillButton title="Claim" onPress={openDrop} />
              </Row>
            </Card>
          </PressableScale>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: C.textDim, fontFamily: F.body, fontSize: 13 },
  balance: { color: C.text, fontFamily: F.display, fontSize: 58, lineHeight: 62 },
  unit: { color: C.accent, fontFamily: F.display, fontSize: 22, marginBottom: 9 },
  week: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 13 },
  held: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: 4 },
  plan: { flexDirection: "row", alignItems: "center", gap: S.md, backgroundColor: C.surface, borderRadius: R.lg, padding: S.md, overflow: "hidden", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  planArt: { width: 120, height: 80, borderRadius: R.sm },
  planTitle: { color: C.text, fontFamily: F.display, fontSize: 22, textTransform: "uppercase" },
  planBody: { color: C.textDim, fontFamily: F.body, fontSize: 12.5, lineHeight: 17, marginTop: 2 },
  planLink: { color: C.accent, fontFamily: F.bodySemi, fontSize: 12.5, marginTop: 4 },
  dropArt: { width: 72, height: 72, borderRadius: R.sm, backgroundColor: "#000" },
  dropKicker: { color: C.accent, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase" },
  dropTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 16, marginTop: 2 },
  dropMeta: { color: C.textDim, fontFamily: F.body, fontSize: 13 },
});
