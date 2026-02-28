# Home Build (`src/app/(tabs)/index.jsx`)

## Purpose
- Daily dashboard surface for check-in, activity snapshot, and social stories.

## Main Function
- `HomeScreen()`

## Data Sources
- `useUserStore`
  - User identity, streak, XP, goals, check-in status helpers.
- `usePedometer`
  - Live steps/distance tracking and syncing.
- React Query
  - `dashboard` and `leaderboard` for server-backed UI.
- `AsyncStorage`
  - Daily check-in persistence key: `checkin_<deviceId>_<yyyy-mm-dd>`.

## Local State
- `hasAddedStory`
- `isCheckedIn`
- `showConfetti`

## Core Functions
- startup effect: starts pedometer tracking (`startTracking`) when inactive.
- startup effect: restores daily check-in state from `AsyncStorage`.
- `handleCheckIn()`
  - Idempotent daily check-in.
  - Triggers XP and streak updates (`earnXP`, `updateStreak`).
  - Persists local check-in marker.
  - Best-effort backend check-in via `userAPI.checkIn`.

## Rendered Feature Blocks
- Header + notifications entry.
- Friend stories row (fallback dataset if API absent).
- Greeting + check-in panel.
- Streak/XP chips.
- `StepCounterWidget` for daily and weekly progress.
- Confetti overlay on successful check-in.

## Feature Connections
- Opens Notifications screen.
- Shares user progression state with Move/Challenges/Profile via `useUserStore`.
- Pedometer sync powers global step/distance metrics used across app.
