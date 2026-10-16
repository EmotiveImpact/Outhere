-- Replaces supabase/tests/test_website.sql once uk-waitlist.sql is in the migrations.
-- Raises an exception (and so fails the run) on the first broken rule.
do $$
declare r json; r2 json; s json; n int;
begin
  -- joining in a London borough gives a place, a code and the borough's count
  r := public.join_waitlist(p_email => 'Amara@Example.com', p_city => 'london', p_borough => 'southwark', p_moves => 'Run', p_club => 'Peckham Pacers');
  assert (r->>'position')::int = 1, 'first sign-up is #1';
  assert (r->>'placeCount')::int = 1, 'southwark has one';
  assert r->>'code' ~ '^AMARA[0-9]{3}$', 'code comes from the email: ' || (r->>'code');
  assert (select city_id from public.waitlist where email = 'amara@example.com') = 'london', 'borough sign-ups are in London';

  -- joining again with the same email (any case) returns the same place, not a new row
  r2 := public.join_waitlist(p_email => 'amara@example.com', p_city => 'london', p_borough => 'hackney');
  assert r2->>'code' = r->>'code', 'same person keeps their code';
  select count(*) into n from public.waitlist;
  assert n = 1, 'no duplicate rows';

  -- each friend who joins with your code moves you up 100 places (never above #1)
  perform public.join_waitlist(p_email => 'kemi@example.com', p_city => 'london', p_borough => 'hackney', p_ref => lower(r->>'code'));
  select count(*) into n from public.waitlist where referred_by = r->>'code';
  assert n = 1, 'referral recorded case-insensitively';
  perform public.join_waitlist(p_email => 'nobody@example.com', p_city => 'london', p_borough => 'hackney', p_ref => 'NOTACODE');
  select count(*) into n from public.waitlist where email = 'nobody@example.com' and referred_by is null;
  assert n = 1, 'unknown referral code is ignored';

  -- a launch city outside London needs no borough, and counts by city
  r := public.join_waitlist(p_email => 'jo@example.com', p_city => 'manchester');
  assert (r->>'placeCount')::int = 1, 'manchester has one';

  -- a town elsewhere plays for its region, and counts by region
  perform public.join_waitlist(p_email => 'tom@example.com', p_town => ' Hexham ', p_region => 'North East');
  r := public.join_waitlist(p_email => 'sam@example.com', p_town => 'Alnwick', p_region => 'North East');
  assert (r->>'placeCount')::int = 2, 'two in the North East';
  assert (select town from public.waitlist where email = 'tom@example.com') = 'Hexham', 'town is trimmed';

  -- bad input is refused
  begin
    perform public.join_waitlist(p_email => 'not-an-email', p_city => 'leeds');
    raise exception 'bad email accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.join_waitlist(p_email => 'x@example.com', p_city => 'london', p_borough => 'atlantis');
    raise exception 'unknown borough accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.join_waitlist(p_email => 'x@example.com', p_city => 'london');
    raise exception 'London without a borough accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.join_waitlist(p_email => 'x@example.com', p_city => 'manchester', p_borough => 'hackney');
    raise exception 'borough in the wrong city accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.join_waitlist(p_email => 'x@example.com', p_city => 'paris');
    raise exception 'unknown city accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.join_waitlist(p_email => 'x@example.com', p_town => '  ', p_region => 'Wales');
    raise exception 'blank town accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.join_waitlist(p_email => 'x@example.com', p_town => 'Hay', p_region => 'Narnia');
    raise exception 'unknown region accepted';
  exception when sqlstate '22023' then null;
  end;

  -- moves outside the list fall back to Walk
  perform public.join_waitlist(p_email => 'odd@example.com', p_city => 'london', p_borough => 'camden', p_moves => 'Skate');
  assert (select moves from public.waitlist where email = 'odd@example.com') = 'Walk', 'moves falls back';

  -- club claims count each club once, and resubmitting is harmless
  r := public.claim_club(p_club => 'Bermondsey Night Runners', p_city => 'london', p_borough => 'southwark', p_size => '20 to 50', p_role => 'Captain', p_email => 'hello@bnr.co.uk');
  r := public.claim_club(p_club => 'Bermondsey Night Runners', p_city => 'london', p_borough => 'southwark', p_size => '20 to 50', p_role => 'Captain', p_email => 'hello@bnr.co.uk');
  r := public.claim_club(p_club => 'bermondsey night runners', p_city => 'london', p_borough => 'southwark', p_size => '20 to 50', p_role => 'Organiser', p_email => 'other@bnr.co.uk');
  assert (r->>'founding')::int = 1, 'one club, however many claims';
  r := public.claim_club(p_club => 'Hexham Abbey Joggers', p_town => 'Hexham', p_region => 'North East', p_size => 'Under 20', p_role => 'Captain', p_email => 'hi@haj.org');
  assert (r->>'founding')::int = 2, 'clubs anywhere in the UK count';

  perform public.request_black(p_name => 'Kemi', p_email => 'kemi@example.com', p_city => 'glasgow', p_code => 'AMARA123', p_why => 'Kelvin Walkway Sundays');

  -- public stats: totals only, and unverified clubs stay hidden
  s := public.website_stats();
  assert (s->>'total')::int = 7, 'total sign-ups: ' || (s->>'total');
  assert (s->'boroughs'->>'hackney')::int = 2, 'hackney count';
  assert (s->'cities'->>'london')::int = 4, 'london counts every borough';
  assert (s->'cities'->>'manchester')::int = 1, 'manchester count';
  assert (s->'regions'->>'North East')::int = 2, 'north east count';
  assert json_array_length(s->'clubs') = 0, 'unverified clubs are not listed';
  update public.club_claims set status = 'verified';
  s := public.website_stats();
  assert json_array_length(s->'clubs') = 2, 'verified clubs are listed once each';
  assert s->'clubs'->1->>'town' = 'Hexham', 'town clubs carry their town';
  assert s::text !~* 'example\.com|bnr\.co\.uk|haj\.org', 'no emails leak into stats';
end $$;

-- The anon role can call the functions but cannot touch the tables or the place check.
set role anon;
select public.website_stats() is not null as anon_can_read_stats;
do $$ begin
  perform 1 from public.waitlist;
  raise exception 'anon could read the waitlist';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  perform public.website_place('leeds', null, null, null);
  raise exception 'anon could call website_place';
exception when insufficient_privilege then null;
end $$;
reset role;
