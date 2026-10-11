import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { C, F, Pill, R, Row, S } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";
import { timeAgo } from "@/utils/format";

const TONES = { Season: "accent", Drops: "fire", Product: "pro", Community: "warn" };
export const categoryTone = (category) => TONES[category] || "neutral";

/**
 * Where a story points, if anywhere. Uses an explicit `link` on the story when
 * present, otherwise matches a drop by name or the screen the story mentions.
 */
export function relatedFor(story, drops = []) {
  if (!story) return null;
  if (story.link) return { href: story.link, label: story.linkLabel || "Take a look" };
  const text = `${story.title} ${story.body}`.toLowerCase();
  const drop = drops.find((d) => text.includes(d.title.toLowerCase()));
  if (drop) return { href: `/drops/${drop.id}`, label: `See the ${drop.title}` };
  if (story.category === "Drops" || text.includes("drops tab")) return { href: "/outside/drops", label: "See all drops" };
  if (text.includes("events tab") || text.includes("link-up")) return { href: "/outside/events", label: "See upcoming events" };
  if (text.includes("arena") || text.includes("ladder")) return { href: "/outside/arena", label: "See the standings" };
  return null;
}

const press = (fn) => () => {
  hapticSelection();
  fn();
};

export function FeaturedStory({ story, onPress }) {
  return (
    <Pressable onPress={press(onPress)} style={({ pressed }) => [styles.featured, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}>
      <Image source={{ uri: story.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      <LinearGradient colors={["rgba(10,10,10,0)", "rgba(10,10,10,0.55)", "rgba(10,10,10,0.95)"]} locations={[0.2, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.featuredBody}>
        <Row gap={8}>
          <Pill label={story.category.toUpperCase()} tone={categoryTone(story.category)} />
          <Text style={styles.meta}>{timeAgo(story.publishedAt)}</Text>
        </Row>
        <Text style={styles.featuredTitle} numberOfLines={3}>
          {story.title}
        </Text>
        <Text style={styles.summary} numberOfLines={2}>
          {story.summary}
        </Text>
      </View>
    </Pressable>
  );
}

export function StoryRow({ story, onPress }) {
  return (
    <Pressable onPress={press(onPress)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={{ flex: 1, gap: 6 }}>
        <Row gap={8}>
          <Text style={[styles.category, { color: categoryColour(story.category) }]}>{story.category.toUpperCase()}</Text>
          <Text style={styles.meta}>{timeAgo(story.publishedAt)}</Text>
        </Row>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {story.title}
        </Text>
        <Text style={styles.rowSummary} numberOfLines={2}>
          {story.summary}
        </Text>
      </View>
      <Image source={{ uri: story.image }} style={styles.thumb} contentFit="cover" transition={200} />
    </Pressable>
  );
}

const COLOURS = { accent: C.accent, fire: C.fire, pro: C.pro, warn: C.warn, neutral: C.textDim };
export const categoryColour = (category) => COLOURS[categoryTone(category)];

const styles = StyleSheet.create({
  featured: { height: 380, borderRadius: R.xl, overflow: "hidden", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  featuredBody: { position: "absolute", left: 0, right: 0, bottom: 0, padding: S.xl, gap: S.sm },
  featuredTitle: { color: C.text, fontFamily: F.display, fontSize: 30, letterSpacing: -0.4, lineHeight: 34 },
  summary: { color: C.textDim, fontSize: 15, lineHeight: 21 },
  meta: { color: C.textMute, fontSize: 12, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.lg,
    paddingVertical: S.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  category: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  rowTitle: { color: C.text, fontFamily: F.displayMedium, fontSize: 18, lineHeight: 22 },
  rowSummary: { color: C.textDim, fontSize: 13, lineHeight: 18 },
  thumb: { width: 88, height: 88, borderRadius: R.md, backgroundColor: C.surfaceHigh },
});
