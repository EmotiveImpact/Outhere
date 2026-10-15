-- Profile area: the member OUT bonus, streak freezes, emotes and the tray,
-- the extra badges, invite friends and contact matching.

\set QUIET on
set client_min_messages = warning;
\o /dev/null

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'alex@example.com', '{"display_name":"Alex"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'kemi@example.com', '{"display_name":"Kemi"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'dre@example.com', '{"display_name":"Dre"}');
update profiles set onboarded_at = now();

create function pg_temp.act(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, false)
$$;

-- Everyone starts with the two starter emotes in their tray.
do $$ begin
  assert (select count(*) from member_emotes where user_id = '00000000-0000-0000-0000-0000000000a1') = 2, 'two starters';
  assert (select emotes from emote_trays where user_id = '00000000-0000-0000-0000-0000000000a1') = array['fist', 'snail'], 'starters in the tray';
  assert (select count(*) from badges) = 24, format('24 badges, got %s', (select count(*) from badges));
end $$;

-- ── Member OUT bonus ─────────────────────────────────────────────────────────
-- Kemi is Black (a web subscription), Alex is Free.
insert into subscriptions (user_id, tier, source, status, provider_ref, current_period_end)
values ('00000000-0000-0000-0000-0000000000b1', 'black', 'web', 'active', 'sub_kemi', now() + interval '30 days');

select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
do $$
declare bonus int; base int;
begin
  perform ingest_steps(london_today(), 12000);
  select coalesce(sum(amount), 0) into base from ledger where user_id = auth.uid() and currency = 'out' and reason in ('active_day', 'goal');
  select coalesce(sum(amount), 0) into bonus from ledger where user_id = auth.uid() and reason = 'member_bonus';
  assert base = 9, format('active day and goal pay 9 OUT, got %s', base);
  assert bonus = 9, format('Black doubles OUT for moving, bonus %s', bonus);
  -- syncing again pays neither twice
  perform ingest_steps(london_today(), 12000);
  assert (select sum(amount) from ledger where user_id = auth.uid() and reason = 'member_bonus') = 9, 'bonus paid once';
  -- Black comes with the crown emote
  assert exists (select 1 from member_emotes where user_id = auth.uid() and emote_id = 'crown'), 'Black gets the crown';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
do $$ begin
  perform ingest_steps(london_today(), 4000);
  assert not exists (select 1 from ledger where user_id = auth.uid() and reason = 'member_bonus'), 'no bonus on Free';
end $$;
reset role;

-- ── Streak freezes ───────────────────────────────────────────────────────────
-- Alex has a three day streak up to yesterday and nothing yet today.
delete from daily_steps where user_id = '00000000-0000-0000-0000-0000000000a1';
insert into daily_steps (user_id, day, steps) values
  ('00000000-0000-0000-0000-0000000000a1', london_today() - 1, 5000),
  ('00000000-0000-0000-0000-0000000000a1', london_today() - 2, 5000),
  ('00000000-0000-0000-0000-0000000000a1', london_today() - 3, 5000);
select refresh_streak('00000000-0000-0000-0000-0000000000a1');

select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
do $$
declare s json;
begin
  assert (select streak_days from profiles where id = auth.uid()) = 3, 'three day streak';
  assert exists (select 1 from member_emotes where user_id = auth.uid() and emote_id = 'flame'), 'a 3 day streak earns On fire';
  -- Free members have no freezes
  begin
    perform use_streak_freeze();
    raise exception 'free member froze';
  exception when raise_exception then
    if sqlerrm <> 'TIER_REQUIRED' then raise; end if;
  end;
  begin
    insert into streak_freezes (user_id, day) values (auth.uid(), london_today());
    raise exception 'freezes should not be writable';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

insert into subscriptions (user_id, tier, source, status, provider_ref, current_period_end)
values ('00000000-0000-0000-0000-0000000000a1', 'pro', 'web', 'active', 'sub_alex', now() + interval '30 days');

select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
do $$
declare s json;
begin
  s := streak_freeze_status();
  assert (s->>'allowance')::int = 1 and (s->>'left')::int = 1, 'Pro has one a month';
  s := use_streak_freeze();
  assert (s->>'left')::int = 0 and (s->>'frozenToday')::boolean, 'freeze spent on today';
  begin
    perform use_streak_freeze();
    raise exception 'froze twice';
  exception when raise_exception then
    if sqlerrm <> 'ALREADY_FROZEN' then raise; end if;
  end;
end $$;
reset role;

-- Tomorrow: today was frozen, so the streak carries on through it.
update streak_freezes set day = london_today() - 1 where user_id = '00000000-0000-0000-0000-0000000000a1';
delete from daily_steps where user_id = '00000000-0000-0000-0000-0000000000a1';
insert into daily_steps (user_id, day, steps) values
  ('00000000-0000-0000-0000-0000000000a1', london_today() - 2, 5000),
  ('00000000-0000-0000-0000-0000000000a1', london_today() - 3, 5000),
  ('00000000-0000-0000-0000-0000000000a1', london_today() - 4, 5000);
do $$ begin
  assert public.refresh_streak('00000000-0000-0000-0000-0000000000a1') = 3, 'a frozen day keeps the streak';
  delete from streak_freezes where user_id = '00000000-0000-0000-0000-0000000000a1';
  assert public.refresh_streak('00000000-0000-0000-0000-0000000000a1') = 0, 'without the freeze it breaks';
  insert into streak_freezes (user_id, day) values ('00000000-0000-0000-0000-0000000000a1', london_today() - 1);
  perform public.refresh_streak('00000000-0000-0000-0000-0000000000a1');
end $$;

-- Only one a month on Pro, and none needed once today is done.
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
do $$ begin
  if extract(day from london_today()) > 1 then
    begin
      perform use_streak_freeze();
      raise exception 'second freeze in a month';
    exception when raise_exception then
      if sqlerrm <> 'NO_FREEZES_LEFT' then raise; end if;
    end;
  end if;
  perform ingest_steps(london_today(), 3500);
  begin
    perform use_streak_freeze();
    raise exception 'froze a done day';
  exception when raise_exception then
    if sqlerrm <> 'NOT_NEEDED' then raise; end if;
  end;
  assert (select count(*) from streak_freezes) = 1, 'sees only own freezes';
end $$;
reset role;

-- ── Emote tray ───────────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
do $$
declare t text[];
begin
  t := set_emote_tray(array['flame', 'fist', 'flame']);
  assert t = array['flame', 'fist'], format('tray keeps order and drops repeats: %s', t);
  begin
    perform set_emote_tray(array['wings']);
    raise exception 'unowned emote in tray';
  exception when raise_exception then
    if sqlerrm <> 'NOT_OWNED' then raise; end if;
  end;
  begin
    perform set_emote_tray(array['flame', 'fist', 'snail', 'flame', 'fist', 'snail', 'x1', 'x2']);
  exception when raise_exception then
    if sqlerrm not in ('TRAY_FULL', 'NOT_OWNED') then raise; end if;
  end;
  assert (select count(*) from member_emotes) = 3, 'sees only own emotes';
  assert (select count(*) from emote_counts()) = 8, 'counts for every emote';
  begin
    insert into member_emotes (user_id, emote_id) values (auth.uid(), 'wings');
    raise exception 'emotes should not be writable';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ── Battle wins: badges and emotes ───────────────────────────────────────────
insert into battles (challenger_id, opponent_id, status, winner_id, finished_at, created_at)
select '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'live', null, null, now() - make_interval(hours => g)
from generate_series(1, 3) g;
update battles set status = 'finished', winner_id = '00000000-0000-0000-0000-0000000000a1', finished_at = created_at + interval '30 minutes'
where challenger_id = '00000000-0000-0000-0000-0000000000a1';
do $$ begin
  assert exists (select 1 from member_badges where user_id = '00000000-0000-0000-0000-0000000000a1' and badge_id = 'first_win'), 'first win badge';
  assert exists (select 1 from member_badges where user_id = '00000000-0000-0000-0000-0000000000a1' and badge_id = 'win_streak_3'), 'hat-trick badge';
  assert exists (select 1 from member_emotes where user_id = '00000000-0000-0000-0000-0000000000a1' and emote_id = 'wings'), 'three in a row earns Flying';
  assert exists (select 1 from notifications where user_id = '00000000-0000-0000-0000-0000000000a1' and link = '/emotes?new=wings'), 'told about the new emote';
  assert not exists (select 1 from member_emotes where user_id = '00000000-0000-0000-0000-0000000000c1' and emote_id = 'bolt'), 'the loser gets nothing';
end $$;

-- Runs: distance badges.
select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
do $$ begin
  perform save_run(now() - interval '2 hours', now() - interval '1 hour', 21500, 6600);
  assert (select count(*) from member_badges where user_id = auth.uid() and badge_id in ('ten_k_run', 'half_marathon', 'first_run')) = 3, 'run badges';
end $$;
reset role;

-- ── Invite friends ───────────────────────────────────────────────────────────
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000001' || lpad(g::text, 2, '0'))::uuid, format('friend%s@example.com', g), json_build_object('display_name', 'Friend ' || g)::jsonb
from generate_series(1, 5) g;
update profiles set onboarded_at = now() where onboarded_at is null;

select pg_temp.act('00000000-0000-0000-0000-000000000101');
set role authenticated;
do $$
declare before int;
begin
  perform claim_referral('@kemi');
  assert (select referrer_id from referrals where referee_id = auth.uid()) = '00000000-0000-0000-0000-0000000000b1', 'referral saved';
  assert exists (select 1 from ledger where user_id = auth.uid() and reason = 'referral' and amount = 500), 'friend gets 500 to start';
  assert exists (select 1 from follows where follower_id = auth.uid() and followee_id = '00000000-0000-0000-0000-0000000000b1'), 'and follows them';
  begin
    perform claim_referral('kemi');
    raise exception 'claimed twice';
  exception when raise_exception then
    if sqlerrm <> 'ALREADY_REFERRED' then raise; end if;
  end;
  -- 6k today: not there yet
  perform ingest_steps(london_today(), 6000);
  assert (select qualified_at from referrals where referee_id = auth.uid()) is null, 'not qualified at 6k';
end $$;
reset role;

-- Kemi can't see anyone else's referral rows, only her own.
select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
do $$ begin
  assert (select count(*) from referrals) = 1, 'referrer sees the referral';
  begin
    perform claim_referral('kemi');
    raise exception 'self referral';
  exception when raise_exception then
    if sqlerrm <> 'SELF' then raise; end if;
  end;
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-000000000101');
set role authenticated;
do $$ begin
  perform ingest_steps(london_today(), 10500);
end $$;
reset role;

do $$
declare g int; friend uuid;
begin
  assert (select qualified_at from referrals where referee_id = '00000000-0000-0000-0000-000000000101') is not null, 'qualified at 10k';
  assert exists (select 1 from ledger where user_id = '00000000-0000-0000-0000-0000000000b1' and idem_key = 'referral:00000000-0000-0000-0000-000000000101:out'), 'referrer paid 500';
  -- four more friends join and walk: five earns a month of Pro (Kemi is Black, so her ring stays Black)
  for g in 2..5 loop
    friend := ('00000000-0000-0000-0000-0000000001' || lpad(g::text, 2, '0'))::uuid;
    insert into referrals (referee_id, referrer_id) values (friend, '00000000-0000-0000-0000-0000000000b1');
    insert into daily_steps (user_id, day, steps) values (friend, london_today(), 12000);
  end loop;
  assert (select count(*) from referrals where referrer_id = '00000000-0000-0000-0000-0000000000b1' and qualified_at is not null) = 5, 'five qualified';
  assert exists (select 1 from member_badges where user_id = '00000000-0000-0000-0000-0000000000b1' and badge_id = 'bring_three'), 'bring three badge';
  assert exists (select 1 from subscriptions where provider_ref = 'referral:00000000-0000-0000-0000-0000000000b1:5' and tier = 'pro'), 'a Pro month';
  assert (select tier from profiles where id = '00000000-0000-0000-0000-0000000000b1') = 'black', 'best plan wins';
end $$;

-- ── Contacts ─────────────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
do $$ begin
  assert (select count(*) from match_contacts(array['KEMI@example.com', 'nobody@example.com', 'alex@example.com'])) = 1, 'matches others by email';
end $$;
reset role;
set role anon;
do $$ begin
  begin
    perform * from match_contacts(array['kemi@example.com']);
    raise exception 'anon matched contacts';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
