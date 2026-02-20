import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export interface UserProfile {
  id: string;
  device_id: string;
  username: string;
  city: string;
  borough: string;
  total_steps: number;
  total_distance: number;
  outside_score: number;
  current_streak: number;
  longest_streak: number;
  daily_goal: number;
  weekly_goal: number;
  avatar_color: string;
  is_outside: boolean;
}

export interface TodayStats {
  steps: number;
  distance: number;
  active_minutes: number;
  date: string;
}

interface UserState {
  user: UserProfile | null;
  deviceId: string | null;
  todayStats: TodayStats;
  isLoading: boolean;
  isOnboarded: boolean;
  
  // Actions
  initializeDevice: () => Promise<string>;
  setUser: (user: UserProfile) => void;
  updateTodayStats: (stats: Partial<TodayStats>) => void;
  setIsOutside: (isOutside: boolean) => void;
  setOnboarded: (value: boolean) => void;
  clearUser: () => void;
}

const generateDeviceId = async (): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  deviceId: null,
  todayStats: {
    steps: 0,
    distance: 0,
    active_minutes: 0,
    date: new Date().toISOString().split('T')[0],
  },
  isLoading: true,
  isOnboarded: false,

  initializeDevice: async () => {
    try {
      let deviceId = await AsyncStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = await generateDeviceId();
        await AsyncStorage.setItem('device_id', deviceId);
      }
      
      const isOnboarded = await AsyncStorage.getItem('is_onboarded');
      
      set({ 
        deviceId, 
        isLoading: false,
        isOnboarded: isOnboarded === 'true'
      });
      return deviceId;
    } catch (error) {
      console.error('Error initializing device:', error);
      const fallbackId = `fallback_${Date.now()}`;
      set({ deviceId: fallbackId, isLoading: false });
      return fallbackId;
    }
  },

  setUser: (user) => set({ user }),

  updateTodayStats: (stats) => set((state) => ({
    todayStats: { ...state.todayStats, ...stats }
  })),

  setIsOutside: (isOutside) => set((state) => ({
    user: state.user ? { ...state.user, is_outside: isOutside } : null
  })),

  setOnboarded: async (value) => {
    await AsyncStorage.setItem('is_onboarded', value.toString());
    set({ isOnboarded: value });
  },

  clearUser: () => set({ user: null, isOnboarded: false }),
}));
