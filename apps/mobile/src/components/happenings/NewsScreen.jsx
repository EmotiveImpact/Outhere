import React from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { Newspaper } from "lucide-react-native";
import { useNews } from "@/data/hooks";
import { useOutsideScrollPersistence } from "@/hooks/useOutsideScrollPersistence";
import { C, EmptyState, Loading, S, TAB_BAR_SPACE } from "@/components/ui";
import { FeaturedStory, StoryRow } from "@/components/happenings/NewsCards";
import { SectionLabel } from "@/components/happenings/shared";

export default function OutsideNewsScreen() {
  const router = useRouter();
  const { scrollRef, handleScroll } = useOutsideScrollPersistence("news");
  const { data, isPending, isRefetching, refetch } = useNews();
  const stories = data || [];
  const [top, ...rest] = stories;
  const open = (id) => router.push(`/news/${id}`);

  return (
    <ScrollView
      ref={scrollRef}
      onScroll={handleScroll}
      scrollEventThrottle={32}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: S.gutter, paddingTop: S.lg, paddingBottom: TAB_BAR_SPACE }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} />}
    >
      {isPending ? (
        <Loading />
      ) : !top ? (
        <EmptyState icon={Newspaper} title="No stories yet" body="Season news, drops and community recaps land here." />
      ) : (
        <>
          <FeaturedStory story={top} onPress={() => open(top.id)} />
          {rest.length ? (
            <View>
              <SectionLabel title="Latest" count={rest.length} style={{ marginBottom: 0 }} />
              {rest.map((s) => (
                <StoryRow key={s.id} story={s} onPress={() => open(s.id)} />
              ))}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
