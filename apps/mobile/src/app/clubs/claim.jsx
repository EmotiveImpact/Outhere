// Claim your club, for run club organisers: name, when and where you meet,
// then proof the club's Instagram or Strava page is yours (a code in the bio)
// or a short video call. A person at Outhere checks every claim.

import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { BadgeCheck, Camera, Clock, MapPin } from "lucide-react-native";
import {
  Body,
  Button,
  C,
  Card,
  F,
  Header,
  R,
  Row,
  S,
  Screen,
  Segment,
  Title,
} from "@/components/ui";
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
const PROOF = [
  { value: "instagram", label: "Instagram" },
  { value: "strava", label: "Strava" },
  { value: "call", label: "Video call" },
];

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

function Field({ label, children, icon: Icon, style }) {
  return (
    <View style={[styles.field, style]}>
      {Icon ? (
        <Icon size={16} color={C.accentHi} style={{ marginTop: 18 }} />
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {children}
      </View>
    </View>
  );
}

function ClaimStatus({ claim }) {
  const pending = claim.status === "pending";
  return (
    <Card padding={S.lg} style={{ marginTop: S.md }}>
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
    </Card>
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
        <Header
          back
          title=""
          right={
            <View style={styles.steps}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.step,
                    i < (mine.length ? 3 : 2) && styles.stepOn,
                  ]}
                />
              ))}
            </View>
          }
        />
      }
    >
      <Text style={styles.kick}>For run club organisers</Text>
      <Text style={styles.big}>Claim your</Text>
      <Text style={[styles.big, { color: C.accent }]}>club</Text>
      <Body dim style={{ marginTop: S.sm }}>
        Only real run clubs get a crew on Outhere. Tell us where you meet and
        prove the club page is yours.
      </Body>

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
          <View style={{ marginTop: S.xl, gap: S.sm }}>
            <Field label="Club name">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Southbank Runners"
                placeholderTextColor={C.textMute}
                style={styles.input}
                maxLength={40}
                accessibilityLabel="Club name"
              />
            </Field>
            <Field label="Meets">
              <Row gap={6} style={{ flexWrap: "wrap", marginTop: 8 }}>
                {DAYS.map(([d, label]) => (
                  <Pressable
                    key={d}
                    onPress={() => toggleDay(d)}
                    style={[styles.chip, days.includes(d) && styles.chipOn]}
                    accessibilityState={{ selected: days.includes(d) }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        days.includes(d) && styles.chipTextOn,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </Row>
              <Row gap={6} style={{ flexWrap: "wrap", marginTop: 8 }}>
                {TIMES.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setTime(t)}
                    style={[styles.chip, time === t && styles.chipOn]}
                  >
                    <Text
                      style={[styles.chipText, time === t && styles.chipTextOn]}
                    >
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </Row>
            </Field>
            <Row gap={S.sm}>
              <View style={{ flex: 2 }}>
                <Field label="Meet spot" icon={MapPin}>
                  <TextInput
                    value={place}
                    onChangeText={setPlace}
                    placeholder="Gabriel's Wharf, SE1"
                    placeholderTextColor={C.textMute}
                    style={styles.input}
                    maxLength={80}
                    accessibilityLabel="Meet spot"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Since">
                  <TextInput
                    value={since}
                    onChangeText={(t) =>
                      setSince(t.replace(/\D/g, "").slice(0, 4))
                    }
                    placeholder="2016"
                    placeholderTextColor={C.textMute}
                    keyboardType="number-pad"
                    style={styles.input}
                    accessibilityLabel="Year founded"
                  />
                </Field>
              </View>
            </Row>
          </View>

          <Row style={{ justifyContent: "space-between", marginTop: S.xl }}>
            <Title size={18}>Proof it's yours</Title>
            <Body dim size={13}>
              One of these
            </Body>
          </Row>
          <Segment
            options={PROOF}
            value={proof}
            onChange={setProof}
            style={{ marginTop: S.md }}
          />
          {proof === "call" ? (
            <View style={{ marginTop: S.md, gap: S.sm }}>
              <Body dim size={13}>
                Ten minutes with someone from Outhere. Pick a time.
              </Body>
              <Row gap={6} style={{ flexWrap: "wrap" }}>
                {slots.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setSlot(t)}
                    style={[styles.chip, slot === t && styles.chipOn]}
                  >
                    <Clock size={12} color={slot === t ? "#fff" : C.textDim} />
                    <Text
                      style={[styles.chipText, slot === t && styles.chipTextOn]}
                    >
                      {whenLabel(t)}
                    </Text>
                  </Pressable>
                ))}
              </Row>
            </View>
          ) : (
            <Field
              label={
                proof === "instagram"
                  ? "The club's Instagram"
                  : "The club's Strava page"
              }
              icon={proof === "instagram" ? Camera : null}
              style={{ marginTop: S.sm }}
            >
              <TextInput
                value={handle}
                onChangeText={setHandle}
                placeholder={
                  proof === "instagram"
                    ? "@southbankrunners"
                    : "strava.com/clubs/southbank"
                }
                placeholderTextColor={C.textMute}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                accessibilityLabel="Club page"
              />
              <Body mute size={12} style={{ marginTop: 4 }}>
                We'll give you a six digit code to put in the bio.
              </Body>
            </Field>
          )}

          <Button
            title="Send for review"
            size="lg"
            full
            disabled={!ready}
            loading={claim.isPending}
            onPress={submit}
            style={{ marginTop: S.xl }}
          />
          <Body mute size={12} style={{ textAlign: "center", marginTop: S.md }}>
            A real person at Outhere checks every club. You'll hear back within
            48 hours.
          </Body>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: "row", gap: 6 },
  step: {
    width: 22,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.surfaceHigh,
  },
  stepOn: { backgroundColor: C.accent },
  kick: {
    color: C.accentHi,
    fontFamily: F.bodySemi,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginTop: S.sm,
    marginBottom: 6,
  },
  big: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 44,
    lineHeight: 44,
    textTransform: "uppercase",
  },
  field: {
    flexDirection: "row",
    gap: S.sm,
    padding: S.md,
    paddingTop: S.sm,
    borderRadius: R.md,
    backgroundColor: C.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  fieldLabel: { color: C.textDim, fontFamily: F.bodyMedium, fontSize: 12 },
  input: {
    color: C.text,
    fontFamily: F.bodySemi,
    fontSize: 16,
    paddingVertical: 4,
    minHeight: 32,
    outlineStyle: "none",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 99,
    backgroundColor: C.surfaceHigh,
  },
  chipOn: { backgroundColor: C.accent },
  chipText: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 13 },
  chipTextOn: { color: "#fff" },
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
