# Challenges Build (`src/app/(tabs)/challenges.jsx`)

## Purpose
- Show weekly challenge progress, active battles, events, and daily/achievement cards.

## Main Function
- `Challenges()`

## Data Sources
- `useUserStore`: XP (`yourXP`)
- React Query leaderboard (`friends`) with fallback mock friends/events/challenges

## Local State
- `showChallenge` (new battle form open)
- `xpStake` (battle wager)
- `selectedFriend` (target opponent)

## Core Interaction Flows
- Toggle battle form (`setShowChallenge`).
- Pick opponent from friend list.
- Set XP stake input.
- Static send challenge CTA (UI-only placeholder).

## Rendered Sections
- Weekly challenge card with progress bar.
- Active battle cards (status, scores, stake).
- Upcoming events cards.
- Daily challenge cards.
- Achievement list with per-item progress bars.

## Dependencies
- Haptics on key interactions.
- `expo-linear-gradient`, `expo-image`.

## Feature Connections
- Uses global XP to contextualize challenge risk/reward.
- Future connection point for Move session outcomes feeding challenge completion.
