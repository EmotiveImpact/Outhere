// Building blocks for the event, drop and news detail screens.

import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "@/components/ui/icons";
import { Avatar, C, F, PressableScale, R, Row, S } from "@/components/ui";
import { seededRandom } from "@/data/random";

/** Icon, title and a dim line underneath. Tappable when given onPress. */
export function InfoRow({ icon: Icon, title, sub, trailing, onPress }) {
  const body = (
    <Row gap={S.lg} style={styles.infoRow}>
      <Icon size={20} color={C.textDim} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoTitle} numberOfLines={1}>
          {title}
        </Text>
        {sub ? (
          <Text style={styles.infoSub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
      {onPress ? <ChevronRight size={18} color={C.textMute} /> : null}
    </Row>
  );
  return onPress ? (
    <PressableScale onPress={onPress} scaleTo={0.98}>
      {body}
    </PressableScale>
  ) : (
    body
  );
}

/** Stack of overlapping avatars. people: [{ id, name, avatar, color }]. */
export function AvatarStack({ people, size = 34, extra = 0 }) {
  return (
    <Row gap={0}>
      {people.map((p, i) => (
        <Avatar key={p.id} uri={p.avatar} name={p.name} colour={p.color} size={size} ring={C.surface} style={{ marginLeft: i ? -size * 0.32 : 0 }} />
      ))}
      {extra > 0 ? (
        <View style={[styles.more, { width: size, height: size, borderRadius: size / 2, marginLeft: -size * 0.32 }]}>
          <Text style={styles.moreText}>{`+${extra > 99 ? 99 : extra}`}</Text>
        </View>
      ) : null}
    </Row>
  );
}

/**
 * A stable, believable set of attendees: players from the event's city, picked
 * by the event id, with the player first when they're going.
 */
export function useAttendees(event, players, me) {
  return useMemo(() => {
    if (!event) return [];
    const pool = (players || []).filter((p) => p && !p.isMe && p.city === event.city);
    const rnd = seededRandom(`attend:${event.id}`);
    const shuffled = pool.map((p) => [rnd(), p]).sort((a, b) => a[0] - b[0]).map(([, p]) => p);
    const others = Math.max(0, event.rsvpCount - (event.isGoing ? 1 : 0));
    const picked = shuffled.slice(0, Math.min(others, event.isGoing ? 4 : 5));
    return event.isGoing && me ? [{ ...me, id: "me", name: me.name || me.username || "You" }, ...picked] : picked;
  }, [event, players, me]);
}

const styles = StyleSheet.create({
  infoRow: { minHeight: 60, paddingVertical: S.sm },
  infoTitle: { color: C.text, fontSize: 15, fontWeight: "600" },
  infoSub: { color: C.textDim, fontSize: 13, marginTop: 2 },
  trailing: { color: C.textDim, fontSize: 13, fontWeight: "600" },
  more: { backgroundColor: C.surfaceHigh, borderWidth: 2, borderColor: C.surface, alignItems: "center", justifyContent: "center" },
  moreText: { color: C.text, fontSize: 11, fontFamily: F.display },
});

export const detailStyles = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg },
});
