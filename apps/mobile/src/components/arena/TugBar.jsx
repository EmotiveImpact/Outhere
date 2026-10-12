// Tug of war bar: my share of the combined score pulls from the left in green,
// the rival pulls from the right in their colour. The knot eases to the split.

import React, { useEffect } from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { C } from "@/components/ui";
import { RIVAL } from "./shared";

export function TugBar({ mine = 0, theirs = 0, height = 8, rival = RIVAL, knot = true, style }) {
  const total = mine + theirs;
  const share = total > 0 ? Math.max(0.04, Math.min(0.96, mine / total)) : 0.5;
  const s = useSharedValue(0.5);
  useEffect(() => {
    s.value = withTiming(share, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [share, s]);
  const left = useAnimatedStyle(() => ({ width: `${s.value * 100}%` }));
  const knotPos = useAnimatedStyle(() => ({ left: `${s.value * 100}%` }));
  const knotSize = height + 8;

  return (
    <View style={[{ height: knotSize, justifyContent: "center" }, style]}>
      <View style={{ height, borderRadius: height, overflow: "hidden", flexDirection: "row", backgroundColor: `${rival}55` }}>
        <Animated.View style={[{ height: "100%" }, left]}>
          <LinearGradient colors={["rgba(0,255,127,0.55)", C.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </Animated.View>
        <LinearGradient colors={[rival, `${rival}99`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
      </View>
      {/* Halfway mark */}
      <View style={{ position: "absolute", left: "50%", marginLeft: -1, width: 2, height: knotSize, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.18)" }} />
      {knot ? (
        <Animated.View
          style={[
            {
              position: "absolute",
              width: knotSize,
              height: knotSize,
              marginLeft: -knotSize / 2,
              borderRadius: knotSize,
              backgroundColor: C.text,
              borderWidth: 3,
              borderColor: C.bg,
              shadowColor: "#000",
              shadowOpacity: 0.5,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            },
            knotPos,
          ]}
        />
      ) : null}
    </View>
  );
}

export default TugBar;
