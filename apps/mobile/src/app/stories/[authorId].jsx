// A person's stories, full screen. Each photo plays for a few seconds and
// moves on by itself; tap the right side to skip, the left to go back, and
// hold to pause. Then it carries on to the next person in the row with
// something new. Others can react with an emote; your own can be deleted.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotiView } from "moti";
import { Trash2, X } from "lucide-react-native";
import { engine, showEngineError, usePlayer, useProfile, useStories } from "@/data/hooks";
import { Avatar, C, F, PressableScale, Row, S } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { hapticSelection, hapticSuccess } from "@/services/haptics";
import { timeAgo } from "@/utils/format";

const STORY_MS = 5000;
const TICK_MS = 50;

const EMOTES = [
  { key: "flame", image: PHOTOS.emoteFlame, label: "Fire" },
  { key: "bolt", image: PHOTOS.emoteBolt, label: "Fast" },
  { key: "fist", image: PHOTOS.emoteFist, label: "Respect" },
  { key: "crown", image: PHOTOS.emoteCrown, label: "Crowned" },
  { key: "wings", image: PHOTOS.emoteWings, label: "Flying" },
];

export default function StoryViewer() {
  const { authorId, queue = "" } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data: me } = useProfile();
  const { data: author } = usePlayer(authorId);
  const { data: stories, isPending } = useStories(authorId);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [burst, setBurst] = useState(null);
  const startedOn = useRef(false);

  const list = useMemo(() => stories || [], [stories]);
  const mine = !!me && (authorId === me.id || author?.isMe);
  const story = list[index];
  const rest = useMemo(() => String(queue).split(",").filter(Boolean), [queue]);

  // Start on the first story not seen yet, once.
  useEffect(() => {
    if (startedOn.current || !list.length) return;
    startedOn.current = true;
    const first = list.findIndex((st) => !st.seen);
    setIndex(first > 0 ? first : 0);
  }, [list]);

  const close = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)")), [router]);

  const finish = useCallback(() => {
    if (rest.length) router.replace({ pathname: "/stories/[authorId]", params: { authorId: rest[0], queue: rest.slice(1).join(",") } });
    else close();
  }, [rest, router, close]);

  const next = useCallback(() => {
    setProgress(0);
    if (index + 1 < list.length) setIndex(index + 1);
    else finish();
  }, [index, list.length, finish]);

  const prev = useCallback(() => {
    setProgress(0);
    if (index > 0) setIndex(index - 1);
  }, [index]);

  // Seen as soon as it's on screen.
  useEffect(() => {
    if (story && !mine && !story.seen) engine.viewStory(story.id).catch(() => {});
  }, [story, mine]);

  // The clock for the current story.
  useEffect(() => {
    if (!story || paused) return undefined;
    const id = setInterval(() => setProgress((p) => Math.min(1, p + TICK_MS / STORY_MS)), TICK_MS);
    return () => clearInterval(id);
  }, [story, paused]);

  useEffect(() => {
    if (progress >= 1) next();
  }, [progress, next]);

  // Nothing to show (expired, or not allowed): go straight on.
  useEffect(() => {
    if (!isPending && !list.length) finish();
  }, [isPending, list.length, finish]);

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
    const run = async () => {
      try {
        await engine.deleteStory(story.id);
        if (list.length <= 1) close();
        else setIndex(Math.max(0, index - 1));
      } catch (e) {
        showEngineError(e);
      }
    };
    if (Platform.OS === "web") return run();
    setPaused(true);
    Alert.alert("Delete this story?", "It goes for everyone straight away.", [
      { text: "Keep it", style: "cancel", onPress: () => setPaused(false) },
      { text: "Delete", style: "destructive", onPress: run },
    ]);
  };

  return (
    <View style={styles.screen}>
      {story ? <Image source={story.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} /> : null}
      <LinearGradient colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0)"]} style={[styles.shade, { height: 160 + insets.top }]} />
      <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.7)"]} style={[styles.shade, { bottom: 0, height: 240 }]} />

      {/* Tap zones: left goes back, right goes on, hold pauses. */}
      <View style={StyleSheet.absoluteFill}>
        <Row gap={0} style={{ flex: 1 }}>
          <Pressable style={{ width: width * 0.32, height: "100%", outlineStyle: "none" }} onPress={prev} onLongPress={() => setPaused(true)} onPressOut={() => setPaused(false)} accessibilityLabel="Previous story" />
          <Pressable style={{ flex: 1, height: "100%", outlineStyle: "none" }} onPress={next} onLongPress={() => setPaused(true)} onPressOut={() => setPaused(false)} accessibilityLabel="Next story" />
        </Row>
      </View>

      <View style={[styles.top, { paddingTop: insets.top + S.sm }]} pointerEvents="box-none">
        <Row gap={4}>
          {list.map((st, i) => (
            <View key={st.id} style={styles.track}>
              <View style={[styles.fill, { width: `${(i < index ? 1 : i === index ? progress : 0) * 100}%` }]} />
            </View>
          ))}
        </Row>
        <Row style={{ marginTop: S.md, justifyContent: "space-between" }} pointerEvents="box-none">
          <PressableScale onPress={() => !mine && router.push(`/player/${authorId}`)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Avatar uri={author?.avatar} name={author?.name || ""} dot={author?.isOutside ? "out" : null} size={38} />
            <View>
              <Text style={styles.name}>{mine ? "Your story" : author?.name || " "}</Text>
              {story ? <Text style={styles.when}>{timeAgo(story.postedAt)}</Text> : null}
            </View>
          </PressableScale>
          <Row gap={S.sm}>
            {mine ? (
              <PressableScale onPress={remove} accessibilityLabel="Delete story" style={styles.round}>
                <Trash2 size={18} color="#fff" />
              </PressableScale>
            ) : null}
            <PressableScale onPress={close} accessibilityLabel="Close" style={styles.round}>
              <X size={20} color="#fff" />
            </PressableScale>
          </Row>
        </Row>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + S.lg }]} pointerEvents="box-none">
        {story?.caption ? <Text style={styles.caption}>{story.caption}</Text> : null}
        {!mine && story ? (
          <Row gap={10} style={{ marginTop: S.md }}>
            {EMOTES.map((e) => (
              <PressableScale
                key={e.key}
                onPress={() => {
                  hapticSelection();
                  react(e);
                }}
                accessibilityLabel={`React: ${e.label}`}
                style={[styles.emote, story.emote === e.key && styles.emoteOn]}
              >
                <Image source={e.image} style={{ width: 34, height: 34 }} contentFit="contain" />
              </PressableScale>
            ))}
          </Row>
        ) : null}
        {mine && story ? <Text style={styles.note}>{`Gone in ${Math.max(1, Math.ceil((story.expiresAt - Date.now()) / 3600000))}h. Only ${story.audience === "public" ? "everyone" : story.audience === "club" ? "your club" : "your followers"} can see it.`}</Text> : null}
      </View>

      {burst ? (
        <MotiView
          key={burst.key}
          from={{ opacity: 0, scale: 0.4, translateY: 40 }}
          animate={{ opacity: [1, 1, 0], scale: [1.3, 1.1, 1.6], translateY: [-40, -80, -160] }}
          transition={{ type: "timing", duration: 1100 }}
          onDidAnimate={(key, done) => key === "opacity" && done && setBurst(null)}
          style={styles.burst}
          pointerEvents="none"
        >
          <Image source={burst.image} style={{ width: 120, height: 120 }} contentFit="contain" />
        </MotiView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  shade: { position: "absolute", left: 0, right: 0 },
  top: { position: "absolute", left: 0, right: 0, top: 0, paddingHorizontal: S.md },
  track: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.3)", overflow: "hidden" },
  fill: { height: 3, backgroundColor: "#fff" },
  name: { color: "#fff", fontFamily: F.bodySemi, fontSize: 14 },
  when: { color: "rgba(255,255,255,0.7)", fontFamily: F.body, fontSize: 12, marginTop: 1 },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(10,14,20,0.45)", alignItems: "center", justifyContent: "center" },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: S.gutter },
  caption: { color: "#fff", fontFamily: F.display, fontSize: 30, lineHeight: 32, textTransform: "uppercase" },
  note: { color: "rgba(255,255,255,0.75)", fontFamily: F.body, fontSize: 13, marginTop: S.sm },
  emote: { width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(10,14,20,0.5)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  emoteOn: { borderColor: C.accentHi, backgroundColor: "rgba(61,139,255,0.35)" },
  burst: { position: "absolute", alignSelf: "center", top: "45%" },
});
