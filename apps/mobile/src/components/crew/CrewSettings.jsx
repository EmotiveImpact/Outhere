import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, Share, StyleSheet, Text, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { Copy, DoorOpen, Share2, Trash2, X } from "lucide-react-native";
import { Body, Button, C, Card, F, IconButton, Label, Row, S, Segment, Title } from "@/components/ui";
import { CREW_ACCENTS } from "@/data/seed";
import { engine, useEngineMutation } from "@/data/hooks";
import { hapticSuccess } from "@/services/haptics";
import { AccentPicker } from "./shared";

const GOALS = [50, 100, 150, 250, 400];

export const shareInvite = (crew) =>
  Share.share({
    message: `Join ${crew.name} on OutHere. Open the Crew tab, tap "Join with a code" and enter ${crew.inviteCode}.`,
  }).catch(() => {});

/**
 * Crew settings sheet. Owners and admins edit details; everyone sees the
 * invite code and can leave; owners can delete the crew.
 */
export default function CrewSettings({ crew, visible, onClose, onLeft }) {
  const insets = useSafeAreaInsets();
  const canEdit = crew.myRole === "owner" || crew.myRole === "admin";
  const isOwner = crew.myRole === "owner";
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (visible) setForm({ name: crew.name, tagline: crew.tagline || "", accent: crew.accent, privacy: crew.privacy, weeklyGoalKm: crew.weeklyGoalKm });
  }, [visible, crew.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = useEngineMutation(engine.updateCrew, {
    onSuccess: () => {
      hapticSuccess();
      onClose();
    },
  });
  const leave = useEngineMutation(engine.leaveCrew, {
    onSuccess: () => {
      onClose();
      onLeft?.();
    },
  });
  const remove = useEngineMutation(engine.deleteCrew, {
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
    if (form.name.trim().length < 3) return Alert.alert("Name too short", "Crew names need at least 3 characters.");
    update.mutate([crew.id, { ...form, name: form.name.trim(), tagline: form.tagline.trim() }]);
  };

  const copyCode = async () => {
    await Clipboard.setStringAsync(crew.inviteCode);
    hapticSuccess();
    Alert.alert("Copied", `${crew.inviteCode} is on your clipboard.`);
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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Row style={[styles.top, { paddingTop: Platform.OS === "android" ? insets.top + S.md : S.lg }]}>
          <Title size={22} style={{ flex: 1 }}>Crew settings</Title>
          <IconButton icon={X} onPress={onClose} label="Close" />
        </Row>
        <ScrollView contentContainerStyle={{ padding: S.gutter, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
          <Card highlight>
            <Label>Invite code</Label>
            <Text style={styles.code}>{crew.inviteCode}</Text>
            <Body dim size={13}>Anyone with this code can join, even when the crew is invite only.</Body>
            <Row gap={S.sm} style={{ marginTop: S.md }}>
              <Button title="Share" icon={Share2} size="sm" onPress={() => shareInvite(crew)} />
              <Button title="Copy" icon={Copy} size="sm" variant="secondary" onPress={copyCode} />
            </Row>
          </Card>

          {canEdit && form ? (
            <>
              <Text style={styles.section}>Details</Text>
              <Label>Name</Label>
              <TextInput value={form.name} onChangeText={set("name")} maxLength={32} style={styles.input} placeholderTextColor={C.textMute} />
              <Label style={{ marginTop: S.lg }}>Tagline</Label>
              <TextInput
                value={form.tagline}
                onChangeText={set("tagline")}
                maxLength={80}
                placeholder="What your crew is about"
                placeholderTextColor={C.textMute}
                style={styles.input}
              />
              <Label style={{ marginTop: S.lg, marginBottom: S.sm }}>Accent colour</Label>
              <AccentPicker colours={CREW_ACCENTS} value={form.accent} onChange={set("accent")} />
              <Label style={{ marginTop: S.lg, marginBottom: S.sm }}>Who can join</Label>
              <Segment
                options={[
                  { value: "public", label: "Anyone" },
                  { value: "invite", label: "Invite code only" },
                ]}
                value={form.privacy}
                onChange={set("privacy")}
              />
              <Label style={{ marginTop: S.lg, marginBottom: S.sm }}>Weekly goal</Label>
              <Segment options={GOALS.map((g) => ({ value: g, label: `${g} km` }))} value={form.weeklyGoalKm} onChange={set("weeklyGoalKm")} />
              <Button title="Save changes" onPress={save} disabled={!dirty} loading={update.isPending} full style={{ marginTop: S.xl }} />
            </>
          ) : null}

          <Text style={styles.section}>Membership</Text>
          <Button title="Leave crew" icon={DoorOpen} variant="secondary" onPress={confirmLeave} loading={leave.isPending} full />
          {isOwner ? (
            <Button title="Delete crew" icon={Trash2} variant="danger" onPress={confirmDelete} loading={remove.isPending} full style={{ marginTop: S.md }} />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: S.gutter, paddingBottom: S.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  code: { color: C.accent, fontFamily: F.display, fontSize: 34, letterSpacing: 4, marginVertical: S.sm },
  section: { color: C.text, fontFamily: F.display, fontSize: 19, marginTop: S.xxl, marginBottom: S.md },
  input: { height: 48, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, color: C.text, paddingHorizontal: S.md, fontSize: 15, marginTop: S.sm },
});
