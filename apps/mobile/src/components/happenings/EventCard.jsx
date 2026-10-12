import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Check, Clock3, Flame, Lock, MapPin, Users, Zap } from "lucide-react-native";
import { C, Cover, F, Pill, PressableScale, R, Row, S, Skeleton } from "@/components/ui";
import { formatNumber, timeLabel } from "@/utils/format";
import { DateBlock, InfoLine, LivePill, whenLabel } from "./shared";

export const organiserTone = (type) => (type === "outhere" ? "accent" : type === "crew" ? "neutral" : "warn");

/** Event pills shared by the card and detail: live, tier lock, going, full. */
export function EventPills({ event, showGoing = true, style }) {
  const locked = !event.canAttend;
  return (
    <Row gap={6} style={[{ flexWrap: "wrap" }, style]}>
      {event.status === "live" ? <LivePill /> : null}
      {event.tierRequired !== "free" ? (
        <Pill label={event.tierRequired === "black" ? "BLACK" : "PRO"} tone={event.tierRequired} icon={locked ? Lock : undefined} />
      ) : null}
      {showGoing && event.checkedIn ? <Pill label="CHECKED IN" tone="accent" icon={Check} /> : null}
      {showGoing && !event.checkedIn && event.isGoing ? <Pill label="GOING" tone="accent" icon={Check} /> : null}
      {event.isFull ? <Pill label="FULL" tone="danger" /> : null}
    </Row>
  );
}

/** Footer status: going, spots-left urgency or a headcount. */
function Status({ event }) {
  const spots = event.spotsLeft;
  if (event.checkedIn || event.isGoing) {
    return (
      <Row gap={6}>
        <View style={styles.tick}>
          <Check size={12} color={C.accentText} strokeWidth={3} />
        </View>
        <Text style={[styles.status, { color: C.accent }]}>{event.checkedIn ? "Checked in" : "You're going"}</Text>
      </Row>
    );
  }
  if (event.isFull) return <Text style={[styles.status, { color: C.danger }]}>Full</Text>;
  if (spots < 10) {
    return (
      <Row gap={5}>
        <Flame size={14} color={C.fire} fill={C.fire} />
        <Text style={[styles.status, { color: C.fire }]}>{`${spots} spot${spots === 1 ? "" : "s"} left`}</Text>
      </Row>
    );
  }
  return (
    <Row gap={5}>
      <Users size={14} color={C.textDim} />
      <Text style={styles.status}>{`${formatNumber(event.rsvpCount)} going`}</Text>
    </Row>
  );
}

export default function EventCard({ event, onPress }) {
  const live = event.status === "live";
  const when = live ? `On now until ${timeLabel(event.endAt)}` : whenLabel(event.startAt, event.endAt);
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={[styles.card, (event.isGoing || event.checkedIn) && styles.going]}>
      <Cover source={event.image} seed={event.id} scrim style={styles.cover}>
        <Row style={styles.top}>
          <DateBlock ms={event.startAt} />
          <View style={styles.reward}>
            <Zap size={12} color={C.accent} fill={C.accent} />
            <Text style={styles.rewardText}>+{formatNumber(event.rewardXp)} XP</Text>
          </View>
        </Row>
        <View style={styles.bottom}>
          <EventPills event={event} showGoing={false} style={{ marginBottom: S.sm }} />
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>
          <View style={{ gap: 4, marginTop: 6 }}>
            <InfoLine icon={Clock3} colour={live ? C.accent : "#d4d4d8"}>
              {when}
            </InfoLine>
            <InfoLine icon={MapPin} colour="#d4d4d8">{`${event.location}, ${event.city}`}</InfoLine>
          </View>
        </View>
      </Cover>
      <Row style={styles.footer}>
        <Text style={styles.organiser} numberOfLines={1}>
          {`By ${event.organiser}`}
        </Text>
        <Status event={event} />
      </Row>
    </PressableScale>
  );
}

export const EventCardSkeleton = () => (
  <View style={[styles.card, { marginBottom: S.lg }]}>
    <Skeleton height={236} radius={0} />
    <View style={{ padding: S.lg }}>
      <Skeleton width="50%" height={12} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: "hidden", marginBottom: S.lg },
  going: { borderColor: "rgba(0,255,127,0.4)" },
  cover: { height: 236 },
  top: { position: "absolute", top: S.md, left: S.md, right: S.md, justifyContent: "space-between", alignItems: "flex-start" },
  bottom: { position: "absolute", left: S.lg, right: S.lg, bottom: S.lg },
  reward: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(10,10,10,0.72)", borderRadius: R.full, paddingHorizontal: 10, height: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  rewardText: { color: C.accent, fontSize: 12, fontWeight: "800" },
  title: { color: C.text, fontFamily: F.display, fontSize: 22, lineHeight: 26, letterSpacing: -0.3 },
  footer: { justifyContent: "space-between", paddingHorizontal: S.lg, height: 48 },
  organiser: { color: C.textMute, fontSize: 13, fontWeight: "600", flexShrink: 1, marginRight: S.md },
  status: { color: C.textDim, fontSize: 13, fontWeight: "700" },
  tick: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
});
