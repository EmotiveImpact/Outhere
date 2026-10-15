import { describe, expect, it } from 'vitest';
import { addTo, DEMO_STATS, demoCount, joinWaitlist, placeCount } from '../src/lib/api';
import { BOROUGHS, boroughFromSlug, MAP, slug } from '../src/lib/boroughs';
import { validEmail } from '../src/lib/format';
import { CITIES, EXAMPLE_CLUBS, mapPoint, placeLabel, readPlace, REGIONS, theRegion, UK_PATH } from '../src/lib/places';
import { placeError } from '../src/lib/validate';
import { matchRoute, metaFor, ROUTES } from '../src/routes';

// Borough ids in the app database (supabase/seed.sql). The website must use the same ones.
const DB_IDS = ['enfield', 'harrow', 'barnet', 'haringey', 'waltham-forest', 'hillingdon', 'ealing', 'brent', 'camden', 'islington',
  'hackney', 'redbridge', 'havering', 'hounslow', 'hammersmith-fulham', 'kensington-chelsea', 'westminster', 'tower-hamlets',
  'newham', 'barking-dagenham', 'richmond', 'wandsworth', 'lambeth', 'southwark', 'lewisham', 'greenwich', 'bexley', 'kingston',
  'merton', 'croydon', 'bromley', 'sutton'];

describe('boroughs', () => {
  it('has all 32 London boroughs, each once on the map', () => {
    expect(BOROUGHS).toHaveLength(32);
    expect(new Set(MAP.map((m) => m[2])).size).toBe(32);
    expect(new Set(MAP.map((m) => `${m[0]},${m[1]}`)).size).toBe(32);
  });
  it('uses the database ids as URL slugs', () => {
    expect(BOROUGHS.map(slug).sort()).toEqual([...DB_IDS].sort());
    for (const b of BOROUGHS) expect(boroughFromSlug(slug(b))).toBe(b);
  });
});

describe('forms', () => {
  it('checks emails', () => {
    expect(validEmail('amara@example.com')).toBe(true);
    expect(validEmail('amara@example')).toBe(false);
    expect(validEmail(' a b@c.de')).toBe(false);
  });
});

describe('example mode', () => {
  it('keeps the prototype borough figures and adds up across the UK', () => {
    expect(demoCount('Southwark')).toBe(DEMO_STATS.boroughs.Southwark);
    for (const b of BOROUGHS) expect(DEMO_STATS.boroughs[b]).toBeGreaterThanOrEqual(60);
    const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
    expect(DEMO_STATS.cities.london).toBe(sum(DEMO_STATS.boroughs));
    expect(DEMO_STATS.total).toBe(sum(DEMO_STATS.cities) + sum(DEMO_STATS.regions));
  });
  it('simulates a sign-up without a database', async () => {
    const r = await joinWaitlist({ email: 'amara@example.com', place: { city: 'london', borough: 'Southwark' }, move: 'Run', club: '', ref: '', invite: false });
    expect(r.position).toBe(DEMO_STATS.total + 1);
    expect(r.placeCount).toBe(DEMO_STATS.boroughs.Southwark + 1);
    expect(r.code).toMatch(/^AMARA\d+$/);
  });
  it('counts a sign-up in the right place', () => {
    const s = addTo(DEMO_STATS, { city: 'london', borough: 'Hackney' });
    expect([s.total, s.cities.london, s.boroughs.Hackney]).toEqual([DEMO_STATS.total + 1, DEMO_STATS.cities.london + 1, DEMO_STATS.boroughs.Hackney + 1]);
    const t = addTo(DEMO_STATS, { city: 'elsewhere', town: 'Hexham', region: 'North East' });
    expect(placeCount(t, { city: 'elsewhere', town: 'Hexham', region: 'North East' })).toBe(DEMO_STATS.regions['North East'] + 1);
    expect(t.cities).toEqual(DEMO_STATS.cities);
  });
});

describe('places', () => {
  // City ids and regions in the app database (supabase/seed.sql).
  const DB_CITIES = ['london', 'manchester', 'birmingham', 'leeds', 'liverpool', 'bristol', 'sheffield', 'newcastle', 'nottingham', 'glasgow', 'edinburgh', 'cardiff'];
  it('has ten launch cities the database knows', () => {
    expect(CITIES).toHaveLength(10);
    for (const c of CITIES) expect(DB_CITIES).toContain(c.id);
    for (const c of CITIES) if (c.id !== 'london') expect(REGIONS).toContain(c.region);
  });
  it('puts every city inside the map', () => {
    for (const c of CITIES) for (const v of mapPoint(c.lat, c.lng)) { expect(v).toBeGreaterThan(0); expect(v).toBeLessThan(100); }
    expect(UK_PATH.match(/Z/g)).toHaveLength(6);
  });
  it('reads places saved by this site and refuses anything else', () => {
    expect(readPlace({ city: 'london', borough: 'Hackney' })).toEqual({ city: 'london', borough: 'Hackney' });
    expect(readPlace({ city: 'glasgow' })).toEqual({ city: 'glasgow' });
    expect(readPlace({ city: 'elsewhere', town: 'Truro', region: 'South West' })).toEqual({ city: 'elsewhere', town: 'Truro', region: 'South West' });
    expect(readPlace({ city: 'london', borough: 'Atlantis' })).toBeNull();
    expect(readPlace({ city: 'paris' })).toBeNull();
    expect(readPlace({ city: 'elsewhere', town: 'Truro', region: 'London' })).toBeNull();
  });
  it('asks for a town and region outside the launch cities', () => {
    expect(placeError({ city: 'leeds' })).toBe('');
    expect(placeError({ city: 'elsewhere', town: ' ', region: 'Wales' })).toMatch(/town/);
    expect(placeError({ city: 'elsewhere', town: 'Hay', region: '' })).toMatch(/region/);
    expect(placeLabel({ city: 'elsewhere', town: 'Hay', region: 'Wales' })).toBe('Hay, Wales');
    expect(theRegion('North East')).toBe('the North East');
    expect(theRegion('Scotland')).toBe('Scotland');
  });
  it('has example clubs outside London', () => {
    expect(EXAMPLE_CLUBS.filter((c) => c.place.city !== 'london').length).toBeGreaterThanOrEqual(5);
  });
});

describe('routes', () => {
  it('maps every URL to a page', () => {
    expect(matchRoute('/').page).toBe('home');
    expect(matchRoute('/crews/').page).toBe('crews');
    expect(matchRoute('/boroughs/richmond')).toMatchObject({ page: 'borough', borough: 'Richmond upon Thames' });
    expect(matchRoute('/i/AMARA12').page).toBe('home');
    expect(matchRoute('/boroughs/atlantis').page).toBe('notfound');
    expect(matchRoute('/peckham-pacers').page).toBe('notfound');
  });
  it('prerenders 37 pages plus the 404', () => {
    expect(ROUTES.filter((r) => r.page !== 'notfound')).toHaveLength(37);
  });
  it('gives every page its own title and canonical URL', () => {
    const real = ROUTES.filter((r) => r.page !== 'notfound' && r.path !== '/boroughs');
    const titles = new Set(real.map((r) => metaFor(r).title));
    expect(titles.size).toBe(real.length);
    expect(metaFor(matchRoute('/boroughs/hackney')).canonical).toBe('https://weouthere.app/boroughs/hackney');
  });
});

describe('club links', () => {
  // Unknown single-segment paths go to the member app as club pages, so no
  // club may ever get a slug the website already uses.
  it('reserves every top-level path the website serves', async () => {
    const { readdirSync } = await import('node:fs');
    const { isValidClubSlug } = await import('@outhere/core');
    const tops = new Set([...ROUTES.map((r) => r.path.split('/')[1]), ...readdirSync('public'), 'assets', 'i']);
    for (const t of tops) if (t) expect(isValidClubSlug(t), t).toBe(false);
  });
});
