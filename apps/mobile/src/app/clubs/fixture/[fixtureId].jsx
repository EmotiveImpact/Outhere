// A league fixture between two clubs. Club score is the squad's average
// counted steps a day, lifted by club run turnout (up to 20%). Blue is you,
// red is them. While it's on: who's out now and what your steps add. At the
// reveal, Sunday 20:00: who took it.

import React, { useMemo, useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Image as ImageIcon, Layers, Share2 } from "lucide-react-native";
import { AnimatedNumber, Body, Button, C, EmptyState, F, LIT, Meter, PhotoBackground, R, Row, S, Screen, Skeleton, Surface, TugBar as KitTug, useScreenTop } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { useCrew, useFixture } from "@/data/hooks";
import { loopAround } from "@/data/runMath";
import RunMap from "@/components/move/RunMap";
import { Chip, GlassRound, PillButton, RED, clock } from "@/components/clubs/parts";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fmt = (n) => (n == null ? "–" : Math.round(n).toLocaleString("en-GB"));

/** .oh-score .row: your value and bar, the label, theirs. */
function CompareRow({ label, a, b, aShare, bShare }) {
  return (
    <Row style={styles.cmp}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cmpVal}>{a}</Text>
        <Meter value={aShare} size={5} flow={false} style={{ marginTop: 6 }} />
      </View>
      <Text style={styles.cmpLabel}>{label}</Text>
      <View style={{ flex: 1, alignItems: "flex-end" }}>
        <Text style={styles.cmpVal}>{b}</Text>
        <View style={{ alignSelf: "stretch", transform: [{ scaleX: -1 }] }}>
          <Meter value={bShare} size={5} tone="red" flow={false} style={{ marginTop: 6 }} />
        </View>
      </View>
    </Row>
  );
}

function OutDots({ n, on, colour }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: n }, (_, i) => (
        <View
          key={i}
          style={[styles.dot, i < on && { backgroundColor: colour, boxShadow: `0 0 6px ${colour}` }]}
        />
      ))}
    </View>
  );
}

/** cvcLive: your squad out now, as faces on the map round the club's patch. */
function LiveMap({ crew, height, top }) {
  const centre = crew?.lat != null ? { latitude: crew.lat, longitude: crew.lng } : { latitude: 51.5045, longitude: -0.1102 };
  const line = useMemo(() => loopAround(centre, 4.2, `fixture:${crew?.id || "x"}`), [centre.latitude, centre.longitude, crew?.id]);
  const out = (crew?.members || []).filter((m) => m.isOutside && m.player && !m.player.isMe).slice(0, 5);
  const people = out.map((m, i) => {
    const at = line[Math.floor(((i + 1) / (out.length + 1)) * (line.length - 1))] || centre;
    return { id: m.player.id, avatar: m.player.avatar, crew: true, latitude: at.latitude, longitude: at.longitude };
  });
  return (
    <View style={{ height }}>
      <RunMap style={StyleSheet.absoluteFill} fitTo={line} plannedPath={line} plannedStyle="solid" people={people} showsUser={false} interactive={false} padding={{ top: top + 60, right: 50, bottom: 60, left: 50 }} />
      <LinearGradient colors={["rgba(7,9,12,0.6)", "rgba(7,9,12,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: top + 70 }} pointerEvents="none" />
      <LinearGradient colors={["rgba(7,9,12,0)", C.bg]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 110 }} pointerEvents="none" />
    </View>
  );
}

export default function Fixture() {
  const { fixtureId } = useLocalSearchParams();
  const id = String(fixtureId || "");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const top = useScreenTop();
  const [view, setView] = useState("photo");
  const { data: f, isPending, isError, refetch, isRefetching } = useFixture(id);
  const mineId = f ? (f.mySide !== "away" ? f.home : f.away).club?.id : null;
  const myCrew = useCrew(view === "map" ? mineId : null).data;

  if (isPending) {
    return (
      <Screen>
        <Skeleton height={300} radius={26} style={{ marginTop: S.lg }} />
      </Screen>
    );
  }
  if (isError || !f) {
    return (
      <Screen>
        <EmptyState
          title="Fixture not found"
          body="It may be from an old season."
          action="Back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const mineHome = f.mySide !== "away";
  const me = mineHome ? f.home : f.away;
  const them = mineHome ? f.away : f.home;
  const name = (c) => {
    const w = (c?.name || "").split(" ");
    return [w[0], w.slice(1).join(" ")];
  };
  const [meA, meB] = name(me.club);
  const [themA, themB] = name(them.club);
  // adjustsFontSizeToFit does nothing on web, so size the names by the longer one.
  const nameSize = Math.max(
    26,
    Math.min(40, Math.floor(200 / Math.max(meA.length, themA.length, 5))),
  );
  const reveal = new Date(f.revealAt);
  const chip = `${f.isDerby ? "Derby · double points" : `Week ${f.week}`} · ${DAYS[reveal.getDay()]} ${clock(f.revealAt)}`;
  const max = Math.max(me.daily || 0, them.daily || 0, 1);
  const turnMax = Math.max(me.turnout || 0, them.turnout || 0, 1);
  const won =
    f.revealed &&
    ((f.result === "home" && mineHome) || (f.result === "away" && !mineHome));
  const lost = f.revealed && f.result !== "draw" && !won;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
    <Screen
      padded={false}
      style={{ paddingTop: 0 }}
      onRefresh={refetch}
      refreshing={isRefetching}
    >
      {view === "map" ? (
        <LiveMap crew={myCrew} height={400 + insets.top} top={top} />
      ) : (
        <View style={[styles.vs, { height: 300 + insets.top }]}>
          {/* .r11vs: the derby photo, each side lit in its colour */}
          <PhotoBackground source={PHOTOS.derby} fade={[[0, 0.55], [0.3, 0.1], [0.62, 0.35], [1, 1]]} glow={false} grain={0.05} />
          <LinearGradient colors={["rgba(61,139,255,0.28)", "rgba(61,139,255,0)", "rgba(255,77,85,0)", "rgba(255,77,85,0.24)"]} locations={[0, 0.38, 0.62, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={["rgba(7,9,12,0)", C.bg]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 120 }} pointerEvents="none" />
          <Row style={styles.names}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.club, styles.clubBlue, { fontSize: nameSize, lineHeight: nameSize }]} numberOfLines={1} adjustsFontSizeToFit>
                {meA}
              </Text>
              <Text style={styles.clubSub}>{meB}</Text>
            </View>
            <Text style={styles.vsText}>VS</Text>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={[styles.club, styles.clubRed, { fontSize: nameSize, lineHeight: nameSize }]} numberOfLines={1} adjustsFontSizeToFit>
                {themA}
              </Text>
              <Text style={styles.clubSub}>{themB}</Text>
            </View>
          </Row>
        </View>
      )}

      <View style={{ paddingHorizontal: S.gutter }}>
        {/* .oh-score */}
        <Surface radius={24} padding={null} style={{ marginTop: -26, zIndex: 3 }} contentStyle={{ paddingTop: 14, paddingHorizontal: 15, paddingBottom: 12 }}>
          {f.revealed ? <Text style={[styles.result, { color: won ? C.accentHi : lost ? "#ff8b92" : C.text }]}>{won ? `${me.club?.short} take it` : lost ? `${them.club?.short} take it` : "Honours even"}</Text> : null}
          <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
            <View>
              <Text style={styles.scoreKick}>Club score</Text>
              <AnimatedNumber value={me.score || 0} format={fmt} style={[styles.score, styles.scoreBlue]} />
            </View>
            <View style={styles.smallVs}>
              <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { borderRadius: 19 }]} />
              <Text style={styles.smallVsText}>VS</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.scoreKick}>Club score</Text>
              <AnimatedNumber value={them.score || 0} format={fmt} style={[styles.score, styles.scoreRed]} />
            </View>
          </Row>
          {/* .oh-tug: blue from the left, red from the right, the white spark between */}
          <KitTug share={(me.score || 0) + (them.score || 0) ? (me.score || 0) / ((me.score || 0) + (them.score || 0)) : 0.5} height={10} style={{ marginTop: 14, marginBottom: 4 }} />
          {me.daily != null ? <CompareRow label="Squad average steps" a={fmt(me.daily)} b={fmt(them.daily)} aShare={me.daily / max} bShare={them.daily / max} /> : null}
          {me.turnout != null ? <CompareRow label="Run turnout" a={`${me.turnout}%`} b={`${them.turnout}%`} aShare={me.turnout / turnMax} bShare={them.turnout / turnMax} /> : null}
          <CompareRow label="Squad size" a={String(me.squad)} b={String(them.squad)} aShare={1} bShare={1} />
        </Surface>

        {f.live ? (
          <Surface radius={22} padding={16} style={{ marginTop: 12 }}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={styles.cardTitle}>Out now</Text>
              <Body size={13}>
                <Text style={{ color: C.accentHi, fontFamily: F.bodySemi }}>
                  {me.out} of {me.squad}
                </Text>
                {me.turnout != null
                  ? ` · worth +${((me.turnout / 100) * 20).toFixed(1)}%`
                  : ""}
              </Body>
            </Row>
            <OutDots n={me.squad} on={me.out} colour={C.accent} />
            <Row style={{ justifyContent: "space-between", marginTop: S.md }}>
              <Body dim size={13}>
                {them.club?.short}
              </Body>
              <Body size={13}>
                <Text style={{ color: RED, fontFamily: F.bodySemi }}>
                  {them.out} of {them.squad}
                </Text>
                {them.turnout != null
                  ? ` · worth +${((them.turnout / 100) * 20).toFixed(1)}%`
                  : ""}
              </Body>
            </Row>
            <OutDots n={them.squad} on={them.out} colour={RED} />
          </Surface>
        ) : null}

        {f.inSquad ? (
          // .r11next: you're in the squad
          <Surface radius={22} padding={null} style={{ marginTop: 12 }} contentStyle={{ paddingVertical: 14, paddingHorizontal: 15 }}>
            <Row gap={12}>
              <View style={{ flex: 1 }}>
                <Text style={styles.kick}>You're in the squad</Text>
                <Text style={styles.nextBig}>{fmt(f.myDaily)} steps a day</Text>
                <Text style={styles.small}>
                  {f.myLift > 0 ? `That lifts the squad average by ${fmt(f.myLift)}` : f.myLift < 0 ? `The squad needs ${fmt(-f.myLift)} more a day from you to stay level` : "Right on the squad average"}
                  {f.live ? ". Come to a club run: turnout is worth up to 20%" : ""}
                </Text>
              </View>
              {f.live ? <PillButton title="Run" onPress={() => router.push("/(tabs)/move")} /> : null}
            </Row>
          </Surface>
        ) : f.mySide ? (
          <Body dim size={13} style={{ marginTop: S.md }}>
            Not called up this week. Be active on three days out of seven to
            make the squad.
          </Body>
        ) : null}

        {f.revealed ? (
          <Button
            title="Share the result"
            icon={Share2}
            variant="secondary"
            full
            size="lg"
            style={{ marginTop: S.lg }}
            onPress={() =>
              Share.share({
                message: `${me.club?.name} ${fmt(me.score)}, ${them.club?.name} ${fmt(them.score)}. Club v club on Outhere.`,
              }).catch(() => {})
            }
          />
        ) : null}
        <Body mute size={12} style={{ marginTop: S.lg, textAlign: "center" }}>
          Equal squads drawn at random from active members. Counted steps only.
        </Body>
      </View>
    </Screen>
    <Row style={[styles.top, { top }]}>
      <GlassRound icon={ChevronLeft} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/club"))} />
      <Chip label={f.revealed ? "Full time" : view === "map" ? `${f.isDerby ? "Derby" : "Fixture"} live · ${me.out} out` : chip} tone={f.revealed ? "glass" : "live"} style={styles.topChip} />
      {f.revealed ? <View style={{ width: 38 }} /> : <GlassRound icon={view === "map" ? ImageIcon : Layers} label={view === "map" ? "Show the derby photo" : "Show who's out on the map"} onPress={() => setView((v) => (v === "map" ? "photo" : "map"))} />}
    </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  vs: {
    overflow: "hidden",
    justifyContent: "flex-end",
    backgroundColor: C.surface,
  },
  top: {
    position: "absolute",
    left: S.gutter,
    right: S.gutter,
    justifyContent: "space-between",
  },
  names: {
    paddingHorizontal: 18,
    paddingBottom: 46,
    alignItems: "flex-end",
  },
  topChip: { flexShrink: 1, backgroundColor: "rgba(10,14,20,0.45)" },
  clubBlue: { color: "#82b4ff", textShadowColor: "rgba(61,139,255,0.6)", textShadowRadius: 22, textShadowOffset: { width: 0, height: 0 } },
  clubRed: { color: "#ff8b92", textShadowColor: "rgba(255,77,85,0.55)", textShadowRadius: 22, textShadowOffset: { width: 0, height: 0 } },
  scoreKick: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 9.5, letterSpacing: 1.5, textTransform: "uppercase" },
  scoreBlue: { color: "#82b4ff", textShadowColor: "rgba(61,139,255,0.5)", textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },
  scoreRed: { color: "#ff8b92", textShadowColor: "rgba(255,77,85,0.45)", textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },
  smallVsText: { color: C.textSoft, fontFamily: F.display, fontSize: 13 },
  nextBig: { color: C.text, fontFamily: F.display, fontSize: 21, textTransform: "uppercase", marginTop: 5 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  club: {
    fontFamily: F.display,
    fontSize: 40,
    lineHeight: 40,
    textTransform: "uppercase",
  },
  clubSub: {
    color: C.textSoft,
    fontFamily: F.bodySemi,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  vsText: {
    color: "#fff",
    fontFamily: F.display,
    fontSize: 40,
    fontStyle: "italic",
    marginHorizontal: S.md,
    marginBottom: 6,
    textShadowColor: "rgba(255,255,255,0.45)",
    textShadowRadius: 20,
    textShadowOffset: { width: 0, height: 0 },
  },
  result: {
    fontFamily: F.display,
    fontSize: 30,
    textTransform: "uppercase",
    marginBottom: S.sm,
  },
  score: { fontFamily: F.display, fontSize: 40, lineHeight: 42, marginTop: 4 },
  smallVs: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 4, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16), inset 0 0 0 1px rgba(255,255,255,0.08), 0 10px 20px -8px #000" },
  cmp: { marginTop: S.md, gap: S.md },
  cmpVal: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  cmpLabel: {
    color: C.textDim,
    fontFamily: F.body,
    fontSize: 11.5,
    textAlign: "center",
    width: 88,
  },
  vb: {
    height: 4,
    borderRadius: 2,
    backgroundColor: C.surfaceHigh,
    marginTop: 4,
    overflow: "hidden",
  },
  vbFill: { height: 4, borderRadius: 2 },
  cardTitle: {
    color: C.text,
    fontFamily: F.bodySemi,
    fontSize: 15,
    marginTop: 2,
  },
  kick: {
    color: C.accentHi,
    fontFamily: F.bodySemi,
    fontSize: 10.5,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  dots: { flexDirection: "row", flexWrap: "wrap", gap: 3, marginTop: S.sm },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.08)" },
  up: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});
