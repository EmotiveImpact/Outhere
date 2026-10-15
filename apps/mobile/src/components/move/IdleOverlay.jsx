// The resting Move map: who's outside up top (the live count, how many are
// out near you), what's left of today's challenges, Plan a route and Saved,
// and the big button that starts the countdown. The button's words rotate
// like the original app.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { ArrowRight, Bike, Bookmark, Flame, Footprints, History, MapPin, PersonStanding, ShieldCheck } from "lucide-react-native";
import { C, F, GlowButton, PressableScale, R, S } from "@/components/ui";
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
        <Glass style={[styles.near, { top: top + 54 }]} radius={24}>
          <Text style={styles.nearKick}>Near you</Text>
          <Text style={styles.nearBig}>{formatNumber(outside.near)} out</Text>
          {outside.area ? <Text style={[styles.nearKick, { marginTop: 2 }]}>in {outside.area}</Text> : null}
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
            <View>
              <MapPin size={16} color="#fff" />
            </View>
            <Text style={styles.pillText}>Plan a route</Text>
          </Glass>
        </PressableScale>
        <PressableScale onPress={onSaved} accessibilityLabel="Saved routes" style={{ flex: 1 }}>
          <Glass radius={R.full} style={styles.pill}>
            <View>
              <Bookmark size={16} color="#fff" />
            </View>
            <Text style={styles.pillText}>Saved</Text>
          </Glass>
        </PressableScale>
      </View>
      {/* .btn.pri at 58: the lit blue that acts, its word rotating */}
      <GlowButton
        title={CTAS[i]}
        iconRight={ArrowRight}
        haptic={false}
        onPress={() => {
          hapticHeavy();
          onStart();
        }}
        accessibilityLabel={`Start a ${kind.label.toLowerCase()}`}
        size="lg"
        full
        textStyle={styles.ctaText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // .fl.gl.panel at 76, 150 wide
  near: { position: "absolute", right: 14, width: 150, paddingHorizontal: 14, paddingVertical: 12 },
  nearKick: { color: "#a3adbd", fontFamily: F.body, fontSize: 10.5 },
  nearBig: { color: C.text, fontFamily: F.display, fontSize: 26, lineHeight: 26, textTransform: "uppercase", marginTop: 4 },
  bottom: { position: "absolute", left: 14, right: 14, gap: 10 },
  kind: { alignSelf: "flex-end", flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 12, borderRadius: R.full, backgroundColor: "rgba(10,14,20,0.64)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.1)" },
  kindText: { color: C.text, fontFamily: F.bodySemi, fontSize: 12.5 },
  chal: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9, paddingLeft: 10, paddingRight: 14 },
  chalKick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 9.5, letterSpacing: 0.8, textTransform: "uppercase" },
  chalLine: { color: C.text, fontFamily: F.bodySemi, fontSize: 13, marginTop: 3 },
  chalAll: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 12 },
  // the glass pills, 44 high
  pill: { height: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  pillText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 12.5 },
  ctaText: { fontFamily: F.display, fontSize: 16, letterSpacing: 1 },
});
