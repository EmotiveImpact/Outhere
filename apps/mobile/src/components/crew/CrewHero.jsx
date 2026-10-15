import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BadgeCheck, MapPin } from "lucide-react-native";
import { Body, C, F, ProgressBar, Row, S, StatTile } from "@/components/ui";
import { imageSource } from "@/components/ui/Cover";
import { PHOTOS } from "@/constants/photos";
import { AvatarStack, CrewLogo, ROLE_LABEL, nextBadge } from "./shared";

/** Starts at 0 and switches to the real value after mount, so numbers count up. */
export function useCountUp(value) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(value), 120);
    return () => clearTimeout(t);
  }, [value]);
  return shown;
}

/**
 * Club hero: the club's own photo, a kicker saying whether it is official,
 * the name in two tones, the verified tick, where and when it meets, then
 * three numbers and the week's kilometres against the goal.
 */
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
  const meets = crew.meets || crew.tagline;

  return (
    <View>
      <View style={styles.slab}>
        <Image source={imageSource(crew.cover || crew.image) || PHOTOS.clubhero} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={["rgba(7,9,12,0.1)", "rgba(7,9,12,0.35)", "rgba(7,9,12,0.96)"]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
        <View style={{ padding: S.lg }}>
          <Text style={styles.kicker}>
            {kicker}
            {showRole && crew.myRole ? ` · ${ROLE_LABEL[crew.myRole]}` : ""}
          </Text>
          <Row gap={S.md} style={{ alignItems: "flex-end" }}>
            <CrewLogo crew={crew} size={58} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit>
                {words.join(" ")}
                {last ? <Text style={{ color: C.accent }}> {last}</Text> : null}
              </Text>
            </View>
            {crew.verified ? (
              <View style={styles.tick}>
                <BadgeCheck size={20} color="#fff" fill={C.accent} />
              </View>
            ) : null}
          </Row>
          {meets ? (
            <Row gap={6} style={{ marginTop: S.sm }}>
              <MapPin size={13} color={C.accent} />
              <Text style={styles.meets} numberOfLines={1}>{meets}</Text>
            </Row>
          ) : null}
        </View>
      </View>

      {crew.record ? (
        <Row gap={S.sm} style={{ marginTop: S.md }}>
          <StatTile value={String(crew.memberCount ?? 0)} label="Members" />
          <StatTile value={crew.lastTurnout != null ? String(crew.lastTurnout) : "–"} label="At last run" />
          <StatTile value={`W${crew.record.w} L${crew.record.l}`} label="Club v club" />
        </Row>
      ) : (
        <Row gap={S.sm} style={{ marginTop: S.md }}>
          <StatTile value={String(crew.memberCount ?? 0)} label="Members" />
          <StatTile value={String(Math.round(km))} label="km this week" />
          <StatTile value={crew.badgeTier || "Bronze"} label="Crew badge" />
        </Row>
      )}

      <View style={{ marginTop: S.lg }}>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
          <Text style={styles.goalText}>
            Goal <Text style={{ color: C.text }}>{goal} km</Text>
          </Text>
          {members.length ? <AvatarStack players={members} total={crew.memberCount} size={26} ringColour={C.bg} /> : null}
        </Row>
        <ProgressBar value={bar} height={6} style={{ marginTop: S.sm }} />
        <Row gap={S.md} style={{ marginTop: S.sm, justifyContent: "space-between" }}>
          <Body dim size={13} numberOfLines={1} style={progress >= 1 ? { color: C.text } : null}>
            {progress >= 1 ? "Goal smashed. Keep stacking." : `${Math.max(0, goal - weekKm).toFixed(1)} km to goal`}
          </Body>
          {next ? (
            <Body dim size={13} numberOfLines={1}>
              {Math.ceil(next[1] - weekKm)} km to {next[0]}
            </Body>
          ) : null}
        </Row>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slab: { height: 300, borderRadius: 26, overflow: "hidden", justifyContent: "flex-end", backgroundColor: C.surface },
  kicker: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase", marginBottom: S.sm },
  name: { color: C.text, fontFamily: F.display, fontSize: 40, lineHeight: 40, textTransform: "uppercase" },
  tick: { marginBottom: 6 },
  meets: { color: C.textSoft, fontFamily: F.body, fontSize: 13, flexShrink: 1 },
  goalText: { color: C.textDim, fontFamily: F.body, fontSize: 13 },
});
