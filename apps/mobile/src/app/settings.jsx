// Settings: your profile on top, then what pings you, units, sound and haptics
// and voice cues, a text size you can drag, then privacy, the inbox and where
// your steps come from. Everything saves as you change it.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Slider from "@react-native-community/slider";
import { Bell, BellRing, Crown, Footprints, Lock, LogOut, Navigation, Shield, Zap } from "lucide-react-native";
import { engine, isRemote, useAccount, useEngineMutation, useProfile, useSettings, useUpdateSettings } from "@/data/hooks";
import { pingsOn } from "@/data/account";
import { Avatar, C, F, FadeIn, PressableScale, R, S, Screen, Skeleton, TierBadge } from "@/components/ui";
import { Group, MiniSegment, Row, Toggle, TopBar, confirmAsk } from "@/components/account/parts";
import { formatNumber, tierLabel } from "@/utils/format";

const SOURCE_NAMES = { phone: "This phone", apple_health: "Apple Health", health_connect: "Health Connect", garmin: "Garmin", strava: "Strava" };

const TEXT_SIZES = [
  [0.9, "Smaller"],
  [1, "Default"],
  [1.1, "Larger"],
  [1.2, "Larger still"],
  [1.3, "Largest"],
];
const sizeName = (v) => TEXT_SIZES.reduce((best, s) => (Math.abs(s[0] - v) < Math.abs(best[0] - v) ? s : best))[1];

export default function SettingsScreen() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: settings } = useSettings();
  const { data: account } = useAccount();
  const update = useUpdateSettings();

  if (!profile || !settings) {
    return (
      <Screen header={<TopBar title="Settings" />}>
        <Skeleton height={74} radius={R.lg} style={{ marginTop: S.sm }} />
        <Skeleton height={200} radius={R.lg} style={{ marginTop: S.md }} />
        <Skeleton height={80} radius={R.lg} style={{ marginTop: S.md }} />
        <Skeleton height={150} radius={R.lg} style={{ marginTop: S.md }} />
      </Screen>
    );
  }

  const set = (patch) => update.mutate(patch);

  const logOut = async () => {
    const yes = await confirmAsk({
      title: "Log out?",
      body: isRemote
        ? "Sign back in with Apple, Google or your email. Your streak, XP and crews stay safe on your account."
        : "Your Outhere data lives only on this phone for now. Logging out wipes your profile, steps, streak, XP and OUT for good.",
      ok: "Log out",
      danger: true,
    });
    if (!yes) return;
    await engine.resetAll();
    router.replace("/welcome");
  };

  const where = [profile.area, profile.city].filter(Boolean)[0];

  return (
    <Screen header={<TopBar title="Settings" />} contentStyle={{ gap: S.md, paddingTop: S.sm }}>
      <FadeIn index={0}>
        <PressableScale onPress={() => router.push("/settings/profile")} scaleTo={0.98} style={styles.profile} accessibilityLabel="Edit your profile">
          <Avatar uri={profile.avatar} name={profile.name || profile.username} tier={profile.tier} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.name || profile.username}
            </Text>
            <Text style={styles.handle} numberOfLines={1}>
              @{profile.username}
              {where ? ` · ${where}` : ""}
            </Text>
          </View>
          <TierBadge tier={profile.tier} />
        </PressableScale>
      </FadeIn>

      <FadeIn index={1}>
        <Group>
          <Row icon={Bell} title="What pings you" value={`${pingsOn(settings)} on`} onPress={() => router.push("/settings/pings")} />
          <Row
            icon={Navigation}
            title="Distance"
            right={
              <MiniSegment
                options={[
                  { value: "km", label: "km" },
                  { value: "mi", label: "miles" },
                ]}
                value={settings.units}
                onChange={(units) => set({ units })}
              />
            }
          />
          <Row icon={Zap} title="Sound and haptics" onPress={() => router.push("/settings/sounds")} />
          <Row icon={BellRing} title="Voice cues on runs" right={<Toggle value={settings.voiceCues} onChange={(voiceCues) => set({ voiceCues })} label="Voice cues on runs" />} />
        </Group>
      </FadeIn>

      <FadeIn index={2}>
        <TextSize value={settings.textScale} onChange={(textScale) => set({ textScale })} />
      </FadeIn>

      <FadeIn index={3}>
        <Group>
          <Row icon={Lock} title="Privacy" value={settings.privacy.ghost ? "Ghost" : null} onPress={() => router.push("/settings/privacy")} />
          <Row icon={Bell} title="Notifications" onPress={() => router.push("/notifications")} />
          <Row icon={Footprints} title="Step source" value={SOURCE_NAMES[settings.stepSource] || "This phone"} onPress={() => router.push("/settings/health")} />
        </Group>
      </FadeIn>

      <FadeIn index={4}>
        <Group>
          <Row icon={Crown} title="Membership" value={tierLabel(profile.tier)} onPress={() => router.push("/membership")} />
          {account?.isMinor ? <Row icon={Shield} title="Under 18 mode" value="On" onPress={() => router.push("/settings/teen")} /> : null}
          <Row icon={LogOut} title="Log out" danger onPress={logOut} chevron={false} />
        </Group>
      </FadeIn>

      {__DEV__ ? <DevTools /> : null}

      <Text style={styles.version}>Outhere build 0.1</Text>
    </Screen>
  );
}

// Drag to pick a size. It saves when you let go, and the line under it shows
// how text reads at that size.
function TextSize({ value = 1, onChange }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <View style={styles.sizeCard}>
      <View style={styles.sizeHead}>
        <Text style={styles.sizeTitle}>Text size</Text>
        <Text style={styles.sizeValue}>{sizeName(v)}</Text>
      </View>
      <View style={styles.sizeRow}>
        <Text style={[styles.sizeA, { fontSize: 13 }]}>A</Text>
        <Slider
          style={{ flex: 1, height: 36 }}
          minimumValue={0.9}
          maximumValue={1.3}
          step={0.1}
          value={value}
          onValueChange={(x) => setV(Math.round(x * 10) / 10)}
          onSlidingComplete={(x) => onChange(Math.round(x * 10) / 10)}
          minimumTrackTintColor={C.accent}
          maximumTrackTintColor="#262b35"
          thumbTintColor="#ffffff"
          accessibilityLabel="Text size"
        />
        <Text style={[styles.sizeA, { fontSize: 22 }]}>A</Text>
      </View>
      <Text style={[styles.sizePreview, { fontSize: 14 * v, lineHeight: 20 * v }]}>8,412 steps today. Kemi is 300 ahead.</Text>
    </View>
  );
}

// Debug builds only. Handy on simulators without a step counter.
function DevTools() {
  const router = useRouter();
  const addSteps = useEngineMutation(engine.devAddSteps, { success: (r) => `${formatNumber(r?.steps || 0)} steps today` });
  const fill = useEngineMutation(engine.devFillHistory, { success: "Two weeks of history added" });
  const reset = async () => {
    if (!(await confirmAsk({ title: "Reset everything?", body: "This wipes this phone's Outhere data.", ok: "Reset", danger: true }))) return;
    await engine.resetAll();
    router.replace("/welcome");
  };
  return (
    <View style={{ gap: S.sm }}>
      <Text style={styles.devTitle}>Developer</Text>
      <Group>
        <Row title="Add 1,500 steps" onPress={() => addSteps.mutate(1500)} chevron={false} value="+1.5k" />
        <Row title="Fill 2 weeks of history" onPress={() => fill.mutate(13)} chevron={false} />
        <Row title="Reset everything" danger onPress={reset} chevron={false} />
      </Group>
      <Text style={styles.devNote}>Days that already had steps are left alone.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: "row", alignItems: "center", gap: 14, padding: S.lg, borderRadius: R.lg, backgroundColor: C.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 17 },
  handle: { color: C.textDim, fontFamily: F.body, fontSize: 13, marginTop: 2 },
  sizeCard: { borderRadius: R.lg, backgroundColor: C.surface, padding: S.lg, paddingBottom: S.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  sizeHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sizeTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  sizeValue: { color: C.textDim, fontFamily: F.body, fontSize: 13 },
  sizeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  sizeA: { color: C.text, fontFamily: F.bodySemi },
  sizePreview: { color: C.textSoft, fontFamily: F.body, marginTop: 2 },
  devTitle: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 13, marginTop: S.lg, marginLeft: 4 },
  devNote: { color: C.textMute, fontFamily: F.body, fontSize: 12, marginLeft: 4 },
  version: { color: C.textMute, fontFamily: F.body, fontSize: 12, textAlign: "center", marginTop: S.xl },
});
