// A person's stories, full screen. Each photo plays for a few seconds and
// moves on; tap right to skip, left to go back, hold to pause. Then it
// carries on to the next person (or club) in the row with something new.
// Someone out right now shows their live distance, pace and time, with a
// cheer that buzzes their wrist. Reply, or react with an emote.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Trash2, X, Zap } from "@/components/ui/icons";
import { engine, showEngineError, useEngineMutation, usePlayer, useProfile, useStories } from "@/data/hooks";
import { Avatar, Button, PressableScale, Row, S, toast } from "@/components/ui";
import { hapticSuccess } from "@/services/haptics";
import { timeAgo } from "@/utils/format";
import { openStory } from "@/components/crew/CrewStoriesRow";
import { EmoteBurst, LiveChips, ProgressBars, ReplyRow, RunSticker, TapZones, storyStyles as styles, useStoryClock } from "@/components/crew/storyParts";

const AUDIENCE = { public: "everyone", club: "your club", followers: "your friends" };

export default function StoryViewer() {
  const { authorId, queue = "" } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: me } = useProfile();
  const { data: author } = usePlayer(authorId);
  const { data: stories, isPending } = useStories(authorId);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [burst, setBurst] = useState(null);
  const startedOn = useRef(false);

  const list = useMemo(() => stories || [], [stories]);
  const mine = !!me && (authorId === me.id || author?.isMe);
  const story = list[index];
  const rest = useMemo(() => String(queue).split(",").filter(Boolean), [queue]);
  const first = (author?.name || "them").split(" ")[0];

  useEffect(() => {
    if (startedOn.current || !list.length) return;
    startedOn.current = true;
    const unseen = list.findIndex((st) => !st.seen);
    setIndex(unseen > 0 ? unseen : 0);
  }, [list]);

  const close = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)")), [router]);
  const finish = useCallback(() => {
    if (rest.length) openStory(router, rest[0], rest.slice(1), true);
    else close();
  }, [rest, router, close]);
  const next = useCallback(() => {
    if (index + 1 < list.length) setIndex(index + 1);
    else finish();
  }, [index, list.length, finish]);
  const prev = useCallback(() => {
    if (index > 0) setIndex(index - 1);
  }, [index]);
  const [progress] = useStoryClock(story ? story.id : null, paused, next);

  useEffect(() => {
    if (story && !mine && !story.seen) engine.viewStory(story.id).catch(() => {});
  }, [story, mine]);

  useEffect(() => {
    if (!isPending && !list.length) finish();
  }, [isPending, list.length, finish]);

  const cheer = useEngineMutation(engine.cheerStory, {
    onSuccess: (r) => {
      hapticSuccess();
      toast.success(r?.already ? "Already cheered" : "Cheer sent", r?.already ? undefined : `${first} feels it on the run.`);
    },
  });
  const reply = useEngineMutation(engine.replyToStory, { success: `Sent to ${first}` });

  const react = async (emote) => {
    if (!story) return;
    hapticSuccess();
    setBurst({ key: `${emote.key}:${Date.now()}`, image: emote.image });
    try {
      await engine.viewStory(story.id, emote.key);
    } catch (e) {
      showEngineError(e);
    }
  };

  const remove = () => {
    if (!story) return;
    const go = async () => {
      try {
        await engine.deleteStory(story.id);
        if (list.length <= 1) close();
        else setIndex(Math.max(0, index - 1));
      } catch (e) {
        showEngineError(e);
      }
    };
    if (Platform.OS === "web") return go();
    setPaused(true);
    Alert.alert("Delete this story?", "It goes for everyone straight away.", [
      { text: "Keep it", style: "cancel", onPress: () => setPaused(false) },
      { text: "Delete", style: "destructive", onPress: go },
    ]);
  };

  const live = story?.live || null;

  return (
    <View style={styles.screen}>
      {story ? <Image source={story.image} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" transition={180} /> : null}
      <LinearGradient colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0)"]} style={[styles.shade, { height: 190 + insets.top }]} />
      <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.85)"]} style={[styles.shade, { bottom: 0, height: 380 }]} />

      <TapZones onPrev={prev} onNext={next} onHold={() => setPaused(true)} onRelease={() => setPaused(false)} />

      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <ProgressBars count={list.length} index={index} progress={progress} />
        <Row style={{ marginTop: 11, justifyContent: "space-between" }} pointerEvents="box-none">
          <PressableScale onPress={() => !mine && router.push(`/player/${authorId}`)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Avatar uri={author?.avatar} name={author?.name || ""} tier={author?.tier} dot={live || author?.isOutside ? "out" : null} size={36} />
            <View>
              <Text style={styles.name}>{mine ? "Your story" : author?.name || " "}</Text>
              {story ? <Text style={styles.when}>{live ? "Out now" : timeAgo(story.postedAt)}</Text> : null}
            </View>
          </PressableScale>
          <Row gap={S.sm}>
            {mine ? (
              <PressableScale onPress={remove} accessibilityLabel="Delete story" style={styles.round}>
                <Trash2 size={18} color="#fff" />
              </PressableScale>
            ) : null}
            <PressableScale onPress={close} accessibilityLabel="Close" style={styles.round}>
              <X size={22} color="#fff" strokeWidth={2.2} />
            </PressableScale>
          </Row>
        </Row>
        <LiveChips live={live} />
      </View>

      {story?.run && !live ? (
        <View style={{ position: "absolute", left: 0, right: 0, top: "38%" }} pointerEvents="none">
          <RunSticker run={story.run} />
        </View>
      ) : null}

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]} pointerEvents="box-none">
        {story?.caption ? <Text style={styles.caption}>{story.caption}</Text> : null}
        {!mine && story && live ? (
          <Button title="Send a cheer" icon={Zap} full loading={cheer.isPending} onPress={() => cheer.mutate([story.id, authorId])} style={{ marginTop: 12, height: 46 }} />
        ) : null}
        {!mine && story ? (
          <ReplyRow
            name={first}
            picked={story.emote}
            onReply={(text) => reply.mutate([story.id, authorId, text])}
            onEmote={react}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          />
        ) : null}
        {mine && story ? <Text style={styles.note}>{`Gone in ${Math.max(1, Math.ceil((story.expiresAt - Date.now()) / 3600000))}h. Only ${AUDIENCE[story.audience] || "your friends"} can see it.`}</Text> : null}
      </View>

      <EmoteBurst burst={burst} onDone={() => setBurst(null)} />
    </View>
  );
}
