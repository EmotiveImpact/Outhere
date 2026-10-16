// Run saved: a finisher medal for every run. The route and numbers on one
// card, then what you earned and how it felt. The run saves itself as soon as
// this opens; Share to club opens the share card.

import React, { useEffect, useRef, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Share2, X } from "lucide-react-native";
import { C, CountUp, F, FadeIn, GlowButton, ModalToastHost, Title } from "@/components/ui";
import { engine, useEngineMutation, useProfile } from "@/data/hooks";
import { stepsFor } from "@/data/runMath";
import { formatDuration, formatPace } from "@/utils/format";
import { MOVE_SESSION_PHASE, useMoveStore } from "@/store/useMoveStore";
import { PHOTOS } from "@/constants/photos";
import { activityFor, paceFor, rewardsFor } from "./geo";
import { RoundGlass } from "./parts";
import { MapArt } from "./MapTexture";
import { EarnChips, FeelSlider, Slab } from "./RunBits";

const MIN_SAVE_KM = 0.01;

const headline = (km) => (km >= 10 ? ["Monster", "session"] : km >= 5 ? ["You", "smashed it"] : km >= 1 ? ["Nice", "one"] : ["Every step", "counts"]);

export default function RunSummary({ onDone }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
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
            objectSize={214}
            objectStyle={{ right: -46, top: 6 }}
            height={268}
            size={48}
            kicker={tooShort ? `${activity.label} too short` : saved ? `${activity.label} saved${streak > 1 ? ` · ${streak} day streak` : ""}` : failed ? "Not saved yet" : `Saving your ${activity.noun}`}
            top={tooShort ? "Not quite" : l1}
            bottom={tooShort ? "enough" : l2}
            left={<RoundGlass icon={X} label="Close" onPress={saved || tooShort ? done : discard} />}
            right={saved ? <RoundGlass icon={Share2} label="Share your run" onPress={share} /> : null}
          />
          <View style={styles.body}>
            <FadeIn>
              <View style={styles.mapcard}>
                {finished.route?.length > 1 ? (
                  <MapArt width={width - 36} height={128} lines={[{ path: finished.route, width: 6 }]} pad={{ top: 10, right: 24, bottom: 30, left: 24 }} shade={false} style={StyleSheet.absoluteFill} />
                ) : (
                  <MapArt width={width - 36} height={128} lines={[]} style={StyleSheet.absoluteFill} />
                )}
                <LinearGradient colors={["rgba(2,6,14,0)", "rgba(2,6,14,0.9)"]} style={styles.ovShade} pointerEvents="none" />
                <View style={styles.ov}>
                  {[
                    // the distance counts up from nought when the summary opens
                    [<CountUp value={Math.round(finished.distanceKm * 100)} duration={1400} delay={200} format={(v) => (v / 100).toFixed(2)} size={24} lineHeight={23} mono colour="#fff" style={{ marginBottom: 2 }} />, "km"],
                    [formatDuration(finished.durationSec), "Time"],
                    [formatPace(pace), "Pace"],
                  ].map(([v, l]) => (
                    <View key={l} style={{ flex: 1 }}>
                      {typeof v === "string" ? <Text style={styles.ovValue}>{v}</Text> : v}
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

        <LinearGradient colors={["rgba(7,9,12,0)", "rgba(7,9,12,0.94)"]} locations={[0, 0.35]} pointerEvents="box-none" style={[styles.foot, { paddingBottom: Math.max(30, insets.bottom + 14) }]}>
          {tooShort ? (
            <GlowButton title="Close" variant="quiet" onPress={done} style={{ flex: 1 }} />
          ) : failed ? (
            <>
              <GlowButton title="Discard" variant="quiet" onPress={discard} style={{ flex: 1 }} />
              <GlowButton title="Try again" onPress={doSave} loading={save.isPending} style={{ flex: 1.6 }} />
            </>
          ) : (
            <>
              <GlowButton title="Done" variant="quiet" onPress={done} disabled={!saved} style={{ flex: 1 }} />
              <GlowButton title="Share to club" icon={Share2} onPress={share} disabled={!saved} loading={save.isPending} style={{ flex: 1.6 }} />
            </>
          )}
        </LinearGradient>
      </View>
      {visible ? <ModalToastHost /> : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  // .body.nt, 12 apart
  body: { paddingHorizontal: 18, paddingTop: 16, gap: 12 },
  // .mapcard: the route on the night map, the numbers over its foot
  mapcard: { height: 128, borderRadius: 22, overflow: "hidden", backgroundColor: "#05080e", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 30px -18px rgba(0,0,0,0.85)" },
  ovShade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 70 },
  ov: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12 },
  ovValue: { color: "#fff", fontFamily: F.display, fontSize: 24, lineHeight: 23, marginBottom: 2, fontVariant: ["tabular-nums"] },
  ovLabel: { color: "#b4bfd0", fontFamily: F.body, fontSize: 10.5 },
  copy: { color: C.textDim, fontFamily: F.body, fontSize: 13, lineHeight: 19, marginTop: 4 },
  foot: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 8, paddingHorizontal: 18, paddingTop: 24 },
});
