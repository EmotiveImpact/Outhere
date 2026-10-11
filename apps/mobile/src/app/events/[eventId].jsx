import React, { useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MotiView } from "moti";
import { CalendarCheck, Coins, Clock3, Lock, MapPin, Navigation, Sparkles, UserRound, Zap } from "lucide-react-native";
import { engine, useEngineMutation, useEvent } from "@/data/hooks";
import { Body, Button, C, Card, EmptyState, F, Header, Label, Loading, ProgressBar, R, Row, S, Screen, Spacer, Title } from "@/components/ui";
import { EventPills } from "@/components/happenings/EventCard";
import { HeroScreen, InfoLine, openDirections, whenLabel } from "@/components/happenings/shared";
import { hapticSuccess } from "@/services/haptics";
import { countdown, formatNumber, tierLabel } from "@/utils/format";

export default function EventDetailScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams();
  const id = Array.isArray(eventId) ? eventId[0] : eventId;
  const { data: event, isPending, error, refetch, isRefetching } = useEvent(id);
  const [earned, setEarned] = useState(false);

  const rsvp = useEngineMutation(engine.rsvpEvent, { onSuccess: (v) => v?.isGoing && hapticSuccess() });
  const checkIn = useEngineMutation(engine.checkInEvent, {
    onSuccess: () => {
      hapticSuccess();
      setEarned(true);
    },
  });

  if (isPending) {
    return (
      <Screen header={<Header back title="Event" />}>
        <Loading />
      </Screen>
    );
  }
  if (error || !event) {
    return (
      <Screen header={<Header back title="Event" />}>
        <EmptyState
          icon={CalendarCheck}
          title="Event not found"
          body="It may have been moved or cancelled."
          action="See all events"
          onAction={() => router.replace("/outside/events")}
        />
      </Screen>
    );
  }

  const locked = !event.canAttend;
  const fill = event.capacity ? event.rsvpCount / event.capacity : 0;

  const footer = (() => {
    if (locked) {
      return (
        <Button
          full
          size="lg"
          icon={Lock}
          title={`Unlock with ${tierLabel(event.tierRequired)}`}
          loading={rsvp.isPending}
          onPress={() => rsvp.mutate([event.id, true])}
        />
      );
    }
    if (event.checkInOpen && !event.checkedIn) {
      return <Button full size="lg" icon={MapPin} title="I'm here, check me in" loading={checkIn.isPending} onPress={() => checkIn.mutate(event.id)} />;
    }
    if (event.checkedIn) return null;
    if (event.isGoing) {
      return <Button full size="lg" variant="secondary" title="Going. Tap to cancel" loading={rsvp.isPending} onPress={() => rsvp.mutate([event.id, false])} />;
    }
    if (event.isFull) return <Button full size="lg" variant="secondary" title="Event full" disabled />;
    return <Button full size="lg" title="I'm going" loading={rsvp.isPending} onPress={() => rsvp.mutate([event.id, true])} />;
  })();

  return (
    <HeroScreen image={event.image} footer={footer} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} />}>
      <EventPills event={event} />
      <Title size={32} style={{ marginTop: S.md }}>
        {event.title}
      </Title>
      <View style={{ gap: 10, marginTop: S.lg }}>
        <InfoLine icon={UserRound} size={14}>{`Hosted by ${event.organiser}`}</InfoLine>
        <InfoLine icon={Clock3} size={14} colour={event.status === "live" ? C.accent : C.textDim}>
          {event.status === "live"
            ? `Live now. ${whenLabel(event.startAt, event.endAt)}`
            : `${whenLabel(event.startAt, event.endAt)} (in ${countdown(event.startAt)})`}
        </InfoLine>
        <InfoLine icon={MapPin} size={14}>{`${event.location}, ${event.city}`}</InfoLine>
      </View>
      <Button
        variant="secondary"
        size="sm"
        icon={Navigation}
        title="Get directions"
        onPress={() => openDirections(event.location, event.city)}
        style={{ alignSelf: "flex-start", marginTop: S.lg }}
      />

      {earned || event.checkedIn ? (
        <MotiView from={earned ? { opacity: 0, scale: 0.92 } : undefined} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", damping: 14 }}>
          <Card highlight style={{ marginTop: S.xl }}>
            <Row gap={S.md}>
              <View style={styles.badge}>
                <Sparkles size={22} color={C.accentText} />
              </View>
              <View style={{ flex: 1 }}>
                <Title size={19}>{earned ? "You're checked in" : "Checked in"}</Title>
                <Body dim size={14}>{`+${formatNumber(event.rewardXp)} XP and +${formatNumber(event.rewardOut)} OUT added to your balance.`}</Body>
              </View>
            </Row>
          </Card>
        </MotiView>
      ) : null}

      {locked ? (
        <Card style={{ marginTop: S.xl }}>
          <Row gap={S.md}>
            <Lock size={20} color={event.tierRequired === "black" ? C.black : C.pro} />
            <Body dim size={14} style={{ flex: 1 }}>
              {event.tierRequired === "black" ? "This one is for Black members only." : "This one is for Pro and Black members."} Upgrade to RSVP and earn the
              check-in reward.
            </Body>
          </Row>
        </Card>
      ) : null}

      <Body dim style={{ marginTop: S.xl, lineHeight: 23 }}>
        {event.description}
      </Body>

      <Card style={{ marginTop: S.xl }}>
        <Row style={{ justifyContent: "space-between", marginBottom: S.md }}>
          <Label>Who's going</Label>
          <Text style={styles.small}>{event.isFull ? "Full" : `${event.spotsLeft} spots left`}</Text>
        </Row>
        <Row style={{ alignItems: "flex-end", marginBottom: S.md }} gap={6}>
          <Text style={styles.big}>{formatNumber(event.rsvpCount)}</Text>
          <Text style={[styles.small, { marginBottom: 6 }]}>of {formatNumber(event.capacity)}</Text>
        </Row>
        <ProgressBar value={fill} colour={event.isFull ? C.fire : C.accent} />
        {event.isGoing && !event.checkedIn ? (
          <Body mute size={13} style={{ marginTop: S.md }}>
            {"You're on the list. Check-in opens an hour before the start."}
          </Body>
        ) : null}
      </Card>

      <Label style={{ marginTop: S.xl, marginBottom: S.md }}>Show up and earn</Label>
      <Row gap={S.md}>
        <View style={styles.rewardTile}>
          <Zap size={18} color={C.accent} fill={C.accent} />
          <Text style={styles.rewardValue}>+{formatNumber(event.rewardXp)}</Text>
          <Body mute size={12}>
            XP
          </Body>
        </View>
        <View style={styles.rewardTile}>
          <Coins size={18} color={C.gold} />
          <Text style={[styles.rewardValue, { color: C.gold }]}>+{formatNumber(event.rewardOut)}</Text>
          <Body mute size={12}>
            OUT
          </Body>
        </View>
      </Row>
      <Spacer h={S.xl} />
    </HeroScreen>
  );
}

const styles = StyleSheet.create({
  badge: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  small: { color: C.textDim, fontSize: 13, fontWeight: "600" },
  big: { color: C.text, fontFamily: F.display, fontSize: 34 },
  rewardTile: { flex: 1, backgroundColor: C.surface, borderRadius: R.md, borderWidth: 1, borderColor: C.border, padding: S.lg, gap: 6 },
  rewardValue: { color: C.accent, fontFamily: F.display, fontSize: 28 },
});
