import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { useAnimationState } from "moti";

/**
 * Premium Shimmer component for loading states.
 * @param {number} width - Width of the shimmer box.
 * @param {number} height - Height of the shimmer box.
 * @param {number} borderRadius - Border radius of the shimmer box.
 * @param {string} style - Additional styles for the container.
 */
export default function Shimmer({ width = "100%", height = 20, borderRadius = 8, style }) {
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          overflow: "hidden",
        },
        style,
      ]}
    >
      <MotiView
        from={{
          translateX: -width === "100%" ? 400 : -width,
        }}
        animate={{
          translateX: width === "100%" ? 400 : width,
        }}
        transition={{
          type: "timing",
          duration: 1200,
          loop: true,
          repeatReverse: false,
        }}
        style={StyleSheet.absoluteFill}
      >
        <LinearGradient
          colors={["transparent", "rgba(255, 255, 255, 0.08)", "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </MotiView>
    </View>
  );
}
