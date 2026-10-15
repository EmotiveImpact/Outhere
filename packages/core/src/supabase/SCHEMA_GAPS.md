# Schema gaps found while writing the web data source

What the web and admin apps still need that the schema on `claude/mobile-app-build-nhob8r` (PR #4, mapped at commit 50282c1) does not have. `SupabaseData` returns an empty or neutral value for each read gap and throws `NOT_SUPPORTED` for each write gap. Each item names the need, the `OuthereData` method, and a suggested fix.

Closed by `20261015101300_web_gaps.sql` and now wired: private profiles and `profile_cards`, pace groups, join requests, club tags, filters and renames, founding year, badges, notification faces, chat reactions, unread counts and channel descriptions, borough step totals, staff actions (verify a club, review flagged steps, take someone out of a squad, hold the reveal, all written to `audit_log`), pick-up activity, stakes in words, five day battles and telling a challenger they were turned down. `20261015101500_club_links.sql` added the reserved words table, so the database now refuses the same club links as `rules.ts`. `20261015101550_city_counts.sql` added `city_eligible_counts` and `cities.image_path`, which now fill the city table's pictures and active counts and the rising towns card.

## Types

- **Typed joins.** `types/database.ts` has `Relationships: []` on every table, so supabase-js cannot type embedded selects such as `posts(*, profiles(*))`. The source reads each table on its own and joins in code. Fix: have `gen_types.py` emit foreign key relationships, or switch to `supabase gen types` once the hosted project exists.
- **`outside_now()` return type.** It is typed as `Json[]` but returns rows of `{ borough_id, out_now }`. `club_unread()` is the same. Fix: type them as table-returning functions. Used by `pickups()` and `chat()`.

## Members

- **Season points per member.** `me().kpis` and `profile().stats` show level and XP where the design has season points. Fix: a per-member season points total, for example a `member_season_points` view over the ledger or league scores.
- **Feed week points.** `feed().week.points` shows XP earned this week from `ledger`. If the design means borough or league points, this needs the same source.
- **Area leaders.** The feed's borough card names no leaders, because each member's steps are private to them. Fix, if wanted: a view of the top three in each area who chose a public profile.

## Clubs

- **Cover library.** `kit().covers` returns only the current cover. Fix: a `club_covers` table, or an agreed folder `club-media/<club_id>/covers/` the source can list.
- **QR code stats.** `kit().codes[].scans` and `cameToRun` are 0. `club_invites.uses` counts joins only. Fix: add `club_invite_scans (code, scanned_at)` and `club_members.invite_code` so a check-in can be traced back to a poster.
- **Run crew.** `runsWeek().focus.crew`, `focus.badge`. The source can only list captains and admins who said they're going. Fix: add `event_crew (event_id, user_id, role check in ('leader','back_marker'))`.
- **Who can see what on the public page.** `clubPage()` for signed out visitors. `club_members` and `event_rsvps` are readable by signed in people only, and fund entries by club staff only, so signed out visitors get no leaders, no turnout and no amount raised. Fix: add public views `club_leaders`, `club_turnout_weeks (club_id, week_start, turnout_pct)` and `club_fund_totals (club_id, total_pence)`. The turnout view would also fill the `turnout` column of the HQ league table for other clubs, which is 0 today.
- **Club gallery.** `clubPage().gallery` comes from photo posts in the private `posts` bucket, so it is empty for signed out visitors. Fix: a `club-media/<club_id>/gallery/` folder, or let a public club post use public media.
- **Leaders-only channel.** `ChatChannel.leadersOnly` is mapped from `club_channels.staff_only_post`, which only stops members posting; they can still read it. The mock hides the channel from members. Fix: add `club_channels.staff_only_read boolean`, or confirm that read-only is what we want.

## Chat

- **Typing.** `ChatChannel.typing` is left unset. This needs Realtime presence, not a table.

## Money

- **Fund spending.** `fund().spend` is empty. Fix: add `club_fund_spend (club_id, title, amount_pence, spent_on, receipt_path, approved_by)`, or allow a `spend` source with negative amounts in `club_fund_entries`.
- **Treasurer.** `fund().treasurerId` uses the first captain. Fix: add a `treasurer` value to `club_role`, or `clubs.treasurer_id`.
- **Kit numbers.** `fund().split.kit.makingShare` and `sold` are 0, because `drop_orders` is readable by the buyer only. Fix: add `drops.making_cost_pence` and a club-staff view `drop_sales (drop_id, sold)`.
- **Answering Locals offers.** `respondToOffer`, `LocalOffer.status`. Clubs cannot see unapproved partners and cannot accept or decline them. Fix: add `locals_partners.club_response text check in ('open','accepted','declined')` with a `respond_to_offer(p_partner, p_accept)` RPC for club staff, and let club staff read their own club's offers.
- **Plans.** `plans()` and the battle mode names come from the constants in `mock/seed.ts`. They are product definitions (the prices match the commerce migration), but they should live in one place both apps share. Fix: add a `plans` table, or move the constants to a shared catalogue module.

## Game and leagues

- **Reveal movement.** `lastReveal()` says where the club sits now ("Now 1st") and its points, not "Up to 1st" or "+3 points", because nothing keeps a club's place or points from before a reveal. Fix: add `league_entry_history (entry_id, fixture_id, position, points, recorded_at)` written when a fixture is settled, or a `points_awarded` column on `fixtures` per side.
- **Squad places.** `lastReveal()`'s squad card says "you were in the squad", not "you were #214". `squad_members` has no steps or rank per walker. Fix: add `squad_members.counted integer` and `rank integer`, filled when the fixture is scored.
- **Squad number and squad average.** `home().callup.squadNumber` is 0. `callup.average` uses `fixture_side_score`, which includes the turnout bonus. Fix: add `squad_members.squad_number` (set by `draw_fixture`) and a `fixture_side_stats(p_fixture, p_entry)` that returns the average, turnout and score separately.
- **City turnout.** `league().match.homeTurnout` and `awayTurnout` are 0. Fix: the same `fixture_side_stats`.
- **Open-ended last one standing.** "Until someone drops" is sent as 168 hours. The database thread left this out on purpose: it needs `ends_at` and the scheduler to work without an end time.

## Pick-ups

- **Distance and area.** `pickups().radiusKm` is 0 and the list covers the whole city. `outNearby` counts people out in the viewer's borough. Fix: add a `pickups_near(p_lat, p_lng, p_km)` RPC using `events.lat` and `lng`, and fill those columns when posting.
- **Open battles and Locals pick-ups.** `Pickup.openBattle` and `Pickup.locals` are never set. Fix: add `events.data jsonb`, or link to a challenge and a `locals_partners` row.

## Staff

- **Admin charts and health.** `adminOverview().daily`, `dailyLabels` and `health` are empty. Fix: add a staff-only RPC `admin_daily_active(p_days)`. Health numbers belong to monitoring, not the database.
- **Verification evidence and manual checks.** `verifications().evidence` is empty, `claim` is always false, and `setVerificationCheck` throws `NOT_SUPPORTED`. `verify_club` works, but nothing stores evidence photos, the manual checks or claim requests. Fix: add `club_verifications (club_id, kind check in ('founding','claim'), evidence_paths text[], checks jsonb, decided_by, decided_at)`, or read the website's `club_claims` for claims.

## Conventions the source assumes (to agree with the mobile app)

- `profile(handle)` looks people up by `profiles.username`; handle and username mean the same thing.
- `post_reactions.emoji` holds `fire`, `pushed`, `respect`, and `welcome` for a welcome on a first-run post.
- `posts.data` keys read: `meta`, `alt`, `route` (rye, river or park), `impact` (HTML), `borough`, `borough_points`, `with_ids`, `runners`, `km`, `first_timers`, `match`, `then`, `now`, `fund_raised`, `fund_line`. Members can only insert `text`, `photo` and `run_recap` posts, so recap, welcome, reveal and memory posts must come from the server.
- `club_messages.data` keys: `options` (poll labels), `event_id` (run and event cards), and `path` with `alt` (a photo in the public `club-media` bucket).
- `club_message_reactions.emoji` holds the emoji itself.
- `events.cover_path` is read from the `club-media` bucket.
- Area step totals are average counted steps a day per person: `borough_week_steps.counted / people / days so far this week`.
