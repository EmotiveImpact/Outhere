// Report a post, message, comment or story with a reason, and block the
// person at the same time if you want. Crew admins and Outhere see reports.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Lock } from "lucide-react-native";
import { C, F, GlowButton, PressableScale, Row, Sheet } from "@/components/ui";
import { Toggle } from "@/components/account/parts";
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
          {/* .ah: their face, what you're reporting and who sees it */}
          <Row gap={12} style={{ marginBottom: 6 }}>
            <PlayerAvatar player={target.author} size={42} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                Report {first}'s {WHAT[target.targetType] || "post"}
              </Text>
              <Text style={styles.small}>{target.crewId ? "Only the crew admins and Outhere see this" : "Only Outhere sees this"}</Text>
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
            <Row gap={12} style={styles.sr2}>
              <View>
                <Lock size={18} color={C.textDim} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.blockTitle}>Block {first} as well</Text>
                <Text style={styles.small}>They won't see your runs or messages</Text>
              </View>
              <Toggle value={block} onChange={setBlock} label={`Block ${first}`} />
            </Row>
          ) : (
            <View style={{ height: 8 }} />
          )}
          <GlowButton title="Send report" size="md" full disabled={!reason} loading={send.isPending} onPress={submit} style={{ marginTop: 2 }} />
          <GlowButton title="Cancel" variant="quiet" size="md" full onPress={onClose} style={{ marginTop: 8, height: 44 }} textStyle={{ fontSize: 13 }} />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 11, marginTop: 2 },
  // .rsn: 46 tall lit rows; the chosen one ringed in blue
  option: { flexDirection: "row", alignItems: "center", gap: 12, height: 46, paddingHorizontal: 14, borderRadius: 15, backgroundColor: "#15181e", marginTop: 8, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" },
  optionOn: { backgroundColor: "#121a28", boxShadow: "inset 0 0 0 1.5px #3d8bff, 0 0 20px -8px rgba(61,139,255,0.8)" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.textMute, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.accent, boxShadow: "0 0 8px rgba(61,139,255,0.9)" },
  optionText: { color: C.text, fontFamily: F.bodyMedium, fontSize: 13 },
  sr2: { paddingTop: 14, paddingBottom: 12, paddingHorizontal: 2 },
  blockTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
});
