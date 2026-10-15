// The City League: every city plays in the division its walkers fill
// (Premier, Championship, League One), regions play for the places still on
// the way, and Rising lists places heading for 100. All worked out on the
// server from active members.

import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight, Hexagon, Map as MapIcon, Scale, Zap } from "lucide-react-native";
import { useCallUp, useCityLeague } from "@/data/hooks";
import { C, EmptyState, F, PressableScale, R, Row, S, Skeleton } from "@/components/ui";
import { Bar, GlowHero, SectionLabel, TopBar } from "@/components/arena/OutsideKit";
import { groupDivisions } from "@/data/outsideShared";
import { ACTIVE_TO_GO_LIVE } from "@/data/places";
import { formatNumber } from "@/utils/format";

function SideRow({ side, rank, onPress }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={[styles.row, side.mine && styles.rowMine]}>
      <Text style={[styles.rank, side.mine && { color: C.accent }]}>{rank}</Text>
      <Text style={styles.name} numberOfLines={1}>
        {side.name}
      </Text>
      <Text style={styles.small}>
        {formatNumber(side.active)} active{side.kind === "region" ? " · region" : ""}
      </Text>
      <View style={{ flex: 1 }} />
      <Text style={styles.score}>{formatNumber(side.score)}</Text>
    </PressableScale>
  );
}

export default function CityLeague() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isPending, refetch, isRefetching } = useCityLeague();
  const callUp = useCallUp().data;
  const divisions = groupDivisions(data?.sides || []);
  const season = data?.season;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} progressViewOffset={insets.top + 60} />}
      >
        <GlowHero height={200} kicker={season ? `${season.name} · Week ${season.week} of ${season.weeks}` : "City League"} top="City" bottom="vs city" sub="Each city plays in the division its walkers fill." />
        <View style={{ paddingHorizontal: S.gutter }}>
          {callUp && !callUp.answer ? (
            <PressableScale onPress={() => router.push("/cities/called-up")} scaleTo={0.98} style={styles.banner}>
              <View style={styles.bannerNum}>
                <Text style={styles.bannerNumText}>#{callUp.number}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>You've been called up</Text>
                <Text style={styles.small}>
                  {callUp.side} vs {callUp.opponent}, Saturday
                </Text>
              </View>
              <ChevronRight size={18} color={C.textDim} />
            </PressableScale>
          ) : null}

          {isPending ? (
            <View style={{ gap: S.sm, marginTop: S.lg }}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={48} radius={R.md} />
              ))}
            </View>
          ) : !data ? (
            <EmptyState title="League starts soon" body="Sides form from active members each week." />
          ) : (
            <>
              {divisions.map((d) => (
                <View key={d.key}>
                  <SectionLabel right={`Squads of ${d.squad}`}>{d.name}</SectionLabel>
                  <View style={{ gap: 6 }}>
                    {d.sides.map((side, i) => (
                      <SideRow key={`${side.kind}-${side.id}`} side={side} rank={i + 1} onPress={() => router.push(side.mine ? "/cities/vs" : "/cities/fair")} />
                    ))}
                  </View>
                </View>
              ))}
              {data.rising?.length ? (
                <>
                  <SectionLabel right={`${ACTIVE_TO_GO_LIVE} to enter`}>Rising</SectionLabel>
                  <View style={{ gap: 6 }}>
                    {data.rising.map((c) => (
                      <PressableScale key={c.id} onPress={() => router.push(`/cities/rising?city=${c.id}`)} scaleTo={0.98} style={[styles.row, c.mine && styles.rowMine]}>
                        <Zap size={14} color={C.accent} />
                        <Text style={styles.name} numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text style={styles.small}>
                          {c.active} of {ACTIVE_TO_GO_LIVE}
                        </Text>
                        <Bar value={c.active / ACTIVE_TO_GO_LIVE} style={{ flex: 1, marginLeft: S.sm }} />
                      </PressableScale>
                    ))}
                  </View>
                </>
              ) : null}
              <Row gap={S.sm} style={{ marginTop: S.xl }}>
                {[
                  [Scale, "Why it's fair", "/cities/fair"],
                  [Hexagon, "Areas", "/cities/areas"],
                  [MapIcon, "Map", "/cities/map"],
                ].map(([Icon, label, href]) => (
                  <PressableScale key={href} onPress={() => router.push(href)} scaleTo={0.96} style={styles.door}>
                    <Icon size={18} color={C.accent} />
                    <Text style={styles.doorText}>{label}</Text>
                  </PressableScale>
                ))}
              </Row>
            </>
          )}
        </View>
      </ScrollView>
      <TopBar />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: S.sm, height: 48, paddingHorizontal: S.lg, borderRadius: R.md, backgroundColor: C.surface },
  rowMine: { borderWidth: 1.5, borderColor: C.accent, backgroundColor: "rgba(61,139,255,0.08)" },
  rank: { width: 18, color: C.textDim, fontFamily: F.display, fontSize: 18 },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  score: { color: C.text, fontFamily: F.display, fontSize: 20 },
  banner: { flexDirection: "row", alignItems: "center", gap: S.md, marginTop: S.lg, padding: S.md, borderRadius: R.lg, backgroundColor: "rgba(61,139,255,0.1)", borderWidth: 1, borderColor: "rgba(61,139,255,0.4)" },
  bannerNum: { width: 52, height: 52, borderRadius: 14, backgroundColor: "#0d1a33", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(61,139,255,0.6)" },
  bannerNumText: { color: C.text, fontFamily: F.display, fontSize: 18 },
  door: { flex: 1, alignItems: "center", gap: 6, paddingVertical: S.md, borderRadius: R.md, backgroundColor: C.surface },
  doorText: { color: C.text, fontFamily: F.bodySemi, fontSize: 12 },
});
