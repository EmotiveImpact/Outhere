// Run clubs and club v club on the local engine: finding clubs, club run
// check-in, claiming a club, the league group and friendlies.

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

const engine = require("../engine");

// Thursday 15 October 2026, 18:45 local: half an hour before Southbank's run.
const THURSDAY = new Date(2026, 9, 15, 18, 45).getTime();
const SEC = 1000;

beforeEach(() => {
  jest.useFakeTimers({ now: THURSDAY, doNotFake: ["nextTick", "setImmediate"] });
  engine.__resetForTests();
});
afterEach(() => jest.useRealTimers());

const later = (ms) => jest.setSystemTime(Date.now() + ms);

const setUp = async () => {
  await engine.createProfile({ username: "club.runner", city: "London" });
};

test("find your run club lists real clubs near you, verified first", async () => {
  await setUp();
  const near = await engine.findClubs({ filter: "near" });
  expect(near[0].name).toBe("Southbank Runners");
  expect(near[0].meets).toBe("Tue and Thu · 19:00, Sat · 09:00");
  expect(near.every((c) => c.city === "London")).toBe(true);
  const firstFounding = near.findIndex((c) => !c.verified);
  expect(near.slice(firstFounding).every((c) => !c.verified)).toBe(true);
  const beginners = await engine.findClubs({ filter: "beginners" });
  expect(beginners.every((c) => c.beginners)).toBe(true);
  const tonight = await engine.findClubs({ filter: "tonight" });
  expect(tonight.map((c) => c.id)).toEqual(expect.arrayContaining(["c_southbank", "c_southside", "c_lewisham"]));
});

test("check in at a club run when it opens, once", async () => {
  await setUp();
  await engine.joinCrew("c_southbank");
  const early = Date.now();
  jest.setSystemTime(new Date(2026, 9, 15, 17, 0).getTime());
  await expect(engine.checkInClubRun("c_southbank.4.19")).rejects.toMatchObject({ code: "CHECK_IN_CLOSED" });
  jest.setSystemTime(early);
  const run = await engine.getClubRun("c_southbank.4.19");
  expect(run.checkInOpen).toBe(true);
  expect(run.fixture).toBeTruthy();
  const done = await engine.checkInClubRun("c_southbank.4.19");
  expect(done.checkedIn).toBe(true);
  expect(done.earned.xp).toBeGreaterThan(0);
  expect(done.streak).toBe(1);
  const again = await engine.checkInClubRun("c_southbank.4.19");
  expect(again.earned).toBeNull();
});

test("the league group has seven clubs and your fixture this week", async () => {
  await setUp();
  await engine.joinCrew("c_southbank");
  const league = await engine.getClubLeague();
  expect(league.table).toHaveLength(7);
  expect(league.week).toBe(4);
  const played = league.table.reduce((n, r) => n + r.played, 0);
  expect(played % 2).toBe(0);
  expect(league.table.find((r) => r.id === "c_southbank").isMine).toBe(true);
  const fx = league.fixture;
  expect(fx.mySide).toBeTruthy();
  expect(fx.home.score).toBeGreaterThan(0);
  const again = await engine.getFixture(fx.id);
  expect(again.away.score).toBe(fx.away.score);
});

test("a challenger club stays a mystery until the captain accepts", async () => {
  await setUp();
  await engine.joinCrew("c_southbank");
  const list = await engine.listClubBattles("c_southbank");
  const past = list.find((b) => b.status === "finished");
  expect(past.mode).toBe("relay");
  expect(past.myScore).toBeGreaterThan(0);
  const incoming = list.find((b) => b.status === "pending");
  expect(incoming.hidden).toBe(true);
  expect(incoming.opponent).toBeNull();
  expect(incoming.canVote).toBe(true);
  expect(incoming.canRespond).toBe(false);
  await expect(engine.respondClubBattle(incoming.id, true)).rejects.toMatchObject({ code: "CAPTAINS_ONLY" });
  const voted = await engine.voteClubBattle(incoming.id, true);
  expect(voted.votes.yes).toBe(15);
  later(121 * SEC);
  const after = await engine.getClubBattle(incoming.id);
  expect(after.status).toBe("accepted");
  expect(after.hidden).toBe(true);
  jest.setSystemTime(after.startAt + 60 * SEC);
  const live = await engine.getClubBattle(incoming.id);
  expect(live.status).toBe("live");
  expect(live.opponent.name).toBeTruthy();
});

test("claim a club, get it verified, then challenge another club", async () => {
  await setUp();
  await expect(engine.challengeClub({ crewId: "c_southbank", opponentId: "c_peckham" })).rejects.toBeTruthy();
  await expect(engine.claimClub({ name: "Bermondsey Bridges", meetPlace: "Tower Bridge Rd", days: [2], proofMethod: "instagram", proofHandle: "" })).rejects.toMatchObject({ code: "PROOF_REQUIRED" });
  const claim = await engine.claimClub({ name: "Bermondsey Bridges", meetPlace: "Tower Bridge Rd", days: [4, 2], hour: 18, minute: 30, proofMethod: "instagram", proofHandle: "@bermondseybridges" });
  expect(claim.status).toBe("pending");
  expect(claim.code).toMatch(/^\d{6}$/);
  expect(claim.meets).toBe("Tue and Thu · 18:30");
  later(31 * SEC);
  const [verified] = await engine.listMyClaims();
  expect(verified.status).toBe("verified");
  const crew = await engine.getCrew(verified.crewId);
  expect(crew.verified).toBe(true);
  expect(crew.isCaptain).toBe(true);
  expect((await engine.getProfile()).tier).toBe("pro");

  await expect(engine.challengeClub({ crewId: crew.id, opponentId: "c_peckham", mode: "turf_war" })).rejects.toMatchObject({ code: "MODE_NOT_READY" });
  const b = await engine.challengeClub({ crewId: crew.id, opponentId: "c_peckham", mode: "live_race", startAt: Date.now() + 5 * 60 * SEC });
  expect(b.status).toBe("pending");
  expect(b.opponent.name).toBe("Peckham Pacers");
  await expect(engine.challengeClub({ crewId: crew.id, opponentId: "c_peckham", mode: "relay" })).rejects.toMatchObject({ code: "ALREADY_PLAYING" });
  later(61 * SEC);
  expect((await engine.getClubBattle(b.id)).status).toBe("accepted");
  later(5 * 60 * SEC);
  await engine.saveRun({ distanceKm: 3, durationSec: 900, startedAt: Date.now() - 900 * SEC, endedAt: Date.now() });
  const live = await engine.getClubBattle(b.id);
  expect(live.status).toBe("live");
  later(2 * 3600 * SEC);
  const done = await engine.getClubBattle(b.id);
  expect(done.status).toBe("finished");
  expect(done.myScore).toBeGreaterThan(3000);
});

test("founding clubs show how close they are to official", async () => {
  await setUp();
  const f = await engine.getFounding("c_walthamstow");
  expect(f.meetups).toBe(2);
  expect(f.people).toBe(8);
  expect(f.nearest).toBeTruthy();
});
