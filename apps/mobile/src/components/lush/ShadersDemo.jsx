// The shader kit, one card per effect: the Black card's sheen, the aurora,
// heat and liquid on the bars, foil on badges and the globe's city lights.
// Each is the real component, at the size it is used at in the app.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Aurora, BlackCard, Body, C, F, Foil, Kicker, LiquidRing, Meter, Row, S, Surface, TugBar, useLayoutSize } from "@/components/ui";
import { RaceGlobe } from "@/components/arena/RaceGlobe";
import { PHOTOS } from "@/constants/photos";

const BADGES = [
  { art: PHOTOS.medal, label: "10k club" },
  { art: PHOTOS.crown, label: "100 day streak" },
  { art: PHOTOS.trophy, label: "First win" },
];

export default function ShadersDemo() {
  const [box, onLayout] = useLayoutSize();
  const width = box ? box.width : 0;
  return (
    <View onLayout={onLayout} style={{ gap: S.lg }}>
      <Demo kicker="Sheen" caption="Brushed metal. A soft light crosses the card every six seconds and the brushing catches it.">
        {width ? <BlackCard width={width - S.lg * 2} name="Alex Morgan" number={212} style={{ alignSelf: "center", marginVertical: S.sm }} /> : null}
      </Demo>

      <Demo kicker="Aurora" caption="Curtains of blue and violet light with fine rays, drifting on a near black sky that fades into the card." flush>
        <View style={styles.sky}>
          <Aurora />
          <View style={styles.skyText}>
            <Kicker colour={C.accentHi}>Membership active</Kicker>
            <Text style={styles.skyH}>Welcome</Text>
            <Text style={styles.skyH}>
              to <Text style={{ color: C.accent }}>Black</Text>
            </Text>
          </View>
        </View>
      </Demo>

      <Demo kicker="Shimmer and glow" caption="A live battle: light streams in from both ends to a soft spark where the two meet. Bars and rings glow out past their own edges.">
        <Row style={{ justifyContent: "space-between", marginBottom: 6 }}>
          <Text style={styles.score}>You</Text>
          <Text style={[styles.score, { color: "#ff8b92" }]}>Kemi</Text>
        </Row>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
          <Text style={styles.big}>8,412</Text>
          <Text style={[styles.big, { color: "#ff8b92" }]}>6,090</Text>
        </Row>
        <TugBar share={0.58} height={12} live style={{ marginTop: S.md, marginBottom: S.xl }} />
        <Row gap={S.lg} style={{ alignItems: "center", marginTop: S.sm }}>
          <View style={{ flex: 1, gap: S.lg }}>
            <View>
              <Row style={{ justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={styles.label}>Level 22</Text>
                <Text style={styles.label}>18,240 / 21,000 XP</Text>
              </Row>
              <Meter value={0.72} size="lg" liquid cap />
            </View>
            <View>
              <Row style={{ justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={styles.label}>Black earned you</Text>
                <Text style={[styles.label, { color: C.accentHi }]}>+412 OUT</Text>
              </Row>
              <Meter value={0.42} size={14} liquid />
            </View>
          </View>
          <LiquidRing value={0.84} size={132} stroke={11}>
            <Text style={styles.ring}>84%</Text>
            <Text style={styles.ringSub}>of 10k goal</Text>
          </LiquidRing>
        </Row>
      </Demo>

      <Demo kicker="Foil" caption="A cool iridescence on each badge's highlights, a glint every few seconds and a blue bloom behind it. It moves with the phone's tilt.">
        <Row gap={S.sm} style={{ alignItems: "stretch" }}>
          {BADGES.map((b) => (
            <Surface key={b.label} tone="sunk" radius={18} padding={null} style={{ flex: 1 }} contentStyle={styles.badge}>
              <Foil source={b.art} size={84} mask="tight" />
              <Text style={styles.badgeName} numberOfLines={1}>
                {b.label}
              </Text>
              <Text style={styles.badgeSub}>Earned</Text>
            </Surface>
          ))}
        </Row>
      </Demo>

      <Demo kicker="City lights" caption="The race globe at night: the cities twinkle on the dark side, a thin atmosphere along the rim, dusk across the terminator." flush>
        <RaceGlobe me={{ name: "You", city: "London", avatar: PHOTOS.selfie }} them={{ name: "Mei", city: "Tokyo", avatar: PHOTOS.rivalMei }} height={360} />
      </Demo>
    </View>
  );
}

function Demo({ kicker, caption, flush = false, children }) {
  return (
    <Surface radius={24} padding={null} contentStyle={{ paddingTop: S.lg, paddingBottom: flush ? 0 : S.lg }}>
      <View style={{ paddingHorizontal: S.lg, marginBottom: S.md }}>
        <Kicker>{kicker}</Kicker>
        <Body dim size={13} style={{ marginTop: 4 }}>
          {caption}
        </Body>
      </View>
      <View style={flush ? styles.flush : { paddingHorizontal: S.lg }}>{children}</View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  flush: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden" },
  sky: { height: 220, justifyContent: "flex-end" },
  skyText: { padding: S.lg },
  skyH: { color: C.text, fontFamily: F.display, fontSize: 36, lineHeight: 35, textTransform: "uppercase" },
  score: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase" },
  big: { color: C.accentHi, fontFamily: F.display, fontSize: 34, lineHeight: 36 },
  label: { color: C.textDim, fontFamily: F.bodyMedium, fontSize: 12 },
  ring: { color: C.text, fontFamily: F.display, fontSize: 34, lineHeight: 36 },
  ringSub: { color: C.textDim, fontFamily: F.body, fontSize: 11 },
  badge: { alignItems: "center", paddingTop: 10, paddingBottom: 12, paddingHorizontal: 6 },
  badgeName: { color: C.text, fontFamily: F.bodySemi, fontSize: 12.5, marginTop: 6 },
  badgeSub: { color: C.accent, fontFamily: F.body, fontSize: 11, marginTop: 2 },
});


