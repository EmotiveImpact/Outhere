-- Club links can't take a place's name. The outside migration added towns
-- (Shrewsbury, Margate, Hebden Bridge and more) that the reserved list didn't
-- have, so reserve every city, town and region by name, in the same letters
-- and numbers form club links use.
insert into public.reserved_slugs (slug)
select s from (
  select public.slug_part(name) as s from public.cities
  union select public.slug_part(id) from public.cities
  union select public.slug_part(name) from public.regions
) places
where length(s) >= 3
on conflict (slug) do nothing;
