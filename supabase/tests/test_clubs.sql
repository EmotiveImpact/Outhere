-- Run clubs and club v club: claiming a club from the app, review, a steps
-- friendly from challenge to result, a mystery challenger, the relay and a
-- league fixture settling into the table.

\set QUIET on
set client_min_messages = warning;
\o /dev/null

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'ade@example.com', '{"display_name":"Ade"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'bea@example.com', '{"display_name":"Bea"}'),
  ('00000000-0000-0000-0000-0000000000c3', 'cal@example.com', '{"display_name":"Cal"}'),
  ('00000000-0000-0000-0000-0000000000c9', 'staff@example.com', '{"display_name":"Staff"}');
insert into staff (user_id, role) values ('00000000-0000-0000-0000-0000000000c9', 'moderator');

create function pg_temp.act(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, false)
$$;
create temp table ids (k text primary key, v text);
grant all on ids to authenticated;

-- ── Claim your club ──────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
do $$
declare j json;
begin
  begin
    perform claim_my_club('Southbank Runners', 'Gabriel''s Wharf', 'Tue and Thu 19:00', 2016, 'instagram', '');
    raise exception 'claim without proof';
  exception when raise_exception then
    if sqlerrm <> 'PROOF_REQUIRED' then raise; end if;
  end;
  j := claim_my_club('Southbank Runners', 'Gabriel''s Wharf', 'Tue and Thu 19:00', 2016, 'instagram', '@southbankrunners');
  assert (j->>'code') ~ '^[0-9]{6}$', 'a six digit code for the bio';
  insert into ids values ('claim_a', j->>'id');
  begin
    perform claim_my_club('Southbank Runners', 'x', 'y', null, 'instagram', '@x');
    raise exception 'same claim twice';
  exception when raise_exception then
    if sqlerrm <> 'ALREADY_CLAIMED' then raise; end if;
  end;
  assert (select count(*) from club_claims) = 1, 'claimants see their own claim';
  begin
    perform review_club_claim((select v::bigint from ids where k = 'claim_a'), true);
    raise exception 'claimant approved their own claim';
  exception when raise_exception then
    if sqlerrm <> 'NOT_ALLOWED' then raise; end if;
  end;
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
set role authenticated;
do $$
declare j json;
begin
  assert (select count(*) from club_claims) = 0, 'other people''s claims are hidden';
  j := claim_my_club('Peckham Pacers', 'Peckham Rye', 'Wed 18:30', 2019, 'call', null, now() + interval '2 days');
  assert j->>'code' is null, 'a video call needs no code';
  insert into ids values ('claim_b', j->>'id');
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000c9');
set role authenticated;
do $$
declare a uuid; b uuid;
begin
  a := review_club_claim((select v::bigint from ids where k = 'claim_a'), true);
  b := review_club_claim((select v::bigint from ids where k = 'claim_b'), true);
  insert into ids values ('club_a', a), ('club_b', b);
end $$;
reset role;

do $$
declare a uuid := (select v::uuid from ids where k = 'club_a');
begin
  assert (select status from clubs where id = a) = 'verified', 'approved club is verified';
  assert (select slug from clubs where id = a) = 'southbank-runners', 'slug from the name';
  assert (select instagram from clubs where id = a) = 'southbankrunners', 'proof handle kept, no @';
  assert club_role_of(a, '00000000-0000-0000-0000-0000000000c1') = 'captain', 'claimant is captain';
  assert (select tier from profiles where id = '00000000-0000-0000-0000-0000000000c1') = 'pro', 'organisers get Pro';
  assert exists (select 1 from notifications where user_id = '00000000-0000-0000-0000-0000000000c1' and title = 'Southbank Runners is official'), 'claimant told';
end $$;

select pg_temp.act('00000000-0000-0000-0000-0000000000c3');
set role authenticated;
select join_club((select v::uuid from ids where k = 'club_a'));
do $$
begin
  begin
    perform challenge_club((select v::uuid from ids where k = 'club_a'), (select v::uuid from ids where k = 'club_b'), 'steps');
    raise exception 'member challenged a club';
  exception when raise_exception then
    if sqlerrm <> 'CAPTAINS_ONLY' then raise; end if;
  end;
end $$;
reset role;

-- ── A steps friendly ─────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
do $$
declare b club_battles;
begin
  begin
    perform challenge_club((select v::uuid from ids where k = 'club_a'), (select v::uuid from ids where k = 'club_b'), 'turf_war');
    raise exception 'turf war opened';
  exception when raise_exception then
    if sqlerrm <> 'MODE_NOT_READY' then raise; end if;
  end;
  b := challenge_club((select v::uuid from ids where k = 'club_a'), (select v::uuid from ids where k = 'club_b'), 'steps', now() + interval '1 hour', 48);
  assert not b.mystery and b.status = 'pending', 'named challenge is pending';
  insert into ids values ('steps', b.id);
  begin
    perform challenge_club((select v::uuid from ids where k = 'club_a'), (select v::uuid from ids where k = 'club_b'), 'relay');
    raise exception 'two friendlies at once';
  exception when raise_exception then
    if sqlerrm <> 'ALREADY_PLAYING' then raise; end if;
  end;
  assert (select count(*) from club_battles) = 0, 'no direct reads';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
set role authenticated;
do $$
declare b club_battles; r record;
begin
  perform vote_club_battle((select v::uuid from ids where k = 'steps'), true);
  select * into r from club_battles_for((select v::uuid from ids where k = 'club_b'));
  assert r.opponent_name = 'Southbank Runners' and r.yes_votes = 1 and r.my_vote, 'named challenger, vote counted';
  b := respond_club_battle((select v::uuid from ids where k = 'steps'), true);
  assert b.status = 'accepted', 'accepted, starts later';
  begin
    perform club_battles_for((select v::uuid from ids where k = 'club_a'));
    raise exception 'read another club''s battles';
  exception when raise_exception then
    if sqlerrm <> 'NOT_ALLOWED' then raise; end if;
  end;
end $$;
reset role;

-- Started yesterday; steps from both sides.
update club_battles set starts_at = now() - interval '1 day', ends_at = now() + interval '1 day'
where id = (select v::uuid from ids where k = 'steps');
select settle_due_club_battles();
insert into daily_steps (user_id, day, steps) values
  ('00000000-0000-0000-0000-0000000000c1', london_today(), 9000),
  ('00000000-0000-0000-0000-0000000000c3', london_today(), 4000),
  ('00000000-0000-0000-0000-0000000000c2', london_today(), 8000);

select pg_temp.act('00000000-0000-0000-0000-0000000000c3');
set role authenticated;
do $$
declare r record;
begin
  select * into r from club_battles_for((select v::uuid from ids where k = 'club_a'));
  assert r.status = 'live' and r.squad = 1, 'live, squads of one (the smaller club)';
  assert r.my_score = 9000 and r.their_score = 8000, 'best squad member counts: ' || r.my_score || ' v ' || r.their_score;
end $$;
reset role;

update club_battles set ends_at = now() - interval '1 minute' where id = (select v::uuid from ids where k = 'steps');
select settle_due_club_battles();
do $$
declare b club_battles;
begin
  select * into b from club_battles where id = (select v::uuid from ids where k = 'steps');
  assert b.status = 'finished' and b.winner_club = (select v::uuid from ids where k = 'club_a'), 'Southbank win the friendly';
  assert exists (select 1 from notifications where user_id = '00000000-0000-0000-0000-0000000000c2' and title = 'Your club lost this one'), 'losers told';
end $$;

-- ── A mystery challenger ─────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000c2');
set role authenticated;
do $$
declare b club_battles;
begin
  b := challenge_club((select v::uuid from ids where k = 'club_b'), null, 'relay', now() + interval '2 hours');
  assert b.mystery and b.opponent_club = (select v::uuid from ids where k = 'club_a'), 'random club in the city';
  assert b.ends_at - b.starts_at = interval '2 hours', 'relay runs two hours';
  insert into ids values ('relay', b.id);
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000c3');
set role authenticated;
do $$
declare r record;
begin
  select * into r from club_battles_for((select v::uuid from ids where k = 'club_a')) where id = (select v::uuid from ids where k = 'relay');
  assert r.mystery and r.opponent_name is null and r.opponent_id is null, 'challenger hidden until the reveal';
  begin
    perform respond_club_battle(r.id, true);
    raise exception 'member accepted for the club';
  exception when raise_exception then
    if sqlerrm <> 'CAPTAINS_ONLY' then raise; end if;
  end;
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
select respond_club_battle((select v::uuid from ids where k = 'relay'), true);
reset role;
update club_battles set starts_at = now() - interval '1 hour', ends_at = now() + interval '1 hour', status = 'live'
where id = (select v::uuid from ids where k = 'relay');

-- Ade runs a 1.2 km in 5:00 (4:10 per km); Bea's side posts nothing.
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
select save_run(now() - interval '20 minutes', now() - interval '15 minutes', 1200, 300);
do $$
declare r record;
begin
  select * into r from club_battles_for((select v::uuid from ids where k = 'club_a')) where id = (select v::uuid from ids where k = 'relay');
  assert r.opponent_name = 'Peckham Pacers', 'revealed once it starts';
  assert r.my_score = 250 and r.their_score is null, 'leg time pro rata: ' || coalesce(r.my_score::text, 'null');
end $$;
reset role;
update club_battles set ends_at = now() - interval '1 minute' where id = (select v::uuid from ids where k = 'relay');
select settle_due_club_battles();
do $$
begin
  assert (select winner_club from club_battles where id = (select v::uuid from ids where k = 'relay'))
         = (select v::uuid from ids where k = 'club_a'), 'a side with no legs loses';
end $$;

-- ── League fixture ───────────────────────────────────────────────────────────
do $$
declare s uuid; d uuid; ea uuid; eb uuid; f uuid;
begin
  insert into seasons (kind, number, name, starts_on, ends_on) values ('club', 1, 'Season 1', london_today() - 3, london_today() + 39) returning id into s;
  insert into divisions (season_id, name, squad_size) values (s, 'Championship', 25) returning id into d;
  insert into league_entries (division_id, club_id) values (d, (select v::uuid from ids where k = 'club_a')) returning id into ea;
  insert into league_entries (division_id, club_id) values (d, (select v::uuid from ids where k = 'club_b')) returning id into eb;
  insert into fixtures (division_id, week, home_id, away_id, is_derby, starts_on, ends_on, drawn_at)
  values (d, 1, ea, eb, true, london_today() - 1, london_today(), now()) returning id into f;
  insert into squad_members (fixture_id, entry_id, user_id) values
    (f, ea, '00000000-0000-0000-0000-0000000000c1'), (f, ea, '00000000-0000-0000-0000-0000000000c3'),
    (f, eb, '00000000-0000-0000-0000-0000000000c2');
  insert into ids values ('fixture', f), ('entry_a', ea), ('entry_b', eb);
end $$;

select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
do $$
declare j json;
begin
  j := fixture_view((select v::uuid from ids where k = 'fixture'));
  assert (j->>'home_score')::numeric = 6500 and (j->>'away_score')::numeric = 8000, 'squad averages: ' || j::text;
  assert (j->>'home_out')::int = 1 and (j->>'my_steps')::int = 9000, 'Ade ran today and is in the squad';
  assert (j->>'my_lift')::int = 1250, 'Ade lifts the average: ' || (j->>'my_lift');
end $$;
reset role;

select settle_fixture((select v::uuid from ids where k = 'fixture'));
do $$
begin
  assert (select points from league_entries where id = (select v::uuid from ids where k = 'entry_b')) = 6, 'derby win is worth double';
  assert (select lost from league_entries where id = (select v::uuid from ids where k = 'entry_a')) = 1, 'loss recorded';
  assert (select revealed_at from fixtures where id = (select v::uuid from ids where k = 'fixture')) is not null, 'revealed';
end $$;
select settle_fixture((select v::uuid from ids where k = 'fixture'));
do $$
begin
  assert (select played from league_entries where id = (select v::uuid from ids where k = 'entry_b')) = 1, 'settles once';
end $$;

-- ── Club streak ──────────────────────────────────────────────────────────────
do $$
declare e uuid; a uuid := (select v::uuid from ids where k = 'club_a');
begin
  insert into events (club_id, city_id, kind, title, starts_at, place_name, created_by)
  values (a, 'london', 'club_run', 'Bridges 5k', now() - interval '7 days', 'Gabriel''s Wharf', '00000000-0000-0000-0000-0000000000c1') returning id into e;
  insert into event_rsvps (event_id, user_id, status, checked_in_at) values (e, '00000000-0000-0000-0000-0000000000c3', 'checked_in', now() - interval '7 days');
  insert into events (club_id, city_id, kind, title, starts_at, place_name, created_by)
  values (a, 'london', 'club_run', 'Bridges 5k', now() - interval '14 days', 'Gabriel''s Wharf', '00000000-0000-0000-0000-0000000000c1') returning id into e;
  insert into event_rsvps (event_id, user_id, status, checked_in_at) values (e, '00000000-0000-0000-0000-0000000000c3', 'checked_in', now() - interval '14 days');
  assert club_streak(a, '00000000-0000-0000-0000-0000000000c3') = 2, 'two weeks running';
end $$;

\o
select 'clubs ok';
