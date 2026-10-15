// The lock screen as a preview: the battle and steps widgets (round one),
// the run as a Live Activity with the Dynamic Island (round six), and the
// round eleven mid-run Live Activity with a nudge from your club. The island
// dot is blue while you're out and red once the run is paused.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Camera, Check, Flashlight, Pause } from "lucide-react-native";
import { C, F, GlowButton, LiveDot, Logo } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { formatDuration, formatNumber, formatPace } from "@/utils/format";
import { ArcRing, Glass, PhoneFrame } from "./bits";
import { clock, longDate } from "./data";

const LOCK_PHOTO = require("../../../assets/images/oh/lock.jpg");

const SAMPLE = {
  battle: { rival: "Kemi", mine: 12480, theirs: 11920, diff: 560, endsIn: "3h 41m" },
  run: { km: 4.82, pace: 302, steps: 6104, seconds: 1458, out: 18, goalKm: 5, paused: false },
  mid: { km: 3.2, seconds: 1000, pace: 312, goalKm: 5, routeName: null, paused: false },
  note: { club: "Southbank Runners", line: "Peckham are 40 km ahead. 12 of us are out now.", logo: PHOTOS.crest },
};

// The photo darkens towards the bottom so the widgets read.
const Shade = ({ top = 0.6 }) => (
  <LinearGradient
    colors={[`rgba(2,5,12,${top})`, "rgba(2,5,12,0.15)", "rgba(2,5,12,0.2)", "rgba(2,5,12,0.88)", "#02050c", "#02050c"]}
    locations={[0, 0.2, 0.42, 0.63, 0.82, 1]}
    style={StyleSheet.absoluteFill}
  />
);

const Flash = () => (
  <View style={styles.flash}>
    {[Flashlight, Camera].map((Icon, i) => (
      <Glass key={i} style={styles.flashBtn} blur={14} edge={false}>
        <Icon size={20} color="#fff" />
      </Glass>
    ))}
  </View>
);

const AppRow = ({ children, right }) => (
  <View style={styles.app}>
    <Logo size={16} />
    <Text style={styles.appText} numberOfLines={1}>{children}</Text>
    {right}
  </View>
);

const mmss = (sec) => {
  if (!sec || !Number.isFinite(sec)) return "--";
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** 019: the battle and your steps, without opening the app. */
export function LockBattle({ d }) {
  const b = d.battle || SAMPLE.battle;
  const share = b.mine + b.theirs > 0 ? b.mine / (b.mine + b.theirs) : 0.5;
  const pct = d.goal ? d.steps / d.goal : 0;
  return (
    <PhoneFrame testID="preview-lock">
      <Image source={PHOTOS.hero} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ left: "40%", top: "30%" }} />
      <Shade />
      <View style={styles.lock}>
        <Text style={styles.date}>{longDate(d.now)}</Text>
        <Text style={styles.time}>{clock(d.now)}</Text>
        <Glass style={[styles.wid, { marginTop: "auto" }]}>
          <AppRow right={<Text style={styles.appRight}>{b.endsIn || ""}</Text>}>{`OUTHERE · 1v1 vs ${b.rival}`}</AppRow>
          <View style={styles.battleRow}>
            <View>
              <Text style={styles.big30}>{b.diff > 0 ? "You lead" : b.diff < 0 ? `${b.rival} leads` : "All square"}</Text>
              <Text style={styles.sub}>{`${formatNumber(b.mine)} vs ${formatNumber(b.theirs)} steps`}</Text>
            </View>
            <Text style={[styles.big30, { color: b.diff >= 0 ? "#6aa6ff" : "#ff7a80" }]}>{`${b.diff >= 0 ? "+" : "−"}${formatNumber(Math.abs(b.diff))}`}</Text>
          </View>
          <View style={styles.split}>
            <View style={[styles.splitMine, { width: `${share * 100}%` }]} />
            <View style={styles.splitTheirs} />
          </View>
        </Glass>
        <Glass style={[styles.wid, styles.stepsWid]}>
          <ArcRing size={54} stroke={6} pct={pct} track="rgba(255,255,255,0.18)" />
          <View style={{ flex: 1 }}>
            <Text style={styles.big24}>{`${formatNumber(d.steps)} steps`}</Text>
            <Text style={[styles.sub, { fontSize: 11.5 }]}>{`${d.outNow != null ? formatNumber(d.outNow) : "1,284"} people outside in ${d.city || "London"}`}</Text>
          </View>
        </Glass>
        <Flash />
      </View>
    </PhoneFrame>
  );
}

/** 167: the run as a Live Activity, with the Dynamic Island. */
export function LockRun({ d }) {
  const r = d.run;
  const v = r ? { km: r.km, pace: r.pace, steps: r.steps, seconds: r.seconds, out: r.out, goalKm: r.goalKm, paused: r.paused } : SAMPLE.run;
  const pct = v.goalKm ? Math.min(1, v.km / v.goalKm) : 0;
  return (
    <PhoneFrame testID="preview-lockRun">
      <Image source={PHOTOS.navCity} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ left: "50%", top: "40%" }} />
      <Shade top={0.7} />
      <View style={styles.island}>
        <ArcRing size={22} stroke={3} pct={pct} track="rgba(255,255,255,0.2)" colour={v.paused ? C.danger : C.accent} />
        <Text style={styles.islandText}>{formatDuration(v.seconds)}</Text>
        <Text style={styles.islandKm}>{`${v.km.toFixed(2)} km`}</Text>
      </View>
      <View style={[styles.lock, { paddingTop: 78 }]}>
        <Text style={styles.date}>{longDate(d.now)}</Text>
        <Text style={styles.time}>{clock(d.now)}</Text>
        <Glass style={[styles.wid, { marginTop: "auto" }]}>
          <AppRow
            right={
              <View style={styles.lv}>
                <LiveDot size={6} colour={v.paused ? C.danger : C.out} />
                <Text style={[styles.lvText, { color: v.paused ? "#ff8b95" : "#82b4ff" }]}>{v.paused ? "PAUSED" : "LIVE"}</Text>
              </View>
            }
          >
            OUTHERE · Run
          </AppRow>
          <View style={styles.lrow}>
            <View>
              <Text style={[styles.big30, { fontSize: 40, lineHeight: 36 }]}>
                {v.km.toFixed(2)}
                <Text style={{ fontSize: 16 }}> KM</Text>
              </Text>
              <Text style={styles.lsub}>{`${formatPace(v.pace)} /km · ${formatNumber(v.steps)} steps`}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.big24, { color: "#6aa6ff" }]}>{formatDuration(v.seconds)}</Text>
              <Text style={styles.lsub}>{`+${v.out} OUT`}</Text>
            </View>
          </View>
          <View style={styles.ltrack}>
            <View style={[styles.ltrackFill, { width: `${pct * 100}%` }]} />
            <View style={[styles.ltrackKnob, { left: `${pct * 100}%` }]} />
            <Text style={styles.ltrackGoal}>{`${v.goalKm} km goal`}</Text>
          </View>
          {/* Pause on frosted glass, Finish on the act gradient with its glow and sheen */}
          <View style={styles.lbtns}>
            <GlowButton title={v.paused ? "Resume" : "Pause"} icon={Pause} variant="glass" size="sm" shine={false} style={styles.lbtn} textStyle={styles.lbtnText} />
            <GlowButton title="Finish" icon={Check} size="sm" style={styles.lbtn} textStyle={styles.lbtnText} />
          </View>
        </Glass>
        <Flash />
      </View>
    </PhoneFrame>
  );
}

/** 182: mid run, with a nudge from your club underneath. */
export function LockLive({ d }) {
  const r = d.run;
  const v = r ? { km: r.km, seconds: r.seconds, pace: r.pace, goalKm: r.goalKm, routeName: r.routeName, paused: r.paused } : SAMPLE.mid;
  const pct = v.goalKm ? Math.min(1, v.km / v.goalKm) : 0;
  const left = Math.max(0, v.goalKm - v.km).toFixed(1);
  const toGo = r ? (v.routeName ? `${left} km to finish ${v.routeName}` : `${left} km to your ${v.goalKm} km goal`) : "1.8 km to finish the Southbank Loop";
  const f = d.fixture;
  const note = f
    ? {
        club: f.us.full,
        logo: f.us.logo,
        line: `${f.us.score >= f.them.score ? `We're ${formatNumber(f.us.score - f.them.score)} steps ahead of ${f.them.name}` : `${f.them.name} are ${formatNumber(f.them.score - f.us.score)} steps ahead`}. ${f.us.out} of us are out now.`,
      }
    : SAMPLE.note;
  const dot = v.paused ? C.danger : C.out;
  return (
    <PhoneFrame testID="preview-lockLive">
      <Image source={LOCK_PHOTO} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ left: "50%", top: "40%" }} />
      <LinearGradient colors={["rgba(3,6,12,0.55)", "rgba(3,6,12,0.1)", "rgba(3,6,12,0.45)", "rgba(3,6,12,0.95)", "#02050c"]} locations={[0, 0.3, 0.6, 0.8, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.island11}>
        <View style={[styles.islandDot, { backgroundColor: dot, shadowColor: dot }]} />
        <Text style={styles.islandText}>{`${v.km.toFixed(1)} km`}</Text>
      </View>
      <View style={styles.clock11}>
        <Text style={[styles.date, { fontSize: 14 }]}>{longDate(d.now)}</Text>
        <Text style={styles.time11}>{clock(d.now, true)}</Text>
      </View>
      <Glass style={styles.la} tint="rgba(10,13,20,0.62)" edge={false}>
        <View style={styles.laHead}>
          <View style={styles.lab}>
            <Logo size={16} />
            <Text style={styles.labText}>{v.paused ? "Paused" : "Running"}</Text>
          </View>
          <View style={[styles.r11dot, { backgroundColor: v.paused ? "rgba(255,77,85,0.2)" : "rgba(79,155,255,0.2)" }]}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: dot }} />
          </View>
        </View>
        <View style={styles.nums}>
          {[
            [v.km.toFixed(1), "km"],
            [formatDuration(v.seconds), "time"],
            [mmss(v.pace), "per km"],
          ].map(([n, l]) => (
            <View key={l} style={{ flex: 1 }}>
              <Text style={styles.num28}>{n}</Text>
              <Text style={styles.numLabel}>{l}</Text>
            </View>
          ))}
        </View>
        <View style={styles.pb}>
          <LinearGradient colors={["#2a6af0", "#82b4ff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${pct * 100}%`, height: "100%", borderRadius: 5 }} />
        </View>
        <Text style={styles.to}>{toGo}</Text>
      </Glass>
      <Glass style={styles.note} tint="rgba(10,13,20,0.55)" edge={false}>
        {/* A club's crest is a rounded square, never a ring. */}
        <Image source={note.logo || PHOTOS.crest} style={styles.noteImg} contentFit="cover" />
        <View style={{ flex: 1 }}>
          <Text style={styles.noteTitle} numberOfLines={1}>{note.club}</Text>
          <Text style={styles.noteLine}>{note.line}</Text>
        </View>
        <Text style={styles.noteNow}>now</Text>
      </Glass>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  lock: { flex: 1, alignItems: "center", paddingTop: 60, paddingHorizontal: 14, paddingBottom: 30 },
  date: { fontFamily: F.bodySemi, fontSize: 15, color: "rgba(255,255,255,0.9)" },
  time: { fontFamily: F.bodySemi, fontSize: 88, lineHeight: 92, letterSpacing: -3, color: "#fff", marginTop: 2 },
  wid: { width: "100%", borderRadius: 24, paddingVertical: 14, paddingHorizontal: 16 },
  stepsWid: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 },
  app: { flexDirection: "row", alignItems: "center", gap: 7 },
  appText: { fontFamily: F.bodySemi, fontSize: 11.5, color: "#c9d3e3", flexShrink: 1 },
  appRight: { marginLeft: "auto", fontFamily: F.bodySemi, fontSize: 11.5, color: "#c9d3e3", opacity: 0.7 },
  battleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10 },
  big30: { fontFamily: F.display, fontSize: 30, lineHeight: 30, color: "#fff", textTransform: "uppercase" },
  big24: { fontFamily: F.display, fontSize: 24, lineHeight: 24, color: "#fff", textTransform: "uppercase" },
  sub: { fontFamily: F.body, fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 3 },
  split: { flexDirection: "row", height: 8, borderRadius: 8, overflow: "hidden", gap: 3, marginTop: 12 },
  splitMine: { borderRadius: 8, backgroundColor: C.accent },
  splitTheirs: { flex: 1, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.2)" },
  flash: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginTop: 14, paddingHorizontal: 30 },
  flashBtn: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },

  island: { position: "absolute", top: 10, alignSelf: "center", zIndex: 4, width: 210, height: 36, borderRadius: 999, backgroundColor: "#000", flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 8, paddingRight: 14 },
  islandText: { fontFamily: F.bodySemi, fontSize: 12, color: "#fff" },
  islandKm: { marginLeft: "auto", fontFamily: F.display, fontSize: 15, color: "#6aa6ff" },
  lv: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 5 },
  lvText: { fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 0.8 },
  lrow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 12 },
  lsub: { fontFamily: F.body, fontSize: 11.5, color: "rgba(255,255,255,0.75)", marginTop: 5 },
  ltrack: { height: 5, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.2)", marginTop: 14, marginBottom: 20 },
  ltrackFill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 5, backgroundColor: C.accent, shadowColor: C.accent, shadowOpacity: 1, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  ltrackKnob: { position: "absolute", top: -4, width: 13, height: 13, marginLeft: -6.5, borderRadius: 7, backgroundColor: "#fff" },
  ltrackGoal: { position: "absolute", right: 0, top: 11, fontFamily: F.body, fontSize: 10, color: "rgba(255,255,255,0.65)" },
  lbtns: { flexDirection: "row", gap: 8 },
  lbtn: { flex: 1, height: 38 },
  lbtnText: { fontFamily: F.bodySemi, fontSize: 12, color: "#fff" },

  island11: { position: "absolute", top: 11, alignSelf: "center", zIndex: 5, height: 34, borderRadius: 20, backgroundColor: "#000", flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 12, paddingRight: 14 },
  islandDot: { width: 9, height: 9, borderRadius: 5, shadowOpacity: 1, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } },
  clock11: { position: "absolute", top: 70, left: 0, right: 0, alignItems: "center" },
  time11: { fontFamily: F.display, fontSize: 86, lineHeight: 86, color: "#fff", marginTop: 2 },
  la: { position: "absolute", left: 12, right: 12, bottom: 150, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 24, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)" },
  laHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  lab: { flexDirection: "row", alignItems: "center", gap: 7 },
  labText: { fontFamily: F.bodySemi, fontSize: 12, color: "#cfd8e6" },
  r11dot: { width: 17, height: 17, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  nums: { flexDirection: "row", marginTop: 10, marginBottom: 12 },
  num28: { fontFamily: F.display, fontSize: 28, lineHeight: 28, color: "#fff" },
  numLabel: { fontFamily: F.body, fontSize: 10.5, color: "#a9b4c6" },
  pb: { height: 5, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  to: { fontFamily: F.body, fontSize: 10.5, color: "#a9b4c6", marginTop: 7 },
  note: { position: "absolute", left: 12, right: 12, bottom: 70, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, paddingHorizontal: 13, borderRadius: 20 },
  noteImg: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#000" },
  noteTitle: { fontFamily: F.bodySemi, fontSize: 12.5, color: "#fff" },
  noteLine: { fontFamily: F.body, fontSize: 11, lineHeight: 15, color: "#c3ccda", marginTop: 2 },
  noteNow: { fontFamily: F.body, fontSize: 10, color: "#a9b4c6", alignSelf: "flex-start" },
});
