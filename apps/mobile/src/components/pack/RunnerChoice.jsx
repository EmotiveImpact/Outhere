// "Your runner": Man, Woman or Rather not say. It picks the silhouette that
// stands in for a member until they add a photo or make a Fighter Pack.
// Rather not say lets them choose either figure. Used in onboarding and in
// Settings, Your profile.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { C, F, PressableScale, R, S, Segment } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { RUNNERS } from "@/constants/pack";
import { hapticSelection } from "@/services/haptics";

// "Rather not say" doesn't fit a third of the track; the hint says it in full.
const SHORT = { either: "Not saying" };

const FIGURES = [
  { key: "man", label: "Figure one", source: PHOTOS.silhouetteMale },
  { key: "woman", label: "Figure two", source: PHOTOS.silhouetteFemale },
];

/** value: { runner, runnerFigure }. onChange gets the same shape. */
export function RunnerChoice({ value = {}, onChange, style }) {
  const runner = value.runner || "either";
  const figure = value.runnerFigure || "man";
  const shown = runner === "either" ? figure : runner;
  return (
    <View style={[{ gap: S.md }, style]}>
      <Segment options={RUNNERS.map((r) => ({ value: r.key, label: SHORT[r.key] || r.label }))} value={runner} onChange={(r) => onChange({ runner: r, runnerFigure: r === "either" ? figure : null })} />
      <View style={styles.row}>
        {runner === "either" ? (
          FIGURES.map((f) => {
            const on = f.key === figure;
            return (
              <PressableScale
                key={f.key}
                onPress={() => {
                  if (on) return;
                  hapticSelection();
                  onChange({ runner, runnerFigure: f.key });
                }}
                scaleTo={0.95}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={f.label}
                style={[styles.tile, on ? styles.tileOn : styles.tileOff]}
              >
                <Image source={f.source} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ top: "20%", left: "50%" }} />
              </PressableScale>
            );
          })
        ) : (
          <View style={[styles.tile, styles.tileOn]}>
            <Image source={shown === "woman" ? PHOTOS.silhouetteFemale : PHOTOS.silhouetteMale} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ top: "20%", left: "50%" }} transition={200} />
          </View>
        )}
        <Text style={styles.hint}>{runner === "either" ? "Rather not say. Pick the figure that stands in for you." : "Stands in for you until you add a photo or make your Fighter Pack."}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: S.sm },
  tile: { width: 58, height: 76, borderRadius: R.sm, overflow: "hidden", backgroundColor: "#05080e" },
  tileOn: { borderWidth: 1.5, borderColor: "#3b7bff", boxShadow: "0 0 14px -2px rgba(59,123,255,0.7)" },
  tileOff: { borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", opacity: 0.6 },
  hint: { flex: 1, color: C.textDim, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginLeft: S.xs },
});
