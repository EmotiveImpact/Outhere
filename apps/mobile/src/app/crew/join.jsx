// Join a crew: type the six letter code a friend sent, or pick a crew near
// you. Open crews let you straight in; others take a request the admins
// answer. Starting your own is one tap.

import React, { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { Body, Button, C, Card, F, FadeIn, Row, S, Screen, Skeleton } from "@/components/ui";
import { engine, useCrewLimits, useCrewsNear, useEngineMutation, useUpgradePrompt } from "@/data/hooks";
import { tierLabel } from "@/utils/format";
import { PHOTOS } from "@/constants/photos";
import { BackSlab } from "@/components/crew/CrewHead";
import { CrewLogo, joinedToast, useCrewFocus } from "@/components/crew/shared";

const LEN = 6;

function CodeBoxes({ onDone, busy }) {
  const input = useRef(null);
  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(false);
  const change = (t) => {
    const clean = t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, LEN);
    setCode(clean);
    if (clean.length === LEN) onDone(clean, () => setCode(""));
  };
  return (
    <Pressable onPress={() => input.current?.focus()} accessibilityLabel="Invite code">
      <Row gap={8}>
        {Array.from({ length: LEN }, (_, i) => {
          const active = focused && i === Math.min(code.length, LEN - 1);
          return (
            <View key={i} style={[styles.box, active && styles.boxActive]}>
              <Text style={styles.boxText}>{code[i] || ""}</Text>
            </View>
          );
        })}
      </Row>
      <TextInput
        ref={input}
        value={code}
        onChangeText={change}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={LEN}
        editable={!busy}
        caretHidden
        style={styles.hidden}
        accessibilityLabel="Crew invite code"
      />
    </Pressable>
  );
}

export default function JoinCrew() {
  const router = useRouter();
  const focus = useCrewFocus((s) => s.focus);
  const near = useCrewsNear();
  const limits = useCrewLimits();
  const openUpgrade = useUpgradePrompt((s) => s.open);
  const [all, setAll] = useState(false);

  const inTab = (crew) => {
    if (!crew?.isMember) return;
    focus(crew.id);
    router.dismissTo("/(tabs)/club");
  };
  const byCode = useEngineMutation(engine.joinCrewByCode, { success: joinedToast, onSuccess: inTab });
  const join = useEngineMutation(engine.joinCrew, { success: joinedToast, onSuccess: inTab });
  const cancel = useEngineMutation(engine.cancelJoinRequest, { success: "Request withdrawn" });

  const start = () => {
    const l = limits.data;
    if (l && !l.canCreate) {
      openUpgrade(l.maxOwned === 0 ? "pro" : "black", l.maxOwned === 0 ? "Starting a crew is a Pro feature." : `You already own ${l.owned} of ${l.maxOwned} crews on ${tierLabel(l.tier)}.`);
      return;
    }
    router.push("/crew/create");
  };

  const crews = near.data || [];
  const shown = all ? crews : crews.slice(0, 4);

  return (
    <Screen scroll padded={false} style={{ paddingTop: 0 }}>
      <BackSlab kicker="Crews" top="Join a" bottom="crew" photo={PHOTOS.friends} height={230} />
      <View style={{ paddingHorizontal: S.gutter, paddingTop: S.xl }}>
        <Row style={{ justifyContent: "space-between", marginBottom: S.md }}>
          <Text style={styles.h}>Got an invite code?</Text>
          <Body dim size={12}>
            {LEN} letters
          </Body>
        </Row>
        <CodeBoxes busy={byCode.isPending} onDone={(code, reset) => byCode.mutate(code, { onError: reset })} />

        <Row style={{ justifyContent: "space-between", marginTop: S.xxl, marginBottom: S.md }}>
          <Text style={styles.h}>Near you</Text>
          {crews.length > 4 ? (
            <Pressable onPress={() => setAll((x) => !x)} hitSlop={8}>
              <Text style={styles.link}>{all ? "Show fewer" : "See all"}</Text>
            </Pressable>
          ) : null}
        </Row>
        {near.isPending ? (
          <Skeleton height={76} radius={20} />
        ) : crews.length ? (
          shown.map((c, i) => {
            const ask = c.joinPolicy === "request";
            const codeOnly = c.joinPolicy === "invite";
            const sub = [`${c.memberCount} members`, codeOnly ? "code only" : ask ? "ask to join" : "open", c.awayKm != null ? `${c.awayKm} km` : c.area].filter(Boolean).join(" · ");
            return (
              <FadeIn key={c.id} index={i}>
                <Card padding={S.md} style={{ marginBottom: S.md }} onPress={() => router.push(`/crew/${c.id}`)}>
                  <Row gap={S.md}>
                    <CrewLogo crew={c} size={52} radius={14} ring={false} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Body dim size={13} numberOfLines={1}>
                        {sub}
                      </Body>
                    </View>
                    {codeOnly ? null : c.requested ? (
                      <Button title="Asked" size="sm" variant="secondary" loading={cancel.isPending} onPress={() => cancel.mutate(c.id)} accessibilityLabel={`Withdraw your request to ${c.name}`} />
                    ) : (
                      <Button title={ask ? "Ask" : "Join"} size="sm" variant={ask ? "secondary" : "primary"} loading={join.isPending && join.variables === c.id} onPress={() => join.mutate(c.id)} />
                    )}
                  </Row>
                </Card>
              </FadeIn>
            );
          })
        ) : (
          <Body dim>No crews in your city yet. Start the first one.</Body>
        )}

        <Button title="Start your own crew" icon={Plus} variant="secondary" size="lg" full onPress={start} style={{ marginTop: S.sm }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h: { color: C.text, fontFamily: F.bodySemi, fontSize: 17 },
  link: { color: C.accent, fontFamily: F.bodySemi, fontSize: 13 },
  box: { flex: 1, aspectRatio: 0.86, borderRadius: 14, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "transparent" },
  boxActive: { borderColor: C.accent, backgroundColor: C.surface },
  boxText: { color: C.text, fontFamily: F.display, fontSize: 28 },
  hidden: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, opacity: 0.01, color: "transparent" },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 16 },
});
