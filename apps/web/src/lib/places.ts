/**
 * Where people move. Outhere launches UK-wide: anyone can join on day one,
 * launch nights run in the ten biggest cities, and everywhere else plays for
 * its region until it has 100 active players.
 */
import { type Borough, isBorough, shortName } from './boroughs';

/** The launch cities, biggest first. Ids match public.cities in supabase/seed.sql. */
export const CITIES = [
  { id: 'london', name: 'London', region: 'London', lat: 51.5074, lng: -0.1278 },
  { id: 'manchester', name: 'Manchester', region: 'North West', lat: 53.4808, lng: -2.2426 },
  { id: 'birmingham', name: 'Birmingham', region: 'West Midlands', lat: 52.4862, lng: -1.8904 },
  { id: 'leeds', name: 'Leeds', region: 'Yorkshire', lat: 53.8008, lng: -1.5491 },
  { id: 'glasgow', name: 'Glasgow', region: 'Scotland', lat: 55.8642, lng: -4.2518 },
  { id: 'liverpool', name: 'Liverpool', region: 'North West', lat: 53.4084, lng: -2.9916 },
  { id: 'newcastle', name: 'Newcastle', region: 'North East', lat: 54.9783, lng: -1.6178 },
  { id: 'nottingham', name: 'Nottingham', region: 'East Midlands', lat: 52.9548, lng: -1.1581 },
  { id: 'sheffield', name: 'Sheffield', region: 'Yorkshire', lat: 53.3811, lng: -1.4701 },
  { id: 'bristol', name: 'Bristol', region: 'South West', lat: 51.4545, lng: -2.5879 },
] as const;

export type City = (typeof CITIES)[number];
export type CityId = City['id'];

/** The UK's nations and regions outside London. Towns beyond the launch cities play for one of these. */
export const REGIONS = [
  'South East', 'South West', 'East of England', 'West Midlands', 'East Midlands',
  'Yorkshire', 'North West', 'North East', 'Wales', 'Scotland', 'Northern Ireland',
] as const;
export type Region = (typeof REGIONS)[number];

/** "the North East", "Wales" or "Scotland", for use in a sentence. */
export const theRegion = (r: Region | '') => (!r ? 'your region' : /^(North|South|East|West)/.test(r) ? 'the ' + r : r);

/** A town gets its own team once this many people there are active. */
export const TEAM_AT = 100;

export const ELSEWHERE = 'elsewhere';
export type Place =
  | { city: 'london'; borough: Borough }
  | { city: Exclude<CityId, 'london'> }
  | { city: typeof ELSEWHERE; town: string; region: Region | '' };

export const DEFAULT_PLACE: Place = { city: 'london', borough: 'Southwark' };

export const cityById = (id: string): City | undefined => CITIES.find((c) => c.id === id);
export const isCityId = (id: unknown): id is CityId => typeof id === 'string' && !!cityById(id);
export const isRegion = (r: unknown): r is Region => typeof r === 'string' && (REGIONS as readonly string[]).includes(r);

/** "Hackney, London", "Glasgow" or "Hexham, North East". */
export function placeLabel(p: Place): string {
  if (p.city === 'london') return `${p.borough}, London`;
  if (p.city === ELSEWHERE) return p.region ? `${p.town}, ${p.region}` : p.town;
  return cityById(p.city)!.name;
}

/** The shortest name that still reads well in tight spaces. */
export function placeShort(p: Place): string {
  if (p.city === 'london') return shortName(p.borough);
  if (p.city === ELSEWHERE) return p.town;
  return cityById(p.city)!.name;
}

/** Reads a place saved by an older version of the site (London boroughs only) or by this one. */
export function readPlace(v: unknown): Place | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (o.city === 'london' && isBorough(o.borough)) return { city: 'london', borough: o.borough };
  if (o.city === ELSEWHERE && typeof o.town === 'string' && o.town && isRegion(o.region)) return { city: ELSEWHERE, town: o.town, region: o.region };
  if (isCityId(o.city) && o.city !== 'london') return { city: o.city };
  return null;
}

/** Example run clubs shown until real clubs claim their crews. */
export const EXAMPLE_CLUBS: { name: string; place: Place; members: number; claimed: boolean; listed?: false }[] = [
  { name: 'Bermondsey Night Runners', place: { city: 'london', borough: 'Southwark' }, members: 46, claimed: true },
  { name: 'Peckham Pacers', place: { city: 'london', borough: 'Southwark' }, members: 72, claimed: true },
  { name: 'Camberwell Green Milers', place: { city: 'london', borough: 'Southwark' }, members: 31, claimed: false, listed: false },
  { name: 'Hackney Marshes Run Club', place: { city: 'london', borough: 'Hackney' }, members: 120, claimed: false },
  { name: 'London Fields Late Lap', place: { city: 'london', borough: 'Hackney' }, members: 38, claimed: false, listed: false },
  { name: 'Brixton Lights', place: { city: 'london', borough: 'Lambeth' }, members: 58, claimed: false },
  { name: 'Clapham Common Sunrise', place: { city: 'london', borough: 'Lambeth' }, members: 88, claimed: true },
  { name: 'Canary Wharf Lunch Club', place: { city: 'london', borough: 'Tower Hamlets' }, members: 34, claimed: false },
  { name: 'Walthamstow Wetlands Runners', place: { city: 'london', borough: 'Waltham Forest' }, members: 41, claimed: true },
  { name: 'Crystal Palace Hill Club', place: { city: 'london', borough: 'Bromley' }, members: 27, claimed: false },
  { name: 'Greenwich Park Striders', place: { city: 'london', borough: 'Greenwich' }, members: 63, claimed: false },
  { name: 'Finsbury Park Social', place: { city: 'london', borough: 'Haringey' }, members: 95, claimed: false },
  { name: 'Ealing Early Miles', place: { city: 'london', borough: 'Ealing' }, members: 22, claimed: false },
  { name: 'Wimbledon Common Trail', place: { city: 'london', borough: 'Merton' }, members: 49, claimed: true },
  { name: 'Ancoats Canal Milers', place: { city: 'manchester' }, members: 84, claimed: true },
  { name: 'Northern Quarter Night Owls', place: { city: 'manchester' }, members: 52, claimed: false },
  { name: 'Digbeth Night Shift', place: { city: 'birmingham' }, members: 47, claimed: false },
  { name: 'Kelvin Walkway Runners', place: { city: 'glasgow' }, members: 66, claimed: true },
  { name: 'Headingley Hill Club', place: { city: 'leeds' }, members: 35, claimed: false },
  { name: 'Ouseburn Valley Striders', place: { city: 'newcastle' }, members: 29, claimed: false },
  { name: 'Harbourside Late Lap', place: { city: 'bristol' }, members: 58, claimed: true },
  { name: 'Hexham Abbey Joggers', place: { city: ELSEWHERE, town: 'Hexham', region: 'North East' }, members: 18, claimed: false },
];

/** The map box: longitude -8.2 to 1.8 and latitude 49.85 to 58.75, which fits the UK in a 2:3 frame. */
const W = 10, H = 8.9, LNG0 = -8.2, LAT0 = 58.75;

/** Projects a point onto the UK map, as percentages of a 2:3 box. */
export function mapPoint(lat: number, lng: number): [number, number] {
  const x = ((lng - LNG0) / W) * 100;
  const y = ((LAT0 - lat) / H) * 100;
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

/** A simplified coastline, [longitude, latitude], good enough for a dot map. */
const GREAT_BRITAIN: [number, number][] = [
  [-5.7, 50.06], [-5.2, 49.96], [-4.14, 50.36], [-3.64, 50.22], [-3.4, 50.62], [-2.45, 50.56], [-1.95, 50.68], [-1.3, 50.77],
  [-0.79, 50.72], [-0.14, 50.81], [0.25, 50.74], [0.97, 50.91], [1.38, 51.14], [1.44, 51.38], [0.6, 51.46], [0.9, 51.6],
  [1.15, 51.79], [1.35, 51.95], [1.75, 52.48], [1.73, 52.62], [1.3, 52.94], [0.5, 52.96], [0.2, 52.8], [0.34, 53.14],
  [0.12, 53.58], [-0.08, 54.12], [-0.4, 54.28], [-0.61, 54.49], [-1.2, 54.69], [-1.37, 54.9], [-1.42, 55.02], [-1.6, 55.4],
  [-2.0, 55.77], [-2.13, 55.9], [-2.5, 56.0], [-3.2, 55.98], [-2.58, 56.28], [-2.9, 56.46], [-2.46, 56.71], [-2.08, 57.15],
  [-1.78, 57.5], [-2.0, 57.69], [-3.0, 57.68], [-3.5, 57.7], [-4.2, 57.5], [-3.77, 57.86], [-4.0, 58.0], [-3.09, 58.44],
  [-3.03, 58.64], [-3.37, 58.67], [-3.5, 58.6], [-4.4, 58.53], [-4.75, 58.57], [-5.0, 58.62], [-5.3, 58.3], [-5.25, 58.15],
  [-5.35, 57.85], [-5.7, 57.85], [-5.8, 57.45], [-5.7, 57.28], [-5.83, 57.0], [-6.2, 56.72], [-5.7, 56.55], [-5.47, 56.41],
  [-5.6, 56.1], [-5.7, 55.8], [-5.8, 55.3], [-5.5, 55.6], [-5.3, 55.9], [-4.9, 55.95], [-4.85, 55.75], [-4.63, 55.46],
  [-4.86, 55.24], [-4.86, 54.64], [-4.05, 54.83], [-3.4, 54.95], [-3.64, 54.49], [-3.23, 54.1], [-3.05, 53.82], [-3.05, 53.42],
  [-3.4, 53.34], [-4.1, 53.3], [-4.6, 53.3], [-4.3, 53.1], [-4.75, 52.8], [-4.4, 52.88], [-4.1, 52.9], [-4.05, 52.55],
  [-4.08, 52.41], [-4.65, 52.1], [-5.3, 51.88], [-5.05, 51.68], [-4.7, 51.67], [-3.95, 51.6], [-3.17, 51.47], [-2.7, 51.6],
  [-3.0, 51.35], [-3.48, 51.21], [-4.52, 51.02], [-4.94, 50.54],
];
const NORTHERN_IRELAND: [number, number][] = [
  [-5.45, 54.4], [-5.55, 54.65], [-5.85, 54.7], [-5.75, 54.85], [-6.0, 55.05], [-6.15, 55.22], [-6.5, 55.25], [-6.95, 55.2],
  [-7.25, 55.1], [-7.45, 55.0], [-7.55, 54.75], [-7.9, 54.7], [-8.15, 54.45], [-7.85, 54.3], [-7.6, 54.15], [-7.2, 54.25],
  [-6.9, 54.05], [-6.6, 54.05], [-6.3, 54.1], [-6.1, 54.0], [-5.85, 54.2], [-5.55, 54.25],
];
/** The bigger islands, so Scotland reads as Scotland. */
const ISLANDS: [number, number][][] = [
  [[-6.2, 58.5], [-6.9, 58.3], [-7.1, 57.95], [-7.3, 57.6], [-7.5, 57.1], [-7.4, 56.8], [-7.2, 56.95], [-6.9, 57.6], [-6.6, 57.9], [-6.15, 58.2]],
  [[-5.65, 57.25], [-6.1, 57.0], [-6.6, 57.4], [-6.35, 57.7], [-5.95, 57.55]],
  [[-5.65, 56.45], [-6.35, 56.3], [-6.1, 56.6]],
  [[-6.0, 55.65], [-6.5, 55.7], [-6.3, 55.95], [-6.05, 55.9]],
];

/** The coastline as an SVG path in a 200 by 300 viewBox. */
export const UK_PATH = [GREAT_BRITAIN, NORTHERN_IRELAND, ...ISLANDS]
  .map((poly) => 'M' + poly.map(([lng, lat]) => mapPoint(lat, lng).map((v, i) => +(v * (i ? 3 : 2)).toFixed(1)).join(' ')).join('L') + 'Z')
  .join('');
