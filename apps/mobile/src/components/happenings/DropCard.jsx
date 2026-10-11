import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Bell, BellRing, Check, Crown } from "lucide-react-native";
import { C, F, Pill, ProgressBar, R, Row, S } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";
import { countdown, formatNumber } from "@/utils/format";
import { priceLabel } from "./shared";

const HOUR = 3_600_000;

export const earlyHours = (drop) => Math.round((drop.releaseAt - drop.earlyAccessAt) / HOUR);

/**
 * Everything a drop needs to show its state right now:
 * headline, the time it counts down to and a pill.
 */
export function dropState(drop) {
  const hrs = earlyHours(drop);
  switch (drop.status) {
    case "soldout":
      return { pill: { label: "SOLD OUT", tone: "danger" }, headline: "Sold out", target: null };
    case "live":
      return { pill: { label: "LIVE", tone: "accent" }, headline: `${formatNumber(drop.remaining)} of ${formatNumber(drop.stock)} left`, target: null };
    case "early":
      return drop.hasEarlyAccess
        ? { pill: { label: "EARLY ACCESS", tone: "pro" }, headline: "Your early access is open", sub: "Public release in", target: drop.releaseAt }
        : { pill: { label: "MEMBERS ONLY", tone: "pro" }, headline: "Pro and Black are shopping now", sub: "Opens to everyone in", target: drop.releaseAt };
    default:
      return drop.hasEarlyAccess
        ? { pill: { label: "UPCOMING", tone: "neutral" }, headline: `You get in ${hrs}h early`, sub: "Your early access in", target: drop.earlyAccessAt }
        : { pill: { label: "UPCOMING", tone: "neutral" }, headline: `Pro and Black get in ${hrs}h early`, sub: "Drops in", target: drop.releaseAt };
  }
}

/** Refetches once when a drop crosses into its next state. */
export function useDropBoundaries(drops, now, refetch) {
  const last = useRef(0);
  useEffect(() => {
    if (!drops?.length) return;
    const crossed = drops.some((d) => (d.status === "upcoming" && now >= d.earlyAccessAt) || (d.status === "early" && now >= d.releaseAt));
    if (crossed && now - last.current > 5000) {
      last.current = now;
      refetch();
    }
  }, [drops, now, refetch]);
}

export function ReminderButton({ on, onPress, disabled }) {
  const Icon = on ? BellRing : Bell;
  return (
    <Pressable
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={on ? "Turn reminder off" : "Remind me"}
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      style={({ pressed }) => [styles.bell, on && styles.bellOn, (pressed || disabled) && { opacity: 0.6 }]}
    >
      <Icon size={16} color={on ? C.accentText : C.text} />
      <Text style={[styles.bellText, on && { color: C.accentText }]}>{on ? "Reminder on" : "Remind me"}</Text>
    </Pressable>
  );
}

export default function DropCard({ drop, now, onPress, onToggleReminder, reminderBusy }) {
  const state = dropState(drop);
  const showReminder = drop.status === "upcoming" || (drop.status === "early" && !drop.hasEarlyAccess);
  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      style={({ pressed }) => [styles.card, drop.status === "live" && styles.live, pressed && { opacity: 0.88, transform: [{ scale: 0.99 }] }]}
    >
      <View style={styles.imageWrap}>
        <Image source={{ uri: drop.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.7)"]} style={StyleSheet.absoluteFill} />
        {drop.status === "soldout" ? <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,10,10,0.45)" }]} /> : null}
        <Row gap={6} style={{ position: "absolute", top: S.md, left: S.md }}>
          <Pill {...state.pill} icon={drop.status === "early" ? Crown : undefined} />
          {drop.reservation ? <Pill label={`RESERVED ${drop.reservation.size.toUpperCase()}`} tone="accent" icon={Check} /> : null}
        </Row>
        <View style={styles.price}>
          <Text style={styles.priceText}>{priceLabel(drop.priceGbp)}</Text>
        </View>
      </View>
      <View style={{ padding: S.lg }}>
        <Text style={styles.tag}>{drop.tag}</Text>
        <Text style={styles.title} numberOfLines={1}>
          {drop.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {drop.subtitle}
        </Text>

        {state.target ? (
          <Row style={{ justifyContent: "space-between", marginTop: S.lg }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.small}>{state.sub}</Text>
              <Text style={styles.count}>{countdown(state.target, now)}</Text>
            </View>
            {showReminder ? <ReminderButton on={drop.reminder} disabled={reminderBusy} onPress={onToggleReminder} /> : null}
          </Row>
        ) : drop.status === "live" ? (
          <View style={{ marginTop: S.lg, gap: 8 }}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={[styles.small, { color: C.accent }]}>{state.headline}</Text>
              <Text style={styles.small}>{drop.reservation ? "You're sorted" : "Tap to reserve"}</Text>
            </Row>
            <ProgressBar value={drop.stock ? drop.remaining / drop.stock : 0} height={6} />
          </View>
        ) : (
          <Text style={[styles.small, { marginTop: S.md }]}>All gone. Set a reminder on the next drop so you're first in.</Text>
        )}
        {state.target ? <Text style={[styles.small, { marginTop: S.sm }]}>{state.headline}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: "hidden", marginBottom: S.md },
  live: { borderColor: "rgba(0,255,127,0.35)" },
  imageWrap: { height: 190, backgroundColor: C.surfaceHigh },
  price: {
    position: "absolute",
    right: S.md,
    bottom: S.md,
    backgroundColor: C.text,
    borderRadius: R.full,
    paddingHorizontal: 12,
    height: 30,
    justifyContent: "center",
  },
  priceText: { color: C.bg, fontFamily: F.display, fontSize: 15 },
  tag: { color: C.textMute, fontSize: 11, fontWeight: "700", letterSpacing: 1.1, textTransform: "uppercase", marginBottom: 4 },
  title: { color: C.text, fontFamily: F.display, fontSize: 22, letterSpacing: -0.2 },
  subtitle: { color: C.textDim, fontSize: 14, marginTop: 2 },
  small: { color: C.textDim, fontSize: 13, fontWeight: "600" },
  count: { color: C.text, fontFamily: F.display, fontSize: 26, marginTop: 2, fontVariant: ["tabular-nums"] },
  bell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: R.full,
    backgroundColor: C.surfaceHigh,
    borderWidth: 1,
    borderColor: C.borderStrong,
  },
  bellOn: { backgroundColor: C.accent, borderColor: C.accent },
  bellText: { color: C.text, fontSize: 13, fontWeight: "700" },
});
