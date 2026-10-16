// The launch (.r10launch): the open O draws itself in, the dot springs into
// the gap, then OUTHERE, GET OUTSIDE and how many are out right now, on the
// launch light with its three faint rings and grain. It plays once when the
// app opens at its front door and fades into whatever is underneath. Deep
// links skip it, and so does reduced motion. Signed out, the front door is
// the welcome page, which plays this same stage (LaunchStage) as its first
// beat and lifts the mark up into its own corner.

import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { usePathname } from "expo-router";
import { MotiView } from "moti";
import { Easing, useReducedMotion } from "react-native-reanimated";
import { useOutsideCount, useProfile } from "@/data/hooks";
import { formatNumber } from "@/utils/format";
import { GlowBackdrop } from "./GlowBackdrop";
import { Grain } from "./Grain";
import { Logo } from "./Logo";
import { LiveDot } from "./motion";
import { C, F, R } from "./tokens";

const SHOW_MS = 1900;
const FADE_MS = 420;
export const LAUNCH = { show: SHOW_MS, lift: 720, mark: 150 };

/**
 * The stage. count and where make the pill ("1,284 out in London now").
 * lifting fades the stage out; with `to` ({ x, y, size }) the mark flies to
 * that spot and shrinks to that size as it goes, so a page can take over.
 */
export function LaunchStage({ count, where = "the UK", lifting = false, to }) {
  const { width, height } = useWindowDimensions();
  const MARK = LAUNCH.mark;
  const cx = width / 2;
  const cy = height * 0.42;
  const fly = lifting && to ? { translateX: to.x + to.size / 2 - cx, translateY: to.y + to.size / 2 - cy, scale: to.size / MARK, opacity: 0 } : { translateX: 0, translateY: 0, scale: 1, opacity: lifting ? 0 : 1 };
  return (
    <View pointerEvents={lifting ? "none" : "auto"} style={StyleSheet.absoluteFill} accessibilityLabel="Outhere">
      <MotiView from={{ opacity: 1 }} animate={{ opacity: lifting ? 0 : 1 }} transition={{ type: "timing", duration: to ? LAUNCH.lift : FADE_MS, easing: Easing.bezier(0.2, 0.6, 0.2, 1) }} style={StyleSheet.absoluteFill}>
        <GlowBackdrop preset="launch" />
        {/* .rings: box-shadow bands of 40px at .02, .012 and .008 round a 170 circle */}
        {[410, 330, 250].map((d, i) => (
          <View key={d} style={[styles.ring, { width: d, height: d, borderRadius: d / 2, marginLeft: -d / 2, marginTop: -d / 2, top: cy, borderColor: `rgba(255,255,255,${[0.008, 0.012, 0.02][i]})` }]} />
        ))}
        <Grain amount={0.07} />
        <MotiView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: lifting ? 0 : 1, translateY: 0 }}
          transition={{ type: "timing", duration: lifting ? 240 : 420, delay: lifting ? 0 : 900 }}
          style={[styles.words, { top: cy + MARK / 2 + 24 }]}
        >
          <Text style={styles.word}>OUTHERE</Text>
          <Text style={styles.tag}>GET OUTSIDE</Text>
        </MotiView>
        {count ? (
          <MotiView from={{ opacity: 0 }} animate={{ opacity: lifting ? 0 : 1 }} transition={{ type: "timing", duration: lifting ? 240 : 380, delay: lifting ? 0 : 1150 }} style={styles.foot}>
            <View style={styles.pill}>
              <LiveDot size={7} />
              <Text style={styles.pillText}>
                {formatNumber(count)} out in {where} now
              </Text>
            </View>
          </MotiView>
        ) : null}
      </MotiView>
      <MotiView
        from={{ translateX: 0, translateY: 0, scale: 1, opacity: 1 }}
        animate={fly}
        transition={{ type: "timing", duration: LAUNCH.lift, easing: Easing.bezier(0.6, 0, 0.2, 1), opacity: { type: "timing", duration: to ? 160 : FADE_MS, delay: to ? LAUNCH.lift - 160 : 0 } }}
        style={[styles.mark, { width: MARK, height: MARK, left: cx - MARK / 2, top: cy - MARK / 2 }]}
      >
        <Logo size={MARK} animate />
      </MotiView>
    </View>
  );
}

export default function LaunchScreen() {
  const path = usePathname();
  const reduce = useReducedMotion();
  const { data: profile } = useProfile();
  // Decided once, on the first render: only a signed in cold open at the
  // front door plays it here (signed out, welcome.jsx plays it).
  const [play] = useState(() => !reduce && (!path || path === "/") && !!profile);
  const [phase, setPhase] = useState(play ? "on" : "gone");
  const count = useOutsideCount(profile?.cityId || null).data?.count;
  const where = profile?.cityId ? profile.city : "the UK";

  useEffect(() => {
    if (!play) return undefined;
    const fade = setTimeout(() => setPhase("fading"), SHOW_MS);
    const gone = setTimeout(() => setPhase("gone"), SHOW_MS + FADE_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(gone);
    };
  }, [play]);

  if (phase === "gone") return null;
  return (
    <View pointerEvents={phase === "on" ? "auto" : "none"} style={styles.screen}>
      <LaunchStage count={count} where={where} lifting={phase === "fading"} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFillObject, zIndex: 50 },
  ring: { position: "absolute", left: "50%", borderWidth: 40 },
  mark: { position: "absolute" },
  words: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  word: { color: C.text, fontFamily: F.display, fontSize: 30, letterSpacing: 3 },
  // .r10launch .tag: 600 10px, .24em, muted
  tag: { color: C.textDim, fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 2.4, marginTop: 24 },
  foot: { position: "absolute", bottom: 46, left: 0, right: 0, alignItems: "center" },
  // .oh-chip.glass.live
  pill: { flexDirection: "row", alignItems: "center", gap: 8, height: 34, paddingHorizontal: 14, borderRadius: R.full, backgroundColor: "rgba(255,255,255,0.08)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)" },
  pillText: { color: C.text, fontFamily: F.bodySemi, fontSize: 13 },
});
