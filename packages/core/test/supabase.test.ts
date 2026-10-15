import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DataError, SupabaseData, type Database } from "../src/supabase";

/*
 * A recording fake of the parts of the Supabase client the data source uses.
 * Every query builder call is recorded; awaiting the builder asks `respond`
 * for the result, so each test only describes the rows it cares about.
 */

interface Query {
  table: string;
  calls: { method: string; args: unknown[] }[];
  /** The value passed to the first .eq(column, value) on this column. */
  eq(column: string): unknown;
  has(method: string): boolean;
}

type Result = { data?: unknown; error?: { code: string; message: string; hint?: string } | null; count?: number };

const ME = "11111111-1111-1111-1111-111111111111";

function fake(respond: (q: Query) => Result | undefined, user: string | null = ME) {
  const queries: Query[] = [];
  const builder = (table: string, first?: { method: string; args: unknown[] }) => {
    const q: Query = {
      table,
      calls: first ? [first] : [],
      eq: (column) => q.calls.find((c) => c.method === "eq" && c.args[0] === column)?.args[1],
      has: (method) => q.calls.some((c) => c.method === method),
    };
    queries.push(q);
    const proxy: unknown = new Proxy(
      {},
      {
        get(_t, prop) {
          if (prop === "then") {
            const single = q.has("maybeSingle") || q.has("single");
            const r = respond(q) ?? {};
            const value = { data: r.data ?? (r.error ? null : single ? null : []), error: r.error ?? null, count: r.count ?? null };
            return (ok: (v: unknown) => unknown, fail: (e: unknown) => unknown) => Promise.resolve(value).then(ok, fail);
          }
          return (...args: unknown[]) => {
            q.calls.push({ method: String(prop), args });
            return proxy;
          };
        },
      },
    );
    return proxy;
  };
  const client = {
    from: (table: string) => builder(table),
    rpc: (name: string, args: unknown) => builder(`rpc:${name}`, { method: "rpc", args: [args] }),
    auth: { getUser: async () => ({ data: { user: user ? { id: user } : null }, error: null }) },
    storage: {
      from: (bucket: string) => ({
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${bucket}/${path}` } }),
        createSignedUrls: async (paths: string[]) => ({ data: paths.map((p) => ({ path: p, signedUrl: `https://signed.test/${p}`, error: null })), error: null }),
      }),
    },
  };
  return { data: new SupabaseData(client as unknown as SupabaseClient<Database>, { now: () => new Date("2026-10-15T12:00:00Z") }), queries };
}

const profile = (over: Record<string, unknown> = {}) => ({
  id: ME,
  username: "kemi",
  display_name: "Kemi Adeyemi",
  avatar_path: `${ME}/face.jpg`,
  city_id: "london",
  borough_id: "southwark",
  home_club_id: null,
  tier: "free",
  founding_number: null,
  trust: "new",
  level: 1,
  streak_days: 0,
  surprise_challengers: true,
  ...over,
});

describe("Supabase data source", () => {
  it("builds the viewer from the profile, staff row, memberships and the dot", async () => {
    const { data } = fake((q) => {
      if (q.table === "profiles") return { data: profile({ tier: "black", trust: "established", founding_number: 212, level: 14 }) };
      if (q.table === "club_members") return { data: [{ club_id: "club-1", role: "captain", joined_at: "2026-01-01T00:00:00Z" }] };
      if (q.table === "staff") return { data: [{ role: "moderator" }] };
      if (q.table === "member_dots") return { data: { dot: "out" } };
      if (q.table === "boroughs") return { data: [{ id: "southwark", city_id: "london", name: "Southwark", tile_col: 4, tile_row: 4 }] };
      return undefined;
    });
    const v = await data.viewer();
    expect(v.tier).toBe("black");
    expect(v.outNow).toBe("out");
    expect(v.roles).toEqual(["member", "captain", "staff"]);
    expect(v.trust).toBe("Established");
    expect(v.borough).toBe("Southwark");
    expect(v.homeClubId).toBe("club-1");
    expect(v.foundingNumber).toBe(212);
    expect(v.avatar).toBe(`https://cdn.test/avatars/${ME}/face.jpg`);
  });

  it("shows a red dot for someone who just stopped, and none once it has gone", async () => {
    const { data } = fake((q) => {
      if (q.table === "profiles") return { data: q.has("maybeSingle") ? profile() : [{ id: ME, display_name: "Kemi Adeyemi", avatar_path: null, tier: "pro" }] };
      if (q.table === "member_dots") return { data: q.has("maybeSingle") ? { dot: "stopped" } : [{ user_id: ME, dot: null }] };
      return undefined;
    });
    expect((await data.viewer()).outNow).toBe("stopped");
    const people = await data.people();
    expect(people[ME]?.tier).toBe("pro");
    expect(people[ME]?.outNow).toBeUndefined();
  });

  it("marks a story seen only when the viewer has a story_views row for it", async () => {
    const { data, queries } = fake((q) => {
      if (q.table === "profiles") return { data: profile() };
      if (q.table === "stories") {
        return {
          data: [
            { id: "s-new", author_id: "a", club_id: null, media_path: "a/1.jpg", caption: "Out now", created_at: "2026-10-15T11:00:00Z" },
            { id: "s-seen", author_id: "b", club_id: "club-1", media_path: "b/2.jpg", caption: null, created_at: "2026-10-15T10:00:00Z" },
          ],
        };
      }
      if (q.table === "story_views") return { data: [{ story_id: "s-seen" }] };
      return undefined;
    });
    const { stories } = await data.feed();
    expect(stories.map((s) => [s.id, s.seen])).toEqual([["s-new", false], ["s-seen", true]]);
    expect(stories[0]?.personId).toBe("a");
    expect(stories[1]?.clubId).toBe("club-1");
    expect(stories[0]?.image).toBe("https://signed.test/a/1.jpg");
    expect(queries.find((q) => q.table === "story_views")?.eq("user_id")).toBe(ME);
  });

  it("records a story view as the signed in member", async () => {
    const { data, queries } = fake(() => undefined);
    await data.markStorySeen("s-1");
    const upsert = queries.find((q) => q.table === "story_views")?.calls.find((c) => c.method === "upsert");
    expect(upsert?.args[0]).toEqual({ story_id: "s-1", user_id: ME });
  });

  it("says you're going through rsvp_event with the migration's argument names", async () => {
    const { data, queries } = fake(() => undefined);
    await data.setRsvp("event-1", true);
    await data.setRsvp("event-1", false);
    const calls = queries.filter((q) => q.table === "rpc:rsvp_event").map((q) => q.calls[0]?.args[0]);
    expect(calls).toEqual([{ p_event: "event-1", p_going: true }, { p_event: "event-1", p_going: false }]);
  });

  it("turns a database error code into a thrown Error with that code", async () => {
    const { data } = fake((q) => (q.table === "rpc:rsvp_event" ? { error: { code: "P0001", message: "EVENT_FULL" } } : undefined));
    const err = await data.setRsvp("event-1", true).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DataError);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe("EVENT_FULL");
  });

  it("names row level security refusals NOT_ALLOWED and keeps the hint", async () => {
    const { data } = fake((q) =>
      q.table === "rpc:create_battle" ? { error: { code: "P0001", message: "TIER_REQUIRED", hint: "active_battles" } }
        : q.table === "post_comments" ? { error: { code: "42501", message: "new row violates row-level security policy" } }
        : undefined,
    );
    await expect(data.comment("post-1", "Nice one")).rejects.toThrow("NOT_ALLOWED");
    const err = await data.createBattle({ opponentId: "p2", mode: "steps", length: "Today", stake: "Bragging rights" }).catch((e: unknown) => e);
    expect((err as DataError).code).toBe("TIER_REQUIRED");
    expect((err as DataError).hint).toBe("active_battles");
  });

  it("asks create_battle for a duration or a distance by mode", async () => {
    const { data, queries } = fake((q) => (q.table.startsWith("rpc:") ? { data: { id: "battle-1" } } : undefined));
    expect(await data.createBattle({ opponentId: "p2", mode: "blind", length: "5k", stake: "50 OUT on it" })).toEqual({ id: "battle-1" });
    expect(queries.find((q) => q.table === "rpc:create_battle")?.calls[0]?.args[0]).toEqual({
      p_opponent: "p2", p_mode: "blind_time_trial", p_distance_m: 5000, p_stake_out: 50,
    });
  });

  it("refuses to read the viewer when nobody is signed in, but has no people to show", async () => {
    const { data } = fake(() => undefined, null);
    await expect(data.viewer()).rejects.toThrow("NOT_SIGNED_IN");
    expect(await data.people()).toEqual({});
  });
});

describe("profile", () => {
  it("returns null when no profile has that handle", async () => {
    const { data, queries } = fake(() => undefined);
    expect(await data.profile("@Nobody")).toBeNull();
    expect(queries[0]?.table).toBe("profiles");
    expect(queries[0]?.eq("username")).toBe("nobody");
  });

  it("shows signed out visitors public numbers only", async () => {
    const { data, queries } = fake((q) => (q.table === "profiles" ? { data: profile({ level: 7, streak_days: 12, best_streak: 30 }) } : undefined), null);
    const page = await data.profile("kemi");
    expect(page).toMatchObject({ handle: "kemi", visible: true, level: 7, streakDays: 12, trust: "New", isMe: false });
    if (!page?.visible) throw new Error("expected a visible profile");
    expect(page.stats.map((s) => s.label)).toEqual(["Level", "Day streak"]);
    expect(queries.some((q) => q.table === "wallets" || q.table === "daily_steps")).toBe(false);
  });
});
