// The screen hero (.oh-slab): a dark slab lit blue from the upper right,
// with a kicker and a two-tone headline, rounded at the bottom and lit along
// its lower edge. One per screen. Pass `photo` for a full bleed photograph
// (darkened at the top, faded at the bottom, slow push in), or `object` for a
// 3D object that floats on the right with its black dropped out. Both get
// film grain.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlendImage } from "./BlendImage";
import { GlowBackdrop } from "./GlowBackdrop";
import { Grain } from "./Grain";
import { PhotoBackground } from "./PhotoBackground";
import { C, F, FINISH, S, splitShadow } from "./tokens";

const RADIUS = 34; // --radius-slab
const EDGE = splitShadow(FINISH.slabEdge);

/**
 * photo or object: the picture (focus: the { x, y } of the photo to keep in frame). objectSize (px, default 92% of the height)
 * and objectStyle place the object; objectLeft puts the light and object on
 * the left. kicker, top, bottom (the blue line), sub: the headline block.
 * right: controls at the top right. bleed: runs up under the status bar.
 * card: rounded on all four corners, for a hero inside a page.
 */
export function Hero({ photo, focus, object, objectSize, objectStyle, objectLeft = false, kicker, top, bottom, sub, height = 260, bleed = true, card = false, children, right, style }) {
  const insets = useSafeAreaInsets();
  const padTop = bleed && !card ? insets.top : 0;
  const size = objectSize || height * 0.92;
  const radius = card ? { borderRadius: RADIUS } : { borderBottomLeftRadius: RADIUS, borderBottomRightRadius: RADIUS };
  const place = objectLeft ? { left: -30 } : { right: -30 };
  return (
    <View style={[radius, { boxShadow: EDGE.outer }, style]}>
      <View style={[styles.slab, radius, { height: height + padTop, paddingTop: padTop }]}>
        {photo ? (
          <PhotoBackground source={photo} focus={focus} fade="slab" to="2,5,12" kenBurns grain={0} />
        ) : (
          <GlowBackdrop preset={objectLeft ? "slabLeft" : "slab"} />
        )}
        {object && !photo ? (
          <BlendImage source={object} size={size} float glow={260} style={[styles.object, place, { top: padTop + (height - size) / 2 - height * 0.04 }, objectStyle]} />
        ) : null}
        <Grain amount={0.06} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, radius, { boxShadow: EDGE.inset }]} />
        {right ? <View style={[styles.right, { top: padTop + S.sm }]}>{right}</View> : null}
        <View style={styles.text}>
          {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
          {top ? (
            <Text style={styles.headline} numberOfLines={2} adjustsFontSizeToFit>
              {top}
            </Text>
          ) : null}
          {bottom ? (
            <Text style={[styles.headline, styles.two]} numberOfLines={2} adjustsFontSizeToFit>
              {bottom}
            </Text>
          ) : null}
          {sub ? <Text style={styles.sub}>{sub}</Text> : null}
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slab: { backgroundColor: FINISH.slab.base, overflow: "hidden", justifyContent: "flex-end" },
  object: { position: "absolute" },
  right: { position: "absolute", right: S.gutter, flexDirection: "row", gap: S.sm },
  text: { paddingHorizontal: S.gutter, paddingBottom: S.xl + 4 },
  // .oh-slab .hl .oh-kick: blue-hi
  kicker: { color: C.accentHi, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase", marginBottom: 8 },
  // .oh-slab .hl .oh-display: text-shadow 0 2px 30px rgba(0,0,0,.6)
  headline: { color: C.text, fontFamily: F.display, fontSize: 50, lineHeight: 48, textTransform: "uppercase", textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 30, textShadowOffset: { width: 0, height: 2 } },
  // .oh-display .oh-two: blue with a soft glow
  two: { color: C.accent, textShadowColor: "rgba(61,139,255,0.35)", textShadowRadius: 28, textShadowOffset: { width: 0, height: 0 } },
  sub: { color: "rgba(255,255,255,0.78)", fontFamily: F.body, fontSize: 14, lineHeight: 20, marginTop: 10, maxWidth: 300 },
});
