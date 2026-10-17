// A club's story. Clubs post too: tonight's run, with one button to say
// you're coming. Replies go to the crew chat.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Users, X } from "@/components/ui/icons";
import { engine, showEngineError, useClubStories, useCrew, useEngineMutation } from "@/data/hooks";
import { Button, PressableScale, Row, S } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { hapticSuccess } from "@/services/haptics";
import { timeAgo } from "@/utils/format";
import { openStory } from "@/components/crew/CrewStoriesRow";
import { EmoteBurst, ProgressBars, ReplyRow, TapZones, storyStyles as styles, useStoryClock } from "@/components/crew/storyParts";

export default function ClubStory() {
  const { crewId, queue = "" } = useLocalSearchParams();
  const id = String(crewId || "");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: crew } = useCrew(id);
  const stories = useClubStories(id);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [burst, setBurst] = useState(null);
  const list = useMemo(() => stories.data || [], [stories.data]);
  const story = list[index];
  const rest = useMemo(() => String(queue).split(",").filter(Boolean), [queue]);
  const short = (crew?.name || "the club").split(" ")[0];

  const close = useCallback(() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/club")), [router]);
  const finish = useCallback(() => {
    if (rest.length) openStory(router, rest[0], rest.slice(1), true);
    else close();
  }, [rest, router, close]);
  const next = useCallback(() => (index + 1 < list.length ? setIndex(index + 1) : finish()), [index, list.length, finish]);
  const prev = useCallback(() => index > 0 && setIndex(index - 1), [index]);
  const [progress] = useStoryClock(story ? story.id : null, paused, next);

  useEffect(() => {
    if (story && !story.seen) engine.viewStory(story.id).catch(() => {});
  }, [story]);
  useEffect(() => {
    if (!stories.isPending && !list.length) finish();
  }, [stories.isPending, list.length, finish]);

  const rsvp = useEngineMutation(engine.rsvpClubRun, {
    success: (r) => (r.isGoing ? "See you tonight" : "Maybe next time"),
    onSuccess: () => stories.refetch(),
  });
  const reply = useEngineMutation(engine.sendCrewMessage, { success: "Sent to the crew chat" });
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

  const logo = crew?.logo ? (typeof crew.logo === "string" ? { uri: crew.logo } : crew.logo) : PHOTOS.crest;
  const going = !!story?.clubRun?.isGoing;

  return (
    <View style={styles.screen}>
      {story ? <Image source={story.image} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" transition={180} /> : null}
      <LinearGradient colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0)"]} style={[styles.shade, { height: 190 + insets.top }]} />
      <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.85)"]} style={[styles.shade, { bottom: 0, height: 380 }]} />
      <TapZones onPrev={prev} onNext={next} onHold={() => setPaused(true)} onRelease={() => setPaused(false)} />

      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <ProgressBars count={Math.max(1, list.length)} index={index} progress={progress} />
        <Row style={{ marginTop: 11, justifyContent: "space-between" }} pointerEvents="box-none">
          <PressableScale onPress={() => router.push(`/crew/${id}`)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {/* .r11cr: the crest in a blue frame, so a club's story reads as a club */}
            <View style={cr.frame}>
              <LinearGradient colors={["#82b4ff", "#2a6af0"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} />
              <Image source={logo} style={cr.img} contentFit="cover" />
            </View>
            <View>
              <Text style={styles.name}>{crew?.name || " "}</Text>
              {story ? <Text style={styles.when}>{timeAgo(story.postedAt).replace(" ago", "")}</Text> : null}
            </View>
          </PressableScale>
          <PressableScale onPress={close} accessibilityLabel="Close" style={styles.round}>
            <X size={22} color="#fff" strokeWidth={2.2} />
          </PressableScale>
        </Row>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]} pointerEvents="box-none">
        {story?.caption ? <Text style={styles.caption}>{story.caption}</Text> : null}
        {story?.clubRun ? (
          <Button
            title={going ? "You're coming tonight" : "I'm coming tonight"}
            icon={going ? Check : Users}
            variant={going ? "secondary" : "primary"}
            full
            loading={rsvp.isPending}
            onPress={() => rsvp.mutate([story.clubRun.id, !going])}
            style={{ marginTop: 12, height: 46 }}
          />
        ) : null}
        {story ? (
          <ReplyRow
            name={short}
            picked={story.emote}
            onReply={(text) => reply.mutate([id, text])}
            onEmote={react}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          />
        ) : null}
      </View>
      <EmoteBurst burst={burst} onDone={() => setBurst(null)} />
    </View>
  );
}

const cr = StyleSheet.create({
  frame: { width: 36, height: 36, borderRadius: 12, padding: 2, boxShadow: "0 0 12px rgba(79,155,255,0.5)" },
  img: { flex: 1, borderRadius: 10, borderWidth: 2, borderColor: "#07090c", backgroundColor: "#000" },
});
