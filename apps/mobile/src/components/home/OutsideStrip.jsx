// "Outside now": live count for the city, a stack of faces, the player's own
// outside switch and the people they follow who are out.

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Avatar, Button, C, Divider, F, LiveDot, PressableScale, R, Row, S } from "@/components/ui";
import { formatNumber } from "@/utils/format";

export default function OutsideStrip({ city, count = 0, people = [], friends = [], hasFriends, isOutside, hidden, busy, onToggle, onPlayer }) {
  const faces = people.slice(0, 4);
  const extra = Math.max(0, count - faces.length);
  return (
    <View style={styles.card}>
      <Row style={{ justifyContent: "space-between" }} gap={S.md}>
        <View style={{ flex: 1 }}>
          <Row gap={8}>
            <LiveDot size={7} />
            <Text style={styles.count} numberOfLines={1}>{formatNumber(count)}</Text>
          </Row>
          <Text style={styles.meta} numberOfLines={1}>out in {city} right now</Text>
        </View>
        {faces.length ? (
          <Row gap={0}>
            {faces.map((p, i) => (
              <Avatar key={p.id} uri={p.avatar} name={p.name} colour={p.color} size={32} style={{ marginLeft: i ? -10 : 0, borderRadius: 16, borderWidth: 2, borderColor: C.surface }} />
            ))}
            {extra ? (
              <View style={styles.more}>
                <Text style={styles.moreText}>+{extra > 99 ? "99" : extra}</Text>
              </View>
            ) : null}
          </Row>
        ) : null}
      </Row>

      <Divider style={{ marginVertical: S.lg }} />

      <Row gap={S.md}>
        <View style={[styles.state, isOutside && { backgroundColor: C.accent }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleTitle}>{isOutside ? "You're out" : "Heading out?"}</Text>
          {hidden ? <Text style={styles.toggleBody} numberOfLines={1}>Your status is hidden in Settings</Text> : null}
        </View>
        <Button
          title={isOutside ? "Back in" : "I'm out"}
          variant="secondary"
          size="sm"
          loading={busy}
          onPress={onToggle}
          style={{ borderWidth: 0, minWidth: 88 }}
        />
      </Row>

      {friends.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.lg, marginTop: S.xl }} contentContainerStyle={{ gap: S.lg, paddingHorizontal: S.lg }}>
          {friends.map((f) => (
            <PressableScale key={f.id} onPress={() => onPlayer(f.id)} style={{ alignItems: "center", width: 56 }}>
              <Avatar uri={f.avatar} name={f.name} colour={f.color} size={48} outside />
              <Text style={styles.friendName} numberOfLines={1}>{f.name}</Text>
            </PressableScale>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.hint}>{hasFriends ? "Nobody you follow is out yet." : "Follow people to see when they're out."}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: R.lg, backgroundColor: C.surface, padding: S.lg },
  count: { color: C.text, fontFamily: F.display, fontSize: 28, letterSpacing: -0.5 },
  meta: { color: C.textDim, fontSize: 13, marginTop: 2 },
  more: { marginLeft: -10, width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceHigh, borderWidth: 2, borderColor: C.surface, alignItems: "center", justifyContent: "center" },
  moreText: { color: C.textDim, fontSize: 10, fontWeight: "600" },
  state: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.textMute },
  toggleTitle: { color: C.text, fontSize: 15, fontWeight: "600" },
  toggleBody: { color: C.textMute, fontSize: 13, marginTop: 1 },
  friendName: { color: C.textDim, fontSize: 12, marginTop: 6 },
  hint: { color: C.textMute, fontSize: 13, marginTop: S.lg },
});
