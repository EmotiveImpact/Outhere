# Tabs Layout Build (`src/app/(tabs)/_layout.jsx`)

## Purpose
- Bottom-tab shell for primary app surfaces.
- Applies animated focus-mode behavior for Move session phases.

## Main Function
- `TabLayout()`

## Tab Registration
- `index` (Home)
- `challenges`
- `move`
- `club`
- `profile`

## Core Behavior
- Uses `useMoveStore(sessionPhase)` to derive `isFocusMode`.
- Animated custom tab bar wrapper (`FocusModeTabBar`) around `BottomTabBar`.
- Focus mode animation:
  - hide tab bar: translate down + fade out
  - restore tab bar: spring in + delayed interactivity

## Data Dependencies
- `dashboard` query used to fetch profile avatar for Profile tab icon.

## UX/System Concerns
- `sceneStyle` enforces dark background for tab scenes.
- global `tabPress` haptic feedback.

## Feature Connections
- Move session phases control global tab accessibility.
- Prevents accidental tab switching during run lifecycle transitions.
