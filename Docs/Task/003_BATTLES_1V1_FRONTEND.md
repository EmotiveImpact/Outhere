# docs/TASKS/003_BATTLES_1V1_FRONTEND.md
## Task 003 - Frontend: 1v1 Battles UI (Create + List + Detail)

### Goal
Add 1v1 battles UI inside Arena. Keep design consistent with existing cards and dark theme.

### Requirements
1. Add battles section in Arena:
   - "Active Battles" list (show at least 3)
   - "New Battle" CTA opens modal/screen
2. New Battle flow:
   - Choose opponent by username search (if not implemented yet, use a temporary input for opponent username and resolve via backend search endpoint or existing user fetch)
   - Choose duration (2h, 6h, 24h, 7d)
   - Create battle using POST `/api/battles`
3. Battle detail screen:
   - Show participants, countdown to end, current step totals (poll every 30–60 seconds)
   - After complete: show winner, share-style result card
4. Add a "Battles" sub-screen accessible from Arena battles card (optional) or within Arena list.

### Files Likely to Touch
- `frontend/app/(tabs)/arena.tsx`
- `frontend/src/services/api.ts` (add battles methods)
- `frontend/app/battles/*` or `frontend/app/(tabs)/battles.tsx` depending on routing style
- components as needed

### Output Required
- git diff patch only.

### Acceptance Criteria
- User can create a battle.
- Battle shows up under Active Battles.
- Detail view loads and updates.
- UI matches existing style.