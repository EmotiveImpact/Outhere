// Step source: Apple Health, Health Connect, Garmin or Strava. On a phone the
// steps come through the motion sensor, which reads the same counts Apple
// Health and Health Connect keep. Garmin and Strava aren't connected yet, so
// tapping them records that you asked and we tell you when they're ready.

import React, { useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { Pedometer } from "expo-sensors";
import { Lock } from "lucide-react-native";
import { useSettings, useUpdateSettings } from "@/data/hooks";
import { C, F, FadeIn, PressableScale, R, Skeleton, toast } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { HeroPage, Note } from "@/components/account/parts";

const SOURCES = [
  { id: "apple_health", name: "Apple Health", short: "AH", hint: "iPhone and Apple Watch steps, runs and walks", os: "ios" },
  { id: "health_connect", name: "Health Connect", short: "HC", hint: "For Android phones and Wear OS", os: "android" },
  { id: "garmin", name: "Garmin", short: "G", hint: "Sync runs from your watch", soon: true },
  { id: "strava", name: "Strava", short: "S", hint: "Bring in runs you've already logged", soon: true },
];

// Asks for motion access, the way the phone counts steps. The web has no
// step counter, so the choice just saves there.
async function allowSteps() {
  if (Platform.OS === "web") return true;
  try {
    if (!(await Pedometer.isAvailableAsync())) return false;
    const res = await Pedometer.requestPermissionsAsync();
    return !!res?.granted;
  } catch {
    return false;
  }
}

export default function HealthScreen() {
  const { data: settings } = useSettings();
  const update = useUpdateSettings();
  const [busy, setBusy] = useState(null);
  const current = settings?.stepSource || "phone";
  const asked = settings?.sourceRequests || {};

  const connect = async (src) => {
    if (src.soon) {
      if (asked[src.id]) return toast.success(`You're on the list for ${src.name}`);
      update.mutate({ sourceRequests: { [src.id]: Date.now() } });
      return toast.success(`${src.name} is coming soon. We'll tell you when it's ready.`);
    }
    if (current === src.id) {
      update.mutate({ stepSource: "phone" });
      return toast.success("Back to counting on this phone");
    }
    if (src.os && Platform.OS !== "web" && Platform.OS !== src.os) {
      return toast.error(src.os === "ios" ? "Apple Health is on iPhone" : "Health Connect is on Android phones");
    }
    setBusy(src.id);
    const ok = await allowSteps();
    setBusy(null);
    if (!ok) return toast.error("Allow Motion and Fitness in your phone's settings, then try again");
    update.mutate({ stepSource: src.id });
    toast.success(`${src.name} connected`);
  };

  return (
    <HeroPage kicker="Step source" top="Where do your" bottom="steps come from?" height={236} object={PHOTOS.watch}>
      {!settings ? (
        <Skeleton height={320} radius={R.lg} />
      ) : (
        <>
          {SOURCES.map((src, i) => {
            const on = current === src.id;
            const label = on ? "Connected" : src.soon && asked[src.id] ? "Asked" : "Connect";
            return (
              <FadeIn key={src.id} index={i}>
                <PressableScale onPress={() => connect(src)} scaleTo={0.98} style={[styles.row, on && styles.rowOn]} accessibilityLabel={`${src.name}, ${label}`}>
                  <View style={[styles.icon, on && styles.iconOn]}>
                    <Text style={[styles.iconText, on && { color: "#fff" }]}>{src.short}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{src.name}</Text>
                    <Text style={styles.hint}>{src.soon && asked[src.id] ? "Coming soon. We'll tell you." : src.hint}</Text>
                  </View>
                  {busy === src.id ? (
                    <ActivityIndicator size="small" color={C.accent} />
                  ) : on ? (
                    <Text style={styles.connected}>Connected</Text>
                  ) : (
                    <View style={styles.btn}>
                      <Text style={styles.btnText}>{label}</Text>
                    </View>
                  )}
                </PressableScale>
              </FadeIn>
            );
          })}
          <Note icon={Lock}>We only read steps, distance and workouts. We never write to your health data.</Note>
          {current === "phone" ? <Note>Right now this phone's motion sensor counts your steps.</Note> : null}
        </>
      )}
    </HeroPage>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: 1, borderColor: "transparent" },
  rowOn: { backgroundColor: "#0f1726", borderColor: C.accent },
  icon: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
  iconOn: { backgroundColor: C.accent },
  iconText: { color: C.textSoft, fontFamily: F.bodySemi, fontSize: 13 },
  name: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  hint: { color: C.textDim, fontFamily: F.body, fontSize: 12, lineHeight: 16, marginTop: 2 },
  connected: { color: C.accent, fontFamily: F.bodySemi, fontSize: 13 },
  btn: { height: 32, paddingHorizontal: 14, borderRadius: R.full, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
  btnText: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
});
