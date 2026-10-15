// The resting Move map: who's outside up top (the live count, how many are
// out near you), Plan a route and Saved, and the big button that starts the
// countdown. The button's words rotate like the original app.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AnimatePresence, MotiText } from "moti";
import { ArrowRight, Bike, Bookmark, Footprints, History, MapPin, PersonStanding, ShieldCheck } from "lucide-react-native";
import { C, F, PressableScale, R, S } from "@/components/ui";
import { formatNumber } from "@/utils/format";
import { hapticHeavy, hapticSelection } from "@/services/haptics";
import { Glass, RecChip, RoundGlass, TopBar } from "./parts";

const CTAS = ["GET OUT HERE", "TOUCH GRASS", "STEP OUT", "RUN IT UP", "LET'S GO"];
const KINDS = [
  { value: "run", label: "Run", icon: PersonStanding },
  { value: "walk", label: "Walk", icon: Footprints },
  { value: "ride", label: "Ride", icon: Bike },
];

export function IdleTop({ top, outside, sharing, onHistory, onSafety, onCrew }) {
  return (
    <>
      <TopBar
        top={top}
        left={<RoundGlass icon={History} label="Your runs" onPress={onHistory} />}
        centre={
          <RecChip onPress={onCrew} label="Who's out now">
            {outside ? `${formatNumber(outside.total)} OUTSIDE` : "OUTSIDE"}
          </RecChip>
        }
        right={<RoundGlass icon={ShieldCheck} label="Live sharing" onPress={onSafety} tone={sharing ? "accent" : undefined} />}
      />
      {outside ? (
        <Glass style={[styles.near, { top: top + 54 }]} radius={18}>
          <Text style={styles.nearKick}>Near you</Text>
          <Text style={styles.nearBig}>{formatNumber(outside.near)} out</Text>
          {outside.area ? <Text style={styles.nearKick}>in {outside.area}</Text> : null}
        </Glass>
      ) : null}
    </>
  );
}

export function IdleBottom({ bottom, activityType, onActivity, onPlan, onSaved, onStart }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % CTAS.length), 2600);
    return () => clearInterval(id);
  }, []);
  const kind = KINDS.find((k) => k.value === activityType) || KINDS[0];
  const KindIcon = kind.icon;
  const nextKind = () => {
    hapticSelection();
    const k = KINDS[(KINDS.indexOf(kind) + 1) % KINDS.length];
    onActivity(k.value);
  };

  return (
    <View style={[styles.bottom, { bottom }]} pointerEvents="box-none">
      <PressableScale onPress={nextKind} accessibilityLabel={`Activity: ${kind.label}. Tap to change`} style={styles.kind}>
        <KindIcon size={15} color={C.accentHi} />
        <Text style={styles.kindText}>{kind.label}</Text>
      </PressableScale>
      <View style={{ flexDirection: "row", gap: S.sm }}>
        <PressableScale onPress={onPlan} accessibilityLabel="Plan a route" style={{ flex: 1 }}>
          <Glass radius={R.full} style={styles.pill}>
            <MapPin size={17} color="#fff" />
            <Text style={styles.pillText}>Plan a route</Text>
          </Glass>
        </PressableScale>
        <PressableScale onPress={onSaved} accessibilityLabel="Saved routes" style={{ flex: 1 }}>
          <Glass radius={R.full} style={styles.pill}>
            <Bookmark size={17} color="#fff" />
            <Text style={styles.pillText}>Saved</Text>
          </Glass>
        </PressableScale>
      </View>
      <PressableScale
        haptic={false}
        onPress={() => {
          hapticHeavy();
          onStart();
        }}
        accessibilityLabel={`Start a ${kind.label.toLowerCase()}`}
        scaleTo={0.97}
        style={styles.cta}
      >
        <View style={styles.ctaWord}>
          <AnimatePresence exitBeforeEnter>
            <MotiText key={CTAS[i]} from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} exit={{ opacity: 0, translateY: -8 }} transition={{ type: "timing", duration: 220 }} style={styles.ctaText}>
              {CTAS[i]}
            </MotiText>
          </AnimatePresence>
        </View>
        <ArrowRight size={20} color="#fff" />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  near: { position: "absolute", right: S.lg, width: 160, paddingHorizontal: 14, paddingVertical: 12 },
  nearKick: { color: C.textSoft, fontFamily: F.body, fontSize: 12 },
  nearBig: { color: C.text, fontFamily: F.display, fontSize: 32, textTransform: "uppercase", marginVertical: 2 },
  bottom: { position: "absolute", left: S.lg, right: S.lg, gap: 10 },
  kind: { alignSelf: "flex-end", flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 12, borderRadius: R.full, backgroundColor: "rgba(18,22,30,0.82)" },
  kindText: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  pill: { height: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  pillText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 14.5 },
  cta: {
    height: 66,
    borderRadius: R.full,
    backgroundColor: C.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: C.accent,
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  ctaWord: { minWidth: 150, alignItems: "center" },
  ctaText: { color: "#fff", fontFamily: F.display, fontSize: 22, letterSpacing: 1.8 },
});
