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

// Stats API
export const statsAPI = {
  getUserStats: async (deviceId: string) => {
    const response = await api.get(`/stats/${deviceId}`);
    return response.data;
  },
};

export default api;
