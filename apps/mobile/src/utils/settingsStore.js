import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useSettingsStore = create(
  persist(
    (set) => ({
      showSteps: false,
      toggleMetric: () => set((state) => ({ showSteps: !state.showSteps })),
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
