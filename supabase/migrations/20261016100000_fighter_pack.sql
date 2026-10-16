-- Outhere schema: the Fighter Pack. Members make a set of AI pictures of
-- themselves from a live face scan (looking ahead, then turning left and
-- right); the pictures stand in for their photo across the game. The app's
-- side of the rules is apps/mobile/src/constants/pack.js; keep the two the
-- same.
--
-- - Runner choice: the silhouette shown until there is a pack or a photo.
--   profiles.runner is man, woman or either; runner_figure is the figure an
--   "either" member picked.
-- - Credits: Free is locked. Pro gets 12 on joining Pro, then 4 on the 1st of
--   each month, never past 12. Black gets 20 on joining, then 12 a month,
--   never past 30. A pack spends 8 (the eight base pictures); a re-roll
--   spends 1; a picture that fails is refunded. A Black pack also makes the
--   two Black pictures and the three extra poses in each set for nothing.
-- - 18 and over only, from the date of birth on file (is_minor). Consent is a
--   recorded tick with a time.
-- - The scan: three fresh camera shots, checked by the avatar-pack Edge
--   Function, which records avatar_verifications. Once verified, re-rolls and
--   new poses skip the scan.
-- - Selfies sit in a private R2 bucket and go within 24 hours. Generated
--   pictures sit in a public R2 bucket; their keys are readable through
--   fighter_of(user), the profiles.fighter computed field and profile_cards.
-- - Pose picks: one per set (race, win, respect). Pro picks the first pose of
--   each set; Black picks any.
--
-- The Edge Function runs everything that touches R2 or fal.ai with the
-- service role; members call the RPCs below with their own session.

-- ── Runner choice ────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists runner text not null default 'man' check (runner in ('man', 'woman', 'either')),
  add column if not exists runner_figure text check (runner_figure in ('man', 'woman'));
grant update (runner, runner_figure) on public.profiles to authenticated;

-- A figure only means something for "either", so any other choice clears it.
create or replace function public.clear_runner_figure()
returns trigger language plpgsql as $$
begin
  if new.runner <> 'either' then new.runner_figure := null; end if;
  return new;
end $$;
create trigger profiles_runner_figure before insert or update of runner, runner_figure on public.profiles
  for each row execute function public.clear_runner_figure();

-- ── The set: slots and poses ─────────────────────────────────────────────────

-- The eight base pictures, then the two Black pictures.
create table public.avatar_slots (
  key         text primary key,
  black_only  boolean not null default false,
  sort        smallint not null
);
insert into public.avatar_slots (key, black_only, sort) values
  ('profile', false, 1), ('vs', false, 2), ('vsMirror', false, 3), ('swipe', false, 4),
  ('sprint', false, 5), ('win', false, 6), ('respect', false, 7), ('background', false, 8),
  ('blackEdition', true, 9), ('clubKit', true, 10);

-- Pose sets. The first pose (sort 0) is the one Pro gets and is the base
-- picture for its slot; the others come with Black.
create table public.avatar_poses (
  set_key     text not null,
  pose_key    text not null,
  slot        text not null references public.avatar_slots(key),
  sort        smallint not null,
  primary key (set_key, pose_key)
);
insert into public.avatar_poses (set_key, pose_key, slot, sort) values
  ('race', 'sprint', 'vs', 0), ('race', 'nightRun', 'vs', 1), ('race', 'hoodUp', 'vs', 2), ('race', 'finishLean', 'vs', 3),
  ('win', 'fistUp', 'win', 0), ('win', 'roar', 'win', 1), ('win', 'crown', 'win', 2), ('win', 'pointUp', 'win', 3),
  ('respect', 'nod', 'respect', 0), ('respect', 'fistBump', 'respect', 1), ('respect', 'handOnHeart', 'respect', 2), ('respect', 'slowClap', 'respect', 3);

create or replace function public.default_pose(p_set text)
returns text language sql stable set search_path = public as $$
  select pose_key from avatar_poses where set_key = p_set and sort = 0
$$;

-- Same rule as poseAllowed in constants/pack.js.
create or replace function public.pose_allowed(p_tier public.tier, p_set text, p_pose text)
returns boolean language sql stable set search_path = public as $$
  select case p_tier
           when 'black' then exists (select 1 from avatar_poses where set_key = p_set and pose_key = p_pose)
           when 'pro' then exists (select 1 from avatar_poses where set_key = p_set and pose_key = p_pose and sort = 0)
           else false
         end
$$;

-- ── Credits ──────────────────────────────────────────────────────────────────

create or replace function public.pack_credit_rules(p_tier public.tier, out join_credits integer, out monthly integer, out cap integer)
language sql immutable as $$
  select case p_tier when 'black' then 20 when 'pro' then 12 else 0 end,
         case p_tier when 'black' then 12 when 'pro' then 4 else 0 end,
         case p_tier when 'black' then 30 when 'pro' then 12 else 0 end
$$;

-- One line per grant or spend. The unique key stops a retry paying twice. A
-- grant of 0 (already at the cap) is still written, so it is not tried again.
create table public.avatar_credits (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  delta       integer not null,
  reason      text not null check (reason in ('join', 'monthly', 'pack', 'reroll', 'refund')),
  ref         text,
  idem_key    text not null unique,
  created_at  timestamptz not null default now(),
  check (delta <> 0 or reason in ('join', 'monthly'))
);
create index avatar_credits_user_idx on public.avatar_credits(user_id, created_at);

create or replace function public.pack_credit_balance(p_user uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::int from avatar_credits where user_id = p_user
$$;
revoke execute on function public.pack_credit_balance(uuid) from public, anon, authenticated;

-- The member's own balance, for anything that wants it as a table.
create view public.avatar_credit_balances with (security_invoker = true) as
select user_id, sum(delta)::int as balance from public.avatar_credits group by user_id;

-- Joining Pro or Black grants that tier's join credits, once per tier, up to
-- the cap. Called by the trigger below whenever the ring moves up.
create or replace function public.grant_pack_join_credits(p_user uuid, p_tier public.tier)
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  d int;
begin
  if p_tier not in ('pro', 'black') then return 0; end if;
  perform 1 from profiles where id = p_user for update;
  select * into r from public.pack_credit_rules(p_tier);
  d := greatest(0, least(r.join_credits, r.cap - public.pack_credit_balance(p_user)));
  insert into avatar_credits (user_id, delta, reason, ref, idem_key)
  values (p_user, d, 'join', p_tier::text, format('join:%s:%s', p_user, p_tier))
  on conflict (idem_key) do nothing;
  return case when found then d else 0 end;
end $$;
revoke execute on function public.grant_pack_join_credits(uuid, public.tier) from public, anon, authenticated;

-- Tier follows subscriptions (sync_tier in commerce), so this hooks the ring
-- itself: any move up to Pro or Black grants the join credits.
create or replace function public.pack_credits_on_tier()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.tier > old.tier then
    perform public.grant_pack_join_credits(new.id, new.tier);
  end if;
  return null;
end $$;
revoke execute on function public.pack_credits_on_tier() from public, anon, authenticated;
create trigger profiles_pack_credits after insert or update of tier on public.profiles
  for each row when (new.tier in ('pro', 'black'))
  execute function public.pack_credits_on_tier();

-- Members already on Pro or Black when this ships get their join credits.
select public.grant_pack_join_credits(id, tier) from public.profiles where tier in ('pro', 'black');

-- Run on the 1st of each month (pg_cron, below): every Pro and Black member
-- tops up by their monthly credits, never past the cap. The first top-up is
-- the 1st after joining. Safe to run twice in a month.
create or replace function public.topup_pack_credits()
returns integer language plpgsql security definer set search_path = public as $$
declare
  p record;
  r record;
  month_start timestamptz := (date_trunc('month', public.london_today()::timestamp) at time zone 'Europe/London');
  month_key text := to_char(public.london_today(), 'YYYY-MM');
  d int;
  n int := 0;
begin
  for p in select id, tier from profiles where tier in ('pro', 'black') loop
    if exists (select 1 from avatar_credits where user_id = p.id and reason = 'join' and created_at >= month_start) then
      continue;
    end if;
    perform 1 from profiles where id = p.id for update;
    select * into r from public.pack_credit_rules(p.tier);
    d := greatest(0, least(r.monthly, r.cap - public.pack_credit_balance(p.id)));
    insert into avatar_credits (user_id, delta, reason, ref, idem_key)
    values (p.id, d, 'monthly', month_key, format('monthly:%s:%s', p.id, month_key))
    on conflict (idem_key) do nothing;
    if found then n := n + 1; end if;
  end loop;
  return n;
end $$;
revoke execute on function public.topup_pack_credits() from public, anon, authenticated;

-- What getPackCredits shows. The next grant is midnight on the 1st, London.
create or replace function public.pack_credits_json(p_user uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  t tier;
  r record;
begin
  select tier into t from profiles where id = p_user;
  t := coalesce(t, 'free');
  select * into r from public.pack_credit_rules(t);
  return json_build_object(
    'tier', t,
    'locked', t = 'free',
    'balance', public.pack_credit_balance(p_user),
    'monthly', r.monthly,
    'cap', r.cap,
    'nextGrantAt', case when t = 'free' then null
                        else (date_trunc('month', public.london_today()::timestamp) + interval '1 month') at time zone 'Europe/London' end,
    'packCost', 8,
    'rerollCost', 1);
end $$;
revoke execute on function public.pack_credits_json(uuid) from public, anon, authenticated;

create or replace function public.pack_credits()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  return public.pack_credits_json(auth.uid());
end $$;
revoke execute on function public.pack_credits() from public, anon;
grant execute on function public.pack_credits() to authenticated;

-- ── Consent, the scan and the age rule ───────────────────────────────────────

create table public.avatar_consents (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  consented_at  timestamptz not null default now(),
  age_confirmed boolean not null check (age_confirmed)
);
create index avatar_consents_user_idx on public.avatar_consents(user_id, consented_at desc);

-- Written by the Edge Function once a scan passes. method 'fresh_shots' is
-- today's rule (three shots, uploaded within 10 minutes); 'liveness' is for
-- when a liveness or face match provider is added.
create table public.avatar_verifications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  verified_at timestamptz not null default now(),
  method      text not null check (method in ('fresh_shots', 'liveness')),
  scan_id     text,
  selfie_key  text                                -- the straight shot, while it lasts
);
create index avatar_verifications_user_idx on public.avatar_verifications(user_id, verified_at desc);

-- Every selfie upload link handed out, so the hourly clean up can delete the
-- files within 24 hours. Service role only.
create table public.avatar_scan_shots (
  key         text primary key check (key ~ '^selfies/[0-9a-f-]{36}/[A-Za-z0-9_-]{8,64}/(straight|left|right)\.jpg$'),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  scan_id     text not null,
  angle       text not null check (angle in ('straight', 'left', 'right')),
  created_at  timestamptz not null default now()
);
create index avatar_scan_shots_age_idx on public.avatar_scan_shots(created_at);

-- 18 and over, from a date of birth (or birth year) on file.
create or replace function public.pack_require_adult(p_user uuid)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from profile_private where id = p_user and (birth_date is not null or birth_year is not null)) then
    raise exception 'AGE_REQUIRED';
  end if;
  if public.is_minor(p_user) then raise exception 'UNDER_18'; end if;
end $$;
revoke execute on function public.pack_require_adult(uuid) from public, anon, authenticated;

-- Service role only: the Edge Function records a passed scan.
create or replace function public.record_pack_verification(p_user uuid, p_scan_id text, p_selfie_key text, p_method text default 'fresh_shots')
returns timestamptz language plpgsql security definer set search_path = public as $$
declare at timestamptz;
begin
  insert into avatar_verifications (user_id, method, scan_id, selfie_key)
  values (p_user, p_method, p_scan_id, p_selfie_key)
  returning verified_at into at;
  return at;
end $$;
revoke execute on function public.record_pack_verification(uuid, text, text, text) from public, anon, authenticated;

-- ── Packs and pictures ───────────────────────────────────────────────────────

create table public.avatar_packs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'making' check (status in ('making', 'ready', 'failed')),
  tier_at_make  public.tier not null,
  selfie_key    text,                             -- the straight shot it was made from
  created_at    timestamptz not null default now(),
  ready_at      timestamptz
);
create index avatar_packs_user_idx on public.avatar_packs(user_id, created_at desc);
create unique index avatar_packs_one_making on public.avatar_packs(user_id) where status = 'making';

-- One row per picture. name is the slot, or "set-pose" for an extra pose (the
-- first pose of a set is its slot's base picture). path is the key in the
-- public avatars bucket once made; a re-roll keeps the old path until the new
-- picture lands. cost is what a failure refunds.
create table public.avatar_images (
  id            uuid primary key default gen_random_uuid(),
  pack_id       uuid not null references public.avatar_packs(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  slot          text not null references public.avatar_slots(key),
  pose_set      text,
  pose          text,
  name          text not null,
  sort          smallint not null default 0,
  path          text check (path ~ '^avatars/[0-9a-f-]{36}/[0-9a-f-]{36}/[A-Za-z0-9-]{2,40}\.(webp|png|jpg)$'),
  status        text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  attempts      integer not null default 0,
  cost          integer not null default 0 check (cost >= 0),
  request_id    text unique,                      -- fal.ai queue request
  submitted_at  timestamptz,
  last_error    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (pack_id, name),
  foreign key (pose_set, pose) references public.avatar_poses(set_key, pose_key),
  check ((pose_set is null) = (pose is null))
);
create index avatar_images_user_idx on public.avatar_images(user_id);
create index avatar_images_pending_idx on public.avatar_images(status) where status = 'pending';
create trigger avatar_images_touch before update on public.avatar_images
  for each row execute function public.touch_updated_at();

-- Files no row points at any more (a replaced pack, a re-rolled picture, a
-- deleted pack). The clean up deletes them from R2. Service role only.
create table public.avatar_orphans (
  path        text primary key,
  created_at  timestamptz not null default now()
);

create table public.avatar_pose_picks (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  set_key     text not null,
  pose_key    text not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, set_key),
  foreign key (set_key, pose_key) references public.avatar_poses(set_key, pose_key)
);

-- ── Fighter pictures on player reads ─────────────────────────────────────────

-- { slot: path } from the member's latest ready pack, with vs, win and
-- respect taken from their pose picks when their tier allows the pick and
-- that picture exists. Null without a ready pack. The pictures are public,
-- like an avatar, so this answers for anyone.
create or replace function public.fighter_of(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with pk as (
    select id from avatar_packs where user_id = p_user and status = 'ready'
    order by ready_at desc nulls last, created_at desc limit 1
  ), imgs as (
    select i.* from avatar_images i join pk on pk.id = i.pack_id where i.path is not null
  ), sets as (
    select distinct set_key, slot from avatar_poses
  ), chosen as (
    select s.slot, i.path
    from sets s
    left join avatar_pose_picks pp on pp.user_id = p_user and pp.set_key = s.set_key
    join imgs i on i.pose_set = s.set_key
      and i.pose = case when public.pose_allowed((select tier from profiles where id = p_user), s.set_key, pp.pose_key)
                        then pp.pose_key else public.default_pose(s.set_key) end
  )
  select (select jsonb_object_agg(slot, path) from imgs where name = slot)
         || coalesce((select jsonb_object_agg(slot, path) from chosen), '{}'::jsonb)
$$;
grant execute on function public.fighter_of(uuid) to anon, authenticated;

-- A computed field, so any profiles select can ask for it by name:
-- .select('id, username, ..., runner, runner_figure, fighter').
create or replace function public.fighter(p public.profiles)
returns jsonb language sql stable security definer set search_path = public as $$
  select public.fighter_of(p.id)
$$;
grant execute on function public.fighter(public.profiles) to anon, authenticated;

-- Fighters for a list of people, for reads that come back from an RPC (the
-- swipe deck, picks) rather than a profiles select.
create or replace function public.fighter_cards(p_ids uuid[])
returns table (id uuid, runner text, runner_figure text, fighter jsonb)
language sql stable security definer set search_path = public as $$
  select p.id, p.runner, p.runner_figure, public.fighter_of(p.id)
  from profiles p where p.id = any(p_ids[1:200])
$$;
revoke execute on function public.fighter_cards(uuid[]) from public, anon;
grant execute on function public.fighter_cards(uuid[]) to authenticated;

-- The public card gets the runner choice and the fighter pictures too, so
-- private members still have a face in battles, chat and tables.
create or replace view public.profile_cards as
select id, username, display_name, avatar_path, tier, public_profile,
       runner, runner_figure, public.fighter_of(id) as fighter
from public.profiles;

-- ── What the screens read: pack_state() ──────────────────────────────────────

create or replace function public.pack_state_json(p_user uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  p avatar_packs;
  age_known boolean;
begin
  select * into p from avatar_packs where user_id = p_user order by created_at desc limit 1;
  select exists (select 1 from profile_private where id = p_user and (birth_date is not null or birth_year is not null)) into age_known;
  return json_build_object(
    'status', coalesce(p.status, 'none'),
    'packId', p.id,
    'tierAtMake', p.tier_at_make,
    'createdAt', p.created_at,
    'readyAt', p.ready_at,
    'consentedAt', (select max(consented_at) from avatar_consents where user_id = p_user),
    'verifiedAt', (select max(verified_at) from avatar_verifications where user_id = p_user),
    'age', json_build_object('known', age_known, 'adult', age_known and not public.is_minor(p_user)),
    'images', coalesce((
      select json_agg(json_build_object('id', i.id, 'slot', i.slot, 'set', i.pose_set, 'pose', i.pose, 'name', i.name,
                                        'path', i.path, 'status', i.status) order by i.sort, i.created_at)
      from avatar_images i where i.pack_id = p.id), '[]'::json),
    'picks', (
      select json_object_agg(s.set_key, coalesce(pp.pose_key, s.pose_key))
      from avatar_poses s
      left join avatar_pose_picks pp on pp.user_id = p_user and pp.set_key = s.set_key
      where s.sort = 0),
    'fighter', public.fighter_of(p_user),
    'credits', public.pack_credits_json(p_user));
end $$;
revoke execute on function public.pack_state_json(uuid) from public, anon, authenticated;

-- Everything the pack screens need in one call.
create or replace function public.pack_state()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  return public.pack_state_json(auth.uid());
end $$;
revoke execute on function public.pack_state() from public, anon;
grant execute on function public.pack_state() to authenticated;

-- ── Member RPCs ──────────────────────────────────────────────────────────────

-- The consent tick, with the member confirming they are 18 or over.
create or replace function public.record_pack_consent(p_age_confirmed boolean default true)
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  perform public.pack_require_adult(me);
  if not coalesce(p_age_confirmed, false) then raise exception 'AGE_REQUIRED'; end if;
  insert into avatar_consents (user_id, age_confirmed) values (me, true);
  return public.pack_state_json(me);
end $$;
revoke execute on function public.record_pack_consent(boolean) from public, anon;
grant execute on function public.record_pack_consent(boolean) to authenticated;

-- Starts a pack: checks the tier, age, consent, scan and credits, spends 8,
-- and makes a pending row for every picture. The app then asks the Edge
-- Function to generate them.
create or replace function public.start_pack()
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  t tier;
  v avatar_verifications;
  new_pack uuid;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  select tier into t from profiles where id = me for update;
  if t = 'free' then raise exception 'TIER_REQUIRED' using hint = 'pro'; end if;
  perform public.pack_require_adult(me);
  if not exists (select 1 from avatar_consents where user_id = me) then raise exception 'CONSENT_REQUIRED'; end if;
  select * into v from avatar_verifications where user_id = me order by verified_at desc, id desc limit 1;
  if v.id is null then raise exception 'SCAN_REQUIRED'; end if;
  -- The pictures need a face to work from: the selfie (kept 24 hours), or a
  -- profile picture from an earlier pack. With neither, scan again.
  if v.selfie_key is null
     and not exists (select 1 from avatar_images where user_id = me and name = 'profile' and path is not null) then
    raise exception 'SCAN_REQUIRED';
  end if;
  if exists (select 1 from avatar_packs where user_id = me and status = 'making') then raise exception 'ALREADY_MAKING'; end if;
  if public.pack_credit_balance(me) < 8 then raise exception 'NOT_ENOUGH_CREDITS'; end if;

  insert into avatar_packs (user_id, tier_at_make, selfie_key) values (me, t, v.selfie_key)
  returning id into new_pack;
  insert into avatar_credits (user_id, delta, reason, ref, idem_key)
  values (me, -8, 'pack', new_pack::text, 'pack:' || new_pack);

  -- The eight base pictures, a credit each.
  insert into avatar_images (pack_id, user_id, slot, pose_set, pose, name, sort, cost)
  select new_pack, me, s.key, p.set_key, p.pose_key, s.key, s.sort, 1
  from avatar_slots s left join avatar_poses p on p.slot = s.key and p.sort = 0
  where not s.black_only;
  -- Black: the Black pictures and every other pose, free with the pack.
  if t = 'black' then
    insert into avatar_images (pack_id, user_id, slot, name, sort, cost)
    select new_pack, me, s.key, s.key, s.sort, 0 from avatar_slots s where s.black_only;
    insert into avatar_images (pack_id, user_id, slot, pose_set, pose, name, sort, cost)
    select new_pack, me, p.slot, p.set_key, p.pose_key, p.set_key || '-' || p.pose_key, 20 + p.sort, 0
    from avatar_poses p where p.sort > 0;
  end if;
  return public.pack_state_json(me);
end $$;
revoke execute on function public.start_pack() from public, anon;
grant execute on function public.start_pack() to authenticated;

-- Re-rolls one picture for a credit. p_slot is the picture's name: a slot
-- ('vs') or an extra pose ('race-hoodUp'). The old picture stays in use
-- until the new one lands.
create or replace function public.reroll_pack_slot(p_slot text)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  t tier;
  p avatar_packs;
  img avatar_images;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  select tier into t from profiles where id = me for update;
  if t = 'free' then raise exception 'TIER_REQUIRED' using hint = 'pro'; end if;
  if not exists (select 1 from avatar_slots where key = p_slot)
     and not exists (select 1 from avatar_poses where set_key || '-' || pose_key = p_slot and sort > 0) then
    raise exception 'BAD_SLOT';
  end if;
  select * into p from avatar_packs where user_id = me order by created_at desc limit 1;
  if p.id is null or p.status = 'failed' then raise exception 'NO_PACK'; end if;
  if p.status = 'making' then raise exception 'ALREADY_MAKING'; end if;
  select * into img from avatar_images where pack_id = p.id and name = p_slot for update;
  if img.id is null then raise exception 'NOT_FOUND'; end if;
  if img.status = 'pending' then raise exception 'ALREADY_MAKING'; end if;
  if public.pack_credit_balance(me) < 1 then raise exception 'NOT_ENOUGH_CREDITS'; end if;
  insert into avatar_credits (user_id, delta, reason, ref, idem_key)
  values (me, -1, 'reroll', img.id::text, 'reroll:' || gen_random_uuid());
  update avatar_images set status = 'pending', cost = 1, request_id = null, submitted_at = null, last_error = null
  where id = img.id;
  return public.pack_state_json(me);
end $$;
revoke execute on function public.reroll_pack_slot(text) from public, anon;
grant execute on function public.reroll_pack_slot(text) to authenticated;

-- One pick per set. Pro picks the first pose only; anything else is Black.
-- A Black member whose pack was made on Pro gets the missing pose made free.
create or replace function public.set_pack_pose(p_set text, p_pose text)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  t tier;
  opt avatar_poses;
  p avatar_packs;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  select * into opt from avatar_poses where set_key = p_set and pose_key = p_pose;
  if opt.set_key is null then raise exception 'BAD_POSE'; end if;
  select tier into t from profiles where id = me;
  if not public.pose_allowed(t, p_set, p_pose) then
    raise exception 'TIER_REQUIRED' using hint = case when opt.sort = 0 then 'pro' else 'black' end;
  end if;
  insert into avatar_pose_picks (user_id, set_key, pose_key) values (me, p_set, p_pose)
  on conflict (user_id, set_key) do update set pose_key = excluded.pose_key, updated_at = now();
  select * into p from avatar_packs where user_id = me order by created_at desc limit 1;
  if p.id is not null and p.status <> 'failed'
     and not exists (select 1 from avatar_images where pack_id = p.id and pose_set = p_set and avatar_images.pose = p_pose) then
    insert into avatar_images (pack_id, user_id, slot, pose_set, pose, name, sort, cost)
    values (p.id, me, opt.slot, p_set, p_pose, p_set || '-' || p_pose, 20 + opt.sort, 0);
  end if;
  return public.pack_state_json(me);
end $$;
revoke execute on function public.set_pack_pose(text, text) from public, anon;
grant execute on function public.set_pack_pose(text, text) to authenticated;

-- Deletes every pack, picture and pick. Credits already spent stay spent.
-- The files go to avatar_orphans; the Edge Function's delete action removes
-- them from R2 straight away, the hourly clean up otherwise.
create or replace function public.delete_pack()
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  paths text[];
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  select coalesce(array_agg(path), '{}') into paths from avatar_images where user_id = me and path is not null;
  insert into avatar_orphans (path) select unnest(paths) on conflict do nothing;
  delete from avatar_packs where user_id = me;
  delete from avatar_pose_picks where user_id = me;
  return json_build_object('paths', paths, 'state', public.pack_state_json(me));
end $$;
revoke execute on function public.delete_pack() from public, anon;
grant execute on function public.delete_pack() to authenticated;

-- ── Service role: results from fal.ai and the clean up ───────────────────────

-- A picture came back (p_ok) or failed for good. A failure refunds what the
-- picture cost; a failed re-roll keeps the picture it had. When nothing in
-- the pack is pending any more, the pack is ready (or failed, if every
-- picture failed), and a ready pack replaces the member's older ones.
create or replace function public.finish_pack_image(p_request_id text, p_ok boolean, p_path text default null, p_error text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  img avatar_images;
  p avatar_packs;
begin
  select * into img from avatar_images where request_id = p_request_id for update;
  if img.id is null or img.status <> 'pending' then return null; end if;
  if p_ok then
    if img.path is not null and img.path is distinct from p_path then
      insert into avatar_orphans (path) values (img.path) on conflict do nothing;
    end if;
    update avatar_images set path = p_path, status = 'ready', cost = 0, last_error = null where id = img.id;
  else
    if img.cost > 0 then
      insert into avatar_credits (user_id, delta, reason, ref, idem_key)
      values (img.user_id, img.cost, 'refund', img.id::text, format('refund:%s:%s', img.id, p_request_id))
      on conflict (idem_key) do nothing;
    end if;
    update avatar_images set status = case when path is null then 'failed' else 'ready' end, cost = 0, last_error = left(p_error, 500)
    where id = img.id;
  end if;

  select * into p from avatar_packs where id = img.pack_id for update;
  if p.status = 'making' and not exists (select 1 from avatar_images where pack_id = p.id and status = 'pending') then
    update avatar_packs
       set status = case when exists (select 1 from avatar_images where pack_id = p.id and status = 'ready') then 'ready' else 'failed' end,
           ready_at = now()
     where id = p.id
    returning * into p;
    if p.status = 'ready' then
      insert into avatar_orphans (path)
      select path from avatar_images where user_id = p.user_id and pack_id <> p.id and path is not null
      on conflict do nothing;
      delete from avatar_packs where user_id = p.user_id and id <> p.id and status <> 'making';
    end if;
  end if;
  return json_build_object('image', img.id, 'pack', p.id, 'packStatus', p.status);
end $$;
revoke execute on function public.finish_pack_image(text, boolean, text, text) from public, anon, authenticated;

-- Pictures fal.ai never answered for, or that never got sent, after an hour.
create or replace function public.expire_stuck_pack_images()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  n int := 0;
begin
  for r in select id, request_id from avatar_images
           where status = 'pending' and coalesce(submitted_at, updated_at) < now() - interval '1 hour' loop
    if r.request_id is null then
      update avatar_images set request_id = 'expired:' || id where id = r.id;
    end if;
    perform public.finish_pack_image(coalesce(r.request_id, 'expired:' || r.id), false, null, 'timed out');
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.expire_stuck_pack_images() from public, anon, authenticated;

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table public.avatar_slots enable row level security;
alter table public.avatar_poses enable row level security;
alter table public.avatar_credits enable row level security;
alter table public.avatar_consents enable row level security;
alter table public.avatar_verifications enable row level security;
alter table public.avatar_scan_shots enable row level security;
alter table public.avatar_packs enable row level security;
alter table public.avatar_images enable row level security;
alter table public.avatar_orphans enable row level security;
alter table public.avatar_pose_picks enable row level security;

create policy "the set is public" on public.avatar_slots for select using (true);
create policy "poses are public" on public.avatar_poses for select using (true);
create policy "my credits" on public.avatar_credits for select using (user_id = auth.uid());
create policy "my consents" on public.avatar_consents for select using (user_id = auth.uid());
create policy "my verifications" on public.avatar_verifications for select using (user_id = auth.uid());
create policy "my packs" on public.avatar_packs for select using (user_id = auth.uid());
create policy "my pictures" on public.avatar_images for select using (user_id = auth.uid());
create policy "my picks" on public.avatar_pose_picks for select using (user_id = auth.uid());
-- avatar_scan_shots and avatar_orphans: no policies, service role only.
-- Every write goes through the functions above.
revoke insert, update, delete on public.avatar_slots, public.avatar_poses, public.avatar_credits,
  public.avatar_consents, public.avatar_verifications, public.avatar_scan_shots, public.avatar_packs,
  public.avatar_images, public.avatar_orphans, public.avatar_pose_picks from anon, authenticated;

-- ── Schedules ────────────────────────────────────────────────────────────────

-- Monthly credits at 03:10 on the 1st, and the hourly clean up (selfies over
-- 24 hours, orphaned pictures, stuck pictures) through the Edge Function.
-- The clean up needs pg_net and the two Vault secrets the story purge uses:
-- 'project_url' and 'service_role_key'.
do $$
begin
  if not exists (select 1 from pg_available_extensions where name = 'pg_cron') then return; end if;
  create extension if not exists pg_cron;
  perform cron.schedule('pack-credits', '10 3 1 * *', 'select public.topup_pack_credits()');
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
    perform cron.schedule('pack-cleanup', '20 * * * *', $c$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/avatar-pack',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')),
        body := '{"action": "cleanup"}'::jsonb)
    $c$);
  end if;
exception when others then
  raise notice 'Fighter Pack schedules not set: %', sqlerrm;
end $$;
