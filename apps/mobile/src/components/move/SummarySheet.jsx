// Shown when a session finishes: the big distance, a few stats, the route
// and what it earns, then save, share to a crew, or discard.

import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedNumber, Body, Button, C, Divider, F, FadeIn, Pill, R, Row, S, Title, toast, ModalToastHost } from "@/components/ui";
import { engine, useEngineMutation, useProfile } from "@/data/hooks";
import { MOVE_SESSION_PHASE, useMoveStore } from "@/store/useMoveStore";
import { activityFor, rewardsFor, runTitle } from "./geo";
import RouteHero from "./RouteHero";
import RunStatGrid from "./RunStatGrid";
import ShareToCrew from "./ShareToCrew";

const MIN_SAVE_KM = 0.01;

const headline = (km) => (km >= 10 ? "Monster session" : km >= 5 ? "Strong work" : km >= 1 ? "Nice one" : "Every step counts");

/** Counts up from zero shortly after mounting. */
function CountUp({ to, delay = 250, ...rest }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setV(to), delay);
    return () => clearTimeout(id);
  }, [to, delay]);
  return <AnimatedNumber value={v} duration={900} {...rest} />;
}

export default function SummarySheet() {
  const insets = useSafeAreaInsets();
  const phase = useMoveStore((s) => s.sessionPhase);
  const finished = useMoveStore((s) => s.finished);
  const reset = useMoveStore((s) => s.reset);
  const { data: profile } = useProfile();
  const [title, setTitle] = useState("");
  const [saved, setSaved] = useState(null);

  const visible = phase === MOVE_SESSION_PHASE.SUMMARY && !!finished;

  useEffect(() => {
    if (visible) {
      setTitle(runTitle(finished.type, finished.startedAt));
      setSaved(null);
    }
  }, [visible, finished?.startedAt]);

  const earned = rewardsFor(finished?.distanceKm, profile?.tier);
  const activity = activityFor(finished?.type);

  const save = useEngineMutation(engine.saveRun, {
    onSuccess: (run) => {
      toast.success(`${activity.label} saved`, earned.xp > 0 ? `+${earned.xp} XP${earned.out ? `, +${earned.out} OUT` : ""} in the bag` : undefined);
      setSaved(run);
    },
  });

  if (!finished) return null;

  const tooShort = finished.distanceKm < MIN_SAVE_KM;

  const discard = () =>
    Alert.alert(`Discard this ${activity.noun}?`, "It won't be saved and you won't earn anything for it.", [
      { text: "Keep it", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: reset },
    ]);

  const onSave = () =>
    save.mutate({
      type: finished.type,
      title: title.trim() || undefined,
      distanceKm: finished.distanceKm,
      durationSec: finished.durationSec,
      startedAt: finished.startedAt,
      endedAt: finished.endedAt,
      calories: finished.calories,
      route: finished.route,
    });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={saved ? reset : discard} presentationStyle="fullScreen">
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + S.xl, paddingBottom: insets.bottom + S.xxl, paddingHorizontal: S.gutter }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FadeIn>
            <Body dim size={13}>{saved ? `${activity.label} saved` : `${activity.label} complete`}</Body>
            <Title size={22} style={{ marginTop: 2 }}>
              {saved ? "Locked in" : headline(finished.distanceKm)}
            </Title>
          </FadeIn>

          <FadeIn index={1} style={styles.hero}>
            <CountUp to={finished.distanceKm} format={(v) => v.toFixed(2)} style={styles.heroKm} />
            <Body dim>Kilometres</Body>
          </FadeIn>

          <FadeIn index={2}>
            <RunStatGrid run={finished} />
          </FadeIn>

          <FadeIn index={3}>
            <RouteHero route={finished.route} height={200} style={{ marginTop: S.xxl }} />
          </FadeIn>

          {tooShort ? (
            <FadeIn index={4} style={styles.section}>
              <Title size={17}>Not enough to save</Title>
              <Body dim size={14} style={{ marginTop: 4 }}>
                We barely picked up any movement. Check location is on and push a bit further next time.
              </Body>
            </FadeIn>
          ) : (
            <FadeIn index={4} style={styles.section}>
              <Divider />
              <Row style={styles.earnRow}>
                <Body dim size={13} style={{ flex: 1 }}>
                  {saved ? "Added to your wallet" : "You'll earn"}
                </Body>
                <Row gap={4} style={{ alignItems: "baseline" }}>
                  <CountUp to={earned.xp} delay={450} format={(v) => `+${Math.round(v)}`} style={styles.earnValue} />
                  <Text style={styles.earnUnit}>XP</Text>
                </Row>
                <Row gap={4} style={{ alignItems: "baseline", marginLeft: S.xl }}>
                  <CountUp to={earned.out} delay={600} format={(v) => `+${Math.round(v)}`} style={styles.earnValue} />
                  <Text style={styles.earnUnit}>OUT</Text>
                </Row>
              </Row>
              {earned.multiplier > 1 || earned.out === 0 ? (
                <Row gap={S.sm} style={{ marginBottom: S.md, flexWrap: "wrap" }}>
                  {earned.multiplier > 1 ? <Pill tone={profile?.tier} label={`${earned.multiplier}x XP ${profile?.tier === "black" ? "Black" : "Pro"}`} /> : null}
                  {earned.out === 0 ? <Body mute size={13}>OUT lands for every full km.</Body> : null}
                </Row>
              ) : null}
              <Divider />
            </FadeIn>
          )}

          {!saved && !tooShort ? (
            <FadeIn index={5} style={[styles.section, { gap: S.sm }]}>
              <Body dim size={13}>Name</Body>
              <TextInput
                value={title}
                onChangeText={setTitle}
                maxLength={40}
                style={styles.input}
                placeholderTextColor={C.textMute}
                placeholder={runTitle(finished.type, finished.startedAt)}
              />
            </FadeIn>
          ) : null}

          {saved ? (
            <FadeIn style={styles.section}>
              <ShareToCrew runId={saved.id} onBeforeNavigate={reset} />
            </FadeIn>
          ) : null}

          <View style={[styles.section, { gap: S.sm }]}>
            {saved ? (
              <Button title="Done" size="lg" onPress={reset} full />
            ) : (
              <>
                {!tooShort ? <Button title={`Save ${activity.noun}`} size="lg" loading={save.isPending} onPress={onSave} full /> : null}
                <Button title={tooShort ? "Close" : "Discard"} variant={tooShort ? "secondary" : "ghost"} onPress={tooShort ? reset : discard} full />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {visible ? <ModalToastHost /> : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: S.xxl, marginBottom: S.xl },
  heroKm: { color: C.text, fontFamily: F.display, fontSize: 104, lineHeight: 108, letterSpacing: -3.5, fontVariant: ["tabular-nums"] },
  section: { marginTop: S.xxl },
  earnRow: { paddingVertical: S.lg, alignItems: "baseline" },
  earnValue: { color: C.text, fontFamily: F.display, fontSize: 24, letterSpacing: -0.4, fontVariant: ["tabular-nums"] },
  earnUnit: { color: C.textDim, fontSize: 13, fontWeight: "600" },
  input: { height: 52, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, color: C.text, paddingHorizontal: S.lg, fontSize: 16 },
});
