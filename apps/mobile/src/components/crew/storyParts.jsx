// Pieces shared by the story viewers (a person's stories and a club's): the
// progress bars, tap zones, the reply box with three emotes, the emote
// burst, and the run sticker that sits on a photo.

import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { MotiView } from "moti";
import { BlendImage, C, F, LiveDot, PressableScale, Row, S } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { formatDuration, formatPace } from "@/utils/format";
import { hapticSelection } from "@/services/haptics";

export const STORY_MS = 5000;
const TICK_MS = 50;

export const EMOTES = [
  { key: "flame", image: PHOTOS.emoteFlame, label: "Fire" },
  { key: "bolt", image: PHOTOS.emoteBolt, label: "Fast" },
  { key: "fist", image: PHOTOS.emoteFist, label: "Respect" },
];

/** The clock for one story: 0 to 1 over STORY_MS, then onDone. */
export function useStoryClock(key, paused, onDone) {
  // Progress belongs to one story, so moving on never carries a full bar over.
  const [clock, setClock] = useState({ key, p: 0 });
  const fired = useRef(null);
  const progress = clock.key === key ? clock.p : 0;
  useEffect(() => {
    fired.current = null;
    setClock({ key, p: 0 });
  }, [key]);
  useEffect(() => {
    if (key == null || paused) return undefined;
    const id = setInterval(() => setClock((c) => ({ key, p: Math.min(1, (c.key === key ? c.p : 0) + TICK_MS / STORY_MS) })), TICK_MS);
    return () => clearInterval(id);
  }, [key, paused]);
  useEffect(() => {
    if (progress >= 1 && fired.current !== key) {
      fired.current = key;
      onDone();
    }
  }, [progress, key, onDone]);
  return [progress];
}

export function ProgressBars({ count, index, progress }) {
  return (
    <Row gap={4}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.track}>
          <View style={[styles.fill, { width: `${(i < index ? 1 : i === index ? progress : 0) * 100}%` }]} />
        </View>
      ))}
    </Row>
  );
}

export function TapZones({ onPrev, onNext, onHold, onRelease }) {
  const { width } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill}>
      <Row gap={0} style={{ flex: 1 }}>
        <Pressable style={{ width: width * 0.32, height: "100%", outlineStyle: "none" }} onPress={onPrev} onLongPress={onHold} onPressOut={onRelease} accessibilityLabel="Previous story" />
        <Pressable style={{ flex: 1, height: "100%", outlineStyle: "none" }} onPress={onNext} onLongPress={onHold} onPressOut={onRelease} accessibilityLabel="Next story" />
      </Row>
    </View>
  );
}

/** "Reply to Tobi" with three emotes beside it. */
export function ReplyRow({ name, picked, onReply, onEmote, onFocus, onBlur }) {
  const [text, setText] = useState("");
  const send = () => {
    const clean = text.trim();
    if (!clean) return;
    onReply(clean);
    setText("");
  };
  return (
    // .svrep: a slim outlined reply pill and the emotes blended straight onto the photo
    <Row gap={7} style={{ marginTop: S.md }}>
      <TextInput
        value={text}
        onChangeText={setText}
        onFocus={onFocus}
        onBlur={onBlur}
        onSubmitEditing={send}
        returnKeyType="send"
        placeholder={`Reply to ${name}`}
        placeholderTextColor="rgba(255,255,255,0.75)"
        maxLength={500}
        style={styles.reply}
        accessibilityLabel={`Reply to ${name}`}
      />
      {EMOTES.map((e) => (
        <PressableScale
          key={e.key}
          onPress={() => {
            hapticSelection();
            onEmote(e);
          }}
          accessibilityLabel={`React: ${e.label}`}
          style={[styles.emote, picked === e.key && styles.emoteOn]}
        >
          <BlendImage source={e.image} size={40} mask="tight" />
        </PressableScale>
      ))}
    </Row>
  );
}

export function EmoteBurst({ burst, onDone }) {
  if (!burst) return null;
  return (
    <MotiView
      key={burst.key}
      from={{ opacity: 0, scale: 0.4, translateY: 40 }}
      animate={{ opacity: [1, 1, 0], scale: [1.3, 1.1, 1.6], translateY: [-40, -80, -160] }}
      transition={{ type: "timing", duration: 1100 }}
      onDidAnimate={(key, done) => key === "opacity" && done && onDone()}
      style={styles.burst}
      pointerEvents="none"
    >
      <BlendImage source={burst.image} size={140} mask="burst" glow={150} />
    </MotiView>
  );
}

/** The run stuck on the photo: distance big, then time, pace and where. */
export function RunSticker({ run, tilt = -6, style }) {
  if (!run) return null;
  return (
    <View style={[styles.sticker, { transform: [{ rotate: `${tilt}deg` }] }, style]}>
      <View style={styles.stickerRing}>
        <View style={styles.stickerDot} />
      </View>
      <View>
        <Text style={styles.stickerKm}>{Number(run.km).toFixed(2)} km</Text>
        <Text style={styles.stickerSub} numberOfLines={1}>
          {[run.seconds ? formatDuration(run.seconds) : null, run.paceSec ? `${formatPace(run.paceSec)} /km` : null, run.title].filter(Boolean).join(" · ")}
        </Text>
      </View>
    </View>
  );
}

export const LiveChips = ({ live }) =>
  live ? (
    <View style={{ marginTop: S.md, gap: S.sm }}>
      <View style={styles.outNow}>
        <LiveDot size={7} />
        <Text style={styles.outText}>Out now</Text>
      </View>
      <Row gap={S.sm}>
        <View style={styles.stat}>
          <Text style={styles.statText}>{Number(live.km).toFixed(1)} km</Text>
        </View>
        {live.paceSec ? (
          <View style={styles.stat}>
            <Text style={styles.statText}>{formatPace(live.paceSec)} /km</Text>
          </View>
        ) : null}
        {live.minutes ? (
          <View style={styles.stat}>
            <Text style={styles.statText}>{live.minutes} min</Text>
          </View>
        ) : null}
      </Row>
    </View>
  ) : null;

export const storyStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000" },
  shade: { position: "absolute", left: 0, right: 0 },
  top: { position: "absolute", left: 0, right: 0, top: 0, paddingHorizontal: S.md },
  name: { color: "#fff", fontFamily: F.bodySemi, fontSize: 13.5 },
  when: { color: "#d6deea", fontFamily: F.body, fontSize: 11, marginTop: 1 },
  round: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  bottom: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: S.gutter },
  caption: { color: "#fff", fontFamily: F.bodySemi, fontSize: 20, lineHeight: 25, textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 14, textShadowOffset: { width: 0, height: 2 } },
  note: { color: "rgba(255,255,255,0.75)", fontFamily: F.body, fontSize: 13, marginTop: S.sm },
});

const styles = StyleSheet.create({
  track: { flex: 1, height: 3, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.3)", overflow: "hidden" },
  fill: { height: 3, backgroundColor: "#fff" },
  reply: { flex: 1, minWidth: 0, height: 42, borderRadius: 21, backgroundColor: "rgba(0,0,0,0.25)", boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.45)", color: "#fff", paddingHorizontal: 16, fontFamily: F.body, fontSize: 13, outlineStyle: "none" },
  emote: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  emoteOn: { backgroundColor: "rgba(61,139,255,0.22)", boxShadow: "0 0 0 1.5px rgba(130,180,255,0.7), 0 0 16px rgba(79,155,255,0.5)" },
  burst: { position: "absolute", alignSelf: "center", top: "42%" },
  sticker: { flexDirection: "row", alignItems: "center", gap: S.md, alignSelf: "center", paddingVertical: S.md, paddingHorizontal: S.lg, borderRadius: 18, backgroundColor: "rgba(10,13,18,0.86)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  stickerRing: { width: 34, height: 34, borderRadius: 17, borderWidth: 4, borderColor: "#fff", borderRightColor: "transparent", alignItems: "flex-end", justifyContent: "flex-end" },
  stickerDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.accent, marginRight: -2, marginBottom: -2 },
  stickerKm: { color: "#fff", fontFamily: F.display, fontSize: 32, lineHeight: 34 },
  stickerSub: { color: "rgba(255,255,255,0.8)", fontFamily: F.body, fontSize: 12, maxWidth: 220 },
  outNow: { flexDirection: "row", alignItems: "center", gap: 7, alignSelf: "flex-start", height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.1)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 1px rgba(255,255,255,0.12)" },
  outDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.out },
  outText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 12.5 },
  stat: { height: 30, paddingHorizontal: 10, borderRadius: 10, backgroundColor: "rgba(10,14,20,0.55)", justifyContent: "center" },
  statText: { color: "#fff", fontFamily: F.display, fontSize: 15 },
});
