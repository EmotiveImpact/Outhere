// Checked in (clubCheckin): the token floating in the slab's blue light,
// tonight's turnout against last week, what you earned, your club streak and
// the faces of who's here.

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { AnimatedNumber, Button, C, F, Meter, Row, S, Screen, Skeleton, Surface } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { useClubRun } from "@/data/hooks";
import { Chip, Faces, GlassRound, ObjectSlab, clock } from "@/components/clubs/parts";

export default function CheckedIn() {
  const { runId } = useLocalSearchParams();
  const id = String(runId || "");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: run } = useClubRun(id);

  if (!run) {
    return (
      <Screen>
        <Skeleton height={300} radius={26} style={{ marginTop: S.lg }} />
      </Screen>
    );
  }

  const here = Math.max(run.here, run.checkedIn ? 1 : 0);
  const share = run.going ? Math.min(1, here / run.going) : 0;
  const others = Math.max(0, here - 1);
  const names = (run.faces || []).slice(0, 2).map((p) => p.name);
  const facesLine = names.length && others >= names.length ? `${names.join(", ")} and ${others - names.length} others are here` : `${here} here`;
  const back = () => router.dismissTo(`/clubs/run/${id}`);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        <ObjectSlab
          height={318}
          object={PHOTOS.token}
          objectSize={236}
          objectTop={24}
          left={<GlassRound icon={ChevronLeft} label="Back to the run" onPress={back} />}
          kicker={`${run.place?.split(",")[0]} · ${clock(run.checkedInAt || Date.now())}`}
          top="You're"
          bottom="checked in"
        />

        <View style={{ paddingHorizontal: 18, gap: 12, marginTop: 18 }}>
          {/* .r11turn */}
          <Surface radius={22} padding={16}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={styles.cardTitle}>Tonight's turnout</Text>
              <Chip label="Live" tone="live" />
            </Row>
            <Row gap={8} style={{ alignItems: "flex-end", marginTop: 10, marginBottom: 12 }}>
              <AnimatedNumber value={here} style={styles.turnout} />
              <Text style={styles.small}>
                here now · {run.lastTurnout} last {new Date(run.startAt).toLocaleDateString("en-GB", { weekday: "long" })}
              </Text>
            </Row>
            <Meter value={share} size={10} cap />
            {run.fixture ? (
              <Text style={[styles.small, { marginTop: 12, lineHeight: 17 }]}>
                Every check-in lifts {run.club?.short}'s run turnout for this week's {run.fixture.isDerby ? "derby" : "fixture"} against {run.fixture.opponent?.name}.
              </Text>
            ) : null}
          </Surface>

          {/* .r11earn */}
          <Surface radius={22} padding={null} contentStyle={styles.earn}>
            <View style={styles.earnCell}>
              <Text style={styles.earnBig}>+1</Text>
              <Text style={styles.earnSmall}>Run turnout</Text>
            </View>
            {run.rewardXp ? (
              <View style={[styles.earnCell, styles.earnLine]}>
                <Text style={styles.earnBig}>+{run.rewardXp}</Text>
                <Text style={styles.earnSmall}>XP</Text>
              </View>
            ) : null}
            <View style={[styles.earnCell, styles.earnLine]}>
              <Text style={styles.earnBig}>{run.streak || 1} wk</Text>
              <Text style={styles.earnSmall}>Club streak</Text>
            </View>
          </Surface>

          <Faces people={run.faces} label={facesLine} size={38} ring={C.bg} style={{ marginTop: 4 }} />
          <Button title="Back to the run" variant="secondary" full size="lg" onPress={back} style={{ marginTop: S.lg }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cardTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 14.5 },
  turnout: { color: C.text, fontFamily: F.display, fontSize: 46, lineHeight: 44 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginBottom: 4, flexShrink: 1 },
  earn: { flexDirection: "row", paddingVertical: 13, paddingHorizontal: 6 },
  earnCell: { flex: 1, alignItems: "center", gap: 2 },
  earnLine: { borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.07)" },
  earnBig: { color: "#82b4ff", fontFamily: F.display, fontSize: 24, textShadowColor: "rgba(61,139,255,0.45)", textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } },
  earnSmall: { color: C.textDim, fontFamily: F.body, fontSize: 11 },
});
