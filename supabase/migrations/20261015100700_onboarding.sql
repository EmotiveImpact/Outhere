-- Outhere schema, part 8: finishing onboarding. A profile is made at sign up
-- with a stand-in username; the app calls finish_onboarding once the member
-- has picked their name and city. It pays the welcome bonus exactly once.

alter table public.profiles add column onboarded_at timestamptz;

create or replace function public.finish_onboarding(p_username text, p_display_name text default null, p_city text default 'london')
returns public.profiles language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  name text := lower(trim(p_username));
  p profiles;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if name !~ '^[a-z0-9._]{3,20}$' then raise exception 'BAD_USERNAME'; end if;
  if name in ('admin', 'outhere', 'support', 'root', 'test', 'dev', 'official') then raise exception 'BAD_USERNAME'; end if;
  if exists (select 1 from profiles where username = name and id <> me) then raise exception 'USERNAME_TAKEN'; end if;
  if not exists (select 1 from cities where id = p_city) then raise exception 'NOT_FOUND'; end if;

  update profiles set username = name,
         display_name = left(coalesce(nullif(trim(p_display_name), ''), name), 40),
         city_id = p_city,
         onboarded_at = coalesce(onboarded_at, now())
  where id = me returning * into p;

  perform public.award(me, format('welcome:%s', me), 'Welcome to Outhere', 'welcome', 100, 20);
  return p;
end $$;
