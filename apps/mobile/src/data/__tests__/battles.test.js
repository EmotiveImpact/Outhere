// Battle modes on the local engine: timed modes take a run as your time, the
// blind trial stays sealed, live races wait for ready, and the roster can hide
// people.

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

const engine = require("../engine");

const HOUR = 3600 * 1000;

beforeEach(() => engine.__resetForTests());

const setUp = async () => {
  await engine.createProfile({ username: "racer.one", city: "London" });
  await engine.setTier("pro");
};

test("a timed battle needs a distance", async () => {
  await setUp();
  await expect(engine.createBattle({ opponentId: "p_kemi", mode: "blind_time_trial" })).rejects.toMatchObject({ code: "DISTANCE_REQUIRED" });
});

test("blind time trial keeps their time sealed until both are in", async () => {
  await setUp();
  const b = await engine.createBattle({ opponentId: "p_kemi", mode: "blind_time_trial", distanceM: 5000 });
  expect(b.mode).toBe("blind_time_trial");
  expect(b.sealed).toBe(true);
  expect(b.opponent.value).toBeNull();

  // A run that's too short doesn't count; a 5.2 km run does, pro rata.
  await engine.saveRun({ distanceKm: 3, durationSec: 900, startedAt: Date.now() });
  expect((await engine.getBattle(b.id)).me.value).toBeNull();
  const saved = await engine.saveRun({ distanceKm: 5.2, durationSec: 1560, startedAt: Date.now() });
  expect(saved.battles).toEqual([b.id]);
  const after = await engine.getBattle(b.id);
  expect(after.me.value).toBe(1500);
  // Kemi hasn't run yet (at least an hour after the start), so still sealed.
  expect(after.sealed).toBe(true);
  expect(after.opponent.value).toBeNull();
});

test("blind time trial settles once both have run", async () => {
  await setUp();
  const b = await engine.createBattle({ opponentId: "p_dre", mode: "blind_time_trial", distanceM: 5000 });
  await engine.saveRun({ distanceKm: 5, durationSec: 1200, startedAt: Date.now() });
  const now = Date.now();
  const spy = jest.spyOn(Date, "now").mockReturnValue(now + 23 * HOUR);
  const done = await engine.getBattle(b.id);
  spy.mockRestore();
  expect(done.status).toBe("complete");
  expect(done.sealed).toBe(false);
  expect(done.opponent.value).toBeGreaterThan(0);
  expect(done.result).toBe(done.me.value < done.opponent.value ? "won" : "lost");
});

test("live race waits in the lobby until you're ready", async () => {
  await setUp();
  const b = await engine.createBattle({ opponentId: "p_amara", mode: "live_race", distanceM: 3000 });
  expect(b.phase).toBe("lobby");
  expect(b.startAt).toBeNull();
  const ready = await engine.readyBattle(b.id);
  expect(ready.phase).toBe("live");
  expect(ready.startAt).toBeGreaterThan(Date.now());
  await expect(engine.readyBattle(b.id)).rejects.toMatchObject({ code: "NOT_ALLOWED" });
});

test("stakes are held and come back when called off", async () => {
  await setUp();
  const before = (await engine.getWallet()).out;
  await expect(engine.createBattle({ opponentId: "p_jay", mode: "most_steps", stakeOut: before + 10 })).rejects.toMatchObject({ code: "NOT_ENOUGH_OUT" });
  const b = await engine.createBattle({ opponentId: "p_jay", mode: "most_steps", durationHours: 24, stakeOut: 5 });
  expect((await engine.getWallet()).out).toBe(before - 5);
  await engine.cancelBattle(b.id);
  expect((await engine.getWallet()).out).toBe(before);
});

test("people crossed off the roster can't be picked", async () => {
  await setUp();
  const roster = await engine.getRivalRoster();
  expect(roster.roster.length).toBeGreaterThan(4);
  const first = roster.roster[0].player.id;
  expect(roster.roster[0].bars).toHaveLength(4);
  await engine.hideFromRoster(first);
  const after = await engine.getRivalRoster();
  expect(after.roster.some((r) => r.player.id === first)).toBe(false);
  expect(after.hidden.map((p) => p.id)).toContain(first);
  await expect(engine.createBattle({ opponentId: first, mode: "most_steps" })).rejects.toMatchObject({ code: "NOT_ALLOWED" });
  await engine.showInRoster(first);
  expect((await engine.getRivalRoster()).roster.some((r) => r.player.id === first)).toBe(true);
});

test("hold the route keeps your best time on the route", async () => {
  await setUp();
  const route = await engine.saveRun({ distanceKm: 4, durationSec: 1500, startedAt: Date.now() - 2 * HOUR, title: "Rye loop" });
  const b = await engine.createBattle({ opponentId: "p_lena", mode: "hold_the_route", durationHours: 72, routeRunId: route.id });
  expect(b.routeKm).toBe(4);
  expect(b.me.value).toBeNull();
  await engine.saveRun({ distanceKm: 4.1, durationSec: 1435, startedAt: Date.now() });
  expect((await engine.getBattle(b.id)).me.value).toBe(1400);
  await engine.saveRun({ distanceKm: 2, durationSec: 500, startedAt: Date.now() }); // not the whole route
  await engine.saveRun({ distanceKm: 4, durationSec: 1320, startedAt: Date.now() });
  expect((await engine.getBattle(b.id)).me.value).toBe(1320);
});

test("last one standing counts days at the rising target", async () => {
  await setUp();
  const b = await engine.createBattle({ opponentId: "p_tunde", mode: "last_one_standing", durationHours: 168 });
  expect(b.me.value).toBe(0);
  expect(b.target).toBe(8000);
  // Two days on, having done nothing yesterday: out on day one.
  const now = Date.now();
  const spy = jest.spyOn(Date, "now").mockReturnValue(now + 48 * HOUR);
  const later = await engine.getBattle(b.id);
  spy.mockRestore();
  expect(later.status).toBe("complete");
  expect(later.me.value).toBe(0);
});
