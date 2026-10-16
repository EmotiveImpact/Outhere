// The finish kit on one page, for checking it renders (Skia included) on
// every platform. Not linked from the app: open /kit.

import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Play, Share2, Square } from "lucide-react-native";
import { PHOTOS } from "@/constants/photos";
import {
  Avatar,
  BlendImage,
  Body,
  C,
  F,
  GlowBackdrop,
  GlowButton,
  Grain,
  Header,
  Kicker,
  Meter,
  PhotoBackground,
  Row,
  S,
  Screen,
  Segment,
  Spotlight,
  SpotlightNumber,
  Surface,
  Title,
  VersusSplit,
  hypeColour,
  useSkiaReady,
} from "@/components/ui";

export default function KitLab() {
  const ready = useSkiaReady();
  const [seg, setSeg] = useState("a");
  const [n, setN] = useState(3);
  return (
    <Screen header={<Header back title="Finish kit" subtitle={ready ? "Skia ready" : "Skia loading"} />}>
      <Kicker style={styles.k}>Slab, object, grain</Kicker>
      <View style={styles.slab}>
        <GlowBackdrop preset="slab" breathe />
        <BlendImage source={PHOTOS.trophy} size={220} float glow style={{ position: "absolute", right: -20, top: 10 }} />
        <Grain amount={0.06} />
        <View style={{ padding: S.lg, marginTop: "auto" }}>
          <Kicker>Season 2</Kicker>
          <Title size={44}>The</Title>
          <Title size={44} blue>Arena</Title>
        </View>
      </View>

      <Kicker style={styles.k}>Photo</Kicker>
      <View style={styles.photo}>
        <PhotoBackground source={PHOTOS.city} />
        <View style={{ padding: S.lg, marginTop: "auto" }}>
          <Title size={32}>London</Title>
        </View>
      </View>

      <Kicker style={styles.k}>Surfaces</Kicker>
      <Surface>
        <Body>A lit card</Body>
      </Surface>
      <Surface onPress={() => {}} style={{ marginTop: S.md }}>
        <Body>Tap me: I sink and light up</Body>
      </Surface>
      <Surface tone="blue" style={{ marginTop: S.md }}>
        <Row gap={S.md}>
          <Avatar name="Alex Morgan" tier="pro" dot="out" size={44} />
          <Avatar name="Kemi" tier="free" dot="stopped" size={44} />
          <Avatar name="Zain" tier="black" size={44} />
          <Avatar name="Mei" story="unwatched" size={44} />
          <Body>You</Body>
        </Row>
      </Surface>

      <Kicker style={styles.k}>Buttons</Kicker>
      <View style={{ gap: S.md }}>
        <GlowButton title="Start outside" lead={Play} full onPress={() => {}} />
        <Row>
          <GlowButton title="Not now" variant="quiet" style={{ flex: 1 }} />
          <GlowButton title="End" variant="stop" icon={Square} style={{ flex: 1 }} />
        </Row>
        <Row>
          <GlowButton title="Share" variant="glass" icon={Share2} size="sm" />
          <GlowButton title="Join" size="sm" />
          <GlowButton title="Outline" variant="outline" size="sm" />
        </Row>
        <Segment options={[{ value: "a", label: "Week" }, { value: "b", label: "Month" }, { value: "c", label: "Season" }]} value={seg} onChange={setSeg} />
      </View>

      <Kicker style={styles.k}>Meters</Kicker>
      <View style={{ gap: S.md }}>
        <Meter value={0.62} size="sm" />
        <Meter value={0.62} />
        <Meter value={0.8} size="lg" cap />
        <Meter value={0.4} tone="red" />
      </View>

      <Kicker style={styles.k}>Versus</Kicker>
      <VersusSplit height={240} left={{ source: PHOTOS.fighterA }} right={{ source: PHOTOS.fighterB }} style={{ borderRadius: 20 }}>
        <View style={{ position: "absolute", left: S.lg, bottom: S.lg }}>
          <Text style={styles.name}>You</Text>
        </View>
        <View style={{ position: "absolute", right: S.lg, bottom: S.lg }}>
          <Text style={styles.name}>Kemi</Text>
        </View>
      </VersusSplit>

      <Kicker style={styles.k}>Countdown</Kicker>
      <Surface padding={0} onPress={() => setN((v) => (v <= 0 ? 3 : v - 1))} touchGlow={false}>
        <View style={{ height: 420 }}>
          <Spotlight beat={n} go={n === 0} colour={hypeColour(n)} photo={PHOTOS.city} centreY={200}>
            <View style={{ position: "absolute", left: 0, right: 0, top: 200 - 140, height: 280, justifyContent: "center" }}>
              <SpotlightNumber value={n === 0 ? "GO" : n} colour={hypeColour(n)} size={n === 0 ? 150 : 220} />
            </View>
          </Spotlight>
        </View>
      </Surface>
      <Body dim size={12} style={{ marginTop: S.sm, color: C.textMute }}>
        Tap the countdown to step it.
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  k: { marginTop: S.xl, marginBottom: S.sm },
  slab: { height: 300, borderRadius: 24, overflow: "hidden" },
  photo: { height: 220, borderRadius: 24, overflow: "hidden" },
  name: { color: "#fff", fontFamily: F.display, fontSize: 26, textTransform: "uppercase" },
});
