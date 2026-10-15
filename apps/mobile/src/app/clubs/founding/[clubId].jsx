// A founding club: how close it is to official (three meetups of six or more,
// ten different runners), the next meetup, and the nearest official club to
// run with in the meantime.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Share2, Users } from "lucide-react-native";
import {
  AnimatedBar,
  Body,
  Button,
  C,
  Card,
  F,
  Hero,
  IconButton,
  Row,
  S,
  Screen,
  Skeleton,
} from "@/components/ui";
import { imageSource } from "@/components/ui/Cover";
import { PHOTOS } from "@/constants/photos";
import { engine, useEngineMutation, useFounding } from "@/data/hooks";
import { shareInvite } from "@/components/crew/CrewSettings";
import { NextRunCard } from "@/components/clubs/parts";

export default function Founding() {
  const { clubId } = useLocalSearchParams();
  const id = String(clubId || "");
  const router = useRouter();
  const { data: f, refetch, isRefetching } = useFounding(id);
  const join = useEngineMutation(engine.joinCrew, {
    success: (c) => `You're in ${c.name}`,
  });
  const rsvp = useEngineMutation(engine.rsvpClubRun, {
    success: (r) => (r.isGoing ? "See you there" : null),
  });

  if (!f) {
    return (
      <Screen>
        <Skeleton height={340} radius={26} style={{ marginTop: S.lg }} />
      </Screen>
    );
  }

  const club = f.club;
  const official = club.verified;
  const meetupsLine = f.meetupsLeft > 0 ? `one more meetup of six` : null;
  const nameWords = club.name.split(" ");
  const last = nameWords.length > 1 ? nameWords.pop() : "";
  const left = [
    f.meetupsLeft > 0
      ? `${f.meetupsLeft === 1 ? meetupsLine : `${f.meetupsLeft} more meetups of six`}`
      : null,
    f.peopleLeft > 0
      ? `${f.peopleLeft} new ${f.peopleLeft === 1 ? "face" : "faces"}`
      : null,
  ].filter(Boolean);

  return (
    <Screen
      padded={false}
      style={{ paddingTop: 0 }}
      onRefresh={refetch}
      refreshing={isRefetching}
    >
      <Hero
        photo={imageSource(club.cover) || PHOTOS.marsh}
        height={340}
        kicker={
          official
            ? "Official crew"
            : `${club.area || club.city} · founding club`
        }
        top={nameWords.join(" ")}
        bottom={last}
        right={
          club.isMember ? (
            <IconButton
              icon={Share2}
              onPress={() => shareInvite(club)}
              label="Invite"
            />
          ) : null
        }
      />
      <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg }}>
        <Card padding={S.lg}>
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={styles.label}>Meetups with 6 or more</Text>
            <Text style={styles.value}>
              {f.meetups} of {f.meetupsNeeded}
            </Text>
          </Row>
          <AnimatedBar
            value={f.meetups / f.meetupsNeeded}
            height={6}
            colour={C.accent}
            track={C.surfaceHigh}
            style={{ marginTop: S.sm }}
          />
          <Row style={{ justifyContent: "space-between", marginTop: S.lg }}>
            <Text style={styles.label}>Different runners</Text>
            <Text style={styles.value}>
              {f.people} of {f.peopleNeeded}
            </Text>
          </Row>
          <AnimatedBar
            value={f.people / f.peopleNeeded}
            height={6}
            colour={C.accent}
            track={C.surfaceHigh}
            style={{ marginTop: S.sm }}
          />
          <Body dim size={13} style={{ marginTop: S.md }}>
            {official
              ? `${club.name} is official. Thanks for getting it there.`
              : `${club.name} goes official after ${left.join(", with ")}. Your first ten keep Founding Member numbers for life.`}
          </Body>
        </Card>

        <NextRunCard
          run={club.nextRun}
          kicker="Next meetup"
          onPress={() =>
            club.nextRun && router.push(`/clubs/run/${club.nextRun.id}`)
          }
          action={
            club.isMember && club.nextRun
              ? club.nextRun.isGoing
                ? "Going"
                : "I'm in"
              : null
          }
          onAction={() =>
            club.nextRun &&
            rsvp.mutate([club.nextRun.id, !club.nextRun.isGoing])
          }
        />

        {!club.isMember ? (
          <Button
            title="Join the club"
            icon={Users}
            size="lg"
            full
            loading={join.isPending}
            onPress={() => join.mutate(id)}
            style={{ marginTop: S.lg }}
          />
        ) : null}

        {f.nearest && !official ? (
          <Body mute size={13} style={{ marginTop: S.lg }}>
            Nearest official club: {f.nearest.name}, {f.nearest.km} km. Run with
            them until yours is official.
          </Body>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  value: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 13 },
});
