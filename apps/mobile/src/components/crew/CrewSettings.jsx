import React, { useEffect, useState } from "react";
import { Alert, Share, StyleSheet, Text, TextInput } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Copy, DoorOpen, Share2, Trash2, X } from "@/components/ui/icons";
import { Body, Button, C, F, IconButton, Row, S, Segment, Sheet, Title, toast } from "@/components/ui";
import { CREW_ACCENTS } from "@/data/seed";
import { engine, useEngineMutation } from "@/data/hooks";
import { AccentPicker } from "./shared";

const GOALS = [50, 100, 150, 250, 400];

export const shareInvite = (crew) =>
  Share.share({
    message: `Join ${crew.name} on Outhere. Open the Crew tab and drop in the code ${crew.inviteCode}.`,
  }).catch(() => {});

/**
 * Crew settings sheet. Owners and admins edit details; everyone sees the
 * invite code and can leave; owners can delete the crew.
 */
export default function CrewSettings({ crew, visible, onClose, onLeft }) {
  const canEdit = crew.myRole === "owner" || crew.myRole === "admin";
  const isOwner = crew.myRole === "owner";
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (visible) setForm({ name: crew.name, tagline: crew.tagline || "", accent: crew.accent, privacy: crew.privacy, weeklyGoalKm: crew.weeklyGoalKm });
  }, [visible, crew.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = useEngineMutation(engine.updateCrew, {
    success: "Crew settings saved",
    onSuccess: onClose,
  });
  const leave = useEngineMutation(engine.leaveCrew, {
    success: `You left ${crew.name}`,
    onSuccess: () => {
      onClose();
      onLeft?.();
    },
  });
  const remove = useEngineMutation(engine.deleteCrew, {
    success: `${crew.name} deleted`,
    onSuccess: () => {
      onClose();
      onLeft?.();
    },
  });

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const dirty =
    form &&
    (form.name.trim() !== crew.name ||
      form.tagline.trim() !== (crew.tagline || "") ||
      form.accent !== crew.accent ||
      form.privacy !== crew.privacy ||
      form.weeklyGoalKm !== crew.weeklyGoalKm);

  const save = () => {
    if (form.name.trim().length < 3) return toast.error("Name too short", "Crew names need at least 3 characters");
    update.mutate([crew.id, { ...form, name: form.name.trim(), tagline: form.tagline.trim() }]);
  };

  const copyCode = async () => {
    await Clipboard.setStringAsync(crew.inviteCode);
    toast.success("Code copied", `${crew.inviteCode} is on your clipboard`);
  };

  const confirmLeave = () =>
    Alert.alert(
      `Leave ${crew.name}?`,
      isOwner
        ? crew.memberCount > 1
          ? "You own this crew. Ownership passes to an admin, or the longest standing member."
          : "You're the only member, so the crew will be deleted."
        : "You can rejoin later if it's public or you have the code.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: () => leave.mutate(crew.id) },
      ]
    );

  const confirmDelete = () =>
    Alert.alert(`Delete ${crew.name}?`, "The crew, its chat and its feed are gone for good. Members are removed.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete crew", style: "destructive", onPress: () => remove.mutate(crew.id) },
    ]);

  return (
    <Sheet visible={visible} onClose={onClose} scroll maxHeight="92%">
      <Row style={styles.top}>
        <Title size={24} style={{ flex: 1 }}>Crew settings</Title>
        <IconButton icon={X} onPress={onClose} label="Close" />
      </Row>

      <Body dim size={13}>Invite code</Body>
      <Text style={styles.code} selectable>
        {crew.inviteCode}
      </Text>
      <Body dim size={13}>Anyone with this code can join, even when the crew is invite only.</Body>
      <Row gap={S.sm} style={{ marginTop: S.lg }}>
        <Button title="Share" icon={Share2} size="sm" variant={canEdit ? "secondary" : "primary"} onPress={() => shareInvite(crew)} />
        <Button title="Copy" icon={Copy} size="sm" variant="secondary" onPress={copyCode} />
      </Row>

      {canEdit && form ? (
        <>
          <Text style={styles.section}>Details</Text>
          <Text style={styles.field}>Name</Text>
          <TextInput value={form.name} onChangeText={set("name")} maxLength={32} style={styles.input} placeholderTextColor={C.textMute} />
          <Text style={[styles.field, { marginTop: S.lg }]}>Tagline</Text>
          <TextInput
            value={form.tagline}
            onChangeText={set("tagline")}
            maxLength={80}
            placeholder="What your crew is about"
            placeholderTextColor={C.textMute}
            style={styles.input}
          />
          <Text style={[styles.field, { marginTop: S.lg, marginBottom: S.sm }]}>Accent colour</Text>
          <AccentPicker colours={CREW_ACCENTS} value={form.accent} onChange={set("accent")} />
          <Text style={[styles.field, { marginTop: S.lg, marginBottom: S.sm }]}>Who can join</Text>
          <Segment
            options={[
              { value: "public", label: "Anyone" },
              { value: "invite", label: "Invite code only" },
            ]}
            value={form.privacy}
            onChange={set("privacy")}
          />
          <Text style={[styles.field, { marginTop: S.lg, marginBottom: S.sm }]}>Weekly goal</Text>
          <Segment options={GOALS.map((g) => ({ value: g, label: `${g}` }))} value={form.weeklyGoalKm} onChange={set("weeklyGoalKm")} />
          <Body mute size={12} style={{ marginTop: 6 }}>Kilometres the whole crew aims for each week.</Body>
          <Button title="Save changes" onPress={save} disabled={!dirty} loading={update.isPending} full style={{ marginTop: S.xl }} />
        </>
      ) : null}

      <Text style={styles.section}>Membership</Text>
      <Button title="Leave crew" icon={DoorOpen} variant="secondary" onPress={confirmLeave} loading={leave.isPending} full />
      {isOwner ? (
        <Button title="Delete crew" icon={Trash2} variant="danger" onPress={confirmDelete} loading={remove.isPending} full style={{ marginTop: S.md }} />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  top: { paddingTop: S.xs, paddingBottom: S.lg },
  code: { color: C.text, fontFamily: F.display, fontSize: 48, letterSpacing: 4, marginVertical: S.xs },
  section: { color: C.text, fontFamily: F.display, fontSize: 20, marginTop: S.xxl + 4, marginBottom: S.md },
  field: { color: C.textDim, fontSize: 13, fontWeight: "600" },
  input: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, color: C.text, paddingHorizontal: S.md, fontSize: 15, marginTop: S.sm },
});
