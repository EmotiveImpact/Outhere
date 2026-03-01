# docs/TASKS/004_XP_OUT_LEDGER.md
## Task 004 - XP + OUT Ledgers (Server Source of Truth) + Client UI

### Goal
Implement XP (status) and OUT (currency) as ledger-backed balances. XP is not spendable. OUT is spendable later.

### Requirements
1. Backend:
   - Add `xp_transactions` table/collection
   - Add `out_transactions` table/collection
   - Each transaction:
     - id
     - device_id
     - type (string enum: "active_day", "streak_bonus", "battle_win", "battle_participation", "event_checkin", "manual_admin")
     - amount (int)
     - metadata (json)
     - created_at
2. Add balance endpoints:
   - GET `/api/wallet/:deviceId` returns `{ xp_total, out_balance, recent_xp, recent_out }`
3. Awarding rules (MVP):
   - Active day: +XP (config, default 50) and +OUT (config, default 5)
   - Streak milestones: +XP bonus and +OUT bonus at 7, 14, 30 days (configurable)
   - Battle complete:
     - winner: +XP bonus and +OUT bonus
     - loser: +XP participation and +OUT participation (smaller)
4. Frontend:
   - Show XP and OUT in Profile
   - Show XP pill in Arena header
   - Add "Wallet" view in Profile with recent transactions (simple list)

### Constraints
- Keep existing `outside_score` if present, but do not use it as XP.
- Do not remove existing user fields; add new fields only if needed.

### Output Required
- git diff patch only.

### Acceptance Criteria
- Wallet endpoint returns correct totals.
- XP and OUT visible in Profile.
- XP updates after battle completion and active day sync.