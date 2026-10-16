// One drop. The product is the hero; price in OUT, what you'll have left,
// stock, sizes, then slide to claim so nobody buys by accident. Claiming goes
// on to checkout for the address and the total.

import React, { useEffect, useState } from "react";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDropItem, useProfile } from "@/data/hooks";
import { Body, Button, C, F, imageSource, Row, S, Skeleton, SlideToStart } from "@/components/ui";
import { BottomBar, Coin, GlowHero, TopBar, Bar } from "@/components/arena/OutsideKit";
import { SizeRow } from "@/components/happenings/ShopParts";
import { splitTitle } from "@/components/happenings/EventsScreen";
import { clock } from "@/components/happenings/DropsScreen";
import { useNow } from "@/components/happenings/shared";
import LegacyDropScreen from "@/components/happenings/LegacyDropScreen";
import { formatNumber } from "@/utils/format";

export default function DropScreen() {
  const { dropId } = useLocalSearchParams();
  const id = Array.isArray(dropId) ? dropId[0] : dropId;
  const { data: drop, isPending, error } = useDropItem(id);
  // Older reservable drops (priced in pounds) still open on their own screen.
  if (error?.code === "NOT_FOUND") return <LegacyDropScreen />;
  if (isPending || !drop) return <Loading />;
  return <ShopDrop drop={drop} />;
}

function Loading() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Skeleton height={360 + insets.top} radius={30} />
      <View style={{ padding: S.gutter, gap: S.md }}>
        <Skeleton width={160} height={36} />
        <Skeleton height={8} />
        <Skeleton height={50} radius={14} />
      </View>
      <TopBar />
    </View>
  );
}

const KICKER = {
  live: "Limited · first come, first served",
  early: "Early access · members first",
  upcoming: "Coming soon",
  soldout: "Sold out",
  ended: "This drop has ended",
};

function ShopDrop({ drop }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useProfile().data;
  const now = useNow(1000);
  const [size, setSize] = useState(null);

  useEffect(() => {
    if (size) return;
    const open = (drop.sizes || []).filter((s) => !(drop.soldOutSizes || []).includes(s));
    if (open.length === 1) setSize(open[0]);
  }, [drop, size]);

  const [top, bottom] = splitTitle(drop.title);
  const balance = profile?.out ?? 0;
  const left = balance - drop.priceOut;
  const needsSize = drop.sizes?.length > 0;
  const share = () => Share.share({ message: `${drop.title} drops on Outhere for ${formatNumber(drop.priceOut)} OUT.` }).catch(() => {});

  const goCheckout = () => router.push({ pathname: "/drops/checkout/[dropId]", params: { dropId: drop.id, size: size || "" } });

  let action;
  if (drop.claimed) {
    action = <Button title="Track your order" size="lg" full onPress={() => router.push(`/orders/${drop.orderId}`)} />;
  } else if (!drop.tierOk) {
    action = <Button title="Black members only" size="lg" full variant="secondary" onPress={() => router.push("/membership")} />;
  } else if (drop.status === "upcoming" || (drop.status === "early" && !drop.hasEarlyAccess)) {
    action = <Button title={`Opens in ${clock(drop.opensAt, now)}`} size="lg" full variant="secondary" disabled />;
  } else if (drop.status === "soldout" || drop.status === "ended") {
    action = <Button title={drop.status === "ended" ? "Drop ended" : "Sold out"} size="lg" full variant="secondary" disabled />;
  } else if (needsSize && !size) {
    action = <Button title="Pick a size" size="lg" full variant="secondary" disabled />;
  } else if (left < 0) {
    action = <Button title={`${formatNumber(-left)} OUT short`} size="lg" full variant="secondary" onPress={() => router.push("/outside/challenges")} />;
  } else {
    action = <SlideToStart key={size || "one"} label="Slide to claim" done="Claiming" onComplete={goCheckout} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <GlowHero photo={imageSource(drop.image)} photoFocus={{ x: 0.5, y: 0.4 }} height={358} headlineSize={44} kicker={KICKER[drop.status]} top={top} bottom={bottom} />
        <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg }}>
          <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
            <Row gap={S.sm} style={{ alignItems: "flex-end" }}>
              <Coin size={28} style={{ marginBottom: 6 }} />
              <Text style={styles.price}>{formatNumber(drop.priceOut)}</Text>
              <Text style={styles.unit}>OUT</Text>
            </Row>
            <Text style={[styles.left, left < 0 && { color: C.danger }]}>{left >= 0 ? `You'll have ${formatNumber(left)} left` : `You have ${formatNumber(balance)}`}</Text>
          </Row>

          <Row style={{ justifyContent: "space-between", marginTop: S.lg, marginBottom: 7 }}>
            <Text style={styles.label}>Stock</Text>
            <Text style={styles.stock}>
              {formatNumber(drop.remaining)} of {formatNumber(drop.total)} left
            </Text>
          </Row>
          <Bar value={drop.total ? drop.remaining / drop.total : 0} />

          {needsSize ? (
            <View style={{ marginTop: S.lg }}>
              <SizeRow sizes={drop.sizes} soldOut={drop.soldOutSizes} value={size} onChange={setSize} />
              {drop.sizeNote ? <Text style={[styles.label, { marginTop: S.sm }]}>{drop.sizeNote}</Text> : null}
            </View>
          ) : null}

          {drop.status === "upcoming" || drop.status === "early" ? (
            <Text style={[styles.label, { marginTop: S.lg }]}>
              {drop.hasEarlyAccess && drop.earlyAccessHours ? `Your early access opens ${drop.earlyAccessHours}h before everyone else.` : drop.earlyAccessHours ? `Pro and Black members get ${drop.earlyAccessHours}h early access.` : "Opens to everyone at once."}
            </Text>
          ) : null}

          {drop.description ? (
            <Body dim style={{ marginTop: S.xl, lineHeight: 22 }}>
              {drop.description}
            </Body>
          ) : null}
          <Text style={[styles.label, { marginTop: S.md }]}>{drop.deliveryOut ? `Delivery ${formatNumber(drop.deliveryOut)} OUT. Free with Black.` : "Free delivery with Black."}</Text>
        </View>
      </ScrollView>
      <BottomBar>{action}</BottomBar>
      <TopBar onShare={share} />
    </View>
  );
}

const styles = StyleSheet.create({
  price: { color: C.text, fontFamily: F.display, fontSize: 40, lineHeight: 42 },
  unit: { color: C.textDim, fontFamily: F.bodyMedium, fontSize: 13, marginBottom: 6 },
  left: { color: C.textDim, fontFamily: F.body, fontSize: 13, marginBottom: 8 },
  label: { color: C.textDim, fontFamily: F.body, fontSize: 13 },
  stock: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
});
