-- Rules and Row Level Security tests. Each block acts as a member by setting
-- the JWT subject and switching to the authenticated role, the way PostgREST
-- does, and raises if a rule doesn't hold.

\set QUIET on
set client_min_messages = warning;
\o /dev/null

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alex@example.com', '{"display_name":"Alex"}'),
  ('00000000-0000-0000-0000-00000000000b', 'kemi@example.com', '{"display_name":"Kemi"}'),
  ('00000000-0000-0000-0000-00000000000c', 'dre@example.com', '{"display_name":"Dre"}');

create function pg_temp.act(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, false)
$$;

-- Sign up made profiles with clean usernames.
do $$ begin
  assert (select username from profiles where id = '00000000-0000-0000-0000-00000000000a') = 'alex', 'username from email';
  assert (select count(*) from profile_private) = 3, 'private rows made';
end $$;

-- ── Profiles ─────────────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$ begin
  update profiles set display_name = 'Alex O' where id = auth.uid();
  assert (select display_name from profiles where id = auth.uid()) = 'Alex O', 'can edit own name';
  update profiles set display_name = 'Hacked' where id = '00000000-0000-0000-0000-00000000000b';
  assert (select display_name from profiles where id = '00000000-0000-0000-0000-00000000000b') = 'Kemi', 'cannot edit others';
  assert (select count(*) from profile_private) = 1, 'sees only own private row';
  begin
    update profiles set tier = 'black' where id = auth.uid();
    raise exception 'tier should not be writable';
  exception when insufficient_privilege then null;
  end;
  begin
    update profiles set xp = 99999 where id = auth.uid();
    raise exception 'xp should not be writable';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into ledger (user_id, currency, amount, reason, label, idem_key)
    values (auth.uid(), 'out', 1000, 'x', 'x', 'x');
    raise exception 'ledger should not be writable';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ── Steps and the ledger ─────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$
declare xp1 int; xp2 int;
begin
  perform ingest_steps(london_today(), 12000);
  select xp into xp1 from profiles where id = auth.uid();
  -- 11 counted thousands (10k + 1k) x 5 + active 50 + goal 40 = 145
  assert xp1 = 145, format('xp after 12k steps is %s', xp1);
  -- the same sync again pays nothing
  perform ingest_steps(london_today(), 12000);
  select xp into xp2 from profiles where id = auth.uid();
  assert xp2 = xp1, 'resync does not pay twice';
  -- a lower count never goes backwards
  perform ingest_steps(london_today(), 500);
  assert (select steps from daily_steps where user_id = auth.uid() and day = london_today()) = 12000, 'never backwards';
  assert counted_steps(30000) = 15000 and counted_steps(14000) = 12000, 'counted steps rule';
  begin
    perform ingest_steps(london_today() + 1, 100);
    raise exception 'future day accepted';
  exception when raise_exception then
    if sqlerrm <> 'FUTURE_DAY' then raise; end if;
  end;
  begin
    perform ingest_steps(london_today() - 3, 100);
    raise exception 'old day accepted';
  exception when raise_exception then
    if sqlerrm <> 'TOO_OLD' then raise; end if;
  end;
  -- OUT is held for 24 hours
  assert (select out_held from wallets where user_id = auth.uid()) = 9, 'out held';
  assert (select out_available from wallets where user_id = auth.uid()) = 0, 'nothing spendable yet';
  assert (select count(*) from ledger) > 0, 'sees own ledger';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-00000000000b');
set role authenticated;
do $$ begin
  assert (select count(*) from ledger) = 0, 'cannot see someone else''s ledger';
  assert (select count(*) from wallets where out_total > 0) = 0, 'cannot see someone else''s wallet';
end $$;
reset role;

-- ── Clubs ────────────────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$
declare c clubs;
begin
  c := create_club('Peckham Pacers', 'peckham-pacers', 'london', 'southwark', 'Rye Lane, Tuesdays');
  assert c.status = 'founding', 'clubs start founding';
  assert club_role_of(c.id) = 'captain', 'creator is captain';
  assert (select count(*) from club_channels where club_id = c.id) = 2, 'default channels';
  insert into club_invites (club_id, created_by, label, code) values (c.id, auth.uid(), 'Poster', 'pacers01');
  insert into club_messages (channel_id, club_id, author_id, body)
  select id, c.id, auth.uid(), 'First run Tuesday' from club_channels where club_id = c.id and name = 'announcements';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-00000000000b');
set role authenticated;
do $$
declare cid uuid := (select id from clubs where slug = 'peckhampacers');
begin
  assert (select count(*) from club_messages) = 0, 'non members cannot read chat';
  assert (select count(*) from club_invites) = 0, 'non staff cannot read invites';
  perform join_club_by_code('PACERS01');
  assert is_club_member(cid), 'joined by code';
  assert (select member_count from clubs where id = cid) = 2, 'member count';
  assert (select count(*) from club_messages) = 1, 'members read chat';
  begin
    insert into club_messages (channel_id, club_id, author_id, body)
    select id, cid, auth.uid(), 'spam' from club_channels where club_id = cid and name = 'announcements';
    raise exception 'member posted in announcements';
  exception when insufficient_privilege then null;
  end;
  begin
    update clubs set status = 'verified' where id = cid;
    raise exception 'member verified a club';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ── Battles ──────────────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$
declare b battles;
begin
  b := create_battle('00000000-0000-0000-0000-00000000000b', 'most_steps', 24);
  assert b.status = 'pending', 'battle pending';
  begin
    perform create_battle('00000000-0000-0000-0000-00000000000c', 'most_steps', 24);
    raise exception 'free member started a second battle';
  exception when raise_exception then
    if sqlerrm <> 'TIER_REQUIRED' then raise; end if;
  end;
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-00000000000c');
set role authenticated;
do $$ begin
  assert (select count(*) from battles) = 0, 'outsiders cannot see a battle';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-00000000000b');
set role authenticated;
do $$
declare b battles;
begin
  select * into b from battles limit 1;
  b := respond_battle(b.id, true);
  assert b.status = 'live' and b.ends_at > now(), 'battle live';
  perform ingest_steps(london_today(), 4000);
end $$;
reset role;

-- Settle as the scheduler would once the window closes.
update battles set ends_at = now() - interval '1 minute';
select settle_due_battles();
do $$ begin
  assert (select winner_id from battles limit 1) = '00000000-0000-0000-0000-00000000000a', 'more steps wins';
  assert (select count(*) from ledger where reason = 'battle_win') = 2, 'winner paid xp and out once';
  perform settle_due_battles();
  assert (select count(*) from ledger where reason = 'battle_win') = 2, 'settling again pays nothing';
end $$;

-- ── Blocks ───────────────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-00000000000c');
set role authenticated;
do $$ begin
  insert into blocks (user_id, blocked_id) values (auth.uid(), '00000000-0000-0000-0000-00000000000a');
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$ begin
  update battles set status = 'finished';  -- no update policy, does nothing
  begin
    perform create_battle('00000000-0000-0000-0000-00000000000c');
    raise exception 'battled a blocker';
  exception when raise_exception then
    if sqlerrm <> 'NOT_ALLOWED' then raise; end if;
  end;
  assert not exists (select 1 from rival_deck() where id = '00000000-0000-0000-0000-00000000000c'), 'blocked not in deck';
end $$;
reset role;

-- ── Membership ───────────────────────────────────────────────────────────────
insert into subscriptions (user_id, tier, source, status, provider_ref, current_period_end, referral_club_id)
select '00000000-0000-0000-0000-00000000000b', 'pro', 'web', 'active', 'sub_test_1', now() + interval '30 days', id
from clubs where slug = 'peckhampacers';
do $$ begin
  assert (select tier from profiles where id = '00000000-0000-0000-0000-00000000000b') = 'pro', 'subscription sets the ring';
  update clubs set status = 'verified' where slug = 'peckhampacers';
  assert credit_club_fund(date_trunc('month', now())::date) = 1, 'club credited';
  assert (select amount_pence from club_fund_entries limit 1) = 100, 'web pro is £1';
  update subscriptions set status = 'expired';
  assert (select tier from profiles where id = '00000000-0000-0000-0000-00000000000b') = 'free', 'ring drops when it lapses';
end $$;

-- ── Routes stay private ──────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$
declare r runs; pts jsonb;
begin
  -- a straight 2 km line north, a point every ~100 m
  select jsonb_agg(jsonb_build_array(51.47 + i * 0.0009, -0.07, i * 30000)) into pts
  from generate_series(0, 22) i;
  r := save_run(now() - interval '30 minutes', now() - interval '5 minutes', 2000, 720, 2600, pts);
  assert jsonb_array_length(r.route_public) < jsonb_array_length(pts) - 3, 'start and finish trimmed';
  assert (select dot from member_dots where user_id = auth.uid()) = 'stopped', 'red dot after a run';
  perform set_presence('out');
  assert (select dot from member_dots where user_id = auth.uid()) = 'out', 'blue dot while out';
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-00000000000b');
set role authenticated;
do $$ begin
  assert (select count(*) from runs) = 1, 'members see the run';
  assert (select count(*) from run_routes) = 0, 'but not the full route';
end $$;
reset role;

-- Onboarding sets the name once and pays the welcome bonus once.
select pg_temp.act('00000000-0000-0000-0000-00000000000b');
set role authenticated;
do $$
declare before_xp int;
begin
  select xp into before_xp from profiles where id = auth.uid();
  perform finish_onboarding('bea.out', 'Bea', 'london');
  perform finish_onboarding('bea.out', 'Bea', 'london');
  assert (select username from profiles where id = auth.uid()) = 'bea.out', 'username set';
  assert (select onboarded_at is not null from profiles where id = auth.uid()), 'onboarded';
  assert (select xp from profiles where id = auth.uid()) = before_xp + 100, 'welcome paid once';
  begin
    perform finish_onboarding('admin');
    assert false, 'reserved names refused';
  exception when others then
    assert sqlerrm = 'BAD_USERNAME', sqlerrm;
  end;
end $$;
reset role;

-- Stories: only Pro and Black post. Followers-only by default, and expired
-- ones vanish unless saved.
select pg_temp.act('00000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$ begin
  assert not public.can_post_stories(), 'free members cannot post stories';
  begin
    insert into stories (author_id, media_path) values (auth.uid(), '00000000-0000-0000-0000-00000000000a/free0001.webp');
    assert false, 'a free member cannot post a story';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
insert into subscriptions (user_id, tier, source, status, provider_ref, current_period_end)
  values ('00000000-0000-0000-0000-00000000000a', 'pro', 'web', 'active', 'test:story-pro', now() + interval '30 days');
select pg_temp.act('00000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$ begin assert public.can_post_stories(), 'pro members can post stories'; end $$;
insert into stories (author_id, media_path) values (auth.uid(), '00000000-0000-0000-0000-00000000000a/story0001.webp');
insert into stories (author_id, media_path, audience) values (auth.uid(), '00000000-0000-0000-0000-00000000000a/story0002.webp', 'public');
insert into stories (author_id, media_path, audience, expires_at) values (auth.uid(), '00000000-0000-0000-0000-00000000000a/oldstory01.webp', 'public', now() - interval '1 hour');
do $$ begin
  begin
    insert into stories (author_id, media_path) values (auth.uid(), '00000000-0000-0000-0000-00000000000b/story0003.webp');
    assert false, 'a story cannot point at someone else''s file';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into stories (author_id, media_path) values (auth.uid(), '00000000-0000-0000-0000-00000000000a/../x.webp');
    assert false, 'odd keys refused';
  exception when check_violation then null;
  end;
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-00000000000c');
set role authenticated;
do $$ begin
  assert (select count(*) from stories) = 0, 'blocked people see no stories';
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-00000000000b');
set role authenticated;
do $$ begin
  assert (select count(*) from stories) = 1, 'a stranger sees only the live public story';
  insert into follows (follower_id, followee_id) values (auth.uid(), '00000000-0000-0000-0000-00000000000a');
  assert (select count(*) from stories) = 2, 'a follower sees followers stories too';
  begin
    update stories set saved_at = now() where media_path like '%oldstory01.webp';
    assert not found, 'cannot save someone else''s story';
  end;
end $$;
reset role;
do $$ begin
  assert (select count(*) from expired_stories()) = 1, 'one story to purge';
end $$;

-- Anonymous visitors see public pages only.
select pg_temp.act('');
set role anon;
do $$ begin
  assert (select count(*) from clubs) = 1, 'club pages are public';
  assert (select count(*) from daily_steps) = 0, 'steps are not public';
  assert (select count(*) from runs) = 0, 'members-only runs hidden';
end $$;
reset role;

\o
\echo 'rules ok'
