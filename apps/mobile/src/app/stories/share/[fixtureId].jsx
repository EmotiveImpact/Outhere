// The club v club share card: a story-sized results card the app makes after
// every fixture, ready for Instagram. Save keeps the picture (on the web it
// downloads; on a phone it copies the result line), Share to story opens the
// share sheet.

import React, { useRef } from "react";
import { Platform, Share, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { Bookmark, Share as ShareIcon, X } from "lucide-react-native";
import { Button, C, EmptyState, F, Logo, PressableScale, Row, S, Skeleton, toast } from "@/components/ui";
import { PHOTOS } from "@/constants/photos";
import { useFixture, useMyFixture } from "@/data/hooks";
import { formatNumber } from "@/utils/format";

const src = (x) => (x ? (typeof x === "string" ? { uri: x } : x) : null);

export default function FixtureShareCard() {
  const { fixtureId } = useLocalSearchParams();
  const id = String(fixtureId || "");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mineQ = useMyFixture();
  const byId = useFixture(id && id !== "mine" ? id : null);
  const fx = id && id !== "mine" ? byId.data : mineQ.data;
  const pending = id && id !== "mine" ? byId.isPending : mineQ.isPending;
  const card = useRef(null);
  const close = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/club"));

  if (pending) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + S.xl, paddingHorizontal: S.gutter }]}>
        <Skeleton height={560} radius={28} />
      </View>
    );
  }
  if (!fx) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + S.xl }]}>
        <EmptyState title="No fixture yet" body="The card appears once your club has a club v club fixture." action="Back" onAction={close} />
      </View>
    );
  }

  const homeWon = fx.result === "home";
  const draw = fx.result === "draw";
  const mineHome = fx.mySide !== "away";
  const mine = mineHome ? fx.home : fx.away;
  const them = mineHome ? fx.away : fx.home;
  const winner = draw ? null : fx.result ? (homeWon ? fx.home : fx.away) : null;
  const loser = winner ? (winner === fx.home ? fx.away : fx.home) : null;
  const leader = (mine.score || 0) >= (them.score || 0) ? mine : them;
  const top = (winner || leader).club?.short || (winner || leader).club?.name || "";
  const bottom = !fx.result ? (leader === mine ? "lead it" : "chase it") : draw ? "share it" : "take it";
  const first = winner || leader;
  const second = first === fx.home ? fx.away : fx.home;
  const kicker = `${fx.isDerby ? "The derby" : `Week ${fx.week}`} · Season ${fx.season}`;
  const line = winner
    ? `${winner.club.name} beat ${loser.club.name} · ${winner.turnout}% turned out for the club run`
    : draw
      ? `${fx.home.club.name} and ${fx.away.club.name} finished level`
      : `${mine.club.name} v ${them.club.name} · ${mine.out ?? 0} of us out right now`;
  const message = `${(winner || leader).club.name} ${winner ? "beat" : draw ? "drew with" : "lead"} ${second.club.name}, ${formatNumber(first.score || 0)} to ${formatNumber(second.score || 0)} steps. Club v club on Outhere.`;

  const save = async () => {
    if (Platform.OS === "web" && card.current) {
      try {
        const { toPng } = await import("html-to-image");
        const url = await toPng(card.current, { pixelRatio: 2, cacheBust: true });
        const a = document.createElement("a");
        a.href = url;
        a.download = `outhere-${fx.id}.png`;
        a.click();
        toast.success("Card saved");
        return;
      } catch {
        // Fall through to copying the result.
      }
    }
    await Clipboard.setStringAsync(message);
    toast.success("Result copied", "Paste it with your screenshot.");
  };

  const share = () => Share.share({ message }).catch(() => {});

  return (
    <View style={[styles.screen, { paddingTop: insets.top + S.md, paddingBottom: insets.bottom + S.lg }]}>
      <Row style={{ justifyContent: "flex-end", paddingHorizontal: S.gutter, marginBottom: S.sm }}>
        <PressableScale onPress={close} style={styles.round} accessibilityLabel="Close">
          <X size={20} color="#fff" />
        </PressableScale>
      </Row>
      <View ref={card} collapsable={false} style={styles.card}>
        <Image source={src(first.club?.cover) || PHOTOS.derby} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={["rgba(7,9,12,0.55)", "rgba(7,9,12,0.15)", "rgba(7,9,12,0.95)"]} locations={[0, 0.35, 0.78]} style={StyleSheet.absoluteFill} />
        <Row gap={8} style={{ padding: S.lg }}>
          <Logo size={18} />
          <Text style={styles.brand}>Outhere · Club v club</Text>
        </Row>
        <View style={{ flex: 1 }} />
        <View style={{ padding: S.lg }}>
          <Text style={styles.kicker}>{kicker}</Text>
          <Text style={styles.head} numberOfLines={1} adjustsFontSizeToFit>
            {top}
          </Text>
          <Text style={[styles.head, { color: C.accent }]}>{bottom}</Text>
          <Row gap={S.sm} style={{ alignItems: "baseline", marginTop: S.sm }}>
            <Text style={[styles.score, { color: C.accentHi }]}>{formatNumber(first.score || 0)}</Text>
            <Text style={styles.to}>to</Text>
            <Text style={[styles.score, { color: C.textDim }]}>{formatNumber(second.score || 0)}</Text>
          </Row>
          <Text style={styles.line}>{line}</Text>
        </View>
      </View>
      <Row gap={S.md} style={{ paddingHorizontal: S.gutter, marginTop: S.lg }}>
        <Button title="Save" icon={Bookmark} variant="secondary" size="lg" onPress={save} style={{ flex: 1 }} />
        <Button title="Share to story" icon={ShareIcon} size="lg" onPress={share} style={{ flex: 1.6 }} />
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
  card: { flex: 1, marginHorizontal: S.gutter, borderRadius: 28, overflow: "hidden", backgroundColor: "#0b0e13", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  brand: { color: "#fff", fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2, textTransform: "uppercase" },
  kicker: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 },
  head: { color: C.text, fontFamily: F.display, fontSize: 58, lineHeight: 58, textTransform: "uppercase" },
  score: { fontFamily: F.display, fontSize: 34 },
  to: { color: C.textDim, fontFamily: F.body, fontSize: 14 },
  line: { color: C.textSoft, fontFamily: F.body, fontSize: 13, lineHeight: 19, marginTop: S.sm },
});
