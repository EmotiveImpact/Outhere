import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';

interface StreakBadgeProps {
  streak: number;
  size?: 'small' | 'medium' | 'large';
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({
  streak,
  size = 'medium',
}) => {
  const { colors } = useThemeStore();
  const glow = useSharedValue(1);

  React.useEffect(() => {
    if (streak >= 7) {
      glow.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
    }
  }, [streak]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glow.value }],
  }));

  const getStreakColor = () => {
    if (streak >= 30) return colors.streakPlatinum;
    if (streak >= 14) return colors.streakGold;
    return colors.streakFire;
  };

  const getStreakTitle = () => {
    if (streak >= 30) return 'LEGENDARY';
    if (streak >= 14) return 'ON FIRE';
    if (streak >= 7) return 'UNSTOPPABLE';
    if (streak >= 3) return 'STILL OUT';
    return 'GETTING STARTED';
  };

  const sizeStyles = {
    small: {
      container: styles.containerSmall,
      text: styles.textSmall,
      icon: 16,
    },
    medium: {
      container: styles.containerMedium,
      text: styles.textMedium,
      icon: 24,
    },
    large: {
      container: styles.containerLarge,
      text: styles.textLarge,
      icon: 32,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <Animated.View
      style={[
        styles.container,
        currentSize.container,
        { borderColor: getStreakColor(), backgroundColor: colors.backgroundSecondary },
        streak >= 7 && animatedStyle,
      ]}
    >
      <Ionicons
        name="flame"
        size={currentSize.icon}
        color={getStreakColor()}
      />
      <View style={styles.textContainer}>
        <Text style={[styles.streakNumber, currentSize.text, { color: getStreakColor() }]}>
          {streak}
        </Text>
        {size !== 'small' && (
          <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>{getStreakTitle()}</Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    gap: SPACING.sm,
  },
  containerSmall: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  containerMedium: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  containerLarge: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  textContainer: {
    alignItems: 'flex-start',
  },
  streakNumber: {
    fontWeight: '800',
  },
  textSmall: {
    fontSize: FONTS.md,
  },
  textMedium: {
    fontSize: FONTS.xl,
  },
  textLarge: {
    fontSize: FONTS.xxxl,
  },
  streakLabel: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
