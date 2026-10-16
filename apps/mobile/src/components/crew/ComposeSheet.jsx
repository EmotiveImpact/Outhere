// "Share a run, photo or route" from the top of the club feed. A photo can
// carry one of your runs' stats on top; a run shows its route and numbers.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { Camera, Check, ImagePlus } from "lucide-react-native";
import { Body, Button, C, F, PressableScale, Row, S, Segment, Sheet } from "@/components/ui";
import { engine, useEngineMutation, useRuns } from "@/data/hooks";
import { formatKm, timeAgo } from "@/utils/format";
import { pickPhoto } from "./pickPhoto";

const KINDS = [
  { value: "photo", label: "Photo" },
  { value: "run", label: "Run" },
  { value: "route", label: "Route" },
  { value: "text", label: "Words" },
];

function RunPicker({ runs, value, onChange, needRoute, optional }) {
  if (!runs.length) return <Body dim style={{ marginTop: S.md }}>No runs yet. Finish one on Move and it shows up here.</Body>;
  return (
    <View style={{ marginTop: S.md }}>
      {runs.slice(0, 5).map((r) => {
        const ok = !needRoute || (r.route && r.route.length > 1);
        const on = value === r.id;
        return (
          <PressableScale key={r.id} disabled={!ok} onPress={() => onChange(on && optional ? null : r.id)} scaleTo={0.98} style={[styles.run, on && styles.runOn, !ok && { opacity: 0.4 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.runTitle} numberOfLines={1}>
                {r.title || "Run"}
              </Text>
              <Body dim size={12}>
                {formatKm(r.distanceKm)} · {timeAgo(r.startedAt)}
                {!ok ? " · no route" : ""}
              </Body>
            </View>
            {on ? <Check size={18} color={C.accent} /> : null}
          </PressableScale>
        );
      })}
    </View>
  );
}

export default function ComposeSheet({ crew, visible, start, onClose }) {
  const runs = useRuns(10);
  const [kind, setKind] = useState("photo");
  const [photo, setPhoto] = useState(null);
  const [runId, setRunId] = useState(null);
  const [text, setText] = useState("");
  useEffect(() => {
    if (!visible) return;
    setKind(start?.kind || "photo");
    setPhoto(start?.photo || null);
    setRunId(null);
    setText("");
  }, [visible, start]);
  const post = useEngineMutation(engine.postToCrew, { success: "Shared with the crew", onSuccess: onClose });
  const list = runs.data || [];
  const ready = kind === "photo" ? !!photo : kind === "text" ? !!text.trim() : !!runId;

  const choose = async (camera) => {
    const p = await pickPhoto({ camera });
    if (p) setPhoto(p);
  };

  return (
    <Sheet visible={visible} onClose={onClose} maxHeight="92%" scroll>
        <Text style={styles.title}>Share with {crew.name}</Text>
        <Segment options={KINDS} value={kind} onChange={setKind} style={{ marginTop: S.md }} />
        {kind === "photo" ? (
          <>
            {photo ? (
              <PressableScale onPress={() => choose(false)} scaleTo={0.98}>
                <Image source={{ uri: photo.uri }} style={styles.preview} contentFit="cover" />
              </PressableScale>
            ) : (
              <Row gap={S.md} style={{ marginTop: S.lg }}>
                <Button title="Camera" icon={Camera} onPress={() => choose(true)} style={{ flex: 1 }} />
                <Button title="Photos" icon={ImagePlus} variant="secondary" onPress={() => choose(false)} style={{ flex: 1 }} />
              </Row>
            )}
            <Text style={styles.label}>Put a run's stats on it</Text>
            <RunPicker runs={list} value={runId} onChange={setRunId} optional />
          </>
        ) : null}
        {kind === "run" || kind === "route" ? (
          <>
            <Body dim size={13} style={{ marginTop: S.md }}>
              {kind === "route" ? "Share the line you ran so the crew can run it too." : "Your distance, pace and OUT, with the route."}
            </Body>
            <RunPicker runs={list} value={runId} onChange={setRunId} needRoute={kind === "route"} />
          </>
        ) : null}
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={kind === "text" ? "What's happening?" : "Add a caption"}
          placeholderTextColor={C.textMute}
          multiline
          maxLength={2000}
          style={styles.input}
          accessibilityLabel="Caption"
        />
        <Button
          title="Share"
          size="lg"
          full
          disabled={!ready}
          loading={post.isPending}
          onPress={() => post.mutate([crew.id, { kind, text, photoUri: photo?.uri || null, runId }])}
          style={{ marginTop: S.lg }}
        />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: { color: C.text, fontFamily: F.display, fontSize: 26, textTransform: "uppercase", marginTop: S.xs },
  preview: { width: "100%", aspectRatio: 1.3, borderRadius: 16, marginTop: S.lg, backgroundColor: C.surfaceHigh },
  label: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", marginTop: S.lg },
  run: { flexDirection: "row", alignItems: "center", gap: S.md, paddingHorizontal: S.md, paddingVertical: S.md, borderRadius: 14, backgroundColor: C.surfaceHigh, marginBottom: S.sm, borderWidth: 1.5, borderColor: "transparent" },
  runOn: { borderColor: C.accent },
  runTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  input: { minHeight: 52, maxHeight: 140, borderRadius: 14, backgroundColor: C.surfaceHigh, color: C.text, padding: S.md, fontFamily: F.body, fontSize: 15, marginTop: S.lg, outlineStyle: "none" },
});
