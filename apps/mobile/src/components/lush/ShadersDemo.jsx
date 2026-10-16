// The shader kit, one card per effect: the Black card's sheen, the aurora,
// three looks for the bars to pick from, foil on badges and the globe's city lights.
// Each is the real component, at the size it is used at in the app.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Aurora, BlackCard, Body, C, F, Foil, Kicker, Meter, Row, S, Surface, TugBar, useLayoutSize } from "@/components/ui";
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

      <Demo kicker="Aurora" caption="Three ribbons of blue and violet drifting against each other on a near black sky, with the kit's grain." flush>
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

      {LOOKS.map((l) => (
        <Demo key={l.look} kicker={l.kicker} caption={l.caption}>
          <Bars look={l.look} />
        </Demo>
      ))}

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

const LOOKS = [
  { look: "neon", kicker: "Bars A: Neon", caption: "A lightsaber: a white-hot core inside the colour, a steady halo, a bright tip, and a white flare where the two sides clash." },
  { look: "glass", kicker: "Bars B: Liquid glass", caption: "Liquid in a glass tube: a glossy highlight along the top, a moving surface at the head, bubbles drifting along and a soft shine." },
  { look: "pulse", kicker: "Bars C: Pulse", caption: "Light down a fibre: packets of white light race to the head, or to the meeting point, and flash when they arrive." },
];

// A phone browser only keeps so many live canvases, so each look shows a
// battle bar and one meter.

/** One look on a live battle bar and a meter. */
function Bars({ look }) {
  return (
    <View>
      <Row style={{ justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={styles.score}>You</Text>
        <Text style={[styles.score, { color: "#ff8b92" }]}>Kemi</Text>
      </Row>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
        <Text style={styles.big}>8,412</Text>
        <Text style={[styles.big, { color: "#ff8b92" }]}>6,090</Text>
      </Row>
      <TugBar share={0.58} height={12} live look={look} style={{ marginTop: S.md, marginBottom: S.xl }} />
      <Row style={{ justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={styles.label}>Level 22</Text>
        <Text style={styles.label}>18,240 / 21,000 XP</Text>
      </Row>
      <Meter value={0.72} size="lg" liquid look={look} />
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
  badge: { alignItems: "center", paddingTop: 10, paddingBottom: 12, paddingHorizontal: 6 },
  badgeName: { color: C.text, fontFamily: F.bodySemi, fontSize: 12.5, marginTop: 6 },
  badgeSub: { color: C.accent, fontFamily: F.body, fontSize: 11, marginTop: 2 },
});


