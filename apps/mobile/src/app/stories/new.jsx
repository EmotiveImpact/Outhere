// Post a story: one photo, a few words, and who sees it. Gone in 24 hours.
// Posting is for Pro and Black members. A Free member lands on a page that
// says so, and can still watch every story and react.

import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, ImagePlus, X } from "lucide-react-native";
import { engine, useEngineMutation, useProfile } from "@/data/hooks";
import { Body, Button, C, F, PressableScale, Row, S, Segment, toast } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { hapticSuccess } from "@/services/haptics";

const AUDIENCES = [
  { value: "followers", label: "Followers" },
  { value: "public", label: "Everyone" },
];

export default function NewStory() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();
  const [photo, setPhoto] = useState(null); // { uri, width, height }
  const [caption, setCaption] = useState("");
  const [audience, setAudience] = useState("followers");

  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)"));

  const post = useEngineMutation(engine.postStory, {
    onSuccess: () => {
      hapticSuccess();
      toast.success("Story posted", "Gone in 24 hours.");
      close();
    },
  });

  const pick = async (fromCamera) => {
    try {
      const ask = fromCamera ? ImagePicker.requestCameraPermissionsAsync : ImagePicker.requestMediaLibraryPermissionsAsync;
      const { granted } = Platform.OS === "web" ? { granted: true } : await ask();
      if (!granted) {
        toast("No access", fromCamera ? "Allow the camera for Outhere in Settings." : "Allow photos for Outhere in Settings.");
        return;
      }
      const launch = fromCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
      const res = await launch({ mediaTypes: ["images"], quality: 0.9, allowsEditing: true, aspect: [9, 16] });
      if (!res.canceled && res.assets?.[0]) {
        const a = res.assets[0];
        setPhoto({ uri: a.uri, width: a.width, height: a.height });
      }
    } catch (e) {
      toast.error(e?.message || "Couldn't open your photos.");
    }
  };

  if (profile && profile.tier === "free") return <FreeMember onClose={close} onUpgrade={() => router.replace("/membership")} />;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {photo ? <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
      <LinearGradient colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0)", "rgba(0,0,0,0)", "rgba(0,0,0,0.8)"]} locations={[0, 0.2, 0.55, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />

      <Row style={[styles.top, { paddingTop: insets.top + S.sm }]}>
        <PressableScale onPress={close} accessibilityLabel="Close" style={styles.round}>
          <X size={20} color="#fff" />
        </PressableScale>
        <Text style={styles.title}>New story</Text>
        <View style={{ width: 40 }} />
      </Row>

      {!photo ? (
        <View style={styles.empty}>
          <Text style={[styles.big, { textAlign: "center" }]}>Show them</Text>
          <Text style={[styles.big, { color: C.accent, textAlign: "center" }]}>where you are</Text>
          <Body dim style={{ marginTop: S.md, textAlign: "center", maxWidth: 280 }}>
            One photo from today. It stays up for 24 hours, then it's gone.
          </Body>
          <Row gap={S.md} style={{ marginTop: S.xl }}>
            <Button title="Camera" icon={Camera} onPress={() => pick(true)} />
            <Button title="Photos" icon={ImagePlus} variant="secondary" onPress={() => pick(false)} />
          </Row>
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {photo ? (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + S.lg }]}>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Add a line"
            placeholderTextColor="rgba(255,255,255,0.6)"
            maxLength={120}
            style={styles.caption}
            accessibilityLabel="Caption"
          />
          <Text style={styles.label}>Who sees it</Text>
          <Segment options={AUDIENCES} value={audience} onChange={setAudience} />
          <Row gap={S.md} style={{ marginTop: S.lg }}>
            <Button title="Change" variant="secondary" onPress={() => pick(false)} />
            <Button title="Post story" size="lg" style={{ flex: 1 }} loading={post.isPending} onPress={() => post.mutate({ ...photo, caption, audience })} />
          </Row>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function FreeMember({ onClose, onUpgrade }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <Image source={PHOTOS.selfie} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={["rgba(7,9,12,0.3)", "rgba(7,9,12,0.2)", "rgba(7,9,12,0.95)"]} locations={[0, 0.35, 0.75]} style={StyleSheet.absoluteFill} />
      <Row style={[styles.top, { paddingTop: insets.top + S.sm }]}>
        <PressableScale onPress={onClose} accessibilityLabel="Close" style={styles.round}>
          <X size={20} color="#fff" />
        </PressableScale>
      </Row>
      <View style={{ flex: 1 }} />
      <View style={[styles.bottom, { paddingBottom: insets.bottom + S.lg }]}>
        <Text style={styles.kicker}>Stories</Text>
        <Text style={styles.big}>Posting is</Text>
        <Text style={[styles.big, { color: C.accent }]}>for members</Text>
        <Body dim style={{ marginTop: S.md }}>
          Pro and Black members post stories. You can still watch every story and react to them.
        </Body>
        <Button title="Try Pro" size="lg" full style={{ marginTop: S.xl }} onPress={onUpgrade} />
        <Button title="Not now" variant="secondary" full style={{ marginTop: S.sm }} onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  top: { justifyContent: "space-between", paddingHorizontal: S.gutter },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(10,14,20,0.5)", alignItems: "center", justifyContent: "center" },
  title: { color: "#fff", fontFamily: F.bodySemi, fontSize: 15 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: S.gutter },
  big: { color: C.text, fontFamily: F.display, fontSize: 44, lineHeight: 44, textTransform: "uppercase", textAlign: "left" },
  kicker: { color: C.accent, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase", marginBottom: 6 },
  bottom: { paddingHorizontal: S.gutter },
  caption: { color: "#fff", fontFamily: F.display, fontSize: 30, textTransform: "uppercase", paddingVertical: S.sm, marginBottom: S.lg, outlineStyle: "none" },
  label: { color: "rgba(255,255,255,0.75)", fontFamily: F.bodySemi, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: S.sm },
});
