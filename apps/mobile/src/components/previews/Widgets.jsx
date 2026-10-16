// Home screen widgets as a preview, from the round six prototype: the big
// widget (steps ring, streak, your battle, who's outside) and the two small
// ones (the crew goal and what's next), on a home screen with app icons and
// the dock.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Bell, Calendar, Camera, Clock, Compass, Flame, Heart, Layers, MessageSquare, Newspaper, Play, Send } from "lucide-react-native";
import { C, F, Logo } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { formatNumber } from "@/utils/format";
import { ArcRing, Glass, PhoneFrame } from "./bits";

const SAMPLE = {
  battle: { rival: "Kemi", diff: 560 },
  crew: { name: "Southbank", weekKm: 412, goalKm: 500 },
  event: { title: "City Night Run", when: "Tonight 19:30", going: true },
};

const APPS = [
  [Calendar, "Calendar", "#e9edf3", "#d9443b"],
  [Camera, "Camera", "#5b6576", "#fff"],
  [Compass, "Maps", "#2f9e6e", "#fff"],
  [Heart, "Health", "#fff", "#ff4d6d"],
  [Newspaper, "News", "#1f2a3c", "#fff"],
  [Clock, "Clock", "#0b0d12", "#fff"],
  [Bell, "Reminders", "#f4f5f7", "#3d8bff"],
  [Layers, "Files", "#3d8bff", "#fff"],
];

const AppLabel = ({ children }) => (
  <View style={styles.app}>
    <Logo size={14} />
    <Text style={styles.appText}>{children}</Text>
  </View>
);

const signed = (n) => `${n >= 0 ? "+" : "−"}${formatNumber(Math.abs(n))}`;

export function HomeWidgets({ d }) {
  const b = d.battle || SAMPLE.battle;
  const crew = d.crew || SAMPLE.crew;
  const ev = d.event || SAMPLE.event;
  const crewPct = crew.goalKm ? Math.min(1, crew.weekKm / crew.goalKm) : 0;
  return (
    <PhoneFrame testID="preview-widgets">
      <Image source={PHOTOS.navCity} style={[StyleSheet.absoluteFill, { opacity: 0.45 }]} contentFit="cover" contentPosition={{ left: "50%", top: "40%" }} />
      <View style={styles.spring}>
        {/* Large */}
        <Glass style={[styles.wg, styles.big]} tint="rgba(12,18,30,0.45)">
          <AppLabel>OUTHERE</AppLabel>
          <View style={styles.wgm}>
            <ArcRing size={92} stroke={9} pct={d.goal ? d.steps / d.goal : 0} track="rgba(255,255,255,0.16)">
              <Text style={styles.ringNum}>{formatNumber(d.steps)}</Text>
              <Text style={styles.ringLabel}>steps</Text>
            </ArcRing>
            <View style={styles.wgr}>
              <View>
                <Text style={styles.wgrLabel}>Streak</Text>
                <View style={styles.wgrRow}>
                  <Flame size={14} color="#4b93ff" />
                  <Text style={styles.wgrValue}>{`${d.streak} ${d.streak === 1 ? "day" : "days"}`}</Text>
                </View>
              </View>
              <View>
                <Text style={styles.wgrLabel}>{`vs ${b.rival}`}</Text>
                <Text style={[styles.wgrValue, { color: b.diff >= 0 ? "#6aa6ff" : "#ff7a80" }]}>{signed(b.diff)}</Text>
              </View>
              <View>
                <Text style={styles.wgrLabel}>Outside now</Text>
                <Text style={styles.wgrValue}>{d.outNow != null ? formatNumber(d.outNow) : "1,284"}</Text>
              </View>
            </View>
          </View>
        </Glass>

        {/* Two small */}
        <View style={styles.row2}>
          <Glass style={[styles.wg, styles.sm]} tint="rgba(12,18,30,0.45)">
            <AppLabel>CREW</AppLabel>
            <Text style={[styles.smBig, { marginTop: "auto" }]}>
              {formatNumber(crew.weekKm)}
              <Text style={{ fontSize: 14 }}> KM</Text>
            </Text>
            <View style={styles.wp}>
              <View style={{ width: `${Math.round(crewPct * 100)}%`, height: "100%", backgroundColor: C.accent }} />
            </View>
            <Text style={styles.smSmall} numberOfLines={1}>{`${crew.name} · goal ${formatNumber(crew.goalKm)}`}</Text>
          </Glass>
          <Glass style={[styles.wg, styles.sm]} tint="rgba(12,18,30,0.45)">
            <AppLabel>NEXT</AppLabel>
            <Text style={[styles.smBig, { fontSize: 22, lineHeight: 22, marginTop: "auto" }]} numberOfLines={2}>
              {ev.title}
            </Text>
            <Text style={styles.smSmall}>{ev.when}</Text>
            <View style={[styles.wgo, !ev.going && { backgroundColor: "rgba(255,255,255,0.16)" }]}>
              <Text style={styles.wgoText}>{ev.going ? "Going" : `${ev.count} going`}</Text>
            </View>
          </Glass>
        </View>

        {/* Apps */}
        <View style={styles.apps}>
          {APPS.map(([Icon, label, bg, fg]) => (
            <View key={label} style={styles.aw}>
              <View style={[styles.ai, { backgroundColor: bg }]}>
                <Icon size={26} color={fg} />
              </View>
              <Text style={styles.awText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Dock */}
        <Glass style={styles.dock} tint="rgba(255,255,255,0.14)" blur={20} edge={false}>
          <View style={[styles.ai, { backgroundColor: "#2f9e6e" }]}>
            <MessageSquare size={26} color="#fff" />
          </View>
          <View style={[styles.ai, styles.aiOh]}>
            <Logo size={32} />
          </View>
          <View style={[styles.ai, { backgroundColor: "#3d8bff" }]}>
            <Send size={26} color="#fff" />
          </View>
          <View style={[styles.ai, { backgroundColor: "#ff4d6d" }]}>
            <Play size={26} color="#fff" fill="#fff" />
          </View>
        </Glass>
      </View>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  spring: { flex: 1, paddingTop: 62, paddingHorizontal: 18, paddingBottom: 22, gap: 16 },
  wg: { borderRadius: 24, paddingVertical: 13, paddingHorizontal: 14 },
  big: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  app: { flexDirection: "row", alignItems: "center", gap: 6 },
  appText: { fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1, color: "#c9d3e3" },
  wgm: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 10 },
  ringNum: { fontFamily: F.display, fontSize: 21, lineHeight: 21, color: "#fff" },
  ringLabel: { fontFamily: F.body, fontSize: 9.5, color: "#c9d3e3" },
  wgr: { gap: 7 },
  wgrLabel: { fontFamily: F.body, fontSize: 9.5, color: "#9aa6b8" },
  wgrRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  wgrValue: { fontFamily: F.display, fontSize: 18, lineHeight: 18, color: "#fff", letterSpacing: 0.2 },
  row2: { flexDirection: "row", gap: 16 },
  sm: { flex: 1, height: 146, gap: 5 },
  smBig: { fontFamily: F.display, fontSize: 30, lineHeight: 30, color: "#fff", textTransform: "uppercase" },
  smSmall: { fontFamily: F.body, fontSize: 10, color: "#c9d3e3" },
  wp: { height: 5, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.18)", overflow: "hidden" },
  wgo: { alignSelf: "flex-start", paddingVertical: 4, paddingHorizontal: 9, borderRadius: 999, backgroundColor: C.accent },
  wgoText: { fontFamily: F.bodySemi, fontSize: 10, color: "#fff" },
  apps: { flexDirection: "row", flexWrap: "wrap", rowGap: 14, marginTop: 2 },
  aw: { width: "25%", alignItems: "center", gap: 5 },
  awText: { fontFamily: F.bodyMedium, fontSize: 10, color: "#fff", textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  ai: { width: 56, height: 56, borderRadius: 15, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 4 } },
  aiOh: { backgroundColor: "#05080e", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  dock: { marginTop: "auto", flexDirection: "row", justifyContent: "space-around", paddingVertical: 12, paddingHorizontal: 6, borderRadius: 32 },
});
