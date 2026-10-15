// The Friday moment: your number in the squad, when it starts, and a reserve
// takes your place if you can't play.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useCallUp, useEngineMutation, engine } from "@/data/hooks";
import { Button, C, EmptyState, F, R, Row, S, Skeleton } from "@/components/ui";
import { BottomBar, ButtonPair, Glow, StatBoxes, TopBar } from "@/components/arena/OutsideKit";
import { formatNumber } from "@/utils/format";

export default function CalledUp() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: c, isPending } = useCallUp();
  const respond = useEngineMutation(engine.respondCallUp, {
    success: (r) => (r?.status === "in" ? "You're in. See you Saturday" : "Passed to a reserve. No harm done"),
    onSuccess: (r) => router.replace(r?.status === "in" ? "/cities/vs" : "/cities"),
  });

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: S.gutter, justifyContent: "flex-end" }}>
        <Skeleton height={300} radius={R.lg} />
      </View>
    );
  }
  if (!c) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 80 }}>
        <EmptyState title="No call-up this week" body="Squads are drawn on Friday from everyone active three days that week. Move three days to be in the draw." action="See the league" onAction={() => router.replace("/cities")} />
        <TopBar />
      </View>
    );
  }

  const day = new Date(`${c.startsOn}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short" });
  const dayLong = new Date(`${c.startsOn}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long" });
  const [h] = String(c.kickOff || "06:00").split(":");
  const kick = `${Number(h) % 12 || 12}${Number(h) < 12 ? "am" : "pm"}`;
  const pool = c.sideKind === "city" ? `${formatNumber(c.pool)} people in ${c.side}` : `${formatNumber(c.pool)} people across ${c.side}`;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <LinearGradient colors={["#07090c", "#0a1220", "#07090c"]} style={StyleSheet.absoluteFill} />
      <Glow y="55%" />
      <View style={[styles.body, { paddingBottom: insets.bottom + 140 }]}>
        <Text style={styles.kick}>
          {c.division} · {c.home} vs {c.away}
        </Text>
        <Text style={styles.title}>{c.answer === "in" ? "You're in the" : "You've been"}</Text>
        <Text style={[styles.title, styles.blue]}>{c.answer === "in" ? "squad" : "called up"}</Text>
        <Row style={{ alignItems: "flex-end", marginTop: S.md }}>
          <Text style={styles.number}>{c.number}</Text>
          <Text style={styles.of}>of {formatNumber(c.squad)}</Text>
        </Row>
        <Text style={styles.sub}>
          Drawn at random from {pool} who moved three days this week. {dayLong}, all day, wherever you are.
        </Text>
        <StatBoxes
          style={{ marginTop: S.xl, alignSelf: "stretch" }}
          items={[
            { value: formatNumber(c.squad), label: "each side" },
            { value: day, label: `kick off ${kick}` },
            { value: formatNumber(c.prizeOut), label: "OUT if we win" },
          ]}
        />
      </View>
      <BottomBar>
        {!c.open ? (
          <Button title="It's kicked off" size="lg" full onPress={() => router.replace("/cities/vs")} />
        ) : c.answer === "in" ? (
          <Button title="See the fixture" size="lg" full onPress={() => router.replace("/cities/vs")} />
        ) : (
          <ButtonPair
            secondary={{ title: "Pass to a reserve", disabled: respond.isPending, onPress: () => respond.mutate([c.fixture, false]) }}
            primary={{ title: "I'm in", loading: respond.isPending, onPress: () => respond.mutate([c.fixture, true]) }}
          />
        )}
      </BottomBar>
      <TopBar back={false} onMore={() => router.push("/cities/fair")} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: "flex-end", alignItems: "center", paddingHorizontal: S.gutter },
  kick: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", textAlign: "center" },
  title: { color: C.text, fontFamily: F.display, fontSize: 46, lineHeight: 48, textTransform: "uppercase", textAlign: "center", marginTop: 6 },
  blue: { color: C.accent, marginTop: 0, textShadowColor: "rgba(61,139,255,0.5)", textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },
  number: { color: C.text, fontFamily: F.display, fontSize: 96, lineHeight: 98 },
  of: { color: C.accentHi, fontFamily: F.display, fontSize: 22, marginBottom: 14, marginLeft: 4 },
  sub: { color: C.textSoft, fontFamily: F.body, fontSize: 14, lineHeight: 20, textAlign: "center", maxWidth: 300, marginTop: S.sm },
});
