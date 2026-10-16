// The 3D section of the lush layer: the real globe (London to Tokyo, drag
// to turn), the OUT coin with a Flip button, and a plain card that says
// whether 3D is running and what a frame costs.

import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlendImage, C, F, GlowButton, Kicker, R, Row, S, Surface, useLayoutSize } from "@/components/ui";
import { Coin3D, Globe3D, threeFailed, useFrameCost, useThreeReady, webglAvailable } from "@/components/three";
import { PHOTOS } from "@/constants/photos";

const LONDON = { lat: 51.5072, lng: -0.1276, name: "London" };
const TOKYO = { lat: 35.6762, lng: 139.6503, name: "Tokyo" };

// What shows before three.js has loaded: the same lit disc RaceGlobe falls back to.
function PlainGlobe({ size, box }) {
  const r = size / 2;
  return (
    <View style={{ width: box, height: box, alignItems: "center", justifyContent: "center" }}>
      <View style={{ width: size, height: size, borderRadius: r, overflow: "hidden", boxShadow: "0 0 60px rgba(61,139,255,0.35)" }}>
        <LinearGradient colors={["#1d4a92", "#050d1f"]} start={{ x: 0.2, y: 0.1 }} end={{ x: 0.8, y: 1 }} style={StyleSheet.absoluteFill} />
      </View>
    </View>
  );
}

function Head({ kicker, title, body }) {
  return (
    <View style={styles.head}>
      <Kicker>{kicker}</Kicker>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  );
}

const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n || 0)));

export default function ThreeDemo() {
  const three = useThreeReady();
  const cost = useFrameCost();
  const [flips, setFlips] = useState(0);
  const [box, onLayout] = useLayoutSize();
  const width = box?.width || 350;
  const globe = Math.min(300, width - 40);

  let status;
  if (three) status = "3D is running";
  else if (threeFailed() || webglAvailable() === false) status = "3D is off";
  else status = "3D is loading";
  const scenes = Object.keys(cost);
  const first = scenes.length ? cost[scenes[0]] : null;
  const software = scenes.some((name) => cost[name].software);

  return (
    <View style={{ gap: S.lg }} onLayout={onLayout}>
      <Surface padding={null} radius={R.lg} contentStyle={styles.card}>
        <Head kicker="Real 3D" title="The race globe" body="London to Tokyo. Drag to turn it, it finds its own way back." />
        <Globe3D size={globe} width={width} height={Math.round(globe * 1.2)} from={LONDON} to={TOKYO} intro={false} fallback={<PlainGlobe size={globe} box={width} />} />
      </Surface>

      <Surface padding={null} radius={R.lg} contentStyle={styles.card}>
        <Head kicker="Real 3D" title="The OUT coin" body="Brushed steel, a dark face, the mark raised in metal. Tap it or press Flip." />
        <Row gap={S.lg} style={styles.coinRow}>
          <Coin3D size={150} flip={flips} fallback={<BlendImage source={PHOTOS.coin} size={150} mask="wide" />} />
          <GlowButton title="Flip" size="sm" onPress={() => setFlips((n) => n + 1)} style={{ paddingHorizontal: 22 }} />
        </Row>
      </Surface>

      <Surface padding={S.lg} radius={R.lg}>
        <Kicker>Status</Kicker>
        <Text style={styles.title}>{status}</Text>
        <Text style={styles.body}>
          {three
            ? `Drawn with three.js through react-three/fiber on ${first && first.backend ? first.backend : "WebGL in the browser or expo-gl on the phone"}${first && first.renderer ? `, ${first.renderer}` : ""}.`
            : status === "3D is off"
              ? "This browser has no WebGL, so screens keep their Skia and image versions."
              : "three.js loads the first time a screen asks for it. Screens that do not use 3D never load it."}
        </Text>
        {scenes.length ? <Text style={styles.costKick}>Frame cost on this device</Text> : null}
        {scenes.map((name) => {
          const c = cost[name];
          return (
            <View key={name} style={styles.costRow}>
              <Text style={styles.costName}>{name === "globe" ? "Globe" : "Coin"}</Text>
              <Text style={styles.costValue}>
                {c.ms ? `${c.ms.toFixed(1)} ms a frame · ${Math.round(c.fps)} fps` : "measuring"}
                {c.triangles != null ? ` · ${fmt(c.triangles)} triangles · ${c.calls} draws` : ""}
              </Text>
            </View>
          );
        })}
        {software ? <Text style={styles.warn}>This machine has no GPU: it is drawing in software ({first.renderer}), so these figures are far below what a phone or a laptop with a GPU does.</Text> : null}
        {three ? <Text style={styles.foot}>Pixel ratio {first && first.dpr ? first.dpr : "capped at 2"} on the web; expo-gl draws at the phone's own ratio. Loops stop when the screen is off, in the background or scrolled away.</Text> : null}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden", alignItems: "center", paddingBottom: S.sm },
  head: { alignSelf: "stretch", paddingHorizontal: S.lg, paddingTop: S.lg },
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 18, marginTop: 4 },
  body: { color: C.textDim, fontFamily: F.body, fontSize: 13.5, lineHeight: 19, marginTop: 4 },
  coinRow: { alignItems: "center", paddingVertical: S.md, paddingHorizontal: S.lg, alignSelf: "stretch" },
  costKick: { color: C.textDim, fontFamily: F.bodyMedium, fontSize: 12, marginTop: S.lg, textTransform: "uppercase", letterSpacing: 1 },
  costRow: { marginTop: S.sm },
  warn: { color: C.warn, fontFamily: F.bodyMedium, fontSize: 12.5, lineHeight: 17, marginTop: S.md },
  costName: { color: C.textSoft, fontFamily: F.bodyMedium, fontSize: 13 },
  costValue: { color: C.text, fontFamily: F.bodySemi, fontSize: 14, marginTop: 2 },
  foot: { color: C.textMute, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: S.md },
});
