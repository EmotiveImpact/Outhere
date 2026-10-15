// Run saved: a finisher medal for every run. The route and numbers on one
// card, then what you earned and how it felt. The run saves itself as soon as
// this opens; Share to club opens the share card.

import React, { useEffect, useRef, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Share2, X } from "lucide-react-native";
import { Button, C, F, FadeIn, ModalToastHost, S, Title } from "@/components/ui";
import { engine, useEngineMutation, useProfile } from "@/data/hooks";
import { stepsFor } from "@/data/runMath";
import { formatDuration, formatPace } from "@/utils/format";
import { MOVE_SESSION_PHASE, useMoveStore } from "@/store/useMoveStore";
import { PHOTOS } from "@/constants/photos";
import { activityFor, paceFor, rewardsFor } from "./geo";
import { RoundGlass } from "./parts";
import RoutePreview from "./RoutePreview";
import { EarnChips, FeelSlider, Slab } from "./RunBits";

const MIN_SAVE_KM = 0.01;

const headline = (km) => (km >= 10 ? ["Monster", "session"] : km >= 5 ? ["You", "smashed it"] : km >= 1 ? ["Nice", "one"] : ["Every step", "counts"]);

export default function RunSummary({ onDone }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const phase = useMoveStore((s) => s.sessionPhase);
  const finished = useMoveStore((s) => s.finished);
  const reset = useMoveStore((s) => s.reset);
  const { data: profile } = useProfile();
  const [saved, setSaved] = useState(null);
  const [failed, setFailed] = useState(null);
  const [feel, setFeel] = useState(null);
  const tried = useRef(null);

  const visible = phase === MOVE_SESSION_PHASE.SUMMARY && !!finished;
  const tooShort = !finished || finished.distanceKm < MIN_SAVE_KM;

  const save = useEngineMutation(engine.saveRun, {
    silent: true,
    onSuccess: (run) => {
      setSaved(run);
      setFailed(null);
    },
    onError: (e) => setFailed(e?.message || "We couldn't save that run."),
  });
  const rate = useEngineMutation(engine.rateRun, { silent: true });

  const doSave = () =>
    save.mutate({
      type: finished.type,
      title: finished.title,
      distanceKm: finished.distanceKm,
      durationSec: finished.durationSec,
      startedAt: finished.startedAt,
      endedAt: finished.endedAt,
      calories: finished.calories,
      route: finished.route,
      routeId: finished.routeId,
      steps: finished.steps || stepsFor(finished.distanceKm),
      climbM: finished.climbM,
    });

  useEffect(() => {
    if (!visible) {
      setSaved(null);
      setFailed(null);
      setFeel(null);
      return;
    }
    if (!tooShort && tried.current !== finished.startedAt) {
      tried.current = finished.startedAt;
      doSave();
    }
  }, [visible, finished?.startedAt]);

  if (!finished) return null;

  const activity = activityFor(finished.type);
  const projected = rewardsFor(finished.distanceKm, profile?.tier);
  const earned = saved?.earned || projected;
  const steps = finished.steps || stepsFor(finished.distanceKm);
  const pace = paceFor(finished.distanceKm, finished.durationSec);
  const [l1, l2] = headline(finished.distanceKm);
  const streak = profile?.streak || 0;

  const done = () => {
    reset();
    onDone?.();
  };

  const discard = () =>
    Alert.alert(`Discard this ${activity.noun}?`, "It won't be saved and you won't earn anything for it.", [
      { text: "Keep it", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: done },
    ]);

  const share = () => {
    if (!saved) return;
    const id = saved.id;
    reset();
    router.push(`/runs/share/${id}`);
  };

  const onFeel = (v) => {
    setFeel(v);
    if (saved) rate.mutate([saved.id, v]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={saved || tooShort ? done : discard} presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
          <Slab
            object={PHOTOS.medal}
            height={250}
            kicker={tooShort ? `${activity.label} too short` : saved ? `${activity.label} saved${streak > 1 ? ` · ${streak} day streak` : ""}` : failed ? "Not saved yet" : `Saving your ${activity.noun}`}
            top={tooShort ? "Not quite" : l1}
            bottom={tooShort ? "enough" : l2}
            left={<RoundGlass icon={X} label="Close" onPress={saved || tooShort ? done : discard} />}
            right={saved ? <RoundGlass icon={Share2} label="Share your run" onPress={share} /> : null}
          />
          <View style={styles.body}>
            <FadeIn>
              <View style={styles.mapcard}>
                <RoutePreview route={finished.route} height={150} radius={0} strokeWidth={5} style={{ backgroundColor: "transparent" }} />
                <View style={styles.ov}>
                  {[
                    [finished.distanceKm.toFixed(2), "km"],
                    [formatDuration(finished.durationSec), "Time"],
                    [formatPace(pace), "Pace"],
                  ].map(([v, l]) => (
                    <View key={l}>
                      <Text style={styles.ovValue}>{v}</Text>
                      <Text style={styles.ovLabel}>{l}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </FadeIn>

            {tooShort ? (
              <FadeIn index={1}>
                <Title size={17}>Not enough to save</Title>
                <Text style={styles.copy}>We barely picked up any movement. Check location is on and push a bit further next time.</Text>
              </FadeIn>
            ) : (
              <>
                <FadeIn index={1}>
                  <EarnChips xp={earned.xp} out={earned.out} steps={steps} />
                </FadeIn>
                {failed ? (
                  <FadeIn index={2}>
                    <Text style={[styles.copy, { color: C.danger }]}>{failed}</Text>
                  </FadeIn>
                ) : (
                  <FadeIn index={2}>
                    <FeelSlider value={feel} onChange={onFeel} disabled={!saved} />
                  </FadeIn>
                )}
              </>
            )}
          </View>
        </ScrollView>

        <View style={[styles.foot, { paddingBottom: insets.bottom + S.lg }]}>
          {tooShort ? (
            <Button title="Close" variant="secondary" onPress={done} full style={{ flex: 1, height: 56 }} />
          ) : failed ? (
            <>
              <Button title="Discard" variant="secondary" onPress={discard} style={{ flex: 1, height: 56 }} />
              <Button title="Try again" onPress={doSave} loading={save.isPending} style={{ flex: 1.6, height: 56 }} />
            </>
          ) : (
            <>
              <Button title="Done" variant="secondary" onPress={done} disabled={!saved} style={{ flex: 1, height: 56 }} />
              <Button title="Share to club" icon={Share2} onPress={share} disabled={!saved} loading={save.isPending} style={{ flex: 1.6, height: 56 }} />
            </>
          )}
        </View>
      </View>
      {visible ? <ModalToastHost /> : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: S.gutter, paddingTop: S.lg, gap: S.lg },
  mapcard: { borderRadius: 22, overflow: "hidden", backgroundColor: C.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  ov: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: S.lg, paddingBottom: S.md },
  ovValue: { color: C.text, fontFamily: F.display, fontSize: 30, fontVariant: ["tabular-nums"] },
  ovLabel: { color: C.textSoft, fontFamily: F.body, fontSize: 12.5 },
  copy: { color: C.textDim, fontFamily: F.body, fontSize: 14, lineHeight: 20, marginTop: 4 },
  foot: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 10, paddingHorizontal: S.lg, paddingTop: S.md, backgroundColor: "rgba(7,9,12,0.94)" },
});
