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
npm install
npm run dev        # http://localhost:5173
npm run check      # typecheck, unit tests and the full static build
```

Without Supabase settings the site runs on **example figures**: sign-ups, club
claims and Black requests are simulated in the browser and every made-up number
is labelled as an example. That is also how a preview without a database behaves.

## Going live

1. Apply `db/website.sql` to the Outhere Supabase project after the app schema
   (it references `public.boroughs`). It is safe to run more than once.
   `db/test.sh` checks it against a throwaway Postgres.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Project settings > API)
   and `VITE_SITE_URL=https://weouthere.app` in the host's environment, then build.
   With them set, the figures are real and the "example" labels disappear.
3. Host the `dist` folder. On Vercel: import the repo, set the root directory to
   `apps/site` (framework Vite; `vercel.json` sets the rest: clean URLs, invite
   link rewrites, caching and security headers), then add the domain.

Other hosts work too: serve `dist` with clean URLs (`/crews` serves
`crews/index.html`), `404.html` for unknown paths, and rewrite `/i/*` to `/`.

## Where things live

- `src/pages`: one file per page; `src/components`: nav, footer, waitlist dialog, Radix-based kit (tabs, accordion, tooltip, borough map), hero reel
- `src/content`: words and settings that change most (FAQ, feature table, reel cut list, prices, social links, app demo link)
- `src/styles/site.css`: the prototype's stylesheet, kept as is, plus a small Radix block at the end
- `public/img`: the Higgsfield photography and 3D objects from the prototype
- `db/website.sql`: waitlist, club claims and Black requests, reachable only through four functions
