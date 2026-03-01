# docs/TASKS/005_MEMBERSHIPS_GATING.md
## Task 005 - Memberships: Free, Pro, Black + Feature Gating + Black Eligibility (14-day)

### Goal
Implement membership tiers and feature gating, including Black eligibility based on 14-day streak.

### Requirements
1. Add `membership_tier` to user model: "free" | "pro" | "black"
2. Add `black_eligible` boolean to user model.
3. Eligibility rule:
   - When user reaches 14 consecutive active days, set `black_eligible = true`.
   - Once true, keep true (do not revoke) to avoid frustration.
4. Add gating helper (frontend):
   - `hasAccess(feature)` based on tier:
     - Free: limited battles, join 1 crew, cannot create crew, cannot redeem OUT, cannot upload logo
     - Pro: create/own 1 crew, redeem OUT enabled, full battles
     - Black: create/own up to 3 crews, upload logos, priority features
5. Add upgrade UI:
   - Profile shows membership card with upgrade CTA.
   - If `black_eligible` true and user is Pro, show Black upgrade CTA.
6. Payments:
   - For MVP, implement stub membership upgrade with a backend endpoint that flips tier (admin-like) to unblock build.
   - Later, real app store subscriptions can replace this.

### Endpoints
- GET `/api/membership/status/:deviceId`
- POST `/api/membership/upgrade` body: device_id, tier
- POST `/api/membership/downgrade` body: device_id

### Output Required
- git diff patch only.

### Acceptance Criteria
- Membership tier visible on Profile.
- Free users see paywall when trying Pro/Black features.
- Black eligibility triggers at 14-day streak.