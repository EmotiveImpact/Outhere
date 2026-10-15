-- Checks for db/website.sql. Run after the app migrations, the seed and website.sql.
-- Raises an exception (and so fails the run) on the first broken rule.
do $$
declare r json; r2 json; s json; n int;
begin
  -- joining gives a place, a code and the borough's count
  r := public.join_waitlist('Amara@Example.com', 'southwark', 'Run', 'Peckham Pacers');
  assert (r->>'position')::int = 1, 'first sign-up is #1';
  assert (r->>'boroughCount')::int = 1, 'southwark has one';
  assert r->>'code' ~ '^AMARA[0-9]{3}$', 'code comes from the email: ' || (r->>'code');

  -- joining again with the same email (any case) returns the same place, not a new row
  r2 := public.join_waitlist('amara@example.com', 'hackney');
  assert r2->>'code' = r->>'code', 'same person keeps their code';
  select count(*) into n from public.waitlist;
  assert n = 1, 'no duplicate rows';

  -- each friend who joins with your code moves you up 100 places (never above #1)
  perform public.join_waitlist('kemi@example.com', 'hackney', 'Walk', null, lower(r->>'code'));
  select count(*) into n from public.waitlist where referred_by = r->>'code';
  assert n = 1, 'referral recorded case-insensitively';
  perform public.join_waitlist('nobody@example.com', 'hackney', 'Walk', null, 'NOTACODE');
  select count(*) into n from public.waitlist where email = 'nobody@example.com' and referred_by is null;
  assert n = 1, 'unknown referral code is ignored';

  -- bad input is refused
  begin
    perform public.join_waitlist('not-an-email', 'southwark');
    raise exception 'bad email accepted';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.join_waitlist('x@example.com', 'atlantis');
    raise exception 'unknown borough accepted';
  exception when foreign_key_violation then null;
  end;

  -- moves outside the list fall back to Walk
  perform public.join_waitlist('odd@example.com', 'camden', 'Skate');
  assert (select moves from public.waitlist where email = 'odd@example.com') = 'Walk', 'moves falls back';

  -- club claims count each club once, and resubmitting is harmless
  r := public.claim_club('Bermondsey Night Runners', 'southwark', '20 to 50', 'Captain', 'hello@bnr.co.uk');
  r := public.claim_club('Bermondsey Night Runners', 'southwark', '20 to 50', 'Captain', 'hello@bnr.co.uk');
  r := public.claim_club('bermondsey night runners', 'southwark', '20 to 50', 'Organiser', 'other@bnr.co.uk');
  assert (r->>'founding')::int = 1, 'one club, however many claims';

  perform public.request_black('Kemi', 'kemi@example.com', 'hackney', 'AMARA123', 'Hackney Marshes Sundays');

  -- public stats: totals only, and unverified clubs stay hidden
  s := public.website_stats();
  assert (s->>'total')::int = 4, 'total sign-ups';
  assert (s->'boroughs'->>'hackney')::int = 2, 'hackney count';
  assert json_array_length(s->'clubs') = 0, 'unverified clubs are not listed';
  update public.club_claims set status = 'verified' where email = 'hello@bnr.co.uk';
  s := public.website_stats();
  assert json_array_length(s->'clubs') = 1, 'verified club is listed';
  assert s::text !~* 'example\.com|bnr\.co\.uk', 'no emails leak into stats';
end $$;

-- The anon role can call the functions but cannot touch the tables.
set role anon;
select public.website_stats() is not null as anon_can_read_stats;
do $$ begin
  perform 1 from public.waitlist;
  raise exception 'anon could read the waitlist';
exception when insufficient_privilege then null;
end $$;
reset role;
