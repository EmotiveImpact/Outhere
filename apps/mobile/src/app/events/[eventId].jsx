import React, { useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CalendarClock, Check, Lock, MapPin, UserRound } from "lucide-react-native";
import { engine, useEngineMutation, useEvent, useProfile, useSearchPlayers } from "@/data/hooks";
import { AnimatedNumber, Body, Button, C, EmptyState, F, FadeIn, Header, ProgressBar, Row, S, Screen, Title, toast } from "@/components/ui";
import { EventPills } from "@/components/happenings/EventCard";
import { HeroScreen, HeroSkeleton, dayLabel, openDirections } from "@/components/happenings/shared";
import { AvatarStack, InfoRow, detailStyles, useAttendees } from "@/components/happenings/DetailParts";
import Celebration from "@/components/happenings/Celebration";
import { countdown, formatNumber, tierLabel, timeLabel } from "@/utils/format";

const HOSTS = { outhere: "Official Outhere event", crew: "Crew-run event", partner: "Partner event" };

function ActionBar({ event, rsvp, checkIn }) {
  const locked = !event.canAttend;
  if (locked) {
    return <Button full size="lg" icon={Lock} title={`Unlock with ${tierLabel(event.tierRequired)}`} loading={rsvp.isPending} onPress={() => rsvp.mutate([event.id, true])} />;
  }
  if (event.checkInOpen && !event.checkedIn) {
    return <Button full size="lg" icon={MapPin} title="I'm here, check me in" loading={checkIn.isPending} onPress={() => checkIn.mutate(event.id)} />;
  }
  if (event.checkedIn) {
    return (
      <Row gap={S.md} style={styles.barRow}>
        <View style={styles.tick}>
          <Check size={18} color={C.text} strokeWidth={2.5} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.barTitle}>Checked in</Text>
          <Text style={styles.barSub}>{`+${formatNumber(event.rewardXp)} XP and +${formatNumber(event.rewardOut)} OUT earned`}</Text>
        </View>
      </Row>
    );
  }
  if (event.isGoing) {
    return (
      <Row gap={S.md} style={styles.barRow}>
        <View style={styles.tick}>
          <Check size={18} color={C.text} strokeWidth={2.5} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.barTitle}>{"You're going"}</Text>
          <Text style={styles.barSub}>Check-in opens an hour before</Text>
        </View>
        <Button size="sm" variant="secondary" title="Cancel" loading={rsvp.isPending} onPress={() => rsvp.mutate([event.id, false])} />
      </Row>
    );
  }
  if (event.isFull) return <Button full size="lg" variant="secondary" title="Event full" disabled />;
  return (
    <Row gap={S.md}>
      <View>
        <Text style={styles.barTitle}>{`+${formatNumber(event.rewardXp)} XP`}</Text>
        <Text style={styles.barSub}>for showing up</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Button full size="lg" title="I'm going" loading={rsvp.isPending} onPress={() => rsvp.mutate([event.id, true])} />
      </View>
    </Row>
  );
}

export default function EventDetailScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams();
  const id = Array.isArray(eventId) ? eventId[0] : eventId;
  const { data: event, isPending, error, refetch, isRefetching } = useEvent(id);
  const { data: players } = useSearchPlayers("");
  const { data: profile } = useProfile();
  const [party, setParty] = useState(0);
  const attendees = useAttendees(event, players, profile);

  const rsvp = useEngineMutation(engine.rsvpEvent, {
    onSuccess: (v) => (v?.isGoing ? toast.success("You're going", "We'll remind you before it starts") : toast("RSVP cancelled")),
  });
  const checkIn = useEngineMutation(engine.checkInEvent, {
    onSuccess: (v) => {
      toast.success("Checked in", `+${formatNumber(v?.rewardXp)} XP and +${formatNumber(v?.rewardOut)} OUT`);
      setParty(Date.now());
    },
  });

  if (isPending) return <HeroSkeleton />;
  if (error || !event) {
    return (
      <Screen header={<Header back title="Event" />}>
        <EmptyState title="Event not found" body="It may have been moved or cancelled." action="See all events" onAction={() => router.replace("/outside/events")} />
      </Screen>
    );
  }

  const live = event.status === "live";
  const locked = !event.canAttend;
  const fill = event.capacity ? event.rsvpCount / event.capacity : 0;
  const shown = attendees.length;
  const names = attendees.slice(0, 2).map((p) => (p.id === "me" ? "You" : p.name));
  const othersCount = Math.max(0, event.rsvpCount - names.length);
  const goingLine = names.length ? `${names.join(", ")}${othersCount ? ` and ${formatNumber(othersCount)} others` : ""}` : "Be the first in";

  const overlay = (
    <>
      <EventPills event={event} />
      <Title size={34} style={{ marginTop: S.sm, lineHeight: 38, letterSpacing: -0.8 }}>
        {event.title}
      </Title>
    </>
  );

  return (
    <View style={{ flex: 1 }}>
      <HeroScreen
        source={event.image}
        seed={event.id}
        overlay={overlay}
        footer={<ActionBar event={event} rsvp={rsvp} checkIn={checkIn} />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} />}
      >
        <FadeIn>
          <InfoRow
            icon={CalendarClock}
            title={`${dayLabel(event.startAt)}, ${timeLabel(event.startAt)} to ${timeLabel(event.endAt)}`}
            sub={live ? `Live now until ${timeLabel(event.endAt)}` : `Starts in ${countdown(event.startAt)}`}
          />
          <InfoRow icon={MapPin} title={event.location} sub={event.city} trailing="Directions" onPress={() => openDirections(event.location, event.city)} />
          <InfoRow icon={UserRound} title={`Hosted by ${event.organiser}`} sub={HOSTS[event.organiserType] || "Community event"} />
        </FadeIn>

        {locked ? (
          <FadeIn index={1}>
            <View style={[detailStyles.card, { marginTop: S.lg }]}>
              <Row gap={S.md}>
                <Lock size={20} color={event.tierRequired === "black" ? C.black : C.pro} />
                <Body dim size={14} style={{ flex: 1 }}>
                  {`${event.tierRequired === "black" ? "Black members only." : "For Pro and Black members."} Upgrade to RSVP.`}
                </Body>
              </Row>
            </View>
          </FadeIn>
        ) : null}

        <FadeIn index={2}>
          <View style={[detailStyles.card, { marginTop: 32 }]}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={styles.cardTitle}>{"Who's going"}</Text>
              <Text style={styles.small}>
                {event.isFull ? "Full" : `${event.spotsLeft} spot${event.spotsLeft === 1 ? "" : "s"} left`}
              </Text>
            </Row>
            <Row gap={6} style={{ alignItems: "flex-end", marginTop: S.md, marginBottom: S.md }}>
              <AnimatedNumber value={event.rsvpCount} style={styles.big} />
              <Text style={[styles.small, { marginBottom: 10 }]}>{`of ${formatNumber(event.capacity)}`}</Text>
            </Row>
            <ProgressBar value={fill} height={6} />
            <Row gap={S.md} style={{ marginTop: S.lg }}>
              {shown ? <AvatarStack people={attendees} extra={Math.min(99, event.rsvpCount - shown)} /> : null}
              <Text style={[styles.small, { flex: 1 }]} numberOfLines={2}>
                {goingLine}
              </Text>
            </Row>
          </View>
        </FadeIn>

        <FadeIn index={3}>
          <Text style={styles.sectionTitle}>The plan</Text>
          <Body dim size={16} style={{ lineHeight: 25 }}>
            {event.description}
          </Body>
        </FadeIn>

        <FadeIn index={4}>
          <Text style={styles.sectionTitle}>Show up and earn</Text>
          <Row gap={S.xxl}>
            <View>
              <Text style={styles.rewardValue}>+{formatNumber(event.rewardXp)}</Text>
              <Text style={styles.small}>XP</Text>
            </View>
            <View>
              <Text style={styles.rewardValue}>+{formatNumber(event.rewardOut)}</Text>
              <Text style={styles.small}>OUT</Text>
            </View>
          </Row>
          {event.checkedIn ? (
            <Body dim size={13} style={{ marginTop: S.md }}>
              Banked. Nice one for showing up.
            </Body>
          ) : null}
        </FadeIn>
      </HeroScreen>
      <Celebration trigger={party} title={`+${formatNumber(event.rewardXp)} XP`} subtitle={`and +${formatNumber(event.rewardOut)} OUT`} />
    </View>
  );
}

const styles = StyleSheet.create({
  small: { color: C.textDim, fontSize: 13, fontWeight: "600" },
  big: { color: C.text, fontFamily: F.display, fontSize: 56, lineHeight: 60, letterSpacing: -1 },
  cardTitle: { color: C.text, fontSize: 15, fontWeight: "600" },
  sectionTitle: { color: C.text, fontFamily: F.display, fontSize: 20, marginTop: 32, marginBottom: S.md },
  rewardValue: { color: C.text, fontFamily: F.display, fontSize: 30, letterSpacing: -0.8 },
  barRow: { minHeight: 56 },
  barTitle: { color: C.text, fontFamily: F.display, fontSize: 18 },
  barSub: { color: C.textDim, fontSize: 12, marginTop: 1 },
  tick: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
});
