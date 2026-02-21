import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart3, Clock3, Flame, Footprints, Navigation, TrendingUp } from 'lucide-react-native';
import { BarChart } from 'react-native-gifted-charts';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { useUserStore } from '../../src/store/userStore';
import { StreakBadge } from '../../src/components/StreakBadge';
import { stepsAPI, statsAPI } from '../../src/services/api';

const { width } = Dimensions.get('window');

export default function StatsScreen() {
  const { user, deviceId } = useUserStore();
  const [refreshing, setRefreshing] = useState(false);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);

  const loadStats = useCallback(async () => {
    if (!deviceId) return;

    try {
      // Load step history
      const history = await stepsAPI.getHistory(deviceId, 7);
      
      // Format for chart
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const chartData = history.map((record: any) => {
        const date = new Date(record.date);
        return {
          value: record.steps,
          label: days[date.getDay()],
          frontColor: COLORS.primary,
        };
      });
      setWeeklyData(chartData);

      // Load weekly summary
      const summary = await stepsAPI.getWeeklySummary(deviceId);
      setWeeklySummary(summary);

      // Load user stats
      const stats = await statsAPI.getUserStats(deviceId);
      setUserStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, [deviceId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  }, [loadStats]);

  const StatCard = ({
    icon,
    value,
    label,
    color = COLORS.primary,
  }: {
    icon: React.ReactNode;
    value: string | number;
    label: string;
    color?: string;
  }) => (
    <View style={styles.statCard}>
      <View style={{ opacity: color === COLORS.primary ? 1 : 0.95 }}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>YOUR STATS</Text>
          <Text style={styles.subtitle}>Track your progress</Text>
        </View>

        {/* Streak Section */}
        <View style={styles.streakSection}>
          <StreakBadge streak={user?.current_streak || 0} size="large" />
          <View style={styles.streakInfo}>
            <View style={styles.streakInfoItem}>
              <Text style={styles.streakInfoLabel}>Longest Streak</Text>
              <Text style={styles.streakInfoValue}>
                {user?.longest_streak || 0} days
              </Text>
            </View>
            <View style={styles.streakInfoDivider} />
            <View style={styles.streakInfoItem}>
              <Text style={styles.streakInfoLabel}>Days Active</Text>
              <Text style={styles.streakInfoValue}>
                {weeklySummary?.days_active || 0} / 7
              </Text>
            </View>
          </View>
        </View>

        {/* Weekly Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.chartContainer}>
            {weeklyData.length > 0 ? (
              <BarChart
                data={weeklyData}
                barWidth={32}
                spacing={16}
                roundedTop
                roundedBottom
                hideRules
                xAxisThickness={0}
                yAxisThickness={0}
                yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
                noOfSections={4}
                maxValue={Math.max(...weeklyData.map((d) => d.value), 10000)}
                barBorderRadius={4}
                frontColor={COLORS.primary}
                backgroundColor={COLORS.backgroundSecondary}
                isAnimated
              />
            ) : (
              <View style={styles.noDataContainer}>
                <BarChart3 size={48} color={COLORS.textMuted} strokeWidth={1.9} />
                <Text style={styles.noDataText}>No data yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Weekly Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Weekly Summary</Text>
          <View style={styles.summaryGrid}>
            <StatCard
              icon={<Footprints size={24} color={COLORS.primary} strokeWidth={2.3} />}
              value={weeklySummary?.total_steps?.toLocaleString() || 0}
              label="Total Steps"
            />
            <StatCard
              icon={<Navigation size={24} color={COLORS.primaryLight} strokeWidth={2.3} />}
              value={`${weeklySummary?.total_distance?.toFixed(1) || 0} km`}
              label="Distance"
              color={COLORS.primaryLight}
            />
            <StatCard
              icon={<Clock3 size={24} color={COLORS.success} strokeWidth={2.3} />}
              value={weeklySummary?.total_active_minutes || 0}
              label="Active Min"
              color={COLORS.success}
            />
            <StatCard
              icon={<TrendingUp size={24} color={COLORS.warning} strokeWidth={2.3} />}
              value={Math.round(weeklySummary?.avg_steps || 0).toLocaleString()}
              label="Daily Avg"
              color={COLORS.warning}
            />
          </View>
        </View>

        {/* All Time Stats */}
        <View style={styles.allTimeSection}>
          <Text style={styles.sectionTitle}>All Time</Text>
          <View style={styles.allTimeGrid}>
            <View style={styles.allTimeCard}>
              <Flame size={32} color={COLORS.primary} strokeWidth={2.2} />
              <Text style={styles.allTimeValue}>
                {user?.outside_score?.toLocaleString() || 0}
              </Text>
              <Text style={styles.allTimeLabel}>Outside Score</Text>
            </View>
            <View style={styles.allTimeCard}>
              <Footprints size={32} color={COLORS.primaryLight} strokeWidth={2.2} />
              <Text style={styles.allTimeValue}>
                {user?.total_steps?.toLocaleString() || 0}
              </Text>
              <Text style={styles.allTimeLabel}>Total Steps</Text>
            </View>
            <View style={styles.allTimeCard}>
              <Navigation size={32} color={COLORS.success} strokeWidth={2.2} />
              <Text style={styles.allTimeValue}>
                {user?.total_distance?.toFixed(1) || 0} km
              </Text>
              <Text style={styles.allTimeLabel}>Total Distance</Text>
            </View>
          </View>
        </View>

        {/* Goals Progress */}
        <View style={styles.goalsSection}>
          <Text style={styles.sectionTitle}>Goals</Text>
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalTitle}>Daily Goal</Text>
              <Text style={styles.goalProgress}>
                {((userStats?.weekly?.total_steps / 7 / (user?.daily_goal || 10000)) * 100).toFixed(0)}% avg
              </Text>
            </View>
            <View style={styles.goalBarBackground}>
              <View
                style={[
                  styles.goalBarFill,
                  {
                    width: `${Math.min(
                      ((userStats?.weekly?.total_steps / 7) / (user?.daily_goal || 10000)) * 100,
                      100
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.goalTarget}>
              Target: {(user?.daily_goal || 10000).toLocaleString()} steps/day
            </Text>
          </View>

          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalTitle}>Weekly Goal</Text>
              <Text style={styles.goalProgress}>
                {((weeklySummary?.total_steps / (user?.weekly_goal || 70000)) * 100).toFixed(0)}%
              </Text>
            </View>
            <View style={styles.goalBarBackground}>
              <View
                style={[
                  styles.goalBarFill,
                  {
                    width: `${Math.min(
                      (weeklySummary?.total_steps / (user?.weekly_goal || 70000)) * 100,
                      100
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.goalTarget}>
              Target: {(user?.weekly_goal || 70000).toLocaleString()} steps/week
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS.xxl,
    fontFamily: FONTS.black,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 1,
    lineHeight: FONTS.xxl + 5,
  },
  subtitle: {
    fontSize: FONTS.sm,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: FONTS.sm + 3,
  },
  streakSection: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 0.8,
    borderColor: COLORS.border,
  },
  streakInfo: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 0.8,
    borderTopColor: COLORS.border,
  },
  streakInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  streakInfoLabel: {
    fontSize: FONTS.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  streakInfoValue: {
    fontSize: FONTS.lg,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  streakInfoDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  chartSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.lg,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    lineHeight: FONTS.lg + 4,
  },
  chartContainer: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 0.8,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  noDataText: {
    marginTop: SPACING.md,
    fontSize: FONTS.md,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
  },
  summarySection: {
    marginBottom: SPACING.lg,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    minWidth: (width - SPACING.md * 3 - SPACING.sm) / 2,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 0.8,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: FONTS.xl,
    fontFamily: FONTS.black,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
    lineHeight: FONTS.xl + 4,
  },
  statLabel: {
    fontSize: FONTS.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  allTimeSection: {
    marginBottom: SPACING.lg,
  },
  allTimeGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  allTimeCard: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 0.8,
    borderColor: COLORS.border,
  },
  allTimeValue: {
    fontSize: FONTS.lg,
    fontFamily: FONTS.bold,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
    lineHeight: FONTS.lg + 3,
  },
  allTimeLabel: {
    fontSize: FONTS.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  goalsSection: {
    marginBottom: SPACING.lg,
  },
  goalCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 0.8,
    borderColor: COLORS.border,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  goalTitle: {
    fontSize: FONTS.md,
    fontFamily: FONTS.bold,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  goalProgress: {
    fontSize: FONTS.sm,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: COLORS.primary,
  },
  goalBarBackground: {
    height: 8,
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  goalTarget: {
    fontSize: FONTS.xs,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
});
