// Shown when location access is off. Moving needs GPS, so we show what you
// get, then the exact steps to switch it back on.

import React from "react";
import { Linking, Platform, StyleSheet, Text, View } from "react-native";
import { MapPinOff, Settings } from "lucide-react-native";
import { Body, Button, C, Cover, F, FadeIn, R, S, Title } from "@/components/ui";

const stepsFor = (web, canAskAgain) =>
  web
    ? ["Tap the lock or site icon in your address bar", "Set Location to Allow", "Come back and hit Try again"]
    : canAskAgain
      ? ["Tap Allow location below", "Pick While using the app", "Hit Start and get moving"]
      : ["Open Settings for OutHere", "Tap Location, then While using the app", "Come back here, you're set"];

export default function LocationDenied({ onRetry, onHistory, canAskAgain }) {
  const web = Platform.OS === "web";
  const steps = stepsFor(web, canAskAgain);
  return (
    <View style={styles.wrap}>
      <FadeIn>
        <Cover seed="move-location" accent={C.accent} style={styles.art}>
          <View style={styles.badgeWrap}>
            <View style={styles.badgeHalo} />
            <View style={styles.badge}>
              <MapPinOff size={30} color={C.accentText} strokeWidth={2.4} />
            </View>
          </View>
        </Cover>
      </FadeIn>

      <FadeIn index={1}>
        <Title size={28} style={{ marginTop: S.xl }}>
          Switch on location
        </Title>
        <Body dim style={{ marginTop: S.sm }}>
          GPS maps your route and clocks your distance and pace. We only use it on this tab or while you're recording.
        </Body>
      </FadeIn>

      <FadeIn index={2} style={styles.steps}>
        {steps.map((step, i) => (
          <View key={step} style={styles.step}>
            <View style={styles.num}>
              <Text style={styles.numText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </FadeIn>

      <FadeIn index={3} style={{ gap: S.sm, marginTop: S.xl }}>
        {web ? (
          <Button title="Try again" size="lg" onPress={onRetry} full />
        ) : canAskAgain ? (
          <Button title="Allow location" size="lg" onPress={onRetry} full />
        ) : (
          <>
            <Button title="Open settings" size="lg" icon={Settings} onPress={() => Linking.openSettings()} full />
            <Button title="I've turned it on" variant="secondary" onPress={onRetry} full />
          </>
        )}
        {onHistory ? <Button title="See your past moves" variant="ghost" onPress={onHistory} full /> : null}
      </FadeIn>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", paddingHorizontal: S.gutter },
  art: { height: 168, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  badgeWrap: { width: 96, height: 96, alignItems: "center", justifyContent: "center" },
  badgeHalo: { position: "absolute", width: 96, height: 96, borderRadius: 48, backgroundColor: "rgba(0,255,127,0.18)", borderWidth: 1, borderColor: "rgba(0,255,127,0.4)" },
  badge: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", shadowColor: C.accent, shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: { width: 0, height: 0 } },
  steps: { marginTop: S.xl, backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: S.lg, gap: S.md },
  step: { flexDirection: "row", alignItems: "center", gap: S.md },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.borderStrong, alignItems: "center", justifyContent: "center" },
  numText: { color: C.text, fontFamily: F.display, fontSize: 14 },
  stepText: { color: C.text, fontSize: 15, flex: 1 },
});
