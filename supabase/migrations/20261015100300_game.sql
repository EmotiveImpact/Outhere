-- Outhere schema, part 4: battles, rivals, challenges and the leagues.

-- ── 1v1 battles ──────────────────────────────────────────────────────────────

-- Six modes (demo version 23):
--   live_race          same start time anywhere, first to the distance
--   blind_time_trial   times sealed until both finish; 12h to start, 24h to finish
--   most_steps         most counted steps over the window
--   ghost_race         race the other person's recorded run
--   last_one_standing  keep hitting the daily target; first to miss loses
--   hold_the_route     most laps of a saved route in the window
create type public.battle_mode as enum
  ('live_race', 'blind_time_trial', 'most_steps', 'ghost_race', 'last_one_standing', 'hold_the_route');
create type public.battle_status as enum
  ('pending', 'accepted', 'live', 'finished', 'declined', 'cancelled', 'expired', 'forfeit');

create table public.battles (
  id            uuid primary key default gen_random_uuid(),
  mode          public.battle_mode not null default 'most_steps',
  status        public.battle_status not null default 'pending',
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id   uuid not null references public.profiles(id) on delete cascade,
  is_surprise   boolean not null default false,  -- 'Here comes a new challenger'
  distance_m    integer check (distance_m between 400 and 50000),
  duration_h    integer check (duration_h in (1, 2, 6, 12, 24, 72, 168)),
  stake_out     integer not null default 0 check (stake_out between 0 and 500),
  route_run_id  uuid references public.runs(id) on delete set null,
  starts_at     timestamptz,
  ends_at       timestamptz,
  winner_id     uuid references public.profiles(id),
  challenger_result integer,                      -- steps, seconds or laps by mode
  opponent_result   integer,
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  finished_at   timestamptz,
  check (challenger_id <> opponent_id)
);
create index battles_challenger_idx on public.battles(challenger_id, status);
create index battles_opponent_idx on public.battles(opponent_id, status);
create index battles_live_idx on public.battles(status, ends_at) where status in ('accepted', 'live');

alter table public.runs add constraint runs_battle_fk
  foreign key (battle_id) references public.battles(id) on delete set null;

-- Blind time trial results stay sealed until both have finished.
create table public.battle_entries (
  battle_id     uuid not null references public.battles(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  run_id        uuid references public.runs(id) on delete set null,
  result        integer not null,
  finished_at   timestamptz not null default now(),
  primary key (battle_id, user_id)
);

-- Blocks stop battles, messages and rival cards both ways.
create table public.blocks (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  blocked_id    uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, blocked_id)
);

create or replace function public.is_blocked(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks
                 where (user_id = a and blocked_id = b) or (user_id = b and blocked_id = a))
$$;

-- People you swiped Pass on, or took out of your character select.
create table public.rival_passes (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  rival_id      uuid not null references public.profiles(id) on delete cascade,
  hidden        boolean not null default false,   -- removed from roster for good
  created_at    timestamptz not null default now(),
  primary key (user_id, rival_id)
);

-- Weekly battle limits by tier: free 1 a week and 1 active, pro 5 active,
-- black 10 active.
create or replace function public.create_battle(
  p_opponent uuid, p_mode public.battle_mode default 'most_steps',
  p_duration_h integer default 24, p_distance_m integer default null,
  p_stake_out integer default 0, p_route_run uuid default null)
returns public.battles language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_tier tier;
  active_count int;
  week_count int;
  b battles;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if p_opponent = me then raise exception 'NOT_ALLOWED'; end if;
  if public.is_blocked(me, p_opponent) then raise exception 'NOT_ALLOWED'; end if;
  select tier into my_tier from profiles where id = me;

  select count(*) into active_count from battles
  where me in (challenger_id, opponent_id) and status in ('pending', 'accepted', 'live');
  if active_count >= (case my_tier when 'free' then 1 when 'pro' then 5 else 10 end) then
    raise exception 'TIER_REQUIRED' using hint = 'active_battles';
  end if;
  if my_tier = 'free' then
    select count(*) into week_count from battles
    where challenger_id = me and created_at > date_trunc('week', now());
    if week_count >= 1 then raise exception 'TIER_REQUIRED' using hint = 'battles_per_week'; end if;
  end if;
  if p_stake_out > 0 and public.out_available(me) < p_stake_out then
    raise exception 'NOT_ENOUGH_OUT';
  end if;
  if p_mode in ('live_race', 'blind_time_trial', 'ghost_race') and p_distance_m is null then
    raise exception 'DISTANCE_REQUIRED';
  end if;

  insert into battles (mode, challenger_id, opponent_id, duration_h, distance_m, stake_out, route_run_id)
  values (p_mode, me, p_opponent,
          case when p_mode in ('most_steps', 'last_one_standing', 'hold_the_route') then coalesce(p_duration_h, 24) end,
          p_distance_m, p_stake_out, p_route_run)
  returning * into b;

  if p_stake_out > 0 then
    perform public.award(me, 'stake:' || b.id || ':' || me, 'Battle stake held', 'battle_stake',
                         0, -p_stake_out, 'battle', b.id::text);
  end if;
  perform public.notify(p_opponent, 'battle', 'New challenge',
    (select display_name from profiles where id = me) || ' wants a battle.', '/battles/' || b.id);
  return b;
end $$;

-- Accept or decline. Accepting starts the clock for window modes; for blind
-- time trials both have 12 hours to start and 24 to finish.
create or replace function public.respond_battle(p_battle uuid, p_accept boolean)
returns public.battles language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  b battles;
begin
  select * into b from battles where id = p_battle for update;
  if b.id is null or b.opponent_id <> me then raise exception 'NOT_ALLOWED'; end if;
  if b.status <> 'pending' then raise exception 'ALREADY_ANSWERED'; end if;

  if not p_accept then
    update battles set status = 'declined', responded_at = now() where id = p_battle returning * into b;
    if b.stake_out > 0 then
      perform public.award(b.challenger_id, 'stake-back:' || b.id, 'Stake returned', 'battle_stake',
                           0, b.stake_out, 'battle', b.id::text);
    end if;
    return b;
  end if;

  if b.stake_out > 0 then
    if public.out_available(me) < b.stake_out then raise exception 'NOT_ENOUGH_OUT'; end if;
    perform public.award(me, 'stake:' || b.id || ':' || me, 'Battle stake held', 'battle_stake',
                         0, -b.stake_out, 'battle', b.id::text);
  end if;

  update battles set
    status = case when mode in ('most_steps', 'last_one_standing', 'hold_the_route') then 'live' else 'accepted' end::battle_status,
    responded_at = now(),
    starts_at = now(),
    ends_at = now() + case
      when duration_h is not null then make_interval(hours => duration_h)
      when mode = 'blind_time_trial' then interval '24 hours'
      else interval '24 hours' end
  where id = p_battle returning * into b;
  perform public.notify(b.challenger_id, 'battle', 'Challenge accepted',
    (select display_name from profiles where id = me) || ' is in. Go.', '/battles/' || b.id);
  return b;
end $$;

create or replace function public.cancel_battle(p_battle uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b battles;
begin
  select * into b from battles where id = p_battle for update;
  if b.challenger_id <> auth.uid() or b.status <> 'pending' then raise exception 'NOT_ALLOWED'; end if;
  update battles set status = 'cancelled' where id = p_battle;
  if b.stake_out > 0 then
    perform public.award(b.challenger_id, 'stake-back:' || b.id, 'Stake returned', 'battle_stake',
                         0, b.stake_out, 'battle', b.id::text);
  end if;
end $$;

-- Submit a timed result (races, time trials, ghost races, laps).
create or replace function public.submit_battle_result(p_battle uuid, p_run uuid, p_result integer)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  b battles;
begin
  select * into b from battles where id = p_battle;
  if b.id is null or me not in (b.challenger_id, b.opponent_id) then raise exception 'NOT_ALLOWED'; end if;
  if b.status not in ('accepted', 'live') or now() > b.ends_at then raise exception 'BATTLE_CLOSED'; end if;
  if not exists (select 1 from runs where id = p_run and user_id = me and started_at >= b.starts_at) then
    raise exception 'RUN_INVALID';
  end if;
  insert into battle_entries (battle_id, user_id, run_id, result) values (p_battle, me, p_run, p_result)
  on conflict (battle_id, user_id) do nothing;
  update runs set battle_id = p_battle where id = p_run;
  if (select count(*) from battle_entries where battle_id = p_battle) = 2 then
    perform public.settle_battle(p_battle);
  end if;
end $$;

-- Settle one battle and pay out. Lower is better for times, higher for steps
-- and laps. Stakes go to the winner; a draw returns them.
create or replace function public.settle_battle(p_battle uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  b battles;
  c_res int;
  o_res int;
  lower_wins boolean;
  winner uuid;
  loser uuid;
begin
  select * into b from battles where id = p_battle for update;
  if b.status not in ('accepted', 'live') then return; end if;
  lower_wins := b.mode in ('live_race', 'blind_time_trial', 'ghost_race');

  if b.mode = 'most_steps' or b.mode = 'last_one_standing' then
    select coalesce(sum(counted), 0) into c_res from daily_steps
      where user_id = b.challenger_id and day between (b.starts_at at time zone 'Europe/London')::date
                                                  and (b.ends_at at time zone 'Europe/London')::date;
    select coalesce(sum(counted), 0) into o_res from daily_steps
      where user_id = b.opponent_id and day between (b.starts_at at time zone 'Europe/London')::date
                                                and (b.ends_at at time zone 'Europe/London')::date;
  else
    select result into c_res from battle_entries where battle_id = p_battle and user_id = b.challenger_id;
    select result into o_res from battle_entries where battle_id = p_battle and user_id = b.opponent_id;
  end if;

  -- A no-show forfeits.
  if c_res is null and o_res is null then
    winner := null;
  elsif c_res is null then winner := b.opponent_id;
  elsif o_res is null then winner := b.challenger_id;
  elsif c_res = o_res then winner := null;
  elsif (c_res < o_res) = lower_wins then winner := b.challenger_id;
  else winner := b.opponent_id;
  end if;
  loser := case when winner = b.challenger_id then b.opponent_id when winner = b.opponent_id then b.challenger_id end;

  update battles set status = case when c_res is null or o_res is null then 'forfeit' else 'finished' end::battle_status,
    winner_id = winner, challenger_result = c_res, opponent_result = o_res, finished_at = now()
  where id = p_battle;

  if winner is not null then
    perform public.award(winner, 'battle-win:' || b.id, 'Battle won', 'battle_win', 150, 15 + b.stake_out * 2, 'battle', b.id::text);
    perform public.award(loser, 'battle-played:' || b.id, 'Battle played', 'battle', 25, 0, 'battle', b.id::text);
    perform public.notify(winner, 'battle', 'You won', 'The win and the stake are yours.', '/battles/' || b.id);
    perform public.notify(loser, 'battle', 'So close', 'Run it back?', '/battles/' || b.id);
  else
    perform public.award(b.challenger_id, 'battle-played:' || b.id, 'Battle drawn', 'battle', 25, b.stake_out, 'battle', b.id::text);
    perform public.award(b.opponent_id, 'battle-played:' || b.id, 'Battle drawn', 'battle', 25, b.stake_out, 'battle', b.id::text);
  end if;
end $$;
revoke execute on function public.settle_battle from public, anon, authenticated;

-- Run on a schedule (pg_cron, every 5 minutes): expire unanswered challenges
-- after 48h and settle anything whose window has closed.
create or replace function public.settle_due_battles()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  n int := 0;
begin
  for r in select id, challenger_id, stake_out from battles
           where status = 'pending' and created_at < now() - interval '48 hours' loop
    update battles set status = 'expired' where id = r.id;
    if r.stake_out > 0 then
      perform public.award(r.challenger_id, 'stake-back:' || r.id, 'Stake returned', 'battle_stake', 0, r.stake_out, 'battle', r.id::text);
    end if;
  end loop;
  for r in select id from battles where status in ('accepted', 'live') and ends_at <= now() loop
    perform public.settle_battle(r.id);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.settle_due_battles from public, anon, authenticated;

-- What each side may see. Sealed results stay hidden until both are in.
create or replace view public.battle_board with (security_invoker = true) as
select b.*,
       case when b.mode <> 'blind_time_trial' or b.status in ('finished', 'forfeit')
                 or (select count(*) from public.battle_entries e where e.battle_id = b.id) = 2
            then true else false end as results_open
from public.battles b;

-- ── Rival deck ───────────────────────────────────────────────────────────────

-- Swipe to battle: people near your level in your city, minus blocks, passes
-- and anyone you are already battling. Under 18s only see under 18s.
create or replace function public.rival_deck(p_limit integer default 20)
returns setof public.profiles language sql stable security definer set search_path = public as $$
  select p.* from profiles p
  where p.id <> auth.uid()
    and p.city_id = (select city_id from profiles where id = auth.uid())
    and not public.is_blocked(auth.uid(), p.id)
    and public.is_minor(p.id) = public.is_minor(auth.uid())
    and not exists (select 1 from rival_passes rp where rp.user_id = auth.uid() and rp.rival_id = p.id)
    and not exists (select 1 from battles b
                    where b.status in ('pending', 'accepted', 'live')
                      and ((b.challenger_id = auth.uid() and b.opponent_id = p.id)
                        or (b.opponent_id = auth.uid() and b.challenger_id = p.id)))
  order by abs(p.level - (select level from profiles where id = auth.uid())), random()
  limit p_limit
$$;

-- ── Challenges ───────────────────────────────────────────────────────────────

create table public.challenges (
  id            text primary key,                -- 'week-50k'
  title         text not null,
  description   text not null,
  metric        text not null check (metric in ('steps', 'distance_m', 'active_days', 'runs', 'club_runs')),
  target        integer not null check (target > 0),
  period        text not null check (period in ('day', 'week', 'month', 'season')),
  reward_xp     integer not null default 0,
  reward_out    integer not null default 0,
  tier_required public.tier not null default 'free',
  art_path      text,
  active        boolean not null default true,
  sort          integer not null default 0
);

create table public.challenge_progress (
  challenge_id  text not null references public.challenges(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  period_start  date not null,
  joined_at     timestamptz not null default now(),
  claimed_at    timestamptz,
  primary key (challenge_id, user_id, period_start)
);

create or replace function public.period_start(p text)
returns date language sql stable as $$
  select case p
    when 'day' then public.london_today()
    when 'week' then date_trunc('week', public.london_today())::date
    when 'month' then date_trunc('month', public.london_today())::date
    else date_trunc('quarter', public.london_today())::date end
$$;

create or replace function public.challenge_value(p_user uuid, c public.challenges)
returns integer language sql stable security definer set search_path = public as $$
  select case c.metric
    when 'steps' then (select coalesce(sum(steps), 0) from daily_steps
                       where user_id = p_user and day >= public.period_start(c.period))
    when 'distance_m' then (select coalesce(sum(distance_m), 0) from daily_steps
                       where user_id = p_user and day >= public.period_start(c.period))
    when 'active_days' then (select count(*) from daily_steps
                       where user_id = p_user and day >= public.period_start(c.period) and steps >= 3000)
    when 'runs' then (select count(*) from runs
                       where user_id = p_user and started_at >= public.period_start(c.period))
    when 'club_runs' then (select count(*) from event_rsvps r join events e on e.id = r.event_id
                       where r.user_id = p_user and r.status = 'checked_in' and e.kind = 'club_run'
                         and e.starts_at >= public.period_start(c.period))
  end::int
$$;

create or replace function public.join_challenge(p_challenge text)
returns void language plpgsql security definer set search_path = public as $$
declare c challenges;
begin
  select * into c from challenges where id = p_challenge and active;
  if c.id is null then raise exception 'NOT_FOUND'; end if;
  if (select tier from profiles where id = auth.uid()) < c.tier_required then raise exception 'TIER_REQUIRED'; end if;
  insert into challenge_progress (challenge_id, user_id, period_start)
  values (c.id, auth.uid(), public.period_start(c.period)) on conflict do nothing;
end $$;

create or replace function public.claim_challenge(p_challenge text)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  c challenges;
  ps date;
begin
  select * into c from challenges where id = p_challenge;
  ps := public.period_start(c.period);
  if not exists (select 1 from challenge_progress where challenge_id = c.id and user_id = me
                 and period_start = ps and claimed_at is null) then
    raise exception 'NOT_JOINED';
  end if;
  if public.challenge_value(me, c) < c.target then raise exception 'NOT_DONE'; end if;
  update challenge_progress set claimed_at = now()
  where challenge_id = c.id and user_id = me and period_start = ps;
  perform public.award(me, format('challenge:%s:%s:%s', c.id, me, ps), c.title, 'challenge',
                       c.reward_xp, c.reward_out, 'challenge', c.id);
end $$;

-- ── Leagues: City League and club v club ─────────────────────────────────────

-- Six week seasons. Each Friday a draw picks equal random squads from each
-- side's eligible walkers (active 3+ days in the last week, verified). The
-- seed is stored so anyone can check the draw. Divisions use squads of 100,
-- 250 or 500 for cities; clubs are grouped by size.
create type public.league_kind as enum ('city', 'club');

create table public.seasons (
  id            uuid primary key default gen_random_uuid(),
  kind          public.league_kind not null,
  number        integer not null,
  name          text not null,                   -- 'Season 1'
  starts_on     date not null,
  ends_on       date not null,
  unique (kind, number),
  check (ends_on > starts_on)
);

create table public.divisions (
  id            uuid primary key default gen_random_uuid(),
  season_id     uuid not null references public.seasons(id) on delete cascade,
  name          text not null,                   -- 'Club Premier', 'Division 1'
  squad_size    integer not null check (squad_size > 0),
  sort          integer not null default 0
);

create table public.league_entries (
  id            uuid primary key default gen_random_uuid(),
  division_id   uuid not null references public.divisions(id) on delete cascade,
  city_id       text references public.cities(id),
  club_id       uuid references public.clubs(id) on delete cascade,
  points        integer not null default 0,
  played        integer not null default 0,
  won           integer not null default 0,
  drawn         integer not null default 0,
  lost          integer not null default 0,
  check ((city_id is null) <> (club_id is null))
);
create index league_entries_div_idx on public.league_entries(division_id);

create table public.fixtures (
  id            uuid primary key default gen_random_uuid(),
  division_id   uuid not null references public.divisions(id) on delete cascade,
  week          integer not null check (week between 1 and 6),
  home_id       uuid not null references public.league_entries(id) on delete cascade,
  away_id       uuid not null references public.league_entries(id) on delete cascade,
  is_derby      boolean not null default false,  -- derbies count double
  starts_on     date not null,
  ends_on       date not null,
  draw_seed     text,
  drawn_at      timestamptz,
  home_score    numeric,
  away_score    numeric,
  revealed_at   timestamptz,                     -- national reveal after a grace period
  check (home_id <> away_id)
);
create index fixtures_div_week_idx on public.fixtures(division_id, week);

-- Who was called up for a fixture.
create table public.squad_members (
  fixture_id    uuid not null references public.fixtures(id) on delete cascade,
  entry_id      uuid not null references public.league_entries(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  primary key (fixture_id, user_id)
);
create index squad_members_user_idx on public.squad_members(user_id);

-- Eligible walkers for a side: active (3,000+ steps) on 3+ of the last 7 days
-- and verified or established.
create or replace function public.eligible_walkers(p_city text, p_club uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  select p.id from profiles p
  where p.trust in ('verified', 'established')
    and ((p_city is not null and p.city_id = p_city)
      or (p_club is not null and exists (select 1 from club_members m where m.club_id = p_club and m.user_id = p.id)))
    and (select count(*) from daily_steps d
         where d.user_id = p.id and d.day >= public.london_today() - 7 and d.steps >= 3000) >= 3
$$;

-- The Friday draw. Equal squads: the smaller of the division's squad size and
-- the smaller side's eligible pool. Uses a stored seed so it can be replayed.
create or replace function public.draw_fixture(p_fixture uuid, p_seed text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  f fixtures;
  h league_entries;
  a league_entries;
  size_ int;
  seed text := coalesce(p_seed, encode(gen_random_bytes(8), 'hex'));
begin
  select * into f from fixtures where id = p_fixture for update;
  select * into h from league_entries where id = f.home_id;
  select * into a from league_entries where id = f.away_id;
  select least(d.squad_size,
               (select count(*) from public.eligible_walkers(h.city_id, h.club_id)),
               (select count(*) from public.eligible_walkers(a.city_id, a.club_id)))
    into size_ from divisions d where d.id = f.division_id;

  delete from squad_members where fixture_id = p_fixture;
  insert into squad_members (fixture_id, entry_id, user_id)
  select p_fixture, h.id, w from public.eligible_walkers(h.city_id, h.club_id) w
  order by md5(seed || w::text) limit size_;
  insert into squad_members (fixture_id, entry_id, user_id)
  select p_fixture, a.id, w from public.eligible_walkers(a.city_id, a.club_id) w
  where w not in (select user_id from squad_members where fixture_id = p_fixture)
  order by md5(seed || w::text) limit size_;

  update fixtures set draw_seed = seed, drawn_at = now() where id = p_fixture;
  insert into notifications (user_id, kind, title, body, link)
  select user_id, 'league', 'You''ve been called up', 'Your steps count for your side this week.',
         '/league/fixture/' || p_fixture
  from squad_members where fixture_id = p_fixture;
  return size_;
end $$;
revoke execute on function public.draw_fixture from public, anon, authenticated;

-- Squad score = average counted steps x turnout bonus. Club run turnout is
-- worth up to +20% for clubs, +10% for cities.
create or replace function public.fixture_side_score(p_fixture uuid, p_entry uuid)
returns numeric language sql stable security definer set search_path = public as $$
  with f as (select * from fixtures where id = p_fixture),
  squad as (select user_id from squad_members where fixture_id = p_fixture and entry_id = p_entry),
  steps as (
    select s.user_id, coalesce(sum(d.counted), 0) as counted
    from squad s
    left join daily_steps d on d.user_id = s.user_id
      and d.day between (select starts_on from f) and (select ends_on from f) and not d.flagged
    group by s.user_id),
  turnout as (
    select count(distinct s.user_id)::numeric / nullif((select count(*) from squad), 0) as rate
    from squad s
    join event_rsvps r on r.user_id = s.user_id and r.status = 'checked_in'
    join events e on e.id = r.event_id and e.kind = 'club_run'
      and (e.starts_at at time zone 'Europe/London')::date between (select starts_on from f) and (select ends_on from f))
  select round(coalesce(avg(steps.counted), 0)
    * (1 + coalesce((select rate from turnout), 0)
         / case when (select club_id from league_entries where id = p_entry) is not null then 5 else 10 end), 1)
  from steps
$$;

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table public.battles enable row level security;
alter table public.battle_entries enable row level security;
alter table public.blocks enable row level security;
alter table public.rival_passes enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_progress enable row level security;
alter table public.seasons enable row level security;
alter table public.divisions enable row level security;
alter table public.league_entries enable row level security;
alter table public.fixtures enable row level security;
alter table public.squad_members enable row level security;

create policy "battles involve me" on public.battles for select using (
  auth.uid() in (challenger_id, opponent_id) or public.is_staff());

-- Your own entry always; the other side's once results are open.
create policy "battle entries" on public.battle_entries for select using (
  user_id = auth.uid()
  or exists (select 1 from public.battles b where b.id = battle_id
             and auth.uid() in (b.challenger_id, b.opponent_id)
             and (b.mode <> 'blind_time_trial'
                  or b.status in ('finished', 'forfeit')
                  or (select count(*) from public.battle_entries e2 where e2.battle_id = b.id) = 2)));

create policy "my blocks" on public.blocks for select using (user_id = auth.uid());
create policy "block people" on public.blocks for insert with check (user_id = auth.uid());
create policy "unblock people" on public.blocks for delete using (user_id = auth.uid());

create policy "my passes" on public.rival_passes for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "challenges are public" on public.challenges for select using (true);
create policy "staff edit challenges" on public.challenges for all using (public.is_staff('admin')) with check (public.is_staff('admin'));
create policy "my challenge progress" on public.challenge_progress for select using (user_id = auth.uid());

create policy "seasons are public" on public.seasons for select using (true);
create policy "divisions are public" on public.divisions for select using (true);
create policy "tables are public" on public.league_entries for select using (true);
create policy "fixtures are public" on public.fixtures for select using (true);
create policy "squads visible to members" on public.squad_members for select to authenticated using (true);

revoke execute on function public.eligible_walkers from public, anon, authenticated;
