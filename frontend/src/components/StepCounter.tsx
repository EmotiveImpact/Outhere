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
import { FONTS, SPACING } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';

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
  const { colors } = useThemeStore();
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
        <View style={[styles.outerRing, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <View style={[styles.progressBackground, { backgroundColor: colors.backgroundTertiary }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${percentage}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
        </View>

        {/* Inner content */}
        <View style={styles.innerContent}>
          <View style={styles.stepsContainer}>
            <Text style={[styles.stepsValue, { color: colors.textPrimary }]}>
              {steps.toLocaleString()}
            </Text>
            <Text style={[styles.stepsLabel, { color: colors.textSecondary }]}>STEPS</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="flame" size={16} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.textSecondary }]}>
                {Math.round(steps * 0.04)} cal
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Ionicons name="footsteps" size={16} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.textSecondary }]}>
                {distance.toFixed(2)} km
              </Text>
            </View>
          </View>

          <View style={[styles.goalContainer, { backgroundColor: colors.backgroundTertiary }]}>
            <Text style={[styles.goalText, { color: colors.textMuted }]}>
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  progressBackground: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 140,
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
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
    letterSpacing: -2,
  },
  stepsLabel: {
    fontSize: FONTS.sm,
    fontWeight: '600',
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
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 16,
    marginHorizontal: SPACING.md,
  },
  goalContainer: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
  },
  goalText: {
    fontSize: FONTS.xs,
    fontWeight: '500',
  },
});
