// The profile area on the local engine: membership checkout and the member
// OUT bonus, streak freezes, badges, emotes and the tray, someone else's
// profile, search, invites and the OUT history.

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

const engine = require("../engine");
const { dayKey, addDays } = require("../time");

// Thursday 15 October 2026, 18:45 local.
const NOW = new Date(2026, 9, 15, 18, 45).getTime();
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: ["nextTick", "setImmediate"] });
  engine.__resetForTests();
});
afterEach(() => jest.useRealTimers());

const setUp = () => engine.createProfile({ username: "alex.out", city: "London" });

// Three active days up to yesterday, nothing yet today.
const streakOfThree = async () => {
  for (let i = 3; i >= 1; i -= 1) await engine.recordSteps({ date: dayKey(addDays(new Date(), -i)), steps: 5000 });
};

test("checkout starts a free week on the plan and Black doubles OUT for moving", async () => {
  await setUp();
  const before = await engine.getMembershipDetails();
  expect(before.tier).toBe("free");
  const r = await engine.purchaseMembership({ plan: "black", billing: "yearly" });
  expect(r.done).toBe(true);
  expect(r.checkoutUrl).toBeNull();
  const m = await engine.getMembershipDetails();
  expect(m.tier).toBe("black");
  expect(m.status).toBe("trialing");
  expect(m.price).toBe("£129.99 a year");
  expect(m.trialEndsAt - Date.now()).toBe(7 * DAY);

  await engine.recordSteps({ steps: 12000 });
  const after = await engine.getMembershipDetails();
  expect(after.earned.base).toBe(9);
  expect(after.earned.bonus).toBe(9);
  const history = await engine.getOutHistory();
  expect(history.items.some((t) => t.reason === "member_bonus" && t.label === "Black bonus")).toBe(true);

  const emotes = await engine.listEmotes();
  expect(emotes.items.find((e) => e.id === "crown").owned).toBe(true);
});

test("cancelling keeps the plan to the end of the paid time, then drops to Free", async () => {
  await setUp();
  await engine.purchaseMembership({ plan: "pro", billing: "monthly" });
  const c = await engine.cancelMembership();
  expect(c.membership.endsAt).toBeTruthy();
  expect((await engine.getProfile()).tier).toBe("pro");
  jest.setSystemTime(Date.now() + 8 * DAY);
  const m = await engine.getMembershipDetails();
  expect(m.tier).toBe("free");
  expect((await engine.getProfile()).tier).toBe("free");
});

test("a streak freeze keeps today safe, once a month on Pro", async () => {
  await setUp();
  await streakOfThree();
  await expect(engine.spendStreakFreeze()).rejects.toMatchObject({ code: "TIER_REQUIRED" });
  await engine.purchaseMembership({ plan: "pro" });
  const s = await engine.getStreakStatus();
  expect(s.atRisk).toBe(true);
  expect(s.freezes).toEqual({ allowance: 1, used: 0, left: 1 });
  const after = await engine.spendStreakFreeze();
  expect(after.safe).toBe(true);
  expect(after.freezes.left).toBe(0);
  await expect(engine.spendStreakFreeze()).rejects.toMatchObject({ code: "ALREADY_FROZEN" });

  // Tomorrow the frozen day carries the streak on.
  jest.setSystemTime(Date.now() + DAY);
  expect((await engine.getStreakStatus()).streak).toBe(3);
  await expect(engine.spendStreakFreeze()).rejects.toMatchObject({ code: "NO_FREEZES_LEFT" });
  await engine.recordSteps({ steps: 3500 });
  expect((await engine.getStreakStatus()).streak).toBe(4);
});

test("badges are counted from what you've done, with progress for the rest", async () => {
  await setUp();
  await engine.recordSteps({ steps: 10400 });
  const b = await engine.listBadges();
  expect(b.total).toBe(24);
  const tenK = b.items.find((x) => x.id === "ten_k_club");
  expect(tenK.earned).toBe(true);
  const marathon = b.items.find((x) => x.id === "marathon_month");
  expect(marathon.earned).toBe(false);
  await engine.saveRun({ distanceKm: 10.2, durationSec: 3300, startedAt: Date.now() - 3600 * 1000 });
  const after = await engine.listBadges();
  expect(after.items.find((x) => x.id === "ten_k_run").earned).toBe(true);
  expect(after.items.find((x) => x.id === "marathon_month").toGo).toBe("32 km to go");
  const notes = await engine.listNotifications();
  expect(notes.some((n) => n.title === "New badge: 10K run")).toBe(true);
});

test("emotes: two starters in the tray, a streak earns On fire, the tray takes only owned emotes", async () => {
  await setUp();
  let e = await engine.listEmotes();
  expect(e.ownedCount).toBe(2);
  expect(e.tray).toEqual(["fist", "snail"]);
  await streakOfThree();
  e = await engine.listEmotes();
  expect(e.items.find((x) => x.id === "flame").owned).toBe(true);
  expect(e.unseen).toEqual(["flame"]);
  await expect(engine.setEmoteTray(["wings"])).rejects.toMatchObject({ code: "NOT_OWNED" });
  e = await engine.setEmoteTray(["flame", "fist"]);
  expect(e.tray).toEqual(["flame", "fist"]);
  expect(e.unseen).toEqual([]);
  expect(e.next.id).toBeTruthy();
});

test("someone else's profile shows the week head to head and their numbers", async () => {
  await setUp();
  const card = await engine.getPlayerCard("p_kemi");
  expect(card.name).toBe("Kemi");
  expect(card.week.theirs).toBeGreaterThan(0);
  expect(card.totals.steps).toBeGreaterThan(100000);
  expect(card.totals.badges).toBeGreaterThan(0);
  expect(card.club?.name).toBeTruthy();
});

test("one search finds people, clubs and events", async () => {
  await setUp();
  const r = await engine.searchAll("south");
  expect(r.crews.some((c) => c.name === "Southbank Runners")).toBe(true);
  expect(Array.isArray(r.people)).toBe(true);
  expect(Array.isArray(r.events)).toBe(true);
  expect((await engine.searchAll("  ")).people).toEqual([]);
});

test("give 500 get 500: a shared link brings a friend, who pays out when they walk 10k", async () => {
  await setUp();
  const r0 = await engine.getReferrals();
  expect(r0.link).toBe("weouthere.app/alex.out");
  expect(r0.next).toMatchObject({ friends: 1, left: 1 });
  await engine.recordInviteShare();
  jest.setSystemTime(Date.now() + 3 * MIN);
  const r1 = await engine.getReferrals();
  expect(r1.joinedCount).toBe(1);
  expect(r1.pending).toHaveLength(1);
  const before = (await engine.getWallet()).out;
  // A day and a half later they've walked well past 10k.
  jest.setSystemTime(Date.now() + 1.5 * DAY);
  const r2 = await engine.getReferrals();
  expect(r2.qualifiedCount).toBe(1);
  expect(r2.milestones[0].reached).toBe(true);
  expect((await engine.getWallet()).out).toBe(before + 500);
});

test("joined from a friend's link: name them in your first week for 500 OUT", async () => {
  await setUp();
  await expect(engine.claimReferral("nobody.here")).rejects.toMatchObject({ code: "NOT_FOUND" });
  const before = (await engine.getWallet()).out;
  const r = await engine.claimReferral("@kemi.moves");
  expect(r.referredBy.name).toBe("Kemi");
  expect(r.canClaim).toBe(false);
  expect((await engine.getWallet()).out).toBe(before + 500);
  await expect(engine.claimReferral("dre_outside")).rejects.toMatchObject({ code: "ALREADY_REFERRED" });
});

test("OUT history has every OUT line, newest first, with this week's totals", async () => {
  await setUp();
  await engine.recordSteps({ steps: 12000 });
  const h = await engine.getOutHistory();
  expect(h.items[0].at).toBeGreaterThanOrEqual(h.items[h.items.length - 1].at);
  expect(h.weekEarned).toBe(h.balance);
  expect(h.items.every((t) => typeof t.amount === "number")).toBe(true);
});
