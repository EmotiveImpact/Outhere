-- The second pass of web app gaps (part 16): points, area leaders, club
-- covers and gallery, QR scans, run crew, public club views, leaders only
-- channels, the treasurer, fund spending, kit sales, Locals offers, plans,
-- league history and squads, pick-ups near you, daily actives and
-- verification evidence.

\set QUIET on
set client_min_messages = warning;
\o /dev/null

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'ana@example.com', '{"display_name":"Ana"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'ben@example.com', '{"display_name":"Ben"}'),
  ('00000000-0000-0000-0000-0000000000e3', 'cat@example.com', '{"display_name":"Cat"}'),
  ('00000000-0000-0000-0000-0000000000e4', 'dev@example.com', '{"display_name":"Dev"}'),
  ('00000000-0000-0000-0000-0000000000e5', 'eve@example.com', '{"display_name":"Eve"}'),
  ('00000000-0000-0000-0000-0000000000e6', 'fay@example.com', '{"display_name":"Fay"}'),
  ('00000000-0000-0000-0000-0000000000e7', 'gus@example.com', '{"display_name":"Gus"}'),
  ('00000000-0000-0000-0000-0000000000e9', 'mod@example.com', '{"display_name":"Mod"}');
insert into staff (user_id, role) values ('00000000-0000-0000-0000-0000000000e9', 'moderator');
update profiles set borough_id = 'southwark', trust = 'verified' where id::text like '00000000-0000-0000-0000-0000000000e%';

create function pg_temp.act(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, false)
$$;
-- Run a statement and insist it fails with this message (or SQLSTATE).
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
create temp table ids (k text primary key, v text);
grant all on ids to authenticated, anon;

-- ── Season and week points ───────────────────────────────────────────────────
insert into seasons (kind, number, name, starts_on, ends_on)
values ('club', 1, 'Season 1', london_today() - 7, london_today() + 35);

select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$ begin
  perform ingest_steps(london_today(), 12000);
  assert (select points from member_season_points where user_id = auth.uid())
         = (select sum(amount) from ledger where user_id = auth.uid() and currency = 'xp'), 'season points are the season''s XP';
  assert (select points from member_week_points where user_id = auth.uid()
          and week_start = date_trunc('week', london_today())::date)
         = (select points from member_season_points where user_id = auth.uid()), 'week points from the same source';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000e2');
set role authenticated;
do $$ begin
  perform ingest_steps(london_today(), 20000);
  update profiles set public_profile = false where id = auth.uid();
  assert exists (select 1 from member_season_points where user_id = auth.uid()), 'a private member sees their own points';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000e3');
set role authenticated;
do $$ begin
  assert (select count(*) from member_season_points where user_id = '00000000-0000-0000-0000-0000000000e1') = 1, 'others see a public member''s points';
  assert (select count(*) from member_season_points where user_id = '00000000-0000-0000-0000-0000000000e2') = 0, 'not a private member''s';
  assert (select count(*) from member_week_points where user_id = '00000000-0000-0000-0000-0000000000e2') = 0, 'nor their week';
end $$;
reset role;

-- ── Area leaders ─────────────────────────────────────────────────────────────
-- Ana 12,000 (11,000 counted), Ben is private, then Cat, Dev and Eve.
insert into daily_steps (user_id, day, steps) values
  ('00000000-0000-0000-0000-0000000000e3', london_today(), 9000),
  ('00000000-0000-0000-0000-0000000000e4', london_today(), 5000),
  ('00000000-0000-0000-0000-0000000000e5', london_today(), 3000);
select pg_temp.act('00000000-0000-0000-0000-0000000000e5');
set role authenticated;
do $$ begin
  assert (select count(*) from area_leaders where borough_id = 'southwark') = 3, 'top three only';
  assert (select username from area_leaders where borough_id = 'southwark' and rank = 1) = 'ana', 'most counted steps first';
  assert (select counted from area_leaders where borough_id = 'southwark' and rank = 1) = 11000, 'counted steps';
  assert not exists (select 1 from area_leaders where user_id = '00000000-0000-0000-0000-0000000000e2'), 'private members never lead';
  assert (select username from area_leaders where borough_id = 'southwark' and rank = 3) = 'dev', 'Eve is fourth';
  assert (select week_start from area_leaders limit 1) = date_trunc('week', london_today())::date, 'this week';
end $$;
reset role;
select pg_temp.act('');
set role anon;
do $$ begin
  perform pg_temp.raises('select count(*) from area_leaders', '42501');
end $$;
reset role;

-- ── A club to work with ──────────────────────────────────────────────────────
-- Ana is captain, Dev an admin, Ben and Eve members. Cat runs another club.
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare c clubs;
begin
  c := create_club('Peckham Pacers', null, 'london', 'southwark');
  assert c.slug = 'peckhampacers', 'letters and numbers only';
  insert into ids values ('club', c.id);
  insert into club_invites (code, club_id, label, created_by) values ('ryeposter', c.id, 'Poster, Rye Lane', auth.uid());
end $$;
reset role;

select pg_temp.act('');
set role anon;
do $$ begin
  assert record_invite_scan('ryeposter') = (select v::uuid from ids where k = 'club'), 'a scan names the club';
  perform record_invite_scan('RYEPOSTER');
  perform pg_temp.raises($s$select record_invite_scan('nope')$s$, 'INVITE_INVALID');
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000e2');
set role authenticated;
do $$ begin
  perform join_club_by_code('RyePoster');
  assert (select invite_code from club_members where user_id = auth.uid()) = 'ryeposter', 'the code a member joined with';
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e4');
set role authenticated;
do $$ begin perform join_club((select v::uuid from ids where k = 'club')); end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e5');
set role authenticated;
do $$ begin
  perform join_club((select v::uuid from ids where k = 'club'));
  assert (select invite_code from club_members where user_id = auth.uid()) is null, 'no code, no poster';
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e3');
set role authenticated;
do $$
declare c clubs;
begin
  c := create_club('Rye Runners', null, 'london', 'southwark');
  insert into ids values ('club2', c.id);
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e6');
set role authenticated;
do $$ begin perform join_club((select v::uuid from ids where k = 'club2')); end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e7');
set role authenticated;
do $$ begin perform join_club((select v::uuid from ids where k = 'club2')); end $$;
reset role;

-- A club run an hour ago that Ben checked in to.
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare
  cid uuid := (select v::uuid from ids where k = 'club');
  eid uuid;
begin
  perform set_club_role(cid, '00000000-0000-0000-0000-0000000000e4', 'admin');
  insert into events (club_id, city_id, title, starts_at, place_name, created_by)
  values (cid, 'london', 'Tuesday 5k', now() - interval '1 hour', 'Peckham Rye', auth.uid()) returning id into eid;
  insert into ids values ('run', eid);
end $$;
reset role;
insert into event_rsvps (event_id, user_id, status, checked_in_at)
select v::uuid, '00000000-0000-0000-0000-0000000000e2', 'checked_in', now() from ids where k = 'run';

-- ── QR code stats ────────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$ begin
  assert (select scans from club_invite_stats where code = 'ryeposter') = 2, 'two scans';
  assert (select uses from club_invite_stats where code = 'ryeposter') = 1, 'one join';
  assert (select came_to_run from club_invite_stats where code = 'ryeposter') = 1, 'and they came to a run';
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e5');
set role authenticated;
do $$ begin
  assert (select count(*) from club_invite_stats) = 0, 'members do not see code stats';
  assert (select count(*) from club_invite_scans) = 0, 'or scans';
  perform pg_temp.raises($s$insert into club_invite_scans (code) values ('ryeposter')$s$, '42501');
end $$;
reset role;

-- ── Covers and gallery ───────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare cid uuid := (select v::uuid from ids where k = 'club');
begin
  insert into club_covers (club_id, path, created_by) values (cid, cid || '/covers/sunrise.webp', auth.uid());
  insert into club_gallery (club_id, path, alt, created_by) values (cid, cid || '/gallery/rye.webp', 'Ten of us at the bandstand', auth.uid());
  perform pg_temp.raises(format($s$insert into club_covers (club_id, path, created_by) values (%L, 'elsewhere/covers/x.webp', auth.uid())$s$, cid), '23514');
  perform pg_temp.raises(format($s$insert into club_gallery (club_id, path, created_by) values (%L, %L, auth.uid())$s$, cid, cid || '/covers/x.webp'), '23514');
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e5');
set role authenticated;
do $$
declare cid uuid := (select v::uuid from ids where k = 'club');
begin
  perform pg_temp.raises(format($s$insert into club_covers (club_id, path, created_by) values (%L, %L, auth.uid())$s$, cid, cid || '/covers/mine.webp'), '42501');
  perform pg_temp.raises(format($s$insert into club_gallery (club_id, path, created_by) values (%L, %L, auth.uid())$s$, cid, cid || '/gallery/mine.webp'), '42501');
  delete from club_covers;
  update club_gallery set alt = 'mine';
end $$;
reset role;
select pg_temp.act('');
set role anon;
do $$ begin
  assert (select count(*) from club_covers) = 1, 'covers are public, and members cannot remove them';
  assert (select alt from club_gallery) = 'Ten of us at the bandstand', 'the gallery is public, and members cannot edit it';
end $$;
reset role;

-- ── Run crew ─────────────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare eid uuid := (select v::uuid from ids where k = 'run');
begin
  insert into event_crew (event_id, user_id, role) values (eid, '00000000-0000-0000-0000-0000000000e4', 'leader');
  insert into event_crew (event_id, user_id, role) values (eid, '00000000-0000-0000-0000-0000000000e5', 'back_marker');
  perform pg_temp.raises(format($s$insert into event_crew (event_id, user_id, role) values (%L, '00000000-0000-0000-0000-0000000000e3', 'leader')$s$, eid), '42501');
  perform pg_temp.raises(format($s$insert into event_crew (event_id, user_id, role) values (%L, '00000000-0000-0000-0000-0000000000e2', 'pacer')$s$, eid), '23514');
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e2');
set role authenticated;
do $$
declare eid uuid := (select v::uuid from ids where k = 'run');
begin
  perform pg_temp.raises(format($s$insert into event_crew (event_id, user_id, role) values (%L, auth.uid(), 'leader')$s$, eid), '42501');
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e5');
set role authenticated;
do $$ begin
  delete from event_crew where user_id = '00000000-0000-0000-0000-0000000000e4';
  delete from event_crew where user_id = auth.uid();
end $$;
reset role;
select pg_temp.act('');
set role anon;
do $$ begin
  assert (select count(*) from event_crew) = 1, 'crew of a public run is public; crew can step down but not remove others';
  assert (select role from event_crew) = 'leader', 'the leader stays';
end $$;
reset role;

-- ── Treasurer ────────────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000e4');
set role authenticated;
do $$ begin
  perform pg_temp.raises(format($s$select set_club_treasurer(%L, auth.uid())$s$, (select v from ids where k = 'club')), 'NOT_ALLOWED');
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare cid uuid := (select v::uuid from ids where k = 'club');
begin
  perform pg_temp.raises(format($s$select set_club_treasurer(%L, '00000000-0000-0000-0000-0000000000e3')$s$, cid), 'NOT_A_MEMBER');
  perform pg_temp.raises(format($s$update clubs set treasurer_id = auth.uid() where id = %L$s$, cid), '42501');
  assert (set_club_treasurer(cid, '00000000-0000-0000-0000-0000000000e2')).treasurer_id = '00000000-0000-0000-0000-0000000000e2', 'Ben is treasurer';
end $$;
reset role;
do $$ begin
  assert exists (select 1 from audit_log where action = 'set_club_treasurer' and actor_id = '00000000-0000-0000-0000-0000000000e1'), 'logged';
end $$;

-- ── Public club views ────────────────────────────────────────────────────────
insert into club_fund_entries (club_id, month, source, amount_pence)
select v::uuid, date_trunc('month', now())::date, 'locals', 12000 from ids where k = 'club';
select pg_temp.act('');
set role anon;
do $$
declare cid uuid := (select v::uuid from ids where k = 'club');
begin
  assert (select count(*) from club_leaders where club_id = cid) = 3, 'captain, admin and treasurer';
  assert (select role from club_leaders where club_id = cid and username = 'dev') = 'admin', 'with their role';
  assert (select treasurer from club_leaders where club_id = cid and username = 'ben'), 'the treasurer is marked';
  assert not (select treasurer from club_leaders where club_id = cid and username = 'ana'), 'the captain is not';
  assert (select turnout_pct from club_turnout_weeks where club_id = cid) = 25.0, 'one of four members came';
  assert (select total_pence from club_fund_totals where club_id = cid) = 12000, 'money raised';
  assert (select total_pence from club_fund_totals where club_id = (select v::uuid from ids where k = 'club2')) = 0, 'nothing yet';
  assert (select count(*) from club_fund_entries) = 0, 'but not the fund lines';
end $$;
reset role;

-- ── Leaders only channel ─────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare
  cid uuid := (select v::uuid from ids where k = 'club');
  ch uuid;
begin
  insert into club_channels (club_id, name, staff_only_read, sort) values (cid, 'leaders', true, 5) returning id into ch;
  insert into ids values ('leaders', ch);
  insert into club_messages (channel_id, club_id, author_id, body) values (ch, cid, auth.uid(), 'Who can lead Tuesday?');
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e5');
set role authenticated;
do $$
declare
  cid uuid := (select v::uuid from ids where k = 'club');
  ch uuid := (select v::uuid from ids where k = 'leaders');
begin
  assert not exists (select 1 from club_channels where id = ch), 'members do not see the channel';
  assert (select count(*) from club_channels where club_id = cid) = 2, 'only general and announcements';
  assert not exists (select 1 from club_messages where channel_id = ch), 'or read it';
  assert not exists (select 1 from club_unread(cid) where channel_id = ch), 'or count it unread';
  perform pg_temp.raises(format($s$insert into club_messages (channel_id, club_id, author_id, body) values (%L, %L, auth.uid(), 'hi')$s$, ch, cid), '42501');
  perform pg_temp.raises(format($s$select read_channel(%L)$s$, ch), 'NOT_ALLOWED');
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e4');
set role authenticated;
do $$
declare
  cid uuid := (select v::uuid from ids where k = 'club');
  ch uuid := (select v::uuid from ids where k = 'leaders');
begin
  assert exists (select 1 from club_channels where id = ch), 'admins see it';
  assert (select count(*) from club_messages where channel_id = ch) = 1, 'and read it';
  assert (select unread from club_unread(cid) where channel_id = ch) = 1, 'with an unread count';
  insert into club_messages (channel_id, club_id, author_id, body) values (ch, cid, auth.uid(), 'Me');
  perform read_channel(ch);
end $$;
reset role;

-- ── Fund spending ────────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000e2');
set role authenticated;
do $$
declare
  cid uuid := (select v::uuid from ids where k = 'club');
  s club_fund_spend;
begin
  s := add_fund_spend(cid, 'Head torches', 2500, london_today(), cid || '/receipts/torches.jpg');
  assert s.created_by = auth.uid() and s.approved_by is null, 'the treasurer logs a spend';
  insert into ids values ('spend', s.id);
  perform pg_temp.raises(format($s$select approve_fund_spend(%L)$s$, s.id), 'SECOND_PERSON_NEEDED');
  perform pg_temp.raises(format($s$select add_fund_spend(%L, 'Cones', 900, null, 'elsewhere/r.jpg')$s$, cid), '23514');
  perform pg_temp.raises(format($s$select add_fund_spend(%L, 'Cones', 0)$s$, cid), '23514');
  perform pg_temp.raises(format($s$insert into club_fund_spend (club_id, title, amount_pence, spent_on) values (%L, 'Sneaky', 100, london_today())$s$, cid), '42501');
  assert (select count(*) from club_fund_spend) = 1, 'the treasurer sees spending';
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e4');
set role authenticated;
do $$
declare
  cid uuid := (select v::uuid from ids where k = 'club');
  s club_fund_spend;
begin
  s := add_fund_spend(cid, 'First aid kit', 1800);
  insert into ids values ('spend2', s.id);
  perform pg_temp.raises(format($s$select approve_fund_spend(%L)$s$, (select v from ids where k = 'spend')), 'NOT_ALLOWED');
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e5');
set role authenticated;
do $$ begin
  perform pg_temp.raises(format($s$select add_fund_spend(%L, 'Snacks', 500)$s$, (select v from ids where k = 'club')), 'NOT_ALLOWED');
  assert (select count(*) from club_fund_spend) = 0, 'members do not see spending';
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare s club_fund_spend;
begin
  s := approve_fund_spend((select v::uuid from ids where k = 'spend'));
  assert s.approved_by = auth.uid() and s.approved_at is not null, 'the captain approves';
  perform pg_temp.raises(format($s$select approve_fund_spend(%L)$s$, s.id), 'ALREADY_DECIDED');
  delete from club_fund_spend where id = s.id;
  delete from club_fund_spend where id = (select v::uuid from ids where k = 'spend2');
  assert (select count(*) from club_fund_spend) = 1, 'an approved spend stays; an unapproved one can be taken back';
end $$;
reset role;
do $$ begin
  assert (select count(*) from audit_log where action in ('add_fund_spend', 'approve_fund_spend')) = 3, 'spending is logged';
end $$;

-- ── Kit sales ────────────────────────────────────────────────────────────────
insert into drops (title, price_out, stock, opens_at, club_id, price_pence, making_cost_pence)
select 'Pacers tee', 0, 10, now() - interval '1 hour', v::uuid, 2500, 1200 from ids where k = 'club';
select pg_temp.act('00000000-0000-0000-0000-0000000000e5');
set role authenticated;
do $$ begin
  perform reserve_drop((select id from drops where title = 'Pacers tee'));
  assert (select count(*) from drop_sales) = 0, 'members do not see sales';
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$ begin
  assert (select sold from drop_sales) = 1, 'club staff see what sold';
  assert (select making_cost_pence from drop_sales) = 1200, 'and what it costs to make';
end $$;
reset role;
select pg_temp.act('');
set role anon;
do $$ begin
  perform pg_temp.raises('select count(*) from drop_sales', '42501');
end $$;
reset role;

-- ── Locals offers ────────────────────────────────────────────────────────────
-- An unapproved offer, one approved by two and one more for a pick-up.
insert into locals_partners (club_id, business_name, category, tier, monthly_pence, starts_on, approved_by)
select v::uuid, n, 'cafe', 'partner', 15000, london_today(), a
from ids, (values ('Rye Lane Coffee', '{}'::uuid[]),
                  ('Peckham Physio', array['00000000-0000-0000-0000-0000000000e9', '00000000-0000-0000-0000-0000000000e1']::uuid[]),
                  ('Khan Pharmacy', array['00000000-0000-0000-0000-0000000000e9', '00000000-0000-0000-0000-0000000000e1']::uuid[])) o(n, a)
where k = 'club';
select pg_temp.act('');
set role anon;
do $$ begin
  assert (select count(*) from locals_partners) = 2, 'approved offers are public';
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e5');
set role authenticated;
do $$ begin
  assert not exists (select 1 from locals_partners where business_name = 'Rye Lane Coffee'), 'members do not see unapproved offers';
  perform pg_temp.raises(format($s$select respond_to_offer(%L, true)$s$,
    (select id from locals_partners where business_name = 'Peckham Physio')), 'NOT_ALLOWED');
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare l locals_partners;
begin
  assert exists (select 1 from locals_partners where business_name = 'Rye Lane Coffee'), 'club staff see an unapproved offer';
  l := respond_to_offer((select id from locals_partners where business_name = 'Rye Lane Coffee'), true);
  assert l.club_response = 'accepted' and l.responded_by = auth.uid(), 'accepted';
  perform pg_temp.raises(format($s$select respond_to_offer(%L, false)$s$, l.id), 'ALREADY_ANSWERED');
  l := respond_to_offer((select id from locals_partners where business_name = 'Peckham Physio'), false);
  assert l.club_response = 'declined', 'declined';
end $$;
reset role;
do $$ begin
  assert exists (select 1 from audit_log where action = 'respond_to_offer'), 'answers are logged';
end $$;
select pg_temp.act('');
set role anon;
do $$ begin
  assert (select count(*) from locals_partners) = 1, 'a declined offer is not shown';
  assert (select business_name from locals_partners) = 'Khan Pharmacy', 'the open approved one still is';
end $$;
reset role;

-- ── Pick-ups: Locals, open battles and near you ──────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000e5');
set role authenticated;
do $$ begin
  perform pg_temp.raises(format($s$insert into events (city_id, kind, title, starts_at, place_name, created_by, locals_partner_id)
    values ('london', 'pickup', 'Coffee walk', now() + interval '1 day', 'Rye Lane', auth.uid(), %L)$s$,
    (select id from locals_partners where business_name = 'Khan Pharmacy')), 'NOT_ALLOWED');
  insert into events (city_id, kind, title, starts_at, place_name, created_by, lat, lng, data) values
    ('london', 'pickup', 'Most steps today', now() + interval '1 hour', 'Anywhere in Southwark', auth.uid(), 51.4700, -0.0700,
     '{"open_battle": {"mode": "most_steps"}}'),
    ('london', 'pickup', 'Bandstand 5k', now() + interval '2 hours', 'Peckham Rye', auth.uid(), 51.4597, -0.0656, '{}'),
    ('london', 'pickup', 'Long gone', now() - interval '5 hours', 'Peckham Rye', auth.uid(), 51.4597, -0.0656, '{}'),
    ('manchester', 'pickup', 'Canal run', now() + interval '2 hours', 'Castlefield', auth.uid(), 53.4740, -2.2550, '{}');
  assert (select data->'open_battle'->>'mode' from events where title = 'Most steps today') = 'most_steps', 'an open battle';
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$ begin
  insert into events (club_id, city_id, kind, title, starts_at, place_name, created_by, locals_partner_id, visibility, lat, lng)
  values ((select v::uuid from ids where k = 'club'), 'london', 'pickup', 'Coffee walk', now() + interval '1 day', 'Rye Lane',
          auth.uid(), (select id from locals_partners where business_name = 'Khan Pharmacy'), 'members', 51.4600, -0.0660);
  assert (select locals_partner_id is not null from events where title = 'Coffee walk'), 'club staff post a Locals pick-up';
  perform pg_temp.raises(format($s$update events set locals_partner_id = %L where title = 'Coffee walk'$s$,
    (select id from locals_partners where business_name = 'Peckham Physio')), 'NOT_ALLOWED');
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e5');
set role authenticated;
do $$ begin
  assert (select count(*) from pickups_near(51.4600, -0.0660, 5)) = 3, 'nearby, not finished, members only included for members';
  assert (select title from pickups_near(51.4600, -0.0660, 5) limit 1) = 'Coffee walk', 'nearest first';
  assert (select count(*) from pickups_near(51.4600, -0.0660, 0.5)) = 2, 'a smaller radius';
  assert (select count(*) from pickups_near(51.4600, -0.0660, 1000) where city_id = 'manchester') = 0, 'at most 50 km';
end $$;
reset role;
select pg_temp.act('');
set role anon;
do $$ begin
  assert (select count(*) from pickups_near(51.4600, -0.0660, 5)) = 2, 'signed out visitors see public pick-ups only';
end $$;
reset role;

-- ── Plans ────────────────────────────────────────────────────────────────────
select pg_temp.act('');
set role anon;
do $$ begin
  assert (select count(*) from plans) = 3, 'three plans, public';
  assert (select monthly_pence from plans where tier = 'pro') = 599, 'Pro £5.99';
  assert (select monthly_pence from plans where tier = 'black') = 1299, 'Black £12.99';
  assert (select yearly_pence from plans where tier = 'black') = 12999, 'Black £129.99 a year';
  assert (select yearly_pence from plans where tier = 'pro') is null, 'no Pro yearly price yet';
  assert (select monthly_pence from plans where tier = 'free') = 0, 'Free is free';
  perform pg_temp.raises($s$insert into plans (tier, name, monthly_pence) values ('free', 'Cheap', 1)$s$, '42501');
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e9');
set role authenticated;
do $$ begin
  perform pg_temp.raises($s$update plans set monthly_pence = 1 where tier = 'pro'$s$, '42501');
end $$;
reset role;
-- The club shares match what credit_club_fund pays.
insert into subscriptions (user_id, tier, source, status, provider_ref, referral_club_id, current_period_end, created_at)
select '00000000-0000-0000-0000-0000000000e5', 'black', 'app_store', 'active', 'test:eve', v::uuid, now() + interval '1 month', now() - interval '2 months'
from ids where k = 'club';
update clubs set status = 'verified' where id = (select v::uuid from ids where k = 'club');
do $$ begin
  perform credit_club_fund(date_trunc('month', now() - interval '1 month')::date);
  assert (select amount_pence from club_fund_entries where subscription_id is not null)
         = (select club_share_app_pence from plans where tier = 'black'), 'Black through the app';
end $$;

-- ── League history, squads and side stats ────────────────────────────────────
-- Three days of steps for both clubs; Ana's club walks more.
insert into daily_steps (user_id, day, steps)
select u.id::uuid, london_today() - d, u.s
from (values ('00000000-0000-0000-0000-0000000000e1', 9000), ('00000000-0000-0000-0000-0000000000e2', 12000),
             ('00000000-0000-0000-0000-0000000000e4', 7000), ('00000000-0000-0000-0000-0000000000e5', 8000),
             ('00000000-0000-0000-0000-0000000000e3', 4000), ('00000000-0000-0000-0000-0000000000e6', 5000),
             ('00000000-0000-0000-0000-0000000000e7', 6000)) u(id, s)
cross join generate_series(1, 3) d;
do $$
declare d uuid; h uuid; a uuid; f uuid;
begin
  insert into divisions (season_id, name, squad_size) values ((select id from seasons where number = 1), 'Division 1', 10) returning id into d;
  insert into league_entries (division_id, club_id) values (d, (select v::uuid from ids where k = 'club')) returning id into h;
  insert into league_entries (division_id, club_id) values (d, (select v::uuid from ids where k = 'club2')) returning id into a;
  insert into fixtures (division_id, week, home_id, away_id, starts_on, ends_on)
  values (d, 1, h, a, london_today() - 3, london_today() - 1) returning id into f;
  insert into ids values ('home', h), ('away', a), ('fixture', f);
  assert draw_fixture(f, 'seed') = 3, 'equal squads of three';
  assert (select array_agg(squad_number order by squad_number) from squad_members where entry_id = h) = array[1, 2, 3], 'numbered home squad';
  assert (select array_agg(squad_number order by squad_number) from squad_members where entry_id = a) = array[1, 2, 3], 'numbered away squad';
end $$;

-- One of the home squad came to a club run during the fixture.
do $$
declare eid uuid;
begin
  insert into events (club_id, city_id, title, starts_at, place_name, created_by)
  values ((select v::uuid from ids where k = 'club'), 'london', 'Sunday long', (london_today() - 2)::timestamp + interval '9 hours',
          'Peckham Rye', '00000000-0000-0000-0000-0000000000e1') returning id into eid;
  insert into event_rsvps (event_id, user_id, status, checked_in_at)
  select eid, user_id, 'checked_in', now() from squad_members
  where entry_id = (select v::uuid from ids where k = 'home') order by squad_number limit 1;
end $$;

select pg_temp.act('');
set role anon;
do $$
declare
  f uuid := (select v::uuid from ids where k = 'fixture');
  h uuid := (select v::uuid from ids where k = 'home');
  s record;
begin
  select * into s from fixture_side_stats(f, h);
  assert s.squad = 3, 'squad size';
  assert s.turnout_pct = 33.3, 'one of three came to a run';
  assert s.score = fixture_side_score(f, h), 'score as the league has it';
  assert s.score > s.average, 'the score has the turnout lift, the average does not';
  assert (select count(*) from fixture_side_stats(f, (select v::uuid from ids where k = 'away'))) = 1, 'the away side too';
  assert (select count(*) from fixture_side_stats(f, gen_random_uuid())) = 0, 'not a side in this fixture';
end $$;
reset role;

do $$
declare
  f uuid := (select v::uuid from ids where k = 'fixture');
  h uuid := (select v::uuid from ids where k = 'home');
  a uuid := (select v::uuid from ids where k = 'away');
begin
  perform settle_fixture(f);
  assert (select count(*) from squad_members where fixture_id = f and counted is null) = 0, 'counted steps filled';
  assert (select counted from squad_members where entry_id = h and rank = 1)
         = (select max(counted) from squad_members where entry_id = h), 'most steps ranks first';
  assert (select array_agg(rank order by rank) from squad_members where entry_id = a) = array[1, 2, 3], 'places in the away squad';
  assert (select counted from squad_members where user_id = '00000000-0000-0000-0000-0000000000e7') = 18000, 'three days counted';
  assert (select position from league_entry_history where entry_id = h and fixture_id = f) = 1, 'up to first';
  assert (select points from league_entry_history where entry_id = h and fixture_id = f) = 3, 'with three points';
  assert (select position from league_entry_history where entry_id = a and fixture_id = f) = 2, 'away side second';
  assert (select score from fixture_side_stats(f, h)) = (select home_score from fixtures where id = f), 'stored score after the reveal';
end $$;
select pg_temp.act('');
set role anon;
do $$ begin
  assert (select count(*) from league_entry_history) = 2, 'history is public';
  perform pg_temp.raises($s$insert into league_entry_history (entry_id, fixture_id, position, points)
                            select entry_id, fixture_id, 1, 99 from league_entry_history limit 1$s$, '42501');
end $$;
reset role;

-- ── Daily actives ────────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000e5');
set role authenticated;
do $$ begin
  perform pg_temp.raises('select * from admin_daily_active(7)', 'NOT_ALLOWED');
end $$;
reset role;
select pg_temp.act('');
set role anon;
do $$ begin
  perform pg_temp.raises('select * from admin_daily_active(7)', '42501');
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e9');
set role authenticated;
do $$ begin
  assert (select count(*) from admin_daily_active(7)) = 7, 'one row a day';
  assert (select max(day) from admin_daily_active(7)) = london_today(), 'up to today';
  assert (select active from admin_daily_active(7) where day = london_today()) = 5, 'five moved today';
  assert (select active from admin_daily_active(7) where day = london_today() - 2) = 7, 'seven two days ago';
  assert (select active from admin_daily_active(7) where day = london_today() - 6) = 0, 'empty days show 0';
  assert (select count(*) from admin_daily_active(5000)) = 365, 'at most a year';
end $$;
reset role;

-- ── Verification evidence ────────────────────────────────────────────────────
update clubs set status = 'founding', verified_at = null where id = (select v::uuid from ids where k = 'club');
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare
  cid uuid := (select v::uuid from ids where k = 'club');
  r club_verifications;
begin
  r := request_club_verification(cid, array[cid || '/verification/meetup1.jpg']);
  assert r.status = 'pending' and r.kind = 'founding', 'evidence sent';
  insert into ids values ('verification', r.id);
  r := request_club_verification(cid, array[cid || '/verification/meetup2.jpg', cid || '/verification/meetup1.jpg']);
  assert r.id = (select v::uuid from ids where k = 'verification') and cardinality(r.evidence_paths) = 2, 'more evidence joins the open request';
  perform pg_temp.raises(format($s$select request_club_verification(%L, array['elsewhere/x.jpg'])$s$, cid), 'BAD_PATH');
  perform pg_temp.raises(format($s$select set_verification_check(%L, 'meetups_seen', true)$s$, r.id), 'NOT_ALLOWED');
  perform pg_temp.raises(format($s$select decide_club_verification(%L, true)$s$, r.id), 'NOT_ALLOWED');
  perform pg_temp.raises(format($s$insert into club_verifications (club_id, kind) values (%L, 'founding')$s$, cid), '42501');
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e5');
set role authenticated;
do $$ begin
  perform pg_temp.raises(format($s$select request_club_verification(%L)$s$, (select v from ids where k = 'club')), 'NOT_ALLOWED');
  assert (select count(*) from club_verifications) = 0, 'members do not see verifications';
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e9');
set role authenticated;
do $$
declare
  vid uuid := (select v::uuid from ids where k = 'verification');
  r club_verifications;
begin
  r := set_verification_check(vid, 'meetups_seen', true);
  r := set_verification_check(vid, 'ten_runners', false);
  assert r.checks = '{"meetups_seen": true, "ten_runners": false}'::jsonb, 'manual checks kept';
  perform pg_temp.raises(format($s$select set_verification_check(%L, 'Bad Check', true)$s$, vid), 'BAD_CHECK');
  perform pg_temp.raises(format($s$select request_club_verification(%L, '{}', 'claim', 999999)$s$, (select v from ids where k = 'club')), 'NOT_FOUND');
  r := decide_club_verification(vid, true);
  assert r.status = 'approved' and r.decided_by = auth.uid() and r.decided_at is not null, 'approved';
  assert (select status from clubs where id = r.club_id) = 'verified', 'the club is verified';
  perform pg_temp.raises(format($s$select set_verification_check(%L, 'late', true)$s$, vid), 'ALREADY_DECIDED');
  perform pg_temp.raises(format($s$select decide_club_verification(%L, false)$s$, vid), 'ALREADY_DECIDED');
  assert (select count(*) from audit_log where actor_id = auth.uid()
          and action in ('set_verification_check', 'decide_club_verification', 'verify_club')) = 4, 'each step logged';
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$ begin
  assert (select checks->>'meetups_seen' from club_verifications) = 'true', 'club staff see the outcome';
end $$;
reset role;

-- ── A treasurer who leaves ───────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000e2');
set role authenticated;
do $$ begin perform leave_club((select v::uuid from ids where k = 'club')); end $$;
reset role;
do $$ begin
  assert (select treasurer_id from clubs where id = (select v::uuid from ids where k = 'club')) is null, 'leaving clears the treasurer';
end $$;

\o
\echo 'web gaps two ok'
