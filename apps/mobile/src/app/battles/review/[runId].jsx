// Fair play: when part of a run looks like a bus or a bike, only that part is
// held. You see exactly why (the red stretch on the map, the three checks)
// and can say it's wrong. The server decides within 24 hours.

import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, X } from "@/components/ui/icons";
import { engine, useEngineMutation, useRunReview } from "@/data/hooks";
import { LinearGradient } from "expo-linear-gradient";
import { C, EmptyState, F, R, Row, S, Sheet, Skeleton, Button } from "@/components/ui";
import { BottomBar, ButtonPair, TopBar } from "@/components/arena/OutsideKit";
import { MapArt } from "@/components/move/MapTexture";
import { LitCard } from "@/components/move/RunBits";

const km = (m) => (Math.round((m || 0) / 100) / 10).toFixed(1);
const STATUS = {
  open: { label: "Under review", colour: "#ff4d55" },
  appealed: { label: "Appeal in", colour: "#ffb547" },
  accepted: { label: "Held", colour: "#8a93a3" },
  cleared: { label: "Cleared", colour: "#3d8bff" },
  upheld: { label: "Held", colour: "#8a93a3" },
};

const toCoord = (p) => (Array.isArray(p) ? { latitude: p[0], longitude: p[1] } : { latitude: p.latitude ?? p.lat, longitude: p.longitude ?? p.lng });

/** .r11rvmap: the run on the night map, the stretch that looks too fast in red. */
function ReviewMap({ route, fast, label }) {
  const [w, setW] = useState(0);
  const h = 150;
  const lines = useMemo(() => {
    const pts = (route || []).map(toCoord).filter((p) => p.latitude != null && p.longitude != null);
    if (pts.length < 2) return [];
    const fastSet = new Set(fast || []);
    const red = [];
    let run = null;
    pts.forEach((p, i) => {
      if (i > 0 && fastSet.has(i)) {
        if (!run) run = [pts[i - 1]];
        run.push(p);
      } else if (run) {
        red.push(run);
        run = null;
      }
    });
    if (run) red.push(run);
    return [{ path: pts, width: 6 }, ...red.map((r) => ({ path: r, width: 6, colour: "#ff4d55" }))];
  }, [route, fast]);
  return (
    <View style={styles.map} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w && lines.length ? <MapArt width={w} height={h} lines={lines} start={false} pad={{ top: 18, right: 30, bottom: 18, left: 30 }} shadeTop={0.2} shadeBottom={0.45} /> : null}
      {label ? (
        <View style={styles.mapTag}>
          <Text style={styles.mapTagText}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function RunReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { runId } = useLocalSearchParams();
  const id = String(runId || "");
  const { data: review, isPending } = useRunReview(id);
  const [appealing, setAppealing] = useState(false);
  const [note, setNote] = useState("");
  const answer = useEngineMutation(engine.answerRunReview, {
    success: (r) => (r?.status === "appealed" ? "Thanks. We'll look again" : "Got it"),
    onSuccess: () => setAppealing(false),
  });

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: S.gutter, paddingTop: insets.top + 70, gap: S.md }}>
        <Skeleton height={60} />
        <Skeleton height={160} radius={R.lg} />
        <Skeleton height={140} radius={R.lg} />
        <TopBar />
      </View>
    );
  }
  if (!review) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 80 }}>
        <EmptyState title="Nothing to check" body="This run counts in full." action="Back" onAction={() => (router.canGoBack() ? router.back() : router.replace("/outside/arena"))} />
        <TopBar />
      </View>
    );
  }

  const st = STATUS[review.status] || STATUS.open;
  const open = review.status === "open";
  const cleared = review.status === "cleared";
  const hoursLeft = Math.max(1, Math.round((review.decideBy - Date.now()) / 3_600_000));
  const [top, bottom] = cleared ? ["This run", "counts"] : ["We're checking", "this run"];
  const body = cleared
    ? "All of it counts and any held XP is back."
    : review.status === "appealed"
      ? `Your appeal is in. We decide within ${hoursLeft} hours and your battle carries on.`
      : review.status === "accepted"
        ? `${km(review.flaggedM)} km is left out. The rest counts.`
        : `${review.heldXp ? `${review.heldXp} XP is held. ` : ""}We decide within ${hoursLeft} hours and your battle carries on.`;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 + insets.bottom }}>
        {/* .r10b: the nav row, then the headline under it */}
        <View style={[styles.head, { paddingTop: insets.top + 8 + 38 + 14 }]}>
          <Text style={styles.kick}>Fair play</Text>
          <Text style={styles.h1}>{top}</Text>
          <Text style={[styles.h1, { color: "#4b93ff" }]}>{bottom}</Text>
        </View>
        <View style={{ paddingHorizontal: 18, gap: 12, marginTop: 12 }}>
          <ReviewMap route={review.route} fast={review.fastStretches} label={review.fastKmh && !cleared ? `${km(review.flaggedM)} km at ${review.fastKmh} km/h` : null} />
          <LitCard style={styles.card}>
            {review.checks.map((c) => (
              <Row key={c.key} gap={11} style={{ alignItems: "flex-start" }}>
                <View style={[styles.mark, { backgroundColor: c.ok ? "rgba(79,155,255,0.16)" : "rgba(255,77,85,0.16)" }]}>{c.ok ? <Check size={13} color="#82b4ff" strokeWidth={2.6} /> : <X size={12} color="#ff6a70" strokeWidth={2.4} />}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkTitle}>{c.label}</Text>
                  {c.detail ? <Text style={styles.small}>{c.detail}</Text> : null}
                </View>
              </Row>
            ))}
          </LitCard>
          {/* .r11held: lit blue */}
          <LitCard style={styles.held}>
            <LinearGradient colors={["rgba(79,155,255,0.12)", "rgba(79,155,255,0.04)"]} style={StyleSheet.absoluteFill} />
            <Text style={styles.countTitle}>{cleared ? `All ${km(review.distanceM)} km count` : `${km(review.countedM)} of ${km(review.distanceM)} km count`}</Text>
            <Text style={styles.heldBody}>{body}</Text>
            {review.appealNote ? <Text style={[styles.small, { marginTop: S.sm, fontStyle: "italic" }]}>You said: “{review.appealNote}”</Text> : null}
          </LitCard>
        </View>
      </ScrollView>
      <BottomBar>
        {open ? (
          <ButtonPair secondary={{ title: "That's wrong", onPress: () => setAppealing(true) }} primary={{ title: "OK", loading: answer.isPending && !appealing, onPress: () => answer.mutate([review.runId, true]) }} />
        ) : (
          <Button title="Done" size="lg" full variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace("/outside/arena"))} />
        )}
      </BottomBar>
      <TopBar
        right={
          <View style={[styles.status, { borderColor: `${st.colour}88`, backgroundColor: `${st.colour}22` }]}>
            <View style={[styles.dot, { backgroundColor: st.colour }]} />
            <Text style={[styles.statusText, { color: st.colour === "#8a93a3" ? C.textSoft : st.colour }]}>{st.label}</Text>
          </View>
        }
      />
      <Sheet visible={appealing} onClose={() => setAppealing(false)}>
        <Text style={styles.sheetTitle}>What happened?</Text>
        <Text style={[styles.small, { marginBottom: S.md }]}>A person reads every appeal. A line helps, like "steep downhill" or "GPS lost me in the tunnel".</Text>
        <TextInput value={note} onChangeText={setNote} placeholder="Optional" placeholderTextColor={C.textMute} multiline maxLength={280} style={styles.input} accessibilityLabel="Why it's wrong" />
        <Button title="Send appeal" size="lg" full loading={answer.isPending} onPress={() => answer.mutate([review.runId, false, note])} style={{ marginTop: S.md }} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 18 },
  kick: { color: C.accent, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },
  h1: { color: "#fff", fontFamily: F.display, fontSize: 36, lineHeight: 33, textTransform: "uppercase" },
  map: { height: 150, borderRadius: 20, overflow: "hidden", backgroundColor: "#05080e" },
  // .r11rvmap .lb
  mapTag: { position: "absolute", right: 10, bottom: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: "rgba(255,77,85,0.85)", justifyContent: "center", boxShadow: "0 6px 18px -6px rgba(255,77,85,0.8)" },
  mapTagText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 11 },
  // .r11safe
  card: { padding: 16, gap: 11 },
  held: { padding: 16 },
  mark: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  checkTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 13, marginTop: 2 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 11, marginTop: 2, lineHeight: 15 },
  countTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  heldBody: { color: C.textSoft, fontFamily: F.body, fontSize: 11.5, lineHeight: 17, marginTop: 4 },
  status: { flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 12, borderRadius: R.full, borderWidth: 1 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontFamily: F.bodySemi, fontSize: 12.5 },
  sheetTitle: { color: C.text, fontFamily: F.display, fontSize: 24, marginBottom: S.sm },
  input: { minHeight: 90, borderRadius: R.md, backgroundColor: C.surfaceHigh, color: C.text, padding: S.md, fontFamily: F.body, fontSize: 15, textAlignVertical: "top" },
});
