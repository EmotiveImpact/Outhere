import type { ClubQuery, OuthereData } from "../data-source";
import { battleLengths, firstName, rolesFor, isValidClubSlug, slugify } from "../rules";
import type {
  AdminOverview, AuditEntry, BattlesView, BoroughMetric, BoroughStat, CalendarView, ChatItem, ChatView,
  Club, ClubHqView, ClubPagePatch, ClubPageView, FairPlayView, FeedPost, FeedView, FundView, HomeView,
  KitView, LeagueView, MembersView, NewBattle, NewPickup, Notification, Person, Pickup, Plan, Reaction,
  Role, RunsWeekView, SearchItem, SeasonsView, VerificationRequest, Viewer,
} from "../types";
import * as seed from "./seed";

type State = {
  viewer: Viewer;
  people: Record<string, Person>;
  clubs: Club[];
  runs: typeof seed.RUNS;
  stories: typeof seed.STORIES;
  feed: FeedPost[];
  chat: typeof seed.CHAT;
  notifications: Notification[];
  battles: typeof seed.BATTLES;
  challenges: typeof seed.CHALLENGES;
  surprise: boolean;
  pickups: Pickup[];
  members: typeof seed.MEMBERS;
  requests: typeof seed.JOIN_REQUESTS;
  offers: typeof seed.OFFERS;
  verifications: VerificationRequest[];
  flags: typeof seed.FLAGS;
  audit: AuditEntry[];
  revealHeld: boolean;
  derby: typeof seed.DERBY;
  nextId: number;
};

const clone = <T>(v: T): T => structuredClone(v);

function freshState(): State {
  const people: Record<string, Person> = {};
  for (const p of seed.PEOPLE) people[p.id] = clone(p);
  return {
    viewer: clone(seed.VIEWER),
    people,
    clubs: clone(seed.CLUBS),
    runs: clone(seed.RUNS),
    stories: clone(seed.STORIES),
    feed: clone(seed.FEED),
    chat: clone(seed.CHAT),
    notifications: clone(seed.NOTIFICATIONS),
    battles: clone(seed.BATTLES),
    challenges: clone(seed.CHALLENGES),
    surprise: true,
    pickups: clone(seed.PICKUPS),
    members: clone(seed.MEMBERS),
    requests: clone(seed.JOIN_REQUESTS),
    offers: clone(seed.OFFERS),
    verifications: clone(seed.VERIFICATIONS),
    flags: clone(seed.FLAGS),
    audit: clone(seed.AUDIT),
    revealHeld: false,
    derby: clone(seed.DERBY),
    nextId: 1,
  };
}

/** The next Sunday at 20:00 London time, when every result unlocks together. */
export function nextReveal(now = new Date()): string {
  const d = new Date(now);
  const day = d.getUTCDay();
  const add = (7 - day) % 7;
  d.setUTCDate(d.getUTCDate() + add);
  // 20:00 in London is 19:00 UTC during British Summer Time (late March to late October).
  const month = d.getUTCMonth();
  const bst = month > 2 && month < 10;
  d.setUTCHours(bst ? 19 : 20, 0, 0, 0);
  if (d.getTime() <= now.getTime()) d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString();
}

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

function postHasReactions(p: FeedPost): p is Extract<FeedPost, { reactions: unknown }> {
  return "reactions" in p;
}

export class MockData implements OuthereData {
  private s: State = freshState();

  /** Back to the seed, for tests and for the "start again" button. */
  reset(): void {
    this.s = freshState();
  }

  private log(action: string, target: string) {
    this.s.audit.unshift({ id: `a${this.s.nextId++}`, actor: `${firstName(this.s.viewer.name)} ${this.s.viewer.name.split(" ")[1]?.[0] ?? ""}.`, action, target, at: hhmm(new Date()) });
  }

  private club(id: string): Club {
    const c = this.s.clubs.find((x) => x.id === id);
    if (!c) throw new Error(`NO_SUCH_CLUB: ${id}`);
    return c;
  }

  private run(id: string) {
    const r = this.s.runs.find((x) => x.id === id);
    if (!r) throw new Error(`NO_SUCH_RUN: ${id}`);
    return r;
  }

  private reveal() {
    return { at: nextReveal(), seed: seed.SEED };
  }

  async viewer() {
    return clone(this.s.viewer);
  }

  async people() {
    return clone(this.s.people);
  }

  async previewAs(role: Role) {
    this.s.viewer.roles = rolesFor(role);
  }

  /* ---------- member area ---------- */

  async home(): Promise<HomeView> {
    const week = [9840, 12410, 7120, 10980, 14320, 14325, 6200];
    return {
      derby: clone(this.s.derby),
      callup: { match: "London v Manchester", league: "City League · Premier · 500 a side", squadNumber: 214, average: 11180 },
      week,
      weekCounted: 78265,
      nextRun: clone(this.run("run-tue")),
      boroughTable: [
        { name: "Hackney", steps: 8912 },
        { name: "Lambeth", steps: 8840 },
        { name: "Southwark", steps: 8790, me: true },
        { name: "Tower Hamlets", steps: 8611 },
        { name: "Haringey", steps: 8590 },
      ],
      boroughLine: "Southwark is 3rd in London, up 2",
      clubActivity: [
        { personId: "tobi", html: "<strong>Tobi</strong> checked in to Thursday intervals", ago: "2h" },
        { personId: "mei", html: "<strong>Mei</strong> joined after scanning the Rye Lane poster", ago: "5h" },
        { personId: "dami", html: "<strong>Dami</strong> posted Saturday's route: Rye to Southbank, 14k", ago: "8h" },
        { personId: "hannah", html: "<strong>Hannah</strong> hit a 30 day streak", ago: "1d" },
        { personId: "zain", html: "<strong>Zain</strong> is run leader for Tuesday", ago: "1d" },
      ],
      reveal: this.reveal(),
    };
  }

  async feed(): Promise<FeedView> {
    return {
      stories: clone(this.s.stories),
      posts: clone(this.s.feed),
      outNow: [
        { personId: "tobi", doing: "3.1k into a run", where: "Burgess Park" },
        { personId: "priya", doing: "Walking home", where: "Bellenden Road" },
        { personId: "lena", doing: "Dog walk", where: "Nunhead Cemetery" },
        { personId: "jordan", doing: "Just stopped", where: "8k intervals, Peckham Rye" },
      ],
      week: { steps: 78265, clubRuns: 3, points: 41, spark: [8, 11, 9, 14, 12, 15, 13] },
      nextRun: clone(this.run("run-tue")),
      chatPreview: { personId: "zain", channel: "tuesday-5k", text: "Who's bringing the spare head torch?", unread: this.s.chat.reduce((n, c) => n + c.unread, 0) },
    };
  }

  async react(postId: string, reaction: Reaction) {
    const p = this.s.feed.find((x) => x.id === postId);
    if (!p || !postHasReactions(p)) return;
    const r = p.reactions;
    const on = !r.mine.includes(reaction);
    r[reaction] += on ? 1 : -1;
    r.mine = on ? [...r.mine, reaction] : r.mine.filter((m) => m !== reaction);
  }

  async comment(postId: string, text: string) {
    const clean = text.trim().slice(0, 500);
    const p = this.s.feed.find((x) => x.id === postId);
    if (!clean || !p || !("comments" in p)) return;
    p.comments.push({ personId: this.s.viewer.id, text: clean });
    p.commentCount += 1;
  }

  async welcome(postId: string) {
    const p = this.s.feed.find((x) => x.id === postId);
    if (p?.kind === "first-run" && !p.welcomed) {
      p.welcomed = true;
      p.welcomes += 1;
    }
  }

  async markStorySeen(storyId: string) {
    const st = this.s.stories.find((x) => x.id === storyId);
    if (st) st.seen = true;
  }

  async setRsvp(runId: string, going: boolean) {
    const r = this.run(runId);
    if (r.imGoing === going) return;
    r.imGoing = going;
    r.going += going ? 1 : -1;
  }

  async chat(clubId: string): Promise<ChatView> {
    const leader = this.s.viewer.roles.includes("captain");
    return {
      club: clone(this.club(clubId)),
      online: 38,
      channels: clone(this.s.chat).map((c) => (c.leadersOnly && !leader ? { ...c, items: [] } : c)),
      nextRun: clone(this.run("run-tue")),
      onRun: ["tobi", "jordan"],
      leaders: ["kemi", "dami", "zain", "priya"],
    };
  }

  private channel(key: string) {
    const c = this.s.chat.find((x) => x.key === key);
    if (!c) throw new Error(`NO_SUCH_CHANNEL: ${key}`);
    if (c.leadersOnly && !this.s.viewer.roles.includes("captain")) throw new Error("LEADERS_ONLY");
    return c;
  }

  async sendChat(_clubId: string, channel: string, text: string) {
    const clean = text.trim().slice(0, 1000);
    if (!clean) return;
    this.channel(channel).items.push({ kind: "message", id: `m${this.s.nextId++}`, personId: this.s.viewer.id, time: hhmm(new Date()), text: clean });
  }

  private message(channel: string, id: string) {
    const m = this.channel(channel).items.find((x): x is Extract<ChatItem, { kind: "message" }> => x.kind === "message" && x.id === id);
    if (!m) throw new Error(`NO_SUCH_MESSAGE: ${id}`);
    return m;
  }

  async votePoll(_clubId: string, channel: string, messageId: string, option: number) {
    const poll = this.message(channel, messageId).poll;
    const target = poll?.options[option];
    if (!poll || !target) return;
    if (poll.myVote !== undefined) {
      const prev = poll.options[poll.myVote];
      if (prev) prev.votes -= 1;
    }
    poll.myVote = option;
    target.votes += 1;
  }

  async toggleChatReaction(_clubId: string, channel: string, messageId: string, index: number) {
    const r = this.message(channel, messageId).reactions?.[index];
    if (!r) return;
    r.mine = !r.mine;
    r.count += r.mine ? 1 : -1;
  }

  async readChannel(_clubId: string, channel: string) {
    const c = this.s.chat.find((x) => x.key === channel);
    if (c) c.unread = 0;
  }

  async calendar(): Promise<CalendarView> {
    return {
      monthName: "October",
      year: 2026,
      daysInMonth: 31,
      leadingBlanks: 2,
      today: seed.TODAY,
      weekStart: seed.TODAY,
      events: seed.calendarEvents(),
      bigMoments: [
        { image: "/img/event.jpg", date: "Sun 26 Oct", title: "London v Manchester reveal", line: "Shows in everyone's calendar" },
        { image: "/img/bridge.jpg", date: "Sat 7 Nov", title: "Winter Night Run", line: "10k along the river · 3,000 places" },
        { image: "/img/founding.jpg", date: "Thu 19 Nov", title: "Founding 500 night", line: "For the first 500 members" },
      ],
      clubName: this.club(this.s.viewer.homeClubId).name,
    };
  }

  async battles(): Promise<BattlesView> {
    return {
      record: { won: 14, lost: 6, streak: "W3", live: this.s.battles.length },
      rivals: [
        { personId: "tobi", mine: 4, theirs: 3 },
        { personId: "mei", mine: 2, theirs: 0 },
        { personId: "zain", mine: 3, theirs: 2 },
        { personId: "jordan", mine: 1, theirs: 1 },
      ],
      candidates: ["tobi", "mei", "zain", "jordan", "hannah", "priya"],
      modes: clone(seed.BATTLE_MODES),
      stakes: ["Bragging rights", "Loser buys the coffees", "100 OUT on it", "Loser posts the winner's photo"],
      active: clone(this.s.battles),
      challenges: clone(this.s.challenges),
      results: [
        { personId: "mei", won: true, mode: "Most steps", line: "by 4,310 steps" },
        { personId: "tobi", won: false, mode: "Live race · 5k", line: "by 9 seconds" },
        { personId: "hannah", won: true, mode: "Hold the route", line: "held Rye Lane loop for 6 days" },
      ],
      surpriseChallengers: this.s.surprise,
      rivalClub: { name: "Southbank Social", crest: "/img/tealclub.jpg" },
    };
  }

  async createBattle(input: NewBattle) {
    const mode = seed.BATTLE_MODES.find((m) => m.key === input.mode);
    if (!mode) throw new Error("BAD_MODE");
    if (!battleLengths(mode).options.includes(input.length)) throw new Error("BAD_LENGTH");
    if (input.opponentId !== "random" && !this.s.people[input.opponentId]) throw new Error("NO_SUCH_PERSON");
    return { id: `b${this.s.nextId++}` };
  }

  async acceptChallenge(id: string) {
    const c = this.s.challenges.find((x) => x.id === id);
    if (c) c.accepted = true;
  }

  async setSurpriseChallengers(on: boolean) {
    this.s.surprise = on;
  }

  async pickups() {
    return clone(this.s.pickups);
  }

  async setPickupGoing(id: string, going: boolean) {
    const p = this.s.pickups.find((x) => x.id === id);
    if (!p) throw new Error("NO_SUCH_PICKUP");
    if (going && !p.imIn && p.capacity && p.goingIds.length + 1 > p.capacity) throw new Error("EVENT_FULL");
    p.imIn = going;
  }

  async postPickup(input: NewPickup): Promise<Pickup> {
    const title = input.title.trim().slice(0, 48) || "Easy 5k after work";
    const at = input.at.trim().slice(0, 48) || "Peckham Rye, the bandstand";
    const p: Pickup = {
      id: `pk${this.s.nextId++}`,
      hostId: this.s.viewer.id,
      type: input.type,
      title,
      when: input.when,
      soon: input.when.startsWith("Today") ? "in 30 min" : undefined,
      at,
      pace: input.type === "walk" ? "Chatty pace" : "Your pace, nobody gets dropped",
      goingIds: [],
      capacity: 8,
      imIn: true,
    };
    this.s.pickups.unshift(p);
    return clone(p);
  }

  async league(): Promise<LeagueView> {
    const verified = this.s.clubs.filter((c) => c.verified).sort((a, b) => a.position - b.position).slice(0, 5);
    const forms = ["wwdww", "wwlww", "wdwlw", "lwdwl", "ldwwl"];
    return {
      season: "Season 1 · week 4 of 6",
      match: { home: "London", away: "Manchester", homeScore: 8240, awayScore: 8610, homeTurnout: 41, awayTurnout: 52, division: "City League Premier", dayOfWeek: 4 },
      table: clone(seed.CITY_TABLE),
      rising: { city: "Birmingham", eligible: 46, needed: 100 },
      clubTable: verified.map((club, i) => ({ club: clone(club), form: forms[i] ?? "" })),
      reveal: this.reveal(),
    };
  }

  async boroughs(metric: BoroughMetric): Promise<BoroughStat[]> {
    return seed.BOROUGHS.map((b) => {
      const real = this.s.clubs.filter((c) => c.borough === b.name).length;
      const value = metric === "clubs" ? real * 3 + 2 + (seed.hashN(b.name) % 9) : 7100 + (seed.hashN(b.name) % 1900) + (b.name === "Southwark" ? 650 : 0);
      return { ...b, value };
    });
  }

  async clubs(query: ClubQuery = {}) {
    const q = (query.q ?? "").trim().toLowerCase();
    return clone(
      this.s.clubs.filter(
        (c) =>
          (!query.borough || c.borough === query.borough) &&
          (query.filters ?? []).every((f) => c.filters.includes(f)) &&
          (!q || `${c.name} ${c.borough} ${c.nextRun}`.toLowerCase().includes(q)),
      ),
    );
  }

  async plans(): Promise<Plan[]> {
    return clone(seed.PLANS);
  }

  async setPublicProfile(on: boolean) {
    this.s.viewer.publicProfile = on;
  }

  async notifications() {
    return clone(this.s.notifications);
  }

  async markNotificationsRead() {
    this.s.notifications.forEach((n) => (n.unread = false));
  }

  async searchIndex(): Promise<SearchItem[]> {
    return [
      ...this.s.clubs.map((c): SearchItem => ({ group: "Clubs", name: c.name, sub: `${c.borough} · ${c.members} members`, href: `/${c.slug}`, image: c.crest })),
      ...Object.values(this.s.people).map((p): SearchItem => ({ group: "People", name: p.name, sub: p.id === this.s.viewer.id ? "You" : "Peckham Pacers", href: p.id === this.s.viewer.id ? "/me" : null, image: p.avatar })),
      ...seed.BOROUGHS.map((b): SearchItem => ({ group: "Boroughs", name: b.name, sub: "Borough league", href: "/league", icon: "pin" })),
    ];
  }

  /* ---------- public ---------- */

  async clubBySlug(slug: string) {
    const c = this.s.clubs.find((x) => x.slug === slug.toLowerCase());
    return c ? clone(c) : null;
  }

  async clubPage(slug: string): Promise<ClubPageView | null> {
    const club = await this.clubBySlug(slug);
    if (!club) return null;
    const pp = club.id === "peckham-pacers";
    return {
      club,
      runs: clone(this.s.runs),
      derby: { opponent: pp ? "Brixton" : "Peckham", us: 12204, them: 11870 },
      stats: { turnout: pp ? "68%" : "54%", raised: pp ? "£858" : "£240" },
      season: {
        points: pp ? 10 : 7,
        form: "wdwww",
        results: [
          { opponent: "Southbank Social", won: true, us: "13,224", them: "12,826" },
          { opponent: "Tottenham Night", won: true, us: "12,904", them: "12,450" },
          { opponent: "Thames Bridges", won: false, us: "11,880", them: "11,860" },
        ],
      },
      leaders: [
        { personId: "kemi", role: "Captain", group: "Steady group" },
        { personId: "dami", role: "Run leader", group: "Fast group" },
        { personId: "zain", role: "Run leader", group: "Steady group" },
        { personId: "hannah", role: "Back marker", group: "Easy group" },
      ],
      gallery: ["clubrun", "clubhero2", "lbattle", "event", "lcrew"].map((p) => `/img/${p}.jpg`),
      locals: [
        { name: "Rye Lane Coffee", kind: "Café", perk: "Free filter coffee after every Saturday run." },
        { name: "Peckham Physio", kind: "Physio", perk: "15% off for members, and a free check after a race." },
        { name: "Khan & Sons", kind: "Pharmacy", perk: "First aid kits for every run leader." },
      ],
      nearby: clone(this.s.clubs.filter((x) => x.id !== club.id).slice(0, 3)),
      reveal: this.reveal(),
    };
  }

  /* ---------- club HQ ---------- */

  async clubHq(clubId: string): Promise<ClubHqView> {
    const club = clone(this.club(clubId));
    const table = [
      ["brixton-sunrise", 61, 10, "wwdlw"],
      ["peckham-pacers", 68, 10, "wdwww"],
      ["southbank-social", 44, 7, "lwdwl"],
      ["tottenham-night", 52, 6, "ldwwl"],
      ["thames-bridges", 39, 4, "llwdl"],
    ] as const;
    return {
      club,
      kpis: [
        { label: "Members", value: club.members, delta: "<b>+18</b> this month", spark: [380, 384, 386, 390, 391, 395, 398, 404, 412] },
        { label: "Run turnout this week", value: "68%", delta: "<b>+6 pts</b> · worth +13.6% in the derby", spark: [51, 55, 52, 58, 61, 60, 62, 68] },
        { label: "Joined from QR codes", value: 38, delta: "<b>214</b> scans this month", spark: [4, 9, 6, 12, 14, 11, 19, 21] },
        { label: "Club fund", value: "£858", delta: "Since September", spark: [120, 210, 300, 420, 520, 640, 750, 858] },
      ],
      turnout: [41, 44, 39, 47, 50, 48, 52, 55, 51, 58, 62, 68],
      checkin: { title: "Thursday intervals", line: "Burgess Park, 18:30. The code changes every 30 seconds, so it only works at the run.", opens: "Opens 18:45" },
      needs: [
        { icon: "people", title: `${this.s.requests.length} people want to join`, line: this.s.requests.length ? `${this.s.requests.map((r) => firstName(this.s.people[r.personId]?.name ?? "")).join(", ").replace(/, ([^,]*)$/, " and $1")} came as guests twice` : "Nobody waiting", action: "Review", href: "/hq/members" },
        { icon: "walk", tone: "warn", title: "Saturday has no back marker", line: "Long run, Rye to Southbank, 14k", action: "Ask", toast: "Asked Zain, Hannah and Tobi" },
        { icon: "pound", title: "Rye Lane Coffee wants to sponsor you", line: "£150 a month and free coffee after Saturday runs", action: "See offer", href: "/hq/fund" },
        { icon: "flag", tone: "alert", title: "Derby v Brixton ends Sunday", line: "You lead by 334. Turnout is your edge.", action: "Nudge", toast: "Nudge sent to 41 members who haven't run this week" },
      ],
      table: table.map(([id, turnout, points, form]) => ({ club: clone(this.club(id)), turnout, points, form })),
    };
  }

  async members(clubId: string): Promise<MembersView> {
    return { club: clone(this.club(clubId)), members: clone(this.s.members), requests: clone(this.s.requests) };
  }

  async decideJoinRequest(clubId: string, requestId: string, approve: boolean) {
    const i = this.s.requests.findIndex((r) => r.id === requestId);
    if (i < 0) return;
    const [r] = this.s.requests.splice(i, 1);
    if (approve && r) {
      this.s.members.push({ personId: r.personId, role: "Member", pace: r.pace, runsThisMonth: r.runs, trust: "New" });
      this.club(clubId).members += 1;
    }
  }

  async runsWeek(clubId: string): Promise<RunsWeekView> {
    const runs: Record<string, RunsWeekView["days"][number]["runs"]> = {
      Tue: [{ time: "19:00", title: "Rye Lane 5k", line: "All paces · 34 going" }],
      Thu: [{ time: "18:30", title: "Intervals", line: "Burgess Park · 22 going" }],
      Fri: [{ time: "10:00", title: "Buggy walk", line: "Peckham Rye · 9 going", walk: true }],
      Sat: [{ time: "08:00", title: "Long run, 14k", line: "Rye to Southbank · 41 going" }],
      Sun: [{ time: "09:30", title: "Recovery walk", line: "Dulwich Park · 12 going", walk: true }],
    };
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => ({ day, date: 20 + i, today: day === "Thu", runs: runs[day] ?? [] }));
    return {
      club: clone(this.club(clubId)),
      weekOf: "week of 20 October",
      days,
      focus: {
        title: "Saturday long run",
        badge: "Back marker needed",
        crew: [
          { personId: "dami", title: "Dami Ola", line: "Run leader · fast group", confirmed: true },
          { personId: "zain", title: "Zain Hussain", line: "Run leader · steady group", confirmed: true },
          { title: "Back marker", line: "Stays with the last runner, carries the first aid kit", confirmed: false },
        ],
      },
      lastRuns: [
        { label: "Tue", checkedIn: 31 },
        { label: "Thu", checkedIn: 22 },
        { label: "Sat", checkedIn: 38 },
        { label: "Tue", checkedIn: 41 },
      ],
    };
  }

  async kit(clubId: string): Promise<KitView> {
    return {
      club: clone(this.club(clubId)),
      covers: ["clubhero", "derby", "clubrun", "lcrew"].map((p) => `/img/${p}.jpg`),
      allTags: ["All paces", "Women-led", "Coffee after", "Beginners welcome", "Night runs", "Walkers welcome"],
      codes: [
        { code: "RYE-04", placed: "Poster, Rye Lane station", scans: 96, cameToRun: 31, joined: 21 },
        { code: "IG-BIO", placed: "Instagram bio", scans: 77, cameToRun: 14, joined: 8 },
        { code: "LVL-02", placed: "Sticker, Peckham Levels", scans: 41, cameToRun: 12, joined: 9 },
        { code: "GYM-01", placed: "Poster, Pulse Gym", scans: 22, cameToRun: 4, joined: 0 },
      ],
    };
  }

  async updateClubPage(clubId: string, patch: ClubPagePatch) {
    const c = this.club(clubId);
    if (patch.slug !== undefined) {
      const slug = slugify(patch.slug);
      if (!isValidClubSlug(slug)) throw new Error("BAD_SLUG");
      if (this.s.clubs.some((x) => x.slug === slug && x.id !== clubId)) throw new Error("SLUG_TAKEN");
      c.slug = slug;
    }
    if (patch.tagline !== undefined) c.tagline = patch.tagline.trim().slice(0, 160);
    if (patch.cover !== undefined) c.cover = patch.cover;
    if (patch.tags !== undefined) c.tags = patch.tags.slice(0, 6);
    return clone(c);
  }

  async fund(clubId: string): Promise<FundView> {
    return {
      club: clone(this.club(clubId)),
      total: 858,
      proMembers: 96,
      proViaLink: 60,
      proMonthly: 78,
      income: [
        { icon: "heart", title: "Pro share", line: "96 members, September and October", amount: "£156" },
        { icon: "store", title: "Peckham Physio", line: "Partner sponsor, 2 months", amount: "£240" },
        { icon: "trophy", title: "Autumn kit drop", line: "140 tees at £3.30 each", amount: "£462" },
        { icon: "spark", title: "Derby prize pot", line: "Win the season and the pot is yours", amount: "£250", pending: true },
      ],
      spend: [
        { title: "First aid course, 4 run leaders", amount: "£180" },
        { title: "Head torches for the night group", amount: "£96" },
        { title: "Food on derby Sunday", amount: "£85" },
        { title: "Park permit, Peckham Rye", amount: "£60" },
      ],
      offers: clone(this.s.offers),
    };
  }

  async respondToOffer(_clubId: string, offerId: string, accept: boolean) {
    const o = this.s.offers.find((x) => x.id === offerId);
    if (o) o.status = accept ? "accepted" : "declined";
  }

  /* ---------- staff ---------- */

  private requireStaff() {
    if (!this.s.viewer.roles.includes("staff")) throw new Error("STAFF_ONLY");
  }

  async adminOverview(): Promise<AdminOverview> {
    this.requireStaff();
    const open = this.s.verifications.filter((v) => !v.verified).length;
    const high = this.s.flags.filter((f) => f.severity === "High").length;
    return {
      kpis: [
        { label: "Moving this week", value: 38412, delta: "<b>+11%</b> week on week", spark: [22, 24, 25, 27, 29, 31, 34, 38] },
        { label: "Verified clubs", value: 212, delta: `<b>${open}</b> waiting for a check`, spark: [150, 162, 170, 181, 190, 199, 206, 212] },
        { label: "Fair play flags", value: this.s.flags.length, delta: `${high} high, ${this.s.flags.length - high} low`, spark: [3, 5, 2, 6, 4, 8, 5, 7] },
        { label: "Paid to clubs", value: "£18,940", delta: "This month, 212 clubs", spark: [8, 9, 11, 12, 14, 15, 17, 19] },
      ],
      daily: [21, 22, 24, 23, 26, 25, 27, 29, 28, 30, 31, 30, 32, 34, 33, 35, 34, 36, 35, 37, 36, 38, 37, 39, 38, 40, 39, 41, 40, 42].map((v) => v * 900),
      dailyLabels: Array.from({ length: 30 }, (_, i) => (i % 7 === 0 ? `${i + 16} Sep` : "")),
      weekend: [
        { title: "Friday draw done", line: `14 cities, 212 clubs · seed ${seed.SEED}`, state: "done" },
        { title: "Score snapshots running", line: "Last one 2 minutes ago", state: "running" },
        { title: "Grace period", line: "Sunday 18:00 to 20:00 for late syncs", state: "waiting" },
        { title: "National reveal", line: "Sunday 20:00", state: "waiting" },
      ],
      health: [
        { value: "210ms", label: "Step sync, p95" },
        { value: "0.02%", label: "Errors" },
        { value: "99.98%", label: "Uptime" },
        { value: "£0.004", label: "Cost per walker" },
      ],
      waiting: [
        { icon: "shield", title: `${open} clubs to verify`, line: "Oldest waiting 26 hours", href: "/verify" },
        { icon: "flag", tone: "alert", title: `${high} high fair play flags`, line: "OUT is on hold until you decide", href: "/fair-play" },
        { icon: "pin", title: "Birmingham at 46 of 100", line: "Plan a launch run with local clubs", action: "Plan", toast: "Drafted a launch plan for Birmingham" },
      ],
      audit: clone(this.s.audit.slice(0, 6)),
      reveal: this.reveal(),
    };
  }

  async verifications() {
    this.requireStaff();
    return clone(this.s.verifications);
  }

  private verification(id: string) {
    const v = this.s.verifications.find((x) => x.id === id);
    if (!v) throw new Error("NO_SUCH_REQUEST");
    return v;
  }

  async setVerificationCheck(id: string, index: number, done: boolean) {
    this.requireStaff();
    const check = this.verification(id).checks[index];
    if (check) check.done = done;
  }

  async verifyClub(id: string) {
    this.requireStaff();
    const v = this.verification(id);
    if (!v.checks.every((c) => c.done)) throw new Error("CHECKS_INCOMPLETE");
    v.verified = true;
    const c = this.club(v.clubId);
    c.verified = true;
    c.founding = false;
    this.log("verified club", c.name);
  }

  async fairPlay(): Promise<FairPlayView> {
    this.requireStaff();
    const high = this.s.flags.filter((f) => f.severity === "High").length;
    return {
      kpis: [
        { label: "Open flags", value: this.s.flags.length, delta: `${high} high` },
        { label: "Cleared this week", value: 31, delta: "<b>88%</b> were real" },
        { label: "Removed this season", value: 4, delta: "0 appealed" },
        { label: "OUT on hold", value: "3,400", delta: "Released or returned in 24h" },
      ],
      flags: clone(this.s.flags),
    };
  }

  async clearFlag(id: string) {
    this.requireStaff();
    const f = this.s.flags.find((x) => x.id === id);
    this.s.flags = this.s.flags.filter((x) => x.id !== id);
    if (f) this.log("cleared flag on", `user ${f.user}`);
  }

  async removeFromSquad(id: string) {
    this.requireStaff();
    const f = this.s.flags.find((x) => x.id === id);
    this.s.flags = this.s.flags.filter((x) => x.id !== id);
    if (f) this.log("removed from squad", `user ${f.user}`);
  }

  async seasons(): Promise<SeasonsView> {
    this.requireStaff();
    return {
      season: "Season 1",
      weeks: 6,
      currentWeek: 4,
      draws: [
        { week: "Week 4", at: "Fri 17 Oct 18:00", seed: seed.SEED, squads: 226 },
        { week: "Week 3", at: "Fri 10 Oct 18:00", seed: "2b90…44d1", squads: 219 },
        { week: "Week 2", at: "Fri 3 Oct 18:00", seed: "e1c7…0a3f", squads: 204 },
      ],
      revealHeld: this.s.revealHeld,
      reveal: this.reveal(),
    };
  }

  async setRevealHeld(held: boolean) {
    this.requireStaff();
    this.s.revealHeld = held;
    this.log(held ? "held" : "released", "the Sunday reveal");
  }

  async audit() {
    this.requireStaff();
    return clone(this.s.audit);
  }
}
