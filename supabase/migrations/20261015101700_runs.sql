-- Outhere schema, part 14: Move and runs. Saved routes (yours, your club's and
-- popular ones near you), runs linked to the route they followed, how a run
-- felt, the live map (your club out now, who's outside near you), waves, and
-- live sharing with trusted contacts.
--
-- Routes: the owner sees the full line. Anyone else only sees a route that was
-- shared with a club, and with "hide the start and end" on they get the line
-- with the first and last 200 m removed (trim_route), so homes stay private.
-- "Popular" is every club-shared route in your city, ranked by runners this
-- month.

-- ── Saved routes ─────────────────────────────────────────────────────────────

-- Total length of a [[lat, lng, ...], ...] line in metres.
create or replace function public.path_length_m(p_path jsonb)
returns float8 language sql immutable as $$
  select coalesce(sum(public.haversine_m((a->>0)::float8, (a->>1)::float8, (b->>0)::float8, (b->>1)::float8)), 0)
  from jsonb_array_elements(p_path) with ordinality as x(a, i)
  join jsonb_array_elements(p_path) with ordinality as y(b, j) on j = i + 1
$$;

create table public.saved_routes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text not null check (char_length(name) between 2 and 30),
  path          jsonb not null,                  -- [[lat, lng, alt?], ...] owner only
  path_public   jsonb not null default '[]'::jsonb, -- what others see
  waypoints     jsonb not null default '[]'::jsonb,
  distance_m    integer not null check (distance_m between 200 and 300000),
  climb_m       integer check (climb_m between 0 and 10000),
  hide_ends     boolean not null default true,
  club_id       uuid references public.clubs(id) on delete set null, -- shared with this club
  city_id       text references public.cities(id),
  start_lat     float8 not null,
  start_lng     float8 not null,
  public_lat    float8,                          -- first point others can see
  public_lng    float8,
  created_at    timestamptz not null default now()
);
create index saved_routes_user_idx on public.saved_routes(user_id, created_at desc);
create index saved_routes_club_idx on public.saved_routes(club_id) where club_id is not null;
create index saved_routes_city_idx on public.saved_routes(city_id) where club_id is not null;

alter table public.runs
  add column if not exists route_id uuid references public.saved_routes(id) on delete set null,
  add column if not exists feel smallint check (feel between 1 and 5);
create index if not exists runs_route_idx on public.runs(route_id, started_at desc) where route_id is not null;

-- How a run felt is set from the run summary.
grant update (title, visibility, feel) on public.runs to authenticated;

-- A route is visible to its owner, and to everyone signed in once shared.
create or replace function public.can_see_route(p_route uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from saved_routes r where r.id = p_route and (r.user_id = p_user or (r.club_id is not null and p_user is not null)))
$$;

-- The first club you joined, or your home club.
create or replace function public.my_club(p_user uuid default auth.uid())
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select p.home_club_id from profiles p where p.id = p_user and p.home_club_id is not null
       and exists (select 1 from club_members m where m.club_id = p.home_club_id and m.user_id = p_user)),
    (select m.club_id from club_members m where m.user_id = p_user order by m.joined_at limit 1))
$$;

create or replace function public.save_route(
  p_name text, p_path jsonb, p_waypoints jsonb default '[]'::jsonb, p_climb_m integer default null,
  p_hide_ends boolean default true, p_share_club boolean default false)
returns public.saved_routes language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  n text := btrim(coalesce(p_name, ''));
  len float8;
  pub jsonb;
  r saved_routes;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if char_length(n) not between 2 and 30 then raise exception 'ROUTE_NAME'; end if;
  if jsonb_typeof(p_path) <> 'array' or jsonb_array_length(p_path) < 2 or jsonb_array_length(p_path) > 2000 then
    raise exception 'ROUTE_TOO_SHORT';
  end if;
  if (select count(*) from saved_routes where user_id = me) >= 200 then raise exception 'TOO_MANY_ROUTES'; end if;
  len := public.path_length_m(p_path);
  if len < 200 then raise exception 'ROUTE_TOO_SHORT'; end if;
  pub := case when p_hide_ends then public.trim_route(p_path)
              else (select jsonb_agg(jsonb_build_array(e->0, e->1) order by i) from jsonb_array_elements(p_path) with ordinality t(e, i)) end;
  insert into saved_routes (user_id, name, path, path_public, waypoints, distance_m, climb_m, hide_ends, club_id, city_id,
                            start_lat, start_lng, public_lat, public_lng)
  values (me, n, p_path, coalesce(pub, '[]'::jsonb), coalesce(p_waypoints, '[]'::jsonb), round(len), p_climb_m, p_hide_ends,
          case when p_share_club then public.my_club(me) end,
          (select city_id from profiles where id = me),
          (p_path->0->>0)::float8, (p_path->0->>1)::float8,
          (pub->0->>0)::float8, (pub->0->>1)::float8)
  returning * into r;
  return r;
end $$;

-- One route as the app shows it. Others get the public line.
create or replace function public.route_json(r public.saved_routes, p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', r.id,
    'name', r.name,
    'mine', r.user_id = p_user,
    'owner', case when r.user_id = p_user then null else (
      select jsonb_build_object('id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar_path', p.avatar_path, 'tier', p.tier)
      from profiles p where p.id = r.user_id) end,
    'club_id', r.club_id,
    'club_name', (select c.name from clubs c where c.id = r.club_id),
    'hide_ends', r.hide_ends,
    'path', case when r.user_id = p_user then r.path else r.path_public end,
    'waypoints', case when r.user_id = p_user then r.waypoints else '[]'::jsonb end,
    'distance_m', r.distance_m,
    'climb_m', r.climb_m,
    'created_at', r.created_at,
    'runners', (select count(distinct x.user_id) from runs x where x.route_id = r.id and x.started_at > now() - interval '30 days'),
    'stats', (
      select jsonb_build_object(
        'runs', count(*),
        'best_s', min(x.moving_s) filter (where x.distance_m >= r.distance_m * 0.9),
        'best_run_id', (select y.id from runs y where y.route_id = r.id and y.user_id = p_user and y.distance_m >= r.distance_m * 0.9
                        order by y.moving_s limit 1),
        'out_earned', coalesce((select sum(l.amount) from ledger l where l.user_id = p_user and l.currency = 'out'
                                and l.ref_type = 'run' and l.ref_id in (select z.id::text from runs z where z.route_id = r.id and z.user_id = p_user)), 0),
        'last_run_at', max(x.ended_at))
      from runs x where x.route_id = r.id and x.user_id = p_user)
  )
$$;

-- p_scope: 'mine', 'crew' (shared with your clubs) or 'popular' (shared in your city).
create or replace function public.list_routes(p_scope text default 'mine')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  res jsonb;
begin
  if me is null then return '[]'::jsonb; end if;
  if p_scope = 'mine' then
    select coalesce(jsonb_agg(public.route_json(r, me) order by coalesce((select max(x.ended_at) from runs x where x.route_id = r.id and x.user_id = me), r.created_at) desc), '[]'::jsonb)
      into res from saved_routes r where r.user_id = me;
  elsif p_scope = 'crew' then
    select coalesce(jsonb_agg(j order by j->>'created_at' desc), '[]'::jsonb) into res
    from (select public.route_json(r, me) j from saved_routes r
          where r.club_id in (select club_id from club_members where user_id = me)
          order by r.created_at desc limit 50) t;
  elsif p_scope = 'popular' then
    select coalesce(jsonb_agg(j order by (j->>'runners')::int desc, j->>'created_at' desc), '[]'::jsonb) into res
    from (select public.route_json(r, me) j from saved_routes r
          where r.club_id is not null and r.city_id = (select city_id from profiles where id = me)
          order by r.created_at desc limit 100) t;
  else
    raise exception 'BAD_SCOPE';
  end if;
  return res;
end $$;

-- A route with the fastest people on it this month (top three, and you).
create or replace function public.get_route(p_route uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  r saved_routes;
  leaders jsonb;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  select * into r from saved_routes where id = p_route;
  if not found or not public.can_see_route(p_route, me) then raise exception 'NOT_FOUND'; end if;
  with best as (
    select x.user_id, min(x.moving_s) as sec
    from runs x
    where x.route_id = r.id and x.started_at >= date_trunc('month', now()) and x.distance_m >= r.distance_m * 0.9
    group by x.user_id
  ), ranked as (
    select b.*, rank() over (order by b.sec) as rk from best b
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'rank', k.rk, 'sec', k.sec, 'is_me', k.user_id = me,
           'player', jsonb_build_object('id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar_path', p.avatar_path, 'tier', p.tier))
         order by k.rk), '[]'::jsonb)
    into leaders
  from ranked k join profiles p on p.id = k.user_id
  where k.rk <= 3 or k.user_id = me;
  return public.route_json(r, me) || jsonb_build_object('leaders', leaders);
end $$;

-- Routes that start near you, closest to the distance asked for.
create or replace function public.routes_near(p_lat float8, p_lng float8, p_km numeric, p_radius_m integer default 1500)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(j order by (j->'stats'->>'best_s') is null, abs((j->>'distance_m')::int - p_km * 1000)), '[]'::jsonb)
  from (
    select public.route_json(r, auth.uid()) j
    from saved_routes r
    where auth.uid() is not null
      and (r.user_id = auth.uid() or r.club_id is not null)
      and abs(r.distance_m - p_km * 1000) <= greatest(1000, p_km * 400)
      and public.haversine_m(p_lat, p_lng,
            case when r.user_id = auth.uid() then r.start_lat else r.public_lat end,
            case when r.user_id = auth.uid() then r.start_lng else r.public_lng end) <= p_radius_m
    order by abs(r.distance_m - p_km * 1000)
    limit 6
  ) t
$$;

-- ── Runs on a route ──────────────────────────────────────────────────────────

-- Same as before, plus the route it followed and the climb. Pays 10 XP a km
-- and 1 OUT a full km, once per run.
drop function if exists public.save_run(timestamptz, timestamptz, integer, integer, integer, jsonb, public.run_kind, text, public.visibility, uuid);
create or replace function public.save_run(
  p_started_at timestamptz, p_ended_at timestamptz, p_distance_m integer, p_moving_s integer,
  p_steps integer default 0, p_points jsonb default '[]'::jsonb, p_kind public.run_kind default 'run',
  p_title text default null, p_visibility public.visibility default 'members',
  p_event uuid default null, p_route uuid default null, p_climb_m integer default null)
returns public.runs language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  r runs;
  pace int;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if p_ended_at > now() + interval '5 minutes' then raise exception 'FUTURE_RUN'; end if;
  if p_started_at < now() - interval '2 days' then raise exception 'TOO_OLD'; end if;
  pace := case when p_distance_m > 0 then round(p_moving_s / (p_distance_m / 1000.0)) end;
  -- Faster than 2:30/km over 1 km+ is not a run on foot.
  if p_distance_m >= 1000 and pace < 150 then raise exception 'UNREALISTIC_PACE'; end if;

  insert into runs (user_id, kind, title, started_at, ended_at, distance_m, moving_s, steps,
                    avg_pace_s_per_km, elevation_m, event_id, route_public, visibility, route_id)
  values (me, p_kind, p_title, p_started_at, p_ended_at, p_distance_m, p_moving_s, greatest(0, coalesce(p_steps, 0)),
          pace, case when p_climb_m between 0 and 10000 then p_climb_m end, p_event, public.trim_route(p_points), p_visibility,
          case when p_route is not null and public.can_see_route(p_route, me) then p_route end)
  returning * into r;
  insert into run_routes (run_id, user_id, points) values (r.id, me, p_points);

  perform public.award(me, 'run:' || r.id, 'Run', 'run', (p_distance_m / 1000) * 10, p_distance_m / 1000, 'run', r.id::text);
  perform public.set_presence('stopped', r.id);
  delete from live_positions where user_id = me;
  return r;
end $$;

-- ── The live map ─────────────────────────────────────────────────────────────

-- Where you are while recording. Club mates see you on Crew live; everyone
-- else only ever sees a dot rounded to about 200 m.
create table public.live_positions (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  lat           float8 not null check (lat between -90 and 90),
  lng           float8 not null check (lng between -180 and 180),
  km            numeric(6, 2) not null default 0,
  kind          public.run_kind not null default 'run',
  route_id      uuid references public.saved_routes(id) on delete set null,
  updated_at    timestamptz not null default now()
);

create or replace function public.set_live_position(p_lat float8, p_lng float8, p_km numeric default 0,
  p_kind public.run_kind default 'run', p_route uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  insert into live_positions (user_id, lat, lng, km, kind, route_id)
  values (me, p_lat, p_lng, greatest(0, least(p_km, 9999)), p_kind,
          case when p_route is not null and public.can_see_route(p_route, me) then p_route end)
  on conflict (user_id) do update set lat = excluded.lat, lng = excluded.lng, km = excluded.km,
    kind = excluded.kind, route_id = excluded.route_id, updated_at = now();
  perform public.set_presence('out');
end $$;

create or replace function public.clear_live_position()
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then return; end if;
  delete from live_positions where user_id = me;
  perform public.set_presence('stopped');
end $$;

-- Your club out now, nearest first.
create or replace function public.crew_live(p_lat float8 default null, p_lng float8 default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  club uuid := public.my_club(auth.uid());
  people jsonb;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if club is null then return jsonb_build_object('club', null, 'out', '[]'::jsonb, 'count', 0); end if;
  select coalesce(jsonb_agg(jsonb_build_object(
           'user_id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar_path', p.avatar_path, 'tier', p.tier,
           'kind', lp.kind, 'km', lp.km, 'lat', lp.lat, 'lng', lp.lng,
           'away_m', case when p_lat is null then null else round(public.haversine_m(p_lat, p_lng, lp.lat, lp.lng)) end)
         order by case when p_lat is null then 0 else public.haversine_m(p_lat, p_lng, lp.lat, lp.lng) end), '[]'::jsonb)
    into people
  from live_positions lp
  join club_members m on m.user_id = lp.user_id and m.club_id = club
  join profiles p on p.id = lp.user_id
  where lp.user_id <> me and lp.updated_at > now() - interval '10 minutes';
  return jsonb_build_object(
    'club', (select jsonb_build_object('id', c.id, 'name', c.name, 'logo_path', c.logo_path) from clubs c where c.id = club),
    'out', people,
    'count', jsonb_array_length(people) + case when exists (select 1 from live_positions where user_id = me and updated_at > now() - interval '10 minutes') then 1 else 0 end);
end $$;

-- Who's outside near you: the city count, your borough, club mates as faces
-- and everyone else within 3 km as rounded dots.
create or replace function public.outside_map(p_lat float8 default null, p_lng float8 default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_city text;
  my_borough text;
  mates uuid[];
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  select city_id, borough_id into my_city, my_borough from profiles where id = me;
  select coalesce(array_agg(distinct m2.user_id), '{}') into mates
  from club_members m1 join club_members m2 on m2.club_id = m1.club_id
  where m1.user_id = me and m2.user_id <> me;
  return jsonb_build_object(
    'total', (select count(*) from presence pr join profiles p on p.id = pr.user_id
              where pr.state = 'out' and pr.last_seen_at > now() - interval '10 minutes' and p.city_id = my_city),
    'near', (select count(*) from presence pr
             where pr.state = 'out' and pr.last_seen_at > now() - interval '10 minutes' and pr.borough_id = my_borough),
    'area', (select b.name from boroughs b where b.id = my_borough),
    'city', (select c.name from cities c where c.id = my_city),
    'crew', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'display_name', p.display_name, 'avatar_path', p.avatar_path,
                                                          'tier', p.tier, 'lat', lp.lat, 'lng', lp.lng)), '[]'::jsonb)
             from live_positions lp join profiles p on p.id = lp.user_id
             where lp.user_id = any(mates) and lp.updated_at > now() - interval '10 minutes'),
    'dots', (select coalesce(jsonb_agg(jsonb_build_array(round(lp.lat::numeric, 3), round(lp.lng::numeric, 3))), '[]'::jsonb)
             from live_positions lp
             where p_lat is not null and lp.user_id <> me and not (lp.user_id = any(mates))
               and lp.updated_at > now() - interval '10 minutes'
               and public.haversine_m(p_lat, p_lng, lp.lat, lp.lng) <= 3000));
end $$;

-- A wave to someone who's out. One per person every ten minutes.
create table public.waves (
  id            bigint generated always as identity primary key,
  from_id       uuid not null references public.profiles(id) on delete cascade,
  to_id         uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now()
);
create index waves_pair_idx on public.waves(from_id, to_id, created_at desc);

create or replace function public.wave_at(p_user uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  who text;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if p_user = me or not exists (select 1 from profiles where id = p_user) then raise exception 'NOT_FOUND'; end if;
  if exists (select 1 from waves where from_id = me and to_id = p_user and created_at > now() - interval '10 minutes') then
    return false;
  end if;
  insert into waves (from_id, to_id) values (me, p_user);
  select display_name into who from profiles where id = me;
  perform public.notify(p_user, 'social', who || ' waved', 'Keep going, you''re on the map.', '/player/' || me);
  return true;
end $$;

-- ── Live sharing ─────────────────────────────────────────────────────────────

create table public.trusted_contacts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 40),
  phone         text not null check (phone ~ '^\+?[0-9]{7,15}$'),
  mode          text not null default 'alerts' check (mode in ('live', 'alerts')), -- live = can watch, alerts = texts only
  created_at    timestamptz not null default now()
);
create index trusted_contacts_user_idx on public.trusted_contacts(user_id);

create table public.safety_settings (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  night_auto    boolean not null default false,  -- share on every run after dark
  check_in      boolean not null default true,   -- text contacts after 10 min still
  updated_at    timestamptz not null default now()
);

create table public.live_shares (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  token         text not null unique default replace(gen_random_uuid()::text, '-', ''),
  run_id        uuid references public.runs(id) on delete set null,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  lat           float8,
  lng           float8,
  last_at       timestamptz,
  alerted_at    timestamptz                      -- picked up by the texting job
);
create unique index live_shares_open_idx on public.live_shares(user_id) where ended_at is null;

create or replace function public.add_trusted_contact(p_name text, p_phone text, p_mode text default 'alerts')
returns public.trusted_contacts language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  n text := btrim(coalesce(p_name, ''));
  ph text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  c trusted_contacts;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if char_length(n) not between 1 and 40 then raise exception 'CONTACT_NAME'; end if;
  if ph !~ '^\+?[0-9]{7,15}$' then raise exception 'BAD_PHONE'; end if;
  if (select count(*) from trusted_contacts where user_id = me) >= 5 then raise exception 'TOO_MANY_CONTACTS'; end if;
  insert into trusted_contacts (user_id, name, phone, mode)
  values (me, n, ph, case when p_mode = 'live' then 'live' else 'alerts' end)
  returning * into c;
  return c;
end $$;

create or replace function public.update_safety(p_night_auto boolean default null, p_check_in boolean default null)
returns public.safety_settings language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  s safety_settings;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  insert into safety_settings (user_id, night_auto, check_in)
  values (me, coalesce(p_night_auto, false), coalesce(p_check_in, true))
  on conflict (user_id) do update set
    night_auto = coalesce(p_night_auto, safety_settings.night_auto),
    check_in = coalesce(p_check_in, safety_settings.check_in),
    updated_at = now()
  returning * into s;
  return s;
end $$;

create or replace function public.start_live_share(p_run uuid default null)
returns public.live_shares language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  sh live_shares;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if not exists (select 1 from trusted_contacts where user_id = me) then raise exception 'NO_CONTACTS'; end if;
  select * into sh from live_shares where user_id = me and ended_at is null;
  if found then return sh; end if;
  insert into live_shares (user_id, run_id)
  values (me, case when exists (select 1 from runs where id = p_run and user_id = me) then p_run end)
  returning * into sh;
  return sh;
end $$;

create or replace function public.stop_live_share()
returns void language sql security definer set search_path = public as $$
  update live_shares set ended_at = now() where user_id = auth.uid() and ended_at is null
$$;

-- Your spot while sharing. Still for ten minutes with check-ins on: marks the
-- share for the texting job and tells you. Returns true when that happens.
create or replace function public.ping_live_share(p_lat float8, p_lng float8, p_still_s integer default 0)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  sh live_shares;
  names text;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  update live_shares set lat = p_lat, lng = p_lng, last_at = now()
  where user_id = me and ended_at is null
  returning * into sh;
  if not found then return false; end if;
  if p_still_s >= 600 and sh.alerted_at is null
     and coalesce((select check_in from safety_settings where user_id = me), true) then
    update live_shares set alerted_at = now() where id = sh.id;
    select string_agg(name, ' and ' order by created_at) into names from trusted_contacts where user_id = me;
    perform public.notify(me, 'system', 'We checked on you', 'You''d stopped for 10 minutes, so we texted ' || names || '.', '/runs/safety');
    return true;
  end if;
  return false;
end $$;

-- What a trusted contact's link shows: first name and last spot while live.
create or replace function public.live_share_view(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('name', split_part(p.display_name, ' ', 1), 'lat', s.lat, 'lng', s.lng,
                            'last_at', s.last_at, 'started_at', s.started_at, 'live', s.ended_at is null)
  from live_shares s join profiles p on p.id = s.user_id
  where s.token = p_token and (s.ended_at is null or s.ended_at > now() - interval '1 hour')
$$;

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table public.saved_routes enable row level security;
alter table public.live_positions enable row level security;
alter table public.waves enable row level security;
alter table public.trusted_contacts enable row level security;
alter table public.safety_settings enable row level security;
alter table public.live_shares enable row level security;

-- Others reach shared routes through list_routes, get_route and routes_near.
create policy "own routes" on public.saved_routes for select using (user_id = auth.uid());
create policy "delete own routes" on public.saved_routes for delete using (user_id = auth.uid());
create policy "rename own routes" on public.saved_routes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke insert, update, delete on public.saved_routes from anon, authenticated;
grant select, delete on public.saved_routes to authenticated;
grant update (name) on public.saved_routes to authenticated;

create policy "own live position" on public.live_positions for select using (user_id = auth.uid());
revoke insert, update, delete on public.live_positions from anon, authenticated;

revoke all on public.waves from anon, authenticated;

create policy "own trusted contacts" on public.trusted_contacts for select using (user_id = auth.uid());
create policy "remove trusted contacts" on public.trusted_contacts for delete using (user_id = auth.uid());
create policy "change contact mode" on public.trusted_contacts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke insert, update, delete on public.trusted_contacts from anon, authenticated;
grant select, delete on public.trusted_contacts to authenticated;
grant update (mode) on public.trusted_contacts to authenticated;

create policy "own safety settings" on public.safety_settings for select using (user_id = auth.uid());
revoke insert, update, delete on public.safety_settings from anon, authenticated;

create policy "own live shares" on public.live_shares for select using (user_id = auth.uid());
revoke insert, update, delete on public.live_shares from anon, authenticated;

-- Functions: signed in members only, apart from the share link.
revoke execute on function public.save_route, public.list_routes, public.get_route, public.routes_near,
  public.set_live_position, public.clear_live_position, public.crew_live, public.outside_map, public.wave_at,
  public.add_trusted_contact, public.update_safety, public.start_live_share, public.stop_live_share,
  public.ping_live_share, public.save_run from public, anon;
revoke execute on function public.route_json, public.can_see_route, public.my_club from public, anon, authenticated;
grant execute on function public.live_share_view to anon, authenticated;
