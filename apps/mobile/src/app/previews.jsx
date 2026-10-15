// Watch, widgets and lock screen: previews of the parts of Outhere that live
// outside the app, drawn from the prototype and filled with your own numbers
// (steps, streak, the battle, your club, the run going on Move). The real
// watch app, widgets and Live Activity need the iPhone build; see
// NATIVE_TARGETS.md.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Info } from "lucide-react-native";
import { C, F, FadeIn, R, S, Screen, SectionHeader, Skeleton } from "@/components/ui";
import { PlainHeadline, TopBar } from "@/components/account/parts";
import { usePreviewData } from "@/components/previews/data";
import { WatchFlow, WatchRunPage } from "@/components/previews/Watch";
import { HomeWidgets } from "@/components/previews/Widgets";
import { LockBattle, LockLive, LockRun } from "@/components/previews/Lock";

const Caption = ({ title, body }) => (
  <View style={styles.caption}>
    <Text style={styles.capTitle}>{title}</Text>
    <Text style={styles.capBody}>{body}</Text>
  </View>
);

export default function PreviewsScreen() {
  const d = usePreviewData();

  return (
    <Screen header={<TopBar title="" />} contentStyle={{ gap: S.md }}>
      <FadeIn index={0}>
        <PlainHeadline kicker="Settings" top="Watch, widgets" bottom="and lock screen" size={40} />
      </FadeIn>

      <FadeIn index={1}>
        <View style={styles.note}>
          <Info size={18} color={C.accentHi} style={{ marginTop: 1 }} />
          <Text style={styles.noteText}>
            These are previews. The real watch app, widgets and Live Activity come with the iPhone build.
          </Text>
        </View>
      </FadeIn>

      {!d.ready ? (
        <Skeleton height={520} radius={R.xl} />
      ) : (
        <>
          <FadeIn index={2}>
            <SectionHeader title="Apple Watch" style={styles.section} />
            <WatchFlow d={d} />
            <Text style={styles.hint}>Tap the watch to move through a run, or pick a screen.</Text>
            <Caption title="On the watch" body="Distance, pace and OUT on your wrist, so the phone can stay at home." />
            <WatchRunPage d={d} />
          </FadeIn>

          <FadeIn index={3}>
            <SectionHeader title="Widgets" style={styles.section} />
            <Caption title="Home screen widgets" body="Steps, streak, your battle, the crew goal and tonight's event without opening the app." />
            <HomeWidgets d={d} />
          </FadeIn>

          <FadeIn index={4}>
            <SectionHeader title="Lock screen" style={styles.section} />
            {!d.run ? <Text style={[styles.hint, { marginTop: 0, marginBottom: S.md }]}>Start a run on Move and the run screens here fill in live.</Text> : null}
            <Caption title="Lock screen" body="A Live Activity keeps the battle and your steps visible without opening the app." />
            <LockBattle d={d} />
            <Caption title="Live Activity" body="The run on your lock screen and in the Dynamic Island, with pause and finish." />
            <LockRun d={d} />
            <Caption title="Lock screen, mid run" body="Distance, time and pace, the blue dot in the Dynamic Island (red if you stop), and a nudge from your club." />
            <LockLive d={d} />
          </FadeIn>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: "row", gap: 10, padding: S.lg, borderRadius: R.lg, backgroundColor: C.accentDim, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(61,139,255,0.35)" },
  noteText: { flex: 1, color: C.textSoft, fontFamily: F.body, fontSize: 14, lineHeight: 20 },
  section: { marginTop: S.xl },
  hint: { color: C.textMute, fontFamily: F.body, fontSize: 12, textAlign: "center", marginTop: S.sm },
  caption: { marginTop: S.xl, marginBottom: S.md, gap: 3 },
  capTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  capBody: { color: C.textDim, fontFamily: F.body, fontSize: 13, lineHeight: 18 },
});
