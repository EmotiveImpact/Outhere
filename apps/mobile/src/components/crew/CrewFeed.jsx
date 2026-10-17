// Feed tab, the club feed: the stories row, the club's next run and this
// week's fixture, last night's club run, then a box to share a run, photo or
// route and the posts, one big post at a time.

import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Camera } from "@/components/ui/icons";
import { C, EmptyState, F, FadeIn, PressableScale, Row, S, Skeleton } from "@/components/ui";
import { ClubPanel } from "@/components/clubs/parts";
import { PHOTOS } from "@/constants/photos";
import { engine, useCrewFeed, useEngineMutation, useProfile } from "@/data/hooks";
import CommentsSheet from "./CommentsSheet";
import ComposeSheet from "./ComposeSheet";
import CrewStoriesRow from "./CrewStoriesRow";
import PostCard from "./PostCard";
import ReportSheet from "./ReportSheet";
import { PlayerAvatar } from "./shared";
import { pickPhoto } from "./pickPhoto";

function Recap({ crew }) {
  const router = useRouter();
  if (!crew.verified || !crew.lastTurnout) return null;
  return (
    <PressableScale onPress={() => crew.nextRun && router.push(`/clubs/run/${crew.nextRun.id}`)} scaleTo={0.98} style={styles.recap}>
      <Image source={crew.cover ? (typeof crew.cover === "string" ? { uri: crew.cover } : crew.cover) : PHOTOS.clubrun} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={["rgba(7,9,12,0.05)", "rgba(7,9,12,0.92)"]} locations={[0.25, 1]} style={StyleSheet.absoluteFill} />
      <View style={{ padding: S.lg }}>
        <Text style={styles.recapKick}>Club run recap</Text>
        <Text style={styles.recapTitle} numberOfLines={2}>
          {crew.lastTurnout} ran with {crew.name} last time
        </Text>
      </View>
    </PressableScale>
  );
}

function Composer({ onOpen, onCamera }) {
  const { data: me } = useProfile();
  return (
    <PressableScale onPress={onOpen} scaleTo={0.985} style={styles.composer} accessibilityLabel="Share a run, photo or route">
      <PlayerAvatar player={me ? { ...me, isOutside: false } : null} size={34} />
      <Text style={styles.composerText}>Share a run, photo or route</Text>
      <PressableScale onPress={onCamera} hitSlop={8} scaleTo={0.88} style={styles.camera} accessibilityLabel="Share a photo">
        <Camera size={17} color={C.accentHi} />
      </PressableScale>
    </PressableScale>
  );
}

export default function CrewFeed({ crew }) {
  const router = useRouter();
  const feed = useCrewFeed(crew.id);
  const [compose, setCompose] = useState(null);
  const [comments, setComments] = useState(null);
  const [report, setReport] = useState(null);
  const rsvp = useEngineMutation(engine.rsvpClubRun, { success: (r) => (r.isGoing ? `See you ${r.title ? "at " + r.title : "there"}` : null) });
  const posts = feed.data || [];

  const camera = async () => {
    const photo = await pickPhoto({ camera: false });
    if (photo) setCompose({ kind: "photo", photo });
  };

  return (
    <View>
      <CrewStoriesRow crew={crew} />
      <View style={{ paddingHorizontal: S.gutter }}>
        <ClubPanel club={crew} onRunAction={(r) => r && !r.checkedIn && rsvp.mutate([r.id, !r.isGoing])} />
        <Recap crew={crew} />
        <Composer onOpen={() => setCompose({ kind: "photo" })} onCamera={camera} />
        {feed.isPending ? (
          <View style={{ gap: S.md }}>
            <Skeleton height={340} radius={20} />
            <Skeleton height={90} radius={20} />
          </View>
        ) : posts.length ? (
          posts.map((p, i) => (
            <FadeIn key={p.id} index={Math.min(i, 6)}>
              <PostCard post={p} crew={crew} onComments={setComments} onReport={(post) => setReport({ crewId: crew.id, targetType: "post", targetId: post.id, author: post.author })} />
            </FadeIn>
          ))
        ) : (
          <EmptyState title="Nothing shared yet" body="Finish a run and share it here, or post a photo from today." action="Go to Move" onAction={() => router.push("/(tabs)/move")} />
        )}
      </View>
      <ComposeSheet crew={crew} visible={!!compose} start={compose} onClose={() => setCompose(null)} />
      <CommentsSheet crewId={crew.id} post={comments} onClose={() => setComments(null)} />
      <ReportSheet target={report} onClose={() => setReport(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  recap: { height: 170, borderRadius: 20, overflow: "hidden", marginTop: S.md, justifyContent: "flex-end", backgroundColor: C.surface },
  recapKick: { color: C.accent, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" },
  recapTitle: { color: C.text, fontFamily: F.display, fontSize: 26, lineHeight: 28, textTransform: "uppercase", marginTop: 4 },
  composer: { flexDirection: "row", alignItems: "center", gap: S.md, height: 58, paddingLeft: S.md, paddingRight: S.sm, borderRadius: 20, backgroundColor: C.surface, marginTop: S.lg, marginBottom: S.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  composerText: { flex: 1, color: C.textDim, fontFamily: F.body, fontSize: 15 },
  camera: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center" },
});
