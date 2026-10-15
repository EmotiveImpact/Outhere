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

```sh
pnpm --filter @outhere/admin typecheck
pnpm --filter @outhere/admin build    # output in dist/
```
