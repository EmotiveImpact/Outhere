# docs/TASKS/001_ARENA_TAB.md
## Task 001 - Arena Tab (Replace Challenges) + Hub Layout

### Goal
Replace the existing "Challenges" tab with an "Arena" tab that becomes the culture hub. Preserve existing functionality and UI patterns.

### Repo Context
- Tabs live under: `frontend/app/(tabs)/`
- Tab layout: `frontend/app/(tabs)/_layout.tsx`
- Existing Home: `frontend/app/(tabs)/index.tsx`
- API client: `frontend/src/services/api.ts`
- Existing leaderboards/challenges endpoints already exist in API client.

### Requirements
1. Bottom nav must show: Home, Arena, Move, Clubs, Profile
2. Arena tab route must exist at: `frontend/app/(tabs)/arena.tsx`
3. Arena screen structure (ScrollView, cards in this order):
   - Header: Title "Arena" + XP pill (use existing userStore XP)
   - Rankings card: City + Global toggle (wire to existing leaderboard endpoint in `api.ts`)
   - Challenges card: reuse existing challenges listing UI if it exists, otherwise display the same data using existing styles.
   - Battles card: placeholder + CTA button "New Battle" (no functionality yet)
   - Events card: placeholder list with "Coming soon"
   - Drops card: placeholder with countdown style "Drops coming soon"
4. Do not remove any existing challenges components, only remove the Challenges tab from navigation.
5. Do not change step tracking logic.

### Implementation Notes
- In `_layout.tsx`, replace the Challenges tab entry with Arena.
- If the current repo uses a `challenges.tsx` screen in tabs, keep it but remove from tab bar.
- Use existing theme tokens (dark background, neon accent).

### Output Required
- Provide a git diff patch only.
- No commentary.

### Acceptance Criteria
- App boots and tabs render.
- Arena appears instead of Challenges.
- Rankings card loads data without crash.
- Home/Move/Profile still work unchanged.