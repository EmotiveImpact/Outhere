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
  public_profile: true,
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
      if (q.table === "profiles") return { data: profile() };
      if (q.table === "profile_cards") return { data: [{ id: ME, username: "kemi", display_name: "Kemi Adeyemi", avatar_path: null, tier: "pro", public_profile: true }] };
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

  it("keeps a stake in words as the battle's note, and five days as 120 hours", async () => {
    const { data, queries } = fake((q) => (q.table.startsWith("rpc:") ? { data: { id: "battle-2" } } : undefined));
    await data.createBattle({ opponentId: "p2", mode: "last", length: "5 days", stake: "Loser buys the coffees" });
    expect(queries.find((q) => q.table === "rpc:create_battle")?.calls[0]?.args[0]).toEqual({
      p_opponent: "p2", p_mode: "last_one_standing", p_duration_h: 120, p_stake_out: 0, p_stake_note: "Loser buys the coffees",
    });
  });

  it("ranks the viewer's area by steps a day per person this week", async () => {
    const MONDAY = "2026-10-12";
    const { data } = fake((q) => {
      if (q.table === "profiles") return { data: profile() };
      if (q.table === "cities") return { data: [{ id: "london", name: "London", region: "London", is_live: true }] };
      if (q.table === "boroughs") return { data: ["lambeth", "southwark", "hackney"].map((id) => ({ id, city_id: "london", name: id[0]!.toUpperCase() + id.slice(1), tile_col: 1, tile_row: 1 })) };
      if (q.table === "borough_week_steps") {
        return {
          data: [
            // Thursday is day four, so 4 days so far this week.
            { borough_id: "lambeth", week_start: MONDAY, counted: 80_000, people: 2 },
            { borough_id: "southwark", week_start: MONDAY, counted: 72_000, people: 2 },
            { borough_id: "southwark", week_start: "2026-10-05", counted: 70_000, people: 1 },
            { borough_id: "lambeth", week_start: "2026-10-05", counted: 60_000, people: 1 },
          ],
        };
      }
      return undefined;
    });
    const home = await data.home();
    expect(home.boroughTable).toEqual([{ name: "Lambeth", steps: 10_000 }, { name: "Southwark", steps: 9_000, me: true }]);
    expect(home.boroughLine).toBe("Southwark is 2nd in London, down 1");
    const map = await data.boroughs("steps", "london");
    expect(map.map((b) => [b.name, b.value])).toEqual([["Lambeth", 10_000], ["Southwark", 9_000], ["Hackney", 0]]);
  });

  it("clears a flagged step day and takes someone out of an unrevealed squad through the staff functions", async () => {
    const { data, queries } = fake((q) => {
      if (q.table === "profiles") return { data: profile() };
      if (q.table === "staff") return { data: [{ role: "moderator" }] };
      if (q.table === "squad_members") return { data: [{ fixture_id: "f1" }] };
      if (q.table === "fixtures") return { data: [{ id: "f1" }] };
      return undefined;
    });
    await data.clearFlag("steps:u1:2026-10-14");
    await data.removeFromSquad("steps:u2:2026-10-14");
    const calls = (name: string) => queries.filter((q) => q.table === `rpc:${name}`).map((q) => q.calls[0]?.args[0]);
    expect(calls("review_steps")).toEqual([{ p_user: "u1", p_day: "2026-10-14", p_ok: true }, { p_user: "u2", p_day: "2026-10-14", p_ok: false }]);
    expect(calls("remove_from_squad")).toEqual([{ p_fixture: "f1", p_user: "u2" }]);
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

  it("keeps a private profile private, even to someone who can read the row", async () => {
    const { data } = fake((q) => (q.table === "profiles" ? { data: profile({ id: "someone-else", public_profile: false }) } : undefined));
    expect(await data.profile("kemi")).toEqual({ handle: "kemi", visible: false });
  });

  it("says a hidden profile exists when only its public card can be read", async () => {
    const { data } = fake((q) => (q.table === "profile_cards" ? { data: { username: "kemi" } } : undefined), null);
    expect(await data.profile("kemi")).toEqual({ handle: "kemi", visible: false });
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

describe("lastReveal", () => {
  const CLUB = "c0000000-0000-0000-0000-000000000001";
  const OTHER = "c0000000-0000-0000-0000-000000000002";

  it("is null without a home club", async () => {
    const { data } = fake((q) => (q.table === "profiles" ? { data: profile() } : undefined));
    expect(await data.lastReveal()).toBeNull();
  });

  it("puts the viewer's club first with the final scores and the club card", async () => {
    const { data, queries } = fake((q) => {
      if (q.table === "profiles") return { data: profile({ home_club_id: CLUB }) };
      if (q.table === "league_entries" && q.eq("club_id") === CLUB) return { data: [{ id: "e1" }] };
      if (q.table === "league_entries" && q.eq("id") === "e2") return { data: { club_id: OTHER } };
      if (q.table === "league_entries" && q.eq("division_id")) return { data: [{ id: "e2", points: 15, played: 5 }, { id: "e1", points: 13, played: 5 }] };
      if (q.table === "fixtures" && !q.eq("starts_on")) {
        return { data: { id: "f1", division_id: "d1", week: 5, home_id: "e2", away_id: "e1", is_derby: true, starts_on: "2026-10-05", ends_on: "2026-10-11", draw_seed: null, drawn_at: null, home_score: 12826.4, away_score: 13224.2, revealed_at: "2026-10-12T19:00:00Z" } };
      }
      if (q.table === "divisions") return { data: { name: "Club Premier" } };
      if (q.table === "clubs") return { data: [{ id: CLUB, name: "Peckham Pacers", logo_path: null }, { id: OTHER, name: "Brixton Sunrise", logo_path: null }] };
      return undefined;
    });
    const result = await data.lastReveal();
    expect(result?.home).toMatchObject({ name: "Peckham Pacers", short: "Peckham", score: 13224 });
    expect(result?.away).toMatchObject({ name: "Brixton Sunrise", short: "Brixton", score: 12826 });
    expect(result?.cards).toEqual([{ kick: "Club Premier", title: "Now 2nd", line: "Won · 13 points from 5" }]);
    const fixture = queries.find((q) => q.table === "fixtures");
    expect(fixture?.calls.find((c) => c.method === "lte")?.args).toEqual(["revealed_at", "2026-10-15T12:00:00.000Z"]);
  });
});
