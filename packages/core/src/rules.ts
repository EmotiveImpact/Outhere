import { RESERVED_SLUGS } from "./reserved";
import type { BattleMode, Tier, OutState, Viewer, Role } from "./types";

/* ---------- formatting ---------- */

export const formatNumber = (n: number): string => Math.round(n).toLocaleString("en-GB");

export const formatPounds = (n: number): string =>
  n < 1 ? `${Math.round(n * 100)}p` : `£${n.toFixed(2)}`;

export const ordinal = (n: number): string => {
  const teen = n % 100 > 10 && n % 100 < 14;
  const suffix = teen ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${suffix}`;
};

export const firstName = (name: string): string => name.split(" ")[0] ?? name;

/* ---------- rings and dots ---------- */

/**
 * Everywhere except the stories row, the ring around a face shows membership:
 * thin grey for Free, blue glow for Pro, gunmetal with a moving light for Black.
 */
export const ringClass = (tier: Tier): string => `t-${tier}`;

/**
 * In the stories row the ring is about the story alone (Edem, 15 Oct): bright
 * blue while unwatched, thin grey once watched, and no membership shown. The
 * viewer's own "add a story" button gets a plain ring.
 */
export function storyRing(seen: boolean): { ring: "t-story"; state: "new" | "seen" } {
  return { ring: "t-story", state: seen ? "seen" : "new" };
}

/** Label for the dot at the bottom right of a face. Blue while out, red once stopped. */
export const outLabel = (state: OutState | undefined): string | null =>
  state === "out" ? "Out now" : state === "stopped" ? "Just stopped" : null;

/* ---------- counted steps ---------- */

export const FULL_RATE_STEPS = 10_000;
export const HALF_RATE_STEPS = 20_000;

/**
 * Steps that count for the league in one day: full rate up to 10k, half rate
 * from 10k to 20k, nothing beyond. That caps a day at 15,000 counted steps.
 */
export function countedSteps(raw: number): number {
  const steps = Math.max(0, Math.floor(raw));
  const full = Math.min(steps, FULL_RATE_STEPS);
  const half = Math.max(0, Math.min(steps, HALF_RATE_STEPS) - FULL_RATE_STEPS);
  return full + Math.floor(half / 2);
}

export const countedWeek = (days: number[]): number => days.reduce((sum, d) => sum + countedSteps(d), 0);

/* ---------- money ---------- */

export const VAT_RATE = 0.2;
export type Channel = "web" | "app";

/** Flat club share per paying member a month: £1 on the web, 50p in the app, three times that for Black. */
export function clubShare(tier: Tier, channel: Channel): number {
  if (tier === "free") return 0;
  const base = channel === "web" ? 1 : 0.5;
  return tier === "black" ? base * 3 : base;
}

/** A local sponsor's monthly payment: the club keeps 80%. */
export const SPONSOR_CLUB_SHARE = 0.8;
/** Club kit, made to order: the club gets 15% of every sale. */
export const KIT_CLUB_SHARE = 0.15;

export interface PriceSplit {
  vat: number;
  fees: number;
  club: number;
  outhere: number;
}

/**
 * Where a monthly payment goes. VAT comes off first, then the payment fee
 * (Stripe on the web at 1.5% + 20p; app stores at 15% of the net), then the
 * club's share. Outhere keeps the rest.
 */
export function priceSplit(price: number, tier: Tier, channel: Channel, storeRate = 0.15): PriceSplit {
  const round = (n: number) => Math.round(n * 100) / 100;
  const vat = round(price - price / (1 + VAT_RATE));
  const fees = round(channel === "web" ? price * 0.015 + 0.2 : (price - vat) * storeRate);
  const club = clubShare(tier, channel);
  return { vat, fees, club, outhere: round(price - vat - fees - club) };
}

/* ---------- battles ---------- */

/** Length options for a battle mode, and the one picked by default. */
export function battleLengths(mode: BattleMode): { question: string; options: string[]; fallback: string } {
  if (mode.length === "dist") {
    const options = ["3k", "5k", "10k", "Half"];
    return { question: "How far?", options, fallback: "5k" };
  }
  if (mode.key === "last") {
    const options = ["5 days", "7 days", "Until someone drops"];
    return { question: "How long?", options, fallback: "Until someone drops" };
  }
  return { question: "How long?", options: ["Today", "3 days", "A week"], fallback: "A week" };
}

/* ---------- clubs and URLs ---------- */

/**
 * Top level paths the app owns. Club pages live at weouthere.app/<slug>, so no
 * club may take one of these.
 */
export { RESERVED_SLUGS };

export function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isValidClubSlug(slug: string): boolean {
  return /^[a-z0-9]{3,40}$/.test(slug) && !RESERVED_SLUGS.has(slug);
}

/**
 * The link a new club is offered. Two clubs can share a name but never a link:
 * when the plain name is reserved or taken, the club's city goes on the end
 * (parksiderunnersleeds), then a number.
 */
export function suggestClubSlug(name: string, city: string, taken: (slug: string) => boolean): string {
  const base = slugify(name).slice(0, 40).padEnd(3, "0");
  const free = (s: string) => isValidClubSlug(s) && !taken(s);
  if (free(base)) return base;
  const withCity = `${base.slice(0, 40 - slugify(city).length)}${slugify(city)}`;
  if (free(withCity)) return withCity;
  for (let n = 2; ; n++) {
    const s = `${withCity.slice(0, 40 - String(n).length)}${n}`;
    if (free(s)) return s;
  }
}

/* ---------- roles ---------- */

export const canSeeClubHq = (viewer: Pick<Viewer, "roles">): boolean =>
  viewer.roles.includes("captain") || viewer.roles.includes("staff");

export const canSeeStaff = (viewer: Pick<Viewer, "roles">): boolean => viewer.roles.includes("staff");

/** Only paying members (Pro and Black) post stories. Everyone can watch and react. The database enforces this too. */
export const canPostStory = (viewer: Pick<Viewer, "tier">): boolean => viewer.tier !== "free";

export const rolesFor = (preview: Role): Role[] =>
  preview === "staff" ? ["member", "captain", "staff"] : preview === "captain" ? ["member", "captain"] : ["member"];

/* ---------- time ---------- */

/** Countdown text: long "2d 07:14:22" or short "2d 07h". */
export function countdown(to: string | number, now = Date.now(), short = false): string {
  const target = typeof to === "number" ? to : Date.parse(to);
  const s = Math.max(0, (target - now) / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = Math.floor(s % 60);
  const p = (n: number) => String(n).padStart(2, "0");
  return short ? `${d}d ${p(h)}h` : `${d}d ${p(h)}:${p(m)}:${p(x)}`;
}
