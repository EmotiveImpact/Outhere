-- Club links (part 15): the reserved list, letters and numbers only, and the
-- city then a number for a second club with the same name.

\set QUIET on
set client_min_messages = warning;
\o /dev/null

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'eve@example.com', '{"display_name":"Eve"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'fin@example.com', '{"display_name":"Fin"}');

create function pg_temp.act(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, false)
$$;
create function pg_temp.raises(p_sql text, p_msg text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm = p_msg or sqlstate = p_msg then return; end if;
    raise exception 'expected % from [%], got % (%)', p_msg, p_sql, sqlerrm, sqlstate;
  end;
  raise exception 'expected % from [%], but it worked', p_msg, p_sql;
end $$;

do $$ begin
  assert (select count(*) from reserved_slugs) >= 290, 'the full reserved list is seeded';
  assert is_reserved_slug('leeds') and is_reserved_slug('Scotland') and is_reserved_slug('membership'), 'cities, nations and paths are reserved';
  assert not is_reserved_slug('parksiderunners'), 'a club name is not reserved';
  assert slug_part('Parkside Runners!') = 'parksiderunners', 'letters and numbers only';
end $$;

-- Anyone can read the list, so the app can check a link before sending it.
set role anon;
do $$ begin
  assert (select count(*) from reserved_slugs) >= 290, 'anon reads the reserved list';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare a clubs; b clubs; c clubs;
begin
  a := create_club('Parkside Runners', null, 'london');
  assert a.slug = 'parksiderunners', 'first club takes the name';
  perform pg_temp.raises($s$select create_club('Parkside Runners', 'parksiderunners', 'leeds')$s$, 'SLUG_TAKEN');
  perform pg_temp.raises($s$select create_club('Leeds', 'leeds', 'leeds')$s$, 'SLUG_RESERVED');
  b := create_club('Parkside Runners', null, 'leeds');
  assert b.slug = 'parksiderunnersleeds', 'second club takes its city';
  c := create_club('Parkside-Runners', '', 'leeds');
  assert c.slug = 'parksiderunnersleeds2', 'third club takes a number';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000e2');
set role authenticated;
do $$
declare d clubs;
begin
  -- A name that is itself a reserved word moves on to the city.
  d := create_club('Manchester', null, 'leeds');
  assert d.slug = 'manchesterleeds', 'a reserved name takes its city';
  perform create_club('Peckham Pacers', 'peckhampacers', 'london');
  -- A typed link with a hyphen is cleaned, so it clashes with the one above.
  perform pg_temp.raises($s$select create_club('Peckham Pacers', 'peckham-pacers', 'london')$s$, 'SLUG_TAKEN');
end $$;
reset role;

do $$ begin
  assert suggest_club_slug('Peckham Pacers', 'london') = 'peckhampacerslondon', 'suggestion skips a taken slug';
  assert suggest_club_slug('Hi', 'london') = 'hiclub', 'short names are padded';
  assert length(suggest_club_slug(repeat('a', 60), 'london')) = 40, 'never longer than 40';
end $$;

-- The table refuses a hyphen, whoever writes it.
do $$ begin
  perform pg_temp.raises($s$update clubs set slug = 'parkside-runners' where slug = 'parksiderunners'$s$, '23514');
end $$;

-- A claim from a town takes a city in its region, not London.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e9', 'mod2@example.com', '{"display_name":"Mod"}');
insert into staff (user_id, role) values ('00000000-0000-0000-0000-0000000000e9', 'moderator');
update profiles set city_id = null, borough_id = null where id = '00000000-0000-0000-0000-0000000000e2';
insert into club_claims (club_name, size, role, email, user_id, town, region)
values ('Parkside Runners', '10-25', 'Captain', 'fin@example.com', '00000000-0000-0000-0000-0000000000e2', 'Harrogate', 'Yorkshire');
select pg_temp.act('00000000-0000-0000-0000-0000000000e9');
set role authenticated;
do $$
declare cid uuid;
begin
  cid := review_club_claim((select id from club_claims where town = 'Harrogate'), true);
  assert (select city_id from clubs where id = cid) = 'leeds', 'a Yorkshire town claim lands in a Yorkshire city';
  assert (select slug from clubs where id = cid) = 'parksiderunnersleeds3', 'and takes the next free link';
end $$;
reset role;
