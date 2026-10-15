// Areas in each launch city. London plays borough against borough; every
// other city plays by area. Steps counted this week, worked out on the server.

import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAreaTable, useCities, usePlaySide } from "@/data/hooks";
import { C, EmptyState, F, PressableScale, R, S, Skeleton, TAB_BAR_SPACE } from "@/components/ui";
import { GlowHero, TopBar } from "@/components/arena/OutsideKit";
import { StackTabBar } from "@/components/AppTabBar";
import { PHOTOS } from "@/constants/photos";
import { RankRows } from "@/components/arena/CityParts";
import { splitTitle } from "@/components/happenings/EventsScreen";
import { UK_AREAS } from "@/data/places";

const WITH_AREAS = new Set(UK_AREAS.map((a) => a.cityId));

export default function Areas() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const side = usePlaySide().data;
  const cities = (useCities().data || []).filter((c) => WITH_AREAS.has(c.id)).sort((a, b) => (b.isLive - a.isLive) || a.name.localeCompare(b.name));
  const [picked, setPicked] = useState(null);
  const cityId = picked || (side && WITH_AREAS.has(side.cityId) ? side.cityId : "london");
  const city = cities.find((c) => c.id === cityId);
  const { data: rows, isPending } = useAreaTable(cityId);
  const top = rows?.[0];
  const london = cityId === "london";
  const [white, blue] = top ? splitTitle(`${top.name} on top`) : ["", ""];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_SPACE }}>
        <GlowHero
          height={250}
          object={PHOTOS.crest}
          objectSize={200}
          objectStyle={{ right: -34, top: insets.top + 52 }}
          kicker={`${london ? "Borough Cup" : "Area Cup"} · ${city?.name || ""} · This week`}
          top={top ? white : "Areas"}
          bottom={top ? blue : "this week"}
          sub="London plays borough against borough. Every other city plays by area."
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.gutter, paddingTop: S.lg, paddingBottom: S.sm }}>
          {cities.map((c) => {
            const on = c.id === cityId;
            return (
              <PressableScale key={c.id} onPress={() => setPicked(c.id)} scaleTo={0.95} accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && { color: "#fff" }]}>{c.name}</Text>
              </PressableScale>
            );
          })}
        </ScrollView>
        <View style={{ paddingHorizontal: S.gutter, marginTop: S.md }}>
          {isPending ? (
            <View style={{ gap: S.sm }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} height={34} radius={R.sm} />
              ))}
            </View>
          ) : !rows?.length ? (
            <EmptyState title="No areas yet" body="This place plays for its region for now." />
          ) : (
            <RankRows
              rows={rows.map((r) => ({ id: r.areaId, name: r.name, value: r.counted, rank: r.rank, mine: r.mine }))}
              mineLabel={london ? "Your borough" : "Your area"}
              onPress={(r) => (r.mine ? router.push("/cities/countdown?kind=area") : null)}
            />
          )}
        </View>
      </ScrollView>
      <TopBar onMore={() => router.push(`/cities/map?city=${cityId}`)} />
      <StackTabBar current="outside" />
    </View>
  );
}

const styles = StyleSheet.create({
  // .oh-seg pills: lit glass, the picked one glowing blue
  chip: { height: 40, paddingHorizontal: 18, borderRadius: R.full, backgroundColor: "#171b22", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.06), 0 10px 22px -14px #000" },
  chipOn: { backgroundColor: "#2a6af0", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 10px 24px -10px rgba(42,106,240,0.9)" },
  chipText: { color: C.textSoft, fontFamily: F.bodySemi, fontSize: 13 },
});
