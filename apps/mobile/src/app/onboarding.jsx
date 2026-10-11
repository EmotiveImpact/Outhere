// Profile setup: username, city, optional crew code, a quick word on step
// counting, then engine.createProfile and into the app.

import React, { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { Pedometer } from "expo-sensors";
import { AtSign, Check, ChevronLeft, Footprints, MapPin, ShieldCheck, Users, X } from "lucide-react-native";
import { engine, useEngineMutation } from "@/data/hooks";
import { CITIES } from "@/constants/theme";
import { hapticError, hapticSuccess } from "@/services/haptics";
import { Body, Button, C, F, Label, ProgressBar, R, Row, S, Title } from "@/components/ui";

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
        Alert.alert("Crew code not found", `We couldn't find a crew with ${wanted}. You can join one from the Club tab.`);
      }
      router.replace("/(tabs)");
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

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ paddingTop: insets.top + S.sm, paddingHorizontal: S.gutter }}>
        <Row style={{ justifyContent: "space-between", height: 44 }}>
          <Pressable onPress={back} hitSlop={12} accessibilityLabel="Back" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" }}>
            <ChevronLeft size={22} color={C.text} />
          </Pressable>
          <Label>
            Step {step + 1} of {STEPS.length}
          </Label>
          {__DEV__ ? (
            <Pressable
              hitSlop={12}
              onPress={() => create.mutate({ username: randomUsername(), city: "London" })}
              style={{ paddingHorizontal: 12, height: 32, borderRadius: R.full, borderWidth: 1, borderColor: C.border, justifyContent: "center" }}
            >
              <Text style={{ color: C.textMute, fontSize: 12, fontWeight: "700" }}>Skip (dev)</Text>
            </Pressable>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </Row>
        <ProgressBar value={(step + 1) / STEPS.length} height={4} style={{ marginTop: S.md }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: S.gutter, paddingTop: S.xxl, paddingBottom: S.xl }} keyboardShouldPersistTaps="handled">
        <MotiView key={key} from={{ opacity: 0, translateX: 16 }} animate={{ opacity: 1, translateX: 0 }} transition={{ type: "timing", duration: 280 }}>
          {key === "username" && <UsernameStep value={username} onChange={setUsername} check={check} onSubmit={next} />}
          {key === "city" && <CityStep value={city} onChange={setCity} />}
          {key === "crew" && <CrewStep value={crewCode} onChange={setCrewCode} />}
          {key === "motion" && <MotionStep status={motion} onAsk={askMotion} />}
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

const StepTitle = ({ title, body }) => (
  <View style={{ marginBottom: S.xxl }}>
    <Title size={34}>{title}</Title>
    <Body dim size={16} style={{ marginTop: S.sm }}>
      {body}
    </Body>
  </View>
);

function UsernameStep({ value, onChange, check, onSubmit }) {
  const tone = check.state === "ok" ? C.accent : check.state === "bad" ? C.danger : C.border;
  return (
    <>
      <StepTitle title="Pick your name" body="This is how people find you, battle you and see you on the board." />
      <Row gap={S.sm} style={{ height: 58, borderRadius: R.md, borderWidth: 1, borderColor: tone, backgroundColor: C.surface, paddingHorizontal: S.lg }}>
        <AtSign size={18} color={C.textMute} />
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
          style={{ flex: 1, color: C.text, fontSize: 18, fontFamily: F.displayMedium }}
        />
        {check.state === "ok" ? <Check size={20} color={C.accent} /> : check.state === "bad" ? <X size={20} color={C.danger} /> : null}
      </Row>
      <Body size={13} style={{ marginTop: S.sm, color: check.state === "bad" ? C.danger : check.state === "ok" ? C.accent : C.textMute }}>
        {check.state === "checking"
          ? "Checking..."
          : check.state === "ok"
            ? "Nice, that one's yours."
            : check.state === "bad"
              ? check.reason
              : "3 to 20 characters: letters, numbers, dots and underscores."}
      </Body>
    </>
  );
}

function CityStep({ value, onChange }) {
  return (
    <>
      <StepTitle title="Where are you based?" body="Your city sets your local leaderboard, events and who's out near you." />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.sm }}>
        {CITIES.map((c) => {
          const active = c.name === value;
          return (
            <Pressable
              key={c.name}
              onPress={() => onChange(c.name)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: S.lg,
                height: 46,
                borderRadius: R.full,
                borderWidth: 1,
                borderColor: active ? C.accent : C.border,
                backgroundColor: active ? C.accentDim : C.surface,
              }}
            >
              <MapPin size={15} color={active ? C.accent : C.textMute} />
              <Text style={{ color: active ? C.accent : C.text, fontSize: 15, fontWeight: "600" }}>{c.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

function CrewStep({ value, onChange }) {
  return (
    <>
      <StepTitle title="Got a crew code?" body="If a mate sent you an invite code, drop it in and you'll land straight in their crew. No code? Skip it." />
      <Row gap={S.sm} style={{ height: 58, borderRadius: R.md, borderWidth: 1, borderColor: value ? C.accent : C.border, backgroundColor: C.surface, paddingHorizontal: S.lg }}>
        <Users size={18} color={C.textMute} />
        <TextInput
          value={value}
          onChangeText={(t) => onChange(t.replace(/\s/g, "").toUpperCase())}
          placeholder="e.g. NORTH3"
          placeholderTextColor={C.textMute}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={10}
          style={{ flex: 1, color: C.text, fontSize: 18, fontFamily: F.displayMedium, letterSpacing: 2 }}
        />
      </Row>
      <Body mute size={13} style={{ marginTop: S.sm }}>
        You can join or start a crew any time from the Club tab.
      </Body>
    </>
  );
}

function MotionStep({ status, onAsk }) {
  const granted = status === "granted";
  const note = {
    denied: "No worries. You can turn on Motion & Fitness for OutHere in your phone's settings later.",
    unavailable: "This device doesn't have a step counter we can read. You can still log runs from the Move tab.",
  }[status];
  return (
    <>
      <StepTitle title="Your steps do the work" body="OutHere reads your phone's step counter, so there's nothing to start or stop. Just carry your phone." />
      <View style={{ gap: S.lg, marginBottom: S.xxl }}>
        {[
          { icon: Footprints, text: "5 XP for every 1,000 steps, plus bonuses for active days and hitting your goal." },
          { icon: ShieldCheck, text: "Only step counts are read. Your data stays on this phone." },
        ].map(({ icon: Icon, text }) => (
          <Row key={text} gap={S.md} style={{ alignItems: "flex-start" }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center" }}>
              <Icon size={17} color={C.accent} />
            </View>
            <Body dim style={{ flex: 1, marginTop: 6 }}>
              {text}
            </Body>
          </Row>
        ))}
      </View>
      {granted ? (
        <Row gap={S.sm} style={{ padding: S.lg, borderRadius: R.md, backgroundColor: C.accentDim }}>
          <Check size={18} color={C.accent} />
          <Text style={{ color: C.accent, fontWeight: "700" }}>Step counting is on</Text>
        </Row>
      ) : (
        <Button title="Turn on step counting" variant="outline" full icon={Footprints} loading={status === "asking"} onPress={onAsk} />
      )}
      {note ? (
        <Body mute size={13} style={{ marginTop: S.md }}>
          {note}
        </Body>
      ) : null}
    </>
  );
}
