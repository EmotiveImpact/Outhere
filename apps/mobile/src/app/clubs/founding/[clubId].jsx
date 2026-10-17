// A founding club: how close it is to official (three meetups of six or more,
// ten different runners), the next meetup, and the nearest official club to
// run with in the meantime.

import React from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Share2, Users } from "@/components/ui/icons";
import { Button, C, F, Meter, PhotoBackground, Row, S, Screen, Skeleton, Surface, useScreenTop } from "@/components/ui";
import { imageSource } from "@/components/ui/Cover";
import { PHOTOS } from "@/constants/photos";
import { engine, useEngineMutation, useFounding } from "@/data/hooks";
import { shareInvite } from "@/components/crew/CrewSettings";
import { GlassRound, NextRunCard } from "@/components/clubs/parts";

export default function Founding() {
  const { clubId } = useLocalSearchParams();
  const id = String(clubId || "");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const top = useScreenTop();
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
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} />}>
        {/* clubFounding: the marsh at dawn behind the top of the page (.r11ph) */}
        <View pointerEvents="none" style={[styles.photo, { height: 360 + insets.top }]}>
          <PhotoBackground source={imageSource(club.cover) || PHOTOS.marsh} fade={PAGE_FADE} focus={{ x: 0.5, y: 0.45 }} glow={false} grain={0.05} kenBurns />
        </View>
        <View style={{ paddingHorizontal: 18, paddingTop: top + 38 + 126 }}>
          <Text style={[styles.kick, official && { color: C.accentHi }]}>{official ? "Official crew" : `${club.area || club.city} · no official club yet`}</Text>
          <Text style={styles.big}>{official ? nameWords.join(" ") : "Start the"}</Text>
          <Text style={[styles.big, styles.blue]}>{official ? last : "first club"}</Text>

          {/* .r11prog */}
          <Surface radius={22} padding={16} style={{ marginTop: 14 }}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={styles.label}>Meetups with 6 or more</Text>
              <Text style={styles.value}>
                {f.meetups} of {f.meetupsNeeded}
              </Text>
            </Row>
            <Meter value={f.meetups / f.meetupsNeeded} size={10} cap style={{ marginTop: 10 }} />
            <Row style={{ justifyContent: "space-between", marginTop: 14 }}>
              <Text style={styles.label}>Different runners</Text>
              <Text style={styles.value}>
                {f.people} of {f.peopleNeeded}
              </Text>
            </Row>
            <Meter value={f.people / f.peopleNeeded} size={10} cap style={{ marginTop: 10 }} />
            <Text style={styles.note}>
              {official ? `${club.name} is official. Thanks for getting it there.` : `${club.name} goes official after ${left.join(", with ")}. Your first ten keep Founding Member numbers for life.`}
            </Text>
          </Surface>

        <NextRunCard
          run={club.nextRun}
          kicker="Next meetup"
          facesSize={34}
          onPress={() => club.nextRun && router.push(`/clubs/run/${club.nextRun.id}`)}
          action={club.isMember && club.nextRun ? "Invite" : null}
          ghost={false}
          onAction={() => shareInvite(club)}
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
          <Text style={[styles.note, { marginTop: 14 }]}>
            Nearest official club: {f.nearest.name}, {f.nearest.km} km. Run with them until yours is official.
          </Text>
        ) : null}
        </View>
      </ScrollView>
      <Row style={[styles.nav, { top }]}>
        <GlassRound icon={ChevronLeft} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/club"))} />
        {club.isMember ? <GlassRound icon={Share2} label="Invite" onPress={() => shareInvite(club)} /> : null}
      </Row>
    </View>
  );
}

// .r11ph::after
const PAGE_FADE = [[0, 0.45], [0.22, 0], [0.48, 0], [0.78, 0.7], [1, 1]];

const styles = StyleSheet.create({
  photo: { position: "absolute", top: 0, left: 0, right: 0 },
  nav: { position: "absolute", left: 18, right: 18, justifyContent: "space-between" },
  kick: { color: "#ffd9a0", fontFamily: F.bodySemi, fontSize: 10.5, letterSpacing: 1.7, textTransform: "uppercase", marginBottom: 8 },
  big: { color: C.text, fontFamily: F.display, fontSize: 44, lineHeight: 42, textTransform: "uppercase", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 30, textShadowOffset: { width: 0, height: 2 } },
  blue: { color: C.accent, textShadowColor: "rgba(61,139,255,0.6)", textShadowRadius: 30, textShadowOffset: { width: 0, height: 0 } },
  label: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5 },
  value: { color: C.textSoft, fontFamily: F.bodySemi, fontSize: 12.5 },
  note: { color: C.textDim, fontFamily: F.body, fontSize: 11.5, lineHeight: 17, marginTop: 12 },
});
