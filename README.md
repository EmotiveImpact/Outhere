# OUT HERE

**WE OUTSIDE.**

OUT HERE is an urban movement app built with React Native + Expo. It rewards real-world movement (steps/distance), supports social competition, and organizes Outside experiences across battles, events, drops, and news.

## Monorepo Structure

- `apps/mobile` - Expo mobile app (the app)
- `apps/web` - early web app generated on Anything (not yet part of the plan)
- `backend` - FastAPI server, not used by the app while it runs local-first
- `Docs` - PRD, [roadmap](Docs/ROADMAP.md), build plan and task specs
- `marketing` - website/marketing assets

Where the app is heading, phase by phase, is in [Docs/ROADMAP.md](Docs/ROADMAP.md).

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
- Local-first data engine (`apps/mobile/src/data`); server stack to be chosen
- react-native-maps, with OSRM (or Mapbox when a token is set) for route snapping

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

Every feature runs on the phone for now (see `apps/mobile/src/data/README.md`), so there is no server to start and the app runs in Expo Go.

```bash
cd apps/mobile
npm install
npx expo start
```

Scan the QR code with the Expo Go app (iOS: the Camera app). Press `i` or `a` for a simulator, or `w` for the browser. Simulators and the browser have no step counter: in a development build, Settings has a Developer section to add steps, fill two weeks of history or reset.

For a standalone development build instead: `npx expo run:ios` or `npx expo run:android` (the `ios/` and `android/` folders are generated, not committed).

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

Mobile uses `apps/mobile/.env` for `EXPO_PUBLIC_*` values; see `apps/mobile/.env.example`.
The backend uses `backend/.env`; see `backend/.env.example`.

## Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
# in another shell, with the server running:
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000 python tests/api_smoke_test.py
```

With no database configured the server runs on an in-memory mock, which is fine for local work only.

## Checks

```bash
cd apps/mobile
npx tsc --noEmit                              # type check (TypeScript files only)
npx jest                                      # engine tests
npx expo export --platform ios --platform android   # confirms the app bundles
```
