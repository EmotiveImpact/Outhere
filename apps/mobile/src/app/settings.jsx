import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { CalendarDays, Crown, Footprints, Gift, History, LogOut, Minus, Plus, RotateCcw, ShoppingBag, Swords, Users } from "lucide-react-native";
import { engine, useEngineMutation, useProfile, useSettings } from "@/data/hooks";
import { CITIES } from "@/constants/theme";
import { Body, Button, C, Card, Divider, F, Header, Label, ListRow, Loading, Row, S, Screen, Segment, TierBadge } from "@/components/ui";
import { hapticSelection, hapticSuccess } from "@/services/haptics";
import { formatNumber, tierLabel } from "@/utils/format";

const NOTIFICATION_TYPES = [
  { key: "battles", label: "Battles", hint: "Invites, results and lead changes", icon: Swords },
  { key: "crews", label: "Crews", hint: "Joins, roles and crew news", icon: Users },
  { key: "drops", label: "Drops", hint: "Reminders when a drop goes live", icon: ShoppingBag },
  { key: "events", label: "Events", hint: "RSVPs and check-ins", icon: CalendarDays },
  { key: "rewards", label: "Rewards", hint: "Streaks, XP and OUT", icon: Gift },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: settings } = useSettings();
  const update = useEngineMutation(engine.updateSettings);

  if (!profile || !settings) {
    return (
      <Screen header={<Header back title="Settings" />}>
        <Loading />
      </Screen>
    );
  }

  const set = (patch) => update.mutate(patch);

  const resetEverything = (title) =>
    Alert.alert(
      title,
      "Your OutHere data lives only on this phone for now. This wipes your profile, steps, streak, XP and OUT for good.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: title === "Log out" ? "Log out" : "Reset",
          style: "destructive",
          onPress: async () => {
            await engine.resetAll();
            router.replace("/welcome");
          },
        },
      ]
    );

  return (
    <Screen header={<Header back title="Settings" />}>
      <SectionLabel>Account</SectionLabel>
      <AccountCard profile={profile} />

      <Card padding={S.md} style={{ marginTop: S.md }}>
        <ListRow
          leading={<RowIcon icon={Crown} />}
          title="Membership"
          subtitle={`${tierLabel(profile.tier)} plan`}
          trailing={<TierBadge tier={profile.tier} />}
          onPress={() => router.push("/membership")}
          style={{ paddingVertical: S.xs }}
        />
      </Card>

      <SectionLabel>Preferences</SectionLabel>
      <Card>
        <Text style={styles.rowTitle}>Distance units</Text>
        <Segment
          options={[
            { value: "km", label: "Kilometres" },
            { value: "mi", label: "Miles" },
          ]}
          value={settings.units}
          onChange={(units) => set({ units })}
          style={{ marginTop: S.md }}
        />
        <Divider style={{ marginVertical: S.lg }} />
        <ToggleRow title="Haptics" hint="Little taps when you press things" value={settings.haptics} onChange={(haptics) => set({ haptics })} />
      </Card>

      <SectionLabel>Notifications</SectionLabel>
      <Card>
        {NOTIFICATION_TYPES.map((t, i) => (
          <View key={t.key}>
            {i > 0 ? <Divider style={{ marginVertical: S.md }} /> : null}
            <ToggleRow
              icon={t.icon}
              title={t.label}
              hint={t.hint}
              value={settings.notifications[t.key] !== false}
              onChange={(v) => set({ notifications: { [t.key]: v } })}
            />
          </View>
        ))}
      </Card>

      <SectionLabel>Privacy</SectionLabel>
      <Card>
        <ToggleRow
          title="Show me on leaderboards"
          hint="Off keeps your name out of city, global and friends rankings"
          value={settings.privacy.showOnLeaderboards}
          onChange={(v) => set({ privacy: { showOnLeaderboards: v } })}
        />
        <Divider style={{ marginVertical: S.md }} />
        <ToggleRow
          title="Show when I'm outside"
          hint="Lets people see you in Outside now"
          value={settings.privacy.showOutsideStatus}
          onChange={(v) => set({ privacy: { showOutsideStatus: v } })}
        />
      </Card>

      {__DEV__ ? <DevTools onReset={() => resetEverything("Reset everything?")} /> : null}

      <Button
        title="Log out"
        icon={LogOut}
        variant="danger"
        full
        onPress={() => resetEverything("Log out")}
        style={{ marginTop: S.xxl }}
      />
      <Body mute size={12} style={{ textAlign: "center", marginTop: S.md }}>
        There are no accounts on a server yet, so logging out wipes this phone's data.
      </Body>
    </Screen>
  );
}

// ── Account editor ────────────────────────────────────────────────────────────

function AccountCard({ profile }) {
  const [name, setName] = useState(profile.name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [city, setCity] = useState(profile.city);
  const [goal, setGoal] = useState(profile.dailyGoal || 10000);
  const save = useEngineMutation(engine.updateProfile, { onSuccess: () => hapticSuccess() });

  // Pick up changes made elsewhere (e.g. after a reset).
  useEffect(() => {
    setName(profile.name || "");
    setBio(profile.bio || "");
    setCity(profile.city);
    setGoal(profile.dailyGoal || 10000);
  }, [profile.name, profile.bio, profile.city, profile.dailyGoal]);

  const dirty = name.trim() !== (profile.name || "") || bio.trim() !== (profile.bio || "") || city !== profile.city || goal !== profile.dailyGoal;
  const nudgeGoal = (delta) => {
    hapticSelection();
    setGoal((g) => Math.min(50000, Math.max(2000, g + delta)));
  };

  return (
    <Card>
      <Label>Username</Label>
      <Text style={{ color: C.textDim, fontSize: 15, marginTop: 6 }}>@{profile.username}</Text>

      <Label style={{ marginTop: S.lg }}>Display name</Label>
      <TextInput value={name} onChangeText={setName} maxLength={30} placeholder="Your name" placeholderTextColor={C.textMute} style={styles.input} />

      <Label style={{ marginTop: S.lg }}>Bio</Label>
      <TextInput
        value={bio}
        onChangeText={setBio}
        maxLength={140}
        multiline
        placeholder="Where you move, how you move"
        placeholderTextColor={C.textMute}
        style={[styles.input, { minHeight: 72, textAlignVertical: "top", paddingTop: 12 }]}
      />

      <Label style={{ marginTop: S.lg }}>City</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: S.sm, marginHorizontal: -S.lg }} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.lg }}>
        {CITIES.map((c) => {
          const active = c.name === city;
          return (
            <Pressable
              key={c.name}
              onPress={() => {
                hapticSelection();
                setCity(c.name);
              }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && { color: C.accentText }]}>{c.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Label style={{ marginTop: S.lg }}>Daily step goal</Label>
      <Row style={{ marginTop: S.sm, justifyContent: "space-between" }}>
        <Pressable onPress={() => nudgeGoal(-1000)} style={styles.stepper} accessibilityLabel="Lower goal">
          <Minus size={18} color={C.text} />
        </Pressable>
        <Row gap={6}>
          <Footprints size={18} color={C.accent} />
          <Text style={{ color: C.text, fontFamily: F.display, fontSize: 26 }}>{formatNumber(goal)}</Text>
        </Row>
        <Pressable onPress={() => nudgeGoal(1000)} style={styles.stepper} accessibilityLabel="Raise goal">
          <Plus size={18} color={C.text} />
        </Pressable>
      </Row>

      <Button
        title={dirty ? "Save changes" : "Saved"}
        disabled={!dirty || !name.trim()}
        loading={save.isPending}
        onPress={() => save.mutate({ name: name.trim(), bio: bio.trim(), city, dailyGoal: goal })}
        style={{ marginTop: S.xl }}
        full
      />
    </Card>
  );
}

// ── Developer tools (debug builds only) ──────────────────────────────────────

function DevTools({ onReset }) {
  const addSteps = useEngineMutation(engine.devAddSteps, { onSuccess: () => hapticSuccess() });
  const fill = useEngineMutation(engine.devFillHistory, {
    onSuccess: () => {
      hapticSuccess();
      Alert.alert("Done", "Two weeks of step history added. Days that already had steps were left alone.");
    },
  });
  return (
    <>
      <SectionLabel>Developer</SectionLabel>
      <Card>
        <Body dim size={13}>Only in debug builds. Handy on simulators without a step counter.</Body>
        <View style={{ gap: S.sm, marginTop: S.lg }}>
          <Button title="Add 1,500 steps" icon={Footprints} variant="secondary" loading={addSteps.isPending} onPress={() => addSteps.mutate(1500)} full />
          <Button title="Fill 2 weeks of history" icon={History} variant="secondary" loading={fill.isPending} onPress={() => fill.mutate(13)} full />
          <Button title="Reset everything" icon={RotateCcw} variant="danger" onPress={onReset} full />
        </View>
      </Card>
    </>
  );
}

// ── Bits ──────────────────────────────────────────────────────────────────────

const SectionLabel = ({ children }) => <Label style={{ marginTop: S.xxl, marginBottom: S.sm, marginLeft: 4 }}>{children}</Label>;

const RowIcon = ({ icon: Icon }) => (
  <View style={styles.rowIcon}>
    <Icon size={18} color={C.accent} />
  </View>
);

const ToggleRow = ({ icon, title, hint, value, onChange }) => (
  <Row gap={S.md}>
    {icon ? <RowIcon icon={icon} /> : null}
    <View style={{ flex: 1 }}>
      <Text style={styles.rowTitle}>{title}</Text>
      {hint ? <Body mute size={12} style={{ marginTop: 2 }}>{hint}</Body> : null}
    </View>
    <Switch
      value={!!value}
      onValueChange={(v) => {
        hapticSelection();
        onChange(v);
      }}
      trackColor={{ false: C.surfaceHigh, true: C.accent }}
      thumbColor="#ffffff"
      ios_backgroundColor={C.surfaceHigh}
    />
  </Row>
);

const styles = StyleSheet.create({
  rowTitle: { color: C.text, fontSize: 15, fontWeight: "600" },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center" },
  input: { marginTop: S.sm, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceHigh, color: C.text, fontSize: 15, paddingHorizontal: 14 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.surfaceHigh, justifyContent: "center" },
  chipActive: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { color: C.text, fontSize: 13, fontWeight: "600" },
  stepper: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
});
