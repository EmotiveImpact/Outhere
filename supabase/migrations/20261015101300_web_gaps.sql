-- Outhere schema, part 13: what the web app and the admin need that the
-- schema did not have yet (see SCHEMA_GAPS.md from the web app thread).
--
-- - Private profiles, with a small public card that always shows.
-- - Join requests for clubs that want to say yes first, and pace groups.
-- - Club tags, filters and a safe way to change a club's address.
-- - Chat reactions, unread counts and channel descriptions.
-- - Borough step totals by week.
-- - Staff actions (verify a club, review flagged steps, take someone out of a
--   squad, hold the reveal), each written to audit_log.
-- - Badges, awarded by the server.
-- - Smaller bits: who a notification is from, what a pick-up is, stakes in
--   words, five day battles and telling a challenger they were turned down.

-- ── Shared helpers ───────────────────────────────────────────────────────────

-- notify() gains the person the notification is about, so the app can show
-- their face. Dropped and made again because a new default argument next to
-- the old function would make every call ambiguous.
alter table public.notifications
  add column if not exists actor_id uuid references public.profiles(id) on delete set null;

drop function public.notify(uuid, text, text, text, text);
create function public.notify(
  p_user uuid, p_kind text, p_title text, p_body text default null,
  p_link text default null, p_actor uuid default null)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, kind, title, body, link, actor_id)
  values (p_user, p_kind, p_title, p_body, p_link, p_actor)
$$;
revoke execute on function public.notify(uuid, text, text, text, text, uuid) from public, anon, authenticated;

create or replace function public.notify_on_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify(new.followee_id, 'social',
    (select display_name from profiles where id = new.follower_id) || ' followed you', null,
    '/player/' || new.follower_id, new.follower_id);
  return new;
end $$;

-- Every staff action leaves a line in audit_log.
create or replace function public.log_staff_action(
  p_action text, p_target_type text, p_target_id text, p_detail jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into audit_log (actor_id, action, target_type, target_id, detail)
  values (auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_detail, '{}'::jsonb))
$$;
revoke execute on function public.log_staff_action(text, text, text, jsonb) from public, anon, authenticated;

-- ── Private profiles ─────────────────────────────────────────────────────────

-- A member can make their profile private. Who still sees the full row:
--   * the member, and Outhere staff;
--   * friends, meaning people the member follows back. Follows need no
--     approval, so a one way follow would be an easy way round the switch;
--     following someone back is the private member saying yes.
-- Everyone else gets nothing from profiles. They still need a name and a face
-- for chat, club lists, battles and tables, so profile_cards below shows the
-- basics (id, username, display name, avatar and the ring) for everyone,
-- private or not. Bio, borough, city, level, XP and streaks stay hidden.
alter table public.profiles
  add column if not exists public_profile boolean not null default true;
grant update (public_profile) on public.profiles to authenticated;

drop policy "profiles are public" on public.profiles;
create policy "profiles people can see" on public.profiles for select using (
  public_profile
  or id = auth.uid()
  or public.is_staff()
  or public.are_friends(auth.uid(), id));

-- The public card. This view reads profiles with its owner's rights on
-- purpose, so the basics show even for private profiles; it exposes nothing
-- beyond these columns.
create view public.profile_cards as
select id, username, display_name, avatar_path, tier, public_profile
from public.profiles;
revoke all on public.profile_cards from anon, authenticated;
grant select on public.profile_cards to anon, authenticated;

-- Founding progress counted trusted people by reading profiles as the
-- viewer, which would now leave out private members. Trust is checked here
-- instead, the same for everyone.
create or replace function public.is_trusted(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select trust in ('verified', 'established') from profiles where id = uid), false)
$$;

create or replace view public.club_founding_progress
with (security_invoker = true) as
with meetups as (
  select e.club_id, e.id, e.starts_at, count(r.user_id) as attended
  from public.events e
  join public.event_rsvps r on r.event_id = e.id and r.status = 'checked_in'
  where e.kind = 'club_run' and e.cancelled_at is null
    and e.starts_at > now() - interval '6 weeks'
  group by e.club_id, e.id, e.starts_at
  having count(r.user_id) >= 6
), people as (
  select e.club_id, count(distinct r.user_id) as verified_people
  from public.events e
  join public.event_rsvps r on r.event_id = e.id and r.status = 'checked_in'
  where e.kind = 'club_run' and e.starts_at > now() - interval '6 weeks'
    and public.is_trusted(r.user_id)
  group by e.club_id
)
select c.id as club_id,
       coalesce((select count(*) from meetups m where m.club_id = c.id), 0)::int as qualifying_meetups,
       coalesce((select verified_people from people p where p.club_id = c.id), 0)::int as verified_people,
       3 as meetups_needed,
       10 as people_needed
from public.clubs c;

-- ── Clubs: tags, filters, join policy, pace groups ───────────────────────────

-- Filters are the fixed chips on Find your run club: mornings, evenings,
-- night runs, weekends, beginners, walkers, women only. Tags are the club's
-- own words.
alter table public.clubs
  add column if not exists tags text[] not null default '{}'
    check (cardinality(tags) <= 12),
  add column if not exists filters text[] not null default '{}'
    check (filters <@ array['morn', 'eve', 'night', 'wkd', 'beg', 'walk', 'women']::text[]),
  add column if not exists join_policy text not null default 'open'
    check (join_policy in ('open', 'request'));
grant update (tags, filters, join_policy) on public.clubs to authenticated;

alter table public.club_members
  add column if not exists pace_group text check (pace_group in ('walk', 'easy', 'steady', 'fast'));

-- ── Club addresses ───────────────────────────────────────────────────────────

-- Club pages live at weouthere.app/<slug>, so a club can never take a path the
-- app or the website owns. Copied from RESERVED_SLUGS in packages/core
-- rules.ts; keep the two lists the same.
create or replace function public.is_reserved_slug(p_slug text)
returns boolean language sql immutable as $$
  select lower(trim(p_slug)) = any (array[
    'home', 'feed', 'battles', 'pickups', 'chat', 'calendar', 'league', 'clubs', 'me', 'locals',
    'membership', 'hq', 'join', 'admin', 'api', 'app', 'login', 'logout', 'settings', 'help',
    'about', 'privacy', 'terms', 'search', 'assets', 'img', 'signin', 'signout', 'auth', 'act', 'webhooks',
    'crews', 'black', 'boroughs', 'i', '404', 'sitemap.xml', 'robots.txt', 'og.jpg', 'favicon.svg', 'site.webmanifest',
    'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', '_app'])
$$;

-- Checked on every write, so create_club and any future path refuse them too.
create or replace function public.check_club_slug()
returns trigger language plpgsql as $$
begin
  if public.is_reserved_slug(new.slug) then raise exception 'SLUG_RESERVED'; end if;
  return new;
end $$;
create trigger clubs_slug_reserved before insert or update of slug on public.clubs
  for each row execute function public.check_club_slug();

-- Club staff (or a moderator) change the address. The old one is kept in
-- audit_log so links can be redirected later.
create or replace function public.rename_club(p_club uuid, p_slug text)
returns public.clubs language plpgsql security definer set search_path = public as $$
declare
  s text := lower(trim(coalesce(p_slug, '')));
  old_slug text;
  c clubs;
begin
  if not (public.is_club_staff(p_club) or public.is_staff('moderator')) then raise exception 'NOT_ALLOWED'; end if;
  if s !~ '^[a-z0-9-]{3,40}$' then raise exception 'BAD_SLUG'; end if;
  if public.is_reserved_slug(s) then raise exception 'SLUG_RESERVED'; end if;
  select * into c from clubs where id = p_club for update;
  if c.id is null then raise exception 'NOT_FOUND'; end if;
  old_slug := c.slug;
  if s = old_slug then return c; end if;
  if exists (select 1 from clubs where slug = s) then raise exception 'SLUG_TAKEN'; end if;
  update clubs set slug = s where id = p_club returning * into c;
  perform public.log_staff_action('rename_club', 'club', p_club::text,
    jsonb_build_object('from', old_slug, 'to', s));
  return c;
end $$;
revoke execute on function public.rename_club(uuid, text) from public, anon;

-- A claim for a club whose name turns into a reserved word gets a short
-- suffix, as a taken slug already does. Otherwise as in part 11.
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
            case when exists (select 1 from clubs where slug = base) or public.is_reserved_slug(base)
                 then base || '-' || substr(md5(random()::text), 1, 4) else base end,
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
revoke execute on function public.review_club_claim(bigint, boolean) from public, anon;

-- ── Join requests ────────────────────────────────────────────────────────────

-- A club with join_policy 'request' says yes to each new member. Open clubs
-- (the default) still let people straight in. An invite code from the club
-- counts as an invitation and skips the request, since staff made it and can
-- delete it.
create table public.club_join_requests (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references public.clubs(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  pace_group  text check (pace_group in ('walk', 'easy', 'steady', 'fast')),
  found_via   text check (char_length(found_via) <= 40),   -- 'Instagram', 'A friend', 'Poster'
  source      public.join_source not null default 'app',
  status      text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at  timestamptz not null default now(),
  decided_by  uuid references public.profiles(id) on delete set null,
  decided_at  timestamptz
);
create unique index club_join_requests_pending_idx
  on public.club_join_requests(club_id, user_id) where status = 'pending';
create index club_join_requests_club_idx on public.club_join_requests(club_id, status, created_at);

alter table public.club_join_requests enable row level security;
revoke all on public.club_join_requests from anon, authenticated;
grant select, delete on public.club_join_requests to authenticated;
create policy "my requests, and club staff" on public.club_join_requests for select to authenticated using (
  user_id = auth.uid() or public.is_club_staff(club_id) or public.is_staff('moderator'));
create policy "withdraw my request" on public.club_join_requests for delete to authenticated using (
  user_id = auth.uid() and status = 'pending');

-- join_club returns 'joined' or 'requested' now, and takes a pace group and
-- how the person found the club. Dropped first because the arguments change.
drop function public.join_club(uuid, public.join_source, text);
create function public.join_club(
  p_club uuid, p_source public.join_source default 'app', p_code text default null,
  p_pace_group text default null, p_found_via text default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  c clubs;
  req uuid;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  select * into c from clubs where id = p_club;
  if c.id is null then raise exception 'NOT_FOUND'; end if;
  if c.status = 'suspended' or exists (select 1 from club_bans where club_id = p_club and user_id = me) then
    raise exception 'CLUB_UNAVAILABLE';
  end if;
  if p_pace_group is not null and p_pace_group not in ('walk', 'easy', 'steady', 'fast') then
    raise exception 'BAD_PACE_GROUP';
  end if;
  if p_code is not null then
    update club_invites set uses = uses + 1
    where code = p_code and club_id = p_club
      and (expires_at is null or expires_at > now())
      and (max_uses is null or uses < max_uses);
    if not found then raise exception 'INVITE_INVALID'; end if;
  end if;

  if public.is_club_member(p_club, me) then
    if p_pace_group is not null then
      update club_members set pace_group = p_pace_group where club_id = p_club and user_id = me;
    end if;
    return 'joined';
  end if;

  if c.join_policy = 'request' and p_code is null then
    select id into req from club_join_requests
    where club_id = p_club and user_id = me and status = 'pending';
    if req is not null then
      update club_join_requests set pace_group = coalesce(p_pace_group, pace_group),
        found_via = coalesce(left(trim(p_found_via), 40), found_via)
      where id = req;
      return 'requested';
    end if;
    insert into club_join_requests (club_id, user_id, pace_group, found_via, source)
    values (p_club, me, p_pace_group, nullif(left(trim(p_found_via), 40), ''), p_source);
    insert into notifications (user_id, kind, title, body, link, actor_id)
    select m.user_id, 'club', 'New join request',
           (select display_name from profiles where id = me) || ' wants to join ' || c.name || '.',
           '/clubs/' || p_club || '/requests', me
    from club_members m where m.club_id = p_club and m.role in ('admin', 'captain');
    return 'requested';
  end if;

  insert into club_members (club_id, user_id, source, pace_group) values (p_club, me, p_source, p_pace_group)
  on conflict do nothing;
  update profiles set home_club_id = coalesce(home_club_id, p_club) where id = me;
  return 'joined';
end $$;
revoke execute on function public.join_club(uuid, public.join_source, text, text, text) from public, anon;

drop function public.join_club_by_code(text);
create function public.join_club_by_code(p_code text, p_pace_group text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select club_id into cid from club_invites where code = lower(p_code);
  if cid is null then raise exception 'INVITE_INVALID'; end if;
  perform public.join_club(cid, 'invite', lower(p_code), p_pace_group);
  return cid;
end $$;
revoke execute on function public.join_club_by_code(text, text) from public, anon;

-- Club staff answer a request. Saying yes adds the member with the pace group
-- they asked for and tells them. Saying no is quiet; the requester can see
-- the status on their own request.
create or replace function public.decide_join_request(p_request uuid, p_approve boolean)
returns public.club_join_requests language plpgsql security definer set search_path = public as $$
declare
  r club_join_requests;
  club_name text;
begin
  select * into r from club_join_requests where id = p_request for update;
  if r.id is null then raise exception 'NOT_FOUND'; end if;
  if not public.is_club_staff(r.club_id) then raise exception 'NOT_ALLOWED'; end if;
  if r.status <> 'pending' then raise exception 'ALREADY_DECIDED'; end if;
  if p_approve then
    if exists (select 1 from club_bans where club_id = r.club_id and user_id = r.user_id) then
      raise exception 'CLUB_UNAVAILABLE';
    end if;
    insert into club_members (club_id, user_id, source, pace_group)
    values (r.club_id, r.user_id, r.source, r.pace_group)
    on conflict (club_id, user_id) do update set pace_group = coalesce(excluded.pace_group, club_members.pace_group);
    update profiles set home_club_id = coalesce(home_club_id, r.club_id) where id = r.user_id;
    select name into club_name from clubs where id = r.club_id;
    perform public.notify(r.user_id, 'club', 'You''re in', 'Welcome to ' || club_name || '.',
                          '/clubs/' || r.club_id, auth.uid());
  end if;
  update club_join_requests set status = case when p_approve then 'approved' else 'declined' end,
    decided_by = auth.uid(), decided_at = now()
  where id = p_request returning * into r;
  return r;
end $$;
revoke execute on function public.decide_join_request(uuid, boolean) from public, anon;

-- ── Club chat ────────────────────────────────────────────────────────────────

alter table public.club_channels
  add column if not exists description text check (char_length(description) <= 200);

-- Reactions follow the message: you see and add them only on messages you
-- can read (members, not hidden, not from someone blocked).
create table public.club_message_reactions (
  message_id  uuid not null references public.club_messages(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  emoji       text not null check (char_length(emoji) between 1 and 16),
  created_at  timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
alter table public.club_message_reactions enable row level security;
revoke all on public.club_message_reactions from anon, authenticated;
grant select, insert, delete on public.club_message_reactions to authenticated;
create policy "reactions on messages I can read" on public.club_message_reactions for select to authenticated using (
  exists (select 1 from public.club_messages m where m.id = message_id));
create policy "react to messages" on public.club_message_reactions for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.club_messages m where m.id = message_id));
create policy "take back my reaction" on public.club_message_reactions for delete to authenticated using (
  user_id = auth.uid());

-- When each member last read each channel. Written through read_channel().
create table public.club_channel_reads (
  channel_id  uuid not null references public.club_channels(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  read_at     timestamptz not null default now(),
  primary key (channel_id, user_id)
);
alter table public.club_channel_reads enable row level security;
revoke all on public.club_channel_reads from anon, authenticated;
grant select on public.club_channel_reads to authenticated;
create policy "my reads" on public.club_channel_reads for select to authenticated using (user_id = auth.uid());

create or replace function public.read_channel(p_channel uuid)
returns void language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select club_id into cid from club_channels where id = p_channel;
  if cid is null or not public.is_club_member(cid) then raise exception 'NOT_ALLOWED'; end if;
  insert into club_channel_reads (channel_id, user_id, read_at) values (p_channel, auth.uid(), now())
  on conflict (channel_id, user_id) do update set read_at = now();
end $$;
revoke execute on function public.read_channel(uuid) from public, anon;

-- Unread messages per channel for the signed in member: other people's
-- messages since they last read it, or since they joined. Runs as the caller,
-- so hidden and blocked messages do not count.
create or replace function public.club_unread(p_club uuid)
returns table (channel_id uuid, unread integer) language sql stable set search_path = public as $$
  select c.id,
         (select count(*)::int from club_messages m
          where m.channel_id = c.id and m.author_id <> auth.uid()
            and m.created_at > coalesce(
              (select r.read_at from club_channel_reads r where r.channel_id = c.id and r.user_id = auth.uid()),
              (select cm.joined_at from club_members cm where cm.club_id = p_club and cm.user_id = auth.uid()),
              'infinity'::timestamptz))
  from club_channels c
  where c.club_id = p_club
  order by c.sort
$$;
revoke execute on function public.club_unread(uuid) from public, anon;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.club_message_reactions;
  end if;
end $$;

-- ── Borough step totals ──────────────────────────────────────────────────────

-- Counted steps per borough per week (weeks start on Monday; days are already
-- London days). Each person counts for the borough on their profile today.
-- Flagged days are left out until reviewed. Reads with the owner's rights so
-- private members still count, but shows only totals, and only to signed in
-- people.
create view public.borough_week_steps as
select b.city_id,
       p.borough_id,
       date_trunc('week', d.day)::date as week_start,
       sum(d.counted)::bigint as counted,
       count(distinct d.user_id)::int as people
from public.daily_steps d
join public.profiles p on p.id = d.user_id
join public.boroughs b on b.id = p.borough_id
where not d.flagged and d.counted > 0 and auth.uid() is not null
group by b.city_id, p.borough_id, date_trunc('week', d.day)::date;
revoke all on public.borough_week_steps from anon, authenticated;
grant select on public.borough_week_steps to authenticated;

-- ── Staff actions ────────────────────────────────────────────────────────────

-- Verify a club by hand (a claim checked outside the app, or a founding club
-- the team knows is real).
create or replace function public.verify_club(p_club uuid)
returns public.clubs language plpgsql security definer set search_path = public as $$
declare
  c clubs;
  was public.club_status;
begin
  if not public.is_staff('moderator') then raise exception 'NOT_ALLOWED'; end if;
  select status into was from clubs where id = p_club for update;
  if was is null then raise exception 'NOT_FOUND'; end if;
  update clubs set status = 'verified', verified_at = coalesce(verified_at, now())
  where id = p_club returning * into c;
  perform public.log_staff_action('verify_club', 'club', p_club::text, jsonb_build_object('from', was));
  if was <> 'verified' then
    insert into notifications (user_id, kind, title, body, link)
    select m.user_id, 'club', c.name || ' is official', 'Outhere has verified your club.', '/clubs/verified/' || c.id
    from club_members m where m.club_id = p_club and m.role in ('admin', 'captain');
  end if;
  return c;
end $$;
revoke execute on function public.verify_club(uuid) from public, anon;

-- Who reviewed a flagged day, and when.
alter table public.daily_steps
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

-- The payouts ingest_steps holds back on a flagged day, with the same keys,
-- so nothing is ever paid twice.
create or replace function public.pay_step_awards(p_user uuid, p_day date)
returns void language plpgsql security definer set search_path = public as $$
declare
  row_ daily_steps;
  goal int;
  i int;
begin
  select * into row_ from daily_steps where user_id = p_user and day = p_day;
  if row_.user_id is null or row_.flagged then return; end if;
  for i in 1..(row_.counted / 1000) loop
    perform public.award(p_user, format('steps:%s:%s:%s', p_user, p_day, i), 'Steps', 'steps', 5);
  end loop;
  if row_.steps >= 3000 then
    perform public.award(p_user, format('active:%s:%s', p_user, p_day), 'Active day', 'active_day', 50, 5);
  end if;
  select daily_goal into goal from profiles where id = p_user;
  if row_.steps >= goal then
    perform public.award(p_user, format('goal:%s:%s', p_user, p_day), 'Daily goal hit', 'goal', 40, 4);
  end if;
  perform public.refresh_streak(p_user);
end $$;
revoke execute on function public.pay_step_awards(uuid, date) from public, anon, authenticated;

-- Review a flagged day. OK clears the flag and pays what was held. Not OK
-- keeps the flag, so the day stays out of leagues, battles and totals.
create or replace function public.review_steps(p_user uuid, p_day date, p_ok boolean)
returns public.daily_steps language plpgsql security definer set search_path = public as $$
declare row_ daily_steps;
begin
  if not public.is_staff('moderator') then raise exception 'NOT_ALLOWED'; end if;
  update daily_steps set flagged = not p_ok, reviewed_by = auth.uid(), reviewed_at = now()
  where user_id = p_user and day = p_day returning * into row_;
  if row_.user_id is null then raise exception 'NOT_FOUND'; end if;
  if p_ok then perform public.pay_step_awards(p_user, p_day); end if;
  perform public.log_staff_action('review_steps', 'steps', p_user::text || ':' || p_day::text,
    jsonb_build_object('ok', p_ok, 'steps', row_.steps));
  return row_;
end $$;
revoke execute on function public.review_steps(uuid, date, boolean) from public, anon;

-- Take someone out of a fixture's squad (fair play). Only before the reveal;
-- after that the scores are fixed.
create or replace function public.remove_from_squad(p_fixture uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare f fixtures;
begin
  if not public.is_staff('moderator') then raise exception 'NOT_ALLOWED'; end if;
  select * into f from fixtures where id = p_fixture for update;
  if f.id is null then raise exception 'NOT_FOUND'; end if;
  if f.revealed_at is not null then raise exception 'FIXTURE_SETTLED'; end if;
  delete from squad_members where fixture_id = p_fixture and user_id = p_user;
  if not found then raise exception 'NOT_IN_SQUAD'; end if;
  perform public.log_staff_action('remove_from_squad', 'fixture', p_fixture::text,
    jsonb_build_object('user_id', p_user));
end $$;
revoke execute on function public.remove_from_squad(uuid, uuid) from public, anon;

-- Hold a season's reveal while something is checked. Admins only, since it
-- moves the Sunday night moment for everyone.
alter table public.seasons add column if not exists reveal_held boolean not null default false;

create or replace function public.set_reveal_held(p_season uuid, p_held boolean)
returns public.seasons language plpgsql security definer set search_path = public as $$
declare s seasons;
begin
  if not public.is_staff('admin') then raise exception 'NOT_ALLOWED'; end if;
  update seasons set reveal_held = p_held where id = p_season returning * into s;
  if s.id is null then raise exception 'NOT_FOUND'; end if;
  perform public.log_staff_action('set_reveal_held', 'season', p_season::text, jsonb_build_object('held', p_held));
  return s;
end $$;
revoke execute on function public.set_reveal_held(uuid, boolean) from public, anon;

-- The scheduler skips fixtures in a held season. Otherwise as in part 11.
create or replace function public.settle_due_fixtures()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  n int := 0;
  local_now timestamp := now() at time zone 'Europe/London';
begin
  for r in select f.id from fixtures f
           where f.revealed_at is null and f.drawn_at is not null
             and (f.ends_on < local_now::date or (f.ends_on = local_now::date and local_now::time >= '20:00'))
             and not exists (select 1 from divisions d join seasons s on s.id = d.season_id
                             where d.id = f.division_id and s.reveal_held)
  loop
    perform public.settle_fixture(r.id);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.settle_due_fixtures() from public, anon, authenticated;

-- ── Badges ───────────────────────────────────────────────────────────────────

-- The set of badges, and who has earned which. Only the server awards them
-- (award_badge, called from the triggers below). Anyone signed in can see a
-- member's badges if they can see that member's profile, so a private
-- profile keeps its badges private too.
create table public.badges (
  id          text primary key check (id ~ '^[a-z0-9_]{2,40}$'),
  label       text not null check (char_length(label) between 1 and 40),
  description text check (char_length(description) <= 160),
  art_path    text,                              -- app asset path
  sort        integer not null default 0
);

create table public.member_badges (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  badge_id    text not null references public.badges(id) on delete cascade,
  earned_at   timestamptz not null default now(),
  primary key (user_id, badge_id)
);
create index member_badges_badge_idx on public.member_badges(badge_id);

alter table public.badges enable row level security;
alter table public.member_badges enable row level security;
revoke all on public.badges, public.member_badges from anon, authenticated;
grant select on public.badges, public.member_badges to authenticated;
create policy "badges are for members" on public.badges for select to authenticated using (true);
create policy "badges of profiles I can see" on public.member_badges for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = member_badges.user_id));

insert into public.badges (id, label, description, art_path, sort) values
  ('first_run',       'First run',       'Saved your first run.',                        'badges/first_run.png',       10),
  ('ten_k_club',      '10k club',        '10,000 steps in a day.',                       'badges/ten_k_club.png',      20),
  ('night_owl',       'Night owl',       'A run started after 10pm.',                    'badges/night_owl.png',       30),
  ('streak_7',        '7 day streak',    'Seven days in a row with 3,000 steps or more.', 'badges/streak_7.png',        40),
  ('streak_30',       '30 day streak',   'Thirty days in a row with 3,000 steps or more.', 'badges/streak_30.png',      50),
  ('marathon_month',  'Marathon month',  'Ran 42.2 km in one calendar month.',           'badges/marathon_month.png',  60),
  ('founding_member', 'Founding member', 'One of the Founding 500.',                     'badges/founding_member.png', 70)
on conflict (id) do nothing;

-- Award a badge once. Returns true when it is new.
create or replace function public.award_badge(p_user uuid, p_badge text)
returns boolean language plpgsql security definer set search_path = public as $$
declare label_ text;
begin
  select label into label_ from badges where id = p_badge;
  if label_ is null then raise exception 'NOT_FOUND'; end if;
  insert into member_badges (user_id, badge_id) values (p_user, p_badge) on conflict do nothing;
  if not found then return false; end if;
  perform public.notify(p_user, 'badge', 'New badge: ' || label_, null, '/me/badges');
  return true;
end $$;
revoke execute on function public.award_badge(uuid, text) from public, anon, authenticated;

create or replace function public.badges_for_run()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  local_start timestamp := new.started_at at time zone 'Europe/London';
  month_m bigint;
begin
  if new.kind = 'walk' then return null; end if;
  perform public.award_badge(new.user_id, 'first_run');
  if extract(hour from local_start) >= 22 or extract(hour from local_start) < 4 then
    perform public.award_badge(new.user_id, 'night_owl');
  end if;
  select coalesce(sum(distance_m), 0) into month_m from runs
  where user_id = new.user_id and kind <> 'walk'
    and date_trunc('month', started_at at time zone 'Europe/London') = date_trunc('month', local_start);
  if month_m >= 42195 then perform public.award_badge(new.user_id, 'marathon_month'); end if;
  return null;
end $$;
create trigger runs_badges after insert on public.runs
  for each row execute function public.badges_for_run();

create or replace function public.badges_for_steps()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not new.flagged and new.steps >= 10000 then
    perform public.award_badge(new.user_id, 'ten_k_club');
  end if;
  return null;
end $$;
create trigger daily_steps_badges after insert or update of steps, flagged on public.daily_steps
  for each row execute function public.badges_for_steps();

create or replace function public.badges_for_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.streak_days >= 7 then perform public.award_badge(new.id, 'streak_7'); end if;
  if new.streak_days >= 30 then perform public.award_badge(new.id, 'streak_30'); end if;
  if new.founding_number is not null then perform public.award_badge(new.id, 'founding_member'); end if;
  return null;
end $$;
create trigger profiles_badges after update of streak_days, founding_number on public.profiles
  for each row
  when (new.streak_days >= 7 or new.founding_number is not null)
  execute function public.badges_for_profile();

revoke execute on function public.badges_for_run() from public, anon, authenticated;
revoke execute on function public.badges_for_steps() from public, anon, authenticated;
revoke execute on function public.badges_for_profile() from public, anon, authenticated;

-- ── Pick-ups ─────────────────────────────────────────────────────────────────

-- What a pick-up (or any event) is: a run, a walk or a race. Members can only
-- post kind 'pickup', so this is how a walk reads back as a walk.
alter table public.events
  add column if not exists activity text not null default 'run'
    check (activity in ('run', 'walk', 'race'));
update public.events set activity = case kind when 'walk' then 'walk' when 'race' then 'race' else 'run' end
where activity = 'run' and kind in ('walk', 'race');

-- ── Battles ──────────────────────────────────────────────────────────────────

-- Stakes in words ('Loser buys the coffees'), and five day battles.
-- Open ended last one standing is not here: it needs ends_at and the
-- scheduler to work without an end time, which is more than a check change.
alter table public.battles
  add column if not exists stake_note text check (char_length(stake_note) <= 80);
alter table public.battles drop constraint battles_duration_h_check;
alter table public.battles add constraint battles_duration_h_check
  check (duration_h in (1, 2, 6, 12, 24, 72, 120, 168));

-- create_battle takes the stake note. Otherwise as in part 4.
drop function public.create_battle(uuid, public.battle_mode, integer, integer, integer, uuid);
create function public.create_battle(
  p_opponent uuid, p_mode public.battle_mode default 'most_steps',
  p_duration_h integer default 24, p_distance_m integer default null,
  p_stake_out integer default 0, p_route_run uuid default null,
  p_stake_note text default null)
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

  insert into battles (mode, challenger_id, opponent_id, duration_h, distance_m, stake_out, route_run_id, stake_note)
  values (p_mode, me, p_opponent,
          case when p_mode in ('most_steps', 'last_one_standing', 'hold_the_route') then coalesce(p_duration_h, 24) end,
          p_distance_m, p_stake_out, p_route_run, nullif(trim(p_stake_note), ''))
  returning * into b;

  if p_stake_out > 0 then
    perform public.award(me, 'stake:' || b.id || ':' || me, 'Battle stake held', 'battle_stake',
                         0, -p_stake_out, 'battle', b.id::text);
  end if;
  perform public.notify(p_opponent, 'battle', 'New challenge',
    (select display_name from profiles where id = me) || ' wants a battle.', '/battles/' || b.id, me);
  return b;
end $$;
revoke execute on function public.create_battle(uuid, public.battle_mode, integer, integer, integer, uuid, text) from public, anon;

-- respond_battle now tells the challenger when they are turned down.
-- Otherwise as in part 4.
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
    perform public.notify(b.challenger_id, 'battle', 'Challenge declined',
      (select display_name from profiles where id = me) || ' passed this time.'
        || case when b.stake_out > 0 then ' Your stake is back.' else '' end,
      '/battles/' || b.id, me);
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
    (select display_name from profiles where id = me) || ' is in. Go.', '/battles/' || b.id, me);
  return b;
end $$;
