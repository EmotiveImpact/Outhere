// UK places: the regions, the cities and towns in them, and the areas each
// launch city plays in. The same data is seeded in the database by
// supabase/migrations/20261015101700_outside.sql (public.regions,
// public.cities, public.boroughs), so ids match on both data sources.
//
// Outhere launches UK-wide. The ten biggest cities have launch nights; every
// other place plays for its region until it has 100 active members, then it
// plays as itself (isLive). London plays borough against borough; every other
// city plays by area. Areas carry a spot on the hex map (col, row).

export const ACTIVE_TO_GO_LIVE = 100;

export const UK_REGIONS = [
  { id: "london", name: "London", nation: "England" },
  { id: "south-east", name: "South East", nation: "England" },
  { id: "south-west", name: "South West", nation: "England" },
  { id: "east-of-england", name: "East of England", nation: "England" },
  { id: "west-midlands", name: "West Midlands", nation: "England" },
  { id: "east-midlands", name: "East Midlands", nation: "England" },
  { id: "yorkshire", name: "Yorkshire", nation: "England" },
  { id: "north-west", name: "North West", nation: "England" },
  { id: "north-east", name: "North East", nation: "England" },
  { id: "wales", name: "Wales", nation: "Wales" },
  { id: "scotland", name: "Scotland", nation: "Scotland" },
  { id: "northern-ireland", name: "Northern Ireland", nation: "Northern Ireland" },
];

const REGION_NAME = Object.fromEntries(UK_REGIONS.map((r) => [r.id, r.name]));

// [id, name, regionId, kind, lat, lng, launchNight, isLive]
const ROWS = [
  ["london", "London", "london", "city", 51.5074, -0.1278, true, true],
  ["birmingham", "Birmingham", "west-midlands", "city", 52.4862, -1.8904, true, false],
  ["manchester", "Manchester", "north-west", "city", 53.4808, -2.2426, true, false],
  ["glasgow", "Glasgow", "scotland", "city", 55.8642, -4.2518, true, false],
  ["leeds", "Leeds", "yorkshire", "city", 53.8008, -1.5491, true, false],
  ["liverpool", "Liverpool", "north-west", "city", 53.4084, -2.9916, true, false],
  ["bristol", "Bristol", "south-west", "city", 51.4545, -2.5879, true, false],
  ["sheffield", "Sheffield", "yorkshire", "city", 53.3811, -1.4701, true, false],
  ["edinburgh", "Edinburgh", "scotland", "city", 55.9533, -3.1883, true, false],
  ["newcastle", "Newcastle", "north-east", "city", 54.9783, -1.6178, true, false],
  // Other cities and big towns, each playing for its region until it has 100.
  ["nottingham", "Nottingham", "east-midlands", "city", 52.9548, -1.1581],
  ["leicester", "Leicester", "east-midlands", "city", 52.6369, -1.1398],
  ["derby", "Derby", "east-midlands", "city", 52.9225, -1.4746],
  ["lincoln", "Lincoln", "east-midlands", "city", 53.2307, -0.5406],
  ["northampton", "Northampton", "east-midlands", "town", 52.2405, -0.9027],
  ["coventry", "Coventry", "west-midlands", "city", 52.4068, -1.5197],
  ["wolverhampton", "Wolverhampton", "west-midlands", "city", 52.5862, -2.1288],
  ["stoke", "Stoke-on-Trent", "west-midlands", "city", 53.0027, -2.1794],
  ["worcester", "Worcester", "west-midlands", "city", 52.192, -2.22],
  ["hereford", "Hereford", "west-midlands", "city", 52.0565, -2.716],
  ["shrewsbury", "Shrewsbury", "west-midlands", "town", 52.7073, -2.7553],
  ["telford", "Telford", "west-midlands", "town", 52.6766, -2.4469],
  ["bradford", "Bradford", "yorkshire", "city", 53.796, -1.7594],
  ["hull", "Hull", "yorkshire", "city", 53.7676, -0.3274],
  ["york", "York", "yorkshire", "city", 53.96, -1.0873],
  ["wakefield", "Wakefield", "yorkshire", "city", 53.6833, -1.4977],
  ["huddersfield", "Huddersfield", "yorkshire", "town", 53.6458, -1.785],
  ["harrogate", "Harrogate", "yorkshire", "town", 53.9921, -1.5418],
  ["preston", "Preston", "north-west", "city", 53.7632, -2.7031],
  ["blackpool", "Blackpool", "north-west", "town", 53.8175, -3.0357],
  ["bolton", "Bolton", "north-west", "town", 53.5769, -2.4282],
  ["stockport", "Stockport", "north-west", "town", 53.4106, -2.1575],
  ["warrington", "Warrington", "north-west", "town", 53.39, -2.597],
  ["chester", "Chester", "north-west", "city", 53.1934, -2.8931],
  ["lancaster", "Lancaster", "north-west", "city", 54.0466, -2.8007],
  ["carlisle", "Carlisle", "north-west", "city", 54.8925, -2.9329],
  ["sunderland", "Sunderland", "north-east", "city", 54.9069, -1.3838],
  ["middlesbrough", "Middlesbrough", "north-east", "town", 54.5742, -1.235],
  ["durham", "Durham", "north-east", "city", 54.7761, -1.5733],
  ["brighton", "Brighton", "south-east", "city", 50.8225, -0.1372],
  ["southampton", "Southampton", "south-east", "city", 50.9097, -1.4044],
  ["portsmouth", "Portsmouth", "south-east", "city", 50.8198, -1.088],
  ["reading", "Reading", "south-east", "town", 51.4543, -0.9781],
  ["oxford", "Oxford", "south-east", "city", 51.752, -1.2577],
  ["milton-keynes", "Milton Keynes", "south-east", "city", 52.0406, -0.7594],
  ["canterbury", "Canterbury", "south-east", "city", 51.2802, 1.0789],
  ["guildford", "Guildford", "south-east", "town", 51.2362, -0.5704],
  ["maidstone", "Maidstone", "south-east", "town", 51.272, 0.529],
  ["slough", "Slough", "south-east", "town", 51.5105, -0.595],
  ["plymouth", "Plymouth", "south-west", "city", 50.3755, -4.1427],
  ["exeter", "Exeter", "south-west", "city", 50.7184, -3.5339],
  ["bath", "Bath", "south-west", "city", 51.3811, -2.359],
  ["gloucester", "Gloucester", "south-west", "city", 51.8642, -2.2382],
  ["cheltenham", "Cheltenham", "south-west", "town", 51.8994, -2.0783],
  ["swindon", "Swindon", "south-west", "town", 51.5558, -1.7797],
  ["bournemouth", "Bournemouth", "south-west", "town", 50.7192, -1.8808],
  ["truro", "Truro", "south-west", "city", 50.2632, -5.051],
  ["cambridge", "Cambridge", "east-of-england", "city", 52.2053, 0.1218],
  ["norwich", "Norwich", "east-of-england", "city", 52.6309, 1.2974],
  ["ipswich", "Ipswich", "east-of-england", "town", 52.0567, 1.1482],
  ["peterborough", "Peterborough", "east-of-england", "city", 52.5695, -0.2405],
  ["luton", "Luton", "east-of-england", "town", 51.8787, -0.42],
  ["chelmsford", "Chelmsford", "east-of-england", "city", 51.7356, 0.4685],
  ["colchester", "Colchester", "east-of-england", "city", 51.8959, 0.8919],
  ["southend", "Southend-on-Sea", "east-of-england", "city", 51.5459, 0.7077],
  ["watford", "Watford", "east-of-england", "town", 51.6565, -0.3903],
  ["aberdeen", "Aberdeen", "scotland", "city", 57.1497, -2.0943],
  ["dundee", "Dundee", "scotland", "city", 56.462, -2.9707],
  ["inverness", "Inverness", "scotland", "city", 57.4778, -4.2247],
  ["stirling", "Stirling", "scotland", "city", 56.1165, -3.9369],
  ["perth", "Perth", "scotland", "city", 56.395, -3.4308],
  ["cardiff", "Cardiff", "wales", "city", 51.4816, -3.1791],
  ["swansea", "Swansea", "wales", "city", 51.6214, -3.9436],
  ["newport", "Newport", "wales", "city", 51.5842, -2.9977],
  ["wrexham", "Wrexham", "wales", "city", 53.0466, -2.993],
  ["bangor", "Bangor", "wales", "city", 53.2274, -4.1293],
  ["belfast", "Belfast", "northern-ireland", "city", 54.5973, -5.9301],
  ["derry", "Derry", "northern-ireland", "city", 54.9966, -7.3086],
  ["lisburn", "Lisburn", "northern-ireland", "city", 54.5162, -6.058],
  ["newry", "Newry", "northern-ireland", "city", 54.1751, -6.3402],
];

export const UK_CITIES = ROWS.map(([id, name, regionId, kind, lat, lng, launchNight = false, isLive = false]) => ({
  id,
  name,
  regionId,
  region: REGION_NAME[regionId],
  kind,
  lat,
  lng,
  isLive,
  launchNight,
}));

export const LAUNCH_CITIES = UK_CITIES.filter((c) => c.launchNight);

// London's 32 boroughs and the City, placed on the hex map as the website's
// tile map has them. kind "borough".
const LONDON = [
  ["enfield", "Enfield", 4, 0], ["harrow", "Harrow", 2, 1], ["barnet", "Barnet", 3, 1], ["haringey", "Haringey", 4, 1],
  ["waltham-forest", "Waltham Forest", 5, 1], ["hillingdon", "Hillingdon", 0, 2], ["ealing", "Ealing", 1, 2], ["brent", "Brent", 2, 2],
  ["camden", "Camden", 3, 2], ["islington", "Islington", 4, 2], ["hackney", "Hackney", 5, 2], ["redbridge", "Redbridge", 6, 2],
  ["havering", "Havering", 7, 2], ["hounslow", "Hounslow", 0, 3], ["hammersmith-fulham", "Hammersmith and Fulham", 1, 3],
  ["kensington-chelsea", "Kensington and Chelsea", 2, 3], ["westminster", "Westminster", 3, 3], ["city-of-london", "City of London", 4, 3],
  ["tower-hamlets", "Tower Hamlets", 5, 3], ["newham", "Newham", 6, 3], ["barking-dagenham", "Barking and Dagenham", 7, 3],
  ["richmond", "Richmond upon Thames", 1, 4], ["wandsworth", "Wandsworth", 2, 4], ["lambeth", "Lambeth", 3, 4], ["southwark", "Southwark", 4, 4],
  ["lewisham", "Lewisham", 5, 4], ["greenwich", "Greenwich", 6, 4], ["bexley", "Bexley", 7, 4], ["kingston", "Kingston upon Thames", 2, 5],
  ["merton", "Merton", 3, 5], ["croydon", "Croydon", 4, 5], ["bromley", "Bromley", 5, 5], ["sutton", "Sutton", 3, 6],
];

// Twelve areas for each other launch city, laid out roughly north to south
// on a 5 by 4 hex grid.
const CITY_AREAS = {
  birmingham: ["Sutton Coldfield", "Erdington", "Handsworth", "Jewellery Quarter", "Aston", "Edgbaston", "Digbeth", "Small Heath", "Harborne", "Moseley", "Selly Oak", "Kings Heath"],
  manchester: ["Prestwich", "Cheetham Hill", "Salford Quays", "Ancoats", "Northern Quarter", "Castlefield", "Hulme", "Moss Side", "Chorlton", "Fallowfield", "Levenshulme", "Didsbury"],
  glasgow: ["Maryhill", "Springburn", "Partick", "West End", "Finnieston", "Merchant City", "Dennistoun", "Govan", "Gorbals", "Pollokshields", "Shawlands", "Cathcart"],
  leeds: ["Horsforth", "Roundhay", "Headingley", "Meanwood", "Chapel Allerton", "Kirkstall", "Hyde Park", "City Centre", "Harehills", "Armley", "Holbeck", "Hunslet"],
  liverpool: ["Crosby", "Anfield", "Everton", "Kensington", "Georgian Quarter", "City Centre", "Baltic Triangle", "Wavertree", "Toxteth", "Aigburth", "Allerton", "Woolton"],
  bristol: ["Henleaze", "Horfield", "Redland", "Bishopston", "Clifton", "Stokes Croft", "St Pauls", "Easton", "Harbourside", "Southville", "Bedminster", "Totterdown"],
  sheffield: ["Hillsborough", "Walkley", "Crookes", "Kelham Island", "Broomhill", "City Centre", "Darnall", "Sharrow", "Ecclesall", "Nether Edge", "Heeley", "Fulwood"],
  edinburgh: ["Cramond", "Leith", "Stockbridge", "New Town", "Portobello", "Corstorphine", "Old Town", "Gorgie", "Marchmont", "Bruntsfield", "Newington", "Morningside"],
  newcastle: ["Gosforth", "Kenton", "Jesmond", "Heaton", "Fenham", "Sandyford", "Ouseburn", "Byker", "Benwell", "Elswick", "Quayside", "Walker"],
};
const GRID = [[1, 0], [3, 0], [0, 1], [2, 1], [4, 1], [1, 2], [3, 2], [0, 3], [2, 3], [4, 3], [1, 4], [3, 4]];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const UK_AREAS = [
  ...LONDON.map(([id, name, col, row]) => ({ id, name, cityId: "london", kind: "borough", col, row })),
  ...Object.entries(CITY_AREAS).flatMap(([cityId, names]) =>
    names.map((name, i) => ({ id: `${cityId}-${slug(name)}`, name, cityId, kind: "area", col: GRID[i][0], row: GRID[i][1] }))
  ),
];

export const cityById = (id) => UK_CITIES.find((c) => c.id === id) || null;
export const regionById = (id) => UK_REGIONS.find((r) => r.id === id) || null;
export const areaById = (id) => UK_AREAS.find((a) => a.id === id) || null;
export const areasOf = (cityId) => UK_AREAS.filter((a) => a.cityId === cityId);

// A city or area from a name or id, forgiving about case and spacing.
export const findCity = (nameOrId) => {
  if (!nameOrId) return null;
  const key = slug(String(nameOrId));
  return UK_CITIES.find((c) => c.id === key || slug(c.name) === key) || null;
};
export const findArea = (cityId, nameOrId) => {
  if (!nameOrId) return null;
  const key = slug(String(nameOrId));
  return UK_AREAS.find((a) => (!cityId || a.cityId === cityId) && (a.id === key || slug(a.name) === key || a.id === `${cityId}-${key}`)) || null;
};

const toRad = (d) => (d * Math.PI) / 180;
export const distanceKm = (lat1, lng1, lat2, lng2) => {
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
};

// Cities and towns, nearest first when a position is given, else by name.
export const sortCities = (list, { query = "", lat, lng } = {}) => {
  const q = query.trim().toLowerCase();
  const hit = q ? list.filter((c) => c.name.toLowerCase().includes(q) || (c.region || "").toLowerCase().includes(q)) : list;
  if (lat != null && lng != null) {
    return hit
      .map((c) => ({ ...c, distanceKm: c.lat != null ? Math.round(distanceKm(lat, lng, c.lat, c.lng) * 10) / 10 : null }))
      .sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));
  }
  return [...hit].sort((a, b) => a.name.localeCompare(b.name));
};

// The City League: each side plays in the division its active walkers fill.
export const DIVISIONS = [
  { key: "premier", name: "Premier", squad: 500 },
  { key: "championship", name: "Championship", squad: 250 },
  { key: "league-one", name: "League One", squad: 100 },
];
export const divisionFor = (active) => (active >= 500 ? DIVISIONS[0] : active >= 250 ? DIVISIONS[1] : active >= ACTIVE_TO_GO_LIVE ? DIVISIONS[2] : null);
