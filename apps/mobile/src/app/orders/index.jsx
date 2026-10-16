// Every drop you've claimed, newest first.

import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOrders } from "@/data/hooks";
import { C, EmptyState, F, R, S, Skeleton } from "@/components/ui";
import { TopBar } from "@/components/arena/OutsideKit";
import { OrderItem } from "@/components/happenings/ShopParts";

export default function OrdersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isPending, refetch, isRefetching } = useOrders();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={data || []}
        keyExtractor={(o) => o.id}
        onRefresh={refetch}
        refreshing={isRefetching}
        contentContainerStyle={{ paddingHorizontal: S.gutter, paddingTop: insets.top + 70, paddingBottom: insets.bottom + 40, gap: S.md }}
        ListHeaderComponent={<Text style={styles.title}>Your orders</Text>}
        ListEmptyComponent={
          isPending ? <Skeleton height={84} radius={R.lg} /> : <EmptyState title="No orders yet" body="Claim a drop with your OUT and it shows up here, from claimed to your door." action="See drops" onAction={() => router.replace("/outside/drops")} />
        }
        renderItem={({ item }) => <OrderItem order={item} onPress={() => router.push(`/orders/${item.id}`)} />}
      />
      <TopBar />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: C.text, fontFamily: F.display, fontSize: 40, textTransform: "uppercase", marginBottom: S.sm },
});
