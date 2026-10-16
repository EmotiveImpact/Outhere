# Outhere backend (Supabase)

One Supabase project serves the mobile app, the web app, the admin and the website. Everything lives here: migrations, reference data, tests and generated types.

Outhere needs its **own** Supabase project in London (eu-west-2). The project already on the account belongs to a different app; never point these migrations at it.

## Layout

| Path | What it is |
|---|---|
| `migrations/` | The schema, in order. Never edit an applied migration; add a new one. |
| `seed.sql` | Reference data: cities, the 33 London boroughs with tile map positions, standing challenges. Safe to re-run. |
| `tests/run.sh` | Applies every migration to a throwaway Postgres, loads the seed and runs `tests/test_*.sql`. |
| `types/database.ts` | TypeScript types for the public schema. Regenerate after schema changes. |
| `scripts/gen_types.py` | Writes `types/database.ts` from a migrated database. |

## The schema at a glance

| Area | Tables and views | Write through |
|---|---|---|
| People | `profiles` (public face, tier = ring, `public_profile` switch), `profile_cards` view (the basics, always public), `profile_private`, `staff`, `audit_log` | `finish_onboarding` (name, city, welcome bonus once), then own row update (limited columns) |
| Badges | `badges` (the set), `member_badges` | server only: `award_badge`, called from triggers on runs, steps and profiles |
| Places | `cities`, `boroughs` | seed, staff |
| Clubs | `clubs` (with `tags`, `filters`, `join_policy`), `club_members` (with `pace_group`), `club_join_requests`, `club_bans`, `club_invites`, `club_founding_progress` | `create_club`, `join_club` (returns `joined` or `requested`), `join_club_by_code`, `decide_join_request`, `rename_club`, `leave_club`, `remove_club_member`, `set_club_role` |
| Events | `events` (club runs, open runs, pick-ups, city moments; `activity` is run, walk or race), `event_rsvps`, `event_codes` | `rsvp_event`, `check_in_event` |
| Movement | `daily_steps` (raw and counted), `runs` (trimmed public route), `run_routes` (owner only), `borough_week_steps` view (signed in only) | `ingest_steps`, `save_run` |
| The dot | `presence`, `member_dots` view, `outside_now()` | `set_presence('out' or 'stopped')` |
| Ledger | `ledger` (XP and OUT, unique keys, 24h OUT hold), `wallets` view | server only |
| Battles | `battles` (six modes, `stake_note` for stakes in words, 1 hour to 7 days including 5), `battle_entries` (sealed blind results), `battle_board` view, `blocks`, `rival_passes`, `rival_deck()` | `create_battle`, `respond_battle`, `ready_battle`, `cancel_battle`, `submit_battle_result(battle, run)` |
| Challenges | `challenges`, `challenge_progress` | `join_challenge`, `claim_challenge` |
| Leagues | `seasons`, `divisions`, `league_entries`, `fixtures`, `squad_members` | scheduler: `draw_fixture`, `fixture_side_score`, `settle_due_fixtures`; read: `fixture_view(fixture)` |
| Club v club | `club_battles` (friendlies in five modes, turf war next season), `club_battle_votes` | captains: `challenge_club` (no opponent = mystery club), `respond_club_battle`, `cancel_club_battle`; members: `vote_club_battle`; read: `club_battles_for(club)` |
| Club claims | `club_claims` (website and in app) | in app: `claim_my_club`; moderators: `review_club_claim` |
| Social | `follows`, `posts`, `post_reactions`, `post_comments`, `stories`, `story_views` | direct insert under RLS |
| Club chat | `club_channels` (general, announcements, with `description`), `club_messages`, `poll_votes`, `club_message_reactions`, `club_channel_reads` | direct insert under RLS; `read_channel`, `club_unread(club)` |
| Notifications | `notifications` (`actor_id` is who it is about) | server writes, member marks read |
| Safety | `reports`, `blocks` | direct insert |
| Money | `subscriptions` (sets the ring), `club_fund_entries`, `club_fund_months`, `locals_partners` | payment webhooks, scheduler: `credit_club_fund` |
| Drops | `drops`, `drop_orders`, `drop_reminders` | `reserve_drop` |
| Staff | `audit_log` (every action below writes a line) | moderators: `verify_club`, `review_steps`, `remove_from_squad`; admins: `set_reveal_held` |
| Website | `waitlist`, `club_claims`, `black_requests` (no direct access) | anon: `join_waitlist`, `claim_club`, `request_black`, `website_stats`. UK-wide: each row is a launch city (`city_id`, plus a borough in London) or a town with one of 11 regions (`town`, `region`) |
| Places | `city_eligible_counts` (city_id, name, region, is_live, image_path, eligible, needed, to_go), `region_eligible_counts` (region, eligible, live_places, places) | anyone reads the counts; `refresh_live_cities()` runs daily at 04:30 and sets `is_live` once a place has 100 active |
| Points | `member_season_points` view (user_id, season_id, kind, season_name, starts_on, ends_on, points): XP earned in each season's dates, where the profile can be seen | read only |
| Points | `member_week_points` view (user_id, week_start, points): the same, per Monday to Sunday week | read only |
| Places | `area_leaders` view (city_id, borough_id, week_start, rank, user_id, username, display_name, avatar_path, tier, counted): top three public profiles per borough this week, signed in only | read only |
| Clubs | `club_covers` (id, club_id, path in `club-media` under `<club_id>/covers/`, created_by), public | club staff insert and delete |
| Clubs | `club_gallery` (id, club_id, path under `<club_id>/gallery/`, alt, created_by), public | club staff insert, update `alt`, delete |
| Clubs | `club_invite_scans` (code, scanned_at), club staff read | anyone: `record_invite_scan(code)` returns the club id |
| Clubs | `club_members.invite_code`: the code a member joined with | `join_club`, `join_club_by_code` |
| Clubs | `club_invite_stats` view (code, club_id, label, uses, scans, came_to_run), club staff only | read only |
| Clubs | `clubs.treasurer_id` (any member) | captain: `set_club_treasurer(club, user or null)`; cleared when they leave |
| Clubs | `club_leaders` view (club_id, user_id, role, treasurer, username, display_name, avatar_path, tier), public | read only |
| Clubs | `club_turnout_weeks` view (club_id, week_start, turnout_pct), public | read only |
| Events | `event_crew` (event_id, user_id, role `leader` or `back_marker`), readable with the event | organisers insert, update, delete; crew can step down |
| Club chat | `club_channels.staff_only_read`: a leaders only channel members cannot see, read or post in | club staff |
| Money | `club_fund_totals` view (club_id, total_pence raised), public | read only |
| Money | `club_fund_spend` (id, club_id, title, amount_pence, spent_on, receipt_path, created_by, approved_by, approved_at), club staff, treasurer and finance read | club staff or treasurer: `add_fund_spend`; treasurer or captain, never who logged it: `approve_fund_spend`; unapproved lines can be deleted |
| Money | `locals_partners.club_response` (open, accepted, declined), `responded_by`, `responded_at`; club staff see their own offers | club staff: `respond_to_offer(partner, accept)` |
| Money | `plans` (tier, name, monthly_pence, yearly_pence, line, features, popular, club_share_web_pence, club_share_app_pence, sort), public | migrations only |
| Drops | `drops.making_cost_pence`, `drop_sales` view (drop_id, club_id, sold, price_pence, making_cost_pence) for club staff and finance | staff |
| Leagues | `league_entry_history` (entry_id, fixture_id, position, points, recorded_at), public | `settle_fixture` |
| Leagues | `squad_members.squad_number` (from the draw), `counted` and `rank` (when settled) | `draw_fixture`, `settle_fixture` |
| Leagues | `fixture_side_stats(fixture, entry)` returns squad, average, turnout_pct, score | read only |
| Pick-ups | `events.data` (card extras such as `open_battle`), `events.locals_partner_id` (an approved, not declined partner, set by its club's staff or a moderator) | organisers |
| Pick-ups | `pickups_near(lat, lng, km)`: pick-ups not yet over within 0.1 to 50 km, nearest first, as the caller can see them | read only |
| Staff | `admin_daily_active(days)` returns day, active (synced steps or saved a run) | staff only |
| Staff | `club_verifications` (id, club_id, kind founding or claim, claim_id, evidence_paths, checks, status, created_by, decided_by, decided_at), club staff and moderators read | club staff: `request_club_verification`; moderators: `set_verification_check`, `decide_club_verification` (approving verifies the club) |
| Fighter Pack | `profiles.runner` (man, woman, either) and `runner_figure`, `avatar_slots`, `avatar_poses` (public), `avatar_credits` ledger and `avatar_credit_balances` view, `avatar_consents`, `avatar_verifications`, `avatar_packs`, `avatar_images`, `avatar_pose_picks` (own rows only), `avatar_scan_shots` and `avatar_orphans` (service role only) | members: `pack_state()`, `pack_credits()`, `record_pack_consent()`, `start_pack()`, `reroll_pack_slot(name)`, `set_pack_pose(set, pose)`, `delete_pack()`, own row update for `runner`; the `avatar-pack` Edge Function: `record_pack_verification`, `finish_pack_image`, `expire_stuck_pack_images`; scheduler: `topup_pack_credits()`. Read pictures with `fighter_of(user)`, the `fighter` computed field on `profiles`, `profile_cards.fighter` or `fighter_cards(ids)` |
| Helpers | `can_see_profile(user)`, `can_read_channel(channel)`, `is_club_treasurer(club)`, `can_organise_event(event)` | used by policies and views |

Rules the database enforces, so no client can cheat them:

- A member can never write their own tier, trust, XP, level, streak or founding number. Tier follows the best live row in `subscriptions`.
- Steps only for today or yesterday (London time), never backwards, capped at 100k raw, above 60k flagged for review. Counted steps: everything to 10k, half from 10k to 20k, at most 15k a day (proposed rule).
- Every payout has a unique key, so a retry cannot pay twice. OUT is held for 24 hours.
- Battle limits by tier (Free 1 a week and 1 active, Pro 5 active, Black 10). Blocked people cannot battle, message or see each other's posts. Under 18s only meet under 18s in the rival deck, and nobody can see who is under 18.
- Battle modes. Most steps and last one standing score from counted steps (last one standing needs 8k on day one, 1k more each day, and ends the morning after someone misses). Live race, blind time trial and ghost race take your first run of at least the distance after the start, timed pro rata on the server; lower wins. A live race starts 10 seconds after both press ready (`ready_battle`). Blind times stay sealed until both are in. Hold the route keeps your best time on the saved route; a run must cover 95% of it.
- Club v club. Club score is the squad's average counted steps a day times (1 + run turnout / 5), so turnout is worth up to 20%. Squads are equal, at most 25, drawn from members active on 3 of the last 7 days. A league win is 3 points, a draw 1, doubled for a derby. A mystery challenger stays hidden from the other club until the result, and blind time trial scores stay sealed until it ends.
- Claiming a club needs proof: an Instagram or Strava page (we give a six digit code for the bio) or a booked video call. Three open claims at most. When a moderator approves, the club is made (or verified), the claimant becomes captain, and they get a year of Pro as an organiser.
- Founding clubs go official after three meetups of six or more and ten different runners; `promote_founding_clubs()` checks nightly.
- Routes shown to others have the first and last 200 m removed.
- Club chat is for members only; announcements are for captains and admins. A channel with `staff_only_read` is hidden from everyone but captains and admins.
- Club fund spending needs two people: whoever logs a spend cannot approve it. A Locals offer the club declined is never shown publicly.
- Private profiles. With `public_profile` off, the full profile and its badges are seen only by the member, staff and friends (people they follow back; a one way follow is not enough, since follows need no approval). Everyone else, signed in or not, sees only `profile_cards`: id, username, display name, avatar and the ring.
- Clubs with `join_policy = 'request'` turn `join_club` into a request that club staff answer with `decide_join_request`; an invite code counts as an invitation and joins straight away. Club addresses change only through `rename_club`, and no club can take a slug the app or website owns. Club links (`weouthere.app/<slug>`) are letters and numbers only. The reserved words live in the `reserved_slugs` table (app and website paths, UK nations, regions and every UK city), seeded from `RESERVED_SLUGS` in `packages/core`; keep the two the same. A club made with no link chosen gets `suggest_club_slug(name, city)`: the name, then the name and city, then a number (`parksiderunners`, `parksiderunnersleeds`, `parksiderunnersleeds2`).
- Borough totals count each person's unflagged counted steps for the borough on their profile, in Monday to Sunday London weeks. Reviewing a flagged day as fine pays what was held back, with the same keys, so nothing pays twice. A season with `reveal_held` is skipped by `settle_due_fixtures` until it is released.
- Fighter Pack credits: Free is locked; Pro gets 12 on joining and 4 on the 1st of each month up to 12; Black gets 20 on joining and 12 a month up to 30. Join credits come from the ring moving up (a trigger on `profiles.tier`), once per tier. A pack costs 8 for the eight base pictures (Black's two extra pictures and nine extra poses come free), a re-roll 1, and a picture that fails is refunded. Packs are for 18 and over (`is_minor`, with a date of birth on file), after a recorded consent and a passed scan. Pro picks the first pose of each set; anything else raises `TIER_REQUIRED` with hint `black`.
- Error codes are raised as the exception message (`TIER_REQUIRED`, `NOT_ENOUGH_OUT`, `EVENT_FULL`, `FUTURE_DAY` ...), so clients can switch on them.

Storage buckets (paths start with the owner's id, or the club's id for club media): `avatars`, `club-media`, `drops` are public; `posts` is for signed in members.

Story photos live on Cloudflare R2, not in Supabase Storage. The phone shrinks each photo to about 1080 px WebP, asks the `story-media` Edge Function for a short lived upload link, and puts the file straight to R2 under `<author id>/<random>.webp`. Viewers get signed links from the same function, which only signs stories that RLS lets them see (author, audience, blocks). Stories expire after 24 hours; a nightly pg_cron job calls `story-media` to delete the files and rows.

Schedules (pg_cron): `settle_due_battles()` and `settle_due_club_battles()` every 5 minutes, `settle_due_fixtures()` hourly on Sundays (the reveal is 20:00), `promote_founding_clubs()` nightly and `credit_club_fund()` on the 1st of the month. The Friday league draw (`draw_fixture`) runs from an Edge Function once seasons are set up.

## Working on it

Run the tests against any Postgres 15+ (no Docker needed):

```sh
PGHOST=localhost PGUSER=postgres ./supabase/tests/run.sh
```

With the Supabase CLI and Docker, `supabase start` runs the whole stack locally and applies the migrations and seed.

Regenerate types after a schema change:

```sh
createdb oh_types && sed '/^create role/d' supabase/tests/shim.sql | psql -d oh_types
for f in supabase/migrations/*.sql; do psql -d oh_types -f "$f"; done
python3 supabase/scripts/gen_types.py oh_types supabase/types/database.ts
```

To rebuild the hosted database from nothing without the CLI, `python3 supabase/scripts/build_setup_sql.py setup.sql` writes one file for the SQL Editor: `scripts/wipe.sql` first (it drops everything in public, the sign-in accounts, the schedules, the storage rules and the migration history), then every migration, the seed and the history rows, all in one transaction. It wipes real data, so only use it before launch.

Once the hosted project exists, `supabase link --project-ref <ref>` then `supabase db push` applies the migrations, and `supabase gen types typescript --linked` replaces the script.

## Client set up

Each app needs only the project URL and the publishable (anon) key:

- Mobile: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Without them the app runs on local demo data (`apps/mobile/src/data/source.js` picks `remote.js` or `engine.js`). Sign in is an emailed 6 digit code, so the project's email template should send `{{ .Token }}`.
- Web and admin (Vite): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

The service role key is only for webhooks and scheduled functions and never ships in an app.

Story media needs these Edge Function secrets (Supabase dashboard, Edge Functions, Secrets), from an R2 API token scoped to one bucket with Object Read and Write:

- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`

The Fighter Pack (`supabase functions deploy avatar-pack`) needs, as well as the R2 secrets above: `R2_PACK_BUCKET` (private, the scan selfies; defaults to `R2_BUCKET`), `R2_AVATAR_BUCKET` (public read, the finished pictures), `FAL_KEY` (fal.ai, model `fal-ai/nano-banana/edit`) and optionally `AVATAR_WEBHOOK_SECRET` (an extra token on fal's webhook, on top of fal's ED25519 signature). The R2 token needs read and write on both buckets. The app reads the pictures from `EXPO_PUBLIC_AVATAR_URL`, the public bucket's address. Selfies are deleted by the hourly `pack-cleanup` job within 24 hours; monthly credits land from `pack-credits` at 03:10 on the 1st.

The nightly purge reads two Vault secrets (Supabase dashboard, Project Settings, Vault): `project_url` (the project URL) and `service_role_key`. Deploy the function with `supabase functions deploy story-media`.
