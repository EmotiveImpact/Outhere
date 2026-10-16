-- The Crew tab (part 18): crew settings and the crew code, route cards and
-- battle cards in chat, reports with a block, crew challenges, story stickers
-- and club stories, cheers and replies, and the numbers behind the tab.

\set QUIET on
set client_min_messages = warning;
\o /dev/null

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'cap@example.com', '{"display_name":"Cap"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'kemi@example.com', '{"display_name":"Kemi"}'),
  ('00000000-0000-0000-0000-0000000000e3', 'dan@example.com', '{"display_name":"Dan"}'),
  ('00000000-0000-0000-0000-0000000000e4', 'out@example.com', '{"display_name":"Outsider"}');
update profiles set city_id = 'london', borough_id = 'southwark' where id::text like '00000000-0000-0000-0000-0000000000e%';
update profiles set tier = 'pro' where id in ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2');

create function pg_temp.act(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, false)
$$;
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

-- ── A crew with a captain, an admin and a member ─────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare c clubs;
begin
  c := create_club('Southbank Runners', 'southbank-runners', 'london', 'southwark');
  insert into ids values ('club', c.id::text);
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000e2');
set role authenticated;
do $$ begin perform join_club((select v::uuid from ids where k = 'club')); end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e3');
set role authenticated;
do $$ begin perform join_club((select v::uuid from ids where k = 'club')); end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare cid uuid := (select v::uuid from ids where k = 'club');
begin
  perform set_club_role(cid, '00000000-0000-0000-0000-0000000000e2', 'admin');
  -- Settings: goal, ask to join, admins only chat.
  perform set_crew_settings(cid, 'request', 500, true);
  assert (select weekly_goal_km from clubs where id = cid) = 500, 'weekly goal saved';
  assert (select join_policy from clubs where id = cid) = 'request', 'ask to join saved';
  assert (select staff_only_post from club_channels where club_id = cid and name = 'general'), 'chat is admins only';
  perform pg_temp.raises(format('select set_crew_settings(%L, %L)', cid, 'invite'), 'BAD_POLICY');
  perform pg_temp.raises(format('select set_crew_settings(%L, null, 2)', cid), 'BAD_GOAL');
  perform set_crew_settings(cid, null, null, false);
  -- The crew code is six characters and stays the same.
  insert into ids values ('code', crew_invite_code(cid));
  assert (select v from ids where k = 'code') ~ '^[a-z0-9]{6}$', 'six character code';
  assert crew_invite_code(cid) = (select v from ids where k = 'code'), 'same code next time';
end $$;
reset role;

-- A member can't change settings but can read the code.
select pg_temp.act('00000000-0000-0000-0000-0000000000e3');
set role authenticated;
do $$
declare cid uuid := (select v::uuid from ids where k = 'club');
begin
  perform pg_temp.raises(format('select set_crew_settings(%L, %L)', cid, 'open'), 'NOT_ALLOWED');
  assert crew_invite_code(cid) = (select v from ids where k = 'code'), 'members share the same code';
end $$;
reset role;

-- Someone outside the crew asks to join (request policy), and the code skips it.
select pg_temp.act('00000000-0000-0000-0000-0000000000e4');
set role authenticated;
do $$
declare cid uuid := (select v::uuid from ids where k = 'club');
begin
  perform pg_temp.raises(format('select crew_invite_code(%L)', cid), 'NOT_ALLOWED');
  assert join_club(cid) = 'requested', 'ask to join makes a request';
  assert not is_club_member(cid), 'not in yet';
end $$;
reset role;

-- ── Chat: route cards, battle cards ──────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000e3');
set role authenticated;
do $$
declare
  cid uuid := (select v::uuid from ids where k = 'club');
  ch uuid := (select id from club_channels where club_id = cid and name = 'general');
  mid uuid;
begin
  insert into club_messages (channel_id, club_id, author_id, kind, data)
  values (ch, cid, auth.uid(), 'route_card', '{"title":"Bridges at Night","km":8.2}')
  returning id into mid;
  insert into ids values ('route', mid::text);
  perform pg_temp.raises(format($s$insert into club_messages (channel_id, club_id, author_id, kind, data)
    values (%L, %L, auth.uid(), 'battle_card', '{"won":true,"out":500}')$s$, ch, cid), '42501');
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000e2');
set role authenticated;
do $$
declare mid uuid := (select v::uuid from ids where k = 'route');
begin
  assert toggle_chat_run(mid), 'joined the route';
  assert (select count(*) from club_message_joins where message_id = mid) = 1, 'one going';
  assert not toggle_chat_run(mid), 'and back out';
  assert toggle_chat_run(mid), 'in again';
  insert into club_message_reactions (message_id, user_id, emoji) values (mid, auth.uid(), 'flame');
end $$;
reset role;
do $$ begin
  assert exists (select 1 from notifications where user_id = '00000000-0000-0000-0000-0000000000e3'
                 and title like 'Kemi is in for Bridges at Night%'), 'poster told who is coming';
end $$;

-- Dan beat Kemi in a battle; the card comes from the battle.
insert into battles (id, challenger_id, opponent_id, status, winner_id, stake_out, duration_h)
values ('00000000-0000-0000-0000-00000000b001', '00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000e2',
        'finished', '00000000-0000-0000-0000-0000000000e3', 50, 24);
select pg_temp.act('00000000-0000-0000-0000-0000000000e3');
set role authenticated;
do $$
declare
  cid uuid := (select v::uuid from ids where k = 'club');
  mid uuid;
begin
  mid := share_battle_to_crew(cid, '00000000-0000-0000-0000-00000000b001');
  assert (select data->>'rival_name' from club_messages where id = mid) = 'Kemi', 'rival named';
  assert (select (data->>'won')::boolean and (data->>'out')::int = 50 from club_messages where id = mid), 'win and OUT from the battle';
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$ begin
  perform pg_temp.raises(format('select share_battle_to_crew(%L, %L)', (select v from ids where k = 'club'),
    '00000000-0000-0000-0000-00000000b001'), 'NOT_FOUND');
end $$;
reset role;

-- ── Reports and blocks ───────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000e2');
set role authenticated;
do $$
declare
  cid uuid := (select v::uuid from ids where k = 'club');
  rid uuid;
begin
  rid := report_content('message', (select v from ids where k = 'route'), 'unsafe', cid, '00000000-0000-0000-0000-0000000000e3');
  assert exists (select 1 from blocks where user_id = auth.uid() and blocked_id = '00000000-0000-0000-0000-0000000000e3'), 'blocked as well';
  -- Blocked people's messages drop out of the chat.
  assert not exists (select 1 from club_messages where author_id = '00000000-0000-0000-0000-0000000000e3'), 'their messages are hidden';
  perform pg_temp.raises(format('select report_content(%L, %L, %L)', 'post', 'x', 'rude'), '23514');
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$ begin
  assert (select count(*) from reports where club_id = (select v::uuid from ids where k = 'club')) = 1, 'captain sees the report';
  assert exists (select 1 from notifications where user_id = auth.uid() and title like 'Something was reported%'), 'captain told';
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e3');
set role authenticated;
do $$ begin
  assert (select count(*) from reports) = 0, 'members do not see reports';
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e4');
set role authenticated;
do $$ begin
  perform pg_temp.raises(format('select report_content(%L, %L, %L, %L)', 'post', 'x', 'spam',
    (select v from ids where k = 'club')), 'NOT_ALLOWED');
end $$;
reset role;

-- ── Crew challenges ──────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000e3');
set role authenticated;
do $$
declare cid uuid := (select v::uuid from ids where k = 'club');
begin
  assert (select count(*) from crew_challenges) >= 4, 'challenges readable';
  perform join_crew_challenge(cid, 'sunrise');
  perform join_crew_challenge(cid, 'sunrise');
  assert (select count(*) from crew_challenge_entries where club_id = cid) = 1, 'joined once this week';
  perform join_crew_challenge(cid, 'sunrise', false);
  assert (select count(*) from crew_challenge_entries where club_id = cid) = 0, 'left';
  perform join_crew_challenge(cid, 'area_cup');
  perform pg_temp.raises(format('select join_crew_challenge(%L, %L)', cid, 'nope'), 'NOT_FOUND');
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e4');
set role authenticated;
do $$ begin
  perform pg_temp.raises(format('select join_crew_challenge(%L, %L)', (select v from ids where k = 'club'), 'sunrise'), 'NOT_ALLOWED');
  assert (select count(*) from crew_challenge_entries) = 0, 'outsiders see no entries';
end $$;
reset role;

-- ── Stories: club audience, posted as the club, cheers and replies ───────────
select pg_temp.act('00000000-0000-0000-0000-0000000000e2');
set role authenticated;
do $$
declare
  cid uuid := (select v::uuid from ids where k = 'club');
  sid uuid;
begin
  -- Kemi (admin, Pro) posts to the club, and as the club.
  insert into stories (author_id, media_path, audience, club_id, stickers)
  values (auth.uid(), auth.uid() || '/story_abcdefgh.webp', 'club', cid, '{route,streak}') returning id into sid;
  insert into ids values ('story', sid::text);
  insert into stories (author_id, media_path, audience, club_id, as_club)
  values (auth.uid(), auth.uid() || '/story_clubclub.webp', 'club', cid, true);
  perform pg_temp.raises(format($s$insert into stories (author_id, media_path, stickers) values (auth.uid(), auth.uid() || '/story_badbadba.webp', '{confetti}')$s$), '23514');
end $$;
reset role;

-- Dan is a plain member with no Pro: can't post, and can't post as the club.
update profiles set tier = 'pro' where id = '00000000-0000-0000-0000-0000000000e3';
select pg_temp.act('00000000-0000-0000-0000-0000000000e3');
set role authenticated;
do $$
declare cid uuid := (select v::uuid from ids where k = 'club');
begin
  insert into stories (author_id, media_path, audience, club_id)
  values (auth.uid(), auth.uid() || '/story_member01.webp', 'club', cid);
  perform pg_temp.raises(format($s$insert into stories (author_id, media_path, audience, club_id, as_club)
    values (auth.uid(), auth.uid() || '/story_member02.webp', 'club', %L, true)$s$, cid), '42501');
end $$;
reset role;

-- The captain cheers and replies to Kemi's story; one cheer each.
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare sid uuid := (select v::uuid from ids where k = 'story');
begin
  insert into story_replies (story_id, user_id, kind) values (sid, auth.uid(), 'cheer');
  perform pg_temp.raises(format($s$insert into story_replies (story_id, user_id, kind) values (%L, auth.uid(), 'cheer')$s$, sid), '23505');
  insert into story_replies (story_id, user_id, kind, body) values (sid, auth.uid(), 'reply', 'See you at 7');
  perform pg_temp.raises(format($s$insert into story_replies (story_id, user_id, kind, body) values (%L, auth.uid(), 'reply', '  ')$s$, sid), '23514');
end $$;
reset role;
do $$ begin
  assert exists (select 1 from notifications where user_id = '00000000-0000-0000-0000-0000000000e2' and title = 'Cap sent you a cheer'), 'cheer reaches the author';
  assert exists (select 1 from notifications where user_id = '00000000-0000-0000-0000-0000000000e2' and body = 'See you at 7'), 'reply reaches the author';
end $$;

-- Someone outside the crew can't see the club story, so can't reply to it.
select pg_temp.act('00000000-0000-0000-0000-0000000000e4');
set role authenticated;
do $$ begin
  perform pg_temp.raises(format($s$insert into story_replies (story_id, user_id, kind) values (%L, auth.uid(), 'cheer')$s$,
    (select v from ids where k = 'story')), '42501');
end $$;
reset role;

-- ── Numbers ──────────────────────────────────────────────────────────────────
insert into daily_steps (user_id, day, steps, distance_m) values
  ('00000000-0000-0000-0000-0000000000e1', london_today(), 9000, 7000),
  ('00000000-0000-0000-0000-0000000000e2', london_today(), 12000, 0),
  ('00000000-0000-0000-0000-0000000000e3', london_today(), 4000, 3000);
insert into runs (user_id, started_at, ended_at, distance_m, moving_s)
values ('00000000-0000-0000-0000-0000000000e1', now() - interval '1 hour', now() - interval '30 minutes', 5000, 1500);

select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare
  cid uuid := (select v::uuid from ids where k = 'club');
  j jsonb;
begin
  assert (select user_id from crew_race(cid, 'week') where rank = 1) = '00000000-0000-0000-0000-0000000000e2', 'Kemi leads the week';
  assert (select km from crew_race(cid, 'week') where user_id = '00000000-0000-0000-0000-0000000000e2') = 9.0, 'steps stand in for distance';
  assert (select count(*) from crew_race(cid, 'all')) = 3, 'every member is on the track';
  assert (select sum(km) from crew_days(cid)) = 19.0, 'crew days add up';
  j := crew_stats(cid);
  assert (j->>'runs')::int = 1 and (j->>'avg_pace')::int = 300, 'runs and pace';
  assert jsonb_array_length(j->'heat') = 1, 'one cell lit';
  assert (select rank from city_crew_board('london') where club_id = cid) = 1, 'top crew in London';
  j := area_board('london');
  assert j->>'kind' = 'boroughs' and jsonb_array_length(j->'rows') = 33, 'London ranks its boroughs';
  j := area_board('manchester');
  assert j->>'kind' = 'areas' and j->>'place' = 'Manchester' and jsonb_array_length(j->'rows') = 12, 'Manchester ranks its areas';
  j := area_board('preston');
  assert j->>'kind' = 'towns' and j->>'place' = 'North West', 'Preston ranks the North West';
  j := area_board('cardiff');
  assert j->>'kind' = 'towns' and j->>'place' = 'Wales', 'Cardiff ranks the towns of Wales';
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e4');
set role authenticated;
do $$ begin
  perform pg_temp.raises(format('select crew_stats(%L)', (select v from ids where k = 'club')), 'NOT_ALLOWED');
end $$;
reset role;
