# docs/BUILD_PLAN.md
# OutHere Build Plan (Single Source of Execution Truth)

## Goal
Deliver OutHere in stable, shippable increments without breaking existing tracking, UI, or API.

Execution model:
- One Codex run per task file.
- One git diff patch per run.
- Apply patch, run smoke tests, commit.
- Only then move to the next task.

This plan is deliberately strict because it prevents the agent from “helpfully” refactoring half the app.

---

## Non-negotiables (Locked)
### Product architecture
- **City-first identity.** Borough must not be required for anything.
- **Dual economy:**
  - **XP = status** (visible, used for ranks and badges, never spent).
  - **OUT = currency** (earned and redeemable: discounts, perks, event rewards).
- **Membership tiers:**
  - Free (highly restricted), Pro, Black.
  - Black eligibility = **14-day active streak** + apply/invite + paid.
  - Eligibility, once earned, stays true (do not revoke).
- **Crews (Clubs tab)** can be cross-city by design.
- **Crew branding:**
  - Logo upload allowed only for Pro/Black crew owners.
  - No custom crew colour themes that change app UI. Keep design cohesion.

### Engineering discipline
- Codex must output **git diff patches only** (no prose, no “here’s what I did” essays).
- Do not refactor pedometer/steps tracking unless a task explicitly says so.
- Minimal changes only. No sweeping reorganisations.
- If a task requires new endpoints, keep them additive. Do not break existing API routes.

---

## Repo structure assumptions (for agent context)
- Frontend lives in: `frontend/`
- Backend lives in: `backend/`
- Tabs and navigation live in: `frontend/app/(tabs)/`
- API client lives in: `frontend/src/services/api.ts`
If the repo differs, tasks must be adjusted to actual paths without inventing new architecture.

---

## Working Method (How to Run Codex)
For each task:
1. Ensure the following files exist and are current:
   - `docs/PRD.md`
   - `docs/BUILD_PLAN.md` (this file)
   - `docs/TASKS/00X_*.md` (the task you are running)
2. Create a branch named:
   - `task/00X-short-name`
3. Run Codex with instructions:
   - Read `docs/PRD.md`
   - Read `docs/BUILD_PLAN.md`
   - Read the target task file in `docs/TASKS/`
   - Implement **only** that task file
   - Output **git diff patch only**
4. Apply patch locally.
5. Run smoke tests (below).
6. Commit with message:
   - `TASK-00X: <short description>`
7. Merge to main only if smoke tests pass.

---

## Smoke Tests (Run after every task)
Frontend:
- App boots with no crashes.
- Bottom tabs render and navigate correctly.
- Home shows steps + streak.
- Move still tracks steps.
- Arena loads.
- Profile loads.

Backend (when relevant):
- Server boots.
- Existing endpoints still respond (health/users/steps if present).
- New endpoints respond as per the task requirements.

---

## Failure protocol (if Codex breaks things)
If a task introduces regressions:
1. Do not “patch forward” with more tasks.
2. Revert the changes or reset the branch.
3. Re-run the same task with stricter instructions:
   - “Minimal changes only”
   - “Do not refactor”
   - “Only touch these files: …”
4. Only proceed once the app is stable again.

---

# Execution Tasks (These are the ONLY tasks to run)
These tasks must be completed in order.
They are stored as markdown files in `docs/TASKS/` and numbered 001–008.

## TASK-001 - Arena Tab (Replace Challenges) + Hub Layout
**Task file:** `docs/TASKS/001_ARENA_TAB.md`

Purpose:
- Establish the new product centre: Arena as the hub.
- Replace Challenges in nav with Arena without breaking existing screens.

Required outcomes:
- Bottom nav includes: Home, Arena, Move, Clubs, Profile.
- Arena screen exists and matches PRD hub concept.
- Challenges functionality is preserved (moved/embedded), not deleted.

Smoke test focus:
- Tabs + Arena render
- Existing challenge/leaderboard data still accessible somewhere

---

## TASK-002 - Backend: 1v1 Battles (Create, List, Detail, Complete)
**Task file:** `docs/TASKS/002_BATTLES_1V1_BACKEND.md`

Purpose:
- Create the first “competitive retention loop”.

Required outcomes:
- Backend supports:
  - Create battle
  - Fetch battle
  - List user battles
  - Cancel battle
  - Complete battle after end time and produce winner
- Scoring uses steps within battle window (or best approximation using daily totals).

Smoke test focus:
- Existing API still works
- New battle endpoints work without breaking steps ingest

---

## TASK-003 - Frontend: 1v1 Battles UI (Create + List + Detail)
**Task file:** `docs/TASKS/003_BATTLES_1V1_FRONTEND.md`

Purpose:
- Make battles visible and usable from Arena.

Required outcomes:
- Arena shows active battles list.
- New battle flow exists (choose opponent + duration).
- Battle detail screen exists with countdown and updates (polling acceptable).

Smoke test focus:
- Arena loads battles without crashes
- Creating a battle works end-to-end

---

## TASK-004 - XP + OUT Ledgers (Server Source of Truth) + Client UI
**Task file:** `docs/TASKS/004_XP_OUT_LEDGER.md`

Purpose:
- Establish the platform economy correctly from day one.

Required outcomes:
- Backend:
  - XPTransaction + OUTTransaction ledgers (immutable records)
  - Wallet endpoint returns totals + recent transactions
  - Battle completion awards XP/OUT (per PRD rules)
- Frontend:
  - Profile shows XP + OUT
  - Wallet view shows recent transactions

Smoke test focus:
- Balances compute correctly
- XP is not spendable anywhere
- OUT ledger supports future redemption

---

## TASK-005 - Memberships: Free, Pro, Black + Feature Gating + Black Eligibility (14-day)
**Task file:** `docs/TASKS/005_MEMBERSHIPS_GATING.md`

Purpose:
- Add monetisation and status access control without breaking the UX.

Required outcomes:
- User has `membershipTier` and `blackEligible`.
- Black eligibility flips true at 14-day streak, and stays true once earned.
- Feature gating exists across UI actions:
  - Free is restricted
  - Pro unlocks meaningful features
  - Black unlocks prestige features
- Payments may be stubbed in MVP, but gating must function.

Smoke test focus:
- Gated actions show paywall, not crashes
- Upgrades change access correctly

---

## TASK-006 - Crews: Ownership, Roles, Logo Upload (Pro/Black) + No Custom Colours
**Task file:** `docs/TASKS/006_CREW_OWNERSHIP_LOGOS.md`

Purpose:
- Turn crews into identity assets and community engines, without design chaos.

Required outcomes:
- Roles: owner/mod/member.
- Ownership limits enforced:
  - Pro can own 1 crew
  - Black can own up to 3 crews
- Logo upload:
  - Pro/Black owners only
  - Constrained and displayed inside OutHere badge frame
  - No custom crew colour theming that alters app UI

Smoke test focus:
- Crew screens still work
- Logo upload does not break layout
- Free users cannot perform owner actions

---

## TASK-007 - Drops + Rewards Catalogue + OUT Redemption
**Task file:** `docs/TASKS/007_REWARDS_DROPS_SHOP.md`

Purpose:
- Introduce the commerce loop (drops + redemption) without building a full e-commerce platform prematurely.

Required outcomes:
- Drops:
  - Model and endpoints
  - Arena shows drop card with countdown
  - Early access rules for Pro/Black
- Rewards catalogue:
  - List redeemables
  - Redemption reduces OUT balance and issues a code/voucher
- Gating:
  - OUT redemption Pro+ (or as per PRD)

Smoke test focus:
- Redemption works and is recorded in ledger
- OUT balance updates correctly

---

## TASK-008 - Events: List, RSVP, Check-in, Rewards
**Task file:** `docs/TASKS/008_EVENTS_RSVP_CHECKIN.md`

Purpose:
- Make OutHere physical and sponsor-ready, linking digital status to real-world presence.

Required outcomes:
- Events list and detail views
- RSVP flow
- Check-in flow (time window MVP)
- Check-in awards XP/OUT via ledger
- Event badge appears on Profile

Smoke test focus:
- RSVP and check-in do not crash
- Awards and badge apply correctly

---

## Completion Definition (V1)
OutHere V1 is complete when all tasks 001–008 are done and:
- Arena hub exists and feels alive structurally.
- 1v1 battles work end-to-end.
- XP + OUT economy is ledger-backed and visible.
- Membership gating (Free/Pro/Black + 14-day Black eligibility) works.
- Crews can be owned, branded with logos, and managed by role.
- Drops + OUT redemption exists.
- Events can be RSVP’d and checked into with rewards and badges.