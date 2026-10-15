// Fair play: when part of a run looks like a bus or a bike, only that part is
// held. You see exactly why (the red stretch on the map, the three checks)
// and can say it's wrong. The server decides within 24 hours.

import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { Check, X } from "lucide-react-native";
import { engine, useEngineMutation, useRunReview } from "@/data/hooks";
import { C, EmptyState, F, R, Row, S, Sheet, Skeleton, Button } from "@/components/ui";
import { BottomBar, ButtonPair, GlowHero, TopBar } from "@/components/arena/OutsideKit";

const km = (m) => (Math.round((m || 0) / 100) / 10).toFixed(1);
const STATUS = {
  open: { label: "Under review", colour: "#ff4d55" },
  appealed: { label: "Appeal in", colour: "#ffb547" },
  accepted: { label: "Held", colour: "#8a93a3" },
  cleared: { label: "Cleared", colour: "#3d8bff" },
  upheld: { label: "Held", colour: "#8a93a3" },
};

function ReviewMap({ route, fast, label }) {
  const [w, setW] = useState(0);
  const h = 160;
  const geo = useMemo(() => {
    const pts = (route || []).map((p) => (Array.isArray(p) ? { lat: p[0], lng: p[1] } : { lat: p.latitude ?? p.lat, lng: p.longitude ?? p.lng })).filter((p) => p.lat != null);
    if (pts.length < 2 || !w) return null;
    const pad = 16;
    const k = Math.cos((pts[0].lat * Math.PI) / 180);
    const xs = pts.map((p) => p.lng * k);
    const ys = pts.map((p) => -p.lat);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const sx = Math.max(...xs) - minX || 1e-6;
    const sy = Math.max(...ys) - minY || 1e-6;
    const sc = Math.min((w - pad * 2) / sx, (h - pad * 2) / sy);
    const ox = (w - sx * sc) / 2;
    const oy = (h - sy * sc) / 2;
    const xy = xs.map((x, i) => [ox + (x - minX) * sc, oy + (ys[i] - minY) * sc]);
    const fastSet = new Set(fast || []);
    const all = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    const red = xy
      .map(([x, y], i) => (i > 0 && fastSet.has(i) ? `M${xy[i - 1][0].toFixed(1)} ${xy[i - 1][1].toFixed(1)} L${x.toFixed(1)} ${y.toFixed(1)}` : ""))
      .join(" ");
    return { all, red, end: xy[xy.length - 1] };
  }, [route, fast, w]);
  return (
    <View style={styles.map} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {geo ? (
        <Svg width={w} height={h}>
          <Path d={geo.all} stroke="#3d8bff" strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {geo.red ? <Path d={geo.red} stroke="#ff4d55" strokeWidth={4} fill="none" strokeLinecap="round" /> : null}
          <Circle cx={geo.end[0]} cy={geo.end[1]} r={5} fill="#fff" stroke={C.bg} strokeWidth={2} />
        </Svg>
      ) : null}
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
        <GlowHero height={130} kicker="Fair play" top={top} bottom={bottom} />
        <View style={{ paddingHorizontal: S.gutter, gap: S.md, marginTop: S.md }}>
          <ReviewMap route={review.route} fast={review.fastStretches} label={review.fastKmh && !cleared ? `${km(review.flaggedM)} km at ${review.fastKmh} km/h` : null} />
          <View style={styles.card}>
            {review.checks.map((c, i) => (
              <Row key={c.key} gap={S.md} style={[{ alignItems: "flex-start", paddingVertical: 8 }, i > 0 && styles.line]}>
                <View style={[styles.mark, { backgroundColor: c.ok ? "rgba(61,139,255,0.18)" : "rgba(255,77,85,0.18)" }]}>{c.ok ? <Check size={13} color={C.accent} strokeWidth={3} /> : <X size={13} color={C.danger} strokeWidth={3} />}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkTitle}>{c.label}</Text>
                  {c.detail ? <Text style={styles.small}>{c.detail}</Text> : null}
                </View>
              </Row>
            ))}
          </View>
          <View style={styles.card}>
            <Text style={styles.countTitle}>{cleared ? `All ${km(review.distanceM)} km count` : `${km(review.countedM)} of ${km(review.distanceM)} km count`}</Text>
            <Text style={[styles.small, { marginTop: 4, lineHeight: 18 }]}>{body}</Text>
            {review.appealNote ? <Text style={[styles.small, { marginTop: S.sm, fontStyle: "italic" }]}>You said: “{review.appealNote}”</Text> : null}
          </View>
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
  map: { height: 160, borderRadius: R.lg, overflow: "hidden", backgroundColor: "#0e131b" },
  mapTag: { position: "absolute", right: 10, bottom: 10, paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: "#e5484d", justifyContent: "center" },
  mapTagText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 12 },
  card: { padding: S.lg, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.1)" },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  mark: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  countTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 16 },
  status: { flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 12, borderRadius: R.full, borderWidth: 1 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontFamily: F.bodySemi, fontSize: 13 },
  sheetTitle: { color: C.text, fontFamily: F.display, fontSize: 24, marginBottom: S.sm },
  input: { minHeight: 90, borderRadius: R.md, backgroundColor: C.surfaceHigh, color: C.text, padding: S.md, fontFamily: F.body, fontSize: 15, textAlignVertical: "top" },
});
