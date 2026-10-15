-- Outhere schema, part 3: steps, runs, the out-now dot and the XP/OUT ledger.

-- ── Ledger ───────────────────────────────────────────────────────────────────

-- XP is status, OUT is the earn-only currency. Every change is one row with a
-- unique key, so retrying a payout can never pay twice. OUT is held for 24
-- hours (available_at) before it can be spent.
create type public.currency as enum ('xp', 'out');

create table public.ledger (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  currency      public.currency not null,
  amount        integer not null check (amount <> 0),
  reason        text not null,                   -- 'steps', 'active_day', 'battle_win', 'drop' ...
  label         text not null,                   -- shown in the wallet
  ref_type      text,
  ref_id        text,
  idem_key      text not null unique,
  available_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index ledger_user_idx on public.ledger(user_id, created_at desc);

-- Award XP and/or OUT. Returns false when this key was already paid.
create or replace function public.award(
  p_user uuid, p_key text, p_label text, p_reason text,
  p_xp integer default 0, p_out integer default 0,
  p_ref_type text default null, p_ref_id text default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  multiplier numeric := 1;
  paid boolean := false;
  xp_amount int;
begin
  select case tier when 'pro' then 1.2 when 'black' then 1.5 else 1 end
    into multiplier from profiles where id = p_user;
  xp_amount := round(p_xp * coalesce(multiplier, 1));
  if xp_amount <> 0 then
    insert into ledger (user_id, currency, amount, reason, label, ref_type, ref_id, idem_key)
    values (p_user, 'xp', xp_amount, p_reason, p_label, p_ref_type, p_ref_id, p_key || ':xp')
    on conflict (idem_key) do nothing;
    if found then
      paid := true;
      update profiles set xp = xp + xp_amount,
             level = public.level_for_xp(xp + xp_amount)
      where id = p_user;
    end if;
  end if;
  if p_out <> 0 then
    insert into ledger (user_id, currency, amount, reason, label, ref_type, ref_id, idem_key, available_at)
    values (p_user, 'out', p_out, p_reason, p_label, p_ref_type, p_ref_id, p_key || ':out',
            case when p_out > 0 then now() + interval '24 hours' else now() end)
    on conflict (idem_key) do nothing;
    paid := paid or found;
  end if;
  return paid;
end $$;
revoke execute on function public.award from public, anon, authenticated;

-- Level n starts at 75 * (n-1) * n XP (same curve as the app engine).
create or replace function public.level_for_xp(p_xp integer)
returns integer language sql immutable as $$
  select greatest(1, floor((1 + sqrt(1 + 4 * greatest(p_xp, 0) / 75.0)) / 2)::int)
$$;

create or replace view public.wallets with (security_invoker = true) as
select p.id as user_id,
       coalesce(sum(l.amount) filter (where l.currency = 'xp'), 0)::int as xp,
       coalesce(sum(l.amount) filter (where l.currency = 'out'), 0)::int as out_total,
       coalesce(sum(l.amount) filter (where l.currency = 'out' and l.available_at <= now()), 0)::int as out_available,
       coalesce(sum(l.amount) filter (where l.currency = 'out' and l.available_at > now()), 0)::int as out_held
from public.profiles p
left join public.ledger l on l.user_id = p.id
group by p.id;

-- Spendable OUT for the signed in member, used inside other functions.
create or replace function public.out_available(p_user uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::int from ledger
  where user_id = p_user and currency = 'out' and available_at <= now()
$$;

-- ── Daily steps ──────────────────────────────────────────────────────────────

-- Counted steps (proposed rule, awaiting sign off): every step up to 10k, half
-- of each step from 10k to 20k, never more than 15k a day. League scores use
-- counted steps; the raw count is still shown to the member.
create or replace function public.counted_steps(raw integer)
returns integer language sql immutable as $$
  select least(15000,
    least(raw, 10000) + greatest(0, least(raw, 20000) - 10000) / 2)
$$;

create table public.daily_steps (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  day           date not null,
  steps         integer not null default 0 check (steps between 0 and 100000),
  counted       integer generated always as (public.counted_steps(steps)) stored,
  distance_m    integer not null default 0,
  active_minutes integer not null default 0,
  source        text,
  flagged       boolean not null default false,  -- under review, shows a red dot
  updated_at    timestamptz not null default now(),
  primary key (user_id, day)
);
create index daily_steps_day_idx on public.daily_steps(day);

-- The one way steps get in. Rules: no future days, today or yesterday only,
-- never goes backwards, raw cap 100k (anything above 60k is flagged for
-- review). Pays XP and OUT as thresholds are crossed, once each.
create or replace function public.ingest_steps(
  p_day date, p_steps integer, p_distance_m integer default null,
  p_active_minutes integer default null, p_source text default 'pedometer')
returns public.daily_steps language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  today date := public.london_today();
  row_ daily_steps;
  goal int;
  thousands int;
  i int;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if p_day > today then raise exception 'FUTURE_DAY'; end if;
  if p_day < today - 1 then raise exception 'TOO_OLD' using hint = 'Steps can be synced for today and yesterday.'; end if;
  if p_steps < 0 then raise exception 'BAD_STEPS'; end if;
  p_steps := least(p_steps, 100000);

  insert into daily_steps (user_id, day, steps, distance_m, active_minutes, source, flagged)
  values (me, p_day, p_steps, coalesce(p_distance_m, round(p_steps * 0.762)),
          coalesce(p_active_minutes, p_steps / 100), p_source, p_steps > 60000)
  on conflict (user_id, day) do update set
    steps = greatest(daily_steps.steps, excluded.steps),
    distance_m = greatest(daily_steps.distance_m, excluded.distance_m),
    active_minutes = greatest(daily_steps.active_minutes, excluded.active_minutes),
    source = excluded.source,
    flagged = daily_steps.flagged or excluded.flagged,
    updated_at = now()
  returning * into row_;

  if row_.flagged then return row_; end if;

  -- 5 XP per thousand counted steps.
  thousands := row_.counted / 1000;
  for i in 1..thousands loop
    perform public.award(me, format('steps:%s:%s:%s', me, p_day, i), 'Steps', 'steps', 5);
  end loop;
  if row_.steps >= 3000 then
    perform public.award(me, format('active:%s:%s', me, p_day), 'Active day', 'active_day', 50, 5);
  end if;
  select daily_goal into goal from profiles where id = me;
  if row_.steps >= goal then
    perform public.award(me, format('goal:%s:%s', me, p_day), 'Daily goal hit', 'goal', 40, 4);
  end if;

  perform public.refresh_streak(me);
  return row_;
end $$;

-- A streak day is a day with 3,000+ steps. Today counts once reached; a
-- missing today does not break yesterday's streak.
create or replace function public.refresh_streak(p_user uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  d date := public.london_today();
  n int := 0;
begin
  if not exists (select 1 from daily_steps where user_id = p_user and day = d and steps >= 3000) then
    d := d - 1;
  end if;
  while exists (select 1 from daily_steps where user_id = p_user and day = d and steps >= 3000) loop
    n := n + 1;
    d := d - 1;
  end loop;
  update profiles set streak_days = n, best_streak = greatest(best_streak, n) where id = p_user;
  if n in (7, 14, 30, 100) then
    perform public.award(p_user, format('streak:%s:%s:%s', p_user, n, public.london_today()),
                         format('%s day streak', n), 'streak', n * 10, n);
  end if;
  return n;
end $$;
revoke execute on function public.refresh_streak from public, anon, authenticated;

-- ── Runs ─────────────────────────────────────────────────────────────────────

create type public.run_kind as enum ('run', 'walk', 'battle', 'club_run');

create table public.runs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  kind          public.run_kind not null default 'run',
  title         text check (char_length(title) <= 60),
  started_at    timestamptz not null,
  ended_at      timestamptz not null,
  distance_m    integer not null check (distance_m between 0 and 300000),
  moving_s      integer not null check (moving_s >= 0),
  steps         integer not null default 0,
  avg_pace_s_per_km integer,
  elevation_m   integer,
  event_id      uuid references public.events(id) on delete set null,
  battle_id     uuid,                            -- fk in game migration
  -- Route with the first and last 200 m removed, safe to show others.
  route_public  jsonb,
  visibility    public.visibility not null default 'members',
  created_at    timestamptz not null default now(),
  check (ended_at > started_at)
);
create index runs_user_idx on public.runs(user_id, started_at desc);

-- The full route, owner only.
create table public.run_routes (
  run_id        uuid primary key references public.runs(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  points        jsonb not null                   -- [[lat, lng, t_ms], ...]
);

create or replace function public.haversine_m(lat1 float8, lng1 float8, lat2 float8, lng2 float8)
returns float8 language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)))
$$;

-- Drop the first and last p_m metres of a route so homes stay private.
create or replace function public.trim_route(points jsonb, p_m float8 default 200)
returns jsonb language plpgsql immutable as $$
declare
  n int := coalesce(jsonb_array_length(points), 0);
  acc float8 := 0;
  first_i int := 0;
  last_i int;
  i int;
begin
  if n < 3 then return '[]'::jsonb; end if;
  last_i := n - 1;
  for i in 1..n - 1 loop
    acc := acc + public.haversine_m((points->(i-1)->>0)::float8, (points->(i-1)->>1)::float8,
                                    (points->i->>0)::float8, (points->i->>1)::float8);
    if acc >= p_m then first_i := i; exit; end if;
  end loop;
  acc := 0;
  for i in reverse n - 1..1 loop
    acc := acc + public.haversine_m((points->(i-1)->>0)::float8, (points->(i-1)->>1)::float8,
                                    (points->i->>0)::float8, (points->i->>1)::float8);
    if acc >= p_m then last_i := i - 1; exit; end if;
  end loop;
  if acc < p_m or last_i <= first_i then return '[]'::jsonb; end if;
  return (select jsonb_agg(jsonb_build_array(e->0, e->1) order by idx)
          from jsonb_array_elements(points) with ordinality as t(e, idx)
          where idx - 1 between first_i and last_i);
end $$;

-- Save a finished run with its route. Pays 10 XP a km, once per run.
create or replace function public.save_run(
  p_started_at timestamptz, p_ended_at timestamptz, p_distance_m integer, p_moving_s integer,
  p_steps integer default 0, p_points jsonb default '[]'::jsonb, p_kind public.run_kind default 'run',
  p_title text default null, p_visibility public.visibility default 'members',
  p_event uuid default null)
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
                    avg_pace_s_per_km, event_id, route_public, visibility)
  values (me, p_kind, p_title, p_started_at, p_ended_at, p_distance_m, p_moving_s, p_steps,
          pace, p_event, public.trim_route(p_points), p_visibility)
  returning * into r;
  insert into run_routes (run_id, user_id, points) values (r.id, me, p_points);

  perform public.award(me, 'run:' || r.id, 'Run', 'run', (p_distance_m / 1000) * 10, 0, 'run', r.id::text);
  perform public.set_presence('stopped', r.id);
  return r;
end $$;

-- ── Presence: the dot ────────────────────────────────────────────────────────

-- Blue dot = out now (state 'out', seen in the last 10 minutes).
-- Red dot  = just stopped (state 'stopped' within the last 30 minutes).
create table public.presence (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  state         text not null check (state in ('out', 'stopped')),
  run_id        uuid,
  borough_id    text references public.boroughs(id),
  changed_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create or replace function public.set_presence(p_state text, p_run uuid default null, p_borough text default null)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then return; end if;
  insert into presence (user_id, state, run_id, borough_id)
  values (me, p_state, p_run, coalesce(p_borough, (select borough_id from profiles where id = me)))
  on conflict (user_id) do update set
    state = excluded.state,
    run_id = coalesce(excluded.run_id, presence.run_id),
    borough_id = coalesce(excluded.borough_id, presence.borough_id),
    changed_at = case when presence.state = excluded.state then presence.changed_at else now() end,
    last_seen_at = now();
end $$;

create or replace view public.member_dots with (security_invoker = true) as
select user_id,
       case
         when state = 'out' and last_seen_at > now() - interval '10 minutes' then 'out'
         when state = 'stopped' and changed_at > now() - interval '30 minutes' then 'stopped'
         when state = 'out' and last_seen_at > now() - interval '30 minutes' then 'stopped'
       end as dot,
       borough_id,
       changed_at
from public.presence;

-- "Outside now" count for Home and the website.
create or replace function public.outside_now(p_city text default 'london')
returns table (borough_id text, out_now bigint) language sql stable security definer set search_path = public as $$
  select coalesce(pr.borough_id, 'unknown'), count(*)
  from presence pr
  join profiles p on p.id = pr.user_id
  where pr.state = 'out' and pr.last_seen_at > now() - interval '10 minutes'
    and p.city_id = p_city
  group by 1
$$;

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table public.ledger enable row level security;
alter table public.daily_steps enable row level security;
alter table public.runs enable row level security;
alter table public.run_routes enable row level security;
alter table public.presence enable row level security;

create policy "own ledger" on public.ledger for select using (user_id = auth.uid() or public.is_staff('finance'));

-- Step totals are visible to signed in members (leaderboards, battles).
create policy "steps visible to members" on public.daily_steps for select to authenticated using (true);

create policy "runs people can see" on public.runs for select using (
  user_id = auth.uid()
  or visibility = 'public'
  or (visibility = 'members' and auth.uid() is not null));
create policy "delete own runs" on public.runs for delete using (user_id = auth.uid());
create policy "edit own run title" on public.runs for update using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.runs from anon, authenticated;
grant update (title, visibility) on public.runs to authenticated;

create policy "own routes" on public.run_routes for select using (user_id = auth.uid());

create policy "dots visible to members" on public.presence for select to authenticated using (true);
