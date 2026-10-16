// A blue track with a knob you drag to the end: "Get out there". Let go
// early and it springs back. Screen readers get a plain button instead.

import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { ArrowRight, ChevronRight } from "lucide-react-native";
import { C, F } from "./tokens";
import { haptic } from "@/services/haptics";

const H = 62;
const KNOB = 50;
const PAD = 6;

export function SlideToStart({ label = "Get out there", done = "You're out", onComplete, style }) {
  const [width, setWidth] = useState(0);
  const [finished, setFinished] = useState(false);
  const x = useSharedValue(0);
  const nudge = useSharedValue(0);
  const max = Math.max(0, width - KNOB - PAD * 2);

  React.useEffect(() => {
    nudge.value = withRepeat(withSequence(withTiming(4, { duration: 800, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 800, easing: Easing.inOut(Easing.quad) })), -1, false);
  }, [nudge]);

  const complete = () => {
    setFinished(true);
    haptic.slideEnd();
    onComplete?.();
  };

  const pan = Gesture.Pan()
    .enabled(!finished && max > 0)
    .onChange((e) => {
      x.value = Math.min(max, Math.max(0, x.value + e.changeX));
    })
    .onEnd(() => {
      if (x.value > max * 0.82) {
        x.value = withTiming(max, { duration: 120 });
        runOnJS(complete)();
      } else {
        x.value = withSpring(0, { damping: 16, stiffness: 200 });
      }
    });

  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fade = useAnimatedStyle(() => ({ opacity: max ? interpolate(x.value, [0, max * 0.5], [1, 0], "clamp") : 1 }));
  const chev = useAnimatedStyle(() => ({ transform: [{ translateX: nudge.value }], opacity: max ? interpolate(x.value, [0, max * 0.3], [0.9, 0], "clamp") : 0.9 }));

  return (
    <View
      style={[styles.track, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityActions={[{ name: "activate" }]}
      onAccessibilityAction={complete}
    >
      <Animated.Text style={[styles.label, fade]}>{label}</Animated.Text>
      <Animated.View style={[styles.chev, chev]}>
        <ChevronRight size={18} color="#fff" />
        <ChevronRight size={18} color="rgba(255,255,255,0.55)" style={{ marginLeft: -10 }} />
      </Animated.View>
      {finished ? <Text style={[styles.label, styles.doneLabel]}>{done}</Text> : null}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.knob, knob]} hitSlop={12}>
          <ArrowRight size={20} color="#6aa6ff" />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: H,
    borderRadius: H / 2,
    backgroundColor: C.accent,
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: C.accent,
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  label: { position: "absolute", left: 84, color: "#fff", fontFamily: F.bodySemi, fontSize: 15.5 },
  doneLabel: { left: 0, right: 0, textAlign: "center" },
  chev: { position: "absolute", right: 22, flexDirection: "row" },
  knob: {
    position: "absolute",
    left: PAD,
    top: PAD,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: "#06142e",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
});
