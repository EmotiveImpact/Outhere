# docs/TASKS/006_CREW_OWNERSHIP_LOGOS.md
## Task 006 - Crews: Ownership, Roles, Logo Upload (Pro/Black) + No Custom Colours

### Goal
Upgrade Groups into Crews with ownership and logo uploads gated to Pro/Black. Maintain OutHere design cohesion.

### Requirements
1. Roles:
   - owner, mod, member
2. Ownership rules:
   - Pro can create/own 1 crew
   - Black can create/own up to 3 crews
3. Logo uploads:
   - Only owner (Pro/Black) can upload logo
   - Accept PNG/JPG, square crop enforced
   - Store logo URL in crew record
   - Display logo inside fixed OutHere badge frame (no custom UI colours)
4. Crew settings:
   - name, tagline, description, privacy (public/request/invite)
   - invite_code / join-by-code flow (already exists in API client; preserve)
5. Crew tier badge (basic):
   - compute tier based on weekly active members and crew XP (simple thresholds)

### Backend Endpoints (add if missing)
- POST `/api/groups/:groupId/logo` upload logo
- PATCH `/api/groups/:groupId/settings` update fields
- GET `/api/groups/:groupId/roles` optional

### Frontend
- Crew detail shows badge frame + logo
- Crew owner sees Admin panel
- Creation flow enforces membership limits

### Output Required
- git diff patch only.

### Acceptance Criteria
- Pro/Black can create crew, Free cannot.
- Pro/Black can upload logo, Free cannot.
- Crew pages display logo cleanly with no colour chaos.