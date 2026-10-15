// Checkout for a drop: size, where it's going and the total in OUT, then
// slide to claim. The server takes the OUT and opens the order.

import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { engine, useDeliveryAddress, useDropItem, useEngineMutation, useProfile } from "@/data/hooks";
import { Button, C, EmptyState, F, imageSource, R, Row, S, Skeleton, SlideToStart } from "@/components/ui";
import { BottomBar, Coin, GlowHero, SectionLabel, TopBar } from "@/components/arena/OutsideKit";
import { AddressCard, AddressSheet, SizeRow } from "@/components/happenings/ShopParts";
import { addressProblem } from "@/data/outsideShared";
import { formatNumber } from "@/utils/format";

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const id = String(params.dropId || "");
  const { data: drop, isPending, error } = useDropItem(id);
  const saved = useDeliveryAddress();
  const profile = useProfile().data;
  const [size, setSize] = useState(params.size ? String(params.size) : null);
  const [address, setAddress] = useState(null);
  const [editing, setEditing] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!address && saved.data) setAddress(saved.data);
  }, [saved.data, address]);

  const claim = useEngineMutation(engine.claimDrop, {
    success: (o) => `${o.title} is yours`,
    onSuccess: (o) => router.replace(`/orders/${o.id}`),
    onError: () => setAttempt((n) => n + 1),
  });

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Skeleton height={250 + insets.top} radius={30} />
        <View style={{ padding: S.gutter, gap: S.md }}>
          <Skeleton height={50} radius={14} />
          <Skeleton height={80} radius={R.lg} />
          <Skeleton height={120} radius={R.lg} />
        </View>
        <TopBar />
      </View>
    );
  }
  if (error || !drop) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 80 }}>
        <EmptyState title="That drop has gone" body="It may have sold out or ended." action="Back to drops" onAction={() => router.replace("/outside/drops")} />
        <TopBar />
      </View>
    );
  }

  const words = drop.title.split(" ");
  const first = words[0];
  const rest = words.slice(1).join(" ");
  const balance = profile?.out ?? 0;
  const delivery = drop.deliveryOut || 0;
  const after = balance - drop.priceOut - delivery;
  const needsSize = drop.sizes?.length > 0;
  const ready = (!needsSize || size) && address && !addressProblem(address) && after >= 0 && drop.canClaim;
  const blocker = drop.claimed
    ? "You've already claimed this one"
    : !drop.canClaim
      ? "Not open to claim right now"
      : needsSize && !size
        ? "Pick a size"
        : !address
          ? "Add where it's going"
          : after < 0
            ? `${formatNumber(-after)} OUT short`
            : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <GlowHero photo={imageSource(drop.image)} photoOpacity={0.35} height={190} kicker={`Checkout · ${formatNumber(drop.remaining)} left`}>
          <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit>
            {first} <Text style={{ color: C.accent }}>{rest}</Text>
          </Text>
        </GlowHero>
        <View style={{ paddingHorizontal: S.gutter }}>
          {needsSize ? (
            <>
              <SectionLabel right={drop.sizeNote || null}>Size</SectionLabel>
              <SizeRow sizes={drop.sizes} soldOut={drop.soldOutSizes} value={size} onChange={setSize} />
            </>
          ) : null}
          <View style={{ marginTop: S.xl }}>
            <AddressCard address={address} onChange={() => setEditing(true)} />
          </View>
          <View style={styles.summary}>
            <Row style={styles.line}>
              <Text style={styles.dim}>{drop.title}</Text>
              <Row gap={6}>
                <Coin size={16} />
                <Text style={styles.value}>{formatNumber(drop.priceOut)} OUT</Text>
              </Row>
            </Row>
            <Row style={styles.line}>
              <Text style={styles.dim}>Delivery</Text>
              <Text style={[styles.value, !delivery && { color: C.accent }]}>{delivery ? `${formatNumber(delivery)} OUT` : profile?.tier === "black" ? "Free with Black" : "Free"}</Text>
            </Row>
            <Row style={styles.line}>
              <Text style={styles.dim}>Balance after</Text>
              <Text style={[styles.value, after < 0 && { color: C.danger }]}>{formatNumber(after)} OUT</Text>
            </Row>
          </View>
        </View>
      </ScrollView>
      <BottomBar>
        {ready ? (
          <SlideToStart
            key={`${size}:${attempt}`}
            label="Slide to claim"
            done="Claiming"
            onComplete={() => claim.mutate({ dropId: drop.id, size: needsSize ? size : null, address, saveAddress: true })}
          />
        ) : (
          <Button title={blocker || "Slide to claim"} size="lg" full variant="secondary" disabled={!(!address && blocker)} onPress={() => setEditing(true)} />
        )}
      </BottomBar>
      <TopBar />
      <AddressSheet
        visible={editing}
        initial={address}
        onClose={() => setEditing(false)}
        onSave={(a) => {
          setAddress(a);
          setEditing(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: C.text, fontFamily: F.display, fontSize: 42, lineHeight: 44, textTransform: "uppercase" },
  summary: { marginTop: S.md, paddingHorizontal: S.lg, paddingVertical: S.sm, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.1)" },
  line: { justifyContent: "space-between", paddingVertical: 8 },
  dim: { color: C.textSoft, fontFamily: F.body, fontSize: 14 },
  value: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
});
