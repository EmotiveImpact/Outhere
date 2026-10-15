/*
 * Example data for building and previewing Outhere before the backend is live.
 * Every name, number and business here is an example. Taken from the approved
 * web app mockup (Version 12) so the build matches what Edem signed off.
 */
import type {
  Battle, BattleMode, Borough, CalendarEvent, ChatChannel, Challenge, Club, ClubRun, FairPlayFlag,
  FeedPost, JoinRequest, LocalOffer, Member, Notification, Person, Pickup, Plan, Story,
  VerificationRequest, Viewer, AuditEntry,
} from "../types";

const img = (name: string) => `/_app/img/${name}.jpg`;

/** Crest drawn as an SVG data URL for clubs without a photographed crest. */
export function crestSvg(text: string, hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue} 70% 28%)"/><stop offset="1" stop-color="#05070a"/></linearGradient></defs><rect width="100" height="100" fill="#07090c"/><path d="M50 12l30 12v22c0 19-13 34-30 40-17-6-30-21-30-40V24z" fill="url(#g)" stroke="hsl(${hue} 90% 66%)" stroke-width="2.5"/><text x="50" y="60" font-family="Barlow Condensed,Arial Narrow,sans-serif" font-weight="600" font-size="${text.length > 2 ? 22 : 28}" fill="#fff" text-anchor="middle" letter-spacing="1">${text}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const person = (id: string, name: string, photo: string, tier: Person["tier"], outNow?: Person["outNow"]): Person => ({
  id,
  name,
  photo: img(photo),
  avatar: img(`av-${photo}`),
  tier,
  ...(outNow ? { outNow } : {}),
});

export const PEOPLE: Person[] = [
  person("kemi", "Kemi Adeyemi", "amara", "pro"),
  person("tobi", "Tobi Bankole", "tobi", "black", "out"),
  person("mei", "Mei Chen", "mei", "free"),
  person("zain", "Zain Hussain", "zain", "pro"),
  person("hannah", "Hannah Price", "hannah", "free"),
  person("dami", "Dami Ola", "captain", "pro"),
  person("priya", "Priya Nair", "face", "pro", "out"),
  person("jordan", "Jordan Mensah", "black", "black", "stopped"),
  person("lena", "Lena Brooks", "tealface", "free", "out"),
];

export const VIEWER: Viewer = {
  ...(PEOPLE[0] as Person),
  handle: "kemi",
  borough: "Southwark",
  roles: ["member", "captain", "staff"],
  homeClubId: "peckham-pacers",
  level: 14,
  streakDays: 23,
  foundingNumber: 212,
  trust: "Established",
  publicProfile: true,
};

const club = (c: Omit<Club, "slug"> & { slug?: string }): Club => ({ ...c, slug: c.slug ?? c.id.replace(/-/g, "") });

export const CLUBS: Club[] = [
  club({ id: "peckham-pacers", name: "Peckham Pacers", nameTop: "Peckham", nameBottom: "Pacers", borough: "Southwark", cover: img("clubhero"), crest: img("pacers"), verified: true, founding: false, members: 412, nextRun: "Tue 19:00 · Rye Lane", tags: ["All paces", "Women-led", "Coffee after"], filters: ["eve", "wkd", "beg", "women"], division: "Club Premier", position: 2, since: 2019, tagline: "No one gets left behind on Rye Lane. Three pace groups, a back marker on every run, coffee after." }),
  club({ id: "brixton-sunrise", name: "Brixton Sunrise Collective", nameTop: "Brixton", nameBottom: "Sunrise", borough: "Lambeth", cover: img("sun"), crest: crestSvg("BSC", 28), verified: true, founding: false, members: 286, nextRun: "Wed 06:30 · Brockwell Park", tags: ["Early birds", "5k and 10k"], filters: ["morn", "wkd"], division: "Club Premier", position: 1, since: 2020, tagline: "Sunrise laps of Brockwell, then breakfast on Atlantic Road." }),
  club({ id: "hackney-marsh", name: "Hackney Marsh Milers", nameTop: "Hackney", nameBottom: "Marsh Milers", borough: "Hackney", cover: img("marsh"), crest: crestSvg("HMM", 150), verified: true, founding: false, members: 198, nextRun: "Thu 18:45 · Lea Bridge", tags: ["Trail", "Beginners welcome"], filters: ["eve", "beg"], division: "Club Championship", position: 3, since: 2018, tagline: "Mud, mist and the marshes. Beginners welcome every Thursday." }),
  club({ id: "tottenham-night", name: "Tottenham Night Runners", nameTop: "Tottenham", nameBottom: "Night Runners", borough: "Haringey", cover: img("clubrun"), crest: crestSvg("TNR", 215), verified: true, founding: false, members: 240, nextRun: "Mon 20:00 · Bruce Castle", tags: ["Night runs", "All paces"], filters: ["eve", "night"], division: "Club Premier", position: 4, since: 2021, tagline: "Lights on, headphones off. N17 after dark." }),
  club({ id: "thames-bridges", name: "Thames Bridges RC", nameTop: "Thames", nameBottom: "Bridges", borough: "Tower Hamlets", cover: img("bridge"), crest: img("crest"), verified: true, founding: false, members: 322, nextRun: "Sat 08:30 · Tower Bridge", tags: ["10k", "Social"], filters: ["wkd", "morn"], division: "Club Premier", position: 5, since: 2017, tagline: "Eight bridges every Saturday morning." }),
  club({ id: "stratford-striders", name: "Stratford Striders", nameTop: "Stratford", nameBottom: "Striders", borough: "Newham", cover: img("event"), crest: crestSvg("SS", 260), verified: true, founding: false, members: 154, nextRun: "Sun 09:00 · Olympic Park", tags: ["Run and walk", "Families"], filters: ["wkd", "walk", "beg"], division: "Club Championship", position: 6, since: 2022, tagline: "Run or walk the park. Kids and dogs welcome." }),
  club({ id: "lewisham-buggy", name: "Lewisham Buggy Walkers", nameTop: "Lewisham", nameBottom: "Buggy Walkers", borough: "Lewisham", cover: img("walk"), crest: crestSvg("LBW", 190), verified: true, founding: false, members: 88, nextRun: "Fri 10:00 · Ladywell Fields", tags: ["Walking", "Parents and buggies"], filters: ["walk", "morn", "beg"], division: "Club League One", position: 2, since: 2023, tagline: "Weekday walks for parents, carers and anyone with a pram." }),
  club({ id: "croydon-hills", name: "Croydon Hill Crew", nameTop: "Croydon", nameBottom: "Hill Crew", borough: "Croydon", cover: img("hill"), crest: crestSvg("CHC", 8), verified: true, founding: false, members: 121, nextRun: "Wed 19:00 · Addington Hills", tags: ["Hills", "Intervals"], filters: ["eve"], division: "Club Championship", position: 7, since: 2020, tagline: "If it goes up, we run it." }),
  club({ id: "walthamstow-dawn", name: "Walthamstow Dawn Walkers", nameTop: "Walthamstow", nameBottom: "Dawn Walkers", borough: "Waltham Forest", cover: img("dawn"), crest: img("founding"), verified: false, founding: true, members: 24, nextRun: "Sat 07:00 · The Wetlands", tags: ["Walking", "Over 50s"], filters: ["walk", "morn", "wkd", "beg"], division: "Founding", position: 0, since: 2026, tagline: "Founding club, 2 of 3 meetups done. Come and make it official." }),
  club({ id: "southbank-social", name: "Southbank Social", nameTop: "Southbank", nameBottom: "Social", borough: "Lambeth", cover: img("tealclub"), crest: crestSvg("SBS", 195), verified: true, founding: false, members: 377, nextRun: "Thu 18:30 · National Theatre", tags: ["Social", "5k"], filters: ["eve", "beg"], division: "Club Premier", position: 6, since: 2016, tagline: "5k along the river, then the pub." }),
  club({ id: "wembley-way", name: "Wembley Way Runners", nameTop: "Wembley", nameBottom: "Way", borough: "Brent", cover: img("lcrew"), crest: crestSvg("WWR", 230), verified: true, founding: false, members: 143, nextRun: "Tue 19:00 · Wembley Park", tags: ["Beginners welcome", "Women-led"], filters: ["eve", "beg", "women"], division: "Club Championship", position: 5, since: 2021, tagline: "Couch to 5k groups start every month." }),
  club({ id: "deptford-docks", name: "Deptford Docks RC", nameTop: "Deptford", nameBottom: "Docks", borough: "Lewisham", cover: img("roof"), crest: crestSvg("DD", 35), verified: false, founding: true, members: 31, nextRun: "Sun 10:00 · Deptford Creek", tags: ["Founding club", "All paces"], filters: ["wkd", "beg"], division: "Founding", position: 0, since: 2026, tagline: "Founding club. One more meetup to go official." }),
];

export const BOROUGHS: Borough[] = (
  [
    [3, 0, "Barnet", "BNT"], [4, 0, "Haringey", "HGY"], [5, 0, "Enfield", "ENF"], [1, 1, "Harrow", "HRW"], [2, 1, "Brent", "BRN"],
    [3, 1, "Camden", "CMD"], [4, 1, "Islington", "ISL"], [5, 1, "Hackney", "HCK"], [6, 1, "Waltham Forest", "WFR"], [7, 1, "Redbridge", "RDB"],
    [8, 1, "Havering", "HAV"], [0, 2, "Hillingdon", "HDN"], [1, 2, "Ealing", "EAL"], [2, 2, "Hammersmith and Fulham", "HMS"],
    [3, 2, "Kensington and Chelsea", "KNS"], [4, 2, "Westminster", "WST"], [5, 2, "Tower Hamlets", "TOW"], [6, 2, "Newham", "NWM"],
    [7, 2, "Barking and Dagenham", "BKD"], [1, 3, "Hounslow", "HNS"], [2, 3, "Richmond upon Thames", "RCH"], [3, 3, "Wandsworth", "WNS"],
    [4, 3, "Lambeth", "LAM"], [5, 3, "Southwark", "SWK"], [6, 3, "Lewisham", "LSH"], [7, 3, "Greenwich", "GRN"], [8, 3, "Bexley", "BXL"],
    [2, 4, "Kingston upon Thames", "KNG"], [3, 4, "Merton", "MRT"], [4, 4, "Croydon", "CRD"], [5, 4, "Bromley", "BRM"], [4, 5, "Sutton", "STN"],
  ] as const
).map(([col, row, name, code]) => ({ col, row, name, code }));

export const hashN = (s: string): number => {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return h;
};

export const RUNS: ClubRun[] = [
  { id: "run-tue", clubId: "peckham-pacers", day: "TUE", date: 21, time: "19:00", title: "Rye Lane 5k", place: "outside Peckham Rye station", detail: "All paces · three groups", going: 34, goingIds: ["tobi", "mei", "zain", "hannah"], imGoing: false },
  { id: "run-thu", clubId: "peckham-pacers", day: "THU", date: 23, time: "18:30", title: "Intervals", place: "Burgess Park lake gate", detail: "Steady and fast", going: 22, goingIds: ["dami", "priya", "jordan"], imGoing: false },
  { id: "run-sat", clubId: "peckham-pacers", day: "SAT", date: 25, time: "08:00", title: "Long run, 14k", place: "Peckham Rye to Southbank", detail: "Coffee after at Rye Lane Coffee", going: 41, goingIds: ["kemi", "lena", "tobi", "zain"], imGoing: true },
];

export const STORIES: Story[] = [
  { id: "s1", personId: "tobi", image: img("tobi"), caption: "Tobi is out now · 3.1k into a run round Burgess Park", seen: false },
  { id: "s2", personId: "jordan", image: img("black"), caption: "Jordan just stopped · 8k of intervals on Peckham Rye, done", seen: false },
  { id: "s3", clubId: "peckham-pacers", image: img("clubrun"), caption: "Peckham Pacers tonight · 31 of us on Rye Lane", seen: false },
  { id: "s4", personId: "zain", image: img("sun"), caption: "Zain · sunrise from the top of the park", seen: false },
  { id: "s5", personId: "hannah", image: img("dawn"), caption: "Hannah · couldn't see the end of the path. Went anyway.", seen: false },
  { id: "s6", personId: "mei", image: img("streaks"), caption: "Mei · day 30. Didn't miss one.", seen: false },
  { id: "s7", personId: "lena", image: img("walk"), caption: "Lena · first walk with the Pacers", seen: false },
];

const rx = (fire: number, pushed: number, respect: number) => ({ fire, pushed, respect, mine: [] });

export const DERBY = {
  id: "derby-pp-bsc",
  home: { name: "Peckham Pacers", short: "Peckham", crest: img("pacers"), score: 12204 },
  away: { name: "Brixton Sunrise", short: "Brixton", crest: crestSvg("BSC", 28), score: 11870 },
  division: "Club Premier",
  week: "week 4 of 6",
  endsAt: "Ends Sunday 18:00",
  outNow: ["tobi", "jordan", "priya", "lena"],
};

export const BATTLES: Battle[] = [
  { id: "b-tobi", opponentId: "tobi", mode: "Most steps", ends: "Ends Friday 23:59", us: "41,220", them: "39,080", share: 51.3, note: "You're 2,140 ahead, but Tobi is out right now.", stake: "Loser buys the coffees" },
  { id: "b-mei", opponentId: "mei", mode: "Blind time trial · 5k", ends: "Mei has 9h left to run", us: "24:18", them: "Sealed", share: 50, note: "Your time is in and sealed. You both see the result the moment Mei finishes.", stake: "Bragging rights", sealed: true },
  { id: "b-zain", opponentId: "zain", mode: "Last one standing", ends: "Day 3 of 7 · 9,000 today", us: "Safe", them: "Safe", share: 50, note: "You've both hit today's target. Tomorrow it goes up to 10,000.", stake: "100 OUT on it", even: true },
];

export const FEED: FeedPost[] = [
  { id: "p-derby", kind: "derby", scopes: ["club", "borough"], derby: DERBY },
  { id: "p-recap", kind: "recap", scopes: ["club"], image: img("clubrun"), title: ["31 Pacers ran", "Rye Lane"], runners: 31, km: 155, firstTimers: 3, boroughPoints: 1240, impact: "That run put <b>Peckham back in front of Brixton</b> in the derby.", withIds: ["dami", "zain", "mei", "tobi", "hannah", "priya"], withLine: "Dami, Zain, Mei and 28 others", reactions: rx(86, 31, 40), comments: [], commentCount: 14 },
  { id: "p-first", kind: "first-run", scopes: ["club", "follow"], personId: "lena", text: "2.4k with the walk-run group. Back marker Priya says she smiled the whole way.", welcomes: 47, welcomed: false },
  { id: "p-zain", kind: "run", scopes: ["follow", "borough"], personId: "zain", meta: "Steady group · Peckham · 1 hour ago", title: "Rye Lane loop with the steady lot", km: "8.2", pace: "5:41", time: "46:38", boroughPoints: 38, route: "rye", impact: "Southwark passed <b>Lambeth</b> during this run. 3rd in London this week.", withIds: ["mei", "tobi", "hannah"], withLine: "with Mei, Tobi and Hannah", reactions: rx(24, 9, 5), comments: [{ personId: "mei", text: "Legs are gone but worth it" }, { personId: "tobi", text: "Zain set off like it was a race again" }], commentCount: 5 },
  { id: "p-battle", kind: "battle", scopes: ["follow"], battle: BATTLES[0] as Battle },
  { id: "p-hannah", kind: "photo", scopes: ["follow"], personId: "hannah", meta: "Walk group · Peckham Rye Park · 3 hours ago", text: "Couldn't see the end of the path this morning. Went anyway. Thursday walk group meets at 7 if you fancy the next one.", image: img("dawn"), alt: "A runner on a misty riverside path at dawn", reactions: rx(41, 6, 22), comments: [], commentCount: 7 },
  { id: "p-borough", kind: "borough", scopes: ["borough"], borough: "Southwark", place: "3rd", line: "in London, up two places since Monday. 4,812 people walking and running for Southwark.", leaders: [{ name: "Kemi Adeyemi", steps: 78265 }, { name: "Zain Hussain", steps: 74910 }, { name: "Mei Chen", steps: 71002 }] },
  { id: "p-memory", kind: "memory", scopes: ["follow"], then: "31:40", now: "24:12", line: "7 minutes faster, 212 runs later. Peckham Rye was there for every one." },
  { id: "p-reveal", kind: "reveal", scopes: ["club"], match: "London v Manchester", line: "Who walked further this week? Find out live on Sunday at 20:00.", image: img("event") },
  { id: "p-kemi", kind: "run", scopes: ["follow", "borough"], personId: "kemi", meta: "Long run · Peckham to Southbank · Saturday", title: "Long Saturday along the river", km: "14.1", pace: "6:02", time: "1:25:07", boroughPoints: 61, route: "river", withIds: ["dami", "priya", "zain", "lena"], withLine: "with Dami, Priya, Zain and Lena", reactions: rx(37, 12, 8), comments: [], commentCount: 4 },
  { id: "p-fund", kind: "club-post", scopes: ["club"], personId: "kemi", meta: "Captain · Peckham Pacers · 2 days ago", text: "Club fund update. This month it paid for a first aid course for four run leaders and head torches for the night group. Every penny is on the fund page.", fund: { raised: "£858 raised since September", line: "From Pro members, Peckham Physio and the autumn kit drop" }, reactions: rx(29, 4, 18), comments: [], commentCount: 2 },
];

export const CHAT: ChatChannel[] = [
  { key: "general", description: "Everything Pacers", unread: 0, leadersOnly: false, items: [
    { kind: "day", label: "Yesterday" },
    { kind: "message", id: "g1", personId: "dami", time: "18:02", text: "Good turnout tonight, 31 of us. New faces, say hello in here 👋", reactions: [{ emoji: "🙌", count: 9, mine: false }] },
    { kind: "message", id: "g2", personId: "lena", time: "18:40", text: "Hello! Came along as a guest twice, just got approved. Lovely bunch.", reactions: [{ emoji: "❤️", count: 12, mine: false }] },
    { kind: "message", id: "g3", personId: "kemi", time: "18:44", text: "Welcome Lena! Walk group meets Thursday at 7 if you want something gentler." },
    { kind: "day", label: "Today" },
    { kind: "message", id: "g4", personId: "zain", time: "07:12", text: "Sunrise this morning was unreal from the top of the park", image: { src: img("sun"), alt: "Sunrise over London from Peckham Rye" } },
    { kind: "message", id: "g5", personId: "mei", time: "07:15", text: "Jealous, I was still in bed 😂", reactions: [{ emoji: "😂", count: 4, mine: false }] },
    { kind: "message", id: "g6", personId: "dami", time: "09:02", poll: { question: "Saturday long run, how far?", options: [{ label: "12k, easy", votes: 11 }, { label: "16k, to Tower Bridge and back", votes: 7 }, { label: "Both, split at Southbank", votes: 15 }] } },
    { kind: "message", id: "g7", personId: "hannah", time: "09:20", text: "Both please. Some of us have a toddler at home 🙃" },
    { kind: "message", id: "g8", personId: "dami", time: "09:31", text: "Tuesday's on. Same place, three groups.", runId: "run-tue" },
  ] },
  { key: "tuesday-5k", description: "Tuesday nights at Peckham Rye", unread: 3, leadersOnly: false, items: [
    { kind: "day", label: "Today" },
    { kind: "message", id: "t1", personId: "zain", time: "08:10", text: "Who's bringing the spare head torch?" },
    { kind: "message", id: "t2", personId: "priya", time: "08:22", text: "Me. And the first aid bag.", reactions: [{ emoji: "🙏", count: 5, mine: false }] },
    { kind: "message", id: "t3", personId: "tobi", time: "08:30", text: "Steady group is going the long way round the park, fair warning" },
  ] },
  { key: "long-run", description: "Saturday mornings, all paces", unread: 2, leadersOnly: false, items: [
    { kind: "day", label: "Today" },
    { kind: "message", id: "l1", personId: "kemi", time: "09:40", text: "Coffee after at Rye Lane Coffee. Pro members get the filter on the club." },
    { kind: "message", id: "l2", personId: "jordan", time: "09:52", text: "I'm in for 16k if anyone wants to push it" },
  ] },
  { key: "kit", description: "Drops, sizes and swaps", unread: 0, leadersOnly: false, items: [
    { kind: "day", label: "Monday" },
    { kind: "message", id: "k1", personId: "kemi", time: "12:00", text: "Autumn drop is back in. 140 sold last time, £462 went in the fund." },
    { kind: "message", id: "k2", personId: "mei", time: "12:14", text: "Anyone got a medium to swap for a small?" },
  ] },
  { key: "run-leaders", description: "Run leaders and captains", unread: 0, leadersOnly: true, items: [
    { kind: "day", label: "Today" },
    { kind: "message", id: "r1", personId: "dami", time: "07:50", text: "Can someone cover the fast group Thursday? I'm away." },
    { kind: "message", id: "r2", personId: "zain", time: "07:58", text: "Got it." },
  ] },
];

/** The current week runs Monday 20 to Sunday 26 October; today is Monday 20th. */
const WEEK: Omit<CalendarEvent, "id" | "date">[][] = [
  [{ time: "All week", title: "Southwark v Lambeth", where: "Borough battle starts", scope: "mine", kind: "battle" }, { time: "19:30", title: "Run leaders catch-up", where: "The Gowlett, upstairs", scope: "club" }],
  [{ time: "19:00", title: "Rye Lane 5k", where: "Peckham Rye station", scope: "mine", kind: "going" }],
  [{ time: "18:30", title: "Free strength class", where: "Copeland Park Gym · Locals perk", scope: "club" }, { time: "20:00", title: "Thames night walk", where: "Southbank to Tower Bridge", scope: "london" }],
  [{ time: "18:30", title: "Intervals", where: "Burgess Park lake gate", scope: "club" }, { time: "19:00", title: "Walk group", where: "Peckham Rye Park cafe", scope: "club" }],
  [{ time: "12:00", title: "Black winter jacket drop", where: "In the app", scope: "london" }, { time: "23:59", title: "Your battle with Tobi ends", where: "You lead by 2,140 steps", scope: "mine", kind: "battle" }],
  [{ time: "08:00", title: "Long run, 14k", where: "Peckham Rye to Southbank", scope: "mine", kind: "going" }, { time: "11:00", title: "Burgess Park clean-up", where: "Bring gloves, coffee after", scope: "london" }],
  [{ time: "18:00", title: "Peckham v Brixton ends", where: "Club derby final whistle", scope: "mine", kind: "battle" }, { time: "20:00", title: "London v Manchester reveal", where: "Watch it live in the app", scope: "london", global: true }],
];

export const TODAY = 20;

export function calendarEvents(): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  let n = 0;
  const add = (date: number, e: Omit<CalendarEvent, "id" | "date">) => out.push({ id: `e${++n}`, date, ...e });
  WEEK.forEach((day, i) => day.forEach((e) => add(TODAY + i, e)));
  [7, 14, 28].forEach((d) => add(d, { time: "19:00", title: "Rye Lane 5k", where: "Peckham Rye station", scope: "mine", kind: d < TODAY ? "done" : "going" }));
  [2, 9, 16, 30].forEach((d) => add(d, { time: "18:30", title: "Intervals", where: "Burgess Park lake gate", scope: "club" }));
  [4, 11, 18].forEach((d) => add(d, { time: "08:00", title: "Long run", where: "Peckham Rye, all paces", scope: "club" }));
  add(3, { time: "12:00", title: "Club kit drop", where: "Peckham Pacers autumn tees", scope: "club" });
  add(8, { time: "20:00", title: "Thames night walk", where: "Southbank to Tower Bridge", scope: "london" });
  add(12, { time: "18:00", title: "Season 3 begins", where: "The draw goes live in the app", scope: "london", global: true });
  add(15, { time: "23:59", title: "Your battle with Mei ends", where: "You won by 4,310 steps", scope: "mine", kind: "battle" });
  add(19, { time: "18:00", title: "Peckham v Camberwell ends", where: "Peckham won the derby", scope: "mine", kind: "battle" });
  add(29, { time: "09:00", title: "Winter Night Run sign-ups", where: "3,000 places, Pro gets early access", scope: "london" });
  add(31, { time: "19:00", title: "Halloween night run", where: "Fancy dress, Peckham Rye", scope: "club" });
  const key = (t: string) => (/^\d/.test(t) ? t : "00:00"); // "All week" goes first
  return out.sort((a, b) => a.date - b.date || (key(a.time) < key(b.time) ? -1 : 1));
}

export const NOTIFICATIONS: Notification[] = [
  { id: "n1", icon: "people", personId: "lena", html: "<b>Lena</b> did her first run with the Pacers. Welcome her?", ago: "2m", href: "/feed", unread: true },
  { id: "n2", icon: "trophy", personId: "tobi", html: "<b>Tobi</b> is out right now and closing the gap in your battle", ago: "6m", href: "/feed", unread: true },
  { id: "n3", icon: "chat", personId: "zain", html: "<b>Zain</b> in #tuesday-5k: who's bringing the spare head torch?", ago: "18m", href: "/chat", unread: true },
  { id: "n4", icon: "people", personId: "jordan", html: "<b>3 people</b> asked to join Peckham Pacers", ago: "1h", href: "/hq/members", unread: false },
  { id: "n5", icon: "arrow", html: "Your run put <b>Southwark past Lambeth</b>. 3rd in London.", ago: "3h", href: "/league", unread: false },
  { id: "n6", icon: "spark", html: "<b>Sunday reveal</b>: London v Manchester at 20:00", ago: "1d", href: "/calendar", unread: false },
  { id: "n7", icon: "pound", html: "<b>£120</b> from Peckham Physio landed in the club fund", ago: "2d", href: "/hq/fund", unread: false },
];

export const PLANS: Plan[] = [
  { tier: "free", name: "Free", monthly: 0, yearly: 0, line: "Everything you need to play for your borough.", features: ["Walk and run for your borough", "Join any club, always free", "Club chat, feed and calendar", "Watch everyone's stories", "Battles with friends"] },
  { tier: "pro", name: "Pro", monthly: 5.99, yearly: 59.99, line: "For people who are out most days.", features: ["Post stories from your runs", "Outhere Locals perks at the till", "Early access to club kit drops", "Your full stats and history", "Your name on the Sunday reveal", "£1 a month to your club when you join here"], popular: true },
  { tier: "black", name: "Black", monthly: 17.99, yearly: 179.99, line: "The full thing, and the most for your club.", features: ["Everything in Pro", "Members-only Black drops and events", "First places at big city events", "£3 a month to your club when you join here"] },
];

export const BATTLE_MODES: BattleMode[] = [
  { key: "steps", name: "Most steps", description: "Whoever moves the most by the deadline. Walking counts.", length: "time" },
  { key: "live", name: "Live race", description: "Start at the same moment from anywhere. First to the distance wins.", length: "dist" },
  { key: "blind", name: "Blind time trial", description: "Run your best time. Neither of you sees the other until both are in.", length: "dist" },
  { key: "ghost", name: "Ghost race", description: "Race their best run on your own streets. Their ghost runs beside you.", length: "dist" },
  { key: "last", name: "Last one standing", description: "A daily target that climbs every day. Miss it and you are out.", length: "time" },
  { key: "hold", name: "Hold the route", description: "Run a route fastest to claim it, then keep it until the deadline.", length: "time" },
];

export const CHALLENGES: Challenge[] = [
  { id: "c-jordan", fromId: "jordan", mode: "Ghost race · 10k", line: "Jordan's best is 44:52. Race it on your own streets before Sunday. Loser buys the coffees.", answerIn: "Answer in 21h", accepted: false },
];

export const PICKUPS: Pickup[] = [
  { id: "pk1", hostId: "tobi", type: "run", title: "Easy 5k round Burgess Park", when: "Leaving 18:30", soon: "in 25 min", at: "Burgess Park, the lake café", pace: "6:00 a k, nobody gets dropped", goingIds: ["priya", "lena"], capacity: 8, imIn: false },
  { id: "pk2", type: "race", openRace: true, title: "Open race: first to 3k", when: "Today 19:15", soon: "in 70 min", at: "Peckham Rye, the bandstand", pace: "All paces. Outhere times it, results in the feed.", goingIds: ["zain", "jordan", "mei", "dami", "hannah", "tobi"], capacity: 8, imIn: false },
  { id: "pk3", hostId: "hannah", type: "walk", title: "Lunch walk along the canal", when: "Tomorrow 12:30", at: "Surrey Canal Walk, library end", pace: "Chatty pace, coffee after", goingIds: ["mei"], capacity: 6, imIn: false },
  { id: "pk4", hostId: "zain", type: "run", title: "Hill reps at One Tree Hill", when: "Thursday 07:00", at: "Honor Oak Park gate", pace: "Hard. Bring water.", goingIds: ["dami", "tobi", "priya"], capacity: 10, imIn: false },
  { id: "pk5", hostId: "mei", type: "walk", title: "Sunday coffee walk", when: "Sunday 09:00", at: "Rye Lane Coffee", pace: "Easy, 4k, buggies welcome", goingIds: ["lena", "hannah", "priya", "zain", "dami"], capacity: 20, locals: true, imIn: false },
  { id: "pk6", type: "race", openBattle: true, title: "Most steps today, anyone in Southwark", when: "Ends 23:59", soon: "14 in", at: "Wherever you are in Southwark", pace: "An open battle. Top three get a crown in the feed.", goingIds: ["jordan", "zain", "hannah", "mei"], capacity: 0, imIn: false },
];

export const MEMBERS: Member[] = [
  { personId: "kemi", role: "Captain", pace: "Steady", runsThisMonth: 14, trust: "Established", weekly: [3, 4, 3, 5, 4, 6, 5, 8], daysSinceRun: 1 },
  { personId: "dami", role: "Run leader", pace: "Fast", runsThisMonth: 12, trust: "Established", weekly: [4, 5, 4, 6, 5, 7, 6, 8], daysSinceRun: 1 },
  { personId: "zain", role: "Run leader", pace: "Steady", runsThisMonth: 11, trust: "Established", weekly: [5, 6, 5, 7, 6, 8, 7, 8.5], daysSinceRun: 2 },
  { personId: "tobi", role: "Member", pace: "Fast", runsThisMonth: 10, trust: "Verified", weekly: [3, 4, 3, 5, 4, 6, 5, 6], daysSinceRun: 2 },
  { personId: "hannah", role: "Member", pace: "Easy", runsThisMonth: 9, trust: "Established", weekly: [4, 5, 4, 6, 5, 7, 6, 6.5], daysSinceRun: 3 },
  { personId: "priya", role: "Member", pace: "Easy", runsThisMonth: 6, trust: "Verified", weekly: [5, 6, 5, 7, 6, 8, 7, 6], daysSinceRun: 5 },
];

export const JOIN_REQUESTS: JoinRequest[] = [
  { id: "jr-mei", personId: "mei", runs: 2, pace: "Steady", foundVia: "Found you through the Rye Lane poster" },
  { id: "jr-jordan", personId: "jordan", runs: 2, pace: "Easy", foundVia: "Found you through the Rye Lane poster" },
  { id: "jr-lena", personId: "lena", runs: 2, pace: "Walk", foundVia: "Found you through the Rye Lane poster" },
];

export const OFFERS: LocalOffer[] = [
  { id: "o1", business: "Rye Lane Coffee", kind: "Café · 200m from your start", tier: "Partner · £150 a month", line: "Free filter coffee after Saturday runs. £120 a month to the club.", status: "open" },
  { id: "o2", business: "Khan & Sons Pharmacy", kind: "Pharmacy · Peckham High St", tier: "Supporter · £50 a month", line: "Logo on your page and first aid kits for run leaders. £40 a month to the club.", status: "open" },
  { id: "o3", business: "Pulse Gym Peckham", kind: "Gym · Copeland Park", tier: "Kit sponsor · £400 a month", line: "Their logo on your spring drop, a free strength class every Wednesday. £320 a month to the club.", status: "open" },
];

const autoChecks = (labels: string[]) => labels.map((label, i) => ({ label, auto: i < 3, done: i < 3 }));
const FOUNDING_CHECKS = ["3 meetups within 6 weeks", "6 or more people at each", "10 different verified people", "Public meeting point, no home addresses", "Organiser verified with ID"];
const CLAIM_CHECKS = ["Club exists online for 6+ months", "Organiser named on the club's own site or socials", "Code word posted on the club's Instagram", "Regular runs at a public meeting point", "No other claim for this club"];

export const VERIFICATIONS: VerificationRequest[] = [
  { id: "v1", clubId: "walthamstow-dawn", organiser: "Grace A.", age: "26h", evidence: [img("dawn"), img("walk"), img("lcrew")], claim: false, checks: autoChecks(FOUNDING_CHECKS), verified: false },
  { id: "v2", clubId: "deptford-docks", organiser: "Marcus T.", age: "19h", evidence: [img("roof"), img("crew"), img("event")], claim: false, checks: autoChecks(FOUNDING_CHECKS), verified: false },
  { id: "v3", clubId: "stratford-striders", organiser: "Funmi O.", age: "7h", evidence: [img("event"), img("clubhero2"), img("lcrew")], claim: true, checks: autoChecks(CLAIM_CHECKS), verified: false },
  { id: "v4", clubId: "croydon-hills", organiser: "Rob D.", age: "2h", evidence: [img("hill"), img("heath"), img("sun")], claim: true, checks: autoChecks(CLAIM_CHECKS), verified: false },
];

export const FLAGS: FairPlayFlag[] = [
  { id: "f1", user: "41…a2", severity: "High", reason: "62,000 steps at 2am, no movement on GPS", steps: [9, 10, 11, 9, 12, 10, 11, 9, 10, 62, 58, 10, 11, 9], trust: "New" },
  { id: "f2", user: "7c…19", severity: "High", reason: "Same phone in two squads", steps: [8, 9, 8, 10, 9, 11, 10, 9, 8, 9, 10, 9, 10, 11], trust: "New" },
  { id: "f3", user: "19…f0", severity: "Low", reason: "Cadence of 240 for 3 hours", steps: [12, 13, 11, 14, 12, 30, 31, 12, 13, 14, 12, 13, 15, 14], trust: "Verified" },
  { id: "f4", user: "b2…7e", severity: "Low", reason: "Steps without the phone moving", steps: [7, 8, 9, 7, 8, 9, 18, 19, 8, 7, 9, 8, 7, 8], trust: "Verified" },
];

export const AUDIT: AuditEntry[] = [
  { id: "a1", actor: "Sam R", action: "verified club", target: "Wembley Way Runners", at: "09:12" },
  { id: "a2", actor: "Ade K", action: "held OUT for", target: "user 41…a2", at: "08:47" },
  { id: "a3", actor: "system", action: "ran Friday draw", target: "seed 7f3a…c91e", at: "Fri 18:00" },
  { id: "a4", actor: "Sam R", action: "cleared flag on", target: "user 19…f0", at: "Thu 22:31" },
];

export const CITY_TABLE = [
  { city: "London", image: img("hill"), points: 13, form: "wwdww", eligible: 4012, me: true },
  { city: "Manchester", image: img("manc"), points: 10, form: "wlwwd", eligible: 912 },
  { city: "Bristol", image: img("sun"), points: 9, form: "wwlwl", eligible: 611 },
  { city: "Leeds", image: img("heath"), points: 7, form: "lwwld", eligible: 588 },
  { city: "Glasgow", image: img("roof"), points: 6, form: "dlwlw", eligible: 540 },
  { city: "Liverpool", image: img("streaks"), points: 4, form: "ldlwl", eligible: 528 },
  { city: "Newcastle", image: img("dawn"), points: 3, form: "lldwl", eligible: 507 },
  { city: "Sheffield", image: img("bridge"), points: 1, form: "llldl", eligible: 502 },
];

export const CITY_CHAMPIONSHIP = [
  { city: "Cardiff", image: img("bridge"), points: 12, form: "wwwdl", eligible: 480 },
  { city: "Edinburgh", image: img("heath"), points: 11, form: "wdwww", eligible: 466 },
  { city: "Nottingham", image: img("streaks"), points: 9, form: "lwwwl", eligible: 431 },
  { city: "Brighton", image: img("sun"), points: 7, form: "wlwdl", eligible: 409 },
  { city: "Leicester", image: img("dawn"), points: 6, form: "dlwwl", eligible: 377 },
  { city: "Southampton", image: img("roof"), points: 4, form: "lldww", eligible: 352 },
  { city: "Belfast", image: img("manc"), points: 3, form: "ldlwl", eligible: 330 },
  { city: "Oxford", image: img("hill"), points: 2, form: "lldld", eligible: 301 },
];

export const CITY_LEAGUE_ONE = [
  { city: "Bath", image: img("sun"), points: 13, form: "wwwlw", eligible: 260 },
  { city: "York", image: img("heath"), points: 10, form: "wdwwl", eligible: 244 },
  { city: "Cambridge", image: img("bridge"), points: 9, form: "wwlwl", eligible: 231 },
  { city: "Norwich", image: img("dawn"), points: 7, form: "lwdww", eligible: 214 },
  { city: "Exeter", image: img("roof"), points: 5, form: "dlwlw", eligible: 190 },
  { city: "Reading", image: img("streaks"), points: 4, form: "lwldw", eligible: 176 },
  { city: "Plymouth", image: img("manc"), points: 3, form: "lldwl", eligible: 158 },
  { city: "Derby", image: img("hill"), points: 1, form: "llldl", eligible: 131 },
];

export const SEED = "7f3a…c91e";

/** Badges shown on profiles, newest first. */
export const PROFILE_BADGES: { image: string; label: string }[] = [
  { image: "/_app/img/3d-laurel.jpg", label: "Founding" },
  { image: "/_app/img/3d-flame.jpg", label: "30 day" },
  { image: "/_app/img/3d-badge.jpg", label: "Club run" },
  { image: "/_app/img/3d-podium.jpg", label: "Derby win" },
];
