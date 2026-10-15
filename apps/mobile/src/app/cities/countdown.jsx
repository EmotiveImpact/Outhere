// The hyped countdown, saved for the big missions: city v city
// (kind=city) and the Borough or Area Cup (kind=area). Your side on screen,
// what you're playing for, then 3, 2, 1 and out the door.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, Line, RadialGradient, Rect, Stop } from "react-native-svg";
import Animated, { ZoomIn } from "react-native-reanimated";
import { useAreaTable, useCityFixture, usePlaySide } from "@/data/hooks";
import { Button, C, F, R, Row, S } from "@/components/ui";
import { StatBoxes, TopBar } from "@/components/arena/OutsideKit";
import { compactNumber, formatNumber } from "@/utils/format";
import { hapticSelection, hapticSuccess } from "@/services/haptics";

const AREA_CUP_OUT = 400;

function Rays() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <RadialGradient id="cdglow" cx="50%" cy="42%" rx="55%" ry="40%">
          <Stop offset="0" stopColor="#3d8bff" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#3d8bff" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#cdglow)" />
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i / 36) * Math.PI * 2;
        return <Line key={i} x1="50%" y1="42%" x2={`${50 + Math.cos(a) * 120}%`} y2={`${42 + Math.sin(a) * 120}%`} stroke="rgba(130,180,255,0.08)" strokeWidth={1} />;
      })}
    </Svg>
  );
}

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

  return (
    <View style={{ flex: 1, backgroundColor: "#050913" }}>
      <Rays />
      <View style={{ paddingTop: insets.top + 64, alignItems: "center", paddingHorizontal: S.gutter }}>
        <View style={styles.chip}>
          <View style={styles.dot} />
          <Text style={styles.chipText} numberOfLines={1}>
            {chip}
          </Text>
        </View>
        <Row gap={6} style={{ marginTop: S.lg, alignSelf: "stretch" }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.seg, i < (go ? 4 : 4 - n) && styles.segOn]} />
          ))}
        </Row>
      </View>
      <View style={styles.centre}>
        {go ? (
          <Animated.Text entering={ZoomIn.springify().damping(9)} style={styles.goText}>
            Go
          </Animated.Text>
        ) : (
          <Animated.Text key={n} entering={ZoomIn.springify().damping(10)} style={styles.count}>
            {n}
          </Animated.Text>
        )}
        <Text style={styles.line}>{line}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={{ paddingHorizontal: S.gutter, paddingBottom: insets.bottom + S.lg }}>
        <StatBoxes glass items={boxes} />
        {go ? (
          <Button title="Out the door" size="lg" full onPress={() => router.replace(area ? "/cities/areas" : "/cities/vs")} style={{ marginTop: S.lg }} />
        ) : (
          <Button title="Cancel" variant="ghost" onPress={() => (router.canGoBack() ? router.back() : router.replace("/cities"))} style={{ alignSelf: "center", marginTop: S.lg }} />
        )}
      </View>
      <TopBar />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 8, height: 36, paddingHorizontal: 14, borderRadius: R.full, backgroundColor: "rgba(27,31,38,0.85)", maxWidth: "100%" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ff4d55" },
  chipText: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)" },
  segOn: { backgroundColor: C.accent },
  centre: { flex: 1, alignItems: "center", justifyContent: "center" },
  count: { color: "#fff", fontFamily: F.display, fontSize: 240, lineHeight: 250, textShadowColor: "rgba(61,139,255,0.9)", textShadowRadius: 40, textShadowOffset: { width: 0, height: 0 } },
  goText: { color: C.accent, fontFamily: F.display, fontSize: 180, lineHeight: 190, textTransform: "uppercase", textShadowColor: "rgba(61,139,255,0.9)", textShadowRadius: 40, textShadowOffset: { width: 0, height: 0 } },
  line: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginTop: S.sm },
  title: { color: C.text, fontFamily: F.display, fontSize: 36, textTransform: "uppercase", marginTop: 4 },
});
