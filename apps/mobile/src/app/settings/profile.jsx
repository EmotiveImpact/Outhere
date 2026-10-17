// Your profile: photo, name, username (checked as you type), bio and daily
// goal, plus your patch and your date of birth.

import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { CalendarDays, Camera, Check, MapPin, Minus, Plus } from "@/components/ui/icons";
import { engine, useAccount, useEngineMutation, useProfile } from "@/data/hooks";
import { birthDateProblem } from "@/data/account";
import { Avatar, Button, C, F, FadeIn, PressableScale, R, S, Screen, Skeleton, toast } from "@/components/ui";
import { Group, Row, TopBar, accountStyles } from "@/components/account/parts";
import { pickAvatarPhoto } from "@/services/photo";
import { RunnerChoice } from "@/components/pack/RunnerChoice";
import { formatNumber } from "@/utils/format";

const pad2 = (s) => (String(s).length === 1 ? `0${s}` : String(s));
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const niceDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

export default function ProfileSettings() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: account } = useAccount();

  if (!profile) {
    return (
      <Screen header={<TopBar title="Your profile" />}>
        <Skeleton width={96} height={96} radius={48} style={{ alignSelf: "center", marginTop: S.lg }} />
        <Skeleton height={300} radius={R.lg} style={{ marginTop: S.xl }} />
      </Screen>
    );
  }

  return (
    <Screen header={<TopBar title="Your profile" />} contentStyle={{ gap: S.md, paddingTop: S.sm }}>
      <FadeIn index={0}>
        <Photo profile={profile} />
      </FadeIn>
      <FadeIn index={1}>
        <Editor profile={profile} />
      </FadeIn>
      <FadeIn index={2}>
        <Runner profile={profile} />
      </FadeIn>
      <FadeIn index={3}>
        <Group>
          <Row icon={MapPin} title="Your patch" value={[profile.area, profile.city].filter(Boolean).join(", ") || "Pick one"} onPress={() => router.push("/settings/patch")} />
          {account?.birthDate ? <Row icon={CalendarDays} title="Date of birth" value={niceDate(account.birthDate)} hint="Support can correct it if it's wrong" /> : null}
        </Group>
      </FadeIn>
      {account && !account.birthDate ? (
        <FadeIn index={4}>
          <BirthDate />
        </FadeIn>
      ) : null}
    </Screen>
  );
}

function Photo({ profile }) {
  const save = useEngineMutation(engine.setAvatar, { success: "Photo updated" });
  const pick = async () => {
    try {
      const uri = await pickAvatarPhoto();
      if (uri) save.mutate(uri);
    } catch {
      toast("No photo", "We couldn't open your photos.");
    }
  };
  return (
    <PressableScale onPress={pick} scaleTo={0.96} style={{ alignSelf: "center", alignItems: "center" }} accessibilityLabel="Change photo">
      <View>
        <Avatar uri={profile.avatar} runner={profile?.runner} runnerFigure={profile?.runnerFigure} name={profile.name || profile.username} tier={profile.tier} size={96} />
        <View style={styles.cam}>{save.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Camera size={15} color="#fff" />}</View>
      </View>
      <Text style={styles.change}>Change photo</Text>
    </PressableScale>
  );
}

// Saves as soon as it changes; the silhouette updates everywhere at once.
function Runner({ profile }) {
  const save = useEngineMutation(engine.setRunner);
  const [value, setValue] = useState({ runner: profile.runner || "either", runnerFigure: profile.runnerFigure || "man" });
  useEffect(() => {
    setValue({ runner: profile.runner || "either", runnerFigure: profile.runnerFigure || "man" });
  }, [profile.runner, profile.runnerFigure]);
  return (
    <View style={[accountStyles.field, { paddingBottom: 14 }]}>
      <Text style={[accountStyles.fieldLabel, { marginBottom: 10 }]}>Your runner</Text>
      <RunnerChoice
        value={value}
        onChange={(v) => {
          setValue(v);
          save.mutate(v);
        }}
      />
    </View>
  );
}

function Editor({ profile }) {
  const [name, setName] = useState(profile.name || "");
  const [username, setUsername] = useState(profile.username || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [goal, setGoal] = useState(profile.dailyGoal || 10000);
  const [check, setCheck] = useState({ state: "same" });
  const req = useRef(0);
  const save = useEngineMutation(engine.updateProfile, { success: "Profile saved" });

  useEffect(() => {
    setName(profile.name || "");
    setUsername(profile.username || "");
    setBio(profile.bio || "");
    setGoal(profile.dailyGoal || 10000);
  }, [profile.name, profile.username, profile.bio, profile.dailyGoal]);

  useEffect(() => {
    const value = username.trim().toLowerCase();
    if (value === profile.username) return setCheck({ state: "same" });
    setCheck({ state: "checking" });
    const id = ++req.current;
    const t = setTimeout(async () => {
      try {
        const res = await engine.checkUsername(value);
        if (id === req.current) setCheck(res.available ? { state: "ok" } : { state: "bad", reason: res.reason });
      } catch (e) {
        if (id === req.current) setCheck({ state: "bad", reason: e?.message });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [username, profile.username]);

  const nameChanged = username.trim().toLowerCase() !== profile.username;
  const dirty = name.trim() !== (profile.name || "") || bio.trim() !== (profile.bio || "") || goal !== profile.dailyGoal || nameChanged;
  const ok = !!name.trim() && (check.state === "same" || check.state === "ok");
  const nudge = (d) => setGoal((g) => Math.min(50000, Math.max(2000, g + d)));

  return (
    <View style={{ gap: 10 }}>
      <View style={accountStyles.field}>
        <Text style={accountStyles.fieldLabel}>Name</Text>
        <TextInput value={name} onChangeText={setName} maxLength={30} placeholder="Your name" placeholderTextColor={C.textMute} style={accountStyles.input} />
      </View>
      <View style={[accountStyles.field, check.state === "bad" && { borderColor: C.danger }]}>
        <Text style={accountStyles.fieldLabel}>Username</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={[accountStyles.input, { color: C.textDim, marginRight: 1 }]}>@</Text>
          <TextInput value={username} onChangeText={(v) => setUsername(v.replace(/\s/g, ""))} maxLength={20} autoCapitalize="none" autoCorrect={false} style={[accountStyles.input, { flex: 1, minWidth: 0 }]} />
          {check.state === "checking" ? <ActivityIndicator size="small" color={C.textDim} /> : check.state === "ok" ? <Check size={18} color={C.accent} /> : null}
        </View>
        {check.state === "bad" ? <Text style={styles.bad}>{check.reason}</Text> : check.state === "ok" ? <Text style={styles.good}>That one's yours</Text> : null}
      </View>
      <View style={accountStyles.field}>
        <Text style={accountStyles.fieldLabel}>Bio</Text>
        <TextInput value={bio} onChangeText={setBio} maxLength={140} multiline placeholder="Where you move, how you move" placeholderTextColor={C.textMute} style={[accountStyles.input, { minHeight: 48, fontFamily: F.body, fontSize: 15 }]} />
      </View>
      <View style={[accountStyles.field, styles.goal]}>
        <View style={{ flex: 1 }}>
          <Text style={accountStyles.fieldLabel}>Daily goal</Text>
          <Text style={styles.goalValue}>{formatNumber(goal)} steps</Text>
        </View>
        <PressableScale onPress={() => nudge(-1000)} scaleTo={0.88} style={styles.stepper} accessibilityLabel="Lower goal">
          <Minus size={18} color={C.text} />
        </PressableScale>
        <PressableScale onPress={() => nudge(1000)} scaleTo={0.88} style={styles.stepper} accessibilityLabel="Raise goal">
          <Plus size={18} color={C.text} />
        </PressableScale>
      </View>
      <Button
        title={dirty ? "Save changes" : "All saved"}
        variant={dirty ? "primary" : "secondary"}
        disabled={!dirty || !ok}
        loading={save.isPending}
        onPress={() => save.mutate({ name: name.trim(), bio: bio.trim(), dailyGoal: goal, ...(nameChanged ? { username: username.trim().toLowerCase() } : {}) })}
        full
        style={{ marginTop: S.xs }}
      />
    </View>
  );
}

// Members from before dates of birth were asked can add theirs once.
function BirthDate() {
  const [d, setD] = useState("");
  const [m, setM] = useState("");
  const [y, setY] = useState("");
  const iso = d && m && y.length === 4 ? `${y}-${pad2(m)}-${pad2(d)}` : null;
  const problem = iso ? birthDateProblem(iso) : null;
  const save = useEngineMutation(engine.setBirthDate, { success: "Date of birth saved" });
  const box = (value, set, place, max, width) => (
    <TextInput value={value} onChangeText={(v) => set(v.replace(/\D/g, "").slice(0, max))} placeholder={place} placeholderTextColor={C.textMute} keyboardType="number-pad" maxLength={max} style={[accountStyles.input, styles.dob, { width }]} />
  );
  return (
    <View style={[accountStyles.field, { gap: 8 }]}>
      <Text style={accountStyles.fieldLabel}>Date of birth</Text>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        {box(d, setD, "DD", 2, 56)}
        {box(m, setM, "MM", 2, 56)}
        {box(y, setY, "YYYY", 4, 84)}
        <View style={{ flex: 1 }} />
        <Button title="Save" size="sm" disabled={!iso || !!problem} loading={save.isPending} onPress={() => save.mutate(iso)} />
      </View>
      <Text style={problem ? styles.bad : styles.hint}>{problem ? problem.message : "We ask once. Under 18s play with friends and clubs."}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cam: { position: "absolute", right: 0, bottom: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.bg },
  change: { color: C.accent, fontFamily: F.bodySemi, fontSize: 13, marginTop: 8 },
  bad: { color: C.danger, fontFamily: F.body, fontSize: 12, marginTop: 4 },
  good: { color: C.accentHi, fontFamily: F.body, fontSize: 12, marginTop: 4 },
  hint: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  goal: { flexDirection: "row", alignItems: "center", gap: 10 },
  goalValue: { color: C.text, fontFamily: F.display, fontSize: 24, marginTop: 2 },
  stepper: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
  dob: { textAlign: "center", backgroundColor: C.bg, borderRadius: R.sm, paddingVertical: 8 },
});
