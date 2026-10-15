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
| Website | `waitlist`, `club_claims`, `black_requests` (no direct access) | anon: `join_waitlist`, `claim_club`, `request_black`, `website_stats` |

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
- Club chat is for members only; announcements are for captains and admins.
- Private profiles. With `public_profile` off, the full profile and its badges are seen only by the member, staff and friends (people they follow back; a one way follow is not enough, since follows need no approval). Everyone else, signed in or not, sees only `profile_cards`: id, username, display name, avatar and the ring.
- Clubs with `join_policy = 'request'` turn `join_club` into a request that club staff answer with `decide_join_request`; an invite code counts as an invitation and joins straight away. Club addresses change only through `rename_club`, and no club can take a slug the app or website owns. Club links (`weouthere.app/<slug>`) are letters and numbers only. The reserved words live in the `reserved_slugs` table (app and website paths, UK nations, regions and every UK city), seeded from `RESERVED_SLUGS` in `packages/core`; keep the two the same. A club made with no link chosen gets `suggest_club_slug(name, city)`: the name, then the name and city, then a number (`parksiderunners`, `parksiderunnersleeds`, `parksiderunnersleeds2`).
- Borough totals count each person's unflagged counted steps for the borough on their profile, in Monday to Sunday London weeks. Reviewing a flagged day as fine pays what was held back, with the same keys, so nothing pays twice. A season with `reveal_held` is skipped by `settle_due_fixtures` until it is released.
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

Once the hosted project exists, `supabase link --project-ref <ref>` then `supabase db push` applies the migrations, and `supabase gen types typescript --linked` replaces the script.

## Client set up

Each app needs only the project URL and the publishable (anon) key:

- Mobile: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Without them the app runs on local demo data (`apps/mobile/src/data/source.js` picks `remote.js` or `engine.js`). Sign in is an emailed 6 digit code, so the project's email template should send `{{ .Token }}`.
- Web and admin (Vite): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

The service role key is only for webhooks and scheduled functions and never ships in an app.

Story media needs these Edge Function secrets (Supabase dashboard, Edge Functions, Secrets), from an R2 API token scoped to one bucket with Object Read and Write:

- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`

The nightly purge reads two Vault secrets (Supabase dashboard, Project Settings, Vault): `project_url` (the project URL) and `service_role_key`. Deploy the function with `supabase functions deploy story-media`.
