-- Active members per place (part 15b), for the UK-wide launch.
--
-- Launch nights run in the ten biggest cities. Every other city or town plays
-- for its region until 100 people there are active, then it goes live and
-- plays as itself. "Active" is the league's own rule (eligible_walkers):
-- verified or established, and 3,000 steps or more on three of the last
-- seven days. These views show only counts, never who.

alter table public.cities add column if not exists image_path text;  -- public club-media path

create or replace function public.city_eligible_count(p_city text)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.eligible_walkers(p_city, null)
$$;
-- Only a count, so anyone may ask (the views below call it as the reader).
grant execute on function public.city_eligible_count(text) to anon, authenticated;

-- One row per city or town: how many are active and how many more it needs.
create or replace view public.city_eligible_counts as
select c.id as city_id, c.name, c.region, c.is_live, c.image_path,
       n.eligible, 100 as needed, greatest(0, 100 - n.eligible) as to_go
from public.cities c
cross join lateral (select public.city_eligible_count(c.id) as eligible) n;

-- One row per region: everyone active there, and how many places are live.
create or replace view public.region_eligible_counts as
select region, sum(eligible)::int as eligible,
       count(*) filter (where is_live)::int as live_places,
       count(*)::int as places
from public.city_eligible_counts
group by region;

grant select on public.city_eligible_counts, public.region_eligible_counts to anon, authenticated;

-- A place goes live once it reaches 100 active. Going live is one way, so a
-- quiet week never sends a city back to playing for its region.
create or replace function public.refresh_live_cities()
returns integer language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update cities c set is_live = true
  where not c.is_live and public.city_eligible_count(c.id) >= 100;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.refresh_live_cities() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then return; end if;
  perform cron.schedule('refresh-live-cities', '30 4 * * *', 'select public.refresh_live_cities()');
exception when others then
  raise notice 'pg_cron not scheduled: %', sqlerrm;
end $$;
