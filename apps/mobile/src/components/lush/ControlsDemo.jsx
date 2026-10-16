// Every button and control in the kit on one page: the Buttons tab of /lush
// and the top of /kit. Tap them to feel the press, the sheen and the springs.

import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Bell, Check, MoreHorizontal, Play, Search, Settings, Share2, Square } from "lucide-react-native";
import { PHOTOS } from "@/constants/photos";
import { ToggleRow } from "@/components/move/parts";
import { Body, GlowButton, IconButton, Kicker, PhotoBackground, Pill, Row, S, Segment, Surface, Toggle } from "@/components/ui";

export default function ControlsDemo() {
  const [seg, setSeg] = useState("a");
  const [map, setMap] = useState(true);
  const [quiet, setQuiet] = useState(false);
  const [pause, setPause] = useState(true);
  const [saving, setSaving] = useState(false);
  const save = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 1600);
  };
  return (
    <View>
      <Kicker style={styles.k}>Buttons</Kicker>
      <View style={{ gap: S.md }}>
        <GlowButton title="Start outside" lead={Play} full onPress={() => {}} />
        <Row>
          <GlowButton title="Done" variant="quiet" style={{ flex: 1 }} />
          <GlowButton title="Share to club" icon={Share2} style={{ flex: 1.5 }} />
        </Row>
        <Row>
          <GlowButton title="Not now" variant="quiet" style={{ flex: 1 }} />
          <GlowButton title="End" variant="stop" icon={Square} style={{ flex: 1 }} />
        </Row>
        <Row>
          <GlowButton title="Continue" disabled style={{ flex: 1 }} />
          <GlowButton title="Save" loading={saving} onPress={save} style={{ flex: 1 }} />
        </Row>
        <Row>
          <GlowButton title="Join" size="sm" />
          <GlowButton title="Following" variant="outline" icon={Check} size="sm" />
          <GlowButton title="Later" variant="quiet" size="sm" />
          <GlowButton variant="quiet" icon={MoreHorizontal} size="sm" square accessibilityLabel="More" />
        </Row>
      </View>

      <Kicker style={styles.k}>Over a photo</Kicker>
      <View style={styles.photo}>
        <PhotoBackground source={PHOTOS.city} fade="soft" />
        <Row style={{ padding: S.lg, marginTop: "auto" }}>
          <GlowButton title="Share" variant="glass" icon={Share2} style={{ flex: 1 }} />
          <GlowButton title="Join run" style={{ flex: 1 }} />
        </Row>
      </View>

      <Kicker style={styles.k}>Controls</Kicker>
      <View style={{ gap: S.md }}>
        <Segment options={[{ value: "a", label: "Week" }, { value: "b", label: "Month" }, { value: "c", label: "Season" }]} value={seg} onChange={setSeg} />
        <Row style={{ justifyContent: "space-between" }}>
          <Row>
            <IconButton icon={Bell} badge={3} label="Pings" />
            <IconButton icon={Settings} label="Settings" />
            <IconButton icon={Search} active label="Search" />
          </Row>
          <Row>
            <Pill label="PRO" tone="pro" />
            <Pill label="LIVE" tone="accent" />
            <Pill label="ENDED" tone="danger" />
          </Row>
        </Row>
        <Surface padding={S.lg}>
          <Row style={{ justifyContent: "space-between" }}>
            <Body>Show me on the map</Body>
            <Toggle value={map} onChange={setMap} label="Show me on the map" />
          </Row>
          <Row style={{ justifyContent: "space-between", marginTop: S.md }}>
            <Body>Quiet hours</Body>
            <Toggle value={quiet} onChange={setQuiet} label="Quiet hours" />
          </Row>
          <ToggleRow title="Auto pause" sub="Stops the clock at lights" value={pause} onChange={setPause} />
        </Surface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  k: { marginTop: S.xl, marginBottom: S.sm },
  photo: { height: 150, borderRadius: 24, overflow: "hidden" },
});
