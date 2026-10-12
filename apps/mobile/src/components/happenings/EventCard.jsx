import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Lock } from "lucide-react-native";
import { C, Cover, F, Pill, PressableScale, R, Row, S, Skeleton } from "@/components/ui";
import { formatNumber, timeLabel } from "@/utils/format";
import { LivePill, whenLabel } from "./shared";

export const organiserTone = (type) => (type === "outhere" ? "accent" : type === "crew" ? "neutral" : "warn");

/**
 * Event state pills, at most two: live, then going or checked in, then full,
 * then the tier lock.
 */
export function EventPills({ event, showGoing = true, style }) {
  const locked = !event.canAttend;
  const pills = [];
  if (event.status === "live") pills.push(<LivePill key="live" />);
  if (showGoing && event.checkedIn) pills.push(<Pill key="in" label="Checked in" />);
  else if (showGoing && event.isGoing) pills.push(<Pill key="going" label="Going" />);
  if (event.isFull) pills.push(<Pill key="full" label="Full" />);
  if (event.tierRequired !== "free") {
    pills.push(<Pill key="tier" label={event.tierRequired === "black" ? "BLACK" : "PRO"} tone={event.tierRequired} icon={locked ? Lock : undefined} />);
  }
  if (!pills.length) return null;
  return (
    <Row gap={6} style={style}>
      {pills.slice(0, 2)}
    </Row>
  );
}

/** One short status line: going, spots left or a headcount. */
const statusText = (event) => {
  if (event.checkedIn) return "Checked in";
  if (event.isGoing) return "You're going";
  if (event.isFull) return "Full";
  if (event.spotsLeft < 10) return `${event.spotsLeft} spot${event.spotsLeft === 1 ? "" : "s"} left`;
  return `${formatNumber(event.rsvpCount)} going`;
};

export default function EventCard({ event, onPress }) {
  const live = event.status === "live";
  const when = live ? `On now until ${timeLabel(event.endAt)}` : whenLabel(event.startAt, event.endAt);
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={styles.card}>
      <Cover source={event.image} seed={event.id} scrim style={styles.cover}>
        <EventPills event={event} style={styles.top} />
        <View style={styles.bottom}>
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {when}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {`${event.location}  ·  ${statusText(event)}`}
          </Text>
        </View>
      </Cover>
    </PressableScale>
  );
}

export const EventCardSkeleton = () => <Skeleton height={248} radius={R.lg} style={{ marginBottom: S.lg }} />;

const styles = StyleSheet.create({
  card: { borderRadius: R.lg, overflow: "hidden", marginBottom: S.lg, backgroundColor: C.surface },
  cover: { height: 248 },
  top: { position: "absolute", top: S.lg, left: S.lg },
  bottom: { position: "absolute", left: S.lg, right: S.lg, bottom: S.lg, gap: 4 },
  title: { color: C.text, fontFamily: F.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.4, marginBottom: 4 },
  meta: { color: "#d4d4d8", fontSize: 13 },
});
