// Join a crew: type the six letter code a friend sent, or pick a crew near
// you. Open crews let you straight in; others take a request the admins
// answer. Starting your own is one tap.

import React, { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Plus } from "@/components/ui/icons";
import { Body, C, F, FadeIn, GlowButton, PressableScale, Row, Skeleton, Surface } from "@/components/ui";
import { engine, useCrewLimits, useCrewsNear, useEngineMutation, useUpgradePrompt } from "@/data/hooks";
import { tierLabel } from "@/utils/format";
import { PHOTOS } from "@/constants/photos";
import { HeroPage } from "@/components/account/parts";
import { PillButton } from "@/components/profile/parts";
import { joinedToast, useCrewFocus } from "@/components/crew/shared";

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
      {/* .code: six recessed boxes, the next one ringed in blue with its cursor */}
      <Row gap={7}>
        {Array.from({ length: LEN }, (_, i) => {
          const active = focused && i === Math.min(code.length, LEN - 1);
          return (
            <View key={i} style={[styles.box, active && styles.boxActive]}>
              {code[i] ? <Text style={styles.boxText}>{code[i]}</Text> : active ? <View style={styles.cursor} /> : null}
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

/** .cr2: the crest on near black, its own black falling away into the tile. */
function Crest({ crew }) {
  const src = crew.logo || crew.cover;
  return (
    <View style={styles.crest}>
      {src ? (
        <Image source={src} style={{ width: 54, height: 54 }} contentFit="cover" />
      ) : (
        <Text style={[styles.crestText, { color: crew.accent || C.accentHi }]}>{(crew.name || "?").slice(0, 1).toUpperCase()}</Text>
      )}
    </View>
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
    // .slab 236 with the crest floating on the right, headline at 44
    <HeroPage kicker="Crews" top="Join a" bottom="crew" height={222} size={44} object={PHOTOS.crest} objectSize={214} objectTop={16} objectStyle={{ right: -30 }}>
      <View style={styles.calhead}>
        <Text style={styles.h}>Got an invite code?</Text>
        <Text style={styles.hint}>{LEN} letters</Text>
      </View>
      <CodeBoxes busy={byCode.isPending} onDone={(code, reset) => byCode.mutate(code, { onError: reset })} />

      <Row style={{ justifyContent: "space-between", marginTop: 4 }}>
        <Text style={styles.sec}>Near you</Text>
        {crews.length > 4 ? (
          <Pressable onPress={() => setAll((x) => !x)} hitSlop={8}>
            <Text style={styles.link}>{all ? "Show fewer" : "See all"}</Text>
          </Pressable>
        ) : null}
      </Row>
      {near.isPending ? (
        <Skeleton height={64} radius={20} />
      ) : crews.length ? (
        shown.map((c, i) => {
          const ask = c.joinPolicy === "request";
          const codeOnly = c.joinPolicy === "invite";
          const sub = [`${c.memberCount} members`, codeOnly ? "code only" : ask ? "ask to join" : "open", c.awayKm != null ? `${c.awayKm} km` : c.area].filter(Boolean).join(" · ");
          return (
            <FadeIn key={c.id} index={i}>
              {/* .card.sres: crest, name, members and how to get in; Join on blue, Ask quiet */}
              <Surface radius={20} padding={null} contentStyle={styles.sres}>
                <PressableScale onPress={() => router.push(`/crew/${c.id}`)} scaleTo={0.98} accessibilityLabel={c.name} style={styles.who}>
                  <Crest crew={c} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text style={styles.small} numberOfLines={1}>
                      {sub}
                    </Text>
                  </View>
                </PressableScale>
                {codeOnly ? null : c.requested ? (
                  <PillButton title="Asked" ghost disabled={cancel.isPending} onPress={() => cancel.mutate(c.id)} />
                ) : (
                  <PillButton title={ask ? "Ask" : "Join"} ghost={ask} disabled={join.isPending && join.variables === c.id} onPress={() => join.mutate(c.id)} />
                )}
              </Surface>
            </FadeIn>
          );
        })
      ) : (
        <Body dim size={13}>
          No crews in your city yet. Start the first one.
        </Body>
      )}

      <GlowButton title="Start your own crew" icon={Plus} variant="quiet" size="md" full onPress={start} style={{ height: 48 }} textStyle={{ fontSize: 14 }} />
    </HeroPage>
  );
}

const styles = StyleSheet.create({
  // .calhead: 13 semibold with the hint at 11 on the right
  calhead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  h: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  hint: { color: C.textDim, fontFamily: F.body, fontSize: 11 },
  sec: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5 },
  link: { color: C.accent, fontFamily: F.bodySemi, fontSize: 12 },
  box: { flex: 1, height: 54, borderRadius: 14, backgroundColor: "#15181e", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)" },
  boxActive: { boxShadow: "inset 0 0 0 1.5px #3d8bff, 0 0 18px -6px rgba(61,139,255,0.8)" },
  boxText: { color: C.text, fontFamily: F.display, fontSize: 26 },
  cursor: { width: 2, height: 24, backgroundColor: C.accent },
  hidden: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0, opacity: 0.01, color: "transparent" },
  sres: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 10, paddingBottom: 10, paddingLeft: 12, paddingRight: 12 },
  who: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  crest: { width: 44, height: 44, borderRadius: 13, backgroundColor: "#05080e", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  crestText: { fontFamily: F.display, fontSize: 20 },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 10.5, marginTop: 2 },
});
