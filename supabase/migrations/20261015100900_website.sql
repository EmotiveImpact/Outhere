-- From the website thread (apps/site/db/website.sql on PR #5); supabase/ is now its home.
-- Outhere website: waitlist, run club claims and Black invite requests.
--
-- Runs after the app schema (supabase/migrations), because it references
-- public.boroughs. The website talks to these tables only through the four
-- functions at the bottom, called with the public anon key, so the tables
-- themselves have row level security on and no policies: nobody can read or
-- write them directly from a browser.

create extension if not exists citext;

create table if not exists public.waitlist (
  id           bigint generated always as identity primary key,
  email        citext not null unique check (char_length(email) <= 254),
  borough_id   text not null references public.boroughs(id),
  moves        text not null default 'Walk' check (moves in ('Walk', 'Run', 'Both')),
  club_name    text check (char_length(club_name) <= 60),
  ref_code     text not null unique,
  referred_by  text references public.waitlist(ref_code) on delete set null,
  wants_black  boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists waitlist_borough_idx on public.waitlist(borough_id);
create index if not exists waitlist_referred_idx on public.waitlist(referred_by);

create table if not exists public.club_claims (
  id           bigint generated always as identity primary key,
  club_name    text not null check (char_length(club_name) between 1 and 40),
  borough_id   text not null references public.boroughs(id),
  size         text not null,
  role         text not null check (role in ('Captain', 'Organiser', 'Coach')),
  email        citext not null check (char_length(email) <= 254),
  social       text check (char_length(social) <= 60),
  status       text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  created_at   timestamptz not null default now(),
  unique (club_name, email)
);

create table if not exists public.black_requests (
  id           bigint generated always as identity primary key,
  name         text not null check (char_length(name) <= 80),
  email        citext not null check (char_length(email) <= 254),
  borough_id   text not null references public.boroughs(id),
  invite_code  text check (char_length(invite_code) <= 24),
  why          text check (char_length(why) <= 1000),
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now()
);

alter table public.waitlist enable row level security;
alter table public.club_claims enable row level security;
alter table public.black_requests enable row level security;
-- Supabase grants every public table to anon and authenticated by default; take
-- that back so these can only be reached through the functions below.
revoke all on public.waitlist, public.club_claims, public.black_requests from anon, authenticated;

-- Join the list (or come back to it). Returns your place, your invite code and
-- how many people are on your borough's list. Every friend who joins with your
-- code moves you up 100 places.
create or replace function public.join_waitlist(
  p_email text, p_borough text, p_moves text default 'Walk',
  p_club text default null, p_ref text default null, p_black boolean default false
) returns json language plpgsql security definer set search_path = public as $$
declare
  w public.waitlist;
  base bigint;
  friends bigint;
  code text;
begin
  if p_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  select * into w from waitlist where email = p_email::citext;
  if not found then
    loop
      code := upper(substr(regexp_replace(split_part(p_email, '@', 1), '[^a-zA-Z0-9]', '', 'g'), 1, 8))
              || lpad((floor(random() * 1000))::int::text, 3, '0');
      if code !~ '^[A-Z0-9]' then code := 'OUT' || code; end if;
      exit when not exists (select 1 from waitlist where ref_code = code);
    end loop;
    insert into waitlist (email, borough_id, moves, club_name, ref_code, referred_by, wants_black)
    values (lower(p_email), p_borough,
            case when p_moves in ('Walk', 'Run', 'Both') then p_moves else 'Walk' end,
            nullif(left(trim(p_club), 60), ''),
            code,
            (select ref_code from waitlist where ref_code = upper(p_ref)),
            coalesce(p_black, false))
    returning * into w;
  elsif p_black and not w.wants_black then
    update waitlist set wants_black = true where id = w.id returning * into w;
  end if;

  select count(*) into base from waitlist where id <= w.id;
  select count(*) into friends from waitlist where referred_by = w.ref_code;
  return json_build_object(
    'position', greatest(1, base - friends * 100),
    'code', w.ref_code,
    'boroughCount', (select count(*) from waitlist where borough_id = w.borough_id)
  );
end $$;

create or replace function public.claim_club(
  p_club text, p_borough text, p_size text, p_role text, p_email text, p_social text default null
) returns json language plpgsql security definer set search_path = public as $$
begin
  if p_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  insert into club_claims (club_name, borough_id, size, role, email, social)
  values (left(trim(p_club), 40), p_borough, left(p_size, 20),
          case when p_role in ('Captain', 'Organiser', 'Coach') then p_role else 'Captain' end,
          lower(p_email), nullif(left(trim(p_social), 60), ''))
  on conflict (club_name, email) do nothing;
  return json_build_object('founding', (select count(distinct lower(club_name)) from club_claims where status <> 'rejected'));
end $$;

create or replace function public.request_black(
  p_name text, p_email text, p_borough text, p_code text default null, p_why text default null
) returns json language plpgsql security definer set search_path = public as $$
begin
  if p_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  insert into black_requests (name, email, borough_id, invite_code, why)
  values (left(trim(p_name), 80), lower(p_email), p_borough, nullif(left(trim(p_code), 24), ''), nullif(left(trim(p_why), 1000), ''));
  return json_build_object('ok', true);
end $$;

-- Public figures for the website: totals only, never names or emails.
create or replace function public.website_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'total', (select count(*) from waitlist),
    'boroughs', coalesce((select json_object_agg(borough_id, n) from (select borough_id, count(*) n from waitlist group by 1) b), '{}'::json),
    'clubsClaimed', (select count(distinct lower(club_name)) from club_claims where status <> 'rejected'),
    'clubs', coalesce((select json_agg(json_build_object('name', club_name, 'borough', borough_id) order by min_id)
                       from (select min(club_name) club_name, min(borough_id) borough_id, min(id) min_id
                             from club_claims where status = 'verified' group by lower(club_name)) v), '[]'::json),
    'blackTaken', (select count(*) from black_requests where status = 'accepted')
  )
$$;

revoke all on function public.join_waitlist(text, text, text, text, text, boolean) from public;
revoke all on function public.claim_club(text, text, text, text, text, text) from public;
revoke all on function public.request_black(text, text, text, text, text) from public;
revoke all on function public.website_stats() from public;
grant execute on function public.join_waitlist(text, text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.claim_club(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.request_black(text, text, text, text, text) to anon, authenticated;
grant execute on function public.website_stats() to anon, authenticated;
