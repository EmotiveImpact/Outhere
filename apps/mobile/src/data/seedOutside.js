// Seed data for the Outside area on the local engine: how many people are
// active in each place, the drop shop (priced in OUT), arena seasons, the
// neighbourhoods seeded players live in, and the emotes a battle can send.
// The database holds the same things in supabase/migrations/20261015101720_outside.sql.

import { PHOTOS } from "@/constants/photos";
import { OUTSIDE_PHOTOS } from "@/constants/outsidePhotos";

// Active walkers (3,000+ steps on three of the last seven days) in each
// launch city. Every other place gets a small number from stable noise.
export const SIM_ACTIVE = {
  london: 4012,
  manchester: 912,
  glasgow: 301,
  leeds: 188,
  bristol: 142,
  liverpool: 84,
  edinburgh: 71,
  sheffield: 63,
  newcastle: 58,
  birmingham: 46,
};

// Where the seeded players' neighbourhoods sit: a London borough, or an
// area of another launch city.
export const NEIGHBOURHOODS = {
  peckham: "southwark",
  bermondsey: "southwark",
  brixton: "lambeth",
  clapham: "lambeth",
  hackney: "hackney",
  shoreditch: "hackney",
  tottenham: "haringey",
  camden: "camden",
  woolwich: "greenwich",
  croydon: "croydon",
  wembley: "brent",
  lewisham: "lewisham",
  stratford: "newham",
  "moss-side": "manchester-moss-side",
  ancoats: "manchester-ancoats",
  digbeth: "birmingham-digbeth",
  handsworth: "birmingham-handsworth",
  headingley: "leeds-headingley",
  "st-pauls": "bristol-st-pauls",
  toxteth: "liverpool-toxteth",
};

// The Arena runs in six week seasons.
export const ARENA_SEASONS = [
  { number: 1, name: "Season 1", startsOn: "2026-08-17", endsOn: "2026-09-27", headline: "The first Arena season" },
  { number: 2, name: "Season 2", startsOn: "2026-09-28", endsOn: "2026-11-08", headline: "Bigger pots, a Borough Cup and a Black-only bracket" },
  { number: 3, name: "Season 3", startsOn: "2026-11-09", endsOn: "2026-12-20", headline: "A new Borough Cup and a Black-only bracket" },
];

// The drop shop. Prices are in OUT. Times are hours from when this phone's
// world was made; stock is what's left at that moment.
export const DROP_SHOP = [
  {
    id: "d_nightrunner",
    title: "Night Runner 01",
    subtitle: "Reflective trainer, first run",
    description: "Our first trainer. A soft, springy midsole and a reflective heel tab that lights up under street lights.",
    image: PHOTOS.shoe,
    gallery: [OUTSIDE_PHOTOS.shoebox],
    priceOut: 1800,
    sizes: ["7", "8", "9", "10", "11"],
    soldOutSizes: ["11"],
    sizeNote: "UK sizes · runs true",
    total: 120,
    stock: 37,
    tierRequired: "free",
    opensInHours: 2.236,
    earlyAccessHours: 1,
    tag: "NEXT",
  },
  {
    id: "d_tee",
    title: "Performance Tee",
    subtitle: "Quick dry, reflective print",
    description: "Light, quick drying and cut for running. The chest print catches headlights after dark.",
    image: PHOTOS.tee,
    priceOut: 1200,
    sizes: ["XS", "S", "M", "L", "XL"],
    soldOutSizes: ["XL"],
    sizeNote: "Regular fit",
    total: 200,
    stock: 63,
    tierRequired: "free",
    opensInHours: -20,
    earlyAccessHours: 1,
    tag: "NEW",
  },
  {
    id: "d_recovery",
    title: "Sponsor Recovery Kit",
    subtitle: "Roller, band and a sports massage",
    description: "A foam roller, a resistance band and a 30 minute sports massage at a partner clinic. For Black members.",
    image: PHOTOS.kit,
    priceOut: 2400,
    sizes: [],
    sizeNote: "",
    total: 60,
    stock: 18,
    tierRequired: "black",
    opensInHours: -6,
    earlyAccessHours: 0,
    tag: "BLACK",
  },
  {
    id: "d_cap",
    title: "Outhere Snapback Cap",
    subtitle: "Flat peak, embroidered O",
    description: "Six panel snapback with the O on the front. One size.",
    image: PHOTOS.cap,
    priceOut: 900,
    sizes: [],
    sizeNote: "",
    total: 300,
    stock: 141,
    tierRequired: "free",
    opensInHours: -50,
    earlyAccessHours: 1,
    tag: null,
  },
  {
    id: "d_shell",
    title: "Thames Shell Jacket",
    subtitle: "Packable, water resistant",
    description: "Packs into its own pocket and keeps the drizzle out. Reflective zip pulls.",
    image: OUTSIDE_PHOTOS.tealjacket,
    priceOut: 2200,
    sizes: ["S", "M", "L", "XL"],
    soldOutSizes: [],
    sizeNote: "Roomy fit, size down for snug",
    total: 150,
    stock: 150,
    tierRequired: "free",
    opensInHours: 74,
    earlyAccessHours: 1,
    tag: "SOON",
  },
  {
    id: "d_stickers",
    title: "Crew Logo Sticker Pack",
    subtitle: "Six stickers",
    description: "Six weatherproof stickers for bottles, laptops and lamp posts you own.",
    image: PHOTOS.stickers,
    priceOut: 150,
    sizes: [],
    sizeNote: "",
    total: 400,
    stock: 0,
    tierRequired: "free",
    opensInHours: -300,
    closesInHours: -100,
    earlyAccessHours: 0,
    tag: "ENDED",
  },
];

export const DELIVERY_OUT = 150;

// Orders move along on their own here; in the database staff move them.
export const ORDER_STEPS = [
  { status: "claimed", label: "Claimed", afterHours: 0 },
  { status: "packed", label: "Packed", afterHours: 7 },
  { status: "shipped", label: "Shipped", afterHours: 22 },
  { status: "out_for_delivery", label: "Out for delivery", afterHours: 70 },
  { status: "delivered", label: "Delivered", afterHours: 76 },
];

// Call-up weekend invite codes seeded players hand out.
export const CITY_INVITE_CODES = { KEMI2026: "p_kemi", ZARA0046: "p_zara", FEMIBRUM: "p_femi" };

// No chat in a battle: five emotes and five set lines.
export const BATTLE_EMOTES = [
  { code: "fire", label: "Fire", image: PHOTOS.emoteFlame },
  { code: "respect", label: "Respect", image: PHOTOS.emoteFist },
  { code: "too_slow", label: "Too slow", image: PHOTOS.emoteSnail },
  { code: "speed", label: "Speed", image: PHOTOS.emoteBolt },
  { code: "champion", label: "Champion", image: PHOTOS.emoteCrown },
];
export const BATTLE_LINES = [
  { code: "line_rematch", label: "Rematch?" },
  { code: "line_respect", label: "Respect" },
  { code: "line_too_slow", label: "Too slow" },
  { code: "line_catch_me", label: "Catch me if you can" },
  { code: "line_gg", label: "Good battle" },
];
export const EMOTE_CODES = [...BATTLE_EMOTES, ...BATTLE_LINES].map((e) => e.code);
export const emoteLabel = (code) => [...BATTLE_EMOTES, ...BATTLE_LINES].find((e) => e.code === code)?.label || code;
