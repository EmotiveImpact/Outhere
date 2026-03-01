# docs/TASKS/008_EVENTS_RSVP_CHECKIN.md
## Task 008 - Events: List, RSVP, Check-in, Rewards

### Goal
Add Events module with RSVP + check-in to award XP/OUT and badges.

### Requirements
1. Event model:
   - id, title, description, city, location, start_at, end_at, capacity, organiser_type ("outHere" | "crew" | "sponsor")
2. RSVP:
   - Endpoint: POST `/api/events/:eventId/rsvp`
   - Endpoint: GET `/api/events?city=`
3. Check-in:
   - Endpoint: POST `/api/events/:eventId/checkin`
   - MVP check-in method: time window only (must be within start/end +/- 1h)
   - Later can add QR/GPS
4. Rewards:
   - On check-in, award XP and OUT via ledger (Task 004)
   - Add event badge to user badge list
5. Frontend:
   - Arena Events section: upcoming list
   - Event detail screen: RSVP and Check-in button
   - Profile badges shelf shows event badges

### Gating
- Creating events:
  - MVP: admin only
  - Later: Pro/Black crew owners can create crew events

### Output Required
- git diff patch only.

### Acceptance Criteria
- User can view events, RSVP, check-in.
- Check-in awards XP/OUT and badge.