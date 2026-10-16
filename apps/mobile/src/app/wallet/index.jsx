// Your OUT wallet: the balance and this week, a way to earn more and the
// history, your plan's card, your badges and today's drop to claim. Laid out
// as the prototype's wallet: the title on the page with your photo on the
// right, the coin floating inside the balance card, and the tab bar.

import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TrendingUp } from "lucide-react-native";
import { useBadges, useDrops, useMembershipDetails, useOutHistory, useProfile } from "@/data/hooks";
import { AnimatedNumber, Avatar, BlendImage, C, F, FadeIn, GlowBackdrop, PressableScale, R, Row, S, Skeleton, Surface, TAB_BAR_SPACE, useScreenTop } from "@/components/ui";
import { BadgeTile, PillButton } from "@/components/profile/parts";
import { Coin, SectionLabel } from "@/components/arena/OutsideKit";
import { StackTabBar } from "@/components/AppTabBar";
import { PHOTOS } from "@/constants/photos";
import { PLANS } from "@/constants/plans";
import { formatNumber } from "@/utils/format";

const CARD_COPY = {
  free: { title: "Outhere Free", body: "Every step earns OUT. Pro earns 1.5x and Black 2x.", art: PHOTOS.token },
  pro: { title: "Outhere Pro", body: "1.5x OUT on every km, drops an hour early and unlimited battles.", art: PHOTOS.procard },
  black: { title: "Outhere Black", body: "Double OUT on every km, first pick of drops and private events.", art: PHOTOS.card },
};

export default function Wallet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const top = useScreenTop();
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
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: top, paddingHorizontal: S.gutter, paddingBottom: TAB_BAR_SPACE + insets.bottom + 24, gap: S.lg }}
        refreshControl={<RefreshControl refreshing={history.isRefetching} onRefresh={history.refetch} tintColor={C.accent} />}
      >
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <View>
            <Text style={styles.h}>Your OUT</Text>
            <Text style={[styles.h, styles.hBlue]}>wallet</Text>
          </View>
          <PressableScale onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"))} scaleTo={0.92} accessibilityLabel="Back to your profile">
            <Avatar uri={p?.avatar} name={p?.name || p?.username || ""} tier={tier} size={44} />
          </PressableScale>
        </Row>

        {!h ? (
          <Skeleton height={180} radius={R.lg} />
        ) : (
          <FadeIn>
            {/* .card.bal: the coin floats inside the card, on the right */}
            <Surface radius={20} padding={null} contentStyle={styles.bal}>
              <GlowBackdrop preset="wallet" />
              <BlendImage source={PHOTOS.coin} size={180} mask="wide" float style={styles.coin} />
              <Text style={styles.label}>Balance</Text>
              <Row gap={6} style={{ alignItems: "flex-end", marginTop: 6 }}>
                <AnimatedNumber value={h.balance} format={formatNumber} style={styles.balance} />
                <Text style={styles.unit}>OUT</Text>
              </Row>
              <Row gap={6} style={{ marginTop: 4 }}>
                <TrendingUp size={14} color={C.accentHi} />
                <Text style={styles.week}>+{formatNumber(h.weekEarned)} this week</Text>
              </Row>
              {h.held ? <Text style={styles.held}>{formatNumber(h.held)} OUT clears soon</Text> : null}
              <Row gap={S.sm} style={{ marginTop: S.md }}>
                <PillButton title="Earn more" onPress={() => router.push("/(tabs)/outside/challenges")} />
                <PillButton title="History" ghost onPress={() => router.push("/wallet/history")} />
              </Row>
            </Surface>
          </FadeIn>
        )}

        {/* .card.tier: the plan's card blended onto a lit card */}
        <Surface onPress={() => router.push(tier === "free" ? "/membership" : "/membership/manage")} pressScale={0.98} radius={20} padding={null} contentStyle={styles.plan} accessibilityLabel={card.title}>
          <BlendImage source={card.art} width={112} height={76} mask="wide" zoom={1.15} />
          <View style={{ flex: 1 }}>
            <Text style={styles.planTitle}>{card.title}</Text>
            <Text style={styles.planBody}>{card.body}</Text>
            {tier === "free" ? <Text style={styles.planLink}>See {PLANS.pro.name} and {PLANS.black.name}</Text> : null}
          </View>
        </Surface>

        <View>
          <SectionLabel right={badges ? `${badges.earnedCount} of ${badges.total}` : undefined} onRight={() => router.push("/badges")} style={{ marginTop: 0, marginBottom: 12 }}>
            Badges
          </SectionLabel>
          <Row gap={S.sm}>
            {shelf.length
              ? shelf.map((b) => <BadgeTile key={b.id} badge={b} onPress={() => router.push("/badges")} />)
              : [0, 1, 2].map((i) => <Skeleton key={i} height={130} radius={R.md} style={{ flex: 1 }} />)}
          </Row>
        </View>

        {drop ? (
          <Surface onPress={openDrop} pressScale={0.98} radius={20} padding={10} accessibilityLabel={drop.title}>
            <Row gap={S.md}>
              <Image source={drop.image || PHOTOS.shoe} style={styles.dropArt} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.dropKicker}>{drop.status === "live" ? "Today's drop" : "Next drop"}</Text>
                <Text style={styles.dropTitle} numberOfLines={1}>
                  {drop.title}
                </Text>
                <Row gap={6} style={{ marginTop: 3 }}>
                  {drop.priceOut != null ? <Coin size={16} /> : null}
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
          </Surface>
        ) : null}
      </ScrollView>
      {/* The prototype draws the wallet with the tab bar, Profile lit. */}
      <StackTabBar current="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  h: { color: C.text, fontFamily: F.display, fontSize: 44, lineHeight: 42, textTransform: "uppercase" },
  hBlue: { color: C.accent, textShadowColor: "rgba(61,139,255,0.35)", textShadowRadius: 28, textShadowOffset: { width: 0, height: 0 } },
  // .bal
  bal: { paddingVertical: 16, paddingHorizontal: 18, overflow: "hidden" },
  coin: { position: "absolute", right: -26, top: -8 },
  label: { color: "#9fb0c9", fontFamily: F.body, fontSize: 12.5 },
  balance: { color: C.text, fontFamily: F.display, fontSize: 58, lineHeight: 60 },
  unit: { color: C.accentHi, fontFamily: F.display, fontSize: 22, marginBottom: 8, letterSpacing: 0.6 },
  week: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 13 },
  held: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: 4 },
  // .card.tier
  plan: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: 12, paddingHorizontal: 12 },
  planTitle: { color: C.text, fontFamily: F.display, fontSize: 22, textTransform: "uppercase" },
  planBody: { color: C.textDim, fontFamily: F.body, fontSize: 12.5, lineHeight: 17, marginTop: 2 },
  planLink: { color: C.accent, fontFamily: F.bodySemi, fontSize: 12.5, marginTop: 4 },
  dropArt: { width: 70, height: 70, borderRadius: 14, backgroundColor: "#000" },
  dropKicker: { color: C.accent, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase" },
  dropTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 16, marginTop: 2 },
  dropMeta: { color: C.textDim, fontFamily: F.body, fontSize: 13 },
});
