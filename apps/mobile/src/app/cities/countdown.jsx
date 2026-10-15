// The hyped countdown, saved for the big missions: city v city
// (kind=city) and the Borough or Area Cup (kind=area). Your side on screen,
// what you're playing for, then 3, 2, 1 and out the door.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAreaTable, useCityFixture, usePlaySide } from "@/data/hooks";
import { PHOTOS } from "@/constants/photos";
import { Button, C, F, R, Row, S, Spotlight, SpotlightNumber, hypeColour } from "@/components/ui";
import { StatBoxes, TopBar } from "@/components/arena/OutsideKit";
import { compactNumber, formatNumber } from "@/utils/format";
import { hapticSelection, hapticSuccess } from "@/services/haptics";

const AREA_CUP_OUT = 400;

export default function CityCountdown() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { kind } = useLocalSearchParams();
  const area = kind === "area";
  const f = useCityFixture().data;
  const table = useAreaTable(null).data || [];
  const side = usePlaySide().data;
  const [n, setN] = useState(3);
  const [go, setGo] = useState(false);

  useEffect(() => {
    let left = 3;
    const t = setInterval(() => {
      left -= 1;
      if (left <= 0) {
        clearInterval(t);
        hapticSuccess();
        setN(0);
        setGo(true);
        return;
      }
      hapticSelection();
      setN(left);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  let chip;
  let line;
  let title;
  let boxes;
  if (area) {
    const mine = table.find((r) => r.mine);
    const first = table[0];
    const second = table[1];
    const leading = mine && mine.rank === 1;
    const gap = leading ? mine.counted - (second?.counted || 0) : (first?.counted || 0) - (mine?.counted || 0);
    const rival = leading ? second : first;
    chip = `${side?.cityId === "london" ? "Borough Cup" : "Area Cup"} · ${mine?.name || "Your area"} vs ${rival?.name || ""}`;
    line = leading ? `${rival?.name || "They"} are ${compactNumber(gap)} behind` : `${rival?.name || "The top"} are ${compactNumber(gap)} ahead`;
    title = leading ? "Hold the top" : "Close the gap";
    boxes = [
      { value: mine ? `#${mine.rank}` : "–", label: `in ${side?.cityName || "your city"}` },
      { value: compactNumber(gap), label: leading ? "steps ahead" : "steps behind" },
      { value: `+${AREA_CUP_OUT}`, label: "OUT for the cup" },
    ];
  } else {
    const mineSide = f?.mine?.side === "away" ? f?.away : f?.home;
    const other = f?.mine?.side === "away" ? f?.home : f?.away;
    chip = f ? `${f.status === "live" ? "Live" : "Saturday"} · ${f.home.name} vs ${f.away.name}` : "City v city";
    line = mineSide ? `Matchday · ${mineSide.name}` : "Matchday";
    title = "One squad";
    boxes = [
      { value: formatNumber(f?.squadSize || 0), label: "a side" },
      { value: formatNumber(other?.score || 0), label: "to beat" },
      { value: "+250", label: "OUT if we win" },
    ];
  }

  // The prototype's .hype stage, in px from the top of the screen: the light
  // and the number centre 330 down, the labels at 478 and 500, the stakes at 556.
  const y = (px) => insets.top - 14 + px;
  const colour = hypeColour(go ? 0 : n);
  return (
    <View style={{ flex: 1, backgroundColor: "#03050a" }}>
      <Spotlight beat={go ? "go" : n} go={go} colour={colour} photo={PHOTOS.city} centreY={y(330)}>
        <View style={[styles.route, { top: y(76) }]}>
          <View style={styles.chip}>
            <View style={styles.dot} />
            <Text style={styles.chipText} numberOfLines={1}>
              {chip}
            </Text>
          </View>
        </View>
        <Row gap={5} style={[styles.hbar, { top: y(126) }]}>
          {[0, 1, 2, 3].map((i) => {
            const on = i < (go ? 4 : 4 - n);
            return <View key={i} style={[styles.seg, on && { backgroundColor: colour, boxShadow: `0 0 8px ${colour}` }]} />;
          })}
        </Row>
        <View style={[styles.number, { top: y(330) - 150 }]} pointerEvents="none">
          <SpotlightNumber key={go ? "go" : n} value={go ? "GO" : n} colour={colour} />
        </View>
        <Text style={[styles.line, { top: y(478) }]}>{line}</Text>
        <Animated.Text key={`t${go}`} entering={FadeInDown.duration(500).delay(150)} style={[styles.title, { top: y(500) }]}>
          {title}
        </Animated.Text>
        <View style={[styles.stakes, { top: y(556) }]}>
          <StatBoxes glass items={boxes} />
        </View>
        <View style={{ position: "absolute", left: S.gutter, right: S.gutter, bottom: insets.bottom + S.lg }}>
          {go ? (
            <Button title="Out the door" size="lg" full onPress={() => router.replace(area ? "/cities/areas" : "/cities/vs")} />
          ) : (
            <Button title="Cancel" variant="ghost" onPress={() => (router.canGoBack() ? router.back() : router.replace("/cities"))} style={{ alignSelf: "center" }} />
          )}
        </View>
      </Spotlight>
      <TopBar />
    </View>
  );
}

const styles = StyleSheet.create({
  // .hype .hroute: a glass chip with a live dot
  route: { position: "absolute", left: 18, right: 18, alignItems: "center" },
  chip: { flexDirection: "row", alignItems: "center", gap: 7, paddingVertical: 8, paddingHorizontal: 13, borderRadius: R.full, backgroundColor: "rgba(255,255,255,0.1)", maxWidth: "100%" },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#ff5a5f", boxShadow: "0 0 8px #ff5a5f" },
  chipText: { color: C.text, fontFamily: F.bodySemi, fontSize: 12 },
  // .hype .hbar: four beats, lit in the beat's colour
  hbar: { position: "absolute", left: 18, right: 18 },
  seg: { flex: 1, height: 4, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.18)" },
  number: { position: "absolute", left: 0, right: 0, height: 300, justifyContent: "center" },
  // .hype .hk and .hl7
  line: { position: "absolute", left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.6)", fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase" },
  title: { position: "absolute", left: 0, right: 0, textAlign: "center", color: C.text, fontFamily: F.display, fontSize: 34, lineHeight: 36, letterSpacing: 0.5, textTransform: "uppercase" },
  stakes: { position: "absolute", left: 18, right: 18 },
});
