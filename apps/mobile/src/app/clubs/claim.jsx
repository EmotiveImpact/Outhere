// Claim your club, for run club organisers: name, when and where you meet,
// then proof the club's Instagram or Strava page is yours (a code in the bio)
// or a short video call. A person at Outhere checks every claim.

import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BadgeCheck, Camera, Check, ChevronLeft, Clock, MapPin } from "@/components/ui/icons";
import { Body, Button, C, F, FINISH, LIT, PressableScale, R, Row, S, Screen, Surface } from "@/components/ui";
import { engine, useEngineMutation, useMyClaims } from "@/data/hooks";
import { whenLabel } from "@/components/clubs/parts";

const DAYS = [
  [1, "Mon"],
  [2, "Tue"],
  [3, "Wed"],
  [4, "Thu"],
  [5, "Fri"],
  [6, "Sat"],
  [0, "Sun"],
];
const TIMES = ["06:30", "07:00", "09:00", "18:00", "18:30", "19:00", "19:30"];

// The next three weekday mornings at 10:00 for the call.
const callSlots = () => {
  const out = [];
  const d = new Date();
  d.setHours(10, 0, 0, 0);
  while (out.length < 3) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) out.push(d.getTime());
  }
  return out;
};

/** .r11f: a softly lit field, a small label over the value. */
function Field({ label, children, icon: Icon, style }) {
  return (
    <View style={[styles.field, style]}>
      <LinearGradient colors={["rgba(255,255,255,0.055)", "rgba(255,255,255,0.025)"]} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
      {Icon ? (
        <View>
          <Icon size={18} color={C.accentHi} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {children}
      </View>
    </View>
  );
}

/** A small choice pill: lit, or the act gradient when chosen. */
function Pick({ on, onPress, children, label, style }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, on && styles.chipOn, style]} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={label}>
      {on ? <LinearGradient colors={FINISH.act} locations={FINISH.actStops} style={[StyleSheet.absoluteFill, { borderRadius: 99 }]} /> : null}
      {children}
    </Pressable>
  );
}

/** .r11proof: one way to prove the club is yours, with its tick. */
function ProofRow({ badge, icon: Icon, title, sub, on, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.proof, on && styles.proofOn]} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={title}>
      <LinearGradient colors={on ? ["rgba(74,134,255,0.16)", "rgba(74,134,255,0.05)"] : ["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"]} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
      <View style={styles.proofBadge}>{Icon ? <Icon size={16} color={C.accentHi} /> : <Text style={styles.proofBadgeText}>{badge}</Text>}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.proofTitle}>{title}</Text>
        <Text style={styles.proofSub}>{sub}</Text>
      </View>
      {on ? (
        <LinearGradient colors={["#4a86ff", "#1f55d0"]} style={styles.tick}>
          <Check size={13} color="#fff" strokeWidth={2.8} />
        </LinearGradient>
      ) : (
        <View style={styles.tickOff} />
      )}
    </Pressable>
  );
}

function ClaimStatus({ claim }) {
  const pending = claim.status === "pending";
  return (
    <Surface radius={20} padding={16} style={{ marginTop: 12 }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Text style={styles.claimName}>{claim.name}</Text>
        <Text
          style={[
            styles.status,
            claim.status === "verified" && { color: C.accentHi },
            claim.status === "rejected" && { color: C.danger },
          ]}
        >
          {pending
            ? "With us"
            : claim.status === "verified"
              ? "Official"
              : "Not verified"}
        </Text>
      </Row>
      <Body dim size={13} style={{ marginTop: 2 }}>
        {[claim.meets, claim.meetPlace].filter(Boolean).join(" · ")}
      </Body>
      {pending && claim.code ? (
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>
            Put this in @{claim.proofHandle}'s bio
          </Text>
          <Text style={styles.code}>
            {claim.code.slice(0, 3)} {claim.code.slice(3)}
          </Text>
          <Body dim size={12}>
            We look for it, then you can take it down.
          </Body>
        </View>
      ) : null}
      {pending && claim.callAt ? (
        <Body size={13} style={{ marginTop: S.md }}>
          Video call booked for {whenLabel(claim.callAt)}.
        </Body>
      ) : null}
    </Surface>
  );
}

export default function ClaimClub() {
  const router = useRouter();
  const { club: crewId } = useLocalSearchParams();
  const claims = useMyClaims();
  const [name, setName] = useState("");
  const [more, setMore] = useState(false);
  const [days, setDays] = useState([2, 4]);
  const [time, setTime] = useState("19:00");
  const [since, setSince] = useState("");
  const [place, setPlace] = useState("");
  const [proof, setProof] = useState("instagram");
  const [handle, setHandle] = useState("");
  const [slot, setSlot] = useState(null);
  const slots = callSlots();

  const claim = useEngineMutation(engine.claimClub, {
    success: "Sent for review",
    onSuccess: () => setMore(false),
  });
  const submit = () => {
    const [hour, minute] = time.split(":").map(Number);
    claim.mutate({
      name,
      meetPlace: place,
      days,
      hour,
      minute,
      founded: since ? Number(since) : null,
      proofMethod: proof,
      proofHandle: handle,
      callAt: proof === "call" ? slot : null,
      crewId: crewId ? String(crewId) : null,
    });
  };
  const toggleDay = (d) =>
    setDays((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d]));
  const ready =
    name.trim().length >= 3 &&
    days.length &&
    place.trim() &&
    (proof === "call" ? !!slot : handle.replace("@", "").trim().length >= 2);
  const mine = claims.data || [];
  const verified = mine.find((c) => c.status === "verified");
  // Once a claim is in, the form folds away until they ask to claim another.
  const showForm = !mine.length || more;

  return (
    <Screen
      header={
        <Row style={styles.nav}>
          <PressableScale onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/club"))} scaleTo={0.9} hitSlop={8} style={styles.back} accessibilityLabel="Back">
            <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { borderRadius: 19 }]} />
            <View>
              <ChevronLeft size={20} color={C.text} />
            </View>
          </PressableScale>
          <View style={styles.steps}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.step, i < (mine.length ? 3 : 2) && styles.stepOn]}>
                {i < (mine.length ? 3 : 2) ? <LinearGradient colors={["#4a86ff", "#82b4ff"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} /> : null}
              </View>
            ))}
          </View>
        </Row>
      }
      contentStyle={{ paddingHorizontal: 18 }}
    >
      <Text style={styles.kick}>For run club organisers</Text>
      <Text style={styles.big}>Claim your</Text>
      <Text style={[styles.big, styles.blue]}>club</Text>
      <Text style={styles.lede}>Only real run clubs get a crew on Outhere. Tell us where you meet and prove the club page is yours.</Text>

      {mine.map((c) => (
        <ClaimStatus key={c.id} claim={c} />
      ))}
      {verified?.crewId ? (
        <Button
          title={`Open ${verified.name}`}
          icon={BadgeCheck}
          full
          size="lg"
          style={{ marginTop: S.md }}
          onPress={() => router.push(`/clubs/verified/${verified.crewId}`)}
        />
      ) : null}

      {!showForm ? (
        <Button
          title="Claim another club"
          variant="secondary"
          full
          style={{ marginTop: S.md }}
          onPress={() => setMore(true)}
        />
      ) : null}

      {showForm ? (
        <>
          <View style={{ marginTop: 14, gap: 10 }}>
            <Field label="Club name">
              <TextInput value={name} onChangeText={setName} placeholder="Southbank Runners" placeholderTextColor={C.textMute} style={styles.input} maxLength={40} accessibilityLabel="Club name" />
            </Field>
            <Field label="Meets">
              <Row gap={4} style={{ marginTop: 7 }}>
                {DAYS.map(([d, label]) => (
                  <Pick key={d} on={days.includes(d)} onPress={() => toggleDay(d)} label={label} style={styles.day}>
                    <Text style={[styles.chipText, days.includes(d) && styles.chipTextOn]}>{label}</Text>
                  </Pick>
                ))}
              </Row>
              <Row gap={5} style={{ flexWrap: "wrap", marginTop: 6 }}>
                {TIMES.map((t) => (
                  <Pick key={t} on={time === t} onPress={() => setTime(t)} label={t}>
                    <Text style={[styles.chipText, time === t && styles.chipTextOn]}>{t}</Text>
                  </Pick>
                ))}
              </Row>
            </Field>
            <Row gap={10} style={{ alignItems: "stretch" }}>
              <View style={{ flex: 1.6 }}>
                <Field label="Meet spot" icon={MapPin} style={{ flex: 1 }}>
                  <TextInput value={place} onChangeText={setPlace} placeholder="Gabriel's Wharf, SE1" placeholderTextColor={C.textMute} style={styles.input} maxLength={80} accessibilityLabel="Meet spot" />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Since" style={{ flex: 1 }}>
                  <TextInput value={since} onChangeText={(t) => setSince(t.replace(/\D/g, "").slice(0, 4))} placeholder="2016" placeholderTextColor={C.textMute} keyboardType="number-pad" style={styles.input} accessibilityLabel="Year founded" />
                </Field>
              </View>
            </Row>
          </View>

          {/* .kv */}
          <Row style={{ justifyContent: "space-between", marginTop: 16, marginBottom: 10 }}>
            <Text style={styles.kvTitle}>Proof it's yours</Text>
            <Text style={styles.kvSub}>Instagram, Strava or a call</Text>
          </Row>
          <View style={{ gap: 10 }}>
            <ProofRow badge="IG" title={handle && proof === "instagram" ? `@${handle.replace("@", "")}` : "The club's Instagram"} sub="We give you a six digit code to put in the bio" on={proof === "instagram"} onPress={() => setProof("instagram")} />
            <ProofRow badge="ST" title="The club's Strava page" sub="The same code, in the club's description" on={proof === "strava"} onPress={() => setProof("strava")} />
            <ProofRow icon={Camera} title="Ten minute video call" sub={slot ? `Booked for ${whenLabel(slot)}` : "With a real person at Outhere"} on={proof === "call"} onPress={() => setProof("call")} />
          </View>
          {proof === "call" ? (
            <Row gap={6} style={{ flexWrap: "wrap", marginTop: 12 }}>
              {slots.map((t) => (
                <Pick key={t} on={slot === t} onPress={() => setSlot(t)} label={whenLabel(t)}>
                  <View>
                    <Clock size={12} color={slot === t ? "#fff" : C.textDim} />
                  </View>
                  <Text style={[styles.chipText, slot === t && styles.chipTextOn]}>{whenLabel(t)}</Text>
                </Pick>
              ))}
            </Row>
          ) : (
            <Field label={proof === "instagram" ? "The club's Instagram" : "The club's Strava page"} style={{ marginTop: 10 }}>
              <TextInput value={handle} onChangeText={setHandle} placeholder={proof === "instagram" ? "@southbankrunners" : "strava.com/clubs/southbank"} placeholderTextColor={C.textMute} autoCapitalize="none" autoCorrect={false} style={styles.input} accessibilityLabel="Club page" />
            </Field>
          )}

          <Button
            title="Send for review"
            size="lg"
            full
            disabled={!ready}
            loading={claim.isPending}
            onPress={submit}
            style={{ marginTop: 16 }}
          />
          <Text style={styles.fine}>A real person at Outhere checks every club. You'll hear back within 48 hours.</Text>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12, justifyContent: "space-between" },
  back: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 0 1px rgba(255,255,255,0.05), 0 14px 30px -18px #000" },
  steps: { flexDirection: "row", gap: 5 },
  step: { width: 22, height: 4, borderRadius: 4, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.12)" },
  stepOn: { boxShadow: "0 0 8px rgba(61,139,255,0.6)" },
  kick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 10.5, letterSpacing: 1.7, textTransform: "uppercase", marginTop: 4, marginBottom: 8 },
  big: { color: C.text, fontFamily: F.display, fontSize: 40, lineHeight: 39, textTransform: "uppercase" },
  blue: { color: C.accent, textShadowColor: "rgba(61,139,255,0.35)", textShadowRadius: 28, textShadowOffset: { width: 0, height: 0 } },
  lede: { color: C.textSoft, fontFamily: F.body, fontSize: 13, lineHeight: 19, marginTop: 10 },
  field: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), inset 0 0 0 1px rgba(255,255,255,0.05)" },
  fieldLabel: { color: C.textDim, fontFamily: F.bodyMedium, fontSize: 10.5, letterSpacing: 0.2 },
  input: { color: C.text, fontFamily: F.bodySemi, fontSize: 14, paddingVertical: 2, marginTop: 2, minHeight: 24, outlineStyle: "none" },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, height: 28, paddingHorizontal: 11, borderRadius: 99, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.06)" },
  day: { flex: 1, paddingHorizontal: 0, justifyContent: "center" },
  chipOn: { boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 6px 16px -8px rgba(42,106,240,0.9)" },
  chipText: { color: C.textSoft, fontFamily: F.bodySemi, fontSize: 12 },
  chipTextOn: { color: "#fff" },
  kvTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  kvSub: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  proof: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" },
  proofOn: { boxShadow: "inset 0 0 0 1px rgba(130,180,255,0.3), 0 12px 26px -16px rgba(42,106,240,0.7)" },
  proofBadge: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#0d1320", boxShadow: "inset 0 0 0 1px rgba(130,180,255,0.25)" },
  proofBadgeText: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11 },
  proofTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5 },
  proofSub: { color: C.textDim, fontFamily: F.body, fontSize: 11, marginTop: 2 },
  tick: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px -4px rgba(42,106,240,0.9)" },
  tickOff: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.16)" },
  fine: { color: C.textDim, fontFamily: F.body, fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 12 },
  claimName: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 20,
    textTransform: "uppercase",
    flex: 1,
  },
  status: {
    color: C.warn,
    fontFamily: F.bodySemi,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  codeBox: {
    marginTop: S.md,
    padding: S.md,
    borderRadius: R.md,
    backgroundColor: C.bg,
    alignItems: "center",
    gap: 2,
  },
  codeLabel: { color: C.textDim, fontFamily: F.bodyMedium, fontSize: 12 },
  code: {
    color: C.accentHi,
    fontFamily: F.display,
    fontSize: 40,
    letterSpacing: 4,
  },
});
