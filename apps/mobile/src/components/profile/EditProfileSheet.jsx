// Edit name, username, bio, area and avatar. Saves through engine.updateProfile,
// which validates the username again on save.

import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Check, X } from "lucide-react-native";
import { engine, useEngineMutation } from "@/data/hooks";
import { CITIES } from "@/constants/theme";
import { hapticSuccess } from "@/services/haptics";
import { Body, Button, C, F, Label, R, Row, S, Title } from "@/components/ui";
import { AVATAR_COLOURS, MeAvatar, PRESET_AVATARS } from "./shared";

export default function EditProfileSheet({ visible, profile, onClose }) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState(null);
  const [check, setCheck] = useState({ state: "idle", reason: null });
  const reqId = useRef(0);

  // Fill the form when the sheet opens. Profile refetches while it's open must
  // not wipe what's being typed, so this only runs on open.
  useEffect(() => {
    if (visible && profile) {
      setForm({ name: profile.name || "", username: profile.username, bio: profile.bio || "", area: profile.area || "", avatar: profile.avatar || null, color: profile.color || C.accent });
      setCheck({ state: "idle", reason: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const username = form?.username?.trim().toLowerCase() || "";
  const usernameChanged = !!form && username !== profile?.username;

  useEffect(() => {
    if (!usernameChanged) {
      setCheck({ state: "idle", reason: null });
      return undefined;
    }
    setCheck({ state: "checking", reason: null });
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      const res = await engine.checkUsername(username).catch((e) => ({ available: false, reason: e.message }));
      if (id === reqId.current) setCheck(res.available ? { state: "ok", reason: null } : { state: "bad", reason: res.reason });
    }, 350);
    return () => clearTimeout(t);
  }, [username, usernameChanged]);

  const save = useEngineMutation(engine.updateProfile, {
    onSuccess: () => {
      hapticSuccess();
      onClose();
    },
  });

  if (!form) return null;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const boroughs = CITIES.find((c) => c.name === profile?.city)?.boroughs || [];
  const canSave = form.name.trim().length > 0 && (!usernameChanged || check.state === "ok");

  const submit = () =>
    save.mutate({ name: form.name.trim(), username: form.username, bio: form.bio.trim(), area: form.area, avatar: form.avatar, color: form.color });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Row style={{ justifyContent: "space-between", paddingHorizontal: S.gutter, paddingTop: Platform.OS === "ios" ? S.lg : insets.top + S.md, paddingBottom: S.md }}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={{ color: C.textDim, fontSize: 16 }}>Cancel</Text>
          </Pressable>
          <Title size={18}>Edit profile</Title>
          <Pressable onPress={submit} disabled={!canSave || save.isPending} hitSlop={12}>
            <Text style={{ color: canSave ? C.accent : C.textMute, fontSize: 16, fontWeight: "700" }}>{save.isPending ? "Saving" : "Save"}</Text>
          </Pressable>
        </Row>

        <ScrollView contentContainerStyle={{ padding: S.gutter, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center" }}>
            <MeAvatar uri={form.avatar} name={form.name || form.username} colour={form.color} size={96} />
          </View>

          <Label style={{ marginTop: S.xl }}>Initials</Label>
          <Row gap={S.md} style={{ marginTop: S.sm, flexWrap: "wrap" }}>
            {AVATAR_COLOURS.map((c) => {
              const active = !form.avatar && form.color === c;
              return (
                <Pressable key={c} onPress={() => set({ avatar: null, color: c })} accessibilityLabel="Initials avatar colour">
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${c}26`, borderWidth: 2, borderColor: active ? c : "transparent", alignItems: "center", justifyContent: "center" }}>
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c }} />
                  </View>
                </Pressable>
              );
            })}
          </Row>

          <Label style={{ marginTop: S.lg }}>Or pick one</Label>
          <Row gap={S.md} style={{ marginTop: S.sm, flexWrap: "wrap" }}>
            {PRESET_AVATARS.map((uri) => {
              const active = form.avatar === uri;
              return (
                <Pressable key={uri} onPress={() => set({ avatar: uri })} accessibilityLabel="Preset avatar">
                  <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: active ? C.accent : "transparent", padding: 2 }}>
                    <Image source={{ uri }} style={{ flex: 1, borderRadius: 24, backgroundColor: C.surfaceHigh }} contentFit="cover" />
                  </View>
                </Pressable>
              );
            })}
          </Row>

          <Field label="Name" value={form.name} onChangeText={(name) => set({ name })} maxLength={30} />

          <Field
            label="Username"
            value={form.username}
            onChangeText={(t) => set({ username: t.replace(/\s/g, "").toLowerCase() })}
            maxLength={20}
            autoCapitalize="none"
            prefix="@"
            trailing={check.state === "ok" ? <Check size={18} color={C.accent} /> : check.state === "bad" ? <X size={18} color={C.danger} /> : null}
          />
          {usernameChanged ? (
            <Body size={12} style={{ marginTop: 6, color: check.state === "bad" ? C.danger : check.state === "ok" ? C.accent : C.textMute }}>
              {check.state === "checking" ? "Checking..." : check.state === "ok" ? "Available" : check.reason}
            </Body>
          ) : null}

          <Field label="Bio" value={form.bio} onChangeText={(bio) => set({ bio })} maxLength={140} multiline placeholder="Where you move and why" />
          <Body mute size={12} style={{ marginTop: 6, textAlign: "right" }}>
            {form.bio.length}/140
          </Body>

          {boroughs.length ? (
            <>
              <Label style={{ marginTop: S.lg }}>Area in {profile.city}</Label>
              <Row gap={S.sm} style={{ marginTop: S.sm, flexWrap: "wrap" }}>
                {boroughs.map((b) => {
                  const active = form.area === b;
                  return (
                    <Pressable
                      key={b}
                      onPress={() => set({ area: active ? "" : b })}
                      style={{ paddingHorizontal: 14, height: 36, borderRadius: R.full, justifyContent: "center", borderWidth: 1, borderColor: active ? C.accent : C.border, backgroundColor: active ? C.accentDim : C.surface }}
                    >
                      <Text style={{ color: active ? C.accent : C.textDim, fontWeight: "600", fontSize: 13 }}>{b}</Text>
                    </Pressable>
                  );
                })}
              </Row>
            </>
          ) : null}

          <Button title="Save changes" full loading={save.isPending} disabled={!canSave} onPress={submit} style={{ marginTop: S.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, prefix, trailing, multiline, ...input }) {
  return (
    <>
      <Label style={{ marginTop: S.lg }}>{label}</Label>
      <Row
        gap={4}
        style={{
          marginTop: S.sm,
          minHeight: multiline ? 92 : 52,
          alignItems: multiline ? "flex-start" : "center",
          borderRadius: R.md,
          borderWidth: 1,
          borderColor: C.border,
          backgroundColor: C.surface,
          paddingHorizontal: S.lg,
          paddingVertical: multiline ? S.md : 0,
        }}
      >
        {prefix ? <Text style={{ color: C.textMute, fontSize: 16 }}>{prefix}</Text> : null}
        <TextInput
          {...input}
          multiline={multiline}
          placeholderTextColor={C.textMute}
          autoCorrect={false}
          style={{ flex: 1, color: C.text, fontSize: 16, fontFamily: multiline ? undefined : F.displayMedium, textAlignVertical: multiline ? "top" : "center" }}
        />
        {trailing}
      </Row>
    </>
  );
}
