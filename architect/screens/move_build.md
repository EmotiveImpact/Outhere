# Move Build (`src/app/(tabs)/move.jsx` + `src/store/useMoveStore.js`)

## Purpose
- End-to-end movement session engine:
  - route planning
  - countdown/start
  - active tracking (GPS + steps)
  - pause/resume/stop
  - summary + route save/share

## Core Architecture
- UI orchestration: `MoveScreen`
- State machine + persistence: `useMoveStore`
- Session phase enum: `MOVE_SESSION_PHASE`
  - `idle`, `priming`, `active`, `paused`, `summary`

## Store Model (`useMoveStore`)
- Session state
  - `sessionPhase`, `isActive`, `isPaused`, `isSessionPriming`
  - steps, distance, duration, start time, timer interval
  - live GPS path (`sessionPath`)
- Planning state
  - waypoints, snapped route path, route distance, route steps
  - planning request IDs to discard stale route responses
  - reroute in-flight flag
- Summary/history state
  - `lastSession`, `history`, `savedRoutes`

## Store Actions
- Planning actions
  - `setPlanning`, `clearPlannedRoute`, `loadRouteToPlan`
  - `addPlannedLocation`, `removeLastPlannedLocation`, `rerouteToDestination`
- Session actions
  - `beginSessionPriming`, `endSessionPriming`
  - `startSession`, `pauseSession`, `resumeSession`, `stopSession`
  - `resetMoveState`, `dismissSummary`
- Summary/route actions
  - `updateLastSessionFeeling`, `saveRoute`, `loadHistory`

## Screen-Level Flows (`MoveScreen`)
- Startup/focus
  - requests location permission
  - recenters map on tab focus
  - loads session history/saved routes
- Countdown/start
  - `handleStartRun` => `beginSessionPriming` + countdown + `startSession`
- Active tracking
  - location watcher pushes points into `updateSessionPath`
  - step deltas pushed via `updateSessionSteps`
  - off-route detection triggers `rerouteToDestination`
  - spoken turn prompts via `expo-speech`
- Control actions
  - pause/resume button toggles `pauseSession`/`resumeSession`
  - stop button triggers `handleStopRun` => `stopSession`
  - left active button (`handleDiscardRunToMap`) hard-resets to idle map
- Summary
  - route save modal
  - share to club feed (`addRunPost`)
  - back-to-map resets full run/planning state

## Why The Bug Persisted Before
- Two race classes remained:
  1. **Async stop race**
     - `stopSession` previously switched UI state *after* async storage writes.
     - During that window, users could trigger competing actions with stale visible controls.
  2. **Tap-through race**
     - Layer transitions could expose a newly mounted control during the same gesture.
     - Result: accidental secondary handler invocation (felt like frozen/paused or corrupted state).

## Fixes Now Applied
- Session transition first, persist second
  - `stopSession` now transitions to `summary` synchronously, then writes history async.
- Ref-guarded interaction lock
  - immediate lock via `interactionLockRef` (not only state-based lock).
  - full-screen touch absorber while locked.
  - stronger locks around stop/discard/back-to-map transitions.
- Unified phase-driven focus mode
  - tab-bar behavior uses `sessionPhase` consistently.
- Location subscription startup guard
  - stale async subscriptions are canceled safely when state flips quickly.

## Cross-Screen Connections
- `tabs/_layout.jsx`
  - hides tab bar in any non-idle phase.
- `club.jsx`
  - receives shared run post from summary share action.
- `profile.jsx`
  - reads `useMoveStore.history` for local run history fallback.

## Current Validation Focus
- Sequence to verify:
  - start -> pause -> discard
  - start -> stop -> summary -> back to map
  - rapid repeated taps on stop/discard/back
- Expected:
  - no stuck paused overlay
  - no ghost countdown/priming state
  - clean return to idle map controls
