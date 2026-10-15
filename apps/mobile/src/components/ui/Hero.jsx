// The screen hero: a dark slab with its own picture, a kicker and a two-tone
// headline, rounded at the bottom. One per screen. Pass `photo` for a full
// bleed photograph, or `object` for a 3D object set on the right.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, S } from "./tokens";

export function Hero({ photo, object, kicker, top, bottom, sub, height = 260, bleed = true, children, right, style }) {
  const insets = useSafeAreaInsets();
  const padTop = bleed ? insets.top : 0;
  return (
    <View style={[styles.slab, { height: height + padTop, paddingTop: padTop }, style]}>
      {photo ? <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
      {object ? (
        <Image source={object} style={[styles.object, { width: height * 0.92, height: height * 0.92, top: padTop + height * 0.02 }]} contentFit="contain" />
      ) : null}
      <LinearGradient
        colors={photo ? ["rgba(7,9,12,0.35)", "rgba(7,9,12,0.15)", "rgba(7,9,12,0.92)"] : ["#0d1118", "#07090c"]}
        locations={photo ? [0, 0.4, 1] : [0, 1]}
        style={[StyleSheet.absoluteFill, object && !photo ? { opacity: 0.0 } : null]}
      />
      {object && !photo ? <LinearGradient colors={["rgba(7,9,12,0)", "rgba(7,9,12,0.85)"]} start={{ x: 0.3, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
      {right ? <View style={[styles.right, { top: padTop + S.sm }]}>{right}</View> : null}
      <View style={styles.text}>
        {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
        {top ? (
          <Text style={styles.headline} numberOfLines={2} adjustsFontSizeToFit>
            {top}
          </Text>
        ) : null}
        {bottom ? (
          <Text style={[styles.headline, { color: C.accent }]} numberOfLines={2} adjustsFontSizeToFit>
            {bottom}
          </Text>
        ) : null}
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slab: {
    backgroundColor: "#0b0e13",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  object: { position: "absolute", right: -30 },
  right: { position: "absolute", right: S.gutter, flexDirection: "row", gap: S.sm },
  text: { paddingHorizontal: S.gutter, paddingBottom: S.xl },
  kicker: { color: C.accent, fontFamily: F.bodySemi, fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase", marginBottom: 6 },
  headline: { color: C.text, fontFamily: F.display, fontSize: 50, lineHeight: 50, textTransform: "uppercase" },
  sub: { color: C.textSoft, fontFamily: F.body, fontSize: 14, lineHeight: 20, marginTop: 8, maxWidth: 320 },
});
