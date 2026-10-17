// App states any screen can use: something went wrong (with the promise that
// steps are safe and one button to try again) and the offline banner with
// what is waiting to sync.

import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotiView } from "moti";
import { RotateCcw, Route, WifiOff } from "@/components/ui/icons";
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
      <View style={{ paddingHorizontal: 18, paddingTop: 16, gap: 12 }}>
        <Text style={styles.body}>{body || "Our side had a wobble. Your steps and runs are safe on your phone and will sync once we're back."}</Text>
        <GlowButton title="Try again" icon={RotateCcw} onPress={onRetry} loading={retrying} full style={{ height: 52 }} />
        <StillCounting steps={steps} />
      </View>
    </View>
  );
}

/** Small card: the phone keeps counting whatever the network does. */
export function StillCounting({ steps, style }) {
  return (
    <Surface style={style} radius={20} padding={null} contentStyle={styles.counting}>
      <IconTile icon={Route} size={38} iconSize={17} />
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
        <WifiOff size={15} color="#1a1206" />
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
      <Surface radius={20} padding={null} contentStyle={styles.syncList}>
        {items.map(({ key, icon: Icon, title: t, sub }, i) => (
          <View key={key} style={[styles.syncRow, i > 0 && styles.syncSep]}>
            {Icon ? (
              <View>
                <Icon size={18} color={C.textDim} />
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.syncName} numberOfLines={1}>{t}</Text>
              {sub ? <Text style={styles.syncSub} numberOfLines={1}>{sub}</Text> : null}
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
  body: { color: C.textDim, fontFamily: F.body, fontSize: 13, lineHeight: 19.5 },
  // .nudge: 12 down, 14 in, a 38 icon tile
  counting: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 12, paddingBottom: 12, paddingLeft: 14, paddingRight: 14 },
  cardTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  cardSub: { color: C.textDim, fontFamily: F.body, fontSize: 11, marginTop: 2 },
  // .offbar: amber tinted card with an amber ring and a solid amber icon
  banner: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 18, backgroundColor: "#2a2219", boxShadow: "inset 0 0 0 1px rgba(255,179,92,0.4)" },
  bannerIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#ffb35c", alignItems: "center", justifyContent: "center" },
  bannerTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  bannerBody: { color: C.textDim, fontFamily: F.body, fontSize: 10.5, marginTop: 2, lineHeight: 14 },
  syncHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 },
  syncTitle: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
  syncCount: { color: C.textDim, fontFamily: F.body, fontSize: 11 },
  syncList: { paddingLeft: 14, paddingRight: 14 },
  syncRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  syncName: { color: C.text, fontFamily: F.body, fontSize: 13 },
  syncSub: { color: C.textDim, fontFamily: F.body, fontSize: 10.5, marginTop: 2 },
  syncSep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border },
});
