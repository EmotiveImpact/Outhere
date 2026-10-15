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
import type { BlackInput, ClaimInput, WaitlistInput } from './validate';

const URL_ = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const LIVE = !!(URL_ && KEY);

export type Stats = {
  total: number;
  boroughs: Record<Borough, number>;
  clubsClaimed: number;
  clubs: { name: string; borough: Borough }[];
  blackTaken: number;
};

export type JoinResult = { position: number; code: string; boroughCount: number };
export type ClaimResult = { founding: number };

/* ---------- example figures, used whenever the site is not live ---------- */
export const demoCount = (b: string) => {
  let h = 0;
  for (const c of b) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return 60 + (h % 260);
};
export const DEMO_STATS: Stats = {
  total: 4213,
  boroughs: Object.fromEntries(BOROUGHS.map((b) => [b, demoCount(b)])) as Record<Borough, number>,
  clubsClaimed: 188,
  clubs: [],
  blackTaken: 212,
};
/** What a live build shows before the real figures arrive, so no example number ever flashes up. */
export const EMPTY_STATS: Stats = {
  total: 0,
  boroughs: Object.fromEntries(BOROUGHS.map((b) => [b, 0])) as Record<Borough, number>,
  clubsClaimed: 0,
  clubs: [],
  blackTaken: 0,
};

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
  type Raw = Omit<Stats, 'boroughs' | 'clubs'> & { boroughs: Record<string, number>; clubs: { name: string; borough: string }[] };
  const r = await rpc<Raw>('website_stats');
  const boroughs = Object.fromEntries(BOROUGHS.map((b) => [b, r.boroughs[slug(b)] ?? 0])) as Record<Borough, number>;
  const clubs = r.clubs.filter((c) => BY_ID[c.borough]).map((c) => ({ name: c.name, borough: BY_ID[c.borough] }));
  return { ...r, boroughs, clubs };
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
      p_email: input.email, p_borough: slug(input.borough), p_moves: input.move,
      p_club: input.club || null, p_ref: input.ref || null, p_black: input.invite,
    });
  }
  const total = (local.get<number>('demo_total') ?? DEMO_STATS.total) + 1;
  local.set('demo_total', total);
  const code = (input.email.split('@')[0].replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'friend').toUpperCase() + (total % 100);
  return { position: total, code, boroughCount: demoCount(input.borough) + 1 };
}

export async function claimClub(input: ClaimInput): Promise<ClaimResult> {
  if (LIVE) {
    return rpc<ClaimResult>('claim_club', {
      p_club: input.club, p_borough: slug(input.borough), p_size: input.size, p_role: input.role, p_email: input.email, p_social: input.social || null,
    });
  }
  const n = (local.get<number>('demo_claimed') ?? DEMO_STATS.clubsClaimed) + 1;
  local.set('demo_claimed', n);
  return { founding: n };
}

export async function requestBlack(input: BlackInput): Promise<{ ok: true }> {
  if (LIVE) {
    return rpc<{ ok: true }>('request_black', {
      p_name: input.name, p_email: input.email, p_borough: slug(input.borough), p_code: input.code || null, p_why: input.why || null,
    });
  }
  return { ok: true };
}
