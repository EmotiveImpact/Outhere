# Profile Build (`src/app/(tabs)/profile.jsx`)

## Purpose
- Personal profile and analytics center.
- Combines remote profile/dashboard data with local run history.

## Main Function
- `ProfileScreen()`

## Data Layer
- React Query:
  - `dashboard`, `profile`, `leaderboard`
  - paged runs via `useInfiniteQuery(["runs", selectedRange])`
- Local fallback history:
  - `useMoveStore.history` via `loadHistory()`
- Mutations:
  - `updateProfile` with query invalidation on success

## Major Local State
- View: `activeProfileTab` (`Overview`, `Stats`, `Calendar`, `About`)
- Filters/navigation: `selectedRange`, `selectedDate`
- Edit mode: `isEditing`, `form`, `saveMessage`
- Modal: run detail (`showRunDetail`, `selectedRun`)

## Derived Models
- `allRuns`: merged local + paginated + dashboard fallback
- `profileSummary`: API summary fallback to local computed aggregates
- `trend`, `achievements`, `markedDates`, `dailyRuns`, `userFields`

## Core Functions
- `handleSaveProfile()`
  - executes profile mutation + visual feedback
- `handleRetakeOnboarding()`
  - clears current-day check-in key
  - routes to onboarding
- Refresh flow:
  - `onRefresh` refetches all major queries

## Tab Responsibilities
- Overview
  - weekly recap, goal progress, achievements
- Stats
  - weekly metrics, personal records, 7-day trend
- Calendar
  - day-marked run history + run detail drill-down
- About
  - events, raw user fields, logout action

## Feature Connections
- Reads local Move history (critical fallback when API history is stale/unavailable).
- Opens Settings.
- Can restart onboarding and reset local check-in marker.
