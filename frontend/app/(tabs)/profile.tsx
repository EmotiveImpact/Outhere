import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, AVATAR_COLORS, CITIES } from '../../src/constants/theme';
import { useUserStore } from '../../src/store/userStore';
import { userAPI } from '../../src/services/api';
import { StreakBadge } from '../../src/components/StreakBadge';

export default function ProfileScreen() {
  const { user, deviceId, setUser, clearUser, setOnboarded } = useUserStore();
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleUpdateCity = async (city: string, borough: string) => {
    if (!deviceId) return;
    try {
      const updated = await userAPI.update(deviceId, { city, borough });
      setUser(updated);
      setShowCityPicker(false);
    } catch (error) {
      console.error('Error updating city:', error);
    }
  };

  const handleUpdateColor = async (color: string) => {
    if (!deviceId) return;
    try {
      const updated = await userAPI.update(deviceId, { avatar_color: color });
      setUser(updated);
      setShowColorPicker(false);
    } catch (error) {
      console.error('Error updating color:', error);
    }
  };

  const handleUpdateGoal = async (type: 'daily' | 'weekly') => {
    const currentGoal = type === 'daily' ? user?.daily_goal : user?.weekly_goal;
    const options = type === 'daily' 
      ? ['5,000', '7,500', '10,000', '12,500', '15,000']
      : ['35,000', '50,000', '70,000', '100,000'];
    
    Alert.alert(
      `Set ${type === 'daily' ? 'Daily' : 'Weekly'} Goal`,
      'Choose your step goal',
      [
        ...options.map(opt => ({
          text: opt,
          onPress: async () => {
            const value = parseInt(opt.replace(',', ''));
            try {
              const updated = await userAPI.update(deviceId!, 
                type === 'daily' ? { daily_goal: value } : { weekly_goal: value }
              );
              setUser(updated);
            } catch (error) {
              console.error('Error updating goal:', error);
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Reset Profile',
      'This will clear all your local data. Your stats are saved on the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            clearUser();
            setOnboarded(false);
          },
        },
      ]
    );
  };

  const MenuItem = ({
    icon,
    label,
    value,
    onPress,
    showArrow = true,
  }: {
    icon: string;
    label: string;
    value?: string;
    onPress?: () => void;
    showArrow?: boolean;
  }) => (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon as any} size={22} color={COLORS.primary} />
        <Text style={styles.menuItemLabel}>{label}</Text>
      </View>
      <View style={styles.menuItemRight}>
        {value && <Text style={styles.menuItemValue}>{value}</Text>}
        {showArrow && (
          <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
        )}
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>PROFILE</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Pressable
            style={[
              styles.avatar,
              { backgroundColor: user?.avatar_color || COLORS.primary },
            ]}
            onPress={() => setShowColorPicker(true)}
          >
            <Text style={styles.avatarText}>
              {user?.username?.charAt(0).toUpperCase() || '?'}
            </Text>
            <View style={styles.avatarEditBadge}>
              <Ionicons name="pencil" size={12} color={COLORS.textPrimary} />
            </View>
          </Pressable>

          <Text style={styles.username}>@{user?.username || 'Loading...'}</Text>
          <Text style={styles.location}>
            {user?.city}, {user?.borough}
          </Text>

          <View style={styles.profileStats}>
            <StreakBadge streak={user?.current_streak || 0} size="medium" />
          </View>
        </View>

        {/* Color Picker Modal */}
        {showColorPicker && (
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContent}>
              <Text style={styles.pickerTitle}>Choose Your Color</Text>
              <View style={styles.colorGrid}>
                {AVATAR_COLORS.map((color) => (
                  <Pressable
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      user?.avatar_color === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => handleUpdateColor(color)}
                  >
                    {user?.avatar_color === color && (
                      <Ionicons name="checkmark" size={24} color="white" />
                    )}
                  </Pressable>
                ))}
              </View>
              <Pressable
                style={styles.pickerClose}
                onPress={() => setShowColorPicker(false)}
              >
                <Text style={styles.pickerCloseText}>Close</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.quickStatsCard}>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>
              {user?.outside_score?.toLocaleString() || 0}
            </Text>
            <Text style={styles.quickStatLabel}>Outside Score</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>
              {user?.total_steps?.toLocaleString() || 0}
            </Text>
            <Text style={styles.quickStatLabel}>Total Steps</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>
              {user?.longest_streak || 0}
            </Text>
            <Text style={styles.quickStatLabel}>Best Streak</Text>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <View style={styles.menuGroup}>
            <MenuItem
              icon="location"
              label="Location"
              value={`${user?.city}, ${user?.borough}`}
              onPress={() => setShowCityPicker(true)}
            />
            <MenuItem
              icon="flag"
              label="Daily Goal"
              value={`${(user?.daily_goal || 10000).toLocaleString()} steps`}
              onPress={() => handleUpdateGoal('daily')}
            />
            <MenuItem
              icon="calendar"
              label="Weekly Goal"
              value={`${(user?.weekly_goal || 70000).toLocaleString()} steps`}
              onPress={() => handleUpdateGoal('weekly')}
            />
          </View>
        </View>

        {/* City Picker Modal */}
        {showCityPicker && (
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContent}>
              <Text style={styles.pickerTitle}>Select Your City</Text>
              <ScrollView style={styles.cityList}>
                {CITIES.map((city) => (
                  <View key={city.name}>
                    <Text style={styles.cityName}>{city.name}</Text>
                    {city.boroughs.map((borough) => (
                      <Pressable
                        key={borough}
                        style={[
                          styles.boroughOption,
                          user?.city === city.name &&
                            user?.borough === borough &&
                            styles.boroughOptionSelected,
                        ]}
                        onPress={() => handleUpdateCity(city.name, borough)}
                      >
                        <Text
                          style={[
                            styles.boroughText,
                            user?.city === city.name &&
                              user?.borough === borough &&
                              styles.boroughTextSelected,
                          ]}
                        >
                          {borough}
                        </Text>
                        {user?.city === city.name &&
                          user?.borough === borough && (
                            <Ionicons
                              name="checkmark"
                              size={20}
                              color={COLORS.primary}
                            />
                          )}
                      </Pressable>
                    ))}
                  </View>
                ))}
              </ScrollView>
              <Pressable
                style={styles.pickerClose}
                onPress={() => setShowCityPicker(false)}
              >
                <Text style={styles.pickerCloseText}>Close</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* About Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>About</Text>

          <View style={styles.menuGroup}>
            <MenuItem
              icon="information-circle"
              label="App Version"
              value="1.0.0"
              showArrow={false}
            />
            <MenuItem
              icon="heart"
              label="Rate OUT 'ERE"
              onPress={() => {}}
            />
            <MenuItem
              icon="share-social"
              label="Share with Friends"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerSection}>
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color={COLORS.error} />
            <Text style={styles.logoutText}>Reset Profile</Text>
          </Pressable>
        </View>

        {/* Branding */}
        <View style={styles.branding}>
          <Text style={styles.brandingText}>OUT 'ERE</Text>
          <Text style={styles.brandingSubtext}>WE OUTSIDE.</Text>
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
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  profileCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    fontSize: FONTS.xxxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.backgroundTertiary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.backgroundSecondary,
  },
  username: {
    fontSize: FONTS.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  location: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  profileStats: {
    marginTop: SPACING.md,
  },
  quickStatsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: FONTS.xl,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  quickStatLabel: {
    fontSize: FONTS.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  settingsSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  menuGroup: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  menuItemLabel: {
    fontSize: FONTS.md,
    color: COLORS.textPrimary,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  menuItemValue: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
  },
  dangerSection: {
    marginBottom: SPACING.lg,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  logoutText: {
    fontSize: FONTS.md,
    fontWeight: '600',
    color: COLORS.error,
  },
  branding: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  brandingText: {
    fontSize: FONTS.xl,
    fontWeight: '900',
    color: COLORS.textMuted,
  },
  brandingSubtext: {
    fontSize: FONTS.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 2,
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: SPACING.md,
    zIndex: 100,
  },
  pickerContent: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    maxHeight: '80%',
  },
  pickerTitle: {
    fontSize: FONTS.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: COLORS.textPrimary,
  },
  cityList: {
    maxHeight: 400,
  },
  cityName: {
    fontSize: FONTS.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  boroughOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingLeft: SPACING.md,
  },
  boroughOptionSelected: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  boroughText: {
    fontSize: FONTS.md,
    color: COLORS.textSecondary,
  },
  boroughTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  pickerClose: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  pickerCloseText: {
    fontSize: FONTS.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
