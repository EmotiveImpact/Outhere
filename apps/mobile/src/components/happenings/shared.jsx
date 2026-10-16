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
                <Text style={[styles.chipCountText, active && { color: C.bg }]}>{o.count}</Text>
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

/** Small "LIVE" pill with a pulsing dot. Neutral, only the dot is green. */
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

/** Time left as plain columns: D H M when over a day, else H M S. */
export function CountdownBoxes({ target, now, size = "md", style }) {
  const diff = Math.max(0, Number(target) - now);
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const units = d > 0 ? [[d, "days"], [h, "hrs"], [m, "min"]] : [[h, "hrs"], [m, "min"], [s, "sec"]];
  const big = size === "lg";
  return (
    <Row gap={big ? 28 : 20} style={[{ alignItems: "flex-start" }, style]}>
      {units.map(([v, l]) => (
        <View key={l}>
          <Text style={[styles.unitValue, big && { fontSize: 52, letterSpacing: -1.5 }]}>{String(v).padStart(2, "0")}</Text>
          <Text style={styles.unitLabel}>{l}</Text>
        </View>
      ))}
    </Row>
  );
}

/** One-line countdown, e.g. "2d 04h 12m" or "03h 12m 09s". */
export function countdownText(target, now) {
  const diff = Math.max(0, Number(target) - now);
  const d = Math.floor(diff / 86_400_000);
  const h = String(Math.floor((diff % 86_400_000) / 3_600_000)).padStart(2, "0");
  const m = String(Math.floor((diff % 3_600_000) / 60_000)).padStart(2, "0");
  const sec = String(Math.floor((diff % 60_000) / 1000)).padStart(2, "0");
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${sec}s`;
}

const styles = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 8, height: 40, paddingLeft: 16, paddingRight: 12, borderRadius: R.full, backgroundColor: C.surface },
  chipActive: { backgroundColor: C.text },
  chipText: { color: C.textDim, fontSize: 14, fontWeight: "600" },
  chipTextActive: { color: C.bg },
  chipCount: { minWidth: 18, alignItems: "center", justifyContent: "center" },
  chipCountActive: {},
  chipCountText: { color: C.textMute, fontSize: 13, fontWeight: "600" },
  livePill: { flexDirection: "row", alignItems: "center", gap: 6, height: 24, paddingHorizontal: 10, borderRadius: R.full, backgroundColor: "rgba(10,10,10,0.72)" },
  livePillText: { color: C.text, fontSize: 11, fontWeight: "600", letterSpacing: 0.8 },
  glass: { overflow: "hidden", alignItems: "center", justifyContent: "center" },
  topBar: { position: "absolute", left: S.lg, right: S.lg, justifyContent: "space-between" },
  overlay: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: S.gutter, paddingBottom: S.lg },
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: S.gutter, paddingTop: S.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border, overflow: "hidden" },
  unitValue: { color: C.text, fontFamily: F.display, fontSize: 30, letterSpacing: -0.8, fontVariant: ["tabular-nums"] },
  unitLabel: { color: C.textDim, fontSize: 13, marginTop: 2 },
});
