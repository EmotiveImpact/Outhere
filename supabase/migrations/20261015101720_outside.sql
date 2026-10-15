-- Outhere schema, part 17: Outside. UK places, the City League and areas,
-- swipe to battle and mystery challengers, battle extras (emotes, boosts,
-- rematches, the arena season), drop orders, event tickets and fair play.
--
-- Places (UK-wide launch)
--   public.regions (id, name, nation, sort): the nine English regions plus
--     Scotland, Wales and Northern Ireland.
--   public.cities gains region_id (-> regions), kind ('city' | 'town') and
--     launch_night (true for the ten biggest cities). cities.region (text)
--     stays for the web app. cities.is_live is the 100 active switch: a place
--     that is not live plays for its region.
--   public.boroughs holds every city's areas: London's boroughs (kind
--     'borough') and the areas of the other launch cities (kind 'area'), each
--     with a spot on the hex map (tile_col, tile_row).
--   The same data is in apps/mobile/src/data/places.js for the phone engine.
--
-- Everything that moves OUT, XP or results is a SECURITY DEFINER function
-- here; errors are raised as their code ('NOT_ALLOWED', 'UNDER_18' ...).

-- ── Places ───────────────────────────────────────────────────────────────────

create table if not exists public.regions (
  id      text primary key,
  name    text not null,
  nation  text not null check (nation in ('England', 'Scotland', 'Wales', 'Northern Ireland')),
  sort    integer not null default 0
);
alter table public.regions enable row level security;
create policy "regions are public" on public.regions for select using (true);
create policy "staff edit regions" on public.regions for all
  using (public.is_staff('admin')) with check (public.is_staff('admin'));
grant select on public.regions to anon, authenticated;

alter table public.cities
  add column if not exists region_id text references public.regions(id),
  add column if not exists kind text not null default 'city' check (kind in ('city', 'town')),
  add column if not exists launch_night boolean not null default false;
create index if not exists cities_region_idx on public.cities(region_id);

alter table public.boroughs
  add column if not exists kind text not null default 'borough' check (kind in ('borough', 'area'));

-- Generated from apps/mobile/src/data/places.js. Keep the two in step.
-- Region names match public.website_regions() (plus London), so the app, the
-- website and the database all say the same thing.
insert into public.regions (id, name, nation, sort) values
  ('london', 'London', 'England', 0),
  ('south-east', 'South East', 'England', 1),
  ('south-west', 'South West', 'England', 2),
  ('east-of-england', 'East of England', 'England', 3),
  ('west-midlands', 'West Midlands', 'England', 4),
  ('east-midlands', 'East Midlands', 'England', 5),
  ('yorkshire', 'Yorkshire', 'England', 6),
  ('north-west', 'North West', 'England', 7),
  ('north-east', 'North East', 'England', 8),
  ('wales', 'Wales', 'Wales', 9),
  ('scotland', 'Scotland', 'Scotland', 10),
  ('northern-ireland', 'Northern Ireland', 'Northern Ireland', 11)
on conflict (id) do update set name = excluded.name, nation = excluded.nation, sort = excluded.sort;

insert into public.cities (id, name, region, region_id, kind, lat, lng, launch_night, is_live) values
  ('london', 'London', 'London', 'london', 'city', 51.5074, -0.1278, true, true),
  ('birmingham', 'Birmingham', 'West Midlands', 'west-midlands', 'city', 52.4862, -1.8904, true, false),
  ('manchester', 'Manchester', 'North West', 'north-west', 'city', 53.4808, -2.2426, true, false),
  ('glasgow', 'Glasgow', 'Scotland', 'scotland', 'city', 55.8642, -4.2518, true, false),
  ('leeds', 'Leeds', 'Yorkshire', 'yorkshire', 'city', 53.8008, -1.5491, true, false),
  ('liverpool', 'Liverpool', 'North West', 'north-west', 'city', 53.4084, -2.9916, true, false),
  ('bristol', 'Bristol', 'South West', 'south-west', 'city', 51.4545, -2.5879, true, false),
  ('sheffield', 'Sheffield', 'Yorkshire', 'yorkshire', 'city', 53.3811, -1.4701, true, false),
  ('edinburgh', 'Edinburgh', 'Scotland', 'scotland', 'city', 55.9533, -3.1883, true, false),
  ('newcastle', 'Newcastle', 'North East', 'north-east', 'city', 54.9783, -1.6178, true, false),
  ('nottingham', 'Nottingham', 'East Midlands', 'east-midlands', 'city', 52.9548, -1.1581, false, false),
  ('leicester', 'Leicester', 'East Midlands', 'east-midlands', 'city', 52.6369, -1.1398, false, false),
  ('derby', 'Derby', 'East Midlands', 'east-midlands', 'city', 52.9225, -1.4746, false, false),
  ('lincoln', 'Lincoln', 'East Midlands', 'east-midlands', 'city', 53.2307, -0.5406, false, false),
  ('northampton', 'Northampton', 'East Midlands', 'east-midlands', 'town', 52.2405, -0.9027, false, false),
  ('coventry', 'Coventry', 'West Midlands', 'west-midlands', 'city', 52.4068, -1.5197, false, false),
  ('wolverhampton', 'Wolverhampton', 'West Midlands', 'west-midlands', 'city', 52.5862, -2.1288, false, false),
  ('stoke', 'Stoke-on-Trent', 'West Midlands', 'west-midlands', 'city', 53.0027, -2.1794, false, false),
  ('worcester', 'Worcester', 'West Midlands', 'west-midlands', 'city', 52.192, -2.22, false, false),
  ('hereford', 'Hereford', 'West Midlands', 'west-midlands', 'city', 52.0565, -2.716, false, false),
  ('shrewsbury', 'Shrewsbury', 'West Midlands', 'west-midlands', 'town', 52.7073, -2.7553, false, false),
  ('telford', 'Telford', 'West Midlands', 'west-midlands', 'town', 52.6766, -2.4469, false, false),
  ('bradford', 'Bradford', 'Yorkshire', 'yorkshire', 'city', 53.796, -1.7594, false, false),
  ('hull', 'Hull', 'Yorkshire', 'yorkshire', 'city', 53.7676, -0.3274, false, false),
  ('york', 'York', 'Yorkshire', 'yorkshire', 'city', 53.96, -1.0873, false, false),
  ('wakefield', 'Wakefield', 'Yorkshire', 'yorkshire', 'city', 53.6833, -1.4977, false, false),
  ('huddersfield', 'Huddersfield', 'Yorkshire', 'yorkshire', 'town', 53.6458, -1.785, false, false),
  ('harrogate', 'Harrogate', 'Yorkshire', 'yorkshire', 'town', 53.9921, -1.5418, false, false),
  ('preston', 'Preston', 'North West', 'north-west', 'city', 53.7632, -2.7031, false, false),
  ('blackpool', 'Blackpool', 'North West', 'north-west', 'town', 53.8175, -3.0357, false, false),
  ('bolton', 'Bolton', 'North West', 'north-west', 'town', 53.5769, -2.4282, false, false),
  ('stockport', 'Stockport', 'North West', 'north-west', 'town', 53.4106, -2.1575, false, false),
  ('warrington', 'Warrington', 'North West', 'north-west', 'town', 53.39, -2.597, false, false),
  ('chester', 'Chester', 'North West', 'north-west', 'city', 53.1934, -2.8931, false, false),
  ('lancaster', 'Lancaster', 'North West', 'north-west', 'city', 54.0466, -2.8007, false, false),
  ('carlisle', 'Carlisle', 'North West', 'north-west', 'city', 54.8925, -2.9329, false, false),
  ('sunderland', 'Sunderland', 'North East', 'north-east', 'city', 54.9069, -1.3838, false, false),
  ('middlesbrough', 'Middlesbrough', 'North East', 'north-east', 'town', 54.5742, -1.235, false, false),
  ('durham', 'Durham', 'North East', 'north-east', 'city', 54.7761, -1.5733, false, false),
  ('brighton', 'Brighton', 'South East', 'south-east', 'city', 50.8225, -0.1372, false, false),
  ('southampton', 'Southampton', 'South East', 'south-east', 'city', 50.9097, -1.4044, false, false),
  ('portsmouth', 'Portsmouth', 'South East', 'south-east', 'city', 50.8198, -1.088, false, false),
  ('reading', 'Reading', 'South East', 'south-east', 'town', 51.4543, -0.9781, false, false),
  ('oxford', 'Oxford', 'South East', 'south-east', 'city', 51.752, -1.2577, false, false),
  ('milton-keynes', 'Milton Keynes', 'South East', 'south-east', 'city', 52.0406, -0.7594, false, false),
  ('canterbury', 'Canterbury', 'South East', 'south-east', 'city', 51.2802, 1.0789, false, false),
  ('guildford', 'Guildford', 'South East', 'south-east', 'town', 51.2362, -0.5704, false, false),
  ('maidstone', 'Maidstone', 'South East', 'south-east', 'town', 51.272, 0.529, false, false),
  ('slough', 'Slough', 'South East', 'south-east', 'town', 51.5105, -0.595, false, false),
  ('plymouth', 'Plymouth', 'South West', 'south-west', 'city', 50.3755, -4.1427, false, false),
  ('exeter', 'Exeter', 'South West', 'south-west', 'city', 50.7184, -3.5339, false, false),
  ('bath', 'Bath', 'South West', 'south-west', 'city', 51.3811, -2.359, false, false),
  ('gloucester', 'Gloucester', 'South West', 'south-west', 'city', 51.8642, -2.2382, false, false),
  ('cheltenham', 'Cheltenham', 'South West', 'south-west', 'town', 51.8994, -2.0783, false, false),
  ('swindon', 'Swindon', 'South West', 'south-west', 'town', 51.5558, -1.7797, false, false),
  ('bournemouth', 'Bournemouth', 'South West', 'south-west', 'town', 50.7192, -1.8808, false, false),
  ('truro', 'Truro', 'South West', 'south-west', 'city', 50.2632, -5.051, false, false),
  ('cambridge', 'Cambridge', 'East of England', 'east-of-england', 'city', 52.2053, 0.1218, false, false),
  ('norwich', 'Norwich', 'East of England', 'east-of-england', 'city', 52.6309, 1.2974, false, false),
  ('ipswich', 'Ipswich', 'East of England', 'east-of-england', 'town', 52.0567, 1.1482, false, false),
  ('peterborough', 'Peterborough', 'East of England', 'east-of-england', 'city', 52.5695, -0.2405, false, false),
  ('luton', 'Luton', 'East of England', 'east-of-england', 'town', 51.8787, -0.42, false, false),
  ('chelmsford', 'Chelmsford', 'East of England', 'east-of-england', 'city', 51.7356, 0.4685, false, false),
  ('colchester', 'Colchester', 'East of England', 'east-of-england', 'city', 51.8959, 0.8919, false, false),
  ('southend', 'Southend-on-Sea', 'East of England', 'east-of-england', 'city', 51.5459, 0.7077, false, false),
  ('watford', 'Watford', 'East of England', 'east-of-england', 'town', 51.6565, -0.3903, false, false),
  ('aberdeen', 'Aberdeen', 'Scotland', 'scotland', 'city', 57.1497, -2.0943, false, false),
  ('dundee', 'Dundee', 'Scotland', 'scotland', 'city', 56.462, -2.9707, false, false),
  ('inverness', 'Inverness', 'Scotland', 'scotland', 'city', 57.4778, -4.2247, false, false),
  ('stirling', 'Stirling', 'Scotland', 'scotland', 'city', 56.1165, -3.9369, false, false),
  ('perth', 'Perth', 'Scotland', 'scotland', 'city', 56.395, -3.4308, false, false),
  ('cardiff', 'Cardiff', 'Wales', 'wales', 'city', 51.4816, -3.1791, false, false),
  ('swansea', 'Swansea', 'Wales', 'wales', 'city', 51.6214, -3.9436, false, false),
  ('newport', 'Newport', 'Wales', 'wales', 'city', 51.5842, -2.9977, false, false),
  ('wrexham', 'Wrexham', 'Wales', 'wales', 'city', 53.0466, -2.993, false, false),
  ('bangor', 'Bangor', 'Wales', 'wales', 'city', 53.2274, -4.1293, false, false),
  ('belfast', 'Belfast', 'Northern Ireland', 'northern-ireland', 'city', 54.5973, -5.9301, false, false),
  ('derry', 'Derry', 'Northern Ireland', 'northern-ireland', 'city', 54.9966, -7.3086, false, false),
  ('lisburn', 'Lisburn', 'Northern Ireland', 'northern-ireland', 'city', 54.5162, -6.058, false, false),
  ('newry', 'Newry', 'Northern Ireland', 'northern-ireland', 'city', 54.1751, -6.3402, false, false)
on conflict (id) do update set name = excluded.name, region = excluded.region, region_id = excluded.region_id,
  kind = excluded.kind, lat = excluded.lat, lng = excluded.lng, launch_night = excluded.launch_night,
  is_live = public.cities.is_live or excluded.is_live;

insert into public.boroughs (id, city_id, name, kind, tile_col, tile_row) values
  ('enfield', 'london', 'Enfield', 'borough', 4, 0),
  ('harrow', 'london', 'Harrow', 'borough', 2, 1),
  ('barnet', 'london', 'Barnet', 'borough', 3, 1),
  ('haringey', 'london', 'Haringey', 'borough', 4, 1),
  ('waltham-forest', 'london', 'Waltham Forest', 'borough', 5, 1),
  ('hillingdon', 'london', 'Hillingdon', 'borough', 0, 2),
  ('ealing', 'london', 'Ealing', 'borough', 1, 2),
  ('brent', 'london', 'Brent', 'borough', 2, 2),
  ('camden', 'london', 'Camden', 'borough', 3, 2),
  ('islington', 'london', 'Islington', 'borough', 4, 2),
  ('hackney', 'london', 'Hackney', 'borough', 5, 2),
  ('redbridge', 'london', 'Redbridge', 'borough', 6, 2),
  ('havering', 'london', 'Havering', 'borough', 7, 2),
  ('hounslow', 'london', 'Hounslow', 'borough', 0, 3),
  ('hammersmith-fulham', 'london', 'Hammersmith and Fulham', 'borough', 1, 3),
  ('kensington-chelsea', 'london', 'Kensington and Chelsea', 'borough', 2, 3),
  ('westminster', 'london', 'Westminster', 'borough', 3, 3),
  ('city-of-london', 'london', 'City of London', 'borough', 4, 3),
  ('tower-hamlets', 'london', 'Tower Hamlets', 'borough', 5, 3),
  ('newham', 'london', 'Newham', 'borough', 6, 3),
  ('barking-dagenham', 'london', 'Barking and Dagenham', 'borough', 7, 3),
  ('richmond', 'london', 'Richmond upon Thames', 'borough', 1, 4),
  ('wandsworth', 'london', 'Wandsworth', 'borough', 2, 4),
  ('lambeth', 'london', 'Lambeth', 'borough', 3, 4),
  ('southwark', 'london', 'Southwark', 'borough', 4, 4),
  ('lewisham', 'london', 'Lewisham', 'borough', 5, 4),
  ('greenwich', 'london', 'Greenwich', 'borough', 6, 4),
  ('bexley', 'london', 'Bexley', 'borough', 7, 4),
  ('kingston', 'london', 'Kingston upon Thames', 'borough', 2, 5),
  ('merton', 'london', 'Merton', 'borough', 3, 5),
  ('croydon', 'london', 'Croydon', 'borough', 4, 5),
  ('bromley', 'london', 'Bromley', 'borough', 5, 5),
  ('sutton', 'london', 'Sutton', 'borough', 3, 6),
  ('birmingham-sutton-coldfield', 'birmingham', 'Sutton Coldfield', 'area', 1, 0),
  ('birmingham-erdington', 'birmingham', 'Erdington', 'area', 3, 0),
  ('birmingham-handsworth', 'birmingham', 'Handsworth', 'area', 0, 1),
  ('birmingham-jewellery-quarter', 'birmingham', 'Jewellery Quarter', 'area', 2, 1),
  ('birmingham-aston', 'birmingham', 'Aston', 'area', 4, 1),
  ('birmingham-edgbaston', 'birmingham', 'Edgbaston', 'area', 1, 2),
  ('birmingham-digbeth', 'birmingham', 'Digbeth', 'area', 3, 2),
  ('birmingham-small-heath', 'birmingham', 'Small Heath', 'area', 0, 3),
  ('birmingham-harborne', 'birmingham', 'Harborne', 'area', 2, 3),
  ('birmingham-moseley', 'birmingham', 'Moseley', 'area', 4, 3),
  ('birmingham-selly-oak', 'birmingham', 'Selly Oak', 'area', 1, 4),
  ('birmingham-kings-heath', 'birmingham', 'Kings Heath', 'area', 3, 4),
  ('manchester-prestwich', 'manchester', 'Prestwich', 'area', 1, 0),
  ('manchester-cheetham-hill', 'manchester', 'Cheetham Hill', 'area', 3, 0),
  ('manchester-salford-quays', 'manchester', 'Salford Quays', 'area', 0, 1),
  ('manchester-ancoats', 'manchester', 'Ancoats', 'area', 2, 1),
  ('manchester-northern-quarter', 'manchester', 'Northern Quarter', 'area', 4, 1),
  ('manchester-castlefield', 'manchester', 'Castlefield', 'area', 1, 2),
  ('manchester-hulme', 'manchester', 'Hulme', 'area', 3, 2),
  ('manchester-moss-side', 'manchester', 'Moss Side', 'area', 0, 3),
  ('manchester-chorlton', 'manchester', 'Chorlton', 'area', 2, 3),
  ('manchester-fallowfield', 'manchester', 'Fallowfield', 'area', 4, 3),
  ('manchester-levenshulme', 'manchester', 'Levenshulme', 'area', 1, 4),
  ('manchester-didsbury', 'manchester', 'Didsbury', 'area', 3, 4),
  ('glasgow-maryhill', 'glasgow', 'Maryhill', 'area', 1, 0),
  ('glasgow-springburn', 'glasgow', 'Springburn', 'area', 3, 0),
  ('glasgow-partick', 'glasgow', 'Partick', 'area', 0, 1),
  ('glasgow-west-end', 'glasgow', 'West End', 'area', 2, 1),
  ('glasgow-finnieston', 'glasgow', 'Finnieston', 'area', 4, 1),
  ('glasgow-merchant-city', 'glasgow', 'Merchant City', 'area', 1, 2),
  ('glasgow-dennistoun', 'glasgow', 'Dennistoun', 'area', 3, 2),
  ('glasgow-govan', 'glasgow', 'Govan', 'area', 0, 3),
  ('glasgow-gorbals', 'glasgow', 'Gorbals', 'area', 2, 3),
  ('glasgow-pollokshields', 'glasgow', 'Pollokshields', 'area', 4, 3),
  ('glasgow-shawlands', 'glasgow', 'Shawlands', 'area', 1, 4),
  ('glasgow-cathcart', 'glasgow', 'Cathcart', 'area', 3, 4),
  ('leeds-horsforth', 'leeds', 'Horsforth', 'area', 1, 0),
  ('leeds-roundhay', 'leeds', 'Roundhay', 'area', 3, 0),
  ('leeds-headingley', 'leeds', 'Headingley', 'area', 0, 1),
  ('leeds-meanwood', 'leeds', 'Meanwood', 'area', 2, 1),
  ('leeds-chapel-allerton', 'leeds', 'Chapel Allerton', 'area', 4, 1),
  ('leeds-kirkstall', 'leeds', 'Kirkstall', 'area', 1, 2),
  ('leeds-hyde-park', 'leeds', 'Hyde Park', 'area', 3, 2),
  ('leeds-city-centre', 'leeds', 'City Centre', 'area', 0, 3),
  ('leeds-harehills', 'leeds', 'Harehills', 'area', 2, 3),
  ('leeds-armley', 'leeds', 'Armley', 'area', 4, 3),
  ('leeds-holbeck', 'leeds', 'Holbeck', 'area', 1, 4),
  ('leeds-hunslet', 'leeds', 'Hunslet', 'area', 3, 4),
  ('liverpool-crosby', 'liverpool', 'Crosby', 'area', 1, 0),
  ('liverpool-anfield', 'liverpool', 'Anfield', 'area', 3, 0),
  ('liverpool-everton', 'liverpool', 'Everton', 'area', 0, 1),
  ('liverpool-kensington', 'liverpool', 'Kensington', 'area', 2, 1),
  ('liverpool-georgian-quarter', 'liverpool', 'Georgian Quarter', 'area', 4, 1),
  ('liverpool-city-centre', 'liverpool', 'City Centre', 'area', 1, 2),
  ('liverpool-baltic-triangle', 'liverpool', 'Baltic Triangle', 'area', 3, 2),
  ('liverpool-wavertree', 'liverpool', 'Wavertree', 'area', 0, 3),
  ('liverpool-toxteth', 'liverpool', 'Toxteth', 'area', 2, 3),
  ('liverpool-aigburth', 'liverpool', 'Aigburth', 'area', 4, 3),
  ('liverpool-allerton', 'liverpool', 'Allerton', 'area', 1, 4),
  ('liverpool-woolton', 'liverpool', 'Woolton', 'area', 3, 4),
  ('bristol-henleaze', 'bristol', 'Henleaze', 'area', 1, 0),
  ('bristol-horfield', 'bristol', 'Horfield', 'area', 3, 0),
  ('bristol-redland', 'bristol', 'Redland', 'area', 0, 1),
  ('bristol-bishopston', 'bristol', 'Bishopston', 'area', 2, 1),
  ('bristol-clifton', 'bristol', 'Clifton', 'area', 4, 1),
  ('bristol-stokes-croft', 'bristol', 'Stokes Croft', 'area', 1, 2),
  ('bristol-st-pauls', 'bristol', 'St Pauls', 'area', 3, 2),
  ('bristol-easton', 'bristol', 'Easton', 'area', 0, 3),
  ('bristol-harbourside', 'bristol', 'Harbourside', 'area', 2, 3),
  ('bristol-southville', 'bristol', 'Southville', 'area', 4, 3),
  ('bristol-bedminster', 'bristol', 'Bedminster', 'area', 1, 4),
  ('bristol-totterdown', 'bristol', 'Totterdown', 'area', 3, 4),
  ('sheffield-hillsborough', 'sheffield', 'Hillsborough', 'area', 1, 0),
  ('sheffield-walkley', 'sheffield', 'Walkley', 'area', 3, 0),
  ('sheffield-crookes', 'sheffield', 'Crookes', 'area', 0, 1),
  ('sheffield-kelham-island', 'sheffield', 'Kelham Island', 'area', 2, 1),
  ('sheffield-broomhill', 'sheffield', 'Broomhill', 'area', 4, 1),
  ('sheffield-city-centre', 'sheffield', 'City Centre', 'area', 1, 2),
  ('sheffield-darnall', 'sheffield', 'Darnall', 'area', 3, 2),
  ('sheffield-sharrow', 'sheffield', 'Sharrow', 'area', 0, 3),
  ('sheffield-ecclesall', 'sheffield', 'Ecclesall', 'area', 2, 3),
  ('sheffield-nether-edge', 'sheffield', 'Nether Edge', 'area', 4, 3),
  ('sheffield-heeley', 'sheffield', 'Heeley', 'area', 1, 4),
  ('sheffield-fulwood', 'sheffield', 'Fulwood', 'area', 3, 4),
  ('edinburgh-cramond', 'edinburgh', 'Cramond', 'area', 1, 0),
  ('edinburgh-leith', 'edinburgh', 'Leith', 'area', 3, 0),
  ('edinburgh-stockbridge', 'edinburgh', 'Stockbridge', 'area', 0, 1),
  ('edinburgh-new-town', 'edinburgh', 'New Town', 'area', 2, 1),
  ('edinburgh-portobello', 'edinburgh', 'Portobello', 'area', 4, 1),
  ('edinburgh-corstorphine', 'edinburgh', 'Corstorphine', 'area', 1, 2),
  ('edinburgh-old-town', 'edinburgh', 'Old Town', 'area', 3, 2),
  ('edinburgh-gorgie', 'edinburgh', 'Gorgie', 'area', 0, 3),
  ('edinburgh-marchmont', 'edinburgh', 'Marchmont', 'area', 2, 3),
  ('edinburgh-bruntsfield', 'edinburgh', 'Bruntsfield', 'area', 4, 3),
  ('edinburgh-newington', 'edinburgh', 'Newington', 'area', 1, 4),
  ('edinburgh-morningside', 'edinburgh', 'Morningside', 'area', 3, 4),
  ('newcastle-gosforth', 'newcastle', 'Gosforth', 'area', 1, 0),
  ('newcastle-kenton', 'newcastle', 'Kenton', 'area', 3, 0),
  ('newcastle-jesmond', 'newcastle', 'Jesmond', 'area', 0, 1),
  ('newcastle-heaton', 'newcastle', 'Heaton', 'area', 2, 1),
  ('newcastle-fenham', 'newcastle', 'Fenham', 'area', 4, 1),
  ('newcastle-sandyford', 'newcastle', 'Sandyford', 'area', 1, 2),
  ('newcastle-ouseburn', 'newcastle', 'Ouseburn', 'area', 3, 2),
  ('newcastle-byker', 'newcastle', 'Byker', 'area', 0, 3),
  ('newcastle-benwell', 'newcastle', 'Benwell', 'area', 2, 3),
  ('newcastle-elswick', 'newcastle', 'Elswick', 'area', 4, 3),
  ('newcastle-quayside', 'newcastle', 'Quayside', 'area', 1, 4),
  ('newcastle-walker', 'newcastle', 'Walker', 'area', 3, 4)
on conflict (id) do update set city_id = excluded.city_id, name = excluded.name, kind = excluded.kind,
  tile_col = excluded.tile_col, tile_row = excluded.tile_row;


-- Now every UK town is a city row, a club claim from a town takes the launch city
-- of its region first (Harrogate lands in Leeds, not Bradford). As in club_links
-- otherwise.
create or replace function public.review_club_claim(p_claim bigint, p_approve boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  c club_claims;
  cid uuid;
  p profiles;
  city text;
begin
  if not public.is_staff('moderator') then raise exception 'NOT_ALLOWED'; end if;
  select * into c from club_claims where id = p_claim for update;
  if c.id is null or c.status <> 'pending' then raise exception 'NOT_FOUND'; end if;
  if not p_approve then
    update club_claims set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now() where id = p_claim;
    if c.user_id is not null then
      perform public.notify(c.user_id, 'club', 'We couldn''t verify ' || c.club_name,
        'Reply to clubs@weouthere.app and we''ll take another look.', '/clubs/claim');
    end if;
    return null;
  end if;
  if c.user_id is null then raise exception 'NO_CLAIMANT'; end if;
  select * into p from profiles where id = c.user_id;
  cid := c.club_id;
  if cid is null then
    city := coalesce(c.city_id, (select city_id from boroughs where id = c.borough_id), p.city_id,
                     (select id from cities where region = c.region order by is_live desc, launch_night desc, name limit 1), 'london');
    insert into clubs (name, slug, city_id, borough_id, meeting_place, usual_times, founded_year,
                       instagram, strava, created_by, status, verified_at)
    values (c.club_name,
            public.suggest_club_slug(c.club_name, city),
            city, coalesce(c.borough_id, p.borough_id), c.meeting_place, c.usual_times, c.founded_year,
            case when c.proof_method = 'instagram' then c.proof_handle end,
            case when c.proof_method = 'strava' then c.proof_handle end,
            c.user_id, 'verified', now())
    returning id into cid;
  else
    update clubs set status = 'verified', verified_at = coalesce(verified_at, now()),
      meeting_place = coalesce(c.meeting_place, meeting_place), usual_times = coalesce(c.usual_times, usual_times),
      founded_year = coalesce(c.founded_year, founded_year)
    where id = cid;
  end if;
  insert into club_members (club_id, user_id, role) values (cid, c.user_id, 'captain')
  on conflict (club_id, user_id) do update set role = 'captain';
  update profiles set home_club_id = coalesce(home_club_id, cid) where id = c.user_id;
  insert into subscriptions (user_id, tier, source, status, provider_ref, referral_club_id, current_period_end)
  values (c.user_id, 'pro', 'web', 'active', 'organiser:' || cid || ':' || c.user_id, cid, now() + interval '1 year')
  on conflict (provider_ref) do nothing;
  update club_claims set status = 'verified', club_id = cid, reviewed_by = auth.uid(), reviewed_at = now() where id = p_claim;
  perform public.notify(c.user_id, 'club', c.club_name || ' is official',
    'Your crew is live, your runs can take check-ins, and you have a year of Pro on us.', '/clubs/verified/' || cid);
  return cid;
end $$;

-- ── Which side a member plays for ────────────────────────────────────────────

-- Active means 3,000+ steps on three of the last seven days (London days),
-- with flagged days left out. Trusted members (verified or established) can
-- be called up to a squad.
create or replace function public.active_walkers()
returns table (user_id uuid, city_id text, region_id text, side_kind text, side_id text, trusted boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.city_id, c.region_id,
         case when c.is_live then 'city' else 'region' end,
         case when c.is_live then c.id else c.region_id end,
         p.trust in ('verified', 'established')
  from profiles p
  join cities c on c.id = p.city_id
  where (select count(*) from daily_steps d
         where d.user_id = p.id and d.day > public.london_today() - 7
           and d.steps >= 3000 and not d.flagged) >= 3
$$;
revoke execute on function public.active_walkers() from public, anon, authenticated;

-- The rule: a member plays for their city once it is live (100 active), and
-- for their region until then.
create or replace function public.side_of(p_user uuid)
returns table (kind text, id text, name text)
language sql stable security definer set search_path = public as $$
  select case when c.is_live then 'city' else 'region' end,
         case when c.is_live then c.id else c.region_id end,
         case when c.is_live then c.name else r.name end
  from profiles p
  join cities c on c.id = p.city_id
  left join regions r on r.id = c.region_id
  where p.id = p_user
$$;
revoke execute on function public.side_of(uuid) from public, anon, authenticated;

create or replace function public.play_side()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'kind', s.kind, 'id', s.id, 'name', s.name,
    'city_id', c.id, 'city_name', c.name, 'city_kind', c.kind, 'is_live', c.is_live,
    'launch_night', c.launch_night, 'region_id', r.id, 'region_name', r.name,
    'city_active', (select count(*) from public.active_walkers() w where w.city_id = c.id),
    'needed', 100)
  from profiles p
  join cities c on c.id = p.city_id
  left join regions r on r.id = c.region_id
  cross join lateral public.side_of(p.id) s
  where p.id = auth.uid()
$$;
revoke execute on function public.play_side() from public, anon;
grant execute on function public.play_side() to authenticated;

-- Scheduler (daily): a place goes live the day it reaches 100 active members,
-- and stays live.
create or replace function public.refresh_live_cities()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select c.id, c.name from cities c
    where not c.is_live
      and (select count(*) from public.active_walkers() w where w.city_id = c.id) >= 100
  loop
    update cities set is_live = true where id = r.id;
    insert into notifications (user_id, kind, title, body, link)
    select p.id, 'league', r.name || ' is live', r.name || ' has 100 active walkers and now plays as itself in the City League.', '/cities'
    from profiles p where p.city_id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.refresh_live_cities() from public, anon, authenticated;

-- ── The City League ──────────────────────────────────────────────────────────

-- Every side and the division its active walkers fill: Premier (squads of
-- 500), Championship (250), League One (100); under 100 is Rising. Score is
-- the side's average counted steps a day this week.
create or replace function public.league_sides()
returns table (side_kind text, side_id text, name text, region_id text, active int, score int, division text, squad int)
language sql stable security definer set search_path = public as $$
  with w as (select * from public.active_walkers()),
  wk as (
    select d.user_id,
           sum(d.counted)::numeric / ((public.london_today() - date_trunc('week', public.london_today())::date) + 1) as per_day
    from daily_steps d
    where d.day >= date_trunc('week', public.london_today())::date and not d.flagged
    group by d.user_id),
  sides as (
    select 'city'::text as side_kind, c.id as side_id, c.name, c.region_id from cities c where c.is_live
    union all
    select 'region', r.id, r.name, r.id from regions r),
  agg as (
    select s.side_kind, s.side_id, s.name, s.region_id,
           count(w.user_id)::int as active,
           coalesce(round(avg(coalesce(wk.per_day, 0))), 0)::int as score
    from sides s
    left join w on w.side_kind = s.side_kind and w.side_id = s.side_id
    left join wk on wk.user_id = w.user_id
    group by s.side_kind, s.side_id, s.name, s.region_id)
  select side_kind, side_id, name, region_id, active, score,
         case when active >= 500 then 'premier' when active >= 250 then 'championship'
              when active >= 100 then 'league-one' else 'rising' end,
         case when active >= 500 then 500 when active >= 250 then 250 when active >= 100 then 100 else 0 end
  from agg
$$;
revoke execute on function public.league_sides() from public, anon, authenticated;

-- The table screen in one call: the season and week, every side in a
-- division, the places still rising (nearest to 100 first, plus your own) and
-- the side you play for.
create or replace function public.city_league()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_city text;
  mine record;
  result json;
begin
  select city_id into my_city from profiles where id = me;
  select * into mine from public.side_of(me);
  with sides as (select * from public.league_sides()),
  counts as (select w.city_id, count(*)::int as active from public.active_walkers() w group by w.city_id),
  rising as (
    select c.id, c.name, c.kind, c.region_id, r.name as region, coalesce(k.active, 0) as active,
           c.id = my_city as mine
    from cities c
    left join regions r on r.id = c.region_id
    left join counts k on k.city_id = c.id
    where not c.is_live
    order by (c.id = my_city) desc, coalesce(k.active, 0) desc, c.launch_night desc, c.name
    limit 8)
  select json_build_object(
    'season', (select row_to_json(x) from (
                 select s.number, s.name,
                        greatest(1, least(6, (public.london_today() - s.starts_on) / 7 + 1)) as week, 6 as weeks
                 from seasons s where s.kind = 'city' and public.london_today() between s.starts_on and s.ends_on
                 order by s.number desc limit 1) x),
    'side', json_build_object('kind', mine.kind, 'id', mine.id, 'name', mine.name),
    'sides', coalesce((select json_agg(json_build_object(
               'kind', s.side_kind, 'id', s.side_id, 'name', s.name, 'active', s.active, 'score', s.score,
               'division', s.division, 'squad', s.squad,
               'mine', s.side_kind = mine.kind and s.side_id = mine.id) order by s.score desc, s.active desc)
               from sides s where s.division <> 'rising'), '[]'::json),
    'rising', coalesce((select json_agg(row_to_json(r)) from rising r), '[]'::json))
  into result;
  return result;
end $$;
revoke execute on function public.city_league() from public, anon;
grant execute on function public.city_league() to authenticated;

-- Regions can enter the league too, so an entry is a city, a region or a club.
alter table public.league_entries add column if not exists region_id text references public.regions(id);
do $$
declare c text;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.league_entries'::regclass and contype = 'c'
             and pg_get_constraintdef(oid) like '%city_id IS NULL%'
  loop
    execute format('alter table public.league_entries drop constraint %I', c);
  end loop;
end $$;
alter table public.league_entries
  add constraint league_entries_one_side check (num_nonnulls(city_id, club_id, region_id) = 1);

-- Call-ups: your number in the squad and whether you said you're in. Passing
-- takes you out of the squad and draws a reserve into your number.
alter table public.squad_members
  add column if not exists squad_number integer,
  add column if not exists answer text check (answer in ('in')),
  add column if not exists answered_at timestamptz;

create table if not exists public.call_up_passes (
  fixture_id  uuid not null references public.fixtures(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  reserve_id  uuid references public.profiles(id) on delete set null,
  passed_at   timestamptz not null default now(),
  primary key (fixture_id, user_id)
);
alter table public.call_up_passes enable row level security;
create policy "my passes" on public.call_up_passes for select using (user_id = auth.uid());

-- Trusted active walkers who play for a side.
create or replace function public.side_pool(p_kind text, p_id text)
returns setof uuid language sql stable security definer set search_path = public as $$
  select w.user_id from public.active_walkers() w
  where w.side_kind = p_kind and w.side_id = p_id and w.trusted
$$;
revoke execute on function public.side_pool(text, text) from public, anon, authenticated;

create or replace function public.entry_side(e public.league_entries)
returns table (kind text, id text, name text)
language sql stable security definer set search_path = public as $$
  select case when e.city_id is not null then 'city' when e.region_id is not null then 'region' else 'club' end,
         coalesce(e.city_id, e.region_id, e.club_id::text),
         coalesce((select name from cities where id = e.city_id),
                  (select name from regions where id = e.region_id),
                  (select name from clubs where id = e.club_id))
$$;
revoke execute on function public.entry_side(public.league_entries) from public, anon, authenticated;

-- The Friday draw for a city or region fixture: equal squads, numbered, from
-- a stored seed so the draw can be replayed.
create or replace function public.draw_side_fixture(p_fixture uuid, p_seed text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  f fixtures;
  h league_entries;
  a league_entries;
  hs record;
  aws record;
  size_ int;
  seed text := coalesce(p_seed, encode(extensions.gen_random_bytes(8), 'hex'));
begin
  select * into f from fixtures where id = p_fixture for update;
  if f.id is null then raise exception 'NOT_FOUND'; end if;
  select * into h from league_entries where id = f.home_id;
  select * into a from league_entries where id = f.away_id;
  select * into hs from public.entry_side(h);
  select * into aws from public.entry_side(a);
  if hs.kind = 'club' or aws.kind = 'club' then raise exception 'NOT_ALLOWED'; end if;
  select least(d.squad_size,
               (select count(*) from public.side_pool(hs.kind, hs.id)),
               (select count(*) from public.side_pool(aws.kind, aws.id)))
    into size_ from divisions d where d.id = f.division_id;

  delete from squad_members where fixture_id = p_fixture;
  delete from call_up_passes where fixture_id = p_fixture;
  insert into squad_members (fixture_id, entry_id, user_id, squad_number)
  select p_fixture, h.id, x.uid, row_number() over (order by md5(seed || x.uid::text))
  from (select uid from public.side_pool(hs.kind, hs.id) as t(uid) order by md5(seed || uid::text) limit size_) x;
  insert into squad_members (fixture_id, entry_id, user_id, squad_number)
  select p_fixture, a.id, x.uid, row_number() over (order by md5(seed || x.uid::text))
  from (select uid from public.side_pool(aws.kind, aws.id) as t(uid)
        where uid not in (select user_id from squad_members where fixture_id = p_fixture)
        order by md5(seed || uid::text) limit size_) x;

  update fixtures set draw_seed = seed, drawn_at = now() where id = p_fixture;
  insert into notifications (user_id, kind, title, body, link)
  select s.user_id, 'league', 'You''ve been called up',
         '#' || s.squad_number || ' of ' || size_ || ' for ' || hs.name || ' v ' || aws.name || '.',
         '/cities/called-up?fixture=' || p_fixture
  from squad_members s where s.fixture_id = p_fixture;
  return size_;
end $$;
revoke execute on function public.draw_side_fixture(uuid, text) from public, anon, authenticated;

-- Scheduler (Friday): the week's city fixtures. Makes the season and its
-- divisions when needed, enters every side that fills a division, pairs them
-- by this week's score (1 v 2, 3 v 4 ...) for Saturday and draws the squads.
-- Safe to run twice: a week that has fixtures is left alone.
create or replace function public.build_city_week(p_on date default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  day_ date := coalesce(p_on, date_trunc('week', public.london_today())::date + 5);
  s seasons;
  d divisions;
  wk int;
  ids uuid[];
  side record;
  e uuid;
  fx uuid;
  i int;
  n int := 0;
begin
  select * into s from seasons where kind = 'city' and day_ between starts_on and ends_on order by number desc limit 1;
  if s.id is null then
    insert into seasons (kind, number, name, starts_on, ends_on)
    values ('city', coalesce((select max(number) from seasons where kind = 'city'), 0) + 1,
            'Season ' || (coalesce((select max(number) from seasons where kind = 'city'), 0) + 1),
            date_trunc('week', day_)::date, date_trunc('week', day_)::date + 41)
    returning * into s;
  end if;
  if not exists (select 1 from divisions where season_id = s.id) then
    insert into divisions (season_id, name, squad_size, sort) values
      (s.id, 'Premier', 500, 0), (s.id, 'Championship', 250, 1), (s.id, 'League One', 100, 2);
  end if;
  wk := greatest(1, least(6, (day_ - s.starts_on) / 7 + 1));
  if exists (select 1 from fixtures f join divisions dv on dv.id = f.division_id
             where dv.season_id = s.id and f.week = wk) then
    return 0;
  end if;

  for d in select * from divisions where season_id = s.id order by sort loop
    ids := '{}';
    for side in
      select * from public.league_sides()
      where squad = d.squad_size
      order by score desc, active desc
    loop
      select le.id into e from league_entries le
      where le.division_id = d.id
        and ((side.side_kind = 'city' and le.city_id = side.side_id)
          or (side.side_kind = 'region' and le.region_id = side.side_id));
      if e is null then
        insert into league_entries (division_id, city_id, region_id)
        values (d.id, case when side.side_kind = 'city' then side.side_id end,
                      case when side.side_kind = 'region' then side.side_id end)
        returning id into e;
      end if;
      ids := ids || e;
      e := null;
    end loop;
    i := 1;
    while i + 1 <= coalesce(array_length(ids, 1), 0) loop
      insert into fixtures (division_id, week, home_id, away_id, starts_on, ends_on)
      values (d.id, wk, ids[i], ids[i + 1], day_, day_)
      returning id into fx;
      perform public.draw_side_fixture(fx);
      n := n + 1;
      i := i + 2;
    end loop;
  end loop;
  return n;
end $$;
revoke execute on function public.build_city_week(date) from public, anon, authenticated;

-- One side of a city fixture as the screen shows it. The score is the
-- league's own (fixture_side_score): squad average, plus up to 10% for the
-- share of the squad at a club run on the day.
create or replace function public.city_side_view(p_fixture uuid, p_entry uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  f fixtures;
  e league_entries;
  side record;
  size_ int;
  avg_ numeric;
  turnout numeric;
begin
  select * into f from fixtures where id = p_fixture;
  select * into e from league_entries where id = p_entry;
  select * into side from public.entry_side(e);
  select count(*) into size_ from squad_members where fixture_id = p_fixture and entry_id = p_entry;
  select avg(t.c) into avg_ from (
    select coalesce(sum(d.counted), 0) as c from squad_members s
    left join daily_steps d on d.user_id = s.user_id and d.day between f.starts_on and f.ends_on and not d.flagged
    where s.fixture_id = p_fixture and s.entry_id = p_entry group by s.user_id) t;
  select count(distinct s.user_id)::numeric / nullif(size_, 0) into turnout
  from squad_members s
  join event_rsvps r on r.user_id = s.user_id and r.status = 'checked_in'
  join events ev on ev.id = r.event_id and ev.kind = 'club_run'
    and (ev.starts_at at time zone 'Europe/London')::date between f.starts_on and f.ends_on
  where s.fixture_id = p_fixture and s.entry_id = p_entry;
  return json_build_object(
    'entry', e.id, 'kind', side.kind, 'id', side.id, 'name', side.name,
    'score', round(coalesce(case when e.id = f.home_id then f.home_score else f.away_score end,
                            public.fixture_side_score(p_fixture, p_entry))),
    'squad_avg', round(coalesce(avg_, 0)),
    'turnout', round(coalesce(turnout, 0) * 100),
    'squad', size_,
    'active', (select count(*) from public.active_walkers() w where w.side_kind = side.kind and w.side_id = side.id));
end $$;
revoke execute on function public.city_side_view(uuid, uuid) from public, anon, authenticated;

-- City v city: one fixture, or by default your side's latest.
create or replace function public.city_fixture_view(p_fixture uuid default null)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  mine record;
  f fixtures;
  sm squad_members;
  my_steps int;
  other json;
  home json;
  away json;
begin
  if p_fixture is not null then
    select * into f from fixtures where id = p_fixture;
  else
    select * into mine from public.side_of(me);
    select fx.* into f from fixtures fx
    join league_entries le on le.id in (fx.home_id, fx.away_id)
    where (mine.kind = 'city' and le.city_id = mine.id) or (mine.kind = 'region' and le.region_id = mine.id)
       or exists (select 1 from squad_members s where s.fixture_id = fx.id and s.user_id = me)
    order by fx.starts_on desc limit 1;
  end if;
  if f.id is null then return null; end if;
  if exists (select 1 from league_entries le where le.id in (f.home_id, f.away_id) and le.club_id is not null) then
    raise exception 'NOT_FOUND';
  end if;
  home := public.city_side_view(f.id, f.home_id);
  away := public.city_side_view(f.id, f.away_id);
  select * into sm from squad_members where fixture_id = f.id and user_id = me;
  if sm.user_id is not null then
    select coalesce(sum(counted), 0) into my_steps from daily_steps
    where user_id = me and day between f.starts_on and f.ends_on and not flagged;
    other := case when sm.entry_id = f.home_id then away else home end;
  end if;
  return json_build_object(
    'id', f.id, 'week', f.week, 'starts_on', f.starts_on, 'ends_on', f.ends_on,
    'division', (select name from divisions where id = f.division_id),
    'squad_size', (select squad_size from divisions where id = f.division_id),
    'status', case when f.revealed_at is not null then 'done' when public.london_today() < f.starts_on then 'upcoming' else 'live' end,
    'home', home, 'away', away,
    'mine', case when sm.user_id is null then null else json_build_object(
      'side', case when sm.entry_id = f.home_id then 'home' else 'away' end,
      'number', sm.squad_number, 'answer', sm.answer, 'steps', my_steps,
      'to_beat', greatest(0, (other->>'squad_avg')::int - my_steps)) end);
end $$;
revoke execute on function public.city_fixture_view(uuid) from public, anon;
grant execute on function public.city_fixture_view(uuid) to authenticated;

-- "You've been called up": your next fixture where you are in the squad.
create or replace function public.my_call_up()
returns json language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  sm squad_members;
  f fixtures;
  mine record;
  them record;
  e league_entries;
  o league_entries;
begin
  select s.* into sm from squad_members s join fixtures fx on fx.id = s.fixture_id
  where s.user_id = me and fx.ends_on >= public.london_today() and fx.revealed_at is null
  order by fx.starts_on limit 1;
  if sm.user_id is null then return null; end if;
  select * into f from fixtures where id = sm.fixture_id;
  select * into e from league_entries where id = sm.entry_id;
  select * into o from league_entries where id = case when f.home_id = e.id then f.away_id else f.home_id end;
  select * into mine from public.entry_side(e);
  select * into them from public.entry_side(o);
  return json_build_object(
    'fixture', f.id, 'starts_on', f.starts_on, 'kick_off', '06:00',
    'division', (select name from divisions where id = f.division_id),
    'side', mine.name, 'side_kind', mine.kind, 'opponent', them.name,
    'home', (select name from public.entry_side((select le from league_entries le where le.id = f.home_id))),
    'away', (select name from public.entry_side((select le from league_entries le where le.id = f.away_id))),
    'number', sm.squad_number, 'answer', sm.answer,
    'squad', (select count(*) from squad_members where fixture_id = f.id and entry_id = e.id),
    'pool', (select count(*) from public.active_walkers() w where w.side_kind = mine.kind and w.side_id = mine.id),
    'prize_out', 250,
    'open', public.london_today() < f.starts_on
            or (public.london_today() = f.starts_on and (now() at time zone 'Europe/London')::time < '06:00'));
end $$;
revoke execute on function public.my_call_up() from public, anon;
grant execute on function public.my_call_up() to authenticated;

-- I'm in, or pass to a reserve. Passing is fine: a reserve is drawn into
-- your number and told.
create or replace function public.respond_call_up(p_fixture uuid, p_in boolean)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  sm squad_members;
  f fixtures;
  e league_entries;
  side record;
  reserve uuid;
begin
  select * into sm from squad_members where fixture_id = p_fixture and user_id = me for update;
  if sm.user_id is null then raise exception 'NOT_IN_SQUAD'; end if;
  select * into f from fixtures where id = p_fixture;
  if public.london_today() > f.starts_on
     or (public.london_today() = f.starts_on and (now() at time zone 'Europe/London')::time >= '06:00') then
    raise exception 'KICKED_OFF';
  end if;
  if p_in then
    update squad_members set answer = 'in', answered_at = now() where fixture_id = p_fixture and user_id = me;
    return json_build_object('status', 'in', 'number', sm.squad_number);
  end if;

  select * into e from league_entries where id = sm.entry_id;
  select * into side from public.entry_side(e);
  select t.uid into reserve from public.side_pool(side.kind, side.id) as t(uid)
  where t.uid <> me
    and t.uid not in (select user_id from squad_members where fixture_id = p_fixture)
    and t.uid not in (select user_id from call_up_passes where fixture_id = p_fixture)
  order by random() limit 1;
  delete from squad_members where fixture_id = p_fixture and user_id = me;
  insert into call_up_passes (fixture_id, user_id, reserve_id) values (p_fixture, me, reserve)
  on conflict (fixture_id, user_id) do update set reserve_id = excluded.reserve_id, passed_at = now();
  if reserve is not null then
    insert into squad_members (fixture_id, entry_id, user_id, squad_number)
    values (p_fixture, sm.entry_id, reserve, sm.squad_number);
    perform public.notify(reserve, 'league', 'You''re in as a reserve',
      '#' || sm.squad_number || ' for ' || side.name || ' this Saturday.', '/cities/called-up?fixture=' || p_fixture);
  end if;
  return json_build_object('status', 'passed', 'reserve', reserve is not null);
end $$;
revoke execute on function public.respond_call_up(uuid, boolean) from public, anon;
grant execute on function public.respond_call_up(uuid, boolean) to authenticated;

-- When a city fixture is revealed, everyone in the winning squad gets 250 OUT.
create or replace function public.pay_city_fixture()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  win uuid;
begin
  if old.revealed_at is not null or new.revealed_at is null then return null; end if;
  if exists (select 1 from league_entries where id in (new.home_id, new.away_id) and club_id is not null) then
    return null;
  end if;
  if new.home_score > new.away_score then win := new.home_id;
  elsif new.away_score > new.home_score then win := new.away_id;
  else return null;
  end if;
  perform public.award(s.user_id, 'city-win:' || new.id || ':' || s.user_id, 'City fixture won', 'league',
                       0, 250, 'fixture', new.id::text)
  from squad_members s where s.fixture_id = new.id and s.entry_id = win;
  return null;
end $$;
revoke execute on function public.pay_city_fixture() from public, anon, authenticated;
create trigger fixtures_pay_city after update of revealed_at on public.fixtures
  for each row execute function public.pay_city_fixture();

-- ── Rising places, the Founding 500 and call-up weekend ──────────────────────

create table if not exists public.city_founders (
  city_id     text not null references public.cities(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  number      integer not null check (number between 1 and 500),
  created_at  timestamptz not null default now(),
  primary key (city_id, user_id),
  unique (city_id, number)
);
alter table public.city_founders enable row level security;
create policy "founders are public" on public.city_founders for select using (true);

create table if not exists public.city_invites (
  code        text primary key,
  user_id     uuid not null unique references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create table if not exists public.city_invite_redemptions (
  invitee_id  uuid primary key references public.profiles(id) on delete cascade,
  inviter_id  uuid not null references public.profiles(id) on delete cascade,
  code        text not null,
  city_id     text references public.cities(id),
  created_at  timestamptz not null default now()
);
alter table public.city_invites enable row level security;
alter table public.city_invite_redemptions enable row level security;
create policy "my invite code" on public.city_invites for select using (user_id = auth.uid());
create policy "invites I made or used" on public.city_invite_redemptions for select
  using (inviter_id = auth.uid() or invitee_id = auth.uid());

create or replace function public.rising_view(p_city text default null)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_city text;
  c cities;
  r regions;
begin
  select city_id into my_city from profiles where id = me;
  select * into c from cities where id = coalesce(p_city, my_city);
  if c.id is null then raise exception 'NOT_FOUND'; end if;
  select * into r from regions where id = c.region_id;
  return json_build_object(
    'id', c.id, 'name', c.name, 'kind', c.kind, 'region_id', r.id, 'region', r.name,
    'is_live', c.is_live, 'launch_night', c.launch_night, 'is_home', c.id = my_city,
    'active', (select count(*) from public.active_walkers() w where w.city_id = c.id),
    'needed', 100,
    'medal', (select number from city_founders where city_id = c.id and user_id = me),
    'medals_claimed', (select count(*) from city_founders where city_id = c.id),
    'medals_total', 500,
    'invite_code', (select code from city_invites where user_id = me),
    'invites_redeemed', (select count(*) from city_invite_redemptions where inviter_id = me),
    'invite_out', 1000,
    'call_up_weekend', extract(isodow from now() at time zone 'Europe/London') >= 5);
end $$;
revoke execute on function public.rising_view(text) from public, anon;
grant execute on function public.rising_view(text) to authenticated;

-- A numbered medal for the first 500 in a place that is not live yet. Your
-- own place only, once.
create or replace function public.claim_founding_medal(p_city text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  cid text;
  live boolean;
  n int;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  select city_id into cid from profiles where id = me;
  if p_city is not null and p_city <> cid then raise exception 'NOT_ALLOWED'; end if;
  select number into n from city_founders where city_id = cid and user_id = me;
  if n is not null then return n; end if;
  select is_live into live from cities where id = cid for update;
  if live then raise exception 'ALREADY_LIVE'; end if;
  select coalesce(max(number), 0) + 1 into n from city_founders where city_id = cid;
  if n > 500 then raise exception 'MEDALS_GONE'; end if;
  insert into city_founders (city_id, user_id, number) values (cid, me, n);
  return n;
end $$;
revoke execute on function public.claim_founding_medal(text) from public, anon;
grant execute on function public.claim_founding_medal(text) to authenticated;

create or replace function public.my_city_invite()
returns text language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  c text;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  select code into c from city_invites where user_id = me;
  if c is not null then return c; end if;
  loop
    c := upper(substr(encode(extensions.gen_random_bytes(5), 'hex'), 1, 8));
    begin
      insert into city_invites (code, user_id) values (c, me);
      return c;
    exception when unique_violation then
      if exists (select 1 from city_invites where user_id = me) then
        return (select code from city_invites where user_id = me);
      end if;
    end;
  end loop;
end $$;
revoke execute on function public.my_city_invite() from public, anon;
grant execute on function public.my_city_invite() to authenticated;

-- Call-up weekend: bring a friend into a place that is still rising and you
-- both get 1,000 OUT. New members only (14 days), once each.
create or replace function public.redeem_city_invite(p_code text)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  inv city_invites;
  joined timestamptz;
  cid text;
  live boolean;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  select * into inv from city_invites where code = upper(trim(p_code));
  if inv.code is null then raise exception 'CODE_INVALID'; end if;
  if inv.user_id = me then raise exception 'NOT_ALLOWED'; end if;
  if exists (select 1 from city_invite_redemptions where invitee_id = me) then raise exception 'ALREADY_USED'; end if;
  select created_at, city_id into joined, cid from profiles where id = me;
  if joined < now() - interval '14 days' then raise exception 'NEW_MEMBERS_ONLY'; end if;
  select is_live into live from cities where id = (select city_id from profiles where id = inv.user_id);
  if live then raise exception 'ALREADY_LIVE'; end if;
  insert into city_invite_redemptions (invitee_id, inviter_id, code, city_id) values (me, inv.user_id, inv.code, cid);
  perform public.award(me, 'city-invite:' || me, 'Call-up weekend', 'invite', 0, 1000, 'invite', inv.code);
  perform public.award(inv.user_id, 'city-invite:' || me || ':by', 'Call-up weekend', 'invite', 0, 1000, 'invite', inv.code);
  perform public.notify(inv.user_id, 'league', 'Your friend is in', '1,000 OUT each for bringing them out.', '/cities/rising', me);
  return json_build_object('out', 1000);
end $$;
revoke execute on function public.redeem_city_invite(text) from public, anon;
grant execute on function public.redeem_city_invite(text) to authenticated;

-- ── Areas, crews and friends on the map ──────────────────────────────────────

-- This week's counted steps for every area of a city (London's boroughs, or
-- another city's areas), ranked. Each person counts for the area on their
-- profile. Defaults to your own city and this week.
create or replace function public.area_table(p_city text default null, p_week date default null)
returns table (area_id text, name text, kind text, tile_col smallint, tile_row smallint,
               counted bigint, people int, rank int, mine boolean)
language sql stable security definer set search_path = public as $$
  with w as (select coalesce(p_week, date_trunc('week', public.london_today())::date) as s),
  c as (select coalesce(p_city, (select city_id from profiles where id = auth.uid())) as id),
  t as (
    select p.borough_id, sum(d.counted)::bigint as counted, count(distinct d.user_id)::int as people
    from daily_steps d
    join profiles p on p.id = d.user_id
    where p.city_id = (select id from c) and p.borough_id is not null and not d.flagged
      and d.day between (select s from w) and (select s from w) + 6
    group by p.borough_id)
  select b.id, b.name, b.kind, b.tile_col, b.tile_row,
         coalesce(t.counted, 0), coalesce(t.people, 0),
         (rank() over (order by coalesce(t.counted, 0) desc))::int,
         b.id is not distinct from (select borough_id from profiles where id = auth.uid())
  from boroughs b
  left join t on t.borough_id = b.id
  where b.city_id = (select id from c)
  order by coalesce(t.counted, 0) desc, b.name
$$;
revoke execute on function public.area_table(text, date) from public, anon;
grant execute on function public.area_table(text, date) to authenticated;

-- Clubs in a city by their members' counted steps this week.
create or replace function public.club_week_table(p_city text default null)
returns table (club_id uuid, name text, logo_path text, borough_id text, members int, counted bigint, mine boolean)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.logo_path, c.borough_id, c.member_count,
         coalesce((select sum(d.counted) from club_members m
                   join daily_steps d on d.user_id = m.user_id
                   where m.club_id = c.id and not d.flagged
                     and d.day >= date_trunc('week', public.london_today())::date), 0)::bigint,
         exists (select 1 from club_members m where m.club_id = c.id and m.user_id = auth.uid())
  from clubs c
  where c.city_id = coalesce(p_city, (select city_id from profiles where id = auth.uid()))
    and c.status <> 'suspended'
  order by 6 desc
  limit 30
$$;
revoke execute on function public.club_week_table(text) from public, anon;
grant execute on function public.club_week_table(text) to authenticated;

-- You and the people you follow, by counted steps this week.
create or replace function public.friends_week()
returns table (user_id uuid, display_name text, avatar_path text, tier public.tier, borough_id text, counted bigint, is_me boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.avatar_path, p.tier, p.borough_id,
         coalesce((select sum(d.counted) from daily_steps d where d.user_id = p.id and not d.flagged
                   and d.day >= date_trunc('week', public.london_today())::date), 0)::bigint,
         p.id = auth.uid()
  from profiles p
  where p.id = auth.uid()
     or p.id in (select followee_id from follows where follower_id = auth.uid())
  order by 6 desc
$$;
revoke execute on function public.friends_week() from public, anon;
grant execute on function public.friends_week() to authenticated;

-- Scheduler (Monday): the Borough Cup. The top area in each city last week
-- pays 400 OUT to each of its members who were active on three days.
create or replace function public.settle_area_cups(p_week date default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  wk date := coalesce(p_week, date_trunc('week', public.london_today())::date - 7);
  c record;
  top text;
  n int := 0;
  r record;
begin
  for c in select distinct city_id from boroughs loop
    select t.area_id into top from public.area_table(c.city_id, wk) t where t.counted > 0 order by t.counted desc limit 1;
    if top is null then continue; end if;
    for r in
      select p.id from profiles p
      where p.borough_id = top
        and (select count(*) from daily_steps d where d.user_id = p.id and not d.flagged and d.steps >= 3000
             and d.day between wk and wk + 6) >= 3
    loop
      if public.award(r.id, 'area-cup:' || top || ':' || wk || ':' || r.id, 'Borough Cup won', 'league', 0, 400, 'area', top) then
        n := n + 1;
      end if;
    end loop;
    top := null;
  end loop;
  return n;
end $$;
revoke execute on function public.settle_area_cups(date) from public, anon, authenticated;


-- ── Swipe to battle ──────────────────────────────────────────────────────────

-- Show me on Swipe: off means only friends and your club can challenge you.
alter table public.profiles add column if not exists show_on_swipe boolean not null default true;
grant update (show_on_swipe) on public.profiles to authenticated;

-- Right swipes become picks; left swipes are rival_passes (part 4).
create table if not exists public.rival_picks (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  rival_id    uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, rival_id),
  check (user_id <> rival_id)
);
alter table public.rival_picks enable row level security;
create policy "my picks" on public.rival_picks for select using (user_id = auth.uid());

-- A battle can be on steps, distance or active minutes (most steps mode).
alter table public.battles
  add column if not exists metric text not null default 'steps' check (metric in ('steps', 'distance', 'minutes')),
  add column if not exists rematch_of uuid references public.battles(id) on delete set null;

-- What a stranger's card shows: first name, level, membership, area and
-- their last two weeks. Never where they are.
create or replace function public.rival_card(p public.profiles, me_level int)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', p.id, 'username', p.username, 'display_name', p.display_name, 'avatar_path', p.avatar_path,
    'tier', p.tier, 'level', p.level, 'city_id', p.city_id,
    'city', (select name from cities where id = p.city_id),
    'area', (select name from boroughs where id = p.borough_id),
    'avg_steps', coalesce((select round(avg(steps)) from daily_steps
                           where user_id = p.id and day > public.london_today() - 14 and not flagged), 0),
    'wins', (select count(*) from battles where winner_id = p.id),
    'played', (select count(*) from battles where p.id in (challenger_id, opponent_id) and status in ('finished', 'forfeit')),
    'dot', (select dot from member_dots where user_id = p.id),
    'fair', abs(p.level - me_level) <= 3)
$$;
revoke execute on function public.rival_card(public.profiles, int) from public, anon, authenticated;

-- The deck: 'near' is your city, nearest areas first (by the hex map),
-- 'city' your city by level, 'division' the other sides in your City League
-- division. Blocks, passes,
-- picks, open battles and anyone hidden from Swipe are left out. Under 18s
-- only ever see under 18s.
create or replace function public.swipe_deck(p_scope text default 'near', p_limit integer default 20)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  me profiles;
  my_div text;
  my_side record;
begin
  select * into me from profiles where id = auth.uid();
  if me.id is null then raise exception 'NOT_SIGNED_IN'; end if;
  -- Swipe is for over 18s only: under 18s battle friends and their club.
  if public.is_minor(me.id) then return '[]'::json; end if;
  if p_scope = 'division' then
    select * into my_side from public.side_of(me.id);
    select division into my_div from public.league_sides() where side_kind = my_side.kind and side_id = my_side.id;
  end if;
  return coalesce((
    select json_agg(public.rival_card(x, me.level))
    from (
      select p.* from profiles p
      where p.id <> me.id and p.show_on_swipe and p.public_profile and p.onboarded_at is not null
        and not public.is_blocked(me.id, p.id)
        and not public.is_minor(p.id)
        -- Real movers only: someone appears once they've logged a run.
        and exists (select 1 from runs r where r.user_id = p.id)
        and not exists (select 1 from rival_passes rp where rp.user_id = me.id and rp.rival_id = p.id)
        and not exists (select 1 from rival_picks pk where pk.user_id = me.id and pk.rival_id = p.id)
        and not exists (select 1 from battles b
                        where b.status in ('pending', 'accepted', 'live')
                          and ((b.challenger_id = me.id and b.opponent_id = p.id)
                            or (b.opponent_id = me.id and b.challenger_id = p.id)))
        and case p_scope
              when 'near' then p.city_id = me.city_id
              when 'city' then p.city_id = me.city_id
              when 'division' then p.city_id <> me.city_id and exists (
                select 1 from public.side_of(p.id) s
                join public.league_sides() ls on ls.side_kind = s.kind and ls.side_id = s.id
                where ls.division = coalesce(my_div, 'rising'))
              else false end
      order by case when p_scope = 'near' then coalesce(
                 (select abs(a.tile_col - b.tile_col) + abs(a.tile_row - b.tile_row)
                  from boroughs a, boroughs b where a.id = p.borough_id and b.id = me.borough_id), 99) else 0 end,
               abs(p.level - me.level), random()
      limit least(greatest(p_limit, 1), 50)) x), '[]'::json);
end $$;
revoke execute on function public.swipe_deck(text, integer) from public, anon;
grant execute on function public.swipe_deck(text, integer) to authenticated;

-- Swipe right to pick, left to pass. Returns how many picks you have.
create or replace function public.swipe_rival(p_rival uuid, p_pick boolean)
returns integer language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if p_rival = me or public.is_blocked(me, p_rival) then raise exception 'NOT_ALLOWED'; end if;
  if public.is_minor(p_rival) or public.is_minor(me) then raise exception 'NOT_ALLOWED'; end if;
  if p_pick then
    insert into rival_picks (user_id, rival_id) values (me, p_rival) on conflict do nothing;
  else
    insert into rival_passes (user_id, rival_id) values (me, p_rival) on conflict do nothing;
  end if;
  return (select count(*) from rival_picks where user_id = me);
end $$;
revoke execute on function public.swipe_rival(uuid, boolean) from public, anon;
grant execute on function public.swipe_rival(uuid, boolean) to authenticated;

create or replace function public.my_picks()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(public.rival_card(p, (select level from profiles where id = auth.uid())) order by pk.created_at desc), '[]'::json)
  from rival_picks pk join profiles p on p.id = pk.rival_id
  where pk.user_id = auth.uid() and pk.created_at > now() - interval '7 days'
    and not public.is_blocked(auth.uid(), p.id)
$$;
revoke execute on function public.my_picks() from public, anon;
grant execute on function public.my_picks() to authenticated;

-- Challenge one of your picks: steps, distance or minutes, for a day, three
-- days or a week, with a stake of 0, 50, 100 or 250 OUT.
create or replace function public.challenge_pick(p_rival uuid, p_metric text default 'steps',
  p_duration_h integer default 72, p_stake_out integer default 100)
returns public.battles language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  b battles;
begin
  if not exists (select 1 from rival_picks where user_id = me and rival_id = p_rival) then raise exception 'NOT_A_PICK'; end if;
  if p_metric not in ('steps', 'distance', 'minutes') then raise exception 'BAD_METRIC'; end if;
  if p_duration_h not in (24, 72, 168) then raise exception 'BAD_LENGTH'; end if;
  if p_stake_out not in (0, 50, 100, 250) then raise exception 'BAD_STAKE'; end if;
  b := public.create_battle(p_rival, 'most_steps', p_duration_h, null, p_stake_out, null, null);
  update battles set metric = p_metric where id = b.id returning * into b;
  delete from rival_picks where user_id = me and rival_id = p_rival;
  return b;
end $$;
revoke execute on function public.challenge_pick(uuid, text, integer, integer) from public, anon;
grant execute on function public.challenge_pick(uuid, text, integer, integer) to authenticated;

-- ── Mystery challengers ──────────────────────────────────────────────────────

-- profiles.surprise_challengers is the on/off switch; these are the rest.
create table if not exists public.mystery_settings (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  scope       text not null default 'city' check (scope in ('area', 'city', 'uk')),
  level_gap   integer not null default 3 check (level_gap between 1 and 10),
  per_day     integer not null default 3 check (per_day between 1 and 5),
  quiet_start smallint not null default 22 check (quiet_start between 0 and 23),
  quiet_end   smallint not null default 7 check (quiet_end between 0 and 23),
  updated_at  timestamptz not null default now()
);
alter table public.mystery_settings enable row level security;
create policy "my mystery settings" on public.mystery_settings for select using (user_id = auth.uid());

create table if not exists public.mystery_offers (
  id          uuid primary key default gen_random_uuid(),
  a_id        uuid not null references public.profiles(id) on delete cascade,
  b_id        uuid not null references public.profiles(id) on delete cascade,
  metric      text not null default 'steps' check (metric in ('steps', 'distance', 'minutes')),
  duration_h  integer not null default 72 check (duration_h in (24, 72, 168)),
  stake_out   integer not null default 0 check (stake_out between 0 and 500),
  a_answer    boolean,
  b_answer    boolean,
  expires_at  timestamptz not null,
  battle_id   uuid references public.battles(id) on delete set null,
  closed_at   timestamptz,
  created_at  timestamptz not null default now(),
  check (a_id <> b_id)
);
create index if not exists mystery_offers_a_idx on public.mystery_offers(a_id, created_at desc);
create index if not exists mystery_offers_b_idx on public.mystery_offers(b_id, created_at desc);
alter table public.mystery_offers enable row level security;
-- Read through mystery_offer_view, which hides who until both say yes.
create policy "no direct reads" on public.mystery_offers for select using (false);

create or replace function public.mystery_settings_view()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'enabled', p.surprise_challengers and not public.is_minor(p.id),
    'minor', public.is_minor(p.id),
    'scope', coalesce(s.scope, 'city'), 'level_gap', coalesce(s.level_gap, 3), 'per_day', coalesce(s.per_day, 3),
    'quiet_start', coalesce(s.quiet_start, 22), 'quiet_end', coalesce(s.quiet_end, 7),
    'show_on_swipe', p.show_on_swipe)
  from profiles p left join mystery_settings s on s.user_id = p.id
  where p.id = auth.uid()
$$;
revoke execute on function public.mystery_settings_view() from public, anon;
grant execute on function public.mystery_settings_view() to authenticated;

-- Under 18s can never switch mystery challengers on.
create or replace function public.set_mystery_settings(p_enabled boolean default null, p_scope text default null,
  p_level_gap integer default null, p_per_day integer default null,
  p_quiet_start integer default null, p_quiet_end integer default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if coalesce(p_enabled, false) and public.is_minor(me) then raise exception 'UNDER_18'; end if;
  if p_enabled is not null then update profiles set surprise_challengers = p_enabled where id = me; end if;
  insert into mystery_settings (user_id) values (me) on conflict do nothing;
  update mystery_settings set
    scope = coalesce(p_scope, scope), level_gap = coalesce(p_level_gap, level_gap), per_day = coalesce(p_per_day, per_day),
    quiet_start = coalesce(p_quiet_start, quiet_start), quiet_end = coalesce(p_quiet_end, quiet_end), updated_at = now()
  where user_id = me;
  return public.mystery_settings_view();
end $$;
revoke execute on function public.set_mystery_settings(boolean, text, integer, integer, integer, integer) from public, anon;
grant execute on function public.set_mystery_settings(boolean, text, integer, integer, integer, integer) to authenticated;

-- Whether someone can get a mystery challenger right now: switched on, not
-- under 18, under their daily number, outside their quiet hours and with no
-- offer open.
create or replace function public.mystery_ready(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select p.surprise_challengers and not public.is_minor(p.id)
      and (select count(*) from mystery_offers o where p.id in (o.a_id, o.b_id)
           and (o.created_at at time zone 'Europe/London')::date = public.london_today()) < coalesce(s.per_day, 3)
      and not exists (select 1 from mystery_offers o where p.id in (o.a_id, o.b_id) and o.closed_at is null and o.expires_at > now())
      and not (case when coalesce(s.quiet_start, 22) > coalesce(s.quiet_end, 7)
                    then extract(hour from now() at time zone 'Europe/London') >= coalesce(s.quiet_start, 22)
                      or extract(hour from now() at time zone 'Europe/London') < coalesce(s.quiet_end, 7)
                    else extract(hour from now() at time zone 'Europe/London') >= coalesce(s.quiet_start, 22)
                     and extract(hour from now() at time zone 'Europe/London') < coalesce(s.quiet_end, 7) end)
    from profiles p left join mystery_settings s on s.user_id = p.id where p.id = p_user), false)
$$;
revoke execute on function public.mystery_ready(uuid) from public, anon, authenticated;

-- Pair someone with a random rival near their level, inside both people's
-- settings. Stake 100 each if both can cover it, 50 if not, else nothing.
create or replace function public.make_mystery_offer(p_user uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me profiles;
  ms mystery_settings;
  them profiles;
  stake int;
  oid uuid;
begin
  select * into me from profiles where id = p_user;
  select * into ms from mystery_settings where user_id = p_user;
  if not public.mystery_ready(p_user) then return null; end if;
  select p.* into them from profiles p
  left join mystery_settings s on s.user_id = p.id
  where p.id <> me.id and p.onboarded_at is not null
    and public.mystery_ready(p.id)
    and not public.is_blocked(me.id, p.id)
    and abs(p.level - me.level) <= least(coalesce(ms.level_gap, 3), coalesce(s.level_gap, 3))
    and case coalesce(ms.scope, 'city')
          when 'area' then p.borough_id = me.borough_id
          when 'city' then p.city_id = me.city_id
          else true end
    and case coalesce(s.scope, 'city')
          when 'area' then p.borough_id = me.borough_id
          when 'city' then p.city_id = me.city_id
          else true end
    and not exists (select 1 from battles b where b.status in ('pending', 'accepted', 'live')
                    and ((b.challenger_id = me.id and b.opponent_id = p.id) or (b.opponent_id = me.id and b.challenger_id = p.id)))
  order by random() limit 1;
  if them.id is null then return null; end if;
  stake := case when public.out_available(me.id) >= 100 and public.out_available(them.id) >= 100 then 100
                when public.out_available(me.id) >= 50 and public.out_available(them.id) >= 50 then 50 else 0 end;
  insert into mystery_offers (a_id, b_id, stake_out, expires_at)
  values (me.id, them.id, stake, now() + interval '5 minutes') returning id into oid;
  perform public.notify(them.id, 'battle', 'Here comes a new challenger', 'Someone near your level. Answer in 5 minutes.', '/swipe/challenger?offer=' || oid);
  perform public.notify(me.id, 'battle', 'Here comes a new challenger', 'Someone near your level. Answer in 5 minutes.', '/swipe/challenger?offer=' || oid);
  return oid;
end $$;
revoke execute on function public.make_mystery_offer(uuid) from public, anon, authenticated;

-- Ask for one now (from the Arena).
create or replace function public.find_mystery_challenger()
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  oid uuid;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if public.is_minor(me) then raise exception 'UNDER_18'; end if;
  if not (select surprise_challengers from profiles where id = me) then raise exception 'MYSTERY_OFF'; end if;
  select id into oid from mystery_offers where me in (a_id, b_id) and closed_at is null and expires_at > now() limit 1;
  if oid is not null then return oid; end if;
  oid := public.make_mystery_offer(me);
  if oid is null then raise exception 'NO_CHALLENGER'; end if;
  return oid;
end $$;
revoke execute on function public.find_mystery_challenger() from public, anon;
grant execute on function public.find_mystery_challenger() to authenticated;

-- Scheduler (every 30 minutes): a few random pairings among people who are on.
create or replace function public.send_mystery_challengers()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record;
  n int := 0;
begin
  for r in select id from profiles where surprise_challengers and onboarded_at is not null order by random() limit 200 loop
    if random() < 0.25 and public.make_mystery_offer(r.id) is not null then n := n + 1; end if;
  end loop;
  return n;
end $$;
revoke execute on function public.send_mystery_challengers() from public, anon, authenticated;

-- The offer as you see it. Before both say yes: their level band, area,
-- the battle and the clock, never who. After: who, and the battle.
create or replace function public.mystery_offer_view(p_offer uuid default null)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  o mystery_offers;
  them profiles;
  mine profiles;
  im_a boolean;
  revealed boolean;
begin
  if p_offer is null then
    select * into o from mystery_offers where me in (a_id, b_id) order by created_at desc limit 1;
  else
    select * into o from mystery_offers where id = p_offer;
  end if;
  if o.id is null then return null; end if;
  if me not in (o.a_id, o.b_id) then raise exception 'NOT_ALLOWED'; end if;
  im_a := o.a_id = me;
  select * into mine from profiles where id = me;
  select * into them from profiles where id = case when im_a then o.b_id else o.a_id end;
  revealed := o.battle_id is not null;
  return json_build_object(
    'id', o.id, 'metric', o.metric, 'duration_h', o.duration_h, 'stake_out', o.stake_out,
    'expires_at', o.expires_at, 'created_at', o.created_at,
    'level_low', least(mine.level, them.level), 'level_high', greatest(mine.level, them.level),
    'where', coalesce((select name from boroughs where id = them.borough_id), (select name from cities where id = them.city_id)),
    'my_answer', case when im_a then o.a_answer else o.b_answer end,
    'status', case when revealed then 'revealed'
                   when o.closed_at is not null or o.a_answer is false or o.b_answer is false then 'closed'
                   when o.expires_at <= now() then 'expired' else 'open' end,
    'battle_id', o.battle_id,
    'rival', case when revealed then json_build_object(
      'id', them.id, 'display_name', them.display_name, 'username', them.username, 'avatar_path', them.avatar_path,
      'tier', them.tier, 'level', them.level,
      'met_before', exists (select 1 from battles b where b.id <> o.battle_id
                            and ((b.challenger_id = me and b.opponent_id = them.id) or (b.opponent_id = me and b.challenger_id = them.id))))
      else null end,
    'me', json_build_object('level', mine.level, 'tier', mine.tier));
end $$;
revoke execute on function public.mystery_offer_view(uuid) from public, anon;
grant execute on function public.mystery_offer_view(uuid) to authenticated;

-- Accept or decline. Declining never counts against you. When both accept
-- the battle starts at once and both of you see who.
create or replace function public.answer_mystery(p_offer uuid, p_accept boolean)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  o mystery_offers;
  b battles;
  stake int;
begin
  select * into o from mystery_offers where id = p_offer for update;
  if o.id is null or me not in (o.a_id, o.b_id) then raise exception 'NOT_ALLOWED'; end if;
  if o.closed_at is not null or o.battle_id is not null then raise exception 'ALREADY_ANSWERED'; end if;
  if o.expires_at <= now() then raise exception 'EXPIRED'; end if;
  if o.a_id = me then update mystery_offers set a_answer = p_accept where id = p_offer returning * into o;
  else update mystery_offers set b_answer = p_accept where id = p_offer returning * into o;
  end if;
  if not p_accept then
    update mystery_offers set closed_at = now() where id = p_offer;
    return public.mystery_offer_view(p_offer);
  end if;
  if o.a_answer and o.b_answer then
    stake := case when public.out_available(o.a_id) >= o.stake_out and public.out_available(o.b_id) >= o.stake_out then o.stake_out else 0 end;
    insert into battles (mode, metric, status, challenger_id, opponent_id, is_surprise, duration_h, stake_out,
                         starts_at, ends_at, responded_at)
    values ('most_steps', o.metric, 'live', o.a_id, o.b_id, true, o.duration_h, stake,
            now(), now() + make_interval(hours => o.duration_h), now())
    returning * into b;
    if stake > 0 then
      perform public.award(o.a_id, 'stake:' || b.id || ':' || o.a_id, 'Battle stake held', 'battle_stake', 0, -stake, 'battle', b.id::text);
      perform public.award(o.b_id, 'stake:' || b.id || ':' || o.b_id, 'Battle stake held', 'battle_stake', 0, -stake, 'battle', b.id::text);
    end if;
    update mystery_offers set battle_id = b.id, closed_at = now() where id = p_offer;
    perform public.notify(o.a_id, 'battle', 'Challenger revealed', 'You both said yes. See who.', '/swipe/reveal?offer=' || p_offer);
    perform public.notify(o.b_id, 'battle', 'Challenger revealed', 'You both said yes. See who.', '/swipe/reveal?offer=' || p_offer);
  end if;
  return public.mystery_offer_view(p_offer);
end $$;
revoke execute on function public.answer_mystery(uuid, boolean) from public, anon;
grant execute on function public.answer_mystery(uuid, boolean) to authenticated;

-- ── In a battle: emotes, boosts and rematches ────────────────────────────────

-- No chat in a battle: a tray of emotes and set lines that burst on both
-- phones.
create table if not exists public.battle_emotes (
  id          bigint generated always as identity primary key,
  battle_id   uuid not null references public.battles(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  code        text not null check (code in ('fire', 'respect', 'too_slow', 'speed', 'champion',
                                            'line_rematch', 'line_respect', 'line_too_slow', 'line_catch_me', 'line_gg')),
  created_at  timestamptz not null default now()
);
create index if not exists battle_emotes_battle_idx on public.battle_emotes(battle_id, created_at desc);
alter table public.battle_emotes enable row level security;
create policy "battle emotes for the two of us" on public.battle_emotes for select using (
  exists (select 1 from public.battles b where b.id = battle_id and auth.uid() in (b.challenger_id, b.opponent_id)));
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.battle_emotes;
  end if;
end $$;

create or replace function public.send_battle_emote(p_battle uuid, p_code text)
returns public.battle_emotes language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  b battles;
  e battle_emotes;
begin
  select * into b from battles where id = p_battle;
  if b.id is null or me not in (b.challenger_id, b.opponent_id) then raise exception 'NOT_ALLOWED'; end if;
  if b.status not in ('pending', 'accepted', 'live', 'finished', 'forfeit') then raise exception 'BATTLE_CLOSED'; end if;
  if public.is_blocked(b.challenger_id, b.opponent_id) then raise exception 'NOT_ALLOWED'; end if;
  if exists (select 1 from battle_emotes where battle_id = p_battle and user_id = me and created_at > now() - interval '2 seconds') then
    raise exception 'SLOW_DOWN';
  end if;
  if (select count(*) from battle_emotes where battle_id = p_battle and user_id = me) >= 200 then raise exception 'SLOW_DOWN'; end if;
  insert into battle_emotes (battle_id, user_id, code) values (p_battle, me, p_code) returning * into e;
  return e;
end $$;
revoke execute on function public.send_battle_emote(uuid, text) from public, anon;
grant execute on function public.send_battle_emote(uuid, text) to authenticated;

-- A boost costs 20 OUT and doubles the XP you take from this battle.
create table if not exists public.battle_boosts (
  battle_id   uuid not null references public.battles(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (battle_id, user_id)
);
alter table public.battle_boosts enable row level security;
create policy "boosts in my battles" on public.battle_boosts for select using (
  exists (select 1 from public.battles b where b.id = battle_id and auth.uid() in (b.challenger_id, b.opponent_id)));

create or replace function public.boost_battle(p_battle uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  b battles;
begin
  select * into b from battles where id = p_battle;
  if b.id is null or me not in (b.challenger_id, b.opponent_id) then raise exception 'NOT_ALLOWED'; end if;
  if b.status not in ('accepted', 'live') or b.ends_at <= now() then raise exception 'BATTLE_CLOSED'; end if;
  if exists (select 1 from battle_boosts where battle_id = p_battle and user_id = me) then raise exception 'ALREADY_BOOSTED'; end if;
  if public.out_available(me) < 20 then raise exception 'NOT_ENOUGH_OUT'; end if;
  insert into battle_boosts (battle_id, user_id) values (p_battle, me);
  perform public.award(me, 'boost:' || p_battle || ':' || me, 'Battle boost', 'battle_boost', 0, -20, 'battle', p_battle::text);
  return true;
end $$;
revoke execute on function public.boost_battle(uuid) from public, anon;
grant execute on function public.boost_battle(uuid) to authenticated;

-- Settle one battle and pay out, as in part 11, plus: most steps battles can
-- be on distance or active minutes, and a boost doubles that player's XP.
create or replace function public.settle_battle(p_battle uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  b battles;
  c_res int;
  o_res int;
  lower_wins boolean;
  winner uuid;
  loser uuid;
  first_day date;
  last_day date;
  xp_mult_w int;
  xp_mult_l int;
begin
  select * into b from battles where id = p_battle for update;
  if b.status not in ('accepted', 'live') then return; end if;
  lower_wins := b.mode in ('live_race', 'blind_time_trial', 'ghost_race', 'hold_the_route');
  first_day := (b.starts_at at time zone 'Europe/London')::date;
  last_day := (b.ends_at at time zone 'Europe/London')::date;

  if b.mode = 'most_steps' then
    select coalesce(sum(case b.metric when 'distance' then distance_m when 'minutes' then active_minutes else counted end), 0)
      into c_res from daily_steps
      where user_id = b.challenger_id and day between first_day and last_day and not flagged;
    select coalesce(sum(case b.metric when 'distance' then distance_m when 'minutes' then active_minutes else counted end), 0)
      into o_res from daily_steps
      where user_id = b.opponent_id and day between first_day and last_day and not flagged;
  elsif b.mode = 'last_one_standing' then
    c_res := public.standing_days(b.challenger_id, first_day, least(last_day, public.london_today() - 1));
    o_res := public.standing_days(b.opponent_id, first_day, least(last_day, public.london_today() - 1));
  else
    select result into c_res from battle_entries where battle_id = p_battle and user_id = b.challenger_id;
    select result into o_res from battle_entries where battle_id = p_battle and user_id = b.opponent_id;
  end if;

  if c_res is null and o_res is null then
    winner := null;
  elsif c_res is null then winner := b.opponent_id;
  elsif o_res is null then winner := b.challenger_id;
  elsif c_res = o_res then winner := null;
  elsif (c_res < o_res) = lower_wins then winner := b.challenger_id;
  else winner := b.opponent_id;
  end if;
  loser := case when winner = b.challenger_id then b.opponent_id when winner = b.opponent_id then b.challenger_id end;

  update battles set status = case when c_res is null or o_res is null then 'forfeit' else 'finished' end::battle_status,
    winner_id = winner, challenger_result = c_res, opponent_result = o_res, finished_at = now()
  where id = p_battle;

  if winner is not null then
    xp_mult_w := case when exists (select 1 from battle_boosts where battle_id = b.id and user_id = winner) then 2 else 1 end;
    xp_mult_l := case when exists (select 1 from battle_boosts where battle_id = b.id and user_id = loser) then 2 else 1 end;
    perform public.award(winner, 'battle-win:' || b.id, 'Battle won', 'battle_win', 150 * xp_mult_w, 15 + b.stake_out * 2, 'battle', b.id::text);
    perform public.award(loser, 'battle-played:' || b.id, 'Battle played', 'battle', 25 * xp_mult_l, 0, 'battle', b.id::text);
    perform public.notify(winner, 'battle', 'You won', 'The win and the stake are yours.', '/battles/' || b.id);
    perform public.notify(loser, 'battle', 'So close',
      case when b.stake_out > 0 then 'Rematch at half the stake for the next 24 hours.' else 'Run it back?' end, '/battles/' || b.id);
  else
    perform public.award(b.challenger_id, 'battle-played:' || b.id, 'Battle drawn', 'battle',
      25 * (case when exists (select 1 from battle_boosts where battle_id = b.id and user_id = b.challenger_id) then 2 else 1 end),
      b.stake_out, 'battle', b.id::text);
    perform public.award(b.opponent_id, 'battle-played:' || b.id, 'Battle drawn', 'battle',
      25 * (case when exists (select 1 from battle_boosts where battle_id = b.id and user_id = b.opponent_id) then 2 else 1 end),
      b.stake_out, 'battle', b.id::text);
  end if;
end $$;
revoke execute on function public.settle_battle(uuid) from public, anon, authenticated;

-- Run it back with the same person, mode and length. Lost in the last 24
-- hours? The stake is half.
create or replace function public.rematch_battle(p_battle uuid)
returns public.battles language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  old battles;
  nb battles;
  stake int;
  other uuid;
begin
  select * into old from battles where id = p_battle;
  if old.id is null or me not in (old.challenger_id, old.opponent_id) then raise exception 'NOT_ALLOWED'; end if;
  if old.status not in ('finished', 'forfeit', 'cancelled', 'declined', 'expired') then raise exception 'NOT_FINISHED'; end if;
  other := case when old.challenger_id = me then old.opponent_id else old.challenger_id end;
  stake := old.stake_out;
  if old.winner_id = other and old.finished_at > now() - interval '24 hours' then stake := old.stake_out / 2; end if;
  nb := public.create_battle(other, old.mode, old.duration_h, old.distance_m, stake, old.route_run_id, old.stake_note);
  update battles set metric = old.metric, rematch_of = old.id where id = nb.id returning * into nb;
  return nb;
end $$;
revoke execute on function public.rematch_battle(uuid) from public, anon;
grant execute on function public.rematch_battle(uuid) to authenticated;

-- Head to head with someone, for the versus screen.
create or replace function public.head_to_head(p_other uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'mine', count(*) filter (where winner_id = auth.uid()),
    'theirs', count(*) filter (where winner_id = p_other),
    'played', count(*))
  from battles
  where status in ('finished', 'forfeit')
    and ((challenger_id = auth.uid() and opponent_id = p_other) or (challenger_id = p_other and opponent_id = auth.uid()))
$$;
revoke execute on function public.head_to_head(uuid) from public, anon;
grant execute on function public.head_to_head(uuid) to authenticated;

-- ── The arena season ─────────────────────────────────────────────────────────

create table if not exists public.arena_seasons (
  number      integer primary key,
  name        text not null,
  starts_on   date not null,
  ends_on     date not null,
  headline    text,                              -- 'New Borough Cup and a Black-only bracket'
  closed_at   timestamptz,
  check (ends_on > starts_on)
);
alter table public.arena_seasons enable row level security;
create policy "arena seasons are public" on public.arena_seasons for select using (true);

insert into public.arena_seasons (number, name, starts_on, ends_on, headline) values
  (1, 'Season 1', '2026-08-17', '2026-09-27', 'The first Arena season'),
  (2, 'Season 2', '2026-09-28', '2026-11-08', 'Bigger pots, a Borough Cup and a Black-only bracket'),
  (3, 'Season 3', '2026-11-09', '2026-12-20', 'A new Borough Cup and a Black-only bracket')
on conflict (number) do nothing;

create table if not exists public.arena_results (
  season      integer not null references public.arena_seasons(number) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  city_id     text references public.cities(id),
  rank        integer not null,
  players     integer not null,
  points      integer not null,
  prize_out   integer not null default 0,
  badge_id    text references public.badges(id),
  perk        text check (perk in ('black_week')),
  claimed_at  timestamptz,
  primary key (season, user_id)
);
alter table public.arena_results enable row level security;
create policy "my season results" on public.arena_results for select using (user_id = auth.uid());

-- The Arena hero: season and week, how many are outside in your city and
-- how many battles are live.
create or replace function public.arena_now()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'season', s.number, 'name', s.name, 'headline', s.headline,
    'week', greatest(1, (public.london_today() - s.starts_on) / 7 + 1),
    'weeks', ((s.ends_on - s.starts_on) / 7) + 1,
    'ends_on', s.ends_on,
    'outside', (select count(*) from presence pr join profiles p on p.id = pr.user_id
                where pr.state = 'out' and pr.last_seen_at > now() - interval '10 minutes'
                  and p.city_id = (select city_id from profiles where id = auth.uid())),
    'battles_live', (select count(*) from battles where status in ('accepted', 'live')))
  from arena_seasons s
  where public.london_today() between s.starts_on and s.ends_on
  order by s.number desc limit 1
$$;
revoke execute on function public.arena_now() from public, anon;
grant execute on function public.arena_now() to authenticated;

-- Scheduler (the Monday after a season): rank everyone who battled, city by
-- city. Three points a win, one a draw or a loss. Top 5% get 1,500 OUT and a
-- Black week, top 25% 500, everyone else who played 100, and all of them the
-- finisher badge.
create or replace function public.close_arena_season(p_season integer)
returns integer language plpgsql security definer set search_path = public as $$
declare
  s arena_seasons;
  badge text;
  n int;
begin
  select * into s from arena_seasons where number = p_season for update;
  if s.number is null then raise exception 'NOT_FOUND'; end if;
  if s.closed_at is not null then return 0; end if;
  badge := 'arena_season_' || s.number;
  insert into badges (id, label, description, art_path, sort)
  values (badge, s.name || ' finisher', 'Battled in the Arena in ' || s.name || '.', 'badges/arena_season.png', 100 + s.number)
  on conflict (id) do nothing;
  with played as (
    select x.user_id, sum(x.pts)::int as points from (
      select challenger_id as user_id, case when winner_id = challenger_id then 3 else 1 end as pts
      from battles where status in ('finished', 'forfeit') and (finished_at at time zone 'Europe/London')::date between s.starts_on and s.ends_on
      union all
      select opponent_id, case when winner_id = opponent_id then 3 else 1 end
      from battles where status in ('finished', 'forfeit') and (finished_at at time zone 'Europe/London')::date between s.starts_on and s.ends_on) x
    group by x.user_id),
  ranked as (
    select pl.user_id, p.city_id, pl.points,
           rank() over (partition by p.city_id order by pl.points desc)::int as rank,
           count(*) over (partition by p.city_id)::int as players
    from played pl join profiles p on p.id = pl.user_id)
  insert into arena_results (season, user_id, city_id, rank, players, points, prize_out, badge_id, perk)
  select s.number, user_id, city_id, rank, players, points,
         case when rank <= greatest(1, ceil(players * 0.05)) then 1500
              when rank <= greatest(1, ceil(players * 0.25)) then 500 else 100 end,
         badge,
         case when rank <= greatest(1, ceil(players * 0.05)) then 'black_week' end
  from ranked
  on conflict (season, user_id) do nothing;
  get diagnostics n = row_count;
  update arena_seasons set closed_at = now() where number = p_season;
  insert into notifications (user_id, kind, title, body, link)
  select user_id, 'battle', s.name || ' results', 'You finished #' || rank || '. Your rewards are waiting.', '/battles/season'
  from arena_results where season = s.number;
  return n;
end $$;
revoke execute on function public.close_arena_season(integer) from public, anon, authenticated;

create or replace function public.my_season_results(p_season integer default null)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'season', s.number, 'name', s.name,
    'rank', r.rank, 'players', r.players, 'points', r.points,
    'city', (select name from cities where id = r.city_id),
    'prize_out', r.prize_out, 'badge', (select label from badges where id = r.badge_id), 'perk', r.perk,
    'claimed', r.claimed_at is not null,
    'next', (select json_build_object('number', n.number, 'name', n.name, 'starts_on', n.starts_on, 'headline', n.headline)
             from arena_seasons n where n.number = s.number + 1))
  from arena_results r join arena_seasons s on s.number = r.season
  where r.user_id = auth.uid() and (p_season is null or r.season = p_season)
  order by r.season desc limit 1
$$;
revoke execute on function public.my_season_results(integer) from public, anon;
grant execute on function public.my_season_results(integer) to authenticated;

-- Pick up your season rewards: the OUT, the badge and, for the top 5%, a
-- week of Black (skipped if you are Black already).
create or replace function public.claim_season_rewards(p_season integer)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  r arena_results;
begin
  select * into r from arena_results where season = p_season and user_id = me for update;
  if r.user_id is null then raise exception 'NOT_FOUND'; end if;
  if r.claimed_at is not null then raise exception 'ALREADY_CLAIMED'; end if;
  if r.prize_out > 0 then
    perform public.award(me, 'arena-season:' || p_season || ':' || me, 'Season ' || p_season || ' prize', 'season', 0, r.prize_out, 'season', p_season::text);
  end if;
  if r.badge_id is not null then perform public.award_badge(me, r.badge_id); end if;
  if r.perk = 'black_week' and (select tier from profiles where id = me) <> 'black' then
    insert into subscriptions (user_id, tier, source, status, provider_ref, current_period_end)
    values (me, 'black', 'web', 'trialing', 'arena-season-' || p_season || '-' || me, now() + interval '7 days')
    on conflict (provider_ref) do nothing;
  end if;
  update arena_results set claimed_at = now() where season = p_season and user_id = me;
  return public.my_season_results(p_season);
end $$;
revoke execute on function public.claim_season_rewards(integer) from public, anon;
grant execute on function public.claim_season_rewards(integer) to authenticated;


-- ── Drop orders: claim with an address, then track it ────────────────────────

create table if not exists public.delivery_addresses (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  line1       text not null check (char_length(line1) between 1 and 120),
  line2       text check (char_length(line2) <= 120),
  town        text not null check (char_length(town) between 1 and 60),
  postcode    text not null check (char_length(postcode) between 3 and 10),
  updated_at  timestamptz not null default now()
);
alter table public.delivery_addresses enable row level security;
create policy "my address" on public.delivery_addresses for select using (user_id = auth.uid() or public.is_staff('support'));
create policy "save my address" on public.delivery_addresses for insert with check (user_id = auth.uid());
create policy "change my address" on public.delivery_addresses for update using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.drop_orders
  add column if not exists ref text unique,
  add column if not exists address jsonb,
  add column if not exists delivery_out integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();
alter table public.drop_orders drop constraint if exists drop_orders_status_check;
alter table public.drop_orders add constraint drop_orders_status_check check (status in
  ('reserved', 'paid', 'claimed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'collected', 'cancelled'));

create table if not exists public.drop_order_events (
  order_id    uuid not null references public.drop_orders(id) on delete cascade,
  status      text not null,
  note        text,
  at          timestamptz not null default now(),
  primary key (order_id, status)
);
alter table public.drop_order_events enable row level security;
create policy "my order history" on public.drop_order_events for select using (
  exists (select 1 from public.drop_orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff('support'))));

create or replace function public.order_view(p_order uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', o.id, 'ref', o.ref, 'drop_id', o.drop_id, 'title', d.title, 'image_path', d.image_path,
    'size', o.size, 'status', o.status, 'out_spent', o.out_spent, 'delivery_out', o.delivery_out,
    'address', o.address, 'created_at', o.created_at,
    'arrives_on', case when o.status in ('delivered', 'collected', 'cancelled') then null
                       else ((o.created_at at time zone 'Europe/London')::date + 3) end,
    'history', coalesce((select json_agg(json_build_object('status', e.status, 'at', e.at, 'note', e.note) order by e.at)
                         from drop_order_events e where e.order_id = o.id), '[]'::json))
  from drop_orders o join drops d on d.id = o.drop_id
  where o.id = p_order and (o.user_id = auth.uid() or public.is_staff('support'))
$$;
revoke execute on function public.order_view(uuid) from public, anon;
grant execute on function public.order_view(uuid) to authenticated;

create or replace function public.my_orders()
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(public.order_view(o.id) order by o.created_at desc), '[]'::json)
  from drop_orders o where o.user_id = auth.uid()
$$;
revoke execute on function public.my_orders() from public, anon;
grant execute on function public.my_orders() to authenticated;

-- Slide to claim: the price and delivery in OUT (delivery is free with
-- Black, 150 OUT otherwise), your size and address. One per member per drop.
create or replace function public.claim_drop(p_drop uuid, p_size text, p_address jsonb, p_save_address boolean default true)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  d drops;
  my_tier tier;
  delivery int;
  o drop_orders;
  addr jsonb;
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  select * into d from drops where id = p_drop for update;
  if d.id is null then raise exception 'NOT_FOUND'; end if;
  if exists (select 1 from drop_orders where drop_id = p_drop and user_id = me) then raise exception 'ALREADY_CLAIMED'; end if;
  select tier into my_tier from profiles where id = me;
  if my_tier < d.tier_required then raise exception 'TIER_REQUIRED' using hint = d.tier_required::text; end if;
  if now() < d.opens_at - (case when my_tier > 'free' then make_interval(hours => d.early_access_h) else interval '0' end) then
    raise exception 'NOT_OPEN';
  end if;
  if d.closes_at is not null and now() > d.closes_at then raise exception 'CLOSED'; end if;
  if d.stock <= 0 then raise exception 'SOLD_OUT'; end if;
  if coalesce(array_length(d.sizes, 1), 0) > 0 and (p_size is null or not (p_size = any(d.sizes))) then raise exception 'SIZE_REQUIRED'; end if;
  addr := jsonb_strip_nulls(jsonb_build_object(
    'name', nullif(trim(p_address->>'name'), ''), 'line1', nullif(trim(p_address->>'line1'), ''),
    'line2', nullif(trim(p_address->>'line2'), ''), 'town', nullif(trim(p_address->>'town'), ''),
    'postcode', upper(nullif(trim(p_address->>'postcode'), ''))));
  if addr->>'name' is null or addr->>'line1' is null or addr->>'town' is null or addr->>'postcode' is null then
    raise exception 'ADDRESS_REQUIRED';
  end if;
  delivery := case when my_tier = 'black' then 0 else 150 end;
  if public.out_available(me) < d.price_out + delivery then raise exception 'NOT_ENOUGH_OUT'; end if;

  begin
    insert into drop_orders (drop_id, user_id, size, out_spent, delivery_out, status, address, ref)
    values (p_drop, me, p_size, d.price_out, delivery, 'claimed', addr,
            'OH-' || lpad((floor(random() * 90000) + 10000)::int::text, 5, '0'))
    returning * into o;
  exception when unique_violation then
    raise exception 'ALREADY_CLAIMED';
  end;
  update drops set stock = stock - 1 where id = p_drop;
  insert into drop_order_events (order_id, status) values (o.id, 'claimed');
  if d.price_out + delivery > 0 then
    perform public.award(me, 'drop:' || o.id, d.title, 'drop', 0, -(d.price_out + delivery), 'drop', d.id::text);
  end if;
  if p_save_address then
    insert into delivery_addresses (user_id, name, line1, line2, town, postcode)
    values (me, addr->>'name', addr->>'line1', addr->>'line2', addr->>'town', addr->>'postcode')
    on conflict (user_id) do update set name = excluded.name, line1 = excluded.line1, line2 = excluded.line2,
      town = excluded.town, postcode = excluded.postcode, updated_at = now();
  end if;
  perform public.notify(me, 'drop', d.title || ' is yours', 'Order ' || o.ref || '. We''ll tell you as it moves.', '/orders/' || o.id);
  return public.order_view(o.id);
end $$;
revoke execute on function public.claim_drop(uuid, text, jsonb, boolean) from public, anon;
grant execute on function public.claim_drop(uuid, text, jsonb, boolean) to authenticated;

-- Staff move an order along: packed, shipped, out for delivery, delivered.
-- Cancelling gives the OUT back.
create or replace function public.advance_drop_order(p_order uuid, p_status text, p_note text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  o drop_orders;
  d drops;
begin
  if not public.is_staff('support') then raise exception 'NOT_ALLOWED'; end if;
  select * into o from drop_orders where id = p_order for update;
  if o.id is null then raise exception 'NOT_FOUND'; end if;
  if p_status not in ('packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled') then raise exception 'BAD_STATUS'; end if;
  if o.status in ('delivered', 'cancelled') then raise exception 'ORDER_CLOSED'; end if;
  select * into d from drops where id = o.drop_id;
  update drop_orders set status = p_status, updated_at = now() where id = p_order;
  insert into drop_order_events (order_id, status, note) values (p_order, p_status, p_note)
  on conflict (order_id, status) do update set at = now(), note = excluded.note;
  if p_status = 'cancelled' then
    update drops set stock = stock + 1 where id = o.drop_id;
    perform public.award(o.user_id, 'drop-refund:' || o.id, d.title || ' refund', 'drop', 0, o.out_spent + o.delivery_out, 'drop', d.id::text);
  end if;
  perform public.notify(o.user_id, 'drop',
    case p_status when 'packed' then 'Packed' when 'shipped' then 'On its way' when 'out_for_delivery' then 'Out for delivery'
                  when 'delivered' then 'Delivered' else 'Order cancelled' end,
    d.title || ' · ' || o.ref, '/orders/' || o.id);
  perform public.log_staff_action('advance_drop_order', 'drop_order', p_order::text, jsonb_build_object('status', p_status));
  return public.order_view(p_order);
end $$;
revoke execute on function public.advance_drop_order(uuid, text, text) from public, anon;
grant execute on function public.advance_drop_order(uuid, text, text) to authenticated;

-- ── Event tickets and who's going ────────────────────────────────────────────

-- Your ticket: a code for the QR at the start line, your wave (50 a wave, in
-- the order people said yes) and gate.
create table if not exists public.event_tickets (
  event_id    uuid not null references public.events(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  code        text not null unique default lower(encode(extensions.gen_random_bytes(9), 'hex')),
  wave        smallint not null,
  gate        text not null,
  created_at  timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table public.event_tickets enable row level security;
create policy "my tickets" on public.event_tickets for select using (user_id = auth.uid());

create or replace function public.my_ticket(p_event uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  e events;
  t event_tickets;
  pos int;
  w int;
begin
  select * into e from events where id = p_event;
  if e.id is null then raise exception 'EVENT_NOT_FOUND'; end if;
  if not exists (select 1 from event_rsvps where event_id = p_event and user_id = me) then raise exception 'NOT_GOING'; end if;
  select * into t from event_tickets where event_id = p_event and user_id = me;
  if t.code is null then
    select count(*) into pos from event_rsvps r
    where r.event_id = p_event and r.created_at <= (select created_at from event_rsvps where event_id = p_event and user_id = me);
    w := greatest(1, ceil(pos / 50.0)::int);
    insert into event_tickets (event_id, user_id, wave, gate)
    values (p_event, me, w, chr(64 + ((w - 1) % 4) + 1))
    on conflict (event_id, user_id) do nothing;
    select * into t from event_tickets where event_id = p_event and user_id = me;
  end if;
  return json_build_object(
    'code', t.code, 'qr', 'outhere:ticket:' || t.code, 'wave', t.wave, 'gate', t.gate,
    'name', (select display_name from profiles where id = me),
    'checked_in', exists (select 1 from event_rsvps where event_id = p_event and user_id = me and status = 'checked_in'));
end $$;
revoke execute on function public.my_ticket(uuid) from public, anon;
grant execute on function public.my_ticket(uuid) to authenticated;

-- The organiser scans a ticket at the start line.
create or replace function public.scan_ticket(p_code text)
returns json language plpgsql security definer set search_path = public as $$
declare
  t event_tickets;
  e events;
begin
  select * into t from event_tickets where code = lower(replace(trim(p_code), 'outhere:ticket:', ''));
  if t.code is null then raise exception 'CODE_INVALID'; end if;
  select * into e from events where id = t.event_id;
  if not (e.created_by = auth.uid() or (e.club_id is not null and public.is_club_staff(e.club_id)) or public.is_staff('moderator')) then
    raise exception 'NOT_ALLOWED';
  end if;
  if now() < e.starts_at - interval '30 minutes'
     or now() > coalesce(e.ends_at, e.starts_at + interval '3 hours') + interval '1 hour' then
    raise exception 'CHECK_IN_CLOSED';
  end if;
  update event_rsvps set status = 'checked_in', checked_in_at = coalesce(checked_in_at, now())
  where event_id = t.event_id and user_id = t.user_id;
  return json_build_object('name', (select display_name from profiles where id = t.user_id), 'wave', t.wave, 'gate', t.gate);
end $$;
revoke execute on function public.scan_ticket(text) from public, anon;
grant execute on function public.scan_ticket(text) to authenticated;

-- Who's going: people you follow first, then everyone else, with their wave
-- and club, and how many from your own club.
create or replace function public.event_going(p_event uuid, p_limit integer default 60)
returns json language sql stable security definer set search_path = public as $$
  with going as (
    select r.user_id, r.created_at, p.display_name, p.username, p.avatar_path, p.tier,
           exists (select 1 from follows f where f.follower_id = auth.uid() and f.followee_id = r.user_id) as following,
           (select c.name from club_members m join clubs c on c.id = m.club_id where m.user_id = r.user_id order by m.joined_at limit 1) as club,
           (select t.wave from event_tickets t where t.event_id = r.event_id and t.user_id = r.user_id) as wave,
           exists (select 1 from club_members a join club_members b on a.club_id = b.club_id
                   where a.user_id = auth.uid() and b.user_id = r.user_id) as same_club
    from event_rsvps r join profiles p on p.id = r.user_id
    where r.event_id = p_event and r.user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid))
  select json_build_object(
    'count', (select count(*) from event_rsvps where event_id = p_event),
    'friends', (select count(*) from going where following),
    'club_count', (select count(*) from going where same_club),
    'club_name', (select c.name from club_members m join clubs c on c.id = m.club_id
                  where m.user_id = auth.uid() order by m.joined_at limit 1),
    'people', coalesce((select json_agg(json_build_object(
                 'id', g.user_id, 'display_name', g.display_name, 'username', g.username, 'avatar_path', g.avatar_path,
                 'tier', g.tier, 'following', g.following, 'club', g.club, 'wave', g.wave, 'same_club', g.same_club)
               order by g.following desc, g.same_club desc, g.created_at)
               from (select * from going order by following desc, same_club desc, created_at limit least(greatest(p_limit, 1), 200)) g), '[]'::json))
$$;
revoke execute on function public.event_going(uuid, integer) from public, anon;
grant execute on function public.event_going(uuid, integer) to authenticated;

-- ── Fair play: runs under review ─────────────────────────────────────────────

-- When part of a run looks like a bus or a bike, only that part is held. The
-- member sees why and can appeal; staff decide within 24 hours.
create table if not exists public.run_reviews (
  run_id      uuid primary key references public.runs(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  checks      jsonb not null,                    -- [{key, ok, label, detail}]
  flagged_m   integer not null,
  fast_kmh    numeric,
  counted_m   integer not null,
  held_xp     integer not null default 0,
  status      text not null default 'open' check (status in ('open', 'accepted', 'appealed', 'cleared', 'upheld')),
  appeal_note text check (char_length(appeal_note) <= 500),
  created_at  timestamptz not null default now(),
  answered_at timestamptz,
  decided_at  timestamptz,
  decided_by  uuid references public.profiles(id)
);
create index if not exists run_reviews_open_idx on public.run_reviews(status, created_at) where status in ('open', 'appealed');
alter table public.run_reviews enable row level security;
create policy "my run reviews" on public.run_reviews for select using (user_id = auth.uid() or public.is_staff('moderator'));

-- Looks at the route as it is saved: steps against distance, GPS jumps and
-- stretches faster than 20 km/h (400 m or more of them).
create or replace function public.review_run_route()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r runs;
  n int := coalesce(jsonb_array_length(new.points), 0);
  i int;
  d float8;
  dt float8;
  total float8 := 0;
  fast_m float8 := 0;
  fast_s float8 := 0;
  jumps int := 0;
  steps_ok boolean;
  gps_ok boolean;
  fast_kmh numeric;
  counted int;
  held int;
begin
  select * into r from runs where id = new.run_id;
  if r.id is null or n < 3 then return null; end if;
  for i in 1..n - 1 loop
    d := public.haversine_m((new.points->(i-1)->>0)::float8, (new.points->(i-1)->>1)::float8,
                            (new.points->i->>0)::float8, (new.points->i->>1)::float8);
    total := total + d;
    if new.points->i->>2 is null or new.points->(i-1)->>2 is null then continue; end if;
    dt := ((new.points->i->>2)::float8 - (new.points->(i-1)->>2)::float8) / 1000.0;
    if dt <= 0 then continue; end if;
    if d > 250 and dt < 15 then jumps := jumps + 1; end if;
    if d / dt * 3.6 > 20 then
      fast_m := fast_m + d;
      fast_s := fast_s + dt;
    end if;
  end loop;
  steps_ok := r.steps = 0 or r.distance_m = 0 or (r.steps::float8 / r.distance_m between 0.5 and 2.4);
  gps_ok := jumps <= 2;
  if fast_m < 400 and (steps_ok or gps_ok) then return null; end if;

  fast_kmh := case when fast_s > 0 then round((fast_m / fast_s * 3.6)::numeric, 0) end;
  counted := greatest(0, r.distance_m - round(fast_m)::int);
  held := ((r.distance_m / 1000) - (counted / 1000)) * 10;
  insert into run_reviews (run_id, user_id, checks, flagged_m, fast_kmh, counted_m, held_xp)
  values (r.id, r.user_id, jsonb_build_array(
            jsonb_build_object('key', 'steps', 'ok', steps_ok, 'label', case when steps_ok then 'Steps match the distance' else 'Steps don''t match the distance' end),
            jsonb_build_object('key', 'gps', 'ok', gps_ok, 'label', case when gps_ok then 'GPS stayed steady' else 'GPS jumped about' end),
            jsonb_build_object('key', 'speed', 'ok', fast_m < 400,
              'label', case when fast_m < 400 then 'Pace looks like feet' else 'Too fast for ' || round((fast_m / 1000)::numeric, 1) || ' km' end,
              'detail', case when fast_m >= 400 then fast_kmh || ' km/h looks like a bus or a bike' end)),
          round(fast_m)::int, fast_kmh, counted, held)
  on conflict (run_id) do nothing;
  if held > 0 then
    perform public.award(r.user_id, 'run-hold:' || r.id, 'Held while we check a run', 'review', -held, 0, 'run', r.id::text);
  end if;
  perform public.notify(r.user_id, 'system', 'We''re checking a run',
    'Part of it looks like a bus or a bike. Only that part is held.', '/battles/review/' || r.id);
  return null;
end $$;
revoke execute on function public.review_run_route() from public, anon, authenticated;
create trigger run_routes_review after insert on public.run_routes
  for each row execute function public.review_run_route();

create or replace function public.run_review_view(p_run uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'run_id', v.run_id, 'checks', v.checks, 'flagged_m', v.flagged_m, 'fast_kmh', v.fast_kmh,
    'counted_m', v.counted_m, 'distance_m', r.distance_m, 'held_xp', v.held_xp, 'status', v.status,
    'appeal_note', v.appeal_note, 'created_at', v.created_at, 'decide_by', v.created_at + interval '24 hours',
    'route', r.route_public)
  from run_reviews v join runs r on r.id = v.run_id
  where v.run_id = p_run and (v.user_id = auth.uid() or public.is_staff('moderator'))
$$;
revoke execute on function public.run_review_view(uuid) from public, anon;
grant execute on function public.run_review_view(uuid) to authenticated;

-- OK (fair enough) or That's wrong (appeal, with a note).
create or replace function public.answer_run_review(p_run uuid, p_agree boolean, p_note text default null)
returns json language plpgsql security definer set search_path = public as $$
declare v run_reviews;
begin
  select * into v from run_reviews where run_id = p_run for update;
  if v.run_id is null or v.user_id <> auth.uid() then raise exception 'NOT_ALLOWED'; end if;
  if v.status <> 'open' then raise exception 'ALREADY_ANSWERED'; end if;
  update run_reviews set status = case when p_agree then 'accepted' else 'appealed' end,
    appeal_note = case when p_agree then null else nullif(trim(p_note), '') end, answered_at = now()
  where run_id = p_run;
  return public.run_review_view(p_run);
end $$;
revoke execute on function public.answer_run_review(uuid, boolean, text) from public, anon;
grant execute on function public.answer_run_review(uuid, boolean, text) to authenticated;

-- Staff decide: clear pays back what was held; uphold keeps it held.
create or replace function public.decide_run_review(p_run uuid, p_clear boolean)
returns json language plpgsql security definer set search_path = public as $$
declare v run_reviews;
begin
  if not public.is_staff('moderator') then raise exception 'NOT_ALLOWED'; end if;
  select * into v from run_reviews where run_id = p_run for update;
  if v.run_id is null then raise exception 'NOT_FOUND'; end if;
  if v.status in ('cleared', 'upheld') then raise exception 'ALREADY_ANSWERED'; end if;
  update run_reviews set status = case when p_clear then 'cleared' else 'upheld' end, decided_at = now(), decided_by = auth.uid()
  where run_id = p_run;
  if p_clear and v.held_xp > 0 then
    perform public.award(v.user_id, 'run-release:' || p_run, 'Run cleared', 'review', v.held_xp, 0, 'run', p_run::text);
  end if;
  perform public.notify(v.user_id, 'system', case when p_clear then 'Your run is cleared' else 'We checked your run' end,
    case when p_clear then 'All of it counts. Sorry for the wait.' else 'The fast part stays out. The rest counts.' end,
    '/battles/review/' || p_run);
  perform public.log_staff_action('decide_run_review', 'run', p_run::text, jsonb_build_object('clear', p_clear));
  return public.run_review_view(p_run);
end $$;
revoke execute on function public.decide_run_review(uuid, boolean) from public, anon;
grant execute on function public.decide_run_review(uuid, boolean) to authenticated;
