import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ArrowUpRight } from "lucide-react-native";
import { C, Cover, F, Pill, PressableScale, R, Row, S, Skeleton } from "@/components/ui";
import { timeAgo } from "@/utils/format";

const TONES = { Season: "accent", Drops: "fire", Product: "pro", Community: "warn" };
export const categoryTone = (category) => TONES[category] || "neutral";

const COLOURS = { accent: C.accent, fire: C.fire, pro: C.pro, warn: C.warn, neutral: C.textDim };
export const categoryColour = (category) => COLOURS[categoryTone(category)];

/** Rough reading time from the story body. */
export const readMinutes = (story) => Math.max(1, Math.round(String(story?.body || "").split(/\s+/).length / 200));

/**
 * Where a story points, if anywhere. Uses an explicit `link` on the story when
 * present, otherwise matches a drop by name or the screen the story mentions.
 */
export function relatedFor(story, drops = []) {
  if (!story) return null;
  if (story.link) {
    const drop = drops.find((d) => story.link === `/drops/${d.id}`);
    return { href: story.link, label: story.linkLabel || "Take a look", drop };
  }
  const text = `${story.title} ${story.body}`.toLowerCase();
  const drop = drops.find((d) => text.includes(d.title.toLowerCase()));
  if (drop) return { href: `/drops/${drop.id}`, label: `See the ${drop.title}`, drop };
  if (story.category === "Drops" || text.includes("drops tab")) return { href: "/outside/drops", label: "See all drops" };
  if (text.includes("events tab") || text.includes("link-up")) return { href: "/outside/events", label: "See upcoming events" };
  if (text.includes("arena") || text.includes("ladder")) return { href: "/outside/arena", label: "See the standings" };
  return null;
}

export function FeaturedStory({ story, onPress }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={styles.featured}>
      <Cover source={story.image} seed={story.id} accent={categoryColour(story.category)} scrim style={StyleSheet.absoluteFill} />
      <View style={styles.featuredTop}>
        <Text style={styles.kicker}>TOP STORY</Text>
      </View>
      <View style={styles.featuredBody}>
        <Row gap={8}>
          <Pill label={story.category.toUpperCase()} tone={categoryTone(story.category)} />
          <Text style={styles.meta}>{`${timeAgo(story.publishedAt)}, ${readMinutes(story)} min read`}</Text>
        </Row>
        <Text style={styles.featuredTitle} numberOfLines={3}>
          {story.title}
        </Text>
        <Text style={styles.summary} numberOfLines={2}>
          {story.summary}
        </Text>
      </View>
    </PressableScale>
  );
}

export function StoryRow({ story, onPress, last = false }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={[styles.row, last && { borderBottomWidth: 0 }]}>
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
      <Cover source={story.image} seed={story.id} accent={categoryColour(story.category)} style={styles.thumb} />
    </PressableScale>
  );
}

/** Card linking out of an article to the thing it talks about. */
export function RelatedCard({ related, onPress }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={styles.related}>
      {related.drop ? (
        <Cover source={related.drop.image} seed={related.drop.id} style={styles.relatedThumb} />
      ) : (
        <View style={[styles.relatedThumb, styles.relatedIcon]}>
          <ArrowUpRight size={26} color={C.accent} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.relatedKicker}>{related.drop ? "IN THE STORY" : "JUMP IN"}</Text>
        <Text style={styles.relatedTitle} numberOfLines={2}>
          {related.label}
        </Text>
      </View>
      <View style={styles.arrow}>
        <ArrowUpRight size={18} color={C.accentText} />
      </View>
    </PressableScale>
  );
}

export const NewsSkeleton = () => (
  <View>
    <Skeleton height={420} radius={R.xl} />
    <Skeleton width={100} height={20} style={{ marginTop: S.xxl, marginBottom: S.lg }} />
    {[0, 1, 2].map((i) => (
      <Row key={i} gap={S.lg} style={{ paddingVertical: S.lg }}>
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="30%" height={10} />
          <Skeleton width="90%" height={18} />
          <Skeleton width="70%" height={12} />
        </View>
        <Skeleton width={92} height={92} radius={R.md} />
      </Row>
    ))}
  </View>
);

const styles = StyleSheet.create({
  featured: { height: 420, borderRadius: R.xl, overflow: "hidden", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  featuredTop: { position: "absolute", top: S.lg, left: S.xl },
  kicker: { color: C.text, fontSize: 11, fontWeight: "800", letterSpacing: 2, opacity: 0.85 },
  featuredBody: { position: "absolute", left: 0, right: 0, bottom: 0, padding: S.xl, gap: S.sm },
  featuredTitle: { color: C.text, fontFamily: F.display, fontSize: 32, letterSpacing: -0.6, lineHeight: 35 },
  summary: { color: "#c8c8cc", fontSize: 15, lineHeight: 21 },
  meta: { color: C.textMute, fontSize: 12, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: S.lg, paddingVertical: S.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  category: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  rowTitle: { color: C.text, fontFamily: F.display, fontSize: 18, lineHeight: 22, letterSpacing: -0.2 },
  rowSummary: { color: C.textDim, fontSize: 13, lineHeight: 18 },
  thumb: { width: 92, height: 92, borderRadius: R.md },
  related: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.md, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: 1, borderColor: "rgba(0,255,127,0.35)" },
  relatedThumb: { width: 64, height: 64, borderRadius: R.md },
  relatedIcon: { backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center" },
  relatedKicker: { color: C.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  relatedTitle: { color: C.text, fontFamily: F.display, fontSize: 17, marginTop: 2 },
  arrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
});
