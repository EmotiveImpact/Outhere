# Club Build (`src/app/(tabs)/club.jsx`)

## Purpose
- Club social hub with multi-tab experience:
  - Leaderboard
  - Feed
  - Chat
  - Challenges
  - Stats

## Main Function
- `ClubScreen()`

## Core Stores
- `useClubStore`
  - `feed`, `addPost`, `toggleLike`, `addComment`
- `useUserStore`
  - `squadName`, `setSquadName`
- `useSettingsStore`
  - `showSteps`, `toggleMetric` for leaderboard unit rendering

## Major Local State
- Navigation: `activeTab`, `filterPeriod`
- Modals: join/create/post/comments
- Club metadata: `clubMeta`, `inviteCodePreview`
- Feed/comment composition: `newPostText`, `newCommentText`, `commentsByPost`, `activePost`
- Leaderboard filters: `streakSort`, `cityFilter`
- Chat: `messages`, `newMessage`
- Challenges: `challenges`

## Core Functions
- Social/feed
  - `handleCreatePost`, `toggleLike`, `handleOpenComments`, `handleAddComment`, `handleSharePost`
- Club membership
  - `handleJoinClub`, `handleCreateClub`, `generateInviteCode`
- Challenges/chat
  - `handleToggleChallenge`, `handleSendMessage`

## Supporting Components
- `ProgressBar`
- `HeartBurst` (like animation particles)
- `HapticTouchable` (haptic-enhanced press wrapper)

## Feature Connections
- Move summary share posts are injected into this feed via `addRunPost` (store-level).
- Settings metric toggle changes leaderboard stat unit rendering.
- Club presence data is consumed by Move top overlays (`useClubStore.feed`).
