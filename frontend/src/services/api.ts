import axios from 'axios';
import { UserProfile, TodayStats } from '../store/userStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// User API
export const userAPI = {
  create: async (data: { device_id: string; username: string; city?: string; borough?: string }): Promise<UserProfile> => {
    const response = await api.post('/users', data);
    return response.data;
  },

  get: async (deviceId: string): Promise<UserProfile> => {
    const response = await api.get(`/users/${deviceId}`);
    return response.data;
  },

  update: async (deviceId: string, data: Partial<UserProfile>): Promise<UserProfile> => {
    const response = await api.put(`/users/${deviceId}`, data);
    return response.data;
  },

  updateOutsideStatus: async (deviceId: string, isOutside: boolean): Promise<void> => {
    await api.post(`/users/${deviceId}/outside-status`, { device_id: deviceId, is_outside: isOutside });
  },
};

// Steps API
export const stepsAPI = {
  record: async (data: {
    device_id: string;
    steps: number;
    distance: number;
    active_minutes?: number;
    date: string;
  }) => {
    const response = await api.post('/steps', data);
    return response.data;
  },

  getToday: async (deviceId: string): Promise<TodayStats> => {
    const response = await api.get(`/steps/${deviceId}/today`);
    return response.data;
  },

  getHistory: async (deviceId: string, days: number = 7) => {
    const response = await api.get(`/steps/${deviceId}/history?days=${days}`);
    return response.data;
  },

  getWeeklySummary: async (deviceId: string) => {
    const response = await api.get(`/steps/${deviceId}/weekly-summary`);
    return response.data;
  },
};

// Leaderboard API
export const leaderboardAPI = {
  get: async (period: 'daily' | 'weekly' | 'alltime' = 'daily', city?: string, borough?: string) => {
    const params = new URLSearchParams();
    params.append('period', period);
    if (city) params.append('city', city);
    if (borough) params.append('borough', borough);
    const response = await api.get(`/leaderboard?${params.toString()}`);
    return response.data;
  },

  getCities: async () => {
    const response = await api.get('/leaderboard/cities');
    return response.data;
  },
};

// Community API
export const communityAPI = {
  getOutsideNow: async (city?: string) => {
    const params = city ? `?city=${city}` : '';
    const response = await api.get(`/community/outside-now${params}`);
    return response.data;
  },
};

// Challenges API
export const challengesAPI = {
  getAll: async (city?: string) => {
    const params = city ? `?city=${city}` : '';
    const response = await api.get(`/challenges${params}`);
    return response.data;
  },

  join: async (challengeId: string, deviceId: string) => {
    const response = await api.post(`/challenges/${challengeId}/join?device_id=${deviceId}`);
    return response.data;
  },
};

// Groups API
export const groupsAPI = {
  create: async (data: { name: string; description?: string; creator_device_id: string; avatar_color?: string }) => {
    const response = await api.post('/groups', data);
    return response.data;
  },

  get: async (groupId: string) => {
    const response = await api.get(`/groups/${groupId}`);
    return response.data;
  },

  getUserGroups: async (deviceId: string) => {
    const response = await api.get(`/groups/user/${deviceId}`);
    return response.data;
  },

  join: async (groupId: string, deviceId: string) => {
    const response = await api.post(`/groups/${groupId}/join?device_id=${deviceId}`);
    return response.data;
  },

  joinByCode: async (inviteCode: string, deviceId: string) => {
    const response = await api.post(`/groups/join-by-code?invite_code=${inviteCode}&device_id=${deviceId}`);
    return response.data;
  },

  leave: async (groupId: string, deviceId: string) => {
    const response = await api.post(`/groups/${groupId}/leave?device_id=${deviceId}`);
    return response.data;
  },

  getMembers: async (groupId: string) => {
    const response = await api.get(`/groups/${groupId}/members`);
    return response.data;
  },

  getLeaderboard: async (groupId: string, period: string = 'daily') => {
    const response = await api.get(`/groups/${groupId}/leaderboard?period=${period}`);
    return response.data;
  },

  // Chat
  sendMessage: async (groupId: string, data: { sender_device_id: string; message_type: string; content: string }) => {
    const response = await api.post(`/groups/${groupId}/messages`, { group_id: groupId, ...data });
    return response.data;
  },

  getMessages: async (groupId: string, limit: number = 50) => {
    const response = await api.get(`/groups/${groupId}/messages?limit=${limit}`);
    return response.data;
  },

  // Group Challenges
  createChallenge: async (groupId: string, data: { title: string; description: string; target_steps: number; end_date: string; creator_device_id: string }) => {
    const response = await api.post(`/groups/${groupId}/challenges`, { group_id: groupId, ...data });
    return response.data;
  },

  getChallenges: async (groupId: string) => {
    const response = await api.get(`/groups/${groupId}/challenges`);
    return response.data;
  },

  getChallengeProgress: async (groupId: string, challengeId: string) => {
    const response = await api.get(`/groups/${groupId}/challenges/${challengeId}/progress`);
    return response.data;
  },
};

// Stats API
export const statsAPI = {
  getUserStats: async (deviceId: string) => {
    const response = await api.get(`/stats/${deviceId}`);
    return response.data;
  },
};

export default api;
