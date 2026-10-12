// Profile setup: username, city, optional crew code, a quick word on step
// counting, then engine.createProfile and into the app.

import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { Pedometer } from "expo-sensors";
import { AtSign, Check, ChevronLeft, Footprints, Users, X } from "lucide-react-native";
import { engine, useEngineMutation } from "@/data/hooks";
import { CITIES } from "@/constants/theme";
import { hapticError, hapticSuccess } from "@/services/haptics";
import { AnimatedBar, Body, Button, C, F, PressableScale, R, Row, S, toast } from "@/components/ui";

const STEPS = ["username", "city", "crew", "motion"];

const randomUsername = () => `mover${Math.floor(1000 + Math.random() * 9000)}`;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [check, setCheck] = useState({ state: "idle", reason: null }); // idle | checking | ok | bad
  const [city, setCity] = useState("London");
  const [crewCode, setCrewCode] = useState("");
  const [motion, setMotion] = useState("unknown"); // unknown | asking | granted | denied | unavailable
  const [welcome, setWelcome] = useState(null); // the new profile, once created
  const reqId = useRef(0);

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

  const create = useEngineMutation(engine.createProfile, {
    onSuccess: (profile, vars) => {
      hapticSuccess();
      const wanted = vars?.crewCode;
      if (wanted && !profile?.crewsCount) {
        toast("Crew code not found", `Nothing matched ${wanted}. Join a crew from the Crew tab.`);
      }
      setWelcome(profile || { username: vars?.username });
    },
  });

  const finish = () => create.mutate({ username: username.trim(), city, crewCode: crewCode.trim() || undefined });

  const askMotion = async () => {
    if (Platform.OS === "web") return setMotion("unavailable");
    setMotion("asking");
    try {
      const available = await Pedometer.isAvailableAsync();
      if (!available) return setMotion("unavailable");
      const { status } = await Pedometer.requestPermissionsAsync();
      setMotion(status === "granted" ? "granted" : "denied");
    } catch {
      setMotion("unavailable");
    }
  };

  const key = STEPS[step];
  const canNext = key === "username" ? check.state === "ok" : true;

  const next = () => {
    if (!canNext) return hapticError();
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };
  const back = () => (step === 0 ? (router.canGoBack() ? router.back() : router.replace("/welcome")) : setStep(step - 1));

  if (welcome) return <Success profile={welcome} onDone={() => router.replace("/(tabs)")} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ paddingTop: insets.top + S.sm, paddingHorizontal: S.gutter }}>
        <Row style={{ justifyContent: "space-between", height: 44 }}>
          <PressableScale onPress={back} hitSlop={12} scaleTo={0.9} accessibilityLabel="Back" style={styles.back}>
            <ChevronLeft size={22} color={C.text} />
          </PressableScale>
          <Text style={styles.counter}>
            <Text style={{ color: C.text }}>{String(step + 1).padStart(2, "0")}</Text> / {String(STEPS.length).padStart(2, "0")}
          </Text>
          {__DEV__ ? (
            <PressableScale hitSlop={12} onPress={() => create.mutate({ username: randomUsername(), city: "London" })} scaleTo={0.94} style={styles.devSkip}>
              <Text style={{ color: C.textMute, fontSize: 12, fontWeight: "600" }}>Skip (dev)</Text>
            </PressableScale>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </Row>
        <Row gap={6} style={{ marginTop: S.md }}>
          {STEPS.map((s, i) => (
            <AnimatedBar key={s} value={i <= step ? 1 : 0} height={4} track={C.surfaceHigh} style={{ flex: 1 }} />
          ))}
        </Row>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: S.gutter, paddingTop: S.xxl + S.sm, paddingBottom: S.xl }} keyboardShouldPersistTaps="handled">
        <MotiView key={key} from={{ opacity: 0, translateX: 28 }} animate={{ opacity: 1, translateX: 0 }} transition={{ type: "spring", damping: 20, stiffness: 220 }}>
          {key === "username" && <UsernameStep n={step + 1} value={username} onChange={setUsername} check={check} onSubmit={next} />}
          {key === "city" && <CityStep n={step + 1} value={city} onChange={setCity} />}
          {key === "crew" && <CrewStep n={step + 1} value={crewCode} onChange={setCrewCode} />}
          {key === "motion" && <MotionStep n={step + 1} status={motion} onAsk={askMotion} />}
        </MotiView>
      </ScrollView>

      <View style={{ paddingHorizontal: S.gutter, paddingBottom: insets.bottom + S.lg, gap: S.sm }}>
        <Button
          title={key === "motion" ? "Let's go" : key === "crew" && !crewCode.trim() ? "Skip for now" : "Continue"}
          size="lg"
          full
          disabled={!canNext}
          loading={create.isPending}
          onPress={next}
          variant={key === "crew" && !crewCode.trim() ? "secondary" : "primary"}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Steps ─────────────────────────────────────────────────────────────────────

const KICKERS = ["Who are you", "Your patch", "Your people", "The engine"];

const StepTitle = ({ n, title, body }) => (
  <View style={{ marginBottom: S.xxl }}>
    <Text style={styles.kicker}>{KICKERS[n - 1]}</Text>
    <Text style={styles.stepTitle}>{title}</Text>
    <Body dim size={16} style={{ marginTop: S.md, lineHeight: 23 }}>
      {body}
    </Body>
  </View>
);

function UsernameStep({ n, value, onChange, check, onSubmit }) {
  const tone = check.state === "bad" ? C.danger : check.state === "ok" ? C.borderStrong : C.border;
  return (
    <>
      <StepTitle n={n} title="Pick your name." body="This is how people find you, battle you and see you on the board." />
      <Row gap={S.sm} style={[styles.field, { borderColor: tone }]}>
        <View style={{ width: 20 }}><AtSign size={20} color={C.textMute} /></View>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.replace(/\s/g, "").toLowerCase())}
          placeholder="username"
          placeholderTextColor={C.textMute}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          maxLength={20}
          returnKeyType="next"
          onSubmitEditing={onSubmit}
          style={{ flex: 1, color: C.text, fontSize: 22, fontFamily: F.displayMedium, outlineStyle: "none" }}
        />
        {check.state === "ok" ? (
          <MotiView from={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 10 }} style={styles.okBadge}>
            <Check size={14} color={C.accentText} strokeWidth={3} />
          </MotiView>
        ) : check.state === "bad" ? (
          <X size={20} color={C.danger} />
        ) : null}
      </Row>
      <Body size={13} style={{ marginTop: S.sm, color: check.state === "bad" ? C.danger : check.state === "ok" ? C.textDim : C.textMute }}>
        {check.state === "checking"
          ? "Checking it's free..."
          : check.state === "ok"
            ? "Nice, that one's yours."
            : check.state === "bad"
              ? check.reason
              : "3 to 20 characters: letters, numbers, dots and underscores."}
      </Body>
    </>
  );
}

function CityStep({ n, value, onChange }) {
  return (
    <>
      <StepTitle n={n} title="Where do you move?" body="Your city sets your local leaderboard, events and who's out near you." />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.sm }}>
        {CITIES.map((c) => {
          const active = c.name === value;
          return (
            <PressableScale key={c.name} onPress={() => onChange(c.name)} scaleTo={0.9}>
              <MotiView
                animate={{ scale: active ? 1.04 : 1 }}
                transition={{ type: "spring", damping: 12, stiffness: 260 }}
                style={[styles.city, active && styles.cityActive]}
              >
                {active ? <Check size={16} color={C.bg} strokeWidth={3} /> : null}
                <Text style={[styles.cityText, active && { color: C.bg, fontWeight: "600" }]}>{c.name}</Text>
              </MotiView>
            </PressableScale>
          );
        })}
      </View>
    </>
  );
}

function CrewStep({ n, value, onChange }) {
  return (
    <>
      <StepTitle n={n} title="Got a crew code?" body="If a mate sent you an invite code, drop it in and you'll land straight in their crew." />
      <Row gap={S.sm} style={[styles.field, { borderColor: value ? C.borderStrong : C.border }]}>
        <View style={{ width: 20 }}><Users size={20} color={C.textMute} /></View>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.replace(/\s/g, "").toUpperCase())}
          placeholder="e.g. NORTH3"
          placeholderTextColor={C.textMute}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={10}
          style={{ flex: 1, color: C.text, fontSize: 22, fontFamily: F.displayMedium, letterSpacing: 3, outlineStyle: "none" }}
        />
      </Row>
      <Body mute size={13} style={{ marginTop: S.sm }}>
        You can join or start a crew any time from the Crew tab.
      </Body>
    </>
  );
}

function MotionStep({ n, status, onAsk }) {
  const granted = status === "granted";
  const note = {
    denied: "No worries. You can turn on Motion & Fitness for OutHere in your phone's settings later.",
    unavailable: "This device doesn't have a step counter we can read. You can still log runs from the Move tab.",
  }[status];
  return (
    <>
      <StepTitle n={n} title="Your steps do the work." body="OutHere reads your phone's step counter, so there's nothing to start or stop. Just carry your phone." />
      <View style={{ gap: S.lg, marginBottom: S.xxl }}>
        {[
          { title: "5 XP for every 1,000 steps", text: "Plus bonuses for active days and hitting your goal." },
          { title: "Private by default", text: "Only step counts are read. Your data stays on this phone." },
        ].map(({ title, text }, i) => (
          <View key={title}>
            {i > 0 ? <View style={styles.sep} /> : null}
            <Text style={styles.pointTitle}>{title}</Text>
            <Body dim style={{ marginTop: 2 }}>
              {text}
            </Body>
          </View>
        ))}
      </View>
      {granted ? (
        <Row gap={S.sm}>
          <Check size={18} color={C.accent} />
          <Text style={{ color: C.text, fontSize: 15, fontWeight: "600" }}>Step counting is on</Text>
        </Row>
      ) : (
        <Button title="Turn on step counting" variant="secondary" full icon={Footprints} loading={status === "asking"} onPress={onAsk} style={{ borderWidth: 0 }} />
      )}
      {note ? (
        <Body mute size={13} style={{ marginTop: S.md }}>
          {note}
        </Body>
      ) : null}
    </>
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
          <Text style={[styles.kicker, { marginTop: 32, marginBottom: 0 }]}>You're in</Text>
          <Text style={styles.successTitle} numberOfLines={1} adjustsFontSizeToFit>@{profile.username}</Text>
          <Body dim size={16} style={{ textAlign: "center", marginTop: S.sm }}>
            Here's something to start you off.
          </Body>
        </MotiView>
        <Row gap={S.sm} style={{ marginTop: S.xl }}>
          {["+100 XP", "+20 OUT"].map((label, i) => (
            <MotiView
              key={label}
              from={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 10, stiffness: 200, delay: 520 + i * 140 }}
              style={styles.reward}
            >
              <Text style={styles.rewardText}>{label}</Text>
            </MotiView>
          ))}
        </Row>
      </View>
      <Button title="Into the app" size="lg" full onPress={onDone} />
      <ConfettiCannon count={120} origin={{ x: width / 2, y: -20 }} fadeOut autoStart explosionSpeed={380} fallSpeed={2800} colors={[C.accent, "#ffffff", "#7dffbe", C.gold]} />
    </View>
  );
}

const styles = StyleSheet.create({
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  counter: { color: C.textMute, fontFamily: F.displayMedium, fontSize: 14, letterSpacing: 1 },
  devSkip: { paddingHorizontal: 12, height: 32, borderRadius: R.full, backgroundColor: C.surface, justifyContent: "center" },
  kicker: { color: C.textDim, fontSize: 13, fontWeight: "600", marginBottom: S.sm },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: C.border, marginBottom: S.lg },
  pointTitle: { color: C.text, fontSize: 15, fontWeight: "600" },
  stepTitle: { color: C.text, fontFamily: F.display, fontSize: 42, lineHeight: 44, letterSpacing: -1.2 },
  field: { height: 64, borderRadius: R.lg, borderWidth: 1, backgroundColor: C.surface, paddingHorizontal: S.lg },
  okBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  city: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: S.lg, height: 48, borderRadius: R.full, backgroundColor: C.surface },
  cityActive: { backgroundColor: C.text },
  cityText: { color: C.text, fontSize: 15, fontWeight: "600" },
  burst: { width: 96, height: 96, borderRadius: 48, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  successTitle: { color: C.text, fontFamily: F.display, fontSize: 44, letterSpacing: -1.2, marginTop: S.xs, maxWidth: 340 },
  reward: { flexDirection: "row", alignItems: "center", height: 40, paddingHorizontal: 16, borderRadius: R.full, backgroundColor: C.surface },
  rewardText: { color: C.text, fontFamily: F.display, fontSize: 16 },
});
