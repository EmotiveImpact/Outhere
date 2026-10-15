import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ClubQuery, OuthereData } from "../data-source";
import { battleLengths, firstName, formatNumber, isValidClubSlug, ordinal, slugify } from "../rules";
import { nextReveal } from "../mock/source";
// Product definitions (battle modes and plan prices), not example data. See SCHEMA_GAPS.md.
import { BATTLE_MODES, PLANS } from "../mock/seed";
import type {
  AdminOverview, AuditEntry, Battle, BattleModeKey, BattlesView, BoroughMetric, BoroughStat, CalendarEvent,
  CalendarView, ChatChannel, ChatItem, ChatView, CheckinRun, Club, FormLetter, JoinInput, MeView, PickupsView, PublicProfile, ClubHqView, ClubPagePatch, ClubPageView, ClubRun,
  Derby, FairPlayFlag, FairPlayView, FeedComment, FeedPost, FeedScope, FeedView, FundView, HomeView, IconName,
  KitView, LeagueView, Member, MembersView, NeedsYou, NewBattle, NewPickup, NewRun, Notification, OutNowEntry,
  PaceGroup, Person, Pickup, PickupType, Plan, Reaction, ReactionCounts, RevealInfo, RevealResult, Role, RouteShape,
  RunsWeekView, SearchItem, SeasonsView, Story, Trust, VerificationRequest, Viewer,
} from "../types";
import type { Database, Enums, Json, Tables } from "./database";
import { DataError, counted, done, one, rows, toDataError } from "./errors";
import {
  addDays, ago, chatDay, dateLabel, dayCaps, daysInMonth, duration, endsLabel, hhmm, london, londonMidnight,
  mondayOf, MONTHS, shortDay, weekdayOf, whenLabel,
} from "./time";

export interface SupabaseDataOptions {
  /** City used when the viewer has not picked one. */
  defaultCity?: string;
  /** Image used for people and clubs with no picture. Empty by default. */
  placeholderImage?: string;
  /** How long signed links to private media (posts, stories) last, in seconds. */
  signedUrlSeconds?: number;
  /** The clock, for tests. */
  now?: () => Date;
  /**
   * The signed in user's id when the caller has already checked it with
   * auth.getUser() (for example in server middleware), or null when nobody is
   * signed in. Left out, the source asks Supabase Auth itself.
   */
  userId?: string | null;
}

/* ---------- columns we read, and the row shapes they give ---------- */

const PERSON = "id, display_name, avatar_path, tier";
const PROFILE = "id, username, display_name, avatar_path, city_id, borough_id, home_club_id, tier, founding_number, trust, level, streak_days, best_streak, surprise_challengers";
const CLUB = "id, slug, name, tagline, city_id, borough_id, status, logo_path, cover_path, meeting_place, usual_times, member_count, created_by, created_at";
const EVENT = "id, club_id, city_id, kind, title, description, starts_at, ends_at, place_name, pace_label, capacity, cover_path, created_by";
const POST = "id, author_id, club_id, kind, body, media_paths, run_id, battle_id, event_id, data, reaction_count, comment_count, created_at";
const BATTLE = "id, mode, status, challenger_id, opponent_id, is_surprise, distance_m, duration_h, stake_out, starts_at, ends_at, winner_id, challenger_result, opponent_result, created_at, finished_at, results_open";
const FIXTURE = "id, division_id, week, home_id, away_id, is_derby, starts_on, ends_on, draw_seed, drawn_at, home_score, away_score, revealed_at";

type ProfileRow = Pick<Tables<"profiles">, "id" | "username" | "display_name" | "avatar_path" | "city_id" | "borough_id" | "home_club_id" | "tier" | "founding_number" | "trust" | "level" | "streak_days" | "surprise_challengers">;
type ClubRow = Pick<Tables<"clubs">, "id" | "slug" | "name" | "tagline" | "city_id" | "borough_id" | "status" | "logo_path" | "cover_path" | "meeting_place" | "usual_times" | "member_count" | "created_by" | "created_at">;
type EventRow = Pick<Tables<"events">, "id" | "club_id" | "city_id" | "kind" | "title" | "description" | "starts_at" | "ends_at" | "place_name" | "pace_label" | "capacity" | "cover_path" | "created_by">;
type PostRow = Pick<Tables<"posts">, "id" | "author_id" | "club_id" | "kind" | "body" | "media_paths" | "run_id" | "battle_id" | "event_id" | "data" | "reaction_count" | "comment_count" | "created_at">;
type BattleRow = Pick<Database["public"]["Views"]["battle_board"]["Row"], "id" | "mode" | "status" | "challenger_id" | "opponent_id" | "is_surprise" | "distance_m" | "duration_h" | "stake_out" | "starts_at" | "ends_at" | "winner_id" | "challenger_result" | "opponent_result" | "created_at" | "finished_at" | "results_open">;
type FixtureRow = Pick<Tables<"fixtures">, "id" | "division_id" | "week" | "home_id" | "away_id" | "is_derby" | "starts_on" | "ends_on" | "draw_seed" | "drawn_at" | "home_score" | "away_score" | "revealed_at">;
type RsvpRow = Pick<Tables<"event_rsvps">, "event_id" | "user_id" | "status">;

/** Who is signed in and where they belong, read once per instance. */
interface Ctx {
  me: string;
  profile: ProfileRow;
  memberships: { club_id: string; role: Enums<"club_role"> }[];
  clubIds: string[];
  staff: Enums<"staff_role">[];
  homeClubId: string | null;
  cityId: string;
}

interface Side {
  entryId: string;
  name: string;
  short: string;
  crest: string;
  clubId: string | null;
  cityId: string | null;
  points: number;
  score: number;
}

interface FixtureInfo {
  row: FixtureRow;
  seasonName: string;
  weeks: number;
  division: string;
  squadSize: number;
  us: Side;
  them: Side;
  usHome: boolean;
}

interface Standing {
  division: string;
  position: number;
  points: number;
  entryId: string;
}

/* ---------- small pure helpers ---------- */

const MODE_TO_DB: Record<BattleModeKey, Enums<"battle_mode">> = {
  steps: "most_steps",
  live: "live_race",
  blind: "blind_time_trial",
  ghost: "ghost_race",
  last: "last_one_standing",
  hold: "hold_the_route",
};
const MODE_FROM_DB = Object.fromEntries(Object.entries(MODE_TO_DB).map(([k, v]) => [v, k])) as Record<Enums<"battle_mode">, BattleModeKey>;
const STEP_MODES: Enums<"battle_mode">[] = ["most_steps", "last_one_standing"];
const TIME_MODES: Enums<"battle_mode">[] = ["live_race", "blind_time_trial", "ghost_race"];

/** Battle lengths the UI offers, as the database stores them. */
const DURATIONS: Record<string, number> = { Today: 24, "3 days": 72, "A week": 168, "7 days": 168, "Until someone drops": 168 };
const DISTANCES: Record<string, number> = { "3k": 3000, "5k": 5000, "10k": 10000, Half: 21097 };

/** Post reactions are stored by name in post_reactions.emoji. */
const REACTIONS: Reaction[] = ["fire", "pushed", "respect"];
const WELCOME = "welcome";

const TRUST: Record<Enums<"trust_level">, Trust> = { new: "New", verified: "Verified", established: "Established", restricted: "New" };

const NOTE_ICONS: Record<string, IconName> = { battle: "trophy", club: "people", league: "flag", drop: "store", social: "people", system: "bell" };

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const unique = <T>(xs: Iterable<T>): T[] => [...new Set(xs)];
const pounds = (pence: number): string => `£${formatNumber(pence / 100)}`;
const shortId = (id: string): string => `${id.slice(0, 2)}…${id.slice(-2)}`;
const shortSeed = (s: string | null): string => (!s ? "" : s.length > 9 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s);

function chunk<T>(xs: T[], size = 100): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
}

function field(data: Json, key: string): Json | undefined {
  return data && typeof data === "object" && !Array.isArray(data) ? data[key] : undefined;
}
const str = (data: Json, key: string): string | undefined => {
  const v = field(data, key);
  return typeof v === "string" ? v : undefined;
};
const num = (data: Json, key: string): number | undefined => {
  const v = field(data, key);
  return typeof v === "number" ? v : undefined;
};
const strs = (data: Json, key: string): string[] => {
  const v = field(data, key);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
};

/** "Dami, Zain, Mei and 28 others" */
function withLine(names: string[], total = names.length): string {
  const shown = names.slice(0, 3).map(firstName);
  const rest = total - shown.length;
  if (!shown.length) return "";
  if (rest > 0) return `${shown.join(", ")} and ${rest} other${rest === 1 ? "" : "s"}`;
  if (shown.length === 1) return shown[0] ?? "";
  return `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
}

function paceGroup(secondsPerKm: number | undefined): PaceGroup {
  if (secondsPerKm === undefined) return "Easy";
  if (secondsPerKm < 300) return "Fast";
  if (secondsPerKm < 360) return "Steady";
  if (secondsPerKm < 480) return "Easy";
  return "Walk";
}

function codeFor(name: string): string {
  const words = name.split(/\s+/).filter((w) => !["and", "upon", "of", "the"].includes(w.toLowerCase()));
  const code = words.length > 1 ? words.map((w) => w[0]).join("") : name.replace(/[^a-z]/gi, "").slice(0, 3);
  return code.slice(0, 3).toUpperCase();
}

const neutralRun = (): ClubRun => ({ id: "", clubId: "", day: "", date: 0, time: "", title: "", place: "", detail: "", going: 0, goingIds: [], imGoing: false });

/**
 * Outhere's real backend. Reads assemble the same view models the mock
 * returns from the tables, views and functions in supabase/migrations; writes
 * go through the database functions where the schema has one, and straight
 * into tables under row level security otherwise.
 *
 * Make one per request (or per signed in session in a browser): it caches who
 * is signed in and reference data such as boroughs.
 */
export class SupabaseData implements OuthereData {
  private readonly now: () => Date;
  private readonly placeholder: string;
  private readonly defaultCity: string;
  private readonly signedSeconds: number;
  private memo = new Map<string, Promise<unknown>>();
  private readonly knownUser: boolean;

  constructor(
    private readonly client: SupabaseClient<Database>,
    opts: SupabaseDataOptions = {},
  ) {
    this.now = opts.now ?? (() => new Date());
    this.placeholder = opts.placeholderImage ?? "";
    this.defaultCity = opts.defaultCity ?? "london";
    this.signedSeconds = opts.signedUrlSeconds ?? 3600;
    this.knownUser = opts.userId !== undefined;
    if (this.knownUser) this.memo.set("uid", Promise.resolve(opts.userId ?? null));
  }

  /** Forget cached reads, for example after signing in as someone else. */
  refresh(): void {
    const uid = this.memo.get("uid");
    this.memo.clear();
    // A user id handed in by the caller is still right; anything we looked up ourselves is not.
    if (uid && this.knownUser) this.memo.set("uid", uid);
  }

  private once<T>(key: string, load: () => Promise<T>): Promise<T> {
    let p = this.memo.get(key) as Promise<T> | undefined;
    if (!p) {
      p = load();
      this.memo.set(key, p);
      p.catch(() => this.memo.delete(key));
    }
    return p;
  }

  /** After a write, who belongs where may have changed. */
  private changed(): void {
    this.memo.delete("ctx");
  }

  /* ---------- who is looking ---------- */

  private uid(): Promise<string | null> {
    return this.once("uid", async () => {
      const { data, error } = await this.client.auth.getUser();
      return error ? null : (data.user?.id ?? null);
    });
  }

  private ctx(): Promise<Ctx> {
    return this.once("ctx", async () => {
      const me = await this.uid();
      if (!me) throw new DataError("NOT_SIGNED_IN");
      const [profile, memberships, staff] = await Promise.all([
        this.client.from("profiles").select(PROFILE).eq("id", me).maybeSingle().then(one),
        this.client.from("club_members").select("club_id, role, joined_at").eq("user_id", me).order("joined_at").then(rows),
        this.client.from("staff").select("role").eq("user_id", me).then(rows),
      ]);
      if (!profile) throw new DataError("NOT_SIGNED_IN");
      const clubIds = memberships.map((m) => m.club_id);
      return {
        me,
        profile,
        memberships,
        clubIds,
        staff: staff.map((s) => s.role),
        homeClubId: profile.home_club_id ?? clubIds[0] ?? null,
        cityId: profile.city_id ?? this.defaultCity,
      };
    });
  }

  private async requireStaff(): Promise<Ctx> {
    const ctx = await this.ctx();
    if (!ctx.staff.length) throw new DataError("STAFF_ONLY");
    return ctx;
  }

  async viewer(): Promise<Viewer> {
    const ctx = await this.ctx();
    const p = ctx.profile;
    const [dot, boroughs] = await Promise.all([
      this.client.from("member_dots").select("dot").eq("user_id", ctx.me).maybeSingle().then(one),
      this.boroughNames(),
    ]);
    const roles: Role[] = ["member"];
    if (ctx.memberships.some((m) => m.role === "captain" || m.role === "admin")) roles.push("captain");
    if (ctx.staff.length) roles.push("staff");
    const avatar = this.media("avatars", p.avatar_path);
    return {
      id: p.id,
      name: p.display_name,
      photo: avatar,
      avatar,
      tier: p.tier,
      ...outNow(dot?.dot),
      handle: p.username,
      borough: (p.borough_id && boroughs.get(p.borough_id)) || "",
      roles,
      homeClubId: ctx.homeClubId ?? "",
      level: p.level,
      streakDays: p.streak_days,
      ...(p.founding_number !== null ? { foundingNumber: p.founding_number } : {}),
      trust: TRUST[p.trust],
      // Profiles are always public in the schema; there is no setting yet.
      publicProfile: true,
    };
  }

  /**
   * Everyone the signed in member is likely to see: themselves, their clubs,
   * people they follow or who follow them, their battles, live stories, recent
   * posts and nearby pick-ups. Signed out, nobody.
   */
  async people(): Promise<Record<string, Person>> {
    const me = await this.uid();
    if (!me) return {};
    const ctx = await this.ctx();
    const [mates, follows, battles, stories, posts, pickups] = await Promise.all([
      ctx.clubIds.length ? this.client.from("club_members").select("user_id").in("club_id", ctx.clubIds).limit(2000).then(rows) : [],
      this.client.from("follows").select("follower_id, followee_id").or(`follower_id.eq.${me},followee_id.eq.${me}`).limit(1000).then(rows),
      this.client.from("battles").select("challenger_id, opponent_id").limit(200).then(rows),
      this.client.from("stories").select("author_id").gt("expires_at", this.now().toISOString()).limit(200).then(rows),
      this.client.from("posts").select("author_id").order("created_at", { ascending: false }).limit(60).then(rows),
      this.pickupRows(ctx),
    ]);
    const ids = new Set<string>([me]);
    mates.forEach((m) => ids.add(m.user_id));
    follows.forEach((f) => (ids.add(f.follower_id), ids.add(f.followee_id)));
    battles.forEach((b) => (ids.add(b.challenger_id), ids.add(b.opponent_id)));
    stories.forEach((s) => ids.add(s.author_id));
    posts.forEach((p) => ids.add(p.author_id));
    pickups.events.forEach((e) => ids.add(e.created_by));
    pickups.rsvps.forEach((r) => ids.add(r.user_id));
    return this.loadPeople([...ids]);
  }

  private async loadPeople(ids: string[]): Promise<Record<string, Person>> {
    const out: Record<string, Person> = {};
    for (const part of chunk(unique(ids))) {
      const [profiles, dots] = await Promise.all([
        this.client.from("profiles").select(PERSON).in("id", part).then(rows),
        this.client.from("member_dots").select("user_id, dot").in("user_id", part).then(rows),
      ]);
      const dotOf = new Map(dots.map((d) => [d.user_id, d.dot]));
      for (const p of profiles) {
        const avatar = this.media("avatars", p.avatar_path);
        out[p.id] = { id: p.id, name: p.display_name, photo: avatar, avatar, tier: p.tier, ...outNow(dotOf.get(p.id)) };
      }
    }
    return out;
  }

  private async names(ids: string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    for (const part of chunk(unique(ids))) {
      const found = rows(await this.client.from("profiles").select("id, display_name").in("id", part));
      found.forEach((p) => out.set(p.id, p.display_name));
    }
    return out;
  }

  /* ---------- media ---------- */

  private media(bucket: "avatars" | "club-media" | "drops", path: string | null | undefined): string {
    if (!path) return this.placeholder;
    if (/^(https?:|data:|\/)/.test(path)) return path;
    return this.client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  /** Signed links for the private buckets, keyed by path. Missing ones are left out. */
  private async signed(bucket: "posts" | "stories", paths: string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    const wanted = unique(paths.filter(Boolean));
    for (const p of wanted) if (/^(https?:|data:|\/)/.test(p)) out.set(p, p);
    const toSign = wanted.filter((p) => !out.has(p));
    if (!toSign.length) return out;
    const { data, error } = await this.client.storage.from(bucket).createSignedUrls(toSign, this.signedSeconds);
    if (error || !data) return out;
    for (const d of data) if (d.path && d.signedUrl && !d.error) out.set(d.path, d.signedUrl);
    return out;
  }

  /* ---------- reference data ---------- */

  private boroughRows() {
    return this.once("boroughs", async () => rows(await this.client.from("boroughs").select("id, city_id, name, tile_col, tile_row").order("name")));
  }

  private async boroughNames(): Promise<Map<string, string>> {
    return new Map((await this.boroughRows()).map((b) => [b.id, b.name]));
  }

  private currentSeason(kind: Enums<"league_kind">) {
    return this.once(`season:${kind}`, async () => {
      const today = london(this.now()).date;
      return one(
        await this.client.from("seasons").select("id, name, number, starts_on, ends_on")
          .eq("kind", kind).lte("starts_on", today).gte("ends_on", today)
          .order("starts_on", { ascending: false }).limit(1).maybeSingle(),
      );
    });
  }

  private reveal(seed = ""): RevealInfo {
    return { at: nextReveal(this.now()), seed };
  }

  /* ---------- clubs ---------- */

  private async loadClubs(filter: { ids?: string[]; slug?: string; cityId?: string; boroughId?: string; limit?: number } = {}): Promise<Club[]> {
    if (filter.ids && !filter.ids.length) return [];
    let q = this.client.from("clubs").select(CLUB).neq("status", "suspended");
    if (filter.ids) q = q.in("id", filter.ids);
    if (filter.slug) q = q.eq("slug", filter.slug);
    if (filter.cityId) q = q.eq("city_id", filter.cityId);
    if (filter.boroughId) q = q.eq("borough_id", filter.boroughId);
    const clubRows = rows(await q.order("member_count", { ascending: false }).limit(filter.limit ?? 500));
    return this.toClubs(clubRows);
  }

  private async loadClub(id: string): Promise<Club> {
    const [club] = await this.loadClubs({ ids: [id] });
    if (!club) throw new DataError("NO_SUCH_CLUB");
    return club;
  }

  private async toClubs(clubRows: ClubRow[]): Promise<Club[]> {
    const ids = clubRows.map((c) => c.id);
    const [boroughs, next, standings] = await Promise.all([this.boroughNames(), this.nextClubRuns(ids), this.clubStandings(ids)]);
    return clubRows.map((c) => {
      const words = c.name.split(" ");
      const n = next.get(c.id);
      const s = standings.get(c.id);
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        nameTop: nameTop(c.name),
        nameBottom: words.slice(1).join(" "),
        borough: (c.borough_id && boroughs.get(c.borough_id)) || "",
        cover: this.media("club-media", c.cover_path),
        crest: this.media("club-media", c.logo_path),
        verified: c.status === "verified",
        founding: c.status === "founding",
        members: c.member_count,
        nextRun: n ? `${shortDay(london(n.starts_at).date)} ${hhmm(n.starts_at)} · ${n.place_name}` : (c.usual_times ?? ""),
        tags: [],
        filters: [],
        division: s?.division ?? (c.status === "founding" ? "Founding" : ""),
        position: s?.position ?? 0,
        since: new Date(c.created_at).getUTCFullYear(),
        tagline: c.tagline ?? "",
      };
    });
  }

  private async nextClubRuns(clubIds: string[]): Promise<Map<string, { starts_at: string; place_name: string }>> {
    const out = new Map<string, { starts_at: string; place_name: string }>();
    for (const part of chunk(clubIds)) {
      const found = rows(
        await this.client.from("events").select("club_id, starts_at, place_name")
          .in("club_id", part).eq("kind", "club_run").is("cancelled_at", null)
          .gte("starts_at", this.now().toISOString()).order("starts_at").limit(1000),
      );
      for (const e of found) if (e.club_id && !out.has(e.club_id)) out.set(e.club_id, e);
    }
    return out;
  }

  /** Division and league position of each club in the current club season. */
  private async clubStandings(clubIds: string[]): Promise<Map<string, Standing>> {
    const out = new Map<string, Standing>();
    const season = clubIds.length ? await this.currentSeason("club") : null;
    if (!season) return out;
    const divisions = rows(await this.client.from("divisions").select("id, name").eq("season_id", season.id));
    if (!divisions.length) return out;
    const divName = new Map(divisions.map((d) => [d.id, d.name]));
    const mine = rows(await this.client.from("league_entries").select("id, division_id, club_id").in("club_id", clubIds).in("division_id", [...divName.keys()]));
    const divIds = unique(mine.map((e) => e.division_id));
    if (!divIds.length) return out;
    const table = rows(await this.client.from("league_entries").select("id, division_id, club_id, points").in("division_id", divIds).order("points", { ascending: false }));
    for (const e of mine) {
      if (!e.club_id) continue;
      const div = table.filter((t) => t.division_id === e.division_id);
      const at = div.findIndex((t) => t.id === e.id);
      out.set(e.club_id, { division: divName.get(e.division_id) ?? "", position: at + 1, points: div[at]?.points ?? 0, entryId: e.id });
    }
    return out;
  }

  async clubs(query: ClubQuery = {}): Promise<Club[]> {
    const q = (query.q ?? "").trim().toLowerCase();
    const all = await this.loadClubs();
    const list = all.filter(
      (c) =>
        (!query.borough || c.borough === query.borough) &&
        (query.filters ?? []).every((f) => c.filters.includes(f)) &&
        (!q || `${c.name} ${c.borough} ${c.nextRun}`.toLowerCase().includes(q)),
    );
    if (query.sort === "biggest") list.sort((a, b) => b.members - a.members);
    else if (query.sort === "newest") list.sort((a, b) => b.since - a.since);
    else if (query.sort === "closest") {
      // Distance on the borough tile map from the viewer's borough; clubs with no borough go last.
      const tiles = await this.boroughRows();
      const mine = (await this.uid()) ? (await this.ctx()).profile.borough_id : null;
      const here = tiles.find((b) => b.id === mine);
      const away = (c: Club) => {
        const t = tiles.find((b) => b.name === c.borough);
        return here && t ? Math.hypot((t.tile_col ?? 0) - (here.tile_col ?? 0), (t.tile_row ?? 0) - (here.tile_row ?? 0)) : 99;
      };
      list.sort((a, b) => away(a) - away(b));
    }
    return list;
  }

  async clubBySlug(slug: string): Promise<Club | null> {
    const [club] = await this.loadClubs({ slug: slug.toLowerCase() });
    return club ?? null;
  }

  /* ---------- events ---------- */

  private async rsvpsFor(eventIds: string[]): Promise<RsvpRow[]> {
    const out: RsvpRow[] = [];
    for (const part of chunk(eventIds)) {
      out.push(...rows(await this.client.from("event_rsvps").select("event_id, user_id, status").in("event_id", part).order("created_at")));
    }
    return out;
  }

  private toRun(e: EventRow, rsvps: RsvpRow[], me: string | null): ClubRun {
    const mine = rsvps.filter((r) => r.event_id === e.id);
    const p = london(e.starts_at);
    return {
      id: e.id,
      clubId: e.club_id ?? "",
      day: dayCaps(e.starts_at),
      date: p.day,
      time: hhmm(e.starts_at),
      title: e.title,
      place: e.place_name,
      detail: e.pace_label ?? e.description ?? "",
      going: mine.length,
      goingIds: mine.slice(0, 6).map((r) => r.user_id),
      imGoing: !!me && mine.some((r) => r.user_id === me),
    };
  }

  private async upcomingClubRuns(clubId: string, limit: number, me: string | null): Promise<ClubRun[]> {
    const events = rows(
      await this.client.from("events").select(EVENT).eq("club_id", clubId).eq("kind", "club_run")
        .is("cancelled_at", null).gte("starts_at", this.now().toISOString()).order("starts_at").limit(limit),
    );
    const rsvps = await this.rsvpsFor(events.map((e) => e.id));
    return events.map((e) => this.toRun(e, rsvps, me));
  }

  private async nextRun(ctx: Ctx): Promise<ClubRun> {
    if (!ctx.homeClubId) return neutralRun();
    const [run] = await this.upcomingClubRuns(ctx.homeClubId, 1, ctx.me);
    return run ?? neutralRun();
  }

  async setRsvp(runId: string, going: boolean): Promise<void> {
    done(await this.client.rpc("rsvp_event", { p_event: runId, p_going: going }));
  }

  /* ---------- fixtures ---------- */

  /** This week's fixture for a club or a city, with both sides' names and live scores. */
  private async currentFixture(side: { clubId: string } | { cityId: string }): Promise<FixtureInfo | null> {
    const isClub = "clubId" in side;
    const season = await this.currentSeason(isClub ? "club" : "city");
    if (!season) return null;
    const divisions = rows(await this.client.from("divisions").select("id, name, squad_size").eq("season_id", season.id));
    if (!divisions.length) return null;
    let eq = this.client.from("league_entries").select("id, division_id, club_id, city_id, points").in("division_id", divisions.map((d) => d.id));
    eq = isClub ? eq.eq("club_id", side.clubId) : eq.eq("city_id", side.cityId);
    const entry = one(await eq.limit(1).maybeSingle());
    if (!entry) return null;
    const today = london(this.now()).date;
    const fixture = one(
      await this.client.from("fixtures").select(FIXTURE).eq("division_id", entry.division_id)
        .or(`home_id.eq.${entry.id},away_id.eq.${entry.id}`)
        .lte("starts_on", today).gte("ends_on", today).order("week", { ascending: false }).limit(1).maybeSingle(),
    );
    if (!fixture) return null;
    const usHome = fixture.home_id === entry.id;
    const otherId = usHome ? fixture.away_id : fixture.home_id;
    const other = one(await this.client.from("league_entries").select("id, division_id, club_id, city_id, points").eq("id", otherId).maybeSingle());
    if (!other) return null;
    const division = divisions.find((d) => d.id === entry.division_id);
    const [us, them] = await Promise.all([
      this.side(entry, fixture, usHome ? fixture.home_score : fixture.away_score),
      this.side(other, fixture, usHome ? fixture.away_score : fixture.home_score),
    ]);
    const days = (Date.parse(season.ends_on) - Date.parse(season.starts_on)) / 86_400_000 + 1;
    return {
      row: fixture,
      seasonName: season.name,
      weeks: Math.max(1, Math.ceil(days / 7)),
      division: division?.name ?? "",
      squadSize: division?.squad_size ?? 0,
      us,
      them,
      usHome,
    };
  }

  private async side(
    entry: { id: string; club_id: string | null; city_id: string | null; points: number },
    fixture: FixtureRow,
    stored: number | null,
  ): Promise<Side> {
    let name = "";
    let crest = "";
    if (entry.club_id) {
      const club = one(await this.client.from("clubs").select("name, logo_path").eq("id", entry.club_id).maybeSingle());
      name = club?.name ?? "";
      crest = this.media("club-media", club?.logo_path);
    } else if (entry.city_id) {
      const city = one(await this.client.from("cities").select("name").eq("id", entry.city_id).maybeSingle());
      name = city?.name ?? "";
    }
    let score = stored;
    if (score === null) {
      const res = await this.client.rpc("fixture_side_score", { p_fixture: fixture.id, p_entry: entry.id });
      if (res.error) throw new DataError("DB_ERROR", res.error);
      score = Number(res.data ?? 0);
    }
    return { entryId: entry.id, name, short: name.split(" ")[0] ?? name, crest, clubId: entry.club_id, cityId: entry.city_id, points: entry.points, score: Math.round(score) };
  }

  private toDerby(f: FixtureInfo, outIds: string[]): Derby {
    const home = f.usHome ? f.us : f.them;
    const away = f.usHome ? f.them : f.us;
    const card = (s: Side) => ({ name: s.name, short: s.short, crest: s.crest, score: s.score });
    return {
      id: f.row.id,
      home: card(home),
      away: card(away),
      division: f.division,
      week: `week ${f.row.week} of ${f.weeks}`,
      endsAt: `Ends ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][weekdayOf(f.row.ends_on)] ?? ""}`,
      outNow: outIds,
    };
  }

  private neutralDerby(club?: Club): Derby {
    const name = club?.name ?? "";
    return {
      id: "",
      home: { name, short: club?.nameTop ?? "", crest: club?.crest ?? "", score: 0 },
      away: { name: "", short: "", crest: "", score: 0 },
      division: club?.division ?? "",
      week: "",
      endsAt: "",
      outNow: [],
    };
  }

  /** Club members wearing a dot right now. */
  private async clubDots(clubId: string): Promise<{ user_id: string; dot: string }[]> {
    const members = rows(await this.client.from("club_members").select("user_id").eq("club_id", clubId).limit(2000));
    const out: { user_id: string; dot: string }[] = [];
    for (const part of chunk(members.map((m) => m.user_id))) {
      const dots = rows(await this.client.from("member_dots").select("user_id, dot").in("user_id", part).not("dot", "is", null));
      for (const d of dots) if (d.user_id && d.dot) out.push({ user_id: d.user_id, dot: d.dot });
    }
    return out;
  }

  private async homeDerby(ctx: Ctx): Promise<{ derby: Derby; fixture: FixtureInfo | null }> {
    if (!ctx.homeClubId) return { derby: this.neutralDerby(), fixture: null };
    const [fixture, dots] = await Promise.all([this.currentFixture({ clubId: ctx.homeClubId }), this.clubDots(ctx.homeClubId)]);
    if (!fixture) {
      const club = await this.loadClub(ctx.homeClubId).catch(() => undefined);
      return { derby: this.neutralDerby(club), fixture: null };
    }
    return { derby: this.toDerby(fixture, dots.slice(0, 8).map((d) => d.user_id)), fixture };
  }

  /* ---------- steps ---------- */

  private async weekSteps(me: string): Promise<{ days: number[]; counted: number }> {
    const monday = mondayOf(london(this.now()).date);
    const found = rows(await this.client.from("daily_steps").select("day, steps, counted").eq("user_id", me).gte("day", monday).lte("day", addDays(monday, 6)));
    const days = Array.from({ length: 7 }, (_, i) => found.find((d) => d.day === addDays(monday, i))?.steps ?? 0);
    return { days, counted: found.reduce((n, d) => n + (d.counted ?? 0), 0) };
  }

  /* ---------- member area ---------- */

  async home(): Promise<HomeView> {
    const ctx = await this.ctx();
    const [{ derby, fixture }, callup, week, nextRun, activity] = await Promise.all([
      this.homeDerby(ctx),
      this.callup(ctx),
      this.weekSteps(ctx.me),
      this.nextRun(ctx),
      this.clubActivity(ctx),
    ]);
    return {
      derby,
      callup,
      week: week.days,
      weekCounted: week.counted,
      nextRun,
      // Borough step totals need a server side aggregate; see SCHEMA_GAPS.md.
      boroughTable: [],
      boroughLine: "",
      clubActivity: activity,
      reveal: this.reveal(shortSeed(fixture?.row.draw_seed ?? null)),
    };
  }

  private async callup(ctx: Ctx): Promise<HomeView["callup"]> {
    const empty = { match: "", league: "", squadNumber: 0, average: 0 };
    const fixture = await this.currentFixture({ cityId: ctx.cityId });
    if (!fixture) return empty;
    const squad = rows(await this.client.from("squad_members").select("user_id").eq("fixture_id", fixture.row.id).eq("entry_id", fixture.us.entryId));
    if (!squad.some((s) => s.user_id === ctx.me)) return empty;
    const home = fixture.usHome ? fixture.us : fixture.them;
    const away = fixture.usHome ? fixture.them : fixture.us;
    return {
      match: `${home.name} v ${away.name}`,
      league: `City League · ${fixture.division} · ${fixture.squadSize} a side`,
      squadNumber: 0,
      // The side's live score: average counted steps with the turnout bonus.
      average: fixture.us.score,
    };
  }

  /** Recent joins, check-ins and posts in the home club. */
  private async clubActivity(ctx: Ctx): Promise<HomeView["clubActivity"]> {
    if (!ctx.homeClubId) return [];
    const club = ctx.homeClubId;
    const since = new Date(this.now().getTime() - 7 * 86_400_000).toISOString();
    const [joins, events, posts] = await Promise.all([
      this.client.from("club_members").select("user_id, joined_at, source").eq("club_id", club).gte("joined_at", since).order("joined_at", { ascending: false }).limit(5).then(rows),
      this.client.from("events").select("id, title").eq("club_id", club).gte("starts_at", since).lte("starts_at", this.now().toISOString()).limit(20).then(rows),
      this.client.from("posts").select("author_id, kind, body, created_at").eq("club_id", club).gte("created_at", since).order("created_at", { ascending: false }).limit(5).then(rows),
    ]);
    const checkins = events.length
      ? rows(
          await this.client.from("event_rsvps").select("event_id, user_id, checked_in_at").in("event_id", events.map((e) => e.id))
            .eq("status", "checked_in").order("checked_in_at", { ascending: false }).limit(5),
        )
      : [];
    const names = await this.names([...joins.map((j) => j.user_id), ...checkins.map((c) => c.user_id), ...posts.map((p) => p.author_id)]);
    const who = (id: string) => `<strong>${esc(firstName(names.get(id) ?? ""))}</strong>`;
    const items: { personId: string; html: string; at: string }[] = [
      ...joins.map((j) => ({ personId: j.user_id, html: `${who(j.user_id)} joined the club${j.source === "qr" ? " from a QR code" : ""}`, at: j.joined_at })),
      ...checkins.map((c) => ({ personId: c.user_id, html: `${who(c.user_id)} checked in to ${esc(events.find((e) => e.id === c.event_id)?.title ?? "a run")}`, at: c.checked_in_at ?? since })),
      ...posts.map((p) => ({ personId: p.author_id, html: `${who(p.author_id)} posted${p.body ? `: ${esc(p.body.slice(0, 60))}` : ""}`, at: p.created_at })),
    ];
    return items
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 5)
      .map(({ personId, html, at }) => ({ personId, html, ago: ago(at, this.now()) }));
  }

  async feed(): Promise<FeedView> {
    const ctx = await this.ctx();
    const [stories, posts, outNowList, week, nextRun, chatPreview, derby] = await Promise.all([
      this.stories(ctx),
      this.posts(ctx),
      this.outNow(ctx),
      this.feedWeek(ctx),
      this.nextRun(ctx),
      this.chatPreview(ctx),
      this.homeDerby(ctx),
    ]);
    const derbyPost: FeedPost[] = derby.fixture ? [{ id: `derby-${derby.derby.id}`, kind: "derby", scopes: ["club"], derby: derby.derby }] : [];
    return { stories, posts: [...derbyPost, ...posts], outNow: outNowList, week, nextRun, chatPreview };
  }

  private async stories(ctx: Ctx): Promise<Story[]> {
    const live = rows(
      await this.client.from("stories").select("id, author_id, club_id, media_path, caption, created_at")
        .gt("expires_at", this.now().toISOString()).order("created_at", { ascending: false }).limit(50),
    );
    if (!live.length) return [];
    const [views, urls] = await Promise.all([
      this.client.from("story_views").select("story_id").eq("user_id", ctx.me).in("story_id", live.map((s) => s.id)).then(rows),
      this.signed("stories", live.map((s) => s.media_path)),
    ]);
    const seen = new Set(views.map((v) => v.story_id));
    const out = live.map((s): Story => ({
      id: s.id,
      ...(s.club_id ? { clubId: s.club_id } : { personId: s.author_id }),
      image: urls.get(s.media_path) ?? this.placeholder,
      caption: s.caption ?? "",
      seen: seen.has(s.id),
    }));
    // Unwatched first, newest first within each.
    return [...out.filter((s) => !s.seen), ...out.filter((s) => s.seen)];
  }

  private async posts(ctx: Ctx): Promise<FeedPost[]> {
    const list = rows(await this.client.from("posts").select(POST).is("hidden_at", null).order("created_at", { ascending: false }).limit(30));
    if (!list.length) return [];
    const ids = list.map((p) => p.id);
    const runIds = unique(list.flatMap((p) => (p.run_id ? [p.run_id] : [])));
    const eventIds = unique(list.flatMap((p) => (p.event_id ? [p.event_id] : [])));
    const battleIds = unique(list.flatMap((p) => (p.battle_id ? [p.battle_id] : [])));
    const [reactions, comments, runs, events, battleRows, follows, authors, clubs, media] = await Promise.all([
      this.client.from("post_reactions").select("post_id, user_id, emoji").in("post_id", ids).then(rows),
      this.client.from("post_comments").select("post_id, author_id, body, created_at").in("post_id", ids).is("hidden_at", null).order("created_at").then(rows),
      runIds.length ? this.client.from("runs").select("id, title, distance_m, moving_s, avg_pace_s_per_km, kind").in("id", runIds).then(rows) : [],
      eventIds.length ? this.client.from("events").select("id, title, place_name, cover_path").in("id", eventIds).then(rows) : [],
      battleIds.length ? this.client.from("battle_board").select(BATTLE).in("id", battleIds).then(rows) : [],
      this.client.from("follows").select("followee_id").eq("follower_id", ctx.me).then(rows),
      this.client.from("profiles").select("id, display_name, borough_id").in("id", unique(list.map((p) => p.author_id))).then(rows),
      this.client.from("clubs").select("id, name").in("id", unique(list.flatMap((p) => (p.club_id ? [p.club_id] : [])))).then(rows),
      this.signed("posts", list.flatMap((p) => p.media_paths)),
    ]);
    const checkins = eventIds.length ? (await this.rsvpsFor(eventIds)).filter((r) => r.status === "checked_in") : [];
    const battles = await this.battleViews(battleRows, ctx.me);
    const following = new Set(follows.map((f) => f.followee_id));
    const author = new Map(authors.map((a) => [a.id, a]));
    const clubName = new Map(clubs.map((c) => [c.id, c.name]));
    const nameOf = await this.names([...list.flatMap((p) => strs(p.data, "with_ids")), ...checkins.map((c) => c.user_id)]);
    authors.forEach((a) => nameOf.set(a.id, a.display_name));

    const reactionsFor = (postId: string): ReactionCounts => {
      const mine = reactions.filter((r) => r.post_id === postId && r.user_id === ctx.me).map((r) => r.emoji);
      const n = (e: string) => reactions.filter((r) => r.post_id === postId && r.emoji === e).length;
      return { fire: n("fire"), pushed: n("pushed"), respect: n("respect"), mine: REACTIONS.filter((r) => mine.includes(r)) };
    };
    const commentsFor = (postId: string): FeedComment[] =>
      comments.filter((c) => c.post_id === postId).slice(-3).map((c) => ({ personId: c.author_id, text: c.body }));
    const scopesFor = (p: PostRow): FeedScope[] => {
      const s: FeedScope[] = [];
      if (p.club_id && ctx.clubIds.includes(p.club_id)) s.push("club");
      if (p.author_id === ctx.me || following.has(p.author_id)) s.push("follow");
      if (ctx.profile.borough_id && author.get(p.author_id)?.borough_id === ctx.profile.borough_id) s.push("borough");
      // Anything else visible to the member is from the wider city: show it with the borough feed.
      return s.length ? s : ["borough"];
    };
    const metaFor = (p: PostRow) => [p.club_id ? clubName.get(p.club_id) : undefined, str(p.data, "meta"), `${ago(p.created_at, this.now())} ago`].filter(Boolean).join(" · ");
    const withFor = (p: PostRow) => {
      const withIds = strs(p.data, "with_ids");
      return { withIds, withLine: withIds.length ? `with ${withLine(withIds.map((id) => nameOf.get(id) ?? ""))}` : "" };
    };
    const social = (p: PostRow) => ({ reactions: reactionsFor(p.id), comments: commentsFor(p.id), commentCount: p.comment_count });

    const out: FeedPost[] = [];
    for (const p of list) {
      const base = { id: p.id, scopes: scopesFor(p) };
      const body = p.body ?? "";
      const image = (p.media_paths[0] && media.get(p.media_paths[0])) || "";
      switch (p.kind) {
        case "photo":
          out.push({ ...base, kind: "photo", personId: p.author_id, meta: metaFor(p), text: body, image, alt: str(p.data, "alt") ?? body, ...social(p) });
          break;
        case "run_recap": {
          const run = runs.find((r) => r.id === p.run_id);
          if (!run) break;
          const route = str(p.data, "route");
          const impact = str(p.data, "impact");
          out.push({
            ...base,
            kind: "run",
            personId: p.author_id,
            meta: metaFor(p),
            title: run.title ?? body,
            km: (run.distance_m / 1000).toFixed(1),
            pace: run.avg_pace_s_per_km ? duration(run.avg_pace_s_per_km) : "",
            time: duration(run.moving_s),
            boroughPoints: num(p.data, "borough_points") ?? 0,
            route: (["rye", "river", "park"] as RouteShape[]).find((r) => r === route) ?? "park",
            ...(impact ? { impact } : {}),
            ...withFor(p),
            ...social(p),
          });
          break;
        }
        case "club_run_recap": {
          const event = events.find((e) => e.id === p.event_id);
          const here = checkins.filter((c) => c.event_id === p.event_id);
          const runners = num(p.data, "runners") ?? here.length;
          const withIds = strs(p.data, "with_ids").length ? strs(p.data, "with_ids") : here.slice(0, 6).map((c) => c.user_id);
          out.push({
            ...base,
            kind: "recap",
            image: image || this.media("club-media", event?.cover_path),
            title: [`${runners} ran`, event?.place_name ?? event?.title ?? ""],
            runners,
            km: num(p.data, "km") ?? 0,
            firstTimers: num(p.data, "first_timers") ?? 0,
            boroughPoints: num(p.data, "borough_points") ?? 0,
            impact: str(p.data, "impact") ?? body,
            withIds,
            withLine: withLine(withIds.map((id) => nameOf.get(id) ?? ""), runners),
            ...social(p),
          });
          break;
        }
        case "battle": {
          const battle = battles.find((b) => b.id === p.battle_id);
          if (battle) out.push({ ...base, kind: "battle", battle });
          break;
        }
        case "welcome":
          out.push({
            ...base,
            kind: "first-run",
            personId: p.author_id,
            text: body,
            welcomes: reactions.filter((r) => r.post_id === p.id && r.emoji === WELCOME).length,
            welcomed: reactions.some((r) => r.post_id === p.id && r.emoji === WELCOME && r.user_id === ctx.me),
          });
          break;
        case "reveal":
          out.push({ ...base, kind: "reveal", match: str(p.data, "match") ?? "", line: body, image });
          break;
        case "memory":
          out.push({ ...base, kind: "memory", then: str(p.data, "then") ?? "", now: str(p.data, "now") ?? "", line: body });
          break;
        default: {
          // text and milestone posts, and anything newer this client does not know yet.
          const raised = str(p.data, "fund_raised");
          out.push({
            ...base,
            kind: "club-post",
            personId: p.author_id,
            meta: metaFor(p),
            text: body,
            ...(raised ? { fund: { raised, line: str(p.data, "fund_line") ?? "" } } : {}),
            ...social(p),
          });
        }
      }
    }
    return out;
  }

  /** People the member knows who are out now or just stopped. */
  private async outNow(ctx: Ctx): Promise<OutNowEntry[]> {
    const [mates, follows] = await Promise.all([
      ctx.clubIds.length ? this.client.from("club_members").select("user_id").in("club_id", ctx.clubIds).limit(2000).then(rows) : [],
      this.client.from("follows").select("followee_id").eq("follower_id", ctx.me).then(rows),
    ]);
    const ids = unique([...mates.map((m) => m.user_id), ...follows.map((f) => f.followee_id)]).filter((id) => id !== ctx.me);
    const boroughs = await this.boroughNames();
    const out: OutNowEntry[] = [];
    for (const part of chunk(ids)) {
      const dots = rows(await this.client.from("member_dots").select("user_id, dot, borough_id, changed_at").in("user_id", part).not("dot", "is", null));
      for (const d of dots) {
        if (!d.user_id || !d.dot) continue;
        out.push({ personId: d.user_id, doing: d.dot === "out" ? "Out now" : "Just stopped", where: (d.borough_id && boroughs.get(d.borough_id)) || "" });
      }
    }
    // Out before stopped.
    return out.sort((a, b) => (a.doing === b.doing ? 0 : a.doing === "Out now" ? -1 : 1)).slice(0, 12);
  }

  private async feedWeek(ctx: Ctx): Promise<FeedView["week"]> {
    const monday = mondayOf(london(this.now()).date);
    const start = londonMidnight(monday);
    const [steps, checkins, xp] = await Promise.all([
      this.weekSteps(ctx.me),
      this.client.from("event_rsvps").select("event_id").eq("user_id", ctx.me).eq("status", "checked_in").gte("checked_in_at", start).then(rows),
      this.client.from("ledger").select("amount").eq("user_id", ctx.me).eq("currency", "xp").gte("created_at", start).then(rows),
    ]);
    const clubRuns = checkins.length
      ? rows(await this.client.from("events").select("id").in("id", checkins.map((c) => c.event_id)).eq("kind", "club_run")).length
      : 0;
    return {
      steps: steps.days.reduce((a, b) => a + b, 0),
      clubRuns,
      points: xp.reduce((n, l) => n + l.amount, 0),
      spark: steps.days.map((d) => Math.round(d / 1000)),
    };
  }

  private async chatPreview(ctx: Ctx): Promise<FeedView["chatPreview"]> {
    const empty = { personId: "", channel: "", text: "", unread: 0 };
    if (!ctx.homeClubId) return empty;
    const last = one(
      await this.client.from("club_messages").select("author_id, channel_id, body").eq("club_id", ctx.homeClubId)
        .is("hidden_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    );
    if (!last) return empty;
    const channel = one(await this.client.from("club_channels").select("name").eq("id", last.channel_id).maybeSingle());
    return { personId: last.author_id, channel: channel?.name ?? "", text: last.body ?? "", unread: 0 };
  }

  async react(postId: string, reaction: Reaction): Promise<void> {
    const me = await this.signedIn();
    const existing = rows(await this.client.from("post_reactions").select("emoji").eq("post_id", postId).eq("user_id", me).eq("emoji", reaction));
    if (existing.length) {
      done(await this.client.from("post_reactions").delete().eq("post_id", postId).eq("user_id", me).eq("emoji", reaction));
    } else {
      done(await this.client.from("post_reactions").insert({ post_id: postId, user_id: me, emoji: reaction }));
    }
  }

  async comment(postId: string, text: string): Promise<void> {
    const clean = text.trim().slice(0, 500);
    if (!clean) return;
    const me = await this.signedIn();
    done(await this.client.from("post_comments").insert({ post_id: postId, author_id: me, body: clean }));
  }

  async welcome(postId: string): Promise<void> {
    const me = await this.signedIn();
    done(
      await this.client.from("post_reactions")
        .upsert({ post_id: postId, user_id: me, emoji: WELCOME }, { onConflict: "post_id,user_id,emoji", ignoreDuplicates: true }),
    );
  }

  async markStorySeen(storyId: string): Promise<void> {
    const me = await this.signedIn();
    done(await this.client.from("story_views").upsert({ story_id: storyId, user_id: me }, { onConflict: "story_id,user_id", ignoreDuplicates: true }));
  }

  private async signedIn(): Promise<string> {
    const me = await this.uid();
    if (!me) throw new DataError("NOT_SIGNED_IN");
    return me;
  }

  /* ---------- chat ---------- */

  async chat(clubId: string): Promise<ChatView> {
    const ctx = await this.ctx();
    const [club, channels, messages, leaders, dots, upcoming] = await Promise.all([
      this.loadClub(clubId),
      this.client.from("club_channels").select("id, name, staff_only_post, sort").eq("club_id", clubId).order("sort").then(rows),
      this.client.from("club_messages").select("id, channel_id, author_id, body, kind, data, created_at").eq("club_id", clubId)
        .is("hidden_at", null).order("created_at", { ascending: false }).limit(300).then(rows),
      this.client.from("club_members").select("user_id").eq("club_id", clubId).in("role", ["captain", "admin"]).then(rows),
      this.clubDots(clubId),
      this.upcomingClubRuns(clubId, 1, ctx.me),
    ]);
    const pollIds = messages.filter((m) => m.kind === "poll").map((m) => m.id);
    const votes = pollIds.length ? rows(await this.client.from("poll_votes").select("message_id, user_id, option_index").in("message_id", pollIds)) : [];
    const now = this.now();
    const toItems = (channelId: string): ChatItem[] => {
      const items: ChatItem[] = [];
      let lastDay = "";
      for (const m of messages.filter((x) => x.channel_id === channelId).reverse()) {
        const day = chatDay(m.created_at, now);
        if (day !== lastDay) items.push({ kind: "day", label: day });
        lastDay = day;
        const item: Extract<ChatItem, { kind: "message" }> = { kind: "message", id: m.id, personId: m.author_id, time: hhmm(m.created_at) };
        if (m.body && m.kind !== "poll") item.text = m.body;
        const photo = str(m.data, "path");
        if (m.kind === "photo" && photo) item.image = { src: this.media("club-media", photo), alt: str(m.data, "alt") ?? m.body ?? "" };
        const eventId = str(m.data, "event_id");
        if ((m.kind === "run_card" || m.kind === "event_card") && eventId) item.runId = eventId;
        if (m.kind === "poll") {
          const mine = votes.find((v) => v.message_id === m.id && v.user_id === ctx.me);
          item.poll = {
            question: m.body ?? "",
            options: strs(m.data, "options").map((label, i) => ({ label, votes: votes.filter((v) => v.message_id === m.id && v.option_index === i).length })),
            ...(mine ? { myVote: mine.option_index } : {}),
          };
        }
        items.push(item);
      }
      return items;
    };
    return {
      club,
      online: dots.length,
      onlineIds: dots.slice(0, 4).map((d) => d.user_id),
      channels: channels.map((c): ChatChannel => ({
        key: c.name,
        description: c.staff_only_post ? "Captains and admins post here" : "",
        unread: 0,
        leadersOnly: c.staff_only_post,
        items: toItems(c.id),
      })),
      nextRun: upcoming[0] ?? neutralRun(),
      onRun: dots.filter((d) => d.dot === "out").map((d) => d.user_id),
      leaders: leaders.map((l) => l.user_id),
    };
  }

  private async channelId(clubId: string, channel: string): Promise<string> {
    const c = one(await this.client.from("club_channels").select("id").eq("club_id", clubId).eq("name", channel).maybeSingle());
    if (!c) throw new DataError("NO_SUCH_CHANNEL");
    return c.id;
  }

  async sendChat(clubId: string, channel: string, text: string): Promise<void> {
    const clean = text.trim().slice(0, 1000);
    if (!clean) return;
    const me = await this.signedIn();
    const channelId = await this.channelId(clubId, channel);
    done(await this.client.from("club_messages").insert({ channel_id: channelId, club_id: clubId, author_id: me, body: clean, kind: "text" }));
  }

  async votePoll(_clubId: string, _channel: string, messageId: string, option: number): Promise<void> {
    const me = await this.signedIn();
    done(await this.client.from("poll_votes").upsert({ message_id: messageId, user_id: me, option_index: option }, { onConflict: "message_id,user_id" }));
  }

  async toggleChatReaction(): Promise<void> {
    // Chat messages have no reactions table yet; see SCHEMA_GAPS.md.
    throw new DataError("NOT_SUPPORTED");
  }

  async readChannel(): Promise<void> {
    // Nothing records what a member has read yet, so there is nothing to clear.
  }

  /* ---------- calendar ---------- */

  async calendar(): Promise<CalendarView> {
    const ctx = await this.ctx();
    const now = this.now();
    const t = london(now);
    const first = `${t.date.slice(0, 7)}-01`;
    const days = daysInMonth(t.year, t.month);
    const next = addDays(first, days);
    const from = londonMidnight(first);
    const to = londonMidnight(next);
    const [events, battles, moments, club] = await Promise.all([
      this.client.from("events").select(EVENT).eq("city_id", ctx.cityId).is("cancelled_at", null).gte("starts_at", from).lt("starts_at", to).order("starts_at").limit(500).then(rows),
      this.client.from("battle_board").select(BATTLE).in("status", ["accepted", "live", "finished"]).gte("ends_at", from).lt("ends_at", to).then(rows),
      this.client.from("events").select(EVENT).eq("kind", "city_moment").is("cancelled_at", null).gte("starts_at", now.toISOString()).order("starts_at").limit(3).then(rows),
      ctx.homeClubId ? this.loadClub(ctx.homeClubId).catch(() => null) : null,
    ]);
    const mine = events.length
      ? rows(await this.client.from("event_rsvps").select("event_id, status").eq("user_id", ctx.me).in("event_id", events.map((e) => e.id)))
      : [];
    const opponentNames = await this.names(battles.flatMap((b) => [b.challenger_id, b.opponent_id].filter((x): x is string => !!x)));
    const out: CalendarEvent[] = events.map((e) => {
      const r = mine.find((m) => m.event_id === e.id);
      const past = e.starts_at < now.toISOString();
      const scope = r ? "mine" : e.club_id && ctx.clubIds.includes(e.club_id) ? "club" : "london";
      return {
        id: e.id,
        date: london(e.starts_at).day,
        time: hhmm(e.starts_at),
        title: e.title,
        where: e.place_name,
        scope,
        ...(r ? { kind: r.status === "checked_in" || past ? ("done" as const) : ("going" as const) } : {}),
        ...(e.kind === "city_moment" ? { global: true } : {}),
      };
    });
    for (const b of battles) {
      if (!b.id || !b.ends_at || !b.mode) continue;
      const other = b.challenger_id === ctx.me ? b.opponent_id : b.challenger_id;
      out.push({
        id: `battle-${b.id}`,
        date: london(b.ends_at).day,
        time: hhmm(b.ends_at),
        title: `Your battle with ${firstName(opponentNames.get(other ?? "") ?? "")} ends`,
        where: modeName(b.mode, b.distance_m),
        scope: "mine",
        kind: "battle",
      });
    }
    return {
      monthName: MONTHS[t.month - 1] ?? "",
      year: t.year,
      daysInMonth: days,
      leadingBlanks: weekdayOf(first),
      today: t.day,
      weekStart: Math.max(1, t.day - t.weekday),
      events: out.sort((a, b) => a.date - b.date || (a.time < b.time ? -1 : 1)),
      bigMoments: moments.map((e) => ({ image: this.media("club-media", e.cover_path), date: dateLabel(e.starts_at), title: e.title, line: e.description ?? e.place_name })),
      clubName: club?.name ?? "",
    };
  }

  /* ---------- battles ---------- */

  /** Battle cards with live scores worked out from steps or entries. */
  private async battleViews(list: BattleRow[], me: string): Promise<Battle[]> {
    const valid = list.filter((b): b is BattleRow & { id: string; mode: Enums<"battle_mode">; challenger_id: string; opponent_id: string } =>
      !!b.id && !!b.mode && !!b.challenger_id && !!b.opponent_id);
    if (!valid.length) return [];
    const users = unique(valid.flatMap((b) => [b.challenger_id, b.opponent_id]));
    const stepBattles = valid.filter((b) => STEP_MODES.includes(b.mode) && b.starts_at);
    const firstDay = stepBattles.map((b) => london(b.starts_at ?? "").date).sort()[0];
    const [names, steps, entries] = await Promise.all([
      this.names(users),
      firstDay ? this.client.from("daily_steps").select("user_id, day, counted").in("user_id", users).gte("day", firstDay).then(rows) : [],
      this.client.from("battle_entries").select("battle_id, user_id, result").in("battle_id", valid.map((b) => b.id)).then(rows),
    ]);
    const today = london(this.now()).date;
    return valid.map((b): Battle => {
      const iAmChallenger = b.challenger_id === me;
      const other = iAmChallenger ? b.opponent_id : b.challenger_id;
      const first = firstName(names.get(other) ?? "");
      const stake = b.stake_out ? `${b.stake_out} OUT on it` : "Bragging rights";
      const mode = modeName(b.mode, b.distance_m);
      const ends = b.status === "pending"
        ? (iAmChallenger ? `Waiting for ${first}` : answerIn(b.created_at ?? "", this.now()))
        : b.ends_at ? endsLabel(b.ends_at) : "";
      if (STEP_MODES.includes(b.mode)) {
        const sum = (uid: string) => {
          const stored = uid === b.challenger_id ? b.challenger_result : b.opponent_result;
          if (stored !== null && b.status === "finished") return stored;
          if (!b.starts_at) return 0;
          const from = london(b.starts_at).date;
          const to = b.ends_at ? london(b.ends_at).date : today;
          return steps.filter((s) => s.user_id === uid && s.day >= from && s.day <= to).reduce((n, s) => n + (s.counted ?? 0), 0);
        };
        const us = sum(me);
        const them = sum(other);
        const diff = us - them;
        return {
          id: b.id, opponentId: other, mode, ends, stake,
          us: formatNumber(us), them: formatNumber(them),
          share: us + them ? Math.round((us / (us + them)) * 1000) / 10 : 50,
          note: b.status === "pending" ? "" : diff > 0 ? `You're ${formatNumber(diff)} ahead.` : diff < 0 ? `${first} is ${formatNumber(-diff)} ahead.` : "Level so far.",
          ...(b.mode === "last_one_standing" ? { even: true } : {}),
        };
      }
      const mineEntry = entries.find((e) => e.battle_id === b.id && e.user_id === me);
      const theirs = entries.find((e) => e.battle_id === b.id && e.user_id === other);
      const sealed = b.mode === "blind_time_trial" && !b.results_open;
      const show = (r: number | undefined) => (r === undefined ? "Not yet" : b.mode === "hold_the_route" ? `${r} laps` : duration(r));
      return {
        id: b.id, opponentId: other, mode, ends, stake,
        us: show(mineEntry?.result),
        them: sealed ? "Sealed" : show(theirs?.result),
        share: 50,
        note: sealed && mineEntry ? `Your time is in and sealed. You both see the result the moment ${first} finishes.` : "",
        ...(sealed ? { sealed: true } : {}),
      };
    });
  }

  async battles(): Promise<BattlesView> {
    const ctx = await this.ctx();
    const me = ctx.me;
    const [board, follows, mates, fixture] = await Promise.all([
      this.client.from("battle_board").select(BATTLE).order("created_at", { ascending: false }).limit(200).then(rows),
      this.client.from("follows").select("followee_id").eq("follower_id", me).then(rows),
      ctx.homeClubId ? this.client.from("club_members").select("user_id").eq("club_id", ctx.homeClubId).limit(50).then(rows) : [],
      ctx.homeClubId ? this.currentFixture({ clubId: ctx.homeClubId }) : null,
    ]);
    const live = board.filter((b) => b.status === "pending" || b.status === "accepted" || b.status === "live");
    const settled = board
      .filter((b) => b.status === "finished" || b.status === "forfeit")
      .sort((a, b) => (b.finished_at ?? "").localeCompare(a.finished_at ?? ""));
    const won = settled.filter((b) => b.winner_id === me).length;
    const lost = settled.filter((b) => b.winner_id && b.winner_id !== me).length;
    let streak = "";
    const firstDecided = settled.find((b) => b.winner_id);
    if (firstDecided) {
      const winning = firstDecided.winner_id === me;
      let n = 0;
      for (const b of settled) {
        if (!b.winner_id) break;
        if ((b.winner_id === me) !== winning) break;
        n += 1;
      }
      streak = `${winning ? "W" : "L"}${n}`;
    }
    const other = (b: BattleRow) => (b.challenger_id === me ? b.opponent_id : b.challenger_id) ?? "";
    const tally = new Map<string, { mine: number; theirs: number }>();
    for (const b of settled) {
      if (!b.winner_id) continue;
      const t = tally.get(other(b)) ?? { mine: 0, theirs: 0 };
      if (b.winner_id === me) t.mine += 1;
      else t.theirs += 1;
      tally.set(other(b), t);
    }
    const busy = new Set(live.map(other));
    const candidates = unique([...follows.map((f) => f.followee_id), ...settled.map(other), ...mates.map((m) => m.user_id)])
      .filter((id) => id && id !== me && !busy.has(id))
      .slice(0, 6);
    const [active, profile] = await Promise.all([
      this.battleViews(live.filter((b) => !(b.status === "pending" && b.opponent_id === me)), me),
      this.client.from("profiles").select("surprise_challengers").eq("id", me).maybeSingle().then(one),
    ]);
    const incoming = live.filter((b) => b.status === "pending" && b.opponent_id === me);
    return {
      record: { won, lost, streak, live: live.filter((b) => b.status !== "pending").length },
      rivals: [...tally.entries()]
        .sort((a, b) => b[1].mine + b[1].theirs - (a[1].mine + a[1].theirs))
        .slice(0, 4)
        .map(([personId, t]) => ({ personId, ...t })),
      candidates,
      modes: BATTLE_MODES.map((m) => ({ ...m })),
      stakes: ["Bragging rights", "25 OUT on it", "50 OUT on it", "100 OUT on it"],
      active,
      challenges: incoming.map((b) => ({
        id: b.id ?? "",
        fromId: b.challenger_id ?? "",
        mode: b.mode ? modeName(b.mode, b.distance_m) : "",
        line: b.stake_out ? `${b.stake_out} OUT on it.` : "",
        answerIn: answerIn(b.created_at ?? "", this.now()),
        accepted: false,
      })),
      results: settled.slice(0, 5).map((b) => ({
        personId: other(b),
        won: b.winner_id === me,
        mode: b.mode ? modeName(b.mode, b.distance_m) : "",
        line: resultLine(b, me),
      })),
      surpriseChallengers: profile?.surprise_challengers ?? ctx.profile.surprise_challengers,
      rivalClub: fixture ? { name: fixture.them.name, crest: fixture.them.crest } : { name: "", crest: "" },
    };
  }

  async createBattle(input: NewBattle): Promise<{ id: string }> {
    const mode = BATTLE_MODES.find((m) => m.key === input.mode);
    if (!mode) throw new DataError("BAD_MODE");
    if (!battleLengths(mode).options.includes(input.length)) throw new DataError("BAD_LENGTH");
    const byDistance = mode.length === "dist";
    const hours = DURATIONS[input.length];
    const metres = DISTANCES[input.length];
    if (byDistance ? metres === undefined : hours === undefined) throw new DataError("LENGTH_NOT_SUPPORTED");
    let opponent = input.opponentId;
    if (opponent === "random") {
      const deck = await this.client.rpc("rival_deck", { p_limit: 1 });
      if (deck.error) throw new DataError("DB_ERROR", deck.error);
      const pick = deck.data?.[0];
      if (!pick) throw new DataError("NOT_FOUND");
      opponent = pick.id;
    }
    const stake = Number(/(\d+)\s*OUT/i.exec(input.stake)?.[1] ?? 0);
    const res = await this.client.rpc("create_battle", {
      p_opponent: opponent,
      p_mode: MODE_TO_DB[mode.key],
      ...(byDistance ? { p_distance_m: metres } : { p_duration_h: hours }),
      p_stake_out: stake,
    });
    if (res.error) throw toDataError(res.error);
    return { id: res.data?.id ?? "" };
  }

  async acceptChallenge(id: string): Promise<void> {
    done(await this.client.rpc("respond_battle", { p_battle: id, p_accept: true }));
  }

  /** Declining returns any stake to the challenger; nobody gains or loses points. */
  async declineChallenge(id: string): Promise<void> {
    done(await this.client.rpc("respond_battle", { p_battle: id, p_accept: false }));
  }

  async setSurpriseChallengers(on: boolean): Promise<void> {
    const me = await this.signedIn();
    done(await this.client.from("profiles").update({ surprise_challengers: on }).eq("id", me));
    this.changed();
  }

  /* ---------- pick-ups ---------- */

  /** Open pick-ups in the member's city from an hour ago onwards. */
  private async pickupRows(ctx: Ctx): Promise<{ events: EventRow[]; rsvps: RsvpRow[] }> {
    const since = new Date(this.now().getTime() - 3_600_000).toISOString();
    const events = rows(
      await this.client.from("events").select(EVENT).is("club_id", null).in("kind", ["pickup", "open_run", "walk", "race"])
        .eq("city_id", ctx.cityId).is("cancelled_at", null).gte("starts_at", since).order("starts_at").limit(30),
    );
    return { events, rsvps: await this.rsvpsFor(events.map((e) => e.id)) };
  }

  private toPickup(e: EventRow, rsvps: RsvpRow[], me: string): Pickup {
    const going = rsvps.filter((r) => r.event_id === e.id);
    const mins = Math.round((Date.parse(e.starts_at) - this.now().getTime()) / 60_000);
    const type: PickupType = e.kind === "walk" ? "walk" : e.kind === "race" ? "race" : "run";
    return {
      id: e.id,
      hostId: e.created_by,
      type,
      ...(e.kind === "race" ? { openRace: true } : {}),
      title: e.title,
      when: whenLabel(e.starts_at, this.now()),
      ...(mins > 0 && mins <= 120 ? { soon: `in ${mins} min` } : {}),
      at: e.place_name,
      pace: e.pace_label ?? e.description ?? "",
      goingIds: going.filter((r) => r.user_id !== e.created_by).map((r) => r.user_id),
      capacity: e.capacity ?? 0,
      imIn: going.some((r) => r.user_id === me),
    };
  }

  async pickups(): Promise<PickupsView> {
    const ctx = await this.ctx();
    const [{ events, rsvps }, out, boroughs, club] = await Promise.all([
      this.pickupRows(ctx),
      this.client.rpc("outside_now", { p_city: ctx.cityId }),
      this.boroughNames(),
      ctx.homeClubId ? this.client.from("clubs").select("name").eq("id", ctx.homeClubId).maybeSingle().then(one) : null,
    ]);
    if (out.error) throw toDataError(out.error);
    // outside_now() returns one row per borough: { borough_id, out_now }.
    const outIn = (out.data ?? []).reduce<number>((n, r) => {
      const borough = str(r, "borough_id");
      const count = Number(field(r, "out_now") ?? 0);
      return !ctx.profile.borough_id || borough === ctx.profile.borough_id ? n + count : n;
    }, 0);
    return {
      list: events.map((e) => this.toPickup(e, rsvps, ctx.me)),
      area: (ctx.profile.borough_id && boroughs.get(ctx.profile.borough_id)) || "",
      // Pick-ups are not stored with a location yet, so the list covers the city; see SCHEMA_GAPS.md.
      radiusKm: 0,
      outNearby: outIn,
      clubName: club?.name ?? "",
    };
  }

  async setPickupGoing(id: string, going: boolean): Promise<void> {
    done(await this.client.rpc("rsvp_event", { p_event: id, p_going: going }));
  }

  async postPickup(input: NewPickup): Promise<Pickup> {
    const ctx = await this.ctx();
    const title = input.title.trim().slice(0, 48) || "Easy 5k after work";
    const at = input.at.trim().slice(0, 48) || "Peckham Rye, the bandstand";
    const startsAt = parseWhen(input.when, this.now());
    if (!startsAt) throw new DataError("BAD_TIME");
    const created = one(
      await this.client.from("events").insert({
        city_id: ctx.cityId,
        kind: "pickup",
        title,
        starts_at: startsAt,
        place_name: at,
        pace_label: input.type === "walk" ? "Chatty pace" : "Your pace, nobody gets dropped",
        capacity: 8,
        visibility: /club|member/i.test(input.visibility) ? "members" : "public",
        created_by: ctx.me,
      }).select(EVENT).maybeSingle(),
    );
    if (!created) throw new DataError("DB_ERROR");
    done(await this.client.rpc("rsvp_event", { p_event: created.id, p_going: true }));
    return this.toPickup(created, [{ event_id: created.id, user_id: ctx.me, status: "going" }], ctx.me);
  }

  async createRun(input: NewRun): Promise<void> {
    const ctx = await this.ctx();
    if (!/^\d{4}-\d\d-\d\d$/.test(input.date) || !/^\d\d:\d\d$/.test(input.time)) throw new DataError("BAD_TIME");
    const place = input.place.trim().slice(0, 60);
    if (!place) throw new DataError("NO_PLACE");
    const club = one(await this.client.from("clubs").select("id, city_id").eq("id", input.clubId).maybeSingle());
    if (!club) throw new DataError("NO_SUCH_CLUB");
    const [h, m] = input.time.split(":").map(Number);
    const startsAt = new Date(new Date(londonMidnight(input.date)).getTime() + ((h ?? 0) * 60 + (m ?? 0)) * 60_000).toISOString();
    if (startsAt < this.now().toISOString()) throw new DataError("BAD_TIME");
    // The events policy only lets club staff add club events, so the database refuses anyone else.
    done(
      await this.client.from("events").insert({
        club_id: club.id,
        city_id: club.city_id,
        kind: input.walk ? "walk" : "club_run",
        title: input.title.trim().slice(0, 48) || (input.walk ? "Club walk" : "Club run"),
        description: input.detail.trim().slice(0, 80) || null,
        starts_at: startsAt,
        place_name: place,
        visibility: "public",
        created_by: ctx.me,
      }),
    );
  }

  /* ---------- league, boroughs, plans ---------- */

  async league(): Promise<LeagueView> {
    const ctx = await this.ctx();
    const [season, cityFixture, myClubs, derby] = await Promise.all([
      this.currentSeason("city"),
      this.currentFixture({ cityId: ctx.cityId }),
      ctx.homeClubId ? this.clubStandings([ctx.homeClubId]) : new Map<string, Standing>(),
      this.homeDerby(ctx),
    ]);
    const today = london(this.now()).date;

    // City League: every division this season, top first.
    const divisions = season ? rows(await this.client.from("divisions").select("id, name, sort").eq("season_id", season.id).order("sort")) : [];
    const entries = divisions.length
      ? rows(await this.client.from("league_entries").select("id, division_id, city_id, points").in("division_id", divisions.map((d) => d.id)).order("points", { ascending: false }))
      : [];
    const [cities, cityForms] = await Promise.all([
      entries.length ? this.client.from("cities").select("id, name").in("id", unique(entries.flatMap((e) => (e.city_id ? [e.city_id] : [])))).then(rows) : [],
      this.forms(entries.map((e) => e.id)),
    ]);

    // The viewer's club division, in table order.
    const standing = ctx.homeClubId ? myClubs.get(ctx.homeClubId) : undefined;
    let clubTable: LeagueView["clubTable"] = [];
    if (standing) {
      const division = await this.entryDivision(standing.entryId);
      const table = division ? await this.divisionTable(division) : [];
      const [clubs, forms] = await Promise.all([this.loadClubs({ ids: table.flatMap((e) => (e.club_id ? [e.club_id] : [])) }), this.forms(table.map((e) => e.id))]);
      clubTable = table.flatMap((e) => {
        const club = clubs.find((c) => c.id === e.club_id);
        return club ? [{ club, form: forms.get(e.id) ?? "", points: e.points, ...(club.id === ctx.homeClubId ? { me: true } : {}) }] : [];
      });
    }

    const home = cityFixture ? (cityFixture.usHome ? cityFixture.us : cityFixture.them) : null;
    const away = cityFixture ? (cityFixture.usHome ? cityFixture.them : cityFixture.us) : null;
    const weeks = season ? Math.ceil(((Date.parse(season.ends_on) - Date.parse(season.starts_on)) / 86_400_000 + 1) / 7) : 0;
    const week = cityFixture?.row.week ?? 0;
    return {
      season: season ? `${season.name}${week ? ` · week ${week} of ${weeks}` : ""}` : "",
      match: {
        home: home?.name ?? "",
        away: away?.name ?? "",
        homeScore: home?.score ?? 0,
        awayScore: away?.score ?? 0,
        // Turnout per side needs the squad check-in rate; see SCHEMA_GAPS.md.
        homeTurnout: 0,
        awayTurnout: 0,
        division: cityFixture ? `City League ${cityFixture.division}` : "",
        dayOfWeek: cityFixture ? Math.max(0, Math.round((Date.parse(today) - Date.parse(cityFixture.row.starts_on)) / 86_400_000)) : 0,
      },
      divisions: divisions.map((d) => ({
        name: d.name,
        rows: entries
          .filter((e) => e.division_id === d.id)
          .map((e) => ({
            city: cities.find((c) => c.id === e.city_id)?.name ?? "",
            // City pictures and eligible counts are not readable yet; see SCHEMA_GAPS.md.
            image: "",
            points: e.points,
            form: cityForms.get(e.id) ?? "",
            eligible: 0,
            ...(e.city_id === ctx.cityId ? { me: true } : {}),
          })),
      })),
      rising: { city: "", eligible: 0, needed: 100 },
      clubTable,
      derby: derby.derby,
      reveal: this.reveal(shortSeed(cityFixture?.row.draw_seed ?? null)),
    };
  }

  private async entryDivision(entryId: string): Promise<string | null> {
    const e = one(await this.client.from("league_entries").select("division_id").eq("id", entryId).maybeSingle());
    return e?.division_id ?? null;
  }

  private async divisionTable(divisionId: string) {
    return rows(await this.client.from("league_entries").select("id, division_id, club_id, city_id, points").eq("division_id", divisionId).order("points", { ascending: false }));
  }

  /** Last five revealed results for each entry, newest last: "wwdlw". */
  private async forms(entryIds: string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    if (!entryIds.length) return out;
    const list = entryIds.join(",");
    const played = rows(
      await this.client.from("fixtures").select(FIXTURE).or(`home_id.in.(${list}),away_id.in.(${list})`)
        .not("revealed_at", "is", null).order("week", { ascending: true }),
    );
    for (const id of entryIds) {
      const letters = played
        .filter((f) => f.home_id === id || f.away_id === id)
        .map((f) => {
          const us = Number((f.home_id === id ? f.home_score : f.away_score) ?? 0);
          const them = Number((f.home_id === id ? f.away_score : f.home_score) ?? 0);
          return us > them ? "w" : us < them ? "l" : "d";
        });
      out.set(id, letters.slice(-5).join(""));
    }
    return out;
  }

  async boroughs(metric: BoroughMetric): Promise<BoroughStat[]> {
    const uid = await this.uid();
    const city = uid ? (await this.ctx()).cityId : this.defaultCity;
    const [boroughs, clubs] = await Promise.all([
      this.boroughRows(),
      metric === "clubs" ? this.client.from("clubs").select("borough_id").eq("city_id", city).neq("status", "suspended").limit(5000).then(rows) : [],
    ]);
    return boroughs
      .filter((b) => b.city_id === city)
      .map((b) => ({
        name: b.name,
        code: codeFor(b.name),
        col: b.tile_col ?? 0,
        row: b.tile_row ?? 0,
        // Step totals by borough need a server side aggregate; see SCHEMA_GAPS.md.
        value: metric === "clubs" ? clubs.filter((c) => c.borough_id === b.id).length : 0,
      }));
  }

  async me(): Promise<MeView> {
    const ctx = await this.ctx();
    const today = london(this.now()).date;
    const monday = mondayOf(today);
    const from = addDays(monday, -7 * 11);
    const monthStart = `${today.slice(0, 7)}-01`;
    const [club, steps, wallet, checkins] = await Promise.all([
      ctx.homeClubId ? this.client.from("clubs").select("name").eq("id", ctx.homeClubId).maybeSingle().then(one) : null,
      this.client.from("daily_steps").select("day, counted").eq("user_id", ctx.me).gte("day", from).then(rows),
      this.client.from("wallets").select("xp, out_available, out_held").eq("user_id", ctx.me).maybeSingle().then(one),
      this.client.from("event_rsvps").select("event_id, checked_in_at").eq("user_id", ctx.me).eq("status", "checked_in")
        .gte("checked_in_at", londonMidnight(from < monthStart ? from : monthStart)).then(rows),
    ]);
    const runs = checkins.length
      ? rows(await this.client.from("events").select("id, starts_at").in("id", checkins.map((c) => c.event_id)).eq("kind", "club_run"))
      : [];
    const runDays = runs.map((r) => london(r.starts_at).date);
    const weekStarts = Array.from({ length: 12 }, (_, i) => addDays(from, i * 7));
    const inWeek = (day: string, start: string) => day >= start && day < addDays(start, 7);
    const weekSteps = weekStarts.map((w) => steps.filter((d) => inWeek(d.day, w)).reduce((n, d) => n + (d.counted ?? 0), 0));
    const thisWeek = weekSteps[11] ?? 0;
    const lastWeek = weekSteps[10] ?? 0;
    const change = lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : 0;
    const role = ctx.memberships.find((m) => m.club_id === ctx.homeClubId)?.role;
    return {
      clubName: club?.name ?? "",
      clubRole: roleLabel(role),
      kpis: [
        { label: "Counted steps this week", value: thisWeek, delta: lastWeek ? `<b>${change >= 0 ? "+" : ""}${change}%</b> on last week` : "Your first week" },
        { label: "OUT available", value: wallet?.out_available ?? 0, delta: `<b>+${wallet?.out_held ?? 0}</b> pending release` },
        { label: "Club runs this month", value: runDays.filter((d) => d >= monthStart).length, delta: club?.name ? `With ${club.name}` : "Join a club to count them" },
        // Season points per member are not stored yet; level and XP stand in. See SCHEMA_GAPS.md.
        { label: "Level", value: ctx.profile.level, delta: `${formatNumber(wallet?.xp ?? 0)} XP` },
      ],
      weeks: {
        labels: weekStarts.map((_, i) => (i % 2 === 0 ? `W${i + 1}` : "")),
        steps: weekSteps.map((n) => Math.round(n / 1000)),
        runs: weekStarts.map((w) => runDays.filter((d) => inWeek(d, w)).length),
      },
      // Badges are not in the schema yet; see SCHEMA_GAPS.md.
      badges: [],
      badgesEarned: 0,
      badgesTotal: 0,
    };
  }

  /**
   * Someone's public page. Profiles are always public in the schema, so
   * visible is always true (see SCHEMA_GAPS.md). Steps and check-ins can only
   * be read signed in, so signed out visitors see level and streak only.
   */
  async profile(handle: string): Promise<PublicProfile | null> {
    const h = handle.replace(/^@/, "").trim().toLowerCase();
    if (!h) return null;
    const p = one(await this.client.from("profiles").select(PROFILE).eq("username", h).maybeSingle());
    if (!p) return null;
    const me = await this.uid();
    const avatar = this.media("avatars", p.avatar_path);
    const [dot, boroughs, club, role] = await Promise.all([
      this.client.from("member_dots").select("dot").eq("user_id", p.id).maybeSingle().then(one),
      this.boroughNames(),
      p.home_club_id ? this.client.from("clubs").select("name, slug").eq("id", p.home_club_id).maybeSingle().then(one) : null,
      me && p.home_club_id
        ? this.client.from("club_members").select("role").eq("club_id", p.home_club_id).eq("user_id", p.id).maybeSingle().then(one)
        : null,
    ]);
    const base = {
      handle: p.username,
      visible: true as const,
      person: { id: p.id, name: p.display_name, photo: avatar, avatar, tier: p.tier, ...outNow(dot?.dot) },
      borough: (p.borough_id && boroughs.get(p.borough_id)) || "",
      trust: TRUST[p.trust],
      ...(p.founding_number !== null ? { foundingNumber: p.founding_number } : {}),
      level: p.level,
      streakDays: p.streak_days,
      // Badges are not in the schema yet; see SCHEMA_GAPS.md.
      badges: [],
      badgesEarned: 0,
      badgesTotal: 0,
      isMe: p.id === me,
    };
    const where = club ? { club: { name: club.name, slug: club.slug, role: roleLabel(role?.role) } } : {};
    const streak = { label: "Day streak", value: p.streak_days, delta: `Best ${p.best_streak}` };
    const levelKpi = { label: "Level", value: p.level, delta: "Out on the streets" };
    // Steps and check-ins are only visible to signed in members.
    if (!me) return { ...base, ...where, stats: [levelKpi, streak] };

    const today = london(this.now()).date;
    const monday = mondayOf(today);
    const monthStart = `${today.slice(0, 7)}-01`;
    const [steps, checkins] = await Promise.all([
      this.client.from("daily_steps").select("counted").eq("user_id", p.id).gte("day", monday).then(rows),
      this.client.from("event_rsvps").select("event_id").eq("user_id", p.id).eq("status", "checked_in")
        .gte("checked_in_at", londonMidnight(monthStart)).then(rows),
    ]);
    const runs = checkins.length
      ? counted(await this.client.from("events").select("id", { count: "exact", head: true })
        .in("id", checkins.map((c) => c.event_id)).eq("kind", "club_run"))
      : 0;
    return {
      ...base,
      ...where,
      // Public numbers only: nothing from wallets or the ledger.
      stats: [
        { label: "Counted steps this week", value: steps.reduce((n, d) => n + (d.counted ?? 0), 0), delta: base.borough ? `For ${base.borough}` : "This week" },
        { label: "Club runs this month", value: runs, delta: club ? `At ${club.name}` : "Checked in" },
        levelKpi,
        streak,
      ],
    };
  }

  /**
   * The last revealed result for the viewer's home club: its most recent
   * club league fixture whose reveal has passed, with the final scores. The
   * cards follow when the data supports them: the club's division and place,
   * and the viewer's city squad result in the same week. The borough card
   * needs borough step totals, which the schema does not keep (see
   * SCHEMA_GAPS.md).
   */
  async lastReveal(): Promise<RevealResult | null> {
    if (!(await this.uid())) return null;
    const ctx = await this.ctx();
    if (!ctx.homeClubId) return null;
    const nowIso = this.now().toISOString();

    const entries = rows(await this.client.from("league_entries").select("id").eq("club_id", ctx.homeClubId).limit(100));
    if (!entries.length) return null;
    const ids = entries.map((e) => e.id).join(",");
    const fixture = one(
      await this.client.from("fixtures").select(FIXTURE)
        .or(`home_id.in.(${ids}),away_id.in.(${ids})`)
        .not("revealed_at", "is", null).lte("revealed_at", nowIso)
        .not("home_score", "is", null).not("away_score", "is", null)
        .order("revealed_at", { ascending: false }).limit(1).maybeSingle(),
    );
    if (!fixture) return null;
    const usHome = entries.some((e) => e.id === fixture.home_id);
    const ourEntryId = usHome ? fixture.home_id : fixture.away_id;
    const theirEntryId = usHome ? fixture.away_id : fixture.home_id;
    const ourScore = Math.round(Number((usHome ? fixture.home_score : fixture.away_score) ?? 0));
    const theirScore = Math.round(Number((usHome ? fixture.away_score : fixture.home_score) ?? 0));

    const [their, table, division] = await Promise.all([
      this.client.from("league_entries").select("club_id").eq("id", theirEntryId).maybeSingle().then(one),
      this.client.from("league_entries").select("id, points, played").eq("division_id", fixture.division_id).order("points", { ascending: false }).then(rows),
      this.client.from("divisions").select("name").eq("id", fixture.division_id).maybeSingle().then(one),
    ]);
    const clubIds = unique([ctx.homeClubId, their?.club_id ?? ""].filter(Boolean));
    const clubRows = rows(await this.client.from("clubs").select("id, name, logo_path").in("id", clubIds));
    const card = (id: string | null | undefined, score: number) => {
      const c = clubRows.find((r) => r.id === id);
      const name = c?.name ?? "";
      return { name, short: nameTop(name), crest: this.media("club-media", c?.logo_path), score };
    };

    const cards: RevealResult["cards"] = [];
    const at = table.findIndex((t) => t.id === ourEntryId);
    const ours = table[at];
    if (division && ours) {
      // Where the club sat before the reveal is not kept, so this says where it is now.
      cards.push({ kick: division.name, title: `Now ${ordinal(at + 1)}`, line: `${resultWord(ourScore, theirScore)} · ${ours.points} points from ${ours.played}` });
    }
    const squad = await this.squadResult(ctx, fixture.starts_on, nowIso);
    if (squad) cards.push(squad);

    return { home: card(ctx.homeClubId, ourScore), away: card(their?.club_id, theirScore), cards };
  }

  /** The viewer's city side in the city league fixture of the same week, once revealed. */
  private async squadResult(ctx: Ctx, startsOn: string, nowIso: string): Promise<RevealResult["cards"][number] | null> {
    const entries = rows(await this.client.from("league_entries").select("id").eq("city_id", ctx.cityId).limit(100));
    if (!entries.length) return null;
    const ids = entries.map((e) => e.id).join(",");
    const f = one(
      await this.client.from("fixtures").select(FIXTURE)
        .or(`home_id.in.(${ids}),away_id.in.(${ids})`).eq("starts_on", startsOn)
        .not("revealed_at", "is", null).lte("revealed_at", nowIso)
        .not("home_score", "is", null).not("away_score", "is", null)
        .limit(1).maybeSingle(),
    );
    if (!f) return null;
    const usHome = entries.some((e) => e.id === f.home_id);
    const ourEntry = usHome ? f.home_id : f.away_id;
    const otherEntry = usHome ? f.away_id : f.home_id;
    const [other, inSquad] = await Promise.all([
      this.client.from("league_entries").select("city_id").eq("id", otherEntry).maybeSingle().then(one),
      this.client.from("squad_members").select("user_id").eq("fixture_id", f.id).eq("entry_id", ourEntry).eq("user_id", ctx.me).maybeSingle().then(one),
    ]);
    const cityIds = unique([ctx.cityId, other?.city_id ?? ""].filter(Boolean));
    const cities = rows(await this.client.from("cities").select("id, name").in("id", cityIds));
    const nameOf = (id: string | null | undefined) => cities.find((c) => c.id === id)?.name ?? "";
    const us = Math.round(Number((usHome ? f.home_score : f.away_score) ?? 0));
    const them = Math.round(Number((usHome ? f.away_score : f.home_score) ?? 0));
    const verb = us > them ? "beat" : us < them ? "lost to" : "drew with";
    // Each walker's place in the squad is not stored; see SCHEMA_GAPS.md.
    return {
      kick: inSquad ? "Your squad" : "Your city",
      title: `${nameOf(ctx.cityId)} ${verb} ${nameOf(other?.city_id)}`,
      line: `${formatNumber(us)} to ${formatNumber(them)}${inSquad ? " · you were in the squad" : ""}`,
    };
  }

  async plans(): Promise<Plan[]> {
    return PLANS.map((p) => ({ ...p, features: [...p.features] }));
  }

  async setPublicProfile(): Promise<void> {
    // Profiles are always public in the schema; see SCHEMA_GAPS.md.
    throw new DataError("NOT_SUPPORTED");
  }

  /* ---------- notifications and search ---------- */

  async notifications(): Promise<Notification[]> {
    const me = await this.signedIn();
    const list = rows(await this.client.from("notifications").select("id, kind, title, body, link, read_at, created_at").eq("user_id", me).order("created_at", { ascending: false }).limit(50));
    return list.map((n) => ({
      id: String(n.id),
      icon: NOTE_ICONS[n.kind] ?? "bell",
      html: `<b>${esc(n.title)}</b>${n.body ? ` ${esc(n.body)}` : ""}`,
      ago: ago(n.created_at, this.now()),
      href: n.link ?? "/",
      unread: n.read_at === null,
    }));
  }

  async markNotificationsRead(): Promise<void> {
    const me = await this.signedIn();
    done(await this.client.from("notifications").update({ read_at: this.now().toISOString() }).eq("user_id", me).is("read_at", null));
  }

  async searchIndex(): Promise<SearchItem[]> {
    const me = await this.uid();
    const [clubs, people, boroughs] = await Promise.all([this.loadClubs(), this.people(), this.boroughRows()]);
    const homes = rows(await this.client.from("profiles").select("id, home_club_id").in("id", Object.keys(people).slice(0, 500)));
    const clubName = new Map(clubs.map((c) => [c.id, c.name]));
    const homeOf = new Map(homes.map((h) => [h.id, h.home_club_id]));
    return [
      ...clubs.map((c): SearchItem => ({ group: "Clubs", name: c.name, sub: `${c.borough} · ${c.members} members`, href: `/${c.slug}`, image: c.crest })),
      ...Object.values(people).map((p): SearchItem => ({
        group: "People",
        name: p.name,
        sub: p.id === me ? "You" : (clubName.get(homeOf.get(p.id) ?? "") ?? ""),
        href: p.id === me ? "/me" : null,
        image: p.avatar,
      })),
      ...boroughs.map((b): SearchItem => ({ group: "Boroughs", name: b.name, sub: "Borough league", href: "/league", icon: "pin" })),
    ];
  }

  /* ---------- public ---------- */

  async clubPage(slug: string): Promise<ClubPageView | null> {
    const club = await this.clubBySlug(slug);
    if (!club) return null;
    const me = await this.uid();
    const boroughId = (await this.boroughRows()).find((b) => b.name === club.borough)?.id;
    const [runs, fixture, standing, leaders, locals, nearby, photos, turnout, progress] = await Promise.all([
      this.upcomingClubRuns(club.id, 6, me),
      this.currentFixture({ clubId: club.id }),
      this.clubStandings([club.id]),
      this.client.from("club_members").select("user_id, role").eq("club_id", club.id).in("role", ["captain", "admin"]).then(rows),
      this.client.from("locals_partners").select("business_name, category, perk").eq("club_id", club.id).then(rows),
      boroughId ? this.loadClubs({ boroughId, limit: 4 }).then((all) => all.filter((c) => c.id !== club.id).slice(0, 3)) : [],
      this.client.from("posts").select("media_paths").eq("club_id", club.id).eq("kind", "photo").is("hidden_at", null).order("created_at", { ascending: false }).limit(5).then(rows),
      this.turnoutSeries(club.id, club.members, 4),
      club.founding ? this.client.from("club_founding_progress").select("qualifying_meetups, meetups_needed").eq("club_id", club.id).maybeSingle().then(one) : null,
    ]);
    const gallery = await this.signed("posts", photos.flatMap((p) => p.media_paths.slice(0, 1)));
    const s = standing.get(club.id);
    const results = s ? await this.results(s.entryId) : [];
    const fund = await this.fundTotal(club.id);
    const lastTurnout = turnout.filter((t) => t > 0);
    return {
      club,
      runs,
      derby: fixture ? { opponent: fixture.them.short, us: fixture.us.score, them: fixture.them.score } : { opponent: "", us: 0, them: 0 },
      stats: {
        turnout: lastTurnout.length ? `${Math.round(lastTurnout.reduce((a, b) => a + b, 0) / lastTurnout.length)}%` : "",
        raised: fund === null ? "" : pounds(fund),
      },
      season: { points: s?.points ?? 0, form: (s && (await this.forms([s.entryId])).get(s.entryId)) ?? "", results },
      leaders: leaders.map((l) => ({ personId: l.user_id, role: l.role === "captain" ? "Captain" : "Run leader", group: "" })),
      gallery: [...gallery.values()],
      locals: locals.map((l) => ({ name: l.business_name, kind: l.category, perk: l.perk ?? "" })),
      nearby,
      founding: club.founding ? { meetups: progress?.qualifying_meetups ?? 0, needed: progress?.meetups_needed ?? 3 } : null,
      reveal: this.reveal(shortSeed(fixture?.row.draw_seed ?? null)),
    };
  }

  /**
   * Joining is immediate in the schema (join_club), so this makes the
   * membership straight away and says they're going to the run they picked.
   * The pace they chose has nowhere to live yet; see SCHEMA_GAPS.md.
   */
  async joinClub(slug: string, input: JoinInput): Promise<void> {
    await this.signedIn();
    const club = one(await this.client.from("clubs").select("id").eq("slug", slug.toLowerCase()).maybeSingle());
    if (!club) throw new DataError("NO_SUCH_CLUB");
    done(await this.client.rpc("join_club", { p_club: club.id, p_source: "web" }));
    this.changed();
    if (input.runId) await this.setRsvp(input.runId, true);
  }

  private async results(entryId: string): Promise<ClubPageView["season"]["results"]> {
    const played = rows(
      await this.client.from("fixtures").select(FIXTURE).or(`home_id.eq.${entryId},away_id.eq.${entryId}`)
        .not("revealed_at", "is", null).order("week", { ascending: false }).limit(3),
    );
    const others = unique(played.map((f) => (f.home_id === entryId ? f.away_id : f.home_id)));
    const entries = others.length ? rows(await this.client.from("league_entries").select("id, club_id").in("id", others)) : [];
    const clubs = entries.length ? rows(await this.client.from("clubs").select("id, name").in("id", entries.flatMap((e) => (e.club_id ? [e.club_id] : [])))) : [];
    return played.map((f) => {
      const home = f.home_id === entryId;
      const us = Number((home ? f.home_score : f.away_score) ?? 0);
      const them = Number((home ? f.away_score : f.home_score) ?? 0);
      const otherClub = entries.find((e) => e.id === (home ? f.away_id : f.home_id))?.club_id;
      const result: FormLetter = us > them ? "w" : us < them ? "l" : "d";
      return { opponent: clubs.find((c) => c.id === otherClub)?.name ?? "", result, us: formatNumber(us), them: formatNumber(them) };
    });
  }

  /** Total paid into a club's fund in pence, or null when the viewer may not see it. */
  private async fundTotal(clubId: string): Promise<number | null> {
    const months = rows(await this.client.from("club_fund_months").select("amount_pence").eq("club_id", clubId));
    return months.length ? months.reduce((n, m) => n + (m.amount_pence ?? 0), 0) : null;
  }

  /** Club run turnout for the last n weeks, oldest first, as a percentage of members. */
  private async turnoutSeries(clubId: string, members: number, weeks: number): Promise<number[]> {
    const monday = mondayOf(london(this.now()).date);
    const from = addDays(monday, -7 * (weeks - 1));
    const events = rows(
      await this.client.from("events").select("id, starts_at").eq("club_id", clubId).eq("kind", "club_run").is("cancelled_at", null)
        .gte("starts_at", londonMidnight(from)).lte("starts_at", this.now().toISOString()),
    );
    const checkins = (await this.rsvpsFor(events.map((e) => e.id))).filter((r) => r.status === "checked_in");
    return Array.from({ length: weeks }, (_, i) => {
      const start = addDays(from, i * 7);
      const end = addDays(start, 7);
      const ids = new Set(events.filter((e) => london(e.starts_at).date >= start && london(e.starts_at).date < end).map((e) => e.id));
      const people = new Set(checkins.filter((c) => ids.has(c.event_id)).map((c) => c.user_id));
      return members ? Math.round((people.size / members) * 100) : 0;
    });
  }

  /* ---------- club HQ ---------- */

  /** The club's next run today or later, for the live check-in card. */
  private async checkinRun(clubId: string): Promise<CheckinRun> {
    const today = londonMidnight(london(this.now()).date);
    const next = one(
      await this.client.from("events").select(EVENT).eq("club_id", clubId).in("kind", ["club_run", "walk"]).is("cancelled_at", null)
        .gte("starts_at", today).order("starts_at").limit(1).maybeSingle(),
    );
    if (!next) return { runId: "", title: "", place: "", line: "", opens: "", going: 0, goingIds: [] };
    const going = (await this.rsvpsFor([next.id])).map((r) => r.user_id);
    const opens = new Date(Date.parse(next.starts_at) - 30 * 60_000).toISOString();
    return {
      runId: next.id,
      title: next.title,
      place: next.place_name,
      line: `${next.place_name}, ${hhmm(next.starts_at)}. Members check in with the run's code on the night.`,
      // check_in_event() accepts codes from 30 minutes before the start.
      opens: `Opens ${hhmm(opens)}`,
      going: going.length,
      goingIds: going,
    };
  }

  /** Month initials under the first week of each month, blank elsewhere. */
  private turnoutLabels(weeks: number): string[] {
    const monday = mondayOf(london(this.now()).date);
    return Array.from({ length: weeks }, (_, i) => {
      const start = addDays(monday, -7 * (weeks - 1 - i));
      const day = Number(start.slice(8, 10));
      return day <= 7 ? (MONTHS[Number(start.slice(5, 7)) - 1] ?? "").slice(0, 1) : "";
    });
  }

  async clubHq(clubId: string): Promise<ClubHqView> {
    const club = await this.loadClub(clubId);
    const monthStart = londonMidnight(`${london(this.now()).date.slice(0, 7)}-01`);
    const [turnout, joins, invites, fund, checkin, fixture, progress, standings] = await Promise.all([
      this.turnoutSeries(clubId, club.members, 12),
      this.client.from("club_members").select("source").eq("club_id", clubId).gte("joined_at", monthStart).then(rows),
      this.client.from("club_invites").select("uses").eq("club_id", clubId).then(rows),
      this.client.from("club_fund_months").select("month, amount_pence").eq("club_id", clubId).order("month").then(rows),
      this.checkinRun(clubId),
      this.currentFixture({ clubId }),
      this.client.from("club_founding_progress").select("qualifying_meetups, verified_people, meetups_needed, people_needed").eq("club_id", clubId).maybeSingle().then(one),
      this.clubStandings([clubId]),
    ]);
    const now = turnout[turnout.length - 1] ?? 0;
    const before = turnout[turnout.length - 2] ?? 0;
    const fromQr = joins.filter((j) => j.source === "qr" || j.source === "invite").length;
    const fundTotal = fund.reduce((n, m) => n + (m.amount_pence ?? 0), 0);
    let running = 0;
    const fundSpark = fund.map((m) => (running += (m.amount_pence ?? 0) / 100));
    const needs: NeedsYou[] = [];
    if (club.founding && progress) {
      needs.push({
        icon: "shield",
        title: `${progress.qualifying_meetups ?? 0} of ${progress.meetups_needed ?? 3} meetups towards verification`,
        line: `${progress.verified_people ?? 0} of ${progress.people_needed ?? 10} verified people so far`,
        action: "Plan a run",
        href: "/hq/runs",
      });
    }
    if (!checkin.runId) needs.push({ icon: "cal", tone: "warn", title: "No club run on the calendar", line: "Members can't say they're going until there is one", action: "Add a run", href: "/hq/runs" });
    if (fixture) {
      const lead = fixture.us.score - fixture.them.score;
      needs.push({
        icon: "flag",
        tone: "alert",
        title: `${fixture.row.is_derby ? "Derby" : "Match"} v ${fixture.them.short} ends ${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][weekdayOf(fixture.row.ends_on)] ?? ""}`,
        line: lead >= 0 ? `You lead by ${formatNumber(lead)}. Turnout is your edge.` : `You're ${formatNumber(-lead)} behind. Turnout is your edge.`,
        action: "See the table",
        href: "/league",
      });
    }
    const s = standings.get(clubId);
    let table: ClubHqView["table"] = [];
    if (s) {
      const division = await this.entryDivision(s.entryId);
      const entries = division ? (await this.divisionTable(division)).slice(0, 8) : [];
      const [clubs, forms] = await Promise.all([this.loadClubs({ ids: entries.flatMap((e) => (e.club_id ? [e.club_id] : [])) }), this.forms(entries.map((e) => e.id))]);
      table = entries.flatMap((e) => {
        const c = clubs.find((x) => x.id === e.club_id);
        return c ? [{ club: c, turnout: c.id === clubId ? now : 0, points: e.points, form: forms.get(e.id) ?? "" }] : [];
      });
    }
    return {
      club,
      kpis: [
        { label: "Members", value: club.members, delta: `<b>+${joins.length}</b> this month` },
        { label: "Run turnout this week", value: `${now}%`, delta: `<b>${now - before >= 0 ? "+" : ""}${now - before} pts</b> on last week`, spark: turnout.slice(-8) },
        { label: "Joined from QR codes", value: fromQr, delta: `<b>${invites.reduce((n, i) => n + i.uses, 0)}</b> joins from codes so far` },
        { label: "Club fund", value: pounds(fundTotal), delta: fund[0]?.month ? `Since ${MONTHS[Number(fund[0].month.slice(5, 7)) - 1] ?? ""}` : "Nothing in yet", ...(fundSpark.length > 1 ? { spark: fundSpark } : {}) },
      ],
      turnout,
      turnoutLabels: this.turnoutLabels(turnout.length),
      checkin,
      needs,
      league: [club.division, club.borough].filter(Boolean).join(", "),
      table,
    };
  }

  async members(clubId: string): Promise<MembersView> {
    const [club, list] = await Promise.all([
      this.loadClub(clubId),
      this.client.from("club_members").select("user_id, role, joined_at").eq("club_id", clubId).order("joined_at").limit(2000).then(rows),
    ]);
    const ids = list.map((m) => m.user_id);
    const today = london(this.now()).date;
    const monthStart = `${today.slice(0, 7)}-01`;
    const windowStart = addDays(mondayOf(today), -7 * 7);
    const since = new Date(this.now().getTime() - 60 * 86_400_000).toISOString();
    const [trust, events, paces] = await Promise.all([
      this.trustOf(ids),
      this.client.from("events").select("id, kind, starts_at").eq("club_id", clubId).in("kind", ["club_run", "walk"])
        .gte("starts_at", londonMidnight(windowStart < monthStart ? windowStart : monthStart)).lte("starts_at", this.now().toISOString()).then(rows),
      this.paces(ids, since),
    ]);
    const checkins = (await this.rsvpsFor(events.map((e) => e.id))).filter((r) => r.status === "checked_in");
    const eventOf = new Map(events.map((e) => [e.id, { kind: e.kind, date: london(e.starts_at).date }]));
    const dayMs = 86_400_000;
    /** A club run counts 1 and a walk half, per week for the last 8 weeks. */
    const weekly = (uid: string) =>
      Array.from({ length: 8 }, (_, i) => {
        const start = addDays(windowStart, i * 7);
        const end = addDays(start, 7);
        return checkins.reduce((n, c) => {
          const e = eventOf.get(c.event_id);
          return c.user_id === uid && e && e.date >= start && e.date < end ? n + (e.kind === "walk" ? 0.5 : 1) : n;
        }, 0);
      });
    /** Days since their last check-in; with none in the window, at least the time since the window or their join. */
    const daysSince = (uid: string, joinedAt: string) => {
      const last = checkins.filter((c) => c.user_id === uid).map((c) => eventOf.get(c.event_id)?.date ?? "").sort().pop();
      const from = last || [windowStart, london(joinedAt).date].sort().pop() || today;
      return Math.max(0, Math.round((Date.parse(today) - Date.parse(from)) / dayMs));
    };
    const ROLE: Record<Enums<"club_role">, Member["role"]> = { captain: "Captain", admin: "Run leader", member: "Member" };
    const order: Member["role"][] = ["Captain", "Run leader", "Member", "Guest"];
    return {
      club,
      members: list
        .map((m): Member => ({
          personId: m.user_id,
          role: ROLE[m.role],
          pace: paceGroup(paces.get(m.user_id)),
          runsThisMonth: checkins.filter((c) => c.user_id === m.user_id && eventOf.get(c.event_id)?.kind === "club_run" && (eventOf.get(c.event_id)?.date ?? "") >= monthStart).length,
          trust: trust.get(m.user_id) ?? "New",
          weekly: weekly(m.user_id),
          daysSinceRun: daysSince(m.user_id, m.joined_at),
        }))
        .sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role) || b.runsThisMonth - a.runsThisMonth),
      // Joining is immediate in the schema, so there is nothing waiting; see SCHEMA_GAPS.md.
      requests: [],
    };
  }

  private async trustOf(ids: string[]): Promise<Map<string, Trust>> {
    const out = new Map<string, Trust>();
    for (const part of chunk(ids)) {
      rows(await this.client.from("profiles").select("id, trust").in("id", part)).forEach((p) => out.set(p.id, TRUST[p.trust]));
    }
    return out;
  }

  /** Average pace in seconds per km over recent runs, per person. */
  private async paces(ids: string[], since: string): Promise<Map<string, number>> {
    const sums = new Map<string, { total: number; n: number }>();
    for (const part of chunk(ids)) {
      const found = rows(await this.client.from("runs").select("user_id, avg_pace_s_per_km").in("user_id", part).gte("started_at", since).not("avg_pace_s_per_km", "is", null).limit(5000));
      for (const r of found) {
        if (r.avg_pace_s_per_km === null) continue;
        const s = sums.get(r.user_id) ?? { total: 0, n: 0 };
        s.total += r.avg_pace_s_per_km;
        s.n += 1;
        sums.set(r.user_id, s);
      }
    }
    return new Map([...sums].map(([id, s]) => [id, s.total / s.n]));
  }

  async decideJoinRequest(): Promise<void> {
    // There are no join requests in the schema; see SCHEMA_GAPS.md.
    throw new DataError("NOT_SUPPORTED");
  }

  async runsWeek(clubId: string): Promise<RunsWeekView> {
    const club = await this.loadClub(clubId);
    const today = london(this.now()).date;
    const monday = mondayOf(today);
    const [week, past, leaders, checkin] = await Promise.all([
      this.client.from("events").select(EVENT).eq("club_id", clubId).is("cancelled_at", null)
        .gte("starts_at", londonMidnight(monday)).lt("starts_at", londonMidnight(addDays(monday, 7))).order("starts_at").then(rows),
      this.client.from("events").select(EVENT).eq("club_id", clubId).eq("kind", "club_run").is("cancelled_at", null)
        .lt("starts_at", this.now().toISOString()).order("starts_at", { ascending: false }).limit(4).then(rows),
      this.client.from("club_members").select("user_id, role").eq("club_id", clubId).in("role", ["captain", "admin"]).then(rows),
      this.checkinRun(clubId),
    ]);
    const rsvps = await this.rsvpsFor([...week.map((e) => e.id), ...past.map((e) => e.id)]);
    const names = await this.names(leaders.map((l) => l.user_id));
    const p = london(monday);
    const focus = week.find((e) => e.starts_at >= this.now().toISOString());
    const goingLeaders = focus ? leaders.filter((l) => rsvps.some((r) => r.event_id === focus.id && r.user_id === l.user_id)) : [];
    // Who to ask to lead: leaders not yet going, then people already going to that run.
    const askIds = focus
      ? unique([
          ...leaders.map((l) => l.user_id).filter((id) => !goingLeaders.some((g) => g.user_id === id)),
          ...rsvps.filter((r) => r.event_id === focus.id && !goingLeaders.some((g) => g.user_id === r.user_id)).map((r) => r.user_id),
        ]).slice(0, 3)
      : [];
    return {
      club,
      weekOf: `week of ${p.day} ${MONTHS[p.month - 1] ?? ""}`,
      days: Array.from({ length: 7 }, (_, i) => {
        const date = addDays(monday, i);
        return {
          day: shortDay(date),
          date: london(`${date}T12:00:00Z`).day,
          today: date === today,
          runs: week
            .filter((e) => london(e.starts_at).date === date)
            .map((e) => ({
              time: hhmm(e.starts_at),
              title: e.title,
              line: `${e.place_name} · ${rsvps.filter((r) => r.event_id === e.id).length} going`,
              ...(e.kind === "walk" ? { walk: true } : {}),
            })),
        };
      }),
      focus: focus
        ? {
            title: focus.title,
            badge: goingLeaders.length ? "" : "No run leader yet",
            crew: goingLeaders.map((l) => ({ personId: l.user_id, title: names.get(l.user_id) ?? "", line: l.role === "captain" ? "Captain" : "Run leader", confirmed: true })),
            askIds,
          }
        : { title: "", badge: "", crew: [], askIds: [] },
      lastRuns: past
        .reverse()
        .map((e) => ({ label: shortDay(london(e.starts_at).date), checkedIn: rsvps.filter((r) => r.event_id === e.id && r.status === "checked_in").length })),
      checkin,
    };
  }

  async kit(clubId: string): Promise<KitView> {
    const [club, invites, row, fixture] = await Promise.all([
      this.loadClub(clubId),
      this.client.from("club_invites").select("code, label, uses, created_at").eq("club_id", clubId).order("created_at").then(rows),
      this.client.from("clubs").select("meeting_place, usual_times").eq("id", clubId).maybeSingle().then(one),
      this.currentFixture({ clubId }),
    ]);
    return {
      club,
      covers: club.cover ? [club.cover] : [],
      allTags: [],
      // Invites count joins only; scans and who came to a run are not recorded. See SCHEMA_GAPS.md.
      codes: invites.map((i) => ({ code: i.code.toUpperCase(), placed: i.label ?? "", scans: 0, cameToRun: 0, joined: i.uses })),
      // "who" would come from the club's tags, which the schema does not have yet.
      poster: { when: row?.usual_times ?? club.nextRun, where: row?.meeting_place ?? "", who: "" },
      derby: fixture ? { opponent: fixture.them.short, lead: fixture.us.score - fixture.them.score } : { opponent: "", lead: 0 },
    };
  }

  async updateClubPage(clubId: string, patch: ClubPagePatch): Promise<Club> {
    const current = await this.loadClub(clubId);
    if (patch.slug !== undefined) {
      const slug = slugify(patch.slug);
      if (!isValidClubSlug(slug)) throw new DataError("BAD_SLUG");
      // Members cannot change a club's slug under the schema's column grants; see SCHEMA_GAPS.md.
      if (slug !== current.slug) throw new DataError("NOT_SUPPORTED");
    }
    const update: Database["public"]["Tables"]["clubs"]["Update"] = {};
    if (patch.tagline !== undefined) update.tagline = patch.tagline.trim().slice(0, 120);
    if (patch.cover !== undefined) update.cover_path = patch.cover;
    // patch.tags has nowhere to go yet; see SCHEMA_GAPS.md.
    if (Object.keys(update).length) done(await this.client.from("clubs").update(update).eq("id", clubId));
    return this.loadClub(clubId);
  }

  async fund(clubId: string): Promise<FundView> {
    const [club, entries, partners, captains, drop] = await Promise.all([
      this.loadClub(clubId),
      this.client.from("club_fund_entries").select("month, source, amount_pence, note").eq("club_id", clubId).order("month").then(rows),
      this.client.from("locals_partners").select("id, business_name, category, tier, monthly_pence, perk, approved_by").eq("club_id", clubId).then(rows),
      this.client.from("club_members").select("user_id").eq("club_id", clubId).eq("role", "captain").order("joined_at").limit(1).then(rows),
      this.client.from("drops").select("price_pence").eq("club_id", clubId).order("opens_at", { ascending: false }).limit(1).maybeSingle().then(one),
    ]);
    const sponsor = [...partners].sort((a, b) => b.monthly_pence - a.monthly_pence)[0];
    const latest = entries[entries.length - 1]?.month;
    const thisMonth = entries.filter((e) => e.month === latest);
    const members = thisMonth.filter((e) => e.source === "member_web" || e.source === "member_app");
    const SOURCES: Record<string, { icon: IconName; title: string }> = {
      member_web: { icon: "heart", title: "Members joined through your link" },
      member_app: { icon: "heart", title: "Members joined in the app" },
      locals: { icon: "store", title: "Outhere Locals" },
      kit: { icon: "trophy", title: "Kit drops" },
      adjustment: { icon: "pound", title: "Adjustments" },
    };
    const bySource = new Map<string, { pence: number; lines: number }>();
    for (const e of entries) {
      const s = bySource.get(e.source) ?? { pence: 0, lines: 0 };
      s.pence += e.amount_pence;
      s.lines += 1;
      bySource.set(e.source, s);
    }
    return {
      club,
      total: entries.reduce((n, e) => n + e.amount_pence, 0) / 100,
      proMembers: members.length,
      proViaLink: members.filter((e) => e.source === "member_web").length,
      proMonthly: members.reduce((n, e) => n + e.amount_pence, 0) / 100,
      income: [...bySource].map(([source, s]) => ({
        icon: SOURCES[source]?.icon ?? "pound",
        title: SOURCES[source]?.title ?? source,
        line: `${s.lines} payment${s.lines === 1 ? "" : "s"}`,
        amount: pounds(s.pence),
      })),
      // Spending is not recorded yet; see SCHEMA_GAPS.md.
      spend: [],
      offers: partners.map((o) => ({
        id: o.id,
        business: o.business_name,
        kind: o.category,
        tier: `${o.tier[0]?.toUpperCase() ?? ""}${o.tier.slice(1)} · ${pounds(o.monthly_pence)} a month`,
        line: o.perk ?? "",
        status: o.approved_by.length >= 2 ? "accepted" : "open",
      })),
      // There is no treasurer role yet, so the first captain approves payouts; see SCHEMA_GAPS.md.
      treasurerId: captains[0]?.user_id ?? "",
      split: {
        proPrice: PLANS.find((p) => p.tier === "pro")?.monthly ?? 0,
        sponsor: sponsor ? { name: sponsor.business_name, monthly: sponsor.monthly_pence / 100 } : { name: "", monthly: 0 },
        // Making cost and kit sales are not readable by clubs yet; see SCHEMA_GAPS.md.
        kit: { teePrice: (drop?.price_pence ?? 0) / 100, makingShare: 0, sold: 0 },
      },
    };
  }

  async respondToOffer(): Promise<void> {
    // Clubs cannot answer Locals offers in the schema yet; see SCHEMA_GAPS.md.
    throw new DataError("NOT_SUPPORTED");
  }

  /* ---------- staff ---------- */

  async adminOverview(): Promise<AdminOverview> {
    await this.requireStaff();
    const now = this.now();
    const today = london(now).date;
    const monthStart = `${today.slice(0, 7)}-01`;
    const [moving, verified, founding, flags, reports, paid, requests, auditRows, cityFixture] = await Promise.all([
      this.client.from("daily_steps").select("user_id", { count: "exact", head: true }).eq("day", today).gte("steps", 3000).then(counted),
      this.client.from("clubs").select("id", { count: "exact", head: true }).eq("status", "verified").then(counted),
      this.client.from("clubs").select("id", { count: "exact", head: true }).eq("status", "founding").then(counted),
      this.client.from("daily_steps").select("user_id", { count: "exact", head: true }).eq("flagged", true).gte("day", addDays(today, -14)).then(counted),
      this.client.from("reports").select("id", { count: "exact", head: true }).eq("status", "open").then(counted),
      this.client.from("club_fund_months").select("amount_pence, club_id").eq("month", monthStart).then(rows),
      this.verifications(),
      this.audit(6),
      this.currentFixture({ cityId: this.defaultCity }),
    ]);
    const ready = requests.filter((r) => r.checks.filter((c) => c.auto).every((c) => c.done)).length;
    const drawn = cityFixture?.row.drawn_at;
    const revealed = cityFixture?.row.revealed_at;
    return {
      kpis: [
        { label: "Moving today", value: moving, delta: "3,000 steps or more" },
        { label: "Verified clubs", value: verified, delta: `<b>${founding}</b> founding, ${ready} ready for a check` },
        { label: "Fair play flags", value: flags, delta: `${reports} open report${reports === 1 ? "" : "s"}` },
        { label: "Paid to clubs", value: pounds(paid.reduce((n, m) => n + (m.amount_pence ?? 0), 0)), delta: `This month, ${unique(paid.map((m) => m.club_id)).length} clubs` },
      ],
      // A daily movers series needs a server side aggregate; see SCHEMA_GAPS.md.
      daily: [],
      dailyLabels: [],
      weekend: cityFixture
        ? [
            { title: drawn ? "Friday draw done" : "Friday draw", line: drawn ? `seed ${shortSeed(cityFixture.row.draw_seed)}` : "Not drawn yet", state: drawn ? "done" : "waiting" },
            { title: "Scores", line: `${cityFixture.us.name} ${formatNumber(cityFixture.us.score)}, ${cityFixture.them.name} ${formatNumber(cityFixture.them.score)}`, state: revealed ? "done" : "running" },
            { title: "National reveal", line: "Sunday 20:00", state: revealed ? "done" : "waiting" },
          ]
        : [],
      health: [],
      waiting: [
        ...(ready ? [{ icon: "shield" as const, title: `${ready} club${ready === 1 ? "" : "s"} to verify`, line: "Meetups and people checks passed", href: "/verify" }] : []),
        ...(flags ? [{ icon: "flag" as const, tone: "alert" as const, title: `${flags} flagged step day${flags === 1 ? "" : "s"}`, line: "Over 60,000 steps, held for review", href: "/fair-play" }] : []),
        ...(reports ? [{ icon: "eye" as const, title: `${reports} open report${reports === 1 ? "" : "s"}`, line: "From members", href: "/fair-play" }] : []),
      ],
      audit: auditRows,
      reveal: this.reveal(shortSeed(cityFixture?.row.draw_seed ?? null)),
    };
  }

  /** Founding clubs and how far they are through the automatic checks. */
  async verifications(): Promise<VerificationRequest[]> {
    await this.requireStaff();
    const clubs = rows(await this.client.from("clubs").select(CLUB).eq("status", "founding").order("created_at").limit(200));
    if (!clubs.length) return [];
    const ids = clubs.map((c) => c.id);
    const [progress, organisers] = await Promise.all([
      this.client.from("club_founding_progress").select("club_id, qualifying_meetups, verified_people, meetups_needed, people_needed").in("club_id", ids).then(rows),
      this.client.from("profiles").select("id, display_name, trust").in("id", unique(clubs.map((c) => c.created_by))).then(rows),
    ]);
    return clubs.map((c) => {
      const p = progress.find((x) => x.club_id === c.id);
      const o = organisers.find((x) => x.id === c.created_by);
      const meetups = (p?.qualifying_meetups ?? 0) >= (p?.meetups_needed ?? 3);
      const [first, last] = (o?.display_name ?? "").split(" ");
      return {
        id: c.id,
        clubId: c.id,
        organiser: `${first ?? ""}${last ? ` ${last[0]}.` : ""}`,
        age: ago(c.created_at, this.now()),
        // Evidence photos are not stored yet; see SCHEMA_GAPS.md.
        evidence: [],
        claim: false,
        checks: [
          { label: "3 meetups within 6 weeks", auto: true, done: meetups },
          { label: "6 or more people at each", auto: true, done: meetups },
          { label: "10 different verified people", auto: true, done: (p?.verified_people ?? 0) >= (p?.people_needed ?? 10) },
          { label: "Public meeting point, no home addresses", auto: false, done: false },
          { label: "Organiser verified with ID", auto: false, done: o?.trust === "verified" || o?.trust === "established" },
        ],
        verified: false,
      };
    });
  }

  async setVerificationCheck(): Promise<void> {
    await this.requireStaff();
    // Manual checks are not stored yet; see SCHEMA_GAPS.md.
    throw new DataError("NOT_SUPPORTED");
  }

  async verifyClub(): Promise<void> {
    await this.requireStaff();
    // clubs.status has no client grant and no function sets it; see SCHEMA_GAPS.md.
    throw new DataError("NOT_SUPPORTED");
  }

  async fairPlay(): Promise<FairPlayView> {
    await this.requireStaff();
    const today = london(this.now()).date;
    const [stepFlags, reports] = await Promise.all([
      this.client.from("daily_steps").select("user_id, day, steps").eq("flagged", true).gte("day", addDays(today, -14)).order("day", { ascending: false }).limit(100).then(rows),
      this.client.from("reports").select("id, target_type, target_id, reason, detail, created_at").eq("status", "open").in("reason", ["cheating", "impersonation"]).order("created_at").limit(100).then(rows),
    ]);
    const users = unique([...stepFlags.map((f) => f.user_id), ...reports.filter((r) => r.target_type === "profile" || r.target_type === "steps").map((r) => r.target_id)]);
    const [trust, history] = await Promise.all([
      this.trustOf(users),
      users.length ? this.client.from("daily_steps").select("user_id, day, steps").in("user_id", users).gte("day", addDays(today, -13)).then(rows) : [],
    ]);
    const fortnight = (uid: string) =>
      Array.from({ length: 14 }, (_, i) => Math.round((history.find((h) => h.user_id === uid && h.day === addDays(today, i - 13))?.steps ?? 0) / 1000));
    const flags: FairPlayFlag[] = [
      ...stepFlags.map((f): FairPlayFlag => ({
        id: `steps:${f.user_id}:${f.day}`,
        user: shortId(f.user_id),
        severity: "High",
        reason: `${formatNumber(f.steps)} steps on ${dateLabel(`${f.day}T12:00:00Z`)}, held for review`,
        steps: fortnight(f.user_id),
        trust: trust.get(f.user_id) ?? "New",
      })),
      ...reports.map((r): FairPlayFlag => {
        const uid = r.target_type === "profile" || r.target_type === "steps" ? r.target_id : "";
        return {
          id: `report:${r.id}`,
          user: uid ? shortId(uid) : `${r.target_type} ${shortId(r.target_id)}`,
          severity: "Low",
          reason: r.detail ? `Reported for ${r.reason}: ${r.detail}` : `Reported for ${r.reason}`,
          steps: uid ? fortnight(uid) : [],
          trust: trust.get(uid) ?? "New",
        };
      }),
    ];
    const high = flags.filter((f) => f.severity === "High").length;
    return {
      kpis: [
        { label: "Open flags", value: flags.length, delta: `${high} high` },
        { label: "Flagged step days", value: stepFlags.length, delta: "Last 14 days" },
        { label: "Open reports", value: reports.length, delta: "Cheating and impersonation" },
      ],
      flags,
    };
  }

  async clearFlag(id: string): Promise<void> {
    const ctx = await this.requireStaff();
    if (!id.startsWith("report:")) throw new DataError("NOT_SUPPORTED");
    done(await this.client.from("reports").update({ status: "dismissed", handled_by: ctx.me }).eq("id", id.slice("report:".length)));
  }

  async removeFromSquad(): Promise<void> {
    await this.requireStaff();
    // squad_members has no write policy and no function removes someone; see SCHEMA_GAPS.md.
    throw new DataError("NOT_SUPPORTED");
  }

  async seasons(): Promise<SeasonsView> {
    await this.requireStaff();
    const season = await this.currentSeason("city");
    if (!season) return { season: "", weeks: 0, currentWeek: 0, draws: [], revealHeld: false, reveal: this.reveal() };
    const divisions = rows(await this.client.from("divisions").select("id").eq("season_id", season.id));
    const fixtures = divisions.length
      ? rows(await this.client.from("fixtures").select(FIXTURE).in("division_id", divisions.map((d) => d.id)).not("drawn_at", "is", null).order("week", { ascending: false }))
      : [];
    const weeks = Math.ceil(((Date.parse(season.ends_on) - Date.parse(season.starts_on)) / 86_400_000 + 1) / 7);
    const today = london(this.now()).date;
    const currentWeek = Math.min(weeks, Math.floor((Date.parse(today) - Date.parse(season.starts_on)) / (7 * 86_400_000)) + 1);
    const byWeek = new Map<number, FixtureRow[]>();
    fixtures.forEach((f) => byWeek.set(f.week, [...(byWeek.get(f.week) ?? []), f]));
    return {
      season: season.name,
      weeks,
      currentWeek,
      draws: [...byWeek].map(([week, list]) => ({
        week: `Week ${week}`,
        at: list[0]?.drawn_at ? `${dateLabel(list[0].drawn_at)} ${hhmm(list[0].drawn_at)}` : "",
        seed: shortSeed(list[0]?.draw_seed ?? null),
        squads: list.length * 2,
      })),
      // Holding the reveal is not stored yet; see SCHEMA_GAPS.md.
      revealHeld: false,
      reveal: this.reveal(shortSeed(fixtures[0]?.draw_seed ?? null)),
    };
  }

  async setRevealHeld(): Promise<void> {
    await this.requireStaff();
    throw new DataError("NOT_SUPPORTED");
  }

  async audit(limit = 100): Promise<AuditEntry[]> {
    await this.requireStaff();
    const list = rows(await this.client.from("audit_log").select("id, actor_id, action, target_type, target_id, detail, created_at").order("created_at", { ascending: false }).limit(limit));
    const actors = await this.names(list.flatMap((a) => (a.actor_id ? [a.actor_id] : [])));
    const today = london(this.now()).date;
    return list.map((a) => {
      const [first, last] = (a.actor_id ? (actors.get(a.actor_id) ?? "") : "").split(" ");
      return {
        id: String(a.id),
        actor: a.actor_id ? `${first ?? ""}${last ? ` ${last[0]}` : ""}` : "system",
        action: a.action,
        target: str(a.detail, "name") ?? [a.target_type, a.target_id ? shortId(a.target_id) : ""].filter(Boolean).join(" "),
        at: london(a.created_at).date === today ? hhmm(a.created_at) : `${shortDay(london(a.created_at).date)} ${hhmm(a.created_at)}`,
      };
    });
  }
}

/* ---------- helpers that need no client ---------- */

/** The first display word of a club's name, as nameTop. */
function nameTop(name: string): string {
  const words = name.split(" ");
  return words.length > 1 ? (words[0] ?? name) : name;
}

function resultWord(us: number, them: number): string {
  return us > them ? "Won" : us < them ? "Lost" : "Drew";
}

/** How a club role reads on a member's page. */
function roleLabel(role: string | null | undefined): string {
  return role === "captain" ? "Captain" : role === "admin" ? "Run leader" : role ? "Member" : "";
}

function outNow(dot: string | null | undefined): { outNow?: "out" | "stopped" } {
  return dot === "out" || dot === "stopped" ? { outNow: dot } : {};
}

function modeName(mode: Enums<"battle_mode">, distance: number | null): string {
  const name = BATTLE_MODES.find((m) => m.key === MODE_FROM_DB[mode])?.name ?? mode;
  if (!distance || !TIME_MODES.includes(mode)) return name;
  const label = Object.entries(DISTANCES).find(([, m]) => m === distance)?.[0] ?? `${Math.round(distance / 100) / 10}k`;
  return `${name} · ${label}`;
}

/** Unanswered challenges expire after 48 hours. */
function answerIn(createdAt: string, now: Date): string {
  const left = Math.max(0, Math.ceil((Date.parse(createdAt) + 48 * 3_600_000 - now.getTime()) / 3_600_000));
  return `Answer in ${left}h`;
}

function resultLine(b: BattleRow, me: string): string {
  if (b.status === "forfeit") return b.winner_id === me ? "they didn't run" : "no show";
  const mine = b.challenger_id === me ? b.challenger_result : b.opponent_result;
  const theirs = b.challenger_id === me ? b.opponent_result : b.challenger_result;
  if (mine === null || theirs === null) return "";
  const gap = Math.abs(mine - theirs);
  if (!b.mode || STEP_MODES.includes(b.mode)) return `by ${formatNumber(gap)} steps`;
  if (b.mode === "hold_the_route") return `by ${gap} lap${gap === 1 ? "" : "s"}`;
  return `by ${gap} second${gap === 1 ? "" : "s"}`;
}

/**
 * Pick-up times as the form sends them: "Today 18:30", "Tomorrow 12:30",
 * "Leaving 18:30", "Thursday 07:00", or an ISO date. Returns an ISO instant.
 */
export function parseWhen(when: string, now: Date): string | null {
  const text = when.trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(text) && !Number.isNaN(Date.parse(text))) return new Date(text).toISOString();
  const time = /(\d{1,2})[:.](\d{2})/.exec(text);
  if (!time) return null;
  const today = london(now).date;
  let date = today;
  const lower = text.toLowerCase();
  if (lower.startsWith("tomorrow")) date = addDays(today, 1);
  else {
    const day = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].findIndex((d) => lower.startsWith(d));
    if (day >= 0) date = addDays(today, (day - weekdayOf(today) + 7) % 7);
  }
  const at = Date.parse(londonMidnight(date)) + (Number(time[1]) * 60 + Number(time[2])) * 60_000;
  // A time earlier today means the same time next week for a named day, or is simply in the past.
  return new Date(at).toISOString();
}

/** Builds a client from the project URL and the publishable (anon) key. */
export function createSupabaseData(url: string, anonKey: string, opts: SupabaseDataOptions & { client?: Parameters<typeof createClient>[2] } = {}): SupabaseData {
  const { client: clientOpts, ...rest } = opts;
  return new SupabaseData(createClient<Database>(url, anonKey, clientOpts), rest);
}

