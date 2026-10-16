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
import { C, EmptyState, F, GlowButton, Logo, PressableScale, Row, S, Skeleton, toast } from "@/components/ui";
import { Glow } from "@/components/account/parts";
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
    // .r11story: the card fills the screen on a soft blue light, Save and Share under it
    <View style={[styles.screen, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 20 }]}>
      <Glow size={560} right={-85} top={insets.top + 40} opacity={0.2} />
      <View ref={card} collapsable={false} style={styles.card}>
        <Image source={src(first.club?.cover) || PHOTOS.derby} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ top: "35%", left: "50%" }} />
        <LinearGradient colors={["rgba(3,5,10,0.55)", "rgba(3,5,10,0)", "rgba(3,5,10,0.25)", "rgba(3,5,10,0.92)"]} locations={[0, 0.28, 0.5, 0.82]} style={StyleSheet.absoluteFill} />
        <Row gap={8} style={styles.top}>
          <Logo size={18} />
          <Text style={styles.brand}>Outhere · Club v club</Text>
          <View style={{ flex: 1 }} />
          <PressableScale onPress={close} style={styles.round} accessibilityLabel="Close">
            <View>
              <X size={16} color="#fff" />
            </View>
          </PressableScale>
        </Row>
        <View style={{ flex: 1 }} />
        <View style={styles.m}>
          <Text style={styles.kicker}>{kicker}</Text>
          <Text style={styles.head} numberOfLines={1} adjustsFontSizeToFit>
            {top}
          </Text>
          <Text style={[styles.head, styles.blue]}>{bottom}</Text>
          <Row gap={10} style={{ alignItems: "baseline", marginTop: 12, marginBottom: 8 }}>
            <Text style={[styles.score, { color: "#9cc4ff" }]}>{formatNumber(first.score || 0)}</Text>
            <Text style={styles.to}>to</Text>
            <Text style={[styles.score, { color: "#9aa3b2" }]}>{formatNumber(second.score || 0)}</Text>
          </Row>
          <Text style={styles.line}>{line}</Text>
        </View>
      </View>
      <Row gap={8} style={{ marginTop: 14 }}>
        <GlowButton title="Save" icon={Bookmark} variant="quiet" size="md" onPress={save} style={{ flex: 1, height: 52 }} textStyle={{ fontSize: 14 }} />
        <GlowButton title="Share to story" icon={ShareIcon} size="md" onPress={share} style={{ flex: 1.6, height: 52 }} textStyle={{ fontSize: 14 }} />
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#05070b", paddingHorizontal: 22, overflow: "hidden" },
  round: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(10,14,20,0.45)", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)" },
  // .card9: 26 round, a hairline of light and a deep shadow
  card: { flex: 1, borderRadius: 26, overflow: "hidden", backgroundColor: "#0b0e13", boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 30px 60px -24px #000" },
  top: { paddingTop: 14, paddingLeft: 16, paddingRight: 12 },
  brand: { color: "#dfe6f0", fontFamily: F.bodySemi, fontSize: 9, letterSpacing: 1.8, textTransform: "uppercase" },
  m: { paddingLeft: 18, paddingRight: 18, paddingBottom: 18 },
  kicker: { color: "#9cc4ff", fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 },
  head: { color: C.text, fontFamily: F.display, fontSize: 44, lineHeight: 42, textTransform: "uppercase" },
  blue: { color: C.accent, textShadowColor: "rgba(61,139,255,0.35)", textShadowRadius: 28, textShadowOffset: { width: 0, height: 0 } },
  score: { fontFamily: F.display, fontSize: 30, lineHeight: 30 },
  to: { color: "#a9b4c6", fontFamily: F.bodyMedium, fontSize: 12 },
  line: { color: "#c3ccda", fontFamily: F.body, fontSize: 11, lineHeight: 15.5 },
});
