// The area map: your city as hexes coloured by steps this week, with the
// cup table underneath. Switch to see clubs or friends this week instead.

import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAreaTable, useClubWeekTable, useFriendsWeek, usePlaySide } from "@/data/hooks";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { C, EmptyState, F, GlowBackdrop, Grain, R, Row, S, Segment, Skeleton, TAB_BAR_SPACE } from "@/components/ui";
import { TopBar } from "@/components/arena/OutsideKit";
import { HexMap, RankRows } from "@/components/arena/CityParts";
import { StackTabBar } from "@/components/AppTabBar";

// The dark street map the hexes sit on (.hexmap's background).
const STREETS = require("../../../assets/images/oh/map.jpg");
// Blue light pooled under the hexes.
const MAP_GLOW = [{ x: 0.5, y: 0.45, rx: 0.75, ry: 0.5, stops: [[0, "rgba(42,106,240,0.28)"], [0.6, "rgba(42,106,240,0.07)"], [1, "rgba(42,106,240,0)"]] }];

const daysLeft = () => {
  const d = new Date().getDay();
  const left = d === 0 ? 0 : 7 - d;
  return left === 0 ? "Ends tonight" : `${left} day${left === 1 ? "" : "s"} left`;
};

export default function AreaMap() {
  const insets = useSafeAreaInsets();
  const { city } = useLocalSearchParams();
  const side = usePlaySide().data;
  const cityId = typeof city === "string" ? city : side?.cityId || null;
  const [view, setView] = useState("areas");
  const areas = useAreaTable(cityId);
  const clubs = useClubWeekTable(cityId);
  const friends = useFriendsWeek();
  const rows = areas.data || [];
  const mine = rows.find((r) => r.mine);
  const [selected, setSelected] = useState(null);
  const london = (cityId || "london") === "london";
  const sel = selected || mine?.areaId || rows[0]?.areaId;

  // Clubs and friends light up the area they're in.
  const valueByArea = {};
  if (view === "clubs") for (const c of clubs.data || []) if (c.areaId) valueByArea[c.areaId] = (valueByArea[c.areaId] || 0) + c.counted;
  if (view === "friends") for (const f of friends.data || []) if (f.areaId) valueByArea[f.areaId] = (valueByArea[f.areaId] || 0) + f.counted;
  const tiles = rows.map((r) => ({ id: r.areaId, name: r.name, col: r.col, row: r.row, mine: r.mine, value: view === "areas" ? r.counted : valueByArea[r.areaId] || 0 }));

  const table =
    view === "areas"
      ? rows.map((r) => ({ id: r.areaId, name: r.name, value: r.counted, rank: r.rank, mine: r.mine }))
      : view === "clubs"
        ? (clubs.data || []).map((c, i) => ({ id: c.clubId, name: c.name, value: c.counted, rank: i + 1, mine: c.mine }))
        : (friends.data || []).map((f, i) => ({ id: f.id, name: f.isMe ? "You" : f.name, value: f.counted, rank: i + 1, mine: f.isMe }));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_SPACE }}>
        <View style={[styles.mapBox, { paddingTop: insets.top + 64 }]}>
          <Image source={STREETS} style={[StyleSheet.absoluteFill, { opacity: 0.85 }]} contentFit="cover" />
          <GlowBackdrop layers={MAP_GLOW} base={null} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={["rgba(7,9,12,0.75)", "rgba(7,9,12,0.1)", "rgba(7,9,12,0.05)", "rgba(7,9,12,0.85)"]} locations={[0, 0.22, 0.7, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <Grain amount={0.05} />
          <View style={{ paddingHorizontal: S.gutter }}>
            <Segment
              options={[
                { value: "areas", label: london ? "Boroughs" : "Areas" },
                { value: "clubs", label: "Clubs" },
                { value: "friends", label: "Friends" },
              ]}
              value={view}
              onChange={setView}
            />
          </View>
          {areas.isPending ? (
            <Skeleton height={300} radius={R.lg} style={{ margin: S.gutter }} />
          ) : rows.length ? (
            <View style={{ paddingHorizontal: S.md }}>
              <HexMap tiles={tiles} height={320} selected={sel} onSelect={setSelected} />
            </View>
          ) : (
            <EmptyState title="No map for this place yet" body="It plays for its region until it has 100 active." />
          )}
        </View>
        <View style={styles.sheet}>
          <LinearGradient colors={["#161a22", C.bg]} locations={[0, 0.5]} style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 26, borderTopRightRadius: 26 }]} pointerEvents="none" />
          <View style={styles.handle} />
          <Row style={{ justifyContent: "space-between", marginBottom: S.sm }}>
            <Text style={styles.title}>{view === "areas" ? `${london ? "Borough" : "Area"} Cup · this week` : view === "clubs" ? "Clubs this week" : "Friends this week"}</Text>
            <Text style={styles.small}>{daysLeft()}</Text>
          </Row>
          {table.length ? <RankRows rows={table} limit={10} mineLabel={view === "areas" ? (london ? "Your borough" : "Your area") : view === "clubs" ? "Your club" : ""} /> : <Text style={styles.small}>{view === "clubs" ? "No clubs here yet." : "Follow people to see them here."}</Text>}
        </View>
      </ScrollView>
      <TopBar />
      <StackTabBar current="outside" />
    </View>
  );
}

const styles = StyleSheet.create({
  mapBox: { backgroundColor: "#0b0e13", paddingBottom: S.xxl + 8, overflow: "hidden" },
  // the table slides up over the map: lit along its top edge
  sheet: { marginTop: -22, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: C.bg, paddingHorizontal: S.gutter, paddingTop: S.md, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 -18px 40px -12px rgba(0,0,0,0.85)" },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.22)", marginBottom: S.md },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 17 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
});
