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
  /** Home city id and name. Anyone in the UK can join, so this is any city or town. */
  cityId: string;
  city: string;
  /** The viewer's borough in London, or area elsewhere. */
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
  cityId: string;
  city: string;
  /** Borough in London, area elsewhere. Empty when the club hasn't set one. */
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

/** A UK city or town Outhere knows about. */
export interface City {
  id: string;
  name: string;
  /** "North West", "Scotland". Towns under 100 active play for their region. */
  region: string;
  /** One of the launch-night cities. */
  launch: boolean;
  /** Verified and founding clubs in the city. */
  clubs: number;
  /** What the city's parts are called: boroughs in London, areas elsewhere. */
  areaWord: "borough" | "area";
  /** Whether its areas have places on a tile map. Without one the app shows a ranked list. */
  hasMap: boolean;
}

/** A borough in London, an area in other cities. */
export interface Borough {
  name: string;
  code: string;
  /** Column and row on the city's tile map, when it has one. */
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

/** A finished Sunday reveal, replayed full screen: the derby score, then what it meant. */
export interface RevealResult {
  home: { name: string; short: string; crest: string; score: number };
  away: { name: string; short: string; crest: string; score: number };
  /** Up to three cards after the score: the club table, the city squad, the borough. */
  cards: { kick: string; title: string; line: string }[];
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
  /** A region side: smaller towns playing together until one reaches 100 active. */
  region?: boolean;
  image: string;
  points: number;
  form: string;
  eligible: number;
  me?: boolean;
}

export interface LeagueView {
  season: string;
  match: CityMatch;
  /** City League tables, top division first. */
  divisions: { name: string; rows: CityRow[] }[];
  /** A town closing in on 100 active, when it can play as itself instead of for its region. */
  rising: { city: string; cityId: string; region: string; eligible: number; needed: number };
  /** The city the club table and areas are for. */
  city: City;
  /** That city's clubs in league order. */
  clubTable: { club: Club; form: string; points: number; me?: boolean }[];
  /** The viewer's club derby this week. */
  derby: Derby;
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
      /** The borough or area the points went to. */
      borough: string;
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
      /** The borough or area the points went to. */
      borough: string;
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
  /** People typing in this channel right now. */
  typing?: string[];
}

export interface ChatView {
  club: Club;
  online: number;
  /** A few of the people online, for the faces in the header. */
  onlineIds: string[];
  channels: ChatChannel[];
  nextRun: ClubRun;
  onRun: string[];
  leaders: string[];
}

/* ---------- calendar ---------- */

export type CalendarScope = "mine" | "club" | "city";

export interface CalendarEvent {
  id: string;
  /** Day of the month. */
  date: number;
  time: string;
  title: string;
  where: string;
  scope: CalendarScope;
  kind?: "going" | "battle" | "done";
  /** Big moment for the whole of the UK, added to everyone's calendar. */
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
  /** The viewer's city, for "All of Leeds". */
  city: string;
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
  group: "Clubs" | "People" | "Cities" | "Boroughs" | "Go to";
  name: string;
  sub: string;
  href: string | null;
  image?: string;
  icon?: IconName;
}

/* ---------- membership ---------- */

export interface MeView {
  clubName: string;
  /** How the viewer is known at their home club: Captain, Run leader, Member. */
  clubRole: string;
  kpis: Kpi[];
  /** The last 12 weeks, oldest first: counted steps in thousands, and club runs. */
  weeks: { labels: string[]; steps: number[]; runs: number[] };
  badges: { image: string; label: string }[];
  badgesEarned: number;
  badgesTotal: number;
}

/**
 * Someone's public page at weouthere.app/@handle. Private profiles show
 * nothing but the fact that they are private.
 */
export type PublicProfile =
  | { handle: string; visible: false }
  | {
      handle: string;
      visible: true;
      person: Person;
      city: string;
      borough: string;
      trust: Trust;
      foundingNumber?: number;
      level: number;
      streakDays: number;
      /** Their home club, if they have one. */
      club?: { name: string; slug: string; role: string };
      /** Public numbers only: nothing about OUT balances or money. */
      stats: Kpi[];
      badges: { image: string; label: string }[];
      badgesEarned: number;
      badgesTotal: number;
      /** The signed-in viewer is looking at their own page. */
      isMe: boolean;
    };

export interface Plan {
  tier: Tier;
  name: string;
  monthly: number;
  /** Null while there is no yearly price, so the plan is monthly only. */
  yearly: number | null;
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

export interface PickupsView {
  list: Pickup[];
  /** The neighbourhood pick-ups are drawn from, e.g. "Peckham". */
  area: string;
  radiusKm: number;
  /** People sharing a live run or walk within the radius right now. */
  outNearby: number;
  /** The viewer's home club, offered as "Who can see it". */
  clubName: string;
}

export interface NewPickup {
  type: PickupType;
  title: string;
  at: string;
  when: string;
  visibility: string;
  /** Roughly where it meets, when the poster shared their location. Kept to about a kilometre. */
  near?: LatLng;
}

/** A point on the map, in degrees. */
export interface LatLng {
  lat: number;
  lng: number;
}

/* ---------- club HQ ---------- */

/** A club run or walk a captain adds from Club HQ. Date and time are UK local time. */
export interface NewRun {
  clubId: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  time: string;
  title: string;
  place: string;
  detail: string;
  walk: boolean;
}

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

/** The run whose live check-in code HQ shows next. */
export interface CheckinRun {
  runId: string;
  /** "Thursday intervals" */
  title: string;
  /** "Burgess Park" */
  place: string;
  line: string;
  /** "Opens 18:45" */
  opens: string;
  going: number;
  /** Who said they're going. Example data plays these back as arrivals. */
  goingIds: string[];
}

export interface ClubHqView {
  club: Club;
  kpis: Kpi[];
  /** Share of active members at a club run, last 12 weeks, oldest first. */
  turnout: number[];
  /** One label per turnout week; blank where the chart leaves a gap. */
  turnoutLabels: string[];
  checkin: CheckinRun;
  needs: NeedsYou[];
  /** "Club Premier, Leeds" */
  league: string;
  table: ClubTableRow[];
}

export interface Member {
  personId: string;
  role: "Captain" | "Run leader" | "Member" | "Guest";
  pace: PaceGroup;
  runsThisMonth: number;
  trust: Trust;
  /** Activity each of the last 8 weeks, oldest first: a club run counts 1, a walk half. */
  weekly: number[];
  /** Days since their last club run or walk. */
  daysSinceRun: number;
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
  focus: {
    title: string;
    badge: string;
    crew: { personId?: string; title: string; line: string; confirmed: boolean }[];
    /** Who to ask to fill the open spot. */
    askIds: string[];
  };
  lastRuns: { label: string; checkedIn: number }[];
  checkin: CheckinRun;
}

export interface KitView {
  club: Club;
  covers: string[];
  allTags: string[];
  codes: { code: string; placed: string; scans: number; cameToRun: number; joined: number }[];
  /** The three short lines on the A4 poster. */
  poster: { when: string; where: string; who: string };
  /** For the story card: the current derby and the margin (negative when behind). */
  derby: { opponent: string; lead: number };
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
  /** The officer who approves payouts first. */
  treasurerId: string;
  /** The numbers behind "How the fund fills up". */
  split: {
    proPrice: number;
    sponsor: { name: string; monthly: number };
    kit: { teePrice: number; makingShare: number; sold: number };
  };
}

/* ---------- public pages ---------- */

export interface ClubPageView {
  club: Club;
  runs: ClubRun[];
  derby: { opponent: string; us: number; them: number };
  stats: { turnout: string; raised: string };
  season: { points: number; form: string; results: { opponent: string; result: FormLetter; us: string; them: string }[] };
  /** `person` comes with the page so signed out visitors see leaders' names and faces too. */
  leaders: { personId: string; role: string; group: string; person?: Person }[];
  gallery: string[];
  locals: { name: string; kind: string; perk: string }[];
  nearby: Club[];
  /** Meetups done towards going official, while the club is founding. */
  founding: { meetups: number; needed: number } | null;
  reveal: RevealInfo;
}

/** What someone picks in the join flow a club's QR code opens. */
export interface JoinInput {
  pace: PaceGroup;
  /** The run they said they'll come to, if any. */
  runId: string | null;
  /** The poster or sticker code they scanned to get here, if any. */
  code?: string;
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
  city: string;
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
