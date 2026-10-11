import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Heart, MessageCircle, Route, Trash2 } from "lucide-react-native";
import { Avatar, Body, C, Card, EmptyState, F, Label, Loading, Row, S } from "@/components/ui";
import { engine, useCrewFeed, useEngineMutation } from "@/data/hooks";
import { formatPace, timeAgo } from "@/utils/format";

const playerHref = (p) => (p?.isMe ? "/(tabs)/profile" : `/player/${p.id}`);

function Post({ post, crewId, accent }) {
  const router = useRouter();
  const like = useEngineMutation(engine.togglePostLike);
  const remove = useEngineMutation(engine.deletePost);
  const pace = post.km > 0 && post.minutes > 0 ? post.minutes / post.km : 0;

  const confirmDelete = () =>
    Alert.alert("Delete post?", "It disappears from the crew feed for everyone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate([crewId, post.id]) },
    ]);

  return (
    <Card style={{ marginBottom: S.md }}>
      <Row gap={S.md}>
        <Pressable onPress={() => router.push(playerHref(post.author))}>
          <Avatar uri={post.author?.avatar} name={post.author?.name || post.author?.username || ""} size={40} />
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={() => router.push(playerHref(post.author))}>
          <Text style={styles.name} numberOfLines={1}>
            {post.isMine ? "You" : post.author?.name || post.author?.username}
          </Text>
          <Body mute size={12}>
            @{post.author?.username} · {timeAgo(post.at)}
          </Body>
        </Pressable>
        {post.isMine ? (
          <Pressable onPress={confirmDelete} hitSlop={10} accessibilityLabel="Delete post">
            <Trash2 size={17} color={C.textMute} />
          </Pressable>
        ) : null}
      </Row>

      <Row gap={S.sm} style={styles.stats}>
        <View style={[styles.iconWrap, { backgroundColor: `${accent}22` }]}>
          <Route size={16} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Label>Distance</Label>
          <Text style={styles.statValue}>{Number(post.km || 0).toFixed(1)} km</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Label>Time</Label>
          <Text style={styles.statValue}>{post.minutes} min</Text>
        </View>
        {pace ? (
          <View style={{ flex: 1 }}>
            <Label>Pace</Label>
            <Text style={styles.statValue}>{formatPace(pace * 60)}</Text>
          </View>
        ) : null}
      </Row>

      {post.caption ? <Body style={{ marginTop: S.md }}>{post.caption}</Body> : null}

      <Row gap={S.xl} style={{ marginTop: S.md }}>
        <Pressable onPress={() => like.mutate([crewId, post.id])} hitSlop={8} style={styles.action} accessibilityLabel={post.likedByMe ? "Unlike" : "Like"}>
          <Heart size={18} color={post.likedByMe ? C.danger : C.textDim} fill={post.likedByMe ? C.danger : "transparent"} />
          <Text style={[styles.actionText, post.likedByMe && { color: C.danger }]}>{post.likeCount}</Text>
        </Pressable>
        {post.comments ? (
          <Row gap={6}>
            <MessageCircle size={17} color={C.textMute} />
            <Text style={[styles.actionText, { color: C.textMute }]}>{post.comments}</Text>
          </Row>
        ) : null}
      </Row>
    </Card>
  );
}

export default function CrewFeed({ crew }) {
  const feed = useCrewFeed(crew.id);
  const router = useRouter();
  if (feed.isPending) return <Loading />;
  const posts = feed.data || [];
  if (!posts.length)
    return (
      <EmptyState
        icon={Route}
        title="No runs shared yet"
        body="Finish a run on the Move tab and share it here to get the feed going."
        action="Go to Move"
        onAction={() => router.push("/(tabs)/move")}
      />
    );
  return posts.map((p) => <Post key={p.id} post={p} crewId={crew.id} accent={crew.accent || C.accent} />);
}

const styles = StyleSheet.create({
  name: { color: C.text, fontSize: 15, fontWeight: "600" },
  stats: { marginTop: S.md, padding: S.md, borderRadius: 14, backgroundColor: C.surfaceHigh },
  iconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  statValue: { color: C.text, fontFamily: F.display, fontSize: 17, marginTop: 2 },
  action: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionText: { color: C.textDim, fontSize: 14, fontWeight: "600" },
});
