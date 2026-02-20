import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { COLORS, FONTS, SPACING } from '../constants/theme';

interface StepCounterProps {
  steps: number;
  goal: number;
  distance: number;
  onPress?: () => void;
}

export const StepCounter: React.FC<StepCounterProps> = ({
  steps,
  goal,
  distance,
  onPress,
}) => {
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);
  const previousSteps = useRef(steps);

  const percentage = Math.min((steps / goal) * 100, 100);

  useEffect(() => {
    progress.value = withSpring(percentage / 100, {
      damping: 15,
      stiffness: 100,
    });
  }, [percentage]);

  useEffect(() => {
    if (steps > previousSteps.current) {
      scale.value = withSpring(1.02, { damping: 10 }, () => {
        scale.value = withSpring(1);
      });
    }
    previousSteps.current = steps;
  }, [steps]);

  const circleAnimatedStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      progress.value,
      [0, 1],
      [0, 360],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ rotate: `${rotation}deg` }],
    };
  });

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.container, containerAnimatedStyle]}>
        {/* Outer ring */}
        <View style={styles.outerRing}>
          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${percentage}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Inner content */}
        <View style={styles.innerContent}>
          <View style={styles.stepsContainer}>
            <Text style={styles.stepsValue}>
              {steps.toLocaleString()}
            </Text>
            <Text style={styles.stepsLabel}>STEPS</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="flame" size={16} color={COLORS.primary} />
              <Text style={styles.statValue}>
                {Math.round(steps * 0.04)} cal
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="footsteps" size={16} color={COLORS.primary} />
              <Text style={styles.statValue}>
                {distance.toFixed(2)} km
              </Text>
            </View>
          </View>

          <View style={styles.goalContainer}>
            <Text style={styles.goalText}>
              {percentage.toFixed(0)}% of {(goal / 1000).toFixed(0)}K goal
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  outerRing: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  progressBackground: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 140,
    backgroundColor: COLORS.backgroundTertiary,
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    opacity: 0.3,
    borderRadius: 140,
  },
  innerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepsContainer: {
    alignItems: 'center',
  },
  stepsValue: {
    fontSize: FONTS.mega,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -2,
  },
  stepsLabel: {
    fontSize: FONTS.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 4,
    marginTop: -4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  goalContainer: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: 20,
  },
  goalText: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
});
