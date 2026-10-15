// Mystery challengers, your call: switch them off, choose how far away, the
// level gap, how many a day and quiet hours. Under 18s never get them (the
// server checks is_minor and refuses to switch them on).

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, ChevronsRight, Clock3, Crosshair, TrendingUp } from "lucide-react-native";
import { engine, useEngineMutation, useMysterySettings, usePlaySide } from "@/data/hooks";
import { C, F, GlowButton, PressableScale, R, Row, S, Skeleton, Surface } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { BottomBar, GlowHero, Toggle, TopBar } from "@/components/arena/OutsideKit";

const QUIET = [
  [22, 7],
  [21, 8],
  [23, 6],
  [0, 0],
];
const hourLabel = (h) => (h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`);
const quietLabel = (a, b) => (a === b ? "Off" : `${hourLabel(a)}–${hourLabel(b)}`);

function Pills({ options, value, onChange, disabled }) {
  return (
    <Row gap={2} style={styles.pills}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <PressableScale key={String(o.value)} disabled={disabled} onPress={() => onChange(o.value)} scaleTo={0.94} style={[styles.pillOpt, on && styles.pillOn]}>
            <Text style={[styles.pillText, on && { color: "#fff" }]}>{o.label}</Text>
          </PressableScale>
        );
      })}
    </Row>
  );
}

function Line({ icon: Icon, title, sub, right, first }) {
  return (
    <Row gap={S.md} style={[styles.line, !first && styles.lineTop]}>
      <Icon size={18} color={C.textDim} />
      <View style={{ flex: 1 }}>
        <Text style={styles.lineTitle}>{title}</Text>
        <Text style={styles.small}>{sub}</Text>
      </View>
      {right}
    </Row>
  );
}

export default function MysterySettings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: set, isPending } = useMysterySettings();
  const city = usePlaySide().data?.cityName || "My city";
  const save = useEngineMutation(engine.setMysterySettings);
  const find = useEngineMutation(engine.findMysteryChallenger, { onSuccess: (id) => router.push(`/swipe/challenger?offer=${id}`) });

  if (isPending || !set) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 70, padding: S.gutter, gap: S.md }}>
        <Skeleton height={80} radius={R.lg} />
        <Skeleton height={240} radius={R.lg} />
        <TopBar />
      </View>
    );
  }

  const off = !set.enabled;
  const nextQuiet = () => {
    const i = QUIET.findIndex(([a, b]) => a === set.quietStart && b === set.quietEnd);
    const [a, b] = QUIET[(i + 1) % QUIET.length];
    save.mutate({ quietStart: a, quietEnd: b });
  };
  const nextGap = () => save.mutate({ levelGap: set.levelGap >= 5 ? 1 : set.levelGap + 1 });
  const scopeSub = { area: "People in your area only", city: `Anyone in ${city}`, uk: "Anyone in the UK" }[set.scope];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 + insets.bottom }}>
        <GlowHero height={236} photo={PHOTOS.challenger} kicker="Settings · Battles" top="Mystery" bottom="challengers" />
        <View style={{ paddingHorizontal: S.gutter, gap: S.md, marginTop: S.lg }}>
          <Surface tone={set.enabled ? "blue" : "lit"} padding={S.lg}>
            <Row gap={S.md}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineTitle}>Let strangers challenge me</Text>
                <Text style={styles.small}>{set.minor ? "Mystery challengers are for over 18s." : "A random rival near your level. Nobody sees who until you both accept."}</Text>
              </View>
              <Toggle value={set.enabled} disabled={set.minor} onChange={(v) => save.mutate({ enabled: v })} label="Let strangers challenge me" />
            </Row>
          </Surface>
          <View style={off && { opacity: 0.5 }} pointerEvents={off ? "none" : "auto"}>
          <Surface padding={null} contentStyle={{ paddingHorizontal: S.lg, paddingVertical: 4 }}>
            <Line
              first
              icon={Crosshair}
              title="Match me with"
              sub={scopeSub}
              right={<Pills options={[{ value: "area", label: "Area" }, { value: "city", label: city }, { value: "uk", label: "UK" }]} value={set.scope} onChange={(v) => save.mutate({ scope: v })} />}
            />
            <Line
              icon={TrendingUp}
              title="Level gap"
              sub={`Within ${set.levelGap} level${set.levelGap === 1 ? "" : "s"} of you`}
              right={
                <PressableScale onPress={nextGap} scaleTo={0.94} style={styles.cycle} accessibilityLabel="Change level gap">
                  <Text style={styles.cycleText}>±{set.levelGap}</Text>
                  <ChevronsRight size={14} color={C.textDim} />
                </PressableScale>
              }
            />
            <Line icon={Bell} title="At most" sub="Challengers a day" right={<Pills options={[1, 3, 5].map((v) => ({ value: v, label: String(v) }))} value={set.perDay} onChange={(v) => save.mutate({ perDay: v })} />} />
            <Line
              icon={Clock3}
              title="Quiet hours"
              sub={set.quietStart === set.quietEnd ? "Challengers any time" : "No challengers overnight"}
              right={
                <PressableScale onPress={nextQuiet} scaleTo={0.94} style={styles.cycle} accessibilityLabel="Change quiet hours">
                  <Text style={styles.cycleText}>{quietLabel(set.quietStart, set.quietEnd)}</Text>
                  <ChevronsRight size={14} color={C.textDim} />
                </PressableScale>
              }
            />
          </Surface>
          </View>
          <Text style={styles.small}>Under 18s never get mystery challengers. Decline as often as you like, it never counts against you.</Text>
        </View>
      </ScrollView>
      {set.enabled ? (
        <BottomBar>
          <GlowButton title="Find a challenger now" size="lg" full loading={find.isPending} onPress={() => find.mutate()} />
        </BottomBar>
      ) : null}
      <TopBar />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: S.lg, paddingVertical: S.lg, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.1)" },
  cardOn: { backgroundColor: "rgba(61,139,255,0.1)", borderColor: "rgba(61,139,255,0.4)" },
  line: { paddingVertical: 14 },
  lineTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  lineTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  pills: { padding: 3, borderRadius: R.full, backgroundColor: "rgba(0,0,0,0.35)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.05)" },
  pillOpt: { height: 30, minWidth: 30, paddingHorizontal: 10, borderRadius: R.full, alignItems: "center", justifyContent: "center" },
  pillOn: { backgroundColor: C.accent, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 16px -6px rgba(42,106,240,0.9)" },
  pillText: { color: C.textSoft, fontFamily: F.bodySemi, fontSize: 12 },
  cycle: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6 },
  cycleText: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
});
