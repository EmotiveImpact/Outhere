// Streak at risk: how many steps today still needs, and the two ways to keep
// it: walk it off, or spend a streak freeze (Pro 1 a month, Black 3).
// Freezes are counted and enforced by the engine or the database.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Route, ShieldCheck } from "lucide-react-native";
import { engine, useEngineMutation, useStreakStatus } from "@/data/hooks";
import { AnimatedBar, Body, Button, C, Card, F, FadeIn, R, Row, S, Screen, Skeleton } from "@/components/ui";
import { Slab } from "@/components/profile/parts";
import { PHOTOS } from "@/constants/photos";
import { PLANS } from "@/constants/plans";
import { formatNumber } from "@/utils/format";

export default function StreakRisk() {
  const router = useRouter();
  const { data: s, isPending, refetch, isRefetching } = useStreakStatus();
  const freeze = useEngineMutation(engine.spendStreakFreeze, { success: "Freeze on. Today's safe" });

  if (isPending || !s) {
    return (
      <Screen>
        <Skeleton height={236} radius={R.lg} style={{ marginTop: S.lg }} />
      </Screen>
    );
  }

  const hours = s.hoursLeft;
  const kicker = s.streak ? `${s.streak} day streak · ${s.safe ? "safe today" : `${hours} hour${hours === 1 ? "" : "s"} left`}` : "Start a streak";
  const free = s.tier === "free";
  const f = s.freezes;
  const walk = () => router.push("/(tabs)/move");

  const [top, bottom] = s.frozenToday ? ["Frozen", "for today"] : s.active ? ["Today's", "done"] : s.streak ? ["Don't let", "it go out"] : ["Start", "a streak"];

  return (
    <Screen padded={false} style={{ paddingTop: 0 }} onRefresh={refetch} refreshing={isRefetching}>
      <Slab object={PHOTOS.flame} kicker={kicker} top={top} bottom={bottom} height={236} />
      <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg, gap: S.md }}>
        <FadeIn>
          <Card padding={S.lg}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={styles.title}>
                {formatNumber(Math.min(s.todaySteps, s.target))} of {formatNumber(s.target)} steps
              </Text>
              <Text style={styles.dim}>{s.stepsLeft ? `${formatNumber(s.stepsLeft)} to go` : "Done"}</Text>
            </Row>
            <AnimatedBar value={Math.min(1, s.todaySteps / s.target)} height={8} colour={C.accent} track={C.surfaceHigh} style={{ marginTop: S.md }} />
            <Text style={[styles.dim, { marginTop: S.sm }]}>
              {s.active ? "Your streak is safe for today." : s.frozenToday ? "A freeze is keeping today safe." : `About ${s.minutesToGo} minutes of walking`}
            </Text>
          </Card>
        </FadeIn>

        <FadeIn index={1}>
          <Card padding={S.md}>
            <Row gap={S.md}>
              <Image source={PHOTOS.shield} style={styles.art} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{free ? "Streak freezes" : "Use a streak freeze"}</Text>
                <Text style={styles.dim}>
                  {free
                    ? `Keep a day safe without the steps. Pro gets ${PLANS.pro.freezesPerMonth} a month, Black ${PLANS.black.freezesPerMonth}.`
                    : `Keeps today safe. You have ${f.left} left this month.`}
                </Text>
              </View>
              {!free ? (
                <Row gap={4}>
                  {Array.from({ length: f.allowance }).map((_, i) => (
                    <View key={i} style={[styles.dot, i < f.left && styles.dotOn]} />
                  ))}
                </Row>
              ) : null}
            </Row>
          </Card>
        </FadeIn>

        {s.safe ? (
          <Button title="Back to today" variant="secondary" size="lg" full onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))} />
        ) : (
          <Row gap={S.sm}>
            <View style={{ flex: 1 }}>
              {free ? (
                <Button title="Get freezes" variant="secondary" size="lg" full onPress={() => router.push("/membership")} />
              ) : (
                <Button
                  title="Use a freeze"
                  icon={ShieldCheck}
                  variant="secondary"
                  size="lg"
                  full
                  disabled={!f.left || !s.streak}
                  loading={freeze.isPending}
                  onPress={() => freeze.mutate([])}
                />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Go for a walk" icon={Route} size="lg" full onPress={walk} />
            </View>
          </Row>
        )}
        {!free && !f.left && !s.safe ? <Body dim size={12.5}>No freezes left this month. They come back on the 1st.</Body> : null}
        <Body mute size={12} style={{ marginTop: S.xs }}>
          A day counts once you walk {formatNumber(s.target)} steps or check in. Your best is {s.best} days.
        </Body>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  dim: { color: C.textDim, fontFamily: F.body, fontSize: 12.5, marginTop: 2 },
  art: { width: 64, height: 64, borderRadius: R.sm, backgroundColor: "#0b0e13" },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.surfaceHigh },
  dotOn: { backgroundColor: C.accent },
});
