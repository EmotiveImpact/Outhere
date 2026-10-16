// The club page's identity block, laid over the club's photo (.r11id,
// .r11meta, .grid3): the crest, a kicker saying whether it is official, the
// name in two tones with the verified tick, where and when it meets, three
// numbers, then the week's kilometres against the goal.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MapPin } from "lucide-react-native";
import { C, F, Meter, Row, S, Surface } from "@/components/ui";
import { ClubCrest, VerifiedTick } from "@/components/clubs/parts";
import { AvatarStack, ROLE_LABEL, nextBadge } from "./shared";

/** Starts at 0 and switches to the real value after mount, so numbers count up. */
export function useCountUp(value) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(value), 120);
    return () => clearTimeout(t);
  }, [value]);
  return shown;
}

/** .grid3 .card: a big number and a small label. */
function Tile({ value, label }) {
  return (
    <Surface radius={18} padding={12} style={{ flex: 1 }}>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {label}
      </Text>
    </Surface>
  );
}

export default function CrewHero({ crew, showRole = true }) {
  const goal = crew.weeklyGoalKm || 0;
  const weekKm = Number(crew.weekKm) || 0;
  const progress = goal > 0 ? weekKm / goal : 0;
  const next = nextBadge(weekKm);
  const members = crew.previewMembers || [];
  const km = useCountUp(weekKm);
  const bar = useCountUp(progress);
  const words = (crew.name || "").split(" ");
  const last = words.length > 1 ? words.pop() : null;
  const kicker = crew.verified ? `Official crew${crew.founded ? ` · Est. ${crew.founded}` : ""}` : "Founding club";
  const meets = [crew.meets || crew.tagline, crew.meetPlace].filter(Boolean).join(" · ");

  return (
    <View>
      <Row gap={12} style={{ alignItems: "flex-end" }}>
        <ClubCrest club={crew} size={62} radius={16} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.kicker} numberOfLines={1}>
            {kicker}
            {showRole && crew.myRole ? ` · ${ROLE_LABEL[crew.myRole]}` : ""}
          </Text>
          <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit>
            {words.join(" ")}
            {last ? "\n" : ""}
            {last ? <Text style={styles.blue}>{last}</Text> : null}
          </Text>
        </View>
        {crew.verified ? (
          <View style={{ marginBottom: 6 }}>
            <VerifiedTick size={22} />
          </View>
        ) : null}
      </Row>
      {meets ? (
        <Row gap={6} style={{ marginTop: 12 }}>
          <MapPin size={14} color="#82b4ff" />
          <Text style={styles.meets} numberOfLines={1}>
            {meets}
          </Text>
        </Row>
      ) : null}

      <Row gap={8} style={{ marginTop: 12 }}>
        {crew.record ? (
          <>
            <Tile value={String(crew.memberCount ?? 0)} label="Members" />
            <Tile value={crew.lastTurnout != null ? String(crew.lastTurnout) : "–"} label="At last run" />
            <Tile value={`W${crew.record.w} L${crew.record.l}`} label="Club v club" />
          </>
        ) : (
          <>
            <Tile value={String(crew.memberCount ?? 0)} label="Members" />
            <Tile value={String(Math.round(km))} label="km this week" />
            <Tile value={crew.badgeTier || "Bronze"} label="Crew badge" />
          </>
        )}
      </Row>

      <Surface radius={20} padding={14} style={{ marginTop: 12 }}>
        <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={styles.kick}>Crew goal this week</Text>
            <Text style={styles.goalLine}>
              {Math.round(weekKm)} <Text style={styles.goalOf}>of {goal} km</Text>
            </Text>
          </View>
          {members.length ? <AvatarStack players={members} total={crew.memberCount} size={28} ringColour="#14171d" /> : null}
        </Row>
        <Meter value={bar} size={10} cap style={{ marginTop: 12 }} />
        <Row gap={S.md} style={{ marginTop: 10, justifyContent: "space-between" }}>
          <Text style={[styles.small, progress >= 1 && { color: C.text }]} numberOfLines={1}>
            {progress >= 1 ? "Goal smashed. Keep stacking." : `${Math.max(0, goal - weekKm).toFixed(1)} km to goal`}
          </Text>
          {next ? (
            <Text style={styles.small} numberOfLines={1}>
              {Math.ceil(next[1] - weekKm)} km to {next[0]}
            </Text>
          ) : null}
        </Row>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { color: "#9cc4ff", fontFamily: F.bodySemi, fontSize: 10.5, letterSpacing: 1.7, textTransform: "uppercase", marginBottom: 6 },
  name: { color: C.text, fontFamily: F.display, fontSize: 38, lineHeight: 36, textTransform: "uppercase", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 30, textShadowOffset: { width: 0, height: 2 } },
  blue: { color: C.accent, textShadowColor: "rgba(61,139,255,0.35)", textShadowRadius: 28, textShadowOffset: { width: 0, height: 0 } },
  meets: { color: C.textSoft, fontFamily: F.body, fontSize: 12, flexShrink: 1 },
  tileValue: { color: C.text, fontFamily: F.display, fontSize: 26, lineHeight: 26 },
  tileLabel: { color: C.textDim, fontFamily: F.body, fontSize: 11, marginTop: 4 },
  kick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase" },
  goalLine: { color: C.text, fontFamily: F.display, fontSize: 24, marginTop: 4 },
  goalOf: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 13 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
});
