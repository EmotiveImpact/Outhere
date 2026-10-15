// Checked in: the token, tonight's turnout against last week, what you earned
// and your club streak.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import {
  AnimatedBar,
  AnimatedNumber,
  Body,
  Button,
  C,
  Card,
  F,
  IconButton,
  R,
  Row,
  S,
  Screen,
  Skeleton,
} from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { useClubRun } from "@/data/hooks";
import { Chip, Faces, clock } from "@/components/clubs/parts";

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
  const facesLine =
    names.length && others >= names.length
      ? `${names.join(", ")} and ${others - names.length} others are here`
      : `${here} here`;

  return (
    <Screen padded={false} style={{ paddingTop: 0 }}>
      <View style={[styles.slab, { paddingTop: insets.top }]}>
        <Image
          source={PHOTOS.token}
          style={[styles.token, { marginTop: insets.top + S.lg }]}
          contentFit="contain"
        />
        <Row style={[styles.top, { top: insets.top + S.sm }]}>
          <IconButton
            icon={X}
            onPress={() => router.dismissTo(`/clubs/run/${id}`)}
            label="Close"
          />
        </Row>
        <View style={styles.hl}>
          <Text style={styles.kick}>
            {run.place?.split(",")[0]} · {clock(run.checkedInAt || Date.now())}
          </Text>
          <Text style={styles.big}>You're</Text>
          <Text style={[styles.big, { color: C.accent }]}>checked in</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: S.gutter, gap: S.md, marginTop: S.lg }}>
        <Card padding={S.lg}>
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={styles.cardTitle}>Tonight's turnout</Text>
            <Chip label="Live" tone="live" />
          </Row>
          <Row gap={S.sm} style={{ alignItems: "flex-end", marginTop: S.sm }}>
            <AnimatedNumber value={here} style={styles.turnout} />
            <Body dim size={13} style={{ marginBottom: 8 }}>
              here now · {run.lastTurnout} last{" "}
              {new Date(run.startAt).toLocaleDateString("en-GB", {
                weekday: "long",
              })}
            </Body>
          </Row>
          <AnimatedBar
            value={share}
            height={6}
            colour={C.accent}
            track={C.surfaceHigh}
            style={{ marginTop: S.sm }}
          />
          {run.fixture ? (
            <Body dim size={13} style={{ marginTop: S.md }}>
              Every check-in lifts {run.club?.short}'s run turnout for this
              week's {run.fixture.isDerby ? "derby" : "fixture"} against{" "}
              {run.fixture.opponent?.name}.
            </Body>
          ) : null}
        </Card>

        <View style={styles.earn}>
          <View style={styles.earnCell}>
            <Text style={styles.earnBig}>+1</Text>
            <Body dim size={12}>
              Run turnout
            </Body>
          </View>
          {run.rewardXp ? (
            <View style={styles.earnCell}>
              <Text style={styles.earnBig}>+{run.rewardXp}</Text>
              <Body dim size={12}>
                XP
              </Body>
            </View>
          ) : null}
          <View style={styles.earnCell}>
            <Text style={styles.earnBig}>{run.streak || 1} wk</Text>
            <Body dim size={12}>
              Club streak
            </Body>
          </View>
        </View>

        <Faces people={run.faces} label={facesLine} />
        <Button
          title="Back to the run"
          variant="secondary"
          full
          size="lg"
          onPress={() => router.dismissTo(`/clubs/run/${id}`)}
          style={{ marginTop: S.lg }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // The token art sits on pure black, so the slab is pure black too.
  slab: {
    overflow: "hidden",
    backgroundColor: "#000",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  token: { width: 190, height: 190, alignSelf: "center" },
  top: { position: "absolute", left: S.gutter, right: S.gutter },
  hl: { padding: S.gutter },
  kick: {
    color: C.accentHi,
    fontFamily: F.bodySemi,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  big: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 46,
    lineHeight: 46,
    textTransform: "uppercase",
  },
  cardTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  turnout: {
    color: C.text,
    fontFamily: F.display,
    fontSize: 52,
    lineHeight: 56,
  },
  earn: {
    flexDirection: "row",
    borderRadius: R.lg,
    backgroundColor: C.surface,
    paddingVertical: S.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  earnCell: { flex: 1, alignItems: "center", gap: 2 },
  earnBig: { color: C.accentHi, fontFamily: F.display, fontSize: 28 },
});
