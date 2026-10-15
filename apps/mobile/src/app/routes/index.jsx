// Your routes: big map cards you swipe through, mine, my club's and popular
// ones where I live. Each card shows your best on it; the numbers underneath
// follow the card in view. Play starts it, tapping opens the route.

import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Play, Plus, Route as RouteIcon } from "lucide-react-native";
import { Button, C, EmptyState, F, FadeIn, PressableScale, R, S, Segment, Skeleton } from "@/components/ui";
import { useProfile, useRoutes } from "@/data/hooks";
import { formatDuration, formatNumber } from "@/utils/format";
import RunMap from "@/components/move/RunMap";
import { RoundGlass } from "@/components/move/parts";
import { StatCards } from "@/components/move/RunBits";
import { drawNewRoute, runRoute } from "@/components/move/launch";

const SCOPES = [
  { value: "mine", label: "Mine" },
  { value: "crew", label: "Crew" },
  { value: "popular", label: "Popular" },
];

const subline = (r) => {
  const bits = [`${r.distanceKm.toFixed(1)} km`];
  if (r.stats?.runs) bits.push(`run ${r.stats.runs} ${r.stats.runs === 1 ? "time" : "times"}`);
  else if (r.owner) bits.push(`by ${r.owner.name.split(" ")[0]}`);
  else if (r.runners) bits.push(`${formatNumber(r.runners)} runners`);
  else if (r.climbM != null) bits.push(`${r.climbM} m climb`);
  return bits.join(" · ");
};

function RouteCard({ route, width, height, onOpen, onPlay }) {
  const badge = route.stats?.bestSec ? `Your best ${formatDuration(route.stats.bestSec)}` : route.tag || (route.clubName ? route.clubName : route.mine ? "Your route" : null);
  return (
    <PressableScale onPress={onOpen} scaleTo={0.98} accessibilityLabel={`${route.name}, ${subline(route)}`} style={[styles.card, { width, height }]}>
      <RunMap style={StyleSheet.absoluteFill} fitTo={route.path} plannedPath={route.path} plannedStyle="solid" waypoints={[route.path[0]]} interactive={false} showsUser={false} padding={{ top: 70, right: 36, bottom: 110, left: 36 }} />
      <LinearGradient colors={["rgba(7,9,12,0)", "rgba(7,9,12,0.88)"]} locations={[0.45, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <View style={styles.cardFoot}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName} numberOfLines={1} adjustsFontSizeToFit>
            {route.name}
          </Text>
          <Text style={styles.cardSub}>{subline(route)}</Text>
        </View>
        <PressableScale onPress={onPlay} scaleTo={0.9} accessibilityLabel={`Start ${route.name}`} style={styles.play}>
          <Play size={18} color="#fff" fill="#fff" />
        </PressableScale>
      </View>
    </PressableScale>
  );
}

export default function YourRoutes() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screen } = useWindowDimensions();
  const [scope, setScope] = useState("mine");
  const [index, setIndex] = useState(0);
  const { data: profile } = useProfile();
  const { data: routes, isPending } = useRoutes(scope);

  useEffect(() => setIndex(0), [scope]);

  const width = Math.min(420, screen) - S.gutter * 2 - 18;
  const height = Math.round(width * 1.12);
  const step = width + 12;
  const list = routes || [];
  const current = list[Math.min(index, list.length - 1)];

  const stats = current
    ? [
        { label: "Best time", value: current.stats?.bestSec ? formatDuration(current.stats.bestSec) : "--" },
        { label: "Runs", value: formatNumber(current.stats?.runs || 0) },
        current.mine || current.stats?.runs ? { label: "OUT earned", value: formatNumber(current.stats?.outEarned || 0) } : { label: "Climb", value: `${current.climbM ?? 0} m` },
      ]
    : [];

  const where = profile?.area || profile?.city;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <RoundGlass icon={ChevronLeft} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.navigate("/(tabs)/move"))} />
          <Button title="New route" icon={Plus} size="sm" onPress={() => drawNewRoute(router)} />
        </View>
        <View style={styles.head}>
          <Text style={styles.h1}>Your</Text>
          <Text style={[styles.h1, { color: C.accent }]}>Routes</Text>
        </View>
        <Segment options={SCOPES} value={scope} onChange={setScope} style={{ marginHorizontal: S.gutter }} />

        {isPending ? (
          <View style={{ paddingHorizontal: S.gutter, marginTop: S.lg, gap: S.md }}>
            <Skeleton height={height} radius={26} />
          </View>
        ) : !list.length ? (
          <EmptyState
            icon={RouteIcon}
            title={scope === "mine" ? "No routes yet" : scope === "crew" ? "No club routes yet" : "Nothing popular yet"}
            body={
              scope === "mine"
                ? "Draw a loop on the map or pick a 3, 5 or 10 km suggestion, then save it to run again."
                : scope === "crew"
                  ? "When your club shares routes, they land here."
                  : `Routes your clubs share${where ? ` around ${where}` : " near you"} show up here.`
            }
            action={scope === "mine" ? "Plan a route" : undefined}
            onAction={() => drawNewRoute(router)}
          />
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={step}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: S.gutter, gap: 12, marginTop: S.lg }}
              onScroll={(e) => setIndex(Math.max(0, Math.round(e.nativeEvent.contentOffset.x / step)))}
              scrollEventThrottle={64}
            >
              {list.map((r) => (
                <RouteCard key={r.id} route={r} width={width} height={height} onOpen={() => router.push(`/routes/${r.id}`)} onPlay={() => runRoute(router, r)} />
              ))}
            </ScrollView>
            <FadeIn key={current?.id} style={{ paddingHorizontal: S.gutter, marginTop: S.md }}>
              <StatCards items={stats} />
            </FadeIn>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: S.gutter, paddingTop: S.sm },
  head: { paddingHorizontal: S.gutter, marginTop: S.lg, marginBottom: S.lg },
  h1: { color: C.text, fontFamily: F.display, fontSize: 52, lineHeight: 52, textTransform: "uppercase" },
  card: { borderRadius: 26, overflow: "hidden", backgroundColor: "#0b0e13" },
  badge: { position: "absolute", top: 14, left: 14, paddingHorizontal: 12, height: 30, borderRadius: R.full, backgroundColor: "rgba(18,22,30,0.82)", justifyContent: "center" },
  badgeText: { color: C.text, fontFamily: F.bodySemi, fontSize: 12.5 },
  cardFoot: { position: "absolute", left: 16, right: 16, bottom: 16, flexDirection: "row", alignItems: "flex-end", gap: 12 },
  cardName: { color: C.text, fontFamily: F.display, fontSize: 30, lineHeight: 32, textTransform: "uppercase" },
  cardSub: { color: C.textSoft, fontFamily: F.body, fontSize: 13, marginTop: 2 },
  play: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", shadowColor: C.accent, shadowOpacity: 0.6, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
});
