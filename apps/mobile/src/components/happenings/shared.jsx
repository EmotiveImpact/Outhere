// Shared pieces for the Events, Drops and News screens.

import React, { useEffect, useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { C, F, Header, R, Row, S } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";
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

/** Horizontal filter chips. options: [{ value, label }]. */
export function Chips({ options, value, onChange, style }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[{ gap: S.sm, paddingHorizontal: S.gutter }, style]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => {
              hapticSelection();
              onChange(o.value);
            }}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
            {o.count != null ? <Text style={[styles.chipCount, active && styles.chipTextActive]}>{o.count}</Text> : null}
          </Pressable>
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

/** Small uppercase heading above a list section, with a count. */
export const SectionLabel = ({ title, count, live = false, style }) => (
  <Row style={[{ justifyContent: "space-between", marginTop: S.xxl, marginBottom: S.md }, style]}>
    <Row gap={8}>
      {live ? <View style={styles.liveDot} /> : null}
      <Text style={{ fontFamily: F.display, fontSize: 19, color: C.text }}>{title}</Text>
    </Row>
    {count != null ? <Text style={{ color: C.textMute, fontSize: 13, fontWeight: "600" }}>{count}</Text> : null}
  </Row>
);

/**
 * Detail screen shell: full bleed hero image fading into the canvas, a
 * floating back button and scrolling content underneath.
 */
export function HeroScreen({ image, height = 340, right, children, footer, refreshControl }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (footer ? 120 : 40) + insets.bottom }}
        refreshControl={refreshControl}
      >
        <View style={{ height }}>
          {image ? (
            <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: C.surface }]} />
          )}
          <LinearGradient
            colors={["rgba(10,10,10,0.55)", "rgba(10,10,10,0)", "rgba(10,10,10,0.2)", C.bg]}
            locations={[0, 0.3, 0.65, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={{ paddingHorizontal: S.gutter, marginTop: -S.xxl * 2 }}>{children}</View>
      </ScrollView>
      <Header back right={right} style={{ position: "absolute", top: insets.top, left: 0, right: 0 }} />
      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + S.md }]}>
          <LinearGradient colors={["rgba(10,10,10,0)", C.bg]} style={styles.footerFade} pointerEvents="none" />
          {footer}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: R.full,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipActive: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { color: C.textDim, fontSize: 14, fontWeight: "600" },
  chipCount: { color: C.textMute, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: C.accentText },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.accent,
    shadowColor: C.accent,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: S.gutter, paddingTop: S.md, backgroundColor: C.bg },
  footerFade: { position: "absolute", left: 0, right: 0, top: -32, height: 32 },
});
