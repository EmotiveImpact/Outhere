// The city leaderboard: people, crews, or the areas of your city (boroughs
// in London, areas in other big cities, towns across the UK for smaller
// places), with a podium for the top three this week.

import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Body, C, Card, F, FadeIn, Header, PressableScale, Ring, S, Screen, Segment, SkeletonList } from "@/components/ui";
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
        <View style={[styles.block, { height: first ? 112 : place === 2 ? 78 : 60 }, first && { borderColor: "rgba(61,139,255,0.4)" }]}>
          <LinearGradient colors={first ? ["#24467e", "#121a28"] : ["#1b1f26", "#12151a"]} style={StyleSheet.absoluteFill} />
          <Text style={[styles.blockNum, first && { color: C.accentHi }]}>{place}</Text>
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
    <Screen header={<Header back title="Leaderboard" />}>
      <Segment
        options={[
          { value: "people", label: "People" },
          { value: "crews", label: "Crews" },
          { value: "areas", label: areaLabel },
        ]}
        value={kind}
        onChange={setKind}
      />
      <View style={{ marginTop: S.xl }}>
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
          {place}
        </Text>
        <Text style={[styles.title, { color: C.accent }]}>This week</Text>
      </View>
      {pending ? (
        <SkeletonList count={3} height={80} style={{ marginTop: S.xl }} />
      ) : rows.length ? (
        <>
          <Podium rows={rows.slice(0, 3)} unit={unit} onOpen={open} />
          {rows.length > 3 ? (
            <Card padding={0} style={{ marginTop: S.lg }}>
              {rows.slice(3, 30).map((r, i) => (
                <FadeIn key={r.id} index={Math.min(i, 8)}>
                  <PressableScale onPress={() => open?.(r)} disabled={!open} scaleTo={0.985} style={[styles.row, i > 0 && styles.divider, r.isMine && { backgroundColor: "rgba(61,139,255,0.08)" }]}>
                    <Text style={styles.rank}>{r.rank}</Text>
                    <Disc row={r} size={38} />
                    <Text style={[styles.name, r.isMine && { color: C.accentHi }]} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text style={styles.value}>{compactNumber(r.value)}</Text>
                  </PressableScale>
                </FadeIn>
              ))}
            </Card>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: C.text, fontFamily: F.display, fontSize: 46, lineHeight: 46, textTransform: "uppercase" },
  podium: { flexDirection: "row", alignItems: "flex-end", gap: S.sm, marginTop: S.xl },
  disc: { backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
  discTop: { backgroundColor: C.accent, shadowColor: C.accent, shadowOpacity: 0.7, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, borderWidth: 4, borderColor: "#1d3866" },
  discText: { color: C.text, fontFamily: F.display },
  podName: { color: C.text, fontFamily: F.bodySemi, fontSize: 14, marginTop: S.sm, maxWidth: "100%" },
  block: { alignSelf: "stretch", marginTop: S.sm, borderRadius: 16, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  blockNum: { color: C.textDim, fontFamily: F.display, fontSize: 34 },
  row: { flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.lg, height: 60 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  rank: { width: 22, color: C.textDim, fontFamily: F.display, fontSize: 18 },
  name: { flex: 1, color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  value: { color: C.text, fontFamily: F.display, fontSize: 20 },
});
