// The countdown stage every hyped countdown shares (.hype in the prototype):
// the chip with a live dot at 76, four beat bars at 126, the number slamming
// in round 330, the kicker at 478, the line at 500 and the stakes at 556,
// with Cancel along the bottom. Spotlight draws the light; each countdown
// brings its own backdrop (the run's map, the city, the borough crest).
//
//   <HypeStage beat={i} beats={[{ n: "3", line, kicker }, ...]} chip stakes onCancel />

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { C, F, PressableScale, R, Spotlight, SpotlightNumber, hypeColour } from "@/components/ui";

const COLOURS = ["3", "2", "1"];

/**
 * beat: index into beats. beats: [{ n, line, kicker }] where n is "3", "2",
 * "1" or "GO". chip: the route or fixture. stakes: [{ value, label }].
 * backdrop: drawn under the veil (a photo, the crest). clear: let what is
 * behind show through (the run's map). veil: the Spotlight veil.
 * foot: replaces the Cancel line (Out the door, Start now).
 */
export function HypeStage({ beat = 0, beats, chip, stakes = [], onCancel, foot, photo, photoOpacity, backdrop, clear, veil, liveDot = "#ff5a5f" }) {
  const insets = useSafeAreaInsets();
  const b = beats[Math.min(beat, beats.length - 1)];
  const go = b.n === "GO";
  const colour = hypeColour(go ? 0 : Number(b.n));
  // The prototype's stage, in px down a 844 screen; its top 22 sits at insets.top + 8.
  const y = (px) => insets.top - 14 + px;
  const lit = go ? 4 : COLOURS.indexOf(b.n) + 1;
  return (
    <Spotlight beat={`${beat}${b.n}`} go={go} colour={colour} photo={photo} photoOpacity={photoOpacity} backdrop={backdrop} centreY={y(330)} clear={clear} veil={veil}>
      <View style={[styles.route, { top: y(76) }]}>
        <View style={styles.chip}>
          <BlurView tint="dark" intensity={60} style={StyleSheet.absoluteFill} />
          <View style={[styles.dot, { backgroundColor: liveDot, boxShadow: `0 0 8px ${liveDot}` }]} />
          <Text style={styles.chipText} numberOfLines={1}>
            {chip}
          </Text>
        </View>
      </View>
      <View style={[styles.hbar, { top: y(126) }]}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.seg, i < lit && { backgroundColor: colour, boxShadow: `0 0 8px ${colour}` }]} />
        ))}
      </View>
      <View style={[styles.number, { top: y(330) - 150 }]} pointerEvents="none">
        <SpotlightNumber key={`${beat}${b.n}`} value={go ? "GO" : Number(b.n)} colour={colour} />
      </View>
      <Text style={[styles.kicker, { top: y(478) }]} numberOfLines={1}>
        {b.kicker}
      </Text>
      <Animated.Text key={`line${beat}`} entering={FadeInDown.duration(500).delay(150)} style={[styles.line, { top: y(500) }]} numberOfLines={1} adjustsFontSizeToFit>
        {b.line}
      </Animated.Text>
      {stakes.length ? (
        <View style={[styles.stakes, { top: y(556) }]}>
          {stakes.map((s) => (
            <View key={s.label} style={styles.stake}>
              <BlurView tint="dark" intensity={50} style={StyleSheet.absoluteFill} />
              <Text style={styles.stakeValue} numberOfLines={1} adjustsFontSizeToFit>
                {s.value}
              </Text>
              <Text style={styles.stakeLabel} numberOfLines={2}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={[styles.foot, { bottom: Math.max(40, insets.bottom + 26) }]}>
        {foot || (
          <PressableScale onPress={onCancel} accessibilityLabel="Cancel" hitSlop={12}>
            <Text style={styles.cancel}>Cancel</Text>
          </PressableScale>
        )}
      </View>
    </Spotlight>
  );
}

/** The quiet text links along the bottom of a countdown (.hcan). */
export function HypeLinks({ links }) {
  return (
    <View style={styles.links}>
      {links.map((l) => (
        <PressableScale key={l.label} onPress={l.onPress} accessibilityLabel={l.label} hitSlop={12}>
          <Text style={[styles.cancel, l.blue && { color: C.accentHi }]}>{l.label}</Text>
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // .hype .hroute: a glass chip with a live dot
  route: { position: "absolute", left: 18, right: 18, alignItems: "center" },
  chip: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 8, paddingHorizontal: 13, borderRadius: R.full, backgroundColor: "rgba(255,255,255,0.1)", maxWidth: "100%", overflow: "hidden" },
  dot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { color: C.text, fontFamily: F.bodySemi, fontSize: 12, lineHeight: 15 },
  // .hype .hbar: four beats, lit in the beat's colour
  hbar: { position: "absolute", left: 18, right: 18, flexDirection: "row", gap: 5 },
  seg: { flex: 1, height: 4, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.18)" },
  number: { position: "absolute", left: 0, right: 0, height: 300, justifyContent: "center" },
  // .hype .hk and .hl7
  kicker: { position: "absolute", left: 18, right: 18, textAlign: "center", color: "rgba(255,255,255,0.6)", fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase" },
  line: { position: "absolute", left: 18, right: 18, textAlign: "center", color: "#fff", fontFamily: F.display, fontSize: 30, lineHeight: 32, letterSpacing: 0.5, textTransform: "uppercase" },
  // .hype .hstk
  stakes: { position: "absolute", left: 18, right: 18, flexDirection: "row", gap: 8 },
  stake: { flex: 1, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 6, alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  stakeValue: { color: "#fff", fontFamily: F.display, fontSize: 22, lineHeight: 24, marginBottom: 2 },
  stakeLabel: { color: "rgba(255,255,255,0.65)", fontFamily: F.body, fontSize: 10.5, textAlign: "center" },
  // .hype .hcan
  foot: { position: "absolute", left: 18, right: 18, alignItems: "center" },
  links: { flexDirection: "row", gap: 36, justifyContent: "center" },
  cancel: { color: "rgba(255,255,255,0.6)", fontFamily: F.bodySemi, fontSize: 12.5 },
});
