-- Outhere schema, part 2: run clubs, meetups and events.
--
-- Every crew on Outhere is a real run club. A founding club becomes official
-- after 3 meetups within 6 weeks, with 6 or more at each and 10 different
-- verified people across them. Only a verified club can claim its crew.

create type public.club_status as enum ('founding', 'verified', 'suspended');
create type public.club_role as enum ('member', 'admin', 'captain');
create type public.join_source as enum ('app', 'web', 'invite', 'qr');
create type public.event_kind as enum ('club_run', 'open_run', 'walk', 'race', 'city_moment', 'pickup');
create type public.visibility as enum ('public', 'members', 'private');

create table public.clubs (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),  -- weouthere.app/<slug>
  name          text not null check (char_length(name) between 3 and 50),
  tagline       text check (char_length(tagline) <= 120),
  description   text check (char_length(description) <= 2000),
  city_id       text not null references public.cities(id),
  borough_id    text references public.boroughs(id),
  status        public.club_status not null default 'founding',
  verified_at   timestamptz,
  logo_path     text,                            -- storage 'club-media'
  cover_path    text,
  accent        text not null default '#3d8bff' check (accent ~ '^#[0-9a-fA-F]{6}$'),
  meeting_place text,
  meeting_lat   double precision,
  meeting_lng   double precision,
  usual_times   text,                            -- 'Tue 7pm, Sat 8am'
  instagram     text,
  member_count  integer not null default 0,
  created_by    uuid not null references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index clubs_city_idx on public.clubs(city_id);
create index clubs_status_idx on public.clubs(status);
create trigger clubs_touch before update on public.clubs
  for each row execute function public.touch_updated_at();

alter table public.profiles
  add constraint profiles_home_club_fk foreign key (home_club_id)
  references public.clubs(id) on delete set null;

create table public.club_members (
  club_id     uuid not null references public.clubs(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        public.club_role not null default 'member',
  source      public.join_source not null default 'app',
  joined_at   timestamptz not null default now(),
  primary key (club_id, user_id)
);
create index club_members_user_idx on public.club_members(user_id);

create or replace function public.is_club_member(cid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from club_members where club_id = cid and user_id = uid)
$$;

create or replace function public.club_role_of(cid uuid, uid uuid default auth.uid())
returns public.club_role language sql stable security definer set search_path = public as $$
  select role from club_members where club_id = cid and user_id = uid
$$;

create or replace function public.is_club_staff(cid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.club_role_of(cid, uid) in ('admin', 'captain'), false)
$$;

create or replace function public.sync_club_member_count()
returns trigger language plpgsql security definer set search_path = public as $$
declare cid uuid := coalesce(new.club_id, old.club_id);
begin
  update clubs set member_count = (select count(*) from club_members where club_id = cid)
  where id = cid;
  return null;
end $$;
create trigger club_members_count after insert or delete on public.club_members
  for each row execute function public.sync_club_member_count();

-- People a club has removed. They are not told; they simply can't rejoin.
create table public.club_bans (
  club_id     uuid not null references public.clubs(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  banned_by   uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  primary key (club_id, user_id)
);

-- Invite codes back the QR join page and per-poster codes.
create table public.club_invites (
  code        text primary key default lower(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  club_id     uuid not null references public.clubs(id) on delete cascade,
  label       text,                              -- 'Poster, Peckham Rye café'
  created_by  uuid not null references public.profiles(id),
  uses        integer not null default 0,
  max_uses    integer,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index club_invites_club_idx on public.club_invites(club_id);

-- ── Events and meetups ───────────────────────────────────────────────────────

-- One table covers club runs, open runs, pick-ups and big city moments, so
-- the calendar, the feed and check-ins all read from one place. Pick-ups must
-- meet in a public place.
create table public.events (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid references public.clubs(id) on delete cascade,
  city_id       text not null references public.cities(id),
  kind          public.event_kind not null default 'club_run',
  title         text not null check (char_length(title) between 3 and 80),
  description   text check (char_length(description) <= 2000),
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  place_name    text not null,
  lat           double precision,
  lng           double precision,
  distance_m    integer,
  pace_label    text,                            -- 'Easy 6:30/km'
  capacity      integer check (capacity > 0),
  tier_required public.tier not null default 'free',
  visibility    public.visibility not null default 'public',
  cover_path    text,
  created_by    uuid not null references public.profiles(id),
  cancelled_at  timestamptz,
  created_at    timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create index events_city_time_idx on public.events(city_id, starts_at);
create index events_club_time_idx on public.events(club_id, starts_at);

-- The check-in code lives apart from the event so attendees can't read it
-- before they arrive.
create table public.event_codes (
  event_id    uuid primary key references public.events(id) on delete cascade,
  code        text not null default lower(substr(encode(gen_random_bytes(4), 'hex'), 1, 6))
);

create or replace function public.make_event_code()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into event_codes (event_id) values (new.id);
  return new;
end $$;
create trigger events_make_code after insert on public.events
  for each row execute function public.make_event_code();

create table public.event_rsvps (
  event_id      uuid not null references public.events(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'going' check (status in ('going', 'checked_in')),
  checked_in_at timestamptz,
  created_at    timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_rsvps_user_idx on public.event_rsvps(user_id);

-- ── Founding progress ────────────────────────────────────────────────────────

-- How close a founding club is to becoming official. A meetup counts when it
-- is a club_run with 6+ checked in; people count when their trust is
-- verified or established.
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
  join public.profiles p on p.id = r.user_id and p.trust in ('verified', 'established')
  where e.kind = 'club_run' and e.starts_at > now() - interval '6 weeks'
  group by e.club_id
)
select c.id as club_id,
       coalesce((select count(*) from meetups m where m.club_id = c.id), 0)::int as qualifying_meetups,
       coalesce((select verified_people from people p where p.club_id = c.id), 0)::int as verified_people,
       3 as meetups_needed,
       10 as people_needed
from public.clubs c;

-- ── Functions ────────────────────────────────────────────────────────────────

create or replace function public.create_club(
  p_name text, p_slug text, p_city text, p_borough text default null,
  p_tagline text default null, p_meeting_place text default null, p_usual_times text default null)
returns public.clubs language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  c clubs;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if (select count(*) from clubs where created_by = me and status <> 'suspended') >= 3 then
    raise exception 'CLUB_LIMIT' using hint = 'You can start up to 3 clubs.';
  end if;
  insert into clubs (name, slug, city_id, borough_id, tagline, meeting_place, usual_times, created_by)
  values (p_name, lower(p_slug), p_city, p_borough, p_tagline, p_meeting_place, p_usual_times, me)
  returning * into c;
  insert into club_members (club_id, user_id, role) values (c.id, me, 'captain');
  update profiles set home_club_id = coalesce(home_club_id, c.id) where id = me;
  return c;
end $$;

create or replace function public.join_club(p_club uuid, p_source public.join_source default 'app', p_code text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if exists (select 1 from club_bans where club_id = p_club and user_id = me) then
    raise exception 'CLUB_UNAVAILABLE';
  end if;
  if p_code is not null then
    update club_invites set uses = uses + 1
    where code = p_code and club_id = p_club
      and (expires_at is null or expires_at > now())
      and (max_uses is null or uses < max_uses);
    if not found then raise exception 'INVITE_INVALID'; end if;
  end if;
  insert into club_members (club_id, user_id, source) values (p_club, me, p_source)
  on conflict do nothing;
  update profiles set home_club_id = coalesce(home_club_id, p_club) where id = me;
end $$;

create or replace function public.join_club_by_code(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  select club_id into cid from club_invites where code = lower(p_code);
  if cid is null then raise exception 'INVITE_INVALID'; end if;
  perform public.join_club(cid, 'invite', lower(p_code));
  return cid;
end $$;

create or replace function public.leave_club(p_club uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if public.club_role_of(p_club, me) = 'captain'
     and (select count(*) from club_members where club_id = p_club and role = 'captain') = 1
     and (select count(*) from club_members where club_id = p_club) > 1 then
    raise exception 'LAST_CAPTAIN' using hint = 'Hand the captaincy to someone first.';
  end if;
  delete from club_members where club_id = p_club and user_id = me;
  update profiles set home_club_id = null where id = me and home_club_id = p_club;
end $$;

create or replace function public.remove_club_member(p_club uuid, p_user uuid, p_ban boolean default false)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_club_staff(p_club) then raise exception 'NOT_ALLOWED'; end if;
  if public.club_role_of(p_club, p_user) = 'captain' then raise exception 'NOT_ALLOWED'; end if;
  delete from club_members where club_id = p_club and user_id = p_user;
  if p_ban then
    insert into club_bans (club_id, user_id, banned_by) values (p_club, p_user, auth.uid())
    on conflict do nothing;
  end if;
end $$;

create or replace function public.set_club_role(p_club uuid, p_user uuid, p_role public.club_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.club_role_of(p_club) <> 'captain' then raise exception 'NOT_ALLOWED'; end if;
  update club_members set role = p_role where club_id = p_club and user_id = p_user;
  if not found then raise exception 'NOT_A_MEMBER'; end if;
end $$;

create or replace function public.rsvp_event(p_event uuid, p_going boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  e events;
  going int;
  my_tier tier;
begin
  select * into e from events where id = p_event;
  if e.id is null or e.cancelled_at is not null then raise exception 'EVENT_NOT_FOUND'; end if;
  if not p_going then
    delete from event_rsvps where event_id = p_event and user_id = me and status = 'going';
    return;
  end if;
  select tier into my_tier from profiles where id = me;
  if my_tier < e.tier_required then raise exception 'TIER_REQUIRED' using hint = e.tier_required::text; end if;
  if e.visibility = 'members' and e.club_id is not null and not public.is_club_member(e.club_id, me) then
    raise exception 'MEMBERS_ONLY';
  end if;
  select count(*) into going from event_rsvps where event_id = p_event;
  if e.capacity is not null and going >= e.capacity
     and not exists (select 1 from event_rsvps where event_id = p_event and user_id = me) then
    raise exception 'EVENT_FULL';
  end if;
  insert into event_rsvps (event_id, user_id) values (p_event, me) on conflict do nothing;
end $$;

-- Check in on the night with the code shown by the captain (or scanned).
create or replace function public.check_in_event(p_event uuid, p_code text)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  e events;
begin
  select * into e from events where id = p_event;
  if e.id is null then raise exception 'EVENT_NOT_FOUND'; end if;
  if lower(p_code) is distinct from (select code from event_codes where event_id = p_event) then raise exception 'CODE_INVALID'; end if;
  if now() < e.starts_at - interval '30 minutes'
     or now() > coalesce(e.ends_at, e.starts_at + interval '3 hours') + interval '1 hour' then
    raise exception 'CHECK_IN_CLOSED';
  end if;
  insert into event_rsvps (event_id, user_id, status, checked_in_at)
  values (p_event, me, 'checked_in', now())
  on conflict (event_id, user_id) do update set status = 'checked_in', checked_in_at = now();
end $$;

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.club_bans enable row level security;
alter table public.club_invites enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.event_codes enable row level security;

create policy "organisers read check-in codes" on public.event_codes for select using (
  exists (select 1 from public.events e where e.id = event_id
          and (e.created_by = auth.uid() or (e.club_id is not null and public.is_club_staff(e.club_id)))));

-- Club pages are public (weouthere.app/<club>).
create policy "clubs are public" on public.clubs for select using (status <> 'suspended' or public.is_staff());
create policy "club staff edit their club" on public.clubs for update
  using (public.is_club_staff(id) or public.is_staff('moderator'))
  with check (public.is_club_staff(id) or public.is_staff('moderator'));
revoke update on public.clubs from anon, authenticated;
grant update (name, tagline, description, borough_id, logo_path, cover_path, accent,
              meeting_place, meeting_lat, meeting_lng, usual_times, instagram)
  on public.clubs to authenticated;

create policy "members are visible to signed in people" on public.club_members for select
  to authenticated using (true);

create policy "club staff see bans" on public.club_bans for select using (public.is_club_staff(club_id));

create policy "club staff see invites" on public.club_invites for select using (public.is_club_staff(club_id));
create policy "club staff make invites" on public.club_invites for insert
  with check (public.is_club_staff(club_id) and created_by = auth.uid());
create policy "club staff delete invites" on public.club_invites for delete using (public.is_club_staff(club_id));

create policy "events people can see" on public.events for select using (
  visibility = 'public'
  or created_by = auth.uid()
  or (visibility = 'members' and club_id is not null and public.is_club_member(club_id))
  or public.is_staff());
create policy "club staff create events" on public.events for insert with check (
  created_by = auth.uid()
  and (
    (club_id is not null and public.is_club_staff(club_id))
    or (club_id is null and kind = 'pickup')
    or public.is_staff('moderator')));
create policy "organisers edit events" on public.events for update using (
  created_by = auth.uid() or (club_id is not null and public.is_club_staff(club_id)) or public.is_staff('moderator'));
create policy "organisers delete events" on public.events for delete using (
  created_by = auth.uid() or (club_id is not null and public.is_club_staff(club_id)) or public.is_staff('moderator'));

create policy "rsvps visible to signed in people" on public.event_rsvps for select
  to authenticated using (true);
