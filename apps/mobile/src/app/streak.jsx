// Streak at risk: how many steps today still needs, and the two ways to keep
// it: walk it off, or spend a streak freeze (Pro 1 a month, Black 3).
// Freezes are counted and enforced by the engine or the database.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Route } from "lucide-react-native";
import { engine, useEngineMutation, useStreakStatus } from "@/data/hooks";
import { BlendImage, Body, C, F, FadeIn, GlowButton, Meter, Row, Screen, Skeleton, Surface } from "@/components/ui";
import { HeroPage } from "@/components/account/parts";
import { PHOTOS } from "@/constants/photos";
import { PLANS } from "@/constants/plans";
import { formatNumber } from "@/utils/format";

// .kick on the streak screen: amber while the day is still at risk.
const AMBER = "#ffb35c";

export default function StreakRisk() {
  const router = useRouter();
  const { data: s, isPending, refetch, isRefetching } = useStreakStatus();
  const freeze = useEngineMutation(engine.spendStreakFreeze, { success: "Freeze on. Today's safe" });

  if (isPending || !s) {
    return (
      <Screen>
        <Skeleton height={236} radius={20} style={{ marginTop: 16 }} />
      </Screen>
    );
  }

  const hours = s.hoursLeft;
  const kicker = s.streak ? `${s.streak} day streak · ${s.safe ? "safe today" : `${hours} hour${hours === 1 ? "" : "s"} left`}` : "Your streak";
  const free = s.tier === "free";
  const f = s.freezes;
  const walk = () => router.push("/(tabs)/move");
  // The flame goes grey while the day is at risk, and lights blue once it's safe.
  const atRisk = !s.safe && !!s.streak;

  const [top, bottom] = s.frozenToday ? ["Frozen", "for today"] : s.active ? ["Today's", "done"] : s.streak ? ["Don't let", "it go out"] : ["Start", "a streak"];

  return (
    // .slab 288: the flame floats on the right, 230 across
    <HeroPage
      kicker={kicker}
      kickerColor={atRisk ? AMBER : undefined}
      top={top}
      bottom={bottom}
      height={274}
      size={46}
      object={PHOTOS.flame}
      objectSize={230}
      objectTop={20}
      objectStyle={{ right: -34 }}
      objectProps={atRisk ? { grey: 1, dim: 0.75 } : undefined}
      onRefresh={refetch}
      refreshing={isRefetching}
      tab="index"
    >
      <FadeIn>
        <Surface radius={20} padding={14}>
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={styles.title}>
              {formatNumber(Math.min(s.todaySteps, s.target))} of {formatNumber(s.target)} steps
            </Text>
            <Text style={styles.dim}>{s.stepsLeft ? `${formatNumber(s.stepsLeft)} to go` : "Done"}</Text>
          </Row>
          <Meter value={Math.min(1, s.todaySteps / s.target)} size={6} cap style={{ marginTop: 10 }} />
          <Text style={[styles.dim, { marginTop: 8 }]}>
            {s.active ? "Your streak is safe for today." : s.frozenToday ? "A freeze is keeping today safe." : `About ${s.minutesToGo} minutes of walking`}
          </Text>
        </Surface>
      </FadeIn>

      <FadeIn index={1}>
        {/* .card.freeze: the shield blended onto its dark tile */}
        <Surface radius={20} padding={null} contentStyle={styles.freeze}>
          <View style={styles.art}>
            <BlendImage source={PHOTOS.shield} size={62} mask="tight" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.freezeTitle}>{free ? "Streak freezes" : "Use a streak freeze"}</Text>
            <Text style={styles.small}>
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
        </Surface>
      </FadeIn>

      {s.safe ? (
        <GlowButton title="Back to today" variant="quiet" size="md" full onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))} style={{ height: 48 }} textStyle={styles.btnText} />
      ) : !s.streak ? (
        <GlowButton title="Go for a walk" icon={Route} size="md" full onPress={walk} style={{ height: 48 }} textStyle={styles.btnText} />
      ) : (
        <Row gap={8}>
          {free ? (
            <GlowButton title="Get freezes" variant="quiet" size="md" onPress={() => router.push("/membership")} style={[styles.btn, { flex: 1 }]} textStyle={styles.btnText} />
          ) : (
            <GlowButton title="Use a freeze" variant="quiet" size="md" disabled={!f.left} loading={freeze.isPending} onPress={() => freeze.mutate([])} style={[styles.btn, { flex: 1 }]} textStyle={styles.btnText} />
          )}
          <GlowButton title="Go for a walk" icon={Route} size="md" onPress={walk} style={[styles.btn, { flex: 1 }]} textStyle={styles.btnText} />
        </Row>
      )}
      {!free && !f.left && !s.safe ? (
        <Body dim size={12}>
          No freezes left this month. They come back on the 1st.
        </Body>
      ) : null}
      <Text style={styles.note}>
        A day counts once you walk {formatNumber(s.target)} steps or check in. Your best is {s.best} days.
      </Text>
    </HeroPage>
  );
}

const styles = StyleSheet.create({
  title: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  dim: { color: C.textDim, fontFamily: F.body, fontSize: 11.5 },
  freeze: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 10, paddingBottom: 10, paddingLeft: 10, paddingRight: 14 },
  art: { width: 54, height: 54, borderRadius: 14, backgroundColor: "#05080e", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  freezeTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5 },
  small: { color: C.textDim, fontFamily: F.body, fontSize: 10.5, lineHeight: 15, marginTop: 2 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#1d222b" },
  dotOn: { backgroundColor: C.accent, boxShadow: "0 0 8px rgba(61,139,255,0.9)" },
  btn: { height: 48, paddingHorizontal: 14 },
  btnText: { fontSize: 13 },
  note: { color: C.textMute, fontFamily: F.body, fontSize: 11, lineHeight: 16, marginTop: 2 },
});
