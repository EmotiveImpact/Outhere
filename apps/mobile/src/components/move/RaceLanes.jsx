// A live race on the Move map: two lanes to the same finish, the gap in
// metres, both paces and how fast it's closing. Your lane is your run; theirs
// comes from the race clock and their pace.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Zap } from "lucide-react-native";
import { Avatar, C, F, S } from "@/components/ui";
import { formatPace } from "@/utils/format";
import { Glass } from "./parts";

const RED = C.danger;

/** Where the rival is, in metres, `sec` seconds after the start. */
export const rivalMetres = (battle, now = Date.now()) => {
  if (!battle?.startAt || !battle.rivalPaceSec) return null;
  const sec = Math.max(0, (now - battle.startAt) / 1000);
  return Math.min(battle.distanceM || Infinity, (sec / battle.rivalPaceSec) * 1000);
};

function Lane({ label, metres, total, colour, player }) {
  const pct = Math.max(0, Math.min(1, metres / total));
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={styles.laneLabel}>{label}</Text>
      <View style={styles.laneRow}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: colour }]} />
          <View style={[styles.face, { left: `${pct * 100}%`, borderColor: colour }]}>
            <Avatar uri={player?.avatar} name={player?.name || label} size={24} />
          </View>
        </View>
        <Text style={[styles.km, colour === RED && { color: "#ff8a8f" }]}>{(metres / 1000).toFixed(2)} km</Text>
      </View>
    </View>
  );
}

export default function RaceLanes({ battle, myMetres, mySec, top, now = Date.now() }) {
  const theirs = rivalMetres(battle, now);
  if (theirs == null) return null;
  const total = battle.distanceM || 5000;
  const gap = Math.round(myMetres - theirs);
  const ahead = gap >= 0;
  const name = battle.opponent?.player?.name || "Your rival";
  const myPace = myMetres > 20 && mySec > 0 ? mySec / (myMetres / 1000) : null;
  // Metres a minute one of you gains on the other.
  const closing = myPace ? Math.round(Math.abs(60000 / battle.rivalPaceSec - 60000 / myPace)) : null;
  const theyGain = myPace ? battle.rivalPaceSec < myPace : false;
  const catchMin = ahead && theyGain && closing ? Math.ceil(gap / closing) : null;
  return (
    <Glass style={[styles.card, { top }]} radius={20}>
      <Text style={styles.kick}>First to {total / 1000} km</Text>
      <Text style={styles.big}>
        {Math.abs(gap) < 5 ? "Neck and neck" : ahead ? "You're " : `${name} is `}
        {Math.abs(gap) < 5 ? null : <Text style={{ color: ahead ? C.accentHi : "#ff8a8f" }}>{Math.abs(gap)} m ahead</Text>}
      </Text>
      <Lane label="You" metres={myMetres} total={total} colour={C.accent} player={battle.me?.player} />
      <Lane label={name} metres={theirs} total={total} colour={RED} player={battle.opponent?.player} />
      <View style={styles.trio}>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>Your pace</Text>
          <Text style={styles.cellBig}>{formatPace(myPace)}</Text>
        </View>
        <View style={[styles.cell, styles.cellMid]}>
          <Text style={styles.cellLabel}>{name}'s pace</Text>
          <Text style={[styles.cellBig, { color: "#ff8a8f" }]}>{formatPace(battle.rivalPaceSec)}</Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>Closing</Text>
          <Text style={styles.cellBig}>{closing != null ? `${closing} m/min` : "--"}</Text>
        </View>
      </View>
      {catchMin && catchMin < 30 ? (
        <View style={styles.note}>
          <Zap size={15} color={C.accentHi} />
          <Text style={styles.noteText}>
            At this pace {name} catches you in {catchMin} min
          </Text>
        </View>
      ) : null}
    </Glass>
  );
}

const styles = StyleSheet.create({
  card: { position: "absolute", left: S.lg, right: S.lg, padding: 14 },
  kick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase" },
  big: { color: C.text, fontFamily: F.display, fontSize: 28, textTransform: "uppercase", marginTop: 2 },
  laneLabel: { color: C.textSoft, fontFamily: F.body, fontSize: 12 },
  laneRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center" },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 4 },
  face: { position: "absolute", marginLeft: -15, width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
  km: { width: 70, textAlign: "right", color: C.text, fontFamily: F.display, fontSize: 18 },
  trio: { flexDirection: "row", marginTop: 12 },
  cell: { flex: 1, alignItems: "center" },
  cellMid: { borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.14)" },
  cellLabel: { color: C.textDim, fontFamily: F.body, fontSize: 11.5 },
  cellBig: { color: C.text, fontFamily: F.display, fontSize: 22, marginTop: 2 },
  note: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.12)" },
  noteText: { color: C.textSoft, fontFamily: F.bodySemi, fontSize: 13 },
});
