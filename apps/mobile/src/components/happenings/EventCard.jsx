import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Clock3, Lock, MapPin, Users, Zap } from "lucide-react-native";
import { C, F, Pill, R, Row, S } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";
import { formatNumber, timeLabel } from "@/utils/format";
import { InfoLine, whenLabel } from "./shared";

export const organiserTone = (type) => (type === "outhere" ? "accent" : type === "crew" ? "neutral" : "warn");

/** Event pills shared by the card and detail: tier lock, live, going, full. */
export function EventPills({ event, style }) {
  const locked = !event.canAttend;
  return (
    <Row gap={6} style={[{ flexWrap: "wrap" }, style]}>
      {event.status === "live" ? <Pill label="LIVE" tone="accent" /> : null}
      {event.tierRequired !== "free" ? (
        <Pill label={event.tierRequired === "black" ? "BLACK" : "PRO"} tone={event.tierRequired} icon={locked ? Lock : undefined} />
      ) : null}
      {event.checkedIn ? <Pill label="CHECKED IN" tone="accent" icon={Check} /> : event.isGoing ? <Pill label="GOING" tone="accent" icon={Check} /> : null}
      {event.isFull ? <Pill label="FULL" tone="danger" /> : null}
    </Row>
  );
}

export default function EventCard({ event, onPress }) {
  const spots = event.spotsLeft;
  const spotsText = event.isFull ? "Full" : spots <= 10 ? `${spots} spot${spots === 1 ? "" : "s"} left` : `${formatNumber(event.rsvpCount)} going`;
  const when = event.status === "live" ? `On now, until ${timeLabel(event.endAt)}` : whenLabel(event.startAt, event.endAt);
  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      style={({ pressed }) => [styles.card, event.isGoing && styles.going, pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] }]}
    >
      <View style={styles.imageWrap}>
        <Image source={{ uri: event.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.65)"]} style={StyleSheet.absoluteFill} />
        <EventPills event={event} style={{ position: "absolute", top: S.md, left: S.md }} />
        <View style={styles.reward}>
          <Zap size={12} color={C.accent} fill={C.accent} />
          <Text style={styles.rewardText}>+{event.rewardXp} XP</Text>
        </View>
      </View>
      <View style={{ padding: S.lg, gap: 8 }}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <InfoLine icon={Clock3} colour={event.status === "live" ? C.accent : C.textDim}>
          {when}
        </InfoLine>
        <InfoLine icon={MapPin}>{`${event.location}, ${event.city}`}</InfoLine>
        <Row style={{ justifyContent: "space-between", marginTop: 4 }}>
          <Text style={styles.organiser} numberOfLines={1}>
            By {event.organiser}
          </Text>
          <Row gap={5}>
            <Users size={13} color={event.isFull || spots <= 10 ? C.fire : C.textMute} />
            <Text style={[styles.spots, (event.isFull || spots <= 10) && { color: C.fire }]}>{spotsText}</Text>
          </Row>
        </Row>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: "hidden", marginBottom: S.md },
  going: { borderColor: "rgba(0,255,127,0.35)" },
  imageWrap: { height: 150, backgroundColor: C.surfaceHigh },
  reward: {
    position: "absolute",
    right: S.md,
    bottom: S.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(10,10,10,0.75)",
    borderRadius: R.full,
    paddingHorizontal: 10,
    height: 26,
  },
  rewardText: { color: C.accent, fontSize: 12, fontWeight: "800" },
  title: { color: C.text, fontFamily: F.display, fontSize: 20, letterSpacing: -0.2 },
  organiser: { color: C.textMute, fontSize: 13, flexShrink: 1, marginRight: S.md },
  spots: { color: C.textMute, fontSize: 13, fontWeight: "600" },
});
