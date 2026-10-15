-- Outhere schema, part 16: the rest of what the web app and the admin need
-- (SCHEMA_GAPS.md, second pass).
--
-- - Members: season and week points, and the top three in each area.
-- - Clubs: covers, a gallery, QR scans traced to check-ins, run crew, public
--   leaders, turnout and fund totals, and channels only leaders can read.
-- - Money: fund spending, a treasurer, kit numbers, answering Locals offers
--   and the plans in one table.
-- - Leagues: table history at each reveal, squad numbers and places, and a
--   side's average, turnout and score apart.
-- - Pick-ups: nearby search, open battles and Locals pick-ups.
-- - Staff: daily actives, and verification evidence with manual checks.
--
-- Left out on purpose: open ended last one standing (needs the scheduler to
-- work without an end time), typing (Realtime presence) and health numbers
-- (monitoring). City pictures and active counts came in part 15b.

-- ── Shared helpers ───────────────────────────────────────────────────────────

-- Whether the signed in person may see this member's full profile. The same
-- rule as the profiles policy, for views that read with their owner's rights.
create or replace function public.can_see_profile(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p where p.id = p_user and (
    p.public_profile or p.id = auth.uid() or public.is_staff() or public.are_friends(auth.uid(), p.id)))
$$;

-- ── Members: points ──────────────────────────────────────────────────────────

-- Season points are the XP a member earned between a season's first and last
-- day (London days), so the feed's week points and the season total come from
-- the same place. Shown only where the member's profile can be seen.
create view public.member_season_points as
select l.user_id, s.id as season_id, s.kind, s.name as season_name, s.starts_on, s.ends_on,
       sum(l.amount)::int as points
from public.ledger l
join public.seasons s on (l.created_at at time zone 'Europe/London')::date between s.starts_on and s.ends_on
where l.currency = 'xp' and public.can_see_profile(l.user_id)
group by l.user_id, s.id, s.kind, s.name, s.starts_on, s.ends_on;

create view public.member_week_points as
select l.user_id, date_trunc('week', (l.created_at at time zone 'Europe/London'))::date as week_start,
       sum(l.amount)::int as points
from public.ledger l
where l.currency = 'xp' and public.can_see_profile(l.user_id)
group by l.user_id, 2;

revoke all on public.member_season_points, public.member_week_points from anon, authenticated;
grant select on public.member_season_points, public.member_week_points to anon, authenticated;

-- The top three walkers in each area this week (Monday to Sunday), only from
-- members with a public profile. Unflagged counted steps, signed in only, the
-- same as the borough totals.
create view public.area_leaders as
with wk as (select date_trunc('week', public.london_today())::date as start),
totals as (
  select b.city_id, p.borough_id, d.user_id, sum(d.counted)::int as counted
  from public.daily_steps d
  join public.profiles p on p.id = d.user_id and p.public_profile
  join public.boroughs b on b.id = p.borough_id
  where d.day >= (select start from wk) and not d.flagged and d.counted > 0
  group by b.city_id, p.borough_id, d.user_id),
ranked as (
  select t.*, row_number() over (partition by t.borough_id order by t.counted desc, t.user_id) as rank
  from totals t)
select r.city_id, r.borough_id, (select start from wk) as week_start, r.rank::int as rank,
       r.user_id, p.username, p.display_name, p.avatar_path, p.tier, r.counted
from ranked r
join public.profiles p on p.id = r.user_id
where r.rank <= 3 and auth.uid() is not null;
revoke all on public.area_leaders from anon, authenticated;
grant select on public.area_leaders to authenticated;

-- ── Clubs: covers and gallery ────────────────────────────────────────────────

-- Files live in the public club-media bucket under <club_id>/covers/ and
-- <club_id>/gallery/; these rows list them so a page needs no storage listing.
create table public.club_covers (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references public.clubs(id) on delete cascade,
  path        text not null unique check (char_length(path) <= 200),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  check (split_part(path, '/', 1) = club_id::text and split_part(path, '/', 2) = 'covers' and split_part(path, '/', 3) <> '')
);
create index club_covers_club_idx on public.club_covers(club_id, created_at desc);

create table public.club_gallery (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references public.clubs(id) on delete cascade,
  path        text not null unique check (char_length(path) <= 200),
  alt         text check (char_length(alt) <= 200),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  check (split_part(path, '/', 1) = club_id::text and split_part(path, '/', 2) = 'gallery' and split_part(path, '/', 3) <> '')
);
create index club_gallery_club_idx on public.club_gallery(club_id, created_at desc);

alter table public.club_covers enable row level security;
alter table public.club_gallery enable row level security;
revoke all on public.club_covers, public.club_gallery from anon, authenticated;
grant select on public.club_covers, public.club_gallery to anon, authenticated;
grant insert, delete on public.club_covers, public.club_gallery to authenticated;
grant update (alt) on public.club_gallery to authenticated;

-- Readable wherever the club page is (not suspended); club staff add and remove.
create policy "covers of clubs people can see" on public.club_covers for select using (
  exists (select 1 from public.clubs c where c.id = club_id));
create policy "club staff add covers" on public.club_covers for insert to authenticated with check (
  public.is_club_staff(club_id) and created_by = auth.uid());
create policy "club staff remove covers" on public.club_covers for delete to authenticated using (
  public.is_club_staff(club_id) or public.is_staff('moderator'));

create policy "gallery of clubs people can see" on public.club_gallery for select using (
  exists (select 1 from public.clubs c where c.id = club_id));
create policy "club staff add photos" on public.club_gallery for insert to authenticated with check (
  public.is_club_staff(club_id) and created_by = auth.uid());
create policy "club staff edit photos" on public.club_gallery for update to authenticated
  using (public.is_club_staff(club_id)) with check (public.is_club_staff(club_id));
create policy "club staff remove photos" on public.club_gallery for delete to authenticated using (
  public.is_club_staff(club_id) or public.is_staff('moderator'));

-- Club staff could only upload club media; now they can replace and remove
-- it too, so a dropped cover or photo can go.
do $$
begin
  if to_regclass('storage.objects') is null then return; end if;
  execute $p$
    create policy "club staff replace club media" on storage.objects for update to authenticated
      using (bucket_id = 'club-media' and public.is_club_staff(((storage.foldername(name))[1])::uuid))
  $p$;
  execute $p$
    create policy "club staff delete club media" on storage.objects for delete to authenticated
      using (bucket_id = 'club-media' and public.is_club_staff(((storage.foldername(name))[1])::uuid))
  $p$;
end $$;

-- ── Clubs: QR codes ──────────────────────────────────────────────────────────

-- Each scan of a poster's code, and which code a member joined with, so a
-- check-in can be traced back to a poster.
create table public.club_invite_scans (
  id          bigint generated always as identity primary key,
  code        text not null references public.club_invites(code) on delete cascade,
  scanned_at  timestamptz not null default now()
);
create index club_invite_scans_code_idx on public.club_invite_scans(code, scanned_at);

alter table public.club_members
  add column if not exists invite_code text references public.club_invites(code) on delete set null;

alter table public.club_invite_scans enable row level security;
revoke all on public.club_invite_scans from anon, authenticated;
grant select on public.club_invite_scans to authenticated;
create policy "club staff see scans" on public.club_invite_scans for select to authenticated using (
  exists (select 1 from public.club_invites i where i.code = club_invite_scans.code and public.is_club_staff(i.club_id)));

-- The QR join page calls this when it opens, signed in or not. Returns the
-- club the code belongs to.
create or replace function public.record_invite_scan(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  i club_invites;
begin
  select * into i from club_invites where code = lower(trim(p_code))
    and (expires_at is null or expires_at > now());
  if i.code is null then raise exception 'INVITE_INVALID'; end if;
  insert into club_invite_scans (code) values (i.code);
  return i.club_id;
end $$;
grant execute on function public.record_invite_scan(text) to anon, authenticated;

-- Per code: joins, scans and how many who joined with it have come to a club
-- run. Reads as the caller, so only club staff see their club's codes.
create view public.club_invite_stats with (security_invoker = true) as
select i.code, i.club_id, i.label, i.uses,
       (select count(*)::int from public.club_invite_scans s where s.code = i.code) as scans,
       (select count(distinct m.user_id)::int from public.club_members m
        join public.event_rsvps r on r.user_id = m.user_id and r.status = 'checked_in'
        join public.events e on e.id = r.event_id and e.club_id = i.club_id and e.kind = 'club_run'
        where m.club_id = i.club_id and m.invite_code = i.code) as came_to_run
from public.club_invites i;

-- join_club remembers the code a member joined with. Otherwise as in part 13.
create or replace function public.join_club(
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

  insert into club_members (club_id, user_id, source, pace_group, invite_code)
  values (p_club, me, p_source, p_pace_group, p_code)
  on conflict do nothing;
  update profiles set home_club_id = coalesce(home_club_id, p_club) where id = me;
  return 'joined';
end $$;
revoke execute on function public.join_club(uuid, public.join_source, text, text, text) from public, anon;

-- ── Clubs: run crew ──────────────────────────────────────────────────────────

-- Who leads a run and who sweeps at the back.
create table public.event_crew (
  event_id    uuid not null references public.events(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null check (role in ('leader', 'back_marker')),
  created_at  timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index event_crew_user_idx on public.event_crew(user_id);

-- The organiser of an event: who made it, its club's staff, or a moderator.
create or replace function public.can_organise_event(p_event uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from events e where e.id = p_event and (
    e.created_by = auth.uid()
    or (e.club_id is not null and public.is_club_staff(e.club_id))
    or public.is_staff('moderator')))
$$;

-- Crew on a club run must be in the club.
create or replace function public.crew_can_join(p_event uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from events e where e.id = p_event
                 and (e.club_id is null or public.is_club_member(e.club_id, p_user)))
$$;

alter table public.event_crew enable row level security;
revoke all on public.event_crew from anon, authenticated;
grant select on public.event_crew to anon, authenticated;
grant insert, update, delete on public.event_crew to authenticated;
create policy "crew of events people can see" on public.event_crew for select using (
  exists (select 1 from public.events e where e.id = event_id));
create policy "organisers pick the crew" on public.event_crew for insert to authenticated with check (
  public.can_organise_event(event_id) and public.crew_can_join(event_id, user_id));
create policy "organisers change the crew" on public.event_crew for update to authenticated
  using (public.can_organise_event(event_id)) with check (public.can_organise_event(event_id));
create policy "organisers and crew step down" on public.event_crew for delete to authenticated using (
  public.can_organise_event(event_id) or user_id = auth.uid());

-- ── Clubs: what signed out visitors see ──────────────────────────────────────

-- A treasurer, set only by a captain through set_club_treasurer.
alter table public.clubs
  add column if not exists treasurer_id uuid references public.profiles(id) on delete set null;

-- These read with their owner's rights so the public club page has leaders,
-- turnout and money raised. They show only these columns, and never a
-- suspended club.
create view public.club_leaders as
select m.club_id, m.user_id, m.role, coalesce(c.treasurer_id = m.user_id, false) as treasurer,
       p.username, p.display_name, p.avatar_path, p.tier
from public.club_members m
join public.clubs c on c.id = m.club_id and c.status <> 'suspended'
join public.profiles p on p.id = m.user_id
where m.role in ('captain', 'admin') or c.treasurer_id = m.user_id;

-- Share of members checked in to at least one club run that week (Monday to
-- Sunday, London), against today's member count.
create view public.club_turnout_weeks as
select e.club_id,
       date_trunc('week', (e.starts_at at time zone 'Europe/London'))::date as week_start,
       least(100, round(100.0 * count(distinct r.user_id) filter (where m.user_id is not null)
                        / greatest(c.member_count, 1), 1)) as turnout_pct
from public.events e
join public.clubs c on c.id = e.club_id and c.status <> 'suspended'
left join public.event_rsvps r on r.event_id = e.id and r.status = 'checked_in'
left join public.club_members m on m.club_id = e.club_id and m.user_id = r.user_id
where e.kind = 'club_run' and e.cancelled_at is null and e.starts_at <= now()
group by e.club_id, 2, c.member_count;

-- Everything a club has raised, all time.
create view public.club_fund_totals as
select c.id as club_id, coalesce(sum(f.amount_pence), 0)::bigint as total_pence
from public.clubs c
left join public.club_fund_entries f on f.club_id = c.id
where c.status <> 'suspended'
group by c.id;

revoke all on public.club_leaders, public.club_turnout_weeks, public.club_fund_totals from anon, authenticated;
grant select on public.club_leaders, public.club_turnout_weeks, public.club_fund_totals to anon, authenticated;

-- ── Club chat: leaders only channels ─────────────────────────────────────────

-- A channel with staff_only_read is for captains and admins: members do not
-- see it, cannot read it and cannot post in it.
alter table public.club_channels
  add column if not exists staff_only_read boolean not null default false;

create or replace function public.can_read_channel(p_channel uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from club_channels c where c.id = p_channel
                 and public.is_club_member(c.club_id, p_user)
                 and (not c.staff_only_read or public.is_club_staff(c.club_id, p_user)))
$$;

drop policy "members see channels" on public.club_channels;
create policy "members see channels" on public.club_channels for select using (
  public.is_club_member(club_id) and (not staff_only_read or public.is_club_staff(club_id)));

drop policy "members read chat" on public.club_messages;
create policy "members read chat" on public.club_messages for select using (
  public.is_club_member(club_id) and public.can_read_channel(channel_id)
  and hidden_at is null and not public.is_blocked(auth.uid(), author_id));

drop policy "members post in chat" on public.club_messages;
create policy "members post in chat" on public.club_messages for insert with check (
  author_id = auth.uid()
  and public.is_club_member(club_id)
  and exists (select 1 from public.club_channels c where c.id = channel_id and c.club_id = club_messages.club_id
              and ((not c.staff_only_post and not c.staff_only_read) or public.is_club_staff(c.club_id))));

create or replace function public.read_channel(p_channel uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_read_channel(p_channel) then raise exception 'NOT_ALLOWED'; end if;
  insert into club_channel_reads (channel_id, user_id, read_at) values (p_channel, auth.uid(), now())
  on conflict (channel_id, user_id) do update set read_at = now();
end $$;
revoke execute on function public.read_channel(uuid) from public, anon;

-- ── Money: treasurer ─────────────────────────────────────────────────────────

create or replace function public.is_club_treasurer(cid uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from clubs where id = cid and treasurer_id = uid)
$$;

-- A captain names the treasurer (any member), or clears it with null.
create or replace function public.set_club_treasurer(p_club uuid, p_user uuid)
returns public.clubs language plpgsql security definer set search_path = public as $$
declare c clubs;
begin
  if public.club_role_of(p_club) is distinct from 'captain' then raise exception 'NOT_ALLOWED'; end if;
  if p_user is not null and not public.is_club_member(p_club, p_user) then raise exception 'NOT_A_MEMBER'; end if;
  update clubs set treasurer_id = p_user where id = p_club returning * into c;
  perform public.log_staff_action('set_club_treasurer', 'club', p_club::text, jsonb_build_object('user_id', p_user));
  return c;
end $$;
revoke execute on function public.set_club_treasurer(uuid, uuid) from public, anon;

-- A treasurer who leaves the club stops being treasurer.
create or replace function public.clear_club_treasurer()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update clubs set treasurer_id = null where id = old.club_id and treasurer_id = old.user_id;
  return null;
end $$;
create trigger club_members_treasurer after delete on public.club_members
  for each row execute function public.clear_club_treasurer();
revoke execute on function public.clear_club_treasurer() from public, anon, authenticated;

-- ── Money: fund spending ─────────────────────────────────────────────────────

-- What a club spends from its fund. Club staff or the treasurer log a spend;
-- the treasurer or a captain approves it, and never the person who logged it.
create table public.club_fund_spend (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references public.clubs(id) on delete cascade,
  title         text not null check (char_length(title) between 2 and 80),
  amount_pence  integer not null check (amount_pence > 0),
  spent_on      date not null,
  receipt_path  text check (char_length(receipt_path) <= 200),   -- '<club_id>/receipts/...'
  created_by    uuid references public.profiles(id) on delete set null,
  approved_by   uuid references public.profiles(id) on delete set null,
  approved_at   timestamptz,
  created_at    timestamptz not null default now(),
  check (receipt_path is null or split_part(receipt_path, '/', 1) = club_id::text)
);
create index club_fund_spend_club_idx on public.club_fund_spend(club_id, spent_on desc);

alter table public.club_fund_spend enable row level security;
revoke all on public.club_fund_spend from anon, authenticated;
grant select, delete on public.club_fund_spend to authenticated;
create policy "club staff see spending" on public.club_fund_spend for select to authenticated using (
  public.is_club_staff(club_id) or public.is_club_treasurer(club_id) or public.is_staff('finance'));
create policy "take back an unapproved spend" on public.club_fund_spend for delete to authenticated using (
  approved_by is null and (created_by = auth.uid() or public.club_role_of(club_id) = 'captain'));

create or replace function public.add_fund_spend(
  p_club uuid, p_title text, p_amount_pence integer, p_spent_on date default null, p_receipt_path text default null)
returns public.club_fund_spend language plpgsql security definer set search_path = public as $$
declare s club_fund_spend;
begin
  if not (public.is_club_staff(p_club) or public.is_club_treasurer(p_club)) then raise exception 'NOT_ALLOWED'; end if;
  insert into club_fund_spend (club_id, title, amount_pence, spent_on, receipt_path, created_by)
  values (p_club, trim(p_title), p_amount_pence, coalesce(p_spent_on, public.london_today()),
          nullif(trim(p_receipt_path), ''), auth.uid())
  returning * into s;
  perform public.log_staff_action('add_fund_spend', 'club', p_club::text,
    jsonb_build_object('spend_id', s.id, 'amount_pence', s.amount_pence));
  return s;
end $$;
revoke execute on function public.add_fund_spend(uuid, text, integer, date, text) from public, anon;

create or replace function public.approve_fund_spend(p_spend uuid)
returns public.club_fund_spend language plpgsql security definer set search_path = public as $$
declare s club_fund_spend;
begin
  select * into s from club_fund_spend where id = p_spend for update;
  if s.id is null then raise exception 'NOT_FOUND'; end if;
  if not (public.is_club_treasurer(s.club_id) or public.club_role_of(s.club_id) = 'captain') then
    raise exception 'NOT_ALLOWED';
  end if;
  if s.created_by = auth.uid() then raise exception 'SECOND_PERSON_NEEDED'; end if;
  if s.approved_by is not null then raise exception 'ALREADY_DECIDED'; end if;
  update club_fund_spend set approved_by = auth.uid(), approved_at = now() where id = p_spend returning * into s;
  perform public.log_staff_action('approve_fund_spend', 'club', s.club_id::text,
    jsonb_build_object('spend_id', s.id, 'amount_pence', s.amount_pence));
  return s;
end $$;
revoke execute on function public.approve_fund_spend(uuid) from public, anon;

-- ── Money: kit ───────────────────────────────────────────────────────────────

-- What a piece of kit costs to make, and how many have sold, for the club's
-- share. Sales are for the club's staff and Outhere finance only.
alter table public.drops
  add column if not exists making_cost_pence integer check (making_cost_pence >= 0);

create view public.drop_sales as
select d.id as drop_id, d.club_id,
       (count(o.id) filter (where o.status <> 'cancelled'))::int as sold,
       d.price_pence, d.making_cost_pence
from public.drops d
left join public.drop_orders o on o.drop_id = d.id
where public.is_staff('finance') or (d.club_id is not null and public.is_club_staff(d.club_id))
group by d.id;
revoke all on public.drop_sales from anon, authenticated;
grant select on public.drop_sales to authenticated;

-- ── Money: Locals offers ─────────────────────────────────────────────────────

-- A club now sees the offers made to it, approved or not, and says yes or
-- no once. A declined offer is never shown publicly.
alter table public.locals_partners
  add column if not exists club_response text not null default 'open'
    check (club_response in ('open', 'accepted', 'declined')),
  add column if not exists responded_by uuid references public.profiles(id) on delete set null,
  add column if not exists responded_at timestamptz;

drop policy "locals are public" on public.locals_partners;
create policy "locals people can see" on public.locals_partners for select using (
  (array_length(approved_by, 1) >= 2 and club_response <> 'declined')
  or public.is_club_staff(club_id)
  or public.is_staff());

create or replace function public.respond_to_offer(p_partner uuid, p_accept boolean)
returns public.locals_partners language plpgsql security definer set search_path = public as $$
declare l locals_partners;
begin
  select * into l from locals_partners where id = p_partner for update;
  if l.id is null then raise exception 'NOT_FOUND'; end if;
  if not public.is_club_staff(l.club_id) then raise exception 'NOT_ALLOWED'; end if;
  if l.club_response <> 'open' then raise exception 'ALREADY_ANSWERED'; end if;
  update locals_partners set club_response = case when p_accept then 'accepted' else 'declined' end,
    responded_by = auth.uid(), responded_at = now()
  where id = p_partner returning * into l;
  perform public.log_staff_action('respond_to_offer', 'locals_partner', p_partner::text,
    jsonb_build_object('accept', p_accept, 'club_id', l.club_id));
  return l;
end $$;
revoke execute on function public.respond_to_offer(uuid, boolean) from public, anon;

-- ── Money: plans ─────────────────────────────────────────────────────────────

-- The memberships, in one place for every app. Read only; prices change by
-- migration. Prices as in part 6: Pro £5.99, Black £12.99 a month. Black at
-- £129.99 a year is not yet confirmed, and there is no agreed Pro yearly
-- price yet, so it is left empty. The club shares match credit_club_fund
-- (a flat £1 a month through the web link, 50p through the app, three times
-- that for Black); keep the two the same.
create table public.plans (
  tier                  public.tier primary key,
  name                  text not null,
  monthly_pence         integer not null check (monthly_pence >= 0),
  yearly_pence          integer check (yearly_pence >= 0),
  line                  text,
  features              text[] not null default '{}',
  popular               boolean not null default false,
  club_share_web_pence  integer not null default 0,
  club_share_app_pence  integer not null default 0,
  sort                  integer not null default 0
);
alter table public.plans enable row level security;
revoke all on public.plans from anon, authenticated;
grant select on public.plans to anon, authenticated;
create policy "plans are public" on public.plans for select using (true);

insert into public.plans (tier, name, monthly_pence, yearly_pence, line, features, popular,
                          club_share_web_pence, club_share_app_pence, sort) values
  ('free', 'Free', 0, 0, 'Everything you need to play for your borough.',
   array['Walk and run for your borough', 'Join any club, always free', 'Club chat, feed and calendar',
         'Watch everyone''s stories', 'Battles with friends'], false, 0, 0, 0),
  ('pro', 'Pro', 599, null, 'For people who are out most days.',
   array['Post stories from your runs', 'Outhere Locals perks at the till', 'Early access to club kit drops',
         'Your full stats and history', 'Your name on the Sunday reveal', '£1 a month to your club when you join here'],
   true, 100, 50, 1),
  ('black', 'Black', 1299, 12999, 'The full thing, and the most for your club.',
   array['Everything in Pro', 'Members-only Black drops and events', 'First places at big city events',
         '£3 a month to your club when you join here'], false, 300, 150, 2)
on conflict (tier) do nothing;

-- ── Leagues: history and squads ──────────────────────────────────────────────

-- Each side's place and points just after each of its fixtures is settled,
-- so the reveal can say "Up to 1st" and "+3 points".
create table public.league_entry_history (
  entry_id     uuid not null references public.league_entries(id) on delete cascade,
  fixture_id   uuid not null references public.fixtures(id) on delete cascade,
  position     integer not null check (position > 0),
  points       integer not null,
  recorded_at  timestamptz not null default now(),
  primary key (entry_id, fixture_id)
);
create index league_entry_history_entry_idx on public.league_entry_history(entry_id, recorded_at desc);
alter table public.league_entry_history enable row level security;
revoke all on public.league_entry_history from anon, authenticated;
grant select on public.league_entry_history to anon, authenticated;
create policy "history is public" on public.league_entry_history for select using (true);

-- A walker's number in the squad (from the draw), and their counted steps and
-- place in the squad once the fixture is scored.
alter table public.squad_members
  add column if not exists squad_number integer check (squad_number > 0),
  add column if not exists counted      integer,
  add column if not exists rank         integer check (rank > 0);

-- The draw numbers each squad 1, 2, 3 ... in draw order. Otherwise as in part 4.
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
  insert into squad_members (fixture_id, entry_id, user_id, squad_number)
  select p_fixture, h.id, x.w, row_number() over (order by md5(seed || x.w::text))
  from (select w from public.eligible_walkers(h.city_id, h.club_id) w
        order by md5(seed || w::text) limit size_) x;
  insert into squad_members (fixture_id, entry_id, user_id, squad_number)
  select p_fixture, a.id, x.w, row_number() over (order by md5(seed || x.w::text))
  from (select w from public.eligible_walkers(a.city_id, a.club_id) w
        where w not in (select user_id from squad_members where fixture_id = p_fixture)
        order by md5(seed || w::text) limit size_) x;

  update fixtures set draw_seed = seed, drawn_at = now() where id = p_fixture;
  insert into notifications (user_id, kind, title, body, link)
  select user_id, 'league', 'You''ve been called up', 'Your steps count for your side this week.',
         '/league/fixture/' || p_fixture
  from squad_members where fixture_id = p_fixture;
  return size_;
end $$;
revoke execute on function public.draw_fixture(uuid, text) from public, anon, authenticated;

-- Settling now also fills each walker's counted steps and place in the squad,
-- and records both sides' place and points. Otherwise as in part 11.
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

  update squad_members s set counted = t.c, rank = t.place
  from (
    select s2.user_id, coalesce(sum(d.counted), 0)::int as c,
           rank() over (partition by s2.entry_id order by coalesce(sum(d.counted), 0) desc)::int as place
    from squad_members s2
    left join daily_steps d on d.user_id = s2.user_id and d.day between f.starts_on and f.ends_on and not d.flagged
    where s2.fixture_id = p_fixture
    group by s2.user_id, s2.entry_id) t
  where s.fixture_id = p_fixture and s.user_id = t.user_id;

  update league_entries set played = played + 1,
    won = won + (hs > aws)::int, drawn = drawn + (hs = aws)::int, lost = lost + (hs < aws)::int,
    points = points + mult * (case when hs > aws then 3 when hs = aws then 1 else 0 end)
  where id = f.home_id;
  update league_entries set played = played + 1,
    won = won + (aws > hs)::int, drawn = drawn + (hs = aws)::int, lost = lost + (aws < hs)::int,
    points = points + mult * (case when aws > hs then 3 when hs = aws then 1 else 0 end)
  where id = f.away_id;

  insert into league_entry_history (entry_id, fixture_id, position, points)
  select t.id, p_fixture, t.pos, t.points from (
    select e.id, e.points, rank() over (order by e.points desc)::int as pos
    from league_entries e where e.division_id = f.division_id) t
  where t.id in (f.home_id, f.away_id)
  on conflict (entry_id, fixture_id) do nothing;

  insert into notifications (user_id, kind, title, body, link)
  select s.user_id, 'league',
         case when (s.entry_id = f.home_id and hs > aws) or (s.entry_id = f.away_id and aws > hs) then 'You won the fixture'
              when hs = aws then 'The fixture was a draw' else 'The fixture went the other way' end,
         round(hs)::text || ' to ' || round(aws)::text, '/clubs/fixture/' || p_fixture
  from squad_members s where s.fixture_id = p_fixture;
end $$;
revoke execute on function public.settle_fixture(uuid) from public, anon, authenticated;

-- One side of a fixture with its parts apart: squad size, average counted
-- steps, run turnout (share of the squad checked in to a club run, as a
-- percentage) and the score. The score is the stored one once revealed.
create or replace function public.fixture_side_stats(p_fixture uuid, p_entry uuid)
returns table (squad integer, average numeric, turnout_pct numeric, score numeric)
language sql stable security definer set search_path = public as $$
  with f as (select * from fixtures where id = p_fixture and p_entry in (home_id, away_id)),
  sq as (select user_id from squad_members where fixture_id = p_fixture and entry_id = p_entry),
  steps as (
    select s.user_id, coalesce(sum(d.counted), 0) as counted
    from sq s
    left join daily_steps d on d.user_id = s.user_id
      and d.day between (select starts_on from f) and (select ends_on from f) and not d.flagged
    group by s.user_id),
  turnout as (
    select count(distinct s.user_id)::numeric / nullif((select count(*) from sq), 0) as rate
    from sq s
    join event_rsvps r on r.user_id = s.user_id and r.status = 'checked_in'
    join events e on e.id = r.event_id and e.kind = 'club_run'
      and (e.starts_at at time zone 'Europe/London')::date between (select starts_on from f) and (select ends_on from f))
  select (select count(*)::int from sq),
         round(coalesce((select avg(counted) from steps), 0), 1),
         round(100 * coalesce((select rate from turnout), 0), 1),
         coalesce(case when f.home_id = p_entry then f.home_score else f.away_score end,
                  public.fixture_side_score(p_fixture, p_entry))
  from f
$$;

-- ── Pick-ups ─────────────────────────────────────────────────────────────────

-- Open battles and Locals pick-ups. data holds card extras, such as
-- {"open_battle": {"mode": "most_steps", "ends_at": "..."}}. A pick-up can
-- name a Locals partner only if it is approved, the club has not declined
-- it, and whoever posts is that club's staff or a moderator.
alter table public.events
  add column if not exists data jsonb not null default '{}'::jsonb,
  add column if not exists locals_partner_id uuid references public.locals_partners(id) on delete set null;

create or replace function public.check_event_locals()
returns trigger language plpgsql security definer set search_path = public as $$
declare l locals_partners;
begin
  if new.locals_partner_id is null then return new; end if;
  if tg_op = 'UPDATE' and new.locals_partner_id is not distinct from old.locals_partner_id then return new; end if;
  select * into l from locals_partners where id = new.locals_partner_id;
  if l.id is null or coalesce(array_length(l.approved_by, 1), 0) < 2 or l.club_response = 'declined'
     or not (public.is_club_staff(l.club_id) or public.is_staff('moderator')) then
    raise exception 'NOT_ALLOWED';
  end if;
  return new;
end $$;
create trigger events_locals before insert or update of locals_partner_id on public.events
  for each row execute function public.check_event_locals();
revoke execute on function public.check_event_locals() from public, anon, authenticated;

-- Pick-ups that have not finished, within p_km (0.1 to 50) of a point,
-- nearest first. Runs as the caller, so it shows only events they can see.
-- Pick-ups need lat and lng filled when posted to be found here.
create or replace function public.pickups_near(p_lat double precision, p_lng double precision, p_km double precision default 5)
returns setof public.events language sql stable set search_path = public as $$
  select e.* from events e
  where e.kind = 'pickup' and e.cancelled_at is null and e.lat is not null and e.lng is not null
    and coalesce(e.ends_at, e.starts_at + interval '3 hours') > now()
    and public.haversine_m(p_lat, p_lng, e.lat, e.lng) <= least(greatest(coalesce(p_km, 5), 0.1), 50) * 1000
  order by public.haversine_m(p_lat, p_lng, e.lat, e.lng), e.starts_at
$$;

-- ── Staff: charts ────────────────────────────────────────────────────────────

-- Members active each day for the last p_days London days (1 to 365, today
-- last): anyone who synced steps or saved a run that day. Staff only.
create or replace function public.admin_daily_active(p_days integer default 30)
returns table (day date, active integer) language plpgsql stable security definer set search_path = public as $$
declare
  n int := least(greatest(coalesce(p_days, 30), 1), 365);
  today date := public.london_today();
begin
  if not public.is_staff() then raise exception 'NOT_ALLOWED'; end if;
  return query
  select (today - g)::date,
         (select count(*)::int from (
            select ds.user_id from daily_steps ds where ds.day = today - g and ds.steps > 0
            union
            select r.user_id from runs r where (r.started_at at time zone 'Europe/London')::date = today - g) u)
  from generate_series(n - 1, 0, -1) g;
end $$;
revoke execute on function public.admin_daily_active(integer) from public, anon;

-- ── Staff: verification evidence ─────────────────────────────────────────────

-- Evidence for verifying a club (photos of meetups for a founding club, or a
-- claim), the manual checks a moderator ticks, and the decision. Evidence
-- files go in club-media under the club's folder. One open request per club
-- and kind.
create table public.club_verifications (
  id              uuid primary key default gen_random_uuid(),
  club_id         uuid not null references public.clubs(id) on delete cascade,
  kind            text not null check (kind in ('founding', 'claim')),
  claim_id        bigint references public.club_claims(id) on delete set null,
  evidence_paths  text[] not null default '{}' check (cardinality(evidence_paths) <= 20),
  checks          jsonb not null default '{}'::jsonb,
  status          text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  decided_by      uuid references public.profiles(id) on delete set null,
  decided_at      timestamptz,
  check (kind = 'claim' or claim_id is null)
);
create unique index club_verifications_open_idx on public.club_verifications(club_id, kind) where status = 'pending';

alter table public.club_verifications enable row level security;
revoke all on public.club_verifications from anon, authenticated;
grant select on public.club_verifications to authenticated;
create policy "club staff and moderators see verifications" on public.club_verifications for select to authenticated using (
  public.is_club_staff(club_id) or public.is_staff('moderator'));

-- Club staff (or a moderator) send evidence. Sending more to an open request
-- adds to it.
create or replace function public.request_club_verification(
  p_club uuid, p_evidence_paths text[] default '{}', p_kind text default 'founding', p_claim bigint default null)
returns public.club_verifications language plpgsql security definer set search_path = public as $$
declare
  v club_verifications;
  paths text[] := coalesce(p_evidence_paths, '{}');
begin
  if not (public.is_club_staff(p_club) or public.is_staff('moderator')) then raise exception 'NOT_ALLOWED'; end if;
  if p_kind not in ('founding', 'claim') then raise exception 'BAD_KIND'; end if;
  if p_kind = 'claim' and not exists (select 1 from club_claims where id = p_claim) then raise exception 'NOT_FOUND'; end if;
  if exists (select 1 from unnest(paths) p where split_part(p, '/', 1) <> p_club::text) then raise exception 'BAD_PATH'; end if;
  select * into v from club_verifications where club_id = p_club and kind = p_kind and status = 'pending' for update;
  if v.id is null then
    insert into club_verifications (club_id, kind, claim_id, evidence_paths, created_by)
    values (p_club, p_kind, case when p_kind = 'claim' then p_claim end, paths, auth.uid())
    returning * into v;
  else
    update club_verifications set evidence_paths = array(select distinct unnest(evidence_paths || paths))
    where id = v.id returning * into v;
  end if;
  return v;
end $$;
revoke execute on function public.request_club_verification(uuid, text[], text, bigint) from public, anon;

-- A moderator ticks or unticks one manual check, such as 'meetups_seen'.
create or replace function public.set_verification_check(p_verification uuid, p_check text, p_ok boolean)
returns public.club_verifications language plpgsql security definer set search_path = public as $$
declare v club_verifications;
begin
  if not public.is_staff('moderator') then raise exception 'NOT_ALLOWED'; end if;
  if p_check !~ '^[a-z0-9_]{2,40}$' then raise exception 'BAD_CHECK'; end if;
  select * into v from club_verifications where id = p_verification for update;
  if v.id is null then raise exception 'NOT_FOUND'; end if;
  if v.status <> 'pending' then raise exception 'ALREADY_DECIDED'; end if;
  update club_verifications set checks = checks || jsonb_build_object(p_check, p_ok)
  where id = p_verification returning * into v;
  perform public.log_staff_action('set_verification_check', 'club', v.club_id::text,
    jsonb_build_object('verification_id', v.id, 'check', p_check, 'ok', p_ok));
  return v;
end $$;
revoke execute on function public.set_verification_check(uuid, text, boolean) from public, anon;

-- A moderator decides. Approving verifies the club (verify_club logs that too).
create or replace function public.decide_club_verification(p_verification uuid, p_approve boolean)
returns public.club_verifications language plpgsql security definer set search_path = public as $$
declare v club_verifications;
begin
  if not public.is_staff('moderator') then raise exception 'NOT_ALLOWED'; end if;
  select * into v from club_verifications where id = p_verification for update;
  if v.id is null then raise exception 'NOT_FOUND'; end if;
  if v.status <> 'pending' then raise exception 'ALREADY_DECIDED'; end if;
  update club_verifications set status = case when p_approve then 'approved' else 'rejected' end,
    decided_by = auth.uid(), decided_at = now()
  where id = p_verification returning * into v;
  if p_approve then perform public.verify_club(v.club_id); end if;
  perform public.log_staff_action('decide_club_verification', 'club', v.club_id::text,
    jsonb_build_object('verification_id', v.id, 'approve', p_approve));
  return v;
end $$;
revoke execute on function public.decide_club_verification(uuid, boolean) from public, anon;
