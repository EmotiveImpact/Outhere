-- Outside: UK places and the side rule, the City League week and call-ups,
-- rising places, areas, swipe picks, mystery challengers (never for under
-- 18s), emotes, boosts, metrics, rematches, the arena season, drop orders,
-- event tickets and fair play.

\set QUIET on
set client_min_messages = warning;
\o /dev/null

create function pg_temp.act(uid text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', uid, false)
$$;

-- e1 Alex (London), e2 Kemi (London), e3 Zain (London), e4 Yusuf (York),
-- e5 Teen (London, 15), e6 staff.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'alex@example.com', '{"display_name":"Alex"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'kemi@example.com', '{"display_name":"Kemi"}'),
  ('00000000-0000-0000-0000-0000000000e3', 'zain@example.com', '{"display_name":"Zain"}'),
  ('00000000-0000-0000-0000-0000000000e4', 'yusuf@example.com', '{"display_name":"Yusuf"}'),
  ('00000000-0000-0000-0000-0000000000e5', 'teen@example.com', '{"display_name":"Teen"}'),
  ('00000000-0000-0000-0000-0000000000e6', 'staff@example.com', '{"display_name":"Staff"}');
update profiles set onboarded_at = now(), city_id = 'london', borough_id = 'southwark'
  where id in ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2',
               '00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000e5');
update profiles set onboarded_at = now(), city_id = 'york' where id = '00000000-0000-0000-0000-0000000000e4';
update profile_private set birth_year = extract(year from now())::int - 15 where id = '00000000-0000-0000-0000-0000000000e5';
insert into staff (user_id, role) values ('00000000-0000-0000-0000-0000000000e6', 'admin');
insert into subscriptions (user_id, tier, source, status, provider_ref, current_period_end)
values ('00000000-0000-0000-0000-0000000000e1', 'pro', 'web', 'active', 'sub_outside_1', now() + interval '30 days');

-- Spendable OUT for the three adults in London.
do $$
declare u uuid;
begin
  foreach u in array array['00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2',
                           '00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000e4']::uuid[] loop
    perform public.award(u, 'test-grant:' || u, 'Test grant', 'test', 0, 3000);
  end loop;
  update ledger set available_at = now() - interval '1 day';
end $$;

-- ── Places and the side rule ─────────────────────────────────────────────────
do $$
begin
  assert (select count(*) from regions) = 12, 'twelve UK regions';
  assert (select count(*) from cities where launch_night) = 10, 'ten launch cities';
  assert not exists (select 1 from cities where region_id is null), 'every place has a region';
  assert (select count(*) from cities where kind = 'town') > 10, 'towns are seeded';
  assert (select bool_and(n >= 12) from (select count(b.id) n from cities c left join boroughs b on b.city_id = c.id
          where c.launch_night group by c.id) x), 'every launch city has its areas';
  assert (select count(*) from boroughs where city_id = 'london' and kind = 'borough') = 33, 'London plays by borough';
  assert (select region from cities where id = 'leeds') = 'Yorkshire and the Humber', 'region text kept for the web';
end $$;

select pg_temp.act('00000000-0000-0000-0000-0000000000e4');
set role authenticated;
do $$
declare s json;
begin
  s := play_side();
  assert s->>'kind' = 'region' and s->>'id' = 'yorkshire', 'York plays for its region: ' || s::text;
  assert (s->>'needed')::int = 100, 'needs 100';
  assert (select count(*) from regions) = 12, 'members read regions';
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
begin
  assert play_side()->>'kind' = 'city' and play_side()->>'id' = 'london', 'London is live and plays as itself';
end $$;
reset role;

-- ── Rising: medals and call-up weekend invites ───────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000e4');
set role authenticated;
do $$
declare n int; v json;
begin
  n := claim_founding_medal();
  assert n = 1, 'first medal in York';
  assert claim_founding_medal() = 1, 'claiming twice keeps the number';
  begin
    perform claim_founding_medal('leeds');
    raise exception 'medal for another place';
  exception when raise_exception then
    if sqlerrm <> 'NOT_ALLOWED' then raise; end if;
  end;
  v := rising_view();
  assert (v->>'medal')::int = 1 and (v->>'needed')::int = 100 and not (v->>'is_live')::boolean, 'rising view: ' || v::text;
  assert length(my_city_invite()) = 8, 'invite code';
end $$;
reset role;
-- Zain joins through Yusuf's code (new member) and both get 1,000 OUT.
select pg_temp.act('00000000-0000-0000-0000-0000000000e3');
set role authenticated;
do $$
declare code text;
begin
  select c.code into code from city_invites c where c.user_id = '00000000-0000-0000-0000-0000000000e4';
  assert code is null, 'cannot read someone else''s code';
end $$;
reset role;
do $$
declare code text;
begin
  select c.code into code from city_invites c where c.user_id = '00000000-0000-0000-0000-0000000000e4';
  perform set_config('test.code', code, false);
end $$;
set role authenticated;
do $$
begin
  perform redeem_city_invite(current_setting('test.code'));
  begin
    perform redeem_city_invite(current_setting('test.code'));
    raise exception 'redeemed twice';
  exception when raise_exception then
    if sqlerrm <> 'ALREADY_USED' then raise; end if;
  end;
end $$;
reset role;
do $$
begin
  assert (select count(*) from ledger where reason = 'invite' and amount = 1000) = 2, 'both sides paid once';
end $$;

-- ── A city week: 105 trusted active walkers in London, 100 in York ───────────
insert into auth.users (id, email, raw_user_meta_data)
select gen_random_uuid(), 'lon' || i || '@example.com', '{}'::jsonb from generate_series(1, 105) i;
insert into auth.users (id, email, raw_user_meta_data)
select gen_random_uuid(), 'york' || i || '@example.com', '{}'::jsonb from generate_series(1, 100) i;
update profiles set city_id = 'london', borough_id = 'hackney', trust = 'verified', onboarded_at = now()
  where id in (select id from auth.users where email like 'lon%');
update profiles set city_id = 'york', trust = 'verified', onboarded_at = now()
  where id in (select id from auth.users where email like 'york%');
update profiles set trust = 'verified' where id in ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e4');
insert into daily_steps (user_id, day, steps)
select p.id, london_today() - d, 9000 + (abs(hashtext(p.id::text)) % 3000)
from profiles p cross join generate_series(0, 3) d
where p.trust = 'verified';

do $$
declare n int;
begin
  n := refresh_live_cities();
  assert n = 1 and (select is_live from cities where id = 'york'), 'York goes live at 100';
  assert (select count(*) from notifications where title = 'York is live') >= 100, 'York is told';
end $$;

select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare t json;
begin
  t := city_league();
  assert json_array_length(t->'sides') = 2, 'London and York fill League One: ' || (t->'sides')::text;
  assert (select bool_and(x->>'division' = 'league-one') from json_array_elements(t->'sides') x), 'both in League One';
  assert (select count(*) from json_array_elements(t->'sides') x where (x->>'mine')::boolean) = 1, 'my side marked';
end $$;
reset role;

-- Next Saturday's fixture, so call-ups are still open.
do $$
declare n int; sat date := date_trunc('week', london_today())::date + 12;
begin
  n := build_city_week(sat);
  assert n = 1, 'one fixture';
  assert build_city_week(sat) = 0, 'safe to run twice';
  assert (select count(*) from squad_members) = 200, 'squads of 100 a side';
  assert (select count(distinct squad_number) from squad_members) = 100, 'numbered 1 to 100';
end $$;

-- Make sure Alex is called up for the test.
do $$
declare f uuid; e uuid; u uuid;
begin
  select id into f from fixtures limit 1;
  select le.id into e from league_entries le where le.city_id = 'london';
  if not exists (select 1 from squad_members where fixture_id = f and user_id = '00000000-0000-0000-0000-0000000000e1') then
    select user_id into u from squad_members where fixture_id = f and entry_id = e and squad_number = 7;
    update squad_members set user_id = '00000000-0000-0000-0000-0000000000e1' where fixture_id = f and user_id = u;
  end if;
end $$;

select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare c json; v json; r json; f uuid;
begin
  c := my_call_up();
  assert c is not null and (c->>'squad')::int = 100 and (c->>'open')::boolean, 'called up: ' || coalesce(c::text, 'null');
  f := (c->>'fixture')::uuid;
  v := city_fixture_view();
  assert v->>'id' = f::text and v->'mine'->>'number' is not null, 'fixture view: ' || v::text;
  assert (v->'home'->>'squad')::int = 100 and (v->'away'->>'squad')::int = 100, 'both squads';
  r := respond_call_up(f, true);
  assert r->>'status' = 'in', 'in';
  r := respond_call_up(f, false);
  assert r->>'status' = 'passed' and (r->>'reserve')::boolean, 'passed to a reserve: ' || r::text;
  assert my_call_up() is null, 'no longer in the squad';
  begin
    perform respond_call_up(f, true);
    raise exception 'answered after passing';
  exception when raise_exception then
    if sqlerrm <> 'NOT_IN_SQUAD' then raise; end if;
  end;
end $$;
reset role;
do $$
begin
  assert (select count(*) from squad_members where entry_id = (select id from league_entries where city_id = 'london')) = 100, 'squad still 100';
  assert exists (select 1 from notifications where title = 'You''re in as a reserve'), 'the reserve is told';
end $$;

-- The reveal pays the winning squad 250 OUT each.
do $$
declare f uuid; n int;
begin
  select id into f from fixtures limit 1;
  update fixtures set home_score = 9000, away_score = 8000, revealed_at = now() where id = f;
  select count(*) into n from ledger where reason = 'league' and amount = 250;
  assert n = 100, 'winners paid: ' || n;
  update fixtures set revealed_at = now() where id = f;
  assert (select count(*) from ledger where reason = 'league' and amount = 250) = 100, 'paid once';
end $$;

-- ── Areas ────────────────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare top text; n int;
begin
  select count(*) into n from area_table();
  assert n = 33, 'every London borough on the table';
  select area_id into top from area_table() order by rank limit 1;
  assert top = 'hackney', 'Hackney leads: ' || top;
  select count(*) into n from area_table('manchester');
  assert n = 12, 'Manchester plays by area';
  assert (select count(*) from friends_week()) >= 1, 'friends table has me';
end $$;
reset role;
do $$
begin
  assert settle_area_cups(date_trunc('week', london_today())::date) >= 100, 'Borough Cup pays the top area';
end $$;

-- ── Swipe to battle ──────────────────────────────────────────────────────────
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare deck json; b battles; n int;
begin
  deck := swipe_deck('near', 50);
  assert (select count(*) from json_array_elements(deck) x where x->>'id' = '00000000-0000-0000-0000-0000000000e2') = 1, 'Kemi is near';
  assert (select count(*) from json_array_elements(deck) x where x->>'id' = '00000000-0000-0000-0000-0000000000e5') = 0, 'no under 18s for adults';
  n := swipe_rival('00000000-0000-0000-0000-0000000000e2', true);
  assert n = 1, 'one pick';
  perform swipe_rival('00000000-0000-0000-0000-0000000000e3', false);
  deck := swipe_deck('near', 50);
  assert (select count(*) from json_array_elements(deck) x where x->>'id' in ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e3')) = 0, 'picked and passed leave the deck';
  assert json_array_length(my_picks()) = 1, 'my picks';
  begin
    perform challenge_pick('00000000-0000-0000-0000-0000000000e3', 'steps', 72, 100);
    raise exception 'challenged a pass';
  exception when raise_exception then
    if sqlerrm <> 'NOT_A_PICK' then raise; end if;
  end;
  b := challenge_pick('00000000-0000-0000-0000-0000000000e2', 'distance', 72, 100);
  assert b.metric = 'distance' and b.duration_h = 72 and b.stake_out = 100, 'challenge on distance';
  assert json_array_length(my_picks()) = 0, 'pick used';
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e5');
set role authenticated;
do $$
begin
  assert (select count(*) from json_array_elements(swipe_deck('city', 50)) x
          where x->>'id' = '00000000-0000-0000-0000-0000000000e1') = 0, 'under 18s never see adults';
  begin
    perform set_mystery_settings(true);
    raise exception 'minor switched on mystery challengers';
  exception when raise_exception then
    if sqlerrm <> 'UNDER_18' then raise; end if;
  end;
  assert not (mystery_settings_view()->>'enabled')::boolean, 'off for under 18s';
end $$;
reset role;

-- ── Battle extras: emotes, boost, distance, settle, rematch at half ──────────
select pg_temp.act('00000000-0000-0000-0000-0000000000e2');
set role authenticated;
do $$
declare b battles;
begin
  select * into b from battles where metric = 'distance';
  b := respond_battle(b.id, true);
  assert b.status = 'live', 'live';
  perform send_battle_emote(b.id, 'fire');
  begin
    perform send_battle_emote(b.id, 'respect');
    raise exception 'no rate limit';
  exception when raise_exception then
    if sqlerrm <> 'SLOW_DOWN' then raise; end if;
  end;
  assert boost_battle(b.id), 'boosted';
  begin
    perform boost_battle(b.id);
    raise exception 'boosted twice';
  exception when raise_exception then
    if sqlerrm <> 'ALREADY_BOOSTED' then raise; end if;
  end;
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
begin
  assert (select count(*) from battle_emotes) = 1, 'Alex sees the emote';
end $$;
reset role;
-- Kemi walks further, Alex takes more steps: distance decides it.
insert into daily_steps (user_id, day, steps, distance_m) values
  ('00000000-0000-0000-0000-0000000000e2', london_today(), 5000, 9000)
on conflict (user_id, day) do update set steps = excluded.steps, distance_m = excluded.distance_m;
update daily_steps set distance_m = 3000 where user_id = '00000000-0000-0000-0000-0000000000e1' and day = london_today();
do $$
declare b battles;
begin
  select * into b from battles where metric = 'distance';
  perform settle_battle(b.id);
  select * into b from battles where id = b.id;
  assert b.winner_id = '00000000-0000-0000-0000-0000000000e2', 'distance wins it';
  assert (select amount from ledger where idem_key = 'battle-win:' || b.id || ':xp') = 300, 'boost doubles the XP';
  update battles set finished_at = '2026-10-10 12:00+01' where id = b.id;
  update battles set finished_at = now() where id = b.id;
end $$;
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare old battles; nb battles; h json;
begin
  select * into old from battles where metric = 'distance' and rematch_of is null;
  nb := rematch_battle(old.id);
  assert nb.stake_out = 50 and nb.metric = 'distance' and nb.rematch_of = old.id, 'half stake rematch: ' || nb.stake_out;
  h := head_to_head('00000000-0000-0000-0000-0000000000e2');
  assert (h->>'theirs')::int = 1 and (h->>'mine')::int = 0, 'head to head';
  perform cancel_battle(nb.id);
end $$;
reset role;

-- ── Mystery challengers ──────────────────────────────────────────────────────
update profiles set surprise_challengers = false where id not in ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e3');
select pg_temp.act('00000000-0000-0000-0000-0000000000e3');
set role authenticated;
do $$
begin
  perform set_mystery_settings(true, 'city', 10, 5, 3, 4);
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare oid uuid; v json;
begin
  perform set_mystery_settings(true, 'city', 10, 5, 3, 4);
  oid := find_mystery_challenger();
  v := mystery_offer_view(oid);
  assert v->>'status' = 'open' and v->'rival' is null or json_typeof(v->'rival') = 'null', 'hidden until both say yes: ' || v::text;
  assert (select count(*) from mystery_offers) = 0, 'offers are not readable directly';
  v := answer_mystery(oid, true);
  assert v->>'status' = 'open', 'waiting on them';
  perform set_config('test.offer', oid::text, false);
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e3');
set role authenticated;
do $$
declare v json;
begin
  v := mystery_offer_view();
  assert v->>'id' = current_setting('test.offer'), 'Zain sees the same offer';
  v := answer_mystery(current_setting('test.offer')::uuid, true);
  assert v->>'status' = 'revealed' and v->'rival'->>'display_name' = 'Alex', 'revealed: ' || v::text;
  assert (select is_surprise from battles where id = (v->>'battle_id')::uuid), 'a surprise battle';
end $$;
reset role;

-- ── Arena season ─────────────────────────────────────────────────────────────
do $$
begin
  update battles set finished_at = '2026-10-10 12:00+01' where status in ('finished', 'forfeit');
  assert close_arena_season(2) >= 2, 'season closed';
  assert close_arena_season(2) = 0, 'closing twice does nothing';
end $$;
select pg_temp.act('00000000-0000-0000-0000-0000000000e2');
set role authenticated;
do $$
declare r json; before int;
begin
  r := my_season_results();
  assert (r->>'rank')::int = 1 and r->>'perk' = 'black_week', 'Kemi top of London: ' || r::text;
  r := claim_season_rewards(2);
  assert (r->>'claimed')::boolean, 'claimed';
  assert (select tier from profiles where id = '00000000-0000-0000-0000-0000000000e2') = 'black', 'a week of Black';
  begin
    perform claim_season_rewards(2);
    raise exception 'claimed twice';
  exception when raise_exception then
    if sqlerrm <> 'ALREADY_CLAIMED' then raise; end if;
  end;
  assert (arena_now()->>'season')::int = 2, 'season two now';
end $$;
reset role;

-- ── Drop orders ──────────────────────────────────────────────────────────────
insert into drops (id, title, price_out, sizes, stock, opens_at)
values ('00000000-0000-0000-0000-00000000d001', 'Night Runner 01', 1800, array['7', '8', '9'], 37, now() - interval '1 hour');
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare o json;
begin
  begin
    perform claim_drop('00000000-0000-0000-0000-00000000d001', '9', '{}'::jsonb);
    raise exception 'no address';
  exception when raise_exception then
    if sqlerrm <> 'ADDRESS_REQUIRED' then raise; end if;
  end;
  begin
    perform claim_drop('00000000-0000-0000-0000-00000000d001', '12', '{"name":"Alex Morgan","line1":"Flat 4, 18 Bermondsey St","town":"London","postcode":"se1 3tq"}');
    raise exception 'bad size';
  exception when raise_exception then
    if sqlerrm <> 'SIZE_REQUIRED' then raise; end if;
  end;
  o := claim_drop('00000000-0000-0000-0000-00000000d001', '9', '{"name":"Alex Morgan","line1":"Flat 4, 18 Bermondsey St","town":"London","postcode":"se1 3tq"}');
  assert o->>'status' = 'claimed' and o->'address'->>'postcode' = 'SE1 3TQ' and (o->>'delivery_out')::int = 150, 'claimed: ' || o::text;
  assert json_array_length(o->'history') = 1, 'history starts';
  assert (select count(*) from delivery_addresses) = 1, 'address saved';
  assert json_array_length(my_orders()) = 1, 'my orders';
  perform set_config('test.order', o->>'id', false);
  begin
    perform claim_drop('00000000-0000-0000-0000-00000000d001', '9', '{"name":"A","line1":"B","town":"C","postcode":"D1 1AA"}');
    raise exception 'claimed twice';
  exception when raise_exception then
    if sqlerrm <> 'ALREADY_CLAIMED' then raise; end if;
  end;
  begin
    perform advance_drop_order(current_setting('test.order')::uuid, 'shipped');
    raise exception 'member moved an order';
  exception when raise_exception then
    if sqlerrm <> 'NOT_ALLOWED' then raise; end if;
  end;
end $$;
reset role;
do $$
begin
  assert (select stock from drops where id = '00000000-0000-0000-0000-00000000d001') = 36, 'stock down';
  assert (select amount from ledger where idem_key like 'drop:%:out') = -1950, 'price and delivery in OUT';
end $$;
select pg_temp.act('00000000-0000-0000-0000-0000000000e6');
set role authenticated;
do $$
declare o json;
begin
  o := advance_drop_order(current_setting('test.order')::uuid, 'packed');
  o := advance_drop_order(current_setting('test.order')::uuid, 'shipped');
  assert o->>'status' = 'shipped' and json_array_length(o->'history') = 3, 'tracked: ' || o::text;
end $$;
reset role;

-- ── Event tickets and who's going ────────────────────────────────────────────
insert into events (id, city_id, kind, title, starts_at, place_name, created_by)
values ('00000000-0000-0000-0000-00000000e001', 'london', 'open_run', 'City Night Run', now() + interval '10 minutes',
        'Southbank Centre', '00000000-0000-0000-0000-0000000000e6');
insert into follows (follower_id, followee_id) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e3');
select pg_temp.act('00000000-0000-0000-0000-0000000000e2');
set role authenticated;
do $$ begin perform rsvp_event('00000000-0000-0000-0000-00000000e001', true); end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e3');
set role authenticated;
do $$ begin perform rsvp_event('00000000-0000-0000-0000-00000000e001', true); end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare t json; g json;
begin
  begin
    perform my_ticket('00000000-0000-0000-0000-00000000e001');
    raise exception 'ticket without going';
  exception when raise_exception then
    if sqlerrm <> 'NOT_GOING' then raise; end if;
  end;
  perform rsvp_event('00000000-0000-0000-0000-00000000e001', true);
  t := my_ticket('00000000-0000-0000-0000-00000000e001');
  assert (t->>'wave')::int = 1 and t->>'gate' = 'A' and t->>'qr' like 'outhere:ticket:%', 'ticket: ' || t::text;
  perform set_config('test.ticket', t->>'qr', false);
  g := event_going('00000000-0000-0000-0000-00000000e001');
  assert (g->>'count')::int = 3 and (g->>'friends')::int = 1, 'going: ' || g::text;
  assert g->'people'->0->>'display_name' = 'Zain', 'friends first';
  begin
    perform scan_ticket(current_setting('test.ticket'));
    raise exception 'member scanned a ticket';
  exception when raise_exception then
    if sqlerrm <> 'NOT_ALLOWED' then raise; end if;
  end;
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e6');
set role authenticated;
do $$
begin
  assert scan_ticket(current_setting('test.ticket'))->>'name' = 'Alex', 'organiser scans';
end $$;
reset role;
do $$
begin
  assert (select status from event_rsvps where event_id = '00000000-0000-0000-0000-00000000e001'
          and user_id = '00000000-0000-0000-0000-0000000000e1') = 'checked_in', 'checked in by scan';
end $$;

-- ── Fair play ────────────────────────────────────────────────────────────────
-- 5.5 km: 3.1 km on foot, then 2.4 km at about 30 km/h.
select pg_temp.act('00000000-0000-0000-0000-0000000000e1');
set role authenticated;
do $$
declare
  pts jsonb := '[]'::jsonb;
  t bigint := (extract(epoch from now() - interval '40 minutes') * 1000)::bigint;
  lat float8 := 51.5;
  i int;
  r runs;
  v json;
begin
  for i in 0..31 loop      -- about 100 m every 30 s: 12 km/h
    pts := pts || jsonb_build_array(jsonb_build_array(lat + i * 0.0009, -0.1, t + i * 30000));
  end loop;
  for i in 1..24 loop      -- 100 m every 12 s: 30 km/h
    pts := pts || jsonb_build_array(jsonb_build_array(lat + 31 * 0.0009 + i * 0.0009, -0.1, t + 31 * 30000 + i * 12000));
  end loop;
  r := save_run(now() - interval '40 minutes', now() - interval '20 minutes', 5500, 1200, 7000, pts);
  v := run_review_view(r.id);
  assert v is not null and v->>'status' = 'open', 'run under review';
  assert (v->>'counted_m')::int between 2900 and 3300, 'only the fast part held: ' || v::text;
  assert (v->>'held_xp')::int = 20, 'held XP for the fast km';
  v := answer_run_review(r.id, false, 'I was on a downhill');
  assert v->>'status' = 'appealed', 'appealed';
  perform set_config('test.run', r.id::text, false);
end $$;
reset role;
select pg_temp.act('00000000-0000-0000-0000-0000000000e6');
set role authenticated;
do $$
declare v json;
begin
  v := decide_run_review(current_setting('test.run')::uuid, true);
  assert v->>'status' = 'cleared', 'cleared';
end $$;
reset role;
do $$
begin
  assert (select sum(amount) from ledger where ref_type = 'run' and ref_id = current_setting('test.run') and currency = 'xp')
       = (select amount from ledger where idem_key = 'run:' || current_setting('test.run') || ':xp'), 'held XP paid back';
end $$;

\o
select 'outside ok' as result;
