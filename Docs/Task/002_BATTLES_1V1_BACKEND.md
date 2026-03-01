# docs/TASKS/002_BATTLES_1V1_BACKEND.md
## Task 002 - Backend: 1v1 Battles (Create, List, Detail, Complete)

### Goal
Add backend support for 1v1 battles with steps-based scoring and XP/OUT rewards hooks (ledger will be implemented later). Keep it minimal and stable.

### Requirements
1. Data Model: `Battle`
   - id (uuid)
   - type: "1v1"
   - metric: "steps"
   - creator_device_id
   - opponent_device_id
   - start_at (ISO)
   - end_at (ISO)
   - status: "pending" | "active" | "complete" | "cancelled"
   - creator_steps (int, nullable)
   - opponent_steps (int, nullable)
   - winner_device_id (nullable)
   - created_at
2. Endpoints:
   - POST `/api/battles` create a battle (creator_device_id, opponent_device_id, duration_hours or end_at)
   - GET `/api/battles/:battleId`
   - GET `/api/battles/user/:deviceId?status=active|complete|all`
   - POST `/api/battles/:battleId/cancel` (only creator, only pending/active)
3. Battle progression rules:
   - On create: status = "pending" if start_at in future else "active"
   - On GET battle: if now > end_at and status != complete, compute result and mark complete (lazy evaluation is acceptable for MVP)
4. Scoring:
   - Steps are the sum of steps recorded during [start_at, end_at] for each participant using existing steps store.
   - If steps data is day-based, approximate by summing daily totals for dates covered.
5. Anti-abuse (minimum):
   - limit battles created per user per day (configurable, default 3/day)
   - opponent must exist as a user record

### Output Required
- git diff patch only.
- No commentary.

### Acceptance Criteria
- Can create battle via endpoint.
- Can list battles for a user.
- Battle completes after end_at and produces winner.
- Does not break existing API endpoints.