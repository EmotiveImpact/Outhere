-- Active members per place (part 15b).

\set QUIET on
set client_min_messages = warning;
\o /dev/null

-- 101 active people in Leeds, one who walks too little, one too new to count.
insert into auth.users (id, email, raw_user_meta_data)
select ('00000000-0000-0000-0000-' || lpad(to_hex(4096 + g), 12, '0'))::uuid, 'w' || g || '@example.com', '{"display_name":"W"}'
from generate_series(1, 103) g;
create temp table walkers as
  select id, email from auth.users where email like 'w%@example.com';
update profiles set city_id = 'leeds', borough_id = null, trust = 'verified'
where id in (select id from walkers);
update profiles set trust = 'new' where id = (select id from walkers where email = 'w103@example.com');
insert into daily_steps (user_id, day, steps)
select w.id, london_today() - d, case when w.email = 'w102@example.com' then 1000 else 6000 end
from walkers w cross join generate_series(1, 3) d;

set role anon;
do $$ begin
  assert (select eligible from city_eligible_counts where city_id = 'leeds') = 101, 'only active, verified people count';
  assert (select to_go from city_eligible_counts where city_id = 'sheffield') = 100, 'an empty city needs 100';
  assert (select eligible from region_eligible_counts where region = 'Yorkshire') = 101, 'region totals its places';
end $$;
reset role;

do $$ begin
  assert not (select is_live from cities where id = 'leeds'), 'not live before the refresh';
  assert refresh_live_cities() = 1, 'one city goes live';
  assert (select is_live from cities where id = 'leeds'), 'Leeds is live at 100';
  assert not (select is_live from cities where id = 'sheffield'), 'Sheffield still plays for Yorkshire';
end $$;
