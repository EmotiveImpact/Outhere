// The resting Move map: who's outside up top (the live count, how many are
// out near you), what's left of today's challenges, Plan a route and Saved,
// and the big button that starts the countdown. The button's words rotate
// like the original app.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AnimatePresence, MotiText } from "moti";
import Svg, { Circle } from "react-native-svg";
import { ArrowRight, Bike, Bookmark, Flame, Footprints, History, MapPin, PersonStanding, ShieldCheck } from "lucide-react-native";
import { C, F, PressableScale, R, S } from "@/components/ui";
import { useChallenges } from "@/data/hooks";
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

// Today's challenges, right before a run: how many are done and what's left
// of the daily one. Taps through to Outside, Challenges.
function ChallengeStrip({ onPress }) {
  const { data } = useChallenges();
  const live = (data || []).filter((c) => c.status !== "upcoming");
  if (!live.length) return null;
  const done = live.filter((c) => c.status === "complete" || c.status === "claimed" || c.percent >= 1).length;
  const today = live.find((c) => c.period === "day") || live[0];
  const left = Math.max(0, Math.round((today.target || 0) - (today.progress || 0)));
  const unit = today.metric === "distance" ? "km" : "steps";
  const goal = today.metric === "distance" ? `${today.target} km` : today.target % 1000 === 0 ? `${today.target / 1000}k` : formatNumber(today.target);
  const line = left > 0 ? `${formatNumber(left)} ${unit} to finish ${goal}` : `${today.title} done. Nice.`;
  const size = 44;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <PressableScale onPress={onPress} scaleTo={0.97} accessibilityLabel={`Today's challenges, ${done} of ${live.length} done. ${line}`}>
      <Glass radius={20} style={styles.chal}>
        <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} fill="none" />
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.accent} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, today.percent || 0)))} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
          </Svg>
          <Flame size={17} color={C.accentHi} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.chalKick}>
            Today's challenges · {done} of {live.length}
          </Text>
          <Text style={styles.chalLine} numberOfLines={1}>
            {line}
          </Text>
        </View>
        <Text style={styles.chalAll}>See all</Text>
      </Glass>
    </PressableScale>
  );
}

export function IdleBottom({ bottom, activityType, onActivity, onPlan, onSaved, onStart, onChallenges }) {
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
      {onChallenges ? <ChallengeStrip onPress={onChallenges} /> : null}
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
  chal: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingLeft: 10, paddingRight: 14 },
  chalKick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  chalLine: { color: C.text, fontFamily: F.bodySemi, fontSize: 14.5, marginTop: 2 },
  chalAll: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 13 },
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
