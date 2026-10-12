// "Outside now": live count for the city, a stack of faces, the player's own
// outside toggle and the people they follow who are out.

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { MotiView } from "moti";
import { Avatar, C, F, LiveDot, PressableScale, R, Row, S } from "@/components/ui";
import { formatNumber } from "@/utils/format";

export default function OutsideStrip({ city, count = 0, people = [], friends = [], hasFriends, isOutside, hidden, busy, onToggle, onPlayer }) {
  const faces = people.slice(0, 4);
  const extra = Math.max(0, count - faces.length);
  return (
    <View style={styles.card}>
      <Row style={{ justifyContent: "space-between" }} gap={S.md}>
        <View style={{ flex: 1 }}>
          <Row gap={8}>
            <LiveDot size={8} />
            <Text style={styles.live}>LIVE</Text>
          </Row>
          <Text style={styles.count} numberOfLines={1}>
            {formatNumber(count)} <Text style={styles.countDim}>out in {city}</Text>
          </Text>
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

      <PressableScale onPress={onToggle} disabled={busy} scaleTo={0.97} accessibilityRole="switch" accessibilityLabel="I'm outside" style={[styles.toggle, isOutside && styles.toggleOn, busy && { opacity: 0.6 }]}>
        <MotiView
          animate={{ translateX: isOutside ? 0 : 0, scale: isOutside ? 1 : 0.85 }}
          transition={{ type: "spring", damping: 14 }}
          style={[styles.knob, isOutside && { backgroundColor: C.accentText }]}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.toggleTitle, isOutside && { color: C.accentText }]}>{isOutside ? "You're out" : "Heading out?"}</Text>
          <Text style={[styles.toggleBody, isOutside && { color: "rgba(4,20,11,0.7)" }]} numberOfLines={1}>
            {hidden ? "Your status is hidden in Settings" : isOutside ? "Tap when you're back in" : "Let people know you're outside"}
          </Text>
        </View>
        <Text style={[styles.toggleCta, isOutside && { color: C.accentText }]}>{isOutside ? "Back in" : "I'm out"}</Text>
      </PressableScale>

      {friends.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.lg, marginTop: S.lg }} contentContainerStyle={{ gap: S.lg, paddingHorizontal: S.lg }}>
          {friends.map((f) => (
            <PressableScale key={f.id} onPress={() => onPlayer(f.id)} style={{ alignItems: "center", width: 56 }}>
              <Avatar uri={f.avatar} name={f.name} colour={f.color} size={50} outside ring={C.accent} />
              <Text style={styles.friendName} numberOfLines={1}>{f.name}</Text>
            </PressableScale>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.hint}>{hasFriends ? "Nobody you follow is out yet. Be first." : "Follow people to see when they're out."}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: R.lg, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, padding: S.lg },
  live: { color: C.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  count: { color: C.text, fontFamily: F.display, fontSize: 24, letterSpacing: -0.4, marginTop: 4 },
  countDim: { color: C.textDim, fontFamily: F.displayMedium, fontSize: 16 },
  more: { marginLeft: -10, width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceHigh, borderWidth: 2, borderColor: C.surface, alignItems: "center", justifyContent: "center" },
  moreText: { color: C.textDim, fontSize: 10, fontWeight: "800" },
  toggle: { flexDirection: "row", alignItems: "center", gap: S.md, marginTop: S.lg, minHeight: 56, paddingHorizontal: S.md, borderRadius: R.md, borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.surfaceHigh },
  toggleOn: { backgroundColor: C.accent, borderColor: C.accent },
  knob: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.textMute },
  toggleTitle: { color: C.text, fontSize: 15, fontWeight: "700" },
  toggleBody: { color: C.textMute, fontSize: 12, marginTop: 1 },
  toggleCta: { color: C.accent, fontSize: 13, fontWeight: "800" },
  friendName: { color: C.textDim, fontSize: 11, marginTop: 6, fontWeight: "600" },
  hint: { color: C.textMute, fontSize: 13, marginTop: S.md },
});
