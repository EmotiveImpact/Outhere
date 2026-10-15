import type {
  RevealResult,
  NewRun,
  PublicProfile,
  BattlesView, BoroughMetric, BoroughStat, CalendarView, City, ChatView, Club, ClubFilter, ClubHqView,
  ClubPagePatch, ClubPageView, FairPlayView, JoinInput, FeedView, FundView, HomeView, KitView, LeagueView,
  MembersView, NewBattle, NewPickup, MeView, Notification, Person, Pickup, PickupsView, Plan, Reaction, Role, RunsWeekView,
  SearchItem, SeasonsView, AdminOverview, VerificationRequest, Viewer, AuditEntry,
} from "./types";

export type ClubSort = "closest" | "biggest" | "newest";

export interface ClubQuery {
  q?: string;
  /** City id. Leave it out for clubs anywhere in the UK. */
  city?: string | null;
  /** A borough or area within that city. */
  borough?: string | null;
  filters?: ClubFilter[];
  /** Closest puts the viewer's own city first, then their borough's neighbours. */
  sort?: ClubSort;
}

/**
 * Everything the web and admin apps read and write. The mock implementation
 * lives in ./mock; a Supabase implementation will sit next to it and be picked
 * by configuration. Methods are async so either can sit behind it.
 */
export interface OuthereData {
  /* who is looking */
  viewer(): Promise<Viewer>;
  people(): Promise<Record<string, Person>>;

  /* member area */
  home(): Promise<HomeView>;
  feed(): Promise<FeedView>;
  react(postId: string, reaction: Reaction): Promise<void>;
  comment(postId: string, text: string): Promise<void>;
  welcome(postId: string): Promise<void>;
  markStorySeen(storyId: string): Promise<void>;
  setRsvp(runId: string, going: boolean): Promise<void>;

  chat(clubId: string): Promise<ChatView>;
  sendChat(clubId: string, channel: string, text: string): Promise<void>;
  votePoll(clubId: string, channel: string, messageId: string, option: number): Promise<void>;
  toggleChatReaction(clubId: string, channel: string, messageId: string, index: number): Promise<void>;
  readChannel(clubId: string, channel: string): Promise<void>;

  calendar(): Promise<CalendarView>;
  battles(): Promise<BattlesView>;
  createBattle(input: NewBattle): Promise<{ id: string }>;
  acceptChallenge(id: string): Promise<void>;
  /** "Not this week": the challenger is told, nobody loses points. */
  declineChallenge(id: string): Promise<void>;
  setSurpriseChallengers(on: boolean): Promise<void>;

  pickups(): Promise<PickupsView>;
  setPickupGoing(id: string, going: boolean): Promise<void>;
  postPickup(input: NewPickup): Promise<Pickup>;
  /** Club staff only. */
  createRun(input: NewRun): Promise<void>;

  /** Every city and town with clubs or a league place, launch cities first. */
  cities(): Promise<City[]>;
  /** The club table and city for cityId, or the viewer's own city. */
  league(cityId?: string): Promise<LeagueView>;
  /** Boroughs or areas of cityId, or of the viewer's own city. */
  boroughs(metric: BoroughMetric, cityId?: string): Promise<BoroughStat[]>;
  clubs(query?: ClubQuery): Promise<Club[]>;
  me(): Promise<MeView>;
  /** The viewer's home club derby from the last reveal, or null before the first one. */
  lastReveal(): Promise<RevealResult | null>;
  /** weouthere.app/@handle. Null when nobody has that handle. */
  profile(handle: string): Promise<PublicProfile | null>;
  plans(): Promise<Plan[]>;
  setPublicProfile(on: boolean): Promise<void>;

  notifications(): Promise<Notification[]>;
  markNotificationsRead(): Promise<void>;
  searchIndex(): Promise<SearchItem[]>;

  /* public */
  clubBySlug(slug: string): Promise<Club | null>;
  clubPage(slug: string): Promise<ClubPageView | null>;
  /**
   * Join a club from its public page or QR code, with a pace and maybe a first
   * run. "requested" when the club says yes to each new member first.
   */
  joinClub(slug: string, input: JoinInput): Promise<"joined" | "requested">;

  /* club HQ */
  clubHq(clubId: string): Promise<ClubHqView>;
  members(clubId: string): Promise<MembersView>;
  decideJoinRequest(clubId: string, requestId: string, approve: boolean): Promise<void>;
  runsWeek(clubId: string): Promise<RunsWeekView>;
  kit(clubId: string): Promise<KitView>;
  updateClubPage(clubId: string, patch: ClubPagePatch): Promise<Club>;
  fund(clubId: string): Promise<FundView>;
  respondToOffer(clubId: string, offerId: string, accept: boolean): Promise<void>;

  /* staff */
  adminOverview(): Promise<AdminOverview>;
  verifications(): Promise<VerificationRequest[]>;
  setVerificationCheck(id: string, index: number, done: boolean): Promise<void>;
  verifyClub(id: string): Promise<void>;
  fairPlay(): Promise<FairPlayView>;
  clearFlag(id: string): Promise<void>;
  removeFromSquad(id: string): Promise<void>;
  seasons(): Promise<SeasonsView>;
  setRevealHeld(held: boolean): Promise<void>;
  audit(): Promise<AuditEntry[]>;

  /** Mock only: preview the app as another kind of user. */
  previewAs?(role: Role): Promise<void>;
}

