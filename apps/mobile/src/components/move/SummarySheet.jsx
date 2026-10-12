// Shown when a session finishes: route art, the big numbers, what it earns,
// then save, share to a crew, or discard.

import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Coins, Sparkles, Trash2 } from "lucide-react-native";
import { AnimatedNumber, Body, Button, C, F, FadeIn, Label, Pill, R, Row, S, Title, toast, ModalToastHost } from "@/components/ui";
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
          contentContainerStyle={{ paddingTop: insets.top + S.lg, paddingBottom: insets.bottom + S.xxl, paddingHorizontal: S.gutter, gap: S.lg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FadeIn>
            <Row gap={6}>
              {saved ? <Check size={14} color={C.accent} strokeWidth={3} /> : null}
              <Label style={{ color: C.accent }}>{saved ? `${activity.label} saved` : `${activity.label} complete`}</Label>
            </Row>
            <Title size={34} style={{ marginTop: S.xs, letterSpacing: -0.6 }}>
              {saved ? "Locked in" : headline(finished.distanceKm)}
            </Title>
          </FadeIn>

          <FadeIn index={1}>
            <RouteHero route={finished.route} seed={finished.startedAt} height={260}>
              <Label style={{ color: C.textDim }}>Distance</Label>
              <Row gap={8} style={{ alignItems: "baseline" }}>
                <CountUp to={finished.distanceKm} format={(v) => v.toFixed(2)} style={styles.heroKm} />
                <Text style={styles.heroUnit}>km</Text>
              </Row>
            </RouteHero>
          </FadeIn>

          <FadeIn index={2}>
            <RunStatGrid run={finished} />
          </FadeIn>

          {tooShort ? (
            <FadeIn index={3} style={styles.notice}>
              <Title size={17}>Not enough to save</Title>
              <Body dim size={14} style={{ marginTop: 4 }}>
                We barely picked up any movement. Check location is on and push a bit further next time.
              </Body>
            </FadeIn>
          ) : (
            <FadeIn index={3}>
              <View style={[styles.earn, saved && styles.earnDone]}>
                <LinearGradient colors={["rgba(0,255,127,0.14)", "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <Label style={{ color: saved ? C.accent : C.textMute }}>{saved ? "Added to your wallet" : "You'll earn"}</Label>
                <Row gap={S.xxl} style={{ marginTop: S.sm }}>
                  <Row gap={8}>
                    <View style={[styles.earnIcon, { backgroundColor: C.accentDim }]}>
                      <Sparkles size={16} color={C.accent} />
                    </View>
                    <CountUp to={earned.xp} delay={450} format={(v) => `+${Math.round(v)}`} style={styles.earnValue} />
                    <Text style={styles.earnUnit}>XP</Text>
                  </Row>
                  <Row gap={8}>
                    <View style={[styles.earnIcon, { backgroundColor: "rgba(255,215,0,0.14)" }]}>
                      <Coins size={16} color={C.gold} />
                    </View>
                    <CountUp to={earned.out} delay={600} format={(v) => `+${Math.round(v)}`} style={styles.earnValue} />
                    <Text style={styles.earnUnit}>OUT</Text>
                  </Row>
                </Row>
                {earned.multiplier > 1 || earned.out === 0 ? (
                  <Row gap={S.sm} style={{ marginTop: S.md, flexWrap: "wrap" }}>
                    {earned.multiplier > 1 ? <Pill tone={profile?.tier} label={`${earned.multiplier}x XP ${profile?.tier === "black" ? "Black" : "Pro"}`} /> : null}
                    {earned.out === 0 ? <Body mute size={12}>OUT lands for every full km.</Body> : null}
                  </Row>
                ) : null}
              </View>
            </FadeIn>
          )}

          {!saved && !tooShort ? (
            <FadeIn index={4} style={{ gap: S.sm }}>
              <Label>Name it</Label>
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
            <FadeIn>
              <ShareToCrew runId={saved.id} onBeforeNavigate={reset} />
            </FadeIn>
          ) : null}

          <View style={{ gap: S.sm, marginTop: S.xs }}>
            {saved ? (
              <Button title="Done" icon={Check} size="lg" onPress={reset} full />
            ) : (
              <>
                {!tooShort ? <Button title={`Save ${activity.noun}`} size="lg" loading={save.isPending} onPress={onSave} full /> : null}
                <Button
                  title={tooShort ? "Close" : "Discard"}
                  icon={tooShort ? undefined : Trash2}
                  variant={tooShort ? "secondary" : "ghost"}
                  onPress={tooShort ? reset : discard}
                  full
                />
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
  heroKm: { color: C.text, fontFamily: F.display, fontSize: 64, lineHeight: 68, letterSpacing: -1.5, fontVariant: ["tabular-nums"] },
  heroUnit: { color: C.textDim, fontFamily: F.displayMedium, fontSize: 20 },
  notice: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg },
  earn: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: "rgba(0,255,127,0.25)", padding: S.lg, overflow: "hidden" },
  earnDone: { borderColor: "rgba(0,255,127,0.5)" },
  earnIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  earnValue: { color: C.text, fontFamily: F.display, fontSize: 32, letterSpacing: -0.5, fontVariant: ["tabular-nums"] },
  earnUnit: { color: C.textDim, fontFamily: F.displayMedium, fontSize: 15 },
  input: { height: 52, borderRadius: R.md, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.surface, color: C.text, paddingHorizontal: S.lg, fontSize: 16 },
});
