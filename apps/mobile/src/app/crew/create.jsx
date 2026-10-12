// Create a crew: name, tagline, city, accent colour and privacy.

import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Body, Button, C, F, Header, PressableScale, S, Segment } from "@/components/ui";
import { CITIES } from "@/constants/theme";
import { CREW_ACCENTS } from "@/data/seed";
import { engine, useCrewLimits, useEngineMutation, useProfile, useUpgradePrompt } from "@/data/hooks";
import { tierLabel } from "@/utils/format";
import CrewCard from "@/components/crew/CrewCard";
import { AccentPicker, useCrewFocus } from "@/components/crew/shared";

export default function CreateCrew() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();
  const limits = useCrewLimits();
  const openUpgrade = useUpgradePrompt((s) => s.open);
  const focus = useCrewFocus((s) => s.focus);

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [city, setCity] = useState(null);
  const [accent, setAccent] = useState(CREW_ACCENTS[0]);
  const [privacy, setPrivacy] = useState("public");

  const chosenCity = city || profile?.city || CITIES[0]?.name;
  const l = limits.data;
  const blocked = l && !l.canCreate;

  const create = useEngineMutation(engine.createCrew, {
    success: (crew) => `${crew.name} is live. Bring your people.`,
    onSuccess: (crew) => {
      focus(crew.id);
      router.dismissTo("/(tabs)/club");
    },
  });

  const submit = () => {
    if (blocked) {
      openUpgrade(l.maxOwned === 0 ? "pro" : "black", l.maxOwned === 0 ? "Owning a crew is a Pro feature." : `You already own ${l.owned} of ${l.maxOwned} crews on ${tierLabel(l.tier)}.`);
      return;
    }
    create.mutate({ name: name.trim(), tagline: tagline.trim(), city: chosenCity, accent, privacy });
  };

  const preview = {
    id: "preview",
    name: name.trim() || "Your crew name",
    tagline: tagline.trim() || "Your tagline goes here",
    city: chosenCity,
    accent,
    privacy,
    memberCount: 1,
    weekKm: 0,
    weeklyGoalKm: 100,
    badgeTier: "Bronze",
    previewMembers: profile ? [{ id: "me", name: profile.name, username: profile.username, avatar: profile.avatar, color: profile.color, isMe: true }] : [],
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <Header back title="Create a crew" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: S.gutter, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {l ? (
            <Body dim size={13} style={{ marginTop: S.xs, marginBottom: S.xl }}>
              {blocked
                ? l.maxOwned === 0
                  ? "Owning a crew is a Pro feature. Fill this in and upgrade when you hit create."
                  : `You own ${l.owned} of ${l.maxOwned} crews on ${tierLabel(l.tier)}. Black lets you own up to 3.`
                : `You can own ${l.maxOwned - l.owned} more crew${l.maxOwned - l.owned === 1 ? "" : "s"} on ${tierLabel(l.tier)}.`}
            </Body>
          ) : null}

          <Text style={[styles.field, { marginBottom: S.sm }]}>Preview</Text>
          <CrewCard crew={preview} />

          <Text style={styles.section}>The basics</Text>
          <Text style={styles.field}>Name</Text>
          <TextInput value={name} onChangeText={setName} placeholder="e.g. Peckham Night Walkers" placeholderTextColor={C.textMute} maxLength={32} style={styles.input} />
          <Body mute size={13} style={{ marginTop: 6 }}>At least 3 characters. Must be unique.</Body>

          <Text style={[styles.field, { marginTop: S.lg }]}>Tagline</Text>
          <TextInput value={tagline} onChangeText={setTagline} placeholder="What your crew is about" placeholderTextColor={C.textMute} maxLength={80} style={styles.input} />

          <Text style={[styles.field, { marginTop: S.lg, marginBottom: S.sm }]}>City</Text>
          <View style={styles.wrap}>
            {CITIES.map((c) => {
              const active = c.name === chosenCity;
              return (
                <PressableScale key={c.name} onPress={() => setCity(c.name)} scaleTo={0.93} style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && { color: C.bg }]}>{c.name}</Text>
                </PressableScale>
              );
            })}
          </View>

          <Text style={styles.section}>Make it yours</Text>
          <Text style={[styles.field, { marginBottom: S.sm }]}>Accent colour</Text>
          <AccentPicker colours={CREW_ACCENTS} value={accent} onChange={setAccent} />

          <Text style={[styles.field, { marginTop: S.lg, marginBottom: S.sm }]}>Who can join</Text>
          <Segment
            options={[
              { value: "public", label: "Anyone" },
              { value: "invite", label: "Invite code only" },
            ]}
            value={privacy}
            onChange={setPrivacy}
          />
          <Body mute size={13} style={{ marginTop: 6 }}>
            {privacy === "public" ? "Shows up in Discover and anyone can join." : "Still listed in Discover, but people need your code to join."}
          </Body>

          <Button
            title={blocked ? "Upgrade to create" : "Create crew"}
            onPress={submit}
            loading={create.isPending}
            disabled={!blocked && name.trim().length < 3}
            full
            size="lg"
            style={{ marginTop: S.xxl }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { color: C.text, fontFamily: F.display, fontSize: 20, marginTop: S.xxl + 4, marginBottom: S.md },
  field: { color: C.textDim, fontSize: 13, fontWeight: "600" },
  input: { height: 50, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, color: C.text, paddingHorizontal: S.md, fontSize: 15, marginTop: S.sm },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  chip: { height: 40, paddingHorizontal: 14, borderRadius: 99, backgroundColor: C.surface, justifyContent: "center" },
  chipActive: { backgroundColor: C.text },
  chipText: { color: C.textDim, fontSize: 13, fontWeight: "600" },
});
