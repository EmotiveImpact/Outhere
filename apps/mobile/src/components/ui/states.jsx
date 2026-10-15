// App states any screen can use: something went wrong (with the promise that
// steps are safe and one button to try again) and the offline banner with
// what is waiting to sync.

import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotiView } from "moti";
import { RotateCcw, Route, WifiOff } from "lucide-react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { PressableScale } from "./motion";
import { C, F, LIT, R, S } from "./tokens";

const formatNumber = (n) => Math.round(Number(n) || 0).toLocaleString("en-GB");

/**
 * "Couldn't load your crew": a dark slab with a red kicker and the two-tone
 * headline, a line saying the member's steps are safe, Try again, and a
 * card showing steps still counting on the phone.
 * what: the thing that failed, e.g. "your crew". steps: today's steps, or null.
 */
// A soft blue light in the top right of the slab.
const Glow = () => (
  <Svg pointerEvents="none" width={420} height={420} style={{ position: "absolute", right: -120, top: -60 }}>
    <Defs>
      <RadialGradient id="errorGlow" cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor="#3d8bff" stopOpacity={0.42} />
        <Stop offset="0.45" stopColor="#2a5fc0" stopOpacity={0.19} />
        <Stop offset="1" stopColor="#0d1524" stopOpacity={0} />
      </RadialGradient>
    </Defs>
    <Circle cx={210} cy={210} r={210} fill="url(#errorGlow)" />
  </Svg>
);

export function ErrorState({ what = "this", body, steps, onRetry, retrying = false, right, bleed = true, style }) {
  const insets = useSafeAreaInsets();
  const padTop = bleed ? insets.top : 0;
  return (
    <View style={style}>
      <View style={[styles.slab, { paddingTop: padTop + 120 }]}>
        <LinearGradient colors={["#0d1524", "#080b11"]} style={StyleSheet.absoluteFill} />
        <Glow />
        {right ? <View style={[styles.right, { top: padTop + S.sm }]}>{right}</View> : null}
        <Text style={styles.kicker}>Something went wrong</Text>
        <Text style={styles.headline}>Couldn't load</Text>
        <Text style={[styles.headline, { color: C.accent }]} numberOfLines={2} adjustsFontSizeToFit>
          {what}
        </Text>
      </View>
      <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg, gap: S.lg }}>
        <Text style={styles.body}>{body || "Our side had a wobble. Your steps and runs are safe on your phone and will sync once we're back."}</Text>
        <PressableScale onPress={onRetry} disabled={retrying} scaleTo={0.97} accessibilityLabel="Try again" style={styles.retry}>
          <LinearGradient colors={[C.accent, C.accentDeep]} style={[StyleSheet.absoluteFill, { borderRadius: R.full }]} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, zIndex: 1 }}>
            {retrying ? <ActivityIndicator color="#fff" /> : <RotateCcw size={18} color="#fff" strokeWidth={2.2} />}
            <Text style={styles.retryText}>Try again</Text>
          </View>
        </PressableScale>
        <StillCounting steps={steps} />
      </View>
    </View>
  );
}

/** Small card: the phone keeps counting whatever the network does. */
export function StillCounting({ steps, style }) {
  return (
    <View style={[styles.card, styles.counting, style]}>
      <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { borderRadius: R.lg }]} />
      <View style={styles.countIcon}>
        <Route size={20} color={C.accentHi} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>Still counting</Text>
        <Text style={styles.cardSub}>{steps != null ? `${formatNumber(steps)} steps saved today` : "Your steps save on this phone"}</Text>
      </View>
    </View>
  );
}

/** The amber "You're offline" banner. */
export function OfflineBanner({ title = "You're offline", body = "Everything still counts. It syncs when you're back.", style }) {
  return (
    <MotiView from={{ opacity: 0, translateY: -8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: "timing", duration: 260 }} style={[styles.banner, style]}>
      <View style={styles.bannerIcon}>
        <WifiOff size={18} color={C.bg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.bannerTitle}>{title}</Text>
        <Text style={styles.bannerBody}>{body}</Text>
      </View>
    </MotiView>
  );
}

/**
 * What is waiting for the signal: [{ key, icon, title, sub }]. Each row has a
 * small spinner so it reads as queued, not lost.
 */
export function SyncList({ items = [], title = "Waiting to sync", style }) {
  if (!items.length) return null;
  return (
    <View style={style}>
      <View style={styles.syncHead}>
        <Text style={styles.syncTitle}>{title}</Text>
        <Text style={styles.syncCount}>{items.length === 1 ? "1 item" : `${items.length} items`}</Text>
      </View>
      <View style={styles.card}>
        <LinearGradient colors={LIT} style={[StyleSheet.absoluteFill, { borderRadius: R.lg }]} />
        {items.map(({ key, icon: Icon, title: t, sub }, i) => (
          <View key={key} style={[styles.syncRow, i > 0 && styles.syncSep]}>
            {Icon ? <Icon size={18} color={C.textDim} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>{t}</Text>
              {sub ? <Text style={styles.cardSub} numberOfLines={1}>{sub}</Text> : null}
            </View>
            <ActivityIndicator size="small" color={C.accent} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slab: { backgroundColor: "#0b0e13", borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: "hidden", paddingHorizontal: S.gutter, paddingBottom: S.xl },
  right: { position: "absolute", right: S.gutter, flexDirection: "row", gap: S.sm },
  kicker: { color: C.danger, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase", marginBottom: 6 },
  headline: { color: C.text, fontFamily: F.display, fontSize: 46, lineHeight: 46, textTransform: "uppercase" },
  body: { color: C.textDim, fontFamily: F.body, fontSize: 14, lineHeight: 21 },
  retry: { height: 54, borderRadius: R.full, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, shadowColor: C.accent, shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  retryText: { color: "#fff", fontFamily: F.bodySemi, fontSize: 16 },
  card: { borderRadius: R.lg, backgroundColor: C.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.hairlineTop, overflow: "hidden" },
  counting: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.lg },
  countIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(61,139,255,0.14)", borderWidth: 1, borderColor: "rgba(61,139,255,0.35)", alignItems: "center", justifyContent: "center" },
  cardTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  cardSub: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: 2 },
  banner: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.lg, borderRadius: R.lg, backgroundColor: "rgba(255,181,71,0.10)", borderWidth: 1, borderColor: "rgba(255,181,71,0.35)" },
  bannerIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.warn, alignItems: "center", justifyContent: "center" },
  bannerTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  bannerBody: { color: C.textDim, fontFamily: F.body, fontSize: 12, marginTop: 2, lineHeight: 17 },
  syncHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: S.sm },
  syncTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 15 },
  syncCount: { color: C.textDim, fontFamily: F.body, fontSize: 12 },
  syncRow: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: 14, paddingHorizontal: S.lg },
  syncSep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
});
