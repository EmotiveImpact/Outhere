-- Account tests: date of birth and under 18 mode, settings and who sees your
-- dot, your patch, downloading your data and closing your account.

\set QUIET on
set client_min_messages = warning;
\o /dev/null

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'teen@example.com', '{"display_name":"Teen"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'kemi@example.com', '{"display_name":"Kemi"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'dre@example.com', '{"display_name":"Dre"}');

create function pg_temp.act(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, false)
$$;

-- A stranger's invite is already waiting before the date of birth is given.
insert into battles (mode, challenger_id, opponent_id, duration_h)
values ('most_steps', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 24);

-- ── Date of birth ────────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
do $$ begin
  begin
    perform set_birth_date((london_today() - interval '10 years')::date);
    raise exception 'under 13 should be refused';
  exception when others then
    assert sqlerrm = 'TOO_YOUNG', 'too young: ' || sqlerrm;
  end;
  begin
    perform set_birth_date((london_today() + 1));
    raise exception 'future date should be refused';
  exception when others then
    assert sqlerrm = 'BAD_DATE', 'bad date: ' || sqlerrm;
  end;
  assert set_birth_date((london_today() - interval '15 years')::date) = true, 'a 15 year old is a minor';
  assert am_i_minor(), 'am_i_minor';
  assert (select status from battles where challenger_id = '00000000-0000-0000-0000-0000000000c1' and opponent_id = auth.uid()) = 'cancelled', 'stranger invite cancelled for a minor';
  begin
    perform set_birth_date((london_today() - interval '20 years')::date);
    raise exception 'date of birth is set once';
  exception when others then
    assert sqlerrm = 'ALREADY_SET', 'set once: ' || sqlerrm;
  end;
  begin
    update profile_private set birth_date = '1990-01-01' where id = auth.uid();
    raise exception 'birth date should not be writable';
  exception when insufficient_privilege then null;
  end;
  begin
    perform is_minor(auth.uid());
    raise exception 'is_minor should be private';
  exception when insufficient_privilege then null;
  end;
  -- Surprise challengers and live sharing stay off.
  update profiles set surprise_challengers = true where id = auth.uid();
  assert (select surprise_challengers from profiles where id = auth.uid()) = false, 'no surprise challengers';
  update profile_private set share_live_location = true where id = auth.uid();
  assert (select share_live_location from profile_private where id = auth.uid()) = false, 'no live sharing';
  -- Never on the map for everyone.
  insert into member_settings (user_id, map_visibility) values (auth.uid(), 'everyone');
  assert (select map_visibility from member_settings where user_id = auth.uid()) = 'friends', 'minor map is friends only';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
do $$ begin
  assert set_birth_date('1995-06-01') = false, 'an adult';
  assert not am_i_minor(), 'adult is not a minor';
  assert (select count(*) from member_settings) = 0, 'cannot see other settings';
  begin
    perform link_guardian('Mum', 'mum@example.com');
    raise exception 'adults do not link a guardian';
  exception when others then
    assert sqlerrm = 'NOT_ALLOWED', 'guardian adult: ' || sqlerrm;
  end;
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
do $$ begin
  perform link_guardian('Mum', 'mum@example.com');
  assert (select name from guardian_links where child_id = auth.uid()) = 'Mum', 'guardian linked';
end $$;
reset role;

-- ── No strangers ─────────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
do $$ begin
  begin
    perform create_battle('00000000-0000-0000-0000-0000000000a1');
    raise exception 'a stranger cannot battle an under 18';
  exception when others then
    assert sqlerrm = 'UNDER_18', 'stranger battle: ' || sqlerrm;
  end;
  insert into follows (follower_id, followee_id) values (auth.uid(), '00000000-0000-0000-0000-0000000000a1');
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
do $$ begin
  insert into follows (follower_id, followee_id) values (auth.uid(), '00000000-0000-0000-0000-0000000000b1');
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
do $$ begin
  perform create_battle('00000000-0000-0000-0000-0000000000a1');
  assert (select count(*) from battles where opponent_id = '00000000-0000-0000-0000-0000000000a1') = 1, 'friends can battle';
end $$;
reset role;

do $$ begin
  begin
    insert into battles (mode, challenger_id, opponent_id, duration_h, is_surprise)
    values ('most_steps', '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 24, true);
    raise exception 'no surprise challengers for under 18s';
  exception when others then
    assert sqlerrm = 'UNDER_18', 'surprise: ' || sqlerrm;
  end;
end $$;

-- ── No paid drops ────────────────────────────────────────────────────────────
insert into drops (id, title, price_out, stock, opens_at)
values ('00000000-0000-0000-0000-00000000d001', 'Night Runner 01', 0, 10, now() - interval '1 hour');

select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
do $$ begin
  begin
    perform reserve_drop('00000000-0000-0000-0000-00000000d001');
    raise exception 'under 18s cannot order drops';
  exception when others then
    assert sqlerrm = 'UNDER_18', 'drop: ' || sqlerrm;
  end;
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
do $$ begin
  perform reserve_drop('00000000-0000-0000-0000-00000000d001');
  assert (select count(*) from drop_orders where user_id = auth.uid()) = 1, 'adults can order';
end $$;
reset role;

-- ── No live spot, ghost mode and who sees your dot ───────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
do $$ begin
  perform set_presence('out');
  assert (select count(*) from presence where user_id = auth.uid()) = 0, 'an under 18 is never out now';
  perform set_presence('stopped');
  assert (select state from presence where user_id = auth.uid()) = 'stopped', 'area shows once the run is done';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
do $$ begin
  perform set_presence('out');
  insert into member_settings (user_id, map_visibility) values (auth.uid(), 'crew');
end $$;
reset role;

set role anon;
do $$ begin
  assert outside_count() = 1, 'one out across the UK';
  assert outside_count('london') = 1, 'one out in London';
  assert outside_count('manchester') = 0, 'none in Manchester';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
do $$ begin
  assert (select count(*) from presence where user_id = '00000000-0000-0000-0000-0000000000c1') = 0, 'crew only hides from strangers';
  assert (select count(*) from presence where user_id = '00000000-0000-0000-0000-0000000000a1') = 1, 'friends see an under 18 after a run';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
do $$ begin
  update member_settings set map_visibility = 'everyone' where user_id = auth.uid();
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
do $$ begin
  assert (select count(*) from presence where user_id = '00000000-0000-0000-0000-0000000000c1') = 1, 'everyone sees an open dot';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
do $$ begin
  update member_settings set ghost_mode = true where user_id = auth.uid();
  assert (select count(*) from presence where user_id = auth.uid()) = 0, 'ghost clears the dot';
  perform set_presence('out');
  assert (select count(*) from presence where user_id = auth.uid()) = 0, 'ghosts leave no dot';
end $$;
reset role;

-- ── Pushes respect pings and quiet hours ─────────────────────────────────────
update member_settings set pings = '{"challenges": false}'::jsonb,
  quiet_hours = '{"on": true, "from": 22, "to": 7}'::jsonb
where user_id = '00000000-0000-0000-0000-0000000000c1';
do $$ begin
  assert not should_push('00000000-0000-0000-0000-0000000000c1', 'battle', '2026-10-15 12:00+01'), 'challenges muted';
  assert should_push('00000000-0000-0000-0000-0000000000c1', 'club', '2026-10-15 12:00+01'), 'club on';
  assert not should_push('00000000-0000-0000-0000-0000000000c1', 'club', '2026-10-15 23:30+01'), 'quiet hours';
  assert should_push('00000000-0000-0000-0000-0000000000c1', 'live', '2026-10-15 23:30+01'), 'live ignores quiet hours';
  assert not should_push('00000000-0000-0000-0000-0000000000c1', 'drop', '2026-10-15 12:00+01'), 'drops off by default';
  assert should_push('00000000-0000-0000-0000-0000000000b1', 'battle', '2026-10-15 23:30+01'), 'no settings row pushes';
end $$;

-- ── Your patch ───────────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
do $$ begin
  assert (select id from patch_places(null, 53.48, -2.24) limit 1) = 'manchester', 'nearest first';
  assert (select plays_for from patch_places('Leeds')) = 'Yorkshire', 'a place not live yet plays for its region';
  assert (select count(*) from patch_areas('london')) = 33, 'every London borough';
  perform set_patch('london', 'southwark');
  assert (select borough_id from profiles where id = auth.uid()) = 'southwark', 'patch set';
  begin
    perform set_patch('manchester', 'southwark');
    raise exception 'an area must be in its city';
  exception when others then
    assert sqlerrm = 'NOT_FOUND', 'patch: ' || sqlerrm;
  end;
  perform ingest_steps(london_today(), 9000);
  assert (select week_rank from patch_areas('london') where id = 'southwark') = 1, 'steps lift the area';
end $$;
reset role;

-- ── Your data and closing your account ───────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
do $$
declare doc jsonb;
begin
  doc := export_my_data();
  assert doc -> 'profile' ->> 'id' = auth.uid()::text, 'export has the profile';
  assert jsonb_array_length(doc -> 'steps') = 1, 'export has the steps';
  assert not (doc -> 'private' ? 'push_token'), 'push token left out';
  perform delete_my_account();
  assert (select display_name from profiles where id = auth.uid()) = 'Former member', 'name gone';
  assert (select onboarded_at from profiles where id = auth.uid()) is null, 'signed out of the app';
  assert (select count(*) from follows where follower_id = auth.uid() or followee_id = auth.uid()) = 0, 'follows gone';
end $$;
reset role;
do $$ begin
  assert (select count(*) from account_deletions) = 1, 'queued for the purge';
end $$;
