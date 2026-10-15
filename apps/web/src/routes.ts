import type { PageKey } from './components/Chrome';
import { SITE } from './content/site';
import { type Borough, BOROUGHS, boroughFromSlug, DEFAULT_BOROUGH, slug } from './lib/boroughs';

export type Route = { page: PageKey; path: string; borough?: Borough };

/** Every page the build writes out as static HTML. */
export const ROUTES: Route[] = [
  { page: 'home', path: '/' },
  { page: 'crews', path: '/crews' },
  { page: 'black', path: '/black' },
  { page: 'privacy', path: '/privacy' },
  { page: 'borough', path: '/boroughs', borough: DEFAULT_BOROUGH },
  ...BOROUGHS.map((b) => ({ page: 'borough' as const, path: `/boroughs/${slug(b)}`, borough: b })),
  { page: 'notfound', path: '/404' },
];

export function matchRoute(pathname: string): Route {
  const p = pathname.replace(/\/+$/, '').replace(/\.html$/, '').replace(/\/index$/, '') || '/';
  if (/^\/i\/[A-Za-z0-9]+$/.test(p)) return ROUTES[0]; // invite links show the home page
  const hit = ROUTES.find((r) => r.path === p && r.page !== 'notfound');
  if (hit) return hit;
  const m = p.match(/^\/boroughs\/([a-z-]+)$/);
  const b = m && boroughFromSlug(m[1]);
  if (b) return { page: 'borough', path: p, borough: b };
  return { page: 'notfound', path: p };
}

export type Meta = { title: string; description: string; canonical: string; image: string; noindex?: boolean };

export function metaFor(r: Route): Meta {
  const url = (p: string) => SITE.url + (p === '/' ? '/' : p);
  const image = SITE.url + '/og.jpg';
  switch (r.page) {
    case 'home':
      return { title: 'Outhere · Every step counts', description: 'Outhere turns your walks and runs into points for your crew, your area and your city. Anyone in the UK can join on day one. Join the waitlist.', canonical: url('/'), image };
    case 'crews':
      return { title: 'Run clubs and crews · Outhere', description: 'Every crew on Outhere is a real run club. Captains claim their official crew, and the first 500 clubs in the UK get a founding crest for life.', canonical: url('/crews'), image };
    case 'black':
      return { title: 'Outhere Black · By invitation', description: "A small membership for the people who move their city: members' nights in every launch city, first access to every drop and the gunmetal ring.", canonical: url('/black'), image };
    case 'privacy':
      return { title: 'Privacy notice · Outhere', description: 'What Outhere collects when you join the waitlist, claim a run club or request a Black invite, and your rights.', canonical: url('/privacy'), image };
    case 'borough': {
      const b = r.borough ?? DEFAULT_BOROUGH;
      return {
        title: `${b} on Outhere`,
        description: `${b} plays its own league in London on Outhere. See how long its list is, join it and share your link.`,
        canonical: url(`/boroughs/${slug(b)}`),
        image,
      };
    }
    default:
      return { title: 'Page not found · Outhere', description: 'This page is not out there.', canonical: url('/'), image, noindex: true };
  }
}
