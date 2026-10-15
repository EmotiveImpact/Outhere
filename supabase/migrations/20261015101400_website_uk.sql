-- The website goes UK-wide (from the website thread, PR #5).
--
-- Outhere launches UK-wide. Anyone in the UK can join on day one, launch nights
-- run in the ten biggest cities, and every other town plays for its region until
-- 100 people there are active. So a place on the website is now one of:
--   a launch city (city_id), plus a borough when the city is London;
--   a town anywhere else (town), plus the region it plays for (region).
-- Existing London rows keep their borough and gain city_id = 'london'.

-- ── Columns ──────────────────────────────────────────────────────────────────

alter table public.waitlist
  add column if not exists city_id text references public.cities(id),
  add column if not exists town    text check (char_length(town) between 1 and 60),
  add column if not exists region  text;
alter table public.club_claims
  add column if not exists city_id text references public.cities(id),
  add column if not exists town    text check (char_length(town) between 1 and 60),
  add column if not exists region  text;
alter table public.black_requests
  add column if not exists city_id text references public.cities(id),
  add column if not exists town    text check (char_length(town) between 1 and 60),
  add column if not exists region  text;

alter table public.waitlist       alter column borough_id drop not null;
alter table public.club_claims    alter column borough_id drop not null;
alter table public.black_requests alter column borough_id drop not null;

update public.waitlist t set city_id = b.city_id from public.boroughs b where b.id = t.borough_id and t.city_id is null;
update public.club_claims t set city_id = b.city_id from public.boroughs b where b.id = t.borough_id and t.city_id is null;
update public.black_requests t set city_id = b.city_id from public.boroughs b where b.id = t.borough_id and t.city_id is null;

-- A waitlist or Black row is either in a launch city (London needs its borough) or in a town with a region.
alter table public.waitlist add constraint waitlist_place check (
  (city_id is not null and town is null and region is null and (city_id <> 'london' or borough_id is not null))
  or (city_id is null and borough_id is null and town is not null and region is not null));
-- Club claims also come from the app (claim_my_club), which records only the claimer's
-- borough, so here the rule is lighter: a town always comes with its region and no city.
alter table public.club_claims add constraint club_claims_place check (
  town is null or (city_id is null and borough_id is null and region is not null));
-- A website claim (no signed-in user) now needs a city or a town, not always a borough.
alter table public.club_claims drop constraint if exists club_claims_who;
alter table public.club_claims add constraint club_claims_who
  check (user_id is not null or (email is not null and (city_id is not null or town is not null)));
alter table public.black_requests add constraint black_requests_place check (
  (city_id is not null and town is null and region is null and (city_id <> 'london' or borough_id is not null))
  or (city_id is null and borough_id is null and town is not null and region is not null));

create index if not exists waitlist_city_idx on public.waitlist(city_id);
create index if not exists waitlist_region_idx on public.waitlist(region) where city_id is null;

-- ── Place checks ─────────────────────────────────────────────────────────────

-- The regions a town outside the launch cities can play for (London is a launch city).
create or replace function public.website_regions() returns text[] language sql immutable as $$
  select array['South East', 'South West', 'East of England', 'West Midlands', 'East Midlands',
               'Yorkshire', 'North West', 'North East', 'Wales', 'Scotland', 'Northern Ireland']
$$;

-- Tidies and checks a place from the website. Returns (city_id, borough_id, town, region)
-- ready to insert, or raises 22023 with a short reason.
create or replace function public.website_place(p_city text, p_borough text, p_town text, p_region text,
  out city_id text, out borough_id text, out town text, out region text)
language plpgsql stable set search_path = public as $$
begin
  if nullif(trim(p_city), '') is not null then
    if not exists (select 1 from cities c where c.id = p_city) then
      raise exception 'unknown city' using errcode = '22023';
    end if;
    city_id := p_city;
    if p_city = 'london' or nullif(trim(p_borough), '') is not null then
      if not exists (select 1 from boroughs b where b.id = p_borough and b.city_id = p_city) then
        raise exception 'unknown borough' using errcode = '22023';
      end if;
      borough_id := p_borough;
    end if;
  else
    town := nullif(left(trim(p_town), 60), '');
    if town is null then raise exception 'town needed' using errcode = '22023'; end if;
    if p_region is null or not (p_region = any (website_regions())) then
      raise exception 'unknown region' using errcode = '22023';
    end if;
    region := p_region;
  end if;
end $$;

-- ── Functions the website calls ──────────────────────────────────────────────

drop function if exists public.join_waitlist(text, text, text, text, text, boolean);
drop function if exists public.claim_club(text, text, text, text, text, text);
drop function if exists public.request_black(text, text, text, text, text);

-- Join the list (or come back to it). Returns your place, your invite code and how
-- many people share your spot: your London borough, your launch city, or your region.
-- Every friend who joins with your code moves you up 100 places.
create or replace function public.join_waitlist(
  p_email text, p_city text default null, p_borough text default null, p_town text default null, p_region text default null,
  p_moves text default 'Walk', p_club text default null, p_ref text default null, p_black boolean default false
) returns json language plpgsql security definer set search_path = public as $$
declare
  w public.waitlist;
  p record;
  base bigint;
  friends bigint;
  code text;
begin
  if p_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  select * into w from waitlist where email = p_email::citext;
  if not found then
    select * into p from website_place(p_city, p_borough, p_town, p_region);
    loop
      code := upper(substr(regexp_replace(split_part(p_email, '@', 1), '[^a-zA-Z0-9]', '', 'g'), 1, 8))
              || lpad((floor(random() * 1000))::int::text, 3, '0');
      if code !~ '^[A-Z0-9]' then code := 'OUT' || code; end if;
      exit when not exists (select 1 from waitlist where ref_code = code);
    end loop;
    insert into waitlist (email, city_id, borough_id, town, region, moves, club_name, ref_code, referred_by, wants_black)
    values (lower(p_email), p.city_id, p.borough_id, p.town, p.region,
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
    'placeCount', case
      when w.borough_id is not null then (select count(*) from waitlist where borough_id = w.borough_id)
      when w.city_id is not null then (select count(*) from waitlist where city_id = w.city_id)
      else (select count(*) from waitlist where city_id is null and region = w.region) end
  );
end $$;

create or replace function public.claim_club(
  p_club text, p_size text, p_role text, p_email text,
  p_city text default null, p_borough text default null, p_town text default null, p_region text default null,
  p_social text default null
) returns json language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if p_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  select * into p from website_place(p_city, p_borough, p_town, p_region);
  insert into club_claims (club_name, city_id, borough_id, town, region, size, role, email, social)
  values (left(trim(p_club), 40), p.city_id, p.borough_id, p.town, p.region, left(p_size, 20),
          case when p_role in ('Captain', 'Organiser', 'Coach') then p_role else 'Captain' end,
          lower(p_email), nullif(left(trim(p_social), 60), ''))
  on conflict (club_name, email) do nothing;
  return json_build_object('founding', (select count(distinct lower(club_name)) from club_claims where status <> 'rejected'));
end $$;

create or replace function public.request_black(
  p_name text, p_email text,
  p_city text default null, p_borough text default null, p_town text default null, p_region text default null,
  p_code text default null, p_why text default null
) returns json language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if p_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  select * into p from website_place(p_city, p_borough, p_town, p_region);
  insert into black_requests (name, email, city_id, borough_id, town, region, invite_code, why)
  values (left(trim(p_name), 80), lower(p_email), p.city_id, p.borough_id, p.town, p.region,
          nullif(left(trim(p_code), 24), ''), nullif(left(trim(p_why), 1000), ''));
  return json_build_object('ok', true);
end $$;

-- Public figures for the website: totals only, never names or emails.
create or replace function public.website_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'total', (select count(*) from waitlist),
    'cities', coalesce((select json_object_agg(city_id, n) from (select city_id, count(*) n from waitlist where city_id is not null group by 1) c), '{}'::json),
    'boroughs', coalesce((select json_object_agg(borough_id, n) from (select borough_id, count(*) n from waitlist where borough_id is not null group by 1) b), '{}'::json),
    'regions', coalesce((select json_object_agg(region, n) from (select region, count(*) n from waitlist where city_id is null group by 1) r), '{}'::json),
    'clubsClaimed', (select count(distinct lower(club_name)) from club_claims where status <> 'rejected'),
    'clubs', coalesce((select json_agg(json_build_object('name', club_name, 'city', city_id, 'borough', borough_id, 'town', town, 'region', region) order by id)
                       from (select distinct on (lower(club_name)) id, club_name, city_id, borough_id, town, region
                             from club_claims where status = 'verified' order by lower(club_name), id) v), '[]'::json),
    'blackTaken', (select count(*) from black_requests where status = 'accepted')
  )
$$;

revoke all on function public.website_place(text, text, text, text) from public, anon, authenticated;
revoke all on function public.website_regions() from public, anon, authenticated;
revoke all on function public.join_waitlist(text, text, text, text, text, text, text, text, boolean) from public;
revoke all on function public.claim_club(text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.request_black(text, text, text, text, text, text, text, text) from public;
revoke all on function public.website_stats() from public;
grant execute on function public.join_waitlist(text, text, text, text, text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.claim_club(text, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.request_black(text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.website_stats() to anon, authenticated;
