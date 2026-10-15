// Post a story: a photo with your run stuck on it, plus your route, streak,
// battle or club if you like. Choose who sees it: friends, your club or
// everyone. Gone in 24 hours. Posting is for Pro and Black members; a Free
// member sees what they'd get and can still watch and react to every story.

import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, Clock, Flame, ImagePlus, Navigation, Send, Swords, Users, X } from "lucide-react-native";
import { engine, useBattles, useEngineMutation, useMyCrews, useProfile, useRuns } from "@/data/hooks";
import { Body, Button, C, F, PressableScale, Row, S, toast } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { hapticSelection, hapticSuccess } from "@/services/haptics";
import { pickPhoto } from "@/components/crew/pickPhoto";
import RouteArt from "@/components/crew/RouteArt";
import { RunSticker } from "@/components/crew/storyParts";
import { StoryUpsellBody } from "@/components/crew/StoryUpsell";

const STICKERS = [
  { key: "route", icon: Navigation, label: "Route" },
  { key: "streak", icon: Flame, label: "Streak" },
  { key: "battle", icon: Swords, label: "Battle" },
  { key: "club", icon: Users, label: "Club" },
];

const routeOf = (run) => (run?.route?.length > 1 ? run.route.map((p) => (Array.isArray(p) ? p : [p.latitude ?? p.lat, p.longitude ?? p.lng])) : null);

export default function NewStory() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();
  const crews = useMyCrews();
  const runs = useRuns(1);
  const battles = useBattles("complete");
  const [photo, setPhoto] = useState(null);
  const [caption, setCaption] = useState("");
  const [withRun, setWithRun] = useState(true);
  const [stickers, setStickers] = useState([]);
  const club = useMemo(() => {
    const list = crews.data || [];
    return list.find((c) => c.id === params.club) || list[0] || null;
  }, [crews.data, params.club]);
  const [audience, setAudience] = useState(params.club ? "club" : null);
  const who = audience || (club ? "club" : "followers");

  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)"));
  const post = useEngineMutation(engine.postStory, {
    onSuccess: () => {
      hapticSuccess();
      toast.success("Story posted", "Gone in 24 hours.");
      close();
    },
  });

  const choose = async (camera) => {
    const p = await pickPhoto({ camera, aspect: [9, 16] });
    if (p) setPhoto(p);
  };

  if (profile && profile.tier === "free") {
    return (
      <View style={styles.screen}>
        <Image source={PHOTOS.selfie} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={["rgba(7,9,12,0.4)", "rgba(7,9,12,0.75)"]} style={StyleSheet.absoluteFill} />
        <Row style={[styles.top, { paddingTop: insets.top + S.sm }]}>
          <PressableScale onPress={close} accessibilityLabel="Close" style={styles.round}>
            <X size={20} color="#fff" />
          </PressableScale>
        </Row>
        <View style={{ flex: 1 }} />
        <View style={[styles.upsell, { paddingBottom: insets.bottom + S.lg }]}>
          <StoryUpsellBody onClose={close} onUpgrade={() => router.replace("/membership")} />
        </View>
      </View>
    );
  }

  const run = runs.data?.[0] || null;
  const sticker = run && withRun ? { km: run.distanceKm, seconds: run.durationSec, paceSec: run.paceSecPerKm, title: run.title } : null;
  const lastBattle = (battles.data || [])[0];
  const toggle = (key) => {
    hapticSelection();
    setStickers((s) => (s.includes(key) ? s.filter((x) => x !== key) : [...s, key]));
  };
  const can = { route: !!routeOf(run), streak: !!profile?.streak, battle: !!lastBattle, club: !!club };
  const label = who === "club" && club ? `Post to ${club.name}` : who === "public" ? "Post to everyone" : "Post to friends";

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {photo ? <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
      <LinearGradient colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0)", "rgba(0,0,0,0)", "rgba(0,0,0,0.8)"]} locations={[0, 0.2, 0.55, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <Row style={[styles.top, { paddingTop: insets.top + S.sm }]}>
        <PressableScale onPress={close} accessibilityLabel="Close" style={styles.round}>
          <X size={20} color="#fff" />
        </PressableScale>
        <View style={styles.gone}>
          <Clock size={14} color="#fff" />
          <Text style={styles.goneText}>Gone in 24 hours</Text>
        </View>
      </Row>

      {photo ? (
        <>
          <View style={[styles.side, { top: insets.top + 64 }]}>
            {STICKERS.map((s) => {
              const on = stickers.includes(s.key);
              return (
                <PressableScale key={s.key} disabled={!can[s.key]} onPress={() => toggle(s.key)} scaleTo={0.9} style={[styles.sideItem, !can[s.key] && { opacity: 0.35 }]} accessibilityLabel={`${s.label} sticker${on ? ", on" : ""}`}>
                  <View style={[styles.sideIcon, on && { backgroundColor: C.accent }]}>
                    <s.icon size={18} color="#fff" />
                  </View>
                  <Text style={styles.sideLabel}>{s.label}</Text>
                </PressableScale>
              );
            })}
          </View>
          <View style={styles.middle} pointerEvents="box-none">
            {sticker ? (
              <PressableScale onPress={() => setWithRun(false)} scaleTo={0.96} accessibilityLabel="Remove the run sticker">
                <RunSticker run={sticker} />
              </PressableScale>
            ) : run ? (
              <Button title="Add your last run" size="sm" variant="secondary" onPress={() => setWithRun(true)} />
            ) : null}
            <Row gap={S.sm} style={{ marginTop: S.md, flexWrap: "wrap", justifyContent: "center" }}>
              {stickers.includes("route") && can.route ? <RouteArt points={routeOf(run)} seed={run.id} height={70} radius={14} style={{ width: 120 }} /> : null}
              {stickers.includes("streak") && can.streak ? (
                <View style={styles.tag}>
                  <Flame size={14} color={C.fire} />
                  <Text style={styles.tagText}>{profile.streak} day streak</Text>
                </View>
              ) : null}
              {stickers.includes("battle") && can.battle ? (
                <View style={styles.tag}>
                  <Swords size={14} color={C.accentHi} />
                  <Text style={styles.tagText}>
                    {lastBattle.result === "won" ? "Beat" : lastBattle.result === "lost" ? "Lost to" : "Drew with"} {(lastBattle.opponent.player?.name || "a rival").split(" ")[0]}
                  </Text>
                </View>
              ) : null}
              {stickers.includes("club") && can.club ? (
                <View style={styles.tag}>
                  <Users size={14} color={C.accentHi} />
                  <Text style={styles.tagText}>{club.name}</Text>
                </View>
              ) : null}
            </Row>
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <Text style={[styles.big, { textAlign: "center" }]}>Show them</Text>
          <Text style={[styles.big, { color: C.accent, textAlign: "center" }]}>where you are</Text>
          <Body dim style={{ marginTop: S.md, textAlign: "center", maxWidth: 290 }}>
            One photo from today, with your run on it. It stays up for 24 hours, then it's gone.
          </Body>
          <Row gap={S.md} style={{ marginTop: S.xl }}>
            <Button title="Camera" icon={Camera} onPress={() => choose(true)} />
            <Button title="Photos" icon={ImagePlus} variant="secondary" onPress={() => choose(false)} />
          </Row>
        </View>
      )}

      {photo ? (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + S.lg }]}>
          <TextInput value={caption} onChangeText={setCaption} placeholder="Add a line" placeholderTextColor="rgba(255,255,255,0.65)" maxLength={120} style={styles.caption} accessibilityLabel="Caption" />
          <Row gap={S.sm} style={{ justifyContent: "center", marginBottom: S.md }}>
            {[
              { value: "followers", label: "Friends" },
              club ? { value: "club", label: "My club" } : null,
              { value: "public", label: "Everyone" },
            ]
              .filter(Boolean)
              .map((a) => (
                <PressableScale key={a.value} onPress={() => setAudience(a.value)} scaleTo={0.94} style={[styles.aud, who === a.value && styles.audOn]} accessibilityLabel={`Who sees it: ${a.label}`}>
                  <Text style={[styles.audText, who === a.value && { color: "#0b0d10" }]}>{a.label}</Text>
                </PressableScale>
              ))}
          </Row>
          <Button
            title={label}
            icon={Send}
            size="lg"
            full
            loading={post.isPending}
            onPress={() =>
              post.mutate({
                ...photo,
                caption,
                audience: who,
                clubId: who === "club" ? club?.id : null,
                runId: sticker ? run.id : null,
                stickers: stickers.filter((k) => can[k]),
              })
            }
          />
          <PressableScale onPress={() => choose(false)} style={{ alignSelf: "center", marginTop: S.md }} accessibilityLabel="Change photo">
            <Text style={styles.change}>Change photo</Text>
          </PressableScale>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  top: { justifyContent: "space-between", paddingHorizontal: S.gutter },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(10,14,20,0.5)", alignItems: "center", justifyContent: "center" },
  gone: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: "rgba(10,14,20,0.6)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  goneText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 13 },
  side: { position: "absolute", right: S.gutter, gap: S.md, alignItems: "center" },
  sideItem: { alignItems: "center", gap: 4 },
  sideIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(10,14,20,0.6)", alignItems: "center", justifyContent: "center" },
  sideLabel: { color: "#fff", fontFamily: F.bodySemi, fontSize: 11 },
  middle: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 70 },
  tag: { flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: "rgba(10,13,18,0.86)" },
  tagText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 13 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: S.gutter },
  big: { color: C.text, fontFamily: F.display, fontSize: 44, lineHeight: 44, textTransform: "uppercase" },
  bottom: { paddingHorizontal: S.gutter },
  caption: { color: "#fff", fontFamily: F.bodySemi, fontSize: 20, paddingVertical: S.sm, marginBottom: S.md, textAlign: "center", outlineStyle: "none" },
  aud: { height: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: "rgba(20,24,30,0.85)", justifyContent: "center" },
  audOn: { backgroundColor: "#fff" },
  audText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 14 },
  change: { color: "rgba(255,255,255,0.8)", fontFamily: F.bodyMedium, fontSize: 13 },
  upsell: { backgroundColor: "#141416", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: S.md, borderWidth: 1, borderColor: "#232326" },
});
