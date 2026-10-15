// Arena season results: where you finished in your city and the rewards you
// picked up. The server works out the rank and pays the prize once.

import React from "react";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { CalendarClock } from "lucide-react-native";
import { engine, useArenaNow, useEngineMutation, useSeasonResults } from "@/data/hooks";
import { Button, C, EmptyState, F, R, Row, S, Skeleton, TAB_BAR_SPACE } from "@/components/ui";
import { BottomBar, GlowHero, SectionLabel, TopBar } from "@/components/arena/OutsideKit";
import { PHOTOS } from "@/constants/photos";
import { formatNumber } from "@/utils/format";

const startsLine = (iso) => {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  const days = Math.round((d.getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
  if (days <= 0) return "is on now";
  if (days === 1) return "starts tomorrow";
  if (days < 7) return `starts ${d.toLocaleDateString("en-GB", { weekday: "long" })}`;
  return `starts ${d.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`;
};

export default function SeasonResults() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: r, isPending } = useSeasonResults();
  const arena = useArenaNow().data;
  const claim = useEngineMutation(engine.claimSeasonRewards, { success: "Rewards picked up" });

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Skeleton height={300 + insets.top} radius={30} />
        <TopBar />
      </View>
    );
  }
  if (!r) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 80 }}>
        <EmptyState title="First season still running" body={arena ? `${arena.name} is in week ${arena.week} of ${arena.weeks}. Results land when it ends.` : "Results land when a season ends."} action="Back to the Arena" onAction={() => router.replace("/outside/arena")} />
        <TopBar />
      </View>
    );
  }

  const pct = Math.max(1, Math.round((r.rank / r.players) * 100));
  const rewards = [
    { key: "out", image: PHOTOS.coin, title: `${formatNumber(r.prizeOut)} OUT`, sub: "season prize" },
    { key: "badge", image: PHOTOS.badge, title: r.name, sub: "finisher badge" },
    ...(r.perk === "black_week" ? [{ key: "black", image: PHOTOS.blackcard, title: "Black week", sub: "free trial" }] : []),
  ];
  const share = () => Share.share({ message: `I finished #${r.rank} of ${formatNumber(r.players)} in ${r.city} in the Outhere Arena, ${r.name}.` }).catch(() => {});

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: (r.claimed ? TAB_BAR_SPACE : 130) + insets.bottom }}>
        <GlowHero height={260} kicker={`Arena · ${r.name} results`} top="You finished" bottom={`#${formatNumber(r.rank)}`} sub={`Top ${pct}% of ${formatNumber(r.players)} players in ${r.city}`} />
        <View style={{ paddingHorizontal: S.gutter }}>
          <SectionLabel right={r.claimed ? "All claimed" : null}>Your rewards</SectionLabel>
          <Row gap={S.md} style={{ alignItems: "flex-start" }}>
            {rewards.map((x) => (
              <View key={x.key} style={styles.reward}>
                <Image source={x.image} style={[styles.rewardArt, !r.claimed && { opacity: 0.55 }]} contentFit="cover" />
                <Text style={styles.rewardTitle} numberOfLines={1}>
                  {x.title}
                </Text>
                <Text style={styles.small}>{x.sub}</Text>
              </View>
            ))}
          </Row>
          {r.next ? (
            <View style={styles.next}>
              <View style={styles.nextIcon}>
                <CalendarClock size={20} color={C.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nextTitle}>
                  {r.next.name} {startsLine(r.next.startsOn)}
                </Text>
                {r.next.headline ? <Text style={[styles.small, { marginTop: 2, lineHeight: 17 }]}>{r.next.headline}</Text> : null}
              </View>
            </View>
          ) : null}
          <Text style={[styles.small, { marginTop: S.lg }]}>
            {formatNumber(r.points)} arena points. Ranks come from battles won and steps counted over the season, worked out on the server.
          </Text>
        </View>
      </ScrollView>
      {!r.claimed ? (
        <BottomBar>
          <Button title="Pick up your rewards" size="lg" full loading={claim.isPending} onPress={() => claim.mutate(r.season)} />
        </BottomBar>
      ) : null}
      <TopBar onShare={share} />
    </View>
  );
}

const styles = StyleSheet.create({
  reward: { flex: 1, alignItems: "center" },
  rewardArt: { width: "100%", aspectRatio: 1, borderRadius: R.md, backgroundColor: C.surface },
  rewardTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14, marginTop: S.sm },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  next: { flexDirection: "row", alignItems: "center", gap: S.md, marginTop: S.xl, padding: S.lg, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.1)" },
  nextIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(61,139,255,0.14)", alignItems: "center", justifyContent: "center" },
  nextTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
});
