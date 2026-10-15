// Outside > News. One big story like a magazine cover, then more stories to
// swipe through, then the rest as a list.

import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNews } from "@/data/hooks";
import { useOutsideScrollPersistence } from "@/hooks/useOutsideScrollPersistence";
import { C, Cover, EmptyState, F, FadeIn, imageSource, PressableScale, R, S, Skeleton, TAB_BAR_SPACE } from "@/components/ui";
import { GlowHero, SectionLabel } from "@/components/arena/OutsideKit";
import { StoryRow } from "@/components/happenings/NewsCards";
import { splitTitle } from "@/components/happenings/EventsScreen";
import { timeAgo } from "@/utils/format";

const KICKERS = { Season: "Update", Drops: "Drop", Product: "New", Community: "Recap" };
export const newsKicker = (category) => KICKERS[category] || category || "News";

/** "2h ago", "Yesterday", "3d ago". */
const when = (ms) => {
  const h = (Date.now() - ms) / 3_600_000;
  if (h >= 20 && h < 48) return "Yesterday";
  return timeAgo(ms);
};

function StoryCard({ story, onPress }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.97} style={styles.card}>
      <Cover source={story.image} seed={story.id} style={styles.cardArt} />
      <View style={{ padding: S.md, gap: 4 }}>
        <Text style={styles.cardKicker}>{newsKicker(story.category).toUpperCase()}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {story.title}
        </Text>
        <Text style={styles.cardWhen}>{when(story.publishedAt)}</Text>
      </View>
    </PressableScale>
  );
}

export default function OutsideNewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scrollRef, handleScroll } = useOutsideScrollPersistence("news");
  const { data, isPending, isRefetching, refetch } = useNews();
  const stories = data || [];
  const [top, ...rest] = stories;
  const swipe = rest.slice(0, 5);
  const older = rest.slice(5);
  const open = (id) => router.push(`/news/${id}`);
  const [white, blue] = top ? splitTitle(top.title) : [];

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={handleScroll}
      scrollEventThrottle={32}
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE + insets.bottom + S.lg }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} progressViewOffset={insets.top + 60} />}
    >
      {isPending ? (
        <View>
          <Skeleton height={380 + insets.top} radius={30} />
          <Skeleton width={120} height={18} style={{ margin: S.gutter }} />
        </View>
      ) : !top ? (
        <EmptyState style={{ paddingTop: insets.top + 90 }} title="No stories yet" body="Season news, drops and community recaps land here." action="Refresh" onAction={refetch} />
      ) : (
        <>
          <PressableScale onPress={() => open(top.id)} scaleTo={0.995} haptic={false} accessibilityLabel={`Read ${top.title}`}>
            <GlowHero photo={imageSource(top.image)} photoOpacity={0.4} height={330} kicker={`${newsKicker(top.category)} · ${when(top.publishedAt)}`} top={white} bottom={blue} sub={top.summary} />
          </PressableScale>
          {swipe.length ? (
            <>
              <View style={{ paddingHorizontal: S.gutter }}>
                <SectionLabel>More stories</SectionLabel>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.gutter, gap: S.md }}>
                {swipe.map((s, i) => (
                  <FadeIn key={s.id} index={i}>
                    <StoryCard story={s} onPress={() => open(s.id)} />
                  </FadeIn>
                ))}
              </ScrollView>
            </>
          ) : null}
          {older.length ? (
            <View style={{ paddingHorizontal: S.gutter }}>
              <SectionLabel>Earlier</SectionLabel>
              {older.map((s, i) => (
                <StoryRow key={s.id} story={s} onPress={() => open(s.id)} last={i === older.length - 1} />
              ))}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { width: 240, borderRadius: R.lg, overflow: "hidden", backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.08)" },
  cardArt: { height: 120 },
  cardKicker: { color: C.accent, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.6 },
  cardTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15, lineHeight: 20 },
  cardWhen: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
});
