# Outhere web app

The member and club side of Outhere on the web: home, feed, battles, pick-ups,
club chat, calendar, league, clubs, profiles, membership and Club HQ, plus the
public pages people reach from a link or a QR code (club pages at
`/<club>`, `/join/<club>`, `/@<handle>` and `/locals`).

React Router in framework mode with server rendering, on Vite. Shared types,
rules and data access live in `packages/core`; shared components and the
stylesheet in `packages/ui`.

## Running it

From the repository root:

```sh
npm install
npm run dev:web        # http://localhost:5173
```

With no Supabase variables set it runs on built-in example data, signed in as
Kemi. Anything you do (RSVPs, posts, approvals) sticks until the server
restarts. The role switch at the bottom of the sidebar previews the app as a
member, a captain or staff.

## Real data

Copy `.env.example` to `.env`, fill in the Outhere Supabase project (London),
then load it into the shell before starting, since the server reads
`process.env` at runtime:

```sh
set -a; . ./.env; set +a; npm run dev
```

Sign in is an email link (`/signin`, `/auth/callback`). Member pages send
anyone signed out to sign in and back again. What the data source can't do yet
because the schema doesn't have it is listed in
`packages/core/src/supabase/SCHEMA_GAPS.md`.

## Payments

Membership checkout uses Stripe Checkout (`app/checkout.server.ts`). Stripe
reports new, changed and cancelled memberships to `/webhooks/stripe`, which
writes `subscriptions`; the database then sets the member's ring and pays the
club its share. Both need the `STRIPE_*` variables, and the webhook also needs
`SUPABASE_SERVICE_ROLE_KEY`, which stays on the server.

## Checks

```sh
npm run typecheck -w @outhere/web
npm test -w @outhere/web
npm run build -w @outhere/web && npm start -w @outhere/web
```
