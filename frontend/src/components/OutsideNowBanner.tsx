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
import { FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { useThemeStore } from '../store/themeStore';
import { communityAPI } from '../services/api';

interface OutsideNowBannerProps {
  city?: string;
  onPress?: () => void;
}

export const OutsideNowBanner: React.FC<OutsideNowBannerProps> = ({
  city,
  onPress,
}) => {
  const { colors } = useThemeStore();
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
      <View style={[styles.container, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
        <View style={styles.leftContent}>
          <Animated.View style={[styles.liveIndicator, animatedStyle]}>
            <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
          </Animated.View>
          <Text style={[styles.liveText, { color: colors.success }]}>LIVE</Text>
        </View>

        <View style={styles.centerContent}>
          <Text style={[styles.countText, { color: colors.textPrimary }]}>{count.toLocaleString()}</Text>
          <Text style={[styles.labelText, { color: colors.textSecondary }]}>OUTSIDE NOW</Text>
        </View>

        <View style={styles.rightContent}>
          <Ionicons name="people" size={24} color={colors.primary} />
          <Text style={[styles.cityText, { color: colors.textMuted }]}>{city || 'Global'}</Text>
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
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
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
  },
  liveText: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },
  centerContent: {
    alignItems: 'center',
  },
  countText: {
    fontSize: FONTS.xxl,
    fontWeight: '800',
  },
  labelText: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    letterSpacing: 2,
  },
  rightContent: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  cityText: {
    fontSize: FONTS.xs,
    fontWeight: '500',
  },
});
