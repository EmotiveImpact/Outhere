-- Club links (part 15): weouthere.app/<slug>, with no clashes ever.
--
-- 1. The reserved words move into a table, seeded from RESERVED_SLUGS in
--    packages/core (app and website paths, future page words, UK nations,
--    regions and every UK city). Keep the two lists the same.
-- 2. Slugs are letters and numbers only, as core's isValidClubSlug says, so
--    "peckham-pacers" and "peckhampacers" can never both exist.
-- 3. A second club with the same name takes its city on the end, then a
--    number: parksiderunners, parksiderunnersleeds, parksiderunnersleeds2.
--    This mirrors core's suggestClubSlug(name, city, taken).

create table public.reserved_slugs (
  slug text primary key
);
alter table public.reserved_slugs enable row level security;
create policy "read reserved slugs" on public.reserved_slugs for select using (true);
grant select on public.reserved_slugs to anon, authenticated;

insert into public.reserved_slugs (slug) values
  ('404'), ('_app'), ('aberdeen'), ('about'), ('account'), ('act'), ('admin'), ('android'),
  ('api'), ('app'), ('apple-touch-icon.png'), ('apps'), ('area'), ('areas'), ('armagh'),
  ('assets'), ('auth'), ('bangor'), ('bath'), ('battle'), ('battles'), ('belfast'), ('billing'),
  ('birmingham'), ('black'), ('blackpool'), ('blog'), ('bolton'), ('boroughs'), ('bournemouth'),
  ('bradford'), ('brand'), ('brands'), ('brighton'), ('brightonandhove'), ('bristol'), ('britain'),
  ('business'), ('calendar'), ('cambridge'), ('canterbury'), ('cardiff'), ('careers'),
  ('carlisle'), ('cdn'), ('challenge'), ('challenges'), ('chat'), ('checkout'), ('chelmsford'),
  ('chester'), ('chichester'), ('cities'), ('city'), ('claim'), ('club'), ('clubs'),
  ('colchester'), ('community'), ('contact'), ('cookies'), ('coventry'), ('crawley'), ('crews'),
  ('cup'), ('dashboard'), ('data'), ('derby'), ('derry'), ('dev'), ('developers'), ('dm'), ('dms'),
  ('docs'), ('doncaster'), ('download'), ('draw'), ('drop'), ('drops'), ('dundee'),
  ('dunfermline'), ('durham'), ('east'), ('eastmidlands'), ('eastofengland'), ('edinburgh'),
  ('edit'), ('ely'), ('email'), ('england'), ('event'), ('events'), ('exeter'), ('explore'),
  ('faq'), ('favicon.svg'), ('feed'), ('find'), ('fixtures'), ('founders'), ('founding'), ('gb'),
  ('get'), ('gift'), ('gifts'), ('glasgow'), ('gloucester'), ('greatbritain'), ('guide'),
  ('guides'), ('health'), ('help'), ('hereford'), ('highlands'), ('home'), ('hq'),
  ('huddersfield'), ('hull'), ('i'), ('icon-192.png'), ('icon-512.png'), ('img'), ('inbox'),
  ('inverness'), ('invite'), ('invites'), ('ios'), ('ipswich'), ('jobs'), ('join'), ('kit'),
  ('lancaster'), ('leaderboard'), ('league'), ('leagues'), ('leeds'), ('legal'), ('leicester'),
  ('lichfield'), ('lincoln'), ('lisburn'), ('live'), ('liverpool'), ('locals'), ('login'),
  ('logout'), ('london'), ('londonderry'), ('luton'), ('mail'), ('manchester'), ('map'), ('maps'),
  ('me'), ('media'), ('members'), ('membership'), ('messages'), ('middlesbrough'), ('midlands'),
  ('milton'), ('miltonkeynes'), ('national'), ('new'), ('newcastle'), ('newport'), ('newry'),
  ('news'), ('northampton'), ('northeast'), ('northernireland'), ('northwest'), ('norwich'),
  ('notifications'), ('nottingham'), ('null'), ('offers'), ('official'), ('og.jpg'), ('oldham'),
  ('out'), ('outhere'), ('oxford'), ('partner'), ('partners'), ('pay'), ('people'), ('perth'),
  ('peterborough'), ('pickup'), ('pickups'), ('plans'), ('plymouth'), ('portsmouth'), ('press'),
  ('preston'), ('pricing'), ('privacy'), ('pro'), ('profile'), ('profiles'), ('race'), ('races'),
  ('reading'), ('region'), ('regions'), ('results'), ('reveal'), ('ripon'), ('robots.txt'),
  ('route'), ('routes'), ('rules'), ('run'), ('runs'), ('safety'), ('salford'), ('salisbury'),
  ('scotland'), ('search'), ('season'), ('seasons'), ('security'), ('settings'), ('share'),
  ('sheffield'), ('shop'), ('signin'), ('signout'), ('signup'), ('site.webmanifest'),
  ('sitemap.xml'), ('slough'), ('southampton'), ('southeast'), ('southend'), ('southwest'),
  ('sponsor'), ('sponsors'), ('squad'), ('squads'), ('staff'), ('stalbans'), ('stasaph'),
  ('static'), ('stats'), ('status'), ('stdavids'), ('stirling'), ('stockport'), ('stoke'),
  ('store'), ('stories'), ('story'), ('subscribe'), ('sunderland'), ('support'), ('swansea'),
  ('swindon'), ('table'), ('tables'), ('team'), ('terms'), ('town'), ('towns'), ('truro'), ('uk'),
  ('undefined'), ('unitedkingdom'), ('unsubscribe'), ('user'), ('users'), ('verify'),
  ('wakefield'), ('wales'), ('walk'), ('walks'), ('wallet'), ('warrington'), ('watford'),
  ('webhooks'), ('wells'), ('weouthere'), ('westmidlands'), ('westminster'), ('winchester'),
  ('wolverhampton'), ('worcester'), ('wrexham'), ('www'), ('york'), ('yorkshire')
on conflict do nothing;

create or replace function public.is_reserved_slug(p_slug text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from reserved_slugs where slug = lower(trim(p_slug)))
$$;

-- Letters and numbers only, lower case.
create or replace function public.slug_part(p_text text)
returns text language sql immutable as $$
  select regexp_replace(lower(coalesce(p_text, '')), '[^a-z0-9]+', '', 'g')
$$;

create or replace function public.club_slug_free(p_slug text, p_club uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select p_slug ~ '^[a-z0-9]{3,40}$'
     and not public.is_reserved_slug(p_slug)
     and not exists (select 1 from clubs where slug = p_slug and id is distinct from p_club)
$$;

-- The name, then the name and city, then the name and city with a number.
create or replace function public.suggest_club_slug(p_name text, p_city text default null, p_club uuid default null)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  base text := public.slug_part(p_name);
  town text := public.slug_part(coalesce((select name from cities where id = p_city), p_city));
  withcity text;
  n int := 2;
  s text;
begin
  if char_length(base) < 3 then base := base || 'club'; end if;
  base := left(base, 40);
  if public.club_slug_free(base, p_club) then return base; end if;
  withcity := left(base || town, 40);
  if town <> '' and public.club_slug_free(withcity, p_club) then return withcity; end if;
  loop
    s := left(withcity, 40 - char_length(n::text)) || n;
    if public.club_slug_free(s, p_club) then return s; end if;
    n := n + 1;
  end loop;
end $$;
grant execute on function public.suggest_club_slug(text, text, uuid) to anon, authenticated;
grant execute on function public.club_slug_free(text, uuid) to anon, authenticated;

-- Any club made before this rule loses its hyphens, or takes a free slug.
do $$
declare r record;
begin
  for r in select id, slug, name, city_id from clubs where slug !~ '^[a-z0-9]{3,40}$' or public.is_reserved_slug(slug) loop
    update clubs set slug = case when public.club_slug_free(public.slug_part(r.slug), r.id)
                                 then public.slug_part(r.slug)
                                 else public.suggest_club_slug(r.name, r.city_id, r.id) end
    where id = r.id;
  end loop;
end $$;

alter table public.clubs drop constraint if exists clubs_slug_check;
alter table public.clubs add constraint clubs_slug_check check (slug ~ '^[a-z0-9]{3,40}$');

-- A club made in the app with no link chosen gets the suggested one. A link
-- someone typed is cleaned to letters and numbers and refused if taken.
create or replace function public.create_club(
  p_name text, p_slug text, p_city text, p_borough text default null,
  p_tagline text default null, p_meeting_place text default null, p_usual_times text default null)
returns public.clubs language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  s text := public.slug_part(p_slug);
  c clubs;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if (select count(*) from clubs where created_by = me and status <> 'suspended') >= 3 then
    raise exception 'CLUB_LIMIT' using hint = 'You can start up to 3 clubs.';
  end if;
  if s = '' then
    s := public.suggest_club_slug(p_name, p_city);
  elsif public.is_reserved_slug(s) then
    raise exception 'SLUG_RESERVED';
  elsif not public.club_slug_free(s) then
    raise exception 'SLUG_TAKEN';
  end if;
  insert into clubs (name, slug, city_id, borough_id, tagline, meeting_place, usual_times, created_by)
  values (p_name, s, p_city, p_borough, p_tagline, p_meeting_place, p_usual_times, me)
  returning * into c;
  insert into club_members (club_id, user_id, role) values (c.id, me, 'captain');
  update profiles set home_club_id = coalesce(home_club_id, c.id) where id = me;
  return c;
end $$;

create or replace function public.rename_club(p_club uuid, p_slug text)
returns public.clubs language plpgsql security definer set search_path = public as $$
declare
  s text := lower(trim(coalesce(p_slug, '')));
  old_slug text;
  c clubs;
begin
  if not (public.is_club_staff(p_club) or public.is_staff('moderator')) then raise exception 'NOT_ALLOWED'; end if;
  if s !~ '^[a-z0-9]{3,40}$' then raise exception 'BAD_SLUG'; end if;
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

-- An approved claim takes the suggested link, and the city it named (or its
-- borough's city, or a city in its region) rather than assuming London.
-- Otherwise as in web_gaps.
create or replace function public.review_club_claim(p_claim bigint, p_approve boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  c club_claims;
  cid uuid;
  p profiles;
  city text;
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
    city := coalesce(c.city_id, (select city_id from boroughs where id = c.borough_id), p.city_id,
                     (select id from cities where region = c.region order by is_live desc, name limit 1), 'london');
    insert into clubs (name, slug, city_id, borough_id, meeting_place, usual_times, founded_year,
                       instagram, strava, created_by, status, verified_at)
    values (c.club_name,
            public.suggest_club_slug(c.club_name, city),
            city, coalesce(c.borough_id, p.borough_id), c.meeting_place, c.usual_times, c.founded_year,
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
