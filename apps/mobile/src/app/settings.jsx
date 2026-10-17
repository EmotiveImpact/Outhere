// Settings: your profile on top, then what pings you, units, sound and haptics
// and voice cues, a text size you can drag, then privacy, the inbox and where
// your steps come from, and previews of the watch, widgets and lock screen.
// Everything saves as you change it.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Slider from "@react-native-community/slider";
import { Bell, BellRing, Crown, Footprints, Lock, LogOut, Navigation, ScanFace, Shield, Sparkles, Watch, Zap } from "@/components/ui/icons";
import { engine, isRemote, useAccount, useEngineMutation, useProfile, useSettings, useUpdateSettings } from "@/data/hooks";
import { pingsOn } from "@/data/account";
import { LinearGradient } from "expo-linear-gradient";
import { Avatar, C, F, FadeIn, FINISH, R, S, Screen, Skeleton, Surface } from "@/components/ui";
import { StackTabBar } from "@/components/AppTabBar";
import { Group, MiniSegment, Row, Toggle, TopBar, confirmAsk } from "@/components/account/parts";
import { formatNumber, tierLabel } from "@/utils/format";
import { PREVIEW } from "@/constants/preview";

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
    <View style={{ flex: 1, backgroundColor: C.bg }}>
    <Screen tab header={<TopBar title="Settings" />} contentStyle={{ gap: 12, paddingTop: 6, paddingHorizontal: 18 }} padded={false}>
      <FadeIn index={0}>
        <Surface onPress={() => router.push("/settings/profile")} radius={20} padding={null} contentStyle={styles.profile} accessibilityLabel="Edit your profile">
          <Avatar uri={profile.avatar} runner={profile?.runner} runnerFigure={profile?.runnerFigure} name={profile.name || profile.username} tier={profile.tier} size={46} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {profile.name || profile.username}
            </Text>
            <Text style={styles.handle} numberOfLines={1}>
              @{profile.username}
              {where ? ` · ${where}` : ""}
            </Text>
          </View>
          <TierChip tier={profile.tier} />
        </Surface>
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
          <Row icon={Watch} title="Watch, widgets and lock screen" hint="Previews of what's coming to your watch and lock screen." onPress={() => router.push("/previews")} />
          <Row icon={Sparkles} title="The lush layer" hint="Shaders, haptics, rolling numbers and 3D, on one page." onPress={() => router.push("/lush")} />
        </Group>
      </FadeIn>

      <FadeIn index={4}>
        <Group>
          <Row icon={Crown} title="Membership" value={tierLabel(profile.tier)} onPress={() => router.push("/membership")} />
          <Row icon={ScanFace} title="Fighter Pack" value={profile.fighter?.vs ? "Made" : null} hint="Your AI pictures for battles and your profile. Delete them any time." onPress={() => router.push("/pack")} />
          {account?.isMinor ? <Row icon={Shield} title="Under 18 mode" value="On" onPress={() => router.push("/settings/teen")} /> : null}
          <Row icon={LogOut} title="Log out" danger onPress={logOut} chevron={false} />
        </Group>
      </FadeIn>

      {PREVIEW ? <DevTools /> : null}

      <Text style={styles.version}>Outhere build 0.1</Text>
    </Screen>
    {/* The prototype draws Settings with the tab bar, Profile lit. */}
    <StackTabBar current="profile" />
    </View>
  );
}

// .tierchip: PRO on the act gradient, BLACK on gunmetal. Free shows nothing.
function TierChip({ tier }) {
  if (!tier || tier === "free") return null;
  const black = tier === "black";
  return (
    <View style={[styles.chip, { boxShadow: black ? "inset 0 0 0 1px rgba(255,255,255,0.18)" : "inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 14px -4px rgba(61,139,255,0.8)" }]}>
      <LinearGradient colors={black ? ["#15181d", "#5d6570", "#15181d"] : FINISH.act} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 7 }]} />
      <Text style={styles.chipText}>{black ? "BLACK" : "PRO"}</Text>
    </View>
  );
}

// Drag to pick a size. It saves when you let go, and the line under it shows
// how text reads at that size.
function TextSize({ value = 1, onChange }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <Surface radius={20} padding={null} contentStyle={styles.sizeCard}>
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
      <Text style={[styles.sizePreview, { fontSize: 13 * v, lineHeight: 19 * v }]}>8,412 steps today. Kemi is 300 ahead.</Text>
    </Surface>
  );
}

// Debug builds only. Handy on simulators without a step counter.
function DevTools() {
  const router = useRouter();
  const addSteps = useEngineMutation(engine.devAddSteps, { success: (r) => `${formatNumber(r?.steps || 0)} steps today` });
  const fill = useEngineMutation(engine.devFillHistory, { success: "Two weeks of history added" });
  const livedIn = useEngineMutation(engine.devLivedIn, { success: "Alex's lived-in day is set" });
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
        {!isRemote ? <Row title="Lived-in day, as in the prototype" onPress={() => livedIn.mutate()} chevron={false} /> : null}
        <Row title="Reset everything" danger onPress={reset} chevron={false} />
      </Group>
      <Text style={styles.devNote}>Days that already had steps are left alone.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingVertical: 5, paddingHorizontal: 9, borderRadius: 7, overflow: "hidden" },
  chipText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 10, lineHeight: 11, letterSpacing: 1 },
  // .card.meline
  profile: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 13, paddingBottom: 13, paddingLeft: 14, paddingRight: 14 },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  handle: { color: C.textDim, fontFamily: F.body, fontSize: 11.5, marginTop: 2 },
  sizeCard: { paddingTop: 13, paddingBottom: 10, paddingLeft: 14, paddingRight: 14 },
  sizeHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sizeTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5 },
  sizeValue: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  sizeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  sizeA: { color: C.text, fontFamily: F.bodySemi },
  sizePreview: { color: C.textSoft, fontFamily: F.body, marginTop: 2 },
  devTitle: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 13, marginTop: S.lg, marginLeft: 4 },
  devNote: { color: C.textMute, fontFamily: F.body, fontSize: 12, marginLeft: 4 },
  version: { color: C.textMute, fontFamily: F.body, fontSize: 12, textAlign: "center", marginTop: S.xl },
});
