// Pieces shared by the run club and club v club screens: crests, faces, the
// club card in Find your run club, the next club run card, the fixture card
// and the club panel that sits under a club's hero.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import {
  BadgeCheck,
  ChevronRight,
  Flame,
  MapPin,
  Swords,
  Trophy,
} from "lucide-react-native";
import { Body, C, Card, F, PressableScale, R, Row, S } from "@/components/ui";
import { imageSource } from "@/components/ui/Cover";
import { PHOTOS } from "@/constants/photos";
import { useClubBattles, useMyFixture } from "@/data/hooks";
import { clubScoreLabel } from "@/constants/clubModes";
import { TugBar } from "@/components/arena/TugBar";

export const RED = C.danger;
const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const pad = (n) => String(n).padStart(2, "0");

export const clock = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// 'Tonight · 19:00', 'Tomorrow · 09:00', 'Saturday · 09:00'
export const whenLabel = (ms, now = Date.now()) => {
  const d = new Date(ms);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Math.floor(
    (new Date(ms).setHours(0, 0, 0, 0) - today.getTime()) / 86400000,
  );
  const day =
    days === 0
      ? d.getHours() >= 17
        ? "Tonight"
        : "Today"
      : days === 1
        ? "Tomorrow"
        : days < 7 && days > 1
          ? DAYS[d.getDay()]
          : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${day} · ${clock(ms)}`;
};

// For the middle of a sentence: "tomorrow at 19:00", "Sat at 08:00".
export const startsLabel = (ms, now = Date.now()) => {
  const [day, time] = whenLabel(ms, now).split(" · ");
  return `${/^(Tonight|Today|Tomorrow)$/.test(day) ? day.toLowerCase() : day} at ${time}`;
};

export const kmLabel = (km) =>
  km == null
    ? ""
    : km < 10
      ? `${Number(km).toFixed(1)} km`
      : `${Math.round(km)} km`;

export function ClubCrest({ club, size = 52, radius, style }) {
  const r = radius ?? size * 0.3;
  const src = imageSource(club?.logo) || PHOTOS.crest;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: r,
          overflow: "hidden",
          backgroundColor: C.surfaceHigh,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
        },
        style,
      ]}
    >
      <Image source={src} style={StyleSheet.absoluteFill} contentFit="cover" />
    </View>
  );
}

export const VerifiedTick = ({ size = 16 }) => (
  <BadgeCheck size={size} color="#fff" fill={C.accent} />
);

/** Overlapping faces and a line: '31 going'. */
export function Faces({ people = [], label, size = 26 }) {
  return (
    <Row gap={S.sm} style={{ marginTop: S.sm }}>
      <View style={{ flexDirection: "row" }}>
        {people.slice(0, 5).map((p, i) => (
          <View
            key={p.id || i}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              overflow: "hidden",
              marginLeft: i ? -8 : 0,
              borderWidth: 2,
              borderColor: C.surface,
              backgroundColor: C.surfaceHigh,
            }}
          >
            <Image
              source={imageSource(p.avatar)}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          </View>
        ))}
      </View>
      {label ? (
        <Text style={styles.facesLabel} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </Row>
  );
}

export const Chip = ({ label, tone = "neutral", icon: Icon }) => (
  <View
    style={[
      styles.chip,
      tone === "blue" && { backgroundColor: C.accentDim },
      tone === "live" && { backgroundColor: C.dangerDim },
    ]}
  >
    {Icon ? (
      <Icon
        size={11}
        color={tone === "blue" ? C.accentHi : tone === "live" ? RED : C.textDim}
      />
    ) : null}
    <Text
      style={[
        styles.chipText,
        tone === "blue" && { color: C.accentHi },
        tone === "live" && { color: RED },
      ]}
    >
      {label}
    </Text>
  </View>
);

/** A club in Find your run club: crest, name and tick, meet times, three facts. */
export function ClubCard({ club, onPress, onJoin, joining }) {
  const facts = [
    club.awayKm != null ? kmLabel(club.awayKm) : null,
    club.distances,
    club.paces,
  ].filter(Boolean);
  return (
    <Card onPress={onPress} padding={S.md} style={{ marginBottom: S.sm }}>
      <Row gap={S.md}>
        <ClubCrest club={club} size={56} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Row gap={6}>
            <Text style={styles.clubName} numberOfLines={1}>
              {club.name}
            </Text>
            {club.verified ? <VerifiedTick size={15} /> : null}
          </Row>
          <Body dim size={13} numberOfLines={1} style={{ marginTop: 2 }}>
            {club.verified
              ? club.meets || club.meetPlace
              : "Founding club · not official yet"}
          </Body>
          <Row gap={6} style={{ marginTop: 8, flexWrap: "wrap" }}>
            {facts.map((f) => (
              <Chip key={f} label={f} />
            ))}
          </Row>
        </View>
        {club.isMember ? (
          <Chip label="In" tone="blue" />
        ) : onJoin ? (
          <PressableScale
            onPress={onJoin}
            disabled={joining}
            scaleTo={0.92}
            style={styles.join}
            accessibilityLabel={`Join ${club.name}`}
          >
            <Text style={styles.joinText}>{joining ? "..." : "Join"}</Text>
          </PressableScale>
        ) : null}
      </Row>
    </Card>
  );
}

/** Next club run, with faces and a pill to say you're going. */
export function NextRunCard({
  run,
  onPress,
  action,
  onAction,
  kicker = "Next club run",
}) {
  if (!run) return null;
  const live = run.status === "live";
  return (
    <Card onPress={onPress} padding={S.lg} style={{ marginTop: S.md }}>
      <Row gap={S.md}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Row gap={6}>
            {live ? <View style={styles.liveDot} /> : null}
            <Text style={styles.kick}>{live ? "On now" : kicker}</Text>
          </Row>
          <Text style={styles.cardBig} numberOfLines={1}>
            {whenLabel(run.startAt)}
          </Text>
          <Body dim size={13} numberOfLines={1}>
            {[
              run.title,
              kmLabel(run.km),
              run.paceGroups?.length > 1
                ? `${run.paceGroups.length} pace groups`
                : run.paceGroups?.[0],
            ]
              .filter(Boolean)
              .join(" · ")}
          </Body>
          <Faces
            people={run.faces}
            label={
              run.checkedIn
                ? `You're in · ${run.going} going`
                : `${run.going} going`
            }
          />
        </View>
        {action ? (
          <PressableScale
            onPress={onAction}
            scaleTo={0.92}
            style={[
              styles.pill,
              run.isGoing && { backgroundColor: C.surfaceHigh },
            ]}
          >
            <Text
              style={[styles.pillText, run.isGoing && { color: C.textSoft }]}
            >
              {action}
            </Text>
          </PressableScale>
        ) : (
          <ChevronRight size={18} color={C.textMute} />
        )}
      </Row>
    </Card>
  );
}

/** This week's league fixture: both scores, the tug and who's out. */
export function FixtureCard({ fixture, onPress }) {
  if (!fixture) return null;
  const mineHome = fixture.mySide !== "away";
  const me = mineHome ? fixture.home : fixture.away;
  const them = mineHome ? fixture.away : fixture.home;
  const status = fixture.revealed
    ? "Full time"
    : fixture.isDerby
      ? "Derby live"
      : "Fixture live";
  const ends = new Date(fixture.revealAt);
  return (
    <Card onPress={onPress} padding={S.lg} style={{ marginTop: S.md }}>
      <Row style={{ justifyContent: "space-between" }}>
        <Chip label={status} tone={fixture.revealed ? "neutral" : "live"} />
        <Body dim size={12}>
          {fixture.revealed
            ? `Week ${fixture.week}`
            : `Ends ${DAYS[ends.getDay()]} ${clock(fixture.revealAt)}`}
        </Body>
      </Row>
      <Row
        style={{
          justifyContent: "space-between",
          marginTop: S.md,
          alignItems: "flex-end",
        }}
      >
        <Text style={[styles.score, { color: C.accentHi }]}>
          {clubScoreLabel("steps", me.score)}
        </Text>
        <Text style={styles.v}>v</Text>
        <Text style={[styles.score, { color: RED }]}>
          {clubScoreLabel("steps", them.score)}
        </Text>
      </Row>
      <TugBar
        mine={me.score || 0}
        theirs={them.score || 0}
        height={6}
        style={{ marginTop: S.sm }}
      />
      <Body dim size={13} style={{ marginTop: S.sm }}>
        {me.club?.short} v {them.club?.short}
        {fixture.revealed ? "" : ` · ${me.out} of us out right now`}
      </Body>
    </Card>
  );
}

/** Small row of the club's open friendlies. */
function FriendliesRow({ club }) {
  const router = useRouter();
  const { data } = useClubBattles(club.verified ? club.id : null);
  const open = (data || []).filter((b) =>
    ["pending", "accepted", "live"].includes(b.status),
  );
  const incoming = open.find(
    (b) => b.hidden || (!b.home && b.status === "pending"),
  );
  if (!open.length && !club.isCaptain) return null;
  const first = incoming || open[0];
  return (
    <Card
      onPress={() =>
        first
          ? router.push(`/clubs/battle/${first.id}`)
          : router.push(`/clubs/challenge?club=${club.id}`)
      }
      padding={S.lg}
      style={{ marginTop: S.md }}
    >
      <Row gap={S.md}>
        <View style={[styles.icon, incoming && { backgroundColor: RED }]}>
          <Swords size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.kick}>Club v club</Text>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {incoming
              ? "A challenger club is at the door"
              : first
                ? `${first.modeName} v ${first.opponent?.name || "a mystery club"}`
                : "Challenge a club"}
          </Text>
          <Body dim size={13} numberOfLines={1}>
            {incoming
              ? `${incoming.votes.yes} yes · ${incoming.votes.no} no so far`
              : first
                ? first.status === "live"
                  ? "On now"
                  : whenLabel(first.startAt)
                : "Friendlies in six modes, captains only"}
          </Body>
        </View>
        <ChevronRight size={18} color={C.textMute} />
      </Row>
    </Card>
  );
}

/**
 * What a club page adds under its hero: the next club run, this week's
 * fixture, friendlies and the table. Founding clubs get their progress.
 */
export function ClubPanel({ club, onRunAction }) {
  const router = useRouter();
  const fixture = useMyFixture();
  const fx =
    fixture.data &&
    club.isMember &&
    [fixture.data.home.club?.id, fixture.data.away.club?.id].includes(club.id)
      ? fixture.data
      : null;
  return (
    <View>
      <NextRunCard
        run={club.nextRun}
        onPress={() =>
          club.nextRun && router.push(`/clubs/run/${club.nextRun.id}`)
        }
        action={
          club.nextRun
            ? club.nextRun.checkedIn
              ? "Checked in"
              : club.nextRun.isGoing
                ? "Going"
                : "I'm in"
            : null
        }
        onAction={() => onRunAction?.(club.nextRun)}
      />
      {club.founding ? (
        <Card
          onPress={() => router.push(`/clubs/founding/${club.id}`)}
          padding={S.lg}
          style={{ marginTop: S.md }}
        >
          <Row gap={S.md}>
            <View style={[styles.icon, { backgroundColor: C.warn }]}>
              <Flame size={18} color="#000" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.kick}>Founding club</Text>
              <Text style={styles.rowTitle}>How close you are to official</Text>
              <Body dim size={13}>
                Three meetups of six, ten different runners
              </Body>
            </View>
            <ChevronRight size={18} color={C.textMute} />
          </Row>
        </Card>
      ) : null}
      {fx ? (
        <FixtureCard
          fixture={fx}
          onPress={() => router.push(`/clubs/fixture/${fx.id}`)}
        />
      ) : null}
      {club.verified && club.isMember ? <FriendliesRow club={club} /> : null}
      {club.verified && club.isMember && club.inLeague !== false ? (
        <Card
          onPress={() => router.push("/clubs/league")}
          padding={S.lg}
          style={{ marginTop: S.md }}
        >
          <Row gap={S.md}>
            <View style={[styles.icon, { backgroundColor: C.surfaceHigh }]}>
              <Trophy size={18} color={C.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.kick}>Club league</Text>
              <Text style={styles.rowTitle}>
                {club.record?.pos
                  ? `${ordinal(club.record.pos)} in your group`
                  : "The table"}
              </Text>
              <Body dim size={13}>
                Six week seasons, groups of seven
              </Body>
            </View>
            <ChevronRight size={18} color={C.textMute} />
          </Row>
        </Card>
      ) : null}
      {club.meetPlace ? (
        <Row gap={6} style={{ marginTop: S.lg }}>
          <MapPin size={13} color={C.textDim} />
          <Body dim size={13}>
            {club.meetPlace}
          </Body>
        </Row>
      ) : null}
    </View>
  );
}

export const ordinal = (n) =>
  `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th"}`;

export const styles = StyleSheet.create({
  facesLabel: {
    color: C.textDim,
    fontFamily: F.bodyMedium,
    fontSize: 12.5,
    flexShrink: 1,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 99,
    backgroundColor: C.surfaceHigh,
  },
  chipText: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 11.5 },
  clubName: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 21,
    textTransform: "uppercase",
    flexShrink: 1,
  },
  join: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 99,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  joinText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 13.5 },
  kick: {
    color: C.accentHi,
    fontFamily: F.bodySemi,
    fontSize: 10.5,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  cardBig: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 24,
    textTransform: "uppercase",
    marginTop: 4,
  },
  pill: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 99,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 13.5 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: RED },
  score: { fontFamily: F.display, fontSize: 34, letterSpacing: 0.3 },
  v: {
    color: C.textMute,
    fontFamily: F.display,
    fontSize: 18,
    marginBottom: 6,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    color: C.text,
    fontFamily: F.bodySemi,
    fontSize: 15,
    marginTop: 3,
  },
});
