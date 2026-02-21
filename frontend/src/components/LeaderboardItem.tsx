import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronRight, Flame, Trophy } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

interface LeaderboardItemProps {
  rank: number;
  username: string;
  steps: number;
  streak: number;
  avatarColor: string;
  isCurrentUser?: boolean;
  onPress?: () => void;
}

export const LeaderboardItem: React.FC<LeaderboardItemProps> = ({
  rank,
  username,
  steps,
  streak,
  avatarColor,
  isCurrentUser = false,
  onPress,
}) => {
  const getRankIcon = () => {
    switch (rank) {
      case 1:
        return <Trophy size={20} color="#FFD700" strokeWidth={2.3} />;
      case 2:
        return <Trophy size={20} color="#C0C0C0" strokeWidth={2.3} />;
      case 3:
        return <Trophy size={20} color="#CD7F32" strokeWidth={2.3} />;
      default:
        return <Text style={styles.rankNumber}>{rank}</Text>;
    }
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        isCurrentUser && styles.currentUserContainer,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.rankContainer}>{getRankIcon()}</View>

      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>
          {username.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.infoContainer}>
        <Text
          style={[
            styles.username,
            isCurrentUser && styles.currentUserText,
          ]}
          numberOfLines={1}
        >
          {username}
          {isCurrentUser && ' (You)'}
        </Text>
        <View style={styles.statsContainer}>
          <Text style={styles.stepsText}>
            {steps.toLocaleString()} steps
          </Text>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Flame size={12} color={COLORS.primary} strokeWidth={2.4} />
              <Text style={styles.streakText}>{streak}</Text>
            </View>
          )}
        </View>
      </View>

      <ChevronRight size={20} color={COLORS.textMuted} strokeWidth={2.4} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 0.8,
    borderColor: COLORS.border,
  },
  currentUserContainer: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  rankContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: FONTS.md,
    fontWeight: '700',
    color: COLORS.textSecondary,
    lineHeight: FONTS.md + 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
  avatarText: {
    fontSize: FONTS.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  infoContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  username: {
    fontSize: FONTS.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: FONTS.md + 4,
  },
  currentUserText: {
    color: COLORS.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 2,
  },
  stepsText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    lineHeight: FONTS.sm + 3,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundTertiary,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    gap: 2,
  },
  streakText: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
