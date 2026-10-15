/**
 * Links no club can take. Club pages live at weouthere.app/<slug>, next to
 * every page the website and the app serve, so a club name must never match a
 * page that exists or one we may build. The database keeps the same list and
 * refuses a club slug on it; supabase/README.md says how to keep them in step.
 */

/** Paths the member app serves today. A test fails the build if a new one is missing. */
const APP_PATHS = [
  "home", "feed", "battles", "pickups", "chat", "calendar", "league", "clubs", "me", "locals",
  "membership", "hq", "join", "signin", "signout", "auth", "act", "webhooks",
];

/** Paths the website (apps/web) serves on weouthere.app before passing the rest to the app. */
const WEBSITE_PATHS = [
  "crews", "black", "boroughs", "i", "404", "sitemap.xml", "robots.txt", "og.jpg", "favicon.svg", "site.webmanifest",
  "apple-touch-icon.png", "icon-192.png", "icon-512.png", "_app",
];

/** Words for pages we may add later, held back now so no club gets there first. */
const FUTURE_PAGES = [
  "about", "account", "admin", "android", "api", "app", "apps", "area", "areas", "assets", "battle", "billing", "blog",
  "brand", "brands", "business", "careers", "cdn", "challenge", "challenges", "checkout", "cities", "city", "claim",
  "club", "community", "contact", "cookies", "cup", "dashboard", "data", "dev", "developers", "dm", "dms", "docs",
  "download", "draw", "drop", "drops", "edit", "email", "event", "events", "explore", "faq", "find", "fixtures",
  "founders", "founding", "get", "gift", "gifts", "guide", "guides", "health", "help", "img", "inbox", "invite",
  "invites", "ios", "jobs", "kit", "leaderboard", "leagues", "legal", "live", "login", "logout", "mail", "map",
  "maps", "media", "members", "messages", "national", "new", "news", "notifications", "null", "official", "offers",
  "out", "outhere", "partner", "partners", "pay", "people", "pickup", "plans", "press", "pricing", "privacy", "pro",
  "profile", "profiles", "race", "races", "region", "regions", "results", "reveal", "route", "routes", "rules",
  "run", "runs", "safety", "search", "season", "seasons", "security", "settings", "share", "shop", "signup",
  "sponsor", "sponsors", "squad", "squads", "staff", "static", "stats", "status", "store", "stories", "story",
  "subscribe", "support", "table", "tables", "team", "terms", "town", "towns", "undefined", "unsubscribe", "user",
  "users", "verify", "walk", "walks", "wallet", "weouthere", "www",
];

/** The UK, its nations and regions, so each can have its own page. */
const PLACES_WIDE = [
  "uk", "gb", "britain", "greatbritain", "unitedkingdom", "england", "scotland", "wales", "northernireland",
  "northeast", "northwest", "yorkshire", "eastmidlands", "westmidlands", "east", "eastofengland", "southeast",
  "southwest", "highlands", "midlands",
];

/** Every UK city, so weouthere.app/<city> stays free for that city's page. */
const CITIES = [
  "aberdeen", "armagh", "bangor", "bath", "belfast", "birmingham", "bradford", "brighton", "brightonandhove",
  "bristol", "cambridge", "canterbury", "cardiff", "carlisle", "chelmsford", "chester", "chichester", "colchester",
  "coventry", "derby", "doncaster", "dundee", "dunfermline", "durham", "edinburgh", "ely", "exeter", "glasgow",
  "gloucester", "hereford", "inverness", "hull", "lancaster", "leeds", "leicester", "lichfield", "lincoln",
  "lisburn", "liverpool", "london", "londonderry", "derry", "manchester", "miltonkeynes", "newcastle", "newport",
  "newry", "norwich", "nottingham", "oxford", "perth", "peterborough", "plymouth", "portsmouth", "preston",
  "ripon", "salford", "salisbury", "sheffield", "southampton", "southend", "stalbans", "stasaph", "stdavids",
  "stirling", "stoke", "sunderland", "swansea", "truro", "wakefield", "wells", "westminster", "winchester",
  "wolverhampton", "worcester", "wrexham", "york",
  // Big towns people will expect a page for too.
  "bournemouth", "luton", "middlesbrough", "milton", "northampton", "reading", "slough", "swindon", "warrington",
  "huddersfield", "blackpool", "bolton", "stockport", "oldham", "watford", "ipswich", "crawley",
];

export const RESERVED_SLUGS: ReadonlySet<string> = new Set([...APP_PATHS, ...WEBSITE_PATHS, ...FUTURE_PAGES, ...PLACES_WIDE, ...CITIES]);
