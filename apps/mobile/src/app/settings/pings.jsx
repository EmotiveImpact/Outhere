// What pings you: challenges, rivals overtaking, your club and your streak are
// on. Drops and news are off until you want them. Quiet hours hold pings
// overnight, except Live sharing. The server reads the same choices
// (should_push) before it sends anything.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Clock, Flame, Newspaper, ShoppingBag, Swords, TrendingUp, Users } from "lucide-react-native";
import { useSettings, useUpdateSettings } from "@/data/hooks";
import { C, F, FadeIn, Logo, PressableScale, R, S, Screen, Skeleton } from "@/components/ui";
import { Group, MiniSegment, PlainHeadline, Row, Toggle, TopBar } from "@/components/account/parts";

const PINGS = [
  { key: "challenges", icon: Swords, title: "Someone challenges you", hint: "Friends, regulars and mystery", sample: ["Kemi challenged you", "5,000 steps by 9pm. 50 OUT on it."] },
  { key: "overtakes", icon: TrendingUp, title: "A rival overtakes you", hint: "Only in live battles", sample: ["Amara just passed you", "18,302 to your 18,240. 3 hours left."] },
  { key: "club", icon: Users, title: "Your club needs you", hint: "Fixtures, club runs, the derby", sample: ["Derby night", "Your club is 260 behind. 18 of 25 out."] },
  { key: "streak", icon: Flame, title: "Streak at risk", hint: "At 8pm if you haven't been out", sample: ["13 days and counting", "A short walk keeps your streak alive."] },
  { key: "drops", icon: ShoppingBag, title: "Drops go live", hint: "Black members get first pick", sample: ["Night Runner 01 is live", "Black members get first pick."] },
  { key: "news", icon: Newspaper, title: "News and events", hint: "Once a week at most", sample: ["This week outside", "Three events near you this weekend."] },
];

const hourLabel = (h) => (h === 0 ? "midnight" : h === 12 ? "noon" : h < 12 ? `${h}am` : `${h - 12}pm`);

export default function PingsScreen() {
  const { data: settings } = useSettings();
  const update = useUpdateSettings();
  const pings = settings?.pings;
  const quiet = settings?.quietHours;
  const sample = PINGS.find((p) => pings?.[p.key]);

  return (
    <Screen header={<TopBar title="" />} contentStyle={{ gap: S.md }}>
      <FadeIn index={0}>
        <PlainHeadline kicker="Settings · Notifications" top="What" bottom="pings you" size={40} />
      </FadeIn>

      {!settings ? (
        <Skeleton height={380} radius={R.lg} />
      ) : (
        <>
          <FadeIn index={1}>
            <View style={styles.preview}>
              <View style={styles.logo}>
                <Logo size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pTitle} numberOfLines={1}>
                  {sample ? sample.sample[0] : "Nothing will ping you"}
                </Text>
                <Text style={styles.pBody} numberOfLines={1}>
                  {sample ? sample.sample[1] : "Your inbox still keeps everything."}
                </Text>
              </View>
              <Text style={styles.pTime}>now</Text>
            </View>
          </FadeIn>

          <FadeIn index={2}>
            <Group>
              {PINGS.map((p) => (
                <Row
                  key={p.key}
                  icon={p.icon}
                  title={p.title}
                  hint={p.hint}
                  right={<Toggle value={pings[p.key]} onChange={(v) => update.mutate({ pings: { [p.key]: v } })} label={p.title} />}
                />
              ))}
            </Group>
          </FadeIn>

          <FadeIn index={3}>
            <View style={styles.quiet}>
              <PressableScale onPress={() => update.mutate({ quietHours: { on: !quiet.on } })} scaleTo={0.98} style={styles.quietHead} accessibilityRole="switch" accessibilityState={{ checked: quiet.on }}>
                <Clock size={19} color={C.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.qTitle}>Quiet hours</Text>
                  <Text style={styles.qSub}>
                    {hourLabel(quiet.from)} to {hourLabel(quiet.to)}, except Live sharing
                  </Text>
                </View>
                <Text style={[styles.qOn, !quiet.on && { color: C.textDim }]}>{quiet.on ? "On" : "Off"}</Text>
              </PressableScale>
              {quiet.on ? (
                <View style={styles.quietTimes}>
                  <View style={styles.qRow}>
                    <Text style={styles.qLabel}>From</Text>
                    <MiniSegment options={[21, 22, 23].map((h) => ({ value: h, label: hourLabel(h) }))} value={quiet.from} onChange={(from) => update.mutate({ quietHours: { from } })} />
                  </View>
                  <View style={styles.qRow}>
                    <Text style={styles.qLabel}>Until</Text>
                    <MiniSegment options={[6, 7, 8].map((h) => ({ value: h, label: hourLabel(h) }))} value={quiet.to} onChange={(to) => update.mutate({ quietHours: { to } })} />
                  </View>
                </View>
              ) : null}
            </View>
          </FadeIn>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: R.lg, backgroundColor: "#1a1d23", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  logo: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  pTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14 },
  pBody: { color: C.textSoft, fontFamily: F.body, fontSize: 13, marginTop: 2 },
  pTime: { color: C.textDim, fontFamily: F.body, fontSize: 11, alignSelf: "flex-start" },
  quiet: { borderRadius: R.lg, backgroundColor: "#0f1726", borderWidth: 1, borderColor: "rgba(61,139,255,0.35)", overflow: "hidden" },
  quietHead: { flexDirection: "row", alignItems: "center", gap: 14, padding: S.lg },
  qTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  qSub: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  qOn: { color: C.accent, fontFamily: F.bodySemi, fontSize: 14 },
  quietTimes: { paddingHorizontal: S.lg, paddingBottom: S.lg, gap: 10 },
  qRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  qLabel: { color: C.textSoft, fontFamily: F.body, fontSize: 13 },
});
