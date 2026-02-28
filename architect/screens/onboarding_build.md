# Onboarding Build (`src/app/onboarding.jsx`)

## Purpose
- Collect initial profile data.
- Create user in backend (best effort).
- Optionally join club by invite code.
- Mark onboarding complete and enter tabs.

## Main Function
- `OnboardingScreen()`

## Local State
- Profile input: `onboardUsername`, `onboardCity`, `clubCode`
- Async UX: `onboardLoading`
- Username validation: `isCheckingUsername`, `usernameStatus`
- City autocomplete: `showCityResults`, `filteredCities`

## Core Functions
- Username debounce effect
  - Validates username availability (mocked reserved-name check).
  - Updates `usernameStatus` (`idle/checking/available/taken/error`).
- City filter effect
  - Filters `MAJOR_CITIES` and toggles suggestions visibility.
- `handleOnboard()`
  - Guards invalid username states.
  - Builds `localUser` payload.
  - Calls `userAPI.create(localUser)`.
  - Optionally calls `groupsAPI.joinByCode`.
  - Falls back to local user on API failure.
  - Persists onboarding flag: `setOnboarded(true)`.
  - Navigates to `/(tabs)`.
- `handleDevBypass()`
  - Writes mock user to store and routes to tabs.

## Dependencies
- `useUserStore`: `deviceId`, `setUser`, `setOnboarded`
- API layer: `userAPI`, `groupsAPI`
- Haptics
- Safe areas/keyboard handling for mobile forms

## Feature Connections
- Seeds identity used by Home, Club, Profile, Move.
- Enables app-shell access via `isOnboarded` gate in `src/app/index.jsx`.
