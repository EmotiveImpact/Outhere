# App Entry Build (`src/app/index.jsx`)

## Purpose
- Gate app entry by onboarding status.
- Route users to onboarding or main tab shell.

## Main Function
- `Index()`
  - Reads `isOnboarded` from `useUserStore`.
  - Returns `<Redirect href="/welcome" />` when not onboarded.
  - Returns `<Redirect href="/(tabs)" />` when onboarded.

## Dependencies
- `useUserStore` (`isOnboarded`)
- `expo-router` `Redirect`

## Feature Connections
- Connects onboarding flow to full app shell.
- Acts as top-level auth/onboarding route guard.
