// Shown when location access is off. Moving needs GPS, so we explain why and
// point people at the right switch.

import React from "react";
import { Linking, Platform, StyleSheet, View } from "react-native";
import { MotiView } from "moti";
import { MapPinOff, Settings } from "lucide-react-native";
import { Body, Button, C, S, Title } from "@/components/ui";

export default function LocationDenied({ onRetry, canAskAgain }) {
  const web = Platform.OS === "web";
  return (
    <View style={styles.wrap}>
      <MotiView from={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={styles.icon}>
        <MapPinOff size={30} color={C.accent} />
      </MotiView>
      <Title size={26} style={{ textAlign: "center" }}>
        Location is off
      </Title>
      <Body dim style={{ textAlign: "center", marginTop: S.sm, maxWidth: 320 }}>
        OutHere needs your location to map your route and measure distance and pace. We only use it while you're on this tab or
        recording.
      </Body>
      <View style={{ gap: S.sm, marginTop: S.xxl, alignSelf: "stretch" }}>
        {web ? (
          <Button title="Try again" onPress={onRetry} full />
        ) : canAskAgain ? (
          <Button title="Allow location" onPress={onRetry} full />
        ) : (
          <>
            <Button title="Open settings" icon={Settings} onPress={() => Linking.openSettings()} full />
            <Button title="I've turned it on" variant="secondary" onPress={onRetry} full />
          </>
        )}
      </View>
      {web ? (
        <Body mute size={13} style={{ textAlign: "center", marginTop: S.lg }}>
          Allow location for this site in your browser settings, then try again.
        </Body>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: S.gutter * 1.5 },
  icon: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.accentDim, alignItems: "center", justifyContent: "center", marginBottom: S.xl },
});
