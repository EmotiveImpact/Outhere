import { describe, expect, it } from 'vitest';
import { DEMO_STATS, demoCount, joinWaitlist } from '../src/lib/api';
import { BOROUGHS, boroughFromSlug, MAP, slug } from '../src/lib/boroughs';
import { validEmail } from '../src/lib/format';
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
  it('keeps the prototype figures', () => {
    expect(DEMO_STATS.total).toBe(4213);
    expect(demoCount('Southwark')).toBe(DEMO_STATS.boroughs.Southwark);
    for (const b of BOROUGHS) expect(DEMO_STATS.boroughs[b]).toBeGreaterThanOrEqual(60);
  });
  it('simulates a sign-up without a database', async () => {
    const r = await joinWaitlist({ email: 'amara@example.com', borough: 'Southwark', move: 'Run', club: '', ref: '', invite: false });
    expect(r.position).toBe(4214);
    expect(r.code).toMatch(/^AMARA\d+$/);
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
