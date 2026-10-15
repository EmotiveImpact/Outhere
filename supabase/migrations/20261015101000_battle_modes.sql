-- Outhere schema, part 11: the six battle modes in full.
--
-- - Live race: both press ready, then the start lands on both phones ten
--   seconds later and the race stays open for two hours.
-- - Timed modes (live race, blind time trial, ghost race): your time comes
--   from the run itself, worked out here, never sent by the phone.
-- - Hold the route: the fastest time on one saved route wins. Run it as often
--   as you like in the window; a run covering 95% of the route is a go.
-- - Last one standing: the daily target starts at 8,000 steps and goes up
--   1,000 each day; the battle ends the morning after someone misses.
-- - Fixes the sealed entries policy, which read its own table through RLS and
--   recursed.

alter table public.battles
  add column challenger_ready_at timestamptz,
  add column opponent_ready_at   timestamptz;

-- How many results are in, without going through the entries policy.
create or replace function public.battle_entry_count(p_battle uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from battle_entries where battle_id = p_battle
$$;
revoke execute on function public.battle_entry_count(uuid) from public, anon;
grant execute on function public.battle_entry_count(uuid) to authenticated;

drop policy "battle entries" on public.battle_entries;
create policy "battle entries" on public.battle_entries for select using (
  user_id = auth.uid()
  or exists (select 1 from public.battles b where b.id = battle_id
             and auth.uid() in (b.challenger_id, b.opponent_id)
             and (b.mode <> 'blind_time_trial'
                  or b.status in ('finished', 'forfeit')
                  or public.battle_entry_count(b.id) = 2)));

drop view public.battle_board;
create view public.battle_board with (security_invoker = true) as
select b.*,
       (b.mode <> 'blind_time_trial' or b.status in ('finished', 'forfeit')
        or public.battle_entry_count(b.id) = 2) as results_open
from public.battles b;

-- Days in a row at the rising target (8,000, then 1,000 more each day), from
-- p_from to p_to (London days).
create or replace function public.standing_days(p_user uuid, p_from date, p_to date)
returns integer language plpgsql stable security definer set search_path = public as $$
declare
  d date := p_from;
  n int := 0;
  got int;
begin
  while d <= p_to loop
    select steps into got from daily_steps where user_id = p_user and day = d and not flagged;
    if coalesce(got, 0) < 8000 + 1000 * n then return n; end if;
    n := n + 1;
    d := d + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.standing_days(uuid, date, date) from public, anon, authenticated;

create or replace function public.ready_battle(p_battle uuid)
returns public.battles language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  b battles;
  other uuid;
begin
  select * into b from battles where id = p_battle for update;
  if b.id is null or me not in (b.challenger_id, b.opponent_id) then raise exception 'NOT_ALLOWED'; end if;
  if b.mode <> 'live_race' or b.status <> 'accepted' then raise exception 'NOT_ALLOWED'; end if;
  other := case when me = b.challenger_id then b.opponent_id else b.challenger_id end;

  if me = b.challenger_id then
    update battles set challenger_ready_at = coalesce(challenger_ready_at, now()) where id = p_battle returning * into b;
  else
    update battles set opponent_ready_at = coalesce(opponent_ready_at, now()) where id = p_battle returning * into b;
  end if;

  if b.challenger_ready_at is not null and b.opponent_ready_at is not null then
    update battles set status = 'live',
      starts_at = now() + interval '10 seconds',
      ends_at = now() + interval '10 seconds' + interval '2 hours'
    where id = p_battle returning * into b;
    perform public.notify(other, 'battle', 'Race on', 'You''re both ready. Go in 10.', '/battles/' || b.id);
  else
    perform public.notify(other, 'battle', 'Ready when you are',
      (select display_name from profiles where id = me) || ' is on the start line.', '/battles/' || b.id);
  end if;
  return b;
end $$;

-- A finished run counts for a battle. The phone says which run; the time
-- comes from the run row. Returns the time now stored for you (your best, for
-- hold the route).
drop function public.submit_battle_result(uuid, uuid, integer);
create or replace function public.submit_battle_result(p_battle uuid, p_run uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  b battles;
  r runs;
  route_m int;
  res int;
begin
  select * into b from battles where id = p_battle for update;
  if b.id is null or me not in (b.challenger_id, b.opponent_id) then raise exception 'NOT_ALLOWED'; end if;
  if b.mode in ('most_steps', 'last_one_standing') then raise exception 'NOT_ALLOWED'; end if;
  if b.status <> 'live' and not (b.status = 'accepted' and b.mode in ('blind_time_trial', 'ghost_race'))
     or now() > b.ends_at then
    raise exception 'BATTLE_CLOSED';
  end if;
  select * into r from runs where id = p_run and user_id = me;
  if r.id is null or r.started_at < b.starts_at - interval '30 seconds' or r.started_at > b.ends_at
     or (r.battle_id is not null and r.battle_id <> p_battle) then
    raise exception 'RUN_INVALID';
  end if;

  if b.mode = 'hold_the_route' then
    select distance_m into route_m from runs where id = b.route_run_id;
    route_m := coalesce(route_m, 2000);
    if r.distance_m < route_m * 0.95 or r.battle_id = p_battle then raise exception 'RUN_INVALID'; end if;
    res := round(r.moving_s::numeric * route_m / greatest(r.distance_m, 1));
    insert into battle_entries (battle_id, user_id, run_id, result) values (p_battle, me, p_run, res)
    on conflict (battle_id, user_id) do update
      set result = least(battle_entries.result, excluded.result),
          run_id = case when excluded.result < battle_entries.result then excluded.run_id else battle_entries.run_id end,
          finished_at = now()
    returning result into res;
    update runs set battle_id = p_battle where id = p_run;
    return res;
  end if;

  -- Timed modes: the first run of at least the distance, pro rata.
  if r.distance_m < b.distance_m then raise exception 'RUN_TOO_SHORT'; end if;
  res := round(r.moving_s::numeric * b.distance_m / greatest(r.distance_m, 1));
  insert into battle_entries (battle_id, user_id, run_id, result) values (p_battle, me, p_run, res)
  on conflict (battle_id, user_id) do nothing;
  if not found then raise exception 'ALREADY_IN'; end if;
  update runs set battle_id = p_battle where id = p_run;
  if public.battle_entry_count(p_battle) = 2 then
    perform public.settle_battle(p_battle);
  end if;
  return res;
end $$;

-- Settle one battle and pay out. Lower is better for times; higher for steps
-- and days. Stakes go to the winner; a draw returns them.
create or replace function public.settle_battle(p_battle uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  b battles;
  c_res int;
  o_res int;
  lower_wins boolean;
  winner uuid;
  loser uuid;
  first_day date;
  last_day date;
begin
  select * into b from battles where id = p_battle for update;
  if b.status not in ('accepted', 'live') then return; end if;
  lower_wins := b.mode in ('live_race', 'blind_time_trial', 'ghost_race', 'hold_the_route');
  first_day := (b.starts_at at time zone 'Europe/London')::date;
  last_day := (b.ends_at at time zone 'Europe/London')::date;

  if b.mode = 'most_steps' then
    select coalesce(sum(counted), 0) into c_res from daily_steps
      where user_id = b.challenger_id and day between first_day and last_day and not flagged;
    select coalesce(sum(counted), 0) into o_res from daily_steps
      where user_id = b.opponent_id and day between first_day and last_day and not flagged;
  elsif b.mode = 'last_one_standing' then
    c_res := public.standing_days(b.challenger_id, first_day, least(last_day, public.london_today() - 1));
    o_res := public.standing_days(b.opponent_id, first_day, least(last_day, public.london_today() - 1));
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
revoke execute on function public.settle_battle(uuid) from public, anon, authenticated;

-- Every 5 minutes: expire unanswered challenges after 48h, end last one
-- standing as soon as someone has missed a day, and settle anything whose
-- window has closed.
create or replace function public.settle_due_battles()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  n int := 0;
  yesterday date := public.london_today() - 1;
  first_day date;
begin
  for r in select id, challenger_id, stake_out from battles
           where status = 'pending' and created_at < now() - interval '48 hours' loop
    update battles set status = 'expired' where id = r.id;
    if r.stake_out > 0 then
      perform public.award(r.challenger_id, 'stake-back:' || r.id, 'Stake returned', 'battle_stake', 0, r.stake_out, 'battle', r.id::text);
    end if;
  end loop;
  for r in select id, challenger_id, opponent_id, starts_at from battles
           where status = 'live' and mode = 'last_one_standing' and ends_at > now() loop
    first_day := (r.starts_at at time zone 'Europe/London')::date;
    if yesterday >= first_day and (
         public.standing_days(r.challenger_id, first_day, yesterday) < yesterday - first_day + 1
      or public.standing_days(r.opponent_id, first_day, yesterday) < yesterday - first_day + 1) then
      perform public.settle_battle(r.id);
      n := n + 1;
    end if;
  end loop;
  for r in select id from battles where status in ('accepted', 'live') and ends_at <= now() loop
    perform public.settle_battle(r.id);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.settle_due_battles() from public, anon, authenticated;
