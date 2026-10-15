// One event. The route, start time and reward sit on one map card, with your
// crew going underneath. Going gets you a ticket; at the start line you check
// in (with the organiser's code where there is one) and the server pays out.

import React, { useMemo, useState } from "react";
import { RefreshControl, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, ChevronRight, Lock, MapPin, QrCode, UserRound } from "lucide-react-native";
import { engine, useEngineMutation, useEvent, useEventGoing } from "@/data/hooks";
import { Avatar, Body, Button, C, EmptyState, F, imageSource, PressableScale, R, Row, S, Skeleton, toast } from "@/components/ui";
import { BottomBar, ButtonPair, GlowHero, SectionLabel, TopBar } from "@/components/arena/OutsideKit";
import { splitTitle, whenWord } from "@/components/happenings/EventsScreen";
import { openDirections } from "@/components/happenings/shared";
import Celebration from "@/components/happenings/Celebration";
import RouteArt from "@/components/crew/RouteArt";
import { loopAround } from "@/data/runMath";
import { centreFor } from "@/data/seedRuns";
import { formatNumber, tierLabel, timeLabel } from "@/utils/format";

const HOSTS = { outhere: "Official Outhere event", crew: "Run by a club", partner: "Partner event" };

const hours = (e) => {
  const h = Math.round(((e.endAt - e.startAt) / 3_600_000) * 2) / 2;
  return h >= 1 ? `${h} ${h === 1 ? "hr" : "hrs"}` : `${Math.round(h * 60)} min`;
};

function CodeCheckIn({ event, checkIn }) {
  const [code, setCode] = useState("");
  return (
    <Row gap={S.sm}>
      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="Code from the organiser"
        placeholderTextColor={C.textMute}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.code}
        accessibilityLabel="Check-in code"
      />
      <Button size="lg" icon={MapPin} title="Check in" disabled={code.trim().length < 4} loading={checkIn.isPending} onPress={() => checkIn.mutate([event.id, code])} />
    </Row>
  );
}

function Action({ event, rsvp, checkIn }) {
  const router = useRouter();
  const ticket = () => router.push(`/events/ticket/${event.id}`);
  if (!event.canAttend) {
    return <Button full size="lg" icon={Lock} title={`For ${tierLabel(event.tierRequired)} members`} onPress={() => router.push("/membership")} />;
  }
  if (event.checkedIn) {
    return <Button full size="lg" variant="secondary" icon={Check} title={`Checked in · +${formatNumber(event.rewardXp)} XP`} disabled />;
  }
  if (event.checkInOpen && event.needsCode) return <CodeCheckIn event={event} checkIn={checkIn} />;
  if (event.checkInOpen && event.isGoing) {
    return <ButtonPair secondary={{ title: "Ticket", icon: QrCode, onPress: ticket }} primary={{ title: "I'm here", icon: MapPin, loading: checkIn.isPending, onPress: () => checkIn.mutate(event.id) }} />;
  }
  if (event.isGoing) {
    return <ButtonPair secondary={{ title: "Can't go", loading: rsvp.isPending, onPress: () => rsvp.mutate([event.id, false]) }} primary={{ title: "Your ticket", icon: QrCode, onPress: ticket }} />;
  }
  if (event.isFull) return <Button full size="lg" variant="secondary" title="Event full" disabled />;
  return <Button full size="lg" icon={Check} title="I'm going" loading={rsvp.isPending} onPress={() => rsvp.mutate([event.id, true])} />;
}

export default function EventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { eventId } = useLocalSearchParams();
  const id = Array.isArray(eventId) ? eventId[0] : eventId;
  const { data: event, isPending, error, refetch, isRefetching } = useEvent(id);
  const going = useEventGoing(id).data;
  const [party, setParty] = useState(0);
  // The route as a line on the map card, seeded per event so it stays put.
  const line = useMemo(
    () => (event ? loopAround(centreFor(event.city), event.distanceKm || 3, event.id).map((p) => [p.latitude, p.longitude]) : null),
    [event?.id, event?.city, event?.distanceKm],
  );

  const rsvp = useEngineMutation(engine.rsvpEvent, { success: (v) => (v?.isGoing ? "You're going. Your ticket is ready" : "RSVP cancelled") });
  const checkIn = useEngineMutation(engine.checkInEvent, {
    onSuccess: (v) => {
      toast.success("Checked in", `+${formatNumber(v?.rewardXp)} XP and +${formatNumber(v?.rewardOut)} OUT`);
      setParty(Date.now());
    },
  });

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Skeleton height={330 + insets.top} radius={30} />
        <View style={{ padding: S.gutter, gap: S.md }}>
          <Skeleton height={150} radius={R.lg} />
          <Skeleton width={220} height={28} />
        </View>
        <TopBar />
      </View>
    );
  }
  if (error || !event) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 80 }}>
        <EmptyState title="Event not found" body="It may have been moved or cancelled." action="See all events" onAction={() => router.replace("/outside/events")} />
        <TopBar />
      </View>
    );
  }

  const [top, bottom] = splitTitle(event.title);
  const live = event.status === "live";
  const who = event.tierRequired === "free" ? "Free for everyone" : event.tierRequired === "black" ? "Black members" : "Pro and Black";
  const kicker = `${live ? "On now" : whenWord(event.startAt)} · ${who}`;
  const crew = going?.clubCount ? `, ${formatNumber(going.clubCount)} from ${going.clubName || "your club"}` : going?.friends ? `, ${going.friends} you follow` : "";
  const share = () => Share.share({ message: `${event.title}, ${whenWord(event.startAt).toLowerCase()} at ${timeLabel(event.startAt)}, ${event.location}. Come out with me on Outhere.` }).catch(() => {});

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} progressViewOffset={insets.top + 60} />}
      >
        <GlowHero photo={imageSource(event.image)} photoOpacity={0.35} height={290} kicker={kicker} top={top} bottom={bottom} />
        <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg }}>
          <PressableScale onPress={() => openDirections(event.location, event.city)} scaleTo={0.98} style={styles.mapCard} accessibilityLabel="Directions">
            <RouteArt points={line} seed={event.id} radius={0} style={StyleSheet.absoluteFill} />
            <View style={styles.mapShade} />
            <Row style={styles.mapStats}>
              {[
                [event.distanceKm ? `${event.distanceKm} km` : hours(event), event.paceLabel || (event.distanceKm ? "Easy pace" : "Together")],
                [timeLabel(event.startAt), "Start"],
                [`+${formatNumber(event.rewardXp)}`, "XP"],
              ].map(([v, l], i) => (
                <View key={l + i} style={{ flex: 1 }}>
                  <Text style={[styles.mapValue, i === 2 && { color: C.accentHi }]}>{v}</Text>
                  <Text style={styles.mapLabel}>{l}</Text>
                </View>
              ))}
            </Row>
          </PressableScale>

          <PressableScale onPress={() => router.push(`/events/going/${event.id}`)} scaleTo={0.98} style={styles.goingRow}>
            <Row gap={0}>
              {(going?.people || []).slice(0, 4).map((p, i) => (
                <Avatar key={p.id} uri={p.avatar} name={p.name} size={28} style={[styles.face, i > 0 && { marginLeft: -9 }]} />
              ))}
            </Row>
            <Text style={styles.goingText} numberOfLines={1}>
              {formatNumber(going?.count ?? event.rsvpCount)} going{crew}
            </Text>
            <ChevronRight size={16} color={C.textMute} />
          </PressableScale>

          <SectionLabel>The plan</SectionLabel>
          <Body dim size={15} style={{ lineHeight: 23 }}>
            {event.description}
          </Body>

          <View style={{ marginTop: S.xl, gap: S.md }}>
            <PressableScale onPress={() => openDirections(event.location, event.city)} scaleTo={0.98}>
              <Row gap={S.md}>
                <MapPin size={18} color={C.accent} />
                <Text style={styles.info} numberOfLines={1}>
                  {event.location}, {event.city}
                </Text>
                <Text style={styles.link}>Directions</Text>
              </Row>
            </PressableScale>
            <Row gap={S.md}>
              <UserRound size={18} color={C.textDim} />
              <Text style={styles.info}>
                {event.organiser} · {HOSTS[event.organiserType] || "Community event"}
              </Text>
            </Row>
            <Text style={styles.small}>
              {event.isFull ? "Full." : `${formatNumber(event.spotsLeft)} of ${formatNumber(event.capacity)} places left.`} Show up and check in for +{formatNumber(event.rewardXp)} XP and +{formatNumber(event.rewardOut)} OUT.
            </Text>
          </View>
        </View>
      </ScrollView>
      <BottomBar>
        <Action event={event} rsvp={rsvp} checkIn={checkIn} />
      </BottomBar>
      <TopBar onShare={share} />
      <Celebration trigger={party} title={`+${formatNumber(event.rewardXp)} XP`} subtitle={`and +${formatNumber(event.rewardOut)} OUT`} />
    </View>
  );
}

const styles = StyleSheet.create({
  mapCard: { height: 150, borderRadius: R.lg, overflow: "hidden", backgroundColor: C.surface, justifyContent: "flex-end" },
  mapShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(7,9,12,0.25)" },
  mapStats: { padding: S.lg, alignItems: "flex-end" },
  mapValue: { color: "#fff", fontFamily: F.display, fontSize: 24, lineHeight: 26 },
  mapLabel: { color: "rgba(255,255,255,0.75)", fontFamily: F.body, fontSize: 12 },
  goingRow: { flexDirection: "row", alignItems: "center", gap: S.md, marginTop: S.lg },
  face: { borderWidth: 2, borderColor: C.bg },
  goingText: { flex: 1, color: C.textSoft, fontFamily: F.body, fontSize: 13 },
  info: { flex: 1, color: C.text, fontFamily: F.bodyMedium, fontSize: 14 },
  link: { color: C.accent, fontFamily: F.bodySemi, fontSize: 13 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 13, lineHeight: 19 },
  code: { flex: 1, height: 56, borderRadius: 16, paddingHorizontal: S.lg, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, color: C.text, fontFamily: F.bodySemi, fontSize: 16, letterSpacing: 1 },
});
