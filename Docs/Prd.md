# OutHere PRD (Source of Truth)

## Status
- This document defines product behaviour, rules, and UX requirements.
- Engineering execution order lives in docs/BUILD_PLAN.md.
- Codex tasks live in docs/TASKS/.

## Non-negotiables
- City-first identity (no borough dependency).
- Dual economy: XP (status, not spendable) + OUT (currency, spendable).
- 3 memberships: Free (restricted), Pro, Black.
- Black eligibility: 14-day streak + apply/invite + paid.
- Design cohesion: user customisation cannot break OutHere UI.
- Tabs: Home, Move, Outside/Arena, Clubs (Crews), Profile.

## Current repo notes
- Expo Router tabs live in frontend/app/(tabs)/
- API client in frontend/src/services/api.ts defines current endpoints.

## Product Requirements Document (PRD)

### Product name

**OutHere** (working label for new hub tab: **Arena**)

### One-line pitch

OutHere turns daily movement into a culture: urban London energy with global street competition, crews, battles, rankings, merch, and real-world events.

### Vision

Build OutHere into a **£50m cultural brand** where movement is social status:

* A fitness tracker that feels like street culture, not a sports watch.
* A global game layer (XP, badges, rankings, battles).
* A community layer (crews, chat, events).
* A commerce layer (shop, merch drops, collabs, sponsor discounts).
* A live layer (Outside Now, check-ins, city heat, event attendance).

### Competitive frame (Strava)

Strava is “serious sport + performance + routes + cyclists/runners”. OutHere should win on:

* **Culture-first** (London street DNA, global crews).
* **Game-first** (battles, XP, badges, seasonal ladders).
* **Community-first** (crews as identity, not just following).
* **Commerce-first** (drops, XP discounts, sponsor perks).

---

## Current repo baseline (what exists today)

### Frontend

* **Expo Router** with tab layout and custom bottom tabs. ([GitHub][2])
* Zustand stores:

  * `userStore` with `deviceId`, onboarding flag, user profile fields like `city`, `borough`, `outside_score`, streaks, goals. ([GitHub][3])
  * `themeStore` with themes and palette support (burnt orange, neon lime). ([GitHub][4])
* Home screen already shows:

  * Onboarding (username).
  * Steps, distance, streak, XP.
  * Challenges preview. ([GitHub][1])
* Pedometer tracking and sync to backend via `/steps`. ([GitHub][5])

### Backend API shape already referenced by the app

From `frontend/src/services/api.ts`, these exist (or are intended to exist): ([GitHub][6])

* Users:

  * `POST /api/users`
  * `GET /api/users/:deviceId`
  * `PUT /api/users/:deviceId`
  * `POST /api/users/:deviceId/outside-status`
* Steps:

  * `POST /api/steps`
  * `GET /api/steps/:deviceId/today`
  * `GET /api/steps/:deviceId/history?days=`
  * `GET /api/steps/:deviceId/weekly-summary`
* Leaderboards:

  * `GET /api/leaderboard?period=&city=&borough=`
  * `GET /api/leaderboard/cities`
* Community:

  * `GET /api/community/outside-now?city=`
* Challenges:

  * `GET /api/challenges?city=`
  * `POST /api/challenges/:challengeId/join?device_id=`
* Groups (Crews):

  * `POST /api/groups`
  * `GET /api/groups/:groupId`
  * `GET /api/groups/user/:deviceId`
  * `POST /api/groups/:groupId/join?device_id=`
  * `POST /api/groups/join-by-code?invite_code=&device_id=`
  * `POST /api/groups/:groupId/leave?device_id=`
  * `GET /api/groups/:groupId/members`
  * `GET /api/groups/:groupId/leaderboard?period=`
  * Chat:

    * `POST /api/groups/:groupId/messages`
    * `GET /api/groups/:groupId/messages?limit=`
  * Group challenges:

    * `POST /api/groups/:groupId/challenges`
    * `GET /api/groups/:groupId/challenges`
    * `GET /api/groups/:groupId/challenges/:challengeId/progress`
* Stats:

  * `GET /api/stats/:deviceId`

This PRD keeps that shape, then adds what’s missing.

---

## Goals and success metrics

### North-star

**Weekly Active Movers (WAM)**: unique users who record steps on 3+ days in a week.

### Core KPIs

* Activation: % who complete onboarding + first day sync + join or create a crew within 72 hours.
* Retention: D7, D30 retention.
* Social loop: invites sent per user, crew joins per user, battle starts per user.
* Monetisation:

  * Free → Pro conversion
  * Pro → Black conversion
  * ARPPU (average revenue per paying user)
  * Shop conversion rate
  * Sponsor redemption rate (XP discounts)
* Brand loop:

  * Events RSVP and attendance
  * Merch drops sell-through rate
  * UGC posts shared

---

## Target users (personas)

1. **The Ends Walker (London)**

   * Walks everywhere, hates gyms, loves status and humour.
   * Wants streaks, crews, city rank, bragging rights.

2. **The Global Street Runner**

   * Runs casually, wants vibes, wants challenges without “serious athlete” energy.

3. **The Crew Captain (Creator / Community leader)**

   * Wants to own a branded crew, upload logo, run battles, host meet-ups.
   * Wants visibility and perks.

4. **The Brand Partner (Sponsor)**

   * Wants redemptions, events, co-branded drops, trackable codes.

---

## Product principles (non-negotiables)

* **Culture-first UI**: minimal, bold, neon accent, street language, not corporate fitness.
* **Fast gratification**: XP and status even for small movement. No “you must run 10k daily” vibe.
* **Crews are identity**: not just a group chat.
* **Rankings without admin hell**: prioritise **City** and **Global**. Borough optional and automated.

---

## Navigation and information architecture

### Current tabs (from your UI mock)

Home | Challenges | Move | Club | Profile

### New tab structure (recommended)

**Home | Arena | Move | Crews | Profile**

* **Arena** replaces Challenges tab.
* Challenges do not disappear. They become one module inside Arena, and also appear in Profile as “My Challenges”.

Why:

* Arena becomes the “everything happening” place: battles, rankings, events, shop drops.
* Challenges alone is too narrow for your vision.

---

## Arena (replacement for Challenges tab)

Arena is a hub with sections (scrollable feed with strong cards, like you already mocked):

1. **Rankings**

   * Global leaderboard (daily, weekly, season, all-time).
   * City leaderboard (daily, weekly, season, all-time).
   * Optional: “My Crew vs Other Crews” ladder.
   * Filter toggles: Steps / Distance / XP / Streak.
   * This keeps “borough” out of the critical path.

2. **Battles**

   * 1v1 battle: choose opponent, time window (2h, 6h, 24h, 7d), metric (steps or distance).
   * “Crew Battle”: two crews compete over a window. If two crew members are in different locations, it still works because it’s aggregated totals. (You already clocked this, it solves itself by design.)

3. **Challenges**

   * Weekly challenge, city challenge, global challenge, crew challenge.
   * Challenges can be auto-generated “templates” to keep content fresh without manual admin.

4. **Events**

   * Featured events card.
   * “Tonight’s link-up” vibe: crew runs, walks, park meets, sponsored pop-ups.

5. **Shop and Drops**

   * Merch store entry point.
   * Drop countdown modules.
   * Sponsor offers (redeem XP for codes).

6. **News**

   * Short feed: updates, drops, event recaps, culture moments.

**Key UX requirement**: Arena must feel alive even when the user has no crew.

* Show: Global rankings, city rankings, public events, public challenges, public battles browse (opt-in).

---

## Profile changes (to support moving Challenges)

Profile should become the user’s “identity card”:

* Badge shelf (visible status).
* Rank snapshots (Global and City).
* Streak and Outside Score.
* “My stuff”:

  * My Battles
  * My Challenges
  * My Crews
  * My Rewards (XP redemptions, discount codes)
* Membership status and upgrade path.

---

## Crews (Clubs tab becomes Crews)

### Crew types

1. **Standard Crew**

   * Created by any user (free) but with limits.
   * Minimal controls.

2. **Owned Crew (Pro/Black gated)**

   * The user can “own” the crew as an asset:

     * Upload crew logo.
     * Set crew name and tagline.
     * Invite link and join code.
     * Approve members (optional).
     * Start crew battles.
     * Create crew challenges.
     * Access crew analytics.

### Logos without ruining the app

You’re right to be cautious about crew colours.

**Decision**:

* Allow **logo upload** (square and circular crop).
* Allow **one of a fixed set** of “accent rings” for the crew badge (choose from curated palette that matches OutHere).
* No custom UI theming beyond that (no custom backgrounds, no custom fonts).

This protects visual consistency while still letting crews feel owned.

### Crew badge tiers

Crew badge evolves based on crew activity:

* Bronze, Silver, Gold, Platinum, Obsidian.
  Inputs:
* total weekly steps, win rate in battles, event attendance, retention.

---

## Rankings system (global + city)

### Ranking ladders

* **Daily**
* **Weekly**
* **Seasonal** (eg 4 weeks)
* **All-time**

### Ranking categories

* Steps
* Distance
* XP
* Streak

### City handling (avoid borough admin burden)

* Default: user selects **City** only.
* Borough becomes optional:

  * Either remove entirely.
  * Or keep as a *free text / suggested list* with no manual moderation.
    Your current store includes borough and your constants include borough lists, but you can soft-deprecate borough in UI without breaking data. ([GitHub][3])

---

## Battles

### 1v1 battle

**Flow**

* Choose opponent (friends list, or search username).
* Choose duration (2h, 6h, 24h, 7d).
* Choose metric (steps, distance).
* Confirm stake (optional):

  * XP stake (winner takes X XP).
  * Sponsor voucher stake (Pro/Black only).
* Battle runs, updates in real-time-ish (polling or websockets later).
* End state: winner screen, share card.

### Crew battle

**Flow**

* Crew admin starts battle against another crew.
* Defines duration and metric.
* Members contribute passively via tracked steps.
* Crew totals decide winner.

---

## XP, badges, and progression (without “high XP” pressure)

You’re right: **purely high XP** as the main loop can feel demanding.

### Solution: multi-lane progression

Users can progress via **any** of these:

* **Consistency lane** (streaks)
* **Community lane** (crew participation, battles, events)
* **Movement lane** (steps, distance)
* **Culture lane** (check-ins, shares, referrals, drop participation)

### XP earning (example)

* Daily steps: small, steady XP.
* Streak milestones: big XP spikes at 3, 7, 14, 30.
* First activity of the day bonus.
* Battle participation bonus (win bonus + participation XP).
* Crew weekly goal bonus.
* Event check-in bonus (QR or geo-fence).
* Referral bonus (only after referred user becomes active).

### Badges (profile shelf)

* Streak badges (you already have streak titles logic on the UI side). ([GitHub][7])
* City rank badge (Top 50, Top 10, Top 1).
* Crew rank badge.
* Battle record badge (eg “10 Wins”).
* Event badge (attended 3 events).
* Founder badge (early users).

### Outside Score

Keep it as a composite “status number”:

* Weighted formula: steps + streak + battles + crew contributions + events.

---

## Memberships (3 tiers)

### Tier 1: Free (highly restricted, time-limited)

**Option A (recommended)**: Free is permanent but limited, plus **14-day Pro trial** on signup.

* This avoids the weirdness of “Free expires”, while still letting you create urgency.

**Free includes**

* Basic step tracking and stats
* Global leaderboard view (limited)
* City leaderboard view (limited)
* Join 1 crew
* Start 1 battle per week
* Basic badges

**Free limits**

* Cannot own a crew
* No logo upload
* Limited battle creation
* Limited rewards redemptions
* Limited history depth (eg 7 days)

### Tier 2: Pro

For serious users and community builders.

* Own 1 crew + logo upload
* Create battles freely (with sensible caps)
* Create crew challenges
* XP reward boosts (eg 1.2x)
* Rewards redemptions enabled
* Deeper stats history (90 days)
* Early access to drops and events RSVP priority

### Tier 3: Black (elite identity)

This is the “cultural status membership”.

* Own up to 3 crews (or 1 flagship crew with advanced controls)
* Crew verification badge (Obsidian mark)
* Highest XP boost (eg 1.5x, tuned carefully)
* Exclusive drops
* VIP events access or discounted tickets
* Sponsor perks
* Advanced analytics (crew retention, battle win rate, active members)

---

## Rewards and sponsor discounts (XP redemption)

### Requirements

* Users can redeem XP for:

  * % discount codes in the shop
  * Sponsor codes (Nike-style partner deals later, local gym/café early)
  * Event ticket discounts

### Guardrails

* XP redemption catalogue rotates weekly.
* Redemption limits per week per user to prevent farming.
* Codes must be trackable per campaign.

### Data needs

* Reward inventory, cost in XP, redemption logs, code issuance.

---

## Shop and merch

### MVP shop

* Simple catalogue inside app.
* Checkout can be:

  * External link for MVP, or
  * In-app webview, or
  * Native payments later.

### Drops

* Drop countdown module.
* Early access for Pro and Black.
* Crew collab drops (owned crews can apply).

---

## Events

### MVP events

* List view + featured card in Arena.
* RSVP.
* Event check-in (simple):

  * QR scan at event, or
  * Geo-fence check-in window.

### Event types

* OutHere official events
* Crew-hosted events (Pro/Black only to create)
* Sponsored pop-ups

---

## Friends and social graph

### Friend system

* Add friend by username.
* Accept/decline.
* Friends list used for:

  * 1v1 battles
  * crew invites
  * feed visibility

### Feed

* Crew feed already mocked in UI.
* Expand to support:

  * completed sessions
  * battle wins
  * challenge completions
  * event attendance

---

## Data model (high level)

### User

* device_id (existing)
* username
* city
* borough (optional / deprecated in UI)
* total_steps, total_distance, outside_score
* current_streak, longest_streak
* daily_goal, weekly_goal
* is_outside
* membership_tier (free/pro/black)
* xp_balance
* badges (earned list)

### Steps / Activity

* device_id
* date
* steps
* distance
* active_minutes
* optional: session records (for runs vs walks later)

### Crew (Group)

* id
* name
* description
* creator_device_id
* invite_code
* logo_url (Pro/Black)
* accent_ring (chosen from fixed palette)
* verification_tier (none/bronze/silver/gold/platinum/obsidian)
* membership_required_to_admin (pro/black flags)

### Battle

* id
* type (1v1/crew)
* metric (steps/distance)
* start_time, end_time
* participants (deviceIds) or crews (groupIds)
* stakes (xp amount optional)
* status (active/complete/cancelled)
* winner

### Challenge

* id
* scope (global/city/crew/personal)
* target_steps / target_distance
* start_date, end_date
* reward_xp
* join rules

### Reward / Redemption

* reward_id
* type (shop_discount/sponsor_code/event_discount)
* cost_xp
* inventory_count
* redemption record per user

### Event

* id
* title, location, city
* start_time, end_time
* organiser (OutHere or crew)
* rsvp list
* check-in method

---

## Backend requirements (API additions)

You already have many endpoints wired in `api.ts`. ([GitHub][6])
Add the missing capabilities explicitly:

### Membership

* `GET /api/membership/plans`
* `POST /api/membership/subscribe`
* `POST /api/membership/cancel`
* `GET /api/membership/status/:deviceId`

### Friends

* `POST /api/friends/request`
* `POST /api/friends/accept`
* `POST /api/friends/decline`
* `GET /api/friends/:deviceId`
* `GET /api/users/search?username=`

### Battles

* `POST /api/battles`
* `GET /api/battles/:battleId`
* `GET /api/battles/user/:deviceId?status=active|complete`
* `POST /api/battles/:battleId/join`
* `POST /api/battles/:battleId/cancel`

### Arena feed modules

* `GET /api/arena/summary?city=`
  Returns:
* global rank snapshot
* city rank snapshot
* active battles count
* featured challenge
* featured event
* shop drop

### Rewards

* `GET /api/rewards/catalogue`
* `POST /api/rewards/redeem`
* `GET /api/rewards/user/:deviceId`

### Shop (MVP can be external)

* `GET /api/shop/products`
* `GET /api/shop/drops`
* `POST /api/shop/checkout-session` (later)

### Events

* `GET /api/events?city=`
* `POST /api/events/rsvp`
* `POST /api/events/checkin`
* `POST /api/events` (Pro/Black for crew events)

### Badges

* `GET /api/badges/user/:deviceId`
* `POST /api/badges/evaluate` (or do server-side on activity updates)

---

## Frontend requirements (implementation notes for your agent)

### Expo Router

* Replace Challenges tab route with `arena` route.
* Keep existing UI patterns: bold typography, dark surfaces, neon accent, large cards.

### State management

* Extend `userStore` to include:

  * `membershipTier`
  * `xpBalance`
  * `badges[]`
  * `friends[]` counts and basic metadata
* Add stores:

  * `arenaStore` (summary modules)
  * `battleStore`
  * `crewStore` enhancements
  * `rewardsStore`
  * `eventsStore`

### UI components needed

* ArenaSectionCard (Rankings, Battles, Challenges, Events, Shop, News)
* RankingList component with filters
* BattleCard + BattleCreate modal
* RewardCatalogue + Redeem flow
* Crew branding uploader (logo upload + ring selector)
* BadgeShelf

---

## Monetisation model (in-product)

1. Membership subscriptions (Pro, Black)
2. Merch margin
3. Sponsored rewards and partner placements
4. Ticketed events and collabs

---

## Rollout plan (MVP → V1)

### MVP (ship fast, proves the loop)

* Arena tab with:

  * Rankings (global + city)
  * Battles (1v1 basic)
  * Challenges module (existing)
  * Events list (basic)
* Crews:

  * Join/create
  * Crew leaderboard
  * Crew chat
* Badges:

  * Streak + rank badges
* Membership:

  * Pro enables crew ownership + logo upload
* Rewards:

  * XP to shop discount (simple)

### V1 (brand engine)

* Crew battles
* Seasonal ladders
* Drop system
* Event check-ins
* Sponsor catalogue

---

## Risks and mitigations

* **Cheating / step spoofing**: add anomaly detection, cap daily XP, require device integrity checks later.
* **Content/admin overload**: auto-generate challenges, keep borough non-core.
* **Brand dilution via custom colours**: allow logo + fixed accent ring only.
* **“Too demanding” XP culture**: multi-lane progression, reward consistency and community, not just distance.

---

## Key decisions locked from this PRD

* Challenges tab becomes **Arena** (hub).
* **City + Global** rankings are the core, borough optional.
* 3 memberships: **Free, Pro, Black**.
* Crew ownership and logo upload are gated to **Pro/Black**.
* No full custom crew colours, only curated accents.

---