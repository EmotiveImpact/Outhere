-- Battle modes: the sealed blind trial, live race ready-up, times worked out
-- from the run, laps for hold the route and last one standing. Own people, so
-- it doesn't depend on test_rules.sql.

\set QUIET on
set client_min_messages = warning;
\o /dev/null

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'tobi@example.com', '{"display_name":"Tobi"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'mei@example.com', '{"display_name":"Mei"}');
insert into subscriptions (user_id, tier, source, status, provider_ref, current_period_end)
values ('00000000-0000-0000-0000-0000000000b1', 'pro', 'web', 'active', 'sub_battle_1', now() + interval '30 days'),
       ('00000000-0000-0000-0000-0000000000b2', 'pro', 'web', 'active', 'sub_battle_2', now() + interval '30 days');

create function pg_temp.act(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, false)
$$;

-- ── Blind time trial ─────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
do $$
declare b battles; r runs; t int;
begin
  begin
    perform create_battle('00000000-0000-0000-0000-0000000000b2', 'blind_time_trial');
    raise exception 'blind trial without a distance';
  exception when raise_exception then
    if sqlerrm <> 'DISTANCE_REQUIRED' then raise; end if;
  end;
  b := create_battle('00000000-0000-0000-0000-0000000000b2', 'blind_time_trial', null, 5000);
  assert b.duration_h is null and b.distance_m = 5000, 'timed battle has a distance, no window';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000b2');
set role authenticated;
do $$
declare b battles; r runs; t int;
begin
  select * into b from battles where mode = 'blind_time_trial';
  b := respond_battle(b.id, true);
  assert b.status = 'accepted', 'blind trial waits for runs';
end $$;
reset role;
-- Accepted an hour ago, so today's runs fall inside it.
update battles set starts_at = starts_at - interval '1 hour' where mode = 'blind_time_trial';
set role authenticated;
do $$
declare b battles; r runs; t int;
begin
  select * into b from battles where mode = 'blind_time_trial';
  r := save_run(now() - interval '30 minutes', now(), 5200, 1560);
  t := submit_battle_result(b.id, r.id);
  assert t = 1500, 'time is worked out from the run, pro rata: ' || t;
  begin
    perform submit_battle_result(b.id, r.id);
    raise exception 'same battle twice';
  exception when raise_exception then
    if sqlerrm <> 'ALREADY_IN' then raise; end if;
  end;
end $$;
reset role;

-- The other side can't see Mei's time until they've both run.
select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
do $$
declare b battles; r runs; n int;
begin
  select count(*) into n from battle_entries;
  assert n = 0, 'blind time stays sealed';
  select * into b from battles where mode = 'blind_time_trial';
  r := save_run(now() - interval '20 minutes', now(), 3000, 900);
  begin
    perform submit_battle_result(b.id, r.id);
    raise exception 'short run counted';
  exception when raise_exception then
    if sqlerrm <> 'RUN_TOO_SHORT' then raise; end if;
  end;
  r := save_run(now() - interval '25 minutes', now(), 5000, 1450);
  perform submit_battle_result(b.id, r.id);
  select count(*) into n from battle_entries;
  assert n = 2, 'both times open once both are in';
  select * into b from battles where id = b.id;
  assert b.status = 'finished' and b.winner_id = auth.uid(), 'faster time wins';
end $$;
reset role;

-- ── Live race ────────────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
do $$
declare b battles;
begin
  b := create_battle('00000000-0000-0000-0000-0000000000b2', 'live_race', null, 3000);
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000b2');
set role authenticated;
do $$
declare b battles; r runs;
begin
  select * into b from battles where mode = 'live_race';
  b := respond_battle(b.id, true);
  r := save_run(now() - interval '15 minutes', now(), 3100, 930);
  begin
    perform submit_battle_result(b.id, r.id);
    raise exception 'ran before the start';
  exception when raise_exception then
    if sqlerrm <> 'BATTLE_CLOSED' then raise; end if;
  end;
  b := ready_battle(b.id);
  assert b.status = 'accepted' and b.opponent_ready_at is not null, 'one side ready';
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
do $$
declare b battles;
begin
  select * into b from battles where mode = 'live_race';
  b := ready_battle(b.id);
  assert b.status = 'live' and b.starts_at > now(), 'both ready: the start is set just ahead';
  assert b.ends_at = b.starts_at + interval '2 hours', 'race open for two hours';
end $$;
reset role;

-- ── Hold the route ───────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
do $$
declare b battles; route runs;
begin
  route := save_run(now() - interval '1 day', now() - interval '1 day' + interval '20 minutes', 4000, 1200);
  b := create_battle('00000000-0000-0000-0000-0000000000b2', 'hold_the_route', 72, null, 0, route.id);
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000b2');
set role authenticated;
do $$
declare b battles;
begin
  select * into b from battles where mode = 'hold_the_route';
  b := respond_battle(b.id, true);
  assert b.status = 'live', 'route battle live on accept';
end $$;
reset role;
update battles set starts_at = starts_at - interval '1 hour' where mode = 'hold_the_route';
select pg_temp.act('00000000-0000-0000-0000-0000000000b2');
set role authenticated;
do $$
declare b battles; r runs; best int;
begin
  select * into b from battles where mode = 'hold_the_route';
  r := save_run(now() - interval '25 minutes', now(), 4100, 1435);
  best := submit_battle_result(b.id, r.id);
  assert best = 1400, 'time over the route, pro rata: ' || best;
  begin
    perform submit_battle_result(b.id, r.id);
    raise exception 'same run counted twice';
  exception when raise_exception then
    if sqlerrm <> 'RUN_INVALID' then raise; end if;
  end;
  r := save_run(now() - interval '24 minutes', now(), 4000, 1500);
  best := submit_battle_result(b.id, r.id);
  assert best = 1400, 'a slower go keeps the best';
  r := save_run(now() - interval '10 minutes', now(), 2000, 600);
  begin
    perform submit_battle_result(b.id, r.id);
    raise exception 'half the route counted';
  exception when raise_exception then
    if sqlerrm <> 'RUN_INVALID' then raise; end if;
  end;
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
do $$
declare b battles; r runs; best int;
begin
  select * into b from battles where mode = 'hold_the_route';
  r := save_run(now() - interval '22 minutes', now(), 4000, 1320);
  best := submit_battle_result(b.id, r.id);
  assert best = 1320, 'Tobi goes faster';
end $$;
reset role;
update battles set ends_at = now() - interval '1 minute' where mode = 'hold_the_route';
select settle_due_battles();
do $$ begin
  assert (select winner_id from battles where mode = 'hold_the_route') = '00000000-0000-0000-0000-0000000000b1', 'fastest on the route wins';
end $$;

-- ── Last one standing ────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
do $$
declare b battles;
begin
  b := create_battle('00000000-0000-0000-0000-0000000000b2', 'last_one_standing', 168);
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000b2');
set role authenticated;
do $$
declare b battles;
begin
  select * into b from battles where mode = 'last_one_standing';
  perform respond_battle(b.id, true);
end $$;
reset role;
-- Started three days ago. Targets 8,000, 9,000, 10,000. Tobi makes all
-- three; Mei misses day two.
update battles set starts_at = now() - interval '3 days', ends_at = now() + interval '4 days' where mode = 'last_one_standing';
insert into daily_steps (user_id, day, steps) values
  ('00000000-0000-0000-0000-0000000000b1', london_today() - 3, 12000),
  ('00000000-0000-0000-0000-0000000000b1', london_today() - 2, 11000),
  ('00000000-0000-0000-0000-0000000000b1', london_today() - 1, 10500),
  ('00000000-0000-0000-0000-0000000000b2', london_today() - 3, 15000),
  ('00000000-0000-0000-0000-0000000000b2', london_today() - 2, 4000),
  ('00000000-0000-0000-0000-0000000000b2', london_today() - 1, 16000)
on conflict (user_id, day) do update set steps = excluded.steps;
select settle_due_battles();
do $$
declare b battles;
begin
  select * into b from battles where mode = 'last_one_standing';
  assert b.status = 'finished', 'ends as soon as someone misses a day';
  assert b.winner_id = '00000000-0000-0000-0000-0000000000b1', 'the one still standing wins';
  assert b.challenger_result = 3 and b.opponent_result = 1, 'days standing: ' || b.challenger_result || ' v ' || b.opponent_result;
end $$;

\o
select 'battles ok' as result;
