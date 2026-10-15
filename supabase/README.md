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
| People | `profiles` (public face, tier = ring), `profile_private`, `staff`, `audit_log` | own row update (limited columns) |
| Places | `cities`, `boroughs` | seed, staff |
| Clubs | `clubs`, `club_members`, `club_bans`, `club_invites`, `club_founding_progress` | `create_club`, `join_club`, `join_club_by_code`, `leave_club`, `remove_club_member`, `set_club_role` |
| Events | `events` (club runs, open runs, pick-ups, city moments), `event_rsvps`, `event_codes` | `rsvp_event`, `check_in_event` |
| Movement | `daily_steps` (raw and counted), `runs` (trimmed public route), `run_routes` (owner only) | `ingest_steps`, `save_run` |
| The dot | `presence`, `member_dots` view, `outside_now()` | `set_presence('out' or 'stopped')` |
| Ledger | `ledger` (XP and OUT, unique keys, 24h OUT hold), `wallets` view | server only |
| Battles | `battles` (six modes), `battle_entries` (sealed blind results), `battle_board` view, `blocks`, `rival_passes`, `rival_deck()` | `create_battle`, `respond_battle`, `cancel_battle`, `submit_battle_result` |
| Challenges | `challenges`, `challenge_progress` | `join_challenge`, `claim_challenge` |
| Leagues | `seasons`, `divisions`, `league_entries`, `fixtures`, `squad_members` | scheduler: `draw_fixture`, `fixture_side_score` |
| Social | `follows`, `posts`, `post_reactions`, `post_comments`, `stories`, `story_views` | direct insert under RLS |
| Club chat | `club_channels` (general, announcements), `club_messages`, `poll_votes` | direct insert under RLS |
| Notifications | `notifications` | server writes, member marks read |
| Safety | `reports`, `blocks` | direct insert |
| Money | `subscriptions` (sets the ring), `club_fund_entries`, `club_fund_months`, `locals_partners` | payment webhooks, scheduler: `credit_club_fund` |
| Drops | `drops`, `drop_orders`, `drop_reminders` | `reserve_drop` |

Rules the database enforces, so no client can cheat them:

- A member can never write their own tier, trust, XP, level, streak or founding number. Tier follows the best live row in `subscriptions`.
- Steps only for today or yesterday (London time), never backwards, capped at 100k raw, above 60k flagged for review. Counted steps: everything to 10k, half from 10k to 20k, at most 15k a day (proposed rule).
- Every payout has a unique key, so a retry cannot pay twice. OUT is held for 24 hours.
- Battle limits by tier (Free 1 a week and 1 active, Pro 5 active, Black 10). Blocked people cannot battle, message or see each other's posts. Under 18s only meet under 18s in the rival deck, and nobody can see who is under 18.
- Routes shown to others have the first and last 200 m removed.
- Club chat is for members only; announcements are for captains and admins.
- Error codes are raised as the exception message (`TIER_REQUIRED`, `NOT_ENOUGH_OUT`, `EVENT_FULL`, `FUTURE_DAY` ...), so clients can switch on them.

Storage buckets (paths start with the owner's id, or the club's id for club media): `avatars`, `club-media`, `drops` are public; `posts` and `stories` are for signed in members.

Schedules (pg_cron): `settle_due_battles()` every 5 minutes and `credit_club_fund()` on the 1st of the month. The Friday league draw (`draw_fixture`) runs from an Edge Function once seasons are set up.

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
python3 supabase/scripts/gen_types.py oh_types supabase/types/database.ts apps/mobile/src/lib/database.types.ts
```

Once the hosted project exists, `supabase link --project-ref <ref>` then `supabase db push` applies the migrations, and `supabase gen types typescript --linked` replaces the script.

## Client set up

Each app needs only the project URL and the publishable (anon) key:

- Mobile: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Web and admin (Vite): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

The service role key is only for webhooks and scheduled functions and never ships in an app.
