-- Move and runs: saving a route, who can see it (and how much of it), runs on
-- a route with the fastest this month, routes near you, how a run felt, the
-- live map, waves, and live sharing with trusted contacts.

\set QUIET on
set client_min_messages = warning;
\o /dev/null

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'kemi@example.com', '{"display_name":"Kemi"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'dan@example.com', '{"display_name":"Dan"}'),
  ('00000000-0000-0000-0000-0000000000d3', 'zed@example.com', '{"display_name":"Zed"}');
update profiles set city_id = 'london', borough_id = 'southwark'
where id in ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d3');
insert into clubs (id, slug, name, city_id, created_by) values
  ('00000000-0000-0000-0000-00000000c1b1', 'river-runners', 'River Runners', 'london', '00000000-0000-0000-0000-0000000000d1');
insert into club_members (club_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000c1b1', '00000000-0000-0000-0000-0000000000d1', 'captain'),
  ('00000000-0000-0000-0000-00000000c1b1', '00000000-0000-0000-0000-0000000000d2', 'member');

create function pg_temp.act(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, false)
$$;
create temp table ids (k text primary key, v text);
grant all on ids to authenticated, anon;

-- A 2.2 km line north, a point every ~100 m, with time and altitude.
create function pg_temp.line(n int default 22) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_array(51.47 + i * 0.0009, -0.07, i * 30000, 10 + i) order by i) from generate_series(0, n) i
$$;
grant execute on function pg_temp.line to authenticated;

-- ── Save a route ─────────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000d1');
set role authenticated;
do $$
declare r saved_routes; j jsonb;
begin
  begin
    perform save_route('x', pg_temp.line());
    raise exception 'one letter name';
  exception when raise_exception then
    if sqlerrm <> 'ROUTE_NAME' then raise; end if;
  end;
  begin
    perform save_route('Tiny', '[[51.47,-0.07],[51.4701,-0.07]]'::jsonb);
    raise exception 'route too short';
  exception when raise_exception then
    if sqlerrm <> 'ROUTE_TOO_SHORT' then raise; end if;
  end;
  r := save_route('River Loop', pg_temp.line(), '[]'::jsonb, 22, true, true);
  assert r.distance_m between 2100 and 2300, 'distance comes from the line';
  assert r.club_id = '00000000-0000-0000-0000-00000000c1b1', 'shared with my club';
  assert jsonb_array_length(r.path_public) < jsonb_array_length(r.path) - 3, 'start and end trimmed for others';
  insert into ids values ('shared', r.id::text);
  r := save_route('Home Secret', pg_temp.line(12), '[]'::jsonb, null, true, false);
  assert r.club_id is null, 'not shared';
  insert into ids values ('private', r.id::text);
  j := list_routes('mine');
  assert jsonb_array_length(j) = 2, 'both of mine';
  assert (j->0->>'mine')::boolean, 'marked as mine';
  begin
    insert into saved_routes (user_id, name, path, distance_m, start_lat, start_lng)
    values (auth.uid(), 'Sneaky', pg_temp.line(), 2000, 51.47, -0.07);
    raise exception 'inserted a route directly';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ── Others only see shared routes, without the ends ──────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000d2');
set role authenticated;
do $$
declare j jsonb; r jsonb;
begin
  assert (select count(*) from saved_routes) = 0, 'no direct reads of other people''s routes';
  j := list_routes('crew');
  assert jsonb_array_length(j) = 1, 'the club route only';
  r := j->0;
  assert not (r->>'mine')::boolean and r->'owner'->>'display_name' = 'Kemi', 'owner shown';
  assert jsonb_array_length(r->'path') < 23 - 3, 'the trimmed line';
  assert jsonb_array_length(list_routes('popular')) = 1, 'club routes count as popular in the city';
  begin
    perform get_route((select v::uuid from ids where k = 'private'));
    raise exception 'saw a private route';
  exception when raise_exception then
    if sqlerrm <> 'NOT_FOUND' then raise; end if;
  end;
  -- Two runs on the shared route; the faster one counts.
  perform save_run(now() - interval '40 minutes', now() - interval '28 minutes', 2200, 700, 2900, pg_temp.line(),
                   'run', 'River', 'members', null, (select v::uuid from ids where k = 'shared'), 20);
  perform save_run(now() - interval '25 minutes', now() - interval '13 minutes', 2250, 640, 2950, pg_temp.line(),
                   'run', 'River again', 'members', null, (select v::uuid from ids where k = 'shared'), 20);
  r := get_route((select v::uuid from ids where k = 'shared'));
  assert (r->'stats'->>'runs')::int = 2, 'two runs on it';
  assert (r->'stats'->>'best_s')::int = 640, 'best time';
  assert (r->'stats'->>'out_earned')::int = 4, 'two OUT a run of 2 km';
  assert jsonb_array_length(r->'leaders') = 1 and (r->'leaders'->0->>'is_me')::boolean, 'fastest here is me';
  -- How it felt.
  update runs set feel = 4 where title = 'River';
  assert (select feel from runs where title = 'River') = 4, 'feel saved';
  begin
    update runs set distance_m = 99999 where title = 'River';
    raise exception 'edited the distance';
  exception when insufficient_privilege then null;
  end;
  -- Near the start and about the right distance.
  j := routes_near(51.4712, -0.07, 2.2);
  assert jsonb_array_length(j) = 1, 'the shared route is near';
  assert jsonb_array_length(routes_near(51.6, -0.07, 2.2)) = 0, 'not from 14 km away';
  assert jsonb_array_length(routes_near(51.4712, -0.07, 10)) = 0, 'not for a 10 km ask';
end $$;
reset role;

-- A run can't be pinned to a route you can't see.
select pg_temp.act('00000000-0000-0000-0000-0000000000d3');
set role authenticated;
do $$
declare r runs;
begin
  r := save_run(now() - interval '20 minutes', now() - interval '8 minutes', 2200, 700, 0, pg_temp.line(),
                'run', null, 'members', null, (select v::uuid from ids where k = 'private'));
  assert r.route_id is null, 'private route not attached';
  assert jsonb_array_length(list_routes('crew')) = 0, 'not in the club';
end $$;
reset role;

-- ── The live map ─────────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000d1');
set role authenticated;
do $$ begin
  perform set_live_position(51.47, -0.07, 1.2, 'run');
  assert (select dot from member_dots where user_id = auth.uid()) = 'out', 'blue dot while recording';
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000d3');
set role authenticated;
do $$ begin
  perform set_live_position(51.4705, -0.0705, 0.5, 'walk');
  assert (select count(*) from live_positions) = 1, 'only my own position';
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000d2');
set role authenticated;
do $$
declare j jsonb;
begin
  j := crew_live(51.471, -0.07);
  assert j->'club'->>'name' = 'River Runners', 'my club';
  assert jsonb_array_length(j->'out') = 1 and j->'out'->0->>'display_name' = 'Kemi', 'Kemi is out, Zed is not in the club';
  assert (j->'out'->0->>'away_m')::int between 50 and 200, 'how far away';
  j := outside_map(51.471, -0.07);
  assert (j->>'total')::int = 2, 'two out in the city';
  assert j->>'area' = 'Southwark', 'my area';
  assert jsonb_array_length(j->'crew') = 1, 'club mates as faces';
  assert jsonb_array_length(j->'dots') = 1, 'everyone else as a dot';
  assert (j->'dots'->0->>0)::numeric = 51.471, 'rounded';
  assert wave_at('00000000-0000-0000-0000-0000000000d1'), 'waved';
  assert not wave_at('00000000-0000-0000-0000-0000000000d1'), 'once every ten minutes';
end $$;
reset role;
do $$ begin
  assert (select count(*) from notifications where user_id = '00000000-0000-0000-0000-0000000000d1' and title = 'Dan waved') = 1, 'Kemi heard the wave';
end $$;
select pg_temp.act('00000000-0000-0000-0000-0000000000d1');
set role authenticated;
do $$ begin
  perform save_run(now() - interval '20 minutes', now() - interval '1 minute', 3000, 1000);
  assert (select count(*) from live_positions) = 0, 'off the map once saved';
end $$;
reset role;

-- ── Live sharing ─────────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000d2');
set role authenticated;
do $$
declare sh live_shares; tok text; v jsonb;
begin
  begin
    perform start_live_share();
    raise exception 'shared with nobody';
  exception when raise_exception then
    if sqlerrm <> 'NO_CONTACTS' then raise; end if;
  end;
  begin
    perform add_trusted_contact('Mum', '12');
    raise exception 'bad phone';
  exception when raise_exception then
    if sqlerrm <> 'BAD_PHONE' then raise; end if;
  end;
  perform add_trusted_contact('Mum', '+44 7700 900123', 'live');
  perform add_trusted_contact('Sam', '07700 900456');
  assert (select count(*) from trusted_contacts) = 2, 'two contacts';
  assert (select mode from trusted_contacts where name = 'Sam') = 'alerts', 'alerts by default';
  update trusted_contacts set mode = 'live' where name = 'Sam';
  assert (select mode from trusted_contacts where name = 'Sam') = 'live', 'mode changed';
  perform update_safety(true, null);
  assert (select night_auto and check_in from safety_settings), 'night sharing on, check-in still on';
  sh := start_live_share();
  assert sh.id = (start_live_share()).id, 'one open share at a time';
  assert not ping_live_share(51.47, -0.07, 30), 'moving, no alert';
  assert ping_live_share(51.47, -0.07, 620), 'still for ten minutes';
  assert not ping_live_share(51.47, -0.07, 900), 'alert once';
  assert (select count(*) from notifications where title = 'We checked on you') = 1, 'told me';
  insert into ids values ('token', sh.token);
end $$;
reset role;

-- The link works without signing in, and only shows the first name and spot.
set role anon;
do $$
declare v jsonb := live_share_view((select v from ids where k = 'token'));
begin
  assert v->>'name' = 'Dan' and (v->>'live')::boolean and (v->>'lat')::float8 = 51.47, 'link shows the spot';
  assert live_share_view('nope') is null, 'unknown link';
  begin
    perform start_live_share();
    raise exception 'anon started a share';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000d2');
set role authenticated;
do $$ begin
  perform stop_live_share();
  assert (select count(*) from live_shares where ended_at is null) = 0, 'stopped';
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000d1');
set role authenticated;
do $$ begin
  assert (select count(*) from trusted_contacts) = 0, 'contacts are private';
  assert (select count(*) from live_shares) = 0, 'shares are private';
end $$;
reset role;
