import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FONTS, SPACING, BORDER_RADIUS, AVATAR_COLORS } from '../../src/constants/theme';
import { useUserStore } from '../../src/store/userStore';
import { useThemeStore } from '../../src/store/themeStore';
import { groupsAPI } from '../../src/services/api';

interface Group {
  id: string;
  name: string;
  description: string;
  members: string[];
  avatar_color: string;
  invite_code: string;
  creator_device_id: string;
}

export default function GroupsScreen() {
  const router = useRouter();
  const { colors } = useThemeStore();
  const { user, deviceId } = useUserStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [inviteCode, setInviteCode] = useState('');

  const loadGroups = useCallback(async () => {
    if (!deviceId) return;
    try {
      const data = await groupsAPI.getUserGroups(deviceId);
      setGroups(data);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  }, [loadGroups]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !deviceId) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    try {
      const newGroup = await groupsAPI.create({
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        creator_device_id: deviceId,
        avatar_color: selectedColor,
      });
      setGroups([...groups, newGroup]);
      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDesc('');
      Alert.alert('Success', `Group created! Invite code: ${newGroup.invite_code}`);
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group');
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim() || !deviceId) {
      Alert.alert('Error', 'Please enter an invite code');
      return;
    }
    try {
      const result = await groupsAPI.joinByCode(inviteCode.trim(), deviceId);
      if (result.group) {
        setGroups([...groups.filter(g => g.id !== result.group.id), result.group]);
      }
      setShowJoinModal(false);
      setInviteCode('');
      Alert.alert('Success', result.message);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Invalid invite code');
    }
  };

  const navigateToGroup = (group: Group) => {
    router.push(`/group/${group.id}`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>SQUADS</Text>
        <View style={styles.headerButtons}>
          <Pressable
            style={[styles.headerButton, { backgroundColor: colors.backgroundSecondary }]}
            onPress={() => setShowJoinModal(true)}
          >
            <Ionicons name="enter" size={20} color={colors.primary} />
          </Pressable>
          <Pressable
            style={[styles.headerButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {groups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Squads Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Create a squad or join one with an invite code
            </Text>
            <View style={styles.emptyButtons}>
              <Pressable
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowCreateModal(true)}
              >
                <Ionicons name="add" size={20} color={colors.textPrimary} />
                <Text style={[styles.emptyButtonText, { color: colors.textPrimary }]}>Create Squad</Text>
              </Pressable>
              <Pressable
                style={[styles.emptyButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => setShowJoinModal(true)}
              >
                <Ionicons name="enter" size={20} color={colors.primary} />
                <Text style={[styles.emptyButtonText, { color: colors.primary }]}>Join Squad</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          groups.map((group) => (
            <Pressable
              key={group.id}
              style={[styles.groupCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
              onPress={() => navigateToGroup(group)}
            >
              <View style={[styles.groupAvatar, { backgroundColor: group.avatar_color }]}>
                <Text style={styles.groupAvatarText}>{group.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.groupInfo}>
                <Text style={[styles.groupName, { color: colors.textPrimary }]}>{group.name}</Text>
                <Text style={[styles.groupMembers, { color: colors.textSecondary }]}>
                  {group.members?.length || 0} members
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Create Group Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Create Squad</Text>
            
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>SQUAD NAME</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.backgroundTertiary, color: colors.textPrimary, borderColor: colors.border }]}
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="Enter squad name"
              placeholderTextColor={colors.textMuted}
              maxLength={30}
            />

            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.backgroundTertiary, color: colors.textPrimary, borderColor: colors.border }]}
              value={newGroupDesc}
              onChangeText={setNewGroupDesc}
              placeholder="What's your squad about?"
              placeholderTextColor={colors.textMuted}
              maxLength={100}
            />

            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>SQUAD COLOR</Text>
            <View style={styles.colorPicker}>
              {AVATAR_COLORS.map((color) => (
                <Pressable
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && <Ionicons name="checkmark" size={20} color="white" />}
                </Pressable>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.backgroundTertiary }]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleCreateGroup}
              >
                <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>Create</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Join Group Modal */}
      <Modal visible={showJoinModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Join Squad</Text>
            
            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>INVITE CODE</Text>
            <TextInput
              style={[styles.textInput, styles.codeInput, { backgroundColor: colors.backgroundTertiary, color: colors.textPrimary, borderColor: colors.border }]}
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              placeholder="Enter 8-digit code"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              maxLength={8}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.backgroundTertiary }]}
                onPress={() => setShowJoinModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleJoinGroup}
              >
                <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>Join</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  title: { fontSize: FONTS.xxl, fontWeight: '800', letterSpacing: 2 },
  headerButtons: { flexDirection: 'row', gap: SPACING.sm },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingTop: 0 },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyTitle: { fontSize: FONTS.xl, fontWeight: '700', marginTop: SPACING.md },
  emptySubtitle: { fontSize: FONTS.md, marginTop: SPACING.sm, textAlign: 'center' },
  emptyButtons: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  emptyButtonText: { fontSize: FONTS.md, fontWeight: '600' },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
  },
  groupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatarText: { fontSize: FONTS.xl, fontWeight: '800', color: '#FFFFFF' },
  groupInfo: { flex: 1, marginLeft: SPACING.md },
  groupName: { fontSize: FONTS.md, fontWeight: '600' },
  groupMembers: { fontSize: FONTS.sm, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  modalContent: { borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg },
  modalTitle: { fontSize: FONTS.xl, fontWeight: '700', marginBottom: SPACING.lg, textAlign: 'center' },
  inputLabel: { fontSize: FONTS.xs, fontWeight: '600', letterSpacing: 1, marginBottom: SPACING.xs },
  textInput: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONTS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  codeInput: { textAlign: 'center', fontSize: FONTS.xl, letterSpacing: 4 },
  colorPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  colorOption: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  colorOptionSelected: { borderWidth: 3, borderColor: '#FFFFFF' },
  modalButtons: { flexDirection: 'row', gap: SPACING.md },
  modalButton: { flex: 1, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, alignItems: 'center' },
  modalButtonText: { fontSize: FONTS.md, fontWeight: '600' },
});
