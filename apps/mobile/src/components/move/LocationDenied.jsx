// Shown when location access is off. Moving needs GPS, so we say why, then
// give the exact steps to switch it back on.

import React from "react";
import { Linking, Platform, StyleSheet, Text, View } from "react-native";
import { MapPinOff, Settings } from "lucide-react-native";
import { Body, Button, C, F, FadeIn, R, S, Title } from "@/components/ui";

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
        <View style={styles.icon}>
          <MapPinOff size={24} color={C.textDim} />
        </View>
        <Title size={28} style={{ marginTop: S.xl }}>
          Switch on location
        </Title>
        <Body dim style={{ marginTop: S.sm }}>
          GPS maps your route and clocks your distance and pace. We only use it on this tab or while you're recording.
        </Body>
      </FadeIn>

      <FadeIn index={1} style={styles.steps}>
        {steps.map((step, i) => (
          <View key={step} style={styles.step}>
            <Text style={styles.num}>{i + 1}</Text>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </FadeIn>

      <FadeIn index={2} style={{ gap: S.sm, marginTop: 32 }}>
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
  icon: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  steps: { marginTop: S.xxl, backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, gap: S.lg },
  step: { flexDirection: "row", alignItems: "center", gap: S.lg },
  num: { width: 16, color: C.textMute, fontFamily: F.display, fontSize: 17 },
  stepText: { color: C.text, fontSize: 15, flex: 1 },
});
