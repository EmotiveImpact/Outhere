-- The pieces added for the web app (part 13): private profiles and badges,
-- join requests, club addresses, chat reactions and unread counts, borough
-- step totals, staff actions and the smaller battle and pick-up changes.

\set QUIET on
set client_min_messages = warning;
\o /dev/null

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'ana@example.com', '{"display_name":"Ana"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'ben@example.com', '{"display_name":"Ben"}'),
  ('00000000-0000-0000-0000-0000000000d3', 'cat@example.com', '{"display_name":"Cat"}'),
  ('00000000-0000-0000-0000-0000000000d8', 'admin@example.com', '{"display_name":"Admin"}'),
  ('00000000-0000-0000-0000-0000000000d9', 'mod@example.com', '{"display_name":"Mod"}');
insert into staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000000d8', 'admin'),
  ('00000000-0000-0000-0000-0000000000d9', 'moderator');
update profiles set borough_id = 'southwark' where id in ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2');
update profiles set borough_id = 'lambeth' where id = '00000000-0000-0000-0000-0000000000d3';

create function pg_temp.act(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, false)
$$;
-- Run a statement and insist it fails with this message (or SQLSTATE).
create function pg_temp.raises(p_sql text, p_msg text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm = p_msg or sqlstate = p_msg then return; end if;
    raise exception 'expected % from [%], got % (%)', p_msg, p_sql, sqlerrm, sqlstate;
  end;
  raise exception 'expected % from [%], but it worked', p_msg, p_sql;
end $$;
create temp table ids (k text primary key, v text);
grant all on ids to authenticated;

-- ── Badges and private profiles ──────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000d1');
set role authenticated;
do $$ begin
  assert (select count(*) from badges) = 7, 'the first badges are seeded and readable';
  perform ingest_steps(london_today(), 12000);
  assert exists (select 1 from member_badges where user_id = auth.uid() and badge_id = 'ten_k_club'), '10k day earns a badge';
  assert exists (select 1 from notifications where user_id = auth.uid() and kind = 'badge'), 'told about the badge';
  perform pg_temp.raises($s$insert into member_badges (user_id, badge_id) values (auth.uid(), 'streak_30')$s$, '42501');
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000d2');
set role authenticated;
do $$ begin
  assert (select count(*) from member_badges where user_id = '00000000-0000-0000-0000-0000000000d1') = 1, 'others see a public member''s badges';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000d1');
set role authenticated;
do $$ begin
  update profiles set public_profile = false where id = auth.uid();
  assert exists (select 1 from profiles where id = auth.uid() and not public_profile), 'owner still sees a private profile';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000d2');
set role authenticated;
do $$ begin
  assert (select count(*) from profiles where id = '00000000-0000-0000-0000-0000000000d1') = 0, 'a stranger cannot read a private profile';
  assert (select username from profile_cards where id = '00000000-0000-0000-0000-0000000000d1') = 'ana', 'but sees the public card';
  assert (select count(*) from member_badges where user_id = '00000000-0000-0000-0000-0000000000d1') = 0, 'private badges stay private';
end $$;
reset role;

select pg_temp.act('');
set role anon;
do $$ begin
  assert (select count(*) from profiles where id = '00000000-0000-0000-0000-0000000000d1') = 0, 'signed out visitors cannot read it';
  assert (select count(*) from profile_cards where id = '00000000-0000-0000-0000-0000000000d1') = 1, 'the card is public';
  assert (select count(*) from profiles where id = '00000000-0000-0000-0000-0000000000d2') = 1, 'public profiles still show';
end $$;
reset role;

-- A one way follow is not enough; a follow back is.
select pg_temp.act('00000000-0000-0000-0000-0000000000d3');
set role authenticated;
insert into follows (follower_id, followee_id) values (auth.uid(), '00000000-0000-0000-0000-0000000000d1');
do $$ begin
  assert (select count(*) from profiles where id = '00000000-0000-0000-0000-0000000000d1') = 0, 'a follower alone cannot see it';
end $$;
reset role;
do $$ begin
  assert (select actor_id from notifications where user_id = '00000000-0000-0000-0000-0000000000d1' and kind = 'social')
         = '00000000-0000-0000-0000-0000000000d3', 'a follow notification names who';
end $$;
select pg_temp.act('00000000-0000-0000-0000-0000000000d1');
set role authenticated;
insert into follows (follower_id, followee_id) values (auth.uid(), '00000000-0000-0000-0000-0000000000d3');
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000d3');
set role authenticated;
do $$ begin
  assert (select count(*) from profiles where id = '00000000-0000-0000-0000-0000000000d1') = 1, 'a friend sees a private profile';
  assert (select count(*) from member_badges where user_id = '00000000-0000-0000-0000-0000000000d1') = 1, 'and its badges';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000d9');
set role authenticated;
do $$ begin
  assert (select count(*) from profiles where id = '00000000-0000-0000-0000-0000000000d1') = 1, 'staff see a private profile';
end $$;
reset role;

-- ── Clubs: addresses, tags, filters ──────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000d3');
set role authenticated;
do $$ begin
  perform create_club('Cat Club', 'cat-club', 'london', 'lambeth');
  perform pg_temp.raises($s$select create_club('Feed Runners', 'feed', 'london')$s$, 'SLUG_RESERVED');
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000d1');
set role authenticated;
do $$
declare c clubs;
begin
  c := create_club('Night Shift', 'night-shift', 'london', 'southwark');
  insert into ids values ('club', c.id);
  update clubs set tags = array['social', 'coffee after'], filters = array['night', 'beg'], join_policy = 'request'
  where id = c.id;
  assert (select filters from clubs where id = c.id) = array['night', 'beg'], 'staff set filters';
  assert (select join_policy from clubs where id = c.id) = 'request', 'staff set the join policy';
  perform pg_temp.raises(format($s$update clubs set filters = array['morn', 'pub'] where id = %L$s$, c.id), '23514');
  perform pg_temp.raises(format($s$update clubs set slug = 'sneaky' where id = %L$s$, c.id), '42501');
  perform pg_temp.raises(format($s$select rename_club(%L, 'admin')$s$, c.id), 'SLUG_RESERVED');
  perform pg_temp.raises(format($s$select rename_club(%L, 'Bad Slug!')$s$, c.id), 'BAD_SLUG');
  perform pg_temp.raises(format($s$select rename_club(%L, 'night-owls')$s$, c.id), 'BAD_SLUG');
  perform pg_temp.raises(format($s$select rename_club(%L, 'catclub')$s$, c.id), 'SLUG_TAKEN');
  c := rename_club(c.id, 'NightOwls');
  assert c.slug = 'nightowls', 'renamed';
  update club_channels set description = 'Everything else' where club_id = c.id and name = 'general';
  assert (select description from club_channels where club_id = c.id and name = 'general') = 'Everything else', 'channel description';
end $$;
reset role;
do $$ begin
  assert exists (select 1 from audit_log where action = 'rename_club' and detail->>'from' = 'nightshift'), 'rename logged with the old slug';
  assert is_reserved_slug('HQ') and not is_reserved_slug('peckhampacers'), 'reserved list';
end $$;

-- ── Join requests ────────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000d2');
set role authenticated;
do $$
declare cid uuid := (select v::uuid from ids where k = 'club');
begin
  perform pg_temp.raises(format($s$select rename_club(%L, 'bens-club')$s$, cid), 'NOT_ALLOWED');
  perform pg_temp.raises(format($s$select join_club(%L, 'app', null, 'sprint')$s$, cid), 'BAD_PACE_GROUP');
  assert join_club(cid, 'web', null, 'easy', 'Instagram') = 'requested', 'a request club takes a request';
  assert join_club(cid, 'web', null, 'steady') = 'requested', 'asking again keeps one request';
  assert not is_club_member(cid), 'not in yet';
  assert (select count(*) from club_join_requests) = 1, 'sees my own request';
  assert (select pace_group from club_join_requests) = 'steady', 'pace group updated';
  insert into ids select 'request', id from club_join_requests;
  perform pg_temp.raises(format($s$select decide_join_request(%L, true)$s$, (select v from ids where k = 'request')), 'NOT_ALLOWED');
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000d3');
set role authenticated;
do $$ begin
  assert (select count(*) from club_join_requests) = 0, 'outsiders cannot see requests';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000d1');
set role authenticated;
do $$
declare
  cid uuid := (select v::uuid from ids where k = 'club');
  r club_join_requests;
begin
  assert exists (select 1 from notifications where title = 'New join request'
                 and actor_id = '00000000-0000-0000-0000-0000000000d2'), 'staff told who asked';
  assert (select count(*) from club_join_requests where club_id = cid and status = 'pending') = 1, 'staff see the request';
  r := decide_join_request((select v::uuid from ids where k = 'request'), true);
  assert r.status = 'approved' and r.decided_by = auth.uid(), 'approved';
  assert (select pace_group from club_members where club_id = cid and user_id = '00000000-0000-0000-0000-0000000000d2') = 'steady',
         'member added with their pace group';
  assert (select source from club_members where club_id = cid and user_id = '00000000-0000-0000-0000-0000000000d2') = 'web', 'and source';
  perform pg_temp.raises(format($s$select decide_join_request(%L, false)$s$, r.id), 'ALREADY_DECIDED');
end $$;
reset role;
do $$ begin
  assert exists (select 1 from notifications where user_id = '00000000-0000-0000-0000-0000000000d2' and title = 'You''re in'), 'member told';
end $$;

-- An open club still lets people straight in.
select pg_temp.act('00000000-0000-0000-0000-0000000000d2');
set role authenticated;
do $$
declare cid uuid := (select id from clubs where slug = 'catclub');
begin
  assert join_club(cid, 'app', null, 'fast') = 'joined', 'open club joins at once';
  assert (select pace_group from club_members where club_id = cid and user_id = auth.uid()) = 'fast', 'pace group set on join';
end $$;
reset role;

-- ── Chat reactions and unread counts ─────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000d1');
set role authenticated;
do $$
declare cid uuid := (select v::uuid from ids where k = 'club');
begin
  insert into club_messages (channel_id, club_id, author_id, body)
  select id, cid, auth.uid(), 'Tonight 10pm, Southwark Bridge' from club_channels where club_id = cid and name = 'general';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000d2');
set role authenticated;
do $$
declare
  cid uuid := (select v::uuid from ids where k = 'club');
  gen uuid := (select id from club_channels where club_id = cid and name = 'general');
begin
  assert (select unread from club_unread(cid) where channel_id = gen) = 1, 'one unread';
  insert into club_message_reactions (message_id, user_id, emoji)
  select id, auth.uid(), 'fire' from club_messages where club_id = cid;
  assert (select count(*) from club_message_reactions) = 1, 'members see reactions';
  perform read_channel(gen);
  assert (select unread from club_unread(cid) where channel_id = gen) = 0, 'read clears it';
  insert into ids values ('general', gen);
end $$;
reset role;

-- Cat is not in the club: no reactions, no reacting even with the message id,
-- and no read marks.
do $$ begin insert into ids select 'message', id from club_messages limit 1; end $$;
select pg_temp.act('00000000-0000-0000-0000-0000000000d3');
set role authenticated;
do $$ begin
  assert (select count(*) from club_message_reactions) = 0, 'non members see no reactions';
  perform pg_temp.raises(format($s$insert into club_message_reactions (message_id, user_id, emoji)
                                   values (%L, auth.uid(), 'fire')$s$, (select v from ids where k = 'message')), '42501');
  perform pg_temp.raises(format($s$select read_channel(%L)$s$, (select v from ids where k = 'general')), 'NOT_ALLOWED');
end $$;
reset role;

-- ── Borough step totals ──────────────────────────────────────────────────────
-- Week of Monday 3 March 2025: Sunday the 9th still counts in it, Monday the
-- 10th starts the next. Flagged days are left out; a private member counts.
insert into daily_steps (user_id, day, steps, flagged) values
  ('00000000-0000-0000-0000-0000000000d1', '2025-03-03', 8000, false),
  ('00000000-0000-0000-0000-0000000000d1', '2025-03-09', 12000, false),
  ('00000000-0000-0000-0000-0000000000d2', '2025-03-05', 5000, false),
  ('00000000-0000-0000-0000-0000000000d2', '2025-03-10', 4000, false),
  ('00000000-0000-0000-0000-0000000000d3', '2025-03-04', 70000, true),
  ('00000000-0000-0000-0000-0000000000d3', '2025-03-06', 6000, false);
select pg_temp.act('00000000-0000-0000-0000-0000000000d2');
set role authenticated;
do $$ begin
  assert (select counted from borough_week_steps where borough_id = 'southwark' and week_start = '2025-03-03') = 24000,
         'southwark week total (8,000 + 11,000 counted + 5,000)';
  assert (select people from borough_week_steps where borough_id = 'southwark' and week_start = '2025-03-03') = 2, 'two people';
  assert (select counted from borough_week_steps where borough_id = 'southwark' and week_start = '2025-03-10') = 4000, 'next week';
  assert (select counted from borough_week_steps where borough_id = 'lambeth' and week_start = '2025-03-03') = 6000, 'flagged day left out';
  assert (select city_id from borough_week_steps where borough_id = 'lambeth' limit 1) = 'london', 'city from the borough';
end $$;
reset role;
select pg_temp.act('');
set role anon;
do $$ begin
  perform pg_temp.raises('select count(*) from borough_week_steps', '42501');
end $$;
reset role;

-- ── Staff actions ────────────────────────────────────────────────────────────
-- A small league fixture with Ben in a squad.
do $$
declare s uuid; d uuid; h uuid; a uuid; f uuid;
begin
  insert into seasons (kind, number, name, starts_on, ends_on) values ('club', 1, 'Season 1', '2025-01-06', '2025-02-16') returning id into s;
  insert into divisions (season_id, name, squad_size) values (s, 'Division 1', 10) returning id into d;
  insert into league_entries (division_id, club_id) values (d, (select v::uuid from ids where k = 'club')) returning id into h;
  insert into league_entries (division_id, club_id) values (d, (select id from clubs where slug = 'catclub')) returning id into a;
  insert into fixtures (division_id, week, home_id, away_id, starts_on, ends_on, drawn_at)
  values (d, 1, h, a, '2025-01-06', '2025-01-12', now()) returning id into f;
  insert into squad_members (fixture_id, entry_id, user_id) values (f, h, '00000000-0000-0000-0000-0000000000d2');
  insert into ids values ('season', s), ('fixture', f);
end $$;

-- Cat syncs a day big enough to be flagged; nothing is paid yet.
select pg_temp.act('00000000-0000-0000-0000-0000000000d3');
set role authenticated;
do $$ begin
  assert (ingest_steps(london_today(), 70000)).flagged, 'flagged';
  assert not exists (select 1 from ledger where reason = 'steps'), 'held while flagged';
end $$;
reset role;

-- A member cannot use any of the staff actions.
select pg_temp.act('00000000-0000-0000-0000-0000000000d2');
set role authenticated;
do $$ begin
  perform pg_temp.raises(format('select verify_club(%L)', (select v from ids where k = 'club')), 'NOT_ALLOWED');
  perform pg_temp.raises($s$select review_steps('00000000-0000-0000-0000-0000000000d3', london_today(), true)$s$, 'NOT_ALLOWED');
  perform pg_temp.raises(format($s$select remove_from_squad(%L, auth.uid())$s$, (select v from ids where k = 'fixture')), 'NOT_ALLOWED');
  perform pg_temp.raises(format('select set_reveal_held(%L, true)', (select v from ids where k = 'season')), 'NOT_ALLOWED');
  assert (select count(*) from audit_log) = 0, 'members cannot read the audit log';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000d9');
set role authenticated;
do $$
declare
  cid uuid := (select v::uuid from ids where k = 'club');
  fid uuid := (select v::uuid from ids where k = 'fixture');
begin
  assert (verify_club(cid)).status = 'verified', 'club verified';
  assert (select verified_at is not null from clubs where id = cid), 'verified_at set';
  assert not (review_steps('00000000-0000-0000-0000-0000000000d3', london_today(), true)).flagged, 'unflagged';
  perform remove_from_squad(fid, '00000000-0000-0000-0000-0000000000d2');
  assert not exists (select 1 from squad_members where fixture_id = fid), 'out of the squad';
  perform pg_temp.raises(format($s$select remove_from_squad(%L, '00000000-0000-0000-0000-0000000000d2')$s$, fid), 'NOT_IN_SQUAD');
  perform pg_temp.raises(format('select set_reveal_held(%L, true)', (select v from ids where k = 'season')), 'NOT_ALLOWED');
  assert (select count(*) from audit_log where actor_id = auth.uid()
          and action in ('verify_club', 'review_steps', 'remove_from_squad')) = 3, 'each action logged';
end $$;
reset role;
do $$ begin
  -- 15,000 counted is 15 lots of 5 XP, plus the active day and the goal.
  assert (select count(*) from ledger where user_id = '00000000-0000-0000-0000-0000000000d3' and reason = 'steps' and currency = 'xp') = 15,
         'held step XP paid on review';
  assert exists (select 1 from ledger where user_id = '00000000-0000-0000-0000-0000000000d3' and reason = 'goal'), 'goal paid';
  assert exists (select 1 from member_badges where user_id = '00000000-0000-0000-0000-0000000000d3' and badge_id = 'ten_k_club'),
         'badge follows the review';
  assert exists (select 1 from notifications where user_id = '00000000-0000-0000-0000-0000000000d1' and title = 'Night Shift is official'),
         'captain told the club is verified';
end $$;

-- Holding the reveal stops the scheduler settling that season.
select pg_temp.act('00000000-0000-0000-0000-0000000000d8');
set role authenticated;
do $$ begin
  assert (set_reveal_held((select v::uuid from ids where k = 'season'), true)).reveal_held, 'held';
  assert exists (select 1 from audit_log where action = 'set_reveal_held' and actor_id = auth.uid()), 'hold logged';
end $$;
reset role;
do $$ begin
  assert settle_due_fixtures() = 0, 'held season not settled';
  update seasons set reveal_held = false;
  assert settle_due_fixtures() = 1, 'settles once released';
end $$;

-- ── Battles and pick-ups ─────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000d2');
set role authenticated;
do $$
declare b battles;
begin
  b := create_battle('00000000-0000-0000-0000-0000000000d3', 'last_one_standing', 120, null, 0, null, 'Loser buys the coffees');
  assert b.duration_h = 120 and b.stake_note = 'Loser buys the coffees', 'five days with a stake in words';
  insert into ids values ('battle', b.id);
  insert into events (city_id, kind, activity, title, starts_at, place_name, created_by)
  values ('london', 'pickup', 'walk', 'Lunch walk', now() + interval '1 day', 'Burgess Park', auth.uid());
  assert (select activity from events where title = 'Lunch walk') = 'walk', 'a walk reads back as a walk';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000d3');
set role authenticated;
do $$ begin
  perform respond_battle((select v::uuid from ids where k = 'battle'), false);
end $$;
reset role;
do $$ begin
  assert exists (select 1 from notifications where user_id = '00000000-0000-0000-0000-0000000000d2'
                 and title = 'Challenge declined' and actor_id = '00000000-0000-0000-0000-0000000000d3'), 'challenger told of the decline';
end $$;

\o
\echo 'web gaps ok'
