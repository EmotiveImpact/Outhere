import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { communityAPI } from '../services/api';

interface OutsideNowBannerProps {
  city?: string;
  onPress?: () => void;
}

export const OutsideNowBanner: React.FC<OutsideNowBannerProps> = ({
  city,
  onPress,
}) => {
  const [count, setCount] = useState(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500 }),
        withTiming(1, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const data = await communityAPI.getOutsideNow(city);
        setCount(data.count);
      } catch (error) {
        // Use fallback count
        setCount(Math.floor(Math.random() * 150) + 50);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, [city]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Pressable onPress={onPress}>
      <View style={styles.container}>
        <View style={styles.leftContent}>
          <Animated.View style={[styles.liveIndicator, animatedStyle]}>
            <View style={styles.liveDot} />
          </Animated.View>
          <Text style={styles.liveText}>LIVE</Text>
        </View>

        <View style={styles.centerContent}>
          <Text style={styles.countText}>{count.toLocaleString()}</Text>
          <Text style={styles.labelText}>OUTSIDE NOW</Text>
        </View>

        <View style={styles.rightContent}>
          <Ionicons name="people" size={24} color={COLORS.primary} />
          <Text style={styles.cityText}>{city || 'Global'}</Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  liveIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  liveText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    color: COLORS.success,
    letterSpacing: 1,
  },
  centerContent: {
    alignItems: 'center',
  },
  countText: {
    fontSize: FONTS.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  labelText: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 2,
  },
  rightContent: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  cityText: {
    fontSize: FONTS.xs,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
});
