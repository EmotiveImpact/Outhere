// Outside on the local engine: UK places and the City League for any city,
// call-ups, rising places, swipe and mystery challengers, battle extras, the
// drop shop and orders, event tickets and fair play.

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

const engine = require("../engine");
const { UK_AREAS, UK_CITIES, UK_REGIONS, LAUNCH_CITIES } = require("../places");
const { analyseRoute } = require("../outsideShared");

// Thursday 15 October 2026, 18:45 local.
const THURSDAY = new Date(2026, 9, 15, 18, 45).getTime();
const HOUR = 60 * 60 * 1000;

beforeEach(() => {
  jest.useFakeTimers({ now: THURSDAY, doNotFake: ["nextTick", "setImmediate"] });
  engine.__resetForTests();
});
afterEach(() => jest.useRealTimers());

const setUp = async (city = "London") => {
  await engine.createProfile({ username: "out.side", city });
};
const activeWeek = async () => {
  await engine.devFillHistory(13);
};

test("places cover the UK: regions, ten launch cities and their areas", async () => {
  expect(UK_REGIONS.map((r) => r.name)).toEqual(["London", "South East", "South West", "East of England", "West Midlands", "East Midlands", "Yorkshire", "North West", "North East", "Wales", "Scotland", "Northern Ireland"]);
  expect(LAUNCH_CITIES.map((c) => c.id).sort()).toEqual(["birmingham", "bristol", "edinburgh", "glasgow", "leeds", "liverpool", "london", "manchester", "newcastle", "sheffield"]);
  for (const c of LAUNCH_CITIES) expect(UK_AREAS.filter((a) => a.cityId === c.id).length).toBeGreaterThanOrEqual(12);
  expect(UK_CITIES.length).toBeGreaterThan(60);
  await setUp();
  const near = await engine.listCities({ lat: 53.48, lng: -2.24 });
  expect(near[0].id).toBe("manchester");
  const found = await engine.listCities({ query: "york" });
  expect(found.map((c) => c.id)).toContain("york");
  const areas = await engine.listAreas("glasgow");
  expect(areas).toHaveLength(12);
  expect(areas[0]).toEqual(expect.objectContaining({ cityId: "glasgow", kind: "area" }));
});

test("you play for your city once it's live, your region until then", async () => {
  await setUp("Birmingham");
  const side = await engine.getPlaySide();
  expect(side).toEqual(expect.objectContaining({ kind: "region", id: "west-midlands", name: "West Midlands", cityId: "birmingham", isLive: false, needed: 100 }));
  engine.__resetForTests();
  await setUp("Manchester");
  expect(await engine.getPlaySide()).toEqual(expect.objectContaining({ kind: "city", id: "manchester", isLive: true }));
});

test("the City League puts each side in the division its walkers fill", async () => {
  await setUp("Leeds");
  const league = await engine.getCityLeague();
  expect(league.season).toEqual({ number: 1, name: "Season 1", week: 3, weeks: 6 });
  const byId = Object.fromEntries(league.sides.map((s) => [s.id, s]));
  expect(byId.london.division).toBe("premier");
  expect(byId.manchester.division).toBe("premier");
  expect(byId.glasgow.division).toBe("championship");
  expect(byId.leeds).toEqual(expect.objectContaining({ division: "league-one", squad: 100, mine: true }));
  expect(league.rising.map((r) => r.id)).toContain("birmingham");
  expect(league.rising.find((r) => r.id === "birmingham").active).toBe(46);
});

test("an active member is called up, can pass to a reserve, and the fixture shows both sides", async () => {
  await setUp("London");
  expect(await engine.getCallUp()).toBeNull();
  await activeWeek();
  const call = await engine.getCallUp();
  expect(call).toEqual(expect.objectContaining({ side: "London", kickOff: "06:00", prizeOut: 250, open: true }));
  expect(call.number).toBeGreaterThanOrEqual(1);
  expect(call.number).toBeLessThanOrEqual(call.squad);
  const fixture = await engine.getCityFixture();
  expect(fixture.status).toBe("upcoming");
  expect([fixture.home.name, fixture.away.name]).toContain("London");
  expect(fixture.mine.number).toBe(call.number);
  expect(await engine.respondCallUp(call.fixture, true)).toEqual({ status: "in", number: call.number });
  expect((await engine.getCallUp()).answer).toBe("in");
  expect(await engine.respondCallUp(call.fixture, false)).toEqual({ status: "passed", reserve: true });
  expect(await engine.getCallUp()).toBeNull();
  await expect(engine.respondCallUp(call.fixture, true)).rejects.toMatchObject({ code: "NOT_IN_SQUAD" });
});

test("on Saturday the fixture is live and the call-up is closed", async () => {
  await setUp("London");
  await activeWeek();
  const call = await engine.getCallUp();
  jest.setSystemTime(new Date(2026, 9, 17, 12, 0).getTime());
  const f = await engine.getCityFixture(call.fixture);
  expect(f.status).toBe("live");
  expect(f.home.squadAvg).toBeGreaterThan(0);
  await expect(engine.respondCallUp(call.fixture, true)).rejects.toMatchObject({ code: "KICKED_OFF" });
});

test("a rising place hands out founding medals and call-up weekend codes", async () => {
  await setUp("Birmingham");
  const r = await engine.getRising();
  expect(r).toEqual(expect.objectContaining({ id: "birmingham", active: 46, needed: 100, medal: null, medalsTotal: 500, isLive: false }));
  const n = await engine.claimFoundingMedal();
  expect(n).toBe(r.medalsClaimed + 1);
  expect(await engine.claimFoundingMedal()).toBe(n);
  await expect(engine.claimFoundingMedal("london")).rejects.toMatchObject({ code: "NOT_ALLOWED" });
  const code = await engine.getCityInvite();
  expect(code).toMatch(/^[A-Z]{1,4}\d{4}$/);
  await expect(engine.redeemCityInvite(code)).rejects.toMatchObject({ code: "NOT_ALLOWED" });
  await expect(engine.redeemCityInvite("NOPE")).rejects.toMatchObject({ code: "CODE_INVALID" });
  await expect(engine.redeemCityInvite("KEMI2026")).rejects.toMatchObject({ code: "ALREADY_LIVE" });
  const before = (await engine.getWallet()).out;
  expect(await engine.redeemCityInvite("ZARA0046")).toEqual({ out: 1000 });
  expect((await engine.getWallet()).out).toBe(before + 1000);
  await expect(engine.redeemCityInvite("FEMIBRUM")).rejects.toMatchObject({ code: "ALREADY_USED" });
  engine.__resetForTests();
  await setUp("London");
  await expect(engine.claimFoundingMedal()).rejects.toMatchObject({ code: "ALREADY_LIVE" });
});

test("area tables work for London's boroughs and other cities' areas", async () => {
  await setUp("London");
  const london = await engine.getAreaTable();
  expect(london).toHaveLength(33);
  expect(london[0].rank).toBe(1);
  expect(london.find((a) => a.mine).areaId).toBe("southwark");
  const manc = await engine.getAreaTable("manchester");
  expect(manc).toHaveLength(12);
  expect(manc.every((a) => a.kind === "area" && a.col != null)).toBe(true);
  const friends = await engine.getFriendsWeek();
  expect(friends.some((f) => f.isMe)).toBe(true);
});

test("swipe picks rivals near you and challenges one", async () => {
  await setUp("London");
  await engine.setTier("pro");
  const deck = await engine.getSwipeDeck("near");
  expect(deck.length).toBeGreaterThan(3);
  expect(deck.every((c) => c.cityId === "london")).toBe(true);
  expect(deck[0].area).toBe("Southwark");
  const [first, second] = deck;
  expect(await engine.swipeRival(first.id, true)).toBe(1);
  await engine.swipeRival(second.id, false);
  const again = await engine.getSwipeDeck("near");
  expect(again.map((c) => c.id)).not.toContain(first.id);
  expect(again.map((c) => c.id)).not.toContain(second.id);
  expect((await engine.listPicks()).map((p) => p.id)).toEqual([first.id]);
  await expect(engine.challengePick({ rivalId: second.id })).rejects.toMatchObject({ code: "NOT_A_PICK" });
  const b = await engine.challengePick({ rivalId: first.id, metric: "minutes", durationHours: 72, stakeOut: 0 });
  expect(b).toEqual(expect.objectContaining({ mode: "most_steps", metric: "minutes", durationHours: 72 }));
  expect(await engine.listPicks()).toEqual([]);
  const division = await engine.getSwipeDeck("division");
  expect(division.every((c) => c.cityId !== "london")).toBe(true);
});

test("blocking someone takes them off Swipe and out of your picks", async () => {
  await setUp("London");
  const [first, second] = await engine.getSwipeDeck("near");
  await engine.swipeRival(first.id, true);
  await engine.blockPlayer(first.id);
  await engine.blockPlayer(second.id);
  expect(await engine.listPicks()).toEqual([]);
  const ids = (await engine.getSwipeDeck("near")).map((c) => c.id);
  expect(ids).not.toContain(first.id);
  expect(ids).not.toContain(second.id);
  await expect(engine.swipeRival(second.id, true)).rejects.toMatchObject({ code: "NOT_ALLOWED" });
});

test("mystery challengers: settings, an offer, then the reveal", async () => {
  await setUp("London");
  const set = await engine.setMysterySettings({ scope: "uk", perDay: 5, levelGap: 2 });
  expect(set).toEqual(expect.objectContaining({ enabled: true, scope: "uk", perDay: 5, levelGap: 2, minor: false }));
  const id = await engine.findMysteryChallenger();
  expect(await engine.findMysteryChallenger()).toBe(id);
  const offer = await engine.getMysteryOffer(id);
  expect(offer).toEqual(expect.objectContaining({ status: "open", rival: null, durationHours: 72, metric: "steps" }));
  const answered = await engine.answerMystery(id, true);
  if (answered.status === "revealed") {
    expect(answered.rival.name).toBeTruthy();
    const battle = await engine.getBattle(answered.battleId);
    expect(battle.isSurprise).toBe(true);
    expect(battle.status).toBe("active");
  } else {
    expect(answered.status).toBe("closed");
  }
  await expect(engine.answerMystery(id, true)).rejects.toMatchObject({ code: "ALREADY_ANSWERED" });
  await engine.setMysterySettings({ enabled: false });
  await expect(engine.findMysteryChallenger()).rejects.toMatchObject({ code: "MYSTERY_OFF" });
});

test("battles: emotes, a boost for double XP, then a rematch at half stake after a loss", async () => {
  await setUp("London");
  await engine.setTier("pro");
  await activeWeek();
  const b = await engine.createBattle({ opponentId: "p_kemi", mode: "most_steps", durationHours: 24, stakeOut: 20 });
  const e = await engine.sendBattleEmote(b.id, "fire");
  expect(e).toEqual(expect.objectContaining({ code: "fire", mine: true }));
  await expect(engine.sendBattleEmote(b.id, "fire")).rejects.toMatchObject({ code: "SLOW_DOWN" });
  await expect(engine.sendBattleEmote(b.id, "rude")).rejects.toMatchObject({ code: "BAD_EMOTE" });
  expect((await engine.listBattleEmotes(b.id))[0].code).toBe("fire");
  const out = (await engine.getWallet()).out;
  expect(await engine.boostBattle(b.id)).toBe(true);
  expect((await engine.getWallet()).out).toBe(out - 20);
  await expect(engine.boostBattle(b.id)).rejects.toMatchObject({ code: "ALREADY_BOOSTED" });
  expect((await engine.getBattle(b.id)).boosted).toBe(true);
  await expect(engine.rematchBattle(b.id)).rejects.toMatchObject({ code: "NOT_FINISHED" });
  jest.setSystemTime(Date.now() + 25 * HOUR);
  const done = await engine.getBattle(b.id);
  expect(done.status).toBe("complete");
  expect(done.prize.xp).toBe(Math.round((done.result === "won" ? 150 : 25) * 2 * engine.TIER_RULES.pro.xpMultiplier));
  const h2h = await engine.getHeadToHead("p_kemi");
  expect(h2h.played).toBe(1);
  const re = await engine.rematchBattle(b.id);
  expect(re.rematchOf).toBe(b.id);
  expect(re.stakeOut).toBe(done.result === "lost" ? 10 : 20);
});

test("the Arena season: the hero, last season's results and claiming them", async () => {
  await setUp("London");
  const now = await engine.getArenaNow();
  expect(now).toEqual(expect.objectContaining({ season: 2, name: "Season 2", week: 3, weeks: 6 }));
  expect(now.outside).toBeGreaterThan(0);
  const r = await engine.getSeasonResults();
  expect(r).toEqual(expect.objectContaining({ season: 1, city: "London", claimed: false }));
  expect(r.players).toBe(Math.round(4012 * 0.78));
  expect(r.next.number).toBe(2);
  const out = (await engine.getWallet()).out;
  const claimed = await engine.claimSeasonRewards(1);
  expect(claimed.claimed).toBe(true);
  expect((await engine.getWallet()).out).toBe(out + r.prizeOut);
  await expect(engine.claimSeasonRewards(1)).rejects.toMatchObject({ code: "ALREADY_CLAIMED" });
});

test("drops: claim with a size and address, pay in OUT, then track the order", async () => {
  await setUp("London");
  const shop = await engine.listDropShop();
  expect(shop.map((d) => d.id)).toEqual(expect.arrayContaining(["d_nightrunner", "d_tee", "d_recovery", "d_stickers"]));
  const tee = await engine.getDropItem("d_tee");
  expect(tee).toEqual(expect.objectContaining({ status: "live", priceOut: 1200, tag: "NEW", canClaim: true, deliveryOut: 150 }));
  const address = { name: "Alex Morgan", line1: "Flat 4, 18 Bermondsey St", town: "London", postcode: "se1 3tq" };
  await expect(engine.claimDrop({ dropId: "d_tee", size: "XL", address })).rejects.toMatchObject({ code: "SIZE_REQUIRED" });
  await expect(engine.claimDrop({ dropId: "d_tee", size: "M", address: { name: "A" } })).rejects.toMatchObject({ code: "ADDRESS_REQUIRED" });
  await expect(engine.claimDrop({ dropId: "d_cap", address })).rejects.toMatchObject({ code: "NOT_ENOUGH_OUT" });
  await engine.redeemCityInvite("ZARA0046");
  await engine.claimSeasonRewards(1);
  const wallet = (await engine.getWallet()).out;
  // A top 5% finish comes with a week of Black, and delivery is free with Black.
  const delivery = (await engine.getProfile()).tier === "black" ? 0 : 150;
  const order = await engine.claimDrop({ dropId: "d_cap", address });
  expect(order).toEqual(expect.objectContaining({ status: "claimed", size: null, outSpent: 900, deliveryOut: delivery, title: "Outhere Snapback Cap" }));
  expect(order.ref).toMatch(/^OH-\d{5}$/);
  expect(order.address.postcode).toBe("SE1 3TQ");
  expect((await engine.getWallet()).out).toBe(wallet - 900 - delivery);
  expect(await engine.getDeliveryAddress()).toEqual(expect.objectContaining({ line1: "Flat 4, 18 Bermondsey St" }));
  await expect(engine.claimDrop({ dropId: "d_cap", address })).rejects.toMatchObject({ code: "ALREADY_CLAIMED" });
  expect((await engine.getDropItem("d_cap")).claimed).toBe(true);
  jest.setSystemTime(Date.now() + 23 * HOUR);
  const moved = await engine.getOrder(order.id);
  expect(moved.status).toBe("shipped");
  expect(moved.history.map((h) => h.status)).toEqual(["claimed", "packed", "shipped"]);
  expect((await engine.listOrders())[0].id).toBe(order.id);
});

test("black drops need Black, and upcoming drops aren't open", async () => {
  await setUp("London");
  const address = { name: "A M", line1: "1 Road", town: "London", postcode: "SE1 1AA" };
  await expect(engine.claimDrop({ dropId: "d_recovery", address })).rejects.toMatchObject({ code: "TIER_REQUIRED" });
  await expect(engine.claimDrop({ dropId: "d_shell", size: "M", address })).rejects.toMatchObject({ code: "NOT_OPEN" });
  await expect(engine.claimDrop({ dropId: "d_stickers", address })).rejects.toMatchObject({ code: "CLOSED" });
});

test("a ticket for an event you're going to, and who else is going", async () => {
  await setUp("London");
  const ev = (await engine.listEvents()).find((e) => e.canAttend && !e.isFull);
  await expect(engine.getTicket(ev.id)).rejects.toMatchObject({ code: "NOT_GOING" });
  await engine.rsvpEvent(ev.id, true);
  const t = await engine.getTicket(ev.id);
  expect(t.qr).toBe(`outhere:ticket:${t.code}`);
  expect(t.code).toMatch(/^[0-9a-f]{18}$/);
  expect(t.gate).toMatch(/^[ABCD]$/);
  expect(t.wave).toBeGreaterThanOrEqual(1);
  expect(await engine.getTicket(ev.id)).toEqual(t);
  const going = await engine.getEventGoing(ev.id);
  expect(going.count).toBe(ev.rsvpCount + 1);
  const firstStranger = going.people.findIndex((p) => !p.following);
  expect(going.people.slice(firstStranger).every((p) => !p.following)).toBe(true);
});

test("fair play holds the part of a run that looks like a bus, and an appeal clears it", async () => {
  await setUp("London");
  const start = Date.now() - 40 * 60 * 1000;
  // 3 km on foot (about 11 km/h), then 2.4 km at about 31 km/h.
  const route = [];
  let lat = 51.5;
  let t = start;
  for (let i = 0; i <= 30; i += 1) route.push({ latitude: (lat += 0.0009), longitude: -0.09, t: (t += 30 * 1000) });
  for (let i = 0; i < 24; i += 1) route.push({ latitude: (lat += 0.0009), longitude: -0.09, t: (t += 11.6 * 1000) });
  const xpBefore = (await engine.getWallet()).xp;
  const saved = await engine.saveRun({ distanceKm: 5.5, durationSec: 1400, startedAt: start, endedAt: t, route });
  expect(saved.underReview).toBe(true);
  const review = await engine.getRunReview(saved.id);
  expect(review.status).toBe("open");
  expect(review.checks.find((c) => c.key === "speed").ok).toBe(false);
  expect(review.fastKmh).toBeGreaterThan(25);
  expect(review.heldXp).toBeGreaterThan(0);
  const xpHeld = (await engine.getWallet()).xp;
  expect(xpHeld).toBeLessThan(xpBefore + 55);
  const appealed = await engine.answerRunReview(saved.id, false, "I was running for the bus, not on it");
  expect(appealed.status).toBe("appealed");
  await expect(engine.answerRunReview(saved.id, true)).rejects.toMatchObject({ code: "ALREADY_ANSWERED" });
  jest.setSystemTime(Date.now() + 3 * 60 * 1000);
  expect((await engine.getRunReview(saved.id)).status).toBe("cleared");
  expect((await engine.getWallet()).xp).toBeGreaterThan(xpHeld);
});

test("a run on foot isn't reviewed", () => {
  const pts = Array.from({ length: 20 }, (_, i) => ({ latitude: 51.5 + i * 0.0009, longitude: -0.09, t: i * 40 * 1000 }));
  expect(analyseRoute(pts, { distanceM: 2000 })).toBeNull();
});
