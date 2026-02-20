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
import { FONTS, SPACING, BORDER_RADIUS, AVATAR_COLORS, CITIES, THEMES } from '../../src/constants/theme';
import { useUserStore } from '../../src/store/userStore';
import { useThemeStore, ThemeKey } from '../../src/store/themeStore';
import { userAPI } from '../../src/services/api';
import { StreakBadge } from '../../src/components/StreakBadge';

export default function ProfileScreen() {
  const { user, deviceId, setUser, clearUser, setOnboarded } = useUserStore();
  const { colors, currentTheme, setTheme } = useThemeStore();
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

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

  const handleThemeChange = async (theme: ThemeKey) => {
    await setTheme(theme);
    setShowThemePicker(false);
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
    <Pressable style={[styles.menuItem, { borderBottomColor: colors.border }]} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon as any} size={22} color={colors.primary} />
        <Text style={[styles.menuItemLabel, { color: colors.textPrimary }]}>{label}</Text>
      </View>
      <View style={styles.menuItemRight}>
        {value && <Text style={[styles.menuItemValue, { color: colors.textSecondary }]}>{value}</Text>}
        {showArrow && (
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        )}
      </View>
    </Pressable>
  );

  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    card: { 
      backgroundColor: colors.backgroundSecondary,
      borderColor: colors.border,
    },
    text: { color: colors.textPrimary },
    textMuted: { color: colors.textMuted },
    textSecondary: { color: colors.textSecondary },
    primary: { color: colors.primary },
  };

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, dynamicStyles.text]}>PROFILE</Text>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, dynamicStyles.card]}>
          <Pressable
            style={[
              styles.avatar,
              { backgroundColor: user?.avatar_color || colors.primary },
            ]}
            onPress={() => setShowColorPicker(true)}
          >
            <Text style={styles.avatarText}>
              {user?.username?.charAt(0).toUpperCase() || '?'}
            </Text>
            <View style={[styles.avatarEditBadge, { backgroundColor: colors.backgroundTertiary, borderColor: colors.backgroundSecondary }]}>
              <Ionicons name="pencil" size={12} color={colors.textPrimary} />
            </View>
          </Pressable>

          <Text style={[styles.username, dynamicStyles.text]}>@{user?.username || 'Loading...'}</Text>
          <Text style={[styles.location, dynamicStyles.textSecondary]}>
            {user?.city}, {user?.borough}
          </Text>

          <View style={styles.profileStats}>
            <StreakBadge streak={user?.current_streak || 0} size="medium" />
          </View>
        </View>

        {/* Color Picker Modal */}
        {showColorPicker && (
          <View style={styles.pickerOverlay}>
            <View style={[styles.pickerContent, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.pickerTitle, dynamicStyles.text]}>Choose Your Color</Text>
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
                style={[styles.pickerClose, { backgroundColor: colors.primary }]}
                onPress={() => setShowColorPicker(false)}
              >
                <Text style={[styles.pickerCloseText, dynamicStyles.text]}>Close</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Quick Stats */}
        <View style={[styles.quickStatsCard, dynamicStyles.card]}>
          <View style={styles.quickStatItem}>
            <Text style={[styles.quickStatValue, dynamicStyles.text]}>
              {user?.outside_score?.toLocaleString() || 0}
            </Text>
            <Text style={[styles.quickStatLabel, dynamicStyles.textMuted]}>Outside Score</Text>
          </View>
          <View style={[styles.quickStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.quickStatItem}>
            <Text style={[styles.quickStatValue, dynamicStyles.text]}>
              {user?.total_steps?.toLocaleString() || 0}
            </Text>
            <Text style={[styles.quickStatLabel, dynamicStyles.textMuted]}>Total Steps</Text>
          </View>
          <View style={[styles.quickStatDivider, { backgroundColor: colors.border }]} />
          <View style={styles.quickStatItem}>
            <Text style={[styles.quickStatValue, dynamicStyles.text]}>
              {user?.longest_streak || 0}
            </Text>
            <Text style={[styles.quickStatLabel, dynamicStyles.textMuted]}>Best Streak</Text>
          </View>
        </View>

        {/* Theme Settings */}
        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, dynamicStyles.textMuted]}>Appearance</Text>

          <View style={[styles.menuGroup, dynamicStyles.card]}>
            <MenuItem
              icon="color-palette"
              label="App Theme"
              value={THEMES[currentTheme].name}
              onPress={() => setShowThemePicker(true)}
            />
          </View>
        </View>

        {/* Theme Picker Modal */}
        {showThemePicker && (
          <View style={styles.pickerOverlay}>
            <View style={[styles.pickerContent, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.pickerTitle, dynamicStyles.text]}>Choose Theme</Text>
              <View style={styles.themeGrid}>
                {(Object.keys(THEMES) as ThemeKey[]).map((themeKey) => (
                  <Pressable
                    key={themeKey}
                    style={[
                      styles.themeOption,
                      { 
                        backgroundColor: THEMES[themeKey].background,
                        borderColor: currentTheme === themeKey ? THEMES[themeKey].primary : colors.border,
                        borderWidth: currentTheme === themeKey ? 3 : 1,
                      },
                    ]}
                    onPress={() => handleThemeChange(themeKey)}
                  >
                    <View style={[styles.themePreview, { backgroundColor: THEMES[themeKey].backgroundSecondary }]}>
                      <View style={[styles.themeAccentDot, { backgroundColor: THEMES[themeKey].primary }]} />
                      <View style={[styles.themeAccentLine, { backgroundColor: THEMES[themeKey].primary }]} />
                    </View>
                    <Text style={[styles.themeLabel, { color: THEMES[themeKey].textPrimary }]}>
                      {THEMES[themeKey].name}
                    </Text>
                    {currentTheme === themeKey && (
                      <View style={[styles.themeCheck, { backgroundColor: THEMES[themeKey].primary }]}>
                        <Ionicons name="checkmark" size={16} color={THEMES[themeKey].background} />
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
              <Pressable
                style={[styles.pickerClose, { backgroundColor: colors.primary }]}
                onPress={() => setShowThemePicker(false)}
              >
                <Text style={[styles.pickerCloseText, { color: colors.background }]}>Done</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Settings */}
        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, dynamicStyles.textMuted]}>Settings</Text>

          <View style={[styles.menuGroup, dynamicStyles.card]}>
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
            <View style={[styles.pickerContent, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.pickerTitle, dynamicStyles.text]}>Select Your City</Text>
              <ScrollView style={styles.cityList}>
                {CITIES.map((city) => (
                  <View key={city.name}>
                    <Text style={[styles.cityName, dynamicStyles.text, { borderBottomColor: colors.border }]}>{city.name}</Text>
                    {city.boroughs.map((borough) => (
                      <Pressable
                        key={borough}
                        style={[
                          styles.boroughOption,
                          user?.city === city.name &&
                            user?.borough === borough &&
                            { backgroundColor: `${colors.primary}20` },
                        ]}
                        onPress={() => handleUpdateCity(city.name, borough)}
                      >
                        <Text
                          style={[
                            styles.boroughText,
                            dynamicStyles.textSecondary,
                            user?.city === city.name &&
                              user?.borough === borough &&
                              dynamicStyles.primary,
                          ]}
                        >
                          {borough}
                        </Text>
                        {user?.city === city.name &&
                          user?.borough === borough && (
                            <Ionicons
                              name="checkmark"
                              size={20}
                              color={colors.primary}
                            />
                          )}
                      </Pressable>
                    ))}
                  </View>
                ))}
              </ScrollView>
              <Pressable
                style={[styles.pickerClose, { backgroundColor: colors.primary }]}
                onPress={() => setShowCityPicker(false)}
              >
                <Text style={[styles.pickerCloseText, { color: colors.background }]}>Close</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* About Section */}
        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, dynamicStyles.textMuted]}>About</Text>

          <View style={[styles.menuGroup, dynamicStyles.card]}>
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
          <Pressable style={[styles.logoutButton, { borderColor: colors.error }]} onPress={handleLogout}>
            <Ionicons name="log-out" size={20} color={colors.error} />
            <Text style={[styles.logoutText, { color: colors.error }]}>Reset Profile</Text>
          </Pressable>
        </View>

        {/* Branding */}
        <View style={styles.branding}>
          <Text style={[styles.brandingText, dynamicStyles.textMuted]}>OUT 'ERE</Text>
          <Text style={[styles.brandingSubtext, dynamicStyles.textMuted]}>WE OUTSIDE.</Text>
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
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS.xxl,
    fontWeight: '800',
    letterSpacing: 2,
  },
  profileCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
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
    color: '#FFFFFF',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  username: {
    fontSize: FONTS.xl,
    fontWeight: '700',
  },
  location: {
    fontSize: FONTS.sm,
    marginTop: 2,
  },
  profileStats: {
    marginTop: SPACING.md,
  },
  quickStatsCard: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: FONTS.xl,
    fontWeight: '800',
  },
  quickStatLabel: {
    fontSize: FONTS.xs,
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
  },
  settingsSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sm,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  menuGroup: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  menuItemLabel: {
    fontSize: FONTS.md,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  menuItemValue: {
    fontSize: FONTS.sm,
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
  },
  logoutText: {
    fontSize: FONTS.md,
    fontWeight: '600',
  },
  branding: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  brandingText: {
    fontSize: FONTS.xl,
    fontWeight: '900',
  },
  brandingSubtext: {
    fontSize: FONTS.xs,
    fontWeight: '600',
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
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    maxHeight: '80%',
  },
  pickerTitle: {
    fontSize: FONTS.lg,
    fontWeight: '700',
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
    borderColor: '#FFFFFF',
  },
  themeGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  themeOption: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  themePreview: {
    width: '100%',
    height: 60,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
    padding: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeAccentDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 4,
  },
  themeAccentLine: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  themeLabel: {
    fontSize: FONTS.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  themeCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityList: {
    maxHeight: 400,
  },
  cityName: {
    fontSize: FONTS.md,
    fontWeight: '700',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  boroughOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingLeft: SPACING.md,
  },
  boroughText: {
    fontSize: FONTS.md,
  },
  pickerClose: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  pickerCloseText: {
    fontSize: FONTS.md,
    fontWeight: '600',
  },
});
