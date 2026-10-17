// Under 18 mode: the full game with friends and clubs. No strangers, no live
// spot, no paid drops, and a parent can be linked. It is set from the date
// of birth given at sign up and the server enforces it.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Check, X } from "@/components/ui/icons";
import { engine, useAccount, useEngineMutation } from "@/data/hooks";
import { Avatar, Button, C, F, FadeIn, PressableScale, R, S, Sheet, Skeleton } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { HeroPage, Note, Toggle, accountStyles, confirmAsk } from "@/components/account/parts";

const RULES = [
  { ok: true, title: "Battles with friends and your club", hint: "The full game, steps, OUT and seasons" },
  { ok: false, title: "No strangers", hint: "No Swipe to battle and no mystery challengers" },
  { ok: false, title: "No live spot on the map", hint: "Friends see your area once a run is done" },
  { ok: false, title: "No paid drops", hint: "OUT can still be spent on emotes and badges" },
];

export default function TeenScreen() {
  const { data: account, isPending } = useAccount();
  const [editing, setEditing] = useState(false);
  const minor = !!account?.isMinor;
  const guardian = account?.guardian;

  return (
    <HeroPage kicker={`Under 18 mode · ${minor ? "on" : "off"}`} top="Play it" bottom="safe" height={210} object={PHOTOS.shield}>
      <FadeIn index={0}>
        <View style={styles.card}>
          {RULES.map((r) => (
            <View key={r.title} style={styles.rule}>
              <View style={[styles.mark, r.ok && styles.markOk]}>{r.ok ? <Check size={12} color={C.accentHi} strokeWidth={3} /> : <X size={12} color={C.textDim} strokeWidth={3} />}</View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ruleTitle}>{r.title}</Text>
                <Text style={styles.ruleHint}>{r.hint}</Text>
              </View>
            </View>
          ))}
        </View>
      </FadeIn>

      {isPending ? (
        <Skeleton height={86} radius={R.lg} />
      ) : minor ? (
        <FadeIn index={1}>
          <View style={styles.parent}>
            <Avatar name={guardian?.name || "Parent"} size={46} />
            <View style={{ flex: 1 }}>
              <Text style={styles.ruleTitle}>{guardian ? `${guardian.name} is linked` : "Link a parent"}</Text>
              <Text style={styles.ruleHint}>
                {guardian ? (guardian.liveSharing ? "Sees your runs and gets Live sharing when you start" : "Sees your runs") : "They see your runs and can get Live sharing when you start"}
              </Text>
            </View>
            <PressableScale onPress={() => setEditing(true)} scaleTo={0.94} style={styles.manage} accessibilityLabel={guardian ? "Manage parent link" : "Link a parent"}>
              <Text style={styles.manageText}>{guardian ? "Manage" : "Add"}</Text>
            </PressableScale>
          </View>
        </FadeIn>
      ) : null}

      <Text style={styles.fine}>
        {minor
          ? `Set at sign up from your date of birth. It lifts on your 18th birthday.`
          : "Under 18 mode switches on for members under 18, from the date of birth given at sign up."}
      </Text>

      <GuardianSheet visible={editing} guardian={guardian} onClose={() => setEditing(false)} />
    </HeroPage>
  );
}

function GuardianSheet({ visible, guardian, onClose }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [live, setLive] = useState(true);
  useEffect(() => {
    if (!visible) return;
    setName(guardian?.name || "");
    setContact(guardian?.contact || "");
    setLive(guardian ? !!guardian.liveSharing : true);
  }, [visible, guardian]);

  const save = useEngineMutation(engine.linkGuardian, { success: "Parent linked", onSuccess: onClose });
  const remove = useEngineMutation(engine.unlinkGuardian, { success: "Link removed", onSuccess: onClose });
  const ready = name.trim() && contact.trim().length >= 3;

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={styles.sheetTitle}>{guardian ? "Your parent link" : "Link a parent"}</Text>
      <Text style={[styles.ruleHint, { marginBottom: S.lg }]}>Add the parent or carer who looks out for you. Nothing else of yours is shared with them.</Text>
      <View style={{ gap: 10 }}>
        <View style={accountStyles.field}>
          <Text style={accountStyles.fieldLabel}>Their name</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Mum" placeholderTextColor={C.textMute} maxLength={30} style={accountStyles.input} />
        </View>
        <View style={accountStyles.field}>
          <Text style={accountStyles.fieldLabel}>Phone number or email</Text>
          <TextInput value={contact} onChangeText={setContact} placeholder="07700 900123" placeholderTextColor={C.textMute} autoCapitalize="none" keyboardType="email-address" style={accountStyles.input} />
        </View>
        <View style={styles.liveRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ruleTitle}>Live sharing</Text>
            <Text style={styles.ruleHint}>They get your live spot while you're on a run</Text>
          </View>
          <Toggle value={live} onChange={setLive} label="Live sharing" />
        </View>
      </View>
      <Button title={guardian ? "Save" : "Link"} disabled={!ready} loading={save.isPending} onPress={() => save.mutate({ name: name.trim(), contact: contact.trim(), liveSharing: live })} full style={{ marginTop: S.xl }} />
      {guardian ? (
        <Button
          title="Remove link"
          variant="ghost"
          loading={remove.isPending}
          onPress={async () => {
            if (await confirmAsk({ title: `Remove ${guardian.name}?`, body: "They stop seeing your runs.", ok: "Remove", danger: true })) remove.mutate();
          }}
          full
          style={{ marginTop: S.sm }}
        />
      ) : null}
      <Note style={{ marginTop: S.md }}>You can change this at any time.</Note>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: R.lg, backgroundColor: C.surface, padding: S.lg, gap: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  rule: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  mark: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center", marginTop: 1 },
  markOk: { backgroundColor: "rgba(61,139,255,0.22)" },
  ruleTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  ruleHint: { color: C.textDim, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  parent: { flexDirection: "row", alignItems: "center", gap: 14, padding: S.lg, borderRadius: R.lg, backgroundColor: C.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  manage: { height: 34, paddingHorizontal: 16, borderRadius: R.full, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
  manageText: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  fine: { color: C.textDim, fontFamily: F.body, fontSize: 12, lineHeight: 18, marginHorizontal: 4 },
  sheetTitle: { color: C.text, fontFamily: F.display, fontSize: 28, textTransform: "uppercase", marginTop: S.sm },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: 4 },
});
