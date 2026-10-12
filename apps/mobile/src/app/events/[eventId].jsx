import React, { useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CalendarCheck, CalendarClock, Check, Coins, Lock, MapPin, Sparkles, UserRound, Zap } from "lucide-react-native";
import { engine, useEngineMutation, useEvent, useProfile, useSearchPlayers } from "@/data/hooks";
import { AnimatedNumber, Body, Button, C, EmptyState, F, FadeIn, Header, Label, ProgressBar, R, Row, S, Screen, Title, toast } from "@/components/ui";
import { EventPills } from "@/components/happenings/EventCard";
import { HeroScreen, HeroSkeleton, dayLabel, openDirections } from "@/components/happenings/shared";
import { AvatarStack, InfoRow, detailStyles, useAttendees } from "@/components/happenings/DetailParts";
import Celebration from "@/components/happenings/Celebration";
import { countdown, formatNumber, tierLabel, timeLabel } from "@/utils/format";

const HOSTS = { outhere: "Official OutHere event", crew: "Crew-run event", partner: "Partner event" };

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
          <Check size={18} color={C.accentText} strokeWidth={3} />
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
          <Check size={18} color={C.accentText} strokeWidth={3} />
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
        <EmptyState icon={CalendarCheck} title="Event not found" body="It may have been moved or cancelled." action="See all events" onAction={() => router.replace("/outside/events")} />
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
            tint={live ? C.accent : C.text}
            title={`${dayLabel(event.startAt)}, ${timeLabel(event.startAt)} to ${timeLabel(event.endAt)}`}
            sub={live ? `Live now until ${timeLabel(event.endAt)}` : `Starts in ${countdown(event.startAt)}`}
          />
          <InfoRow icon={MapPin} title={event.location} sub={event.city} trailing="Directions" onPress={() => openDirections(event.location, event.city)} />
          <InfoRow icon={UserRound} title={`Hosted by ${event.organiser}`} sub={HOSTS[event.organiserType] || "Community event"} />
        </FadeIn>

        {locked ? (
          <FadeIn index={1}>
            <View style={[detailStyles.card, styles.lockCard]}>
              <Row gap={S.md}>
                <Lock size={20} color={event.tierRequired === "black" ? C.black : C.pro} />
                <Body dim size={14} style={{ flex: 1 }}>
                  {`${event.tierRequired === "black" ? "Black members only." : "For Pro and Black members."} Upgrade to RSVP and earn the check-in reward.`}
                </Body>
              </Row>
            </View>
          </FadeIn>
        ) : null}

        <FadeIn index={2}>
          <View style={[detailStyles.card, { marginTop: S.xxl }]}>
            <Row style={{ justifyContent: "space-between" }}>
              <Label>{"Who's going"}</Label>
              <Text style={[styles.small, !event.isFull && event.spotsLeft < 10 && { color: C.fire }]}>
                {event.isFull ? "Full" : `${event.spotsLeft} spot${event.spotsLeft === 1 ? "" : "s"} left`}
              </Text>
            </Row>
            <Row gap={6} style={{ alignItems: "flex-end", marginTop: S.sm, marginBottom: S.md }}>
              <AnimatedNumber value={event.rsvpCount} style={styles.big} />
              <Text style={[styles.small, { marginBottom: 8 }]}>{`of ${formatNumber(event.capacity)}`}</Text>
            </Row>
            <ProgressBar value={fill} colour={event.isFull || event.spotsLeft < 10 ? C.fire : C.accent} />
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
          <Row gap={S.md}>
            <View style={styles.rewardTile}>
              <Zap size={18} color={C.accent} fill={C.accent} />
              <Text style={styles.rewardValue}>+{formatNumber(event.rewardXp)}</Text>
              <Label>XP</Label>
            </View>
            <View style={styles.rewardTile}>
              <Coins size={18} color={C.gold} />
              <Text style={[styles.rewardValue, { color: C.gold }]}>+{formatNumber(event.rewardOut)}</Text>
              <Label>OUT</Label>
            </View>
          </Row>
          {event.checkedIn ? (
            <Row gap={S.sm} style={{ marginTop: S.md }}>
              <Sparkles size={16} color={C.accent} />
              <Body size={13} style={{ color: C.accent }}>
                Banked. Nice one for showing up.
              </Body>
            </Row>
          ) : null}
        </FadeIn>
      </HeroScreen>
      <Celebration trigger={party} title={`+${formatNumber(event.rewardXp)} XP`} subtitle={`and +${formatNumber(event.rewardOut)} OUT`} />
    </View>
  );
}

const styles = StyleSheet.create({
  small: { color: C.textDim, fontSize: 13, fontWeight: "600" },
  big: { color: C.text, fontFamily: F.display, fontSize: 44, letterSpacing: -1 },
  lockCard: { marginTop: S.lg, borderColor: "rgba(124,196,255,0.3)" },
  sectionTitle: { color: C.text, fontFamily: F.display, fontSize: 20, marginTop: S.xxl, marginBottom: S.md },
  rewardTile: { flex: 1, backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg, gap: 6 },
  rewardValue: { color: C.accent, fontFamily: F.display, fontSize: 32, letterSpacing: -1 },
  barRow: { minHeight: 56 },
  barTitle: { color: C.text, fontFamily: F.display, fontSize: 18 },
  barSub: { color: C.textDim, fontSize: 12, marginTop: 1 },
  tick: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
});
