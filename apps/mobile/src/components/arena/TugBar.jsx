// Tug of war bar: my share of the combined score fills from the left in green,
// the rival's share fills from the right in their colour. Eases to the split.

import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { C } from "@/components/ui";
import { RIVAL } from "./shared";

export function TugBar({ mine = 0, theirs = 0, height = 8, rival = RIVAL, knot = false, style }) {
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
    <View style={[{ height: knot ? knotSize : height, justifyContent: "center" }, style]}>
      <View style={{ height, borderRadius: height, overflow: "hidden", flexDirection: "row", backgroundColor: rival }}>
        <Animated.View style={[{ height: "100%", backgroundColor: C.accent, borderRightWidth: 2, borderColor: C.surface }, left]} />
      </View>
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
              borderColor: C.surface,
            },
            knotPos,
          ]}
        />
      ) : null}
    </View>
  );
}

export default TugBar;
