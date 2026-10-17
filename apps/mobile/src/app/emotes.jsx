// Your emotes: the collection, what unlocks the rest, and the tray of five
// you can send in battles and stories. A new one arrives full screen with
// "Add to my tray". Emotes are earned by wins, streaks, each season's drop
// and derby wins for your club; Black members get their own.
//
// The prototype's .r10grid: lit tiles with the art's black dropped out
// (BlendImage), the rare ones edged in blue, locked ones dimmed; the next
// one to unlock as a nudge card; the drop (.r11drop) over turning rays.

import React, { useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn as FadeInAnim, FadeInDown, ZoomIn } from "react-native-reanimated";
import { Flame, ShoppingBag, Swords, Trophy } from "@/components/ui/icons";
import { engine, useEmotes, useEngineMutation } from "@/data/hooks";
import { C, F, GlowBackdrop, GlowButton, IconTile, Meter, PressableScale, R, Row, S, Sheet, Skeleton, Surface, TAB_BAR } from "@/components/ui";
import { StackTabBar } from "@/components/AppTabBar";
import { Chip, EmoteTile, Facts, Headline, NavRow, TurningRays } from "@/components/arena/BattleKit";
import { EMOTE_BY_ID, TRAY_SIZE, emoteLine } from "@/constants/emotes";

export default function Emotes() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { data, isPending } = useEmotes();
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
    <View style={styles.screen}>
      <GlowBackdrop preset="screen" style={StyleSheet.absoluteFill} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.gutter, paddingBottom: insets.bottom + TAB_BAR.height + 60 }}>
        <NavRow onBack={back} right={data ? <Chip icon={Trophy} label={`${data.ownedCount} of ${data.total}`} /> : null} />
        <Animated.View entering={FadeInDown.duration(450)} style={{ marginTop: S.xl }}>
          <Headline kick="Your collection" top="Emotes" bottom="you've earned" size={46} />
        </Animated.View>

        <View style={{ marginTop: S.lg, gap: S.lg }}>
          {isPending || !data ? (
            <Skeleton height={260} radius={R.lg} />
          ) : (
            rows.map((row, ri) => (
              <Animated.View key={ri} entering={FadeInDown.delay(80 + ri * 90).duration(450)}>
                <Row gap={10} style={{ alignItems: "flex-start" }}>
                  {row.map((e) => (
                    <PressableScale key={e.id} onPress={() => setOpen(e)} scaleTo={0.94} style={{ flex: 1, alignItems: "center" }} accessibilityLabel={`${e.label}. ${e.owned ? "Owned" : e.how}`}>
                      <EmoteTile id={e.id} size={82} radius={24} locked={!e.owned} glow={e.inTray} />
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
              </Animated.View>
            ))
          )}

          {data?.next ? (
            <Animated.View entering={FadeInDown.delay(300).duration(450)}>
              <Surface padding={S.md} onPress={() => setOpen(data.items.find((e) => e.id === data.next.id) || null)} contentStyle={styles.next}>
                <IconTile icon={{ streak: Flame, drop: ShoppingBag, club: Trophy }[data.next.source] || Swords} size={46} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Next: {data.next.label}</Text>
                  <Text style={styles.cardSub}>
                    {data.next.how} · {Math.min(data.next.value, data.next.target)} of {data.next.target}
                  </Text>
                  <Meter value={data.next.progress} size="md" style={{ marginTop: S.sm, width: "86%" }} />
                </View>
              </Surface>
            </Animated.View>
          ) : null}

          {data ? (
            <Surface padding={S.md}>
              <Row style={{ justifyContent: "space-between", marginBottom: S.md }}>
                <Text style={styles.cardTitle}>Your tray</Text>
                <Text style={styles.cardSub}>
                  {tray.length} of {TRAY_SIZE}
                </Text>
              </Row>
              <Row gap={S.sm} style={{ justifyContent: "space-between" }}>
                {Array.from({ length: TRAY_SIZE }).map((_, i) =>
                  tray[i] ? (
                    <EmoteTile key={tray[i]} id={tray[i]} size={54} radius={17} onPress={() => setOpen(data.items.find((e) => e.id === tray[i]))} accessibilityLabel={EMOTE_BY_ID[tray[i]]?.label} />
                  ) : (
                    <View key={`empty${i}`} style={styles.slot} />
                  ),
                )}
              </Row>
              <Text style={[styles.cardSub, { marginTop: S.md }]}>These are the five you can send in battles and on stories. Tap any emote to swap it in.</Text>
            </Surface>
          ) : null}
        </View>
      </ScrollView>

      <Sheet visible={!!open && !fresh} onClose={() => setOpen(null)}>
        {open ? (
          <View style={{ alignItems: "center" }}>
            <EmoteTile id={open.id} size={128} radius={38} locked={!open.owned} glow={open.owned} />
            <Text style={styles.sheetName}>{open.label}</Text>
            <Text style={styles.sheetLine}>
              {open.owned ? emoteLine(EMOTE_BY_ID[open.id]) : open.how}
              {open.rarity ? ` ${open.rarity} runners has this one.` : ""}
            </Text>
            {!open.owned && open.target ? (
              <View style={{ alignSelf: "stretch", marginTop: S.lg }}>
                <Meter value={open.progress} size="lg" />
                <Text style={[styles.cardSub, { marginTop: 6 }]}>
                  {Math.min(open.value, open.target)} of {open.target}
                </Text>
              </View>
            ) : null}
            {open.owned ? (
              (data?.tray || []).includes(open.id) ? (
                <GlowButton title="Take out of my tray" variant="quiet" full style={{ marginTop: S.lg }} loading={setTray.isPending} onPress={() => (removeFromTray(open.id), setOpen(null))} />
              ) : (
                <GlowButton title="Add to my tray" full style={{ marginTop: S.lg }} loading={setTray.isPending} onPress={() => addToTray(open.id, () => setOpen(null))} />
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
      <StackTabBar current="profile" />
    </View>
  );
}

function EmoteDrop({ emote, onLater, onAdd, busy }) {
  const insets = useSafeAreaInsets();
  const e = EMOTE_BY_ID[emote.id];
  return (
    <View style={[styles.drop, { paddingTop: insets.top + S.lg, paddingBottom: insets.bottom + S.lg }]}>
      <Animated.View entering={FadeInAnim.duration(700)} style={styles.rays} pointerEvents="none">
        <TurningRays size={900} count={20} duty={0.34} colour="rgba(79,155,255,0.3)" period={30000} />
        <GlowBackdrop preset="orb" breathe style={styles.orb} />
      </Animated.View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={styles.dropKick}>New emote</Text>
        <Animated.View entering={ZoomIn.duration(500).springify().damping(12)} style={{ marginTop: S.md }}>
          <EmoteTile id={emote.id} size={172} radius={50} glow />
        </Animated.View>
        <Text style={styles.dropName}>{emote.label}</Text>
        <Text style={styles.dropLine}>
          {emoteLine(e)}
          {emote.rarity ? ` Only ${emote.rarity} runners has this one.` : ""}
        </Text>
      </View>
      <Surface padding={S.md}>
        <Facts
          size={18}
          items={[
            { value: "Win", label: "Streaks and seasons", colour: C.accentHi },
            { value: "Drop", label: "Each season's set", colour: C.accentHi },
            { value: "Club", label: "Derby winners", colour: C.accentHi },
          ]}
        />
      </Surface>
      <Row gap={S.sm} style={{ marginTop: S.md }}>
        <GlowButton title="Later" variant="quiet" size="lg" onPress={onLater} style={{ flex: 1 }} />
        <GlowButton title="Add to my tray" size="lg" loading={busy} onPress={onAdd} style={{ flex: 1.5 }} />
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  label: { color: C.text, fontFamily: F.bodySemi, fontSize: 13, marginTop: 9, textAlign: "center" },
  sub: { color: C.textDim, fontFamily: F.body, fontSize: 11.5, marginTop: 2, textAlign: "center" },
  next: { flexDirection: "row", alignItems: "center", gap: S.md },
  cardTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  cardSub: { color: C.textDim, fontFamily: F.body, fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  slot: { width: 54, height: 54, borderRadius: 17, borderWidth: 1, borderStyle: "dashed", borderColor: C.borderStrong },
  sheetName: { color: C.text, fontFamily: F.display, fontSize: 34, textTransform: "uppercase", marginTop: S.md },
  sheetLine: { color: C.textDim, fontFamily: F.body, fontSize: 14, lineHeight: 20, textAlign: "center" },
  drop: { flex: 1, backgroundColor: "rgba(4,6,10,0.98)", paddingHorizontal: S.gutter, overflow: "hidden" },
  rays: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center", marginTop: -170 },
  orb: { position: "absolute", width: 420, height: 420 },
  dropKick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 12, letterSpacing: 2, textTransform: "uppercase" },
  dropName: { color: C.text, fontFamily: F.display, fontSize: 60, lineHeight: 62, textTransform: "uppercase", marginTop: S.lg, textShadowColor: "rgba(61,139,255,0.45)", textShadowRadius: 24, textShadowOffset: { width: 0, height: 0 } },
  dropLine: { color: C.textSoft, fontFamily: F.body, fontSize: 15, lineHeight: 22, textAlign: "center", maxWidth: 310, marginTop: 6 },
});
