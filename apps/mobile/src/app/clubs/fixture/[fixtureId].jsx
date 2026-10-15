// A league fixture between two clubs. Club score is the squad's average
// counted steps a day, lifted by club run turnout (up to 20%). Blue is you,
// red is them. While it's on: who's out now and what your steps add. At the
// reveal, Sunday 20:00: who took it.

import React from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowUp, ChevronLeft, Share2 } from "lucide-react-native";
import {
  AnimatedNumber,
  Body,
  Button,
  C,
  Card,
  EmptyState,
  F,
  IconButton,
  R,
  Row,
  S,
  Screen,
  Skeleton,
} from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { useFixture } from "@/data/hooks";
import { TugBar } from "@/components/arena/TugBar";
import { Chip, RED, clock } from "@/components/clubs/parts";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fmt = (n) => (n == null ? "–" : Math.round(n).toLocaleString("en-GB"));

function CompareRow({ label, a, b, aShare, bShare }) {
  return (
    <Row style={styles.cmp}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cmpVal}>{a}</Text>
        <View style={styles.vb}>
          <View
            style={[
              styles.vbFill,
              {
                width: `${Math.round(aShare * 100)}%`,
                backgroundColor: C.accent,
              },
            ]}
          />
        </View>
      </View>
      <Text style={styles.cmpLabel}>{label}</Text>
      <View style={{ flex: 1, alignItems: "flex-end" }}>
        <Text style={styles.cmpVal}>{b}</Text>
        <View style={styles.vb}>
          <View
            style={[
              styles.vbFill,
              {
                width: `${Math.round(bShare * 100)}%`,
                backgroundColor: RED,
                alignSelf: "flex-end",
              },
            ]}
          />
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
          style={[styles.dot, i < on && { backgroundColor: colour }]}
        />
      ))}
    </View>
  );
}

export default function Fixture() {
  const { fixtureId } = useLocalSearchParams();
  const id = String(fixtureId || "");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: f, isPending, isError, refetch, isRefetching } = useFixture(id);

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
    <Screen
      padded={false}
      style={{ paddingTop: 0 }}
      onRefresh={refetch}
      refreshing={isRefetching}
    >
      <View style={[styles.vs, { height: 300 + insets.top }]}>
        <Image
          source={PHOTOS.derby}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        <LinearGradient
          colors={[
            "rgba(7,9,12,0.55)",
            "rgba(7,9,12,0.15)",
            "rgba(7,9,12,0.96)",
          ]}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
        <Row style={[styles.top, { top: insets.top + S.sm }]}>
          <IconButton
            icon={ChevronLeft}
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/(tabs)/club")
            }
            label="Back"
          />
          <Chip
            label={f.revealed ? "Full time" : chip}
            tone={f.revealed ? "neutral" : "live"}
          />
        </Row>
        <Row style={styles.names}>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.club,
                { color: C.accentHi, fontSize: nameSize, lineHeight: nameSize },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {meA}
            </Text>
            <Text style={styles.clubSub}>{meB}</Text>
          </View>
          <Text style={styles.vsText}>VS</Text>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text
              style={[
                styles.club,
                { color: RED, fontSize: nameSize, lineHeight: nameSize },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {themA}
            </Text>
            <Text style={styles.clubSub}>{themB}</Text>
          </View>
        </Row>
      </View>

      <View style={{ paddingHorizontal: S.gutter }}>
        <Card padding={S.lg} style={{ marginTop: -26 }}>
          {f.revealed ? (
            <Text
              style={[
                styles.result,
                { color: won ? C.accentHi : lost ? RED : C.text },
              ]}
            >
              {won
                ? `${me.club?.short} take it`
                : lost
                  ? `${them.club?.short} take it`
                  : "Honours even"}
            </Text>
          ) : null}
          <Row
            style={{ justifyContent: "space-between", alignItems: "flex-end" }}
          >
            <View>
              <Body dim size={12}>
                Club score
              </Body>
              <AnimatedNumber
                value={me.score || 0}
                format={fmt}
                style={[styles.score, { color: C.accentHi }]}
              />
            </View>
            <Text style={styles.smallVs}>VS</Text>
            <View style={{ alignItems: "flex-end" }}>
              <Body dim size={12}>
                Club score
              </Body>
              <AnimatedNumber
                value={them.score || 0}
                format={fmt}
                style={[styles.score, { color: RED }]}
              />
            </View>
          </Row>
          <TugBar
            mine={me.score || 0}
            theirs={them.score || 0}
            height={8}
            knot
            style={{ marginTop: S.md, marginBottom: S.sm }}
          />
          {me.daily != null ? (
            <CompareRow
              label="Squad average steps"
              a={fmt(me.daily)}
              b={fmt(them.daily)}
              aShare={me.daily / max}
              bShare={them.daily / max}
            />
          ) : null}
          {me.turnout != null ? (
            <CompareRow
              label="Run turnout"
              a={`${me.turnout}%`}
              b={`${them.turnout}%`}
              aShare={me.turnout / turnMax}
              bShare={them.turnout / turnMax}
            />
          ) : null}
          <CompareRow
            label="Squad size"
            a={String(me.squad)}
            b={String(them.squad)}
            aShare={1}
            bShare={1}
          />
        </Card>

        {f.live ? (
          <Card padding={S.lg} style={{ marginTop: S.md }}>
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
          </Card>
        ) : null}

        {f.inSquad ? (
          <Card padding={S.lg} style={{ marginTop: S.md }}>
            <Row gap={S.md}>
              <View style={styles.up}>
                <ArrowUp size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.kick}>You're in the squad</Text>
                <Text style={styles.cardTitle}>
                  {fmt(f.myDaily)} steps a day
                </Text>
                <Body dim size={13}>
                  {f.myLift > 0
                    ? `That lifts the squad average by ${fmt(f.myLift)}`
                    : f.myLift < 0
                      ? `The squad needs ${fmt(-f.myLift)} more a day from you to stay level`
                      : "Right on the squad average"}
                </Body>
              </View>
            </Row>
            {f.live ? (
              <Body dim size={13} style={{ marginTop: S.md }}>
                Come to a club run: turnout is worth up to 20%.
              </Body>
            ) : null}
          </Card>
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
    paddingHorizontal: S.gutter,
    paddingBottom: 44,
    alignItems: "flex-end",
  },
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
  },
  result: {
    fontFamily: F.display,
    fontSize: 30,
    textTransform: "uppercase",
    marginBottom: S.sm,
  },
  score: { fontFamily: F.display, fontSize: 38 },
  smallVs: {
    color: C.textMute,
    fontFamily: F.display,
    fontSize: 16,
    marginBottom: 10,
  },
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
  dots: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: S.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.surfaceHigh },
  up: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});
