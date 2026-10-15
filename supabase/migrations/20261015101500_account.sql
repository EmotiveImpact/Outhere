-- Outhere schema: the member's account. Settings that follow you between
-- phones, the privacy choices that decide who sees your dot, date of birth
-- and under 18 mode, a linked parent, your patch (city or town, then area),
-- downloading your data and closing your account.
--
-- Under 18 mode is enforced here, not in the app:
--   * no strangers: a battle with an under 18 needs both to be friends
--     (following each other) or in the same club, and never a surprise one;
--   * no live spot: an under 18's "out now" dot is never written, so friends
--     only see the area once a run is done;
--   * no paid drops: drop orders refuse under 18s (OUT still buys emotes
--     and badges);
--   * surprise challengers and live location sharing are forced off.
-- Other areas call public.is_minor(user) from their own functions.

-- ── Date of birth ────────────────────────────────────────────────────────────

alter table public.profile_private add column if not exists birth_date date;

-- Same signature as the foundation version: exact date of birth when we have
-- it, the old birth year otherwise. Lifts on the 18th birthday.
create or replace function public.is_minor(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select case
              when birth_date is not null then birth_date > (public.london_today() - interval '18 years')::date
              when birth_year is not null then extract(year from now())::int - birth_year < 18
            end
     from profile_private where id = uid),
    false)
$$;
revoke execute on function public.is_minor(uuid) from public, anon, authenticated;

-- The app may ask about its own member only.
create or replace function public.am_i_minor()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_minor(auth.uid())
$$;
revoke execute on function public.am_i_minor() from public, anon;
grant execute on function public.am_i_minor() to authenticated;

-- Members write their private row only through these columns; date of birth
-- goes through set_birth_date so it can be set once.
revoke update on public.profile_private from anon, authenticated;
grant update (push_token, step_source, share_live_location, marketing_opt_in, notification_prefs)
  on public.profile_private to authenticated;

create or replace function public.set_birth_date(p_date date)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  had date;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if p_date is null or p_date > public.london_today() or p_date < date '1900-01-01' then
    raise exception 'BAD_DATE';
  end if;
  if p_date > (public.london_today() - interval '13 years')::date then raise exception 'TOO_YOUNG'; end if;
  select birth_date into had from profile_private where id = me;
  -- Set once. Support corrects a wrong date.
  if had is not null and had <> p_date then raise exception 'ALREADY_SET'; end if;
  insert into profile_private (id, birth_date, birth_year)
  values (me, p_date, extract(year from p_date)::smallint)
  on conflict (id) do update set birth_date = excluded.birth_date, birth_year = excluded.birth_year;
  if public.is_minor(me) then
    update profiles set surprise_challengers = false where id = me;
    update member_settings set map_visibility = 'friends' where user_id = me and map_visibility = 'everyone';
  end if;
  return public.is_minor(me);
end $$;
revoke execute on function public.set_birth_date(date) from public, anon;
grant execute on function public.set_birth_date(date) to authenticated;

-- ── Friends and club mates ───────────────────────────────────────────────────

-- Friends follow each other.
create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from follows where follower_id = a and followee_id = b)
     and exists (select 1 from follows where follower_id = b and followee_id = a)
$$;

create or replace function public.share_club(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from club_members x join club_members y on y.club_id = x.club_id
                 where x.user_id = a and y.user_id = b)
$$;
revoke execute on function public.are_friends(uuid, uuid) from public, anon;
revoke execute on function public.share_club(uuid, uuid) from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;
grant execute on function public.share_club(uuid, uuid) to authenticated;

-- ── Settings ─────────────────────────────────────────────────────────────────

-- One row per member, written by the app with an upsert. Nothing here moves
-- XP, OUT or results; the privacy columns are read by the rules below.
create table public.member_settings (
  user_id         uuid primary key references public.profiles(id) on delete cascade,
  units           text not null default 'km' check (units in ('km', 'mi')),
  haptics         boolean not null default true,
  voice_cues      boolean not null default true,
  text_scale      numeric(3, 2) not null default 1 check (text_scale between 0.8 and 1.4),
  -- countdownVoice (hype | calm | off), buzzKm, buzzTurns, winSound, emoteSounds, duckMusic
  sound           jsonb not null default '{}'::jsonb,
  -- challenges, overtakes, club, streak, drops, news: what may send a push
  pings           jsonb not null default '{}'::jsonb,
  quiet_hours     jsonb not null default '{"on": true, "from": 22, "to": 7}'::jsonb,
  ghost_mode      boolean not null default false,
  spot_as         text not null default 'area' check (spot_as in ('area', 'city')),
  hide_route_ends boolean not null default true,
  map_visibility  text not null default 'friends' check (map_visibility in ('everyone', 'friends', 'crew')),
  show_on_leaderboards boolean not null default true,
  show_outside_status  boolean not null default true,
  step_source     text not null default 'phone'
                  check (step_source in ('phone', 'apple_health', 'health_connect', 'garmin', 'strava')),
  updated_at      timestamptz not null default now()
);
create trigger member_settings_touch before update on public.member_settings
  for each row execute function public.touch_updated_at();

-- Under 18s are never on the map for everyone.
create or replace function public.guard_member_settings()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_minor(new.user_id) and new.map_visibility = 'everyone' then
    new.map_visibility := 'friends';
  end if;
  return new;
end $$;
create trigger member_settings_guard before insert or update on public.member_settings
  for each row execute function public.guard_member_settings();

-- Going ghost takes your dot off the map straight away.
create or replace function public.ghost_clears_presence()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.ghost_mode then delete from presence where user_id = new.user_id; end if;
  return new;
end $$;
create trigger member_settings_ghost after insert or update of ghost_mode on public.member_settings
  for each row execute function public.ghost_clears_presence();

alter table public.member_settings enable row level security;
create policy "own settings" on public.member_settings for select using (user_id = auth.uid());
create policy "make own settings" on public.member_settings for insert with check (user_id = auth.uid());
create policy "edit own settings" on public.member_settings for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.member_settings from anon;
grant select, insert, update on public.member_settings to authenticated;

-- Whether a push of this kind may go to this member now. The push sender
-- calls it; the in-app inbox keeps everything.
create or replace function public.should_push(p_user uuid, p_kind text, p_at timestamptz default now())
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  st member_settings;
  key text;
  h int;
  q_from int;
  q_to int;
begin
  select * into st from member_settings where user_id = p_user;
  if st.user_id is null then return true; end if;
  key := case p_kind
    when 'battle' then 'challenges'
    when 'overtake' then 'overtakes'
    when 'club' then 'club'
    when 'league' then 'club'
    when 'streak' then 'streak'
    when 'drop' then 'drops'
    when 'news' then 'news'
    when 'event' then 'news'
    else null end;
  if key is not null and coalesce((st.pings ->> key)::boolean, key not in ('drops', 'news')) = false then
    return false;
  end if;
  -- Quiet hours never hold back Live sharing.
  if p_kind <> 'live' and coalesce((st.quiet_hours ->> 'on')::boolean, true) then
    h := extract(hour from p_at at time zone 'Europe/London')::int;
    q_from := coalesce((st.quiet_hours ->> 'from')::int, 22);
    q_to := coalesce((st.quiet_hours ->> 'to')::int, 7);
    if (q_from > q_to and (h >= q_from or h < q_to)) or (q_from < q_to and h >= q_from and h < q_to) then
      return false;
    end if;
  end if;
  return true;
end $$;
revoke execute on function public.should_push(uuid, text, timestamptz) from public, anon, authenticated;

-- ── Who sees your dot ────────────────────────────────────────────────────────

-- Everyone, people you follow, or your club. Ghost mode hides you from all.
-- Members without a settings row keep the old behaviour (everyone), except
-- under 18s, who are friends and club only.
create or replace function public.can_see_member(p_owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when p_owner = auth.uid() then true
    when auth.uid() is null then false
    when public.is_blocked(p_owner, auth.uid()) then false
    when coalesce((select ghost_mode from member_settings where user_id = p_owner), false) then false
    when public.is_minor(p_owner) then
      public.are_friends(p_owner, auth.uid()) or public.share_club(p_owner, auth.uid())
    else case coalesce((select map_visibility from member_settings where user_id = p_owner), 'everyone')
      when 'everyone' then true
      when 'friends' then exists (select 1 from follows where follower_id = p_owner and followee_id = auth.uid())
                          or public.share_club(p_owner, auth.uid())
      else public.share_club(p_owner, auth.uid())
    end
  end
$$;
revoke execute on function public.can_see_member(uuid) from public, anon;
grant execute on function public.can_see_member(uuid) to authenticated;

drop policy "dots visible to members" on public.presence;
create policy "dots people may see" on public.presence for select to authenticated
  using (public.can_see_member(user_id));

-- Ghosts leave no dot, and an under 18's "out now" is never written.
create or replace function public.guard_presence()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce((select ghost_mode from member_settings where user_id = new.user_id), false) then
    return null;
  end if;
  if new.state = 'out' and public.is_minor(new.user_id) then
    return null;
  end if;
  return new;
end $$;
create trigger presence_guard before insert or update on public.presence
  for each row execute function public.guard_presence();

-- ── Under 18 mode ────────────────────────────────────────────────────────────

-- No strangers: friends or club mates only, and never a surprise challenger.
create or replace function public.guard_minor_battle()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_minor(new.challenger_id) or public.is_minor(new.opponent_id) then
    if new.is_surprise then raise exception 'UNDER_18'; end if;
    if not (public.are_friends(new.challenger_id, new.opponent_id)
            or public.share_club(new.challenger_id, new.opponent_id)) then
      raise exception 'UNDER_18';
    end if;
  end if;
  return new;
end $$;
create trigger battles_minor_guard before insert on public.battles
  for each row execute function public.guard_minor_battle();

-- No paid drops.
create or replace function public.guard_minor_drop()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_minor(new.user_id) then raise exception 'UNDER_18'; end if;
  return new;
end $$;
create trigger drop_orders_minor_guard before insert on public.drop_orders
  for each row execute function public.guard_minor_drop();

-- Surprise challengers stay off for under 18s whatever the app sends.
create or replace function public.guard_minor_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.surprise_challengers and public.is_minor(new.id) then new.surprise_challengers := false; end if;
  return new;
end $$;
create trigger profiles_minor_guard before update of surprise_challengers on public.profiles
  for each row execute function public.guard_minor_profile();

-- No live location sharing for under 18s.
create or replace function public.guard_minor_private()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.share_live_location
     and new.birth_date is not null
     and new.birth_date > (public.london_today() - interval '18 years')::date then
    new.share_live_location := false;
  end if;
  return new;
end $$;
create trigger profile_private_minor_guard before insert or update on public.profile_private
  for each row execute function public.guard_minor_private();

-- A parent or guardian linked to an under 18. They see runs and get Live
-- sharing when a run starts (sent by the push service, see should_push).
create table public.guardian_links (
  child_id      uuid primary key references public.profiles(id) on delete cascade,
  name          text not null check (char_length(trim(name)) between 1 and 40),
  contact       text not null check (char_length(trim(contact)) between 3 and 120),
  live_sharing  boolean not null default true,
  created_at    timestamptz not null default now()
);
alter table public.guardian_links enable row level security;
create policy "own guardian link" on public.guardian_links for select using (child_id = auth.uid());
revoke all on public.guardian_links from anon, authenticated;
grant select on public.guardian_links to authenticated;

create or replace function public.link_guardian(p_name text, p_contact text, p_live boolean default true)
returns public.guardian_links language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  g guardian_links;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if not public.is_minor(me) then raise exception 'NOT_ALLOWED'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 1 or char_length(trim(coalesce(p_contact, ''))) < 3 then
    raise exception 'BAD_GUARDIAN';
  end if;
  insert into guardian_links (child_id, name, contact, live_sharing)
  values (me, trim(p_name), trim(p_contact), coalesce(p_live, true))
  on conflict (child_id) do update set name = excluded.name, contact = excluded.contact,
    live_sharing = excluded.live_sharing
  returning * into g;
  return g;
end $$;
revoke execute on function public.link_guardian(text, text, boolean) from public, anon;
grant execute on function public.link_guardian(text, text, boolean) to authenticated;

create or replace function public.unlink_guardian()
returns void language sql security definer set search_path = public as $$
  delete from guardian_links where child_id = auth.uid()
$$;
revoke execute on function public.unlink_guardian() from public, anon;
grant execute on function public.unlink_guardian() to authenticated;

-- ── Your patch ───────────────────────────────────────────────────────────────

-- Cities and towns to pick from, nearest first when a location is given.
-- A place that isn't live yet (under 100 active members) plays for its region.
create or replace function public.patch_places(p_query text default null, p_lat double precision default null, p_lng double precision default null)
returns table (id text, name text, region text, is_live boolean, plays_for text, members bigint, distance_km double precision)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.region, c.is_live,
         case when c.is_live then null else c.region end,
         (select count(*) from profiles p where p.city_id = c.id and p.onboarded_at is not null),
         case when p_lat is null or p_lng is null or c.lat is null then null
              else 6371 * 2 * asin(sqrt(power(sin(radians(c.lat - p_lat) / 2), 2)
                   + cos(radians(p_lat)) * cos(radians(c.lat)) * power(sin(radians(c.lng - p_lng) / 2), 2))) end
  from cities c
  where c.country = 'GB'
    and (p_query is null or trim(p_query) = '' or c.name ilike '%' || trim(p_query) || '%' or c.region ilike '%' || trim(p_query) || '%')
  order by 7 nulls last, c.is_live desc, c.name
  limit 60
$$;
grant execute on function public.patch_places(text, double precision, double precision) to anon, authenticated;

-- Areas within a place: who is out there now and where it ranks this week
-- on counted steps.
create or replace function public.patch_areas(p_city text)
returns table (id text, name text, out_now bigint, week_steps bigint, week_rank bigint)
language sql stable security definer set search_path = public as $$
  with week as (
    select p.borough_id, sum(d.counted)::bigint as steps
    from daily_steps d join profiles p on p.id = d.user_id
    where p.city_id = p_city and p.borough_id is not null
      and d.day >= date_trunc('week', public.london_today())::date
    group by 1
  ), outs as (
    select pr.borough_id, count(*) as n
    from presence pr
    where pr.state = 'out' and pr.last_seen_at > now() - interval '10 minutes'
    group by 1
  )
  select b.id, b.name, coalesce(o.n, 0), coalesce(w.steps, 0),
         rank() over (order by coalesce(w.steps, 0) desc, b.name)
  from boroughs b
  left join week w on w.borough_id = b.id
  left join outs o on o.borough_id = b.id
  where b.city_id = p_city
  order by 5, b.name
$$;
grant execute on function public.patch_areas(text) to anon, authenticated;

-- Who is out right now, in one place or across the UK, for the live count on
-- Welcome (signed out, so anon too) and Home.
create or replace function public.outside_count(p_city text default null)
returns bigint language sql stable security definer set search_path = public as $$
  select count(*)
  from presence pr join profiles p on p.id = pr.user_id
  where pr.state = 'out' and pr.last_seen_at > now() - interval '10 minutes'
    and (p_city is null or p.city_id = p_city)
$$;
grant execute on function public.outside_count(text) to anon, authenticated;

create or replace function public.set_patch(p_city text, p_area text default null)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  p profiles;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if not exists (select 1 from cities where id = p_city) then raise exception 'NOT_FOUND'; end if;
  if p_area is not null and not exists (select 1 from boroughs where id = p_area and city_id = p_city) then
    raise exception 'NOT_FOUND';
  end if;
  update profiles set city_id = p_city, borough_id = p_area where id = me returning * into p;
  return p;
end $$;
revoke execute on function public.set_patch(text, text) from public, anon;
grant execute on function public.set_patch(text, text) to authenticated;

-- ── Your data ────────────────────────────────────────────────────────────────

-- Everything we hold about you, as one JSON document.
create or replace function public.export_my_data()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  return jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from profiles p where p.id = me),
    'private', (select to_jsonb(x) - 'push_token' from profile_private x where x.id = me),
    'settings', (select to_jsonb(s) from member_settings s where s.user_id = me),
    'guardian', (select to_jsonb(g) from guardian_links g where g.child_id = me),
    'steps', coalesce((select jsonb_agg(to_jsonb(d) order by d.day) from daily_steps d where d.user_id = me), '[]'::jsonb),
    'runs', coalesce((select jsonb_agg(to_jsonb(r) order by r.started_at) from runs r where r.user_id = me), '[]'::jsonb),
    'ledger', coalesce((select jsonb_agg(to_jsonb(l) order by l.created_at) from ledger l where l.user_id = me), '[]'::jsonb),
    'following', coalesce((select jsonb_agg(f.followee_id) from follows f where f.follower_id = me), '[]'::jsonb),
    'clubs', coalesce((select jsonb_agg(jsonb_build_object('club_id', m.club_id, 'role', m.role, 'joined_at', m.joined_at))
                       from club_members m where m.user_id = me), '[]'::jsonb),
    'battles', coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at) from battles b
                         where me in (b.challenger_id, b.opponent_id)), '[]'::jsonb),
    'blocked', coalesce((select jsonb_agg(bl.blocked_id) from blocks bl where bl.user_id = me), '[]'::jsonb)
  );
end $$;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- Closing an account. The member disappears at once (name, photo, bio, dot,
-- follows, settings and private details); the account row and anything other
-- people still need (club history, battle results) are erased by the purge
-- job after 30 days, which deletes the auth user.
create table public.account_deletions (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  requested_at  timestamptz not null default now(),
  purge_after   timestamptz not null default now() + interval '30 days'
);
alter table public.account_deletions enable row level security;
create policy "staff see deletions" on public.account_deletions for select using (public.is_staff());
revoke all on public.account_deletions from anon, authenticated;

create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  insert into account_deletions (user_id) values (me) on conflict (user_id) do nothing;
  update profiles set username = 'deleted_' || left(replace(me::text, '-', ''), 12),
         display_name = 'Former member', bio = null, avatar_path = null, borough_id = null,
         home_club_id = null, surprise_challengers = false, onboarded_at = null
  where id = me;
  update profile_private set push_token = null, share_live_location = false, marketing_opt_in = false,
         notification_prefs = '{}'::jsonb
  where id = me;
  delete from presence where user_id = me;
  delete from follows where follower_id = me or followee_id = me;
  delete from member_settings where user_id = me;
  delete from guardian_links where child_id = me;
  delete from club_members where user_id = me and role <> 'captain';
  update battles set status = 'cancelled' where status = 'pending' and me in (challenger_id, opponent_id);
  insert into audit_log (actor_id, action, target_type, target_id) values (me, 'account.delete', 'profile', me::text);
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
