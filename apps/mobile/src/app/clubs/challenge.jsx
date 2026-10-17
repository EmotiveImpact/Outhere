// Challenge a club, for captains: character select for clubs (the derby
// record, turnout and table place), then a club mode, then when. A mystery
// pick sends it to a random club near you; they find out who at the reveal.

import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowRight,
  ChevronLeft,
  Lock,
  MapPin,
  Shuffle,
  Trophy,
  Users,
  Zap,
} from "@/components/ui/icons";
import { Button, C, EmptyState, F, PhotoBackground, PressableScale, Row, Screen, SkeletonList, Surface, useScreenTop } from "@/components/ui";
import { imageSource } from "@/components/ui/Cover";
import { PHOTOS } from "@/constants/photos";
import { CLUB_MODES } from "@/constants/clubModes";
import {
  engine,
  useClubRoster,
  useCrew,
  useEngineMutation,
  useMyCrews,
} from "@/data/hooks";
import { Chip, GlassRound, LitRound, ordinal, whenLabel } from "@/components/clubs/parts";

const MODE_ART = {
  steps: { icon: Trophy, photo: PHOTOS.derby },
  live_race: { icon: Zap, photo: PHOTOS.clubrun },
  relay: { icon: ArrowRight, photo: PHOTOS.pacers },
  blind_time_trial: { icon: Lock, photo: PHOTOS.clubhero },
  turnout_night: { icon: Users, photo: PHOTOS.founding },
  turf_war: { icon: MapPin, photo: PHOTOS.marsh },
};

// Start options: tonight at seven if there's time, tomorrow at seven, Saturday at nine.
const startOptions = () => {
  const now = Date.now();
  const at = (days, h, m = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  };
  const out = [];
  if (at(0, 19) - now > 60 * 60 * 1000) out.push(at(0, 19));
  out.push(at(1, 19));
  const sat = (6 - new Date(now).getDay() + 7) % 7 || 7;
  out.push(at(sat, 9));
  return out;
};

export default function ChallengeClub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const top = useScreenTop();
  const { width } = useWindowDimensions();
  // Four tiles a row, sized in pixels: percentage widths collapse inside PressableScale on web.
  const tileW = Math.floor((Math.min(width, 520) - 32 - 3 * 7) / 4);
  const tileSize = { width: tileW, height: 84 };
  const params = useLocalSearchParams();
  const mine = useMyCrews();
  const clubId = String(
    params.club ||
      (mine.data || []).find((c) => c.isCaptain && c.verified)?.id ||
      "",
  );
  const crew = useCrew(clubId || null);
  const roster = useClubRoster(clubId || null);
  const [step, setStep] = useState("select");
  const [pick, setPick] = useState(
    params.opponent ? String(params.opponent) : null,
  );
  const [mode, setMode] = useState(params.mode ? String(params.mode) : "steps");
  const starts = useMemo(startOptions, []);
  const [startAt, setStartAt] = useState(starts[0]);

  const send = useEngineMutation(engine.challengeClub, {
    success: (b) =>
      b.opponent ? `Sent to ${b.opponent.name}` : "Sent to a mystery club",
    onSuccess: (b) => router.replace(`/clubs/battle/${b.id}`),
  });

  const list = roster.data?.roster || [];
  const chosen =
    pick === "mystery" ? null : list.find((r) => r.club.id === pick) || list[0];
  const picked = pick || chosen?.club.id;
  const back = () =>
    step === "select"
      ? router.canGoBack()
        ? router.back()
        : router.replace("/(tabs)/club")
      : setStep(step === "when" ? "mode" : "select");

  if (!clubId || (crew.data && !crew.data.isCaptain)) {
    return (
      <Screen>
        <EmptyState
          title="Captains only"
          body="Your club captain calls friendlies. Members vote when a club challenges yours."
          action="Back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }
  if (roster.isPending) {
    return (
      <Screen>
        <SkeletonList count={4} height={120} />
      </Screen>
    );
  }

  const oppName = picked === "mystery" ? "a mystery club" : chosen?.club.name;
  const m = CLUB_MODES.find((x) => x.key === mode);

  const tileFor = (r) => {
    const on = picked === r.club.id;
    return (
      <PressableScale key={r.club.id} onPress={() => setPick(r.club.id)} scaleTo={0.94} style={[styles.tile, tileSize, on && styles.tileOn]} accessibilityLabel={`Pick ${r.club.name}`}>
        <LinearGradient colors={["#10264f", "#05080e"]} start={{ x: 0.5, y: 0.1 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
        <Image source={imageSource(r.club.logo) || PHOTOS.crest} style={[StyleSheet.absoluteFill, !on && { opacity: 0.82 }]} contentFit="cover" />
        <LinearGradient colors={["rgba(3,5,10,0)", "rgba(3,5,10,0.75)"]} locations={[0.5, 1]} style={StyleSheet.absoluteFill} />
        {on ? <Text style={[styles.tag, styles.tagSmall]}>Away</Text> : null}
        <Text style={styles.tileName} numberOfLines={1}>
          {r.club.short}
        </Text>
        <View style={styles.tileBar} />
      </PressableScale>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen padded={false} style={{ paddingTop: 0 }} contentStyle={{ paddingBottom: 140 }}>
        {step === "select" ? (
          <>
            {/* .r11cs .hero: the club's crest, lit, with its record under glass */}
            <View style={[styles.hero, { height: 360 + insets.top }]}>
              <PhotoBackground
                source={picked === "mystery" ? PHOTOS.clubrun : imageSource(chosen?.club.logo) || imageSource(chosen?.club.cover) || PHOTOS.pacers}
                fade={[[0, 0.55], [0.26, 0], [0.55, 0.15], [1, 0.95]]}
                to="3,5,10"
                focus={{ x: 0.5, y: 0.4 }}
                opacity={picked === "mystery" ? 0.5 : 1}
                glow={false}
                grain={0.05}
                kenBurns
              />
              <LinearGradient colors={["rgba(42,106,240,0.35)", "rgba(42,106,240,0)"]} locations={[0, 0.55]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
              {picked === "mystery" ? <Text style={styles.heroQ}>?</Text> : null}
              <View style={styles.p2}>
                <Text style={styles.tag}>{picked === "mystery" ? "Mystery" : "Away"}</Text>
                <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit>
                  {picked === "mystery" ? "Mystery\nclub" : (chosen?.club.name || "").replace(" ", "\n")}
                </Text>
                <Text style={styles.p2Sub}>
                  {picked === "mystery"
                    ? "A random club near you. They find out who at the reveal."
                    : [chosen?.group, chosen?.club.memberCount != null ? `${chosen.club.memberCount} members` : null].filter(Boolean).join(" · ")}
                </Text>
              </View>
              {picked !== "mystery" && chosen ? (
                <Surface tone="glass" radius={16} padding={null} style={styles.rec} contentStyle={{ flexDirection: "row", paddingVertical: 9, paddingHorizontal: 4 }}>
                  {[
                    [`${chosen.record.w}`, `${chosen.record.l}`, chosen.isDerby ? "Derbies" : "Head to head"],
                    [chosen.turnout != null ? `${chosen.turnout}%` : "–", null, "Turnout"],
                    [chosen.tablePos ? ordinal(chosen.tablePos) : "–", null, "In your group", true],
                  ].map(([v, v2, l, blue], i) => (
                    <View key={l} style={[styles.recCell, i && styles.recLine]}>
                      <Text style={[styles.recBig, blue && { color: "#82b4ff" }]}>
                        {v}
                        {v2 != null ? <Text style={{ color: "#82b4ff" }}> – </Text> : null}
                        {v2}
                      </Text>
                      <Text style={styles.recSmall}>{l}</Text>
                    </View>
                  ))}
                </Surface>
              ) : null}
              <Row style={[styles.nav, { top }]}>
                <GlassRound icon={ChevronLeft} onPress={back} label="Back" />
                <Chip tone="glass" icon={Users} label="Captains only" />
              </Row>
            </View>
            <View style={styles.grid}>
              {list.map(tileFor)}
              <PressableScale onPress={() => setPick("mystery")} scaleTo={0.94} style={[styles.tile, tileSize, picked === "mystery" && styles.tileOn]} accessibilityLabel="Pick a mystery club">
                <Image source={PHOTOS.clubrun} style={[StyleSheet.absoluteFill, { opacity: 0.3 }]} contentFit="cover" />
                <Text style={styles.qm}>?</Text>
                <Text style={styles.tileName}>Mystery</Text>
              </PressableScale>
            </View>
          </>
        ) : step === "mode" ? (
          <View style={{ paddingHorizontal: 18, paddingTop: top }}>
            <Row style={{ justifyContent: "space-between" }}>
              <LitRound icon={ChevronLeft} onPress={back} label="Back" />
              <Chip icon={Users} label={`vs ${oppName}`} />
            </Row>
            <Text style={styles.kick}>Club v club · captains</Text>
            <Text style={styles.big}>Pick a</Text>
            <Text style={[styles.big, styles.blue]}>club mode</Text>
            {/* .r11modes */}
            <View style={styles.modes}>
              {CLUB_MODES.map((x) => {
                const art = MODE_ART[x.key];
                const Icon = art.icon;
                const on = x.key === mode;
                return (
                  <PressableScale key={x.key} disabled={x.soon} onPress={() => setMode(x.key)} scaleTo={0.97} style={[styles.mode, on && styles.modeOn, x.soon && { opacity: 0.55 }]} accessibilityLabel={x.name}>
                    <Image source={art.photo} style={[StyleSheet.absoluteFill, !on && { opacity: 0.7 }]} contentFit="cover" />
                    <LinearGradient colors={["rgba(3,5,10,0.1)", "rgba(3,5,10,0.92)"]} locations={[0, 0.62]} style={StyleSheet.absoluteFill} />
                    <View style={styles.modeIcon}>
                      <Icon size={15} color="#82b4ff" />
                    </View>
                    <View style={{ paddingHorizontal: 10, paddingBottom: 9 }}>
                      <Text style={styles.modeTag}>{x.soon ? "NEXT SEASON" : x.tag}</Text>
                      <Text style={styles.modeName} numberOfLines={1} adjustsFontSizeToFit>
                        {x.name}
                      </Text>
                      <Text style={styles.modeLine} numberOfLines={3}>
                        {x.line}
                      </Text>
                    </View>
                  </PressableScale>
                );
              })}
            </View>
            <Text style={styles.fine}>League fixtures are always steps so every club size plays fair. The other modes are friendlies and cup nights.</Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 18, paddingTop: top }}>
            <Row style={{ justifyContent: "space-between" }}>
              <LitRound icon={ChevronLeft} onPress={back} label="Back" />
              <Chip icon={Users} label={`vs ${oppName}`} />
            </Row>
            <Text style={styles.kick}>{m.name}</Text>
            <Text style={styles.big}>When do</Text>
            <Text style={[styles.big, styles.blue]}>you start?</Text>
            <View style={{ gap: 8, marginTop: 16 }}>
              {starts.map((t) => (
                <Surface key={t} tone={startAt === t ? "blue" : "lit"} radius={18} padding={null} onPress={() => setStartAt(t)} contentStyle={{ paddingVertical: 14, paddingHorizontal: 16 }}>
                  <Text style={[styles.whenText, startAt === t && { color: C.text }]}>{whenLabel(t)}</Text>
                  <Text style={styles.whenSub}>for {m.hours >= 24 ? `${Math.round(m.hours / 24)} days` : `${m.hours} hour${m.hours === 1 ? "" : "s"}`}</Text>
                </Surface>
              ))}
            </View>
            <Surface tone="sunk" radius={18} padding={16} style={{ marginTop: 14 }}>
              <Text style={styles.sumTitle}>
                {roster.data?.me?.name} v {oppName}
              </Text>
              <Text style={[styles.whenSub, { marginTop: 4, lineHeight: 17 }]}>{m.line} Friendly, no league points. Their captain has a day to accept.</Text>
            </Surface>
          </View>
        )}
      </Screen>

      <View style={[styles.foot, { paddingBottom: insets.bottom + 14 }]}>
        <LinearGradient colors={["rgba(7,9,12,0)", C.bg]} locations={[0, 0.4]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        {step === "select" ? (
          <Row gap={8}>
            <Button icon={Shuffle} variant="quiet" accessibilityLabel="Random club" onPress={() => setPick(list[Math.floor(Math.random() * list.length)]?.club.id)} style={{ width: 54, paddingHorizontal: 0 }} />
            <View style={{ flex: 1 }}>
              <Button title={picked === "mystery" ? "Challenge a mystery club" : `Challenge ${chosen?.club.short || ""}`} full disabled={!picked} onPress={() => setStep("mode")} />
            </View>
          </Row>
        ) : step === "mode" ? (
          <Button title={`${m.name} it is`} full onPress={() => setStep("when")} />
        ) : (
          <Button title={picked === "mystery" ? "Send it" : `Send to ${chosen?.club.short}`} full loading={send.isPending} onPress={() => send.mutate({ crewId: clubId, opponentId: picked === "mystery" ? null : picked, mode, startAt })} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: "hidden", borderBottomLeftRadius: 30, borderBottomRightRadius: 30, backgroundColor: "#03050a" },
  heroQ: { position: "absolute", top: 70, left: 0, right: 0, textAlign: "center", color: "#82b4ff", fontFamily: F.display, fontSize: 120, textShadowColor: "rgba(79,155,255,0.8)", textShadowRadius: 30, textShadowOffset: { width: 0, height: 0 } },
  nav: { position: "absolute", left: 18, right: 18, justifyContent: "space-between" },
  p2: { position: "absolute", left: 18, right: 18, bottom: 76 },
  // .tag: the skewed blue label
  tag: { alignSelf: "flex-start", color: "#fff", fontFamily: F.display, fontSize: 11, letterSpacing: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: "hidden", backgroundColor: "#2a6af0", textTransform: "uppercase", fontStyle: "italic", transform: [{ skewX: "-10deg" }], boxShadow: "0 6px 18px -6px rgba(42,106,240,0.9)" },
  tagSmall: { position: "absolute", top: 5, left: 5, fontSize: 9, paddingHorizontal: 5, paddingVertical: 3, borderRadius: 4 },
  name: { color: "#fff", fontFamily: F.display, fontSize: 52, lineHeight: 46, marginTop: 8, marginBottom: 6, fontStyle: "italic", textTransform: "uppercase", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 30, textShadowOffset: { width: 0, height: 6 } },
  p2Sub: { color: "#c9d3e2", fontFamily: F.body, fontSize: 12 },
  rec: { position: "absolute", left: 14, right: 14, bottom: 14 },
  recCell: { flex: 1, alignItems: "center" },
  recLine: { borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.1)" },
  recBig: { color: "#fff", fontFamily: F.display, fontSize: 19 },
  recSmall: { color: "#a3adbd", fontFamily: F.body, fontSize: 9.5, marginTop: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 7, paddingHorizontal: 16, marginTop: 14 },
  tile: { borderRadius: 13, overflow: "hidden", backgroundColor: "#111", justifyContent: "flex-end", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" },
  tileOn: { boxShadow: "0 0 0 2px #4f9bff, 0 0 22px rgba(79,155,255,0.6)", transform: [{ translateY: -2 }] },
  tileBar: { position: "absolute", left: 0, right: 0, bottom: 0, height: 3, backgroundColor: C.accent },
  tileName: { color: "#fff", fontFamily: F.bodySemi, fontSize: 10.5, textAlign: "center", paddingBottom: 7, textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  qm: { position: "absolute", top: 0, left: 0, right: 0, textAlign: "center", lineHeight: 70, color: "#82b4ff", fontFamily: F.display, fontSize: 34, textShadowColor: "rgba(79,155,255,0.8)", textShadowRadius: 16, textShadowOffset: { width: 0, height: 0 } },
  kick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 10.5, letterSpacing: 1.7, textTransform: "uppercase", marginTop: 18, marginBottom: 8 },
  big: { color: C.text, fontFamily: F.display, fontSize: 36, lineHeight: 35, textTransform: "uppercase" },
  blue: { color: C.accent, textShadowColor: "rgba(61,139,255,0.35)", textShadowRadius: 24, textShadowOffset: { width: 0, height: 0 } },
  modes: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  mode: { flexBasis: "47%", flexGrow: 1, height: 146, borderRadius: 18, overflow: "hidden", backgroundColor: C.surface, justifyContent: "flex-end", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" },
  modeOn: { boxShadow: "0 0 0 2px #4f9bff, 0 0 22px rgba(79,155,255,0.5)" },
  modeIcon: { position: "absolute", top: 9, left: 9, width: 28, height: 28, borderRadius: 9, backgroundColor: "rgba(10,14,20,0.6)", alignItems: "center", justifyContent: "center" },
  modeTag: { color: "#82b4ff", fontFamily: F.bodySemi, fontSize: 8, letterSpacing: 1.4 },
  modeName: { color: "#fff", fontFamily: F.display, fontSize: 16, lineHeight: 17, textTransform: "uppercase", marginTop: 4, marginBottom: 3 },
  modeLine: { color: "#c9d3e2", fontFamily: F.body, fontSize: 9.5, lineHeight: 12.5 },
  fine: { color: C.textMute, fontFamily: F.body, fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 12 },
  foot: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 26 },
  whenText: { color: C.textSoft, fontFamily: F.display, fontSize: 22, textTransform: "uppercase" },
  whenSub: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  sumTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
});
