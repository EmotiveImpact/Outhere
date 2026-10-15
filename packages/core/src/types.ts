/**
 * Outhere domain types shared by the web app, the admin app and (later) the
 * Supabase-backed data source. Everything the UI renders comes through these
 * shapes, so swapping the mock data for the real backend is a data source
 * change, not a UI change.
 */

/** Membership tier. The ring around a face always and only shows this. */
export type Tier = "free" | "pro" | "black";

/** The dot at the bottom right of a face: blue while out, red once stopped. */
export type OutState = "out" | "stopped";

export type Role = "member" | "captain" | "staff";

/** Trust level from the system design: how much we believe someone's steps. */
export type Trust = "New" | "Verified" | "Established";

export type PaceGroup = "Walk" | "Easy" | "Steady" | "Fast";

export interface Person {
  id: string;
  name: string;
  /** Full-size photo, for heroes and leader cards. */
  photo: string;
  /** Square face crop, for rings and lists. */
  avatar: string;
  tier: Tier;
  outNow?: OutState;
}

export interface Viewer extends Person {
  handle: string;
  borough: string;
  roles: Role[];
  /** The club this person captains or belongs to first. */
  homeClubId: string;
  level: number;
  streakDays: number;
  foundingNumber?: number;
  trust: Trust;
  publicProfile: boolean;
}

export type ClubFilter = "morn" | "eve" | "night" | "wkd" | "beg" | "walk" | "women";

export interface Club {
  id: string;
  /** Public URL slug: weouthere.app/<slug> */
  slug: string;
  name: string;
  /** Display name split over two lines on heroes: first line, then the blue line. */
  nameTop: string;
  nameBottom: string;
  borough: string;
  cover: string;
  crest: string;
  verified: boolean;
  founding: boolean;
  members: number;
  nextRun: string;
  tags: string[];
  filters: ClubFilter[];
  division: string;
  /** League position in its division, 0 while founding. */
  position: number;
  since: number;
  tagline: string;
}

export interface Borough {
  name: string;
  code: string;
  /** Column and row on the London tile map. */
  col: number;
  row: number;
}

export type BoroughMetric = "steps" | "clubs";

export interface BoroughStat extends Borough {
  value: number;
}

export interface ClubRun {
  id: string;
  clubId: string;
  /** Three letter day, upper case on date boxes: TUE */
  day: string;
  date: number;
  time: string;
  title: string;
  place: string;
  detail: string;
  going: number;
  goingIds: string[];
  /** Whether the viewer has said they're going. */
  imGoing: boolean;
}

export interface Derby {
  id: string;
  home: { name: string; short: string; crest: string; score: number };
  away: { name: string; short: string; crest: string; score: number };
  division: string;
  week: string;
  endsAt: string;
  outNow: string[];
}

export interface CityMatch {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  homeTurnout: number;
  awayTurnout: number;
  division: string;
  dayOfWeek: number;
}

export interface Callup {
  match: string;
  league: string;
  squadNumber: number;
  average: number;
}

/** Results revealed together on Sunday; ISO time of the next reveal. */
export interface RevealInfo {
  at: string;
  seed: string;
}

export interface HomeView {
  derby: Derby;
  callup: Callup;
  week: number[];
  weekCounted: number;
  nextRun: ClubRun;
  boroughTable: { name: string; steps: number; me?: boolean }[];
  boroughLine: string;
  clubActivity: { personId: string; html: string; ago: string }[];
  reveal: RevealInfo;
}

export type FormLetter = "w" | "d" | "l";

export interface CityRow {
  city: string;
  image: string;
  points: number;
  form: string;
  eligible: number;
  me?: boolean;
}

export interface LeagueView {
  season: string;
  match: CityMatch;
  table: CityRow[];
  rising: { city: string; eligible: number; needed: number };
  clubTable: { club: Club; form: string }[];
  reveal: RevealInfo;
}

/* ---------- feed ---------- */

export type Reaction = "fire" | "pushed" | "respect";

export interface ReactionCounts {
  fire: number;
  pushed: number;
  respect: number;
  mine: Reaction[];
}

export interface FeedComment {
  personId: string;
  text: string;
}

export type FeedScope = "club" | "follow" | "borough";

interface FeedBase {
  id: string;
  scopes: FeedScope[];
}

export type RouteShape = "rye" | "river" | "park";

export type FeedPost =
  | (FeedBase & { kind: "derby"; derby: Derby })
  | (FeedBase & {
      kind: "recap";
      image: string;
      title: [string, string];
      runners: number;
      km: number;
      firstTimers: number;
      boroughPoints: number;
      impact: string;
      withIds: string[];
      withLine: string;
      reactions: ReactionCounts;
      comments: FeedComment[];
      commentCount: number;
    })
  | (FeedBase & {
      kind: "first-run";
      personId: string;
      text: string;
      welcomes: number;
      welcomed: boolean;
    })
  | (FeedBase & {
      kind: "run";
      personId: string;
      meta: string;
      title: string;
      km: string;
      pace: string;
      time: string;
      boroughPoints: number;
      route: RouteShape;
      impact?: string;
      withIds: string[];
      withLine: string;
      reactions: ReactionCounts;
      comments: FeedComment[];
      commentCount: number;
    })
  | (FeedBase & { kind: "battle"; battle: Battle })
  | (FeedBase & {
      kind: "photo";
      personId: string;
      meta: string;
      text: string;
      image: string;
      alt: string;
      reactions: ReactionCounts;
      comments: FeedComment[];
      commentCount: number;
    })
  | (FeedBase & {
      kind: "borough";
      borough: string;
      place: string;
      line: string;
      leaders: { name: string; steps: number }[];
    })
  | (FeedBase & { kind: "memory"; then: string; now: string; line: string })
  | (FeedBase & { kind: "reveal"; match: string; line: string; image: string })
  | (FeedBase & {
      kind: "club-post";
      personId: string;
      meta: string;
      text: string;
      fund?: { raised: string; line: string };
      reactions: ReactionCounts;
      comments: FeedComment[];
      commentCount: number;
    });

export interface Story {
  id: string;
  /** A person's story, or the club's own. */
  personId?: string;
  clubId?: string;
  image: string;
  caption: string;
  seen: boolean;
}

export interface OutNowEntry {
  personId: string;
  doing: string;
  where: string;
}

export interface FeedView {
  stories: Story[];
  posts: FeedPost[];
  outNow: OutNowEntry[];
  week: { steps: number; clubRuns: number; points: number; spark: number[] };
  nextRun: ClubRun;
  chatPreview: { personId: string; channel: string; text: string; unread: number };
}

/* ---------- chat ---------- */

export interface ChatPoll {
  question: string;
  options: { label: string; votes: number }[];
  myVote?: number;
}

export type ChatItem =
  | { kind: "day"; label: string }
  | {
      kind: "message";
      id: string;
      personId: string;
      time: string;
      text?: string;
      image?: { src: string; alt: string };
      runId?: string;
      poll?: ChatPoll;
      reactions?: { emoji: string; count: number; mine: boolean }[];
    };

export interface ChatChannel {
  key: string;
  description: string;
  unread: number;
  /** Locked to run leaders and captains. */
  leadersOnly: boolean;
  items: ChatItem[];
}

export interface ChatView {
  club: Club;
  online: number;
  channels: ChatChannel[];
  nextRun: ClubRun;
  onRun: string[];
  leaders: string[];
}

/* ---------- calendar ---------- */

export type CalendarScope = "mine" | "club" | "london";

export interface CalendarEvent {
  id: string;
  /** Day of the month. */
  date: number;
  time: string;
  title: string;
  where: string;
  scope: CalendarScope;
  kind?: "going" | "battle" | "done";
  /** Big city-wide moment, added to everyone's calendar. */
  global?: boolean;
}

export interface CalendarView {
  monthName: string;
  year: number;
  daysInMonth: number;
  /** Blank cells before the 1st in a Monday-first grid. */
  leadingBlanks: number;
  today: number;
  /** First day of the current week (Monday). */
  weekStart: number;
  events: CalendarEvent[];
  bigMoments: { image: string; date: string; title: string; line: string }[];
  clubName: string;
}

/* ---------- notifications and search ---------- */

export interface Notification {
  id: string;
  icon: IconName;
  personId?: string;
  html: string;
  ago: string;
  href: string;
  unread: boolean;
}

export interface SearchItem {
  group: "Clubs" | "People" | "Boroughs" | "Go to";
  name: string;
  sub: string;
  href: string | null;
  image?: string;
  icon?: IconName;
}

/* ---------- membership ---------- */

export interface Plan {
  tier: Tier;
  name: string;
  monthly: number;
  yearly: number;
  line: string;
  features: string[];
  popular?: boolean;
}

/* ---------- battles ---------- */

export type BattleModeKey = "steps" | "live" | "blind" | "ghost" | "last" | "hold";

export interface BattleMode {
  key: BattleModeKey;
  name: string;
  description: string;
  /** Whether the battle is set by time or by distance. */
  length: "time" | "dist";
}

export interface Battle {
  id: string;
  opponentId: string;
  mode: string;
  ends: string;
  us: string;
  them: string;
  /** The viewer's share of the bar, 0 to 100. */
  share: number;
  note: string;
  stake: string;
  sealed?: boolean;
  even?: boolean;
}

export interface Challenge {
  id: string;
  fromId: string;
  mode: string;
  line: string;
  answerIn: string;
  accepted: boolean;
}

export interface BattlesView {
  record: { won: number; lost: number; streak: string; live: number };
  rivals: { personId: string; mine: number; theirs: number }[];
  candidates: string[];
  modes: BattleMode[];
  stakes: string[];
  active: Battle[];
  challenges: Challenge[];
  results: { personId: string; won: boolean; mode: string; line: string }[];
  surpriseChallengers: boolean;
  rivalClub: { name: string; crest: string };
}

export interface NewBattle {
  opponentId: string | "random";
  mode: BattleModeKey;
  length: string;
  stake: string;
}

/* ---------- pick-ups ---------- */

export type PickupType = "run" | "walk" | "race";

export interface Pickup {
  id: string;
  hostId?: string;
  type: PickupType;
  openRace?: boolean;
  openBattle?: boolean;
  title: string;
  when: string;
  soon?: string;
  at: string;
  pace: string;
  goingIds: string[];
  /** 0 means no limit. */
  capacity: number;
  locals?: boolean;
  imIn: boolean;
}

export interface NewPickup {
  type: PickupType;
  title: string;
  at: string;
  when: string;
  visibility: string;
}

/* ---------- club HQ ---------- */

export interface Kpi {
  label: string;
  value: number | string;
  prefix?: string;
  delta: string;
  spark?: number[];
}

export interface ClubTableRow {
  club: Club;
  turnout: number;
  points: number;
  form: string;
}

export interface NeedsYou {
  icon: IconName;
  tone?: "warn" | "alert";
  title: string;
  line: string;
  action: string;
  href?: string;
  toast?: string;
}

export interface ClubHqView {
  club: Club;
  kpis: Kpi[];
  turnout: number[];
  checkin: { title: string; line: string; opens: string };
  needs: NeedsYou[];
  table: ClubTableRow[];
}

export interface Member {
  personId: string;
  role: "Captain" | "Run leader" | "Member" | "Guest";
  pace: PaceGroup;
  runsThisMonth: number;
  trust: Trust;
}

export interface JoinRequest {
  id: string;
  personId: string;
  runs: number;
  pace: PaceGroup;
  foundVia: string;
}

export interface MembersView {
  club: Club;
  members: Member[];
  requests: JoinRequest[];
}

export interface RunsWeekView {
  club: Club;
  weekOf: string;
  days: { day: string; date: number; today: boolean; runs: { time: string; title: string; line: string; walk?: boolean }[] }[];
  focus: { title: string; badge: string; crew: { personId?: string; title: string; line: string; confirmed: boolean }[] };
  lastRuns: { label: string; checkedIn: number }[];
}

export interface KitView {
  club: Club;
  covers: string[];
  allTags: string[];
  codes: { code: string; placed: string; scans: number; cameToRun: number; joined: number }[];
}

export interface ClubPagePatch {
  tagline?: string;
  cover?: string;
  tags?: string[];
  slug?: string;
}

export interface LocalOffer {
  id: string;
  business: string;
  kind: string;
  tier: string;
  line: string;
  status: "open" | "accepted" | "declined";
}

export interface FundView {
  club: Club;
  total: number;
  proMembers: number;
  proViaLink: number;
  proMonthly: number;
  income: { icon: IconName; title: string; line: string; amount: string; pending?: boolean }[];
  spend: { title: string; amount: string }[];
  offers: LocalOffer[];
}

/* ---------- public pages ---------- */

export interface ClubPageView {
  club: Club;
  runs: ClubRun[];
  derby: { opponent: string; us: number; them: number };
  stats: { turnout: string; raised: string };
  season: { points: number; form: string; results: { opponent: string; won: boolean; us: string; them: string }[] };
  leaders: { personId: string; role: string; group: string }[];
  gallery: string[];
  locals: { name: string; kind: string; perk: string }[];
  nearby: Club[];
  reveal: RevealInfo;
}

/* ---------- admin ---------- */

export interface AdminOverview {
  kpis: Kpi[];
  daily: number[];
  dailyLabels: string[];
  weekend: { title: string; line: string; state: "done" | "running" | "waiting" }[];
  health: { value: string; label: string }[];
  waiting: { icon: IconName; tone?: "alert"; title: string; line: string; href?: string; toast?: string; action?: string }[];
  audit: AuditEntry[];
  reveal: RevealInfo;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
}

export interface VerificationRequest {
  id: string;
  clubId: string;
  organiser: string;
  age: string;
  evidence: string[];
  claim: boolean;
  checks: { label: string; auto: boolean; done: boolean }[];
  verified: boolean;
}

export interface FairPlayFlag {
  id: string;
  user: string;
  severity: "High" | "Low";
  reason: string;
  steps: number[];
  trust: Trust;
}

export interface FairPlayView {
  kpis: Kpi[];
  flags: FairPlayFlag[];
}

export interface SeasonsView {
  season: string;
  weeks: number;
  currentWeek: number;
  draws: { week: string; at: string; seed: string; squads: number }[];
  revealHeld: boolean;
  reveal: RevealInfo;
}

export type IconName =
  | "home" | "trophy" | "compass" | "user" | "grid" | "people" | "cal" | "qr" | "pound" | "shield"
  | "flag" | "dice" | "pulse" | "search" | "bell" | "menu" | "chev" | "pin" | "clock" | "check"
  | "x" | "plus" | "down" | "share" | "arrow" | "ext" | "spark" | "walk" | "heart" | "lock"
  | "eye" | "store" | "log" | "sun" | "moon" | "chat" | "feed" | "image" | "send" | "bolt" | "pinI";
