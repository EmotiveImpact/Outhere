import { Platform } from "react-native";

// ── OUT HERE Theme ─────────────────────────────────────────────────────────────
// Single dark theme with neon green accent, matching the premium design language.

export const COLORS = {
  // Primary palette
  background: "#0a0a0a",
  backgroundSecondary: "#161618",
  backgroundTertiary: "#1a1a1a",

  // Accent colors
  primary: "#00ff7f",
  primaryLight: "#33ff99",
  primaryDark: "#00cc66",
  ghost: "rgba(0, 255, 127, 0.1)",

  // Text colors
  textPrimary: "#ffffff",
  textSecondary: "#aaaaaa",
  textMuted: "#666666",

  // Status colors
  success: "#00ff7f",
  warning: "#FFC107",
  error: "#FF453A",

  // Streak colors
  streakFire: "#FF6B35",
  streakGold: "#FFD700",
  streakPlatinum: "#E5E4E2",

  // Borders
  border: "#2a2a2a",
  borderLight: "#333333",

  // Cards
  cardBackground: "#161618",
  cardBackgroundElevated: "#1a1a1a",
};

// ── Typography ─────────────────────────────────────────────────────────────────

const SF_PRO_STACK =
  Platform.select({
    ios: {
      black: "SF Pro Display",
      bold: "SF Pro Display",
      regular: "SF Pro Text",
      light: "SF Pro Text",
    },
    android: {
      black: "sans-serif-black",
      bold: "sans-serif-medium",
      regular: "sans-serif",
      light: "sans-serif-light",
    },
    default: {
      black: "System",
      bold: "System",
      regular: "System",
      light: "System",
    },
  }) ?? {
    black: "System",
    bold: "System",
    regular: "System",
    light: "System",
  };

export const FONTS = {
  // Font families
  black: SF_PRO_STACK.black,
  bold: SF_PRO_STACK.bold,
  regular: SF_PRO_STACK.regular,
  light: SF_PRO_STACK.light,

  // Font sizes
  xs: 11,
  sm: 13,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 48,
  mega: 56,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 32,
  full: 999,
};

export const SHADOWS = {
  small: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
};

export const ICON_STROKE = {
  thin: 2.1,
  regular: 2.35,
  strong: 2.6,
};

// ── Cities ──────────────────────────────────────────────────────────────────────
export const CITIES = [
  { name: "London", boroughs: ["Central", "East", "West", "North", "South"] },
  { name: "Manchester", boroughs: ["City Centre", "North", "South", "East", "West"] },
  { name: "Birmingham", boroughs: ["City Centre", "North", "South", "East", "West"] },
  { name: "Liverpool", boroughs: ["City Centre", "North", "South"] },
  { name: "Leeds", boroughs: ["City Centre", "North", "South", "East", "West"] },
  { name: "Bristol", boroughs: ["City Centre", "North", "South"] },
  { name: "New York", boroughs: ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"] },
  { name: "Los Angeles", boroughs: ["Downtown", "Hollywood", "Venice", "Santa Monica"] },
  { name: "Accra", boroughs: ["Osu", "Cantonments", "Labadi", "East Legon", "Airport City"] },
];
