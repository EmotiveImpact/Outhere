import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Bell, BellRing, Check, Crown } from "lucide-react-native";
import { C, Cover, F, Pill, PressableScale, ProgressBar, R, Row, S, Skeleton } from "@/components/ui";
import { formatNumber } from "@/utils/format";
import { LivePill, countdownText, priceLabel } from "./shared";

const HOUR = 3_600_000;

// Each drop gets its own colourway for the cover art.
const DROP_ACCENTS = { d_nightshift: "#9B5CFF", d_tee: "#e5e4e2", d_bottle: "#3DA9FC", d_windbreaker: "#FF6B35" };
export const dropAccent = (drop) => DROP_ACCENTS[drop.id];

export const earlyHours = (drop) => Math.round((drop.releaseAt - drop.earlyAccessAt) / HOUR);

/**
 * Everything a drop needs to show its state right now:
 * headline, the time it counts down to and a pill.
 */
export function dropState(drop) {
  const hrs = earlyHours(drop);
  switch (drop.status) {
    case "soldout":
      return { pill: { label: "Sold out", tone: "neutral" }, headline: "Sold out", target: null };
    case "live":
      return { pill: { label: "LIVE", tone: "neutral" }, headline: `${formatNumber(drop.remaining)} of ${formatNumber(drop.stock)} left`, target: null };
    case "early":
      return drop.hasEarlyAccess
        ? { pill: { label: "Early access", tone: "pro" }, headline: "Your early access is open", sub: "Public release in", target: drop.releaseAt }
        : { pill: { label: "Members only", tone: "pro" }, headline: "Pro and Black are shopping now", sub: "Opens to everyone in", target: drop.releaseAt };
    default:
      return drop.hasEarlyAccess
        ? { pill: { label: "Upcoming", tone: "neutral" }, headline: `You get in ${hrs}h before everyone else`, sub: "Your early access opens in", target: drop.earlyAccessAt }
        : { pill: { label: "Upcoming", tone: "neutral" }, headline: `Pro and Black get in ${hrs}h early`, sub: "Drops in", target: drop.releaseAt };
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

/** Status pills for a drop, at most two: state or early access, then reservation. */
export function DropPills({ drop, style }) {
  const state = dropState(drop);
  const earlyBadge = drop.hasEarlyAccess && (drop.status === "upcoming" || drop.status === "early");
  return (
    <Row gap={6} style={style}>
      {drop.status === "live" ? (
        <LivePill />
      ) : earlyBadge ? (
        <Pill label={drop.status === "early" ? "Early access open" : "Early access"} tone="pro" icon={Crown} />
      ) : (
        <Pill {...state.pill} icon={drop.status === "early" ? Crown : undefined} />
      )}
      {drop.reservation ? <Pill label={`Reserved, ${drop.reservation.size}`} icon={Check} /> : null}
    </Row>
  );
}

export function ReminderButton({ on, onPress, disabled }) {
  const Icon = on ? BellRing : Bell;
  return (
    <PressableScale disabled={disabled} scaleTo={0.92} onPress={onPress} accessibilityLabel={on ? "Turn reminder off" : "Remind me"} style={[styles.bell, on && styles.bellOn, disabled && { opacity: 0.6 }]}>
      <Icon size={16} color={C.text} />
      <Text style={styles.bellText}>{on ? "Reminder on" : "Remind me"}</Text>
    </PressableScale>
  );
}

export default function DropCard({ drop, now, onPress, onToggleReminder, reminderBusy }) {
  const state = dropState(drop);
  const showReminder = drop.status === "upcoming" || (drop.status === "early" && !drop.hasEarlyAccess);
  const left = drop.stock ? drop.remaining / drop.stock : 0;
  const sold = drop.status === "soldout";
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={styles.card}>
      <Cover source={drop.image} seed={drop.id} accent={dropAccent(drop)} scrim style={styles.cover}>
        {sold ? <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,10,10,0.5)" }]} /> : null}
        <DropPills drop={drop} style={styles.pills} />
      </Cover>

      <View style={styles.body}>
        <Row style={{ alignItems: "flex-start" }} gap={S.md}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, sold && { color: C.textDim }]} numberOfLines={2}>
              {drop.title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {drop.subtitle}
            </Text>
          </View>
          <Text style={[styles.price, sold && { color: C.textDim, textDecorationLine: "line-through" }]}>{priceLabel(drop.priceGbp)}</Text>
        </Row>

        {state.target ? (
          <Row style={styles.foot} gap={S.md}>
            <View style={{ flex: 1 }}>
              <Text style={styles.small}>{state.sub}</Text>
              <Text style={styles.count}>{countdownText(state.target, now)}</Text>
            </View>
            {showReminder ? <ReminderButton on={drop.reminder} disabled={reminderBusy} onPress={onToggleReminder} /> : null}
          </Row>
        ) : drop.status === "live" ? (
          <View style={[styles.foot, { gap: 10 }]}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={styles.small}>{state.headline}</Text>
              {drop.reservation ? <Text style={styles.small}>Reserved</Text> : null}
            </Row>
            <ProgressBar value={left} height={4} />
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}

export const DropCardSkeleton = () => (
  <View style={[styles.card, { marginBottom: S.lg }]}>
    <Skeleton height={220} radius={0} />
    <View style={{ padding: S.lg, gap: S.sm }}>
      <Skeleton width="60%" height={20} />
      <Skeleton width="40%" height={12} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: R.lg, overflow: "hidden", marginBottom: S.lg },
  cover: { height: 220 },
  pills: { position: "absolute", top: S.lg, left: S.lg },
  body: { padding: S.lg },
  title: { color: C.text, fontFamily: F.display, fontSize: 22, lineHeight: 26, letterSpacing: -0.4 },
  subtitle: { color: C.textDim, fontSize: 13, marginTop: 4 },
  price: { color: C.text, fontFamily: F.display, fontSize: 22, letterSpacing: -0.4 },
  foot: { marginTop: S.lg, paddingTop: S.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
  small: { color: C.textDim, fontSize: 13 },
  count: { color: C.text, fontFamily: F.display, fontSize: 20, letterSpacing: -0.3, marginTop: 2, fontVariant: ["tabular-nums"] },
  bell: { flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: 16, borderRadius: R.full, backgroundColor: C.surfaceHigh },
  bellOn: {},
  bellText: { color: C.text, fontSize: 13, fontWeight: "600" },
});
