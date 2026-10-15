// The whole drop shop in a grid.

import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useDropShop } from "@/data/hooks";
import { C, EmptyState, F, imageSource, PressableScale, R, Row, S, Skeleton } from "@/components/ui";
import { Coin, TopBar } from "@/components/arena/OutsideKit";
import { formatNumber } from "@/utils/format";

export default function DropShopScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isPending, refetch, isRefetching } = useDropShop();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <FlatList
        data={data || []}
        keyExtractor={(d) => d.id}
        numColumns={2}
        onRefresh={refetch}
        refreshing={isRefetching}
        columnWrapperStyle={{ gap: S.md }}
        contentContainerStyle={{ paddingHorizontal: S.gutter, paddingTop: insets.top + 70, paddingBottom: insets.bottom + 40, gap: S.md }}
        ListHeaderComponent={<Text style={styles.title}>Drop shop</Text>}
        ListEmptyComponent={isPending ? <Skeleton height={220} radius={R.lg} /> : <EmptyState title="No drops yet" body="New kit lands here first." />}
        renderItem={({ item: d }) => {
          const gone = d.status === "soldout" || d.status === "ended";
          return (
            <PressableScale onPress={() => router.push(`/drops/${d.id}`)} scaleTo={0.97} style={styles.card}>
              <View style={styles.art}>
                {d.image ? <Image source={imageSource(d.image)} style={[StyleSheet.absoluteFill, gone && { opacity: 0.4 }]} contentFit="cover" /> : null}
                {d.tag ? <Text style={styles.tag}>{d.tag}</Text> : null}
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {d.title}
              </Text>
              <Row gap={6} style={{ marginTop: 4 }}>
                <Coin size={15} />
                <Text style={styles.price}>{formatNumber(d.priceOut)}</Text>
              </Row>
            </PressableScale>
          );
        }}
      />
      <TopBar />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: C.text, fontFamily: F.display, fontSize: 40, textTransform: "uppercase", marginBottom: S.sm },
  card: { flex: 1, padding: 10, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.08)" },
  art: { aspectRatio: 1, borderRadius: 12, overflow: "hidden", backgroundColor: "#000", marginBottom: S.md },
  tag: { position: "absolute", left: 8, top: 8, color: "#fff", fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 0.8, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 11, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 3 },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  price: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
});
