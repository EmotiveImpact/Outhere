# OUT HERE

**WE OUTSIDE.**

OUT HERE is an urban movement app built with React Native + Expo. It rewards real-world movement (steps/distance), supports social competition, and organizes Outside experiences across battles, events, drops, and news.

## Monorepo Structure

- `apps/mobile` - Expo mobile app (primary client)
- `backend` - API/backend services
- `Docs` - PRD, build plan, and task specs
- `marketing` - website/marketing assets

## Mobile Navigation (Current)

Bottom tabs:

1. `Home`
2. `Outside`
3. `Move`
4. `Crew`
5. `Profile`

`Outside` is a nested section with persistent header + subpages:

- `Arena`
- `Events`
- `Drops`
- `News`

## Core Mobile Features

- Pedometer-based movement tracking
- Arena hub with rankings, challenges, and active 1v1 battles
- Battle detail screens with live countdown/progress states
- Events RSVP/check-in flows
- XP + OUT wallet/ledger surfaces
- Membership gating (Free / Pro / Black)
- Crew ownership + logo upload flow
- Rewards and drops surfaces

## Tech Stack

- React Native (Expo SDK 54)
- Expo Router
- React Query
- Zustand + AsyncStorage
- Supabase + FastAPI integrations via app API layer
- Mapbox / maps integrations (mobile-specific)

## Local Development

### Prerequisites

- Node.js 20+
- npm
- Xcode (for iOS simulator) and/or Android Studio (for Android emulator)

### Install

```bash
cd apps/mobile
npm install
```

### Run mobile app

```bash
cd apps/mobile
npx expo start
```

Useful options:

```bash
npx expo start -c   # clear Metro cache
npx expo-doctor     # dependency/environment checks
npx tsc --noEmit    # type check
```

## Expo Dependency Notes

The mobile app currently uses SDK 54 compatible versions and keeps a few pinned/overridden packages for compatibility with existing patches.

- `postinstall` runs:
  - `patch-package`
  - `scripts/cleanup-duplicate-native-deps.js`

This ensures duplicate transitive native modules are cleaned up after install so `expo-doctor` remains healthy.

## Environment

Mobile uses `apps/mobile/.env` for `EXPO_PUBLIC_*` values (API URLs, keys, app config).

## Status

Current baseline (after install):

- `npx expo-doctor` passes
- `npx tsc --noEmit` passes
- `npx expo start` boots Metro successfully
