import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { useUserStore } from '../../src/store/userStore';
import { LeaderboardItem } from '../../src/components/LeaderboardItem';
import { leaderboardAPI } from '../../src/services/api';

type Period = 'daily' | 'weekly' | 'alltime';
type Filter = 'global' | 'city' | 'borough';

export default function LeaderboardScreen() {
  const { user, deviceId } = useUserStore();
  const [period, setPeriod] = useState<Period>('daily');
  const [filter, setFilter] = useState<Filter>('global');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const city = filter === 'city' || filter === 'borough' ? user?.city : undefined;
      const borough = filter === 'borough' ? user?.borough : undefined;
      const data = await leaderboardAPI.get(period, city, borough);
      setLeaderboard(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [period, filter, user]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  }, [loadLeaderboard]);

  const PeriodButton = ({ value, label }: { value: Period; label: string }) => (
    <Pressable
      style={[
        styles.periodButton,
        period === value && styles.periodButtonActive,
      ]}
      onPress={() => setPeriod(value)}
    >
      <Text
        style={[
          styles.periodButtonText,
          period === value && styles.periodButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  const FilterButton = ({ value, label, icon }: { value: Filter; label: string; icon: string }) => (
    <Pressable
      style={[
        styles.filterButton,
        filter === value && styles.filterButtonActive,
      ]}
      onPress={() => setFilter(value)}
    >
      <Ionicons
        name={icon as any}
        size={16}
        color={filter === value ? COLORS.primary : COLORS.textMuted}
      />
      <Text
        style={[
          styles.filterButtonText,
          filter === value && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  // Find current user's rank
  const userRank = leaderboard.findIndex(
    (entry) => entry.user_id === user?.id
  ) + 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>LEADERBOARD</Text>
        <Text style={styles.subtitle}>
          {filter === 'global' ? 'Global' : filter === 'city' ? user?.city : user?.borough} Rankings
        </Text>
      </View>

      {/* Period Selector */}
      <View style={styles.periodContainer}>
        <PeriodButton value="daily" label="Today" />
        <PeriodButton value="weekly" label="This Week" />
        <PeriodButton value="alltime" label="All Time" />
      </View>

      {/* Filter Selector */}
      <View style={styles.filterContainer}>
        <FilterButton value="global" label="Global" icon="globe" />
        <FilterButton value="city" label="City" icon="business" />
        <FilterButton value="borough" label="Area" icon="location" />
      </View>

      {/* User's Position Card */}
      {user && userRank > 0 && (
        <View style={styles.userPositionCard}>
          <View style={styles.userPositionLeft}>
            <Text style={styles.userPositionLabel}>YOUR POSITION</Text>
            <View style={styles.userPositionRank}>
              <Ionicons name="trophy" size={24} color={COLORS.primary} />
              <Text style={styles.userPositionNumber}>#{userRank}</Text>
            </View>
          </View>
          <View style={styles.userPositionRight}>
            <Text style={styles.userPositionSteps}>
              {leaderboard[userRank - 1]?.steps?.toLocaleString() || 0}
            </Text>
            <Text style={styles.userPositionStepsLabel}>steps</Text>
          </View>
        </View>
      )}

      {/* Leaderboard List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading rankings...</Text>
          </View>
        ) : leaderboard.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No Rankings Yet</Text>
            <Text style={styles.emptySubtitle}>
              Be the first to get outside and set the pace!
            </Text>
          </View>
        ) : (
          leaderboard.map((entry, index) => (
            <LeaderboardItem
              key={entry.user_id || index}
              rank={entry.rank || index + 1}
              username={entry.username}
              steps={entry.steps}
              streak={entry.streak}
              avatarColor={entry.avatar_color || COLORS.primary}
              isCurrentUser={entry.user_id === user?.id}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  title: {
    fontSize: FONTS.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  periodContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  periodButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.backgroundSecondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodButtonText: {
    fontSize: FONTS.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  periodButtonTextActive: {
    color: COLORS.textPrimary,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.backgroundSecondary,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
  },
  filterButtonText: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  filterButtonTextActive: {
    color: COLORS.primary,
  },
  userPositionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  userPositionLeft: {
    gap: SPACING.xs,
  },
  userPositionLabel: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  userPositionRank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  userPositionNumber: {
    fontSize: FONTS.xxxl,
    fontWeight: '800',
    color: COLORS.primary,
  },
  userPositionRight: {
    alignItems: 'flex-end',
  },
  userPositionSteps: {
    fontSize: FONTS.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  userPositionStepsLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textSecondary,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.md,
    paddingTop: 0,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.md,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: FONTS.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: FONTS.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});
