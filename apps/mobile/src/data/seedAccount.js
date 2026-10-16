// Stand-in places for the local engine's patch picker, in the same shape as
// the UK places seed (src/data/places.js: UK_CITIES, UK_AREAS) built by the
// Outside and cities area. It mirrors supabase/seed.sql plus a few towns so
// the "plays for its region" case shows. When places.js lands, account.js
// imports UK_CITIES and UK_AREAS from there instead and this file goes.

const city = (id, name, region, lat, lng, isLive, kind = "city") => ({
  id,
  name,
  regionId: region.toLowerCase().replace(/\s+/g, "-"),
  region,
  kind,
  lat,
  lng,
  isLive,
  launchNight: null,
});

export const UK_CITIES = [
  city("london", "London", "London", 51.5074, -0.1278, true),
  city("manchester", "Manchester", "North West", 53.4808, -2.2426, true),
  city("birmingham", "Birmingham", "West Midlands", 52.4862, -1.8904, true),
  city("leeds", "Leeds", "Yorkshire", 53.8008, -1.5491, true),
  city("liverpool", "Liverpool", "North West", 53.4084, -2.9916, true),
  city("bristol", "Bristol", "South West", 51.4545, -2.5879, true),
  city("sheffield", "Sheffield", "Yorkshire", 53.3811, -1.4701, true),
  city("newcastle", "Newcastle", "North East", 54.9783, -1.6178, true),
  city("glasgow", "Glasgow", "Scotland", 55.8642, -4.2518, true),
  city("cardiff", "Cardiff", "Wales", 51.4816, -3.1791, true),
  city("nottingham", "Nottingham", "East Midlands", 52.9548, -1.1581, false),
  city("edinburgh", "Edinburgh", "Scotland", 55.9533, -3.1883, false),
  city("margate", "Margate", "South East", 51.3813, 1.3862, false, "town"),
  city("hebden-bridge", "Hebden Bridge", "Yorkshire", 53.7417, -2.0136, false, "town"),
  city("aberystwyth", "Aberystwyth", "Wales", 52.4153, -4.0829, false, "town"),
];

const area = (cityId) => (name) => ({ id: `${cityId}-${name.toLowerCase().replace(/[^a-z]+/g, "-")}`.replace(/-$/, ""), name, cityId });

export const UK_AREAS = [
  ...["Southwark", "Hackney", "Lambeth", "Camden", "Islington", "Tower Hamlets", "Lewisham", "Greenwich", "Wandsworth", "Westminster", "Newham", "Haringey", "Waltham Forest", "Brent", "Ealing", "Croydon", "Bromley", "Barnet", "Enfield", "Harrow", "Hillingdon", "Hounslow", "Hammersmith and Fulham", "Kensington and Chelsea", "City of London", "Redbridge", "Havering", "Barking and Dagenham", "Bexley", "Richmond upon Thames", "Kingston upon Thames", "Merton", "Sutton"].map(area("london")),
  ...["City Centre", "Ancoats", "Moss Side", "Didsbury", "Chorlton", "Salford Quays"].map(area("manchester")),
  ...["City Centre", "Digbeth", "Handsworth", "Moseley", "Edgbaston"].map(area("birmingham")),
  ...["City Centre", "Headingley", "Roundhay", "Chapel Allerton"].map(area("leeds")),
  ...["City Centre", "Toxteth", "Anfield", "Sefton Park"].map(area("liverpool")),
  ...["Harbourside", "St Pauls", "Clifton", "Bedminster"].map(area("bristol")),
  ...["City Centre", "Kelham Island", "Ecclesall"].map(area("sheffield")),
  ...["Quayside", "Jesmond", "Heaton"].map(area("newcastle")),
  ...["City Centre", "West End", "Southside"].map(area("glasgow")),
  ...["City Centre", "Cathays", "Bay"].map(area("cardiff")),
];
