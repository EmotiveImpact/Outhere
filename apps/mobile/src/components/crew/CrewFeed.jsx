import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Heart, MessageCircle, Trash2 } from "lucide-react-native";
import { Body, C, Card, Cover, EmptyState, F, FadeIn, PressableScale, Row, S, Skeleton } from "@/components/ui";
import { engine, useCrewFeed, useEngineMutation } from "@/data/hooks";
import { hapticImpact } from "@/services/haptics";
import { formatPace, timeAgo } from "@/utils/format";
import { PlayerAvatar, crewAccent, playerName } from "./shared";

const playerHref = (p) => (p?.isMe ? "/(tabs)/profile" : `/player/${p?.id}`);

const minutesLabel = (min) => {
  const m = Math.max(0, Math.round(Number(min) || 0));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
};

/** Heart that pops when liked. Optimistic so it responds instantly. */
function LikeButton({ liked, count, onToggle }) {
  const [state, setState] = useState({ liked, count });
  useEffect(() => setState({ liked, count }), [liked, count]);
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const press = () => {
    const next = !state.liked;
    setState((s) => ({ liked: next, count: s.count + (next ? 1 : -1) }));
    if (next) {
      hapticImpact();
      scale.value = withSequence(withTiming(1.45, { duration: 110 }), withSpring(1, { damping: 7, stiffness: 260 }));
    } else {
      scale.value = withSequence(withTiming(0.8, { duration: 80 }), withSpring(1));
    }
    onToggle();
  };

  return (
    <Pressable onPress={press} hitSlop={10} style={styles.action} accessibilityRole="button" accessibilityLabel={state.liked ? "Unlike" : "Like"}>
      <Animated.View style={style}>
        <Heart size={18} color={state.liked ? C.danger : C.textDim} fill={state.liked ? C.danger : "transparent"} />
      </Animated.View>
      <Text style={[styles.actionText, state.liked && { color: C.danger }]}>{state.count}</Text>
    </Pressable>
  );
}

function Post({ post, crewId, accent }) {
  const router = useRouter();
  const like = useEngineMutation(engine.togglePostLike);
  const remove = useEngineMutation(engine.deletePost, { success: "Post deleted" });
  const pace = post.km > 0 && post.minutes > 0 ? (post.minutes * 60) / post.km : 0;
  const tint = post.author?.color || accent;

  const confirmDelete = () =>
    Alert.alert("Delete post?", "It disappears from the crew feed for everyone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate([crewId, post.id]) },
    ]);

  return (
    <Card style={{ marginBottom: S.md }}>
      <Row gap={S.md}>
        <PressableScale onPress={() => router.push(playerHref(post.author))} scaleTo={0.92}>
          <PlayerAvatar player={post.author} size={40} />
        </PressableScale>
        <Pressable style={{ flex: 1 }} onPress={() => router.push(playerHref(post.author))}>
          <Text style={styles.name} numberOfLines={1}>
            {playerName(post.author)}
          </Text>
          <Body dim size={13}>
            Shared a run · {timeAgo(post.at)}
          </Body>
        </Pressable>
        {post.isMine ? (
          <PressableScale onPress={confirmDelete} hitSlop={10} accessibilityLabel="Delete post" style={styles.iconBtn}>
            <Trash2 size={16} color={C.textMute} />
          </PressableScale>
        ) : null}
      </Row>

      <View style={styles.run}>
        <View style={{ flex: 1, justifyContent: "space-between" }}>
          <Row gap={4} style={{ alignItems: "baseline" }}>
            <Text style={styles.distance}>{Number(post.km || 0).toFixed(1)}</Text>
            <Text style={styles.unit}>km</Text>
          </Row>
          <Row gap={S.xl} style={{ marginTop: S.sm }}>
            <View>
              <Text style={styles.metaValue}>{minutesLabel(post.minutes)}</Text>
              <Text style={styles.metaLabel}>time</Text>
            </View>
            {pace ? (
              <View>
                <Text style={styles.metaValue}>{formatPace(pace)}/km</Text>
                <Text style={styles.metaLabel}>pace</Text>
              </View>
            ) : null}
          </Row>
        </View>
        <Cover seed={`run:${post.id}`} accent={tint} style={styles.map} />
      </View>

      {post.caption ? <Body style={{ marginTop: S.md }}>{post.caption}</Body> : null}

      <Row gap={S.xl} style={{ marginTop: S.md }}>
        <LikeButton liked={post.likedByMe} count={post.likeCount} onToggle={() => like.mutate([crewId, post.id])} />
        {post.comments ? (
          <View style={styles.action}>
            <MessageCircle size={17} color={C.textMute} />
            <Text style={[styles.actionText, { color: C.textMute }]}>{post.comments}</Text>
          </View>
        ) : null}
      </Row>
    </Card>
  );
}

function FeedSkeleton() {
  return (
    <View style={{ gap: S.md }}>
      {[0, 1].map((i) => (
        <View key={i} style={styles.skel}>
          <Row gap={S.md}>
            <Skeleton width={40} height={40} radius={20} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width="40%" height={14} />
              <Skeleton width="30%" height={10} />
            </View>
          </Row>
          <Skeleton height={112} radius={16} style={{ marginTop: S.md }} />
        </View>
      ))}
    </View>
  );
}

export default function CrewFeed({ crew }) {
  const feed = useCrewFeed(crew.id);
  const router = useRouter();
  if (feed.isPending) return <FeedSkeleton />;
  const posts = feed.data || [];
  if (!posts.length)
    return (
      <EmptyState
        title="No runs shared yet"
        body="Finish a run on Move and share it here to get the feed going."
        action="Go to Move"
        onAction={() => router.push("/(tabs)/move")}
      />
    );
  return posts.map((p, i) => (
    <FadeIn key={p.id} index={i}>
      <Post post={p} crewId={crew.id} accent={crewAccent(crew)} />
    </FadeIn>
  ));
}

const styles = StyleSheet.create({
  name: { color: C.text, fontSize: 15, fontWeight: "600" },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  run: { flexDirection: "row", gap: S.md, marginTop: S.lg },
  distance: { color: C.text, fontFamily: F.display, fontSize: 44, letterSpacing: -1, lineHeight: 48 },
  unit: { color: C.textDim, fontFamily: F.displayMedium, fontSize: 16 },
  metaLabel: { color: C.textDim, fontSize: 13, marginTop: 1 },
  metaValue: { color: C.text, fontFamily: F.displayMedium, fontSize: 15 },
  map: { width: 96, height: 96, borderRadius: 14 },
  action: { flexDirection: "row", alignItems: "center", gap: 6, height: 32 },
  actionText: { color: C.textDim, fontSize: 14, fontWeight: "600" },
  skel: { padding: S.lg, borderRadius: 20, backgroundColor: C.surface },
});
