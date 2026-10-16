// Seed data for Move and runs on the local engine: crew and popular routes
// that are drawn as loops around wherever the member first opens the map, so
// suggestions work in any town, and rough city centres for when the phone
// hasn't given a location yet.

// scope: "crew" routes come from your club, "popular" from people near you.
export const ROUTE_TEMPLATES = [
  { key: "riverside", name: "Riverside Loop", km: 4.9, note: "flat · well lit", scope: "popular", tag: "Popular tonight", runners: 38 },
  { key: "bridges", name: "Bridges at Night", km: 5.2, note: "2 bridges · lit", scope: "crew", tag: "Crew route", runners: 21 },
  { key: "canal", name: "Canal Chill", km: 3.1, note: "towpath · quiet", scope: "popular", tag: "Popular tonight", runners: 26 },
  { key: "park", name: "Park Perimeter", km: 3.4, note: "gravel · lights till 10", scope: "crew", tag: "Crew route", runners: 17 },
  { key: "hills", name: "Hill Repeats", km: 6.2, note: "hilly · 60 m climb", scope: "popular", tag: "Popular this week", runners: 12 },
  { key: "oldtown", name: "Old Town Ten", km: 10.1, note: "mixed · busy at lunch", scope: "popular", tag: "Popular on Sundays", runners: 31 },
  { key: "sprint", name: "Central Sprint", km: 5.1, note: "flat · fast", scope: "crew", tag: "Crew route", runners: 14 },
  { key: "dawn", name: "Before Work", km: 8.2, note: "quiet early · lit", scope: "popular", tag: "Popular mornings", runners: 19 },
];

// Name ideas offered on the save route sheet.
export const ROUTE_NAME_IDEAS = ["Morning Loop", "Bridges at Dawn", "Before Work", "Lunch Lap", "Night Lights", "The Long Way Home", "Sunday Ten", "Park Laps"];

// Used only until the phone reports a location.
export const CITY_CENTRES = {
  London: { latitude: 51.5045, longitude: -0.1005 },
  Manchester: { latitude: 53.4794, longitude: -2.2453 },
  Birmingham: { latitude: 52.4797, longitude: -1.9027 },
  Leeds: { latitude: 53.7997, longitude: -1.5492 },
  Liverpool: { latitude: 53.4084, longitude: -2.9916 },
  Bristol: { latitude: 51.4545, longitude: -2.5879 },
  Glasgow: { latitude: 55.8609, longitude: -4.2514 },
  Edinburgh: { latitude: 55.9533, longitude: -3.1883 },
  Cardiff: { latitude: 51.4816, longitude: -3.1791 },
  Newcastle: { latitude: 54.9783, longitude: -1.6178 },
  Sheffield: { latitude: 53.3811, longitude: -1.4701 },
  Nottingham: { latitude: 52.9548, longitude: -1.1581 },
  Belfast: { latitude: 54.5973, longitude: -5.9301 },
};
export const centreFor = (city) => CITY_CENTRES[city] || CITY_CENTRES.London;
