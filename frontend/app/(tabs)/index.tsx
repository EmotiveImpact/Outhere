import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  Alert,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FONTS, SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { useUserStore } from '../../src/store/userStore';
import { useThemeStore } from '../../src/store/themeStore';
import { usePedometer } from '../../src/hooks/usePedometer';
import { StepCounter } from '../../src/components/StepCounter';
import { StreakBadge } from '../../src/components/StreakBadge';
import { OutsideNowBanner } from '../../src/components/OutsideNowBanner';
import { userAPI, stepsAPI, challengesAPI } from '../../src/services/api';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useThemeStore();
  const {
    user,
    deviceId,
    setUser,
    todayStats,
    updateTodayStats,
    isOnboarded,
    setOnboarded,
  } = useUserStore();

  const {
    currentSteps,
    distance,
    isTracking,
    startTracking,
    stopTracking,
    simulateSteps,
    isPedometerAvailable,
    syncSteps,
  } = usePedometer();

  const [refreshing, setRefreshing] = useState(false);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [username, setUsername] = useState('');

  // Load user data
  const loadUserData = useCallback(async () => {
    if (!deviceId) return;

    try {
      const userData = await userAPI.get(deviceId);
      setUser(userData);
      setOnboarded(true);

      // Load today's steps
      const todayData = await stepsAPI.getToday(deviceId);
      updateTodayStats(todayData);

      // Load challenges
      const challengeData = await challengesAPI.getAll(userData.city);
      setChallenges(challengeData);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setShowOnboarding(true);
      }
      console.log('User not found, showing onboarding');
    }
  }, [deviceId]);

  useEffect(() => {
    if (deviceId && !isOnboarded) {
      loadUserData();
    } else if (deviceId && isOnboarded) {
      loadUserData();
    }
  }, [deviceId, isOnboarded]);

  // Start tracking when user is loaded
  useEffect(() => {
    if (user && !isTracking) {
      startTracking();
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUserData();
    await syncSteps();
    setRefreshing(false);
  }, [loadUserData, syncSteps]);

  const handleCreateUser = async () => {
    if (!deviceId || !username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    try {
      const newUser = await userAPI.create({
        device_id: deviceId,
        username: username.trim(),
        city: 'London',
        borough: 'Central',
      });
      setUser(newUser);
      setOnboarded(true);
      setShowOnboarding(false);
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Error', 'Failed to create user');
    }
  };

  // Simulate steps for demo (web only)
  const handleSimulateSteps = () => {
    const randomSteps = Math.floor(Math.random() * 500) + 100;
    simulateSteps(randomSteps);
  };

  // Onboarding screen
  if (showOnboarding || !isOnboarded) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.onboardingContainer}>
            <View style={styles.logoContainer}>
              <Text style={[styles.logoText, { color: colors.textPrimary }]}>OUT 'ERE</Text>
              <Text style={[styles.tagline, { color: colors.primary }]}>WE OUTSIDE.</Text>
            </View>

            <View style={styles.onboardingContent}>
              <Text style={[styles.welcomeTitle, { color: colors.textPrimary }]}>Welcome to the movement</Text>
              <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
                Track your steps, compete with your city, stay outside.
              </Text>

              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>CHOOSE YOUR TAG</Text>
                <View style={[styles.textInputWrapper, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                  <Ionicons name="at" size={20} color={colors.textMuted} />
                  <TextInput
                    style={[styles.textInputReal, { color: colors.textPrimary }]}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter your username"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={20}
                  />
                </View>
              </View>

              <Pressable
                style={[
                  styles.startButton,
                  { backgroundColor: colors.primary },
                  !username && [styles.startButtonDisabled, { backgroundColor: colors.backgroundTertiary }],
                ]}
                onPress={handleCreateUser}
                disabled={!username}
              >
                <Text style={[styles.startButtonText, { color: colors.textPrimary }]}>LET'S GO</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.primary }]}>WE OUTSIDE</Text>
            <Text style={[styles.username, { color: colors.textPrimary }]}>@{user?.username || 'Loading...'}</Text>
          </View>
          <StreakBadge streak={user?.current_streak || 0} size="small" />
        </View>

        {/* Outside Now Banner */}
        <OutsideNowBanner city={user?.city} />

        {/* Step Counter */}
        <View style={styles.stepCounterContainer}>
          <StepCounter
            steps={currentSteps || todayStats.steps}
            goal={user?.daily_goal || 10000}
            distance={distance || todayStats.distance}
          />
        </View>

        {/* Tracking Status */}
        <View style={styles.trackingStatus}>
          <View style={styles.statusIndicator}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isTracking ? colors.success : colors.textMuted },
              ]}
            />
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              {isTracking ? 'Tracking Active' : 'Tracking Paused'}
            </Text>
          </View>

          {Platform.OS === 'web' && (
            <Pressable
              style={[styles.simulateButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.primary }]}
              onPress={handleSimulateSteps}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[styles.simulateText, { color: colors.primary }]}>Add Steps (Demo)</Text>
            </Pressable>
          )}
        </View>

        {/* Quick Stats */}
        <View style={[styles.quickStats, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
          <View style={styles.quickStatItem}>
            <Ionicons name="flame" size={24} color={colors.primary} />
            <Text style={[styles.quickStatValue, { color: colors.textPrimary }]}>
              {user?.outside_score?.toLocaleString() || 0}
            </Text>
            <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>Outside Score</Text>
          </View>
          <View style={[styles.quickStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.quickStatItem}>
            <Ionicons name="trending-up" size={24} color={colors.success} />
            <Text style={[styles.quickStatValue, { color: colors.textPrimary }]}>
              {user?.total_steps?.toLocaleString() || 0}
            </Text>
            <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>Total Steps</Text>
          </View>
          <View style={[styles.quickStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.quickStatItem}>
            <Ionicons name="navigate" size={24} color={colors.primaryLight} />
            <Text style={[styles.quickStatValue, { color: colors.textPrimary }]}>
              {user?.total_distance?.toFixed(1) || 0}
            </Text>
            <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>KM Total</Text>
          </View>
        </View>

        {/* Challenges Preview */}
        <View style={styles.challengesSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Active Challenges</Text>
            <Pressable>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
            </Pressable>
          </View>

          {challenges.slice(0, 2).map((challenge, index) => (
            <View key={challenge.id || index} style={[styles.challengeCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
              <View style={styles.challengeInfo}>
                <Ionicons name="flag" size={20} color={colors.primary} />
                <View style={styles.challengeTextContainer}>
                  <Text style={[styles.challengeTitle, { color: colors.textPrimary }]}>{challenge.title}</Text>
                  <Text style={[styles.challengeDescription, { color: colors.textSecondary }]}>
                    {challenge.description}
                  </Text>
                </View>
              </View>
              <View style={styles.challengeReward}>
                <Text style={[styles.rewardPoints, { color: colors.primary }]}>+{challenge.reward_points}</Text>
                <Text style={[styles.rewardLabel, { color: colors.textMuted }]}>pts</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  greeting: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    letterSpacing: 3,
  },
  username: {
    fontSize: FONTS.xxl,
    fontWeight: '800',
    marginTop: 2,
  },
  stepCounterContainer: {
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  trackingStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: FONTS.sm,
  },
  simulateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  simulateText: {
    fontSize: FONTS.sm,
    fontWeight: '600',
  },
  quickStats: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginVertical: SPACING.md,
    borderWidth: 1,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: FONTS.xl,
    fontWeight: '800',
    marginTop: SPACING.sm,
  },
  quickStatLabel: {
    fontSize: FONTS.xs,
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    marginHorizontal: SPACING.md,
  },
  challengesSection: {
    marginTop: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.lg,
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: FONTS.sm,
    fontWeight: '600',
  },
  challengeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
  },
  challengeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  challengeTextContainer: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: FONTS.md,
    fontWeight: '600',
  },
  challengeDescription: {
    fontSize: FONTS.sm,
    marginTop: 2,
  },
  challengeReward: {
    alignItems: 'center',
  },
  rewardPoints: {
    fontSize: FONTS.lg,
    fontWeight: '800',
  },
  rewardLabel: {
    fontSize: FONTS.xs,
  },
  // Onboarding styles
  onboardingContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logoText: {
    fontSize: FONTS.hero,
    fontWeight: '900',
    letterSpacing: -2,
  },
  tagline: {
    fontSize: FONTS.lg,
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: SPACING.xs,
  },
  onboardingContent: {
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: FONTS.xxl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  welcomeSubtitle: {
    fontSize: FONTS.md,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  inputContainer: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONTS.xs,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: SPACING.sm,
  },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderWidth: 1,
  },
  textInput: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  textInputReal: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONTS.md,
  },
  textInputText: {
    fontSize: FONTS.md,
  },
  textInputPlaceholder: {},
  keyboardAvoid: {
    flex: 1,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
    width: '100%',
  },
  startButtonDisabled: {},
  startButtonText: {
    fontSize: FONTS.md,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
