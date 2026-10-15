import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  route("act", "routes/act.ts"),
  route("calendar.ics", "routes/calendar-ics.ts"),
  route("webhooks/stripe", "routes/stripe-webhook.ts"),

  // Signed-in app, with the sidebar
  layout("routes/shell.tsx", [
    index("routes/home.tsx"),
    route("feed", "routes/feed.tsx"),
    route("battles", "routes/battles.tsx"),
    route("pickups", "routes/pickups.tsx"),
    route("chat", "routes/chat.tsx"),
    route("calendar", "routes/calendar.tsx"),
    route("league", "routes/league.tsx"),
    route("clubs", "routes/clubs.tsx"),
    route("me", "routes/me.tsx"),
    route("membership", "routes/membership.tsx"),
    route("hq", "routes/hq.tsx"),
    route("hq/members", "routes/hq-members.tsx"),
    route("hq/runs", "routes/hq-runs.tsx"),
    route("hq/kit", "routes/hq-kit.tsx"),
    route("hq/fund", "routes/hq-fund.tsx"),
  ]),

  // Signing in with an email link (real data only)
  route("signin", "routes/signin.tsx"),
  route("signout", "routes/signout.ts"),
  route("auth/callback", "routes/auth-callback.ts"),

  // Public pages anyone can open, signed in or not
  route("locals", "routes/locals.tsx"),
  route("join/:slug", "routes/join.tsx"),
  route(":slug", "routes/club.tsx"),
] satisfies RouteConfig;
