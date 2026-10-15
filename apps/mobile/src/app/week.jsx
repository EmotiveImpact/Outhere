// Your week: the chart is the hero, with a dashed goal line. Tap any day to
// see its steps. Day, Week and Month views, then how it compares with the
// period before and the totals for distance, active time, XP and OUT.

import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useSettings, useWeekSummary } from "@/data/hooks";
import { C, F, FadeIn, LIT, PressableScale, R, S, Screen, Skeleton } from "@/components/ui";
import { BackButton, Glow, MiniSegment, RoundButton } from "@/components/account/parts";
import { hapticSelection } from "@/services/haptics";
import { formatKm, formatNumber } from "@/utils/format";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const CHART_H = 152;

const parseDay = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const dayName = (key) => DAY_NAMES[parseDay(key).getDay()];
const longDate = (key) => {
  const d = parseDay(key);
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};
const rangeLabel = (from, to) => {
  const a = new Date(from);
  const b = new Date(to - 1);
  return a.getMonth() === b.getMonth() ? `${a.getDate()} to ${b.getDate()} ${MONTHS[b.getMonth()]}` : `${a.getDate()} ${MONTHS[a.getMonth()]} to ${b.getDate()} ${MONTHS[b.getMonth()]}`;
};
const activeLabel = (min) => (min >= 60 ? `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}` : `${min}m`);

// Monday is 0.
const todayIndex = () => (new Date().getDay() + 6) % 7;

export default function WeekScreen() {
  const [period, setPeriod] = useState("week");
  const [offset, setOffset] = useState(0); // weeks, months or days back
  const { data: settings } = useSettings();
  const units = settings?.units || "km";

  // The Day view reads the week holding that day and picks the day out of it.
  const dayAt = useMemo(() => {
    if (period !== "day") return null;
    const k = todayIndex() - offset;
    return { weekOffset: k >= 0 ? 0 : Math.ceil(-k / 7), index: ((k % 7) + 7) % 7 };
  }, [period, offset]);

  const summary = useWeekSummary(period === "month" ? "month" : "week", dayAt ? dayAt.weekOffset : offset);
  const data = summary.data;
  const [picked, setPicked] = useState(null);

  // A new period starts on its best day (or today when nothing's counted yet).
  useEffect(() => {
    setPicked(null);
  }, [period, offset]);

  const bars = data?.bars || [];
  const fallback = bars.findIndex((b) => b.date === data?.best?.date);
  const todayAt = bars.findIndex((b) => b.today);
  const selected = dayAt ? dayAt.index : picked ?? (fallback >= 0 ? fallback : todayAt >= 0 ? todayAt : 0);
  const day = bars[selected];

  const move = (dir) => {
    hapticSelection();
    setOffset((o) => Math.max(0, o + dir));
  };

  const isDay = period === "day";
  const word = period === "month" ? "month" : "week";
  const kicker = !data ? " " : isDay ? (day ? longDate(day.date) : " ") : rangeLabel(data.from, data.to);
  const headlineNumber = isDay ? day?.steps || 0 : data?.steps || 0;
  const headlineWord = isDay ? (offset === 0 ? "steps today" : `steps on ${day ? dayName(day.date) : "the day"}`) : `steps this ${word}`;

  const totals = isDay
    ? { km: day?.distanceKm || 0, active: day?.activeMinutes || 0, xp: day?.xp || 0, out: day?.out || 0 }
    : { km: data?.distanceKm || 0, active: data?.activeMinutes || 0, xp: data?.xp || 0, out: data?.out || 0 };

  return (
    <Screen contentStyle={{ gap: S.lg }}>
      <View style={styles.top}>
        <BackButton />
        <Text style={styles.topTitle}>Your {isDay ? "day" : word}</Text>
        <RoundButton
          icon={CalendarDays}
          label="Back to now"
          onPress={() => {
            hapticSelection();
            setOffset(0);
          }}
        />
      </View>

      <FadeIn index={0}>
        <View style={styles.kickRow}>
          <PressableScale onPress={() => move(1)} hitSlop={10} scaleTo={0.9} accessibilityLabel={`Previous ${isDay ? "day" : word}`}>
            <ChevronLeft size={16} color={C.accent} />
          </PressableScale>
          <Text style={styles.kick}>{kicker}</Text>
          <PressableScale onPress={() => move(-1)} disabled={offset === 0} hitSlop={10} scaleTo={0.9} accessibilityLabel={`Next ${isDay ? "day" : word}`} style={{ opacity: offset === 0 ? 0.25 : 1 }}>
            <ChevronRight size={16} color={C.accent} />
          </PressableScale>
        </View>
        <Text style={styles.big}>{formatNumber(headlineNumber)}</Text>
        <Text style={[styles.big, styles.blue]}>{headlineWord}</Text>
      </FadeIn>

      <FadeIn index={1}>
        <MiniSegment
          options={[
            { value: "day", label: "Day" },
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
          ]}
          value={period}
          onChange={(p) => {
            setPeriod(p);
            setOffset(0);
          }}
          style={{ alignSelf: "flex-start" }}
        />
      </FadeIn>

      <FadeIn index={2}>
        {!data ? (
          <Skeleton height={250} radius={R.xl} />
        ) : (
          <Chart
            bars={bars}
            goal={data.goal}
            selected={selected}
            best={data.best?.date}
            dense={period === "month"}
            onPick={(i) => {
              hapticSelection();
              if (isDay) setOffset(Math.max(0, todayIndex() + 7 * dayAt.weekOffset - i));
              else setPicked(i);
            }}
          />
        )}
      </FadeIn>

      <FadeIn index={3}>{data ? <Compare data={data} isDay={isDay} day={day} word={word} /> : <Skeleton height={72} radius={R.lg} />}</FadeIn>

      <FadeIn index={4}>
        <View style={styles.tiles}>
          <Tile value={formatKm(totals.km, units).replace(/\s?(km|mi)$/, "")} label={units === "mi" ? "miles" : "km"} />
          <Tile value={activeLabel(totals.active)} label="Active" />
          <Tile value={formatNumber(totals.xp)} label="XP" />
          <Tile value={formatNumber(totals.out)} label="OUT" />
        </View>
      </FadeIn>
    </Screen>
  );
}

function Chart({ bars, goal, selected, best, dense, onPick }) {
  const top = Math.max(goal * 1.1, ...bars.map((b) => b.steps), 1);
  const pick = bars[selected];
  const goalY = (goal / top) * CHART_H;
  const tipLine = pick ? (pick.future ? `${dayName(pick.date)}, still to come` : pick.date === best ? `${dayName(pick.date)}, your best day` : pick.today ? "Today so far" : dayName(pick.date)) : "";
  return (
    <View style={styles.chart}>
      <LinearGradient colors={["#13213a", "#0c1220"]} style={[StyleSheet.absoluteFill, { borderRadius: R.xl }]} />
      <Glow size={360} right={-20} top={-200} opacity={0.35} />
      <Text style={styles.tipNum}>{formatNumber(pick?.steps || 0)}</Text>
      <Text style={styles.tipSub}>{tipLine}</Text>
      <View style={[styles.bars, { marginTop: 30 }]}>
        <View pointerEvents="none" style={[styles.goalLine, { bottom: 22 + goalY }]}>
          <View style={styles.dashes}>
            {Array.from({ length: 48 }, (_, i) => (
              <View key={i} style={styles.dash} />
            ))}
          </View>
          <Text style={styles.goalText}>{goal % 1000 === 0 ? `${goal / 1000}k` : formatNumber(goal)} goal</Text>
        </View>
        {bars.map((b, i) => {
          const on = i === selected;
          const h = Math.max(b.steps > 0 ? 6 : 3, (b.steps / top) * CHART_H);
          return (
            <PressableScale key={b.date} onPress={() => onPick(i)} scaleTo={0.94} style={styles.barCol} accessibilityLabel={`${dayName(b.date)}, ${formatNumber(b.steps)} steps`}>
              <View style={{ height: CHART_H, justifyContent: "flex-end", width: "100%", alignItems: "center" }}>
                <MotiView
                  from={{ height: 3 }}
                  animate={{ height: h }}
                  transition={{ type: "timing", duration: 420, delay: dense ? 0 : i * 40 }}
                  style={[styles.bar, dense && { borderRadius: 4, width: "78%" }, on && styles.barOn, b.future && { opacity: 0.35 }]}
                >
                  <LinearGradient colors={on ? ["#6aa8ff", "#3d8bff"] : ["#3b4d6c", "#1d2738"]} style={StyleSheet.absoluteFill} />
                </MotiView>
              </View>
              <Text style={[styles.barLabel, on && { color: C.text }]}>{b.label}</Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

function Compare({ data, isDay, day, word }) {
  if (isDay) {
    const left = Math.max(0, data.goal - (day?.steps || 0));
    return (
      <View style={styles.card}>
        <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { borderRadius: R.lg }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{left ? `${formatNumber(left)} to your goal` : "Goal smashed"}</Text>
          <Text style={styles.cardSub}>{left ? "About " + Math.max(1, Math.round(left / 110)) + " minutes of walking" : `Your ${formatNumber(data.goal)} came up`}</Text>
        </View>
        <Text style={styles.up}>{Math.min(100, Math.round(((day?.steps || 0) / data.goal) * 100))}%</Text>
      </View>
    );
  }
  const up = data.change == null ? null : data.change >= 0;
  const title = data.change == null ? `Your first ${word} counted` : up ? `Up on last ${word}` : `Down on last ${word}`;
  const sub = data.change == null ? `${data.goalDays} of ${data.counted} days on goal` : `You beat ${data.beaten} of your ${data.counted} days`;
  return (
    <View style={styles.card}>
      <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { borderRadius: R.lg }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSub}>{sub}</Text>
      </View>
      {data.change != null ? <Text style={[styles.up, !up && { color: C.textDim }]}>{`${up ? "+" : ""}${data.change}%`}</Text> : null}
    </View>
  );
}

const Tile = ({ value, label }) => (
  <View style={styles.tile}>
    <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { borderRadius: R.lg }]} />
    <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.tileLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: S.sm },
  topTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 16 },
  kickRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  kick: { color: C.accent, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase" },
  big: { color: C.text, fontFamily: F.display, fontSize: 44, lineHeight: 44, textTransform: "uppercase" },
  blue: { color: C.accent, textShadowColor: "rgba(61,139,255,0.45)", textShadowRadius: 18 },
  chart: { borderRadius: R.xl, overflow: "hidden", paddingHorizontal: S.lg, paddingTop: S.lg, paddingBottom: S.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(130,180,255,0.25)" },
  tipNum: { color: C.text, fontFamily: F.display, fontSize: 28, lineHeight: 30 },
  tipSub: { color: C.textSoft, fontFamily: F.body, fontSize: 12 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 2 },
  barCol: { flex: 1, alignItems: "center" },
  bar: { width: "86%", maxWidth: 34, borderRadius: 10, overflow: "hidden" },
  barOn: { shadowColor: C.accent, shadowOpacity: 0.7, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  barLabel: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 11, marginTop: 8, height: 14 },
  goalLine: { position: "absolute", left: 0, right: 0, zIndex: 2 },
  dashes: { flexDirection: "row", justifyContent: "space-between", overflow: "hidden" },
  dash: { width: 3, height: 1, backgroundColor: "rgba(130,180,255,0.6)" },
  goalText: { position: "absolute", right: 0, bottom: 4, color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11 },
  card: { flexDirection: "row", alignItems: "center", borderRadius: R.lg, overflow: "hidden", padding: S.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  cardTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 16 },
  cardSub: { color: C.textDim, fontFamily: F.body, fontSize: 13, marginTop: 2 },
  up: { color: C.accent, fontFamily: F.display, fontSize: 30, textShadowColor: "rgba(61,139,255,0.45)", textShadowRadius: 14 },
  tiles: { flexDirection: "row", gap: 8 },
  tile: { flex: 1, borderRadius: R.lg, overflow: "hidden", paddingVertical: 14, paddingHorizontal: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop },
  tileValue: { color: C.text, fontFamily: F.display, fontSize: 24, lineHeight: 26 },
  tileLabel: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: 2 },
});
