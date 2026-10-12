import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Bell, BellRing, Check, Crown } from "lucide-react-native";
import { C, Cover, F, Pill, PressableScale, ProgressBar, R, Row, S, Skeleton } from "@/components/ui";
import { formatNumber } from "@/utils/format";
import { CountdownBoxes, LivePill, priceLabel } from "./shared";

const HOUR = 3_600_000;

// Each drop gets its own colourway for the cover art.
const DROP_ACCENTS = { d_nightshift: "#9B5CFF", d_tee: "#00ff7f", d_bottle: "#3DA9FC", d_windbreaker: "#FF6B35" };
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
      return { pill: { label: "SOLD OUT", tone: "danger" }, headline: "Sold out", target: null };
    case "live":
      return { pill: { label: "LIVE", tone: "accent" }, headline: `${formatNumber(drop.remaining)} of ${formatNumber(drop.stock)} left`, target: null };
    case "early":
      return drop.hasEarlyAccess
        ? { pill: { label: "EARLY ACCESS", tone: "pro" }, headline: "Your early access is open", sub: "Public release in", target: drop.releaseAt }
        : { pill: { label: "MEMBERS ONLY", tone: "pro" }, headline: "Pro and Black are shopping now", sub: "Opens to everyone in", target: drop.releaseAt };
    default:
      return drop.hasEarlyAccess
        ? { pill: { label: "UPCOMING", tone: "neutral" }, headline: `You get in ${hrs}h before everyone else`, sub: "Your early access opens in", target: drop.earlyAccessAt }
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

/** Status pills for a drop: state, early access badge, reservation. */
export function DropPills({ drop, style }) {
  const state = dropState(drop);
  const earlyBadge = drop.hasEarlyAccess && (drop.status === "upcoming" || drop.status === "early");
  return (
    <Row gap={6} style={[{ flexWrap: "wrap" }, style]}>
      {drop.status === "live" ? <LivePill label="LIVE NOW" /> : drop.status === "early" && earlyBadge ? null : <Pill {...state.pill} icon={drop.status === "early" ? Crown : undefined} />}
      {earlyBadge ? <Pill label={drop.status === "early" ? "EARLY ACCESS OPEN" : "EARLY ACCESS"} tone="pro" icon={Crown} /> : null}
      {drop.reservation ? <Pill label={`RESERVED ${String(drop.reservation.size).toUpperCase()}`} tone="accent" icon={Check} /> : null}
    </Row>
  );
}

export function ReminderButton({ on, onPress, disabled }) {
  const Icon = on ? BellRing : Bell;
  return (
    <PressableScale disabled={disabled} scaleTo={0.92} onPress={onPress} accessibilityLabel={on ? "Turn reminder off" : "Remind me"} style={[styles.bell, on && styles.bellOn, disabled && { opacity: 0.6 }]}>
      <Icon size={16} color={on ? C.accentText : C.text} />
      <Text style={[styles.bellText, on && { color: C.accentText }]}>{on ? "Reminder on" : "Remind me"}</Text>
    </PressableScale>
  );
}

export default function DropCard({ drop, now, onPress, onToggleReminder, reminderBusy }) {
  const state = dropState(drop);
  const showReminder = drop.status === "upcoming" || (drop.status === "early" && !drop.hasEarlyAccess);
  const left = drop.stock ? drop.remaining / drop.stock : 0;
  const sold = drop.status === "soldout";
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={[styles.card, drop.status === "live" && styles.live]}>
      <Cover source={drop.image} seed={drop.id} accent={dropAccent(drop)} scrim style={styles.cover}>
        {sold ? <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,10,10,0.5)" }]} /> : null}
        <DropPills drop={drop} style={styles.pills} />
        <Row style={styles.bottom}>
          <View style={{ flex: 1, marginRight: S.md }}>
            {drop.tag.toLowerCase() !== "live now" ? <Text style={styles.tag}>{drop.tag}</Text> : null}
            <Text style={[styles.title, sold && { color: C.textDim }]} numberOfLines={2}>
              {drop.title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {drop.subtitle}
            </Text>
          </View>
          <Text style={[styles.price, sold && { color: C.textDim, textDecorationLine: "line-through" }]}>{priceLabel(drop.priceGbp)}</Text>
        </Row>
      </Cover>

      <View style={{ padding: S.lg }}>
        {state.target ? (
          <>
            <Text style={styles.label}>{state.sub}</Text>
            <CountdownBoxes target={state.target} now={now} style={{ marginTop: S.sm }} />
            <Row style={{ justifyContent: "space-between", marginTop: S.md }} gap={S.md}>
              <Text style={[styles.small, { flex: 1 }]} numberOfLines={2}>
                {state.headline}
              </Text>
              {showReminder ? <ReminderButton on={drop.reminder} disabled={reminderBusy} onPress={onToggleReminder} /> : null}
            </Row>
          </>
        ) : drop.status === "live" ? (
          <View style={{ gap: 10 }}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={[styles.small, { color: left < 0.2 ? C.fire : C.text }]}>{state.headline}</Text>
              <Text style={[styles.small, drop.reservation ? { color: C.accent } : null]}>{drop.reservation ? "You're sorted" : "Tap to reserve"}</Text>
            </Row>
            <ProgressBar value={left} height={6} colour={left < 0.2 ? C.fire : C.accent} />
          </View>
        ) : (
          <Text style={styles.small}>All gone. Set a reminder on the next one and you'll be first in.</Text>
        )}
      </View>
    </PressableScale>
  );
}

export const DropCardSkeleton = () => (
  <View style={[styles.card, { marginBottom: S.lg }]}>
    <Skeleton height={280} radius={0} />
    <View style={{ padding: S.lg, gap: S.sm }}>
      <Skeleton width="30%" height={12} />
      <Skeleton width="70%" height={44} radius={12} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: "hidden", marginBottom: S.lg },
  live: { borderColor: "rgba(0,255,127,0.4)" },
  cover: { height: 280 },
  pills: { position: "absolute", top: S.md, left: S.md, right: S.md },
  bottom: { position: "absolute", left: S.lg, right: S.lg, bottom: S.lg, alignItems: "flex-end" },
  tag: { color: C.textDim, fontSize: 11, fontWeight: "800", letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 4 },
  title: { color: C.text, fontFamily: F.display, fontSize: 28, lineHeight: 30, letterSpacing: -0.6, textTransform: "uppercase" },
  subtitle: { color: "#c8c8cc", fontSize: 14, marginTop: 4 },
  price: { color: C.text, fontFamily: F.display, fontSize: 34, letterSpacing: -1 },
  label: { color: C.textMute, fontSize: 11, fontWeight: "700", letterSpacing: 1.1, textTransform: "uppercase" },
  small: { color: C.textDim, fontSize: 13, fontWeight: "600" },
  bell: { flexDirection: "row", alignItems: "center", gap: 6, height: 44, paddingHorizontal: 16, borderRadius: R.full, backgroundColor: C.surfaceHigh, borderWidth: 1, borderColor: C.borderStrong },
  bellOn: { backgroundColor: C.accent, borderColor: C.accent },
  bellText: { color: C.text, fontSize: 13, fontWeight: "700" },
});
