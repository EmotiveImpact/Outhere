// Shown when a session finishes: stats, route, what it earns, then save,
// share to a crew, or discard.

import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotiView } from "moti";
import { Check, Coins, Sparkles, Trash2 } from "lucide-react-native";
import { Body, Button, C, F, Label, Pill, R, Row, S, Title } from "@/components/ui";
import { engine, useEngineMutation, useProfile } from "@/data/hooks";
import { hapticSuccess } from "@/services/haptics";
import { MOVE_SESSION_PHASE, useMoveStore } from "@/store/useMoveStore";
import { activityFor, rewardsFor, runTitle } from "./geo";
import RoutePreview from "./RoutePreview";
import RunStatGrid from "./RunStatGrid";
import ShareToCrew from "./ShareToCrew";

const MIN_SAVE_KM = 0.01;

const headline = (km) => (km >= 10 ? "Monster session" : km >= 5 ? "Strong work" : km >= 1 ? "Nice one" : "Every step counts");

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

  const save = useEngineMutation(engine.saveRun, {
    onSuccess: (run) => {
      hapticSuccess();
      setSaved(run);
    },
  });

  if (!finished) return null;

  const activity = activityFor(finished.type);
  const tooShort = finished.distanceKm < MIN_SAVE_KM;
  const earned = rewardsFor(finished.distanceKm, profile?.tier);

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
          contentContainerStyle={{ paddingTop: insets.top + S.xl, paddingBottom: insets.bottom + S.xxl, paddingHorizontal: S.gutter, gap: S.lg }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Label style={{ color: C.accent }}>{saved ? `${activity.label} saved` : `${activity.label} complete`}</Label>
            <Title size={34} style={{ marginTop: S.xs }}>
              {saved ? "Locked in" : headline(finished.distanceKm)}
            </Title>
          </View>

          <RoutePreview route={finished.route} height={170} radius={R.lg} strokeWidth={4} />
          <RunStatGrid run={finished} />

          {tooShort ? (
            <View style={styles.notice}>
              <Body dim>
                We didn't pick up enough movement to save this one. Make sure location is on and get a bit further next time.
              </Body>
            </View>
          ) : (
            <MotiView from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} style={[styles.earn, saved && styles.earnDone]}>
              <Label>{saved ? "Added to your wallet" : "You'll earn"}</Label>
              <Row gap={S.xl} style={{ marginTop: S.sm }}>
                <Row gap={6}>
                  <Sparkles size={18} color={C.accent} />
                  <Text style={styles.earnValue}>+{earned.xp}</Text>
                  <Text style={styles.earnUnit}>XP</Text>
                </Row>
                <Row gap={6}>
                  <Coins size={18} color={C.gold} />
                  <Text style={styles.earnValue}>+{earned.out}</Text>
                  <Text style={styles.earnUnit}>OUT</Text>
                </Row>
              </Row>
              <Row gap={S.sm} style={{ marginTop: S.sm, flexWrap: "wrap" }}>
                {earned.multiplier > 1 ? <Pill tone={profile?.tier} label={`${earned.multiplier}x XP ${profile?.tier === "black" ? "Black" : "Pro"}`} /> : null}
                {earned.out === 0 ? <Body mute size={12}>OUT lands for every full km.</Body> : null}
              </Row>
            </MotiView>
          )}

          {!saved && !tooShort ? (
            <View style={{ gap: S.sm }}>
              <Label>Name it</Label>
              <TextInput value={title} onChangeText={setTitle} maxLength={40} style={styles.input} placeholderTextColor={C.textMute} placeholder={runTitle(finished.type, finished.startedAt)} />
            </View>
          ) : null}

          {saved ? <ShareToCrew runId={saved.id} onBeforeNavigate={reset} /> : null}

          <View style={{ gap: S.sm, marginTop: S.sm }}>
            {saved ? (
              <Button title="Done" icon={Check} size="lg" onPress={reset} full />
            ) : (
              <>
                {!tooShort ? <Button title={`Save ${activity.noun}`} size="lg" loading={save.isPending} onPress={onSave} full /> : null}
                <Button title={tooShort ? "Close" : "Discard"} icon={tooShort ? undefined : Trash2} variant={tooShort ? "secondary" : "ghost"} onPress={tooShort ? reset : discard} full />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  notice: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg },
  earn: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg },
  earnDone: { borderColor: "rgba(0,255,127,0.35)", backgroundColor: "#0f1a14" },
  earnValue: { color: C.text, fontFamily: F.display, fontSize: 28 },
  earnUnit: { color: C.textDim, fontFamily: F.displayMedium, fontSize: 15 },
  input: { height: 48, borderRadius: R.md, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.surface, color: C.text, paddingHorizontal: S.md, fontSize: 16 },
});
