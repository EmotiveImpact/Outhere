import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { FONTS, SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { useUserStore } from '../../src/store/userStore';
import { useThemeStore } from '../../src/store/themeStore';
import { groupsAPI } from '../../src/services/api';

interface Message {
  id: string;
  group_id: string;
  sender_device_id: string;
  sender_username: string;
  message_type: string;
  content: string;
  created_at: string;
}

interface Member {
  device_id: string;
  username: string;
  avatar_color: string;
  today_steps: number;
  is_creator: boolean;
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useThemeStore();
  const { user, deviceId } = useUserStore();
  const scrollRef = useRef<ScrollView>(null);
  
  const [group, setGroup] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'members' | 'challenges'>('chat');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadGroupData = useCallback(async () => {
    if (!id) return;
    try {
      const [groupData, messagesData, membersData] = await Promise.all([
        groupsAPI.get(id),
        groupsAPI.getMessages(id),
        groupsAPI.getMembers(id),
      ]);
      setGroup(groupData);
      setMessages(messagesData);
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading group:', error);
      Alert.alert('Error', 'Failed to load group');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadGroupData();
    // Poll for new messages every 5 seconds
    const interval = setInterval(async () => {
      if (id && activeTab === 'chat') {
        try {
          const newMessages = await groupsAPI.getMessages(id);
          setMessages(newMessages);
        } catch (e) {}
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [loadGroupData, id, activeTab]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !deviceId || sending) return;
    setSending(true);
    try {
      await groupsAPI.sendMessage(id!, {
        sender_device_id: deviceId,
        message_type: 'text',
        content: newMessage.trim(),
      });
      setNewMessage('');
      const updated = await groupsAPI.getMessages(id!);
      setMessages(updated);
      scrollRef.current?.scrollToEnd({ animated: true });
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSendImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets[0].base64 && deviceId) {
        setSending(true);
        await groupsAPI.sendMessage(id!, {
          sender_device_id: deviceId,
          message_type: 'image',
          content: `data:image/jpeg;base64,${result.assets[0].base64}`,
        });
        const updated = await groupsAPI.getMessages(id!);
        setMessages(updated);
        setSending(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send image');
      setSending(false);
    }
  };

  const handleCopyInviteCode = () => {
    Alert.alert('Invite Code', group?.invite_code || '', [{ text: 'OK' }]);
  };

  const handleLeaveGroup = () => {
    Alert.alert('Leave Squad', 'Are you sure you want to leave this squad?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await groupsAPI.leave(id!, deviceId!);
            router.back();
          } catch (error) {
            Alert.alert('Error', 'Failed to leave group');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerInfo}>
          <View style={[styles.groupAvatar, { backgroundColor: group?.avatar_color }]}>
            <Text style={styles.groupAvatarText}>{group?.name?.charAt(0)}</Text>
          </View>
          <View>
            <Text style={[styles.groupName, { color: colors.textPrimary }]}>{group?.name}</Text>
            <Text style={[styles.memberCount, { color: colors.textSecondary }]}>
              {members.length} members
            </Text>
          </View>
        </View>
        <Pressable onPress={handleCopyInviteCode} style={styles.headerButton}>
          <Ionicons name="share-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.backgroundSecondary }]}>
        {['chat', 'members', 'challenges'].map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab as any)}
          >
            <Ionicons
              name={tab === 'chat' ? 'chatbubbles' : tab === 'members' ? 'people' : 'flag'}
              size={20}
              color={activeTab === tab ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.textMuted }]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <KeyboardAvoidingView style={styles.chatContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={scrollRef}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.map((msg) => {
              const isMe = msg.sender_device_id === deviceId;
              return (
                <View key={msg.id} style={[styles.messageRow, isMe && styles.messageRowMe]}>
                  {!isMe && (
                    <View style={[styles.msgAvatar, { backgroundColor: colors.primary }]}>
                      <Text style={styles.msgAvatarText}>{msg.sender_username?.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={[styles.messageBubble, isMe ? { backgroundColor: colors.primary } : { backgroundColor: colors.backgroundSecondary }]}>
                    {!isMe && <Text style={[styles.msgSender, { color: colors.primary }]}>{msg.sender_username}</Text>}
                    {msg.message_type === 'image' ? (
                      <Image source={{ uri: msg.content }} style={styles.messageImage} resizeMode="cover" />
                    ) : (
                      <Text style={[styles.msgText, { color: isMe ? '#FFFFFF' : colors.textPrimary }]}>{msg.content}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
          
          <View style={[styles.inputContainer, { backgroundColor: colors.backgroundSecondary, borderTopColor: colors.border }]}>
            <Pressable onPress={handleSendImage} style={styles.mediaButton}>
              <Ionicons name="image" size={24} color={colors.primary} />
            </Pressable>
            <TextInput
              style={[styles.messageInput, { backgroundColor: colors.backgroundTertiary, color: colors.textPrimary }]}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <Pressable onPress={handleSendMessage} disabled={sending} style={[styles.sendButton, { backgroundColor: colors.primary }]}>
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <ScrollView style={styles.membersList}>
          {members.map((member, idx) => (
            <View key={member.device_id} style={[styles.memberCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
              <Text style={[styles.memberRank, { color: colors.textMuted }]}>#{idx + 1}</Text>
              <View style={[styles.memberAvatar, { backgroundColor: member.avatar_color }]}>
                <Text style={styles.memberAvatarText}>{member.username?.charAt(0)}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                  {member.username} {member.is_creator && '👑'}
                </Text>
                <Text style={[styles.memberSteps, { color: colors.textSecondary }]}>
                  {member.today_steps.toLocaleString()} steps today
                </Text>
              </View>
            </View>
          ))}
          
          <Pressable style={[styles.leaveButton, { borderColor: colors.error }]} onPress={handleLeaveGroup}>
            <Ionicons name="exit-outline" size={20} color={colors.error} />
            <Text style={[styles.leaveText, { color: colors.error }]}>Leave Squad</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* Challenges Tab */}
      {activeTab === 'challenges' && (
        <ScrollView style={styles.challengesList}>
          <View style={styles.comingSoon}>
            <Ionicons name="flag" size={48} color={colors.textMuted} />
            <Text style={[styles.comingSoonText, { color: colors.textSecondary }]}>
              Group challenges coming soon!
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1 },
  backButton: { padding: SPACING.xs },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: SPACING.sm },
  groupAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  groupAvatarText: { fontSize: FONTS.lg, fontWeight: '700', color: '#FFF' },
  groupName: { fontSize: FONTS.md, fontWeight: '600' },
  memberCount: { fontSize: FONTS.sm },
  headerButton: { padding: SPACING.sm },
  tabs: { flexDirection: 'row' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, gap: SPACING.xs },
  tabText: { fontSize: FONTS.sm, fontWeight: '600' },
  chatContainer: { flex: 1 },
  messagesList: { flex: 1 },
  messagesContent: { padding: SPACING.md },
  messageRow: { flexDirection: 'row', marginBottom: SPACING.sm, alignItems: 'flex-end' },
  messageRowMe: { justifyContent: 'flex-end' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.xs },
  msgAvatarText: { fontSize: FONTS.xs, fontWeight: '700', color: '#FFF' },
  messageBubble: { maxWidth: '75%', padding: SPACING.sm, borderRadius: BORDER_RADIUS.md },
  msgSender: { fontSize: FONTS.xs, fontWeight: '600', marginBottom: 2 },
  msgText: { fontSize: FONTS.md },
  messageImage: { width: 200, height: 150, borderRadius: BORDER_RADIUS.sm },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: SPACING.sm, borderTopWidth: 1 },
  mediaButton: { padding: SPACING.sm },
  messageInput: { flex: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, maxHeight: 100, marginHorizontal: SPACING.sm },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  membersList: { flex: 1, padding: SPACING.md },
  memberCard: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.sm, borderWidth: 1 },
  memberRank: { width: 30, fontSize: FONTS.md, fontWeight: '700' },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { fontSize: FONTS.lg, fontWeight: '700', color: '#FFF' },
  memberInfo: { flex: 1, marginLeft: SPACING.md },
  memberName: { fontSize: FONTS.md, fontWeight: '600' },
  memberSteps: { fontSize: FONTS.sm },
  leaveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1, marginTop: SPACING.lg, gap: SPACING.sm },
  leaveText: { fontSize: FONTS.md, fontWeight: '600' },
  challengesList: { flex: 1, padding: SPACING.md },
  comingSoon: { alignItems: 'center', paddingVertical: SPACING.xxl },
  comingSoonText: { marginTop: SPACING.md, fontSize: FONTS.md },
});
