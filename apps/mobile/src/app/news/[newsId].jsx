import React from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Newspaper } from "lucide-react-native";
import { useDrops, useNews, useNewsItem } from "@/data/hooks";
import { C, EmptyState, F, FadeIn, Header, Pill, Row, S, Screen } from "@/components/ui";
import { HeroScreen, HeroSkeleton } from "@/components/happenings/shared";
import { RelatedCard, StoryRow, categoryColour, categoryTone, readMinutes, relatedFor } from "@/components/happenings/NewsCards";
import { dateLabel, timeAgo } from "@/utils/format";

export default function NewsArticleScreen() {
  const router = useRouter();
  const { newsId } = useLocalSearchParams();
  const id = Array.isArray(newsId) ? newsId[0] : newsId;
  const { data: story, isPending, error, refetch, isRefetching } = useNewsItem(id);
  const { data: drops } = useDrops();
  const { data: all } = useNews();

  if (isPending) return <HeroSkeleton />;
  if (error || !story) {
    return (
      <Screen header={<Header back title="News" />}>
        <EmptyState icon={Newspaper} title="Story not found" body="It may have been taken down." action="Back to news" onAction={() => router.replace("/outside/news")} />
      </Screen>
    );
  }

  const related = relatedFor(story, drops || []);
  const paragraphs = String(story.body || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const more = (all || []).filter((s) => s.id !== story.id).slice(0, 3);

  const overlay = (
    <>
      <Row gap={8}>
        <Pill label={story.category.toUpperCase()} tone={categoryTone(story.category)} />
        <Text style={styles.meta}>{`${readMinutes(story)} min read`}</Text>
      </Row>
      <Text style={styles.title}>{story.title}</Text>
    </>
  );

  return (
    <HeroScreen
      source={story.image}
      seed={story.id}
      accent={categoryColour(story.category)}
      height={400}
      overlay={overlay}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} />}
    >
      <FadeIn>
        <Text style={styles.standfirst}>{story.summary}</Text>
        <Row gap={S.sm} style={styles.byline}>
          <View style={styles.mark}>
            <Text style={styles.markText}>O</Text>
          </View>
          <View>
            <Text style={styles.bylineName}>OutHere Editorial</Text>
            <Text style={styles.meta}>{`${dateLabel(story.publishedAt)}, ${timeAgo(story.publishedAt)}`}</Text>
          </View>
        </Row>
        {paragraphs.map((p, i) => (
          <Text key={i} style={[styles.para, i === 0 && styles.lead]}>
            {p}
          </Text>
        ))}
      </FadeIn>

      {related ? (
        <FadeIn index={1} style={{ marginTop: S.md }}>
          <RelatedCard related={related} onPress={() => router.push(related.href)} />
        </FadeIn>
      ) : null}

      {more.length ? (
        <FadeIn index={2}>
          <Text style={styles.moreTitle}>More stories</Text>
          {more.map((s, i) => (
            <StoryRow key={s.id} story={s} onPress={() => router.push(`/news/${s.id}`)} last={i === more.length - 1} />
          ))}
        </FadeIn>
      ) : null}
    </HeroScreen>
  );
}

const styles = StyleSheet.create({
  title: { color: C.text, fontFamily: F.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.8, marginTop: S.md },
  meta: { color: C.textMute, fontSize: 12, fontWeight: "600" },
  standfirst: { color: C.text, fontFamily: F.displayMedium, fontSize: 20, lineHeight: 28, letterSpacing: -0.2 },
  byline: { marginTop: S.xl, paddingBottom: S.xl, marginBottom: S.xl, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderStrong },
  mark: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  markText: { color: C.accentText, fontFamily: F.display, fontSize: 18 },
  bylineName: { color: C.text, fontSize: 14, fontWeight: "700" },
  para: { color: "#d4d4d8", fontSize: 17, lineHeight: 28, marginBottom: S.xl },
  lead: { color: C.text },
  moreTitle: { color: C.text, fontFamily: F.display, fontSize: 20, marginTop: S.xxl, marginBottom: S.xs },
});
