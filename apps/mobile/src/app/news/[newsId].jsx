import React from "react";
import { RefreshControl, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowRight, Newspaper } from "lucide-react-native";
import { useDrops, useNews, useNewsItem } from "@/data/hooks";
import { Body, C, Card, EmptyState, F, Header, Loading, Pill, Row, S, Screen, SectionHeader, Title } from "@/components/ui";
import { HeroScreen } from "@/components/happenings/shared";
import { StoryRow, categoryTone, relatedFor } from "@/components/happenings/NewsCards";
import { dateLabel, timeAgo } from "@/utils/format";

export default function NewsArticleScreen() {
  const router = useRouter();
  const { newsId } = useLocalSearchParams();
  const id = Array.isArray(newsId) ? newsId[0] : newsId;
  const { data: story, isPending, error, refetch, isRefetching } = useNewsItem(id);
  const { data: drops } = useDrops();
  const { data: all } = useNews();

  if (isPending) {
    return (
      <Screen header={<Header back title="News" />}>
        <Loading />
      </Screen>
    );
  }
  if (error || !story) {
    return (
      <Screen header={<Header back title="News" />}>
        <EmptyState
          icon={Newspaper}
          title="Story not found"
          body="It may have been taken down."
          action="Back to news"
          onAction={() => router.replace("/outside/news")}
        />
      </Screen>
    );
  }

  const related = relatedFor(story, drops || []);
  const paragraphs = String(story.body || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const more = (all || []).filter((s) => s.id !== story.id).slice(0, 3);

  return (
    <HeroScreen image={story.image} height={360} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} />}>
      <Row gap={8}>
        <Pill label={story.category.toUpperCase()} tone={categoryTone(story.category)} />
        <Text style={{ color: C.textMute, fontSize: 13, fontWeight: "600" }}>{`${timeAgo(story.publishedAt)}, ${dateLabel(story.publishedAt)}`}</Text>
      </Row>
      <Title size={32} style={{ marginTop: S.md, lineHeight: 36 }}>
        {story.title}
      </Title>
      <Text style={{ color: C.text, fontFamily: F.displayMedium, fontSize: 18, lineHeight: 25, marginTop: S.lg }}>{story.summary}</Text>
      <View style={{ height: 1, backgroundColor: C.border, marginVertical: S.xl }} />
      {paragraphs.map((p, i) => (
        <Body key={i} dim size={16} style={{ lineHeight: 25, marginBottom: S.lg }}>
          {p}
        </Body>
      ))}

      {related ? (
        <Card onPress={() => router.push(related.href)} highlight style={{ marginTop: S.sm }}>
          <Row gap={S.md}>
            <Text style={{ flex: 1, color: C.text, fontFamily: F.displayMedium, fontSize: 17 }}>{related.label}</Text>
            <ArrowRight size={20} color={C.accent} />
          </Row>
        </Card>
      ) : null}

      {more.length ? (
        <>
          <SectionHeader title="More stories" />
          {more.map((s) => (
            <StoryRow key={s.id} story={s} onPress={() => router.push(`/news/${s.id}`)} />
          ))}
        </>
      ) : null}
    </HeroScreen>
  );
}
