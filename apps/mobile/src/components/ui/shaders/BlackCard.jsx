// The Black membership card as a card: brushed gunmetal with the Sheen
// sweeping across it, the mark top left, BLACK bottom left and the member's
// name and founding number bottom right. Drawn at any size, so it is the
// same card as a thumbnail on the plan picker, fanned behind a headline or
// arriving full size on Welcome to Black.
//
//   <BlackCard width={300} name="Alex Morgan" number={212} />
//   <BlackCard width={92} />                                  a thumbnail

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Logo } from "../Logo";
import { C, F } from "../tokens";
import { Sheen } from "./Sheen";

const RATIO = 0.63; // a bank card

export function BlackCard({ width = 300, name, number, speed = 1, intensity = 1, tilt = 0, glow = true, style }) {
  const height = Math.round(width * RATIO);
  const r = Math.max(6, Math.round(width * 0.055));
  const pad = Math.round(width * 0.065);
  const small = width < 160;
  return (
    <View style={[{ width, height, borderRadius: r }, glow ? { boxShadow: `0 ${Math.round(width * 0.08)}px ${Math.round(width * 0.18)}px -${Math.round(width * 0.06)}px rgba(0,0,0,0.85), 0 0 ${Math.round(width * 0.2)}px -${Math.round(width * 0.08)}px rgba(130,180,255,0.35)` } : null, tilt ? { transform: [{ rotate: `${tilt}deg` }] } : null, style]}>
      <Sheen tone="black" radius={r} speed={speed} intensity={intensity} style={{ width, height }}>
        {/* the edge: a bright hairline top left, the blue lit edge bottom right */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: r, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1px rgba(255,255,255,0.1), inset 0 -1px 0 rgba(61,139,255,0.45)" }]} />
        <View style={{ flex: 1, padding: pad, justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Logo size={small ? Math.round(width * 0.11) : Math.round(width * 0.09)} />
            {!small ? <Text style={[styles.cap, { fontSize: Math.max(8, width * 0.03) }]}>Outhere</Text> : null}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
            <Text style={[styles.black, { fontSize: small ? width * 0.12 : width * 0.11 }]}>Black</Text>
            {!small && (name || number) ? (
              <View style={{ alignItems: "flex-end" }}>
                {name ? (
                  <Text style={[styles.name, { fontSize: Math.max(9, width * 0.036) }]} numberOfLines={1}>
                    {name}
                  </Text>
                ) : null}
                {number ? <Text style={[styles.cap, { fontSize: Math.max(8, width * 0.028), marginTop: 2 }]}>Founding #{number}</Text> : null}
              </View>
            ) : null}
          </View>
        </View>
      </Sheen>
    </View>
  );
}

const styles = StyleSheet.create({
  cap: { color: "rgba(226,232,240,0.7)", fontFamily: F.bodySemi, letterSpacing: 1.8, textTransform: "uppercase" },
  black: { color: "#eef2f7", fontFamily: F.display, textTransform: "uppercase", letterSpacing: 1, textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 } },
  name: { color: C.text, fontFamily: F.bodyMedium },
});
