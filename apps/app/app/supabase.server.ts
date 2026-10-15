import { AsyncLocalStorage } from "node:async_hooks";
import { redirect, type MiddlewareFunction } from "react-router";
import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { SupabaseData, type Database } from "@outhere/core/supabase";

/*
 * Real data for the web app. Each request gets its own Supabase client that
 * reads the member's session from the request cookies. When Supabase Auth
 * refreshes or sets the session, the new cookies are collected here and the
 * root middleware adds them to whatever response the request ends with (a
 * page, a data request, an action or a redirect).
 *
 * The server reads process.env at runtime, not import.meta.env, so the same
 * build can point at any project.
 */

export const supabaseUrl = (): string => process.env.VITE_SUPABASE_URL ?? "";
export const supabaseAnonKey = (): string => process.env.VITE_SUPABASE_ANON_KEY ?? "";
export const supabaseConfigured = (): boolean => !!supabaseUrl() && !!supabaseAnonKey();

export type ServerClient = ReturnType<typeof createServerClient<Database>>;

export interface Session {
  client: ServerClient;
  data: SupabaseData;
  /** The signed in member, or null. Checked with Supabase Auth, not just read from the cookie. */
  userId: string | null;
  /** Set-Cookie and cache headers to send back with the response. */
  headers: Headers;
}

/** Builds a client for one request. Use session() instead unless you need a fresh one. */
export async function openSession(request: Request): Promise<Session> {
  const headers = new Headers();
  const client = createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll: () => parseCookieHeader(request.headers.get("cookie") ?? "").map((c) => ({ name: c.name, value: c.value ?? "" })),
      setAll: (cookies, extra) => {
        for (const { name, value, options } of cookies) headers.append("Set-Cookie", serializeCookieHeader(name, value, options));
        // Responses that set auth cookies must never be cached for someone else.
        for (const [key, value] of Object.entries(extra ?? {})) headers.set(key, value);
      },
    },
  });
  // Ask Auth once, early, so any refreshed tokens are written before the response is built.
  const { data } = await client.auth.getUser();
  const userId = data.user?.id ?? null;
  return { client, data: new SupabaseData(client, { userId }), userId, headers };
}

const requests = new AsyncLocalStorage<{ session?: Promise<Session> }>();

/** This request's session: the one the root middleware is holding, or a new one outside it. */
export function session(request: Request): Promise<Session> {
  const store = requests.getStore();
  if (!store) return openSession(request);
  store.session ??= openSession(request);
  return store.session;
}

export async function supabaseData(request: Request): Promise<SupabaseData> {
  return (await session(request)).data;
}

/** Root middleware: holds one session per request and puts its cookies on the response. */
export const sessionMiddleware: MiddlewareFunction<Response> = async (_args, next) => {
  if (!supabaseConfigured()) return next();
  const store: { session?: Promise<Session> } = {};
  const response = await requests.run(store, next);
  if (!store.session) return response;
  const { headers } = await store.session.catch(() => ({ headers: new Headers() }));
  return withHeaders(response, headers);
};

/** Member pages: no session, no page. Sends people to sign in and back again after. */
export const requireMember: MiddlewareFunction<Response> = async ({ request }) => {
  if (!supabaseConfigured()) return;
  const { userId } = await session(request);
  if (userId) return;
  const url = new URL(request.url);
  url.searchParams.delete("_routes");
  const back = `${url.pathname.replace(/\.data$/, "").replace(/^\/_root$/, "/")}${url.search}`;
  throw redirect(`/signin?next=${encodeURIComponent(back)}`);
};

function withHeaders(response: Response, headers: Headers): Response {
  const cookies = headers.getSetCookie();
  const others = [...headers].filter(([key]) => key.toLowerCase() !== "set-cookie");
  if (!cookies.length && !others.length) return response;
  const add = (target: Headers) => {
    for (const c of cookies) target.append("Set-Cookie", c);
    for (const [key, value] of others) target.set(key, value);
  };
  try {
    add(response.headers);
    return response;
  } catch {
    // Some responses have read-only headers; copy them into one we can change.
    const copy = new Response(response.body, response);
    add(copy.headers);
    return copy;
  }
}

/** Only follow redirects back into this site after signing in. */
export function safeNext(next: string | null | undefined): string {
  // "//host" and "/\\host" both leave the site in browsers.
  return next && /^\/(?![/\\])/.test(next) ? next : "/";
}

/** Where magic links send people back to: SITE_URL in production, else this server. */
export function siteUrl(request: Request): string {
  return (process.env.SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
}
