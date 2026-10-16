-- Outhere schema, part 11: run clubs claimed from the app, founding clubs
-- going official, league fixtures settling, and club v club friendlies.
--
-- Club scores follow the City League: squad average counted steps, lifted by
-- club run turnout (up to +20% for clubs), so a small club that shows up can
-- beat a big one.

-- ── Clubs: what Find your run club shows ─────────────────────────────────────

alter table public.clubs
  add column if not exists founded_year integer check (founded_year between 1850 and 2100),
  add column if not exists strava       text,
  add column if not exists paces        text check (char_length(paces) <= 40),        -- 'All paces'
  add column if not exists distances    text check (char_length(distances) <= 40),    -- '5k or 8k'
  add column if not exists beginners    boolean not null default false;

grant update (founded_year, strava, paces, distances, beginners) on public.clubs to authenticated;

-- ── Claim your club, from the app ────────────────────────────────────────────

-- The website form (claim_club) stays as it is. A signed in organiser can also
-- claim from the app: name, meet spot and times, then proof the club's
-- Instagram or Strava page is theirs (a code in the bio) or a short video call.
alter table public.club_claims
  alter column borough_id drop not null,
  alter column size drop not null,
  alter column role drop not null,
  alter column email drop not null,
  add column if not exists user_id       uuid references public.profiles(id) on delete cascade,
  add column if not exists club_id       uuid references public.clubs(id) on delete set null,
  add column if not exists meeting_place text check (char_length(meeting_place) <= 80),
  add column if not exists usual_times   text check (char_length(usual_times) <= 60),
  add column if not exists founded_year  integer check (founded_year between 1850 and 2100),
  add column if not exists proof_method  text check (proof_method in ('instagram', 'strava', 'call')),
  add column if not exists proof_handle  text check (char_length(proof_handle) <= 60),
  add column if not exists proof_code    text,
  add column if not exists call_at       timestamptz,
  add column if not exists reviewed_by   uuid references public.profiles(id),
  add column if not exists reviewed_at   timestamptz;
alter table public.club_claims add constraint club_claims_who
  check (user_id is not null or (email is not null and borough_id is not null));
create unique index if not exists club_claims_user_name_idx
  on public.club_claims(user_id, lower(club_name)) where user_id is not null and status = 'pending';

grant select on public.club_claims to authenticated;
create policy "my club claims" on public.club_claims for select to authenticated
  using (user_id = auth.uid() or public.is_staff('moderator'));

create or replace function public.claim_my_club(
  p_name text, p_meeting_place text, p_usual_times text,
  p_founded integer default null, p_proof_method text default 'instagram',
  p_proof_handle text default null, p_call_at timestamptz default null,
  p_club uuid default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  c club_claims;
  code text := lpad((floor(random() * 1000000))::int::text, 6, '0');
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 3 then raise exception 'BAD_NAME'; end if;
  if p_proof_method not in ('instagram', 'strava', 'call') then raise exception 'BAD_PROOF'; end if;
  if p_proof_method <> 'call' and char_length(trim(coalesce(p_proof_handle, ''))) < 2 then raise exception 'PROOF_REQUIRED'; end if;
  if p_proof_method = 'call' and (p_call_at is null or p_call_at < now()) then raise exception 'PROOF_REQUIRED'; end if;
  if p_club is not null and public.club_role_of(p_club, me) is distinct from 'captain' then raise exception 'NOT_ALLOWED'; end if;
  if (select count(*) from club_claims where user_id = me and status = 'pending') >= 3 then raise exception 'CLAIM_LIMIT'; end if;
  if exists (select 1 from club_claims where user_id = me and status = 'pending' and lower(club_name) = lower(trim(p_name))) then
    raise exception 'ALREADY_CLAIMED';
  end if;
  insert into club_claims (club_name, user_id, club_id, meeting_place, usual_times, founded_year,
                           proof_method, proof_handle, proof_code, call_at, role, borough_id)
  values (left(trim(p_name), 40), me, p_club, nullif(trim(p_meeting_place), ''), nullif(trim(p_usual_times), ''),
          p_founded, p_proof_method, nullif(ltrim(trim(p_proof_handle), '@'), ''),
          case when p_proof_method = 'call' then null else code end, p_call_at, 'Organiser',
          (select borough_id from profiles where id = me))
  returning * into c;
  return json_build_object('id', c.id, 'code', c.proof_code, 'status', c.status);
end $$;

-- A person at Outhere checks every claim. Approving makes (or upgrades) the
-- club, makes the claimant its captain and gives organisers a year of Pro.
create or replace function public.review_club_claim(p_claim bigint, p_approve boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  c club_claims;
  cid uuid;
  p profiles;
  base text;
begin
  if not public.is_staff('moderator') then raise exception 'NOT_ALLOWED'; end if;
  select * into c from club_claims where id = p_claim for update;
  if c.id is null or c.status <> 'pending' then raise exception 'NOT_FOUND'; end if;
  if not p_approve then
    update club_claims set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now() where id = p_claim;
    if c.user_id is not null then
      perform public.notify(c.user_id, 'club', 'We couldn''t verify ' || c.club_name,
        'Reply to clubs@weouthere.app and we''ll take another look.', '/clubs/claim');
    end if;
    return null;
  end if;
  if c.user_id is null then raise exception 'NO_CLAIMANT'; end if;
  select * into p from profiles where id = c.user_id;
  cid := c.club_id;
  if cid is null then
    base := trim(both '-' from regexp_replace(lower(c.club_name), '[^a-z0-9]+', '-', 'g'));
    base := left(case when char_length(base) < 3 then base || '-club' else base end, 34);
    insert into clubs (name, slug, city_id, borough_id, meeting_place, usual_times, founded_year,
                       instagram, strava, created_by, status, verified_at)
    values (c.club_name,
            case when exists (select 1 from clubs where slug = base) then base || '-' || substr(md5(random()::text), 1, 4) else base end,
            coalesce(p.city_id, 'london'), p.borough_id, c.meeting_place, c.usual_times, c.founded_year,
            case when c.proof_method = 'instagram' then c.proof_handle end,
            case when c.proof_method = 'strava' then c.proof_handle end,
            c.user_id, 'verified', now())
    returning id into cid;
  else
    update clubs set status = 'verified', verified_at = coalesce(verified_at, now()),
      meeting_place = coalesce(c.meeting_place, meeting_place), usual_times = coalesce(c.usual_times, usual_times),
      founded_year = coalesce(c.founded_year, founded_year)
    where id = cid;
  end if;
  insert into club_members (club_id, user_id, role) values (cid, c.user_id, 'captain')
  on conflict (club_id, user_id) do update set role = 'captain';
  update profiles set home_club_id = coalesce(home_club_id, cid) where id = c.user_id;
  insert into subscriptions (user_id, tier, source, status, provider_ref, referral_club_id, current_period_end)
  values (c.user_id, 'pro', 'web', 'active', 'organiser:' || cid || ':' || c.user_id, cid, now() + interval '1 year')
  on conflict (provider_ref) do nothing;
  update club_claims set status = 'verified', club_id = cid, reviewed_by = auth.uid(), reviewed_at = now() where id = p_claim;
  perform public.notify(c.user_id, 'club', c.club_name || ' is official',
    'Your crew is live, your runs can take check-ins, and you have a year of Pro on us.', '/clubs/verified/' || cid);
  return cid;
end $$;

-- A founding club goes official after 3 meetups of 6 or more in 6 weeks, with
-- 10 different verified runners. Runs nightly.
create or replace function public.promote_founding_clubs()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select c.id, c.name from clubs c
    join club_founding_progress p on p.club_id = c.id
    where c.status = 'founding' and p.qualifying_meetups >= p.meetups_needed and p.verified_people >= p.people_needed
  loop
    update clubs set status = 'verified', verified_at = now() where id = r.id;
    insert into notifications (user_id, kind, title, body, link)
    select m.user_id, 'club', r.name || ' is official', 'Three meetups, ten runners. You did it.', '/clubs/verified/' || r.id
    from club_members m where m.club_id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.promote_founding_clubs from public, anon, authenticated;
revoke execute on function public.review_club_claim from public, anon;

-- ── Club runs ────────────────────────────────────────────────────────────────

-- Pace groups for a club run, shown as 'Easy 6:30', 'Steady 5:30'.
alter table public.events add column if not exists pace_groups text[];

-- Weeks in a row you have checked in to one of a club's runs.
create or replace function public.club_streak(p_club uuid, p_user uuid default auth.uid())
returns integer language plpgsql stable security definer set search_path = public as $$
declare
  wk date := date_trunc('week', public.london_today())::date;
  n int := 0;
begin
  -- This week counts once you've been; if not yet, the streak runs to last week.
  if not exists (select 1 from event_rsvps r join events e on e.id = r.event_id
                 where r.user_id = p_user and r.status = 'checked_in' and e.club_id = p_club
                   and date_trunc('week', (e.starts_at at time zone 'Europe/London'))::date = wk) then
    wk := wk - 7;
  end if;
  while exists (select 1 from event_rsvps r join events e on e.id = r.event_id
                where r.user_id = p_user and r.status = 'checked_in' and e.club_id = p_club
                  and date_trunc('week', (e.starts_at at time zone 'Europe/London'))::date = wk) loop
    n := n + 1;
    wk := wk - 7;
  end loop;
  return n;
end $$;

-- ── League fixtures ──────────────────────────────────────────────────────────

-- Everything the fixture screen needs in one call: both scores, squad sizes,
-- how many of each squad are out (a run or a check-in today) and, if you are
-- in a squad, your steps and what they add to the average.
create or replace function public.fixture_view(p_fixture uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  f fixtures;
  me uuid := auth.uid();
  mine uuid;
  out_home int; out_away int; size_home int; size_away int;
  my_steps int; avg_mine numeric;
begin
  select * into f from fixtures where id = p_fixture;
  if f.id is null then raise exception 'NOT_FOUND'; end if;
  select entry_id into mine from squad_members where fixture_id = p_fixture and user_id = me;
  select count(*) filter (where entry_id = f.home_id), count(*) filter (where entry_id = f.away_id)
    into size_home, size_away from squad_members where fixture_id = p_fixture;
  select count(*) filter (where s.entry_id = f.home_id), count(*) filter (where s.entry_id = f.away_id)
    into out_home, out_away
  from squad_members s
  where s.fixture_id = p_fixture and (
    exists (select 1 from runs r where r.user_id = s.user_id and (r.started_at at time zone 'Europe/London')::date = public.london_today())
    or exists (select 1 from event_rsvps v join events e on e.id = v.event_id
               where v.user_id = s.user_id and v.status = 'checked_in'
                 and (e.starts_at at time zone 'Europe/London')::date = public.london_today()));
  if mine is not null then
    select coalesce(sum(counted), 0) into my_steps from daily_steps
    where user_id = me and day between f.starts_on and f.ends_on and not flagged;
    select avg(t.c) into avg_mine from (
      select coalesce(sum(d.counted), 0) as c from squad_members s
      left join daily_steps d on d.user_id = s.user_id and d.day between f.starts_on and f.ends_on and not d.flagged
      where s.fixture_id = p_fixture and s.entry_id = mine group by s.user_id) t;
  end if;
  return json_build_object(
    'id', f.id, 'week', f.week, 'is_derby', f.is_derby, 'starts_on', f.starts_on, 'ends_on', f.ends_on,
    'home_id', f.home_id, 'away_id', f.away_id,
    'home_score', coalesce(f.home_score, public.fixture_side_score(p_fixture, f.home_id)),
    'away_score', coalesce(f.away_score, public.fixture_side_score(p_fixture, f.away_id)),
    'home_size', size_home, 'away_size', size_away, 'home_out', out_home, 'away_out', out_away,
    'revealed', f.revealed_at is not null, 'my_entry', mine, 'my_steps', my_steps,
    'my_lift', case when mine is null or coalesce(size_home, 0) = 0 then null
                    else round((my_steps - coalesce(avg_mine, 0)) / greatest(case when mine = f.home_id then size_home else size_away end, 1)) end);
end $$;

-- Sunday 20:00: scores are fixed and the table moves. Three points for a win,
-- one for a draw, double for a derby.
create or replace function public.settle_fixture(p_fixture uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  f fixtures;
  hs numeric; aws numeric;
  mult int;
begin
  select * into f from fixtures where id = p_fixture for update;
  if f.id is null or f.revealed_at is not null then return; end if;
  hs := public.fixture_side_score(p_fixture, f.home_id);
  aws := public.fixture_side_score(p_fixture, f.away_id);
  mult := case when f.is_derby then 2 else 1 end;
  update fixtures set home_score = hs, away_score = aws, revealed_at = now() where id = p_fixture;
  update league_entries set played = played + 1,
    won = won + (hs > aws)::int, drawn = drawn + (hs = aws)::int, lost = lost + (hs < aws)::int,
    points = points + mult * (case when hs > aws then 3 when hs = aws then 1 else 0 end)
  where id = f.home_id;
  update league_entries set played = played + 1,
    won = won + (aws > hs)::int, drawn = drawn + (hs = aws)::int, lost = lost + (aws < hs)::int,
    points = points + mult * (case when aws > hs then 3 when hs = aws then 1 else 0 end)
  where id = f.away_id;
  insert into notifications (user_id, kind, title, body, link)
  select s.user_id, 'league',
         case when (s.entry_id = f.home_id and hs > aws) or (s.entry_id = f.away_id and aws > hs) then 'You won the fixture'
              when hs = aws then 'The fixture was a draw' else 'The fixture went the other way' end,
         round(hs)::text || ' to ' || round(aws)::text, '/clubs/fixture/' || p_fixture
  from squad_members s where s.fixture_id = p_fixture;
end $$;

create or replace function public.settle_due_fixtures()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  n int := 0;
  local_now timestamp := now() at time zone 'Europe/London';
begin
  for r in select id from fixtures
           where revealed_at is null and drawn_at is not null
             and (ends_on < local_now::date or (ends_on = local_now::date and local_now::time >= '20:00'))
  loop
    perform public.settle_fixture(r.id);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.settle_fixture from public, anon, authenticated;
revoke execute on function public.settle_due_fixtures from public, anon, authenticated;

-- ── Club v club friendlies ───────────────────────────────────────────────────

-- Captains challenge clubs to friendlies. League fixtures are always steps so
-- every club size plays fair; these are the other ways to play. Turf war is
-- listed but not open yet.
create type public.club_battle_mode as enum ('steps', 'live_race', 'relay', 'blind_time_trial', 'turnout_night', 'turf_war');
create type public.club_battle_status as enum ('pending', 'accepted', 'live', 'finished', 'declined', 'cancelled');

create table public.club_battles (
  id               uuid primary key default gen_random_uuid(),
  challenger_club  uuid not null references public.clubs(id) on delete cascade,
  opponent_club    uuid not null references public.clubs(id) on delete cascade,
  mode             public.club_battle_mode not null default 'steps',
  mystery          boolean not null default false,   -- opponent finds out who at the reveal
  status           public.club_battle_status not null default 'pending',
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  challenger_score numeric,
  opponent_score   numeric,
  winner_club      uuid references public.clubs(id),
  created_by       uuid not null references public.profiles(id),
  responded_by     uuid references public.profiles(id),
  created_at       timestamptz not null default now(),
  check (challenger_club <> opponent_club),
  check (ends_at > starts_at)
);
create index club_battles_challenger_idx on public.club_battles(challenger_club, status);
create index club_battles_opponent_idx on public.club_battles(opponent_club, status);

-- Members of the challenged club vote; the captain decides.
create table public.club_battle_votes (
  battle_id   uuid not null references public.club_battles(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  yes         boolean not null,
  created_at  timestamptz not null default now(),
  primary key (battle_id, user_id)
);

alter table public.club_battles enable row level security;
alter table public.club_battle_votes enable row level security;
-- Reads go through club_battles_for(), which hides a mystery challenger.
create policy "staff read club battles" on public.club_battles for select using (public.is_staff());
create policy "my votes" on public.club_battle_votes for select using (user_id = auth.uid());

-- Default lengths: steps 3 days, live race 1 hour, relay 2 hours, blind time
-- trial to Sunday night, turnout night one evening.
create or replace function public.challenge_club(
  p_my_club uuid, p_opponent uuid default null, p_mode public.club_battle_mode default 'steps',
  p_starts_at timestamptz default null, p_hours integer default null)
returns public.club_battles language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  mine clubs;
  opp uuid := p_opponent;
  start_ timestamptz;
  b club_battles;
begin
  if public.club_role_of(p_my_club, me) is distinct from 'captain' then raise exception 'CAPTAINS_ONLY'; end if;
  select * into mine from clubs where id = p_my_club;
  if mine.status <> 'verified' then raise exception 'NOT_VERIFIED'; end if;
  if p_mode = 'turf_war' then raise exception 'MODE_NOT_READY'; end if;
  if opp is null then
    select c.id into opp from clubs c
    where c.status = 'verified' and c.id <> p_my_club and c.city_id = mine.city_id
      and not exists (select 1 from club_battles x where x.status in ('pending', 'accepted', 'live')
                      and ((x.challenger_club = p_my_club and x.opponent_club = c.id) or (x.challenger_club = c.id and x.opponent_club = p_my_club)))
    order by random() limit 1;
    if opp is null then raise exception 'NO_CLUBS'; end if;
  end if;
  if opp = p_my_club then raise exception 'NOT_ALLOWED'; end if;
  if not exists (select 1 from clubs where id = opp and status = 'verified') then raise exception 'NOT_VERIFIED'; end if;
  if exists (select 1 from club_battles x where x.status in ('pending', 'accepted', 'live')
             and ((x.challenger_club = p_my_club and x.opponent_club = opp) or (x.challenger_club = opp and x.opponent_club = p_my_club))) then
    raise exception 'ALREADY_PLAYING';
  end if;
  if (select count(*) from club_battles where challenger_club = p_my_club and status in ('pending', 'accepted', 'live')) >= 3 then
    raise exception 'CLUB_BATTLE_LIMIT';
  end if;
  start_ := coalesce(p_starts_at, now() + interval '1 day');
  if start_ < now() then raise exception 'BAD_TIME'; end if;
  insert into club_battles (challenger_club, opponent_club, mode, mystery, starts_at, ends_at, created_by)
  values (p_my_club, opp, p_mode, p_opponent is null, start_,
          start_ + make_interval(hours => coalesce(p_hours, case p_mode
            when 'steps' then 72 when 'live_race' then 1 when 'relay' then 2
            when 'blind_time_trial' then 168 else 4 end)),
          me)
  returning * into b;
  insert into notifications (user_id, kind, title, body, link)
  select m.user_id, 'club',
         case when b.mystery then 'Here comes a challenger club' else mine.name || ' want a friendly' end,
         case when b.mystery then 'A club in your area has called you out. Vote, then your captain decides.'
              else 'Vote, then your captain decides.' end,
         '/clubs/battle/' || b.id
  from club_members m where m.club_id = opp;
  return b;
end $$;

create or replace function public.vote_club_battle(p_battle uuid, p_yes boolean)
returns void language plpgsql security definer set search_path = public as $$
declare b club_battles;
begin
  select * into b from club_battles where id = p_battle;
  if b.id is null or b.status <> 'pending' then raise exception 'BATTLE_CLOSED'; end if;
  if not public.is_club_member(b.opponent_club) then raise exception 'NOT_ALLOWED'; end if;
  insert into club_battle_votes (battle_id, user_id, yes) values (p_battle, auth.uid(), p_yes)
  on conflict (battle_id, user_id) do update set yes = excluded.yes, created_at = now();
end $$;

create or replace function public.respond_club_battle(p_battle uuid, p_accept boolean)
returns public.club_battles language plpgsql security definer set search_path = public as $$
declare b club_battles;
begin
  select * into b from club_battles where id = p_battle for update;
  if b.id is null or b.status <> 'pending' then raise exception 'BATTLE_CLOSED'; end if;
  if public.club_role_of(b.opponent_club) is distinct from 'captain' then raise exception 'CAPTAINS_ONLY'; end if;
  update club_battles set status = case when not p_accept then 'declined'::club_battle_status
                                      when starts_at <= now() then 'live' else 'accepted' end,
    starts_at = greatest(starts_at, now()), ends_at = greatest(ends_at, now() + (ends_at - starts_at)),
    responded_by = auth.uid()
  where id = p_battle returning * into b;
  insert into notifications (user_id, kind, title, body, link)
  select m.user_id, 'club', case when p_accept then 'Friendly on' else 'Friendly declined' end,
         case when p_accept then 'It starts ' || to_char(b.starts_at at time zone 'Europe/London', 'Dy HH24:MI') else null end,
         '/clubs/battle/' || b.id
  from club_members m where m.club_id in (b.challenger_club, case when p_accept then b.opponent_club end);
  return b;
end $$;

create or replace function public.cancel_club_battle(p_battle uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b club_battles;
begin
  select * into b from club_battles where id = p_battle for update;
  if b.id is null or b.status not in ('pending', 'accepted') then raise exception 'BATTLE_CLOSED'; end if;
  if public.club_role_of(b.challenger_club) is distinct from 'captain'
     and public.club_role_of(b.opponent_club) is distinct from 'captain' then raise exception 'CAPTAINS_ONLY'; end if;
  update club_battles set status = 'cancelled' where id = p_battle;
end $$;

-- Squads are the same size on both sides: the smaller club, at most 25.
create or replace function public.club_battle_size(b public.club_battles)
returns integer language sql stable security definer set search_path = public as $$
  select least(25,
    (select count(*) from club_members where club_id = b.challenger_club),
    (select count(*) from club_members where club_id = b.opponent_club))::int
$$;

-- One side's score. Steps, live race and turnout: higher wins. Relay and blind
-- time trial are seconds: lower wins, and null means the side didn't finish.
create or replace function public.club_battle_score(p_battle uuid, p_club uuid)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare
  b club_battles;
  n int;
  members int;
  result numeric;
begin
  select * into b from club_battles where id = p_battle;
  n := public.club_battle_size(b);
  if n = 0 then return null; end if;
  select count(*) into members from club_members where club_id = p_club;
  if b.mode = 'steps' then
    with s as (
      select m.user_id, coalesce(sum(d.counted), 0) as c from club_members m
      left join daily_steps d on d.user_id = m.user_id and not d.flagged
        and d.day between (b.starts_at at time zone 'Europe/London')::date and (b.ends_at at time zone 'Europe/London')::date
      where m.club_id = p_club group by m.user_id order by 2 desc limit n),
    t as (
      select least(1, count(distinct r.user_id)::numeric / n) as rate from event_rsvps r
      join events e on e.id = r.event_id and e.club_id = p_club and e.kind = 'club_run'
      where r.status = 'checked_in' and e.starts_at between b.starts_at and b.ends_at)
    select round(coalesce(avg(s.c), 0) * (1 + coalesce((select rate from t), 0) / 5), 1) into result from s;
  elsif b.mode = 'live_race' then
    select coalesce(sum(m), 0) into result from (
      select sum(r.distance_m) as m from runs r join club_members cm on cm.user_id = r.user_id and cm.club_id = p_club
      where r.started_at between b.starts_at and b.ends_at and r.ended_at <= b.ends_at + interval '5 minutes'
      group by r.user_id order by 1 desc limit n) x;
  elsif b.mode = 'relay' then
    -- Ten legs of 1 km by different runners: each runner's fastest 1 km in the
    -- window, the ten fastest runners count.
    select case when count(*) = least(10, n) then sum(t) end into result from (
      select min(round(r.moving_s * 1000.0 / r.distance_m)) as t from runs r
      join club_members cm on cm.user_id = r.user_id and cm.club_id = p_club
      where r.distance_m >= 1000 and r.started_at between b.starts_at and b.ends_at
      group by r.user_id order by 1 limit least(10, n)) x;
  elsif b.mode = 'blind_time_trial' then
    -- Average 5 km time; at least five runners (or the whole squad) must post.
    select case when count(*) >= least(5, n) then round(avg(t)) end into result from (
      select min(round(r.moving_s * 5000.0 / r.distance_m)) as t from runs r
      join club_members cm on cm.user_id = r.user_id and cm.club_id = p_club
      where r.distance_m >= 5000 and r.started_at between b.starts_at and b.ends_at
      group by r.user_id order by 1 limit n) x;
  elsif b.mode = 'turnout_night' then
    select round(100.0 * count(distinct r.user_id) / greatest(members, 1), 1) into result from event_rsvps r
    join events e on e.id = r.event_id and e.club_id = p_club and e.kind = 'club_run'
    where r.status = 'checked_in' and e.starts_at between b.starts_at and b.ends_at;
  end if;
  return result;
end $$;
revoke execute on function public.club_battle_score from public, anon, authenticated;
revoke execute on function public.club_battle_size from public, anon, authenticated;

-- Every friendly a club is in, as that club's members see it. A mystery
-- challenger stays hidden from the challenged club until the battle starts,
-- and blind time trial scores stay sealed until it ends.
create or replace function public.club_battles_for(p_club uuid)
returns table (
  id uuid, mode public.club_battle_mode, status public.club_battle_status, mystery boolean,
  starts_at timestamptz, ends_at timestamptz, home boolean,
  opponent_id uuid, opponent_name text, opponent_logo text, opponent_members integer,
  my_score numeric, their_score numeric, won boolean, squad integer,
  yes_votes integer, no_votes integer, my_vote boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_club_member(p_club) and not public.is_staff() then raise exception 'NOT_ALLOWED'; end if;
  return query
  select b.id, b.mode, b.status, b.mystery, b.starts_at, b.ends_at,
         b.challenger_club = p_club,
         case when hidden then null else o.id end,
         case when hidden then null else o.name end,
         case when hidden then null else o.logo_path end,
         case when hidden then null else o.member_count end,
         case when sealed then null when b.status = 'finished' then (case when b.challenger_club = p_club then b.challenger_score else b.opponent_score end)
              when b.status = 'live' then public.club_battle_score(b.id, p_club) end,
         case when sealed then null when b.status = 'finished' then (case when b.challenger_club = p_club then b.opponent_score else b.challenger_score end)
              when b.status = 'live' then public.club_battle_score(b.id, o.id) end,
         case when b.status = 'finished' then b.winner_club = p_club end,
         public.club_battle_size(b),
         (select count(*)::int from club_battle_votes v where v.battle_id = b.id and v.yes),
         (select count(*)::int from club_battle_votes v where v.battle_id = b.id and not v.yes),
         (select v.yes from club_battle_votes v where v.battle_id = b.id and v.user_id = auth.uid())
  from club_battles b
  join clubs o on o.id = case when b.challenger_club = p_club then b.opponent_club else b.challenger_club end
  cross join lateral (select b.mystery and b.opponent_club = p_club and b.status in ('pending', 'accepted') as hidden,
                             b.mode = 'blind_time_trial' and b.status <> 'finished' as sealed) f
  where p_club in (b.challenger_club, b.opponent_club)
  order by b.starts_at desc;
end $$;

create or replace function public.settle_club_battle(p_battle uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  b club_battles;
  cs numeric; os numeric;
  lower_wins boolean;
  winner uuid;
begin
  select * into b from club_battles where id = p_battle for update;
  if b.id is null or b.status <> 'live' then return; end if;
  cs := public.club_battle_score(p_battle, b.challenger_club);
  os := public.club_battle_score(p_battle, b.opponent_club);
  lower_wins := b.mode in ('relay', 'blind_time_trial');
  winner := case
    when cs is null and os is null then null
    when cs is null then b.opponent_club
    when os is null then b.challenger_club
    when cs = os then null
    when (cs < os) = lower_wins then b.challenger_club
    else b.opponent_club end;
  update club_battles set status = 'finished', challenger_score = cs, opponent_score = os, winner_club = winner
  where id = p_battle;
  insert into notifications (user_id, kind, title, body, link)
  select m.user_id, 'club',
         case when winner is null then 'The friendly was a draw' when winner = m.club_id then 'Your club won' else 'Your club lost this one' end,
         null, '/clubs/battle/' || p_battle
  from club_members m where m.club_id in (b.challenger_club, b.opponent_club);
end $$;

create or replace function public.settle_due_club_battles()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  n int := 0;
begin
  update club_battles set status = 'live' where status = 'accepted' and starts_at <= now();
  update club_battles set status = 'cancelled' where status = 'pending' and starts_at + interval '1 day' <= now();
  for r in select id from club_battles where status = 'live' and ends_at <= now() loop
    perform public.settle_club_battle(r.id);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.settle_club_battle from public, anon, authenticated;
revoke execute on function public.settle_due_club_battles from public, anon, authenticated;

-- ── Schedules ────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then return; end if;
  perform cron.schedule('settle-club-battles', '*/5 * * * *', 'select public.settle_due_club_battles()');
  perform cron.schedule('settle-fixtures', '5 * * * 0', 'select public.settle_due_fixtures()');
  perform cron.schedule('promote-founding-clubs', '15 4 * * *', 'select public.promote_founding_clubs()');
exception when others then
  raise notice 'pg_cron not scheduled: %', sqlerrm;
end $$;
