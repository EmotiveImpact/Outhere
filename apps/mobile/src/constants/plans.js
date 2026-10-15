// The three Outhere plans in one place: names, prices, perks and the compare
// table. Every membership screen, the wallet and the engines read from here.
//
// Prices (Edem, latest): Pro £5.99 a month or £59.99 a year; Black £12.99 a
// month or £129.99 a year (the yearly Black price is not confirmed yet).
//
// In-app purchases aren't set up. On the local engine checkout simulates the
// purchase; on Supabase "Go Pro" and "Go Black" open the web checkout, whose
// Stripe webhook writes public.subscriptions and so the ring.

export const TRIAL_DAYS = 7;
export const CHECKOUT_URL = "https://weouthere.app/membership";
export const MANAGE_URL = "https://weouthere.app/membership/manage";
export const INVITE_HOST = "weouthere.app";

export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    monthly: 0,
    yearly: 0,
    outMultiplier: 1,
    freezesPerMonth: 0,
    tagline: "Steps, streaks and your city.",
    perks: ["Step tracking and streaks", "City and club rankings", "1 battle at once", "Public drops and events"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    monthly: 5.99,
    yearly: 59.99,
    outMultiplier: 1.5,
    freezesPerMonth: 1,
    tagline: "More OUT, more battles, drops an hour early.",
    perks: ["1.5x OUT on every km", "Unlimited battles", "Drops 1 hour early", "Members events", "Ghost runs", "1 streak freeze a month"],
  },
  black: {
    id: "black",
    name: "Black",
    monthly: 12.99,
    yearly: 129.99,
    yearlyConfirmed: false,
    outMultiplier: 2,
    freezesPerMonth: 3,
    tagline: "Double OUT on every km, first pick of drops and private events.",
    perks: ["2x OUT on every km", "First pick of every drop", "Private Black events", "Ghost runs", "3 streak freezes a month", "The metal card"],
  },
};

export const PLAN_ORDER = ["free", "pro", "black"];
export const planOf = (tier) => PLANS[tier] || PLANS.free;

// What the plan picker's three "unlock" tiles say, and which plans turn them on.
export const UNLOCKS = [
  { key: "out", title: "Up to 2x OUT", sub: "on every km", art: "bolt", on: ["pro", "black"] },
  { key: "events", title: "Black events", sub: "private nights out", art: "ticket", on: ["black"] },
  { key: "drops", title: "First pick", sub: "of every drop", art: "shoe", on: ["pro", "black"] },
];

// The compare table. A cell is false (no), true (yes), a string, or a bar
// { label, value } for multipliers.
export const COMPARE = [
  { key: "out", icon: "zap", label: "OUT per km", cells: { free: { label: "1x", value: 0.5 }, pro: { label: "1.5x", value: 0.75 }, black: { label: "2x", value: 1 } } },
  { key: "battles", icon: "swords", label: "Battles at once", cells: { free: "1", pro: "Unlimited", black: "Unlimited" } },
  { key: "drops", icon: "shopping-bag", label: "Drops", cells: { free: "Public", pro: "1 hr early", black: "First pick" } },
  { key: "events", icon: "calendar", label: "Events", cells: { free: "Public", pro: "Members", black: "Private" } },
  { key: "ghost", icon: "ghost", label: "Ghost runs", cells: { free: false, pro: true, black: true } },
  { key: "freezes", icon: "flame", label: "Streak freezes", cells: { free: false, pro: "1 a month", black: "3 a month" } },
  { key: "card", icon: "layers", label: "Metal card", cells: { free: false, pro: false, black: true } },
];

export const money = (n) => (n === 0 ? "£0" : `£${n.toFixed(2)}`);

export const priceFor = (tier, billing = "monthly") => {
  const p = planOf(tier);
  return billing === "yearly" ? p.yearly : p.monthly;
};

// '£5.99 a month', '£129.99 a year', '£0'
export const priceLabel = (tier, billing = "monthly") => {
  const n = priceFor(tier, billing);
  if (!n) return "£0";
  return `${money(n)} ${billing === "yearly" ? "a year" : "a month"}`;
};

// Paying yearly against twelve months, rounded: 17% on both plans.
export const yearlySaving = (tier = "pro") => {
  const p = planOf(tier);
  if (!p.monthly) return 0;
  return Math.round((1 - p.yearly / (p.monthly * 12)) * 100);
};

export const checkoutUrl = (tier, billing = "monthly") => `${CHECKOUT_URL}?plan=${tier}&billing=${billing}`;
export const inviteLink = (username) => `${INVITE_HOST}/${username || ""}`;

export const freezesFor = (tier) => planOf(tier).freezesPerMonth;
export const outMultiplier = (tier) => planOf(tier).outMultiplier;

// OUT earned by moving gets the plan's multiplier, paid as a separate
// 'member_bonus' line so the wallet can show what a plan earned you. The
// database applies the same rule in a trigger on the ledger.
export const BONUS_REASONS = ["run", "active_day", "goal", "steps"];
export const memberBonus = (tier, out, reason) => {
  if (!(out > 0) || !BONUS_REASONS.includes(reason)) return 0;
  return Math.round(out * (outMultiplier(tier) - 1));
};

// Invite friends: they get 500 OUT to start, you get 500 when they walk 10k.
export const REFERRAL = {
  out: 500,
  stepsToQualify: 10000,
  milestones: [
    { friends: 1, reward: "500 OUT" },
    { friends: 3, reward: "1,500 OUT" },
    { friends: 5, reward: "Pro month", tier: "pro" },
    { friends: 10, reward: "Black month", tier: "black" },
  ],
};
