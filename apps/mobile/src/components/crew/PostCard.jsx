// One post in the club feed. A photo post is one big picture with the run's
// stats on top; a run shows its real route; "going to" posts carry a Join;
// badge posts show the badge. Kudos and comments under each.

import React, { useEffect, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Flag, Heart, MessageCircle, MoreHorizontal, Share2, Trash2, UserRound } from "lucide-react-native";
import { BlendImage, Body, Button, C, Card, F, PressableScale, Row, S } from "@/components/ui";
import { engine, useEngineMutation } from "@/data/hooks";
import { hapticImpact } from "@/services/haptics";
import { formatPace, timeAgo } from "@/utils/format";
import ActionSheet from "./ActionSheet";
import RouteArt from "./RouteArt";
import { AvatarStack, PlayerAvatar, playerName } from "./shared";

const ago = (ms) => {
  const t = timeAgo(ms);
  return t.replace(/^(\d+)m ago$/, "$1 min ago").replace(/^(\d+)h ago$/, "$1 h ago");
};
const playerHref = (p) => (p?.isMe ? "/(tabs)/profile" : `/player/${p?.id}`);
const first = (p) => playerName(p).split(" ")[0];

/** Heart that pops when you give kudos. Optimistic, so it answers at once. */
export function Kudos({ liked, count, onToggle, label = false, pill = false }) {
  const [state, setState] = useState({ liked, count });
  useEffect(() => setState({ liked, count }), [liked, count]);
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const press = () => {
    const next = !state.liked;
    setState((s) => ({ liked: next, count: s.count + (next ? 1 : -1) }));
    if (next) {
      hapticImpact();
      scale.value = withSequence(withTiming(1.4, { duration: 110 }), withSpring(1, { damping: 7, stiffness: 260 }));
    }
    onToggle();
  };
  const colour = state.liked || label ? C.accent : C.textDim;
  return (
    <Pressable onPress={press} hitSlop={10} style={[styles.action, pill && styles.pill]} accessibilityRole="button" accessibilityLabel={state.liked ? "Take back kudos" : "Give kudos"}>
      <Animated.View style={style}>
        <Heart size={18} color={colour} fill={state.liked ? C.accent : "transparent"} />
      </Animated.View>
      <Text style={[styles.actionText, { color: state.liked || label ? C.accent : C.textDim }]}>{label ? `Kudos ${state.count}` : state.count}</Text>
    </Pressable>
  );
}

/** The run's numbers sat on the picture or the map (.oh-feat chips). */
function DataChips({ post }) {
  if (!post.km) return null;
  return (
    <Row gap={6} style={styles.chips} pointerEvents="none">
      <View style={styles.chip}>
        <Text style={styles.chipText}>{post.km.toFixed(1)} km</Text>
      </View>
      {post.paceSec ? (
        <View style={styles.chip}>
          <Text style={styles.chipText}>{formatPace(post.paceSec)} /km</Text>
        </View>
      ) : null}
      {post.out ? (
        <View style={[styles.chip, styles.chipOut]}>
          <Text style={[styles.chipText, { color: "#cfe1ff" }]}>+{post.out} OUT</Text>
        </View>
      ) : null}
    </Row>
  );
}

export default function PostCard({ post, crew, onComments, onReport }) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const like = useEngineMutation(engine.togglePostLike, { silent: true });
  const remove = useEngineMutation(engine.deletePost, { success: "Post deleted" });
  const staff = crew.myRole === "owner" || crew.myRole === "admin";
  const toggle = () => like.mutate([crew.id, post.id]);
  const name = playerName(post.author);
  const who = post.others ? `${first(post.author)} and ${post.others} others` : name;

  const options = [
    !post.isMine && post.author ? { label: `View ${first(post.author)}'s profile`, icon: UserRound, onPress: () => router.push(playerHref(post.author)) } : null,
    !post.isMine ? { label: "Report post", hint: "Crew admins and Outhere see it", icon: Flag, onPress: () => onReport?.(post) } : null,
    post.isMine || staff ? { label: "Delete post", icon: Trash2, destructive: true, onPress: () => remove.mutate([crew.id, post.id]) } : null,
  ].filter(Boolean);

  const more = (
    <PressableScale onPress={() => setMenu(true)} hitSlop={10} scaleTo={0.88} style={styles.more} accessibilityLabel="Post menu">
      <MoreHorizontal size={18} color={C.textDim} />
    </PressableScale>
  );

  const head = (title, sub, avatar = 40) => (
    <Row gap={S.md}>
      <PressableScale onPress={() => router.push(playerHref(post.author))} scaleTo={0.92}>
        <PlayerAvatar player={post.author} size={avatar} />
      </PressableScale>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Body dim size={13} numberOfLines={1}>
          {sub}
        </Body>
      </View>
      {options.length ? more : null}
    </Row>
  );

  const comments = (
    <Pressable onPress={() => onComments?.(post)} hitSlop={10} style={styles.action} accessibilityLabel={`${post.comments} comments`}>
      <MessageCircle size={17} color={C.textDim} />
      <Text style={styles.actionText}>{post.comments}</Text>
    </Pressable>
  );

  const sheet = <ActionSheet visible={menu} title="Post" options={options} onClose={() => setMenu(false)} />;

  if (post.kind === "going") {
    const run = crew.nextRun;
    return (
      <Card padding={S.lg} style={styles.card}>
        <Row gap={S.md}>
          <PlayerAvatar player={post.author} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={2}>
              {first(post.author)} is going to {post.title}
            </Text>
            <Body dim size={13}>
              {ago(post.at)}
            </Body>
          </View>
          <Button
            title={run?.isGoing ? "Going" : "Join"}
            size="sm"
            variant="secondary"
            onPress={() => (run ? router.push(`/clubs/run/${run.id}`) : router.push(`/(tabs)/club?crew=${crew.id}&tab=chat`))}
          />
        </Row>
        {sheet}
      </Card>
    );
  }

  if (post.kind === "badge") {
    return (
      <Card padding={S.lg} style={styles.card}>
        <Row gap={S.md}>
          {post.badge ? <BlendImage source={post.badge} size={60} mask="tight" glow={70} /> : <PlayerAvatar player={post.author} size={56} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={2}>
              {first(post.author)} earned {post.title}
            </Text>
            <Body dim size={13} numberOfLines={1}>
              {[post.sub, ago(post.at)].filter(Boolean).join(" · ")}
            </Body>
          </View>
          <Kudos liked={post.likedByMe} count={post.likeCount} onToggle={toggle} pill />
        </Row>
        {sheet}
      </Card>
    );
  }

  if (post.kind === "photo" && post.photo) {
    return (
      <Card padding={0} style={styles.card}>
        <View style={{ padding: S.lg, paddingBottom: S.md }}>{head(who, [post.title, ago(post.at)].filter(Boolean).join(" · "))}</View>
        <View>
          <Image source={post.photo} style={styles.photo} contentFit="cover" transition={200} accessibilityLabel={post.caption || `${name}'s photo`} />
          <DataChips post={post} />
        </View>
        <View style={{ padding: S.lg, paddingTop: S.md }}>
          {post.caption ? <Body style={{ marginBottom: S.md }}>{post.caption}</Body> : null}
          <Row gap={S.xl}>
            <Kudos liked={post.likedByMe} count={post.likeCount} onToggle={toggle} />
            {comments}
            <View style={{ flex: 1 }} />
            {post.likers?.length ? <AvatarStack players={post.likers} size={24} max={3} /> : null}
          </Row>
        </View>
        {sheet}
      </Card>
    );
  }

  if (post.kind === "run" || post.kind === "route" || post.route) {
    const share = () =>
      Share.share({
        message: `${name} ran ${post.title || "a run"} with ${crew.name}: ${post.km.toFixed(1)} km${post.paceSec ? ` at ${formatPace(post.paceSec)} a km` : ""}. On Outhere.`,
      }).catch(() => {});
    return (
      <Card padding={S.lg} style={styles.card}>
        {head(post.kind === "route" ? `${first(post.author)} shared ${post.title || "a route"}` : `${first(post.author)} ran ${post.title || "a run"}`, [ago(post.at), post.place].filter(Boolean).join(" · "))}
        <View style={{ marginTop: S.md }}>
          <RouteArt points={post.route} seed={post.id} height={170} />
          <DataChips post={post} />
        </View>
        {post.caption ? <Body style={{ marginTop: S.md }}>{post.caption}</Body> : null}
        <View style={styles.divider} />
        <Row gap={S.xl}>
          <Kudos liked={post.likedByMe} count={post.likeCount} onToggle={toggle} label />
          {comments}
          <View style={{ flex: 1 }} />
          <PressableScale onPress={share} hitSlop={10} accessibilityLabel="Share run">
            <Share2 size={17} color={C.textDim} />
          </PressableScale>
        </Row>
        {sheet}
      </Card>
    );
  }

  // Words, or a photo that failed to arrive.
  return (
    <Card padding={S.lg} style={styles.card}>
      {head(name, ago(post.at))}
      {post.caption ? <Body style={{ marginTop: S.md }}>{post.caption}</Body> : null}
      <Row gap={S.xl} style={{ marginTop: S.md }}>
        <Kudos liked={post.likedByMe} count={post.likeCount} onToggle={toggle} />
        {comments}
      </Row>
      {sheet}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: S.md },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  more: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  photo: { width: "100%", aspectRatio: 1.15, backgroundColor: C.surfaceHigh },
  chips: { position: "absolute", left: 12, bottom: 12 },
  chip: { height: 28, paddingHorizontal: 11, borderRadius: 14, backgroundColor: "rgba(10,14,20,0.6)", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 0 1px rgba(255,255,255,0.08)" },
  chipOut: { backgroundColor: "rgba(42,106,240,0.45)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), inset 0 0 0 1px rgba(130,180,255,0.35)" },
  chipText: { color: C.text, fontFamily: F.bodySemi, fontSize: 12 },
  action: { flexDirection: "row", alignItems: "center", gap: 6, height: 32 },
  actionText: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 14 },
  pill: { height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: C.surfaceHigh },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginVertical: S.md },
});
