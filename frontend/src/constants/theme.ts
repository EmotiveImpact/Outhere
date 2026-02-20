export const THEMES = {
  burnt_orange: {
    name: 'Burnt Orange',
    // Primary palette
    background: '#0A0A0A',
    backgroundSecondary: '#141414',
    backgroundTertiary: '#1C1C1C',
    
    // Accent colors
    primary: '#FF6B35',
    primaryLight: '#FF8C5A',
    primaryDark: '#E55A25',
    
    // Text colors
    textPrimary: '#FFFFFF',
    textSecondary: '#A0A0A0',
    textMuted: '#666666',
    
    // Status colors
    success: '#4CAF50',
    warning: '#FFC107',
    error: '#F44336',
    
    // Streak colors
    streakFire: '#FF6B35',
    streakGold: '#FFD700',
    streakPlatinum: '#E5E4E2',
    
    // Borders
    border: '#2A2A2A',
    borderLight: '#3A3A3A',
    
    // Cards
    cardBackground: '#141414',
    cardBackgroundElevated: '#1C1C1C',
  },
  neon_lime: {
    name: 'Neon Lime',
    // Primary palette - Dark navy blue
    background: '#1E1E2A',
    backgroundSecondary: '#252536',
    backgroundTertiary: '#2C2C42',
    
    // Accent colors - Lime green
    primary: '#C5FF51',
    primaryLight: '#D4FF7A',
    primaryDark: '#A8E035',
    
    // Text colors
    textPrimary: '#FFFFFF',
    textSecondary: '#A0A0A0',
    textMuted: '#707090',
    
    // Status colors
    success: '#C5FF51',
    warning: '#FFD700',
    error: '#FF5757',
    
    // Streak colors
    streakFire: '#C5FF51',
    streakGold: '#FFD700',
    streakPlatinum: '#E5E4E2',
    
    // Borders
    border: '#3A3A4A',
    borderLight: '#4A4A5A',
    
    // Cards
    cardBackground: '#252536',
    cardBackgroundElevated: '#2C2C42',
  },
};

// Default colors - will be replaced by ThemeProvider
export const COLORS = { ...THEMES.burnt_orange };

export const FONTS = {
  // Font families
  bold: 'System',
  regular: 'System',
  
  // Font sizes
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 48,
  mega: 64,
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
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 6.27,
    elevation: 6,
  },
};

// Avatar color options
export const AVATAR_COLORS = [
  '#FF6B35',
  '#4CAF50',
  '#2196F3',
  '#9C27B0',
  '#FF9800',
  '#E91E63',
  '#00BCD4',
  '#8BC34A',
];

// Cities for selection
export const CITIES = [
  { name: 'London', boroughs: ['Central', 'East', 'West', 'North', 'South'] },
  { name: 'Manchester', boroughs: ['City Centre', 'North', 'South', 'East', 'West'] },
  { name: 'Birmingham', boroughs: ['City Centre', 'North', 'South', 'East', 'West'] },
  { name: 'Liverpool', boroughs: ['City Centre', 'North', 'South'] },
  { name: 'Leeds', boroughs: ['City Centre', 'North', 'South', 'East', 'West'] },
  { name: 'Bristol', boroughs: ['City Centre', 'North', 'South'] },
  { name: 'New York', boroughs: ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'] },
  { name: 'Los Angeles', boroughs: ['Downtown', 'Hollywood', 'Venice', 'Santa Monica'] },
];
