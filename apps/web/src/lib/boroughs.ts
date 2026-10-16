/** The 32 London boroughs, their URL slugs and their place on the tile map. */
export const BOROUGHS = [
  'Barking and Dagenham', 'Barnet', 'Bexley', 'Brent', 'Bromley', 'Camden', 'Croydon', 'Ealing',
  'Enfield', 'Greenwich', 'Hackney', 'Hammersmith and Fulham', 'Haringey', 'Harrow', 'Havering',
  'Hillingdon', 'Hounslow', 'Islington', 'Kensington and Chelsea', 'Kingston upon Thames', 'Lambeth',
  'Lewisham', 'Merton', 'Newham', 'Redbridge', 'Richmond upon Thames', 'Southwark', 'Sutton',
  'Tower Hamlets', 'Waltham Forest', 'Wandsworth', 'Westminster',
] as const;

export type Borough = (typeof BOROUGHS)[number];

export const DEFAULT_BOROUGH: Borough = 'Southwark';


/** URL slug, which is also the borough's id in the Outhere database (supabase/seed.sql). */
const SLUG_OVERRIDES: Record<string, string> = { 'Richmond upon Thames': 'richmond', 'Kingston upon Thames': 'kingston' };
export const slug = (b: string) => SLUG_OVERRIDES[b] ?? b.toLowerCase().replace(/ and /g, '-').replace(/[^a-z]+/g, '-');

const BY_SLUG = Object.fromEntries(BOROUGHS.map((b) => [slug(b), b])) as Record<string, Borough>;
export const boroughFromSlug = (s: string): Borough | undefined => BY_SLUG[s];
export const isBorough = (b: unknown): b is Borough => typeof b === 'string' && (BOROUGHS as readonly string[]).includes(b);

/** First word of a borough name, for tight spaces ("Join the Tower list" reads oddly, so two-word names keep both). */
export const shortName = (b: string) => b.split(' ')[0];

/** [column, row, name, code] on a 9 by 6 grid. */
export const MAP: [number, number, Borough, string][] = [
  [3, 0, 'Barnet', 'BNT'], [4, 0, 'Haringey', 'HGY'], [5, 0, 'Enfield', 'ENF'],
  [1, 1, 'Harrow', 'HRW'], [2, 1, 'Brent', 'BRN'], [3, 1, 'Camden', 'CMD'], [4, 1, 'Islington', 'ISL'], [5, 1, 'Hackney', 'HCK'],
  [6, 1, 'Waltham Forest', 'WFR'], [7, 1, 'Redbridge', 'RDB'], [8, 1, 'Havering', 'HAV'],
  [0, 2, 'Hillingdon', 'HDN'], [1, 2, 'Ealing', 'EAL'], [2, 2, 'Hammersmith and Fulham', 'HMS'], [3, 2, 'Kensington and Chelsea', 'KNS'],
  [4, 2, 'Westminster', 'WST'], [5, 2, 'Tower Hamlets', 'TOW'], [6, 2, 'Newham', 'NWM'], [7, 2, 'Barking and Dagenham', 'BKD'],
  [1, 3, 'Hounslow', 'HNS'], [2, 3, 'Richmond upon Thames', 'RCH'], [3, 3, 'Wandsworth', 'WNS'], [4, 3, 'Lambeth', 'LAM'],
  [5, 3, 'Southwark', 'SWK'], [6, 3, 'Lewisham', 'LSH'], [7, 3, 'Greenwich', 'GRN'], [8, 3, 'Bexley', 'BXL'],
  [2, 4, 'Kingston upon Thames', 'KNG'], [3, 4, 'Merton', 'MRT'], [4, 4, 'Croydon', 'CRD'], [5, 4, 'Bromley', 'BRM'], [4, 5, 'Sutton', 'STN'],
];

export const initials = (n: string) => n.split(' ').slice(0, 2).map((w) => w[0]).join('');
