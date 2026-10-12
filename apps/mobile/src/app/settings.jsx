import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import {
  CalendarDays,
  ChevronRight,
  Crown,
  Eye,
  Footprints,
  Gift,
  History,
  LogOut,
  MapPin,
  Minus,
  Plus,
  Ruler,
  RotateCcw,
  ShoppingBag,
  Swords,
  Trophy,
  Users,
  Vibrate,
} from "lucide-react-native";
import { engine, useEngineMutation, useProfile, useSettings } from "@/data/hooks";
import { CITIES } from "@/constants/theme";
import { Avatar, Button, C, F, FadeIn, Header, Label, PressableScale, R, Row, S, Screen, Skeleton, TierBadge, toast } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";
import { formatNumber, tierLabel } from "@/utils/format";

const NOTIFICATION_TYPES = [
  { key: "battles", label: "Battles", hint: "Invites, results and lead changes", icon: Swords, tint: C.fire },
  { key: "crews", label: "Crews", hint: "Joins, roles and crew news", icon: Users, tint: C.pro },
  { key: "drops", label: "Drops", hint: "When a drop goes live", icon: ShoppingBag, tint: "#b48cff" },
  { key: "events", label: "Events", hint: "RSVPs and check-ins", icon: CalendarDays, tint: "#00d4aa" },
  { key: "rewards", label: "Rewards", hint: "Streaks, XP and OUT", icon: Gift, tint: C.gold },
];

// A short line confirming what a settings change did.
const describe = (patch) => {
  if (patch.units) return patch.units === "mi" ? "Distances in miles" : "Distances in kilometres";
  if ("haptics" in patch) return patch.haptics ? "Haptics on" : "Haptics off";
  if (patch.notifications) {
    const [key, on] = Object.entries(patch.notifications)[0];
    const label = NOTIFICATION_TYPES.find((t) => t.key === key)?.label || "Those";
    return `${label} alerts ${on ? "on" : "off"}`;
  }
  if (patch.privacy) {
    const [key, on] = Object.entries(patch.privacy)[0];
    if (key === "showOnLeaderboards") return on ? "You're back on the boards" : "Hidden from leaderboards";
    return on ? "People can see when you're out" : "Outside status hidden";
  }
  return "Saved";
};

export default function SettingsScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: settings } = useSettings();
  const update = useEngineMutation(engine.updateSettings, { onSuccess: (_, patch) => toast.success(describe(patch || {})) });

  if (!profile || !settings) {
    return (
      <Screen header={<Header back title="Settings" />}>
        <Skeleton height={96} radius={20} style={{ marginTop: S.md }} />
        <Skeleton width={80} height={11} style={{ marginTop: S.xxl }} />
        <Skeleton height={320} radius={20} style={{ marginTop: S.sm }} />
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
          text: title === "Log out?" ? "Log out" : "Reset",
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
      <FadeIn index={0}>
        <ProfileCard profile={profile} />
      </FadeIn>

      <FadeIn index={1}>
        <Group title="Your profile">
          <ProfileEditor profile={profile} />
        </Group>
      </FadeIn>

      <FadeIn index={2}>
        <Group title="Membership">
          <SettingRow
            icon={Crown}
            tint={C.gold}
            title={`${tierLabel(profile.tier)} plan`}
            hint={profile.tier === "free" ? "More battles, crews and XP with Pro" : "Manage your perks"}
            right={<TierBadge tier={profile.tier} />}
            onPress={() => router.push("/membership")}
          />
        </Group>
      </FadeIn>

      <FadeIn index={3}>
        <Group title="Preferences">
          <SettingRow icon={Ruler} title="Distance units" right={<UnitToggle value={settings.units} onChange={(units) => set({ units })} />} />
          <SettingRow icon={Vibrate} title="Haptics" hint="Little taps when you press things" right={<Toggle value={settings.haptics} onChange={(haptics) => set({ haptics })} />} />
        </Group>
      </FadeIn>

      <FadeIn index={4}>
        <Group title="Notifications" footer="Alerts you turn off won't show up in your notifications either.">
          {NOTIFICATION_TYPES.map((t) => (
            <SettingRow
              key={t.key}
              icon={t.icon}
              tint={t.tint}
              title={t.label}
              hint={t.hint}
              right={<Toggle value={settings.notifications[t.key] !== false} onChange={(v) => set({ notifications: { [t.key]: v } })} />}
            />
          ))}
        </Group>
      </FadeIn>

      <FadeIn index={5}>
        <Group title="Privacy">
          <SettingRow
            icon={Trophy}
            title="Show me on leaderboards"
            hint="Off keeps you out of city, global and friends rankings"
            right={<Toggle value={settings.privacy.showOnLeaderboards} onChange={(v) => set({ privacy: { showOnLeaderboards: v } })} />}
          />
          <SettingRow
            icon={Eye}
            title="Show when I'm outside"
            hint="Lets people see you in Outside now"
            right={<Toggle value={settings.privacy.showOutsideStatus} onChange={(v) => set({ privacy: { showOutsideStatus: v } })} />}
          />
        </Group>
      </FadeIn>

      {__DEV__ ? <DevTools onReset={() => resetEverything("Reset everything?")} /> : null}

      <Group title="Account" footer="There are no accounts on a server yet, so logging out wipes this phone's data.">
        <SettingRow icon={LogOut} title="Log out" danger onPress={() => resetEverything("Log out?")} />
      </Group>

      <Text style={styles.version}>OUTHERE  ·  BUILD 0.1</Text>
    </Screen>
  );
}

// ── Profile ───────────────────────────────────────────────────────────────────

function ProfileCard({ profile }) {
  return (
    <Row gap={S.lg} style={[styles.group, { padding: S.lg, marginTop: S.sm }]}>
      <Avatar uri={profile.avatar} name={profile.name || profile.username} colour={profile.color} size={60} ring={profile.color || C.accent} />
      <View style={{ flex: 1 }}>
        <Text style={styles.profileName} numberOfLines={1}>{profile.name || profile.username}</Text>
        <Text style={styles.profileHandle} numberOfLines={1}>@{profile.username}</Text>
        <Row gap={6} style={{ marginTop: 6 }}>
          <MapPin size={12} color={C.textMute} />
          <Text style={styles.profileMeta}>{profile.city}</Text>
          <Text style={styles.profileMeta}>·</Text>
          <Text style={styles.profileMeta}>Level {profile.level?.level ?? 1}</Text>
        </Row>
      </View>
      <TierBadge tier={profile.tier} />
    </Row>
  );
}

function ProfileEditor({ profile }) {
  const [name, setName] = useState(profile.name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [city, setCity] = useState(profile.city);
  const [goal, setGoal] = useState(profile.dailyGoal || 10000);
  const save = useEngineMutation(engine.updateProfile, { success: "Profile saved" });

  // Pick up changes made elsewhere (e.g. after a reset).
  useEffect(() => {
    setName(profile.name || "");
    setBio(profile.bio || "");
    setCity(profile.city);
    setGoal(profile.dailyGoal || 10000);
  }, [profile.name, profile.bio, profile.city, profile.dailyGoal]);

  const dirty = name.trim() !== (profile.name || "") || bio.trim() !== (profile.bio || "") || city !== profile.city || goal !== profile.dailyGoal;
  const nudgeGoal = (delta) => setGoal((g) => Math.min(50000, Math.max(2000, g + delta)));

  return (
    <View style={{ padding: S.lg }}>
      <Label>Display name</Label>
      <TextInput value={name} onChangeText={setName} maxLength={30} placeholder="Your name" placeholderTextColor={C.textMute} style={styles.input} />

      <Label style={{ marginTop: S.lg }}>Bio</Label>
      <TextInput
        value={bio}
        onChangeText={setBio}
        maxLength={140}
        multiline
        placeholder="Where you move, how you move"
        placeholderTextColor={C.textMute}
        style={[styles.input, { minHeight: 76, textAlignVertical: "top", paddingTop: 12 }]}
      />

      <Label style={{ marginTop: S.lg }}>City</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: S.sm, marginHorizontal: -S.lg }} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.lg }}>
        {CITIES.map((c) => {
          const active = c.name === city;
          return (
            <PressableScale key={c.name} onPress={() => setCity(c.name)} scaleTo={0.92} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && { color: C.accent }]}>{c.name}</Text>
            </PressableScale>
          );
        })}
      </ScrollView>

      <Label style={{ marginTop: S.lg }}>Daily step goal</Label>
      <Row style={styles.goalRow}>
        <PressableScale onPress={() => nudgeGoal(-1000)} scaleTo={0.88} style={styles.stepper} accessibilityLabel="Lower goal">
          <Minus size={18} color={C.text} />
        </PressableScale>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.goalValue}>{formatNumber(goal)}</Text>
          <Text style={styles.goalHint}>steps a day</Text>
        </View>
        <PressableScale onPress={() => nudgeGoal(1000)} scaleTo={0.88} style={styles.stepper} accessibilityLabel="Raise goal">
          <Plus size={18} color={C.text} />
        </PressableScale>
      </Row>

      <Button
        title={dirty ? "Save changes" : "All saved"}
        variant={dirty ? "primary" : "secondary"}
        disabled={!dirty || !name.trim()}
        loading={save.isPending}
        onPress={() => save.mutate({ name: name.trim(), bio: bio.trim(), city, dailyGoal: goal })}
        style={{ marginTop: S.xl }}
        full
      />
    </View>
  );
}

// ── Developer tools (debug builds only) ──────────────────────────────────────

function DevTools({ onReset }) {
  const addSteps = useEngineMutation(engine.devAddSteps, { success: (r) => `${formatNumber(r?.steps || 0)} steps today` });
  const fill = useEngineMutation(engine.devFillHistory, { success: "Two weeks of history added" });
  return (
    <Group title="Developer" footer="Debug builds only. Handy on simulators without a step counter. Days that already had steps are left alone.">
      <SettingRow icon={Footprints} tint={C.accent} title="Add 1,500 steps" busy={addSteps.isPending} onPress={() => addSteps.mutate(1500)} chevron={false} right={<Text style={styles.devTag}>+1.5k</Text>} />
      <SettingRow icon={History} tint={C.pro} title="Fill 2 weeks of history" busy={fill.isPending} onPress={() => fill.mutate(13)} chevron={false} />
      <SettingRow icon={RotateCcw} title="Reset everything" danger onPress={onReset} chevron={false} />
    </Group>
  );
}

// ── Building blocks ───────────────────────────────────────────────────────────

function Group({ title, footer, children }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ marginTop: S.xxl }}>
      {title ? <Label style={{ marginBottom: S.sm, marginLeft: 4 }}>{title}</Label> : null}
      <View style={styles.group}>
        {rows.map((child, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <View style={styles.sep} /> : null}
            {child}
          </React.Fragment>
        ))}
      </View>
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

function SettingRow({ icon: Icon, tint = C.textDim, title, hint, right, onPress, danger, chevron = true, busy }) {
  const colour = danger ? C.danger : tint;
  const body = (
    <Row gap={S.md} style={[styles.row, busy && { opacity: 0.5 }]}>
      {Icon ? (
        <View style={[styles.rowIcon, { backgroundColor: danger ? C.dangerDim : tint === C.textDim ? "rgba(255,255,255,0.07)" : `${tint}1f` }]}>
          <Icon size={17} color={colour} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, danger && { color: C.danger }]}>{title}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      {right}
      {onPress && chevron ? <ChevronRight size={18} color={C.textMute} /> : null}
    </Row>
  );
  if (!onPress) return body;
  return (
    <PressableScale onPress={onPress} disabled={busy} scaleTo={0.985}>
      {body}
    </PressableScale>
  );
}

const Toggle = ({ value, onChange }) => (
  <Switch
    value={!!value}
    onValueChange={(v) => {
      hapticSelection();
      onChange(v);
    }}
    trackColor={{ false: C.surfaceHigh, true: C.accent }}
    thumbColor="#ffffff"
    ios_backgroundColor={C.surfaceHigh}
    activeThumbColor="#ffffff"
  />
);

function UnitToggle({ value, onChange }) {
  return (
    <Row gap={2} style={styles.units}>
      {[
        { v: "km", label: "km" },
        { v: "mi", label: "mi" },
      ].map((o) => {
        const active = value === o.v;
        return (
          <PressableScale key={o.v} onPress={() => !active && onChange(o.v)} scaleTo={0.92} style={[styles.unit, active && styles.unitActive]}>
            <Text style={[styles.unitText, active && { color: C.accentText }]}>{o.label}</Text>
          </PressableScale>
        );
      })}
    </Row>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: R.lg, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, overflow: "hidden" },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginLeft: 64 },
  footer: { color: C.textMute, fontSize: 12, lineHeight: 17, marginTop: S.sm, marginHorizontal: 4 },
  row: { minHeight: 60, paddingVertical: S.md, paddingHorizontal: S.lg },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowTitle: { color: C.text, fontSize: 15, fontWeight: "600" },
  rowHint: { color: C.textMute, fontSize: 12, lineHeight: 16, marginTop: 2 },
  profileName: { color: C.text, fontFamily: F.display, fontSize: 22, letterSpacing: -0.3 },
  profileHandle: { color: C.textDim, fontSize: 14, marginTop: 1 },
  profileMeta: { color: C.textMute, fontSize: 12, fontWeight: "600" },
  input: { marginTop: S.sm, minHeight: 48, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg, color: C.text, fontSize: 15, paddingHorizontal: 14 },
  chip: { height: 38, paddingHorizontal: 16, borderRadius: R.full, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg, justifyContent: "center" },
  chipActive: { backgroundColor: C.accentDim, borderColor: C.accent },
  chipText: { color: C.textDim, fontSize: 13, fontWeight: "700" },
  goalRow: { marginTop: S.sm, justifyContent: "space-between", padding: S.sm, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  goalValue: { color: C.text, fontFamily: F.display, fontSize: 28, letterSpacing: -0.5 },
  goalHint: { color: C.textMute, fontSize: 11, fontWeight: "600" },
  stepper: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
  units: { padding: 3, borderRadius: R.full, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  unit: { minWidth: 44, height: 32, borderRadius: R.full, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  unitActive: { backgroundColor: C.accent },
  unitText: { color: C.textDim, fontSize: 13, fontWeight: "800" },
  devTag: { color: C.accent, fontFamily: F.displayMedium, fontSize: 14 },
  version: { color: C.textMute, fontSize: 11, fontWeight: "700", letterSpacing: 1.6, textAlign: "center", marginTop: S.xxl },
});
