// Outside > Drops. The next drop fills the screen with a live countdown and
// the shop scrolls sideways underneath. Everything is priced in OUT.

import React, { useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Package } from "lucide-react-native";
import { useDropShop, useOrders, useProfile } from "@/data/hooks";
import { useOutsideScrollPersistence } from "@/hooks/useOutsideScrollPersistence";
import { C, EmptyState, F, FadeIn, imageSource, PressableScale, R, Row, S, Skeleton, TAB_BAR_SPACE } from "@/components/ui";
import { Coin, GlowHero, SectionLabel } from "@/components/arena/OutsideKit";
import { useNow } from "@/components/happenings/shared";
import { ORDER_LABELS } from "@/data/outsideShared";
import { formatNumber } from "@/utils/format";

/** 02:13:39, or 3d 02:13 when it is days away. */
export const clock = (target, now) => {
  const diff = Math.max(0, Number(target) - now);
  const d = Math.floor(diff / 86_400_000);
  const h = String(Math.floor((diff % 86_400_000) / 3_600_000)).padStart(2, "0");
  const m = String(Math.floor((diff % 3_600_000) / 60_000)).padStart(2, "0");
  const s = String(Math.floor((diff % 60_000) / 1000)).padStart(2, "0");
  return d > 0 ? `${d}d ${h}:${m}` : `${h}:${m}:${s}`;
};

const TAG_STYLE = {
  NEW: { backgroundColor: C.accent, borderColor: C.accent },
  SOON: { backgroundColor: "rgba(61,139,255,0.2)", borderColor: C.accent },
  BLACK: { backgroundColor: "rgba(0,0,0,0.7)", borderColor: "rgba(255,255,255,0.6)" },
};

function ShopCard({ drop, onPress }) {
  const gone = drop.status === "soldout" || drop.status === "ended";
  return (
    <PressableScale onPress={onPress} scaleTo={0.97} style={styles.card}>
      <View style={styles.art}>
        {drop.image ? <Image source={imageSource(drop.image)} style={[StyleSheet.absoluteFill, gone && { opacity: 0.45 }]} contentFit="cover" transition={200} /> : null}
        {drop.tag ? (
          <View style={[styles.tag, TAG_STYLE[drop.tag] || { backgroundColor: "rgba(0,0,0,0.7)", borderColor: "rgba(255,255,255,0.25)" }]}>
            <Text style={styles.tagText}>{drop.tag}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {drop.title}
      </Text>
      <Row gap={6} style={{ marginTop: 4 }}>
        <Coin size={16} />
        <Text style={styles.price}>{formatNumber(drop.priceOut)}</Text>
      </Row>
    </PressableScale>
  );
}

export default function OutsideDropsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scrollRef, handleScroll } = useOutsideScrollPersistence("drops");
  const { data, isPending, isRefetching, refetch } = useDropShop();
  const orders = useOrders().data || [];
  const tier = useProfile().data?.tier;
  const now = useNow(1000);
  const drops = useMemo(() => data || [], [data]);

  // The next drop still to open, else the newest one live.
  const next = useMemo(() => {
    const soon = drops.filter((d) => d.opensAt > now).sort((a, b) => a.opensAt - b.opensAt);
    return soon[0] || drops.find((d) => d.status === "live") || null;
  }, [drops, now]);

  React.useEffect(() => {
    // Refresh the moment the next drop opens so its button turns on.
    if (next && next.opensAt > now && next.opensAt - now < 1100) setTimeout(refetch, 1200);
  }, [next, now, refetch]);

  const shop = drops.filter((d) => d.id !== next?.id);
  const openNow = next && next.opensAt <= now;
  const earlyLine = next?.tierRequired === "black" || next?.earlyAccessHours ? (next?.tierRequired === "black" ? "Black only" : tier && tier !== "free" ? "Your early access opens first" : "Black members first") : null;
  const kicker = openNow ? `Live now · ${formatNumber(next.remaining)} left` : `Next drop${earlyLine ? ` · ${earlyLine}` : ""}`;
  const live = orders.find((o) => o.status !== "delivered" && o.status !== "cancelled");

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={handleScroll}
      scrollEventThrottle={32}
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + insets.bottom + S.lg }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} progressViewOffset={insets.top + 60} />}
    >
      {isPending ? (
        <View>
          <Skeleton height={340 + insets.top} radius={30} />
          <Row gap={S.md} style={{ padding: S.gutter }}>
            <Skeleton width={150} height={190} radius={R.lg} />
            <Skeleton width={150} height={190} radius={R.lg} />
          </Row>
        </View>
      ) : !drops.length ? (
        <EmptyState style={{ paddingTop: insets.top + 90 }} title="No drops yet" body="New kit lands here first. Pull down to refresh." />
      ) : (
        <>
          {next ? (
            <PressableScale onPress={() => router.push(`/drops/${next.id}`)} scaleTo={0.995} haptic={false} accessibilityLabel={`Open ${next.title}`}>
              <GlowHero photo={imageSource(next.image)} photoOpacity={0.45} height={340} kicker={kicker} top={next.title} bottom={openNow ? `${formatNumber(next.priceOut)} OUT` : clock(next.opensAt, now)} />
            </PressableScale>
          ) : null}

          {live ? (
            <PressableScale onPress={() => router.push(`/orders/${live.id}`)} scaleTo={0.98} style={styles.orderRow}>
              <Package size={18} color={C.accent} />
              <Text style={styles.orderText} numberOfLines={1}>
                {live.title} · {ORDER_LABELS[live.status] || live.status}
              </Text>
              <Text style={styles.orderLink}>Track</Text>
            </PressableScale>
          ) : null}

          <View style={{ paddingHorizontal: S.gutter }}>
            <SectionLabel right={`All ${drops.length}`} onRight={() => router.push("/drops")}>
              In the drop shop
            </SectionLabel>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.gutter, gap: S.md }}>
            {shop.map((d, i) => (
              <FadeIn key={d.id} index={i}>
                <ShopCard drop={d} onPress={() => router.push(`/drops/${d.id}`)} />
              </FadeIn>
            ))}
          </ScrollView>

          {orders.length ? (
            <View style={{ paddingHorizontal: S.gutter }}>
              <SectionLabel right="See all" onRight={() => router.push("/orders")}>
                Your orders
              </SectionLabel>
              <Text style={styles.dim}>
                {orders.length} {orders.length === 1 ? "order" : "orders"}
                {live ? `, one on its way` : ", all delivered"}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { width: 150, padding: 10, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.08)" },
  art: { height: 112, borderRadius: 12, overflow: "hidden", backgroundColor: "#000", marginBottom: S.md },
  tag: { position: "absolute", left: 8, top: 8, paddingHorizontal: 8, height: 22, borderRadius: R.full, borderWidth: 1, justifyContent: "center" },
  tagText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 0.8 },
  cardTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  price: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  orderRow: { flexDirection: "row", alignItems: "center", gap: S.md, marginHorizontal: S.gutter, marginTop: S.lg, height: 52, paddingHorizontal: S.lg, borderRadius: R.md, backgroundColor: C.surface },
  orderText: { flex: 1, color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  orderLink: { color: C.accent, fontFamily: F.bodyMedium, fontSize: 13 },
  dim: { color: C.textDim, fontFamily: F.body, fontSize: 14 },
});
