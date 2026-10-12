import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { C, F } from "@/components/ui";
import { hapticSelection } from "@/services/haptics";

const SPRING = { damping: 20, stiffness: 260, mass: 0.7 };

/**
 * Sub tab switcher with a sliding pill. options: [{ value, label, icon }].
 * `colour` tints the pill (the crew accent), `activeText` colours its label.
 */
export default function CrewTabs({ options, value, onChange, colour = C.accent, activeText = C.accentText, style }) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(0);
  const item = width ? (width - 10) / options.length : 0;

  useEffect(() => {
    if (item) x.value = withSpring(index * item, SPRING);
  }, [index, item, x]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View style={[styles.wrap, style]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {item ? <Animated.View style={[styles.pill, { width: item, backgroundColor: colour }, pill]} /> : null}
      {options.map((o) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              hapticSelection();
              onChange(o.value);
            }}
            style={styles.item}
          >
            {Icon && active ? <Icon size={15} color={active ? activeText : C.textDim} strokeWidth={2.4} /> : null}
            <Text style={[styles.text, active && { color: activeText }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", backgroundColor: C.surface, borderRadius: 99, padding: 4, borderWidth: 1, borderColor: C.border },
  pill: { position: "absolute", top: 4, left: 4, bottom: 4, borderRadius: 99 },
  item: { flex: 1, height: 38, flexDirection: "row", gap: 5, alignItems: "center", justifyContent: "center" },
  text: { color: C.textDim, fontSize: 13, fontFamily: F.displayMedium, letterSpacing: 0.2 },
});
