# Schema gaps found while writing the web data source

What the web and admin apps need that the schema on `claude/mobile-app-build-nhob8r` (PR #4) does not have yet. `SupabaseData` returns an empty or neutral value for each read gap and throws `NOT_SUPPORTED` for each write gap. Each item names the need, the `OuthereData` method, and a suggested fix.

## Types

- **Typed joins.** `types/database.ts` has `Relationships: []` on every table, so supabase-js cannot type embedded selects such as `posts(*, profiles(*))`. The source reads each table on its own and joins in code. Fix: have `gen_types.py` emit foreign key relationships, or switch to `supabase gen types` once the hosted project exists.
- **`outside_now()` return type.** It is typed as `Json[]` but returns rows of `{ borough_id, out_now }`. Fix: type it as a table-returning function. Used by `pickups()`.

## Members and profiles

- **Public profile switch.** `setPublicProfile`, `viewer().publicProfile`, and `profile(handle).visible`, which is always true, so no profile page ever shows as private. Profiles are always public. Fix: add `profiles.public_profile boolean default true`, add it to the update grant, and respect it in the `profiles` select policy.
- **Profile handle.** `profile(handle)` looks people up by `profiles.username`; there is no separate `handle` column, and the two mean the same thing here. Nothing to fix unless handles and usernames are meant to differ.
- **Season points on profiles.** `profile().stats` shows level in place of season points, for the same reason as `me()` (see Season points per member).
- **Pace group.** `members().pace`, `joinClub(..., { pace })`. Nothing stores a member's pace group; the source works it out from recent runs and falls back to "Easy". Fix: add `club_members.pace_group text check (pace_group in ('walk','easy','steady','fast'))`, set by `join_club`.
- **Badges.** `me().badges`, `profile().badges`, `badgesEarned` and `badgesTotal` are empty. Fix: add `badges (id, label, art_path, sort)` and `member_badges (user_id, badge_id, earned_at)`, awarded by the server.
- **Season points per member.** `me().kpis` shows level and XP where the design has season points. Fix: a per-member season points total, for example a `member_season_points` view over the ledger or league scores.
- **Notification actor.** `notifications().personId`. Fix: add `notifications.actor_id uuid` so the face can show.

## Clubs

- **Join requests.** `members().requests`, `decideJoinRequest`, `joinClub`. `join_club` lets people in straight away. Fix: add `club_join_requests (id, club_id, user_id, pace_group, found_via, status, created_at)` and a `decide_join_request(p_request, p_approve)` RPC, or a `clubs.join_policy` that keeps instant joins for open clubs.
- **Tags and filters.** `Club.tags`, `Club.filters`, `kit().allTags`, `kit().poster.who`, `updateClubPage({ tags })`. These come back empty, so the clubs filter chips match nothing. Fix: add `clubs.tags text[]` and `clubs.filters text[]` (morn, eve, night, wkd, beg, walk, women), both in the update grant.
- **Changing the slug.** `updateClubPage({ slug })`. `slug` is not in the update grant on `clubs`. Fix: add a `rename_club(p_club, p_slug)` RPC for club staff. It should also refuse the reserved words in `rules.ts` `RESERVED_SLUGS`, which the database does not check.
- **Founding year.** `Club.since` uses `created_at`, which is wrong for clubs claimed from before Outhere. Fix: add `clubs.founded_year smallint`.
- **Cover library.** `kit().covers` returns only the current cover. Fix: a `club_covers` table, or an agreed folder `club-media/<club_id>/covers/` the source can list.
- **QR code stats.** `kit().codes[].scans` and `cameToRun` are 0. `club_invites.uses` counts joins only. Fix: add `club_invite_scans (code, scanned_at)` and `club_members.invite_code` so a check-in can be traced back to a poster.
- **Run crew.** `runsWeek().focus.crew`, `focus.badge`. The source can only list captains and admins who said they're going. Fix: add `event_crew (event_id, user_id, role check in ('leader','back_marker'))`.
- **Who can see what on the public page.** `clubPage()` for signed out visitors. `club_members` and `event_rsvps` are readable by signed in people only, and fund entries by club staff only. So signed out visitors get no leaders, no turnout and no amount raised. Fix: add public views `club_leaders`, `club_turnout_weeks (club_id, week_start, turnout_pct)` and `club_fund_totals (club_id, total_pence)`. The turnout view would also fill the `turnout` column of the HQ league table for other clubs, which is 0 today.
- **Club gallery.** `clubPage().gallery` comes from photo posts in the private `posts` bucket, so it is empty for signed out visitors. Fix: a `club-media/<club_id>/gallery/` folder, or let a public club post use public media.
- **Leaders' group.** `clubPage().leaders[].group` is "". Fix: the pace group above.
- **Leaders-only channel.** `ChatChannel.leadersOnly` is mapped from `club_channels.staff_only_post`, which only stops members posting; they can still read it. The mock hides the channel from members. Fix: add `club_channels.staff_only_read boolean`, or confirm that read-only is what we want.

## Chat

- **Message reactions.** `toggleChatReaction`, `ChatItem.reactions`. Fix: add `club_message_reactions (message_id, user_id, emoji)` with the same policies as `poll_votes`.
- **Unread counts.** `ChatChannel.unread`, `readChannel`, `feed().chatPreview.unread`. These are always 0, and `readChannel` does nothing. Fix: add `club_channel_reads (channel_id, user_id, read_at)`.
- **Channel descriptions.** `ChatChannel.description`. Fix: add `club_channels.description text`.
- **Typing.** `ChatChannel.typing` is left unset. This needs Realtime presence, not a table.

## Money

- **Fund spending.** `fund().spend` is empty. Fix: add `club_fund_spend (club_id, title, amount_pence, spent_on, receipt_path, approved_by)`, or allow a `spend` source with negative amounts in `club_fund_entries`.
- **Treasurer.** `fund().treasurerId` uses the first captain. Fix: add a `treasurer` value to `club_role`, or `clubs.treasurer_id`.
- **Kit numbers.** `fund().split.kit.makingShare` and `sold` are 0, because `drop_orders` is readable by the buyer only. Fix: add `drops.making_cost_pence` and a club-staff view `drop_sales (drop_id, sold)`.
- **Answering Locals offers.** `respondToOffer`, `LocalOffer.status`. Clubs cannot see unapproved partners and cannot accept or decline them. Fix: add `locals_partners.club_response text check in ('open','accepted','declined')` with a `respond_to_offer(p_partner, p_accept)` RPC for club staff, and let club staff read their own club's offers.
- **Plans.** `plans()` and the battle mode names come from the constants in `mock/seed.ts`. They are product definitions (the prices match the commerce migration), but they should live in one place both apps share. Fix: add a `plans` table, or move the constants to a shared catalogue module.

## Game and leagues

- **Reveal movement.** `lastReveal()` says where the club sits now ("Now 1st") and its points, not "Up to 1st" or "+3 points", because nothing keeps a club's place or points from before a reveal, and no function in the schema awards fixture points. Fix: add `league_entry_history (entry_id, fixture_id, position, points, recorded_at)` written when a fixture is settled, or a `points_awarded` column on `fixtures` per side.
- **Squad places.** `lastReveal()`'s squad card says "you were in the squad", not "you were #214". `squad_members` has no steps or rank per walker. Fix: add `squad_members.counted integer` and `rank integer`, filled when the fixture is scored.
- **Borough step totals.** `home().boroughTable`, `home().boroughLine`, `boroughs("steps")`, the feed's borough card and the borough card in `lastReveal()`. Nothing totals counted steps per borough, and members can't do it from the client. Fix: add a view or RPC `borough_week_steps (city_id, borough_id, week_start, counted, people)`.
- **Squad number and squad average.** `home().callup.squadNumber` is 0. `callup.average` uses `fixture_side_score`, which includes the turnout bonus. Fix: add `squad_members.squad_number` (set by `draw_fixture`) and a `fixture_side_stats(p_fixture, p_entry)` that returns the average, turnout and score separately.
- **City turnout.** `league().match.homeTurnout` and `awayTurnout` are 0. Fix: the same `fixture_side_stats`.
- **City table extras.** `league().table[].image`, `eligible` and `league().rising`. `eligible_walkers` cannot be called by clients. Fix: add `cities.image_path` and a public view `city_eligible_counts (city_id, eligible)`.
- **Battle stakes in words.** `Battle.stake` can only be "N OUT on it" or "Bragging rights". Fix: add `battles.stake_note text` for stakes like "Loser buys the coffees".
- **Battle lengths.** `createBattle` for Last one standing. The `duration_h` check allows only 1, 2, 6, 12, 24, 72 and 168 hours, so "5 days" throws `LENGTH_NOT_SUPPORTED`. "Until someone drops" is sent as 168 hours. Fix: allow 120, and allow an open-ended `last_one_standing` (null `duration_h`, settled when someone misses).
- **Declining.** `declineChallenge`. `respond_battle(p_accept => false)` returns the stake but doesn't tell the challenger. Fix: call `notify(challenger, 'battle', ...)` on decline.
- **Feed week points.** `feed().week.points` shows XP earned this week from `ledger`. If the design means borough or league points, we need a per-member weekly points source.

## Pick-ups

- **Activity type.** `pickups().list[].type`, `postPickup({ type })`. The events insert policy only lets members create `kind = 'pickup'` with no club, so a walk or a race posted by a member is stored as a plain pick-up and reads back as a run. Fix: add `events.activity text check in ('run','walk','race')`, or let members also insert `walk`.
- **Distance and area.** `pickups().radiusKm` is 0 and the list covers the whole city. `outNearby` counts people out in the viewer's borough. Fix: add a `pickups_near(p_lat, p_lng, p_km)` RPC using `events.lat` and `lng`, and fill those columns when posting.
- **Open battles and Locals pick-ups.** `Pickup.openBattle` and `Pickup.locals` are never set. Fix: add `events.data jsonb`, or link to a challenge and a `locals_partners` row.

## Staff

- **Admin charts and health.** `adminOverview().daily`, `dailyLabels` and `health` are empty. Fix: add a staff-only RPC `admin_daily_active(p_days)`. Health numbers belong to monitoring, not the database.
- **Verification.** `verifications()`, `setVerificationCheck`, `verifyClub`. Founding progress comes from `club_founding_progress`. Nothing stores evidence photos, manual checks or claim requests, and `clubs.status` has no client grant. Fix: add `club_verifications (club_id, kind check in ('founding','claim'), evidence_paths text[], checks jsonb, decided_by, decided_at)` and a staff `verify_club(p_club)` RPC that sets status and `verified_at` and writes `audit_log`.
- **Fair play actions.** `clearFlag` on flagged step days and `removeFromSquad`. `daily_steps` and `squad_members` have no staff write path. Report flags can already be dismissed. Fix: add staff RPCs `review_steps(p_user, p_day, p_ok)`, which unflags and pays held awards, and `remove_from_squad(p_fixture, p_user)`. Both should write `audit_log`.
- **Holding the reveal.** `seasons().revealHeld`, `setRevealHeld`. Fix: add `seasons.reveal_held boolean` and a staff RPC that sets it and writes `audit_log`.
- **Audit trail.** `audit()` reads `audit_log`, but no staff action writes to it yet. Each staff RPC above should.

## Conventions the source assumes (to agree with the mobile app)

- `post_reactions.emoji` holds `fire`, `pushed`, `respect`, and `welcome` for a welcome on a first-run post.
- `posts.data` keys read: `meta`, `alt`, `route` (rye, river or park), `impact` (HTML), `borough_points`, `with_ids`, `runners`, `km`, `first_timers`, `match`, `then`, `now`, `fund_raised`, `fund_line`. Members can only insert `text`, `photo` and `run_recap` posts, so recap, welcome, reveal and memory posts must come from the server.
- `club_messages.data` keys: `options` (poll labels), `event_id` (run and event cards), and `path` with `alt` (a photo in the public `club-media` bucket).
- `events.cover_path` is read from the `club-media` bucket.
