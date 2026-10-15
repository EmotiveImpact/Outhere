-- Reference data every Outhere database needs: the standing challenges. Safe
-- to re-run.

-- UK regions, cities, towns and every city's areas (London's boroughs and the
-- other launch cities' areas) are seeded by migration 20261015101700_outside.sql,
-- generated from apps/mobile/src/data/places.js.

insert into public.challenges (id, title, description, metric, target, period, reward_xp, reward_out, tier_required, sort) values
  ('daily-10k', 'Daily 10K', 'Hit 10,000 steps today.', 'steps', 10000, 'day', 60, 5, 'free', 0),
  ('week-50k', '50K Week', 'Walk 50,000 steps this week.', 'steps', 50000, 'week', 250, 25, 'free', 1),
  ('week-30km', 'City Explorer', 'Cover 30 km this week.', 'distance_m', 30000, 'week', 200, 20, 'free', 2),
  ('week-5-days', 'Five Days Out', 'Be active on five days this week.', 'active_days', 5, 'week', 150, 15, 'free', 3),
  ('week-club-run', 'Show Up', 'Check in at a club run this week.', 'club_runs', 1, 'week', 120, 10, 'free', 4),
  ('week-100k', 'Six Figures', '100,000 steps in a single week.', 'steps', 100000, 'week', 600, 60, 'pro', 5)
on conflict (id) do update set title = excluded.title, description = excluded.description,
  target = excluded.target, reward_xp = excluded.reward_xp, reward_out = excluded.reward_out;
