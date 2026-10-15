// A club v club friendly. Incoming and still a mystery: "Here comes a
// challenger club", members vote and the captain decides. Then the clock,
// both clubs' scores (legs for a relay, sealed envelopes for a blind time
// trial) and, at the end, who took it.

import React from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Lock,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
  Users,
} from "lucide-react-native";
import {
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
import { imageSource } from "@/components/ui/Cover";
import { PHOTOS } from "@/constants/photos";
import { clubModeOf, clubScoreLabel } from "@/constants/clubModes";
import { engine, useClubBattle, useEngineMutation } from "@/data/hooks";
import { TugBar } from "@/components/arena/TugBar";
import { useNow } from "@/components/arena/shared";
import {
  Chip,
  ClubCrest,
  RED,
  startsLabel,
  whenLabel,
} from "@/components/clubs/parts";

const lengthLabel = (b) => {
  const h = Math.round((b.endAt - b.startAt) / 3600000);
  return h >= 24
    ? `${Math.round(h / 24)} days`
    : `${h} hour${h === 1 ? "" : "s"}`;
};

const countdown = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h >= 24
    ? `${Math.floor(h / 24)}d ${h % 24}h`
    : h
      ? `${h}h ${String(m).padStart(2, "0")}m`
      : `${m}m ${String(s % 60).padStart(2, "0")}s`;
};

function Challenger({ b, vote, respond }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Image
        source={PHOTOS.challenger || PHOTOS.clubrun}
        style={[StyleSheet.absoluteFill, { opacity: 0.55 }]}
        contentFit="cover"
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.1)", "rgba(0,0,0,0.92)"]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={{ paddingTop: insets.top + S.sm, paddingHorizontal: S.gutter }}
      >
        <IconButton
          icon={ChevronLeft}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)/club")
          }
          label="Back"
        />
      </View>
      <View style={styles.band}>
        <Text style={styles.bandSmall}>Here comes a</Text>
        <Text style={styles.bandBig}>Challenger club</Text>
      </View>
      <View style={{ alignItems: "center", marginTop: S.lg }}>
        <View style={styles.voteChip}>
          <Users size={13} color="#fff" />
          <Text style={styles.voteText}>
            Your members voted{" "}
            <Text style={{ fontFamily: F.bodySemi }}>
              {b.votes.yes} yes · {b.votes.no} no
            </Text>
          </Text>
        </View>
      </View>
      <View style={{ flex: 1 }} />
      <View style={[styles.box, { marginBottom: insets.bottom + S.lg }]}>
        <Row gap={S.md}>
          <View style={styles.qr}>
            <Text style={styles.qrText}>?</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.boxTitle}>A club near you</Text>
            <Body dim size={13}>
              Matched at random. Both clubs see who at the reveal.
            </Body>
          </View>
        </Row>
        <Row style={styles.facts}>
          {[
            [`${b.squad} v ${b.squad}`, "Squads"],
            [clubModeOf(b.mode).short || b.modeName, "Battle on"],
            [lengthLabel(b), "Length"],
            ["Friendly", "No league points"],
          ].map(([v, l]) => (
            <View key={l} style={styles.fact}>
              <Text
                style={styles.factBig}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {v}
              </Text>
              <Body dim size={11}>
                {l}
              </Body>
            </View>
          ))}
        </Row>
        <Body dim size={13} style={{ marginBottom: S.md }}>
          Starts {startsLabel(b.startAt)}.
        </Body>
        {b.canRespond ? (
          <Row gap={S.sm}>
            <Button
              title="Decline"
              variant="secondary"
              onPress={() => respond.mutate([b.id, false])}
              style={{ flex: 1 }}
            />
            <Button
              title="Accept for the club"
              onPress={() => respond.mutate([b.id, true])}
              loading={respond.isPending}
              style={{ flex: 1.6 }}
            />
          </Row>
        ) : b.canVote ? (
          <>
            <Row gap={S.sm}>
              <Button
                title="No"
                icon={ThumbsDown}
                variant={b.votes.mine === false ? "danger" : "secondary"}
                onPress={() => vote.mutate([b.id, false])}
                style={{ flex: 1 }}
              />
              <Button
                title="We're in"
                icon={ThumbsUp}
                variant={b.votes.mine === true ? "primary" : "secondary"}
                onPress={() => vote.mutate([b.id, true])}
                loading={vote.isPending}
                style={{ flex: 1.6 }}
              />
            </Row>
            <Body
              mute
              size={12}
              style={{ textAlign: "center", marginTop: S.sm }}
            >
              {b.votes.mine == null
                ? "Your captain decides once the club has had its say."
                : "Your vote is in. Your captain decides."}
            </Body>
          </>
        ) : (
          <Body dim size={13}>
            Waiting on your captain.
          </Body>
        )}
      </View>
    </View>
  );
}

function Legs({ times = [], legs, of, colour }) {
  return (
    <View style={styles.legs}>
      {Array.from({ length: of || 10 }, (_, i) => (
        <View
          key={i}
          style={[
            styles.leg,
            i < (legs || 0) && { backgroundColor: colour },
            i === (legs || 0) && styles.legNow,
          ]}
        >
          {times[i] ? (
            <Text style={styles.legText}>
              {Math.floor(times[i] / 60)}'
              {String(times[i] % 60).padStart(2, "0")}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export default function ClubBattle() {
  const { battleId } = useLocalSearchParams();
  const id = String(battleId || "");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const now = useNow(1000);
  const {
    data: b,
    isPending,
    isError,
    refetch,
    isRefetching,
  } = useClubBattle(id);
  const vote = useEngineMutation(engine.voteClubBattle, {
    success: (r) => (r.votes.mine ? "You voted in" : "You voted no"),
  });
  const respond = useEngineMutation(engine.respondClubBattle, {
    success: (r) =>
      r.status === "declined" ? "Declined" : "Accepted for the club",
  });
  const cancel = useEngineMutation(engine.cancelClubBattle, {
    success: "Called off",
  });

  if (isPending) {
    return (
      <Screen>
        <Skeleton height={320} radius={26} style={{ marginTop: S.lg }} />
      </Screen>
    );
  }
  if (isError || !b) {
    return (
      <Screen>
        <EmptyState
          title="That friendly has gone"
          body="It may have been called off."
          action="Back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }
  if (b.hidden && b.status === "pending")
    return <Challenger b={b} vote={vote} respond={respond} />;

  const them = b.opponent;
  // Long club names would clip beside the crests, so size both by the longer one.
  const sideSize = Math.min(
    22,
    Math.floor(
      180 /
        Math.max((b.myClub?.short || "").length, (them?.short || "").length, 8),
    ),
  );
  const finished = b.status === "finished";
  const live = b.status === "live";
  const lowerWins = b.unit === "time";
  const mineV = b.myScore;
  const theirV = b.theirScore;
  const tugMine = mineV == null ? 0 : lowerWins ? theirV || 0 : mineV;
  const tugTheirs = theirV == null ? 0 : lowerWins ? mineV || 0 : theirV;
  const statusChip = finished
    ? "Full time"
    : live
      ? `Live · ${countdown(b.endAt - now)} left`
      : b.status === "accepted"
        ? `Starts in ${countdown(b.startAt - now)}`
        : b.status === "pending"
          ? "Waiting on their captain"
          : b.status === "declined"
            ? "Declined"
            : "Called off";
  const headline = finished
    ? b.draw
      ? "Honours even"
      : b.won
        ? `${b.myClub?.short} take it`
        : `${them?.short || "They"} take it`
    : b.modeName;

  return (
    <Screen
      padded={false}
      style={{ paddingTop: 0 }}
      onRefresh={refetch}
      refreshing={isRefetching}
    >
      <View style={[styles.hero, { height: 300 + insets.top }]}>
        <Image
          source={imageSource(them?.cover) || PHOTOS.derby}
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
        <Row style={[styles.nav, { top: insets.top + S.sm }]}>
          <IconButton
            icon={ChevronLeft}
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/(tabs)/club")
            }
            label="Back"
          />
          <Chip label={statusChip} tone={live ? "live" : "neutral"} />
        </Row>
        <View style={{ padding: S.gutter, paddingBottom: 40 }}>
          <Text style={styles.kick}>Club v club · {b.tag} · friendly</Text>
          <Text
            style={[
              styles.big,
              finished && b.won && { color: C.accentHi },
              finished && b.won === false && { color: RED },
            ]}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {headline}
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: S.gutter }}>
        <Card padding={S.lg} style={{ marginTop: -26 }}>
          <Row style={{ justifyContent: "space-between" }}>
            <Row gap={S.sm} style={{ flex: 1 }}>
              <ClubCrest club={b.myClub} size={34} />
              <Text
                style={[styles.side, { color: C.accentHi, fontSize: sideSize }]}
                numberOfLines={1}
              >
                {b.myClub?.short}
              </Text>
            </Row>
            <Text style={styles.vs}>VS</Text>
            <Row gap={S.sm} style={{ flex: 1, justifyContent: "flex-end" }}>
              <Text
                style={[styles.side, { color: RED, fontSize: sideSize }]}
                numberOfLines={1}
              >
                {them?.short || "?"}
              </Text>
              <ClubCrest club={them} size={34} />
            </Row>
          </Row>

          {b.sealed ? (
            <Row gap={S.sm} style={{ marginTop: S.lg }}>
              {[b.myClub?.short, them?.short].map((n, i) => (
                <View
                  key={i}
                  style={[
                    styles.env,
                    {
                      borderColor: i
                        ? "rgba(255,77,85,0.4)"
                        : "rgba(61,139,255,0.4)",
                    },
                  ]}
                >
                  <Lock size={18} color={i ? RED : C.accentHi} />
                  <Text style={styles.envTitle}>{n}</Text>
                  <Body dim size={12}>
                    Average 5 km time, sealed
                  </Body>
                </View>
              ))}
            </Row>
          ) : (
            <>
              <Row
                style={{
                  justifyContent: "space-between",
                  marginTop: S.lg,
                  alignItems: "flex-end",
                }}
              >
                <Text style={[styles.score, { color: C.accentHi }]}>
                  {clubScoreLabel(b.mode, mineV)}
                </Text>
                <Text style={[styles.score, { color: RED }]}>
                  {clubScoreLabel(b.mode, theirV)}
                </Text>
              </Row>
              <TugBar
                mine={tugMine}
                theirs={tugTheirs}
                height={8}
                knot
                style={{ marginTop: S.sm }}
              />
              {b.mode === "relay" && (live || finished) ? (
                <View style={{ marginTop: S.lg, gap: S.sm }}>
                  <Body dim size={12}>
                    {b.myClub?.short}
                  </Body>
                  <Legs
                    times={b.myLegTimes || []}
                    legs={b.myLegs ?? (finished ? b.legsOf : 0)}
                    of={b.legsOf || 10}
                    colour={C.accent}
                  />
                  <Body dim size={12}>
                    {them?.short}
                  </Body>
                  <Legs
                    legs={b.theirLegs ?? (finished ? b.legsOf : 0)}
                    of={b.legsOf || 10}
                    colour={RED}
                  />
                </View>
              ) : null}
            </>
          )}
          <Body dim size={13} style={{ marginTop: S.md }}>
            {b.mode === "steps"
              ? "Squad average counted steps a day, lifted by club run turnout."
              : b.mode === "live_race"
                ? "Kilometres run by the squad inside the hour."
                : b.mode === "relay"
                  ? "Ten 1 km legs by ten different runners. Lower total wins."
                  : b.mode === "blind_time_trial"
                    ? "Every squad member runs 5 km. Times open at the end."
                    : "Share of the club checked in to a club run tonight."}
          </Body>
        </Card>

        <Card padding={S.lg} style={{ marginTop: S.md }}>
          <Row style={{ justifyContent: "space-between" }}>
            <Body dim size={13}>
              Squads
            </Body>
            <Body size={13}>
              {b.squad} v {b.squad}
            </Body>
          </Row>
          <Row style={{ justifyContent: "space-between", marginTop: S.sm }}>
            <Body dim size={13}>
              {finished ? "Ended" : live ? "Ends" : "Starts"}
            </Body>
            <Body size={13}>
              {whenLabel(finished || live ? b.endAt : b.startAt)}
            </Body>
          </Row>
          <Row style={{ justifyContent: "space-between", marginTop: S.sm }}>
            <Body dim size={13}>
              Counts for
            </Body>
            <Body size={13}>Club record, no league points</Body>
          </Row>
        </Card>

        {live && ["live_race", "relay", "blind_time_trial"].includes(b.mode) ? (
          <Button
            title="Go run"
            size="lg"
            full
            style={{ marginTop: S.lg }}
            onPress={() => router.push("/(tabs)/move")}
          />
        ) : null}
        {live && b.mode === "turnout_night" ? (
          <Button
            title="Find tonight's club run"
            size="lg"
            full
            style={{ marginTop: S.lg }}
            onPress={() => router.push(`/crew/${b.myClub?.id}`)}
          />
        ) : null}
        {b.canRespond && b.status === "pending" ? (
          <Row gap={S.sm} style={{ marginTop: S.lg }}>
            <Button
              title="Decline"
              variant="secondary"
              onPress={() => respond.mutate([b.id, false])}
              style={{ flex: 1 }}
            />
            <Button
              title="Accept for the club"
              onPress={() => respond.mutate([b.id, true])}
              style={{ flex: 1.6 }}
            />
          </Row>
        ) : null}
        {finished && b.isCaptain && them ? (
          <Button
            title={`Rematch ${them.short}`}
            icon={RotateCcw}
            size="lg"
            full
            style={{ marginTop: S.lg }}
            onPress={() =>
              router.push(
                `/clubs/challenge?club=${b.myClub?.id}&opponent=${them.id}&mode=${b.mode}`,
              )
            }
          />
        ) : null}
        {b.canCancel ? (
          <Button
            title="Call it off"
            variant="ghost"
            full
            style={{ marginTop: S.sm }}
            onPress={() =>
              Alert.alert("Call it off?", "The friendly ends with no result.", [
                { text: "Keep it", style: "cancel" },
                {
                  text: "Call it off",
                  style: "destructive",
                  onPress: () => cancel.mutate(b.id),
                },
              ])
            }
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  band: {
    marginTop: 70,
    backgroundColor: RED,
    paddingVertical: S.md,
    alignItems: "center",
    transform: [{ skewY: "-4deg" }],
  },
  bandSmall: {
    color: "#fff",
    fontFamily: F.bodySemi,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  bandBig: {
    color: "#fff",
    fontFamily: F.display,
    fontSize: 46,
    textTransform: "uppercase",
    fontStyle: "italic",
  },
  voteChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  voteText: { color: "#fff", fontFamily: F.body, fontSize: 13 },
  box: {
    marginHorizontal: S.gutter,
    padding: S.lg,
    borderRadius: 24,
    backgroundColor: "rgba(18,21,26,0.92)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  qr: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  qrText: { color: RED, fontFamily: F.display, fontSize: 30 },
  boxTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 16 },
  facts: {
    marginVertical: S.lg,
    borderRadius: R.md,
    backgroundColor: C.bg,
    paddingVertical: S.md,
  },
  fact: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  factBig: { color: C.text, fontFamily: F.display, fontSize: 18 },
  hero: { overflow: "hidden", justifyContent: "flex-end" },
  nav: {
    position: "absolute",
    left: S.gutter,
    right: S.gutter,
    justifyContent: "space-between",
  },
  kick: {
    color: C.accentHi,
    fontFamily: F.bodySemi,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  big: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 46,
    lineHeight: 46,
    textTransform: "uppercase",
  },
  side: {
    fontFamily: F.display,
    fontSize: 22,
    textTransform: "uppercase",
    flexShrink: 1,
  },
  vs: {
    color: C.textMute,
    fontFamily: F.display,
    fontSize: 18,
    marginHorizontal: S.sm,
  },
  score: { fontFamily: F.display, fontSize: 36 },
  env: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    padding: S.lg,
    borderRadius: R.lg,
    borderWidth: 1,
    backgroundColor: C.bg,
  },
  envTitle: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 20,
    textTransform: "uppercase",
  },
  legs: { flexDirection: "row", gap: 4 },
  leg: {
    flex: 1,
    height: 26,
    borderRadius: 6,
    backgroundColor: C.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  legNow: { borderWidth: 1.5, borderColor: C.warn },
  legText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 8.5 },
});
