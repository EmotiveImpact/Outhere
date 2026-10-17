// The city leaderboard: people, crews, or the areas of your city (boroughs
// in London, areas in other big cities, towns across the UK for smaller
// places), with a podium for the top three this week.

import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft } from "@/components/ui/icons";
import { Body, C, F, FadeIn, PressableScale, Ring, Row, S, Segment, SkeletonList, Surface, TAB_BAR_SPACE, useScreenTop } from "@/components/ui";
import { StackTabBar } from "@/components/AppTabBar";
import { LitRound } from "@/components/clubs/parts";
import { useCityBoard, useLeaderboard } from "@/data/hooks";
import { compactNumber } from "@/utils/format";

const AREA_LABEL = { boroughs: "Boroughs", areas: "Areas", towns: "Towns", regions: "Regions" };

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

function Disc({ row, size, top }) {
  if (row.avatar || row.logo) {
    const src = row.avatar || row.logo;
    return <Ring size={size} tier={row.tier} square={!!row.logo} source={typeof src === "string" ? { uri: src } : src} name={row.name} />;
  }
  return (
    <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }, top && styles.discTop]}>
      <Text style={[styles.discText, { fontSize: size * 0.3 }, top && { color: "#fff" }]}>{(row.short && row.short.length > 1 ? row.short : row.name.replace(/[^A-Za-z]/g, "").slice(0, 2)).toUpperCase() || initials(row.name)}</Text>
    </View>
  );
}

function Podium({ rows, unit, onOpen }) {
  const [a, b, c] = rows;
  const col = (row, place) => {
    if (!row) return <View style={{ flex: 1 }} />;
    const first = place === 1;
    return (
      <PressableScale onPress={() => onOpen?.(row)} disabled={!onOpen} scaleTo={0.97} style={{ flex: 1, alignItems: "center" }}>
        <Disc row={row} size={first ? 64 : 52} top={first} />
        <Text style={styles.podName} numberOfLines={1}>
          {row.isMine && row.player?.isMe ? "You" : row.name}
        </Text>
        <Body dim size={12}>
          {compactNumber(row.value)}
          {first ? ` ${unit}` : ""}
        </Body>
        {/* the podium steps, lit along the top edge; first glows blue */}
        <View style={[styles.block, { height: first ? 104 : place === 2 ? 76 : 60 }, first && styles.blockFirst]}>
          <LinearGradient colors={first ? ["#2a4f8f", "#142038", "#0d1320"] : ["#1d222b", "#13171e"]} style={StyleSheet.absoluteFill} />
          <Text style={[styles.blockNum, first && styles.blockNumFirst]}>{place}</Text>
        </View>
      </PressableScale>
    );
  };
  return (
    <View style={styles.podium}>
      {col(b, 2)}
      {col(a, 1)}
      {col(c, 3)}
    </View>
  );
}

export default function CityBoard() {
  const router = useRouter();
  const top = useScreenTop();
  const [kind, setKind] = useState("people");
  const people = useLeaderboard({ scope: "city", period: "week", metric: "steps" });
  const crews = useCityBoard("crews");
  const areas = useCityBoard("areas");
  const areaLabel = AREA_LABEL[areas.data?.kind] || "Areas";

  let rows = [];
  let place = "";
  let unit = "steps";
  let pending = false;
  if (kind === "people") {
    pending = people.isPending;
    place = people.data?.city || "Your city";
    rows = (people.data?.entries || []).map((e) => ({ id: e.player.id, name: e.isMe ? "You" : e.player.name, avatar: e.player.avatar, tier: e.player.tier, value: e.value, rank: e.rank, isMine: e.isMe, player: e.player }));
  } else if (kind === "crews") {
    pending = crews.isPending;
    place = crews.data?.place || "";
    unit = "km";
    rows = crews.data?.rows || [];
  } else {
    pending = areas.isPending;
    place = areas.data?.place || "";
    rows = areas.data?.rows || [];
  }

  const open =
    kind === "people" ? (r) => router.push(r.player?.isMe ? "/(tabs)/profile" : `/player/${r.id}`) : kind === "crews" ? (r) => router.push(`/crew/${r.id}`) : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: top, paddingHorizontal: 18, paddingBottom: TAB_BAR_SPACE + 20 }}>
      {/* a centred title between round buttons, as the prototype's board */}
      <Row style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <LitRound icon={ChevronLeft} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/club"))} />
        <Text style={styles.head}>Leaderboard</Text>
        <View style={{ width: 38 }} />
      </Row>
      <Segment
        options={[
          { value: "people", label: "People" },
          { value: "crews", label: "Crews" },
          { value: "areas", label: areaLabel },
        ]}
        value={kind}
        onChange={setKind}
      />
      <View style={{ marginTop: 18 }}>
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
          {place}
        </Text>
        <Text style={[styles.title, styles.blue]}>This week</Text>
      </View>
      {pending ? (
        <SkeletonList count={3} height={80} style={{ marginTop: S.xl }} />
      ) : rows.length ? (
        <>
          <Podium rows={rows.slice(0, 3)} unit={unit} onOpen={open} />
          {rows.length > 3 ? (
            <Surface radius={22} padding={null} style={{ marginTop: 16 }}>
              {rows.slice(3, 30).map((r, i) => (
                <FadeIn key={r.id} index={Math.min(i, 8)}>
                  <PressableScale onPress={() => open?.(r)} disabled={!open} scaleTo={0.985} style={[styles.row, i > 0 && styles.divider, r.isMine && styles.meRow]}>
                    <Text style={styles.rank}>{r.rank}</Text>
                    <Disc row={r} size={38} />
                    <Text style={[styles.name, r.isMine && { color: C.accentHi }]} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text style={styles.value}>{compactNumber(r.value)}</Text>
                  </PressableScale>
                </FadeIn>
              ))}
            </Surface>
          ) : null}
          {kind === "areas" ? (
            <Body mute size={12} style={{ marginTop: S.md }}>
              {["towns", "regions"].includes(areas.data?.kind) ? "Every place on Outhere, by steps this week. Yours counts your steps too." : `Every part of ${place}, by steps this week. Yours counts your steps too.`}
            </Body>
          ) : null}
        </>
      ) : (
        <Body dim style={{ marginTop: S.xl }}>
          Nobody on the board yet this week.
        </Body>
      )}
      </ScrollView>
      <StackTabBar current="club" />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { color: C.text, fontFamily: F.bodySemi, fontSize: 16 },
  title: { color: C.text, fontFamily: F.display, fontSize: 36, lineHeight: 35, textTransform: "uppercase" },
  blue: { color: C.accent, textShadowColor: "rgba(61,139,255,0.5)", textShadowRadius: 26, textShadowOffset: { width: 0, height: 0 } },
  podium: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 20 },
  disc: { backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)" },
  discTop: { backgroundColor: C.accent, boxShadow: "0 0 0 4px #1d3866, 0 0 24px rgba(61,139,255,0.7)" },
  discText: { color: C.text, fontFamily: F.display },
  podName: { color: C.text, fontFamily: F.bodySemi, fontSize: 14, marginTop: S.sm, maxWidth: "100%" },
  block: { alignSelf: "stretch", marginTop: 8, borderRadius: 16, overflow: "hidden", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.04)" },
  blockFirst: { overflow: "visible", boxShadow: "inset 0 1px 0 rgba(130,180,255,0.45), inset 0 0 0 1px rgba(61,139,255,0.3), 0 16px 40px -14px rgba(42,106,240,0.7)" },
  blockNum: { color: C.textDim, fontFamily: F.display, fontSize: 32 },
  blockNumFirst: { color: "#82b4ff", textShadowColor: "rgba(79,155,255,0.7)", textShadowRadius: 16, textShadowOffset: { width: 0, height: 0 } },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, height: 58 },
  divider: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
  meRow: { backgroundColor: "rgba(61,139,255,0.1)" },
  rank: { width: 22, color: C.textDim, fontFamily: F.display, fontSize: 18 },
  name: { flex: 1, color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  value: { color: C.text, fontFamily: F.display, fontSize: 20 },
});
