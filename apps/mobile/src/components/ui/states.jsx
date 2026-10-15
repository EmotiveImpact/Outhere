// App states any screen can use: something went wrong (with the promise that
// steps are safe and one button to try again) and the offline banner with
// what is waiting to sync.

import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotiView } from "moti";
import { RotateCcw, Route, WifiOff } from "lucide-react-native";
import { PHOTOS } from "@/constants/photos";
import { BlendImage } from "./BlendImage";
import { GlowBackdrop } from "./GlowBackdrop";
import { GlowButton } from "./GlowButton";
import { Grain } from "./Grain";
import { IconTile, Surface } from "./Surface";
import { C, F, FINISH, R, S, splitShadow } from "./tokens";

const SLAB_EDGE = splitShadow(FINISH.slabEdge);

const formatNumber = (n) => Math.round(Number(n) || 0).toLocaleString("en-GB");

/**
 * "Couldn't load your crew": the hero slab with the phone object, a red
 * kicker and the two-tone headline, a line saying the member's steps are
 * safe, Try again, and a card showing steps still counting on the phone.
 * what: the thing that failed, e.g. "your crew". steps: today's steps, or null.
 */
export function ErrorState({ what = "this", body, steps, onRetry, retrying = false, right, bleed = true, style }) {
  const insets = useSafeAreaInsets();
  const padTop = bleed ? insets.top : 0;
  return (
    <View style={style}>
      {/* .slab with the phone, greyed a little: the app is fine, the network isn't */}
      <View style={[styles.slabWrap, { boxShadow: SLAB_EDGE.outer }]}>
        <View style={[styles.slab, { height: padTop + 286 }]}>
          <GlowBackdrop preset="slab" />
          <BlendImage source={PHOTOS.phone} size={206} grey={0.5} float style={{ position: "absolute", right: -40, top: padTop - 14 }} />
          <Grain amount={0.06} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.slabRadius, { boxShadow: SLAB_EDGE.inset }]} />
          {right ? <View style={[styles.right, { top: padTop + S.sm }]}>{right}</View> : null}
          <View style={styles.hl}>
            <Text style={styles.kicker}>Something went wrong</Text>
            <Text style={styles.headline}>Couldn't load</Text>
            <Text style={[styles.headline, styles.two]} numberOfLines={2} adjustsFontSizeToFit>
              {what}
            </Text>
          </View>
        </View>
      </View>
      <View style={{ paddingHorizontal: S.gutter, paddingTop: S.lg, gap: S.md }}>
        <Text style={styles.body}>{body || "Our side had a wobble. Your steps and runs are safe on your phone and will sync once we're back."}</Text>
        <GlowButton title="Try again" icon={RotateCcw} onPress={onRetry} loading={retrying} full />
        <StillCounting steps={steps} />
      </View>
    </View>
  );
}

/** Small card: the phone keeps counting whatever the network does. */
export function StillCounting({ steps, style }) {
  return (
    <Surface style={style} contentStyle={styles.counting}>
      <IconTile icon={Route} />
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>Still counting</Text>
        <Text style={styles.cardSub}>{steps != null ? `${formatNumber(steps)} steps saved today` : "Your steps save on this phone"}</Text>
      </View>
    </Surface>
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
      <Surface padding={0}>
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
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  slabWrap: { borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  slab: { backgroundColor: FINISH.slab.base, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: "hidden", justifyContent: "flex-end" },
  slabRadius: { borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  hl: { paddingHorizontal: S.gutter, paddingBottom: 24 },
  right: { position: "absolute", right: S.gutter, flexDirection: "row", gap: S.sm },
  // a soft red, so it reads as a wobble rather than an alarm (#ff8b95)
  kicker: { color: "#ff8b95", fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase", marginBottom: 8 },
  headline: { color: C.text, fontFamily: F.display, fontSize: 49, lineHeight: 46, textTransform: "uppercase", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 30, textShadowOffset: { width: 0, height: 2 } },
  two: { color: C.accent, textShadowColor: "rgba(61,139,255,0.35)", textShadowRadius: 28, textShadowOffset: { width: 0, height: 0 } },
  body: { color: C.textDim, fontFamily: F.body, fontSize: 14, lineHeight: 21 },
  counting: { flexDirection: "row", alignItems: "center", gap: S.md, padding: S.lg },
  // .oh-tile: the small blue icon square
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
