-- Fighter Pack: credits by tier, the 18+ rule, consent and the scan, making
-- a pack, re-rolls, refunds, pose picks, fighter pictures on player reads,
-- deleting, and the runner choice.

\set QUIET on
set client_min_messages = warning;
\o /dev/null

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'alex@example.com', '{"display_name":"Alex"}'),
  ('00000000-0000-0000-0000-0000000000b1', 'kemi@example.com', '{"display_name":"Kemi"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'teen@example.com', '{"display_name":"Teen"}');
update profiles set onboarded_at = now();

create function pg_temp.act(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, false)
$$;

-- ── Credits ──────────────────────────────────────────────────────────────────
-- Free has none. Alex goes Pro (12), Kemi goes Black (20).
do $$ begin
  assert public.pack_credit_balance('00000000-0000-0000-0000-0000000000a1') = 0, 'free has no credits';
end $$;
insert into subscriptions (user_id, tier, source, status, provider_ref, current_period_end) values
  ('00000000-0000-0000-0000-0000000000a1', 'pro', 'web', 'active', 'sub_alex', now() + interval '30 days'),
  ('00000000-0000-0000-0000-0000000000b1', 'black', 'web', 'active', 'sub_kemi', now() + interval '30 days');
do $$ begin
  assert public.pack_credit_balance('00000000-0000-0000-0000-0000000000a1') = 12, 'Pro joins with 12';
  assert public.pack_credit_balance('00000000-0000-0000-0000-0000000000b1') = 20, 'Black joins with 20';
  -- The ring moving again doesn't grant again.
  update profiles set tier = 'free' where id = '00000000-0000-0000-0000-0000000000a1';
  update profiles set tier = 'pro' where id = '00000000-0000-0000-0000-0000000000a1';
  assert public.pack_credit_balance('00000000-0000-0000-0000-0000000000a1') = 12, 'join credits once per tier';
  -- No top-up in the month you joined.
  perform public.topup_pack_credits();
  assert public.pack_credit_balance('00000000-0000-0000-0000-0000000000b1') = 20, 'no top-up in the joining month';
  -- Pretend they joined last month: Black tops up 12, to the cap of 30.
  update avatar_credits set created_at = now() - interval '40 days';
  perform public.topup_pack_credits();
  assert public.pack_credit_balance('00000000-0000-0000-0000-0000000000b1') = 30, 'Black tops up to 30';
  assert public.pack_credit_balance('00000000-0000-0000-0000-0000000000a1') = 12, 'Pro stays at its cap of 12';
  perform public.topup_pack_credits();
  assert (select count(*) from avatar_credits where reason = 'monthly') = 2, 'one top-up a month';
end $$;

-- ── Age and consent ──────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
do $$
declare st json;
begin
  begin perform record_pack_consent(); assert false, 'needs a date of birth';
  exception when others then assert sqlerrm = 'AGE_REQUIRED', sqlerrm; end;
  perform set_birth_date('1995-04-02');
  begin perform start_pack(); assert false, 'needs consent';
  exception when others then assert sqlerrm = 'CONSENT_REQUIRED', sqlerrm; end;
  st := record_pack_consent();
  assert st->>'consentedAt' is not null, 'consent recorded';
  assert (st->>'status') = 'none', 'no pack yet';
  assert (st->'credits'->>'balance')::int = 12, 'credits in the state';
  begin perform start_pack(); assert false, 'needs a scan';
  exception when others then assert sqlerrm = 'SCAN_REQUIRED', sqlerrm; end;
  -- Members can't write their own verification.
  begin perform record_pack_verification(auth.uid(), 'scan12345', null); assert false, 'service only';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000c1');
set role authenticated;
do $$ begin
  perform set_birth_date((london_today() - interval '15 years')::date);
  begin perform record_pack_consent(); assert false, 'under 18s cannot';
  exception when others then assert sqlerrm = 'UNDER_18', sqlerrm; end;
end $$;
reset role;

-- The Edge Function records Alex's passed scan.
select record_pack_verification('00000000-0000-0000-0000-0000000000a1', 'scanalex1',
  'selfies/00000000-0000-0000-0000-0000000000a1/scanalex1/straight.jpg');

-- ── A Pro pack ───────────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
do $$
declare st json;
begin
  st := start_pack();
  assert st->>'status' = 'making', 'making';
  assert json_array_length(st->'images') = 8, format('eight pictures, got %s', json_array_length(st->'images'));
  assert (st->'credits'->>'balance')::int = 4, 'eight credits spent';
  assert st->'fighter' is null or json_typeof(st->'fighter') = 'null', 'no fighter while making';
  begin perform start_pack(); assert false, 'one at a time';
  exception when others then assert sqlerrm = 'ALREADY_MAKING', sqlerrm; end;
  -- Members can't mark their own pictures done.
  begin update avatar_images set status = 'ready'; assert false, 'no direct writes';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- fal.ai answers: seven pictures land, one fails.
update avatar_images set request_id = 'req-' || name, submitted_at = now(), attempts = 1
where user_id = '00000000-0000-0000-0000-0000000000a1';
select finish_pack_image('req-' || name, true,
  format('avatars/%s/%s/%s.webp', user_id, pack_id, name))
from avatar_images where user_id = '00000000-0000-0000-0000-0000000000a1' and name <> 'background';
do $$ begin
  assert (select status from avatar_packs where user_id = '00000000-0000-0000-0000-0000000000a1') = 'making', 'still making';
  perform finish_pack_image('req-background', false, null, 'model error');
  assert (select status from avatar_packs where user_id = '00000000-0000-0000-0000-0000000000a1') = 'ready', 'ready once all are in';
  assert public.pack_credit_balance('00000000-0000-0000-0000-0000000000a1') = 5, 'the failed one is refunded';
  -- A second answer for the same request changes nothing.
  assert finish_pack_image('req-background', false, null, 'again') is null, 'done is done';
  assert public.pack_credit_balance('00000000-0000-0000-0000-0000000000a1') = 5, 'refunded once';
end $$;

select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
do $$
declare st json; f jsonb;
begin
  st := pack_state();
  assert st->>'status' = 'ready', 'ready';
  f := fighter_of(auth.uid());
  assert f ? 'vs' and f ? 'win' and not f ? 'background', format('fighter %s', f);
  assert (select fighter from profile_cards where id = auth.uid()) = f, 'profile_cards carries it';
  assert (select fighter(p) from profiles p where p.id = auth.uid()) = f, 'computed field';

  -- Re-roll: a credit, and the old picture stays until the new one lands.
  st := reroll_pack_slot('vs');
  assert (pack_credits()->>'balance')::int = 4, 'a credit for a re-roll';
  assert fighter_of(auth.uid()) ? 'vs', 'old picture still in use';
  begin perform reroll_pack_slot('vs'); assert false, 'already re-rolling';
  exception when others then assert sqlerrm = 'ALREADY_MAKING', sqlerrm; end;
  begin perform reroll_pack_slot('nope'); assert false, 'bad slot';
  exception when others then assert sqlerrm = 'BAD_SLOT', sqlerrm; end;
  begin perform reroll_pack_slot('race-hoodUp'); assert false, 'not in a Pro pack';
  exception when others then assert sqlerrm = 'NOT_FOUND', sqlerrm; end;

  -- Pose picks: Pro picks the first pose only.
  st := set_pack_pose('win', 'fistUp');
  assert st->'picks'->>'win' = 'fistUp', 'picked';
  begin perform set_pack_pose('win', 'roar'); assert false, 'Black only';
  exception when others then
    declare h text; begin
      get stacked diagnostics h = pg_exception_hint;
      assert sqlerrm = 'TIER_REQUIRED' and h = 'black', format('%s %s', sqlerrm, h);
    end;
  end;
  begin perform set_pack_pose('win', 'moonwalk'); assert false, 'bad pose';
  exception when others then assert sqlerrm = 'BAD_POSE', sqlerrm; end;
end $$;
reset role;

-- A failed re-roll keeps the old picture and refunds the credit.
update avatar_images set request_id = 'req-vs-2', submitted_at = now(), attempts = 2
where user_id = '00000000-0000-0000-0000-0000000000a1' and name = 'vs';
do $$ begin
  perform finish_pack_image('req-vs-2', false, null, 'model error');
  assert (select status from avatar_images where user_id = '00000000-0000-0000-0000-0000000000a1' and name = 'vs') = 'ready', 'keeps the old one';
  assert public.pack_credit_balance('00000000-0000-0000-0000-0000000000a1') = 5, 're-roll refunded';
end $$;

-- ── A Black pack ─────────────────────────────────────────────────────────────
insert into profile_private (id, birth_date) values ('00000000-0000-0000-0000-0000000000b1', '1990-01-01')
on conflict (id) do update set birth_date = excluded.birth_date;
-- A verification whose selfie has been cleaned away is not enough on its own.
select record_pack_verification('00000000-0000-0000-0000-0000000000b1', 'scankemi0', null);
select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
do $$ begin
  perform record_pack_consent();
  begin perform start_pack(); assert false, 'no face to work from';
  exception when others then assert sqlerrm = 'SCAN_REQUIRED', sqlerrm; end;
end $$;
reset role;
select record_pack_verification('00000000-0000-0000-0000-0000000000b1', 'scankemi1',
  'selfies/00000000-0000-0000-0000-0000000000b1/scankemi1/straight.jpg');
select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
do $$
declare st json;
begin
  st := start_pack();
  assert json_array_length(st->'images') = 19, format('19 pictures for Black, got %s', json_array_length(st->'images'));
  assert (st->'credits'->>'balance')::int = 22, 'still 8 credits';
end $$;
reset role;
update avatar_images set request_id = 'k-' || name, submitted_at = now(), attempts = 1
where user_id = '00000000-0000-0000-0000-0000000000b1';
select finish_pack_image('k-' || name, true, format('avatars/%s/%s/%s.webp', user_id, pack_id, name))
from avatar_images where user_id = '00000000-0000-0000-0000-0000000000b1';
select pg_temp.act('00000000-0000-0000-0000-0000000000b1');
set role authenticated;
do $$
declare st json;
begin
  st := set_pack_pose('respect', 'slowClap');
  assert fighter_of(auth.uid())->>'respect' like '%/respect-slowClap.webp', 'Black pose in use';
  assert fighter_of(auth.uid()) ? 'blackEdition', 'Black pictures';
end $$;
reset role;

select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
do $$ begin
  assert not exists (select 1 from avatar_images where user_id = '00000000-0000-0000-0000-0000000000b1'), 'rows are private';
  assert (select fighter from profile_cards where id = '00000000-0000-0000-0000-0000000000b1') ? 'vs', 'pictures are public';
  assert (select count(*) from fighter_cards(array['00000000-0000-0000-0000-0000000000b1'::uuid])) = 1, 'fighter_cards';
end $$;
reset role;

-- Dropping to Pro falls back to the first pose.
update profiles set tier = 'pro' where id = '00000000-0000-0000-0000-0000000000b1';
do $$ begin
  assert fighter_of('00000000-0000-0000-0000-0000000000b1')->>'respect' like '%/respect.webp', 'first pose on Pro';
end $$;

-- ── Runner choice and deleting ───────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
do $$
declare d json;
begin
  assert (select runner from profiles where id = auth.uid()) = 'man', 'man by default';
  update profiles set runner = 'either', runner_figure = 'woman' where id = auth.uid();
  assert (select runner_figure from profiles where id = auth.uid()) = 'woman', 'figure kept for either';
  update profiles set runner = 'woman' where id = auth.uid();
  assert (select runner_figure from profiles where id = auth.uid()) is null, 'figure cleared otherwise';

  d := delete_pack();
  assert json_array_length(d->'paths') = 7, format('paths to delete: %s', d->'paths');
  assert d->'state'->>'status' = 'none', 'gone';
  assert fighter_of(auth.uid()) is null, 'no fighter';
  assert (pack_credits()->>'balance')::int = 5, 'credits stay';
end $$;
reset role;
do $$ begin
  assert (select count(*) from avatar_orphans) >= 7, 'files queued for R2';
end $$;
