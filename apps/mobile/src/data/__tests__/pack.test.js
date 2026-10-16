// The Fighter Pack on the local engine: credits by membership, the 18+ rule,
// consent and the scan, making the pictures, re-rolls, pose picks, refunds,
// the runner choice and fighter pictures on player views.

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

const engine = require("../engine");
const { PACK_STEP_MS, REROLL_MS } = require("../pack");
const { PACK_SAMPLES } = require("@/constants/photos");

// Thursday 15 October 2026, 18:45 local.
const NOW = new Date(2026, 9, 15, 18, 45).getTime();
const MIN = 60 * 1000;

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: ["nextTick", "setImmediate"] });
  engine.__resetForTests();
});
afterEach(() => jest.useRealTimers());

const later = (ms) => jest.setSystemTime(Date.now() + ms);

const setUp = async ({ tier = "pro", birthDate = "1995-04-02" } = {}) => {
  await engine.createProfile({ username: "alex.out", city: "London" });
  if (birthDate) await engine.setBirthDate(birthDate);
  if (tier === "black") await engine.devFillHistory(14);
  if (tier !== "free") await engine.setTier(tier);
};

const scan = async () => {
  const keys = [];
  for (const angle of ["straight", "left", "right"]) keys.push((await engine.uploadScanShot({ angle, uri: `file:///scan/${angle}.jpg` })).key);
  return engine.verifyScan({ keys });
};

const ready = async () => {
  await engine.recordPackConsent();
  await scan();
  return engine.startPack();
};

const finish = async (count) => {
  later(PACK_STEP_MS * (count + 1));
  return engine.getPackState();
};

test("Free is locked; Pro joins with 12 credits, Black with 20 more up to the cap", async () => {
  await setUp({ tier: "free" });
  const free = await engine.getPackCredits();
  expect(free).toMatchObject({ tier: "free", locked: true, balance: 0, monthly: 0, cap: 0, nextGrantAt: null, packCost: 8, rerollCost: 1 });
  await engine.devFillHistory(14);
  await engine.setTier("pro");
  const pro = await engine.getPackCredits();
  expect(pro).toMatchObject({ tier: "pro", locked: false, balance: 12, monthly: 4, cap: 12 });
  expect(pro.nextGrantAt).toBe(new Date(2026, 10, 1).getTime());
  await engine.setTier("black");
  expect((await engine.getPackCredits()).balance).toBe(30);
  // Going back to Pro and up again doesn't grant twice.
  await engine.setTier("pro");
  await engine.setTier("black");
  expect((await engine.getPackCredits()).balance).toBe(30);
});

test("the monthly top-up lands on the 1st and stops at the cap", async () => {
  await setUp({ tier: "pro" });
  await ready();
  await finish(8);
  expect((await engine.getPackCredits()).balance).toBe(4);
  jest.setSystemTime(new Date(2026, 10, 1, 9).getTime());
  expect((await engine.getPackCredits()).balance).toBe(8);
  // Two months later: two more top-ups, capped at 12.
  jest.setSystemTime(new Date(2027, 0, 2, 9).getTime());
  expect((await engine.getPackCredits()).balance).toBe(12);
});

test("Black tops up by 12 a month to 30", async () => {
  await setUp({ tier: "black" });
  expect((await engine.getPackCredits()).balance).toBe(20);
  jest.setSystemTime(new Date(2026, 10, 1, 9).getTime());
  expect((await engine.getPackCredits()).balance).toBe(30);
});

test("a pack is for 18 and over, with a date of birth on file", async () => {
  await setUp({ tier: "pro", birthDate: null });
  await expect(engine.recordPackConsent()).rejects.toMatchObject({ code: "AGE_REQUIRED" });
  await engine.setBirthDate("2011-01-01");
  await expect(engine.recordPackConsent()).rejects.toMatchObject({ code: "UNDER_18" });
  await expect(engine.startPack()).rejects.toMatchObject({ code: "UNDER_18" });
});

test("starting needs Pro or Black, consent and a passed scan", async () => {
  await setUp({ tier: "free" });
  await expect(engine.startPack()).rejects.toMatchObject({ code: "TIER_REQUIRED", requiredTier: "pro" });
  await engine.setTier("pro");
  await expect(engine.startPack()).rejects.toMatchObject({ code: "CONSENT_REQUIRED" });
  await expect(engine.uploadScanShot({ angle: "straight", uri: "file:///a.jpg" })).rejects.toMatchObject({ code: "CONSENT_REQUIRED" });
  const consent = await engine.recordPackConsent();
  expect(consent.consentedAt).toBe(NOW);
  await expect(engine.startPack()).rejects.toMatchObject({ code: "SCAN_REQUIRED" });
});

test("the scan needs all three angles, taken within ten minutes", async () => {
  await setUp();
  await engine.recordPackConsent();
  const a = await engine.uploadScanShot({ angle: "straight", uri: "file:///a.jpg" });
  expect(a.key).toMatch(/^selfies\/me\/.+\/straight\.jpg$/);
  const b = await engine.uploadScanShot({ angle: "left", uri: "file:///b.jpg" });
  await expect(engine.verifyScan({ keys: [a.key, b.key] })).rejects.toMatchObject({ code: "SCAN_FAILED" });
  const c = await engine.uploadScanShot({ angle: "right", uri: "file:///c.jpg" });
  later(11 * MIN);
  await expect(engine.verifyScan({ keys: [a.key, b.key, c.key] })).rejects.toMatchObject({ code: "SCAN_FAILED" });
  const r = await scan();
  expect(r).toEqual({ verified: true, verifiedAt: Date.now() });
  expect((await engine.getPackState()).verifiedAt).toBe(Date.now());
});

test("a Pro pack spends 8 credits and its eight pictures land one by one", async () => {
  await setUp();
  const started = await ready();
  expect(started.status).toBe("making");
  expect(started.images).toHaveLength(8);
  expect(started.images.every((i) => i.status === "pending" && i.url === null)).toBe(true);
  expect((await engine.getPackCredits()).balance).toBe(4);
  expect((await engine.getProfile()).fighter).toBeNull();

  later(PACK_STEP_MS * 3 + 10);
  const part = await engine.getPackState();
  expect(part.status).toBe("making");
  expect(part.images.filter((i) => i.status === "ready")).toHaveLength(3);

  const done = await finish(8);
  expect(done.status).toBe("ready");
  expect(done.images.every((i) => i.status === "ready")).toBe(true);
  expect(Object.keys(done.fighter).sort()).toEqual(["background", "profile", "respect", "sprint", "swipe", "vs", "vsMirror", "win"]);
  expect(done.fighter.win).toBe(PACK_SAMPLES.win);
  expect(done.images.find((i) => i.slot === "vs")).toMatchObject({ set: "race", pose: "sprint" });

  // A second pack needs 8 again; 4 left isn't enough.
  await expect(engine.startPack()).rejects.toMatchObject({ code: "NOT_ENOUGH_CREDITS" });
});

test("a Black pack also makes the Black pictures and every pose for 8 credits", async () => {
  await setUp({ tier: "black" });
  const started = await ready();
  expect(started.images).toHaveLength(8 + 2 + 9);
  expect((await engine.getPackCredits()).balance).toBe(12);
  const done = await finish(19);
  expect(done.status).toBe("ready");
  expect(done.fighter.blackEdition).toBeTruthy();
  expect(done.fighter.clubKit).toBeTruthy();
});

test("making twice at once is refused", async () => {
  await setUp({ tier: "black" });
  await ready();
  await expect(engine.startPack()).rejects.toMatchObject({ code: "ALREADY_MAKING" });
});

test("a re-roll costs a credit and keeps the old picture until the new one lands", async () => {
  await setUp();
  await ready();
  await finish(8);
  const r = await engine.rerollPackSlot("vs");
  expect(r.images.find((i) => i.slot === "vs").status).toBe("pending");
  expect(r.fighter.vs).toBeTruthy();
  expect((await engine.getPackCredits()).balance).toBe(3);
  await expect(engine.rerollPackSlot("vs")).rejects.toMatchObject({ code: "ALREADY_MAKING" });
  await expect(engine.rerollPackSlot("nope")).rejects.toMatchObject({ code: "BAD_SLOT" });
  await expect(engine.rerollPackSlot("race-hoodUp")).rejects.toMatchObject({ code: "NOT_FOUND" });
  later(REROLL_MS + 10);
  expect((await engine.getPackState()).images.find((i) => i.slot === "vs").status).toBe("ready");
});

test("re-rolls stop when the credits run out", async () => {
  await setUp();
  await ready();
  await finish(8);
  for (const slot of ["vs", "win", "respect", "profile"]) await engine.rerollPackSlot(slot);
  await expect(engine.rerollPackSlot("swipe")).rejects.toMatchObject({ code: "NOT_ENOUGH_CREDITS" });
});

test("failed pictures are refunded; a failed re-roll keeps the old picture", async () => {
  await setUp();
  await engine.devFailPackPictures(2);
  await ready();
  const done = await finish(8);
  expect(done.status).toBe("ready");
  expect(done.images.filter((i) => i.status === "failed")).toHaveLength(2);
  expect((await engine.getPackCredits()).balance).toBe(6);

  // Re-rolling a failed picture makes it.
  const failed = done.images.find((i) => i.status === "failed");
  await engine.rerollPackSlot(failed.slot);
  later(REROLL_MS + 10);
  expect((await engine.getPackState()).images.find((i) => i.slot === failed.slot).status).toBe("ready");
  expect((await engine.getPackCredits()).balance).toBe(5);

  await engine.devFailPackPictures(1);
  await engine.rerollPackSlot("win");
  later(REROLL_MS + 10);
  const after = await engine.getPackState();
  expect(after.images.find((i) => i.slot === "win")).toMatchObject({ status: "ready", url: PACK_SAMPLES.win });
  expect((await engine.getPackCredits()).balance).toBe(5);
});

test("a pack where every picture fails is failed and fully refunded", async () => {
  await setUp();
  await engine.devFailPackPictures(8);
  await ready();
  const done = await finish(8);
  expect(done.status).toBe("failed");
  expect(done.fighter).toBeNull();
  expect((await engine.getPackCredits()).balance).toBe(12);
});

test("Pro picks only the first pose; anything else asks for Black", async () => {
  await setUp();
  await ready();
  await finish(8);
  const ok = await engine.setPackPose({ set: "win", pose: "fistUp" });
  expect(ok.picks).toEqual({ race: "sprint", win: "fistUp", respect: "nod" });
  await expect(engine.setPackPose({ set: "win", pose: "roar" })).rejects.toMatchObject({ code: "TIER_REQUIRED", requiredTier: "black" });
  await expect(engine.setPackPose({ set: "win", pose: "moonwalk" })).rejects.toMatchObject({ code: "BAD_POSE" });
});

test("Black picks any pose and the fighter uses it for vs, win and respect", async () => {
  await setUp({ tier: "black" });
  await ready();
  await finish(19);
  const r = await engine.setPackPose({ set: "respect", pose: "slowClap" });
  expect(r.picks.respect).toBe("slowClap");
  expect(r.fighter.respect).toBe(PACK_SAMPLES.respectClap);
  // Dropping to Pro falls back to the first pose without losing the pick.
  await engine.setTier("pro");
  const p = await engine.getPackState();
  expect(p.picks.respect).toBe("slowClap");
  expect(p.fighter.respect).toBe(PACK_SAMPLES.respect);
});

test("a Black member with a pack made on Pro gets a missing pose made for free", async () => {
  await setUp();
  await ready();
  await finish(8);
  await engine.devFillHistory(14);
  await engine.setTier("black");
  const before = (await engine.getPackCredits()).balance;
  const r = await engine.setPackPose({ set: "race", pose: "hoodUp" });
  expect(r.images.find((i) => i.pose === "hoodUp").status).toBe("pending");
  expect(r.fighter.vs).toBe(PACK_SAMPLES.stride);
  later(REROLL_MS + 10);
  const after = await engine.getPackState();
  expect(after.fighter.vs).toBe(PACK_SAMPLES.rooftop);
  expect((await engine.getPackCredits()).balance).toBe(before);
});

test("deleting the pack removes the pictures but not the credits spent", async () => {
  await setUp();
  await ready();
  await finish(8);
  const d = await engine.deletePack();
  expect(d.status).toBe("none");
  expect(d.fighter).toBeNull();
  expect((await engine.getProfile()).fighter).toBeNull();
  expect((await engine.getPackCredits()).balance).toBe(4);
});

test("runner choice: man by default, and a figure only for rather not say", async () => {
  await setUp();
  let me = await engine.getProfile();
  expect(me).toMatchObject({ runner: "man", runnerFigure: null, fighter: null });
  me = await engine.setRunner({ runner: "either", runnerFigure: "woman" });
  expect(me).toMatchObject({ runner: "either", runnerFigure: "woman" });
  me = await engine.setRunner({ runner: "woman", runnerFigure: "man" });
  expect(me).toMatchObject({ runner: "woman", runnerFigure: null });
  await expect(engine.setRunner({ runner: "robot" })).rejects.toMatchObject({ code: "BAD_RUNNER" });
  me = await engine.updateProfile({ runner: "either", runnerFigure: "man" });
  expect(me).toMatchObject({ runner: "either", runnerFigure: "man" });
});

test("player views carry fighter and runner, for me in battles and for others", async () => {
  await setUp();
  await ready();
  await finish(8);
  const friends = await engine.getFriends();
  expect(friends[0]).toMatchObject({ runner: "man", runnerFigure: null, fighter: null });
  const b = await engine.createBattle({ opponentId: friends[0].id, mode: "most_steps", durationHours: 24 });
  expect(b.me.player.fighter.vs).toBeTruthy();
  expect(b.me.player.runner).toBe("man");
  expect(b.opponent.player).toMatchObject({ runner: "man", fighter: null });
});
