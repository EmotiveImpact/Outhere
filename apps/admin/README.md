# Outhere HQ

The staff app: overview, club verification, fair play, seasons and draws, and
the audit log. A static Vite and React app that talks to Supabase from the
browser with the anon key; the database's staff rules decide what it can do.

```sh
pnpm dev:admin         # http://localhost:5174
```

With no Supabase variables set it runs on example data, signed in as staff.
With them set (see `.env.example`; Vite reads `.env` itself and bakes the
values in at build time), it asks for a staff sign in by email link and shows
"Staff only" to anyone without a staff row.

## Deploying

On Vercel, give HQ its own project and set **Root Directory** to
`apps/admin`, so it doesn't pick up the website's `vercel.json` at the
repository root. Set the `VITE_*` variables before building, since they are
baked into the files. The output is `dist/`, and `apps/admin/vercel.json`
sends every page path back to `index.html` so links like `/verify` load.

## Checks

```sh
pnpm --filter @outhere/admin typecheck
pnpm --filter @outhere/admin build    # output in dist/
```
