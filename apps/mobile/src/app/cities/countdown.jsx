// The hyped countdown, saved for the big missions: city v city
// (kind=city) and the Borough or Area Cup (kind=area). Each has its own
// light: the city at night behind the city countdown, your borough's crest
// glowing behind the cup. Every beat has its own line, like the prototype,
// then 3, 2, 1 and out the door.

import React, { useEffect, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAreaTable, useCityFixture, usePlaySide } from "@/data/hooks";
import { PHOTOS } from "@/constants/photos";
import { BlendImage, GlowButton, S } from "@/components/ui";
import { TopBar } from "@/components/arena/OutsideKit";
import { HypeStage } from "@/components/move/HypeStage";
import { compactNumber, formatNumber } from "@/utils/format";
import { haptic } from "@/services/haptics";

const AREA_CUP_OUT = 400;

/** .hbg for the cup: the crest on black, contained and at .7. */
function Crest() {
  const { width, height } = useWindowDimensions();
  const size = Math.min(width, height);
  return (
    <View style={[StyleSheet.absoluteFill, styles.crest]} pointerEvents="none">
      <BlendImage source={PHOTOS.crest} size={size} mask={[0.6, 0.72]} dim={0.75} />
    </View>
  );
}

export default function CityCountdown() {
  const router = useRouter();
  const { kind } = useLocalSearchParams();
  const area = kind === "area";
  const f = useCityFixture().data;
  const table = useAreaTable(null).data || [];
  const side = usePlaySide().data;
  const [beat, setBeat] = useState(0);
  const go = beat >= 3;

  useEffect(() => {
    let i = 0;
    haptic.beat();
    const t = setInterval(() => {
      i += 1;
      if (i >= 3) {
        clearInterval(t);
        haptic.go();
        setBeat(3);
        return;
      }
      haptic.beat();
      setBeat(i);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  let chip;
  let beats;
  let stakes;
  if (area) {
    const mine = table.find((r) => r.mine);
    const first = table[0];
    const second = table[1];
    const leading = mine && mine.rank === 1;
    const gap = leading ? mine.counted - (second?.counted || 0) : (first?.counted || 0) - (mine?.counted || 0);
    const rival = leading ? second : first;
    const cup = side?.cityId === "london" ? "Borough Cup" : "Area Cup";
    const me = mine?.name || "Your area";
    chip = `${cup} · ${me} vs ${rival?.name || ""}`;
    beats = [
      { n: "3", line: me, kicker: `${cup} · ${side?.cityName || "your city"}` },
      { n: "2", line: leading ? "Hold the top" : "Close the gap", kicker: leading ? `${rival?.name || "They"} are ${compactNumber(gap)} behind` : `${rival?.name || "The top"} are ${compactNumber(gap)} ahead` },
      { n: "1", line: "Every street", kicker: "Every step you take counts for the cup" },
      { n: "GO", line: `Go ${me}`, kicker: "Your steps count from now" },
    ];
    stakes = [
      { value: mine ? `#${mine.rank}` : "–", label: `in ${side?.cityName || "your city"}` },
      { value: compactNumber(gap), label: leading ? "steps ahead" : "steps behind" },
      { value: `+${AREA_CUP_OUT}`, label: "OUT for the cup" },
    ];
  } else {
    const mineSide = f?.mine?.side === "away" ? f?.away : f?.home;
    const other = f?.mine?.side === "away" ? f?.home : f?.away;
    const live = f?.status === "live";
    chip = f ? `${live ? "Live" : "Saturday"} · ${f.home.name} vs ${f.away.name}` : "City v city";
    beats = [
      { n: "3", line: `${formatNumber(f?.squadSize || 0)} a side`, kicker: [f?.division, live ? "Today" : "Saturday"].filter(Boolean).join(" · ") },
      { n: "2", line: "One squad", kicker: other ? `${other.name} ${live ? "are already moving" : "are waiting"}` : "Matchday" },
      { n: "1", line: "For the city", kicker: "Turnout bonus is live" },
      { n: "GO", line: `Go ${mineSide?.name || "on"}`, kicker: f?.mine?.number ? `Squad #${f.mine.number} is on the clock` : "The clock is running" },
    ];
    stakes = [
      { value: formatNumber(f?.squadSize || 0), label: "a side" },
      { value: formatNumber(other?.score || 0), label: "to beat" },
      { value: "+250", label: "OUT if we win" },
    ];
  }

  const cancel = () => (router.canGoBack() ? router.back() : router.replace("/cities"));

  return (
    <View style={{ flex: 1, backgroundColor: "#03050a" }}>
      <HypeStage
        beat={beat}
        beats={beats}
        chip={chip}
        stakes={stakes}
        onCancel={cancel}
        photo={area ? null : PHOTOS.city}
        backdrop={area ? <Crest /> : null}
        foot={go ? <GlowButton title="Out the door" size="lg" full onPress={() => router.replace(area ? "/cities/areas" : "/cities/vs")} style={styles.out} /> : null}
      />
      <TopBar />
    </View>
  );
}

const styles = StyleSheet.create({
  crest: { alignItems: "center", justifyContent: "center", backgroundColor: "#000" },
  out: { alignSelf: "stretch", marginHorizontal: S.xs, marginBottom: -14 },
});
