// Your emotes: the collection, what unlocks the rest, and the tray of five
// you can send in battles and stories. A new one arrives full screen with
// "Add to my tray". Emotes are earned by wins, streaks, each season's drop
// and derby wins for your club; Black members get their own.

import React, { useEffect, useMemo, useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn as FadeInAnim, ZoomIn } from "react-native-reanimated";
import { ChevronLeft, Swords, Trophy } from "lucide-react-native";
import { engine, useEmotes, useEngineMutation } from "@/data/hooks";
import { AnimatedBar, Body, Button, C, Card, F, FadeIn, IconButton, Kicker, PressableScale, R, Row, S, Screen, SectionHeader, Sheet, Skeleton } from "@/components/ui";
import { EmoteTile, IconWell } from "@/components/profile/parts";
import { EMOTE_BY_ID, TRAY_SIZE, emoteLine } from "@/constants/emotes";

export default function Emotes() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { data, isPending, refetch, isRefetching } = useEmotes();
  const [open, setOpen] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const setTray = useEngineMutation(engine.setEmoteTray);
  const seen = useEngineMutation(engine.markEmoteSeen, { silent: true });

  // A fresh emote: the one in the link, or the first you haven't looked at.
  const fresh = useMemo(() => {
    if (!data || dismissed) return null;
    const asked = typeof params.new === "string" ? params.new : null;
    const id = asked && data.items.find((e) => e.id === asked && e.owned) ? asked : data.unseen.find((u) => EMOTE_BY_ID[u]?.source !== "starter");
    return id ? data.items.find((e) => e.id === id) : null;
  }, [data, params.new, dismissed]);

  const tray = data?.tray || [];
  const addToTray = (id, after) => {
    const next = tray.includes(id) ? tray : [id, ...tray].slice(0, TRAY_SIZE);
    setTray.mutate([next], { onSuccess: after });
  };
  const removeFromTray = (id) => setTray.mutate([tray.filter((t) => t !== id)]);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"));
  const rows = [];
  for (let i = 0; i < (data?.items.length || 0); i += 4) rows.push(data.items.slice(i, i + 4));

  return (
    <Screen padded={false} style={{ paddingTop: 0 }} onRefresh={refetch} refreshing={isRefetching}>
      <View style={{ paddingTop: insets.top + S.sm, paddingHorizontal: S.gutter }}>
        <Row style={{ justifyContent: "space-between" }}>
          <IconButton icon={ChevronLeft} onPress={back} label="Back" />
          {data ? (
            <Row gap={6} style={styles.count}>
              <Trophy size={14} color={C.accentHi} />
              <Text style={styles.countText}>
                {data.ownedCount} of {data.total}
              </Text>
            </Row>
          ) : null}
        </Row>
        <Kicker style={{ marginTop: S.lg }}>Your collection</Kicker>
        <Text style={styles.h}>Emotes</Text>
        <Text style={[styles.h, { color: C.accent }]}>you've earned</Text>
      </View>

      <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg, gap: S.md }}>
        {isPending || !data ? (
          <Skeleton height={260} radius={R.lg} />
        ) : (
          rows.map((row, ri) => (
            <FadeIn key={ri} index={ri}>
              <Row gap={S.sm} style={{ alignItems: "flex-start" }}>
                {row.map((e) => (
                  <PressableScale key={e.id} onPress={() => setOpen(e)} scaleTo={0.94} style={{ flex: 1, alignItems: "center" }} accessibilityLabel={`${e.label}. ${e.owned ? "Owned" : e.how}`}>
                    <EmoteTile id={e.id} size={72} locked={!e.owned} glow={e.inTray} />
                    <Text style={styles.label} numberOfLines={2}>
                      {e.label}
                    </Text>
                    <Text style={styles.sub} numberOfLines={2}>
                      {e.owned ? (e.inTray ? "In your tray" : "Owned") : e.how}
                    </Text>
                  </PressableScale>
                ))}
                {row.length < 4 ? Array.from({ length: 4 - row.length }).map((_, k) => <View key={k} style={{ flex: 1 }} />) : null}
              </Row>
            </FadeIn>
          ))
        )}

        {data?.next ? (
          <FadeIn index={3}>
            <Card padding={S.md}>
              <Row gap={S.md}>
                <IconWell icon={Swords} size={46} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Next: {data.next.label}</Text>
                  <Text style={styles.cardSub}>
                    {data.next.how} · {Math.min(data.next.value, data.next.target)} of {data.next.target}
                  </Text>
                  <AnimatedBar value={data.next.progress} height={6} colour={C.accent} track={C.surfaceHigh} style={{ marginTop: S.sm, width: "80%" }} />
                </View>
              </Row>
            </Card>
          </FadeIn>
        ) : null}

        {data ? (
          <View>
            <SectionHeader title="Your tray" action={`${tray.length} of ${TRAY_SIZE}`} />
            <Card padding={S.md}>
              <Row gap={S.sm} style={{ justifyContent: "space-between" }}>
                {Array.from({ length: TRAY_SIZE }).map((_, i) =>
                  tray[i] ? (
                    <PressableScale key={tray[i]} onPress={() => setOpen(data.items.find((e) => e.id === tray[i]))} scaleTo={0.92} accessibilityLabel={EMOTE_BY_ID[tray[i]]?.label}>
                      <EmoteTile id={tray[i]} size={52} />
                    </PressableScale>
                  ) : (
                    <View key={`empty${i}`} style={styles.slot} />
                  ),
                )}
              </Row>
              <Body dim size={12.5} style={{ marginTop: S.sm }}>
                These are the five you can send in battles and on stories. Tap any emote to swap it in.
              </Body>
            </Card>
          </View>
        ) : null}
      </View>

      <Sheet visible={!!open && !fresh} onClose={() => setOpen(null)}>
        {open ? (
          <View style={{ alignItems: "center" }}>
            <EmoteTile id={open.id} size={120} locked={!open.owned} glow={open.owned} />
            <Text style={styles.sheetName}>{open.label}</Text>
            <Body dim size={14} style={{ textAlign: "center" }}>
              {open.owned ? emoteLine(EMOTE_BY_ID[open.id]) : open.how}
              {open.rarity ? ` ${open.rarity} runners has this one.` : ""}
            </Body>
            {!open.owned && open.target ? (
              <View style={{ alignSelf: "stretch", marginTop: S.lg }}>
                <AnimatedBar value={open.progress} height={8} colour={C.accent} track={C.surfaceHigh} />
                <Text style={[styles.cardSub, { marginTop: 6 }]}>
                  {Math.min(open.value, open.target)} of {open.target}
                </Text>
              </View>
            ) : null}
            {open.owned ? (
              (data?.tray || []).includes(open.id) ? (
                <Button title="Take out of my tray" variant="secondary" full style={{ marginTop: S.lg }} loading={setTray.isPending} onPress={() => (removeFromTray(open.id), setOpen(null))} />
              ) : (
                <Button title="Add to my tray" full style={{ marginTop: S.lg }} loading={setTray.isPending} onPress={() => addToTray(open.id, () => setOpen(null))} />
              )
            ) : null}
          </View>
        ) : null}
      </Sheet>

      <Modal visible={!!fresh} transparent animationType="fade" onRequestClose={() => setDismissed(true)}>
        {fresh ? (
          <EmoteDrop
            emote={fresh}
            busy={setTray.isPending}
            onLater={() => {
              seen.mutate(fresh.id);
              setDismissed(true);
            }}
            onAdd={() => addToTray(fresh.id, () => setDismissed(true))}
          />
        ) : null}
      </Modal>
    </Screen>
  );
}

const RAYS = Array.from({ length: 18 }, (_, i) => i * 20);

function EmoteDrop({ emote, onLater, onAdd, busy }) {
  const insets = useSafeAreaInsets();
  const e = EMOTE_BY_ID[emote.id];
  return (
    <View style={[styles.drop, { paddingTop: insets.top + S.lg, paddingBottom: insets.bottom + S.lg }]}>
      <Animated.View entering={FadeInAnim.duration(600)} style={styles.rays} pointerEvents="none">
        {RAYS.map((deg) => (
          <View key={deg} style={[styles.ray, { transform: [{ rotate: `${deg}deg` }] }]}>
            <LinearGradient colors={["rgba(61,139,255,0)", "rgba(61,139,255,0.35)", "rgba(61,139,255,0)"]} style={{ flex: 1 }} />
          </View>
        ))}
        <View style={styles.halo} />
      </Animated.View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Kicker colour={C.accentHi}>New emote</Kicker>
        <Animated.View entering={ZoomIn.duration(500).springify().damping(12)} style={{ marginTop: S.md }}>
          <EmoteTile id={emote.id} size={150} glow />
        </Animated.View>
        <Text style={styles.dropName}>{emote.label}</Text>
        <Text style={styles.dropLine}>
          {emoteLine(e)}
          {emote.rarity ? ` Only ${emote.rarity} runners has this one.` : ""}
        </Text>
      </View>
      <View style={styles.ways}>
        {[
          ["Win", "Streaks and seasons"],
          ["Drop", "Each season's set"],
          ["Club", "Derby winners"],
        ].map(([t, b], i) => (
          <View key={t} style={[styles.way, i > 0 && styles.wayLine]}>
            <Text style={styles.wayTitle}>{t}</Text>
            <Text style={styles.waySub}>{b}</Text>
          </View>
        ))}
      </View>
      <Row gap={S.sm} style={{ marginTop: S.md }}>
        <View style={{ flex: 1 }}>
          <Button title="Later" variant="secondary" size="lg" full onPress={onLater} />
        </View>
        <View style={{ flex: 1.4 }}>
          <Button title="Add to my tray" size="lg" full loading={busy} onPress={onAdd} />
        </View>
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  count: { height: 34, paddingHorizontal: 12, borderRadius: R.full, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  countText: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  h: { color: C.text, fontFamily: F.display, fontSize: 46, lineHeight: 48, textTransform: "uppercase" },
  label: { color: C.text, fontFamily: F.bodySemi, fontSize: 13, marginTop: 8, textAlign: "center" },
  sub: { color: C.textDim, fontFamily: F.body, fontSize: 11.5, marginTop: 2, textAlign: "center" },
  cardTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  cardSub: { color: C.textDim, fontFamily: F.body, fontSize: 12.5, marginTop: 2 },
  slot: { width: 52, height: 52, borderRadius: 16, borderWidth: 1, borderStyle: "dashed", borderColor: C.borderStrong },
  sheetName: { color: C.text, fontFamily: F.display, fontSize: 34, textTransform: "uppercase", marginTop: S.md },
  drop: { flex: 1, backgroundColor: "rgba(5,7,10,0.97)", paddingHorizontal: S.gutter },
  rays: { position: "absolute", top: "12%", left: 0, right: 0, height: 520, alignItems: "center", justifyContent: "center" },
  ray: { position: "absolute", width: 26, height: 620 },
  halo: { width: 280, height: 280, borderRadius: 140, borderWidth: 1, borderColor: "rgba(130,180,255,0.35)", backgroundColor: "rgba(20,40,80,0.35)", shadowColor: C.accent, shadowOpacity: 0.8, shadowRadius: 50, shadowOffset: { width: 0, height: 0 } },
  dropName: { color: C.text, fontFamily: F.display, fontSize: 52, textTransform: "uppercase", marginTop: S.lg },
  dropLine: { color: C.textSoft, fontFamily: F.body, fontSize: 14.5, lineHeight: 21, textAlign: "center", maxWidth: 300, marginTop: 4 },
  ways: { flexDirection: "row", backgroundColor: C.surface, borderRadius: R.md, paddingVertical: S.md, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  way: { flex: 1, alignItems: "center" },
  wayLine: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: C.border },
  wayTitle: { color: C.accentHi, fontFamily: F.display, fontSize: 18 },
  waySub: { color: C.textDim, fontFamily: F.body, fontSize: 11, marginTop: 2 },
});
