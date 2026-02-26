import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Generates a unique device ID using Math.random (no extra deps needed).
 */
const generateDeviceId = () => {
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  return Array.from({ length: 32 }, hex).join("");
};

/**
 * Central user store — manages device identity, user profile, today's stats,
 * onboarding state, and sync status.
 *
 * Ported from original OUTHERE (TypeScript) → JavaScript for OUTHERE 2.
 */
export const useUserStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  user: null,
  deviceId: null,
  todayStats: {
    steps: 0,
    distance: 0,
    active_minutes: 0,
    date: new Date().toISOString().split("T")[0],
  },
  isLoading: true,
  isOnboarded: false,
  syncStatus: "idle", // 'idle' | 'syncing' | 'synced' | 'error'
  lastSyncAt: null,
  weeklyGoal: 20, // km — persisted separately
  xp: 0,          // XP points — persisted
  streak: 0,       // consecutive check-in days — persisted
  lastCheckInDate: null, // ISO date string of last check-in
  isOutside: false, // social status — persisted

  // ── Actions ────────────────────────────────────────────────────────────────

  /**
   * Initialize device — generates or retrieves a persistent device ID.
   * Called once on app start from the root layout.
   */
  initializeDevice: async () => {
    try {
      let deviceId = await AsyncStorage.getItem("device_id");
      if (!deviceId) {
        deviceId = await generateDeviceId();
        await AsyncStorage.setItem("device_id", deviceId);
      }

      const isOnboarded = await AsyncStorage.getItem("is_onboarded");
      const savedGoal = await AsyncStorage.getItem("weekly_goal");
      const savedXp = await AsyncStorage.getItem("xp");
      const savedStreak = await AsyncStorage.getItem("streak");
      const savedLastCheckIn = await AsyncStorage.getItem("last_check_in_date");
      const savedIsOutside = await AsyncStorage.getItem("is_outside");

      set({
        deviceId,
        isLoading: false,
        isOnboarded: isOnboarded === "true",
        weeklyGoal: savedGoal ? parseInt(savedGoal, 10) : 20,
        xp: savedXp ? parseInt(savedXp, 10) : 0,
        streak: savedStreak ? parseInt(savedStreak, 10) : 0,
        lastCheckInDate: savedLastCheckIn || null,
        isOutside: savedIsOutside === "true",
      });
      return deviceId;
    } catch (error) {
      console.error("Error initializing device:", error);
      const fallbackId = `fallback_${Date.now()}`;
      set({ deviceId: fallbackId, isLoading: false });
      return fallbackId;
    }
  },

  setUser: (user) => set({ user }),

  updateTodayStats: (stats) =>
    set((state) => ({
      todayStats: { ...state.todayStats, ...stats },
    })),

  toggleIsOutside: async () => {
    const newVal = !get().isOutside;
    await AsyncStorage.setItem("is_outside", newVal.toString());
    set({ isOutside: newVal });
  },

  setOnboarded: async (value) => {
    await AsyncStorage.setItem("is_onboarded", value.toString());
    set({ isOnboarded: value });
  },

  setWeeklyGoal: async (goal) => {
    await AsyncStorage.setItem("weekly_goal", goal.toString());
    set({ weeklyGoal: goal });
  },

  setSyncStatus: (status, at) =>
    set((state) => ({
      syncStatus: status,
      lastSyncAt: at === undefined ? state.lastSyncAt : at,
    })),

  earnXP: async (amount) => {
    const newXp = (get().xp || 0) + amount;
    await AsyncStorage.setItem("xp", newXp.toString());
    set({ xp: newXp });
  },

  spendXP: async (amount) => {
    const current = get().xp || 0;
    if (current < amount) return false;
    const newXp = current - amount;
    await AsyncStorage.setItem("xp", newXp.toString());
    set({ xp: newXp });
    return true;
  },

  updateStreak: async () => {
    const today = new Date().toISOString().split("T")[0];
    const { lastCheckInDate, streak } = get();

    if (lastCheckInDate === today) return; // already checked in today

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const newStreak = lastCheckInDate === yesterdayStr ? streak + 1 : 1;

    await AsyncStorage.setItem("streak", newStreak.toString());
    await AsyncStorage.setItem("last_check_in_date", today);
    set({ streak: newStreak, lastCheckInDate: today });
  },

  clearUser: () =>
    set({
      user: null,
      isOnboarded: false,
      syncStatus: "idle",
      lastSyncAt: null,
    }),
}));
