// The club feed's stories row. The ring is about the story here: bright blue
// until watched, then thin grey. Dots still show who is out now (blue) or
// has just stopped (red). The club's own story sits in the row as a rounded
// square. Your ring has a +; posting is for Pro and Black members.

import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { Avatar, C, F, PressableScale, S } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { useCrewStories, useProfile, useStories } from "@/data/hooks";
import StoryUpsell from "./StoryUpsell";

/** Open a story from the row, then carry on through `queue` (ids, or club:<crewId>). */
export const openStory = (router, id, queue = [], replace = false) => {
  const go = replace ? router.replace : router.push;
  const rest = queue.join(",");
  if (String(id).startsWith("club:")) return go({ pathname: "/stories/club/[crewId]", params: { crewId: String(id).slice(5), queue: rest } });
  return go({ pathname: "/stories/[authorId]", params: { authorId: id, queue: rest } });
};

export default function CrewStoriesRow({ crew }) {
  const router = useRouter();
  const { data: me } = useProfile();
  const mine = useStories(me?.id);
  const row = useCrewStories(crew.id);
  const [upsell, setUpsell] = useState(false);
  const items = row.data || [];
  const hasMine = !!mine.data?.length;

  const add = () => {
    if (!me) return;
    if (me.tier === "free") return setUpsell(true);
    router.push({ pathname: "/stories/new", params: { club: crew.id } });
  };

  const open = (i) => {
    const it = items[i];
    const queue = items
      .slice(i + 1)
      .filter((x) => x.story === "unwatched")
      .map((x) => x.id);
    openStory(router, it.id, queue);
  };

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <View style={styles.item}>
          <PressableScale onPress={() => (hasMine ? router.push(`/stories/${me.id}`) : add())} accessibilityLabel={hasMine ? "Your story" : "Add a story"}>
            <Avatar uri={me?.avatar} name={me?.name || ""} story={hasMine ? "watched" : undefined} tier={hasMine ? undefined : me?.tier} size={62} />
          </PressableScale>
          <PressableScale onPress={add} hitSlop={8} style={styles.add} accessibilityLabel="Add a story">
            <Plus size={13} color="#fff" strokeWidth={3} />
          </PressableScale>
          <Text style={styles.name}>You</Text>
        </View>
        {items.map((it, i) => (
          <PressableScale key={it.id} onPress={() => open(i)} style={styles.item} accessibilityLabel={`${it.name}'s story${it.story === "unwatched" ? ", new" : ""}`}>
            {it.kind === "club" ? (
              <Avatar source={it.logo ? (typeof it.logo === "string" ? { uri: it.logo } : it.logo) : PHOTOS.crest} name={it.name} square story={it.story} size={62} />
            ) : (
              <Avatar uri={it.avatar} name={it.name} story={it.story} dot={it.dot} size={62} />
            )}
            <Text style={[styles.name, it.story === "unwatched" && { color: C.text }]} numberOfLines={1}>
              {it.name.split(" ")[0]}
            </Text>
          </PressableScale>
        ))}
      </ScrollView>
      <StoryUpsell visible={upsell} onClose={() => setUpsell(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: S.gutter, gap: 14, paddingVertical: S.sm },
  item: { width: 66, alignItems: "center" },
  name: { color: C.textDim, fontFamily: F.bodyMedium, fontSize: 12, marginTop: 6, maxWidth: 66 },
  add: { position: "absolute", right: 0, top: 42, width: 22, height: 22, borderRadius: 11, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.bg },
});
