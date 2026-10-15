// Report a post, message, comment or story with a reason, and block the
// person at the same time if you want. Crew admins and Outhere see reports.

import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Switch, Text, View } from "react-native";
import { Lock } from "lucide-react-native";
import { Body, Button, C, F, PressableScale, Row, S, Sheet } from "@/components/ui";
import { engine, useEngineMutation } from "@/data/hooks";
import { REPORT_REASONS } from "@/data/seedCrew";
import { PlayerAvatar } from "./shared";

const WHAT = { post: "post", message: "message", comment: "comment", story: "story" };

/** target: { crewId, targetType, targetId, author } */
export default function ReportSheet({ target, onClose }) {
  const [reason, setReason] = useState(null);
  const [block, setBlock] = useState(false);
  useEffect(() => {
    if (target) {
      setReason(null);
      setBlock(false);
    }
  }, [target]);
  const first = (target?.author?.name || "this person").split(" ")[0];
  const send = useEngineMutation(engine.reportContent, {
    success: (r) => (r?.blocked ? `Reported and blocked ${first}` : "Thanks, we've got it"),
    onSuccess: onClose,
  });
  const submit = () =>
    reason &&
    send.mutate({
      crewId: target.crewId || null,
      targetType: target.targetType,
      targetId: target.targetId,
      authorId: target.author?.id || null,
      reason,
      block,
    });

  return (
    <Sheet visible={!!target} onClose={onClose}>
      {target ? (
        <View>
          <Row gap={S.md} style={{ marginBottom: S.lg }}>
            <PlayerAvatar player={target.author} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                Report {first}'s {WHAT[target.targetType] || "post"}
              </Text>
              <Body dim size={13}>
                {target.crewId ? "Only the crew admins and Outhere see this" : "Only Outhere sees this"}
              </Body>
            </View>
          </Row>
          {REPORT_REASONS.map((r) => {
            const on = reason === r.value;
            return (
              <PressableScale
                key={r.value}
                onPress={() => setReason(r.value)}
                scaleTo={0.98}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={[styles.option, on && styles.optionOn]}
              >
                <View style={[styles.radio, on && { borderColor: C.accent }]}>{on ? <View style={styles.radioDot} /> : null}</View>
                <Text style={styles.optionText}>{r.label}</Text>
              </PressableScale>
            );
          })}
          {target.author && !target.author.isMe ? (
            <Row gap={S.md} style={{ marginTop: S.sm, marginBottom: S.lg }}>
              <Lock size={16} color={C.textDim} />
              <View style={{ flex: 1 }}>
                <Text style={styles.blockTitle}>Block {first} as well</Text>
                <Body dim size={12}>
                  They won't see your runs or messages
                </Body>
              </View>
              <Switch
                value={block}
                onValueChange={setBlock}
                trackColor={{ false: C.surfaceHigh, true: C.accent }}
                thumbColor="#fff"
                {...(Platform.OS === "web" ? { activeThumbColor: "#fff" } : null)}
                ios_backgroundColor={C.surfaceHigh}
                accessibilityLabel={`Block ${first}`}
              />
            </Row>
          ) : (
            <View style={{ height: S.lg }} />
          )}
          <Button title="Send report" size="lg" full disabled={!reason} loading={send.isPending} onPress={submit} />
          <Button title="Cancel" variant="secondary" full onPress={onClose} style={{ marginTop: S.sm }} />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 17 },
  option: { flexDirection: "row", alignItems: "center", gap: S.md, height: 50, paddingHorizontal: S.lg, borderRadius: 14, backgroundColor: C.surfaceHigh, marginBottom: S.sm, borderWidth: 1.5, borderColor: "transparent" },
  optionOn: { borderColor: C.accent, backgroundColor: "rgba(61,139,255,0.08)" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.textMute, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent },
  optionText: { color: C.text, fontFamily: F.bodyMedium, fontSize: 15 },
  blockTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
});
