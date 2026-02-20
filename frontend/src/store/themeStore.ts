import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES } from '../constants/theme';

export type ThemeKey = 'burnt_orange' | 'neon_lime';

interface ThemeState {
  currentTheme: ThemeKey;
  colors: typeof THEMES.burnt_orange;
  isLoaded: boolean;
  
  // Actions
  setTheme: (theme: ThemeKey) => Promise<void>;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentTheme: 'burnt_orange',
  colors: THEMES.burnt_orange,
  isLoaded: false,

  setTheme: async (theme: ThemeKey) => {
    try {
      await AsyncStorage.setItem('app_theme', theme);
      set({ 
        currentTheme: theme, 
        colors: THEMES[theme] 
      });
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  },

  loadTheme: async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app_theme') as ThemeKey | null;
      if (savedTheme && THEMES[savedTheme]) {
        set({ 
          currentTheme: savedTheme, 
          colors: THEMES[savedTheme],
          isLoaded: true
        });
      } else {
        set({ isLoaded: true });
      }
    } catch (error) {
      console.error('Error loading theme:', error);
      set({ isLoaded: true });
    }
  },
}));
