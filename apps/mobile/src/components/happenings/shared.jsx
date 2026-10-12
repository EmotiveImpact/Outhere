// Shared pieces for the Events, Drops and News screens.

import React, { useEffect, useState } from "react";
import { Alert, Linking, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft } from "lucide-react-native";
import { C, Cover, F, LiveDot, PressableScale, R, Row, S, Skeleton } from "@/components/ui";
import { dateLabel, timeLabel } from "@/utils/format";

/** Current time, re-rendering every `ms`. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

const startOfDay = (ms) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** "Today", "Tomorrow" or "Sat 12 Oct". */
export const dayLabel = (ms) => {
  const diff = Math.round((startOfDay(ms) - startOfDay(Date.now())) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return dateLabel(ms);
};

export const whenLabel = (startAt, endAt) => `${dayLabel(startAt)}, ${timeLabel(startAt)} to ${timeLabel(endAt)}`;

export const priceLabel = (gbp) => `£${Number(gbp || 0).toFixed(Number(gbp) % 1 ? 2 : 0)}`;

/** Opens the platform maps app searching for a place. */
export async function openDirections(location, city) {
  const q = encodeURIComponent([location, city].filter(Boolean).join(", "));
  const url = Platform.OS === "ios" ? `https://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Couldn't open maps", `Search for "${decodeURIComponent(q)}" in your maps app.`);
  }
}

/** Horizontal filter chips. options: [{ value, label, count }]. */
export function Chips({ options, value, onChange, style }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[{ gap: S.sm, paddingHorizontal: S.gutter }, style]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <PressableScale
            key={String(o.value)}
            scaleTo={0.92}
            onPress={() => onChange(o.value)}
            accessibilityLabel={`${o.label}${o.count != null ? `, ${o.count}` : ""}`}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
            {o.count != null ? (
              <View style={[styles.chipCount, active && styles.chipCountActive]}>
                <Text style={[styles.chipCountText, active && { color: C.accent }]}>{o.count}</Text>
              </View>
            ) : null}
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

/** Icon plus text line used for time, place and organiser. */
export const InfoLine = ({ icon: Icon, children, colour = C.textDim, size = 13, style }) => (
  <Row gap={6} style={style}>
    <Icon size={size + 1} color={colour} />
    <Text style={{ color: colour, fontSize: size, flexShrink: 1 }} numberOfLines={1}>
      {children}
    </Text>
  </Row>
);

/** Section heading above a list, with a count. */
export const SectionLabel = ({ title, count, live = false, style }) => (
  <Row style={[{ justifyContent: "space-between", marginTop: S.xxl, marginBottom: S.md }, style]}>
    <Row gap={10}>
      {live ? <LiveDot size={8} colour={C.accent} /> : null}
      <Text style={{ fontFamily: F.display, fontSize: 20, color: C.text, letterSpacing: -0.2 }}>{title}</Text>
    </Row>
    {count != null ? <Text style={{ color: C.textMute, fontSize: 13, fontWeight: "600" }}>{count}</Text> : null}
  </Row>
);

/** Small "LIVE" pill with a pulsing dot. */
export const LivePill = ({ label = "LIVE", style }) => (
  <View style={[styles.livePill, style]}>
    <LiveDot size={6} colour={C.accent} />
    <Text style={styles.livePillText}>{label}</Text>
  </View>
);

/** Round blurred button that floats over imagery. */
export function GlassButton({ icon: Icon, onPress, label, size = 44 }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.88} accessibilityLabel={label} hitSlop={6} style={[styles.glass, { width: size, height: size, borderRadius: size / 2 }]}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,10,10,0.35)" }]} />
      <View>
        <Icon size={20} color={C.text} />
      </View>
    </PressableScale>
  );
}

/** Frosted bar pinned to the bottom of a detail screen. */
export function StickyBar({ children }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + S.md }]}>
      <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,10,10,0.72)" }]} />
      {children}
    </View>
  );
}

/**
 * Detail screen shell: tall Cover hero with content laid over its scrim, a
 * floating blurred back button and an optional sticky footer bar.
 */
export function HeroScreen({ source, seed, accent, height = 420, overlay, right, children, footer, refreshControl }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const back = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)"));
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: (footer ? 130 : 48) + insets.bottom }} refreshControl={refreshControl}>
        <Cover source={source} seed={seed} accent={accent} scrim style={{ height: height + insets.top }}>
          <LinearGradient colors={["rgba(10,10,10,0.6)", "rgba(10,10,10,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 120 + insets.top }} />
          {overlay ? <View style={styles.overlay}>{overlay}</View> : null}
        </Cover>
        <View style={{ paddingHorizontal: S.gutter, paddingTop: S.xl }}>{children}</View>
      </ScrollView>
      <Row style={[styles.topBar, { top: insets.top + S.sm }]}>
        <GlassButton icon={ChevronLeft} onPress={back} label="Back" />
        {right ? <Row gap={S.sm}>{right}</Row> : null}
      </Row>
      {footer ? <StickyBar>{footer}</StickyBar> : null}
    </View>
  );
}

/** Skeleton shaped like a HeroScreen, for detail first loads. */
export function HeroSkeleton() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Skeleton height={420 + insets.top} radius={0} />
      <View style={{ padding: S.gutter, gap: S.md }}>
        <Skeleton width="40%" height={14} />
        <Skeleton width="85%" height={30} />
        <Skeleton height={72} radius={R.lg} style={{ marginTop: S.lg }} />
        <Skeleton height={72} radius={R.lg} />
      </View>
      <View style={[styles.topBar, { top: insets.top + S.sm }]}>
        <GlassButton icon={ChevronLeft} onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))} label="Back" />
      </View>
    </View>
  );
}

/** Splits a time left into boxed units: D H M when over a day, else H M S. */
export function CountdownBoxes({ target, now, size = "md", style }) {
  const diff = Math.max(0, Number(target) - now);
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const units = d > 0 ? [[d, "DAYS"], [h, "HRS"], [m, "MIN"]] : [[h, "HRS"], [m, "MIN"], [s, "SEC"]];
  const big = size === "lg";
  return (
    <Row gap={big ? 10 : 8} style={style}>
      {units.map(([v, l], i) => (
        <React.Fragment key={l}>
          {i ? <Text style={[styles.colon, big && { fontSize: 28 }]}>:</Text> : null}
          <View style={[styles.unit, big && styles.unitBig]}>
            <Text style={[styles.unitValue, big && { fontSize: 34 }]}>{String(v).padStart(2, "0")}</Text>
            <Text style={styles.unitLabel}>{l}</Text>
          </View>
        </React.Fragment>
      ))}
    </Row>
  );
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** Calendar tile: day number big, month small. */
export function DateBlock({ ms, style }) {
  const d = new Date(Number(ms));
  return (
    <View style={[styles.date, style]}>
      <Text style={styles.dateDay}>{d.getDate()}</Text>
      <Text style={styles.dateMonth}>{MONTHS[d.getMonth()]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    paddingLeft: 18,
    paddingRight: 8,
    borderRadius: R.full,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipActive: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { color: C.text, fontSize: 14, fontWeight: "700" },
  chipTextActive: { color: C.accentText },
  chipCount: { minWidth: 26, height: 26, paddingHorizontal: 6, borderRadius: 13, backgroundColor: C.surfaceHigh, alignItems: "center", justifyContent: "center" },
  chipCountActive: { backgroundColor: C.accentText },
  chipCountText: { color: C.textDim, fontSize: 12, fontWeight: "800" },
  livePill: { flexDirection: "row", alignItems: "center", gap: 6, height: 24, paddingHorizontal: 10, borderRadius: R.full, backgroundColor: "rgba(0,255,127,0.16)", borderWidth: 1, borderColor: "rgba(0,255,127,0.35)" },
  livePillText: { color: C.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  glass: { overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  topBar: { position: "absolute", left: S.lg, right: S.lg, justifyContent: "space-between" },
  overlay: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: S.gutter, paddingBottom: S.lg },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: S.gutter, paddingTop: S.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.borderStrong, overflow: "hidden" },
  unit: { minWidth: 54, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 12, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.borderStrong, alignItems: "center" },
  unitBig: { minWidth: 72, paddingVertical: 12, borderRadius: 16 },
  unitValue: { color: C.text, fontFamily: F.display, fontSize: 26, letterSpacing: -0.5, fontVariant: ["tabular-nums"] },
  unitLabel: { color: C.textMute, fontSize: 9, fontWeight: "800", letterSpacing: 1.2, marginTop: 1 },
  colon: { color: C.textMute, fontFamily: F.display, fontSize: 22, marginTop: -14 },
  date: { width: 52, paddingVertical: 6, borderRadius: 14, backgroundColor: "rgba(10,10,10,0.72)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", alignItems: "center" },
  dateDay: { color: C.text, fontFamily: F.display, fontSize: 24, lineHeight: 26, letterSpacing: -0.5 },
  dateMonth: { color: C.accent, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
});
