# Schema gaps found while writing the web data source

What the web and admin apps still need that the schema on `claude/mobile-app-build-nhob8r` (PR #4, mapped at commit 7291756) does not have. `SupabaseData` returns an empty or neutral value for each read gap and throws `NOT_SUPPORTED` for each write gap.

Every gap from the first two passes is closed and wired: `20261015101300_web_gaps.sql`, `20261015101500_club_links.sql`, `20261015101550_city_counts.sql` and `20261015101560_web_gaps_two.sql`. The database thread's list of what each added is in `/mnt/project-files/outhere-webapp-build/schema-gaps-closed.md`.

## Left open on purpose

- **Open-ended last one standing.** "Until someone drops" is sent as 168 hours. It needs `ends_at` and the scheduler to work without an end time.
- **Typing.** `ChatChannel.typing` is left unset. This needs Realtime presence, not a table.
- **Health numbers.** `adminOverview().health` is empty. These belong to monitoring, not the database.
- **Battle mode names.** `battles().modes` and `createBattle` read `BATTLE_MODES` from `mock/seed.ts`. They are product definitions both apps share.

## Waiting on a decision

- **Pro yearly price.** `plans.yearly_pence` is null for Pro, so on real data Pro is monthly only and the yearly switch says so. Black is £129.99 a year, also marked unconfirmed in the migration.

## Things the apps must do for the new tables to fill

- **Pick-ups near you.** `pickups_near` only finds events with `lat` and `lng`. The web app fills them (rounded to about a kilometre) when the poster has shared their location on the pick-ups page; the mobile app should do the same.
- **Poster scans.** QR codes on posters and stickers link to `/join/<club>?c=<code>`. The join page calls `record_invite_scan` and `join_club` gets the code, so `club_invite_stats` can count scans and who came to a run.
- **Covers, gallery and evidence.** `club_covers`, `club_gallery` and `club_verifications.evidence_paths` list files in `club-media`. Nothing in the web app uploads to them yet; until something does, the kit shows only the current cover, the club page has no gallery, and verification has no photos.
- **Run crew and treasurer.** `event_crew` and `set_club_treasurer` have no screen in the web app yet, so the crew card shows an open back marker spot and the fund falls back to the first captain until they are set elsewhere.
- **Fund spending.** `add_fund_spend` and `approve_fund_spend` have no screen in the web app yet; the fund page lists approved spending only.

## Conventions the source assumes (to agree with the mobile app)

- `profile(handle)` looks people up by `profiles.username`; handle and username mean the same thing.
- `post_reactions.emoji` holds `fire`, `pushed`, `respect`, and `welcome` for a welcome on a first-run post.
- `posts.data` keys read: `meta`, `alt`, `route` (rye, river or park), `impact` (HTML), `borough`, `borough_points`, `with_ids`, `runners`, `km`, `first_timers`, `match`, `then`, `now`, `fund_raised`, `fund_line`. Members can only insert `text`, `photo` and `run_recap` posts, so recap, welcome, reveal and memory posts must come from the server.
- `club_messages.data` keys: `options` (poll labels), `event_id` (run and event cards), and `path` with `alt` (a photo in the public `club-media` bucket).
- `club_message_reactions.emoji` holds the emoji itself.
- `events.cover_path` is read from the `club-media` bucket. `events.data.open_battle` marks an open battle pick-up.
- Area step totals are average counted steps a day per person: `borough_week_steps.counted / people / days so far this week`.
- Season points are `member_season_points` for the current City League season.
- Verification checks are stored under these keys, in this order: founding `three_meetups`, `six_at_each`, `ten_verified`, `public_meeting_point`, `organiser_id`; claim `online_six_months`, `organiser_named`, `code_word`, `public_meeting_point`, `no_other_claim`. An automatic check follows the club's progress until a moderator ticks or unticks it.
