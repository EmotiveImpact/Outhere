/**
 * Talks to Outhere's Supabase project through the public functions in the website
 * migration (supabase/migrations/20261015100900_website.sql),
 * using the anon key (safe to ship: the tables have row level security and no policies).
 * When the site is built without VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, every call
 * is simulated in the browser so the forms still work end to end, and figures are
 * labelled as examples.
 */
import { BOROUGHS, type Borough, slug } from './boroughs';
import { local } from './format';
import { CITIES, type CityId, ELSEWHERE, type Place, readPlace, REGIONS, type Region } from './places';
import type { BlackInput, ClaimInput, WaitlistInput } from './validate';

const URL_ = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const LIVE = !!(URL_ && KEY);

export type Stats = {
  total: number;
  /** People on the list in each launch city (London includes all its boroughs). */
  cities: Record<CityId, number>;
  boroughs: Record<Borough, number>;
  /** People on the list outside the launch cities, by the region they play for. */
  regions: Record<Region, number>;
  clubsClaimed: number;
  clubs: { name: string; place: Place }[];
  blackTaken: number;
};

export type JoinResult = { position: number; code: string; placeCount: number };
export type ClaimResult = { founding: number };

/* ---------- example figures, used whenever the site is not live ---------- */
export const demoCount = (b: string, base = 60, spread = 260) => {
  let h = 0;
  for (const c of b) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return base + (h % spread);
};
const demoBoroughs = Object.fromEntries(BOROUGHS.map((b) => [b, demoCount(b)])) as Record<Borough, number>;
const demoLondon = Object.values(demoBoroughs).reduce((a, b) => a + b, 0);
const demoCities = Object.fromEntries(CITIES.map((c, i) => [c.id, c.id === 'london' ? demoLondon : demoCount(c.id, 2600 - i * 180, 700)])) as Record<CityId, number>;
const demoRegions = Object.fromEntries(REGIONS.map((r) => [r, demoCount(r, 120, 640)])) as Record<Region, number>;
const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
export const DEMO_STATS: Stats = {
  total: sum(demoCities) + sum(demoRegions),
  cities: demoCities,
  boroughs: demoBoroughs,
  regions: demoRegions,
  clubsClaimed: 188,
  clubs: [],
  blackTaken: 212,
};
/** What a live build shows before the real figures arrive, so no example number ever flashes up. */
export const EMPTY_STATS: Stats = {
  total: 0,
  cities: Object.fromEntries(CITIES.map((c) => [c.id, 0])) as Record<CityId, number>,
  boroughs: Object.fromEntries(BOROUGHS.map((b) => [b, 0])) as Record<Borough, number>,
  regions: Object.fromEntries(REGIONS.map((r) => [r, 0])) as Record<Region, number>,
  clubsClaimed: 0,
  clubs: [],
  blackTaken: 0,
};

/** How many people share your spot on the list: your London borough, your launch city, or your region. */
export function placeCount(stats: Stats, p: Place): number {
  if (p.city === 'london') return stats.boroughs[p.borough];
  if (p.city === ELSEWHERE) return p.region ? stats.regions[p.region] : 0;
  return stats.cities[p.city];
}

/** Adds one person at a place, as the database would. */
export function addTo(stats: Stats, p: Place): Stats {
  const s = { ...stats, total: stats.total + 1 };
  if (p.city === ELSEWHERE) return p.region ? { ...s, regions: { ...s.regions, [p.region]: s.regions[p.region] + 1 } } : s;
  s.cities = { ...s.cities, [p.city]: s.cities[p.city] + 1 };
  if (p.city === 'london') s.boroughs = { ...s.boroughs, [p.borough]: s.boroughs[p.borough] + 1 };
  return s;
}

/** The place as the database functions take it. */
const placeArgs = (p: Place) => ({
  p_city: p.city === ELSEWHERE ? null : p.city,
  p_borough: p.city === 'london' ? slug(p.borough) : null,
  p_town: p.city === ELSEWHERE ? p.town.trim() : null,
  p_region: p.city === ELSEWHERE ? p.region || null : null,
});

const FAIL = 'Something went wrong on our side. Please try again in a moment.';

export async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${URL_}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: KEY, authorization: `Bearer ${KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify(args),
    });
  } catch {
    throw new Error('We could not reach Outhere. Check your connection and try again.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(FAIL);
  return data as T;
}

const BY_ID = Object.fromEntries(BOROUGHS.map((b) => [slug(b), b])) as Record<string, Borough>;

export async function fetchStats(): Promise<Stats> {
  if (!LIVE) return DEMO_STATS;
  type Raw = Pick<Stats, 'total' | 'clubsClaimed' | 'blackTaken'> & {
    cities: Record<string, number>; boroughs: Record<string, number>; regions: Record<string, number>;
    clubs: { name: string; city: string | null; borough: string | null; town: string | null; region: string | null }[];
  };
  const r = await rpc<Raw>('website_stats');
  const pick = <K extends string>(keys: readonly K[], src: Record<string, number>, id: (k: K) => string = (k) => k) =>
    Object.fromEntries(keys.map((k) => [k, Number(src?.[id(k)] ?? 0)])) as Record<K, number>;
  const clubs = (r.clubs ?? []).flatMap((c) => {
    const place = readPlace(c.city ? { city: c.city, borough: c.borough && BY_ID[c.borough] } : { city: ELSEWHERE, town: c.town, region: c.region });
    return place ? [{ name: c.name, place }] : [];
  });
  return {
    total: r.total, clubsClaimed: r.clubsClaimed, blackTaken: r.blackTaken, clubs,
    cities: pick(CITIES.map((c) => c.id), r.cities),
    boroughs: pick(BOROUGHS, r.boroughs, slug),
    regions: pick(REGIONS, r.regions),
  };
}

/** How many people are out right now, by borough (the app's live presence). */
export async function fetchOutNow(): Promise<number> {
  if (!LIVE) return 0;
  const rows = await rpc<{ borough_id: string; out_now: number }[]>('outside_now', { p_city: 'london' });
  return rows.reduce((n, r) => n + Number(r.out_now), 0);
}

export async function joinWaitlist(input: WaitlistInput): Promise<JoinResult> {
  if (LIVE) {
    return rpc<JoinResult>('join_waitlist', {
      p_email: input.email, ...placeArgs(input.place), p_moves: input.move,
      p_club: input.club || null, p_ref: input.ref || null, p_black: input.invite,
    });
  }
  const total = (local.get<number>('demo_total') ?? DEMO_STATS.total) + 1;
  local.set('demo_total', total);
  const code = (input.email.split('@')[0].replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'friend').toUpperCase() + (total % 100);
  return { position: total, code, placeCount: placeCount(DEMO_STATS, input.place) + 1 };
}

export async function claimClub(input: ClaimInput): Promise<ClaimResult> {
  if (LIVE) {
    return rpc<ClaimResult>('claim_club', {
      p_club: input.club, ...placeArgs(input.place), p_size: input.size, p_role: input.role, p_email: input.email, p_social: input.social || null,
    });
  }
  const n = (local.get<number>('demo_claimed') ?? DEMO_STATS.clubsClaimed) + 1;
  local.set('demo_claimed', n);
  return { founding: n };
}

export async function requestBlack(input: BlackInput): Promise<{ ok: true }> {
  if (LIVE) {
    return rpc<{ ok: true }>('request_black', {
      p_name: input.name, p_email: input.email, ...placeArgs(input.place), p_code: input.code || null, p_why: input.why || null,
    });
  }
  return { ok: true };
}
