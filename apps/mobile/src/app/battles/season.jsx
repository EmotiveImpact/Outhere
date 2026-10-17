// Arena season results: where you finished in your city and the rewards you
// picked up. The server works out the rank and pays the prize once.

import React from "react";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CalendarClock } from "@/components/ui/icons";
import { engine, useArenaNow, useEngineMutation, useSeasonResults } from "@/data/hooks";
import { BlendImage, C, EmptyState, F, GlowButton, IconTile, Row, S, Skeleton, Surface, TAB_BAR_SPACE } from "@/components/ui";
import { BottomBar, GlowHero, SectionLabel, TopBar } from "@/components/arena/OutsideKit";
import { StackTabBar } from "@/components/AppTabBar";
import { PHOTOS } from "@/constants/photos";

// The stack of OUT coins, as in the prototype's season prize.
const COIN_STACK = require("../../../assets/images/oh/stack.jpg");
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
    { key: "out", image: COIN_STACK, title: `${formatNumber(r.prizeOut)} OUT`, sub: "season prize" },
    { key: "badge", image: PHOTOS.medal, title: r.name, sub: "finisher badge" },
    ...(r.perk === "black_week" ? [{ key: "black", image: PHOTOS.ticket, title: "Black week", sub: "free trial" }] : []),
  ];
  const share = () => Share.share({ message: `I finished #${r.rank} of ${formatNumber(r.players)} in ${r.city} in the Outhere Arena, ${r.name}.` }).catch(() => {});

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: (r.claimed ? TAB_BAR_SPACE : 130) + insets.bottom }}>
        <GlowHero height={290} object={PHOTOS.trophy} objectSize={250} objectStyle={{ right: -50, top: insets.top - 10 }} kicker={`Arena · ${r.name} results`} top="You finished" bottom={`#${formatNumber(r.rank)}`} sub={`Top ${pct}% of ${formatNumber(r.players)} players in ${r.city}`} />
        <View style={{ paddingHorizontal: S.gutter }}>
          <SectionLabel right={r.claimed ? "All claimed" : null}>Your rewards</SectionLabel>
          <Row gap={S.sm} style={{ alignItems: "flex-start" }}>
            {rewards.map((x, i) => (
              <View key={x.key} style={styles.reward}>
                <View style={styles.rewardArt}>
                  <BlendImage source={x.image} size={104} glow float={i === 1} dim={r.claimed ? 1 : 0.6} />
                </View>
                <Text style={styles.rewardTitle} numberOfLines={1}>
                  {x.title}
                </Text>
                <Text style={styles.small}>{x.sub}</Text>
              </View>
            ))}
          </Row>
          {r.next ? (
            <Surface padding={S.lg} style={{ marginTop: S.xl }} contentStyle={styles.next}>
              <IconTile icon={CalendarClock} size={44} radius={14} />
              <View style={{ flex: 1 }}>
                <Text style={styles.nextTitle}>
                  {r.next.name} {startsLine(r.next.startsOn)}
                </Text>
                {r.next.headline ? <Text style={[styles.small, { marginTop: 2, lineHeight: 17 }]}>{r.next.headline}</Text> : null}
              </View>
            </Surface>
          ) : null}
          <Text style={[styles.small, { marginTop: S.lg }]}>
            {formatNumber(r.points)} arena points. Ranks come from battles won and steps counted over the season, worked out on the server.
          </Text>
        </View>
      </ScrollView>
      {!r.claimed ? (
        <BottomBar>
          <GlowButton title="Pick up your rewards" size="lg" full loading={claim.isPending} onPress={() => claim.mutate(r.season)} />
        </BottomBar>
      ) : null}
      <TopBar onShare={share} />
      {r.claimed ? <StackTabBar current="outside" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  reward: { flex: 1, alignItems: "center" },
  rewardArt: { width: "100%", height: 108, alignItems: "center", justifyContent: "center" },
  rewardTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14, marginTop: S.xs },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  next: { flexDirection: "row", alignItems: "center", gap: S.md },
  nextTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
});
