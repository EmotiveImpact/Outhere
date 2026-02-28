# Settings Build (`src/app/settings.jsx`)

## Purpose
- Central preferences and account-level settings UI.
- Current live setting: leaderboard metric toggle (distance vs steps).

## Main Function
- `SettingsScreen()`

## Child Components
- `SettingRow`
  - Reusable row with icon, labels, optional right-side control, optional press.
- `SettingsGroup`
  - Section container with title and grouped rows.

## Core Interactions
- Back navigation: `router.back()`
- `showSteps` toggle via `useSettingsStore.toggleMetric`
- Placeholder rows for notifications, profile, privacy, support, logout

## Dependencies
- `useSettingsStore`: `showSteps`, `toggleMetric`
- Haptics
- Safe area + visual wrappers (`BlurView`, `LinearGradient`)

## Feature Connections
- `showSteps` is consumed by Club leaderboard rendering.
- Settings is opened from Profile header.
