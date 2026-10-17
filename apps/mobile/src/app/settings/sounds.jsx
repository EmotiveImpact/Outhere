// Sound and haptics: the countdown voice (with a preview), a buzz each
// kilometre and before turns, win sounds, emote sounds and music that dips
// while we speak. Runs read these from settings.sound.

import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import * as Speech from "expo-speech";
import { MotiView } from "moti";
import { Bell, CornerUpLeft, Flame, Hand, Play, Trophy, Zap } from "@/components/ui/icons";
import { useSettings, useUpdateSettings } from "@/data/hooks";
import { C, FadeIn, R, S, Screen, Skeleton } from "@/components/ui";
import { Group, MiniSegment, PlainHeadline, Row, Toggle, TopBar } from "@/components/account/parts";
import { hapticImpact } from "@/services/haptics";

const BARS = Array.from({ length: 34 }, (_, i) => Math.round(14 + 36 * Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.21))));

function Wave({ on }) {
  return (
    <View style={styles.wave}>
      {BARS.map((h, i) => (
        <MotiView
          key={i}
          from={{ scaleY: 0.55 }}
          animate={{ scaleY: on ? 1 : 0.2 }}
          transition={{ type: "timing", duration: 700, delay: i * 30, loop: on, repeatReverse: true }}
          style={[styles.waveBar, { height: h, opacity: 0.55 + (h / 50) * 0.45 }]}
        />
      ))}
    </View>
  );
}

// Dots and a dash: the shape of the buzz.
const Pattern = ({ beats }) => (
  <View style={{ flexDirection: "row", gap: 4, marginTop: 6 }}>
    {beats.map((long, i) => (
      <View key={i} style={[styles.beat, long && { width: 16 }]} />
    ))}
  </View>
);

const say = (voice) => {
  try {
    Speech.stop();
    if (voice === "off") return;
    const calm = voice === "calm";
    Speech.speak(calm ? "Three. Two. One. Off you go." : "Three! Two! One! Go!", { language: "en-GB", rate: calm ? 0.85 : 1.1, pitch: calm ? 0.95 : 1.1 });
  } catch {
    // Speech isn't available everywhere (some browsers). The choice still saves.
  }
};

const buzz = async (beats) => {
  for (const long of beats) {
    await hapticImpact();
    await new Promise((r) => setTimeout(r, long ? 260 : 140));
  }
};

export default function SoundsScreen() {
  const { data: settings } = useSettings();
  const update = useUpdateSettings();
  const sound = settings?.sound;
  const setSound = (patch) => update.mutate({ sound: patch });

  useEffect(() => () => Speech.stop?.(), []);

  return (
    <Screen header={<TopBar title="" />} contentStyle={{ gap: S.md }}>
      <FadeIn index={0}>
        <PlainHeadline kicker="Settings" top="Sound and" bottom="haptics" size={40} />
      </FadeIn>
      {!sound ? (
        <Skeleton height={420} radius={R.lg} />
      ) : (
        <>
          <FadeIn index={1}>
            <Wave on={sound.countdownVoice !== "off"} />
          </FadeIn>
          <FadeIn index={2}>
            <Group>
              <Row
                icon={Play}
                title="Countdown voice"
                hint="3, 2, 1, go"
                right={
                  <MiniSegment
                    options={[
                      { value: "hype", label: "Hype" },
                      { value: "calm", label: "Calm" },
                      { value: "off", label: "Off" },
                    ]}
                    value={sound.countdownVoice}
                    onChange={(countdownVoice) => {
                      setSound({ countdownVoice });
                      say(countdownVoice);
                    }}
                  />
                }
              />
              <Row
                icon={Zap}
                title="Buzz each kilometre"
                right={
                  <Toggle
                    value={sound.buzzKm}
                    onChange={(buzzKm) => {
                      setSound({ buzzKm });
                      if (buzzKm) buzz([false, false, true]);
                    }}
                    label="Buzz each kilometre"
                  />
                }
              >
                <Pattern beats={[false, false, true]} />
              </Row>
              <Row
                icon={CornerUpLeft}
                title="Buzz before turns"
                right={
                  <Toggle
                    value={sound.buzzTurns}
                    onChange={(buzzTurns) => {
                      setSound({ buzzTurns });
                      if (buzzTurns) buzz([false, false]);
                    }}
                    label="Buzz before turns"
                  />
                }
              >
                <Pattern beats={[false, false]} />
              </Row>
              <Row icon={Trophy} title="Win sound" hint="Plays on wins and level ups" right={<Toggle value={sound.winSound} onChange={(winSound) => setSound({ winSound })} label="Win sound" />} />
              <Row icon={Flame} title="Emote sounds" hint="When someone fires one at you" right={<Toggle value={sound.emoteSounds} onChange={(emoteSounds) => setSound({ emoteSounds })} label="Emote sounds" />} />
              <Row icon={Bell} title="Lower music for cues" hint="Your music dips while we speak" right={<Toggle value={sound.duckMusic} onChange={(duckMusic) => setSound({ duckMusic })} label="Lower music for cues" />} />
            </Group>
          </FadeIn>
          <FadeIn index={3}>
            <Group>
              <Row icon={Hand} title="Haptics" hint="Little taps when you press things" right={<Toggle value={settings.haptics} onChange={(haptics) => update.mutate({ haptics })} label="Haptics" />} />
            </Group>
          </FadeIn>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  wave: { height: 76, borderRadius: R.lg, backgroundColor: "#0c1220", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(130,180,255,0.25)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3 },
  waveBar: { width: 4, borderRadius: 2, backgroundColor: C.accent },
  beat: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accentHi },
});
