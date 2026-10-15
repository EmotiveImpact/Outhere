-- Reference data every Outhere database needs: cities, London boroughs (with
-- their place on the tile map) and the standing challenges. Safe to re-run.

insert into public.cities (id, name, region, lat, lng, is_live) values
  ('london', 'London', 'London', 51.5074, -0.1278, true),
  ('manchester', 'Manchester', 'North West', 53.4808, -2.2426, false),
  ('birmingham', 'Birmingham', 'West Midlands', 52.4862, -1.8904, false),
  ('leeds', 'Leeds', 'Yorkshire', 53.8008, -1.5491, false),
  ('liverpool', 'Liverpool', 'North West', 53.4084, -2.9916, false),
  ('bristol', 'Bristol', 'South West', 51.4545, -2.5879, false),
  ('sheffield', 'Sheffield', 'Yorkshire', 53.3811, -1.4701, false),
  ('newcastle', 'Newcastle', 'North East', 54.9783, -1.6178, false),
  ('nottingham', 'Nottingham', 'East Midlands', 52.9548, -1.1581, false),
  ('glasgow', 'Glasgow', 'Scotland', 55.8642, -4.2518, false),
  ('edinburgh', 'Edinburgh', 'Scotland', 55.9533, -3.1883, false),
  ('cardiff', 'Cardiff', 'Wales', 51.4816, -3.1791, false)
on conflict (id) do update set name = excluded.name, region = excluded.region;

insert into public.boroughs (id, city_id, name, tile_col, tile_row) values
  ('enfield', 'london', 'Enfield', 4, 0),
  ('harrow', 'london', 'Harrow', 2, 1),
  ('barnet', 'london', 'Barnet', 3, 1),
  ('haringey', 'london', 'Haringey', 4, 1),
  ('waltham-forest', 'london', 'Waltham Forest', 5, 1),
  ('hillingdon', 'london', 'Hillingdon', 0, 2),
  ('ealing', 'london', 'Ealing', 1, 2),
  ('brent', 'london', 'Brent', 2, 2),
  ('camden', 'london', 'Camden', 3, 2),
  ('islington', 'london', 'Islington', 4, 2),
  ('hackney', 'london', 'Hackney', 5, 2),
  ('redbridge', 'london', 'Redbridge', 6, 2),
  ('havering', 'london', 'Havering', 7, 2),
  ('hounslow', 'london', 'Hounslow', 0, 3),
  ('hammersmith-fulham', 'london', 'Hammersmith and Fulham', 1, 3),
  ('kensington-chelsea', 'london', 'Kensington and Chelsea', 2, 3),
  ('westminster', 'london', 'Westminster', 3, 3),
  ('city-of-london', 'london', 'City of London', 4, 3),
  ('tower-hamlets', 'london', 'Tower Hamlets', 5, 3),
  ('newham', 'london', 'Newham', 6, 3),
  ('barking-dagenham', 'london', 'Barking and Dagenham', 7, 3),
  ('richmond', 'london', 'Richmond upon Thames', 1, 4),
  ('wandsworth', 'london', 'Wandsworth', 2, 4),
  ('lambeth', 'london', 'Lambeth', 3, 4),
  ('southwark', 'london', 'Southwark', 4, 4),
  ('lewisham', 'london', 'Lewisham', 5, 4),
  ('greenwich', 'london', 'Greenwich', 6, 4),
  ('bexley', 'london', 'Bexley', 7, 4),
  ('kingston', 'london', 'Kingston upon Thames', 2, 5),
  ('merton', 'london', 'Merton', 3, 5),
  ('croydon', 'london', 'Croydon', 4, 5),
  ('bromley', 'london', 'Bromley', 5, 5),
  ('sutton', 'london', 'Sutton', 3, 6)
on conflict (id) do update set name = excluded.name, tile_col = excluded.tile_col, tile_row = excluded.tile_row;

insert into public.challenges (id, title, description, metric, target, period, reward_xp, reward_out, tier_required, sort) values
  ('daily-10k', 'Daily 10K', 'Hit 10,000 steps today.', 'steps', 10000, 'day', 60, 5, 'free', 0),
  ('week-50k', '50K Week', 'Walk 50,000 steps this week.', 'steps', 50000, 'week', 250, 25, 'free', 1),
  ('week-30km', 'City Explorer', 'Cover 30 km this week.', 'distance_m', 30000, 'week', 200, 20, 'free', 2),
  ('week-5-days', 'Five Days Out', 'Be active on five days this week.', 'active_days', 5, 'week', 150, 15, 'free', 3),
  ('week-club-run', 'Show Up', 'Check in at a club run this week.', 'club_runs', 1, 'week', 120, 10, 'free', 4),
  ('week-100k', 'Six Figures', '100,000 steps in a single week.', 'steps', 100000, 'week', 600, 60, 'pro', 5)
on conflict (id) do update set title = excluded.title, description = excluded.description,
  target = excluded.target, reward_xp = excluded.reward_xp, reward_out = excluded.reward_out;
