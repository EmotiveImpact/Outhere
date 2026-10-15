// Where your drop is, from claimed to your door.

import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOrder } from "@/data/hooks";
import { C, EmptyState, F, R, S, Skeleton } from "@/components/ui";
import { GlowHero, SectionLabel, TopBar } from "@/components/arena/OutsideKit";
import { OrderItem, OrderTimeline } from "@/components/happenings/ShopParts";
import { formatAddress, ORDER_HEADLINE } from "@/data/outsideShared";
import { formatNumber } from "@/utils/format";

const longDate = (ms) => new Date(ms).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

const arrives = (o) => {
  if (o.status === "delivered") {
    const at = o.history?.find((h) => h.status === "delivered")?.at;
    return at ? `Delivered ${longDate(at)}` : "Delivered";
  }
  if (o.status === "cancelled") return "Your OUT has gone back to your wallet";
  return o.arrivesOn ? `Arrives ${longDate(o.arrivesOn)}` : null;
};

export default function OrderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderId } = useLocalSearchParams();
  const { data: order, isPending, error, refetch, isRefetching } = useOrder(String(orderId || ""));

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Skeleton height={220 + insets.top} radius={30} />
        <View style={{ padding: S.gutter, gap: S.md }}>
          <Skeleton height={84} radius={R.lg} />
          <Skeleton height={220} radius={R.lg} />
        </View>
        <TopBar />
      </View>
    );
  }
  if (error || !order) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 80 }}>
        <EmptyState title="Order not found" body="It may belong to another account." action="Your orders" onAction={() => router.replace("/orders")} />
        <TopBar />
      </View>
    );
  }
  const [top, bottom] = ORDER_HEADLINE[order.status] || ["Your", "order"];
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} progressViewOffset={insets.top + 60} />}
      >
        <GlowHero height={200} kicker={`Order ${order.ref}`} top={top} bottom={bottom} sub={arrives(order)} />
        <View style={{ paddingHorizontal: S.gutter, paddingTop: S.xl, gap: S.md }}>
          <OrderItem order={order} />
          <OrderTimeline order={order} />
          <SectionLabel style={{ marginBottom: 4 }}>Delivering to</SectionLabel>
          <Text style={styles.dim}>
            {order.address?.name}
            {"\n"}
            {formatAddress(order.address)}
          </Text>
          <Text style={styles.dim}>
            {order.deliveryOut ? `Delivery ${formatNumber(order.deliveryOut)} OUT.` : "Free delivery."} Total {formatNumber(order.outSpent + (order.deliveryOut || 0))} OUT.
          </Text>
        </View>
      </ScrollView>
      <TopBar />
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { color: C.textSoft, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
});
