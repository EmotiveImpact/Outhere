-- Outhere schema: the profile area of the app at parity with the concept
-- demo. Depends on 20261015101300_web_gaps.sql (badges, member_badges,
-- award_badge and notify with an actor).
--
-- - Membership: Pro and Black earn 1.5x and 2x OUT for moving, paid as a
--   separate 'member_bonus' ledger line so the app can show what a plan
--   earned you.
-- - Streak freezes: Pro gets 1 a month, Black 3. A frozen day keeps the
--   streak going without adding to it; refresh_streak now knows about them.
-- - Emotes: the set, who owns which, and the tray of up to five. Two come
--   with every account; the rest are earned by wins, streaks, the season
--   drop, derby wins and Black.
-- - Badges: 17 more, to make 24, awarded from triggers here.
-- - Invite friends: give 500, get 500. A friend who joins from your link
--   gets 500 OUT; you get 500 when they have walked 10k. Five friends earn a
--   month of Pro, ten a month of Black.
-- - Contacts: which emails in your phone belong to members.

-- ── Membership: more OUT for moving ──────────────────────────────────────────

create or replace function public.out_multiplier(p_tier public.tier)
returns numeric language sql immutable as $$
  select case p_tier when 'black' then 2.0 when 'pro' then 1.5 else 1.0 end
$$;

-- Runs after any OUT paid for moving lands in the ledger. The bonus line
-- shares the original's key, so a retried payout never pays the bonus twice.
create or replace function public.pay_member_bonus()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  t tier;
  bonus int;
begin
  if new.currency <> 'out' or new.amount <= 0 or new.reason not in ('run', 'active_day', 'goal', 'steps') then
    return null;
  end if;
  select tier into t from profiles where id = new.user_id;
  bonus := round(new.amount * (public.out_multiplier(coalesce(t, 'free')) - 1));
  if bonus <= 0 then return null; end if;
  insert into ledger (user_id, currency, amount, reason, label, ref_type, ref_id, idem_key, available_at)
  values (new.user_id, 'out', bonus, 'member_bonus', initcap(t::text) || ' bonus', new.ref_type, new.ref_id,
          new.idem_key || ':bonus', new.available_at)
  on conflict (idem_key) do nothing;
  return null;
end $$;
revoke execute on function public.pay_member_bonus() from public, anon, authenticated;
create trigger ledger_member_bonus after insert on public.ledger
  for each row execute function public.pay_member_bonus();

-- ── Streak freezes ───────────────────────────────────────────────────────────

create table public.streak_freezes (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  day         date not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, day)
);

create or replace function public.freezes_per_month(p_tier public.tier)
returns integer language sql immutable as $$
  select case p_tier when 'black' then 3 when 'pro' then 1 else 0 end
$$;

-- A streak day is a day with 3,000+ steps; a frozen day keeps the run going
-- but doesn't add to it. Today counts once reached; a missing today does not
-- break yesterday's streak. Replaces the version in movement_and_ledger.
create or replace function public.refresh_streak(p_user uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  d date := public.london_today();
  n int := 0;
begin
  if not exists (select 1 from daily_steps where user_id = p_user and day = d and steps >= 3000) then
    d := d - 1;
  end if;
  loop
    if exists (select 1 from daily_steps where user_id = p_user and day = d and steps >= 3000) then
      n := n + 1;
    elsif not exists (select 1 from streak_freezes where user_id = p_user and day = d) then
      exit;
    end if;
    d := d - 1;
  end loop;
  update profiles set streak_days = n, best_streak = greatest(best_streak, n) where id = p_user;
  if n in (7, 14, 30, 100) then
    perform public.award(p_user, format('streak:%s:%s:%s', p_user, n, public.london_today()),
                         format('%s day streak', n), 'streak', n * 10, n);
  end if;
  return n;
end $$;
revoke execute on function public.refresh_streak from public, anon, authenticated;

-- How many freezes the signed in member has this calendar month.
create or replace function public.streak_freeze_status()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  t tier;
  used int;
  today date := public.london_today();
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  select tier into t from profiles where id = me;
  select count(*) into used from streak_freezes
  where user_id = me and day >= date_trunc('month', today)::date;
  return json_build_object(
    'allowance', public.freezes_per_month(t),
    'used', used,
    'left', greatest(0, public.freezes_per_month(t) - used),
    'frozenToday', exists (select 1 from streak_freezes where user_id = me and day = today));
end $$;

-- Spend a freeze on today. Only when there's a streak to keep and today
-- isn't done yet; Pro 1 a month, Black 3.
create or replace function public.use_streak_freeze()
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  t tier;
  today date := public.london_today();
  used int;
  n int;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  -- One at a time per member, so two taps can't both spend the last one.
  select tier into t from profiles where id = me for update;
  if t = 'free' then raise exception 'TIER_REQUIRED' using hint = 'pro'; end if;
  if exists (select 1 from daily_steps where user_id = me and day = today and steps >= 3000) then
    raise exception 'NOT_NEEDED' using hint = 'Today''s already done. Your streak is safe.';
  end if;
  if exists (select 1 from streak_freezes where user_id = me and day = today) then
    raise exception 'ALREADY_FROZEN' using hint = 'Today is already frozen.';
  end if;
  n := public.refresh_streak(me);
  if n = 0 then raise exception 'NO_STREAK' using hint = 'There''s no streak to protect yet.'; end if;
  select count(*) into used from streak_freezes where user_id = me and day >= date_trunc('month', today)::date;
  if used >= public.freezes_per_month(t) then
    raise exception 'NO_FREEZES_LEFT' using hint = 'You''ve used this month''s streak freezes.';
  end if;
  insert into streak_freezes (user_id, day) values (me, today);
  perform public.refresh_streak(me);
  return public.streak_freeze_status();
end $$;

-- ── Emotes ───────────────────────────────────────────────────────────────────

create table public.emotes (
  id          text primary key check (id ~ '^[a-z0-9_]{2,30}$'),
  label       text not null check (char_length(label) between 1 and 30),
  how         text not null check (char_length(how) <= 60),
  source      text not null check (source in ('starter', 'streak', 'win', 'drop', 'club')),
  sort        integer not null default 0
);

insert into public.emotes (id, label, how, source, sort) values
  ('flame',   'On fire',         '3 day streak',                     'streak',  10),
  ('fist',    'Respect',         'Everyone starts with it',          'starter', 20),
  ('snail',   'Too slow',        'Everyone starts with it',          'starter', 30),
  ('bolt',    'Speed',           'Win a battle',                     'win',     40),
  ('wings',   'Flying',          'Win 3 in a row',                   'win',     50),
  ('watch',   'Clock''s ticking', 'Season drop',                      'drop',    60),
  ('crown',   'Champion',        'Black members and derby winners',  'club',    70),
  ('inferno', 'Inferno',         '30 day streak',                    'streak',  80)
on conflict (id) do nothing;

create table public.member_emotes (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  emote_id    text not null references public.emotes(id) on delete cascade,
  earned_at   timestamptz not null default now(),
  seen_at     timestamptz,
  primary key (user_id, emote_id)
);
create index member_emotes_emote_idx on public.member_emotes(emote_id);

-- The emotes you react with, in order. Up to five.
create table public.emote_trays (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  emotes      text[] not null default '{}' check (cardinality(emotes) <= 5),
  updated_at  timestamptz not null default now()
);

-- Give an emote once. Returns true when it's new. Starters go straight into
-- the tray; the rest arrive with a notification that opens the drop screen.
create or replace function public.grant_emote(p_user uuid, p_emote text)
returns boolean language plpgsql security definer set search_path = public as $$
declare e emotes;
begin
  select * into e from emotes where id = p_emote;
  if e.id is null then raise exception 'NOT_FOUND'; end if;
  insert into member_emotes (user_id, emote_id, seen_at)
  values (p_user, p_emote, case when e.source = 'starter' then now() end)
  on conflict do nothing;
  if not found then return false; end if;
  if e.source = 'starter' then
    insert into emote_trays (user_id, emotes) values (p_user, array[p_emote])
    on conflict (user_id) do update set emotes = case
      when p_emote = any(emote_trays.emotes) or cardinality(emote_trays.emotes) >= 5 then emote_trays.emotes
      else emote_trays.emotes || p_emote end;
  else
    perform public.notify(p_user, 'reward', 'New emote: ' || e.label, 'Add it to your tray.', '/emotes?new=' || e.id);
  end if;
  return true;
end $$;
revoke execute on function public.grant_emote(uuid, text) from public, anon, authenticated;

create or replace function public.set_emote_tray(p_emotes text[])
returns text[] language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  clean text[];
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  select coalesce(array_agg(x order by i), '{}') into clean
  from (select distinct on (x) x, i from unnest(coalesce(p_emotes, '{}')) with ordinality as u(x, i) order by x, i) d;
  if cardinality(clean) > 5 then raise exception 'TRAY_FULL' using hint = 'Your tray holds 5.'; end if;
  if exists (select 1 from unnest(clean) x where not exists (
    select 1 from member_emotes where user_id = me and emote_id = x)) then
    raise exception 'NOT_OWNED' using hint = 'You haven''t earned that one yet.';
  end if;
  insert into emote_trays (user_id, emotes, updated_at) values (me, clean, now())
  on conflict (user_id) do update set emotes = excluded.emotes, updated_at = now();
  update member_emotes set seen_at = coalesce(seen_at, now()) where user_id = me and emote_id = any(clean);
  return clean;
end $$;

create or replace function public.mark_emote_seen(p_emote text)
returns void language sql security definer set search_path = public as $$
  update member_emotes set seen_at = coalesce(seen_at, now())
  where user_id = auth.uid() and emote_id = p_emote
$$;

-- How many members hold each emote, for 'only 1 in 12 runners has this one'.
create or replace function public.emote_counts()
returns table (emote_id text, holders bigint, members bigint)
language sql stable security definer set search_path = public as $$
  select e.id, (select count(*) from member_emotes m where m.emote_id = e.id),
         (select count(*) from profiles)
  from emotes e
$$;

-- Every member starts with the two starters, new and existing.
create or replace function public.starter_emotes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.grant_emote(new.id, 'fist');
  perform public.grant_emote(new.id, 'snail');
  return null;
end $$;
revoke execute on function public.starter_emotes() from public, anon, authenticated;
create trigger profiles_starter_emotes after insert on public.profiles
  for each row execute function public.starter_emotes();

select public.grant_emote(id, 'fist'), public.grant_emote(id, 'snail') from public.profiles;

-- ── Badges: 17 more to make 24 ───────────────────────────────────────────────

insert into public.badges (id, label, description, art_path, sort) values
  ('early_bird',    'Early bird',     'A run started before 7am.',                         'badges/early_bird.png',    80),
  ('ten_k_run',     '10K run',        'One run of 10 km or more.',                         'badges/ten_k_run.png',     90),
  ('half_marathon', 'Half marathon',  'One run of 21.1 km or more.',                       'badges/half_marathon.png', 100),
  ('runs_25',       '25 runs',        'Saved 25 runs.',                                    'badges/runs_25.png',       110),
  ('steps_20k',     '20k day',        '20,000 steps in a day.',                            'badges/steps_20k.png',     120),
  ('million_steps', 'Million steps',  'A million steps since you joined.',                 'badges/million_steps.png', 130),
  ('streak_14',     '14 day streak',  'Two weeks in a row with 3,000 steps or more.',      'badges/streak_14.png',     140),
  ('streak_100',    '100 day streak', 'A hundred days in a row.',                          'badges/streak_100.png',    150),
  ('first_win',     'First win',      'Won a battle.',                                     'badges/first_win.png',     160),
  ('wins_10',       '10 wins',        'Won 10 battles.',                                   'badges/wins_10.png',       170),
  ('win_streak_3',  'Hat-trick',      'Won 3 battles in a row.',                           'badges/win_streak_3.png',  180),
  ('club_member',   'Club member',    'Joined a run club.',                                'badges/club_member.png',   190),
  ('link_up',       'Link-up',        'Checked in at an event or club run.',               'badges/link_up.png',       200),
  ('regular',       'Regular',        'Checked in at 3 events or club runs.',              'badges/regular.png',       210),
  ('derby_day',     'Derby day',      'Your club won a club v club.',                      'badges/derby_day.png',     220),
  ('squad_called',  'Called up',      'Picked for your club''s league squad.',             'badges/squad_called.png',  230),
  ('bring_three',   'Bring three',    'Three friends you invited walked their first 10k.', 'badges/bring_three.png',   240)
on conflict (id) do nothing;

-- Runs: early bird, distances and count.
create or replace function public.profile_awards_for_run()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  h int := extract(hour from new.started_at at time zone 'Europe/London');
  n int;
begin
  if new.kind = 'walk' then return null; end if;
  if h >= 4 and h < 7 then perform public.award_badge(new.user_id, 'early_bird'); end if;
  if new.distance_m >= 10000 then perform public.award_badge(new.user_id, 'ten_k_run'); end if;
  if new.distance_m >= 21097 then perform public.award_badge(new.user_id, 'half_marathon'); end if;
  select count(*) into n from runs where user_id = new.user_id and kind <> 'walk';
  if n >= 25 then perform public.award_badge(new.user_id, 'runs_25'); end if;
  return null;
end $$;
create trigger runs_profile_awards after insert on public.runs
  for each row execute function public.profile_awards_for_run();

-- Streaks and Black: badges and emotes.
create or replace function public.profile_awards_for_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.streak_days >= 3 then perform public.grant_emote(new.id, 'flame'); end if;
  if new.streak_days >= 14 then perform public.award_badge(new.id, 'streak_14'); end if;
  if new.streak_days >= 30 then perform public.grant_emote(new.id, 'inferno'); end if;
  if new.streak_days >= 100 then perform public.award_badge(new.id, 'streak_100'); end if;
  if new.tier = 'black' then perform public.grant_emote(new.id, 'crown'); end if;
  return null;
end $$;
create trigger profiles_profile_awards after update of streak_days, tier on public.profiles
  for each row
  when (new.streak_days >= 3 or new.tier = 'black')
  execute function public.profile_awards_for_profile();

-- Battle wins: first win, 10 wins, three in a row.
create or replace function public.profile_awards_for_battle()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  w uuid := new.winner_id;
  wins int;
  last3 int;
begin
  select count(*) into wins from battles where status = 'finished' and winner_id = w;
  perform public.award_badge(w, 'first_win');
  perform public.grant_emote(w, 'bolt');
  if wins >= 10 then perform public.award_badge(w, 'wins_10'); end if;
  select count(*) filter (where winner_id = w) into last3 from (
    select winner_id from battles
    where status = 'finished' and (challenger_id = w or opponent_id = w)
    order by coalesce(finished_at, ends_at, created_at) desc limit 3) t;
  if last3 = 3 then
    perform public.award_badge(w, 'win_streak_3');
    perform public.grant_emote(w, 'wings');
  end if;
  return null;
end $$;
create trigger battles_profile_awards after update of status, winner_id on public.battles
  for each row
  when (new.status = 'finished' and new.winner_id is not null and old.status is distinct from 'finished')
  execute function public.profile_awards_for_battle();

-- Steps: a 20k day and a million in total.
create or replace function public.profile_awards_for_steps()
returns trigger language plpgsql security definer set search_path = public as $$
declare total bigint;
begin
  if new.flagged then return null; end if;
  if new.steps >= 20000 then perform public.award_badge(new.user_id, 'steps_20k'); end if;
  select coalesce(sum(steps), 0) into total from daily_steps where user_id = new.user_id and not flagged;
  if total >= 1000000 then perform public.award_badge(new.user_id, 'million_steps'); end if;
  perform public.referral_check(new.user_id);
  return null;
end $$;

-- Clubs, check-ins, derbies and league squads.
create or replace function public.profile_awards_for_club_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.award_badge(new.user_id, 'club_member');
  return null;
end $$;
create trigger club_members_profile_awards after insert on public.club_members
  for each row execute function public.profile_awards_for_club_member();

create or replace function public.profile_awards_for_checkin()
returns trigger language plpgsql security definer set search_path = public as $$
declare n int;
begin
  perform public.award_badge(new.user_id, 'link_up');
  select count(*) into n from event_rsvps where user_id = new.user_id and status = 'checked_in';
  if n >= 3 then perform public.award_badge(new.user_id, 'regular'); end if;
  return null;
end $$;
create trigger event_rsvps_profile_awards after insert or update of status on public.event_rsvps
  for each row when (new.status = 'checked_in')
  execute function public.profile_awards_for_checkin();

create or replace function public.profile_awards_for_club_battle()
returns trigger language plpgsql security definer set search_path = public as $$
declare m record;
begin
  for m in select user_id from club_members where club_id = new.winner_club loop
    perform public.award_badge(m.user_id, 'derby_day');
    perform public.grant_emote(m.user_id, 'crown');
  end loop;
  return null;
end $$;
create trigger club_battles_profile_awards after update of status, winner_club on public.club_battles
  for each row
  when (new.status = 'finished' and new.winner_club is not null and old.status is distinct from 'finished')
  execute function public.profile_awards_for_club_battle();

create or replace function public.profile_awards_for_squad()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.award_badge(new.user_id, 'squad_called');
  perform public.grant_emote(new.user_id, 'watch');
  return null;
end $$;
create trigger squad_members_profile_awards after insert on public.squad_members
  for each row execute function public.profile_awards_for_squad();

-- ── Invite friends ───────────────────────────────────────────────────────────

create table public.referrals (
  referee_id    uuid primary key references public.profiles(id) on delete cascade,
  referrer_id   uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  qualified_at  timestamptz,
  check (referee_id <> referrer_id)
);
create index referrals_referrer_idx on public.referrals(referrer_id);

-- Pays the referrer once their friend has walked 10k since joining, then any
-- milestone that count reaches: 3 friends a badge, 5 a month of Pro, 10 a
-- month of Black (a subscription row, so the ring follows).
create or replace function public.referral_check(p_referee uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  r referrals;
  walked bigint;
  n int;
  friend text;
begin
  select * into r from referrals where referee_id = p_referee and qualified_at is null for update;
  if r.referee_id is null then return false; end if;
  select coalesce(sum(steps), 0) into walked from daily_steps
  where user_id = p_referee and not flagged and day >= (r.created_at at time zone 'Europe/London')::date;
  if walked < 10000 then return false; end if;

  update referrals set qualified_at = now() where referee_id = p_referee;
  select display_name into friend from profiles where id = p_referee;
  perform public.award(r.referrer_id, 'referral:' || p_referee, friend || ' walked their 10k', 'referral', 0, 500, 'profile', p_referee::text);
  perform public.notify(r.referrer_id, 'reward', friend || ' walked their 10k', '500 OUT is yours.', '/friends/invite', p_referee);

  select count(*) into n from referrals where referrer_id = r.referrer_id and qualified_at is not null;
  if n >= 3 then perform public.award_badge(r.referrer_id, 'bring_three'); end if;
  if n in (5, 10) then
    insert into subscriptions (user_id, tier, source, status, provider_ref, current_period_end)
    values (r.referrer_id, case when n = 10 then 'black' else 'pro' end::tier, 'web', 'active',
            format('referral:%s:%s', r.referrer_id, n), now() + interval '1 month')
    on conflict (provider_ref) do nothing;
    perform public.notify(r.referrer_id, 'reward',
      format('A free %s month', case when n = 10 then 'Black' else 'Pro' end),
      format('%s friends joined from your link. Thank you.', n), '/membership/manage');
  end if;
  return true;
end $$;
revoke execute on function public.referral_check(uuid) from public, anon, authenticated;

revoke execute on function public.profile_awards_for_run() from public, anon, authenticated;
revoke execute on function public.profile_awards_for_profile() from public, anon, authenticated;
revoke execute on function public.profile_awards_for_battle() from public, anon, authenticated;
revoke execute on function public.profile_awards_for_steps() from public, anon, authenticated;
revoke execute on function public.profile_awards_for_club_member() from public, anon, authenticated;
revoke execute on function public.profile_awards_for_checkin() from public, anon, authenticated;
revoke execute on function public.profile_awards_for_club_battle() from public, anon, authenticated;
revoke execute on function public.profile_awards_for_squad() from public, anon, authenticated;

create trigger daily_steps_profile_awards after insert or update of steps, flagged on public.daily_steps
  for each row execute function public.profile_awards_for_steps();

-- Joined from a friend's link: name who, within a week of joining. You get
-- 500 OUT to start and follow them.
create or replace function public.claim_referral(p_username text)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  them profiles;
  joined timestamptz;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  select * into them from profiles where username = lower(trim(leading '@' from trim(coalesce(p_username, ''))));
  if them.id is null then raise exception 'NOT_FOUND' using hint = 'No one has that username.'; end if;
  if them.id = me then raise exception 'SELF' using hint = 'That''s your own name.'; end if;
  if exists (select 1 from referrals where referee_id = me) then
    raise exception 'ALREADY_REFERRED' using hint = 'You''ve already said who invited you.';
  end if;
  select coalesce(onboarded_at, created_at) into joined from profiles where id = me;
  if joined < now() - interval '7 days' then raise exception 'TOO_LATE' using hint = 'Invites count in your first week.'; end if;

  insert into referrals (referee_id, referrer_id) values (me, them.id);
  perform public.award(me, 'referral-welcome:' || me, 'Invited by ' || them.display_name, 'referral', 0, 500, 'profile', them.id::text);
  insert into follows (follower_id, followee_id) values (me, them.id) on conflict do nothing;
  perform public.notify(them.id, 'social', (select display_name from profiles where id = me) || ' joined from your link',
    'When they walk 10k you get 500 OUT.', '/friends/invite', me);
  perform public.referral_check(me);
  return json_build_object('referrer', them.id);
end $$;

-- ── Contacts ─────────────────────────────────────────────────────────────────

-- Members whose sign-in email is one of these. Only ids come back; the app
-- reads the public profile like anyone else's. Capped so it can't be used to
-- sweep the member list.
create or replace function public.match_contacts(p_emails text[])
returns table (id uuid) language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  if cardinality(p_emails) > 500 then raise exception 'TOO_MANY' using hint = 'Too many contacts at once.'; end if;
  return query
    select u.id from auth.users u
    join profiles p on p.id = u.id
    where lower(u.email) = any (select lower(trim(e)) from unnest(p_emails) e)
      and u.id <> auth.uid()
      and p.onboarded_at is not null
    limit 100;
end $$;

-- ── Row Level Security and grants ────────────────────────────────────────────

alter table public.streak_freezes enable row level security;
alter table public.emotes enable row level security;
alter table public.member_emotes enable row level security;
alter table public.emote_trays enable row level security;
alter table public.referrals enable row level security;

revoke all on public.streak_freezes, public.emotes, public.member_emotes, public.emote_trays, public.referrals from anon, authenticated;
grant select on public.streak_freezes, public.emotes, public.member_emotes, public.emote_trays, public.referrals to authenticated;

create policy "own streak freezes" on public.streak_freezes for select using (user_id = auth.uid());
create policy "emotes are for members" on public.emotes for select to authenticated using (true);
create policy "own emotes" on public.member_emotes for select using (user_id = auth.uid());
create policy "own emote tray" on public.emote_trays for select using (user_id = auth.uid());
create policy "my referrals" on public.referrals for select using (referrer_id = auth.uid() or referee_id = auth.uid());

revoke execute on function public.streak_freeze_status() from public, anon;
revoke execute on function public.use_streak_freeze() from public, anon;
revoke execute on function public.set_emote_tray(text[]) from public, anon;
revoke execute on function public.mark_emote_seen(text) from public, anon;
revoke execute on function public.emote_counts() from public, anon;
revoke execute on function public.claim_referral(text) from public, anon;
revoke execute on function public.match_contacts(text[]) from public, anon;
grant execute on function public.streak_freeze_status(), public.use_streak_freeze(), public.set_emote_tray(text[]),
  public.mark_emote_seen(text), public.emote_counts(), public.claim_referral(text), public.match_contacts(text[])
  to authenticated;
