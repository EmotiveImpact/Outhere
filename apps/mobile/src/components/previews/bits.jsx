// Small pieces shared by the watch, widget and lock screen previews: a
// progress ring, the OUT coin, a phone-shaped frame and frosted glass.

import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { C, F } from "@/components/ui";

/** A ring that fills clockwise from the top. */
export function ArcRing({ size, stroke, pct = 0, track = C.surfaceHigh, colour = C.accent, children, style }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      <Svg width={size} height={size} style={[StyleSheet.absoluteFill, { transform: [{ rotate: "-90deg" }] }]}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {p > 0 ? (
          <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colour} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - p)} />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}

/** The OUT coin: a lit blue disc with an O on it. */
export function OutCoin({ size = 16 }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="coin" cx="35%" cy="30%" r="75%">
            <Stop offset="0" stopColor="#b8d3ff" />
            <Stop offset="0.45" stopColor="#3d8bff" />
            <Stop offset="1" stopColor="#0d2c6b" />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#coin)" />
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 0.75} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} />
      </Svg>
      <Text style={{ color: "#fff", fontFamily: F.display, fontSize: size * 0.56, lineHeight: size * 0.62 }}>O</Text>
    </View>
  );
}

/**
 * The whole screen as the lock or home screen, the way the prototype shows it:
 * no frame, no rounded corners, just the picture filling the page.
 */
export function PhoneFrame({ children, style, testID }) {
  return (
    <View style={[styles.phone, style]} testID={testID}>
      {children}
      <View style={styles.homeBar} />
    </View>
  );
}

// Frosted glass: blurred on the web, a deeper tint elsewhere.
const BLUR = Platform.OS === "web" ? (px) => ({ backdropFilter: `blur(${px}px)`, WebkitBackdropFilter: `blur(${px}px)` }) : () => null;

export function Glass({ children, tint = "rgba(14,20,32,0.5)", blur = 22, edge = true, style }) {
  return <View style={[{ backgroundColor: tint }, BLUR(blur), edge && styles.edge, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  phone: { flex: 1, alignSelf: "stretch", overflow: "hidden", backgroundColor: C.bg },
  homeBar: { position: "absolute", bottom: 8, alignSelf: "center", width: 112, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.55)" },
  edge: { borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
});
