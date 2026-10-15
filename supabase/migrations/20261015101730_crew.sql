-- Outhere schema, part 18: the Crew tab in the app.
--
-- - Crew settings: a weekly crew goal, who can join and who can post in chat,
--   and a six letter crew code anyone in the crew can share.
-- - Chat: route cards you can join, photos and battle results from the +
--   button (battle cards are written by the server, so nobody can fake a win).
-- - Reports: filed against a post, comment, message or story with the crew
--   it happened in, so the crew's admins see it too; blocking at the same time.
-- - Crew challenges members can join each week.
-- - Story stickers, club stories posted as the club, and cheers and replies.
-- - Read-only numbers for the Crew tab: this week's race, the crew goal split
--   by who put the kilometres in, crew days, when the crew moves, where the
--   crew ranks in its city, and the city's areas board.
--
-- Uses the web app's part 13 (join_policy, club_message_reactions,
-- club_channel_reads, read_channel, club_unread, borough_week_steps).

-- ── Crew settings ────────────────────────────────────────────────────────────

alter table public.clubs
  add column if not exists weekly_goal_km integer not null default 100
    check (weekly_goal_km between 10 and 5000);

-- Who can join (open or ask first), the weekly goal and whether only admins
-- can post in the crew chat. Captains and admins only; each change is
-- optional (null leaves it as it is).
create or replace function public.set_crew_settings(
  p_club uuid, p_join_policy text default null, p_weekly_goal_km integer default null,
  p_chat_admins_only boolean default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_club_staff(p_club) then raise exception 'NOT_ALLOWED'; end if;
  if p_join_policy is not null and p_join_policy not in ('open', 'request') then
    raise exception 'BAD_POLICY';
  end if;
  if p_weekly_goal_km is not null and (p_weekly_goal_km < 10 or p_weekly_goal_km > 5000) then
    raise exception 'BAD_GOAL';
  end if;
  update clubs set
    join_policy = coalesce(p_join_policy, join_policy),
    weekly_goal_km = coalesce(p_weekly_goal_km, weekly_goal_km)
  where id = p_club;
  if p_chat_admins_only is not null then
    update club_channels set staff_only_post = p_chat_admins_only
    where club_id = p_club and name = 'general';
  end if;
end $$;
revoke execute on function public.set_crew_settings(uuid, text, integer, boolean) from public, anon;

-- The crew code: six letters and numbers anyone in the crew can share. Made
-- the first time someone asks for it. Codes are stored lower case, like every
-- invite code, and shown upper case.
create or replace function public.crew_invite_code(p_club uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  c text;
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  i int;
begin
  if not public.is_club_member(p_club) then raise exception 'NOT_ALLOWED'; end if;
  select code into c from club_invites
  where club_id = p_club and label = 'Crew code' and expires_at is null and max_uses is null
  order by created_at limit 1;
  if c is not null then return c; end if;
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from club_invites where code = c);
  end loop;
  insert into club_invites (code, club_id, label, created_by) values (c, p_club, 'Crew code', auth.uid());
  return c;
end $$;
revoke execute on function public.crew_invite_code(uuid) from public, anon;

-- ── Chat ─────────────────────────────────────────────────────────────────────

alter table public.club_messages drop constraint if exists club_messages_kind_check;
alter table public.club_messages add constraint club_messages_kind_check
  check (kind in ('text', 'poll', 'run_card', 'event_card', 'photo', 'route_card', 'battle_card'));

-- Battle cards come from the server only.
drop policy "members post in chat" on public.club_messages;
create policy "members post in chat" on public.club_messages for insert with check (
  author_id = auth.uid()
  and kind <> 'battle_card'
  and public.is_club_member(club_id)
  and exists (select 1 from public.club_channels c where c.id = channel_id and c.club_id = club_messages.club_id
              and (not c.staff_only_post or public.is_club_staff(c.club_id))));

-- Who is joining a route card posted in the chat.
create table public.club_message_joins (
  message_id  uuid not null references public.club_messages(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (message_id, user_id)
);
alter table public.club_message_joins enable row level security;
revoke all on public.club_message_joins from anon, authenticated;
grant select on public.club_message_joins to authenticated;
create policy "joins on messages I can read" on public.club_message_joins for select to authenticated using (
  exists (select 1 from public.club_messages m where m.id = message_id));

-- Join or leave a route someone posted. Tells the poster when you join.
create or replace function public.toggle_chat_run(p_message uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  m club_messages;
  me uuid := auth.uid();
begin
  select * into m from club_messages where id = p_message and hidden_at is null;
  if m.id is null or m.kind <> 'route_card' then raise exception 'NOT_FOUND'; end if;
  if not public.is_club_member(m.club_id, me) or public.is_blocked(me, m.author_id) then
    raise exception 'NOT_ALLOWED';
  end if;
  if exists (select 1 from club_message_joins where message_id = p_message and user_id = me) then
    delete from club_message_joins where message_id = p_message and user_id = me;
    return false;
  end if;
  insert into club_message_joins (message_id, user_id) values (p_message, me);
  if m.author_id <> me then
    perform public.notify(m.author_id, 'club',
      (select display_name from profiles where id = me) || ' is in for ' || coalesce(m.data->>'title', 'your route'),
      null, '/(tabs)/club?crew=' || m.club_id || '&tab=chat', me);
  end if;
  return true;
end $$;
revoke execute on function public.toggle_chat_run(uuid) from public, anon;

-- Put a finished battle in the crew chat. The card is built here from the
-- battle itself: who it was against, who won and the OUT at stake.
create or replace function public.share_battle_to_crew(p_club uuid, p_battle uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  b battles;
  rival uuid;
  ch uuid;
  mid uuid;
begin
  if not public.is_club_member(p_club, me) then raise exception 'NOT_ALLOWED'; end if;
  select * into b from battles where id = p_battle and me in (challenger_id, opponent_id);
  if b.id is null then raise exception 'NOT_FOUND'; end if;
  if b.status not in ('finished', 'forfeit') then raise exception 'BATTLE_NOT_DONE'; end if;
  rival := case when b.challenger_id = me then b.opponent_id else b.challenger_id end;
  select id into ch from club_channels where club_id = p_club and name = 'general';
  if ch is null then raise exception 'NOT_FOUND'; end if;
  if exists (select 1 from club_channels where id = ch and staff_only_post) and not public.is_club_staff(p_club, me) then
    raise exception 'NOT_ALLOWED';
  end if;
  insert into club_messages (channel_id, club_id, author_id, kind, body, data)
  values (ch, p_club, me, 'battle_card', null, jsonb_build_object(
    'battle_id', b.id,
    'mode', b.mode,
    'rival_id', rival,
    'rival_name', (select display_name from profiles where id = rival),
    'won', b.winner_id = me,
    'draw', b.winner_id is null,
    'out', case when b.winner_id = me then b.stake_out else 0 end))
  returning id into mid;
  return mid;
end $$;
revoke execute on function public.share_battle_to_crew(uuid, uuid) from public, anon;

-- ── Reports ──────────────────────────────────────────────────────────────────

-- A report about something in a crew carries the crew, so its captain and
-- admins can see it alongside Outhere moderators.
alter table public.reports
  add column if not exists club_id uuid references public.clubs(id) on delete cascade;
create index if not exists reports_club_idx on public.reports(club_id, created_at) where club_id is not null;

create policy "crew staff see reports in their crew" on public.reports for select using (
  club_id is not null and public.is_club_staff(club_id));

-- File a report and, if asked, block the person at the same time. The crew's
-- staff are told there is something to look at, without who reported it.
create or replace function public.report_content(
  p_target_type text, p_target_id text, p_reason text,
  p_club uuid default null, p_block uuid default null, p_detail text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  rid uuid;
  club_name text;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if p_club is not null and not public.is_club_member(p_club, me) then raise exception 'NOT_ALLOWED'; end if;
  if (select count(*) from reports where reporter_id = me and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'TOO_MANY_REPORTS';
  end if;
  insert into reports (reporter_id, target_type, target_id, reason, detail, club_id)
  values (me, p_target_type, p_target_id, p_reason, nullif(left(trim(coalesce(p_detail, '')), 1000), ''), p_club)
  returning id into rid;
  if p_block is not null and p_block <> me then
    insert into blocks (user_id, blocked_id) values (me, p_block) on conflict do nothing;
  end if;
  if p_club is not null then
    select name into club_name from clubs where id = p_club;
    insert into notifications (user_id, kind, title, body, link)
    select m.user_id, 'club', 'Something was reported in ' || club_name,
           'Take a look when you can.', '/crew/settings/' || p_club
    from club_members m where m.club_id = p_club and m.role in ('admin', 'captain') and m.user_id <> me;
  end if;
  return rid;
end $$;
revoke execute on function public.report_content(text, text, text, uuid, uuid, text) from public, anon;

-- ── Crew challenges ──────────────────────────────────────────────────────────

-- Weekly challenges a crew's members can join. Each entry is for one week.
create table public.crew_challenges (
  id          text primary key,
  title       text not null,
  description text not null,
  kind        text not null check (kind in ('early_runs', 'late_runs', 'long_run', 'beat_rival', 'team_km')),
  target      numeric,
  image       text,                               -- an app photo key
  sort        integer not null default 0
);
alter table public.crew_challenges enable row level security;
revoke all on public.crew_challenges from anon, authenticated;
grant select on public.crew_challenges to authenticated;
create policy "everyone reads crew challenges" on public.crew_challenges for select to authenticated using (true);

insert into public.crew_challenges (id, title, description, kind, target, image, sort) values
  ('sunrise', 'Sunrise Club', '5 runs before 8am', 'early_runs', 5, 'chatsnap', 1),
  ('area_cup', 'Area Cup', 'Beat the crew above you by Sunday', 'beat_rival', null, 'crest', 2),
  ('night_owls', 'Night Owls', '3 runs after 9pm', 'late_runs', 3, 'owl', 3),
  ('long_sunday', 'Long Sunday', '10 km in one go on Sunday', 'long_run', 10, 'trail', 4)
on conflict (id) do update set title = excluded.title, description = excluded.description,
  kind = excluded.kind, target = excluded.target, image = excluded.image, sort = excluded.sort;

create table public.crew_challenge_entries (
  club_id      uuid not null references public.clubs(id) on delete cascade,
  challenge_id text not null references public.crew_challenges(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  week_start   date not null,
  joined_at    timestamptz not null default now(),
  primary key (club_id, challenge_id, user_id, week_start)
);
alter table public.crew_challenge_entries enable row level security;
revoke all on public.crew_challenge_entries from anon, authenticated;
grant select on public.crew_challenge_entries to authenticated;
create policy "crew members see entries" on public.crew_challenge_entries for select to authenticated using (
  public.is_club_member(club_id));

create or replace function public.london_week_start()
returns date language sql stable set search_path = public as $$
  select date_trunc('week', public.london_today())::date
$$;

create or replace function public.join_crew_challenge(p_club uuid, p_challenge text, p_join boolean default true)
returns boolean language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if not public.is_club_member(p_club, me) then raise exception 'NOT_ALLOWED'; end if;
  if not exists (select 1 from crew_challenges where id = p_challenge) then raise exception 'NOT_FOUND'; end if;
  if p_join then
    insert into crew_challenge_entries (club_id, challenge_id, user_id, week_start)
    values (p_club, p_challenge, me, public.london_week_start()) on conflict do nothing;
  else
    delete from crew_challenge_entries
    where club_id = p_club and challenge_id = p_challenge and user_id = me and week_start = public.london_week_start();
  end if;
  return p_join;
end $$;
revoke execute on function public.join_crew_challenge(uuid, text, boolean) from public, anon;

-- ── Stories ──────────────────────────────────────────────────────────────────

-- Stickers on a story (the run stats come from run_id), and stories posted as
-- the club itself, which only its captain and admins can do. Any member can
-- post to their club's audience.
alter table public.stories
  add column if not exists stickers text[] not null default '{}'
    check (stickers <@ array['route', 'streak', 'battle', 'club']::text[]),
  add column if not exists as_club boolean not null default false,
  add constraint stories_as_club check (not as_club or club_id is not null);

drop policy "post stories" on public.stories;
create policy "post stories" on public.stories for insert with check (
  author_id = auth.uid()
  and public.can_post_stories(auth.uid())
  and split_part(media_path, '/', 1) = auth.uid()::text
  and expires_at <= now() + interval '24 hours 1 minute'
  and (club_id is null or public.is_club_member(club_id))
  and (not as_club or public.is_club_staff(club_id)));

-- Cheers and replies to a story go back to its author.
create table public.story_replies (
  id          uuid primary key default gen_random_uuid(),
  story_id    uuid not null references public.stories(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null default 'reply' check (kind in ('reply', 'cheer')),
  body        text check (char_length(body) <= 500),
  created_at  timestamptz not null default now(),
  check (kind = 'cheer' or char_length(trim(body)) > 0)
);
create index story_replies_story_idx on public.story_replies(story_id, created_at);
create unique index story_replies_one_cheer on public.story_replies(story_id, user_id) where kind = 'cheer';
alter table public.story_replies enable row level security;
revoke all on public.story_replies from anon, authenticated;
grant select, insert on public.story_replies to authenticated;
create policy "my replies and replies to my stories" on public.story_replies for select to authenticated using (
  user_id = auth.uid() or exists (select 1 from public.stories s where s.id = story_id and s.author_id = auth.uid()));
-- Only on a story you can see (the stories policy applies inside).
create policy "reply to stories I can see" on public.story_replies for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from public.stories s where s.id = story_id and s.author_id <> auth.uid()));

create or replace function public.notify_story_reply()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  author uuid;
  who text;
begin
  select author_id into author from stories where id = new.story_id;
  select display_name into who from profiles where id = new.user_id;
  if author is null or public.is_blocked(author, new.user_id) then return new; end if;
  perform public.notify(author, 'social',
    case when new.kind = 'cheer' then who || ' sent you a cheer' else who || ' replied to your story' end,
    case when new.kind = 'reply' then left(new.body, 140) end,
    '/player/' || new.user_id, new.user_id);
  return new;
end $$;
create trigger story_replies_notify after insert on public.story_replies
  for each row execute function public.notify_story_reply();

-- ── Numbers for the Crew tab ─────────────────────────────────────────────────

-- Steps and distance per member since a date (null for all time), ranked.
-- Distance falls back to steps when a day has none recorded.
create or replace function public.crew_race(p_club uuid, p_period text default 'week')
returns table (user_id uuid, steps bigint, km numeric, rank integer)
language sql stable set search_path = public as $$
  with since as (
    select case p_period
             when 'week' then public.london_week_start()
             when 'month' then date_trunc('month', public.london_today())::date
             else null end as d
  )
  select m.user_id,
         coalesce(sum(d.steps), 0)::bigint,
         round(coalesce(sum(case when d.distance_m > 0 then d.distance_m else d.steps * 0.75 end), 0) / 1000.0, 1),
         rank() over (order by coalesce(sum(d.steps), 0) desc)::int
  from public.club_members m
  cross join since
  left join public.daily_steps d on d.user_id = m.user_id and (since.d is null or d.day >= since.d)
  where m.club_id = p_club
  group by m.user_id
  order by 2 desc, m.user_id
$$;
grant execute on function public.crew_race(uuid, text) to authenticated;

-- Kilometres per member per day in a month, for crew days and the goal.
create or replace function public.crew_days(p_club uuid, p_month date default null)
returns table (day date, km numeric)
language sql stable set search_path = public as $$
  with m as (select date_trunc('month', coalesce(p_month, public.london_today()))::date as first)
  select d.day,
         round(sum(case when d.distance_m > 0 then d.distance_m else d.steps * 0.75 end) / 1000.0, 1)
  from public.daily_steps d, m
  where d.user_id in (select user_id from public.club_members where club_id = p_club)
    and d.day >= m.first and d.day < (m.first + interval '1 month')::date
  group by d.day
  order by d.day
$$;
grant execute on function public.crew_days(uuid, date) to authenticated;

-- When the crew moves this month: runs by weekday and time of day, the
-- month's kilometres, runs, average pace and OUT earned. Totals only, and
-- only for the crew's own members.
create or replace function public.crew_stats(p_club uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  first date := date_trunc('month', public.london_today())::date;
  result jsonb;
begin
  if not public.is_club_member(p_club) then raise exception 'NOT_ALLOWED'; end if;
  with members as (select user_id from club_members where club_id = p_club),
  r as (
    select ru.distance_m, ru.moving_s,
           extract(isodow from ru.started_at at time zone 'Europe/London')::int as dow,
           extract(hour from ru.started_at at time zone 'Europe/London')::int as hr
    from runs ru
    where ru.user_id in (select user_id from members)
      and ru.started_at >= first::timestamp at time zone 'Europe/London'
  ),
  b as (
    select dow, case when hr < 8 then 0 when hr < 11 then 1 when hr < 15 then 2 when hr < 19 then 3 else 4 end as slot
    from r
  )
  select jsonb_build_object(
    'month_km', (select round(coalesce(sum(case when d.distance_m > 0 then d.distance_m else d.steps * 0.75 end), 0) / 1000.0)
                 from daily_steps d where d.user_id in (select user_id from members) and d.day >= first),
    'runs', (select count(*) from r),
    'avg_pace', (select case when sum(distance_m) > 0 then round(sum(moving_s) / (sum(distance_m) / 1000.0)) end from r),
    'out', (select coalesce(sum(amount), 0) from ledger l
            where l.user_id in (select user_id from members) and l.currency = 'out' and l.amount > 0
              and l.created_at >= first::timestamp at time zone 'Europe/London'),
    'heat', (select coalesce(jsonb_agg(jsonb_build_object('dow', dow, 'slot', slot, 'n', n)), '[]'::jsonb)
             from (select dow, slot, count(*) as n from b group by dow, slot) x))
  into result;
  return result;
end $$;
revoke execute on function public.crew_stats(uuid) from public, anon;
grant execute on function public.crew_stats(uuid) to authenticated;

-- Crews in a city ranked by kilometres this week.
create or replace function public.city_crew_board(p_city text)
returns table (club_id uuid, name text, logo_path text, accent text, members integer, km numeric, rank integer)
language sql stable set search_path = public as $$
  select c.id, c.name, c.logo_path, c.accent, c.member_count,
         round(coalesce(sum(case when d.distance_m > 0 then d.distance_m else d.steps * 0.75 end), 0) / 1000.0, 1),
         rank() over (order by coalesce(sum(case when d.distance_m > 0 then d.distance_m else d.steps * 0.75 end), 0) desc)::int
  from public.clubs c
  left join public.club_members m on m.club_id = c.id
  left join public.daily_steps d on d.user_id = m.user_id and d.day >= public.london_week_start()
  where c.city_id = p_city and c.status <> 'suspended'
  group by c.id
  order by 6 desc, c.name
  limit 50
$$;
grant execute on function public.city_crew_board(text) to authenticated;

-- The areas board for a member's city: its boroughs when it has them, or
-- otherwise the towns and cities in its region, or the regions of the UK when
-- the region has only the one place. Steps counted this week.
create or replace function public.area_board(p_city text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  wk date := public.london_week_start();
  reg text;
  rows_ jsonb;
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  if exists (select 1 from boroughs where city_id = p_city) then
    select coalesce(jsonb_agg(x order by x.steps desc, x.name), '[]'::jsonb) into rows_ from (
      select b.id, b.name, coalesce(sum(w.counted), 0)::bigint as steps
      from boroughs b
      left join borough_week_steps w on w.borough_id = b.id and w.week_start = wk
      where b.city_id = p_city
      group by b.id, b.name) x;
    return jsonb_build_object('kind', 'boroughs', 'place', (select name from cities where id = p_city), 'rows', rows_);
  end if;
  select region into reg from cities where id = p_city;
  if (select count(*) from cities where region = reg) > 1 then
    select coalesce(jsonb_agg(x order by x.steps desc, x.name), '[]'::jsonb) into rows_ from (
      select c.id, c.name, coalesce(sum(d.counted), 0)::bigint as steps
      from cities c
      left join profiles p on p.city_id = c.id
      left join daily_steps d on d.user_id = p.id and d.day >= wk and not d.flagged
      where c.region = reg
      group by c.id, c.name) x;
    return jsonb_build_object('kind', 'towns', 'place', reg, 'rows', rows_);
  end if;
  select coalesce(jsonb_agg(x order by x.steps desc, x.name), '[]'::jsonb) into rows_ from (
    select c.region as id, c.region as name, coalesce(sum(d.counted), 0)::bigint as steps
    from cities c
    left join profiles p on p.city_id = c.id
    left join daily_steps d on d.user_id = p.id and d.day >= wk and not d.flagged
    group by c.region) x;
  return jsonb_build_object('kind', 'regions', 'place', 'the UK', 'rows', rows_);
end $$;
revoke execute on function public.area_board(text) from public, anon;
grant execute on function public.area_board(text) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.club_message_joins;
  end if;
end $$;
