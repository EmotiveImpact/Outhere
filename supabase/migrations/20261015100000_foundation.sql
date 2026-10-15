-- Outhere schema, part 1: foundations, places and people.
--
-- Conventions
--   * Every table has Row Level Security on. Clients only ever hold the anon
--     key plus a user JWT; anything that moves XP, OUT, tiers or results goes
--     through a SECURITY DEFINER function in the api schema-free "public"
--     namespace, prefixed with a verb (ingest_steps, create_battle ...).
--   * Times are timestamptz. A "day" is the Europe/London calendar day.
--   * Money is integer pence. OUT and XP are integers.

create extension if not exists pgcrypto;

-- ── Helpers ──────────────────────────────────────────────────────────────────

create or replace function public.london_today()
returns date language sql stable as $$
  select (now() at time zone 'Europe/London')::date
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ── Enums ────────────────────────────────────────────────────────────────────

create type public.tier as enum ('free', 'pro', 'black');
create type public.trust_level as enum ('new', 'verified', 'established', 'restricted');
create type public.staff_role as enum ('admin', 'moderator', 'support', 'finance');

-- ── Places ───────────────────────────────────────────────────────────────────

-- Cities play in the City League once they have 100 eligible walkers; until
-- then they play as their region (see system design doc).
create table public.cities (
  id            text primary key,                -- slug, e.g. 'london'
  name          text not null,
  region        text not null,                   -- e.g. 'London', 'North West'
  country       text not null default 'GB',
  timezone      text not null default 'Europe/London',
  lat           double precision,
  lng           double precision,
  is_live       boolean not null default false,  -- has reached 100 eligible
  created_at    timestamptz not null default now()
);

create table public.boroughs (
  id            text primary key,                -- slug, e.g. 'southwark'
  city_id       text not null references public.cities(id),
  name          text not null,
  -- position on the borough tile map used by the app and the website
  tile_col      smallint,
  tile_row      smallint
);
create index boroughs_city_idx on public.boroughs(city_id);

-- ── People ───────────────────────────────────────────────────────────────────

-- Public face of a member. Everything here can be seen by other members (and
-- by anyone on public club and league pages). Private details live in
-- profile_private.
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text not null unique
                  check (username ~ '^[a-z0-9._]{3,20}$'),
  display_name    text not null check (char_length(display_name) between 1 and 40),
  bio             text check (char_length(bio) <= 160),
  avatar_path     text,                          -- storage path in 'avatars'
  city_id         text references public.cities(id) default 'london',
  borough_id      text references public.boroughs(id),
  home_club_id    uuid,                          -- fk added in clubs migration
  -- Membership is what the ring shows: free = thin grey, pro = blue glow,
  -- black = gunmetal with a moving light. Only subscriptions change it.
  tier            public.tier not null default 'free',
  founding_number integer unique,                -- Founding 500
  trust           public.trust_level not null default 'new',
  daily_goal      integer not null default 10000 check (daily_goal between 1000 and 50000),
  xp              integer not null default 0,    -- cached from ledger
  level           integer not null default 1,
  streak_days     integer not null default 0,
  best_streak     integer not null default 0,
  surprise_challengers boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index profiles_city_idx on public.profiles(city_id);
create index profiles_borough_idx on public.profiles(borough_id);
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create table public.profile_private (
  id              uuid primary key references public.profiles(id) on delete cascade,
  birth_year      smallint check (birth_year between 1900 and 2100),
  push_token      text,
  step_source     text check (step_source in ('healthkit', 'health_connect', 'pedometer', 'watch')),
  share_live_location boolean not null default false,
  marketing_opt_in boolean not null default false,
  notification_prefs jsonb not null default '{}'::jsonb,
  updated_at      timestamptz not null default now()
);
create trigger profile_private_touch before update on public.profile_private
  for each row execute function public.touch_updated_at();

-- Under 18s never get surprise challengers and never appear in rival decks.
create or replace function public.is_minor(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select extract(year from now())::int - birth_year < 18 from profile_private where id = uid),
    false)
$$;

-- ── Staff ────────────────────────────────────────────────────────────────────

create table public.staff (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        public.staff_role not null,
  granted_by  uuid references public.profiles(id),
  granted_at  timestamptz not null default now(),
  primary key (user_id, role)
);

create or replace function public.is_staff(required public.staff_role default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff
    where user_id = auth.uid()
      and (required is null or role = required or role = 'admin')
  )
$$;

create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles(id),
  action      text not null,
  target_type text,
  target_id   text,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_target_idx on public.audit_log(target_type, target_id);

-- ── New users ────────────────────────────────────────────────────────────────

-- A profile is created on sign up. The app then lets the member pick a
-- username; until then a placeholder is used.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base text;
  candidate text;
  n int := 0;
begin
  base := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'username', split_part(coalesce(new.email, ''), '@', 1), 'mover'),
    '[^a-z0-9._]', '', 'g'));
  if char_length(base) < 3 then base := 'mover'; end if;
  base := left(base, 16);
  candidate := base;
  while exists (select 1 from profiles where username = candidate) loop
    n := n + 1;
    candidate := base || n::text;
  end loop;

  insert into profiles (id, username, display_name)
  values (new.id, candidate,
          left(coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), initcap(candidate)), 40));
  insert into profile_private (id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table public.cities enable row level security;
alter table public.boroughs enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.staff enable row level security;
alter table public.audit_log enable row level security;

create policy "places are public" on public.cities for select using (true);
create policy "boroughs are public" on public.boroughs for select using (true);
create policy "staff edit cities" on public.cities for all
  using (public.is_staff('admin')) with check (public.is_staff('admin'));

create policy "profiles are public" on public.profiles for select using (true);
create policy "members edit their own profile" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Members may only change these columns; tier, trust, xp, streaks and the
-- founding number are written by the server.
revoke update on public.profiles from anon, authenticated;
grant update (username, display_name, bio, avatar_path, city_id, borough_id,
              home_club_id, daily_goal, surprise_challengers)
  on public.profiles to authenticated;

create policy "own private details" on public.profile_private for select
  using (id = auth.uid());
create policy "edit own private details" on public.profile_private for update
  using (id = auth.uid()) with check (id = auth.uid());

create policy "staff see staff" on public.staff for select using (public.is_staff());
create policy "admins manage staff" on public.staff for all
  using (public.is_staff('admin')) with check (public.is_staff('admin'));

create policy "staff read audit" on public.audit_log for select using (public.is_staff());

-- Whether someone is under 18 is never exposed to other members.
revoke execute on function public.is_minor from public, anon, authenticated;
