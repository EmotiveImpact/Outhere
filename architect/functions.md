# OUT HERE Function Architecture

Last updated: 2026-02-28
Audience: Agents + SWE
Scope: Functional architecture for `apps/mobile`, `apps/web`, and `backend` in this repo.

## 1) System Topology

```mermaid
graph TD
  M[Expo Mobile App\napps/mobile] -->|fetch /api/* via Create fetch shim| W[Web Runtime API\napps/web/src/app/api/*]
  M -->|fetch /api/* to EXPO_PUBLIC_BACKEND_URL| B[FastAPI Backend\nbackend/server.py]
  M -->|local persistence| A[AsyncStorage + SecureStore]
  M -->|device sensors| S[Expo Pedometer + Location + Speech + Haptics]

  W -->|SQL queries| N[(Neon/Postgres via DATABASE_URL)]
  W -->|auth token extraction| C[@auth/core getToken]

  B -->|SUPABASE_DB_URL| P[(Postgres Doc Store\napp_documents)]
  B -->|MONGO_URL| G[(MongoDB)]
  B -->|fallback| MM[(In-memory mongomock)]
```

## 2) Function Inventory By Layer

## 2.1 Mobile Runtime/Bootstrap

- `RootLayout` (`apps/mobile/src/app/_layout.jsx`): initializes auth (`useAuth().initiate`) and local device identity (`useUserStore.initializeDevice`), then mounts React Query + Expo Router.
- `Index` (`apps/mobile/src/app/index.jsx`): routes to `/welcome` vs `/(tabs)` based on `useUserStore.isOnboarded`.
- `TabLayout` (`apps/mobile/src/app/(tabs)/_layout.jsx`): defines tab shell and prefetches `/api/dashboard` for avatar.
- `global.fetch` override (`apps/mobile/src/__create/polyfills.ts` + `apps/mobile/src/__create/fetch.ts`): routes first-party relative URLs to Create base URL with auth/project headers.

## 2.2 Mobile Store Functions (Zustand)

### `useUserStore` (`apps/mobile/src/store/userStore.js`)

- `initializeDevice`
- `setUser`
- `updateTodayStats`
- `toggleIsOutside`
- `setOnboarded`
- `setWeeklyGoal`
- `setSquadName`
- `setSyncStatus`
- `earnXP`
- `spendXP`
- `updateStreak`
- `clearUser`

Ownership:
- Authoritative local state for onboarding, XP, streak, local profile mirror, and per-day check-in markers.

### `useMoveStore` (`apps/mobile/src/store/useMoveStore.js`)

Route/session lifecycle functions:
- `setPlanning`
- `clearPlannedRoute`
- `loadRouteToPlan`
- `addPlannedLocation`
- `removeLastPlannedLocation`
- `rerouteToDestination`
- `startSession`
- `updateSessionSteps`
- `updateSessionPath`
- `pauseSession`
- `resumeSession`
- `stopSession`
- `updateLastSessionFeeling`
- `loadHistory`
- `saveRoute`
- `dismissSummary`

Helpers:
- `formatDuration`
- `formatPace`

Ownership:
- Authoritative local state for active Move session, planned route, GPS path, local run history, and saved routes.

### `useClubStore` (`apps/mobile/src/store/useClubStore.js`)

- `addPost`
- `addRunPost`
- `toggleLike`
- `addComment`

Ownership:
- Local persisted social feed and lightweight interactions.

### `useSettingsStore` (`apps/mobile/src/utils/settingsStore.js`)

- `toggleMetric`

Ownership:
- Local display preference (`showSteps`).

## 2.3 Mobile Services/Hooks/Auth

### API Client (`apps/mobile/src/services/api.js`)

Core request function:
- `request(path, options)`

Domain wrappers:
- `userAPI`: `create`, `checkUsername`, `get`, `update`, `updateOutsideStatus`, `checkIn`
- `stepsAPI`: `record`, `getToday`, `getHistory`, `getWeeklySummary`
- `leaderboardAPI`: `get`, `getCities`
- `communityAPI`: `getOutsideNow`
- `challengesAPI`: `getAll`, `join`
- `groupsAPI`: `create`, `get`, `getUserGroups`, `join`, `joinByCode`, `leave`, `getMembers`, `getLeaderboard`, `sendMessage`, `getMessages`, `createChallenge`, `getChallenges`, `getChallengeProgress`
- `statsAPI`: `getUserStats`
- `missionsAPI`: `create`, `get`, `getProgress`, `getForUser`, `accept`, `decline`, `forfeit`

### Pedometer Hook (`apps/mobile/src/hooks/usePedometer.js`)

- `checkPermission`
- `getTodaySteps`
- `syncSteps` (calls `stepsAPI.record`)
- `startTracking`
- `stopTracking`
- `simulateSteps`

### Route Planning Service (`apps/mobile/src/services/routePlanning.js`)

- `fetchOSRMRoute`
- `getRouteBoundingBox`

Internal helpers:
- `humanizeModifier`
- `buildStepInstruction`

### Haptics (`apps/mobile/src/services/haptics.js`)

- `hapticSelection`, `hapticSuccess`, `hapticError`, `hapticImpact`, `hapticHeavy`

### Auth (`apps/mobile/src/utils/auth/*`)

- `useAuth`: `initiate`, `signIn`, `signUp`, `signOut`
- `useRequireAuth`
- `useUser` (auth-derived user accessor)
- `useAuthStore.setAuth`
- `useAuthModal.open/close`
- `AuthWebView` (native WebView + web iframe auth handshake)
- `AuthModal` (modal container)

## 2.4 Mobile Screen-Orchestrator Functions

These functions coordinate stores/hooks/services inside route screens.

- Home (`apps/mobile/src/app/(tabs)/index.jsx`):
`fetchDashboard`, `fetchLeaderboard`, `handleCheckIn`, `getGreeting`, `getRandomPhrase`, `formatDate`, `formatDistance`, `formatPace`, `formatTime`, `formatDistanceTag`.
- Move (`apps/mobile/src/app/(tabs)/move.jsx`):
`handleStartRun`, `handleFreshRoute`, `handleStopRun`, `handleSaveRoute`, `confirmSaveRoute`, `handleShareToClubFeed`, `handleMapPress`, `handleFeelingComplete`, `handleOpenDirections`, `handleMapPanDrag`, `speakPrompt`, plus route guidance helpers `getDistanceMeters`, `getDistanceToPath`, `formatDistanceLabel`.
- Club (`apps/mobile/src/app/(tabs)/club.jsx`):
`triggerLoading`, `toggleLike`, `handleCreatePost`, `generateInviteCode`, `handleJoinClub`, `handleCreateClub`, `handleToggleChallenge`, `handleOpenComments`, `handleAddComment`, `handleSharePost`, `handleSendMessage`.
- Challenges (`apps/mobile/src/app/(tabs)/challenges.jsx`):
`fetchLeaderboard` and local battle/challenge state transitions in component-level handlers.
- Profile (`apps/mobile/src/app/(tabs)/profile.jsx`):
`fetchDashboard`, `fetchProfile`, `fetchLeaderboard`, `fetchRuns`, `updateProfile`, `handleSaveProfile`, `handleRetakeOnboarding`, plus analytics helpers (`calculateDailyGoalProgress`, `getWeeklySummaryFromRuns`, `getRecordsFromRuns`, `getRunStreak`, `getLast7DaysTrend`).
- Onboarding (`apps/mobile/src/app/onboarding.jsx`):
`handleOnboard`, `handleDevBypass`, username/city validation effects.

## 2.5 Web Runtime API Functions (`apps/web/src/app/api`)

Production-facing handlers:
- `GET /api/dashboard` (`dashboard/route.js`)
- `GET /api/leaderboard` (`leaderboard/route.js`)
- `GET /api/profile`, `PATCH /api/profile` (`profile/route.js`)
- `GET /api/runs` (`runs/route.js`)
- `GET /api/auth/token` (`auth/token/route.js`)
- `GET /api/auth/expo-web-success` (`auth/expo-web-success/route.js`)

Internal/test handler:
- `GET /api/__create/ssr-test` (`__create/ssr-test/route.js`)

Utilities:
- `sql` from `utils/sql.js` (Neon SQL client / null-guard fallback)
- Profile helpers: `clampText`, `calculateStreaks`
- Runs helper: `parsePositiveInt`

## 2.6 Backend API Functions (`backend/server.py`)

### Helper functions

- `calculate_outside_score`
- `get_or_create_user`
- `calculate_checkin_streak`
- `_mission_progress_value`
- `_mission_progress_percent`
- `_enrich_mission`
- `_evaluate_active_mission`
- `calculate_streak`

### Route handlers (all prefixed by `/api`)

User:
- `POST /users` -> `create_user`
- `GET /users/{device_id}` -> `get_user`
- `PUT /users/{device_id}` -> `update_user`
- `POST /users/{device_id}/outside-status` -> `update_outside_status`
- `POST /users/{device_id}/checkin` -> `daily_checkin`

Steps:
- `POST /steps` -> `record_steps`
- `GET /steps/{device_id}/today` -> `get_today_steps`
- `GET /steps/{device_id}/history` -> `get_step_history`
- `GET /steps/{device_id}/weekly-summary` -> `get_weekly_summary`

Leaderboard/community:
- `GET /leaderboard` -> `get_leaderboard`
- `GET /leaderboard/cities` -> `get_city_leaderboard`
- `GET /community/outside-now` -> `get_outside_now`

Challenges:
- `GET /challenges` -> `get_challenges`
- `POST /challenges/{challenge_id}/join` -> `join_challenge`

Groups/social:
- `POST /groups` -> `create_group`
- `GET /groups/{group_id}` -> `get_group`
- `GET /groups/user/{device_id}` -> `get_user_groups`
- `POST /groups/{group_id}/join` -> `join_group`
- `POST /groups/join-by-code` -> `join_group_by_code`
- `POST /groups/{group_id}/leave` -> `leave_group`
- `GET /groups/{group_id}/members` -> `get_group_members`
- `GET /groups/{group_id}/leaderboard` -> `get_group_leaderboard`
- `POST /groups/{group_id}/messages` -> `send_message`
- `GET /groups/{group_id}/messages` -> `get_messages`
- `POST /groups/{group_id}/challenges` -> `create_group_challenge`
- `GET /groups/{group_id}/challenges` -> `get_group_challenges`
- `GET /groups/{group_id}/challenges/{challenge_id}/progress` -> `get_challenge_progress`

Missions:
- `POST /missions` -> `create_mission`
- `GET /missions/user/{device_id}` -> `list_user_missions`
- `GET /missions/{mission_id}` -> `get_mission`
- `POST /missions/{mission_id}/accept` -> `accept_mission`
- `POST /missions/{mission_id}/decline` -> `decline_mission`
- `POST /missions/{mission_id}/forfeit` -> `forfeit_mission`
- `GET /missions/{mission_id}/progress` -> `get_mission_progress`

Stats/system:
- `GET /stats/{device_id}` -> `get_user_stats`
- `GET /` -> `root`
- `GET /health` -> `health_check`
- Startup/shutdown: `startup_db`, `shutdown_db_client`

## 2.7 Backend Storage Adapter Functions (`backend/postgres_docstore.py`)

Query/matching helpers:
- `_encode`, `_parse_dt`, `_cmp`, `_match_doc`

Cursor APIs:
- `QueryCursor.sort`, `QueryCursor.limit`, `QueryCursor.to_list`
- `AggregateCursor.to_list`

Collection API:
- `find_one`, `insert_one`, `update_one`, `find`, `count_documents`, `aggregate`

Store API:
- `PostgresDocStore.initialize`

Collections exposed:
- `users`, `steps`, `groups`, `messages`, `challenges`, `group_challenges`, `daily_checkins`, `missions`

## 3) End-to-End Feature Connectivity

## 3.1 App bootstrap + auth readiness

1. `RootLayout` calls `useAuth().initiate` and `useUserStore.initializeDevice`.
2. Auth token is loaded from SecureStore via `useAuthStore`.
3. Mobile fetch shim injects project/auth headers for first-party routes.

## 3.2 Onboarding + optional squad join

1. `OnboardingScreen.handleOnboard` builds local user payload.
2. Calls `userAPI.create` -> backend `create_user` (`POST /api/users`).
3. Optional squad code calls `groupsAPI.joinByCode` -> backend `join_group_by_code`.
4. Local completion calls `setUser` and `setOnboarded(true)`.

## 3.3 Home check-in + streak/XP

1. `HomeScreen.handleCheckIn` updates local XP/streak (`earnXP`, `updateStreak`) and AsyncStorage check-in key.
2. Non-blocking backend sync via `userAPI.checkIn` -> `daily_checkin`.
3. `daily_checkin` writes `daily_checkins` and mutates `users` (`outside_score`, `checkin_streak`, etc).

## 3.4 Move tracking + backend step sync

1. `usePedometer.startTracking` starts Pedometer watch + periodic `syncSteps`.
2. `syncSteps` calls `stepsAPI.record` -> backend `record_steps`.
3. `record_steps` upserts day record, recalculates totals/streak, updates user aggregates.
4. Move UI (`MoveScreen`) consumes all-day steps from `useUserStore.todayStats` and computes session deltas via `useMoveStore.updateSessionSteps`.
5. `useMoveStore.stopSession` writes local `session_history`; XP/streak increments via `earnXP`/`updateStreak`.

## 3.5 Route planning and live rerouting

1. Planned waypoints managed by `useMoveStore.addPlannedLocation/removeLastPlannedLocation`.
2. Route generated by `fetchOSRMRoute`.
3. During active session, off-route detection in Move screen calls `useMoveStore.rerouteToDestination`.
4. Turn-by-turn prompts use `plannedRouteSteps` + speech (`expo-speech`).

## 3.6 Club social/feed

Current runtime path is local-first:
1. `ClubScreen` mutates `useClubStore` (`addPost`, `toggleLike`, `addComment`) and local component state.
2. `MoveScreen.handleShareToClubFeed` adds run post to local club feed.
3. Backend group/chat/challenge endpoints exist but are not currently the default data source for club UI.

## 3.7 Challenges and missions

- Current `Challenges` tab is mostly local/mock UI + `/api/leaderboard` read.
- Full mission backend exists (`create/accept/decline/forfeit/progress`) and is wrapped in `missionsAPI`, but not actively wired into the tab yet.

## 3.8 Profile + analytics

1. Profile screen uses web runtime endpoints: `/api/dashboard`, `/api/profile`, `/api/leaderboard`, `/api/runs`.
2. These routes query Neon SQL tables (`users`, `runs`, `events`) with `USER_ID = 1` in handlers.
3. Local move history from `useMoveStore.loadHistory` is merged with remote runs for rendering.

## 4) Data Ownership Matrix

| Feature Data | Primary Owner | Secondary Mirror | Notes |
|---|---|---|---|
| Device identity | `useUserStore.deviceId` | Backend `users.device_id` | Local generated once and reused. |
| Auth session | `useAuthStore.auth` (SecureStore) | Web auth token routes | Used by fetch shim for headers. |
| Daily steps live | `usePedometer` + `useUserStore.todayStats` | Backend `steps` + `users.total_*` | 30s sync cadence during tracking. |
| Session history/routes | `useMoveStore` (AsyncStorage) | None (currently local) | Not persisted to backend yet. |
| XP/streak local gamification | `useUserStore` | Backend check-in/streak fields differ | Local and backend systems partially overlap. |
| Club feed | `useClubStore` | None in current UI | Backend group chat/challenges available but unused by default UI. |
| Dashboard/profile/runs | Web `/api/*` SQL routes | Local fallback values in UI | SQL routes currently centered on fixed user ID. |

## 5) Contract Map (Function -> Function)

## Mobile API wrappers to backend

- `stepsAPI.record` -> `POST /api/steps` -> `record_steps` -> `steps`, `users`
- `userAPI.create` -> `POST /api/users` -> `create_user` -> `users`
- `userAPI.checkIn` -> `POST /api/users/{device_id}/checkin` -> `daily_checkin` -> `daily_checkins`, `users`
- `groupsAPI.joinByCode` -> `POST /api/groups/join-by-code` -> `join_group_by_code` -> `groups`

## Mobile `/api/*` fetch path (Create web runtime)

- `/api/dashboard` -> web `GET dashboard`
- `/api/leaderboard` -> web `GET leaderboard`
- `/api/profile` -> web `GET/PATCH profile`
- `/api/runs` -> web `GET runs`
- `/api/auth/token` + `/api/auth/expo-web-success` -> web auth token bridge

## 6) Architectural Gaps And Risks

1. `userAPI.checkUsername` has no matching backend route (`/api/users/check-username` is not implemented in `backend/server.py`).
2. Two data planes exist:
- FastAPI document-style backend keyed by `device_id`.
- Web SQL routes keyed by hardcoded `USER_ID = 1`.
3. Club and challenge UIs are mostly local state; backend group/chat/challenge APIs are underused by app screens.
4. `get_or_create_user` helper in backend exists but is currently unused.
5. `get_outside_now` includes random simulated boost, so values are not strictly deterministic/real.
6. XP/streak semantics are split between local store and backend fields; there is no strict reconciliation function.
7. `weeklyGoal` units diverge between local UI conventions (km-like values) and backend user fields (`weekly_goal` default 70000, step-like scale).

## 7) Change Guidance For Agents/SWE

1. Choose one source of truth per feature before adding logic.
2. If wiring new mobile features, decide explicitly whether they should call:
- FastAPI via `apps/mobile/src/services/api.js`
- Web runtime `/api/*` SQL routes
3. When adding endpoint wrappers, verify backend route existence in the same PR.
4. Keep store responsibilities narrow:
- `useUserStore` for identity/gamification/preferences.
- `useMoveStore` for session/route/history state machine.
- `useClubStore` for social feed (or replace with backend-backed store if migrating).
5. Preserve the call chain contract in this order: UI -> store/hook -> service/API wrapper -> server route -> persistence.
