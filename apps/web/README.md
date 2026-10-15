# weouthere.app

The Outhere marketing and waitlist website. It is the approved website prototype
rebuilt as a real site: React with Radix UI on Vite, every page written out as
static HTML at build time, and sign-ups saved to Outhere's Supabase project.

## Pages

| Path | What it is |
| --- | --- |
| `/` | Home: hero reel, manifesto, how it works, 1v1 battle, city vs city, London borough map, membership with the feature comparison, Black, run clubs, the app, FAQ, final sign-up |
| `/crews` | Run clubs claim their official crew; finder, claim form, captain view, Founding 500 board |
| `/black` | Black membership and the invite request form |
| `/boroughs/<borough>` | One page for each of the 32 boroughs (ids match `supabase/seed.sql`); `/boroughs` jumps to your own |
| `/privacy` | Privacy notice (draft: needs a solicitor before launch) |
| `/i/<code>` | Invite links. Shows the home page and credits the friend who shared it |

## Working on it

```bash
pnpm install                 # from the repo root
pnpm --filter @outhere/web dev     # http://localhost:5173
pnpm --filter @outhere/web check   # typecheck, unit tests and the full static build
```

Without Supabase settings the site runs on **example figures**: sign-ups, club
claims and Black requests are simulated in the browser and every made-up number
is labelled as an example. That is also how a preview without a database behaves.

## Going live

1. Apply the app's Supabase migrations, which include the website's tables and
   functions (`supabase/migrations/20261015100900_website.sql`, tested by
   `supabase/tests/test_website.sql`).
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Project settings > API)
   and `VITE_SITE_URL=https://weouthere.app` in the host's environment, then build.
   With them set, the figures are real and the "example" labels disappear.
3. Host the `dist` folder. On Vercel: import the repo with the root directory
   left at the repo root. `vercel.json` at the repo root belongs to the website
   and sets the rest: pnpm, clean URLs, invite links, caching, security headers,
   and skipping builds on branches without the site or where it has not
   changed. Then add the domain.

The website owns `weouthere.app`. Any path it has no page for (a club link such
as `weouthere.app/peckhampacers`, or anything else) is passed to the member app
at `app.weouthere.app`, which serves club pages and its own not-found page. The
member app keeps every top-level path the website uses in `RESERVED_SLUGS`
(`packages/core/src/rules.ts`), and a test here fails if the two drift apart.

Other hosts work too: serve `dist` with clean URLs (`/crews` serves
`crews/index.html`), rewrite `/i/*` to `/`, and send other paths to the member
app (or to `404.html` without one).

## Where things live

- `src/pages`: one file per page; `src/components`: nav, footer, waitlist dialog, Radix-based kit (tabs, accordion, tooltip, borough map), hero reel
- `src/content`: words and settings that change most (FAQ, feature table, reel cut list, prices, social links, app demo link)
- `src/styles/site.css`: the prototype's stylesheet, kept as is, plus a small Radix block at the end
- `public/img`: the Higgsfield photography and 3D objects from the prototype
- The database side (waitlist, club claims and Black requests, reachable only through four functions) lives in `supabase/migrations/20261015100900_website.sql`
