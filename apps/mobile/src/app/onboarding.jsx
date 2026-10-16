// Getting started, in the demo's order: sign in (Apple, Google or an email
// code), make it yours (photo, name, username checked as you type, date of
// birth, who sees you on the map), your daily goal, your patch (a city or
// town, then an area in it) and one card of permissions. Nothing is saved
// until the last step, which creates the profile and applies the rest.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { Pedometer } from "expo-sensors";
import * as Notifications from "expo-notifications";
import { Bell, Camera, Check, Footprints, Lock, LocateFixed, Mail, Minus, Plus, User, X } from "lucide-react-native";
import { engine, isRemote, showEngineError, useOutsideCount } from "@/data/hooks";
import { birthDateProblem, isMinorDate } from "@/data/account";
import { BlendImage, Body, Button, C, EASE, F, FINISH, GlowBackdrop, Grain, LiveDot, PressableScale, R, Row, S, TOP_GAP, Wordmark, toast } from "@/components/ui";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { GlowHero, Group, Note, OnboardingBar, Row as SettingRow, Toggle, accountStyles } from "@/components/account/parts";
import PatchPicker, { areaWord } from "@/components/account/PatchPicker";
import { PHOTOS } from "@/constants/photos";
import { askLocation, roughPosition } from "@/services/locate";
import { pickAvatarPhoto } from "@/services/photo";
import { hapticError, hapticSelection, hapticSuccess } from "@/services/haptics";
import { RunnerChoice } from "@/components/pack/RunnerChoice";
import { formatNumber } from "@/utils/format";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STEPS = ["signin", "setup", "goal", "patch", "perms"];
const GOALS = [
  { value: 6000, label: "6k", sub: "Easy going" },
  { value: 10000, label: "10k", sub: "Active" },
  { value: 15000, label: "15k", sub: "Beast mode" },
];

const pad2 = (s) => (s.length === 1 ? `0${s}` : s);
const dobString = ({ d, m, y }) => (d && m && y.length === 4 ? `${y}-${pad2(m)}-${pad2(d)}` : null);

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [step, setStep] = useState(0);
  const [signedIn, setSignedIn] = useState(!isRemote);

  // Make it yours
  const [photo, setPhoto] = useState(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [check, setCheck] = useState({ state: "idle", reason: null });
  const [dob, setDob] = useState({ d: "", m: "", y: "" });
  const [mapVisibility, setMapVisibility] = useState("friends");
  const [runner, setRunner] = useState({ runner: "either", runnerFigure: "man" });
  // Goal
  const [goal, setGoal] = useState(10000);
  // Patch
  const [place, setPlace] = useState(null);
  const [area, setArea] = useState(null);
  const [at, setAt] = useState(null);
  const [locating, setLocating] = useState(false);
  // Permissions
  const [perms, setPerms] = useState({ location: true, motion: true, notifications: false });
  const [finishing, setFinishing] = useState(false);
  const [welcome, setWelcome] = useState(null);
  const reqId = useRef(0);

  const key = STEPS[step];

  // Already signed in on this phone (or back from Apple or Google on the web):
  // straight to setup.
  useEffect(() => {
    if (!isRemote) return;
    engine
      .signedIn()
      .then((yes) => {
        if (yes) {
          setSignedIn(true);
          setStep((s) => (s === 0 ? 1 : s));
        }
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (params?.start === "setup") setStep(1);
  }, [params?.start]);

  // Live username check, debounced.
  useEffect(() => {
    const value = username.trim();
    if (!value) {
      setCheck({ state: "idle", reason: null });
      return undefined;
    }
    setCheck({ state: "checking", reason: null });
    const id = ++reqId.current;
    const t = setTimeout(async () => {
      try {
        const res = await engine.checkUsername(value);
        if (id !== reqId.current) return;
        setCheck(res.available ? { state: "ok", reason: null } : { state: "bad", reason: res.reason });
      } catch (e) {
        if (id === reqId.current) setCheck({ state: "bad", reason: e?.message || "Couldn't check that name." });
      }
    }, 350);
    return () => clearTimeout(t);
  }, [username]);

  // A first username from the name, until they type their own.
  const touchedUsername = useRef(false);
  useEffect(() => {
    if (touchedUsername.current) return;
    const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 14);
    setUsername(base.length >= 3 ? `${base}runs`.slice(0, 20) : "");
  }, [name]);

  // If location is already allowed, start the patch from where they are.
  useEffect(() => {
    if (key !== "patch" || at) return;
    roughPosition({ ask: false }).then((p) => p && setAt(p));
  }, [key, at]);

  const locate = async () => {
    setLocating(true);
    const p = await roughPosition({ ask: true });
    setLocating(false);
    if (p) setAt(p);
    else toast("No location", "Search for your city or town instead.");
  };

  const dobValue = dobString(dob);
  const dobProblem = dobValue ? birthDateProblem(dobValue) : null;
  const minor = dobValue && !dobProblem ? isMinorDate(dobValue) : false;
  useEffect(() => {
    if (minor && mapVisibility === "everyone") setMapVisibility("friends");
  }, [minor, mapVisibility]);

  const canSetup = check.state === "ok" && !!name.trim() && !!dobValue && !dobProblem;

  const go = (n) => {
    hapticSelection();
    setStep(n);
  };
  const back = () => {
    if (step <= (signedIn && isRemote ? 1 : 0)) return router.canGoBack() ? router.back() : router.replace("/welcome");
    go(step - 1);
  };

  const pickPhoto = async () => {
    try {
      const uri = await pickAvatarPhoto();
      if (uri) setPhoto(uri);
    } catch {
      toast("No photo", "We couldn't open your photos. You can add one later in Settings.");
    }
  };

  // Ask for what they left switched on, then make the profile and apply the rest.
  const finish = async (choice = perms) => {
    setFinishing(true);
    const granted = { location: false, motion: false, notifications: false };
    if (choice.location) granted.location = at ? true : await askLocation();
    if (choice.motion && Platform.OS !== "web") {
      try {
        if (await Pedometer.isAvailableAsync()) granted.motion = (await Pedometer.requestPermissionsAsync()).status === "granted";
      } catch {}
    }
    if (choice.notifications) {
      try {
        granted.notifications = (await Notifications.requestPermissionsAsync()).status === "granted";
      } catch {}
    }
    try {
      const profile = await engine.createProfile({ username: username.trim(), city: place?.name, cityId: place?.id, dailyGoal: goal });
      const steps = [
        () => (name.trim() ? engine.updateProfile({ name: name.trim() }) : null),
        () => engine.setBirthDate(dobValue),
        () => (place ? engine.setPatch({ cityId: place.id, areaId: area?.id || null }) : null),
        () => engine.updateSettings({ privacy: { mapVisibility }, permissions: granted }),
        () => (photo ? engine.setAvatar(photo) : null),
        () => engine.setRunner(runner),
      ];
      for (const run of steps) {
        try {
          await run();
        } catch (e) {
          // The profile exists; anything that didn't stick can be fixed in Settings.
          console.warn("[onboarding]", e?.message);
        }
      }
      hapticSuccess();
      setWelcome({ ...profile, name: name.trim() || profile?.name });
    } catch (e) {
      hapticError();
      showEngineError(e);
    } finally {
      setFinishing(false);
    }
  };

  if (welcome) return <Success profile={welcome} onDone={() => router.replace("/(tabs)")} />;

  if (key === "signin") {
    return (
      <SignIn
        onDone={() => {
          setSignedIn(true);
          go(1);
        }}
        onBack={back}
      />
    );
  }

  const dash = step - 1;
  const footer = (title, onPress, disabled, loading) => (
    <View style={[styles.footer, { paddingBottom: insets.bottom + S.lg }]}>
      <Button title={title} size="lg" full disabled={disabled} loading={loading} onPress={onPress} />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="light" />
      <OnboardingBar
        index={dash}
        top={insets.top + S.sm}
        onBack={back}
        onSkip={
          key === "goal"
            ? () => go(3)
            : key === "patch" && place
              ? () => {
                  setArea(null);
                  go(4);
                }
              : key === "perms"
                ? () => {
                    const none = { location: false, motion: false, notifications: false };
                    setPerms(none);
                    finish(none);
                  }
                : null
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: S.xl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <MotiView key={key} from={{ opacity: 0, translateX: 24 }} animate={{ opacity: 1, translateX: 0 }} transition={{ type: "timing", duration: 260 }}>
          {key === "setup" ? (
            <SetupStep
              photo={photo}
              onPhoto={pickPhoto}
              name={name}
              onName={setName}
              username={username}
              onUsername={(v) => {
                touchedUsername.current = true;
                setUsername(v.replace(/\s/g, "").replace(/^@/, "").toLowerCase());
              }}
              check={check}
              dob={dob}
              onDob={setDob}
              dobProblem={dobProblem}
              minor={minor}
              mapVisibility={mapVisibility}
              onMapVisibility={setMapVisibility}
              runner={runner}
              onRunner={setRunner}
            />
          ) : null}
          {key === "goal" ? <GoalStep value={goal} onChange={setGoal} /> : null}
          {key === "patch" ? (
            <PatchStep place={place} onPlace={setPlace} area={area} onArea={setArea} at={at} locating={locating} onLocate={locate} />
          ) : null}
          {key === "perms" ? <PermsStep value={perms} onChange={setPerms} minor={minor} place={place} /> : null}
        </MotiView>
      </ScrollView>
      {key === "setup" ? footer("Let's go", () => (canSetup ? go(2) : hapticError()), !canSetup) : null}
      {key === "goal" ? footer("Continue", () => go(3)) : null}
      {key === "patch"
        ? footer(place ? `Join ${area ? area.name : place.name}` : "Pick your city or town", () => go(4), !place)
        : null}
      {key === "perms" ? footer(perms.location || perms.motion || perms.notifications ? "Allow and get out" : "Get out there", () => finish(), false, finishing) : null}
    </KeyboardAvoidingView>
  );
}

// ── Sign in ───────────────────────────────────────────────────────────────────

function SignIn({ onDone }) {
  const insets = useSafeAreaInsets();
  const outside = useOutsideCount(null);
  const count = outside.data?.count;
  const [mode, setMode] = useState("buttons"); // buttons | email | code
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(null);

  const provider = async (p) => {
    if (!isRemote) return onDone();
    setBusy(p);
    try {
      const res = await engine.signInWithProvider(p);
      if (res?.signedIn) {
        hapticSuccess();
        onDone();
      }
    } catch (e) {
      hapticError();
      toast(`${p === "apple" ? "Apple" : "Google"} sign in isn't ready`, "Use your email instead. We'll send you a code.");
      setMode("email");
      console.warn("[signin]", e?.message);
    } finally {
      setBusy(null);
    }
  };

  const sendCode = async () => {
    if (!isRemote) return onDone();
    if (!EMAIL_RE.test(email.trim())) return hapticError();
    setBusy("email");
    try {
      await engine.sendSignInCode(email);
      setMode("code");
      toast("Code sent", `Check ${email.trim()} for a 6 digit code.`);
    } catch (e) {
      hapticError();
      showEngineError(e);
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    if (code.trim().length < 6) return hapticError();
    setBusy("code");
    try {
      await engine.verifySignInCode(email, code);
      hapticSuccess();
      onDone();
    } catch (e) {
      hapticError();
      showEngineError(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.signin} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="light" />
      <Image source={PHOTOS.signin} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} accessibilityLabel="Runners crossing a bridge at dawn" />
      <LinearGradient colors={["rgba(2,5,12,0.55)", "rgba(2,5,12,0)", "rgba(2,5,12,0.2)", "rgba(2,5,12,0.85)", "#02050c"]} locations={[0, 0.2, 0.4, 0.62, 0.8]} style={StyleSheet.absoluteFill} />
      <Row style={{ paddingTop: insets.top + TOP_GAP + 2, paddingHorizontal: S.gutter, justifyContent: "space-between" }}>
        <Wordmark height={20} ink="#fff" sub="UK" />
        {mode !== "buttons" ? (
          <PressableScale onPress={() => setMode("buttons")} hitSlop={10}>
            <Text style={styles.signinLink}>Back</Text>
          </PressableScale>
        ) : null}
      </Row>
      <View style={[styles.signinBody, { paddingBottom: insets.bottom + S.xl }]}>
        <Row gap={8} style={styles.live}>
          <LiveDot size={7} />
          <Text style={styles.liveText}>
            <Text style={{ fontFamily: F.bodySemi }}>{count != null ? formatNumber(count) : "The UK"}</Text>
            {count != null ? " outside in the UK right now" : " is out right now"}
          </Text>
        </Row>
        <Text style={styles.signinHead}>Your city</Text>
        <Text style={[styles.signinHead, { color: C.accent, textShadowColor: "rgba(61,139,255,0.5)", textShadowRadius: 20 }]}>is waiting</Text>

        {mode === "buttons" ? (
          <View style={{ gap: S.md, marginTop: S.lg }}>
            <PressableScale onPress={() => provider("apple")} disabled={!!busy} scaleTo={0.97} style={[styles.provider, { backgroundColor: "#fff" }]} accessibilityLabel="Continue with Apple">
              <Lock size={16} color="#07090c" />
              <Text style={[styles.providerText, { color: "#07090c" }]}>{busy === "apple" ? "Opening Apple" : "Continue with Apple"}</Text>
            </PressableScale>
            <PressableScale onPress={() => provider("google")} disabled={!!busy} scaleTo={0.97} style={[styles.provider, styles.providerDark]} accessibilityLabel="Continue with Google">
              <User size={16} color="#fff" />
              <Text style={styles.providerText}>{busy === "google" ? "Opening Google" : "Continue with Google"}</Text>
            </PressableScale>
            <PressableScale onPress={() => (isRemote ? setMode("email") : onDone())} hitSlop={8} style={{ alignSelf: "center", paddingVertical: 6 }}>
              <Text style={styles.emailLink}>Use email instead</Text>
            </PressableScale>
            <Text style={styles.terms}>By carrying on you agree to the Terms and Privacy Policy.</Text>
          </View>
        ) : mode === "email" ? (
          <View style={{ gap: S.md, marginTop: S.lg }}>
            <Row gap={S.sm} style={styles.emailField}>
              <Mail size={18} color={C.textDim} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={C.textDim}
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                returnKeyType="send"
                onSubmitEditing={sendCode}
                accessibilityLabel="Email address"
                style={styles.emailInput}
              />
            </Row>
            <Button title="Send my code" full size="lg" loading={busy === "email"} disabled={!EMAIL_RE.test(email.trim())} onPress={sendCode} />
            <Text style={styles.terms}>No password. We email you a code, and the same address signs you in on any phone.</Text>
          </View>
        ) : (
          <View style={{ gap: S.md, marginTop: S.lg }}>
            <Row gap={S.sm} style={styles.emailField}>
              <TextInput
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 8))}
                placeholder="123456"
                placeholderTextColor={C.textDim}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                autoFocus
                onSubmitEditing={verify}
                accessibilityLabel="Sign in code"
                style={[styles.emailInput, { fontFamily: F.display, fontSize: 26, letterSpacing: 8 }]}
              />
            </Row>
            <Button title="Sign in" full size="lg" loading={busy === "code"} disabled={code.trim().length < 6} onPress={verify} />
            <PressableScale onPress={() => setMode("email")} hitSlop={8} style={{ alignSelf: "center" }}>
              <Text style={styles.terms}>Sent to {email.trim()}. Wrong address? Change it</Text>
            </PressableScale>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Make it yours ─────────────────────────────────────────────────────────────

function SetupStep({ photo, onPhoto, name, onName, username, onUsername, check, dob, onDob, dobProblem, minor, mapVisibility, onMapVisibility, runner, onRunner }) {
  const insets = useSafeAreaInsets();
  const [focus, setFocus] = useState(null);
  const mRef = useRef(null);
  const yRef = useRef(null);
  return (
    <View style={{ paddingTop: insets.top + 70, paddingHorizontal: S.gutter }}>
      <Text style={styles.head}>Make it</Text>
      <Text style={[styles.head, styles.blue]}>yours</Text>

      <View style={{ alignItems: "center", marginVertical: S.lg }}>
        <PressableScale onPress={onPhoto} scaleTo={0.96} accessibilityLabel="Add a photo" style={styles.photoRing}>
          <View style={styles.photoInner}>{photo ? <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <User size={40} color={C.textMute} />}</View>
          <View style={styles.camera}>
            <Camera size={15} color="#fff" />
          </View>
        </PressableScale>
      </View>

      <View style={{ gap: 10 }}>
        <View style={[accountStyles.field, focus === "name" && accountStyles.fieldOn]}>
          <Text style={accountStyles.fieldLabel}>Your name</Text>
          <TextInput value={name} onChangeText={onName} onFocus={() => setFocus("name")} onBlur={() => setFocus(null)} placeholder="Alex Morgan" placeholderTextColor={C.textMute} maxLength={40} autoCapitalize="words" style={accountStyles.input} accessibilityLabel="Your name" />
        </View>

        <View style={[accountStyles.field, (focus === "username" || check.state === "ok") && accountStyles.fieldOn, check.state === "bad" && { borderColor: C.danger }]}>
          <Text style={accountStyles.fieldLabel}>Username</Text>
          <Row>
            <TextInput
              value={username ? `@${username}` : ""}
              onChangeText={onUsername}
              onFocus={() => setFocus("username")}
              onBlur={() => setFocus(null)}
              placeholder="@yourname"
              placeholderTextColor={C.textMute}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={21}
              style={[accountStyles.input, { flex: 1, minWidth: 0 }]}
              accessibilityLabel="Username"
            />
            {check.state === "ok" ? (
              <Row gap={4}>
                <Check size={14} color={C.accent} strokeWidth={3} />
                <Text style={styles.available}>Available</Text>
              </Row>
            ) : check.state === "bad" ? (
              <X size={16} color={C.danger} />
            ) : check.state === "checking" ? (
              <Text style={styles.checking}>Checking</Text>
            ) : null}
          </Row>
          {check.state === "bad" ? <Text style={styles.problem}>{check.reason}</Text> : null}
        </View>

        <View style={[accountStyles.field, focus === "dob" && accountStyles.fieldOn, dobProblem && { borderColor: C.danger }]}>
          <Text style={accountStyles.fieldLabel}>Date of birth</Text>
          <Row gap={6}>
            <TextInput value={dob.d} onChangeText={(t) => { const v = t.replace(/\D/g, "").slice(0, 2); onDob({ ...dob, d: v }); if (v.length === 2) mRef.current?.focus(); }} onFocus={() => setFocus("dob")} onBlur={() => setFocus(null)} placeholder="DD" placeholderTextColor={C.textMute} keyboardType="number-pad" style={[accountStyles.input, styles.dobPart]} accessibilityLabel="Day of birth" />
            <Text style={styles.dobSlash}>/</Text>
            <TextInput ref={mRef} value={dob.m} onChangeText={(t) => { const v = t.replace(/\D/g, "").slice(0, 2); onDob({ ...dob, m: v }); if (v.length === 2) yRef.current?.focus(); }} onFocus={() => setFocus("dob")} onBlur={() => setFocus(null)} placeholder="MM" placeholderTextColor={C.textMute} keyboardType="number-pad" style={[accountStyles.input, styles.dobPart]} accessibilityLabel="Month of birth" />
            <Text style={styles.dobSlash}>/</Text>
            <TextInput ref={yRef} value={dob.y} onChangeText={(t) => onDob({ ...dob, y: t.replace(/\D/g, "").slice(0, 4) })} onFocus={() => setFocus("dob")} onBlur={() => setFocus(null)} placeholder="YYYY" placeholderTextColor={C.textMute} keyboardType="number-pad" style={[accountStyles.input, styles.dobPart, { width: 64 }]} accessibilityLabel="Year of birth" />
          </Row>
          <Text style={[styles.dobHint, dobProblem && { color: C.danger }]}>
            {dobProblem ? dobProblem.message : minor ? "Under 18 mode: friends and club only, no live spot, no paid drops." : "Keeps under 18s safe. Never shown on your profile."}
          </Text>
        </View>

        <View style={[accountStyles.field, { paddingBottom: 14 }]}>
          <Text style={[accountStyles.fieldLabel, { marginBottom: 10 }]}>Who can see you on the map</Text>
          <MapVisibility value={mapVisibility} onChange={onMapVisibility} minor={minor} />
        </View>

        <View style={[accountStyles.field, { paddingBottom: 14 }]}>
          <Text style={[accountStyles.fieldLabel, { marginBottom: 10 }]}>Your runner</Text>
          <RunnerChoice value={runner} onChange={onRunner} />
        </View>
      </View>
    </View>
  );
}

export function MapVisibility({ value, onChange, minor }) {
  const options = [
    { value: "everyone", label: "Everyone" },
    { value: "friends", label: "Friends" },
    { value: "crew", label: "Crew" },
  ];
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const [width, setWidth] = useState(0);
  const slot = width ? (width - 8) / options.length : 0;
  const x = useSharedValue(index * slot);
  useEffect(() => {
    x.value = slot ? withSpring(index * slot, EASE.thumb) : index * slot;
  }, [index, slot, x]);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={styles.seg3} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {slot ? (
        <Animated.View pointerEvents="none" style={[styles.seg3Thumb, { width: slot }, slide]}>
          <View style={styles.seg3ThumbBody}>
            <LinearGradient colors={FINISH.act} locations={FINISH.actStops} style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { borderRadius: R.full, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)" }]} />
          </View>
        </Animated.View>
      ) : null}
      {options.map((o) => {
        const on = value === o.value;
        const off = minor && o.value === "everyone";
        return (
          <PressableScale
            key={o.value}
            disabled={off}
            onPress={() => {
              if (on) return;
              hapticSelection();
              onChange(o.value);
            }}
            scaleTo={0.96}
            style={[styles.seg3Item, off && { opacity: 0.35 }]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on, disabled: off }}
          >
            <Text style={[styles.seg3Text, on && { color: "#fff", fontFamily: F.bodySemi }]}>{o.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

// ── Goal ──────────────────────────────────────────────────────────────────────

function GoalStep({ value, onChange }) {
  const nudge = (d) => {
    hapticSelection();
    onChange(Math.min(30000, Math.max(3000, value + d)));
  };
  return (
    <View>
      <GlowHero
        kicker="Step 2 of 4"
        top="Set your"
        bottom="daily goal"
        height={372}
        size={48}
        background={
          <>
            <Image source={PHOTOS.goal11} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ left: "50%", top: "6%" }} transition={250} accessibilityLabel="A runner at sunrise, blurred with speed" />
            {/* .r11slab::after */}
            <LinearGradient colors={["rgba(3,5,10,0.35)", "rgba(3,5,10,0)", "rgba(3,5,10,0.15)", "rgba(3,5,10,0.86)"]} locations={[0, 0.26, 0.52, 1]} style={StyleSheet.absoluteFill} />
            <StepObject source={PHOTOS.dial} size={136} top={30} centre />
            <Grain amount={0.06} />
          </>
        }
      />
      <View style={{ paddingHorizontal: S.gutter, marginTop: S.lg, gap: 12 }}>
        <View style={styles.stepper}>
          <PressableScale onPress={() => nudge(-500)} scaleTo={0.9} accessibilityLabel="500 fewer steps" style={styles.stepBtn}>
            <Minus size={18} color={C.text} />
          </PressableScale>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.goalNum}>{formatNumber(value)}</Text>
            <Text style={styles.goalUnit}>steps a day</Text>
          </View>
          <PressableScale onPress={() => nudge(500)} scaleTo={0.9} accessibilityLabel="500 more steps" style={styles.stepBtn}>
            <Plus size={18} color={C.text} />
          </PressableScale>
        </View>
        <Row gap={10}>
          {GOALS.map((g) => {
            const on = g.value === value;
            return (
              <PressableScale key={g.value} onPress={() => { hapticSelection(); onChange(g.value); }} scaleTo={0.96} style={[styles.preset, on && styles.presetOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                <Text style={[styles.presetN, on && { color: C.accent }]}>{g.label}</Text>
                <Text style={styles.presetSub}>{g.sub}</Text>
              </PressableScale>
            );
          })}
        </Row>
        <Body dim size={13} style={{ textAlign: "center", marginTop: 4 }}>Hit it for 40 XP and 4 OUT on top of your steps.</Body>
      </View>
    </View>
  );
}

// The 3D object on a step's slab (.slab .obj): black dropped out, round soft
// edge, the slow float.
function StepObject({ source, size, top, right, centre = false }) {
  const insets = useSafeAreaInsets();
  return <BlendImage source={source} size={size} float style={[{ position: "absolute", top: insets.top + top }, centre ? { left: "50%", marginLeft: -size / 2 } : { right }]} />;
}

/** .slab: the blue light from the upper right, the object, grain. */
function SlabLight({ object, size, top, right }) {
  return (
    <>
      <GlowBackdrop preset="slab" />
      <StepObject source={object} size={size} top={top} right={right} />
      <Grain amount={0.06} />
    </>
  );
}

// ── Patch ─────────────────────────────────────────────────────────────────────

function PatchStep({ place, onPlace, area, onArea, at, locating, onLocate }) {
  const word = areaWord(place);
  const choose = useCallback(
    (p) => {
      onPlace(p);
      onArea(null);
    },
    [onPlace, onArea]
  );
  return (
    <View>
      <GlowHero kicker="Step 3 of 4" top="Where's" bottom="your patch?" height={296} size={48} background={<SlabLight object={PHOTOS.crest} size={196} top={30} right={-22} />} />
      <View style={{ paddingHorizontal: S.gutter, marginTop: S.lg, gap: S.md }}>
        <Body dim size={14} style={{ lineHeight: 20 }}>
          {place ? `Your ${word} is your team. Every step you take counts towards it.` : "Pick your city or town, then the area you move in. It's your team."}
        </Body>
        <PatchPicker
          place={place}
          onPlace={choose}
          areaId={area?.id}
          onArea={onArea}
          at={at}
          locating={locating}
          onLocate={onLocate}
        />
      </View>
    </View>
  );
}

// ── Permissions ───────────────────────────────────────────────────────────────

function PermsStep({ value, onChange, minor, place }) {
  const word = areaWord(place);
  const set = (k) => (v) => onChange({ ...value, [k]: v });
  return (
    <View>
      <GlowHero kicker="Step 4 of 4" top="Let us come" bottom="with you" height={296} size={48} background={<SlabLight object={PHOTOS.phone} size={226} top={14} right={-30} />} />
      <View style={{ paddingHorizontal: S.gutter, marginTop: S.lg, gap: S.lg }}>
        <Group>
          <SettingRow icon={LocateFixed} iconColour={C.accent} title="Location" hint={minor ? "Routes only. No live spot in under 18 mode" : "Routes, and who's out near you"} right={<Toggle value={value.location} onChange={set("location")} label="Location" />} />
          <SettingRow icon={Footprints} iconColour={C.accent} title="Motion" hint="Count steps all day" right={<Toggle value={value.motion} onChange={set("motion")} label="Motion" />} />
          <SettingRow icon={Bell} iconColour={C.accent} title="Notifications" hint="Battles, drops and crew" right={<Toggle value={value.notifications} onChange={set("notifications")} label="Notifications" />} />
        </Group>
        <Note icon={Lock}>Friends only see your {word}. Your exact spot stays private unless you share a route.</Note>
      </View>
    </View>
  );
}

// ── Success ───────────────────────────────────────────────────────────────────

function Success({ profile, onDone }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => done.current(), 3400);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top, paddingBottom: insets.bottom + S.lg, paddingHorizontal: S.gutter }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <MotiView from={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 11, stiffness: 160 }}>
          <View style={styles.burst}>
            <Check size={44} color={C.accent} strokeWidth={2.5} />
          </View>
        </MotiView>
        <MotiView from={{ opacity: 0, translateY: 14 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 420, delay: 260 }} style={{ alignItems: "center" }}>
          <Text style={[styles.kicker, { marginTop: 32 }]}>You're in</Text>
          <Text style={styles.successTitle} numberOfLines={1} adjustsFontSizeToFit>@{profile.username}</Text>
          <Body dim size={16} style={{ textAlign: "center", marginTop: S.sm }}>
            Here's something to start you off.
          </Body>
        </MotiView>
        <Row gap={S.sm} style={{ marginTop: S.xl }}>
          {["+100 XP", "+20 OUT"].map((label, i) => (
            <MotiView key={label} from={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 10, stiffness: 200, delay: 520 + i * 140 }} style={styles.reward}>
              <Text style={styles.rewardText}>{label}</Text>
            </MotiView>
          ))}
        </Row>
      </View>
      <Button title="Into the app" size="lg" full onPress={onDone} />
      <ConfettiCannon count={120} origin={{ x: width / 2, y: -20 }} fadeOut autoStart explosionSpeed={380} fallSpeed={2800} colors={[C.accent, "#ffffff", C.accentHi, C.gold]} />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { paddingHorizontal: S.gutter, paddingTop: S.sm },
  // sign in
  signin: { flex: 1, backgroundColor: "#02050c", overflow: "hidden" },
  signinBody: { flex: 1, justifyContent: "flex-end", paddingHorizontal: S.gutter },
  signinLink: { color: C.textSoft, fontFamily: F.bodyMedium, fontSize: 14 },
  live: { alignSelf: "flex-start", paddingVertical: 7, paddingLeft: 10, paddingRight: 12, borderRadius: R.full, backgroundColor: "rgba(10,16,28,0.6)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.16)", marginBottom: S.md },
  liveText: { color: "#fff", fontFamily: F.body, fontSize: 12 },
  // .w-body h2: the display face at 50
  signinHead: { color: "#fff", fontFamily: F.display, fontSize: 50, lineHeight: 47, textTransform: "uppercase" },
  provider: { height: 50, borderRadius: R.full, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  // .authb: frosted glass with a faint ring
  providerDark: { backgroundColor: "rgba(255,255,255,0.14)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.16)", backdropFilter: "blur(12px)" },
  providerText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 14 },
  emailLink: { color: "#d6dde8", fontFamily: F.bodyMedium, fontSize: 14 },
  terms: { color: C.textSoft, fontFamily: F.body, fontSize: 13, lineHeight: 19, textAlign: "center", paddingHorizontal: S.lg },
  emailField: { height: 56, borderRadius: R.lg, backgroundColor: "rgba(18,21,26,0.9)", paddingHorizontal: S.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.2)" },
  emailInput: { flex: 1, color: C.text, fontFamily: F.body, fontSize: 17, outlineStyle: "none" },
  // setup
  head: { color: C.text, fontFamily: F.display, fontSize: 48, lineHeight: 48, textTransform: "uppercase" },
  blue: { color: C.accent, textShadowColor: "rgba(61,139,255,0.5)", textShadowRadius: 18 },
  kicker: { color: C.accent, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase" },
  photoRing: { width: 104, height: 104, borderRadius: 52, borderWidth: 3, borderColor: C.accent, padding: 5, shadowColor: C.accent, shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } },
  photoInner: { flex: 1, borderRadius: 46, overflow: "hidden", backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
  camera: { position: "absolute", right: -4, bottom: -2, width: 32, height: 32, borderRadius: 16, backgroundColor: C.accent, borderWidth: 3, borderColor: C.bg, alignItems: "center", justifyContent: "center" },
  available: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 12 },
  checking: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  problem: { color: C.danger, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  dobPart: { width: 40, textAlign: "center" },
  dobSlash: { color: C.textMute, fontFamily: F.body, fontSize: 17 },
  dobHint: { color: C.textDim, fontFamily: F.body, fontSize: 11, marginTop: 4 },
  // .seg.sm with the round ten thumb: a recessed track, the act gradient
  // thumb glowing blue underneath, springing to the choice
  seg3: { flexDirection: "row", padding: 4, borderRadius: R.full, backgroundColor: "#0b0d11", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.05)" },
  seg3Thumb: { position: "absolute", top: 4, bottom: 4, left: 4, borderRadius: R.full, boxShadow: "0 6px 16px -6px rgba(42,106,240,0.95), 0 0 22px -4px rgba(61,139,255,0.55)" },
  seg3ThumbBody: { ...StyleSheet.absoluteFillObject, borderRadius: R.full, overflow: "hidden" },
  seg3Item: { flex: 1, height: 34, borderRadius: R.full, alignItems: "center", justifyContent: "center" },
  seg3Text: { color: C.textSoft, fontFamily: F.bodyMedium, fontSize: 12.5 },
  // goal
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: S.md, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.12)" },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surfaceHigh, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  goalNum: { color: C.text, fontFamily: F.display, fontSize: 50, lineHeight: 52 },
  goalUnit: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  preset: { flex: 1, height: 64, borderRadius: 18, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "transparent" },
  presetOn: { borderColor: C.accent, backgroundColor: "#13203a" },
  presetN: { color: C.text, fontFamily: F.display, fontSize: 22, lineHeight: 24 },
  presetSub: { color: C.textDim, fontFamily: F.body, fontSize: 11 },
  // success
  burst: { width: 96, height: 96, borderRadius: 48, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  successTitle: { color: C.text, fontFamily: F.display, fontSize: 44, letterSpacing: -0.5, marginTop: S.xs, maxWidth: 340 },
  reward: { flexDirection: "row", alignItems: "center", height: 40, paddingHorizontal: 16, borderRadius: R.full, backgroundColor: C.surface },
  rewardText: { color: C.text, fontFamily: F.display, fontSize: 16 },
});
