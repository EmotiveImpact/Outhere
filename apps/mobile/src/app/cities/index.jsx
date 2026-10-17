// The City League: every city plays in the division its walkers fill
// (Premier, Championship, League One), regions play for the places still on
// the way, and Rising lists places heading for 100. All worked out on the
// server from active members.

import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight, Hexagon, Map as MapIcon, Scale, Zap } from "@/components/ui/icons";
import { useCallUp, useCityLeague } from "@/data/hooks";
import { C, EmptyState, F, IconTile, Meter, R, Row, S, Skeleton, Surface, TAB_BAR_SPACE } from "@/components/ui";
import { GlowHero, TopBar } from "@/components/arena/OutsideKit";
import { StackTabBar } from "@/components/AppTabBar";
import { PHOTOS } from "@/constants/photos";
import { groupDivisions } from "@/data/outsideShared";
import { ACTIVE_TO_GO_LIVE } from "@/data/places";
import { formatNumber } from "@/utils/format";

/** Division heading (.lg-h): display caps on the left, the squad size on the right. */
function DivisionLabel({ children, right }) {
  return (
    <Row style={styles.divHead}>
      <Text style={styles.divName}>{children}</Text>
      {right ? <Text style={styles.divRight}>{right}</Text> : null}
    </Row>
  );
}

/** One side in a division (.lg-row): a lit row, yours lit blue. */
function SideRow({ side, rank, onPress }) {
  return (
    <Surface tone={side.mine ? "blue" : "lit"} radius={14} padding={null} pressScale={0.98} onPress={onPress} accessibilityLabel={`${side.name}, ${formatNumber(side.score)}`} contentStyle={styles.row}>
      <Text style={[styles.rank, side.mine && { color: C.accentHi }]}>{rank}</Text>
      <Text style={styles.name} numberOfLines={1}>
        {side.name}
      </Text>
      <Text style={styles.small} numberOfLines={1}>
        {formatNumber(side.active)} active{side.kind === "region" ? " · region" : ""}
      </Text>
      <View style={{ flex: 1 }} />
      <Text style={styles.score}>{formatNumber(side.score)}</Text>
    </Surface>
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
        contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_SPACE }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} progressViewOffset={insets.top + 60} />}
      >
        <GlowHero
          height={210}
          object={PHOTOS.ukmap}
          objectSize={250}
          objectStyle={{ right: -54, top: insets.top - 4 }}
          kicker={season ? `${season.name} · Week ${season.week} of ${season.weeks}` : "City League"}
          top="City"
          bottom="vs city"
          sub="Each city plays in the division its walkers fill."
        />
        <View style={{ paddingHorizontal: S.gutter }}>
          {callUp && !callUp.answer ? (
            <Surface tone="blue" padding={S.md} onPress={() => router.push("/cities/called-up")} pressScale={0.98} style={{ marginTop: S.lg }} contentStyle={styles.banner}>
              <View style={styles.bannerNum}>
                <Text style={styles.bannerNumText}>#{callUp.number}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>You've been called up</Text>
                <Text style={styles.small}>
                  {callUp.side} vs {callUp.opponent}, Saturday
                </Text>
              </View>
              <View>
                <ChevronRight size={18} color={C.textSoft} />
              </View>
            </Surface>
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
                  <DivisionLabel right={`Squads of ${d.squad}`}>{d.name}</DivisionLabel>
                  <View style={{ gap: 6 }}>
                    {d.sides.map((side, i) => (
                      <SideRow key={`${side.kind}-${side.id}`} side={side} rank={i + 1} onPress={() => router.push(side.mine ? "/cities/vs" : "/cities/fair")} />
                    ))}
                  </View>
                </View>
              ))}
              {data.rising?.length ? (
                <>
                  <DivisionLabel right={`${ACTIVE_TO_GO_LIVE} to enter`}>Rising</DivisionLabel>
                  <View style={{ gap: 6 }}>
                    {data.rising.map((c) => (
                      <Surface key={c.id} tone={c.mine ? "blue" : "lit"} radius={14} padding={null} pressScale={0.98} onPress={() => router.push(`/cities/rising?city=${c.id}`)} accessibilityLabel={`${c.name}, ${c.active} of ${ACTIVE_TO_GO_LIVE}`} contentStyle={styles.row}>
                        <View>
                          <Zap size={14} color={C.accentHi} fill={C.accent} />
                        </View>
                        <Text style={styles.name} numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text style={styles.small}>
                          {c.active} of {ACTIVE_TO_GO_LIVE}
                        </Text>
                        <Meter value={c.active / ACTIVE_TO_GO_LIVE} size={8} cap style={{ flex: 1, marginLeft: S.sm }} />
                      </Surface>
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
                  <Surface key={href} radius={18} padding={null} onPress={() => router.push(href)} accessibilityLabel={label} style={{ flex: 1 }} contentStyle={styles.door}>
                    <IconTile icon={Icon} size={38} radius={12} iconSize={18} />
                    <Text style={styles.doorText}>{label}</Text>
                  </Surface>
                ))}
              </Row>
            </>
          )}
        </View>
      </ScrollView>
      <TopBar />
      <StackTabBar current="outside" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: S.sm, height: 46, paddingHorizontal: S.lg },
  divHead: { justifyContent: "space-between", alignItems: "flex-end", marginTop: S.xl, marginBottom: S.sm },
  divName: { color: C.text, fontFamily: F.display, fontSize: 19, letterSpacing: 0.6, textTransform: "uppercase" },
  divRight: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  rank: { width: 20, color: C.textDim, fontFamily: F.display, fontSize: 19 },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 12, flexShrink: 1 },
  score: { color: C.text, fontFamily: F.display, fontSize: 21 },
  banner: { flexDirection: "row", alignItems: "center", gap: S.md },
  // .oh-num: the squad number in a lit blue tile
  bannerNum: { width: 52, height: 52, borderRadius: 14, backgroundColor: "#0d1a33", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(130,180,255,0.5), inset 0 0 0 1px rgba(61,139,255,0.55), 0 8px 20px -8px rgba(42,106,240,0.8)" },
  bannerNumText: { color: C.text, fontFamily: F.display, fontSize: 18 },
  door: { alignItems: "center", gap: 8, paddingVertical: S.md },
  doorText: { color: C.text, fontFamily: F.bodySemi, fontSize: 12 },
});
