// Step 3 of 4: verified. A clear pass before any credits are spent. The
// verified tick stays on the member, so a re-roll or a new season's poses
// skip the scan.

import React from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { Check } from "lucide-react-native";
import { engine, useEngineMutation, usePackCredits, useProfile } from "@/data/hooks";
import { PACK_COST } from "@/constants/pack";
import { fighterPhoto } from "@/utils/fighter";
import { ACT, Checks, LockLine, OUT, PHONE, PackButton, PackScreen, PackTitle, Spacer, Sub } from "@/components/pack/PackKit";

export default function PackVerified() {
  const router = useRouter();
  const { shot } = useLocalSearchParams();
  const { data: profile } = useProfile();
  const { data: credits } = usePackCredits();
  const start = useEngineMutation(engine.startPack, { onSuccess: () => router.replace("/pack/making") });
  const face = shot ? { uri: Array.isArray(shot) ? shot[0] : shot } : fighterPhoto(profile, "profile").source;
  const balance = credits?.balance ?? 0;
  const short = credits && balance < PACK_COST;
  return (
    <PackScreen step={3} stepLabel="Verified">
      <Spacer />
      {/* .verified: the scan, greyed down in a lit oval, with the blue tick */}
      <View style={styles.verified}>
        <View style={styles.oval}>
          <Image source={face} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ top: "22%", left: "50%" }} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(4,7,13,0.32)" }]} />
        </View>
        <View style={styles.tick}>
          <Check size={22} color="#fff" strokeWidth={3} />
        </View>
      </View>
      <PackTitle top="You're" em="verified" size={34} center />
      <Checks center items={[{ label: "Real person, live on camera", state: "ok" }, { label: "Three angles captured", state: "ok" }, { label: "Over 18 confirmed", state: "ok" }]} />
      <Spacer />
      {short ? <Sub center>You have {balance} credits. A pack takes {PACK_COST}; more arrive on the 1st.</Sub> : null}
      <PackButton title={`Make my pack · ${PACK_COST} credits`} disabled={!credits || short} loading={start.isPending} onPress={() => start.mutate()} />
      <LockLine>Selfies deleted within 24 hours</LockLine>
    </PackScreen>
  );
}

const styles = StyleSheet.create({
  verified: { width: 150, height: 190, alignSelf: "center", marginBottom: 6 },
  oval: { width: 150, height: 190, borderRadius: 95, overflow: "hidden", borderWidth: 3, borderColor: OUT, boxShadow: "0 0 30px rgba(79,155,255,0.55)" },
  tick: { position: "absolute", right: 2, bottom: 14, width: 44, height: 44, borderRadius: 22, backgroundColor: ACT, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: PHONE, boxShadow: "0 0 18px rgba(79,155,255,0.8)" },
});
